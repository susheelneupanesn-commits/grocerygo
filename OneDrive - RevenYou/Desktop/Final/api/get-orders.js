const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with the Service Role Key for secure server-side access
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use the secure service key here
);

module.exports = async (req, res) => {
    // Enable CORS for client-side access (from admin.html)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Fetch all orders, ordered by newest first
        // NOTE: This uses the SUPABASE_SERVICE_KEY which bypasses Row-Level Security (RLS).
        // This is necessary for a simple admin dashboard, but ensure access to this
        // endpoint is restricted in a true production environment if needed.
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
        }

        // Return the data to the client
        res.status(200).json({ orders });

    } catch (err) {
        console.error('Admin API error:', err);
        res.status(500).json({ error: err.message });
    }
};
