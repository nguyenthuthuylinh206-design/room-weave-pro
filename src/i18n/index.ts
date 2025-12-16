import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import viCommon from './locales/vi/common.json';
import viDashboard from './locales/vi/dashboard.json';
import viAuth from './locales/vi/auth.json';
import viNotifications from './locales/vi/notifications.json';
import viSettings from './locales/vi/settings.json';
import viNavigation from './locales/vi/navigation.json';

import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enAuth from './locales/en/auth.json';
import enNotifications from './locales/en/notifications.json';
import enSettings from './locales/en/settings.json';
import enNavigation from './locales/en/navigation.json';

export const resources = {
  vi: {
    common: viCommon,
    dashboard: viDashboard,
    auth: viAuth,
    notifications: viNotifications,
    settings: viSettings,
    navigation: viNavigation,
  },
  en: {
    common: enCommon,
    dashboard: enDashboard,
    auth: enAuth,
    notifications: enNotifications,
    settings: enSettings,
    navigation: enNavigation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'auth', 'notifications', 'settings', 'navigation'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
