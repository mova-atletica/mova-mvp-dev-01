import type { SportAnalysisKind } from "../lib/sportAnalysis/pullUpsTypes";
import type { LeaderboardScorePayload } from "./account";

/** `default` — motion visualization only (Open Movement Viz). `quickAnalysis` — locked sport analysis mini apps. */
export type OpenMoveStudioMode = "default" | "quickAnalysis";

export interface OpenMoveStudioProps {
  mode?: OpenMoveStudioMode;
  initialSport?: SportAnalysisKind;
  analysisTitle?: string;
  setupHint?: string;
  /** Render inside archive modal — fills parent, simplified chrome. */
  embedded?: boolean;
  onClose?: () => void;
  /** Fired when session has work that would be lost on close. */
  onActiveSessionChange?: (active: boolean) => void;
  /** Parent close-confirm overlay is open — collapse mobile rail so confirm receives clicks. */
  embeddedCloseConfirmOpen?: boolean;
  /** Quick analysis slug for leaderboard payloads (embedded modal). */
  analysisSlug?: string;
  /** Called after a successful quick-analysis run (embedded modal). */
  onQuickAnalysisComplete?: (score: LeaderboardScorePayload) => void;
}

export function getSportAnalysisLabel(kind: SportAnalysisKind): string {
  switch (kind) {
    case "cycling":
      return "Cycling";
    case "pullups":
      return "Pull-ups";
    case "plank":
      return "Plank";
    case "squat":
      return "Squat";
    case "poseFlexibility":
      return "Flexibility (side view)";
    default:
      return "Analysis";
  }
}
