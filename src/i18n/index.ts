import i18n, { type BackendModule, type ReadCallback } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// === Eager-loaded core namespaces ===
// Chỉ giữ namespace nhỏ + cần thiết ngay khi mount để tránh suspense flash:
//   - common  : từ chung dùng khắp nơi
//   - auth    : AuthContext + login/register render rất sớm
//   - landing : Landing page là entry cho khách vãng lai
// Tất cả namespace khác (rooms, inventory, laundry, ...) được lazy-load
// theo nhu cầu qua `useTranslation('ns')`.
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viLanding from './locales/vi/landing.json';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enLanding from './locales/en/landing.json';

// === Lazy registry ===
// import.meta.glob KHÔNG eager → mỗi file JSON thành 1 chunk riêng,
// chỉ fetch khi component thực sự cần.
const lazyResources = import.meta.glob('./locales/*/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
>;

const EAGER_KEYS = new Set([
  './locales/vi/common.json',
  './locales/vi/auth.json',
  './locales/vi/landing.json',
  './locales/en/common.json',
  './locales/en/auth.json',
  './locales/en/landing.json',
]);

// In-flight cache để tránh fetch trùng cho cùng 1 (lng, ns).
const inflight = new Map<string, Promise<Record<string, unknown> | null>>();

async function loadResource(language: string, namespace: string) {
  const key = `./locales/${language}/${namespace}.json`;
  if (EAGER_KEYS.has(key)) return null; // đã bundle sẵn
  const loader = lazyResources[key];
  if (!loader) return null;
  let p = inflight.get(key);
  if (!p) {
    p = loader()
      .then((m) => m.default)
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[i18n] Failed to load namespace:', key, err);
        inflight.delete(key);
        return null;
      });
    inflight.set(key, p);
  }
  return p;
}

const lazyBackend: BackendModule = {
  type: 'backend',
  init: () => {
    /* no-op */
  },
  read: (language: string, namespace: string, callback: ReadCallback) => {
    loadResource(language, namespace)
      .then((data) => {
        if (data) callback(null, data);
        else callback(null, {} as never); // không có file → trả về rỗng để key fallthrough
      })
      .catch((err) => callback(err as Error, null));
  },
};

i18n
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Bundle sẵn các ns nhỏ, các ns còn lại sẽ được backend tải.
    partialBundledLanguages: true,
    resources: {
      vi: {
        common: viCommon,
        auth: viAuth,
        landing: viLanding,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        landing: enLanding,
      },
    },
    fallbackLng: 'vi',
    defaultNS: 'common',
    // KHÔNG khai báo `ns: [...]` → i18next chỉ tải khi có yêu cầu thật từ
    // useTranslation('xxx').
    interpolation: { escapeValue: false },
    react: {
      // Tránh suspense flash trắng cả màn hình khi đổi route.
      // Trong lúc ns đang tải, t() trả về key → re-render khi xong.
      useSuspense: false,
    },
    load: 'languageOnly', // 'vi-VN' → 'vi'
    saveMissing: false,
  });

export default i18n;
