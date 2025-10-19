/**
 * serverless/sendReceipt.js
 * Example serverless function using SendGrid.
 * Deploy to Vercel/Netlify/AWS Lambda (Node 14+).
 *
 * Expects POST JSON:
 * { "to": "customer@example.com", "order": { ... } }
 *
 * Environment variables:
 * SENDGRID_API_KEY, FROM_EMAIL
 */
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function buildReceiptHtml(order){
  const rows = order.items.map(it => `<tr><td style="padding:6px 0">${it.name} • ${it.size}</td><td style="text-align:right;padding:6px 0">$${it.subtotal.toFixed(2)}</td></tr>`).join('');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
      <h2>GroceryGo — Receipt</h2>
      <p>Order ID: <strong>${order.id}</strong><br/>Date: ${order.date}</p>
      <p><strong>Delivery:</strong> ${order.address}, ${order.suburb} ${order.postcode}</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <hr/>
      <p>Items total: $${order.itemsTotal.toFixed(2)}<br/>Delivery: $${order.deliveryFee.toFixed(2)}<br/><strong>Grand total: $${order.grand.toFixed(2)}</strong></p>
      <p>Payment: ${order.payment.method} (${order.payment.masked})</p>
      <p>Thank you for shopping with GroceryGo!</p>
    </div>
  `;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send({ error: 'Method not allowed' });
    const { to, order } = req.body;
    if (!to || !order) return res.status(400).send({ error: 'Missing to or order' });
    const msg = {
      to,
      from: process.env.FROM_EMAIL || 'orders@grocerygo.com',
      subject: `GroceryGo Receipt — Order ${order.id}`,
      html: buildReceiptHtml(order)
    };
    await sgMail.send(msg);
    return res.status(200).json({ status: 'sent' });
  } catch (err) {
    console.error('SendGrid error', err);
    return res.status(500).json({ error: 'send_failed', details: err.message });
  }
};
