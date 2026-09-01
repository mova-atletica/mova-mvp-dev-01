import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";

type BodySide = "left" | "right";

function readSideUsed(raw: Record<string, unknown>): BodySide | null {
  const v = raw.sideUsed ?? raw.side_used;
  if (v === "left" || v === "right") return v;
  return null;
}

/** Normalize sport_analysis JSON from web or iOS (snake_case + camelCase). */
export function normalizeSportAnalysis(
  raw: unknown,
  kind?: SportAnalysisKind | string | null
): { sideUsed: BodySide | null } & Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    return { sideUsed: kind === "plank" ? "left" : null };
  }
  const obj = raw as Record<string, unknown>;
  let sideUsed = readSideUsed(obj);
  if (!sideUsed && kind === "plank") {
    sideUsed = "left";
  }
  return { ...obj, sideUsed };
}
