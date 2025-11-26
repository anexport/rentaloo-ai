import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translations
import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enNavigation from "./locales/en/navigation.json";
import enEquipment from "./locales/en/equipment.json";
import enBooking from "./locales/en/booking.json";
import enMessaging from "./locales/en/messaging.json";
import enPayment from "./locales/en/payment.json";
import enReviews from "./locales/en/reviews.json";
import enVerification from "./locales/en/verification.json";

import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esNavigation from "./locales/es/navigation.json";
import esEquipment from "./locales/es/equipment.json";
import esBooking from "./locales/es/booking.json";
import esMessaging from "./locales/es/messaging.json";
import esPayment from "./locales/es/payment.json";
import esReviews from "./locales/es/reviews.json";
import esVerification from "./locales/es/verification.json";

import frCommon from "./locales/fr/common.json";
import frAuth from "./locales/fr/auth.json";
import frNavigation from "./locales/fr/navigation.json";
import frEquipment from "./locales/fr/equipment.json";
import frBooking from "./locales/fr/booking.json";
import frMessaging from "./locales/fr/messaging.json";
import frPayment from "./locales/fr/payment.json";
import frReviews from "./locales/fr/reviews.json";
import frVerification from "./locales/fr/verification.json";

import deCommon from "./locales/de/common.json";
import deAuth from "./locales/de/auth.json";
import deNavigation from "./locales/de/navigation.json";
import deEquipment from "./locales/de/equipment.json";
import deBooking from "./locales/de/booking.json";
import deMessaging from "./locales/de/messaging.json";
import dePayment from "./locales/de/payment.json";
import deReviews from "./locales/de/reviews.json";
import deVerification from "./locales/de/verification.json";

// Define resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    equipment: enEquipment,
    booking: enBooking,
    messaging: enMessaging,
    payment: enPayment,
    reviews: enReviews,
    verification: enVerification,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    navigation: esNavigation,
    equipment: esEquipment,
    booking: esBooking,
    messaging: esMessaging,
    payment: esPayment,
    reviews: esReviews,
    verification: esVerification,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    navigation: frNavigation,
    equipment: frEquipment,
    booking: frBooking,
    messaging: frMessaging,
    payment: frPayment,
    reviews: frReviews,
    verification: frVerification,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    navigation: deNavigation,
    equipment: deEquipment,
    booking: deBooking,
    messaging: deMessaging,
    payment: dePayment,
    reviews: deReviews,
    verification: deVerification,
  },
} as const;

// Custom language detector to check Supabase user metadata
const customLanguageDetector = {
  name: "supabaseUserMetadata",
  lookup() {
    // Check if user has language preference in metadata (will be set after login)
    const userLang = localStorage.getItem("userLanguagePreference");
    if (userLang) return userLang;
    return undefined;
  },
  cacheUserLanguage(lng: string) {
    localStorage.setItem("userLanguagePreference", lng);
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: [
      "common",
      "auth",
      "navigation",
      "equipment",
      "booking",
      "messaging",
      "payment",
      "reviews",
      "verification",
    ],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: [
        "supabaseUserMetadata",
        "localStorage",
        "navigator",
        "htmlTag",
      ],
      caches: ["localStorage"],
      lookupLocalStorage: "userLanguagePreference",
    },
  });

// Add custom detector
i18n.services.languageDetector?.addDetector(customLanguageDetector);

export default i18n;
