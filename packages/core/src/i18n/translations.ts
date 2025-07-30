// src/services/i18n/translations.ts
import { SupportedLanguage } from './language-detection';

// Simple translation dictionary
export const translations = {
  // Credit notifications
  creditRemaining: {
    en: "⚠️ You have only {count} credit remaining. Please consider purchasing more credits.",
    de: "⚠️ Du hast nur noch {count} Guthaben übrig. Bitte erwäge weitere Guthaben zu kaufen.",
    ru: "⚠️ У тебя остался только {count} токен(ов). Подумай о покупке дополнительных токенов."
  },
  noCredits: {
    en: "You've used all your available credits. To continue, you'll need to purchase additional credits.",
    de: "Du hast alle verfügbaren Guthaben aufgebraucht. Um fortzufahren, musst du zusätzliche Guthaben erwerben.",
    ru: "Ты использовал все доступные токены. Чтобы продолжить, тебе нужно приобрести дополнительные токены."
  },
  
  // Buttons and interactive elements
  creditsRequiredHeader: {
    en: "Credits Required",
    de: "Guthaben Erforderlich",
    ru: "Нужны Токены"
  },
  refillQuestion: {
    en: "Would you like to refill your credits now?",
    de: "Möchtest du jetzt dein Guthaben auffüllen?",
    ru: "Хочешь пополнить токены сейчас?"
  },
  buttonProceed: {
    en: "Click a button to proceed",
    de: "Klicke auf eine Schaltfläche, um fortzufahren",
    ru: "Нажми кнопку, чтобы продолжить"
  },
  yesRefill: {
    en: "Yes",
    de: "Ja",
    ru: "Да"
  },
  notNow: {
    en: "No",
    de: "Nein",
    ru: "Нет"
  },
  
  // Credit packages
  selectPackage: {
    en: "Please select a credit package:",
    de: "Bitte wähle ein Kreditpaket aus:",
    ru: "Пожалуйста, выбери пакет токенов:"
  },
  packageHeader: {
    en: "Credit Packages",
    de: "Kreditpakete",
    ru: "Пакеты Токенов"
  },
  packageBody: {
    en: "Select the package that suits your needs:",
    de: "Wähle das Paket, das deinen Bedürfnissen entspricht:",
    ru: "Выбери пакет, который тебе подходит:"
  },
  packageFooter: {
    en: "Choose an option to proceed",
    de: "Wähle eine Option, um fortzufahren",
    ru: "Выбери вариант, чтобы продолжить"
  },
  packageUnavailable: {
    en: "Sorry, that package is not available. Please try again.",
    de: "Entschuldigung, dieses Paket ist nicht verfügbar. Bitte versuche es erneut.",
    ru: "Извини, этот пакет недоступен. Попробуй еще раз."
  },

  // Response messages
  notNowResponse: {
    en: "Alright! When you're ready to continue using the service, just let me know.",
    de: "In Ordnung! Wenn du bereit bist, den Service weiter zu nutzen, lass es mich einfach wissen.",
    ru: "Хорошо! Когда будешь готов продолжить использование сервиса, просто дай мне знать."
  },
  unknownButtonResponse: {
    en: "I'm not sure what you selected. Please try again or send a message.",
    de: "Ich bin mir nicht sicher, was du ausgewählt hast. Bitte versuche es erneut oder sende eine Nachricht.",
    ru: "Я не понимаю, что ты выбрал. Попробуй еще раз или отправь сообщение."
  },
  
  // Payment
  purchaseHeader: {
    en: "Complete Your Purchase",
    de: "Schließe deinen Kauf ab",
    ru: "Заверши Покупку"
  },
  purchaseBody: {
    en: "You've selected {credits} Credits for {price}. Click the button below to complete your purchase.",
    de: "Du hast {credits} Guthaben für {price} ausgewählt. Klicke unten, um deinen Kauf abzuschließen.",
    ru: "Ты выбрал {credits} токенов за {price}. Нажми на кнопку ниже, чтобы завершить покупку."
  },
  stripeFooter: {
    en: "Secure payment powered by Stripe",
    de: "Sichere Zahlung mit Stripe",
    ru: "Безопасный платеж через Stripe"
  },
  yookassaFooter: {
    en: "Secure payment powered by YooKassa",
    de: "Sichere Zahlung mit YooKassa",
    ru: "Безопасный платеж через ЮKassa"
  },
  paymentError: {
    en: "Sorry, we couldn't create a payment link at this time. Please try again later.",
    de: "Entschuldigung, wir konnten keinen Zahlungslink erstellen. Bitte versuche es später.",
    ru: "Извини, мы не смогли создать ссылку для оплаты. Попробуй позже."
  },

  imageGenerating: {
    en: "We're creating your image now. You'll receive a notification once it's ready!",
    de: "Wir erstellen gerade dein Bild. Du erhältst eine Benachrichtigung, sobald es fertig ist!",
    ru: "Мы создаём твоё изображение. Ты получишь уведомление, как только оно будет готово!"
  },
  // Button text
  payNow: {
    en: "Pay Now",
    de: "Jetzt Bezahlen",
    ru: "Оплатить"
  },
  
  // Credits text
  credits: {
    en: "Credits",
    de: "Guthaben",
    ru: "Токенов"
  }
};

// Simple translation helper
export function translate(key: keyof typeof translations, language: SupportedLanguage, replacements?: Record<string, string | number>): string {
  let text = translations[key][language] || translations[key]['en']; // Fallback to English
  
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      text = text.replace(new RegExp(`{${key}}`, 'g'), value.toString());
    });
  }
  
  return text;
}