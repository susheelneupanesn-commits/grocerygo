import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-11-30" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amount, trolley, customer } = req.body;

    if (!amount || !trolley || !customer) return res.status(400).json({ error: "Missing required fields" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,        // in cents
      currency: "aud",
      automatic_payment_methods: { enabled: true },
    });

    const orderNumber = `GGO-${Math.floor(100000 + Math.random() * 900000)}`;
    const subtotal = trolley.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const orderData = {
      stripe_payment_intent_id: paymentIntent.id,
      order_number: orderNumber,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      customer_address: customer.address,
      postcode: customer.postcode,
      delivery_date: customer.deliveryDate,
      delivery_time: customer.deliveryTime,
      delivery_fee: customer.deliveryFee,
      subtotal,
      grand_total: amount / 100,
      items: trolley,
      status: "Pending Payment",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("orders").insert(orderData);
    if (error) return res.status(500).json({ error: "Failed saving order in Supabase" });

    res.status(200).json({ clientSecret: paymentIntent.client_secret, orderNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
