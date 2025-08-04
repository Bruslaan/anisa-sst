import {WhatsappMessage} from "./whatsapp/wa-types";
import {Supabase} from "./supabase";
import getOrCreateUser = Supabase.getOrCreateUser;
import {detectLanguage} from "./i18n/language-detection";
import {translate} from "./i18n/translations";
import {reply, sendMessage} from "./whatsapp/helper";
import {handleCreditPackageSelection, sendCreditPackageOptions} from "./payment/credit-service";

/**
 * Handler for interactive messages (button responses)
 */
export async function handleInteractiveMessage(
    message: WhatsappMessage,
    business_phone_number_id: string,
) {
    if (message.type !== "interactive") {
        return;
    }

    const buttonId = message.interactive!.button_reply.id;
    if (!buttonId) {
        return;
    }

    const user = await getOrCreateUser(message.from);
    const language = detectLanguage(message.from);


    // Handle different button responses
    switch (buttonId) {
        case "refill_credits":
            // User wants to refill credits
            await sendCreditPackageOptions(user);
            break;

        case "not_now":
            // User doesn't want to refill now
            await sendMessage(
                business_phone_number_id,
                {
                    ...message, text: {
                        body: translate('notNowResponse', language)
                    }
                },
            );
            break;

        case "credit_pkg_basic":
        case "credit_pkg_standard":
        case "credit_pkg_premium":
            // User selected a credit package
            await handleCreditPackageSelection(user, buttonId);
            break;

        default:
            // Unknown button ID
            await sendMessage(
                business_phone_number_id,
                {
                    ...message, text: {
                        body: translate('unknownButtonResponse', language)
                    }
                }
            );
    }
}