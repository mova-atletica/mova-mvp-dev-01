"use client";

import React from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { AssetVideoEngine } from "./useAssetVideoEngine";
import { type EffectType } from "./assetVideoTypes";
import { AssetVideoPlayerExportPanel } from "./AssetVideoPlayerExportPanel";
import { EffectConfigPanel } from "./effect-config/EffectConfigPanel";
import { EffectSelectedCheckIcon } from "./EffectSelectedCheckIcon";

/** Inline theme borders — `var(--border)` from ThemeContext; matches OpenMoveStudio (Tailwind `.border-border-theme` unreliable in bundle). */
const borderBottomTheme = { borderBottom: "1px solid var(--border-secondary)" } as const;
const borderTopTheme = { borderTop: "1px solid var(--border-secondary)" } as const;
const borderAllTheme = { border: "1px solid var(--border)" } as const;

/** Parque-style accordion triggers */
const triggerClass =
  "group flex w-full items-center justify-between gap-2 py-2 px-1 text-left outline-none transition-colors hover:opacity-95 [&[data-state=open]>svg]:rotate-180";

const triggerLabelClass =
  "text-[11px] font-light tracking-wider uppercase underline underline-offset-2 text-[color:var(--foreground)] decoration-border-theme group-hover:opacity-90";

const contentClass = "rail-accordion-content overflow-hidden";
const accordionItemClass = "my-4 pb-4 px-0";

const effectBtnBase =
  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-light transition-colors";

const effectBtnOff =
  "bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:opacity-95";

const effectBtnOn =
  "bg-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)] text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

function useEffectCategoryList(engine: AssetVideoEngine) {
  const {
    getEffectsForCategory,
    isEffectActive,
    addEffect,
    removeEffect,
    activeEffects,
    setActiveEffects,
    sportAnalysisKind,
    sportMetricsSnapshot,
  } = engine;

  return (category: EffectType) => (
    <div className="flex flex-col gap-1.5">
      {getEffectsForCategory(category).map((effect) => {
        const on = isEffectActive(effect.id);
        const activeEffect = activeEffects.find((e) => e.effect.id === effect.id);
        return (
          <div key={effect.id} className="flex flex-col gap-1.5">
            <button
              type="button"
              style={on ? { border: "1px solid var(--accent, #3b82f6)" } : borderAllTheme}
              aria-pressed={on}
              onClick={() => {
                if (on) {
                  removeEffect(effect.id);
                } else {
                  addEffect(effect);
                }
              }}
              className={`${effectBtnBase} ${on ? effectBtnOn : effectBtnOff}`}
            >
              <span>{effect.name}</span>
              {on ? (
                <span className="flex shrink-0 items-center justify-center text-[var(--accent,#3b82f6)]">
                  <EffectSelectedCheckIcon />
                </span>
              ) : null}
            </button>
            {on && activeEffect ? (
              <div
                className="rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_4%,transparent)] p-2 backdrop-blur-sm"
                style={borderAllTheme}
              >
                <EffectConfigPanel
                  activeEffect={activeEffect}
                  setActiveEffects={setActiveEffects}
                  sportAnalysisKind={sportAnalysisKind}
                  sportMetricsSnapshot={sportMetricsSnapshot}
                  showTitle={false}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export type ChromeRailScrollContainer = "internal" | "passthrough";

/** Scroll region: Motion + Stats accordions (no export footer). */
export function AssetVideoPlayerChromeRailScroll({
  engine,
  scrollContainer = "internal",
}: {
  engine: AssetVideoEngine;
  /**
   * `internal` — this component owns `overflow-y-auto` (motion-explore rail).
   * `passthrough` — no inner scroll; parent supplies one scroll surface (e.g. Open Move Studio rail body).
   */
  scrollContainer?: ChromeRailScrollContainer;
}) {
  const effectCategoryList = useEffectCategoryList(engine);

  const accordion = (
    <Accordion.Root type="multiple" defaultValue={[]} className="w-full space-y-4">
          <Accordion.Item value="motion" style={borderBottomTheme} className={accordionItemClass}>
            <Accordion.Header>
              <Accordion.Trigger className={triggerClass}>
                <span className={triggerLabelClass}>Visual guides</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--muted)] transition-transform duration-300 ease-in-out" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className={contentClass}>
              <div>
                {effectCategoryList("Motion")}
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="stats" style={borderBottomTheme} className={accordionItemClass}>
            <Accordion.Header>
              <Accordion.Trigger className={triggerClass}>
                <span className={triggerLabelClass}>Stats overlays</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--muted)] transition-transform duration-300 ease-in-out" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className={contentClass}>
              <div>
                {effectCategoryList("Stats")}
              </div>
            </Accordion.Content>
          </Accordion.Item>
    </Accordion.Root>
  );

  if (scrollContainer === "passthrough") {
    return <div className="w-full">{accordion}</div>;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">{accordion}</div>
    </div>
  );
}

const exportTriggerClass =
  "group flex w-full items-center justify-between gap-2 border-0 bg-transparent py-3 px-4 text-left outline-none transition-colors hover:opacity-95 md:px-8 [&[data-state=open]>svg]:rotate-180";

/** Full-width export block — render outside padded column for side-rail edge bleed. */
export function AssetVideoPlayerChromeExportFooter({
  engine,
  accordionTitle = "4. Download & export",
}: {
  engine: AssetVideoEngine;
  /** Open Move Studio passes step 4 when sport analysis is step 3 in the rail. */
  accordionTitle?: string;
}) {
  return (
    <div style={borderTopTheme} className="w-full flex-shrink-0 py-4 bg-[var(--header-bg)] backdrop-blur-xxl">
      <Accordion.Root type="single" collapsible defaultValue={undefined}>
        <Accordion.Item value="export" className="border-0 px-4">
          <Accordion.Header>
            <Accordion.Trigger className={exportTriggerClass}>
              <span className="mb-0 shrink-0 text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                {accordionTitle}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--muted)] transition-transform duration-300 ease-in-out" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className={`${contentClass} data-[state=open]:overflow-visible`}>
            <div className="bg-[color:color-mix(in_srgb,var(--header-bg)_100%)] px-4 py-3 md:px-8 overflow-visible">
              <AssetVideoPlayerExportPanel engine={engine} />
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}

/** Combined rail (scroll + footer) — use when both share the same layout parent. */
export function AssetVideoPlayerChromeRail({ engine }: { engine: AssetVideoEngine }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <AssetVideoPlayerChromeRailScroll engine={engine} />
      <AssetVideoPlayerChromeExportFooter engine={engine} />
    </div>
  );
}
