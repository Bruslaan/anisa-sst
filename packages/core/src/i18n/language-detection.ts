// src/services/i18n/language-utils.ts
export type SupportedLanguage = 'en' | 'de' | 'ru';

// Simple function to detect language from phone number
export function detectLanguage(phoneNumber: string): SupportedLanguage {
  // Remove potential '+' prefix
  const phone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
  
  // Russian numbers
  if (phone.startsWith('7')) {
    return 'ru';
  }
  // German numbers
  else if (phone.startsWith('49')) {
    return 'de';
  }
  // Default to English
  return 'en';
}