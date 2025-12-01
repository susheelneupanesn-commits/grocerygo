// api/create-payment-intent.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getDeliveryFee(postcode) {
  // your postcode‑to‑fee logic or use a lookup similar to what you had
  // For example:
  const pc = Number(postcode);
  // ... implement mapping logic or tiers ...
  return 10;  // dummy fallback, replace with real logic
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { trolley, customer } = req.body;
  if (!trolley || !customer) return res.status(400).json({ error: "Missing fields" });

  const deliveryFee = getDeliveryFee(customer.postcode);
  if (deliveryFee < 0) {
    return res.status(400).json({ error: `Delivery not available for postcode ${customer.postcode}` });
  }

  const subtotal = trolley.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const grandTotal = subtotal + deliveryFee;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100),
      currency: "aud",
      automatic_payment_methods: { enabled: true },
    });

    const orderNumber = `GGO-${Math.floor(100000 + Math.random() * 900000)}`;

    const { error } = await supabase.from('orders').insert([{
      order_number: orderNumber,
      customer_name: customer.name,
      email: customer.email,
      phone: customer.mobile,
      address_line1: customer.address,
      address_line2: null,
      suburb: customer.suburb,
      postcode: customer.postcode,
      state: customer.state,
      items: JSON.stringify(trolley),
      total_amount: grandTotal,
      delivery_fee: deliveryFee,
      stripe_id: paymentIntent.id,
      status: 'pending'
    }]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed saving order" });
    }

    return res.json({
      clientSecret: paymentIntent.client_secret,
      orderNumber,
      grandTotal
    });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
