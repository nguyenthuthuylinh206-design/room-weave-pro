import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations - Common
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viNavigation from './locales/vi/navigation.json';
import viDashboard from './locales/vi/dashboard.json';
import viNotifications from './locales/vi/notifications.json';
import viSettings from './locales/vi/settings.json';
import viReports from './locales/vi/reports.json';

// Import translations - Modules
import viItems from './locales/vi/items.json';
import viRooms from './locales/vi/rooms.json';
import viInventory from './locales/vi/inventory.json';
import viLaundry from './locales/vi/laundry.json';
import viMaintenance from './locales/vi/maintenance.json';
import viVendors from './locales/vi/vendors.json';
import viHotels from './locales/vi/hotels.json';
import viUsers from './locales/vi/users.json';
import viPurchaseOrders from './locales/vi/purchaseOrders.json';
import viDistribution from './locales/vi/distribution.json';
import viSuperAdmin from './locales/vi/superAdmin.json';
import viLanding from './locales/vi/landing.json';

// Import translations - English Common
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enDashboard from './locales/en/dashboard.json';
import enNotifications from './locales/en/notifications.json';
import enSettings from './locales/en/settings.json';
import enReports from './locales/en/reports.json';

// Import translations - English Modules
import enItems from './locales/en/items.json';
import enRooms from './locales/en/rooms.json';
import enInventory from './locales/en/inventory.json';
import enLaundry from './locales/en/laundry.json';
import enMaintenance from './locales/en/maintenance.json';
import enVendors from './locales/en/vendors.json';
import enHotels from './locales/en/hotels.json';
import enUsers from './locales/en/users.json';
import enPurchaseOrders from './locales/en/purchaseOrders.json';
import enDistribution from './locales/en/distribution.json';
import enSuperAdmin from './locales/en/superAdmin.json';

export const resources = {
  vi: {
    common: viCommon,
    auth: viAuth,
    navigation: viNavigation,
    dashboard: viDashboard,
    notifications: viNotifications,
    settings: viSettings,
    reports: viReports,
    items: viItems,
    rooms: viRooms,
    inventory: viInventory,
    laundry: viLaundry,
    maintenance: viMaintenance,
    vendors: viVendors,
    hotels: viHotels,
    users: viUsers,
    purchaseOrders: viPurchaseOrders,
    distribution: viDistribution,
    superAdmin: viSuperAdmin,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    dashboard: enDashboard,
    notifications: enNotifications,
    settings: enSettings,
    reports: enReports,
    items: enItems,
    rooms: enRooms,
    inventory: enInventory,
    laundry: enLaundry,
    maintenance: enMaintenance,
    vendors: enVendors,
    hotels: enHotels,
    users: enUsers,
    purchaseOrders: enPurchaseOrders,
    distribution: enDistribution,
    superAdmin: enSuperAdmin,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'navigation',
      'dashboard',
      'notifications',
      'settings',
      'reports',
      'items',
      'rooms',
      'inventory',
      'laundry',
      'maintenance',
      'vendors',
      'hotels',
      'users',
      'purchaseOrders',
      'distribution',
      'superAdmin',
    ],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
