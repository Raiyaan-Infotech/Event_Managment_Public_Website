'use client';

/**
 * Language state for the rendered public site.
 *
 * The admin preview fetched languages and the translation bundle client-side
 * with React Query. That cannot work here: translated copy has to be IN the
 * server-rendered HTML or a crawler indexing acme.com in Tamil sees English.
 *
 * So both arrive as props from the server bundle, and switching language is a
 * navigation (`?lang=ta`) that re-renders on the server with the other overlay.
 *
 * Two different kinds of translation live here, easy to confuse:
 *   - `t(key)`     — static UI chrome ("Login", "Choose Plan"), from the bundled
 *                    locale JSON, overridden by the `ui-chrome||0` slot.
 *   - `translator` — admin-entered CONTENT (hero title, FAQ answers) from
 *                    company_website_content_translations.
 */

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getWebsiteBuilderTranslation } from '@/locales/website-builder';
import { createTranslator, type Translator } from './sections/preview-translate';

export type PublicBuilderLanguage = {
  id: number;
  code: string;
  name: string;
  native_name?: string;
  direction?: string;
  is_default?: boolean | number;
};

interface WebsiteLanguageValue {
  language: string;
  setLanguage: (code: string) => void;
  languages: PublicBuilderLanguage[];
  activeLanguage: PublicBuilderLanguage | null;
  direction: 'ltr' | 'rtl';
  translator: Translator;
  /** True while a language switch is in flight (server round trip). */
  isLoadingBundle: boolean;
  t: (key: string, defaultValue?: string, variables?: Record<string, string | number>) => string;
}

const WebsiteLanguageContext = React.createContext<WebsiteLanguageValue | null>(null);

const STORAGE_KEY = 'site-language';

export function WebsiteLanguageProvider({
  children,
  languages = [],
  translations,
  language,
}: {
  children: React.ReactNode;
  languages?: PublicBuilderLanguage[];
  /** Slot map for the active language, straight off the server bundle. */
  translations?: Record<string, Record<string, string>> | null;
  /** Active language code, resolved on the server. */
  language: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const defaultCode = React.useMemo(
    () => languages.find((lang) => lang.is_default)?.code || 'en',
    [languages]
  );

  const activeLanguage = React.useMemo(
    () => languages.find((lang) => lang.code === language) || null,
    [languages, language]
  );

  const isDefault = !activeLanguage || Boolean(activeLanguage.is_default);

  const setLanguage = React.useCallback(
    (code: string) => {
      const next = (code || defaultCode).toLowerCase();
      if (next === language) return;

      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private-mode storage failures must not block switching.
      }

      // A navigation, not local state: the server has to re-render with the
      // other overlay so the translated copy is in the HTML, and so the URL
      // stays shareable in that language.
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (next === defaultCode) params.delete('lang');
      else params.set('lang', next);
      const query = params.toString();

      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [defaultCode, language, pathname, router, searchParams]
  );

  const translator = React.useMemo(
    () => createTranslator(translations || undefined, !isDefault),
    [translations, isDefault]
  );

  const direction = activeLanguage?.direction === 'rtl' ? 'rtl' : 'ltr';

  // UI chrome is registered on the SAME content-translations table under a
  // fixed slot, so one bundle covers both content and chrome. A key with no DB
  // override falls back to the bundled locale JSON.
  const uiChromeOverrides = translations?.['ui-chrome||0'];
  const t = React.useCallback(
    (key: string, defaultValue?: string, variables?: Record<string, string | number>) => {
      const override = !isDefault ? uiChromeOverrides?.[key]?.trim() : '';
      const base = override || getWebsiteBuilderTranslation(language, key, defaultValue, variables);
      if (!override || !variables) return base;
      return Object.entries(variables).reduce(
        (result, [varKey, varVal]) => result.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(varVal)),
        base
      );
    },
    [language, isDefault, uiChromeOverrides]
  );

  const value = React.useMemo<WebsiteLanguageValue>(
    () => ({
      language,
      setLanguage,
      languages,
      activeLanguage,
      direction,
      translator,
      isLoadingBundle: isPending,
      t,
    }),
    [language, setLanguage, languages, activeLanguage, direction, translator, isPending, t]
  );

  return <WebsiteLanguageContext.Provider value={value}>{children}</WebsiteLanguageContext.Provider>;
}

/**
 * Safe outside the provider — falls back to English with a pass-through
 * translator, so an individual section can be rendered standalone.
 */
export function useWebsiteLanguage(): WebsiteLanguageValue {
  const context = React.useContext(WebsiteLanguageContext);
  const fallbackTranslator = React.useMemo(() => createTranslator(null, false), []);

  return React.useMemo(
    () =>
      context || {
        language: 'en',
        setLanguage: () => {},
        languages: [],
        activeLanguage: null,
        direction: 'ltr' as const,
        translator: fallbackTranslator,
        isLoadingBundle: false,
        t: (key: string, defaultValue?: string, variables?: Record<string, string | number>) =>
          getWebsiteBuilderTranslation('en', key, defaultValue, variables),
      },
    [context, fallbackTranslator]
  );
}
