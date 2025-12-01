// Initialization
const stripe = Stripe("pk_test_51SUX2cAtxwsqQt5Tf4eFuJC4uXKoauXjBAU5TiHC7MZnlR7rI6HIyHCMYJFeaCU7rSkQ4FBJD5q53QOw3DPKcOlg00VHp43m4l");
const form = document.getElementById("payment-form");
const messageContainer = document.getElementById("message");
const payButton = document.getElementById("pay");

let elements; // To hold the Stripe Elements instance

/**
 * Step 1: Initialize the Stripe Payment Element UI.
 * This is done by fetching a temporary Payment Intent's client secret.
 */
async function initialize() {
    const trolley = JSON.parse(localStorage.getItem("trolley") || "[]");
    
    // Check if trolley is empty 
    if (trolley.length === 0) {
        messageContainer.textContent = "Your cart is empty. Please add items to proceed.";
        payButton.disabled = true;
        return;
    }
    
    // Create placeholder customer data just to get a clientSecret for UI setup.
    // The actual PI is created on form submission.
    const tempCustomer = {
        name: "Placeholder", email: "temp@example.com", mobile: "0", 
        address: "1", suburb: "Test", state: "QLD", postcode: "4000"
    };

    try {
        // Fetch client secret for PI setup
        const resp = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trolley, customer: tempCustomer })
        });
        const data = await resp.json();
        
        if (!resp.ok) throw new Error(data.error || "Failed to initialize payment.");

        const { clientSecret } = data;

        // Initialize Stripe Elements
        elements = stripe.elements({ clientSecret });

        // Create and mount the Payment Element
        const paymentElement = elements.create('payment', {
            layout: 'tabs',
            // Disable collection of name/email by the Payment Element since we collect them ourselves
            fields: { 
                billingDetails: { 
                    name: 'never', 
                    email: 'never' 
                }
            }
        });
        paymentElement.mount('#payment-element');

    } catch (err) {
        messageContainer.textContent = `Initialization Error: ${err.message}. Please check console.`;
        console.error("Stripe/API Initialization Error:", err);
        payButton.disabled = true;
    }
}

/**
 * Step 2: Handle Form Submission and Payment Confirmation.
 * 1. Creates the final Payment Intent.
 * 2. Confirms the payment using the Stripe Payment Element data.
 */
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    payButton.disabled = true;
    messageContainer.textContent = 'Processing payment... Do not close this window.';

    // Collect all customer data from form inputs
    const customer = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        suburb: document.getElementById("suburb").value,
        state: document.getElementById("state").value,
        postcode: document.getElementById("postcode").value
    };

    const trolley = JSON.parse(localStorage.getItem("trolley") || "[]");
    
    if (!trolley.length) {
        messageContainer.textContent = "Cart is empty.";
        payButton.disabled = false;
        return;
    }

    try {
        // 1. Create a NEW Payment Intent (with final correct customer/trolley data)
        const resp = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trolley, customer })
        });
        const data = await resp.json();
        
        if (!resp.ok) throw new Error(data.error || "Payment intent creation failed. Check postcode/trolley.");

        const { clientSecret, orderNumber } = data;

        // 2. Confirm the Payment using the Payment Element
        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            clientSecret: clientSecret,
            confirmParams: {
                // Stripe will redirect here on successful payment/3DS completion
                return_url: window.location.origin + '/success.html?order=' + orderNumber, 
                // Pass collected customer details as billing details
                payment_method_data: {
                    billing_details: {
                        name: customer.name,
                        email: customer.email,
                        phone: customer.mobile,
                        address: {
                            line1: customer.address,
                            city: customer.suburb,
                            state: customer.state,
                            postal_code: customer.postcode,
                            country: 'AU' 
                        }
                    }
                }
            }
        });

        if (stripeError) {
            // Display errors from Stripe confirmation
            messageContainer.textContent = stripeError.message;
            payButton.disabled = false;
        } 
        // On success, Stripe handles the redirect to /success.html.

    } catch (err) {
        messageContainer.textContent = `Payment Failed: ${err.message}`;
        payButton.disabled = false;
    }
});

initialize(); // Start the process
