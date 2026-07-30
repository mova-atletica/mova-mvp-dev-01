import type { SportAnalysisKind } from "../lib/sportAnalysis/pullUpsTypes";
import type {
  ActivityPersistAnalysisMeta,
  QuickAnalysisCompleteHandler,
  StudioSessionPersistHandler,
  StudioSessionPersistResult,
} from "../lib/activityPersistMeta";
import type { OpenMoveActivityHydration } from "../lib/loadActivityHydration";

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
  /** Mini-app analysis finished but has not been saved to Activity yet. */
  onUnsavedAnalysisChange?: (unsaved: boolean) => void;
  /** Parent close-confirm overlay is open — collapse mobile rail so confirm receives clicks. */
  embeddedCloseConfirmOpen?: boolean;
  /** Quick analysis slug for leaderboard payloads (embedded modal). */
  analysisSlug?: string;
  /** Called after a successful quick-analysis run (embedded modal). */
  onQuickAnalysisComplete?: QuickAnalysisCompleteHandler;
  /** Open Movement Viz: persist angles/poses when a clip finishes processing. */
  onStudioSessionPersist?: StudioSessionPersistHandler;
  /**
   * Account Activity hydrate — seed a ready session (video + poses + angles).
   * Skips MoveNet warm-up; do not pass onStudioSessionPersist for this path.
   */
  initialHydration?: OpenMoveActivityHydration | null;
}

export type {
  ActivityPersistAnalysisMeta,
  QuickAnalysisCompleteHandler,
  StudioSessionPersistHandler,
  StudioSessionPersistResult,
  OpenMoveActivityHydration,
};

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
