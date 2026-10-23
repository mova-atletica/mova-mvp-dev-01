import type { Metadata } from "next";
import DesignSystemClient from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Design System — Mova Atlética",
  description:
    "Interactive design system and motion analytics visualization reference extracted from the shipped Mova product.",
  robots: { index: true, follow: true },
};

type SearchParams = { embed?: string | string[] };

export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams);
  const raw = params.embed;
  const embedValue = Array.isArray(raw) ? raw[0] : raw;
  const embed = embedValue === "1" || embedValue === "true";

  return <DesignSystemClient embed={embed} />;
}
