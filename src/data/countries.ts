export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

/** Common countries for onboarding + leaderboard badges (ISO 3166-1 alpha-2). */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "CZ", name: "Czechia", flag: "🇨🇿" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
];

export function getCountryFlag(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.flag ?? "🏳️";
}

export function getCountryName(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.name ?? code;
}
