import type { SportRangeSummary } from "./accountActivityInsights";

/** Radar metrics — matches BaseRadarChart metric keys. */
export const MOCK_RADAR_DATA = [
  { metric: "dtw_score", score: 78 },
  { metric: "cosine_score", score: 84 },
  { metric: "rom_score", score: 71 },
  { metric: "basic_score", score: 80 },
];

const JOINTS = ["leftElbow", "rightElbow", "leftShoulder", "rightShoulder"] as const;

/** Synthetic angle-over-time series for BaseAngleComparisonChart. */
export function buildMockAngleSeries(frames = 48): {
  data: Record<string, number>[];
  jointsOfInterest: string[];
} {
  const data = Array.from({ length: frames }, (_, i) => {
    const t = i / Math.max(1, frames - 1);
    const wave = Math.sin(t * Math.PI * 2);
    const row: Record<string, number> = { frame: i };
    for (const joint of JOINTS) {
      const base = joint.includes("Elbow") ? 55 : 48;
      const amp = joint.includes("left") ? 28 : 24;
      row[`${joint}_user`] = Math.round(
        Math.min(100, Math.max(0, base + amp * wave + (i % 5) * 0.4))
      );
      row[`${joint}_ref`] = Math.round(
        Math.min(100, Math.max(0, base + amp * 0.85 * Math.sin(t * Math.PI * 2 + 0.15)))
      );
    }
    return row;
  });

  return { data, jointsOfInterest: [...JOINTS] };
}

export const MOCK_SPORT_SUMMARY_POPULATED: SportRangeSummary = {
  sessions: 12,
  sessionsPerWeek: 2.8,
  mostRecentAt: new Date().toISOString(),
  primaryTotal: 84,
  primaryAvgPerSession: 7,
  bestSessionPrimary: 14,
  metricKind: "reps",
  jointRomAverages: {},
  symmetryScore: 0.86,
  movementDetailMissing: false,
  volumeComparison: { kind: "up", percent: 18 },
};

export const MOCK_SPORT_SUMMARY_EMPTY: SportRangeSummary = {
  sessions: 0,
  sessionsPerWeek: null,
  mostRecentAt: null,
  primaryTotal: null,
  primaryAvgPerSession: null,
  bestSessionPrimary: null,
  metricKind: "reps",
  jointRomAverages: {},
  symmetryScore: null,
  movementDetailMissing: true,
  volumeComparison: null,
};

/** Brand step a semantic token resolves to (ThemeContext light/dark). */
export type SemanticBrandRef = {
  family: string;
  step: number | null;
  hex: string;
  /** When hex is outside the published brand ramps. */
  note?: string;
};

export const TOKEN_SWATCHES: {
  name: string;
  varName: string;
  role: string;
  dark: SemanticBrandRef;
  light: SemanticBrandRef;
}[] = [
  {
    name: "Background",
    varName: "--background",
    role: "Page canvas",
    dark: { family: "Stoic Onyx", step: 100, hex: "#181A1A" },
    light: { family: "Stoic Onyx", step: 50, hex: "#C0C9CC" },
  },
  {
    name: "Foreground",
    varName: "--foreground",
    role: "Primary text",
    dark: { family: "Stoic Onyx", step: 40, hex: "#EEF0F1" },
    light: { family: "Stoic Onyx", step: 90, hex: "#353839" },
  },
  {
    name: "Surface",
    varName: "--surface",
    role: "Elevated chrome / rails",
    dark: { family: "Stoic Onyx", step: 90, hex: "#353839" },
    light: { family: "Stoic Onyx", step: 40, hex: "#EEF0F1" },
  },
  {
    name: "Muted",
    varName: "--muted-foreground",
    role: "Secondary text",
    dark: { family: "Stoic Onyx", step: 50, hex: "#C0C9CC" },
    light: { family: "Stoic Onyx", step: 80, hex: "#55595B" },
  },
  {
    name: "Border",
    varName: "--border-secondary",
    role: "Dividers / card edges",
    dark: { family: "Stoic Onyx", step: 70, hex: "#777D7F" },
    light: { family: "Stoic Onyx", step: 70, hex: "#777D7F" },
  },
  {
    name: "Card",
    varName: "--card-bg",
    role: "Metric chips / cards",
    dark: {
      family: "Stoic Onyx",
      step: null,
      hex: "#404446",
      note: "Step above surface (between Onyx 90–80)",
    },
    light: { family: "Stoic Onyx", step: 10, hex: "#F5F6F7" },
  },
  {
    name: "Accent",
    varName: "--accent",
    role: "Interactive accent",
    dark: { family: "Bioluminescent Blue", step: 50, hex: "#3B82F6" },
    light: { family: "Bioluminescent Blue", step: 50, hex: "#3B82F6" },
  },
  {
    name: "Chart 1",
    varName: "--results-chart-series-1",
    role: "Primary series",
    dark: { family: "Endurance Red", step: 70, hex: "#F81818" },
    light: { family: "Bioluminescent Blue", step: 60, hex: "#2563EB" },
  },
  {
    name: "Chart 2",
    varName: "--results-chart-series-2",
    role: "Secondary series",
    dark: { family: "Utility cyan", step: null, hex: "#22D3EE", note: "Outside brand ramps" },
    light: { family: "Utility cyan", step: null, hex: "#06B6D4", note: "Outside brand ramps" },
  },
  {
    name: "Chart 3",
    varName: "--results-chart-series-3",
    role: "Tertiary series",
    dark: { family: "Utility amber", step: null, hex: "#F59E42", note: "Outside brand ramps" },
    light: { family: "Utility amber", step: null, hex: "#F59E42", note: "Outside brand ramps" },
  },
];

/** Brand ramps from MA Beta Design System (Figma). Product UI is Onyx-first. */
export const BRAND_COLOR_RATIONALE = {
  approach:
    "Minimalist & monochromatic harmony — tonal variation within Stoic Onyx for clarity, focus, and depth without distraction.",
  tone: "Scientific coolness first (graphite / slate) — the shipped web and dark UI read as an Onyx system, with sparse functional accents.",
  usageSplit:
    "Product UI: ~90%+ Stoic Onyx structure, ≤5% accents (green / red / blue). Anatomical Parchment is demoted — brand archive / light-mode wash only, not a second product palette.",
} as const;

export type BrandPaletteStep = { step: number; hex: string };

export const BRAND_PALETTES: {
  id: string;
  name: string;
  role: string;
  rationale: string;
  /** primary = shipped UI; archive = brand history / rare light washes */
  tier: "primary" | "accent" | "archive";
  steps: BrandPaletteStep[];
}[] = [
  {
    id: "onyx",
    name: "Stoic Onyx",
    role: "Primary · Neutral + stable",
    tier: "primary",
    rationale:
      "Muscle structure, joint shadows, x-ray motion — trust, clarity, neutrality. Backgrounds, containers, body text, icons. The real product palette.",
    // Source: Figma Stoic Onyx variables (MA Beta Design System) — not the drifted Tailwind onyx.* map.
    steps: [
      { step: 100, hex: "#181A1A" },
      { step: 90, hex: "#353839" },
      { step: 80, hex: "#55595B" },
      { step: 70, hex: "#777D7F" },
      { step: 60, hex: "#9BA2A5" },
      { step: 50, hex: "#C0C9CC" },
      { step: 40, hex: "#EEF0F1" },
      { step: 30, hex: "#F3F4F5" },
      { step: 20, hex: "#F5F6F7" },
      { step: 10, hex: "#F5F6F7" },
    ],
  },
  {
    id: "green",
    name: "Live Green",
    role: "Accent · Success / motion",
    tier: "accent",
    rationale:
      "Organic vitality signal — sparse use for positive status, completion, and movement salience.",
    steps: [
      { step: 100, hex: "#011500" },
      { step: 90, hex: "#033400" },
      { step: 80, hex: "#085900" },
      { step: 70, hex: "#118000" },
      { step: 60, hex: "#1AAA00" },
      { step: 50, hex: "#23D600" },
      { step: 40, hex: "#64FF5B" },
      { step: 30, hex: "#89FF82" },
      { step: 20, hex: "#99FF93" },
      { step: 10, hex: "#9DFF97" },
    ],
  },
  {
    id: "red",
    name: "Endurance Red",
    role: "Accent · Error / warning",
    tier: "accent",
    rationale: "High-salience utility for overload, errors, and destructive actions — never decorative fill.",
    steps: [
      { step: 100, hex: "#3F0202" },
      { step: 90, hex: "#780606" },
      { step: 80, hex: "#B60E0E" },
      { step: 70, hex: "#F81818" },
      { step: 60, hex: "#FC7C7C" },
      { step: 50, hex: "#FDB9B9" },
      { step: 40, hex: "#FEEDED" },
      { step: 30, hex: "#FEF1F1" },
      { step: 20, hex: "#FEF3F3" },
      { step: 10, hex: "#FFF9F9" },
    ],
  },
  {
    id: "blue",
    name: "Bioluminescent Blue",
    role: "Accent · Action / links",
    tier: "accent",
    rationale:
      "Bio-digital interactive accent (Record, links, focus) — maps to system blue on iOS where appropriate.",
    steps: [
      { step: 100, hex: "#172554" },
      { step: 90, hex: "#1E3A8A" },
      { step: 80, hex: "#1E40AF" },
      { step: 70, hex: "#1D4ED8" },
      { step: 60, hex: "#2563EB" },
      { step: 50, hex: "#3B82F6" },
      { step: 40, hex: "#60A5FA" },
      { step: 30, hex: "#93C5FD" },
      { step: 20, hex: "#BFDBFE" },
      { step: 10, hex: "#DBEAFE" },
    ],
  },
  {
    id: "ap",
    name: "Anatomical Parchment",
    role: "Archive · Brand warmth (demoted)",
    tier: "archive",
    rationale:
      "Inspired by da Vinci’s anatomical studies and parchment-ground drawings — kept for brand history and rare light-mode washes. Not a second product palette: almost no ap-* utilities in shipped UI; dark chrome is Onyx.",
    steps: [
      { step: 100, hex: "#17150F" },
      { step: 90, hex: "#363228" },
      { step: 80, hex: "#585342" },
      { step: 70, hex: "#7D765F" },
      { step: 60, hex: "#A49A7E" },
      { step: 50, hex: "#CCC19E" },
      { step: 40, hex: "#F1E9D2" },
      { step: 30, hex: "#F4EEDD" },
      { step: 20, hex: "#F6F1E2" },
      { step: 10, hex: "#F6F1E3" },
    ],
  },
];

export const TYPE_SAMPLES: { label: string; className: string; sample: string }[] = [
  {
    label: "Display / mono hero",
    className: "font-mono text-3xl font-medium tracking-tight",
    sample: "84 reps",
  },
  {
    label: "Section title",
    className: "text-xl font-semibold tracking-tight",
    sample: "Sport summary",
  },
  {
    label: "Body",
    className: "text-sm font-light",
    sample: "Descriptive motion trends for practice — not medical diagnosis.",
  },
  {
    label: "Meta / uppercase",
    className: "text-[10px] font-semibold uppercase tracking-[0.14em]",
    sample: "Pull-ups · Week",
  },
];

export const SPACING_SCALE = [
  { token: "1", px: 4 },
  { token: "2", px: 8 },
  { token: "3", px: 12 },
  { token: "4", px: 16 },
  { token: "5", px: 20 },
  { token: "6", px: 24 },
  { token: "8", px: 32 },
] as const;

export const RADIUS_SCALE = [
  { label: "sm", px: 6, use: "chips, small controls" },
  { label: "md", px: 8, use: "buttons, inputs" },
  { label: "lg", px: 12, use: "cards, panels" },
  { label: "xl", px: 16, use: "summary shells" },
] as const;

/** Weekly session volume — bar charts (Insights activity). */
export const MOCK_BAR_VOLUME = [
  { week: "W1", sessions: 2, mini: 1, studio: 1 },
  { week: "W2", sessions: 4, mini: 2, studio: 2 },
  { week: "W3", sessions: 3, mini: 1, studio: 2 },
  { week: "W4", sessions: 5, mini: 2, studio: 3 },
  { week: "W5", sessions: 3, mini: 2, studio: 1 },
  { week: "W6", sessions: 6, mini: 3, studio: 3 },
];

export const CHART_TYPE_RATIONALE = {
  bar: {
    label: "Bar",
    when: "Discrete counts over time or categories — weekly sessions, reps completed, activity mix by kind.",
    where: "Account Insights volume / activity charts",
  },
  radar: {
    label: "Radar",
    when: "Compare several motion quality dimensions at once (DTW, cosine, ROM, basics) for a session or range.",
    where: "Results / performance radar",
  },
  angle: {
    label: "Line / angle series",
    when: "Continuous joint angles over frames — user vs reference alignment through a rep.",
    where: "Studio analytics · joint angle comparison",
  },
  summary: {
    label: "Sport summary card",
    when: "Composed Insights hero — volume + trends + empty honesty for a sport in a time range (not a raw chart).",
    where: "Account Insights sport tiles",
  },
} as const;
