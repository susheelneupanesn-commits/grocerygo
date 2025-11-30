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

// ------------------- POSTCODES & DELIVERY FEE LOGIC (REVISED) -------------------

// Map postcodes to approximate distance in km from Brisbane Convention Centre
const POSTCODE_DISTANCES = {
    4000: 0, 4005:2, 4006:3, 4007:4, 4008:5, 4009:8,
    4010:12, 4011:14, 4012:22, 4013:25, 4014:35, 4017:42
    // NOTE: Ensure all other serviceable postcodes are added here
};

const DISTANCE_FEES = [
    { maxKm: 10, fee: 10 },
    { maxKm: 20, fee: 15 },
    { maxKm: 30, fee: 20 },
    { maxKm: Infinity, fee: 25 }
];

function getDeliveryFee(postcode) {
    const dist = POSTCODE_DISTANCES[Number(postcode)];
    // If postcode is not listed, use default fee
    if(dist === undefined) return 25; 
    
    for(const df of DISTANCE_FEES){
        if(dist <= df.maxKm) return df.fee;
    }
    // Fallback fee
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

        // Check for basic service area (assuming anything not explicitly handled gets the default fee)
        if (deliveryFee === -1) return res.status(400).json({ error: 'Sorry, delivery not available in your area.' });

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
            delivery_slot: deliverySlot, // ⬅️ ADDED NEW FIELD
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
