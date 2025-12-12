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
import enMarketing from "./locales/en/marketing.json";
import enDashboard from "./locales/en/dashboard.json";

import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esNavigation from "./locales/es/navigation.json";
import esEquipment from "./locales/es/equipment.json";
import esBooking from "./locales/es/booking.json";
import esMessaging from "./locales/es/messaging.json";
import esPayment from "./locales/es/payment.json";
import esReviews from "./locales/es/reviews.json";
import esVerification from "./locales/es/verification.json";
import esMarketing from "./locales/es/marketing.json";
import esDashboard from "./locales/es/dashboard.json";

import frCommon from "./locales/fr/common.json";
import frAuth from "./locales/fr/auth.json";
import frNavigation from "./locales/fr/navigation.json";
import frEquipment from "./locales/fr/equipment.json";
import frBooking from "./locales/fr/booking.json";
import frMessaging from "./locales/fr/messaging.json";
import frPayment from "./locales/fr/payment.json";
import frReviews from "./locales/fr/reviews.json";
import frVerification from "./locales/fr/verification.json";
import frMarketing from "./locales/fr/marketing.json";
import frDashboard from "./locales/fr/dashboard.json";

import deCommon from "./locales/de/common.json";
import deAuth from "./locales/de/auth.json";
import deNavigation from "./locales/de/navigation.json";
import deEquipment from "./locales/de/equipment.json";
import deBooking from "./locales/de/booking.json";
import deMessaging from "./locales/de/messaging.json";
import dePayment from "./locales/de/payment.json";
import deReviews from "./locales/de/reviews.json";
import deVerification from "./locales/de/verification.json";
import deMarketing from "./locales/de/marketing.json";
import deDashboard from "./locales/de/dashboard.json";

import itCommon from "./locales/it/common.json";
import itAuth from "./locales/it/auth.json";
import itNavigation from "./locales/it/navigation.json";
import itEquipment from "./locales/it/equipment.json";
import itBooking from "./locales/it/booking.json";
import itMessaging from "./locales/it/messaging.json";
import itPayment from "./locales/it/payment.json";
import itReviews from "./locales/it/reviews.json";
import itVerification from "./locales/it/verification.json";
import itMarketing from "./locales/it/marketing.json";
import itDashboard from "./locales/it/dashboard.json";

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
    marketing: enMarketing,
    dashboard: enDashboard,
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
    marketing: esMarketing,
    dashboard: esDashboard,
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
    marketing: frMarketing,
    dashboard: frDashboard,
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
    marketing: deMarketing,
    dashboard: deDashboard,
  },
  it: {
    common: itCommon,
    auth: itAuth,
    navigation: itNavigation,
    equipment: itEquipment,
    booking: itBooking,
    messaging: itMessaging,
    payment: itPayment,
    reviews: itReviews,
    verification: itVerification,
    marketing: itMarketing,
    dashboard: itDashboard,
  },
} as const;

// Custom language detector to check locally stored user preference
const customLanguageDetector = {
  name: "localStorageUserPreference",
  lookup() {
    try {
      // Check if user has language preference stored locally (synced from Supabase after login)
      const userLang = localStorage.getItem("userLanguagePreference");
      if (userLang) return userLang;
    } catch {
      // localStorage may be unavailable (private browsing, disabled, etc.)
    }
    return undefined;
  },
  cacheUserLanguage(lng: string) {
    try {
      localStorage.setItem("userLanguagePreference", lng);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  },
};

// Create and configure LanguageDetector
const languageDetector = new LanguageDetector();
languageDetector.addDetector(customLanguageDetector);

// Initialize i18n - when resources are provided inline, init is synchronous
i18n
  .use(languageDetector)
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
      "marketing",
      "dashboard",
    ],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: [
        "localStorageUserPreference",
        "localStorage",
        "navigator",
        "htmlTag",
      ],
      caches: ["localStorage"],
      lookupLocalStorage: "userLanguagePreference",
    },
    react: {
      useSuspense: false, // Disable suspense to avoid render blocking
    },
  })
  .catch((error: Error) => {
    console.error("i18n initialization failed:", error);
  });

export default i18n;
