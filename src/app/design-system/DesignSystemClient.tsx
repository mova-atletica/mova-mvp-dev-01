"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown } from "lucide-react";
import InfoTooltip from "../../components/InfoTooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ArchiveNavShell from "../../components/archive/ArchiveNavShell";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";
import SportSummaryCard from "../../components/account/SportSummaryCard";
import ChartTimeRangeToggle from "../../components/account/ChartTimeRangeToggle";
import ExportPanelSelect from "../../components/ExportPanelSelect";
import BaseRadarChart from "../../components/charts/BaseRadarChart";
import BaseAngleComparisonChart from "../../components/charts/BaseAngleComparisonChart";
import {
  chartGlassCursor,
  chartGlassTooltipContentStyle,
} from "../../components/charts/chartTooltipStyles";
import type { ChartTimeRange } from "../../lib/accountActivityInsights";
import {
  ConfigCheckboxInline,
  ConfigColorHexRow,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
} from "../motion-explore/effect-config/fields";
import {
  BRAND_COLOR_RATIONALE,
  BRAND_PALETTES,
  CHART_TYPE_RATIONALE,
  MOCK_BAR_VOLUME,
  MOCK_RADAR_DATA,
  MOCK_SPORT_SUMMARY_POPULATED,
  RADIUS_SCALE,
  SPACING_SCALE,
  TOKEN_SWATCHES,
  TYPE_SAMPLES,
  buildMockAngleSeries,
} from "../../lib/designSystemMockData";

type VizState = "populated" | "empty" | "loading";
type SectionId = "overview" | "foundations" | "components" | "patterns" | "dataviz";

const SECTIONS: { id: SectionId; label: string; blurb: string }[] = [
  { id: "overview", label: "Overview", blurb: "Principles & how to use" },
  { id: "foundations", label: "Foundations", blurb: "Color, type, space" },
  { id: "components", label: "Components", blurb: "Buttons, fields, menus, effects" },
  { id: "patterns", label: "Patterns", blurb: "Composed product UI" },
  { id: "dataviz", label: "Data viz", blurb: "Motion analytics charts" },
];

const DRAWER_DEMO_WIDTH = 280;
const CONTROLS_RAIL_WIDTH = 300;
/** Shared studio pattern frame height — fixed so collapse doesn't shrink the page. */
const STUDIO_DEMO_HEIGHT = "28rem";

function Panel({
  title,
  children,
  className = "",
  description,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 sm:p-5 ${className}`}
      style={{
        border: "1px solid var(--border-secondary)",
        // Onyx surface — not parchment card wash (parchment demoted)
        backgroundColor: "var(--surface)",
      }}
    >
      {title ? (
        <p
          className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {title}
        </p>
      ) : null}
      {description ? (
        <p className="mb-3 text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonState = "default" | "hover" | "active" | "focus" | "disabled";

const BUTTON_STATES: { id: ButtonState; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "hover", label: "Hover" },
  { id: "active", label: "Active" },
  { id: "focus", label: "Focus" },
  { id: "disabled", label: "Disabled" },
];

function demoButtonStyles(variant: ButtonVariant, state: ButtonState): CSSProperties {
  const disabled = state === "disabled";
  if (variant === "primary") {
    const bg =
      state === "hover" || state === "focus"
        ? "var(--primary-button-hover-bg, var(--accent-hover))"
        : state === "active"
          ? "color-mix(in srgb, var(--primary-button-hover-bg, var(--accent)) 85%, var(--foreground))"
          : "var(--primary-button-bg, var(--accent))";
    const color =
      state === "hover" || state === "focus" || state === "active"
        ? "var(--primary-button-hover-text, var(--primary-button-text, #fff))"
        : "var(--primary-button-text, #fff)";
    return {
      backgroundColor: bg,
      color,
      border: "1px solid var(--primary-button-border, transparent)",
      opacity: disabled ? 0.45 : 1,
      boxShadow:
        state === "focus"
          ? "0 0 0 2px var(--background), 0 0 0 4px color-mix(in srgb, var(--accent) 55%, transparent)"
          : undefined,
    };
  }
  if (variant === "secondary") {
    const hovering = state === "hover" || state === "focus";
    return {
      backgroundColor:
        state === "active"
          ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
          : hovering
            ? "var(--secondary-button-hover-bg, color-mix(in srgb, var(--foreground) 8%, transparent))"
            : "var(--secondary-button-bg, transparent)",
      color: hovering
        ? "var(--secondary-button-hover-text, var(--secondary-button-text, var(--foreground)))"
        : "var(--secondary-button-text, var(--foreground))",
      border: `1px solid ${
        hovering
          ? "var(--secondary-button-hover-border, var(--border-secondary))"
          : "var(--secondary-button-border, var(--border-secondary))"
      }`,
      opacity: disabled ? 0.45 : 1,
      boxShadow:
        state === "focus"
          ? "0 0 0 2px var(--background), 0 0 0 4px color-mix(in srgb, var(--foreground) 25%, transparent)"
          : undefined,
    };
  }
  return {
    backgroundColor:
      state === "hover" || state === "focus"
        ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
        : state === "active"
          ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
          : "transparent",
    color: "var(--muted-foreground)",
    border: "1px solid transparent",
    opacity: disabled ? 0.45 : 1,
    boxShadow:
      state === "focus"
        ? "0 0 0 2px var(--background), 0 0 0 4px color-mix(in srgb, var(--foreground) 25%, transparent)"
        : undefined,
  };
}

function DemoButton({
  label,
  variant,
  state = "default",
}: {
  label: string;
  variant: ButtonVariant;
  state?: ButtonState;
}) {
  const disabled = state === "disabled";
  return (
    <button
      type="button"
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className="rounded-lg text-xs font-medium"
      style={{
        // Match account / product CTAs (px-4 py-2.5)
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.625rem",
        paddingBottom: "0.625rem",
        cursor: disabled ? "not-allowed" : "default",
        ...demoButtonStyles(variant, state),
      }}
    >
      {label}
    </button>
  );
}

function formatBrandRef(ref: { family: string; step: number | null; hex: string }) {
  return ref.step != null ? `${ref.family} ${ref.step}` : ref.family;
}

function TokenSwatch({
  name,
  varName,
  role,
  dark,
  light,
}: (typeof TOKEN_SWATCHES)[number]) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        // Sit on page canvas so surface/card/border aren't compared against themselves
        background: "var(--background)",
        border: "1px solid var(--border-secondary)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 shrink-0 rounded-lg"
          style={{
            background: `var(${varName})`,
            border: "1px solid var(--border-secondary)",
            boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--foreground) 8%, transparent)",
          }}
          title={`Live: var(${varName})`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{name}</p>
          <p className="truncate font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            {varName}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {role}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            ["Dark", dark],
            ["Light", light],
          ] as const
        ).map(([label, ref]) => (
          <div key={label} className="min-w-0">
            <p
              className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {label}
            </p>
            <div className="flex items-center gap-1.5">
              <div
                className="h-4 w-4 shrink-0 rounded"
                style={{ background: ref.hex, border: "1px solid var(--border-secondary)" }}
                title={ref.hex}
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{formatBrandRef(ref)}</p>
                <p className="truncate font-mono text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                  {ref.hex}
                </p>
              </div>
            </div>
            {ref.note ? (
              <p className="mt-1 text-[9px] font-light" style={{ color: "var(--muted-foreground)" }}>
                {ref.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipFilter({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className="rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
            style={{
              border: "1px solid var(--border-secondary)",
              backgroundColor: active ? "var(--primary-button-bg)" : "transparent",
              color: active ? "var(--primary-button-text)" : "var(--muted-foreground)",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm font-light" style={{ color: "var(--muted-foreground)" }}>
        {subtitle}
      </p>
    </div>
  );
}

function OverviewPanel() {
  return (
    <>
      <SectionHeader
        title="Design System Overview"
        subtitle="iOS is the product athletes and coaches use. Web was the prototyping ground and remains the API / account layer — this page documents the shared brand system and web patterns that informed native."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            t: "iOS-first",
            d: "Capture, Studio, and day-to-day use ship on iOS (Vision / ARKit). Web proved UX and still serves API, account, and Insights companion surfaces.",
          },
          {
            t: "Shared language",
            d: "Brand ramps, empty-state honesty, session / Insights shapes stay aligned so native and web don’t drift into different products.",
          },
          {
            t: "Honest empty data",
            d: "Prefer missing / empty over fake precision in Insights and charts — same principle on both platforms.",
          },
          {
            t: "Prototype → product",
            d: "Design → web pressure-test → iOS ship. This page shows what we explored in React and how it maps to SwiftUI chrome.",
          },
        ].map((item) => (
          <Panel key={item.t}>
            <p className="text-sm font-medium">{item.t}</p>
            <p className="mt-2 text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
              {item.d}
            </p>
          </Panel>
        ))}
      </div>
      <Panel
        className="mt-4"
        title="Platform notes"
        description="iOS = production UI. Web = prototype + shared layer. Same roles; platform-native chrome."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-[12px]">
            <thead>
              <tr style={{ color: "var(--muted-foreground)" }}>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">iOS (product)</th>
                <th className="pb-2 font-medium">Web (prototype / API)</th>
              </tr>
            </thead>
            <tbody className="font-light" style={{ color: "var(--muted-foreground)" }}>
              {[
                ["Primary experience", "Full capture + Studio", "Browse, account, API; Studio for iteration"],
                ["Color / theme", "SwiftUI Color / asset catalog", "CSS variables (ThemeContext)"],
                ["Buttons / cards", "System controls + brand accents", "Custom token-styled React"],
                ["Drawers / sheets", "sheet / fullScreenCover", "Studio side drawer / Radix overlays"],
                ["Charts", "Swift Charts", "Recharts + shared series tokens"],
                ["Sessions / Insights", "Same Supabase model + on-device pose", "Same model; browser pose / hydrate"],
              ].map(([role, ios, web]) => (
                <tr key={role} style={{ borderTop: "1px solid var(--border-secondary)" }}>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: "var(--foreground)" }}>
                    {role}
                  </td>
                  <td className="py-2.5 pr-4">{ios}</td>
                  <td className="py-2.5">{web}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Panel title="Responsive">
          <p className="text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Desktop-first for web Studio and this reference. Mobile web is browse-oriented; capture and the full
            experience live on iOS.
          </p>
        </Panel>
        <Panel title="Accessibility">
          <p className="text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Intent: tonal scales for contrast, theme tokens, Radix where used for focus. No formal WCAG audit yet —
            next pass is focus order, chart alternatives, and Onyx step contrast pairs.
          </p>
        </Panel>
      </div>
      <Panel className="mt-4" title="How to use">
        <ul className="list-disc space-y-2 pl-5 text-sm font-light" style={{ color: "var(--muted-foreground)" }}>
          <li>Browse sections with the tabs above.</li>
          <li>Toggle theme from the header to verify token behavior.</li>
          <li>Foundations carry brand rationale; Components / Patterns / Data viz show web implementations that informed iOS.</li>
        </ul>
      </Panel>
    </>
  );
}

function BrandRamp({
  name,
  role,
  rationale,
  steps,
  tier = "primary",
}: {
  name: string;
  role: string;
  rationale: string;
  steps: { step: number; hex: string }[];
  tier?: "primary" | "accent" | "archive";
}) {
  return (
    <div style={{ opacity: tier === "archive" ? 0.85 : 1 }}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {role}
        </p>
        {tier === "archive" ? (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]"
            style={{
              border: "1px solid var(--border-secondary)",
              color: "var(--muted-foreground)",
            }}
          >
            Demoted
          </span>
        ) : null}
      </div>
      <p className="mb-3 max-w-3xl text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
        {rationale}
      </p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {steps.map((s) => (
          <div key={s.step} className="w-14 shrink-0 sm:w-16">
            <div
              className="mb-1.5 h-12 w-full rounded-md"
              style={{ background: s.hex, border: "1px solid var(--border-secondary)" }}
              title={s.hex}
            />
            <p className="font-mono text-[9px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
              {s.step}
            </p>
            <p className="truncate font-mono text-[9px]" style={{ color: "var(--muted-foreground)" }}>
              {s.hex}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FoundationsPanel() {
  return (
    <>
      <SectionHeader
        title="Design System Foundations"
        subtitle="Brand ramps from the MA Beta Design System (Figma) plus semantic theme variables the web app and charts consume."
      />
      <div className="space-y-4">
        <Panel
          title="Color story"
          description="Inspired by athletes, coaches, and the rich history of motion tooling."
        >
          <ul className="space-y-3 text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
            <li>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                Approach.{" "}
              </span>
              {BRAND_COLOR_RATIONALE.approach}
            </li>
            <li>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                Tone.{" "}
              </span>
              {BRAND_COLOR_RATIONALE.tone}
            </li>
            <li>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                Usage split.{" "}
              </span>
              {BRAND_COLOR_RATIONALE.usageSplit}
            </li>
          </ul>
        </Panel>

        <Panel
          title="Brand palette · product"
          description="Onyx + accents — what the shipped web/dark UI actually uses. Aligned with Figma; product is Onyx-first."
        >
          <div className="space-y-8">
            {BRAND_PALETTES.filter((p) => p.tier !== "archive").map((p) => (
              <BrandRamp
                key={p.id}
                name={p.name}
                role={p.role}
                rationale={p.rationale}
                steps={p.steps}
                tier={p.tier}
              />
            ))}
          </div>
        </Panel>

        <Panel
          title="Brand archive"
          description="Kept for Figma / story continuity — not a second product system. Prefer Stoic Onyx for new UI."
        >
          <div className="space-y-8">
            {BRAND_PALETTES.filter((p) => p.tier === "archive").map((p) => (
              <BrandRamp
                key={p.id}
                name={p.name}
                role={p.role}
                rationale={p.rationale}
                steps={p.steps}
                tier={p.tier}
              />
            ))}
          </div>
        </Panel>

        <Panel
          title="Semantic theme tokens"
          description="ThemeContext maps brand ramps → CSS variables with distinct elevation: background → surface → card, edges via border-secondary. Swatches sit on --background so roles stay visible. Toggle theme to verify."
        >
          <div
            className="mb-4 overflow-x-auto rounded-lg"
            style={{ border: "1px solid var(--border-secondary)", background: "var(--background)" }}
          >
            <table className="w-full min-w-[36rem] text-left text-[11px]">
              <thead>
                <tr style={{ color: "var(--muted-foreground)", background: "color-mix(in srgb, var(--foreground) 4%, transparent)" }}>
                  <th className="px-3 py-2 font-medium">Token</th>
                  <th className="px-3 py-2 font-medium">Dark → brand</th>
                  <th className="px-3 py-2 font-medium">Light → brand</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--muted-foreground)" }}>
                {TOKEN_SWATCHES.map((t) => (
                  <tr key={t.varName} style={{ borderTop: "1px solid var(--border-secondary)" }}>
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                      <span className="font-mono text-[10px]">{t.varName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ background: t.dark.hex, border: "1px solid var(--border-secondary)" }}
                        />
                        {formatBrandRef(t.dark)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ background: t.light.hex, border: "1px solid var(--border-secondary)" }}
                        />
                        {formatBrandRef(t.light)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOKEN_SWATCHES.map((t) => (
              <TokenSwatch key={t.varName} {...t} />
            ))}
          </div>
        </Panel>

        <Panel title="Typography" description="Roboto / Roboto Mono via next/font — hierarchy used in account & studio (web).">
          <div className="space-y-5">
            {TYPE_SAMPLES.map((row) => (
              <div key={row.label}>
                <p
                  className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {row.label}
                </p>
                <p className={row.className}>{row.sample}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="Spacing" description="4px base rhythm.">
            <div className="space-y-2">
              {SPACING_SCALE.map((s) => (
                <div key={s.token} className="flex items-center gap-3">
                  <span className="w-8 font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    {s.px}px
                  </span>
                  <div
                    className="h-3 rounded-sm"
                    style={{
                      width: s.px * 2,
                      background: "color-mix(in srgb, var(--foreground) 35%, transparent)",
                    }}
                  />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Radius" description="Control → card → shell.">
            <div className="space-y-3">
              {RADIUS_SCALE.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <div
                    className="h-10 w-14 border"
                    style={{
                      borderRadius: r.px,
                      borderColor: "var(--border-secondary)",
                      background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {r.label} · {r.px}px
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                      {r.use}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title="Grid / atmosphere"
          description="Muybridge-inspired motion grids — dotted fields and film-strip frames that sit behind heroes and studio stages without competing with content."
        >
          <div
            className="mb-4 h-28 overflow-hidden rounded-lg"
            style={{
              border: "1px solid var(--border-secondary)",
              backgroundColor: "var(--background)",
              backgroundImage:
                "radial-gradient(circle, var(--homepage-dot-color, color-mix(in srgb, var(--foreground) 14%, transparent)) 1px, transparent 1px)",
              backgroundSize: "var(--homepage-dot-spacing, 22px) var(--homepage-dot-spacing, 22px)",
            }}
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-16 w-12 shrink-0 rounded-sm"
                style={{
                  border: "1px solid var(--border-secondary)",
                  background: `
                    linear-gradient(180deg, color-mix(in srgb, var(--foreground) 6%, transparent), transparent),
                    radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--foreground) 18%, transparent) 0 28%, transparent 30%),
                    var(--surface)
                  `,
                  opacity: 0.55 + (i % 4) * 0.1,
                }}
                title={`Frame ${i + 1}`}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Dot grid uses homepage theme tokens (<code className="font-mono">--homepage-dot-*</code>). Film strip
            nods to sequential photography — the same lineage as motion trails / Muybridge effects in Studio.
          </p>
        </Panel>
      </div>
    </>
  );
}

function AccordionCardDemo() {
  return (
    <Accordion.Root type="multiple" defaultValue={["form"]} className="w-full max-w-lg space-y-2">
      {(
        [
          {
            id: "form",
            title: "Instructions on form",
            body: "Keep elbows forward, pull chest to bar, control the eccentric.",
          },
          {
            id: "cues",
            title: "Coaching cues",
            body: "Pack the shoulders before each rep. Avoid kipping on strict sets.",
          },
          {
            id: "export",
            title: "Download & export",
            body: "MP4 · High · Private — same accordion chrome as studio rails.",
          },
        ] as const
      ).map((item) => (
        <Accordion.Item
          key={item.id}
          value={item.id}
          className="overflow-hidden rounded-sm"
          style={{
            backgroundColor: "var(--accordion-bg)",
            border: "1px solid var(--accordion-border)",
            boxShadow: "var(--accordion-shadow)",
          }}
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--accordion-hover-bg)]">
              <span className="text-xs font-semibold" style={{ color: "var(--accordion-text)" }}>
                {item.title}
              </span>
              <ChevronDown
                size={16}
                className="shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                style={{ color: "var(--accordion-chevron)" }}
                aria-hidden
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="rail-accordion-content overflow-hidden">
            <p className="px-4 pb-3 text-sm font-light leading-relaxed" style={{ color: "var(--accordion-text)" }}>
              {item.body}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function RailCollapsibleDemo() {
  return (
    <Accordion.Root type="multiple" defaultValue={["overlays"]} className="w-full max-w-sm">
      {(
        [
          {
            id: "overlays",
            title: "Overlays",
            body: (
              <div className="space-y-1.5 pb-2">
                {["Skeleton", "Motion trails", "Joint angles"].map((label, i) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 text-[12px]"
                    style={{
                      background:
                        i === 0
                          ? "color-mix(in srgb, var(--foreground) 14%, transparent)"
                          : "color-mix(in srgb, var(--foreground) 5%, transparent)",
                      border: i === 0 ? "1px solid var(--accent)" : "1px solid var(--border)",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={i === 0} className="h-3.5 w-3.5 accent-[var(--accent)]" />
                      {label}
                    </span>
                    <ChevronDown size={12} className="opacity-50" aria-hidden />
                  </label>
                ))}
              </div>
            ),
          },
          {
            id: "export",
            title: "Export",
            body: (
              <p className="pb-2 text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
                Format / quality selects sit in the rail footer accordion.
              </p>
            ),
          },
        ] as const
      ).map((section) => (
        <Accordion.Item key={section.id} value={section.id} className="my-3 border-b pb-3" style={{ borderColor: "var(--border-secondary)" }}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-2 px-1 py-2 text-left outline-none transition-colors hover:opacity-95 [&[data-state=open]>svg]:rotate-180">
              <span className="text-[11px] font-light uppercase tracking-wider underline decoration-[color:var(--border-secondary)] underline-offset-2">
                {section.title}
              </span>
              <ChevronDown size={14} className="shrink-0 transition-transform duration-200" aria-hidden />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="rail-accordion-content overflow-hidden">{section.body}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function SelectDropdownDemo() {
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("high");
  const [sport, setSport] = useState("pullups");

  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
      <label className="block min-w-0">
        <span className="mb-1 block text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
          Format
        </span>
        <ExportPanelSelect
          aria-label="Format"
          value={format}
          onSelect={setFormat}
          options={[
            { value: "mp4", label: "MP4" },
            { value: "webm", label: "WebM" },
            { value: "gif", label: "GIF" },
          ]}
        />
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
          Quality
        </span>
        <ExportPanelSelect
          aria-label="Quality"
          value={quality}
          onSelect={setQuality}
          options={[
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
          Sport filter
        </span>
        <ExportPanelSelect
          aria-label="Sport"
          value={sport}
          onSelect={setSport}
          options={[
            { value: "pullups", label: "Pull-ups" },
            { value: "squat", label: "Squat" },
            { value: "cycling", label: "Cycling" },
          ]}
        />
      </label>
    </div>
  );
}

function ColorPickerDemo() {
  const [bone, setBone] = useState("#64FF5B");
  const [joint, setJoint] = useState("#3B82F6");
  const [trail, setTrail] = useState("#F81818");

  return (
    <ConfigRoot>
      <ConfigSection title="ConfigColorHexRow · bone / joint / trail">
        <ConfigColorHexRow
          label="Bone"
          colorInputValue={bone}
          textInputValue={bone}
          onColorChange={setBone}
          onTextChange={setBone}
          marginBottom="6px"
        />
        <ConfigColorHexRow
          label="Joint"
          colorInputValue={joint}
          textInputValue={joint}
          onColorChange={setJoint}
          onTextChange={setJoint}
          marginBottom="6px"
        />
        <ConfigColorHexRow
          label="Trail"
          colorInputValue={trail}
          textInputValue={trail}
          onColorChange={setTrail}
          onTextChange={setTrail}
        />
      </ConfigSection>
      <p className="mt-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
        One control: 24×20 native <code className="font-mono">type=&quot;color&quot;</code> + hex field.
        <code className="font-mono"> ConfigSwatchHexRow</code> is an alias of the same chrome (Muybridge).
      </p>
    </ConfigRoot>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-[12px] font-medium"
            style={{ background: "var(--primary-button-bg)", color: "var(--primary-button-text)" }}
          >
            Open dialog
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[410] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5 outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-secondary)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
              color: "var(--foreground)",
            }}
          >
            <Dialog.Title className="text-base font-medium tracking-tight">Save to leaderboard?</Dialog.Title>
            <Dialog.Description className="mt-2 text-[12px] font-light leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Compact confirm — overlay + centered panel. Full-bleed Studio uses the same Radix Dialog with a
              different size shell (<code className="font-mono">OpenMoveStudioModal</code>).
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-[11px] font-medium"
                  style={{ border: "1px solid var(--border-secondary)" }}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-[11px] font-medium"
                  style={{ background: "var(--primary-button-bg)", color: "var(--primary-button-text)" }}
                >
                  Save
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
        Confirm pattern · not the full Studio stage modal
      </span>
    </div>
  );
}

function TooltipAndBadgeDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-1">
        <span className="text-[13px] font-light">Performance score</span>
        <InfoTooltip content="Aggregates ROM, pattern match, and tempo for this session." />
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { label: "Beginner", tone: "#085900" },
            { label: "Intermediate", tone: "#F87518" },
            { label: "Advanced", tone: "#1D4ED8" },
          ] as const
        ).map((b) => (
          <span
            key={b.label}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none shadow-sm"
            style={{
              background: "rgba(192, 201, 204, 0.85)",
              color: b.tone,
              border: "1px solid #f3f3f4",
            }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function EffectControlsDemo() {
  const [opacity, setOpacity] = useState(0.85);
  const [thickness, setThickness] = useState(2);
  const [showLabels, setShowLabels] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [color, setColor] = useState("#64FF5B");

  return (
    <div
      className="max-w-md rounded-lg p-3"
      style={{
        border: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
      }}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider">Skeleton overlay</p>
      <ConfigRoot>
        <ConfigColorHexRow
          label="Color"
          colorInputValue={color}
          textInputValue={color}
          onColorChange={setColor}
          onTextChange={setColor}
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Opacity"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={setOpacity}
          displayValue={`${Math.round(opacity * 100)}%`}
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Width"
          min={1}
          max={6}
          step={0.5}
          value={thickness}
          onChange={setThickness}
          displayValue={`${thickness}`}
          marginBottom="8px"
        />
        <div className="flex flex-wrap gap-4">
          <ConfigCheckboxInline checked={showLabels} onChange={setShowLabels} size="md" gap="8px">
            Labels
          </ConfigCheckboxInline>
          <ConfigCheckboxInline checked={mirror} onChange={setMirror} size="md" gap="8px">
            Mirror
          </ConfigCheckboxInline>
        </div>
      </ConfigRoot>
    </div>
  );
}

function ComponentsPanel() {
  return (
    <>
      <SectionHeader
        title="Components"
        subtitle="Studio primitives — buttons, fields, accordion, select, color, effect controls, dialog, tooltip & badges. Insights chips & range toggles live under Data viz."
      />
      <div className="space-y-4">
        <Panel
          title="Buttons"
          description="Primary / secondary / ghost with explicit states. Secondary hover uses a subtle wash (fixed from olive --button-hover-bg drift)."
        >
          <div className="space-y-5">
            {(
              [
                ["Primary", "primary"],
                ["Secondary", "secondary"],
                ["Ghost", "ghost"],
              ] as const
            ).map(([title, variant]) => (
              <div key={variant}>
                <p
                  className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {title}
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  {BUTTON_STATES.map((s) => (
                    <div key={s.id} className="flex flex-col items-start gap-1.5">
                      <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        {s.label}
                      </span>
                      <DemoButton label={title} variant={variant} state={s.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Text field" description="Studio / form pattern — light fill, theme border.">
          <label className="block max-w-md">
            <span
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Session note
            </span>
            <input
              type="text"
              defaultValue="Felt strong on last set"
              className="w-full rounded-lg px-3 py-2 text-sm font-light outline-none"
              style={{
                border: "1px solid var(--border-secondary)",
                background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                color: "var(--foreground)",
              }}
            />
          </label>
        </Panel>

        <Panel
          title="Accordion"
          description="Radix Accordion + --accordion-* tokens. Used for instructions, export, and stacked details (ExerciseDetailsTabContent)."
        >
          <AccordionCardDemo />
        </Panel>

        <Panel
          title="Collapsible · studio rail"
          description="Underline trigger + rail-accordion-content — Parque-style sections in AssetVideoPlayerChromeRail (Overlays, Export)."
        >
          <RailCollapsibleDemo />
        </Panel>

        <Panel
          title="Select / dropdown"
          description="ExportPanelSelect — popover menu shared by export Format/Quality, library filters, sport setup."
        >
          <SelectDropdownDemo />
        </Panel>

        <Panel
          title="Color picker"
          description="ConfigColorHexRow — one chrome for bone, joint, trail, and Muybridge (ConfigSwatchHexRow is the same control)."
        >
          <ColorPickerDemo />
        </Panel>

        <Panel
          title="Effect controls"
          description="ConfigSliderRow, checkboxes, and color row composed like SkeletonOverlayEffectConfig — opacity, stroke, toggles."
        >
          <EffectControlsDemo />
        </Panel>

        <Panel
          title="Dialog / modal"
          description="Radix Dialog — compact confirm (leaderboard / onboarding). Full Studio stage is a separate size shell on the same primitive."
        >
          <DialogDemo />
        </Panel>

        <Panel
          title="Tooltip + level badge"
          description="InfoTooltip (ⓘ) on charts & forms; compact level chips as on ExerciseCard."
        >
          <TooltipAndBadgeDemo />
        </Panel>

        <Panel title="Theme toggle" description="Light / dark as a user mode — same brand ramps, different semantic mapping.">
          <ThemeToggle />
        </Panel>
      </div>
    </>
  );
}

function StudioStageMockup() {
  const [controlsOpen, setControlsOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [analyticsMounted, setAnalyticsMounted] = useState(true);
  const [skeleton, setSkeleton] = useState(true);
  const [trails, setTrails] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const openAnalytics = () => {
    setAnalyticsMounted(true);
    requestAnimationFrame(() => setAnalyticsOpen(true));
  };

  return (
    <Panel
      title="Motion Studio · stage + rails"
      description="One shell, many surfaces: left controls + center stage + optional right analytics. The same layout powers exercise detail (standalone or in a program modal), Motion Studio / Open Move, activity replay from history, and record / upload flows — rails collapse, content swaps, chrome stays."
    >
      <ul
        className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-light"
        style={{ color: "var(--muted-foreground)" }}
      >
        {(
          [
            "Exercise details",
            "Motion Studio",
            "Activity history",
            "Record / upload",
            "Program studio modal",
          ] as const
        ).map((label) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-1 w-1 rounded-full"
              style={{ background: "var(--accent)" }}
              aria-hidden
            />
            {label}
          </li>
        ))}
      </ul>
      <div
        className="flex overflow-hidden rounded-lg"
        style={{
          height: STUDIO_DEMO_HEIGHT,
          minHeight: STUDIO_DEMO_HEIGHT,
          border: "1px solid var(--border-secondary)",
          background: "var(--background)",
        }}
      >
        {/* Left · controls */}
        {controlsOpen ? (
          <div
            className="flex min-h-0 shrink-0 flex-col self-stretch overflow-hidden"
            style={{
              width: CONTROLS_RAIL_WIDTH,
              height: "100%",
              borderRight: "1px solid var(--border-secondary)",
              background: "color-mix(in srgb, var(--header-bg, var(--surface)) 92%, transparent)",
            }}
          >
            <div
              className="flex items-start justify-between gap-2 px-3 py-3"
              style={{ borderBottom: "1px solid var(--border-secondary)" }}
            >
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Exercise
                </p>
                <p className="truncate text-sm font-medium">Pull-up · strict</p>
                <p className="mt-0.5 text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
                  Intermediate · back strength
                </p>
              </div>
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                className="shrink-0 rounded-md px-2 py-1 text-[10px]"
                style={{ color: "var(--muted-foreground)" }}
                aria-label="Collapse controls"
              >
                Collapse
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
              <section className="space-y-2">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Try it yourself
                </p>
                <div
                  role="button"
                  tabIndex={0}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                  }}
                  className="flex flex-col items-center justify-center rounded-lg px-3 py-5 text-center transition-colors"
                  style={{
                    border: `1px dashed ${dragOver ? "var(--accent)" : "var(--border-secondary)"}`,
                    background: dragOver
                      ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 5%, transparent)",
                  }}
                >
                  <p className="text-xs font-medium">{dragOver ? "Drop video" : "Upload Video"}</p>
                  <p className="mt-1 text-[10px] font-light" style={{ color: "var(--muted-foreground)" }}>
                    Drag or browse
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                    or
                  </span>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-[11px] font-medium"
                    style={{
                      border: "1px solid var(--border-secondary)",
                      background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
                    }}
                  >
                    Record
                  </button>
                </div>
              </section>

              <section
                className="space-y-2"
                style={{ borderTop: "1px solid var(--border-secondary)", paddingTop: "0.75rem" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Overlays
                </p>
                {(
                  [
                    ["Skeleton", skeleton, setSkeleton],
                    ["Motion trails", trails, setTrails],
                  ] as const
                ).map(([label, on, setOn]) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2"
                    style={{ border: "1px solid var(--border-secondary)" }}
                  >
                    <span className="text-[12px]">{label}</span>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => setOn(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                  </label>
                ))}
              </section>
            </div>

            <div className="shrink-0 px-3 py-3" style={{ borderTop: "1px solid var(--border-secondary)" }}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium"
                style={{
                  border: "1px solid var(--border-secondary)",
                  background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
                }}
              >
                Export media…
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex shrink-0 flex-col self-stretch p-2"
            style={{ height: "100%", borderRight: "1px solid var(--border-secondary)" }}
          >
            <button
              type="button"
              onClick={() => setControlsOpen(true)}
              className="rounded-lg px-2 py-2 text-[11px] font-medium"
              style={{ border: "1px solid var(--border-secondary)", color: "var(--muted-foreground)" }}
              aria-label="Open controls"
            >
              Controls
            </button>
          </div>
        )}

        {/* Center · stage */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col justify-center self-stretch px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
            Stage
          </p>
          <p className="mt-1 text-sm font-medium">Video + pose overlays</p>
          <p className="mt-2 max-w-xs text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Controls left, analytics right — stage stays primary. Collapse either rail independently.
          </p>
          {(skeleton || trails) && (
            <p className="mt-3 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Active: {[skeleton && "Skeleton", trails && "Trails"].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Right · analytics */}
        {!analyticsMounted ? (
          <div
            className="flex shrink-0 flex-col self-stretch p-2"
            style={{ height: "100%", borderLeft: "1px solid var(--border-secondary)" }}
          >
            <button
              type="button"
              onClick={openAnalytics}
              className="rounded-lg px-2 py-2 text-[11px] font-medium"
              style={{ border: "1px solid var(--border-secondary)", color: "var(--muted-foreground)" }}
              aria-label="Show analytics"
            >
              Analytics
            </button>
          </div>
        ) : (
          <div
            onTransitionEnd={(e) => {
              if (e.propertyName !== "width") return;
              if (!analyticsOpen) setAnalyticsMounted(false);
            }}
            className={`flex min-h-0 flex-shrink-0 flex-col self-stretch overflow-hidden ${!analyticsOpen ? "pointer-events-none" : ""}`}
            style={{
              width: analyticsOpen ? DRAWER_DEMO_WIDTH : 0,
              height: "100%",
              transition: "width 220ms ease",
              borderLeft: analyticsOpen ? "1px solid var(--border-secondary)" : undefined,
              background: "color-mix(in srgb, var(--background) 88%, var(--surface))",
            }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-2"
              style={{ borderBottom: "1px solid var(--border-secondary)" }}
            >
              <p className="text-xs font-medium">Analytics</p>
              <button
                type="button"
                onClick={() => setAnalyticsOpen(false)}
                className="rounded-md px-2 py-1 text-[10px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" style={{ width: DRAWER_DEMO_WIDTH }}>
              <div
                className="h-24 rounded-md"
                style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
              />
              <div
                className="h-16 rounded-md"
                style={{ background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}
              />
              <p className="text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
                ROM · symmetry · joint series
              </p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ArchiveBrowseWireframe() {
  const filterFields = [
    { label: "Level", value: "Any" },
    { label: "Muscle", value: "Back · 2" },
    { label: "Equipment", value: "Pull-up bar" },
    { label: "Creator", value: "Any" },
  ] as const;

  const exercises = [
    {
      t: "Scapular pull-up",
      level: "Beginner",
      tone: "#085900",
      author: "Alex Rivera",
      description: "Depress and retract the scapulae from a dead hang — build the base for strict pull-ups.",
    },
    {
      t: "Strict pull-up",
      level: "Intermediate",
      tone: "#F87518",
      author: "Alex Rivera",
      description: "Full ROM chin-over-bar with controlled eccentric. No kip.",
    },
    {
      t: "Weighted pull-up",
      level: "Advanced",
      tone: "#1D4ED8",
      author: "Mova Archive",
      description: "Load progressive intensity once strict form is consistent across sets.",
    },
    {
      t: "Active hang",
      level: "Beginner",
      tone: "#085900",
      author: "Alex Rivera",
      description: "Engage lats and pack the shoulders while hanging — postural endurance.",
    },
  ] as const;

  return (
    <Panel
      title="Archive browse · rail filters + hero + cards → detail"
      description="LibraryShell browse → program detail → trainer/creator. Same filter rail + hero + card grammar; destinations change."
    >
      <div
        className="mb-3 rounded-lg px-3 py-2.5 text-[12px] font-light leading-relaxed"
        style={{
          border: "1px solid var(--border-secondary)",
          background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
          color: "var(--muted-foreground)",
        }}
      >
        <span className="font-medium" style={{ color: "var(--foreground)" }}>
          Why this pattern —{" "}
        </span>
        One discovery → detail journey. Rail filters stay out of the content column, the hero sells the next session or program, and media cards are the unit of discovery. Program and creator pages reuse Archive hero + card grammar with access / purchase and catalog carousels — not a separate visual system.
      </div>

      <p
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        1 · Archive page · browse
      </p>
      <div
        className="flex overflow-hidden rounded-lg"
        style={{
          height: "26rem",
          border: "1px solid var(--border-secondary)",
          background: "var(--background)",
        }}
      >
        <div
          className="flex w-[11.5rem] shrink-0 flex-col sm:w-52"
          style={{
            borderRight: "1px solid var(--mega-menu-border, var(--border-secondary))",
            background: "color-mix(in srgb, var(--header-bg, var(--surface)) 92%, transparent)",
          }}
        >
          <div
            className="flex items-center justify-between gap-2 px-3 py-3"
            style={{ borderBottom: "1px solid var(--border-secondary)" }}
          >
            <p className="truncate text-[10px] font-light uppercase tracking-wider">Mova Archive</p>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] tracking-widest"
                style={{
                  border: "1px solid var(--mega-menu-border, var(--border-secondary))",
                  background: "var(--mega-menu-trigger-bg, color-mix(in srgb, var(--foreground) 8%, transparent))",
                  color: "var(--mega-menu-trigger-text, var(--muted-foreground))",
                }}
                title="App mega menu"
              >
                ···
              </span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                «
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium" style={{ color: "var(--section-title)" }}>
                Filter by:
              </p>
              <span className="text-[10px] underline" style={{ color: "var(--muted)" }}>
                Clear
              </span>
            </div>
            {filterFields.map((f) => (
              <div key={f.label}>
                <p className="mb-1 text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
                  {f.label}
                </p>
                <div
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-[11px] font-light"
                  style={{
                    border: "1px solid var(--border-secondary)",
                    background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                  }}
                >
                  <span className="truncate">{f.value}</span>
                  <span style={{ color: "var(--muted)" }}>▾</span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="px-3 py-2 text-[9px]"
            style={{ borderTop: "1px solid var(--border-secondary)", color: "var(--muted-foreground)" }}
          >
            © Mova · Privacy
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          <div
            className="relative overflow-hidden rounded-xl"
            style={{
              minHeight: "9.5rem",
              border: "1px solid var(--border-secondary)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--foreground) 32%, transparent), color-mix(in srgb, var(--accent) 18%, transparent))",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.15), transparent)",
              }}
            />
            <div className="relative flex h-full min-h-[9.5rem] flex-col justify-end p-4">
              <span
                className="mb-1 w-fit rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
              >
                Featured · Program
              </span>
              <p className="text-base font-light tracking-tight text-white sm:text-lg">Pull-up foundation</p>
              <p className="mt-0.5 text-[11px] font-light text-white/80">4 weeks · form-first Studio sessions</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-1.5 w-6 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
                Pull-up progression
              </p>
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                ExerciseCard
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {exercises.map((ex) => (
                <div
                  key={ex.t}
                  className="relative overflow-hidden rounded-lg"
                  style={{
                    aspectRatio: "200 / 355",
                    border: "1px solid var(--border-secondary)",
                    background: `linear-gradient(160deg, color-mix(in srgb, ${ex.tone} 28%, var(--surface)), color-mix(in srgb, var(--foreground) 14%, var(--surface)))`,
                  }}
                >
                  {/* Level badge — matches ExerciseCard: upper left, compact */}
                  <span
                    className="absolute z-10 rounded px-1 py-0.5 text-[7px] font-medium leading-none shadow-sm"
                    style={{
                      top: 6,
                      left: 6,
                      background: "rgba(192, 201, 204, 0.85)",
                      color: ex.tone,
                      border: "1px solid #f3f3f4",
                    }}
                  >
                    {ex.level}
                  </span>
                  <div
                    className="absolute bottom-0 left-0 right-0 z-10 px-2 py-2"
                    style={{
                      minHeight: "4.5rem",
                      background: "var(--card-overlay)",
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                    }}
                  >
                    <p
                      className="mb-0.5 truncate text-[10px] font-medium leading-tight"
                      style={{ color: "var(--card-title)" }}
                    >
                      {ex.t}
                    </p>
                    <p className="mb-0.5 truncate text-[8px]" style={{ color: "var(--card-description)" }}>
                      by {ex.author}
                    </p>
                    <p
                      className="text-[8px] leading-snug"
                      style={{
                        color: "var(--card-description)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ex.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
              Programs · same card grammar
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { t: "Pull-up foundation", meta: "Program · $49" },
                { t: "Ring strength", meta: "Program · $79" },
                { t: "Alex Rivera", meta: "Creator" },
              ].map((c) => (
                <div
                  key={c.t}
                  className="w-36 shrink-0 overflow-hidden rounded-lg"
                  style={{ border: "1px solid var(--border-secondary)", background: "var(--card-bg)" }}
                >
                  <div
                    className="h-14"
                    style={{ background: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}
                  />
                  <div className="p-2">
                    <p className="truncate text-[11px] font-medium">{c.t}</p>
                    <p className="mt-0.5 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                      {c.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p
        className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        2 · Program detail · access + weeks → studio
      </p>
      <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border-secondary)" }}>
        <div
          className="relative px-4 py-8 sm:px-6"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in srgb, var(--foreground) 28%, transparent), color-mix(in srgb, var(--background) 40%, transparent))",
            borderBottom: "1px solid var(--border-secondary)",
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--foreground)", background: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
              Program
            </span>
            <span className="rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--foreground)", background: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
              $49
            </span>
          </div>
          <p className="mt-2 text-xl font-light tracking-tight">Pull-up foundation</p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            by Alex Rivera
          </p>
          <p className="mt-2 max-w-lg text-[12px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Progressive volume with form checks in Studio — 4 weeks · 3 sessions/week.
          </p>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {["Intermediate", "4 weeks · 3/wk", "Pull-ups", "Scapula"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 text-[10px]"
                style={{ background: "var(--surface)", border: "1px solid var(--border-secondary)" }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div
            className="rounded-lg px-4 py-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border-secondary)" }}
          >
            <p className="text-[12px] font-medium">Preview: Week 1 free · Full program $49</p>
            <p className="mt-1 text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
              30 days access after purchase
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg px-4 py-2 text-[11px] font-medium"
              style={{ background: "var(--primary-button-bg)", color: "var(--primary-button-text)" }}
            >
              Purchase $49
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => (
              <button
                key={w}
                type="button"
                className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium"
                style={{
                  background: i === 0 ? "color-mix(in srgb, var(--foreground) 12%, transparent)" : "transparent",
                  border: "1px solid var(--border-secondary)",
                  color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                {w}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
              Session A · Scapular prep
            </p>
            {["Scapular pull-up", "Dead hang", "Active hang"].map((ex, i) => (
              <div
                key={ex}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[12px]"
                style={{ border: "1px solid var(--border-secondary)", background: "var(--card-bg)" }}
              >
                <span>
                  <span className="mr-2 font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    {i + 1}
                  </span>
                  {ex}
                </span>
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  Open studio
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p
        className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        3 · Trainer / creator detail · catalog
      </p>
      <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border-secondary)" }}>
        <div
          className="relative px-4 py-8 sm:px-6"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--background) 50%, transparent))",
            borderBottom: "1px solid var(--border-secondary)",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
            Creator
          </p>
          <p className="mt-1 text-xl font-light tracking-tight">Alex Rivera</p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            CSCS · Gymnastics strength for athletes
          </p>
        </div>

        <div className="space-y-4 p-4">
          <p className="max-w-2xl text-[12px] font-light leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Coaching pull-ups, rings, and handstand strength with form-first Studio sessions — programs that ship
            into the same Activity / Insights model as free tools.
          </p>

          <div className="flex flex-wrap gap-2">
            {["Strength", "Gymnastics", "Pull-ups", "Rings"].map((s) => (
              <span
                key={s}
                className="rounded-full px-2.5 py-1 text-[10px] capitalize"
                style={{ background: "var(--surface)", border: "1px solid var(--border-secondary)" }}
              >
                {s}
              </span>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
              Programs
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { t: "Pull-up foundation", meta: "4 wk · $49" },
                { t: "Ring strength", meta: "6 wk · $79" },
                { t: "Handstand prep", meta: "Free" },
              ].map((p) => (
                <div
                  key={p.t}
                  className="w-40 shrink-0 rounded-lg p-3"
                  style={{ border: "1px solid var(--border-secondary)", background: "var(--card-bg)" }}
                >
                  <div
                    className="mb-2 h-16 rounded-md"
                    style={{ background: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}
                  />
                  <p className="text-[12px] font-medium">{p.t}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    {p.meta}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
              Program exercises
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Scapular pull-up", "Muscle-up prog.", "Ring row"].map((ex) => (
                <div
                  key={ex}
                  className="flex h-20 w-28 shrink-0 flex-col justify-end rounded-lg p-2"
                  style={{
                    border: "1px solid var(--border-secondary)",
                    background: "color-mix(in srgb, var(--foreground) 8%, var(--surface))",
                  }}
                >
                  <p className="text-[10px] font-medium">{ex}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
        Production: <code className="font-mono">LibraryShell</code> ·{" "}
        <code className="font-mono">FeaturedHeroCarousel</code> · <code className="font-mono">ExerciseCard</code> /{" "}
        <code className="font-mono">ProgramCard</code> · <code className="font-mono">programs/[slug]</code> ·{" "}
        <code className="font-mono">creators/[slug]</code>.
      </p>
    </Panel>
  );
}

function EmptyAndGatedWireframe() {
  return (
    <Panel
      title="Empty + gated states"
      description="Honest zero data and clear upgrade / access locks — same shell, different next action."
    >
      <div
        className="mb-3 rounded-lg px-3 py-2.5 text-[12px] font-light leading-relaxed"
        style={{
          border: "1px solid var(--border-secondary)",
          background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
          color: "var(--muted-foreground)",
        }}
      >
        <span className="font-medium" style={{ color: "var(--foreground)" }}>
          Why this pattern —{" "}
        </span>
        Prefer missing over fake precision. Empty points to the first session; gated states name the unlock without
        inventing charts.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className="flex flex-col items-start justify-center rounded-lg px-4 py-8"
          style={{ border: "1px solid var(--border-secondary)", background: "var(--surface)", minHeight: "10rem" }}
        >
          <p className="text-[13px] font-medium">No sessions yet</p>
          <p className="mt-1 text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Capture a movement in Studio to populate Insights.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg px-3 py-1.5 text-[11px] font-medium"
            style={{ background: "var(--primary-button-bg)", color: "var(--primary-button-text)" }}
          >
            Open Studio
          </button>
        </div>
        <div
          className="relative flex flex-col items-start justify-center overflow-hidden rounded-lg px-4 py-8"
          style={{ border: "1px solid var(--border-secondary)", background: "var(--surface)", minHeight: "10rem" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 20%, color-mix(in srgb, var(--surface) 88%, transparent))",
            }}
          />
          <p className="relative text-[13px] font-medium">Program analytics</p>
          <p className="relative mt-1 text-[11px] font-light" style={{ color: "var(--muted-foreground)" }}>
            Unlock full week trends after purchase.
          </p>
          <button
            type="button"
            className="relative mt-4 rounded-lg px-3 py-1.5 text-[11px] font-medium"
            style={{
              border: "1px solid var(--border-secondary)",
              background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
            }}
          >
            Unlock · $49
          </button>
        </div>
      </div>
    </Panel>
  );
}

function PatternsPanel() {
  return (
    <>
      <SectionHeader
        title="Patterns"
        subtitle="Composed product UI — studio stage+rails, Archive family (browse → program → creator), empty + gated. Session charts live under Data viz."
      />
      <div className="space-y-6">
        <StudioStageMockup />
        <ArchiveBrowseWireframe />
        <EmptyAndGatedWireframe />
        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          Production: <code className="font-mono">OpenMoveStudio</code> /{" "}
          <code className="font-mono">ExerciseStudioPage</code>, <code className="font-mono">LibraryShell</code> +{" "}
          <code className="font-mono">FeaturedHeroCarousel</code>, <code className="font-mono">programs/[slug]</code>,{" "}
          <code className="font-mono">creators/[slug]</code>.
        </p>
      </div>
    </>
  );
}

function DataVizPanel({
  range,
  setRange,
  vizState,
  setVizState,
}: {
  range: ChartTimeRange;
  setRange: (r: ChartTimeRange) => void;
  vizState: VizState;
  setVizState: (s: VizState) => void;
}) {
  const angle = useMemo(() => buildMockAngleSeries(48), []);

  return (
    <>
      <SectionHeader
        title="Data visualization"
        subtitle="Insights controls, summary card, session readout (radar + angles), and chart types — rationale sits with each example."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Panel title="Chart time range" description="Shared Insights control — week / month / YTD / all.">
          <ChartTimeRangeToggle value={range} onChange={setRange} />
          <p className="mt-3 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            Active: <span className="font-mono text-[color:var(--foreground)]">{range}</span>
          </p>
        </Panel>
        <Panel title="Metric chip" description="Hero number + label used in SportSummaryCard splits.">
          <div
            className="flex max-w-sm flex-col justify-center rounded-lg px-4 py-4"
            style={{
              border: "1px solid var(--border-secondary)",
              backgroundColor: "color-mix(in srgb, var(--foreground) 6%, var(--background))",
            }}
          >
            <p className="font-mono text-3xl font-medium tabular-nums leading-none tracking-tight">84</p>
            <p className="mt-2 text-xs uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Pull-ups
            </p>
          </div>
        </Panel>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {CHART_TYPE_RATIONALE.summary.label} · populated
          </p>
          <p className="max-w-xl text-[11px] font-light sm:text-right" style={{ color: "var(--muted-foreground)" }}>
            {CHART_TYPE_RATIONALE.summary.when}{" "}
            <span className="opacity-80">· {CHART_TYPE_RATIONALE.summary.where}</span>
          </p>
        </div>
        <SportSummaryCard sportKey="pullups" range={range} summary={MOCK_SPORT_SUMMARY_POPULATED} />
      </div>

      <ChipFilter
        items={[
          { id: "populated", label: "Populated" },
          { id: "empty", label: "Empty" },
          { id: "loading", label: "Loading" },
        ]}
        value={vizState}
        onChange={(id) => setVizState(id as VizState)}
      />
      {vizState === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl"
              style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
            />
          ))}
        </div>
      ) : vizState === "empty" ? (
        <Panel title="Empty state">
          <p className="text-sm font-light" style={{ color: "var(--muted-foreground)" }}>
            No sessions in range — charts stay empty rather than inventing precision. Same principle as
            production Insights.
          </p>
        </Panel>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {CHART_TYPE_RATIONALE.bar.label} · weekly volume
              </p>
              <p className="max-w-xl text-[11px] font-light sm:text-right" style={{ color: "var(--muted-foreground)" }}>
                {CHART_TYPE_RATIONALE.bar.when}{" "}
                <span className="opacity-80">· {CHART_TYPE_RATIONALE.bar.where}</span>
              </p>
            </div>
            <Panel>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_BAR_VOLUME} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                    <CartesianGrid
                      stroke="var(--results-chart-grid)"
                      strokeDasharray="3 3"
                      vertical={false}
                      strokeOpacity={1}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      axisLine={{ stroke: "var(--results-chart-grid)" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={chartGlassCursor}
                      contentStyle={{ ...chartGlassTooltipContentStyle, fontSize: 12 }}
                    />
                    <Bar dataKey="mini" stackId="v" fill="var(--results-chart-series-2)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="studio" stackId="v" fill="var(--results-chart-series-1)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--muted-foreground)" }}
              >
                Session readout · score + radar + angles
              </p>
              <p className="max-w-xl text-[11px] font-light sm:text-right" style={{ color: "var(--muted-foreground)" }}>
                Post-capture outcome compose — same charts as results/[id].{" "}
                <span className="opacity-80">
                  {CHART_TYPE_RATIONALE.radar.when} · {CHART_TYPE_RATIONALE.angle.when}
                </span>
              </p>
            </div>
            <div
              className="mb-3 flex flex-wrap items-end justify-between gap-3 rounded-lg px-4 py-3"
              style={{
                border: "1px solid var(--border-secondary)",
                background: "var(--results-summary-bg, var(--surface))",
              }}
            >
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Session · Strict pull-up
                </p>
                <p className="mt-1 text-lg font-light tracking-tight">Score 78 · 6 reps</p>
              </div>
              <div className="flex gap-4">
                {[
                  { l: "ROM", v: "82" },
                  { l: "Pattern", v: "74" },
                  { l: "Tempo", v: "71" },
                ].map((m) => (
                  <div key={m.l} className="text-center">
                    <p className="text-base font-medium tabular-nums">{m.v}</p>
                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {m.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p
                  className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {CHART_TYPE_RATIONALE.radar.label}
                </p>
                <BaseRadarChart data={MOCK_RADAR_DATA} title="Performance radar (mock)" />
              </div>
              <div>
                <p
                  className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {CHART_TYPE_RATIONALE.angle.label}
                </p>
                <BaseAngleComparisonChart
                  data={angle.data}
                  jointsOfInterest={angle.jointsOfInterest}
                  title="Joint angles over time (mock)"
                  showReference
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DesignSystemBody({
  initialSection = "overview",
  initialTheme,
}: {
  initialSection?: SectionId;
  initialTheme?: "light" | "dark";
}) {
  const { setTheme } = useTheme();
  const [section, setSection] = useState<SectionId>(initialSection);
  const [range, setRange] = useState<ChartTimeRange>("week");
  const [vizState, setVizState] = useState<VizState>("populated");
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTheme) setTheme(initialTheme);
  }, [initialTheme, setTheme]);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [section]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header
        className="shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--background) 92%, var(--surface))",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)" }}>
              Design system
            </p>
            <p className="text-sm font-medium">Mova Atlética</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-3" aria-label="Design system sections">
          {SECTIONS.map((s) => {
            const isActive = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className="shrink-0 rounded-lg px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                    : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                <span className="block text-xs font-medium">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <div ref={contentScrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div
          className="mx-auto w-full max-w-5xl py-8 sm:py-10"
          style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
        >
          {section === "overview" ? <OverviewPanel /> : null}
          {section === "foundations" ? <FoundationsPanel /> : null}
          {section === "components" ? <ComponentsPanel /> : null}
          {section === "patterns" ? <PatternsPanel /> : null}
          {section === "dataviz" ? (
            <DataVizPanel
              range={range}
              setRange={setRange}
              vizState={vizState}
              setVizState={setVizState}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function DesignSystemClient({
  embed = false,
  initialSection,
  initialTheme,
}: {
  embed?: boolean;
  initialSection?: SectionId;
  initialTheme?: "light" | "dark";
}) {
  const body = (
    <DesignSystemBody initialSection={initialSection} initialTheme={initialTheme} />
  );

  if (embed) {
    return (
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {body}
      </div>
    );
  }

  return (
    <ArchiveNavShell studioLayout activeApp="archive">
      {body}
    </ArchiveNavShell>
  );
}
