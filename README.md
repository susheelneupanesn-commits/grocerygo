# GroceryGo — Nepali / South Asian Grocery Demo

## Files
- index.html — Homepage (Cultural Nepali fusion)
- store.html — Store, cart, checkout, receipt, survey
- styles.css — Styling
- script.js — Frontend logic
- serverless/sendReceipt.js — Serverless SendGrid example
- .env.example — environment variables template

## How to run locally
1. Save all files into a folder `GroceryGo/`.
2. (Optional) Add product images into `assets/` and update `script.js` product `img` URLs.
3. Open `index.html` in your browser. Click **Start Shopping**.
4. On the store page: add items to cart, checkout (use a 16-digit test card like `4242424242424242`), view receipt, and simulate sending via email/SMS (client-side demo).
5. Survey triggers after a demo delay (`SURVEY_DELAY_MS` in `script.js`). Set to `30 * 60 * 1000` for 30 minutes in production.

## SendGrid serverless function
- Deploy `serverless/sendReceipt.js` to Vercel / Netlify / AWS Lambda.
- Configure environment variables:
  - `SENDGRID_API_KEY`
  - `FROM_EMAIL`
- From the frontend you can POST to the deployed endpoint:
```js
fetch('/api/sendReceipt', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ to: customerEmail, order: orderObj })
})
