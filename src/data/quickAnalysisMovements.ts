import type { SportAnalysisKind } from "../lib/sportAnalysis/pullUpsTypes";

export type QuickAnalysisCameraProfile = "side-profile" | "side-on" | "arms-visible";

export interface QuickAnalysisMovement {
  slug: string;
  kind: SportAnalysisKind;
  title: string;
  subtitle: string;
  /** One-line action copy for homepage sport tiles. */
  tileDescription: string;
  description: string;
  primaryMetric: string;
  setupHint: string;
  cameraProfile: QuickAnalysisCameraProfile;
  /** CSS gradient used as card background */
  gradient: string;
  /** Homepage sport tile photo (theme-invariant). */
  tileImage: string;
  sortOrder: number;
  /**
   * When false, hidden from homepage / leaderboard / mini-app catalog.
   * Analysis code paths remain so we can re-enable later.
   */
  featured?: boolean;
}

const QUICK_ANALYSIS_MOVEMENTS_UNSORTED: QuickAnalysisMovement[] = [
  {
    slug: "plank",
    kind: "plank",
    title: "Plank",
    subtitle: "Hold time & alignment",
    tileDescription: "Hold a plank",
    description: "Side-view plank coaching with hold duration and form alignment cues.",
    primaryMetric: "Hold time",
    setupHint: "Full body in frame. Film from side view.",
    cameraProfile: "side-profile",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #60a5fa 100%)",
    tileImage: "/images/sports/planks.png",
    sortOrder: 1,
    featured: true,
  },
  {
    slug: "squat",
    kind: "squat",
    title: "Squat",
    subtitle: "Rep count & depth",
    tileDescription: "Squat counter",
    description: "Side-view squat analysis for rep counting and depth from knee angles.",
    primaryMetric: "Reps",
    setupHint: "Full body in frame. Film from side view.",
    cameraProfile: "side-profile",
    gradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)",
    tileImage: "/images/sports/squat.png",
    sortOrder: 2,
    featured: true,
  },
  {
    slug: "flexibility",
    kind: "poseFlexibility",
    title: "Flexibility Analysis",
    subtitle: "ROM by focus area",
    tileDescription: "General flexibility analysis",
    description: "Analyze flexibility and alignment across focus areas — any camera view that shows the selected regions.",
    primaryMetric: "ROM angles",
    setupHint: "Any view · pick focus areas",
    cameraProfile: "side-profile",
    gradient: "linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #5eead4 100%)",
    tileImage: "/images/sports/general-flex.png",
    sortOrder: 3,
    featured: false,
  },
  {
    slug: "cycling",
    kind: "cycling",
    title: "Cycling Fit",
    subtitle: "Cadence & stroke timing",
    tileDescription: "Cycling Fit",
    description: "Side-on cycling analysis for cadence and pedal stroke timing.",
    primaryMetric: "Cadence",
    setupHint: "Side-on · leg select",
    cameraProfile: "side-on",
    gradient: "linear-gradient(135deg, #1e293b 0%, #334155 45%, #64748b 100%)",
    tileImage: "/images/sports/cycling.png",
    sortOrder: 4,
    featured: false,
  },
  {
    slug: "pullups",
    kind: "pullups",
    title: "Pull-ups",
    subtitle: "Rep count & symmetry",
    tileDescription: "Pull up counter",
    description: "Count pull-up reps from elbow angles with combined left and right tracking.",
    primaryMetric: "Reps",
    setupHint: "Full body in frame",
    cameraProfile: "arms-visible",
    gradient: "linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #818cf8 100%)",
    tileImage: "/images/sports/pull-ups.png",
    sortOrder: 5,
    featured: true,
  },
  {
    slug: "pushups",
    kind: "pushups",
    title: "Push-ups",
    subtitle: "Rep count & depth",
    tileDescription: "Push-up counter",
    description: "Side-view push-up analysis for rep counting and depth from elbow angles.",
    primaryMetric: "Reps",
    setupHint: "Full body in frame. Film from side view.",
    cameraProfile: "side-profile",
    gradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fdba74 100%)",
    tileImage: "/images/sports/push-ups.png",
    sortOrder: 6,
    featured: true,
  },
];

/** All movements including hidden ones (deep links / re-enable). */
export const ALL_QUICK_ANALYSIS_MOVEMENTS = [...QUICK_ANALYSIS_MOVEMENTS_UNSORTED].sort(
  (a, b) => a.sortOrder - b.sortOrder
);

/** Featured catalog: plank, squat, pull-ups, push-ups (cycling / flexibility hidden for Phase A). */
export const QUICK_ANALYSIS_MOVEMENTS = ALL_QUICK_ANALYSIS_MOVEMENTS.filter(
  (m) => m.featured !== false
);

export function getQuickAnalysisPath(slug: string): string {
  return `/open-move-v2/analysis/${slug}`;
}

export function getQuickAnalysisBySlug(slug: string): QuickAnalysisMovement | undefined {
  return ALL_QUICK_ANALYSIS_MOVEMENTS.find((m) => m.slug === slug);
}

export function getQuickAnalysisByKind(kind: SportAnalysisKind): QuickAnalysisMovement | undefined {
  return ALL_QUICK_ANALYSIS_MOVEMENTS.find((m) => m.kind === kind);
}
