import i18n, { type BackendModule, type ReadCallback } from 'i18next';
import { initReactI18next } from 'react-i18next';

// === Vietnamese-only configuration ===
// App chạy 100% tiếng Việt. Bỏ hoàn toàn LanguageDetector và mọi tài nguyên EN
// để tránh "flash" tiếng Anh / key code khi load (do detector ưu tiên ngôn ngữ
// trình duyệt hoặc localStorage cũ trước khi React mount).

import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viLanding from './locales/vi/landing.json';

// Lazy registry CHỈ quét locales/vi → Vite không tạo chunk EN.
const lazyResources = import.meta.glob('./locales/vi/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
>;

const EAGER_KEYS = new Set([
  './locales/vi/common.json',
  './locales/vi/auth.json',
  './locales/vi/landing.json',
]);

const inflight = new Map<string, Promise<Record<string, unknown> | null>>();

async function loadResource(language: string, namespace: string) {
  if (language !== 'vi') return null; // chỉ phục vụ tiếng Việt
  const key = `./locales/vi/${namespace}.json`;
  if (EAGER_KEYS.has(key)) return null;
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
        else callback(null, {} as never);
      })
      .catch((err) => callback(err as Error, null));
  },
};

// Dọn localStorage cũ nếu user trước đó từng được set sang 'en'.
try {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage?.getItem('i18nextLng');
    if (stored && stored !== 'vi') {
      window.localStorage.setItem('i18nextLng', 'vi');
    }
  }
} catch {
  /* ignore */
}

i18n
  .use(lazyBackend)
  .use(initReactI18next)
  .init({
    lng: 'vi',
    fallbackLng: 'vi',
    supportedLngs: ['vi'],
    nonExplicitSupportedLngs: false,
    load: 'languageOnly',
    partialBundledLanguages: true,
    resources: {
      vi: {
        common: viCommon,
        auth: viAuth,
        landing: viLanding,
      },
    },
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false,
    },
    saveMissing: false,
    initImmediate: false,
  });

export default i18n;
