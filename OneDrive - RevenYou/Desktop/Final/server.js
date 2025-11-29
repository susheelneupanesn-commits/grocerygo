
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.sk_test_51SUX2KAmiKZAr3ZsMbzqoInpVR5IttKq4O5l0QP6ZUJQI9Ru01AnNl3ET3pcEP6NrQpGn2zw7iiSWaPWjtSvfzhp00g4X8HSOD || sk_test_51SUX2KAmiKZAr3ZsMbzqoInpVR5IttKq4O5l0QP6ZUJQI9Ru01AnNl3ET3pcEP6NrQpGn2zw7iiSWaPWjtSvfzhp00g4X8HSOD);
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------- SUPABASE -------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------- POSTCODES -------------------
const allowedPostcodes = [
  4000,4005,4006,4007,4008,4009,4010,4011,4012,4013,4014,4017,4018,4025,
  4029,4030,4031,4032,4034,4035,4036,4051,4053,4054,4055,4059,4060,4061,
  4064,4065,4066,4067,4068,4069,4070,4072,4073,4074,4075,4076,4077,4078,
  4101,4102,4103,4104,4105,4106,4107,4108,4109,4110,4111,4112,4113,4114,
  4115,4116,4117,4118,4119,4120,4121,4122,4123,4124,4125,4127,4128,4129,
  4130,4132,4133,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,
  4163,4164,4165,4169,4170,4171,4172,4173,4174,4178,4179,4183,4184,4205,
  4207,4280,4285,4300,4301,4303,4304,4305,4306,4307,4308,4311,4340,4346,
  4500,4501,4502,4503,4504,4505,4506,4507,4508,4509,4510,4511,4512,4513,
  4514,4515,4516,4517,4518,4519,4520,4521
];

// ------------------- CREATE PAYMENT INTENT -------------------
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { trolley, customer } = req.body;
    if (!trolley || trolley.length === 0)
      return res.status(400).json({ error: 'Trolley is empty' });

    const postcode = parseInt(customer.postcode, 10);
    if (!allowedPostcodes.includes(postcode))
      return res.status(400).json({ error: 'Sorry, delivery not available in your area.' });

    const amount = trolley.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'aud',
      metadata: { customer_name: customer.name, email: customer.email }
    });

    const { error } = await supabase.from('orders').insert([{
      customer_name: customer.name,
      email: customer.email,
      mobile: customer.mobile,
      address: customer.address,
      suburb: customer.suburb,
      state: customer.state,
      postcode: customer.postcode,
      items: JSON.stringify(trolley),
      total_amount: amount / 100,
      stripe_payment_id: paymentIntent.id,
      status: 'pending'
    }]);

    if (error) console.error('Supabase insert error:', error);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------- STATIC PAGES -------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/store', (req, res) => res.sendFile(path.join(__dirname, 'public/store.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public/contact.html')));

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
