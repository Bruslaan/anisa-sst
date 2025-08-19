import * as stripeService from "./stripe-service";
import {User} from "../supabase/types";

export type PaymentProvider = "stripe" | "other";

export type PaymentPackage = {
    id: string;
    credits: number;
    price: number;
    currency: string;
};

export type PaymentLinkResult = {
    success: boolean;
    url?: string;
    error?: string;
    sessionId?: string;
};

/**
 * Get available credit packages
 */
export function getCreditPackages(
    provider: PaymentProvider = "stripe",
): PaymentPackage[] {
    switch (provider) {
        case "stripe":
            return stripeService.CREDIT_PACKAGES;
        case "other":
            // Implement another payment provider's packages here
            return [];
        default:
            return stripeService.CREDIT_PACKAGES;
    }
}

/**
 * Determine the payment provider based on user's region or preferences
 */
export function getPaymentProviderForUser(user: User): PaymentProvider {
    // Here we want to determine which payment provider to use based on the user's country code in the phone number
    // TODO: Shall we better set a default value in the user database like "locale": "de-DE" or "ru-RU" or "en-US" etc?
    //
    // detect if the phone starts with 7 then it is russia then use YuKassa or some other russian provider. Still to be done
    // otherwise we can use stripe

    const phoneNumber = user.phone_number;
    // Example: Check if the phone number starts with a specific country code
    if (phoneNumber.startsWith("7")) {
        // Use a different payment provider for Russia
        return "other"; //'some_russian_system'; // Placeholder for another payment provider to be updated
    }

    // For now, defaulting to Stripe for everyone else
    return "stripe";
}

/**
 * Create a payment link for the user to purchase credits
 */
export async function createPaymentLink(
    user: User,
    packageId: string,
    baseUrl: string,
): Promise<PaymentLinkResult> {
    const provider = getPaymentProviderForUser(user);

    switch (provider) {
        case "stripe":
            return await stripeService.createCheckoutSession(
                user.id,
                user.phone_number,
                packageId,
                baseUrl,
            );

        case "other":
            // Implement another payment provider here
            return {
                success: false,
                error: "Payment provider not implemented",
            };

        default:
            return {
                success: false,
                error: "Unknown payment provider",
            };
    }
}

/**
 * Verify a payment from a webhook event
 */

// TO BE FINISHED
export async function verifyPaymentFromWebhook(
    provider: PaymentProvider,
    sessionId: string,
) {
    switch (provider) {
        case "stripe":
            return await stripeService.verifyPayment(sessionId);

        case "other":
            // Implement another payment provider here
            return {
                success: false,
                error: "Payment provider not implemented",
            };

        default:
            return {
                success: false,
                error: "Unknown payment provider",
            };
    }
}
