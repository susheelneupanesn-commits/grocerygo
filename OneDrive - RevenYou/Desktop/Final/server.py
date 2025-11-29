# server.py

from flask import Flask, jsonify, request, send_from_directory
import stripe
import os

# ⚠️ IMPORTANT: Replace with your actual Stripe Secret Key!
stripe.api_key = os.getenv("sk_test_51SUX2KAmiKZAr3ZsMbzqoInpVR5IttKq4O5l0QP6ZUJQI9Ru01AnNl3ET3pcEP6NrQpGn2zw7iiSWaPWjtSvfzhp00g4X8HSOD")

# Set up the Flask application
# static_folder='public' tells Flask where your HTML, CSS, JS files are
app = Flask(__name__, static_folder='public', static_url_path='')

# --- Static File Serving ---
@app.route("/")
@app.route("/<path:filename>")
def serve_static(filename=None):
    if filename is None or filename == "":
        filename = "store.html" # Default file to serve for /
    
    try:
        return send_from_directory(app.static_folder, filename)
    except:
        return "File Not Found", 404

# --- Payment Intent API Endpoint ---
@app.route("/create-payment-intent", methods=["POST"])
def create_payment_intent():
    try:
        # Get data sent from the frontend.
        data = request.get_json()
        
        # 🎯 FIX: The client must send the 'amount' key as an integer (in cents).
        amount_usd_cents = data.get('amount') 

        if not amount_usd_cents or not isinstance(amount_usd_cents, int):
            # This is the error message the frontend received earlier.
            return jsonify({"error": "Invalid or missing amount"}), 400

        # Create the Payment Intent using your secret key
        intent = stripe.PaymentIntent.create(
            amount=amount_usd_cents, 
            currency="aud", # Assuming you are using AU. Adjust if needed.
            automatic_payment_methods={
                "enabled": True,
            },
        )
        
        # Send the client secret back to the frontend
        return jsonify({
            "clientSecret": intent.client_secret
        })

    except Exception as e:
        # Log the detailed error on the server side
        print(f"Error creating payment intent: {e}")
        # Return a generic error message to the client
        return jsonify(error="Failed to create payment intent. Check server logs."), 500

if __name__ == "__main__":
    app.run(port=8000, debug=True)