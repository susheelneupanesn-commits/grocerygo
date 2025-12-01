// Serverless Function dependencies
// NOTE: These dependencies must be in your package.json file on Vercel
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with the Service Role Key for secure write access
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use the secure service key here
);

// --- Delivery Logic (MUST match client-side logic for validation) ---
const GROUP_A = [4300,4301,4303,4304,4305,4306,4307,4308,4311,4114,4118,4124,4125,4127,4128,4129,4131,4132,4133,4207,4280,4285,4290];
const GROUP_B = [4169,4170,4171,4172,4173,4174,4178,4179,4157,4158,4159,4160,4161,4163,4164,4165];
const GROUP_C = [4000,4005,4006,4007,4008,4009,4010,4011,4012,4013,4014,4017,4018,4025,4029,4030,4031,4032,4034,4035,4036,4051,4053,4054,4055,4059,4060,4061,4064,4065,4066,4067,4068,4069,4070,4072,4073,4074,4075,4076,4077,4078,4101,4102,4103,4104,4105,4106,4107,4108,4109,4110,4111,4112,4113,4114,4115,4116,4117,4118,4119,4120,4121,4122,4123,4124,4125,4127,4128,4129,4130,4132,4133,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,4163,4164,4165,4500,4501,4502,4503,4504,4505,4506,4507,4508,4509,4510,4511,4520];

const POSTCODE_DISTANCES = {};
GROUP_A.forEach((pc, i) => POSTCODE_DISTANCES[pc] = 30 + (i % 5));
GROUP_B.forEach((pc, i) => POSTCODE_DISTANCES[pc] = 15 + (i % 5));
GROUP_C.forEach((pc, i) => POSTCODE_DISTANCES[pc] = 1 + (i % 10));

const DISTANCE_FEES = [{ maxKm: 10, fee: 10 }, { maxKm: 20, fee: 15 }, { maxKm: 30, fee: 20 }, { maxKm: Infinity, fee: 25 }];

function getDeliveryFee(postcode) {
    const dist = POSTCODE_DISTANCES[Number(postcode)];
    if (dist === undefined) return -1; // Postcode not in our service area
    for (const df of DISTANCE_FEES) if (dist <= df.maxKm) return df.fee;
    return 25; // Default fallback fee
}
// --- End Delivery Logic ---

// Helper to generate a unique, readable order number
function generateOrderNumber() {
    return 'GGO-' + Math.floor(1000 + Math.random() * 9000); // e.g., GGO-4567
}

module.exports = async (req, res) => {
    // Enable CORS for development (important for Vercel functions)
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { trolley, customer } = req.body;

        if (!trolley || !customer) {
            return res.status(400).json({ error: 'Missing trolley or customer data.' });
        }

        // 1. Calculate the final total amount in CENTS
        // Re-calculate subtotal securely on the server
        let subtotal = trolley.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

        const deliveryFee = getDeliveryFee(customer.postcode);
        if (deliveryFee === -1) {
            return res.status(400).json({ error: 'Postcode not serviced for delivery.' });
        }
        
        const totalAmountAUD = subtotal + deliveryFee;
        // Stripe expects the amount in the smallest currency unit (cents)
        const totalAmountCents = Math.round(totalAmountAUD * 100);

        if (totalAmountCents <= 50) { // Stripe minimum charge is 50 cents
             return res.status(400).json({ error: 'Order total too low for processing.' });
        }

        const orderNumber = generateOrderNumber();

        // 2. Log the order to Supabase as 'pending'
        const orderData = {
            order_number: orderNumber,
            customer_name: customer.name,
            email: customer.email,
            delivery_address: `${customer.address}, ${customer.suburb}, ${customer.state} ${customer.postcode}`,
            delivery_slot: `${customer.deliveryDate} | ${customer.deliverySlot}`,
            total_amount: totalAmountAUD,
            delivery_fee: deliveryFee,
            items: trolley,
            status: 'pending', // Will be updated to 'succeeded' by Stripe Webhook
            payment_intent_id: null 
        };

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select('*');

        if (orderError) {
            console.error('Supabase Order Creation Error:', orderError);
            // Return a generic error to the client
            return res.status(500).json({ error: 'Failed to securely log order details.' });
        }

        const orderId = order[0].id; // Get the ID of the new order record

        // 3. Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents, 
            currency: 'aud',
            payment_method_types: ['card'],
            // Add metadata to link the PI back to the Supabase order
            metadata: { 
                order_id: orderId, 
                order_number: orderNumber,
                email: customer.email
            },
        });
        
        // 4. Update Supabase order with Payment Intent ID (for later Webhook lookup)
        await supabase
            .from('orders')
            .update({ payment_intent_id: paymentIntent.id })
            .eq('id', orderId);

        // 5. Return the client secret to the browser
        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            orderNumber: orderNumber,
            total: totalAmountAUD,
            fee: deliveryFee
        });

    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ error: 'Internal server error during payment intent creation.' });
    }
};
