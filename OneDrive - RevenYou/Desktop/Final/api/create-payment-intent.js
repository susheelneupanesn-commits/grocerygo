// create-payment-intent.js
import express from "express";
import Stripe from "stripe";
import admin from "firebase-admin";

const router = express.Router();
const stripe = new Stripe("sk_test_YOUR_SECRET_KEY_HERE", { apiVersion: "2025-11-30" });

// Initialize Firebase Admin (Service Account Key JSON)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, trolley, customer } = req.body;

    if (!amount || !trolley || !customer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
    });

    // 2. Save order placeholder in Firestore
    const orderNumber = Math.floor(100000 + Math.random() * 900000);
    const orderData = {
      orderId: paymentIntent.id,
      orderNumber: `GGO-${orderNumber}`,
      customer,
      items: trolley.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
      totals: { subtotal: trolley.reduce((sum, i) => sum + i.price * i.quantity, 0), deliveryFee: customer.deliveryFee, grandTotal: amount/100 },
      status: "Pending Payment",
      created: new Date().toISOString(),
    };

    await db.collection(`orders`).doc(paymentIntent.id).set(orderData);

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
