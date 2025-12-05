import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:"Method not allowed"});

  try{
    const {amount,name,email,phone,address,suburb,postcode,state,deliverySlot,cart,method} = req.body;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'aud',
      payment_method_types:['card'],
      description: `Order for ${email}`,
      metadata:{name,email,method}
    });

    // Save order to Supabase
    await supabase.from('orders').insert({
      name,email,phone,address,suburb,postcode,state,deliverySlot,
      cart: JSON.stringify(cart),
      total: amount/100,
      payment_method: method,
      status:'pending',
      created_at:new Date().toISOString()
    });

    res.json({clientSecret: paymentIntent.client_secret});
  }catch(err){
    console.error(err);
    res.status(500).json({error: err.message});
  }
}
