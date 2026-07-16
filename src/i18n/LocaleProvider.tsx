"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAccount } from "../contexts/MockAuthContext";
import type { AppLocale } from "../types/account";
import { detectBrowserLocale, translate, type MessageKey } from "./index";

interface LocaleContextValue {
  locale: AppLocale;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAccount();

  const locale = profile?.locale ?? detectBrowserLocale();

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key) => translate(locale, key),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslations() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return (key: MessageKey) => translate("en", key);
  }
  return ctx.t;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  return ctx?.locale ?? "en";
}
