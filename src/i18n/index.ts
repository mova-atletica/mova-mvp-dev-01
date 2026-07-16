import type { AppLocale } from "../types/account";
import en from "./messages/en.json";
import es from "./messages/es.json";
import ptBR from "./messages/pt-BR.json";

export type MessageCatalog = typeof en;

const catalogs: Record<AppLocale, MessageCatalog> = {
  en,
  es,
  "pt-BR": ptBR,
};

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
        : Prefix extends ""
          ? K
          : `${Prefix}.${K}`;
    }[keyof T & string]
  : never;

export type MessageKey = NestedKeyOf<MessageCatalog>;

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(locale: AppLocale, key: MessageKey): string {
  return getNestedValue(catalogs[locale] as Record<string, unknown>, key) ?? getNestedValue(en as Record<string, unknown>, key) ?? key;
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("pt")) return "pt-BR";
  return "en";
}
