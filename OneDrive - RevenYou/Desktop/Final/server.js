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
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
// Serve static files from the 'public' directory (assuming frontend files are here)
app.use(express.static(path.join(__dirname, 'public'))); 

// ------------------- POSTCODES & DELIVERY FEE LOGIC -------------------
function getDeliveryFee(postcode) {
    const p = Number(postcode);
    const first10km = [4000, 4005, 4006, 4007, 4008]; 
    const km10to20 = [4009, 4010, 4011]; 
    const km20plus = [4012, 4013];

    // NOTE: I've included the core logic you provided; you should update the full postcode list here if needed.
    if (first10km.includes(p)) return 10;
    if (km10to20.includes(p)) return 15;
    if (km20plus.includes(p)) return 20;
    
    // Default fee or return -1 if not found in service area
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
            .eq("stripe_payment_id", paymentIntentId); 

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
            .eq("stripe_payment_id", paymentIntentId);
    }

    res.json({ received: true });
});


// --- Standard API Endpoints (Use JSON body parser after webhook) ---
app.use(express.json()); // Use Express's built-in JSON body parser for all other routes

// ------------------- CREATE PAYMENT INTENT -------------------
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { trolley, customer } = req.body;
        
        if (!trolley || trolley.length === 0) return res.status(400).json({ error: 'Trolley is empty' });

        const postcode = Number(customer.postcode);
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
            metadata: { customer_name: customer.name, email: customer.email }
        });
        
        const orderNumber = `GGO-${Math.floor(100000 + Math.random() * 900000)}`;

        // FIXED Insert order into Supabase with PENDING status
const { error } = await supabase.from('orders').insert([{
    order_number: orderNumber,
    customer_name: customer.name,
    email: customer.email,
    phone: customer.mobile, // FIXED: Maps frontend 'mobile' to SQL 'phone'
    address_line1: customer.address, // FIXED: Maps frontend 'address' to SQL 'address_line1'
    address_line2: null, // ADDED: Set to null as it's not sent by the frontend
    suburb: customer.suburb,
    postcode: customer.postcode,
    state: customer.state,
    country: 'Australia', // ADDED: Set to default value from SQL schema
    items: JSON.stringify(trolley),
    delivery_fee: deliveryFee, 
    total_amount: grandTotal, 
    stripe_id: paymentIntent.id, // FIXED: Maps 'stripe_payment_id' to SQL 'stripe_id'
    status: 'pending',
    // Removed redundant created_at: new Date().toISOString()
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


// ------------------- START SERVER -------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Test Checkout at http://localhost:${PORT}/checkout.html`);
});
