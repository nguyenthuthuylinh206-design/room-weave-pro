import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from './locales/en/common.json';
import viCommon from './locales/vi/common.json';
import enAuth from './locales/en/auth.json';
import viAuth from './locales/vi/auth.json';
import enDashboard from './locales/en/dashboard.json';
import viDashboard from './locales/vi/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    dashboard: viDashboard,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard'],
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLanguage',
    },
    
    react: {
      useSuspense: true,
    },
  });

export default i18n;
