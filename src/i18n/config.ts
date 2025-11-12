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
import enInventory from './locales/en/inventory.json';
import viInventory from './locales/vi/inventory.json';
import enItems from './locales/en/items.json';
import viItems from './locales/vi/items.json';
import enRooms from './locales/en/rooms.json';
import viRooms from './locales/vi/rooms.json';
import enLaundry from './locales/en/laundry.json';
import viLaundry from './locales/vi/laundry.json';
import enMaintenance from './locales/en/maintenance.json';
import viMaintenance from './locales/vi/maintenance.json';
import enSettings from './locales/en/settings.json';
import viSettings from './locales/vi/settings.json';
import enUsers from './locales/en/users.json';
import viUsers from './locales/vi/users.json';
import enHotels from './locales/en/hotels.json';
import viHotels from './locales/vi/hotels.json';
import enReports from './locales/en/reports.json';
import viReports from './locales/vi/reports.json';
import enVendors from './locales/en/vendors.json';
import viVendors from './locales/vi/vendors.json';
import enProfile from './locales/en/profile.json';
import viProfile from './locales/vi/profile.json';
import enSidebar from './locales/en/sidebar.json';
import viSidebar from './locales/vi/sidebar.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    inventory: enInventory,
    items: enItems,
    rooms: enRooms,
    laundry: enLaundry,
    maintenance: enMaintenance,
    settings: enSettings,
    users: enUsers,
    hotels: enHotels,
    reports: enReports,
    vendors: enVendors,
    profile: enProfile,
    sidebar: enSidebar,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    dashboard: viDashboard,
    inventory: viInventory,
    items: viItems,
    rooms: viRooms,
    laundry: viLaundry,
    maintenance: viMaintenance,
    settings: viSettings,
    users: viUsers,
    hotels: viHotels,
    reports: viReports,
    vendors: viVendors,
    profile: viProfile,
    sidebar: viSidebar,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'inventory', 'items', 'rooms', 'laundry', 'maintenance', 'settings', 'users', 'hotels', 'reports', 'vendors', 'profile', 'sidebar'],
    
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
