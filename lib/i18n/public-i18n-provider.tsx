"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, getDir, type Locale, type TextDirection } from "@/lib/i18n/locales";
import {
  getMessages,
  type MessageKey,
  type Messages,
} from "@/lib/i18n/messages";
import { readPublicLocaleCookie } from "@/lib/i18n/read-public-locale-cookie";

type PublicI18nContextValue = {
  locale: Locale;
  dir: TextDirection;
  messages: Messages;
  t: (key: MessageKey) => string;
  setLocale: (locale: Locale) => void;
};

const PublicI18nContext = createContext<PublicI18nContextValue | null>(null);

type PublicI18nProviderProps = {
  locale: Locale;
  children: ReactNode;
};

export function PublicI18nProvider({
  locale: initialLocale,
  children,
}: PublicI18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const fromCookie = readPublicLocaleCookie();
    if (fromCookie === initialLocale) return;
    startTransition(() => {
      setLocale(fromCookie);
    });
  }, [initialLocale]);

  useEffect(() => {
    const root = document.documentElement;
    const className = "locale-ar";
    if (locale === "ar") {
      root.classList.add(className);
    } else {
      root.classList.remove(className);
    }
    return () => {
      root.classList.remove(className);
    };
  }, [locale]);

  const messages = useMemo(() => getMessages(locale), [locale]);
  const dir = getDir(locale);

  const t = useCallback((key: MessageKey) => messages[key], [messages]);

  const value = useMemo(
    () => ({ locale, dir, messages, t, setLocale }),
    [locale, dir, messages, t]
  );

  return (
    <PublicI18nContext.Provider value={value}>
      {children}
    </PublicI18nContext.Provider>
  );
}

export function usePublicI18n(): PublicI18nContextValue {
  const context = useContext(PublicI18nContext);
  if (!context) {
    throw new Error("usePublicI18n must be used within PublicI18nProvider");
  }
  return context;
}

/** Supplies public i18n when reused outside `(public)` (e.g. manager staff-fill). */
export function PublicI18nBoundary({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  const existing = useContext(PublicI18nContext);
  if (existing) {
    return children;
  }
  return <PublicI18nProvider locale={locale}>{children}</PublicI18nProvider>;
}
