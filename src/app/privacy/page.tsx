import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import LegalMarkdown from "../../components/legal/LegalMarkdown";
import LegalPageShell from "../../components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — Mova Atletica",
  description: "Privacy policy for Mova Atletica web and iOS services.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const source = readFileSync(join(process.cwd(), "src/content/legal/privacy.md"), "utf8");

  return (
    <LegalPageShell title="Privacy Policy">
      <p className="mb-8 text-sm" style={{ color: "var(--section-subtitle)" }}>
        Last updated August 26, 2026
      </p>
      <LegalMarkdown source={source} />
    </LegalPageShell>
  );
}
