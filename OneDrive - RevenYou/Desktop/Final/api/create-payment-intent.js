// Serverless Function dependencies
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with the Service Role Key for secure write access
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use the secure service key here
);

// --- Delivery Logic (Must match client-side logic for validation) ---
const GROUP_A = [/* ... postcodes ... */]; 
const GROUP_B = [/* ... postcodes ... */]; 
const GROUP_C = [/* ... postcodes ... */]; 

const POSTCODE_DISTANCES = {};
GROUP_A.forEach((pc, i) => POSTCODE_DISTANCES[pc] = 30 + (i % 5));
GROUP_B.forEach((pc, i) => POSTCODE_DISTANCES[pc] = 15 + (i % 5));
GROUP_C.forEach((pc, i) => POSTCODE_DISTANCES[pc] = 1 + (i % 10));

const DISTANCE_FEES = [{ maxKm: 10, fee: 10 }, { maxKm: 20, fee: 15 }, { maxKm: 30, fee: 20 }, { maxKm: Infinity, fee: 25 }];

function getDeliveryFee(postcode) {
    const dist = POSTCODE_DISTANCES[Number(postcode)];
    if (dist === undefined) return -1;
    for (const df of DISTANCE_FEES) if (dist <= df.maxKm) return df.fee;
    return 25;
}
// --- End Delivery Logic ---

// Helper to generate a unique, readable order number
function generateOrderNumber() {
    return 'GGO-' + Math.floor(1000 + Math.random() * 9000); // e.g., GGO-4567
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { trolley, customer } = req.body;

        if (!trolley || !customer) {
            return res.status(400).json({ error: 'Missing trolley or customer data.' });
        }

        // 1. Calculate the final total amount in CENTS
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
            payment_intent_id: null // Will be added below
        };

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select('*');

        if (orderError) {
            console.error('Supabase Order Creation Error:', orderError);
            return res.status(500).json({ error: 'Failed to create order record.' });
        }

        const orderId = order[0].id; // Get the ID of the new order record

        // 3. Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents, 
            currency: 'aud',
            payment_method_types: ['card'],
            metadata: { 
                order_id: orderId, // Link PI to Supabase Order ID
                order_number: orderNumber,
                email: customer.email
            },
        });
        
        // 4. Update Supabase order with Payment Intent ID
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
        console.error('Stripe/API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
