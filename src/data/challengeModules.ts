export type ChallengeDifficulty = "beginner" | "intermediate" | "advanced";

export type ChallengeCategory = "sport" | "strength" | "mobility" | "endurance";

export interface ChallengeModule {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  mode: "live";
  primaryMetric: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  badge?: string;
  ctaLabel: string;
  /** CSS gradient used as card/hero background until assets are added */
  gradient: string;
  tags: string[];
  sortOrder: number;
  isPromoted: boolean;
}

export const CHALLENGE_MODULES: ChallengeModule[] = [
  {
    slug: "soccer-juggling",
    title: "Soccer Juggling",
    subtitle: "Live ball tracking",
    description: "Count juggles in real time with on-camera ball detection. No upload needed.",
    mode: "live",
    primaryMetric: "Juggles",
    difficulty: "intermediate",
    category: "sport",
    badge: "New",
    ctaLabel: "Start live",
    gradient: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 45%, #52b788 100%)",
    tags: ["soccer", "live", "sport"],
    sortOrder: 1,
    isPromoted: true,
  },
  {
    slug: "plank-hold",
    title: "Plank Hold Challenge",
    subtitle: "Form + hold time",
    description: "Side-view plank coaching with live alignment cues and hold duration.",
    mode: "live",
    primaryMetric: "Hold time",
    difficulty: "beginner",
    category: "strength",
    ctaLabel: "Start live",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #60a5fa 100%)",
    tags: ["core", "live", "hold"],
    sortOrder: 2,
    isPromoted: true,
  },
  {
    slug: "push-up-challenge",
    title: "Push-Up Challenge",
    subtitle: "Rep counting",
    description: "Track push-up reps with live pose analysis and form feedback.",
    mode: "live",
    primaryMetric: "Reps",
    difficulty: "intermediate",
    category: "strength",
    ctaLabel: "Start live",
    gradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fb923c 100%)",
    tags: ["upper body", "live", "reps"],
    sortOrder: 3,
    isPromoted: true,
  },
  {
    slug: "pull-up-challenge",
    title: "Pull-Up Challenge",
    subtitle: "Rep counting",
    description: "Count pull-up reps from elbow angles with live camera feedback.",
    mode: "live",
    primaryMetric: "Reps",
    difficulty: "advanced",
    category: "strength",
    badge: "Soon",
    ctaLabel: "Coming soon",
    gradient: "linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #818cf8 100%)",
    tags: ["upper body", "live", "reps"],
    sortOrder: 4,
    isPromoted: true,
  },
];

export const PROMOTED_CHALLENGES = CHALLENGE_MODULES.filter((m) => m.isPromoted).sort(
  (a, b) => a.sortOrder - b.sortOrder
);

export function getChallengeBySlug(slug: string): ChallengeModule | undefined {
  return CHALLENGE_MODULES.find((m) => m.slug === slug);
}

export const FEATURED_CHALLENGE = CHALLENGE_MODULES.find((m) => m.slug === "soccer-juggling")!;
