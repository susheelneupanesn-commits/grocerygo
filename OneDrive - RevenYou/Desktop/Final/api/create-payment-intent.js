// /api/create-payment-intent.js

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Make sure your keys are set in your environment variables!
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
// Using the Service Role Key for server-side operations
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); 

// Delivery fee logic remains the same
function getDeliveryFee(postcode) {
  const first10km = [4000, 4005, 4006, 4007, 4008]; 
  const km10to20 = [4009, 4010, 4011]; 
  const km20plus = [4012, 4013];

  if (first10km.includes(Number(postcode))) return 10;
  if (km10to20.includes(Number(postcode))) return 15;
  if (km20plus.includes(Number(postcode))) return 20;
  return 25; // default
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { trolley, customer } = req.body;
    if (!trolley || !customer) return res.status(400).json({ error: "Missing required fields" });

    const subtotal = trolley.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Use the postcode from the customer object passed from the frontend
    const deliveryFee = getDeliveryFee(customer.postcode); 
    const grandTotal = subtotal + deliveryFee;

    // 1. Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100), // amount in cents
      currency: "aud",
      automatic_payment_methods: { enabled: true },
    });

    // 2. Generate order number
    const orderNumber = `GGO-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Insert order into Supabase with PENDING status
    // ... in server.js, inside the POST /api/create-payment-intent route

// NOTE: We assume customer.address is the single address line being sent from the frontend.
const { error } = await supabase.from('orders').insert([{
    order_number: orderNumber,
    customer_name: customer.name,
    email: customer.email,
    phone: customer.mobile, // Mapped 'customer.mobile' (from frontend) to 'phone' (in SQL)
    address_line1: customer.address, // Mapped 'customer.address' to 'address_line1'
    address_line2: null, // Set to null since the frontend doesn't send it
    suburb: customer.suburb,
    postcode: customer.postcode,
    state: customer.state,
    items: JSON.stringify(trolley),
    total_amount: grandTotal, 
    delivery_fee: deliveryFee, // Ensure you are inserting this if you add the column!
    stripe_id: paymentIntent.id, // Mapped 'stripe_payment_id' to 'stripe_id'
    status: 'pending',
}]);
    if (error) return res.status(500).json({ error: "Supabase insert failed", details: error });

    // For testing: generate OTP (This is fine for testing but should be removed in production)
    const otp = Math.floor(100000 + Math.random() * 900000);

    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret, 
      orderNumber, 
      otp,
      grandTotal: grandTotal, // Useful to return for confirmation display
    });

  } catch (err) {
    console.error("Payment API error:", err);
    res.status(500).json({ error: err.message });
  }
}
