import {
  QUICK_ANALYSIS_MOVEMENTS,
  getQuickAnalysisPath,
  type QuickAnalysisMovement,
} from "./quickAnalysisMovements";

export type MiniAppKind = "studio" | "analysis";

export interface MiniApp {
  id: string;
  kind: MiniAppKind;
  title: string;
  subtitle: string;
  /** One-line action copy — shown on homepage sport tiles. */
  tileDescription?: string;
  badge: string;
  primaryMetric: string;
  ctaLabel: string;
  gradient: string;
  href: string;
  /** Sport tile photo — same asset in light and dark mode. */
  tileImage?: string;
  /** Optional hover preview video (muted). */
  tileVideo?: string;
  sortOrder: number;
}

export const MOVA_STUDIO_MINI_APP: MiniApp = {
  id: "mova-studio",
  kind: "studio",
  title: "Open Movement Viz",
  subtitle: "Record or upload any movement",
  badge: "Open",
  primaryMetric: "Motion visuals",
  ctaLabel: "Open",
  gradient: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 42%, #312e81 72%, #4338ca 100%)",
  href: "/open-move-v2",
  tileImage: "/images/sports/studio.jpg",
  tileVideo: "/images/sports/studio.mp4",
  sortOrder: 0,
};

function movementToMiniApp(movement: QuickAnalysisMovement): MiniApp {
  return {
    id: movement.slug,
    kind: "analysis",
    title: movement.title,
    subtitle: movement.subtitle,
    tileDescription: movement.tileDescription,
    badge: movement.setupHint,
    primaryMetric: movement.primaryMetric,
    ctaLabel: "Analyze",
    gradient: movement.gradient,
    href: getQuickAnalysisPath(movement.slug),
    tileImage: movement.tileImage,
    sortOrder: movement.sortOrder,
  };
}

export const MINI_APPS: MiniApp[] = [
  MOVA_STUDIO_MINI_APP,
  ...QUICK_ANALYSIS_MOVEMENTS.map(movementToMiniApp),
].sort((a, b) => a.sortOrder - b.sortOrder);
