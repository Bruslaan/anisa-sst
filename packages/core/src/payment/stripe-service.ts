import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Define credit packages
export const CREDIT_PACKAGES = [
  { id: "basic", credits: 200, price: 2.99, currency: "EUR" },
  { id: "standard", credits: 500, price: 4.99, currency: "EUR" },
  { id: "premium", credits: 1200, price: 9.99, currency: "EUR" },
];

export const CREDIT_PACKAGES_RU = [
  { id: "basic", credits: 200, price: 299, currency: "RUB" },
  { id: "standard", credits: 500, price: 499, currency: "RUB" },
  { id: "premium", credits: 1200, price: 999, currency: "RUB" },
];

export type PaymentResult = {
  success: boolean;
  url?: string;
  error?: string;
  sessionId?: string;
};

/**
 * Create a checkout session for credit purchase
 */
export async function createCheckoutSession(
  userId: string,
  phoneNumber: string,
  packageId: string,
  baseUrl: string,
): Promise<PaymentResult> {
  try {
    // Find the selected package
    const selectedPackage = CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);

    if (!selectedPackage) {
      return {
        success: false,
        error: "Invalid package selected",
      };
    }

    // Calculate price in cents
    const priceCents = selectedPackage.price * 100;

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: selectedPackage.currency,
            product_data: {
              name: `${selectedPackage.credits} Credits`,
              description: `Purchase of ${selectedPackage.credits} credits for your AI assistant`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      client_reference_id: userId,
      metadata: {
        userId,
        phoneNumber,
        packageId,
        credits: selectedPackage.credits.toString(),
      },
    });

    return {
      success: true,
      url: session.url || undefined,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Verify a payment was successful from webhook
 */
export async function verifyPayment(sessionId: string): Promise<{
  success: boolean;
  userId?: string;
  phoneNumber?: string;
  credits?: number;
  paymentId?: string;
  error?: string;
}> {
  try {
    console.log(`Verifying payment for session ID: ${sessionId}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return {
        success: false,
        error: "Payment not completed",
      };
    }
    console.log(`Payment verified for session: ${session}`);

    return {
      success: true,
      userId: session.client_reference_id || undefined,
      phoneNumber: session.metadata?.phoneNumber,
      credits: session.metadata?.credits
        ? parseInt(session.metadata.credits)
        : undefined,
      paymentId: session.id,
    };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
