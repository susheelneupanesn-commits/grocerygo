import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
// REVISION: Use SUPABASE_SERVICE_KEY as defined in your .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); 

// --- START: Delivery/Postcode Logic from server.js ---
// You must move your comprehensive postcode logic (GROUP_A, GROUP_B, etc.)
// from your old server.js into this file to make it a standalone function.
// Using the logic you provided in the original server.js:
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
// --- END: Delivery/Postcode Logic ---

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { trolley, customer } = req.body;
    if (!trolley || !customer) return res.status(400).json({ error: "Missing fields" });

    const deliveryFee = getDeliveryFee(customer.postcode);
    if (deliveryFee === -1) { // REVISION: Check for -1 which signals unavailable delivery
        return res.status(400).json({ error: `Delivery not available for postcode ${customer.postcode}` });
    }
    // ... rest of the code is correct ...
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
