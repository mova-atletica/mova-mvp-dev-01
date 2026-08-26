import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import LegalMarkdown from "../../components/legal/LegalMarkdown";
import LegalPageShell from "../../components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms and Conditions — Mova Atletica",
  description: "Legal terms for using Mova Atletica web and iOS services.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  const source = readFileSync(join(process.cwd(), "src/content/legal/terms.md"), "utf8");

  return (
    <LegalPageShell title="Terms and Conditions">
      <p className="mb-8 text-sm" style={{ color: "var(--section-subtitle)" }}>
        Last updated August 25, 2026
      </p>
      <LegalMarkdown source={source} />
    </LegalPageShell>
  );
}
