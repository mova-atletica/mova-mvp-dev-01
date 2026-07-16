"use client";

import {
  Bar,
  BarChart,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountActivityKind } from "../../types/accountActivity";
import type {
  ActivityMixSlice,
  BodyFocusSlice,
  JointRomAverage,
  MovementTagCount,
  MovementTrendPoint,
  WeeklyActivityBucket,
} from "../../lib/accountActivityInsights";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const KIND_COLORS: Record<AccountActivityKind, string> = {
  "mini-app": "var(--accent, #3b82f6)",
  studio: "#a855f7",
  program: "#22c55e",
};

const TAG_COLORS = [
  "var(--accent, #3b82f6)",
  "#a855f7",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border-secondary)",
        color: "var(--foreground)",
      }}
    >
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color ?? "var(--foreground)" }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

const AXIS_LABEL_STYLE = {
  fill: "var(--muted-foreground)",
  fontSize: 10,
} as const;

interface WeeklyVolumeChartProps {
  data: WeeklyActivityBucket[];
  labels: Record<AccountActivityKind, string>;
  includeProgram?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function WeeklyVolumeChart({
  data,
  labels,
  includeProgram = true,
  xAxisLabel = "Week",
  yAxisLabel = "Sessions",
}: WeeklyVolumeChartProps) {
  const chartData = data.map((bucket) => ({
    week: bucket.weekLabel,
    [labels["mini-app"]]: bucket["mini-app"],
    [labels.studio]: bucket.studio,
    ...(includeProgram ? { [labels.program]: bucket.program } : {}),
  }));

  const series = [
    { key: labels["mini-app"], color: KIND_COLORS["mini-app"] },
    { key: labels.studio, color: KIND_COLORS.studio },
    ...(includeProgram
      ? [{ key: labels.program, color: KIND_COLORS.program }]
      : []),
  ];

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 18 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={{ stroke: "var(--border-secondary)" }}
            tickLine={false}
          >
            <Label value={xAxisLabel} position="insideBottom" offset={-12} style={AXIS_LABEL_STYLE} />
          </XAxis>
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
          >
            <Label
              value={yAxisLabel}
              angle={-90}
              position="insideLeft"
              style={{ ...AXIS_LABEL_STYLE, textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip content={<ChartTooltip />} />
          {series.map(({ key, color }) => (
            <Bar key={key} dataKey={key} stackId="sessions" fill={color} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ActivityMixDonutProps {
  data: ActivityMixSlice[];
  labels: Record<AccountActivityKind, string>;
}

export function ActivityMixDonut({ data, labels }: ActivityMixDonutProps) {
  const chartData = data.map((slice) => ({
    name: labels[slice.kind],
    value: slice.count,
    color: KIND_COLORS[slice.kind],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={2}
              stroke="var(--card-bg)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-[color:var(--foreground)]">
            {total}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
            total
          </span>
        </div>
      </div>
      <ul className="flex w-full flex-wrap gap-x-4 gap-y-2 sm:flex-col">
        {chartData.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-[color:var(--foreground)]">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-[color:var(--muted-foreground)]">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface MovementFocusChartProps {
  data: MovementTagCount[];
  xAxisLabel?: string;
}

export function MovementFocusChart({
  data,
  xAxisLabel = "Sessions",
}: MovementFocusChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[color:var(--muted-foreground)]">—</p>
    );
  }

  const chartData = data.map((row) => ({ name: row.label, sessions: row.count }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 18 }}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={{ stroke: "var(--border-secondary)" }}
            tickLine={false}
          >
            <Label value={xAxisLabel} position="insideBottom" offset={-12} style={AXIS_LABEL_STYLE} />
          </XAxis>
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="sessions" name={xAxisLabel} radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={TAG_COLORS[index % TAG_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const TREND_COLORS = {
  form: "var(--accent, #3b82f6)",
  rom: "#22c55e",
  symmetry: "#a855f7",
};

interface MovementTrendChartProps {
  data: MovementTrendPoint[];
  labels: { form: string; rom: string; symmetry: string };
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function MovementTrendChart({
  data,
  labels,
  xAxisLabel = "Week",
  yAxisLabel = "Score / ROM",
}: MovementTrendChartProps) {
  const hasData = data.some(
    (d) => d.sessions > 0 || d.formScore != null || d.avgRom != null || d.symmetry != null
  );
  if (!hasData) {
    return (
      <p className="py-8 text-center text-xs text-[color:var(--muted-foreground)]">—</p>
    );
  }

  // Zero-fill empty periods so lines start at the chart edge instead of mid-span.
  const chartData = data.map((d) => ({
    weekLabel: d.weekLabel,
    formScore: d.formScore ?? 0,
    avgRom: d.avgRom ?? 0,
    symmetry: d.symmetry ?? 0,
    sessions: d.sessions,
  }));

  const formStroke = "#3b82f6";
  const romStroke = "#22c55e";
  const symmetryStroke = "#a855f7";
  const tickFill = "#94a3b8";

  return (
    <div className="w-full min-w-0">
      <div className="flex">
        <span
          className="flex w-4 shrink-0 items-center justify-center text-[10px] text-[color:var(--muted-foreground)]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {yAxisLabel}
        </span>
        <div className="min-w-0 flex-1" style={{ height: 224 }}>
          <ResponsiveContainer width="100%" height={224}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={{ stroke: "#64748b55" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 140]}
                tick={{ fill: tickFill, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="formScore"
                name={labels.form}
                stroke={formStroke}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: formStroke, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avgRom"
                name={labels.rom}
                stroke={romStroke}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: romStroke, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="symmetry"
                name={labels.symmetry}
                stroke={symmetryStroke}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: symmetryStroke, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="mt-1 text-center text-[10px] text-[color:var(--muted-foreground)]">
        {xAxisLabel}
      </p>
    </div>
  );
}

interface BodyFocusRadarProps {
  data: BodyFocusSlice[];
}

export function BodyFocusRadar({ data }: BodyFocusRadarProps) {
  const chartData = data.map((slice) => ({
    region: slice.label,
    focus: slice.value,
  }));

  return (
    <div className="mx-auto -mb-2 w-full max-w-lg min-w-0" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart
          cx="50%"
          cy="48%"
          outerRadius="78%"
          data={chartData}
          margin={{ top: 8, right: 24, bottom: 4, left: 24 }}
        >
          <PolarGrid stroke="var(--border-secondary)" />
          <PolarAngleAxis
            dataKey="region"
            tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
            tickLine={false}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Focus"
            dataKey="focus"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.35}
            isAnimationActive={false}
          />
          <Tooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface JointRomChartProps {
  data: JointRomAverage[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function JointRomChart({
  data,
  xAxisLabel = "Joint",
  yAxisLabel = "ROM (°)",
}: JointRomChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[color:var(--muted-foreground)]">—</p>
    );
  }

  const chartData = data.map((row) => ({ name: row.label, degrees: row.degrees }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 18 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={{ stroke: "var(--border-secondary)" }}
            tickLine={false}
          >
            <Label value={xAxisLabel} position="insideBottom" offset={-12} style={AXIS_LABEL_STYLE} />
          </XAxis>
          <YAxis
            unit="°"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          >
            <Label
              value={yAxisLabel}
              angle={-90}
              position="insideLeft"
              style={{ ...AXIS_LABEL_STYLE, textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div
                  className="rounded-lg px-3 py-2 text-xs shadow-lg"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--border-secondary)",
                    color: "var(--foreground)",
                  }}
                >
                  <p className="font-medium">{label}</p>
                  <p>{payload[0].value}° ROM</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="degrees" name="ROM" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={TAG_COLORS[index % TAG_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: { color: string; label: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-[color:var(--muted-foreground)]">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export { borderAllTheme, KIND_COLORS };
