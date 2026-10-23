import type { Metadata } from "next";
import DesignSystemClient from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Design System — Mova Atlética",
  description:
    "Interactive design system and motion analytics visualization reference extracted from the shipped Mova product.",
  robots: { index: true, follow: true },
};

type SectionId = "overview" | "foundations" | "components" | "patterns" | "dataviz";

type SearchParams = {
  embed?: string | string[];
  theme?: string | string[];
  tab?: string | string[];
  section?: string | string[];
};

function firstParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseSection(raw: string | undefined): SectionId | undefined {
  if (
    raw === "overview" ||
    raw === "foundations" ||
    raw === "components" ||
    raw === "patterns" ||
    raw === "dataviz"
  ) {
    return raw;
  }
  return undefined;
}

function parseTheme(raw: string | undefined): "light" | "dark" | undefined {
  if (raw === "light" || raw === "dark") return raw;
  return undefined;
}

export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams);
  const embedValue = firstParam(params.embed);
  const embed = embedValue === "1" || embedValue === "true";
  const initialTheme = parseTheme(firstParam(params.theme));
  const initialSection =
    parseSection(firstParam(params.tab)) ?? parseSection(firstParam(params.section));

  return (
    <DesignSystemClient
      embed={embed}
      initialSection={initialSection}
      initialTheme={initialTheme}
    />
  );
}
