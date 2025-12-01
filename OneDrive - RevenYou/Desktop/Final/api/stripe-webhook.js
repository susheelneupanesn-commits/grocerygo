const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { buffer } = require('micro'); 

// Use secret keys from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); 
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Vercel/Next.js specific configuration to disable default bodyParser
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).end("Method Not Allowed");
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // 1. Verify the webhook signature for security
        event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
        console.error(`⚠️ Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        console.log(`PaymentIntent ${paymentIntentId} was successful. Attempting Supabase update.`);

        // 3. Update order status in Supabase
        // We use the ID saved in the payment_intent_id column
        const { error } = await supabase
            .from("orders")
            .update({ status: "Successful", stripe_status: "succeeded" })
            .eq("payment_intent_id", paymentIntentId); 

        if (error) {
            console.error("Supabase update failed for successful PI:", error);
            // Must return 200 even on database error so Stripe doesn't retry indefinitely
            return res.status(200).json({ received: true, error: "Database Update Failed" }); 
        }
        
        console.log(`Order status updated for PI: ${paymentIntentId}`);

    } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        console.error(`PaymentIntent ${paymentIntentId} failed.`);

        // Optional: Update order to 'Failed' status
        const { error } = await supabase
            .from("orders")
            .update({ status: "Failed", stripe_status: "failed" })
            .eq("payment_intent_id", paymentIntentId); 
            
        if (error) {
            console.error("Supabase update failed for failed PI:", error);
        }
    } else {
        // Log other events but don't take action
        console.log(`Unhandled event type ${event.type}`);
    }

    // 4. Return success to Stripe
    res.json({ received: true });
};
