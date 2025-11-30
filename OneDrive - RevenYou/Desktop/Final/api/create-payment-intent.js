import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Delivery fee by distance (example postcode logic)
function getDeliveryFee(postcode) {
  const first10km = [4000, 4005, 4006, 4007, 4008]; // add your exact AU postcodes
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
    const deliveryFee = getDeliveryFee(customer.postcode);
    const grandTotal = subtotal + deliveryFee;

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100), // amount in cents
      currency: "aud",
      automatic_payment_methods: { enabled: true },
    });

    // Generate order number
    const orderNumber = `GGO-${Math.floor(100000 + Math.random() * 900000)}`;

    // Insert order into Supabase
    const { error } = await supabase.from("orders").insert({
      stripe_payment_intent_id: paymentIntent.id,
      order_number: orderNumber,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      customer_address: customer.address,
      postcode: customer.postcode,
      delivery_fee: deliveryFee,
      subtotal,
      grand_total: grandTotal,
      items: trolley,
      status: "Pending Payment",
      created_at: new Date().toISOString(),
    });

    if (error) return res.status(500).json({ error: "Supabase insert failed", details: error });

    // For testing: generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    res.status(200).json({ clientSecret: paymentIntent.client_secret, orderNumber, otp });

  } catch (err) {
    console.error("Payment API error:", err);
    res.status(500).json({ error: err.message });
  }
}
