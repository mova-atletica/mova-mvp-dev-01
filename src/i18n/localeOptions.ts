import type { AppLocale } from "../types/account";

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt-BR", label: "Português (BR)" },
];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  "pt-BR": "Português (BR)",
};
