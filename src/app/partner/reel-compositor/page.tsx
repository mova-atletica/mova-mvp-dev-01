"use client";

import { Player } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PartnerGate from "../../../components/partner/PartnerGate";
import { useAccount } from "../../../contexts/MockAuthContext";
import { loadActivityHydration } from "../../../lib/loadActivityHydration";
import {
  resolveSegmentFromHydration,
  type SegmentDraft,
} from "../../../lib/reelHydrate";
import { createClient } from "../../../lib/supabase/client";
import { useAccountActivityFeed } from "../../../lib/useAccountActivityFeed";
import { ProductInUse } from "../../../../reels/src/ProductInUse";
import { RECIPES, recipeToDefaultProps, type RecipeId } from "../../../../reels/src/defaults";
import type {
  AngleJointKey,
  ChartGlassTone,
  EntryPreset,
  JointAngleChart,
  ProductInUseProps,
  RecipeKnobs,
  ResolvedSegment,
  SegmentChartConfig,
} from "../../../../reels/src/types";
import {
  COMP_HEIGHT,
  COMP_WIDTH,
  normalizeJointCharts,
  SAFE_X_MAX,
  SAFE_X_MIN,
  SAFE_Y_MAX,
  SAFE_Y_MIN,
} from "../../../../reels/src/types";
import {
  CHART_H_MAX,
  CHART_H_MIN,
  CHART_STACK_GAP,
  CHART_W_MAX,
  CHART_W_MIN,
  CHART_X_MAX,
  CHART_X_MIN,
  CHART_Y_MAX,
  CHART_Y_MIN,
  DEFAULT_CHART_H,
  DEFAULT_CHART_W,
  DEFAULT_CHART_X,
  DEFAULT_CHART_Y,
} from "../../../../reels/src/types";

const JOINT_OPTIONS: { value: AngleJointKey; label: string }[] = [
  { value: "leftKneeAngles", label: "Left knee" },
  { value: "rightKneeAngles", label: "Right knee" },
  { value: "leftHipAngles", label: "Left hip" },
  { value: "rightHipAngles", label: "Right hip" },
  { value: "trunkAngles", label: "Trunk" },
  { value: "leftElbowAngles", label: "Left elbow" },
  { value: "rightElbowAngles", label: "Right elbow" },
  { value: "leftShoulderAbdAngles", label: "Left shoulder" },
  { value: "rightShoulderAbdAngles", label: "Right shoulder" },
];

const ENTRY_OPTIONS: { value: EntryPreset; label: string }[] = [
  { value: "bottom", label: "From bottom" },
  { value: "side", label: "From right" },
  { value: "sideLeft", label: "From left" },
  { value: "scale", label: "Scale in" },
  { value: "fade", label: "Fade in" },
];

const RENDER_CMD =
  "npx remotion render reels/src/index.ts ProductInUse reels/out/reel.mp4 --config=reels/remotion.config.ts --props=props.json";

const MAX_CHARTS_PER_SEGMENT = 4;

function chartsFromDefault(
  d: SegmentChartConfig | JointAngleChart[] | null | undefined
): JointAngleChart[] {
  const list = Array.isArray(d)
    ? normalizeJointCharts(d, null)
    : normalizeJointCharts(null, d ?? null);
  return list.map((c, i) => ({
    ...c,
    x: c.x ?? DEFAULT_CHART_X,
    y: c.y ?? DEFAULT_CHART_Y + i * (DEFAULT_CHART_H + CHART_STACK_GAP),
    fadeStartFrame: c.fadeStartFrame ?? 24,
    fadeDurationFrames: c.fadeDurationFrames ?? 35,
    entry: c.entry ?? "fade",
  }));
}

function emptyDraft(
  chartDefault: SegmentChartConfig | JointAngleChart[] | null = null
): SegmentDraft {
  return {
    source: "activity",
    activityId: "",
    plateSrc: "",
    charts: chartsFromDefault(chartDefault),
    overlays: "on",
  };
}

function knobsFromRecipe(recipe: RecipeKnobs): RecipeKnobs {
  return {
    ...recipe,
    showUiDevice: recipe.showUiDevice !== false,
    chartGlassTone: recipe.chartGlassTone ?? "dark",
    chartX: recipe.chartX ?? DEFAULT_CHART_X,
    chartY: recipe.chartY ?? DEFAULT_CHART_Y,
    chartWidth: recipe.chartWidth ?? DEFAULT_CHART_W,
    chartHeight: recipe.chartHeight ?? DEFAULT_CHART_H,
  };
}

export default function ReelCompositorPage() {
  return (
    <PartnerGate>
      <ReelCompositorInner />
    </PartnerGate>
  );
}

function ReelCompositorInner() {
  const { profile } = useAccount();
  const { items, loading: feedLoading, error: feedError } = useAccountActivityFeed();
  const [recipeId, setRecipeId] = useState<RecipeId>("reel-01");
  const recipe = RECIPES[recipeId];
  const [knobs, setKnobs] = useState<RecipeKnobs>(() => knobsFromRecipe(RECIPES["reel-01"]));

  const [drafts, setDrafts] = useState<SegmentDraft[]>(() => [
    emptyDraft(
      (RECIPES["reel-01"].segmentChartDefaults?.[0] as SegmentChartConfig) ?? {
        kind: "jointAngle",
        joint: "leftKneeAngles",
      }
    ),
  ]);
  const [uiSrc, setUiSrc] = useState("/reels/ui.mp4");
  const [uiLabel, setUiLabel] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [inputProps, setInputProps] = useState<ProductInUseProps | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  const trackBlob = (url: string) => {
    blobUrlsRef.current.push(url);
  };

  const replayable = useMemo(
    () => items.filter((i) => i.hasReplayPayload && !i.isSeed),
    [items]
  );

  const patchKnobs = (patch: Partial<RecipeKnobs>) => {
    setKnobs((k) => ({ ...k, ...patch }));
    // Keep hydrated segments; liveProps merges knobs for live Player updates.
  };

  const onRecipeChange = (id: RecipeId) => {
    setRecipeId(id);
    const next = RECIPES[id];
    setKnobs(knobsFromRecipe(next));
    const defaults = next.segmentChartDefaults as SegmentChartConfig[] | undefined;
    setDrafts((prev) => {
      if (id === "reel-02") {
        return [
          prev[0] ?? emptyDraft(defaults?.[0] ?? null),
          prev[1] ?? emptyDraft(defaults?.[1] ?? null),
        ];
      }
      return [prev[0] ?? emptyDraft(defaults?.[0] ?? null)];
    });
    setInputProps(null);
  };

  const updateDraft = (index: number, patch: Partial<SegmentDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    // Chart layout/fade + overlay toggle merge into liveProps — no re-hydrate.
    // Only wipe preview when the plate/activity source changes.
    const needsRehydrate =
      patch.source != null ||
      patch.activityId != null ||
      patch.plateSrc != null ||
      patch.durationInFrames != null;
    if (needsRehydrate) setInputProps(null);
  };

  const onUiFile = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    trackBlob(url);
    setUiSrc(url);
    setUiLabel(file.name);
  };

  const onPlateFile = (index: number, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    trackBlob(url);
    updateDraft(index, {
      source: "media",
      plateSrc: url,
      overlays: "off",
    });
  };

  const hydrateAndPreview = useCallback(async () => {
    setHydrating(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const fps = knobs.fps ?? 30;
      const resolved: ResolvedSegment[] = [];
      const notes: string[] = [];

      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i];
        const needsActivity =
          draft.source === "activity" ||
          (draft.source === "media" && Boolean(draft.activityId.trim()));

        let hydration = null;
        if (needsActivity) {
          const id = draft.activityId;
          if (!id.trim()) {
            setStatus(`Segment ${i + 1}: pick an activity`);
            setHydrating(false);
            return;
          }
          const { data, error } = await loadActivityHydration(supabase, id.trim());
          if (error || !data) {
            setStatus(`Segment ${i + 1}: ${error ?? "hydrate failed"}`);
            setHydrating(false);
            return;
          }
          hydration = data;
          if (draft.overlays === "on" && !data.poses?.length) {
            notes.push(`Segment ${i + 1}: no poses — overlays skipped`);
          }
          if (draft.charts.length > 0 && !data.angles?.leftKneeAngles?.length) {
            notes.push(`Segment ${i + 1}: no angles — charts hidden`);
          }
        }

        const { segment, error } = resolveSegmentFromHydration(draft, hydration, fps);
        if (error || !segment) {
          setStatus(`Segment ${i + 1}: ${error ?? "resolve failed"}`);
          setHydrating(false);
          return;
        }
        resolved.push(segment);
      }

      const base = recipeToDefaultProps(knobs, resolved);
      const props: ProductInUseProps = {
        ...base,
        ...knobs,
        uiSrc: uiSrc.trim() || "/reels/ui.mp4",
        segments: resolved,
      };
      setInputProps(props);
      setStatus(
        notes.length
          ? `Ready · ${notes.join(" · ")}`
          : `Ready · ${resolved.length} segment(s) · smoothed overlays + charts · ${profile?.email ?? "partner"}`
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Hydrate failed");
    } finally {
      setHydrating(false);
    }
  }, [drafts, knobs, uiSrc, profile?.email]);

  const durationInFrames = useMemo(() => {
    if (!inputProps?.segments?.length) return 240;
    return Math.max(
      1,
      inputProps.segments.reduce((a, s) => a + s.durationInFrames, 0)
    );
  }, [inputProps]);

  const liveProps = useMemo(() => {
    if (!inputProps) return null;
    const segments: ResolvedSegment[] = inputProps.segments.map((s, i) => {
      const draft = drafts[i];
      if (!draft) return s;
      const overlays: "on" | "off" =
        draft.overlays === "on" && (s.poses?.length ?? 0) > 0 ? "on" : "off";
      return {
        ...s,
        charts: draft.charts,
        chart: draft.charts[0] ?? null,
        overlays,
      };
    });
    return {
      ...inputProps,
      ...knobs,
      uiSrc: uiSrc.trim() || inputProps.uiSrc,
      segments,
    };
  }, [inputProps, knobs, uiSrc, drafts]);

  const propsJson = useMemo(
    () => (liveProps ? JSON.stringify(liveProps, null, 2) : ""),
    [liveProps]
  );

  const exportReel = async () => {
    if (!liveProps) return;
    setExporting(true);
    setExportProgress(0);
    setStatus("Exporting reel in browser… keep this tab open");
    try {
      const { renderMediaOnWeb, canRenderMediaOnWeb } = await import(
        "@remotion/web-renderer"
      );
      const capability = await canRenderMediaOnWeb({
        width: COMP_WIDTH,
        height: COMP_HEIGHT,
      });
      if (!capability.canRender) {
        const detail =
          capability.issues
            ?.filter((i) => i.severity === "error")
            .map((i) => i.message)
            .join("; ") || "WebCodecs not available";
        setStatus(`Export not supported in this browser: ${detail}`);
        return;
      }

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          component: ProductInUse,
          durationInFrames,
          fps: liveProps.fps || 30,
          width: COMP_WIDTH,
          height: COMP_HEIGHT,
          id: "ProductInUse",
          defaultProps: liveProps,
        },
        inputProps: liveProps,
        allowHtmlInCanvas: true,
        onProgress: ({ progress }) => {
          setExportProgress(Math.round((progress ?? 0) * 100));
        },
      });
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mova-reel-${recipeId}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported mova-reel-${recipeId}.mp4`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-[color:var(--border-secondary)] bg-[color:var(--card-bg)] px-3 py-2 text-sm";

  return (
    <main className="homepage-canvas min-h-screen">
      <div className="homepage-canvas-backdrop" aria-hidden>
        <div className="homepage-canvas-gradient" />
        <div className="homepage-canvas-noise" />
        <div className="homepage-canvas-dots" />
      </div>
      <div className="homepage-canvas-content relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-[color:var(--foreground)]">
          Reel compositor
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Partner-only · activity overlays · one-click MP4 export
        </p>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            <label className="block text-sm">
              <span className="text-[color:var(--muted-foreground)]">Recipe</span>
              <select
                className={field}
                value={recipeId}
                onChange={(e) => onRecipeChange(e.target.value as RecipeId)}
              >
                <option value="reel-01">reel-01 — Product insert</option>
                <option value="reel-02">reel-02 — Two-set story</option>
              </select>
            </label>

            {drafts.map((draft, index) => (
              <SegmentEditor
                key={index}
                index={index}
                draft={draft}
                activities={replayable}
                feedLoading={feedLoading}
                fieldClass={field}
                chartDefaults={{
                  x: knobs.chartX ?? DEFAULT_CHART_X,
                  y: knobs.chartY ?? DEFAULT_CHART_Y,
                  height: knobs.chartHeight ?? DEFAULT_CHART_H,
                  fadeStartFrame: knobs.overlayStartFrame ?? 0,
                  fadeDurationFrames: knobs.overlayAnimDurationFrames ?? 20,
                  entry: "fade",
                }}
                onChange={(patch) => updateDraft(index, patch)}
                onPlateFile={(file) => onPlateFile(index, file)}
              />
            ))}

            {recipeId === "reel-01" && drafts.length === 1 ? (
              <button
                type="button"
                className="text-sm underline text-[color:var(--primary)]"
                onClick={() =>
                  setDrafts((d) => [
                    ...d,
                    emptyDraft(
                      (recipe.segmentChartDefaults?.[1] as SegmentChartConfig) ?? null
                    ),
                  ])
                }
              >
                Add second segment
              </button>
            ) : null}

            <fieldset className="rounded-xl border border-[color:var(--border-secondary)] p-4">
              <legend className="px-1 text-sm font-medium">
                UI device &amp; HUD chart
              </legend>
              <div className="mt-2 space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    UI device
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={knobs.showUiDevice !== false}
                      onChange={(e) =>
                        patchKnobs({ showUiDevice: e.target.checked })
                      }
                    />
                    Show UI device overlay
                  </label>
                  {knobs.showUiDevice !== false ? (
                    <>
                  <label className="block text-sm">
                    <span className="text-[color:var(--muted-foreground)]">
                      Upload UI recording
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/*"
                      className="mt-1 block w-full text-sm"
                      onChange={(e) => onUiFile(e.target.files?.[0] ?? null)}
                    />
                    {uiLabel ? (
                      <span className="mt-1 block text-xs text-[color:var(--muted-foreground)]">
                        Using {uiLabel} (preview blob)
                      </span>
                    ) : null}
                  </label>
                  <label className="block text-sm">
                    <span className="text-[color:var(--muted-foreground)]">
                      Or path / URL
                    </span>
                    <input
                      className={field}
                      value={uiSrc.startsWith("blob:") ? "" : uiSrc}
                      onChange={(e) => {
                        setUiSrc(e.target.value);
                        setUiLabel(null);
                        setInputProps(null);
                      }}
                      placeholder="/reels/ui.mp4"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-[color:var(--muted-foreground)]">
                      Entry animation
                    </span>
                    <select
                      className={field}
                      value={knobs.entry}
                      onChange={(e) =>
                        patchKnobs({ entry: e.target.value as EntryPreset })
                      }
                    >
                      {ENTRY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <SliderRow
                    label={`Park X (focal) · ${knobs.x.toFixed(2)}`}
                    min={SAFE_X_MIN}
                    max={SAFE_X_MAX}
                    step={0.01}
                    value={knobs.x}
                    onChange={(x) => patchKnobs({ x })}
                  />
                  <SliderRow
                    label={`Park Y · ${knobs.y.toFixed(2)}`}
                    min={SAFE_Y_MIN}
                    max={SAFE_Y_MAX}
                    step={0.01}
                    value={knobs.y}
                    onChange={(y) => patchKnobs({ y })}
                  />
                  <SliderRow
                    label={`Scale · ${knobs.scale.toFixed(2)}`}
                    min={0.45}
                    max={1.15}
                    step={0.01}
                    value={knobs.scale}
                    onChange={(scale) => patchKnobs({ scale })}
                  />
                  <SliderRow
                    label={`Start frame · ${knobs.uiStartFrame}`}
                    min={0}
                    max={300}
                    step={1}
                    value={knobs.uiStartFrame}
                    onChange={(uiStartFrame) => patchKnobs({ uiStartFrame })}
                  />
                  <SliderRow
                    label={`Anim duration · ${knobs.uiAnimDurationFrames}f`}
                    min={8}
                    max={90}
                    step={1}
                    value={knobs.uiAnimDurationFrames}
                    onChange={(uiAnimDurationFrames) =>
                      patchKnobs({ uiAnimDurationFrames })
                    }
                  />
                    </>
                  ) : (
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      UI device hidden — plate, pose overlays, and HUD charts still
                      render.
                    </p>
                  )}
                </div>

                <div className="space-y-3 border-t border-[color:var(--border-secondary)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    HUD chart style
                  </p>
                  <label className="block text-sm">
                    <span className="text-[color:var(--muted-foreground)]">
                      Glass tone
                    </span>
                    <select
                      className={field}
                      value={knobs.chartGlassTone ?? "dark"}
                      onChange={(e) =>
                        patchKnobs({
                          chartGlassTone: e.target.value as ChartGlassTone,
                        })
                      }
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </label>
                  <SliderRow
                    label={`Default chart width · ${(knobs.chartWidth ?? DEFAULT_CHART_W).toFixed(2)}`}
                    min={CHART_W_MIN}
                    max={CHART_W_MAX}
                    step={0.01}
                    value={knobs.chartWidth ?? DEFAULT_CHART_W}
                    onChange={(chartWidth) => patchKnobs({ chartWidth })}
                  />
                  <SliderRow
                    label={`Default chart height · ${(knobs.chartHeight ?? DEFAULT_CHART_H).toFixed(2)}`}
                    min={CHART_H_MIN}
                    max={CHART_H_MAX}
                    step={0.01}
                    value={knobs.chartHeight ?? DEFAULT_CHART_H}
                    onChange={(chartHeight) => patchKnobs({ chartHeight })}
                  />
                  <SliderRow
                    label={`Glass opacity · ${knobs.glassOpacity.toFixed(2)}`}
                    min={0}
                    max={0.55}
                    step={0.01}
                    value={knobs.glassOpacity}
                    onChange={(glassOpacity) => patchKnobs({ glassOpacity })}
                  />
                  <SliderRow
                    label={`Glass blur · ${knobs.glassBlur}px`}
                    min={0}
                    max={40}
                    step={1}
                    value={knobs.glassBlur}
                    onChange={(glassBlur) => patchKnobs({ glassBlur })}
                  />
                  <SliderRow
                    label={`Pose overlay fade-in · ${knobs.overlayStartFrame ?? 0}f`}
                    min={0}
                    max={120}
                    step={1}
                    value={knobs.overlayStartFrame ?? 0}
                    onChange={(overlayStartFrame) =>
                      patchKnobs({ overlayStartFrame })
                    }
                  />
                  <SliderRow
                    label={`Pose overlay fade duration · ${knobs.overlayAnimDurationFrames ?? 20}f`}
                    min={1}
                    max={90}
                    step={1}
                    value={knobs.overlayAnimDurationFrames ?? 20}
                    onChange={(overlayAnimDurationFrames) =>
                      patchKnobs({ overlayAnimDurationFrames })
                    }
                  />
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    Per-chart X/Y and fade live under each segment&apos;s HUD charts.
                    Size/glass apply to all charts. Pose fade is skeleton/chips only.
                  </p>
                </div>
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={hydrating}
                onClick={() => void hydrateAndPreview()}
                className="rounded-lg border border-[color:var(--border-secondary)] px-4 py-2 text-sm disabled:opacity-50"
              >
                {hydrating ? "Hydrating…" : "Hydrate & preview"}
              </button>
              <button
                type="button"
                disabled={!liveProps || exporting}
                onClick={() => void exportReel()}
                className="rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground,#fff)] disabled:opacity-50"
              >
                {exporting
                  ? `Exporting… ${exportProgress}%`
                  : "Export MP4"}
              </button>
            </div>

            {feedError ? <p className="text-sm text-red-500">{feedError}</p> : null}
            {status ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">{status}</p>
            ) : null}

            {propsJson ? (
              <details className="rounded-lg border border-[color:var(--border-secondary)] p-3 text-xs">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced / CLI fallback
                </summary>
                <p className="mt-2 text-[color:var(--muted-foreground)]">
                  Prefer <strong>Export MP4</strong> (browser WebCodecs). CLI:{" "}
                  <code className="text-xs">{RENDER_CMD}</code>
                </p>
              </details>
            ) : null}
          </div>

          <div className="mx-auto w-full max-w-[320px] shrink-0 lg:sticky lg:top-8">
            <div
              className="overflow-hidden rounded-2xl border border-[color:var(--border-secondary)] bg-black"
              style={{ aspectRatio: "9 / 16" }}
            >
              {liveProps ? (
                <Player
                  component={ProductInUse}
                  inputProps={liveProps}
                  durationInFrames={durationInFrames}
                  compositionWidth={COMP_WIDTH}
                  compositionHeight={COMP_HEIGHT}
                  fps={liveProps.fps || 30}
                  style={{ width: "100%", height: "100%" }}
                  controls
                  loop
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/50">
                  Hydrate segments to preview
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-[color:var(--muted-foreground)]">
              1080×1920 · knobs update live after hydrate
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[color:var(--muted-foreground)]">{label}</span>
      <input
        type="range"
        className="mt-1 w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function SegmentEditor({
  index,
  draft,
  activities,
  feedLoading,
  fieldClass,
  chartDefaults,
  onChange,
  onPlateFile,
}: {
  index: number;
  draft: SegmentDraft;
  activities: { id: string; title: string; subtitle: string }[];
  feedLoading: boolean;
  fieldClass: string;
  chartDefaults: {
    x: number;
    y: number;
    height: number;
    fadeStartFrame: number;
    fadeDurationFrames: number;
    entry: EntryPreset;
  };
  onChange: (patch: Partial<SegmentDraft>) => void;
  onPlateFile: (file: File | null) => void;
}) {
  const patchChart = (ci: number, patch: Partial<JointAngleChart>) => {
    onChange({
      charts: draft.charts.map((row, j) =>
        j === ci ? { ...row, ...patch } : row
      ),
    });
  };

  return (
    <fieldset className="rounded-xl border border-[color:var(--border-secondary)] p-4">
      <legend className="px-1 text-sm font-medium">Segment {index + 1}</legend>
      <div className="mt-2 space-y-3">
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={draft.source === "activity"}
              onChange={() => onChange({ source: "activity", overlays: "on" })}
            />
            Activity video
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={draft.source === "media"}
              onChange={() => onChange({ source: "media", overlays: "off" })}
            />
            Media / upload
          </label>
        </div>

        {draft.source === "activity" || draft.source === "media" ? (
          <label className="block text-sm">
            <span className="text-[color:var(--muted-foreground)]">
              {draft.source === "media"
                ? "Link analysis (optional activity)"
                : "Activity"}
            </span>
            <select
              className={fieldClass}
              value={draft.activityId}
              disabled={feedLoading}
              onChange={(e) => onChange({ activityId: e.target.value })}
            >
              <option value="">
                {feedLoading ? "Loading…" : "Select activity…"}
              </option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.subtitle ? ` — ${a.subtitle}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {draft.source === "media" ? (
          <>
            <label className="block text-sm">
              <span className="text-[color:var(--muted-foreground)]">
                Upload plate clip
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/*"
                className="mt-1 block w-full text-sm"
                onChange={(e) => onPlateFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-[color:var(--muted-foreground)]">
                Or plate URL / path
              </span>
              <input
                className={fieldClass}
                value={draft.plateSrc.startsWith("blob:") ? "" : draft.plateSrc}
                onChange={(e) => onChange({ plateSrc: e.target.value })}
                placeholder="/reels/plate.mp4 or https://…"
              />
            </label>
            {draft.plateSrc.startsWith("blob:") ? (
              <span className="text-xs text-[color:var(--muted-foreground)]">
                Using uploaded plate (preview blob)
              </span>
            ) : null}
          </>
        ) : null}

        <div className="space-y-3">
          <span className="text-sm text-[color:var(--muted-foreground)]">
            HUD charts
          </span>
          {draft.charts.map((c, ci) => {
            const x = c.x ?? chartDefaults.x;
            const y =
              c.y ??
              chartDefaults.y + ci * (chartDefaults.height + CHART_STACK_GAP);
            const fadeStart = c.fadeStartFrame ?? chartDefaults.fadeStartFrame;
            const fadeDur =
              c.fadeDurationFrames ?? chartDefaults.fadeDurationFrames;
            const entry = c.entry ?? chartDefaults.entry;
            return (
              <div
                key={`${c.joint}-${ci}`}
                className="space-y-2 rounded-lg border border-[color:var(--border-secondary)] p-3"
              >
                <div className="flex items-center gap-2">
                  <select
                    className={fieldClass}
                    value={c.joint}
                    onChange={(e) =>
                      patchChart(ci, {
                        joint: e.target.value as AngleJointKey,
                      })
                    }
                  >
                    {JOINT_OPTIONS.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="shrink-0 text-xs underline text-[color:var(--muted-foreground)]"
                    onClick={() =>
                      onChange({
                        charts: draft.charts.filter((_, j) => j !== ci),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-sm">
                  <span className="text-[color:var(--muted-foreground)]">
                    Entry direction
                  </span>
                  <select
                    className={fieldClass}
                    value={entry}
                    onChange={(e) =>
                      patchChart(ci, {
                        entry: e.target.value as EntryPreset,
                      })
                    }
                  >
                    {ENTRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <SliderRow
                  label={`X · ${x.toFixed(2)}`}
                  min={CHART_X_MIN}
                  max={CHART_X_MAX}
                  step={0.01}
                  value={x}
                  onChange={(nx) => patchChart(ci, { x: nx })}
                />
                <SliderRow
                  label={`Y · ${y.toFixed(2)}`}
                  min={CHART_Y_MIN}
                  max={CHART_Y_MAX}
                  step={0.01}
                  value={y}
                  onChange={(ny) => patchChart(ci, { y: ny })}
                />
                <SliderRow
                  label={`Fade-in · ${fadeStart}f`}
                  min={0}
                  max={180}
                  step={1}
                  value={fadeStart}
                  onChange={(fadeStartFrame) =>
                    patchChart(ci, { fadeStartFrame })
                  }
                />
                <SliderRow
                  label={`Fade duration · ${fadeDur}f`}
                  min={1}
                  max={90}
                  step={1}
                  value={fadeDur}
                  onChange={(fadeDurationFrames) =>
                    patchChart(ci, { fadeDurationFrames })
                  }
                />
              </div>
            );
          })}
          {draft.charts.length < MAX_CHARTS_PER_SEGMENT ? (
            <button
              type="button"
              className="text-sm underline text-[color:var(--primary)]"
              onClick={() => {
                const used = new Set(draft.charts.map((row) => row.joint));
                const nextJoint =
                  JOINT_OPTIONS.find((j) => !used.has(j.value))?.value ??
                  "leftKneeAngles";
                const i = draft.charts.length;
                onChange({
                  charts: [
                    ...draft.charts,
                    {
                      kind: "jointAngle",
                      joint: nextJoint,
                      x: chartDefaults.x,
                      y:
                        chartDefaults.y +
                        i * (chartDefaults.height + CHART_STACK_GAP),
                      fadeStartFrame: chartDefaults.fadeStartFrame,
                      fadeDurationFrames: chartDefaults.fadeDurationFrames,
                      entry: chartDefaults.entry,
                    },
                  ],
                });
              }}
            >
              Add chart
            </button>
          ) : null}
          <span className="block text-xs text-[color:var(--muted-foreground)]">
            Each chart has its own X/Y, entry direction, and segment-local fade.
            Shared size/glass are under HUD chart style.
          </span>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.overlays === "on"}
            onChange={(e) =>
              onChange({ overlays: e.target.checked ? "on" : "off" })
            }
          />
          Live overlays use activity visualConfig (skeleton / joint chips)
        </label>
      </div>
    </fieldset>
  );
}
