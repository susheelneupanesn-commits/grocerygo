// /api/get-orders.js

import { createClient } from "@supabase/supabase-js";

// Use the Service Role Key for secure server-side read access
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); 

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Fetch all orders, ordered by newest first
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch orders", details: error.message });
    }

    // Return the data securely to the admin client
    res.status(200).json({ orders });

  } catch (err) {
    console.error("Admin API error:", err);
    res.status(500).json({ error: err.message });
  }
}