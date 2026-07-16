import type { SportAnalysisKind } from "../lib/sportAnalysis/pullUpsTypes";
import type { MiniApp } from "../data/miniApps";
import { getQuickAnalysisBySlug } from "../data/quickAnalysisMovements";

export type OpenMoveStudioModalTarget =
  | { type: "studio" }
  | {
      type: "analysis";
      slug: string;
      kind: SportAnalysisKind;
      analysisTitle: string;
      setupHint: string;
    };

export function openMoveModalTargetFromMiniApp(app: MiniApp): OpenMoveStudioModalTarget | null {
  if (app.kind === "studio") {
    return { type: "studio" };
  }
  const movement = getQuickAnalysisBySlug(app.id);
  if (!movement) return null;
  return {
    type: "analysis",
    slug: movement.slug,
    kind: movement.kind,
    analysisTitle: movement.title,
    setupHint: movement.setupHint,
  };
}

export function openMoveModalTitle(target: OpenMoveStudioModalTarget | null): string {
  if (!target) return "Mova Studio";
  if (target.type === "studio") return "Mova Studio";
  return target.analysisTitle;
}
