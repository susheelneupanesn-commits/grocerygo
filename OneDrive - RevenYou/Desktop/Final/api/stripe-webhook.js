import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { buffer } from 'micro'; 

// Use secret keys from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); 
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

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

    console.log(`PaymentIntent ${paymentIntentId} was successful.`);

    // 3. Update order status in Supabase
    const { error } = await supabase
      .from("orders")
      .update({ status: "Successful", stripe_status: "succeeded" })
      .eq("stripe_id", paymentIntentId); // FIX APPLIED HERE: Changed to stripe_id

    if (error) {
      console.error("Supabase update failed for successful PI:", error);
      return res.status(500).json({ received: true, error: "Database Update Failed" }); 
    }
    
    console.log(`Order status updated for PI: ${paymentIntentId}`);

  } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.error(`PaymentIntent ${paymentIntent.id} failed.`);

      // Optional: Update order to 'Failed' status
      await supabase
        .from("orders")
        .update({ status: "Failed", stripe_status: "failed" })
        .eq("stripe_id", paymentIntent.id); // FIX APPLIED HERE: Changed to stripe_id
  }

  res.json({ received: true });
}
