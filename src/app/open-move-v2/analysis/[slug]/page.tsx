"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import OpenMoveStudio from "../../OpenMoveStudio";
import { getQuickAnalysisBySlug } from "../../../../data/quickAnalysisMovements";

export default function QuickAnalysisPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const movement = getQuickAnalysisBySlug(slug);

  if (!movement) {
    return (
      <main
        className="flex min-h-[50vh] flex-col items-center justify-center px-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <h1 className="text-2xl font-light" style={{ color: "var(--section-title)" }}>
          Analysis not found
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--section-subtitle)" }}>
          No mini app matches &ldquo;{slug}&rdquo;.
        </p>
        <Link href="/" className="mt-4 underline text-sm" style={{ color: "var(--foreground)" }}>
          Back to archive
        </Link>
      </main>
    );
  }

  return (
    <OpenMoveStudio
      mode="quickAnalysis"
      initialSport={movement.kind}
      analysisTitle={movement.title}
      setupHint={movement.setupHint}
    />
  );
}
