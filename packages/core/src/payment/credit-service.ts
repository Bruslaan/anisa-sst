import {CREDIT_PACKAGES, createCheckoutSession, CREDIT_PACKAGES_RU} from "./stripe-service";
import createPayment from "../payment/yookassa-service";
import {detectLanguage, translate} from "../i18n";
import {sendMessage, sendInteractiveButtons} from "../whatsapp/helper";
import {User} from "../supabase/types";
import {replyWithCallToAction} from "../whatsapp/helper";
import {addCredits, getUserCredits} from "../supabase/credits";
import {WhatsappMessage} from "../whatsapp/wa-types";

/**
 * Check if a user has credits and handle the case when they don't
 * @returns true if user has credits, false if not
 */
export async function checkCredits(user: User): Promise<number> {
    const credits = await getUserCredits(user.id);
    return credits;
}

/**
 * Send a message to a user when they have no credits
 */
export async function sendNoCreditsMessage(
    user: User,
    business_phone_number_id: string,
): Promise<void> {
    const language = detectLanguage(user.phone_number);

    await sendMessage(
        business_phone_number_id,
        {
            from: user.phone_number,
            text: {
                body: translate('noCredits', language)
            }
        } as WhatsappMessage
    );

    // Send "Refill Credits?" button
    await sendInteractiveButtons({
        header: translate('creditsRequiredHeader', language),
        body: translate('refillQuestion', language),
        footer: translate('buttonProceed', language),
        buttons: [
            {
                id: "refill_credits",
                title: translate('yesRefill', language),
            },
            {
                id: "not_now",
                title: translate('notNow', language),
            },
        ],
    });
}

/**
 * Send the credit package options to a user
 */
export async function sendCreditPackageOptions(
    user: User,
    business_phone_number_id: string,
): Promise<void> {
    const language = detectLanguage(user.phone_number);

    await sendMessage(
        business_phone_number_id,
        {
            from: user.phone_number,
            text: {
                body: translate('selectPackage', language)
            }
        } as WhatsappMessage
    );

    // Get currency and format based on language
    const packages = language === 'ru' ? CREDIT_PACKAGES_RU : CREDIT_PACKAGES;

    const creditText = translate('credits', language);

    const buttons = packages.slice(0, 3).map((pkg) => ({
        id: `credit_pkg_${pkg.id}`,
        title: `${pkg.credits} ${creditText} (${pkg.price})`,
    }));

    await sendInteractiveButtons({
        header: translate('packageHeader', language),
        body: translate('packageBody', language),
        footer: translate('packageFooter', language),
        buttons,
    });
}

/**
 * Process a user's selection of a credit package and send payment link
 */
export async function handleCreditPackageSelection(
    user: User,
    packageId: string,
    business_phone_number_id: string,
): Promise<void> {
    // Extract the actual package ID from the button ID (e.g., "credit_pkg_basic" -> "basic")
    const actualPackageId = packageId.replace("credit_pkg_", "");

    // Find the selected package
    // We need to select the right package based on language now
    const language = detectLanguage(user.phone_number);
    const packages = language === 'ru' ? CREDIT_PACKAGES_RU : CREDIT_PACKAGES;
    const selectedPackage = packages.find(
        (pkg) => pkg.id === actualPackageId,
    );

    if (!selectedPackage) {
        await sendMessage(
            business_phone_number_id,
            {
                from: user.phone_number,
                text: {
                    body: translate('packageUnavailable', language)
                }
            } as WhatsappMessage
        );
        return;
    }

    // Base URL for your application (we should use actual base URL from env)
    const baseUrl = process.env.APP_URL || "https://www.myanisa.com";

    // Use YooKassa for Russian users, Stripe for others
    const isRussianUser = language === 'ru';

    // const isYookassa = true; // TODO: check if the phone starts with 7 then it is russia then use YuKassa or some other russian provider. Still to be done
    if (isRussianUser) { // TODO: don't like this, but ok for now
        const yookassaPayment = await createPayment(
            selectedPackage.price.toString(),
            user.phone_number,
            user.id
            , selectedPackage.credits);

        if (yookassaPayment?.confirmation?.confirmation_url) {
            await replyWithCallToAction({
                business_phone_number_id: business_phone_number_id,
                message: {
                    from: user.phone_number
                } as WhatsappMessage,
                header: translate('purchaseHeader', language),
                body: translate('purchaseBody', language, {
                    credits: selectedPackage.credits.toString(),
                    price: `${selectedPackage.price} ${selectedPackage.currency}`
                }),
                footer: translate('yookassaFooter', language),
                buttonText: translate('payNow', language),
                url: yookassaPayment.confirmation.confirmation_url,
            });
        } else {
            await sendMessage(
                business_phone_number_id,
                {
                    from: user.phone_number,
                    text: {
                        body: translate('paymentError', language)
                    }
                } as WhatsappMessage
            );
        }
    } else {
        const paymentLink = await createCheckoutSession(
            user.id,
            user.phone_number,
            actualPackageId,
            baseUrl,
        );

        if (paymentLink.success && paymentLink.url) {
            await replyWithCallToAction({
                header: translate('purchaseHeader', language),
                body: translate('purchaseBody', language, {
                    credits: selectedPackage.credits.toString(),
                    price: `${selectedPackage.price} ${selectedPackage.currency}`
                }),
                footer: translate('stripeFooter', language),
                buttonText: translate('payNow', language),
                url: paymentLink.url,
            });
        } else {
            await sendMessage(
                business_phone_number_id,
                {
                    from: user.phone_number,
                    text: {
                        body: translate('paymentError', language)
                    }
                } as WhatsappMessage
            );
        }
    }
}

/**
 * Add credits to a user's account after successful payment
 */
export async function processPurchase(
    userId: string,
    credits: number,
    paymentId: string,
    phoneNumber: string,
): Promise<boolean> {
    try {
        console.log(
            `Processing purchase for user ${userId} with phone number ${phoneNumber || "noPhoneCase"}: ${credits} credits with payment ID ${paymentId}`,
        );
        await addCredits(userId, credits, paymentId);

        // TODO: Send a confirmation message to the user via WhatsApp
        // We'd need to create a new MetaMessageService instance here
        // or create a separate function for this

        return true;
    } catch (error) {
        console.error("Error processing purchase:", error);
        return false;
    }
}
