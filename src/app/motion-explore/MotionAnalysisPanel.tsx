// Updated MotionAnalysisPanel.tsx
"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { PanelLeftClose } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";
import type {
  CyclingDualAnalysisResult,
  CyclingPerspectiveMetrics,
  PlankAnalysisResult,
  PoseFlexibilityAnalysisResult,
  PullUpsAnalysisResult,
  SquatAnalysisResult,
  SportAnalysisKind,
} from "../../lib/sportAnalysis";
import InfoTooltip from "../../components/InfoTooltip";
import {
  DISPLAY_ANGLE_SMOOTH_PRESET,
  smoothOpenMoveAngleSeries,
} from "../../lib/angleSeriesSmoothing";
import { useOptionalAssetVideoEngine } from "./assetVideoEngineContext";

interface MotionAnalysisPanelProps {
  poses: any[];
  angles: {
    leftKneeAngles: (number | null)[];
    rightKneeAngles: (number | null)[];
    leftHipAngles: (number | null)[];
    rightHipAngles: (number | null)[];
    leftElbowAngles: (number | null)[];
    rightElbowAngles: (number | null)[];
    leftShoulderAbdAngles: (number | null)[];
    rightShoulderAbdAngles: (number | null)[];
    trunkAngles: (number | null)[];
  };
  videoUrl: string;
  /** Seconds between pose samples (for sport charts / rep times). */
  frameIntervalSec?: number | null;
  /** When set (e.g. desktop analysis drawer), shows a control to collapse the panel. */
  onRequestClose?: () => void;
  /** Disable live video playhead syncing for constrained/mobile panel contexts. */
  syncPlaybackFrame?: boolean;
  /** Open Move Studio: adds “Sport analysis” tab (cycling MVP). */
  enableSportAnalysisTab?: boolean;
  sportAnalysisKind?: SportAnalysisKind;
  cyclingAnalysisResult?: CyclingDualAnalysisResult | null;
  cyclingAnalysisError?: string | null;
  pullUpsAnalysisResult?: PullUpsAnalysisResult | null;
  pullUpsAnalysisError?: string | null;
  plankAnalysisResult?: PlankAnalysisResult | null;
  plankAnalysisError?: string | null;
  squatAnalysisResult?: SquatAnalysisResult | null;
  squatAnalysisError?: string | null;
  poseFlexibilityAnalysisResult?: PoseFlexibilityAnalysisResult | null;
  poseFlexibilityAnalysisError?: string | null;
  /** Exercise studio: metadata + programs list */
  enableDetailsTab?: boolean;
  detailsContent?: React.ReactNode;
  defaultTab?: TabType;
}

type TabType = "overview" | "joints" | "sport" | "details";

type ChartJointKey =
  | "leftKnee"
  | "rightKnee"
  | "leftHip"
  | "rightHip"
  | "leftElbow"
  | "rightElbow"
  | "leftShoulder"
  | "rightShoulder";

const DEFAULT_JOINT_LINE_VISIBLE: Record<ChartJointKey, boolean> = {
  leftKnee: false,
  rightKnee: false,
  leftHip: false,
  rightHip: false,
  leftElbow: true,
  rightElbow: true,
  leftShoulder: false,
  rightShoulder: false,
};

const CHART_JOINT_SERIES: {
  key: ChartJointKey;
  label: string;
  stroke: string;
  side: "left" | "right";
}[] = [
  { key: "leftKnee", label: "Left Knee", stroke: "#ef4444", side: "left" },
  { key: "leftHip", label: "Left Hip", stroke: "#10b981", side: "left" },
  { key: "leftElbow", label: "Left Elbow", stroke: "#8b5cf6", side: "left" },
  { key: "leftShoulder", label: "Left Shoulder", stroke: "#f43f5e", side: "left" },
  { key: "rightKnee", label: "Right Knee", stroke: "#3b82f6", side: "right" },
  { key: "rightHip", label: "Right Hip", stroke: "#f59e0b", side: "right" },
  { key: "rightElbow", label: "Right Elbow", stroke: "#06b6d4", side: "right" },
  { key: "rightShoulder", label: "Right Shoulder", stroke: "#a855f7", side: "right" },
];

/** Recharts SVG tick props — matches section title color; slightly smaller than `text-md` for axis density. */
const CHART_AXIS_TICK = {
  fill: "var(--foreground)",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "inherit",
} as const;

export default function MotionAnalysisPanel({
  poses,
  angles,
  videoUrl,
  frameIntervalSec = null,
  onRequestClose,
  syncPlaybackFrame = true,
  enableSportAnalysisTab = false,
  sportAnalysisKind = "cycling",
  cyclingAnalysisResult = null,
  cyclingAnalysisError = null,
  pullUpsAnalysisResult = null,
  pullUpsAnalysisError = null,
  plankAnalysisResult = null,
  plankAnalysisError = null,
  squatAnalysisResult = null,
  squatAnalysisError = null,
  poseFlexibilityAnalysisResult = null,
  poseFlexibilityAnalysisError = null,
  enableDetailsTab = false,
  detailsContent = null,
  defaultTab,
}: MotionAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    defaultTab ?? (enableDetailsTab ? "details" : "overview")
  );
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);
  const [jointLineVisible, setJointLineVisible] =
    useState<Record<ChartJointKey, boolean>>(() => ({ ...DEFAULT_JOINT_LINE_VISIBLE }));
  const engine = useOptionalAssetVideoEngine();
  const [playbackFrame, setPlaybackFrame] = useState(0);
  const lastSyncedPlaybackFrameRef = useRef(0);

  useEffect(() => {
    if (!enableSportAnalysisTab && activeTab === "sport") setActiveTab("overview");
  }, [enableSportAnalysisTab, activeTab]);

  useEffect(() => {
    if (!enableDetailsTab && activeTab === "details") setActiveTab("overview");
  }, [enableDetailsTab, activeTab]);

  /** Reset playhead when clip length changes. */
  useEffect(() => {
    lastSyncedPlaybackFrameRef.current = 0;
    setPlaybackFrame(0);
  }, [poses.length]);

  /** Video → chart: only `setPlaybackFrame` when the integer pose index changes (avoids axis churn). */
  useEffect(() => {
    if (!syncPlaybackFrame || activeTab !== "joints") return;
    const video = engine?.videoRef?.current;
    if (!video || poses.length === 0) return;
    const n = poses.length;

    const sync = () => {
      const d = video.duration;
      if (!d || !Number.isFinite(d) || d <= 0) return;
      const idx = Math.min(n - 1, Math.max(0, Math.floor(video.currentTime * (n / d))));
      if (idx !== lastSyncedPlaybackFrameRef.current) {
        lastSyncedPlaybackFrameRef.current = idx;
        setPlaybackFrame(idx);
      }
    };

    video.addEventListener("timeupdate", sync);
    video.addEventListener("seeked", sync);
    video.addEventListener("loadedmetadata", sync);
    sync();
    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("seeked", sync);
      video.removeEventListener("loadedmetadata", sync);
    };
  }, [activeTab, engine, poses.length, syncPlaybackFrame]);

  const seekVideoToFrame = useCallback(
    (frame: number) => {
      const video = engine?.videoRef?.current;
      if (!video || poses.length === 0) return;
      const n = poses.length;
      const f = Math.min(n - 1, Math.max(0, Math.floor(frame)));
      const d = video.duration;
      if (d && Number.isFinite(d) && d > 0) {
        video.currentTime = (f / n) * d;
      }
      lastSyncedPlaybackFrameRef.current = f;
      setPlaybackFrame(f);
    },
    [engine, poses.length]
  );

  const handleJointChartClick = useCallback(
    (data: { activeLabel?: string | number } | undefined) => {
      if (!syncPlaybackFrame) return;
      if (!engine?.videoRef?.current) return;
      if (!data || data.activeLabel === undefined) return;
      const frame = parseInt(String(data.activeLabel), 10);
      if (!Number.isFinite(frame)) return;
      seekVideoToFrame(frame);
    },
    [engine, seekVideoToFrame, syncPlaybackFrame]
  );

  // Early return if no data
  if (!poses || poses.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4"></div>
          <p style={{ color: 'var(--foreground)' }}>No motion data available</p>
        </div>
      </div>
    );
  }

  const displayAngles = useMemo(
    () => smoothOpenMoveAngleSeries(angles, DISPLAY_ANGLE_SMOOTH_PRESET),
    [angles]
  );

  // Calculate basic statistics (from display-smoothed angles)
  const stats = useMemo(() => {
    const totalFrames = poses.length;
    const validFrames = poses.filter(pose => pose && pose.keypoints && pose.keypoints.length > 0).length;
    
    // Calculate range of motion for each joint
    const calculateROM = (angleArray: number[]) => {
      const validAngles = angleArray.filter((angle) => Number.isFinite(angle));
      if (validAngles.length === 0) return { min: 0, max: 0, range: 0, avg: 0 };
      
      const min = Math.min(...validAngles);
      const max = Math.max(...validAngles);
      const range = max - min;
      const avg = validAngles.reduce((sum, angle) => sum + angle, 0) / validAngles.length;
      
      return { min, max, range, avg };
    };

    const jointStats = {
      leftKnee: calculateROM(displayAngles.leftKneeAngles),
      rightKnee: calculateROM(displayAngles.rightKneeAngles),
      leftHip: calculateROM(displayAngles.leftHipAngles),
      rightHip: calculateROM(displayAngles.rightHipAngles),
      leftElbow: calculateROM(displayAngles.leftElbowAngles),
      rightElbow: calculateROM(displayAngles.rightElbowAngles),
      leftShoulder: calculateROM(displayAngles.leftShoulderAbdAngles),
      rightShoulder: calculateROM(displayAngles.rightShoulderAbdAngles),
      trunk: calculateROM(displayAngles.trunkAngles),
    };

    // Calculate symmetry (left vs right)
    const calculateSymmetry = (left: any, right: any) => {
      if (left.avg === 0 || right.avg === 0) return 0;
      const diff = Math.abs(left.avg - right.avg);
      return Math.max(0, 100 - (diff / Math.max(left.avg, right.avg)) * 100);
    };

    const symmetry = {
      knee: calculateSymmetry(jointStats.leftKnee, jointStats.rightKnee),
      hip: calculateSymmetry(jointStats.leftHip, jointStats.rightHip),
      elbow: calculateSymmetry(jointStats.leftElbow, jointStats.rightElbow),
      shoulder: calculateSymmetry(jointStats.leftShoulder, jointStats.rightShoulder)
    };

    return {
      totalFrames,
      validFrames,
      detectionRate: (validFrames / totalFrames) * 100,
      jointStats,
      symmetry
    };
  }, [poses, displayAngles]);

  // Prepare chart data for joint angles over time (display-smoothed, continuous lines)
  const chartData = useMemo(() => {
    return poses.map((_, index) => ({
      frame: index,
      leftKnee: displayAngles.leftKneeAngles[index],
      rightKnee: displayAngles.rightKneeAngles[index],
      leftHip: displayAngles.leftHipAngles[index],
      rightHip: displayAngles.rightHipAngles[index],
      leftElbow: displayAngles.leftElbowAngles[index],
      rightElbow: displayAngles.rightElbowAngles[index],
      leftShoulder: displayAngles.leftShoulderAbdAngles[index],
      rightShoulder: displayAngles.rightShoulderAbdAngles[index],
    }));
  }, [poses, displayAngles]);

  /** Stable X tick values — depends only on series length so ticks are not recomputed every playhead step. */
  const jointChartXAxisTicks = useMemo(() => {
    const n = chartData.length;
    if (n <= 0) return [];
    if (n === 1) return [0];
    const target = 6;
    const step = Math.max(1, Math.floor((n - 1) / (target - 1)));
    const ticks: number[] = [];
    for (let i = 0; i < n; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1);
    return ticks;
  }, [chartData.length]);

  // Prepare ROM data for bar chart
  const romData = useMemo(() => {
    return [
      { joint: 'Left Knee', range: stats.jointStats.leftKnee.range, avg: stats.jointStats.leftKnee.avg },
      { joint: 'Right Knee', range: stats.jointStats.rightKnee.range, avg: stats.jointStats.rightKnee.avg },
      { joint: 'Left Hip', range: stats.jointStats.leftHip.range, avg: stats.jointStats.leftHip.avg },
      { joint: 'Right Hip', range: stats.jointStats.rightHip.range, avg: stats.jointStats.rightHip.avg },
      { joint: 'Left Elbow', range: stats.jointStats.leftElbow.range, avg: stats.jointStats.leftElbow.avg },
      { joint: 'Right Elbow', range: stats.jointStats.rightElbow.range, avg: stats.jointStats.rightElbow.avg },
    ];
  }, [stats.jointStats]);

  // Memoize the chart mouse handlers to prevent unnecessary re-renders
  const handleChartMouseMove = useCallback((data: any) => {
    if (data && data.activeLabel !== undefined) {
      setHoveredFrame(parseInt(data.activeLabel));
    }
  }, []);

  const handleChartMouseLeave = useCallback(() => {
    setHoveredFrame(null);
  }, []);

  const sportTabContent = useMemo(() => {
    if (sportAnalysisKind === "pullups") {
      if (pullUpsAnalysisError) {
        return (
          <div className="space-y-2 text-sm" style={{ color: "var(--foreground)" }}>
            <p className="text-red-500/90">{pullUpsAnalysisError}</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              Try a clearer view of your arms, steady reps, or a longer clip, then run <strong>Analyze</strong> again.
            </p>
          </div>
        );
      }
      if (!pullUpsAnalysisResult) {
        return (
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            In the side rail, open <strong>2. Analyze Movement</strong>, select <strong>a sport</strong>, then click{" "}
            <strong>Analyze</strong>. We estimate form from combined joint angle flexions and extensions.
          </p>
        );
      }

      const r = pullUpsAnalysisResult;
      const dt = frameIntervalSec && frameIntervalSec > 0 ? frameIntervalSec : 1 / 30;
      const chartRows = r.chart_smoothed_combined.map((_, i) => ({
        t: i * dt,
        left: Number.isFinite(r.chart_smoothed_left[i]) ? r.chart_smoothed_left[i] : null,
        right: Number.isFinite(r.chart_smoothed_right[i]) ? r.chart_smoothed_right[i] : null,
        combined: r.chart_smoothed_combined[i],
      }));
      const tMax = chartRows.length > 0 ? chartRows[chartRows.length - 1].t : 0;

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-normal" style={{ color: "var(--foreground)" }}>
            Pull-ups
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Estimated from elbow-angle cycles; camera angle and occlusion can affect counts. Use as a guide, not a
            competition judge.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Reps
              </div>
              <div className="text-2xl font-semibold tabular-nums text-blue-600">{r.rep_count}</div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Rep times (from clip start)
            </h4>
            <div className="max-h-40 overflow-y-auto rounded-lg text-sm" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted-foreground)" }}>
                      #
                    </th>
                    <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--foreground)" }}>
                      Time (s)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.rep_times_sec.map((sec, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)" }}
                    >
                      <td className="px-3 py-1.5 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                        {idx + 1}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
                        {sec.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Elbow angle (smoothed)
            </h4>
            <p className="mb-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Faint: left / right. Bold: combined (used for rep detection). Vertical lines: detected rep tops.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, tMax]}
                  tick={CHART_AXIS_TICK}
                  stroke="var(--border)"
                  tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                  label={{
                    value: "Time (s)",
                    position: "insideBottom",
                    dy: 9,
                    ...CHART_AXIS_TICK,
                  }}
                />
                <YAxis
                  tick={CHART_AXIS_TICK}
                  stroke="var(--border)"
                  domain={["auto", "auto"]}
                  label={{
                    value: "Elbow angle (°)",
                    angle: -90,
                    position: "insideLeft",
                    dx: 2,
                    ...CHART_AXIS_TICK,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--results-chart-tooltip-bg)",
                    color: "var(--results-chart-tooltip-text)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "12px",
                  }}
                  labelFormatter={(t) => `t = ${Number(t).toFixed(2)} s`}
                  formatter={(v: number | string, name: string) => {
                    if (typeof v !== "number") return [String(v), name];
                    return [`${v.toFixed(1)}°`, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="left"
                  name="Left"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeOpacity={0.55}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="right"
                  name="Right"
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeOpacity={0.55}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="combined"
                  name="Combined"
                  stroke="var(--accent, #3b82f6)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                {r.rep_times_sec.map((tRep, i) => (
                  <ReferenceLine
                    key={i}
                    x={tRep}
                    stroke="color-mix(in srgb, var(--accent, #3b82f6) 65%, transparent)"
                    strokeDasharray="4 4"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (sportAnalysisKind === "plank") {
      if (plankAnalysisError) {
        return (
          <div className="space-y-2 text-sm" style={{ color: "var(--foreground)" }}>
            <p className="text-red-500/90">{plankAnalysisError}</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              Film from the side with your full body in frame, then run <strong>Analyze</strong> again.
            </p>
          </div>
        );
      }
      if (!plankAnalysisResult) {
        return (
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            In the side rail, open <strong>2. Sport analysis</strong>, choose <strong>Plank</strong>, then click{" "}
            <strong>Analyze</strong>. We estimate hold time, corrections, and joint angles (hip, knee, shoulder) from side
            view.
          </p>
        );
      }

      const r = plankAnalysisResult;
      const dt = frameIntervalSec && frameIntervalSec > 0 ? frameIntervalSec : 1 / 30;
      const n = Math.max(
        r.hipAngleSeries.length,
        r.kneeAngleSeries.length,
        r.shoulderAngleSeries.length
      );
      const angleRows = Array.from({ length: n }, (_, i) => ({
        t: i * dt,
        hip: r.hipAngleSeries[i] != null && Number.isFinite(r.hipAngleSeries[i]!) ? r.hipAngleSeries[i] : null,
        knee: r.kneeAngleSeries[i] != null && Number.isFinite(r.kneeAngleSeries[i]!) ? r.kneeAngleSeries[i] : null,
        shoulder:
          r.shoulderAngleSeries[i] != null && Number.isFinite(r.shoulderAngleSeries[i]!)
            ? r.shoulderAngleSeries[i]
            : null,
      }));
      const tMax = angleRows.length > 0 ? angleRows[angleRows.length - 1].t : 0;
      const holdLabel =
        r.holdDurationSec < 60
          ? `${Math.round(r.holdDurationSec)}s`
          : `${Math.floor(r.holdDurationSec / 60)}m ${Math.round(r.holdDurationSec % 60)}s`;

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-normal" style={{ color: "var(--foreground)" }}>
            Plank Analysis
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Angle-based side view analysis. Switch "Side toward camera" in the side panel if results look weird.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Hold (in plank)
              </div>
              <div className="text-2xl font-semibold tabular-nums text-blue-600">{holdLabel}</div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Time all targets
              </div>
              <div className="text-2xl font-semibold tabular-nums text-green-600">
                {r.timeInZonePct.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Corrections
              </div>
              <div className="text-2xl font-semibold tabular-nums text-amber-600">{r.correctionCount}</div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Frames knee ≥ 155°
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                {r.timeKneeExtendedPct.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Frames hip 125–170°
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                {r.timeHipNeutralPct.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Frames shoulder 70–130°
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                {r.timeShoulderStackPct.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg p-3 sm:col-span-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Mean angles while in plank (°)
              </div>
              <div className="mt-1 text-sm tabular-nums" style={{ color: "var(--foreground)" }}>
                Hip {r.avgHipAngleDeg.toFixed(0)}° · Knee {r.avgKneeAngleDeg.toFixed(0)}° · Shoulder{" "}
                {r.avgShoulderAngleDeg.toFixed(0)}°
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Angles over time (smoothed)
            </h4>
            <p className="mb-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Hip, knee, and shoulder (selected side). Nulls when keypoints are unclear.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={angleRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, tMax]}
                  tick={CHART_AXIS_TICK}
                  stroke="var(--border)"
                  tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                />
                <YAxis tick={CHART_AXIS_TICK} stroke="var(--border)" domain={[0, 180]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--results-chart-tooltip-bg)",
                    color: "var(--results-chart-tooltip-text)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "12px",
                  }}
                  labelFormatter={(t) => `t = ${Number(t).toFixed(2)} s`}
                />
                <Line
                  type="monotone"
                  dataKey="hip"
                  name="Hip °"
                  stroke="var(--accent, #3b82f6)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="knee"
                  name="Knee °"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="shoulder"
                  name="Shoulder °"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (sportAnalysisKind === "squat") {
      if (squatAnalysisError) {
        return (
          <div className="space-y-2 text-sm" style={{ color: "var(--foreground)" }}>
            <p className="text-red-500/90">{squatAnalysisError}</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              Use side view, pick the side facing camera, and perform clear down-and-up squats.
            </p>
          </div>
        );
      }
      if (!squatAnalysisResult) {
        return (
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            In the side rail, open <strong>2. Sport analysis</strong>, choose <strong>Squat</strong>, then click{" "}
            <strong>Analyze</strong>. We count reps from the selected knee angle using a state machine.
          </p>
        );
      }

      const r = squatAnalysisResult;
      const dt = frameIntervalSec && frameIntervalSec > 0 ? frameIntervalSec : 1 / 30;
      const kneeRows = r.chart_smoothed_knee.map((v, i) => ({
        t: i * dt,
        knee: v != null && Number.isFinite(v) ? v : null,
      }));
      const tMax = kneeRows.length > 0 ? kneeRows[kneeRows.length - 1].t : 0;

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-normal" style={{ color: "var(--foreground)" }}>
            Squat
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Side-view knee-angle state machine: top ≥155°, depth target ≤100°, min ROM 28°, spacing 0.55s.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Reps
              </div>
              <div className="text-2xl font-semibold tabular-nums text-blue-600">{r.rep_count}</div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Depth pass
              </div>
              <div className="text-2xl font-semibold tabular-nums text-green-600">{r.depthPassPct.toFixed(0)}%</div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Avg bottom knee
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                {r.avgBottomKneeDeg.toFixed(0)}°
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Advisory: knee over ankle
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                {r.advisoryKneeOverAnklePct.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Advisory: trunk lean
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                {r.advisoryTrunkLeanPct.toFixed(0)}%
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={kneeRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
              <XAxis
                dataKey="t"
                type="number"
                domain={[0, tMax]}
                tick={CHART_AXIS_TICK}
                stroke="var(--border)"
                tickFormatter={(v: number) => `${v.toFixed(1)}s`}
              />
              <YAxis tick={CHART_AXIS_TICK} stroke="var(--border)" domain={[0, 180]} />
              <Tooltip
                contentStyle={{
                  background: "var(--results-chart-tooltip-bg)",
                  color: "var(--results-chart-tooltip-text)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "12px",
                }}
                labelFormatter={(t) => `t = ${Number(t).toFixed(2)} s`}
              />
              <Line
                type="monotone"
                dataKey="knee"
                name="Knee °"
                stroke="var(--accent, #3b82f6)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {r.rep_times_sec.map((tRep, i) => (
                <ReferenceLine
                  key={`squat-rep-${i}`}
                  x={tRep}
                  stroke="color-mix(in srgb, var(--accent, #3b82f6) 65%, transparent)"
                  strokeDasharray="4 4"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (sportAnalysisKind === "poseFlexibility") {
      if (poseFlexibilityAnalysisError) {
        return (
          <div className="space-y-2 text-sm" style={{ color: "var(--foreground)" }}>
            <p className="text-red-500/90">{poseFlexibilityAnalysisError}</p>
            <p style={{ color: "var(--muted-foreground)" }}>
              Use a trimmed side-view clip, pick the side facing camera, select 1-3 focus areas, then run{" "}
              <strong>Analyze</strong> again.
            </p>
          </div>
        );
      }
      if (!poseFlexibilityAnalysisResult) {
        return (
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            In the side rail, open <strong>2. Sport analysis</strong>, choose{" "}
            <strong>Pose Flexibility (Side View)</strong>, select side and focus areas, then click{" "}
            <strong>Analyze</strong>.
          </p>
        );
      }

      const r = poseFlexibilityAnalysisResult;
      const dt = frameIntervalSec && frameIntervalSec > 0 ? frameIntervalSec : 1 / 30;
      const chartRows = poses.map((_, i) => {
        const row: Record<string, number | null> & { t: number } = { t: i * dt };
        for (const series of r.chartSeries) {
          const value = series.values[i];
          row[series.key] = value != null && Number.isFinite(value) ? value : null;
        }
        return row;
      });
      const tMax = chartRows.length > 0 ? chartRows[chartRows.length - 1].t : 0;
      const seriesColors = ["var(--accent, #3b82f6)", "#22c55e", "#a855f7", "#f59e0b"];

      const metricTooltip = (description: string) =>
        `${description}\n\nAngles are measured from the selected side facing camera. Scores are 0-100 summaries from the full clip.`;

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-normal" style={{ color: "var(--foreground)" }}>
            Pose Flexibility (Side View)
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Side analyzed: <strong className="capitalize">{r.sideUsed}</strong>. Full-clip analytics for the selected focus
            areas; no pass/fail or realtime coaching.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {r.focusMetrics.map((metric) => (
              <div key={metric.focusArea} className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                <div
                  className="flex items-center gap-0.5 text-[10px] uppercase tracking-wide"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span>{metric.label}</span>
                  <InfoTooltip
                    content={metricTooltip(metric.description)}
                    maxWidth="min(320px,85vw)"
                    side="top"
                    align="start"
                  />
                </div>
                <div className="text-2xl font-semibold tabular-nums text-blue-600">{metric.valueLabel}</div>
              </div>
            ))}
          </div>

          {r.chartSeries.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Selected angles over time
              </h4>
              <p className="mb-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Smoothed side-view angle traces for selected focus areas.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[0, tMax]}
                    tick={CHART_AXIS_TICK}
                    stroke="var(--border)"
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                  />
                  <YAxis tick={CHART_AXIS_TICK} stroke="var(--border)" domain={[0, 180]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--results-chart-tooltip-bg)",
                      color: "var(--results-chart-tooltip-text)",
                      border: "none",
                      borderRadius: 8,
                      fontSize: "12px",
                    }}
                    labelFormatter={(t) => `t = ${Number(t).toFixed(2)} s`}
                    formatter={(v: number | string, name: string) =>
                      typeof v === "number" ? [`${v.toFixed(1)}°`, name] : [String(v), name]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  {r.chartSeries.map((series, idx) => (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={seriesColors[idx % seriesColors.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      );
    }

    if (sportAnalysisKind !== "cycling") {
      return (
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Choose a sport in the studio rail under <strong>2. Sport analysis</strong>, then run <strong>Analyze</strong>.
        </p>
      );
    }

    const tipCadence =
      "Roughly how fast you’re spinning the pedals.\n\nWe count full revolutions from your knee trace, time them, and convert to RPM. Values can differ slightly between bottom- vs top-detected strokes if the trace is uneven.";

    const tipCycles =
      "How many full pedal strokes we could pick out in this recording.\n\nShort clips, standing sprints, or messy tracking can lower this—it’s context for how trustworthy the other numbers are.";

    const tipSmoothness =
      "How similar each revolution looks to the average one for that timing (bottom vs top).\n\nLower ° usually means a smoother, more repeatable stroke; higher can mean changing effort, bouncing, or the camera losing you sometimes.";

    const tipMeanCycle =
      "Average knee path through one revolution, time-normalized.\n\nWe align strokes to bottom timing (teal) or top timing (violet), resample each to the same length, then average—so you compare shape, not clock time. Same underlying knee trace; the two curves show how segmentation choice shifts the averaged loop.";

    const tipAvgAtBottoms =
      "Mean knee angle (hip–knee–ankle) at each detected bottom-of-stroke.\n\nOften discussed alongside saddle height on the same bike and camera setup—not a substitute for a professional fit.";

    const tipAvgAtTops =
      "Mean knee angle at each detected top-of-stroke.\n\nUseful for spotting drift or asymmetry across a clip; less directly about saddle height than the bottom, but still comparable session-to-session with the same setup.";

    const tipStrokeVariation =
      "Standard deviation of knee angle at those events across strokes in this clip.\n\nHigher means more stroke-to-stroke variation (or noisier tracking); lower means more consistent event-to-event angles.";

    const tipBottomBikeFit =
      "Bottom-of-stroke knee bend is what many riders relate to saddle height feeling high or low. We estimate it from side-on video—trends on your own rig, not millimeter-perfect or a pro fit.";

    const tipTopBikeFit =
      "At the top of the stroke, knee angle reflects how closed the hip is over the pedal. Comparing clips on the same bike and camera can hint at posture or setup changes—not a standalone prescription.";

    const chipBg = { background: "color-mix(in srgb, var(--foreground) 6%, transparent)" } as const;

    const renderAngleStats = (
      m: CyclingPerspectiveMetrics,
      avgLabel: string,
      avgTooltip: string
    ) => (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md px-2 py-1.5" style={chipBg}>
          <div
            className="flex items-center gap-0.5 text-[10px] uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>{avgLabel}</span>
            <InfoTooltip content={avgTooltip} maxWidth="min(320px,85vw)" side="top" align="start" />
          </div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
            {m.avg_extension.toFixed(1)}°
          </div>
        </div>
        <div className="rounded-md px-2 py-1.5" style={chipBg}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Lowest
          </div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
            {m.kneeAngleAtEventsMinDeg.toFixed(1)}°
          </div>
        </div>
        <div className="rounded-md px-2 py-1.5" style={chipBg}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Highest
          </div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
            {m.kneeAngleAtEventsMaxDeg.toFixed(1)}°
          </div>
        </div>
        <div className="rounded-md px-2 py-1.5" style={chipBg}>
          <div
            className="flex items-center gap-0.5 text-[10px] uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>Stroke-to-stroke variation</span>
            <InfoTooltip content={tipStrokeVariation} maxWidth="min(320px,85vw)" side="top" align="start" />
          </div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
            {m.kneeAngleAtEventsStdDeg.toFixed(1)}°
          </div>
        </div>
      </div>
    );

    const renderStrokeChart = (m: CyclingPerspectiveMetrics, strokeLabel: string, strokeColor: string) => {
      const strokeKneeRows = m.extension_angles.map((deg, i) => ({ stroke: i + 1, deg }));
      return (
        <div>
          <p className="mb-1 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {strokeLabel}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={strokeKneeRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
              <XAxis dataKey="stroke" tick={CHART_AXIS_TICK} stroke="var(--border)" />
              <YAxis tick={CHART_AXIS_TICK} stroke="var(--border)" domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--results-chart-tooltip-bg)",
                  color: "var(--results-chart-tooltip-text)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "12px",
                }}
                formatter={(v: number) => [`${v.toFixed(1)}°`, "Knee"]}
                labelFormatter={(s) => `Stroke ${s}`}
              />
              <Line
                type="monotone"
                dataKey="deg"
                stroke={strokeColor}
                strokeWidth={2}
                dot={{ r: 2, fill: strokeColor }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    };

    if (cyclingAnalysisError) {
      return (
        <div className="space-y-2 text-sm" style={{ color: "var(--foreground)" }}>
          <p className="text-red-500/90">{cyclingAnalysisError}</p>
          <p style={{ color: "var(--muted-foreground)" }}>
            Try the other leg in the rail, a clearer side-on view of the knee, or a longer steady clip, then run{" "}
            <strong>Analyze</strong> again.
          </p>
        </div>
      );
    }
    if (!cyclingAnalysisResult) {
      return (
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          In the side rail, open <strong>2. Sport analysis</strong>, choose <strong>Cycling</strong>, set knee side, then
          click <strong>Analyze</strong>. We compute both bottom- and top-of-stroke perspectives automatically.
        </p>
      );
    }
    const r = cyclingAnalysisResult;
    const { trough: t, peak: p, legUsed } = r;
    const n = Math.min(t.normalized_cycle.length, p.normalized_cycle.length);
    const meanCycleRows = Array.from({ length: n }, (_, i) => ({
      phase: i + 1,
      meanBottom: t.normalized_cycle[i],
      meanTop: p.normalized_cycle[i],
    }));

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-normal" style={{ color: "var(--foreground)" }}>
          Cycling (MVP)
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Knee analyzed: <strong className="capitalize">{legUsed}</strong>. Summary compares{" "}
          <strong className="text-[color:var(--foreground)]">bottom-of-stroke (trough)</strong> vs{" "}
          <strong className="text-[color:var(--foreground)]">top-of-stroke (peak)</strong> timing on the same smoothed knee
          trace.
        </p>

        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full min-w-[280px] border-collapse text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted-foreground)" }} />
                <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--foreground)" }}>
                  Bottom (trough)
                </th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--foreground)" }}>
                  Top (peak)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)" }}>
                <td className="px-3 py-2">
                  <span className="flex items-center justify-start gap-0.5" style={{ color: "var(--foreground)" }}>
                    Cadence (RPM)
                    <InfoTooltip content={tipCadence} maxWidth="min(320px,85vw)" side="top" align="start" />
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-blue-600">
                  {t.cadence_rpm.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-blue-600">
                  {p.cadence_rpm.toFixed(1)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)" }}>
                <td className="px-3 py-2">
                  <span className="flex items-center justify-start gap-0.5" style={{ color: "var(--foreground)" }}>
                    Complete cycles
                    <InfoTooltip content={tipCycles} maxWidth="min(320px,85vw)" side="top" align="start" />
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-green-600">{t.cycles.length}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-green-600">{p.cycles.length}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <span className="flex items-center justify-start gap-0.5" style={{ color: "var(--foreground)" }}>
                    Stroke repeatability
                    <InfoTooltip content={tipSmoothness} maxWidth="min(320px,85vw)" side="top" align="start" />
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                  {t.smoothness.rmseOverallDeg.toFixed(2)}°
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                  {p.smoothness.rmseOverallDeg.toFixed(2)}°
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-4 rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
          <h4 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Bike fit from your video
          </h4>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1">
              <h5 className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Bottom of stroke (trough)
              </h5>
              <InfoTooltip content={tipBottomBikeFit} maxWidth="min(320px,85vw)" side="top" align="start" />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Knee bend at the pedal bottom is commonly tied to how high or low the saddle feels. Use these numbers to
              compare sessions on the same bike and camera—not as a pro fit or absolute measurement.
            </p>
            <h6 className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>
              Knee angle at bottoms (estimate)
            </h6>
            {renderAngleStats(t, "Average at bottoms", tipAvgAtBottoms)}
            {renderStrokeChart(
              t,
              "Knee angle at each detected bottom — watch for drift across the clip.",
              "#0d9488"
            )}
          </div>

          <div className="space-y-3 border-t pt-2 mt-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-wrap items-center gap-1">
              <h5 className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Top of stroke (peak)
              </h5>
              <InfoTooltip content={tipTopBikeFit} maxWidth="min(320px,85vw)" side="top" align="start" />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              At the top, knee angle reflects hip closure over the pedal. Useful for consistency and comparing clips; pair
              with the bottom section for a fuller picture of the pedal stroke.
            </p>
            <h6 className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>
              Knee angle at tops (estimate)
            </h6>
            {renderAngleStats(p, "Average at tops", tipAvgAtTops)}
            {renderStrokeChart(
              p,
              "Knee angle at each detected top — useful for spotting unevenness between strokes.",
              "#7c3aed"
            )}
          </div>
        </div>

        <div>
          <h4
            className="mb-2 flex items-center gap-0.5 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            <span>Mean pedal cycle (normalized 100 pts)</span>
            <InfoTooltip content={tipMeanCycle} maxWidth="min(320px,85vw)" side="top" align="start" />
          </h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={meanCycleRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
              <XAxis dataKey="phase" tick={CHART_AXIS_TICK} stroke="var(--border)" />
              <YAxis tick={CHART_AXIS_TICK} stroke="var(--border)" domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--results-chart-tooltip-bg)",
                  color: "var(--results-chart-tooltip-text)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "12px",
                }}
                formatter={(v: number, name: string) => [`${v.toFixed(1)}°`, name]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="meanBottom"
                name="Bottom-aligned mean"
                stroke="#0d9488"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="meanTop"
                name="Top-aligned mean"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }, [
    sportAnalysisKind,
    pullUpsAnalysisResult,
    pullUpsAnalysisError,
    plankAnalysisResult,
    plankAnalysisError,
    frameIntervalSec,
    cyclingAnalysisResult,
    cyclingAnalysisError,
    squatAnalysisResult,
    squatAnalysisError,
    poseFlexibilityAnalysisResult,
    poseFlexibilityAnalysisError,
    poses,
  ]);

  const tabs = useMemo(() => {
    const base: { id: TabType; label: string }[] = [];
    if (enableDetailsTab) base.push({ id: "details", label: "Details" });
    base.push({ id: "overview", label: "Overview" });
    base.push({ id: "joints", label: "Joint Analysis" });
    if (enableSportAnalysisTab) base.push({ id: "sport", label: "Sport analysis" });
    return base;
  }, [enableSportAnalysisTab, enableDetailsTab]);

  const renderOverviewTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-normal" style={{ color: 'var(--foreground)' }}>Session Overview</h3>
      
      {/* Basic Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold text-blue-600">{stats.totalFrames}</div>
          <div className="text-sm" style={{ color: 'var(--foreground)' }}>Total Frames</div>
        </div>
        <div className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold text-green-600">{stats.detectionRate.toFixed(1)}%</div>
          <div className="text-sm" style={{ color: 'var(--foreground)' }}>Detection Rate</div>
        </div>
      </div>

      {/* Range of Motion Chart */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Range of Motion</h4>
        {romData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={romData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
              <XAxis dataKey="joint" tick={CHART_AXIS_TICK} stroke="var(--border)" />
              <YAxis tick={CHART_AXIS_TICK} stroke="var(--border)" />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--results-chart-tooltip-bg)', 
                  color: 'var(--results-chart-tooltip-text)', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontSize: '13px', 
                  fontWeight: 600 
                }}
                labelStyle={{ 
                  color: 'var(--results-chart-tooltip-text)', 
                  fontSize: '11px', 
                  fontWeight: 700 
                }}
                itemStyle={{ 
                  color: 'var(--results-chart-tooltip-text)', 
                  fontSize: '13px', 
                  fontWeight: 400 
                }}
                formatter={(value: any) => {
                  if (typeof value === 'number') {
                    return `${value.toFixed(2)}°`;
                  }
                  return value;
                }}
              />
              <Bar dataKey="range" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
            No data available
          </div>
        )}
      </div>

      {/* Symmetry Analysis */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Symmetry Analysis</h4>
        <div className="space-y-2">
          {Object.entries(stats.symmetry).map(([joint, score]) => (
            <div key={joint} className="flex justify-between items-center">
              <span className="text-sm capitalize" style={{ color: "var(--foreground)" }}>
                {joint}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="w-20 rounded-full h-2"
                  style={{ backgroundColor: "color-mix(in srgb, var(--border) 65%, transparent)" }}
                >
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {score.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Data Section */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Export Motion Data (raw)</h4>
        <div className="space-y-2">
          <button
            className="w-full p-2 rounded-lg font-medium text-xs text-left transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }}
            onClick={() => {
              // Export as CSV
              const csvData = chartData.map(row => 
                `Frame ${row.frame},${row.leftKnee},${row.rightKnee},${row.leftHip},${row.rightHip},${row.leftElbow},${row.rightElbow},${row.leftShoulder},${row.rightShoulder}`
              ).join('\n');
              const csv = `Frame,Left Knee,Right Knee,Left Hip,Right Hip,Left Elbow,Right Elbow,Left Shoulder,Right Shoulder\n${csvData}`;
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'motion-data.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export as CSV
          </button>
          
          <button
            className="w-full p-2 rounded-lg font-medium text-xs text-left transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }}
            onClick={() => {
              // Export as JSON
              const jsonData = {
                poses,
                angles,
                stats,
                timestamp: new Date().toISOString()
              };
              
              const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'motion-data.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export as JSON
          </button>

        </div>
      </div>
    </div>
  );

  // Memoize the joints tab to prevent unnecessary re-renders
  const renderJointsTab = useMemo(() => {
    /** Hover wins for the readout; otherwise follow playback when a studio video is linked. */
    const displayFrame =
      hoveredFrame !== null ? hoveredFrame : engine ? playbackFrame : 0;
    const currentFrameData = chartData[displayFrame] || chartData[0];
    const xMax = Math.max(0, chartData.length - 1);
    const anyJointLineVisible = CHART_JOINT_SERIES.some((j) => jointLineVisible[j.key]);

    const jointCheckboxRow = (j: (typeof CHART_JOINT_SERIES)[number]) => {
      const checked = jointLineVisible[j.key];
      const value = currentFrameData[j.key as keyof typeof currentFrameData] as number;
      return (
        <label
          key={j.key}
          className="flex cursor-pointer items-center gap-2 rounded-md py-0.5"
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() =>
              setJointLineVisible((prev) => ({ ...prev, [j.key]: !prev[j.key] }))
            }
            className="h-3.5 w-3.5 shrink-0 rounded border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
            style={{ accentColor: "var(--accent, #3b82f6)" }}
            aria-label={`Show ${j.label} on chart`}
          />
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: j.stroke }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {j.label}
          </span>
          <span className="shrink-0 font-mono text-sm tabular-nums" style={{ color: "var(--foreground)" }}>
            {typeof value === "number" ? `${value.toFixed(1)}°` : "—"}
          </span>
        </label>
      );
    };

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-normal" style={{ color: 'var(--foreground)' }}>Joint Analysis</h3>
        
        {/* Joint Angles Over Time */}
        <div>
          <div className="mb-2">
            <h4 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Joint Angles Over Time
            </h4>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {DISPLAY_ANGLE_SMOOTH_PRESET.windowFrames}-frame smoothed chart of joint angles
            </p>
          </div>
          {chartData.length > 0 ? (
            <>
              <div className="relative min-h-[300px] w-full">
                {anyJointLineVisible ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                      onMouseMove={handleChartMouseMove}
                      onMouseLeave={handleChartMouseLeave}
                      onClick={handleJointChartClick}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
                      <XAxis
                        dataKey="frame"
                        type="number"
                        domain={[0, xMax]}
                        ticks={jointChartXAxisTicks}
                        allowDecimals={false}
                        tick={CHART_AXIS_TICK}
                        stroke="var(--border)"
                      />
                      <YAxis
                        tick={CHART_AXIS_TICK}
                        stroke="var(--border)"
                        label={{
                          value: "Degrees °",
                          angle: -90,
                          position: "insideLeft",
                          style: {
                            fill: "var(--muted-foreground)",
                            fontSize: 12,
                            fontWeight: 500,
                            fontFamily: "inherit",
                          },
                        }}
                      />
                      {CHART_JOINT_SERIES.map(
                        (j) =>
                          jointLineVisible[j.key] ? (
                            <Line
                              key={j.key}
                              type="monotone"
                              dataKey={j.key}
                              stroke={j.stroke}
                              strokeWidth={2}
                              isAnimationActive={false}
                              dot={false}
                              activeDot={{ r: 4, strokeWidth: 2, stroke: j.stroke, fill: j.stroke }}
                            />
                          ) : null
                      )}
                      {syncPlaybackFrame && engine && chartData.length > 0 ? (
                        <ReferenceLine
                          x={playbackFrame}
                          stroke="var(--foreground)"
                          strokeWidth={2}
                        />
                      ) : null}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className="flex h-[300px] w-full items-center justify-center rounded-lg px-3 text-center text-sm"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Select at least one joint to show the chart.
                  </div>
                )}
              </div>
              
              {/* Fixed Joint Values Display */}
              <div className="mt-2 p-4 rounded-lg" style={{ 
                border: '1px solid var(--border)' 
              }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h5 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    Joint Angles at Frame {displayFrame}
                  </h5>
                  <div className="text-xs shrink-0 text-right" style={{ color: "var(--muted-foreground)" }}>
                    Hover for values
                    {syncPlaybackFrame && engine ? "; click chart to seek video" : ""}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="space-y-1">
                    {CHART_JOINT_SERIES.filter((j) => j.side === "left").map(jointCheckboxRow)}
                  </div>
                  <div className="space-y-1">
                    {CHART_JOINT_SERIES.filter((j) => j.side === "right").map(jointCheckboxRow)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-72 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
              No data available
            </div>
          )}
        </div>

        {/* Joint Statistics */}
        <div>
          <h4 className="text-sm font-normal mb-2" style={{ color: 'var(--foreground)' }}>Joint Movements</h4>
          <div className="space-y-2">
            {Object.entries(stats.jointStats).map(([joint, data]) => (
              <div key={joint} className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <div
                  className="font-medium text-sm capitalize mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  {joint.replace(/([A-Z])/g, " $1")}
                </div>
                <div
                  className="grid grid-cols-2 gap-2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <div>Min: {data.min.toFixed(0)}°</div>
                  <div>Max: {data.max.toFixed(0)}°</div>
                  <div>Range: {data.range.toFixed(0)}°</div>
                  <div>Avg: {data.avg.toFixed(0)}°</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [
    hoveredFrame,
    chartData,
    jointChartXAxisTicks,
    stats.jointStats,
    handleChartMouseMove,
    handleChartMouseLeave,
    handleJointChartClick,
    jointLineVisible,
    engine,
    playbackFrame,
    syncPlaybackFrame,
  ]);

  return (
    <div className="flex h-full flex-col">
      <div
        className="mb-0 ml-0 mr-0 flex flex-shrink-0 flex-row flex-wrap items-center justify-between"
        style={{
          padding: 6,
          gap: 6,
          background: "transparent",
          border: "1px solid var(--results-tabs-border-color)",
          borderRadius: 6,
        }}
      >
        <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center justify-start gap-[6px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                borderRadius: 6,
                padding: '3px 6px',
                marginRight: 6,
                background: activeTab === tab.id ? 'var(--results-tab-bg-active)' : 'var(--results-tab-bg-inactive)',
                color: activeTab === tab.id ? 'var(--results-tab-text-active)' : 'var(--results-tab-text-inactive)',
                border: `1.5px solid ${activeTab === tab.id ? 'var(--results-tab-border-active)' : 'var(--results-tab-border-inactive)'}`,
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 600 : 500,
                transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
              onMouseOver={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--results-tab-hover-bg)';
                  e.currentTarget.style.color = 'var(--results-tab-hover-text)';
                  e.currentTarget.style.border = '1.5px solid var(--results-tab-hover-border)';
                }
              }}
              onMouseOut={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--results-tab-bg-inactive)';
                  e.currentTarget.style.color = 'var(--results-tab-text-inactive)';
                  e.currentTarget.style.border = '1.5px solid var(--results-tab-border-inactive)';
                }
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
            aria-label="Hide analytics"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "details" && enableDetailsTab ? detailsContent : null}
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "joints" && renderJointsTab}
        {activeTab === "sport" && enableSportAnalysisTab ? sportTabContent : null}
      </div>

    </div>
  );
}