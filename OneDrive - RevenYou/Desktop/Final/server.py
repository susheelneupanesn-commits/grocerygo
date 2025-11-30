import json
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def handler(request):
    try:
        if request.method != "POST":
            return {
                "statusCode": 405,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Method not allowed"})
            }

        body = json.loads(request.body)

        amount_usd_cents = body.get("amount")

        if not amount_usd_cents or not isinstance(amount_usd_cents, int):
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Invalid or missing amount"})
            }

        intent = stripe.PaymentIntent.create(
            amount=amount_usd_cents,
            currency="aud",
            automatic_payment_methods={"enabled": True}
        )

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"clientSecret": intent.client_secret})
        }

    except Exception as e:
        print("Error:", e)
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
