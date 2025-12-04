require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const Stripe = require('stripe');

// --- Env Variables ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !webhookSecret) {
    console.error("Missing env variables");
    process.exit(1);
}

const stripe = Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Zones & Postcodes ---
const GROUP_A = [4300,4301,4303,4304,4305,4306,4307,4308,4311,4114,4118,4124,4125,4127,4128,4129,4131,4132,4133,4207,4280,4285,4290]; // Ipswich+Logan
const GROUP_B = [4169,4170,4171,4172,4173,4174,4178,4179,4157,4158,4159,4160,4161,4163,4164,4165]; // Redlands + surrounding Bne
const GROUP_C = [4000,4005,4006,4007,4008,4009,4010,4011,4012,4013,4014,4017,4018,4025,4029,4030,4031,4032,4034,4035,4036,4051,4053,4054,4055,4059,4060,4061,4064,4065,4066,4067,4068,4069,4070,4072,4073,4074,4075,4076,4077,4078,4101,4102,4103,4104,4105,4106,4107,4108,4109,4110,4111,4112,4113,4114,4115,4116,4117,4118,4119,4120,4121,4122,4123,4124,4125,4127,4128,4129,4130,4132,4133,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,4163,4164,4165,4500,4501,4502,4503,4504,4505,4506,4507,4508,4509,4510,4511,4520]; // Moreton Bay + surrounding

const POSTCODE_DISTANCES = {};
GROUP_A.forEach((pc,i)=>POSTCODE_DISTANCES[pc]=30+(i%5));
GROUP_B.forEach((pc,i)=>POSTCODE_DISTANCES[pc]=15+(i%5));
GROUP_C.forEach((pc,i)=>POSTCODE_DISTANCES[pc]=1+(i%10));

const DISTANCE_FEES = [ {maxKm:10,fee:10},{maxKm:20,fee:15},{maxKm:30,fee:20},{maxKm:Infinity,fee:25} ];

function getDeliveryFee(postcode){
    const dist = POSTCODE_DISTANCES[Number(postcode)];
    if(dist===undefined) return -1;
    for(const df of DISTANCE_FEES) if(dist <= df.maxKm) return df.fee;
    return 25;
}

// --- Delivery Slot Rotation ---
// Rotate zones A/B/C through time slots 8-11, 11-3, 3-6 based on weekday
function calculateDeliverySlot(postcode, dateStr){
    const date = new Date(dateStr+'T00:00:00');
    const weekday = date.getDay(); // 0=Sun, 1=Mon,... 6=Sat
    const slots = ['8-11','11-3','3-6'];
    let zone;
    if(GROUP_A.includes(Number(postcode))) zone='A';
    else if(GROUP_B.includes(Number(postcode))) zone='B';
    else if(GROUP_C.includes(Number(postcode))) zone='C';
    else return 'Unavailable';

    // Rotation: slot index = (zoneIndex + weekday) % 3
    const zoneOrder = ['A','B','C'];
    const slotIndex = (zoneOrder.indexOf(zone) + weekday) % 3;
    return `${zone} ${slots[slotIndex]}`;
}

// --- Stripe Webhook ---
app.post('/api/stripe-webhook', bodyParser.raw({type:'application/json'}), async (req,res)=>{
    const sig = req.headers['stripe-signature'];
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret); }
    catch(e){ return res.status(400).send(`Webhook error: ${e.message}`); }

    if(event.type==='payment_intent.succeeded'){
        const piId = event.data.object.id;
        await supabase.from('orders').update({ status:'Successful', stripe_status:'succeeded' }).eq('stripe_id', piId);
    } else if(event.type==='payment_intent.payment_failed'){
        const piId = event.data.object.id;
        await supabase.from('orders').update({ status:'Failed', stripe_status:'failed' }).eq('stripe_id', piId);
    }
    res.json({received:true});
});

// --- Create Payment Intent ---
app.post('/api/create-payment-intent', async (req,res)=>{
    try {
        const { trolley, customer } = req.body;
        if(!trolley || trolley.length===0) return res.status(400).json({ error:'Trolley is empty' });

        const { name,email,mobile,address,suburb,state,postcode,deliverySlot } = customer;
        const deliveryFee = getDeliveryFee(postcode);
        if(deliveryFee===-1) return res.status(400).json({ error:`Delivery not available in postcode ${postcode}` });

        const subtotal = trolley.reduce((sum,i)=>sum+(i.price||0)*(i.quantity||1),0);
        const grandTotal = subtotal + deliveryFee;
        const amountInCents = Math.round(grandTotal*100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount:amountInCents,
            currency:'aud',
            automatic_payment_methods:{ enabled:true },
            metadata:{ customer_name:name,email }
        });

        // Generate order number
        let orderNumber;
        const { data: serialResult, error: serialError } = await supabase.rpc('get_next_serial_number');
        if(serialError || !serialResult) orderNumber = `GGO-ERR-${Math.floor(10000 + Math.random()*90000)}`;
        else orderNumber = `GGO-${String(serialResult).padStart(4,'0')}`;

        // Save order to Supabase
        const { error } = await supabase.from('orders').insert([{
            order_number: orderNumber,
            customer_name:name,
            email,
            phone:mobile,
            address_line1:address,
            suburb,
            postcode,
            state,
            country:'Australia',
            delivery_slot: deliverySlot==='Anytime'? 'Anytime': calculateDeliverySlot(postcode,new Date().toISOString().split('T')[0]),
            items: JSON.stringify(trolley),
            delivery_fee:deliveryFee,
            total_amount:grandTotal,
            stripe_id:paymentIntent.id,
            status:'pending',
            stripe_status:'pending'
        }]);

        if(error) return res.status(500).json({ error:'Failed to save order.' });
        res.json({ clientSecret:paymentIntent.client_secret, orderNumber });
    } catch(err){ console.error(err); res.status(500).json({ error:'Server error creating payment intent' }); }
});

// --- Admin: Get Orders ---
app.get('/api/get-orders', async (req,res)=>{
    const { data: orders, error } = await supabase.from('orders').select('*').order('created_at',{ascending:false});
    if(error) return res.status(500).json({ error:'Failed to fetch orders' });
    res.status(200).json({ orders });
});

// --- Start Server ---
if(process.env.NODE_ENV!=='production' && !process.env.VERCEL){
    app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
}

module.exports = app;
