import type {
  ProductInUseProps,
  RecipeKnobs,
  ResolvedSegment,
  SegmentChartConfig,
} from "./types";
import { DEFAULT_FPS } from "./types";
import reel01 from "../recipes/reel-01.json";
import reel02 from "../recipes/reel-02.json";

function asRecipe(raw: unknown): RecipeKnobs {
  return raw as RecipeKnobs;
}

/** Synthetic series so Studio chart preview works without DB. */
export const DEMO_ANGLES: NonNullable<ResolvedSegment["angles"]> = (() => {
  const n = 120;
  const wave = (phase: number, amp: number, base: number) =>
    Array.from({ length: n }, (_, i) => {
      const t = i / n;
      return base + amp * Math.sin(t * Math.PI * 2 + phase);
    });
  return {
    leftKneeAngles: wave(0, 35, 95),
    rightKneeAngles: wave(0.4, 32, 98),
    leftHipAngles: wave(0.2, 20, 110),
    rightHipAngles: wave(0.5, 18, 112),
    leftElbowAngles: wave(1, 25, 140),
    rightElbowAngles: wave(1.2, 22, 138),
    leftShoulderAbdAngles: wave(0.8, 15, 40),
    rightShoulderAbdAngles: wave(1.1, 14, 42),
    trunkAngles: wave(0.3, 8, 175),
  };
})();

export function demoSegmentsFromRecipe(
  recipe: { segmentChartDefaults?: SegmentChartConfig[] },
  durationInFrames = 240
): ResolvedSegment[] {
  const charts = recipe.segmentChartDefaults ?? [];
  const first = charts[0]?.kind === "jointAngle" ? [charts[0]] : [];
  return [
    {
      plateUrl: "",
      durationInFrames,
      charts: first,
      chart: charts[0] ?? null,
      overlays: "off",
      angles: DEMO_ANGLES,
    },
  ];
}

export function recipeToDefaultProps(
  recipe: RecipeKnobs,
  segments?: ResolvedSegment[]
): ProductInUseProps {
  return {
    ...recipe,
    fps: recipe.fps ?? DEFAULT_FPS,
    segments: segments ?? demoSegmentsFromRecipe(recipe, 270),
  };
}

export const RECIPES = {
  "reel-01": asRecipe(reel01),
  "reel-02": asRecipe(reel02),
} as const;

export type RecipeId = keyof typeof RECIPES;
