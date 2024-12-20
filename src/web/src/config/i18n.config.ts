// @ts-check
import i18next from 'i18next'; // v23.0.0
import { initReactI18next } from 'react-i18next'; // v13.0.0
import LanguageDetector from 'i18next-browser-languagedetector'; // v7.0.0
import HttpBackend from 'i18next-http-backend'; // v2.2.0
import dayjs from 'dayjs'; // v1.11.0

// Import translation files
import * as common from '../i18n/en/common.json';
import * as errors from '../i18n/en/errors.json';
import * as forms from '../i18n/en/forms.json';
import * as navigation from '../i18n/en/navigation.json';

/**
 * Core i18n configuration object with strict typing
 */
export const i18nConfig = {
  defaultLanguage: 'en' as const,
  fallbackLanguage: 'en' as const,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'he'] as const,
  defaultNamespace: 'common' as const,
  namespaces: ['common', 'errors', 'forms', 'navigation'] as const,
  rtlLanguages: ['ar', 'he'] as const,
  cacheMaxAge: 7200000, // 2 hours in milliseconds
  loadPath: '/locales/{{lng}}/{{ns}}.json',
  debug: process.env.NODE_ENV === 'development',
} as const;

/**
 * Type definitions for translation resources
 */
type TranslationResources = {
  common: typeof common;
  errors: typeof errors;
  forms: typeof forms;
  navigation: typeof navigation;
};

/**
 * Enhanced language detector options
 */
const languageDetectorOptions = {
  order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
  lookupQuerystring: 'lng',
  lookupCookie: 'i18next',
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage', 'cookie'],
  cookieMinutes: 120,
  cookieDomain: window.location.hostname,
};

/**
 * Initializes the i18next instance with enhanced configuration
 * @returns {Promise<i18next.i18n>} Initialized i18next instance
 */
const initI18n = async (): Promise<i18next.i18n> => {
  // Configure dayjs with locale support
  await Promise.all(
    i18nConfig.supportedLanguages.map(async (lang) => {
      try {
        const locale = await import(`dayjs/locale/${lang}`);
        dayjs.locale(locale);
      } catch (error) {
        console.warn(`Failed to load dayjs locale for ${lang}`, error);
      }
    })
  );

  // Initialize i18next instance
  const i18n = await i18next
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: i18nConfig.defaultLanguage,
      fallbackLng: i18nConfig.fallbackLanguage,
      supportedLngs: i18nConfig.supportedLanguages,
      defaultNS: i18nConfig.defaultNamespace,
      ns: i18nConfig.namespaces,
      debug: i18nConfig.debug,
      
      // Resource loading configuration
      backend: {
        loadPath: i18nConfig.loadPath,
        allowMultiLoading: true,
        crossDomain: true,
        withCredentials: false,
        timeout: 5000,
        customHeaders: {
          'Cache-Control': `max-age=${i18nConfig.cacheMaxAge}`,
        },
      },

      // Language detection configuration
      detection: languageDetectorOptions,

      // Interpolation configuration
      interpolation: {
        escapeValue: false,
        format: (value, format, lng) => {
          if (format === 'date') {
            return dayjs(value).locale(lng || i18nConfig.defaultLanguage).format('L');
          }
          if (format === 'time') {
            return dayjs(value).locale(lng || i18nConfig.defaultLanguage).format('LT');
          }
          return value;
        },
      },

      // React configuration
      react: {
        useSuspense: true,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
      },

      // Resource store configuration
      resources: {
        [i18nConfig.defaultLanguage]: {
          common,
          errors,
          forms,
          navigation,
        },
      } as Record<string, TranslationResources>,
    });

  // Setup RTL language detection and handling
  i18n.on('languageChanged', (lng) => {
    const isRTL = i18nConfig.rtlLanguages.includes(lng);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  });

  return i18n;
};

// Initialize and export i18next instance
export const i18n = await initI18n();

// Export type-safe translation function
export const t = i18n.t.bind(i18n);

/**
 * Type-safe language change function
 * @param {typeof i18nConfig.supportedLanguages[number]} language
 * @returns {Promise<typeof i18n.t>}
 */
export const changeLanguage = async (
  language: typeof i18nConfig.supportedLanguages[number]
): Promise<typeof i18n.t> => {
  return i18n.changeLanguage(language);
};

/**
 * Type-safe namespace loading function
 * @param {Array<typeof i18nConfig.namespaces[number]>} namespaces
 * @returns {Promise<void>}
 */
export const loadNamespaces = async (
  namespaces: Array<typeof i18nConfig.namespaces[number]>
): Promise<void> => {
  return i18n.loadNamespaces(namespaces);
};

export default i18n;