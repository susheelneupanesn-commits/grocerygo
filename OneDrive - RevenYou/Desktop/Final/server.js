// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const Stripe = require('stripe');

// --- Initialize Clients ---
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
// Vercel ignores this PORT, but it's used for local testing
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
// Serve static files from the 'public' directory (assuming frontend files are here)
app.use(express.static(path.join(__dirname, 'public'))); 

// ------------------- POSTCODES & DELIVERY FEE LOGIC (COMPREHENSIVE) -------------------

// Group A: City of Ipswich and City of Logan (including 4207)
const GROUP_A = [
    // Ipswich 
    4300,4301,4303,4304,4305,4306,4307,4308,4309,4310,4311, 
    // Logan (Core + 4207)
    4114,4118,4124,4125,4127,4128,4129,4131,4132,4133,4207,4280,4285,4290 
]; 

// Group B: Redland City & Neighbouring Brisbane Council Half (Bayside)
const GROUP_B = [
    4169,4170,4171,4172,4173,4174,4178,4179, 
    // Redland City
    4157, 4158, 4159, 4160, 4161, 4163, 4164, 4165
]; 

// Group C: Rest of Brisbane City Council + Moreton Bay Regional Council 
const GROUP_C = [
    // Core Brisbane Postcodes (Inner/West/North/South-West)
    4000,4005,4006,4007,4008,4009,4010,4011,4012,4013,4014,4017,4018,4025,4029,4030,4031,4032,4034,4035,4036,4051,4053,4054,4055,4059,4060,4061,4064,4065,4066,4067,4068,4069,4070,4072,4073,4074,4075,4076,4077,4078,4101,4102,4103,4104,4105,4106,4107,4108,4109,4110,4111,4112,4113,4114,4115,4116,4117,4118,4119,4120,4121,4122,4123,4124,4125,4127,4128,4129,4130,4132,4133,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,4163,4164,4165,
    // Moreton Bay (Core additions)
    4500, 4501, 4502, 4503, 4504, 4505, 4506, 4507, 4508, 4509, 4510, 4511, 4520
].filter((pc, index, self) => self.indexOf(pc) === index); 

const ALL_POSTCODES = [...GROUP_A, ...GROUP_B, ...GROUP_C];

// Postcode mapping that mirrors the sample logic in the frontend for distance tiers.
const POSTCODE_DISTANCES = ALL_POSTCODES.reduce((acc, pc, i) => {
    // Group A (Ipswich/Logan) -> Longer Distance (30-34km) -> $25 fee
    if (GROUP_A.includes(pc)) {
        acc[pc] = 30 + (i % 5); 
    // Group B (Redland/Bayside) -> Medium Distance (15-19km) -> $15 fee
    } else if (GROUP_B.includes(pc)) {
        acc[pc] = 15 + (i % 5); 
    // Group C (Brisbane/Moreton Bay) -> Short Distance (1-10km) -> $10 fee
    } else if (GROUP_C.includes(pc)) {
        acc[pc] = 1 + (i % 10); 
    }
    return acc;
}, {});

const DISTANCE_FEES = [
    { maxKm: 10, fee: 10 },
    { maxKm: 20, fee: 15 },
    { maxKm: 30, fee: 20 },
    { maxKm: Infinity, fee: 25 }
];

/**
 * Calculates delivery fee based on postcode distance.
 * Returns -1 if the postcode is outside the defined service area.
 * @param {string|number} postcode 
 * @returns {number} The calculated fee or -1 for out-of-service area.
 */
function getDeliveryFee(postcode) {
    const dist = POSTCODE_DISTANCES[Number(postcode)];
    // If postcode is not listed (out of service area), return -1
    if (dist === undefined) return -1; 
    
    for(const df of DISTANCE_FEES){
        if(dist <= df.maxKm) return df.fee;
    }
    // Fallback (should be covered by the Infinity tier)
    return 25; 
}

// ------------------- STRIPE WEBHOOK ENDPOINT (CRITICAL) -------------------
// Must use raw body parser to verify signature
app.post('/api/stripe-webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`⚠️ Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntentId = event.data.object.id;
        
        // Update order status in Supabase
        const { error } = await supabase
            .from("orders")
            .update({ status: "Successful", stripe_status: "succeeded" })
            .eq("stripe_id", paymentIntentId); 

        if (error) {
            console.error("Supabase update failed for successful PI:", error);
            return res.status(500).json({ received: true, error: "Database Update Failed" }); 
        }
        console.log(`✅ Order status updated to Successful for PI: ${paymentIntentId}`);

    } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntentId = event.data.object.id;
        
        // Update order to 'Failed' status
        await supabase
            .from("orders")
            .update({ status: "Failed", stripe_status: "failed" })
            .eq("stripe_id", paymentIntentId);
    }

    res.json({ received: true });
});


// --- Standard API Endpoints (Use JSON body parser after webhook) ---
app.use(express.json()); // Use Express's built-in JSON body parser for all other routes

// ------------------- CREATE PAYMENT INTENT (REVISED) -------------------
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { trolley, customer } = req.body;
        // Destructure all customer fields, including the new deliverySlot
        const { name, email, mobile, address, suburb, state, postcode, deliverySlot } = customer;
        
        if (!trolley || trolley.length === 0) return res.status(400).json({ error: 'Trolley is empty' });

        const deliveryFee = getDeliveryFee(postcode);

        // CRITICAL: Check if postcode is outside the service area
        if (deliveryFee === -1) return res.status(400).json({ error: `Sorry, delivery is not available in postcode ${postcode}.` });

        const subtotal = trolley.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
        const grandTotal = subtotal + deliveryFee;
        const amountInCents = Math.round(grandTotal * 100);

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'aud',
            automatic_payment_methods: { enabled: true },
            metadata: { customer_name: name, email: email }
        });
        
        // --- START SERIAL NUMBER GENERATION ---
        let orderNumber; 

        // Call the Supabase function to get the next serial number
        const { data: serialResult, error: serialError } = await supabase
            .rpc('get_next_serial_number');

        if (serialError || !serialResult) {
            console.error('Supabase serial number error:', serialError || 'No serial number returned');
            // Fallback to random number for resilience
            orderNumber = `GGO-ERR-${Math.floor(10000 + Math.random() * 90000)}`;
        } else {
            const serialNumber = serialResult;
            // Format the number with leading zeros (e.g., 1 -> 0001, 10 -> 0010)
            const paddedNumber = String(serialNumber).padStart(4, '0');
            orderNumber = `GGO-${paddedNumber}`;
        }
        // --- END SERIAL NUMBER GENERATION ---

        // Insert order into Supabase with PENDING status
        const { error } = await supabase.from('orders').insert([{
            order_number: orderNumber,
            customer_name: name,
            email: email,
            phone: mobile, 
            address_line1: address, 
            address_line2: null, 
            suburb: suburb,
            postcode: postcode,
            state: state,
            country: 'Australia', 
            delivery_slot: deliverySlot, 
            items: JSON.stringify(trolley),
            delivery_fee: deliveryFee, 
            total_amount: grandTotal, 
            stripe_id: paymentIntent.id, 
            status: 'pending',
        }]);

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Failed to save order details.' });
        }

        res.json({ clientSecret: paymentIntent.client_secret, orderNumber });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during payment intent creation.' });
    }
});

// ------------------- GET ORDERS ENDPOINT (ADMIN) -------------------
app.get('/api/get-orders', async (req, res) => {
    try {
        // Securely fetch all orders using the Service Role Key
        const { data: orders, error } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return res.status(500).json({ error: "Failed to fetch orders for admin." });
        }

        res.status(200).json({ orders });

    } catch (err) {
        console.error("Admin API error:", err);
        res.status(500).json({ error: err.message });
    }
});


// ------------------- START SERVER (Vercel Fix) -------------------

// Only run app.listen() locally for standard development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`Test Checkout at http://localhost:${PORT}/checkout.html`);
    });
}

// **CRITICAL VERCEL FIX:** Export the Express app instance. 
// Vercel will wrap this export in its serverless function.
module.exports = app;
