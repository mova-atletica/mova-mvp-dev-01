"use client";

import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Download } from "lucide-react";
import { useExportPanelPopoverLayers } from "../../contexts/EmbeddedModalPopoverContext";
import type { AssetVideoEngine } from "./useAssetVideoEngine";

/** Shared with Open Move Studio cycling knee control — matches export Format/Quality triggers. */
export const exportPanelFieldLabelClass =
  "text-[12px] text-[color:var(--muted-foreground)] font-light mb-1";

/** Portaled surface — matches Open Move Studio mega menu (Popover.Content) */
export const exportPanelPopoverContentClass =
  "z-[220] w-[var(--radix-popover-trigger-width)] min-w-[8rem] overflow-hidden rounded-lg border border-border-theme bg-[var(--card-bg)] p-0 shadow-2xl backdrop-blur-xl outline-none";

export const exportPanelDropdownMenuItemClass =
  "px-2 py-1.5 text-[11px] cursor-pointer text-[color:var(--foreground)] transition-colors border-b border-border-theme last:border-b-0 hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]";

export const exportPanelSelectTriggerClass =
  "w-full flex items-center justify-between gap-1 rounded-lg border border-border-theme bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2 py-2 text-left text-xs font-light text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:border-border-theme transition-colors min-w-0";

/** Download / export settings — Parque-style dark glass; shared by overlay menu and desktop rail footer. */
export function AssetVideoPlayerExportPanel({ engine }: { engine: AssetVideoEngine }) {
  const popoverLayers = useExportPanelPopoverLayers();
  const {
    exportConfig,
    setExportConfig,
    videoDuration,
    sourceFps,
    videoVisibility,
    setVideoVisibility,
    formatDropdownOpen,
    setFormatDropdownOpen,
    qualityDropdownOpen,
    setQualityDropdownOpen,
    isExporting,
    exportSuccess,
    handleExport,
  } = engine;

  return (
    <div className="flex flex-col gap-3 text-[color:var(--foreground)]">

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className={exportPanelFieldLabelClass}>Format</div>
            <Popover.Root
              modal={popoverLayers.modal}
              open={formatDropdownOpen}
              onOpenChange={(open) => {
                setFormatDropdownOpen(open);
                if (open) setQualityDropdownOpen(false);
              }}
            >
              <Popover.Trigger asChild>
                <button type="button" className={exportPanelSelectTriggerClass}>
                  <span className="truncate">{exportConfig.format === "png" ? "PNG Image" : "Video"}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${formatDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </Popover.Trigger>
              <Popover.Portal container={popoverLayers.portalContainer}>
                <Popover.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  collisionPadding={12}
                  style={popoverLayers.contentStyle}
                  className={popoverLayers.contentClassName}
                >
                  <div
                    role="menuitem"
                    className={exportPanelDropdownMenuItemClass}
                    onClick={() => {
                      setExportConfig({ ...exportConfig, format: "png" });
                      setFormatDropdownOpen(false);
                    }}
                  >
                    PNG Image
                  </div>
                  <div
                    role="menuitem"
                    className={exportPanelDropdownMenuItemClass}
                    onClick={() => {
                      setExportConfig({ ...exportConfig, format: "webm" });
                      setFormatDropdownOpen(false);
                    }}
                  >
                    Video (MP4/WebM)
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>

          <div className="min-w-0">
            <div className={exportPanelFieldLabelClass}>Quality</div>
            <Popover.Root
              modal={popoverLayers.modal}
              open={qualityDropdownOpen}
              onOpenChange={(open) => {
                setQualityDropdownOpen(open);
                if (open) setFormatDropdownOpen(false);
              }}
            >
              <Popover.Trigger asChild>
                <button type="button" className={exportPanelSelectTriggerClass}>
                  <span className="truncate">
                    {exportConfig.quality === "low"
                      ? "Low"
                      : exportConfig.quality === "medium"
                        ? "Medium"
                        : "High"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${qualityDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </Popover.Trigger>
              <Popover.Portal container={popoverLayers.portalContainer}>
                <Popover.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  collisionPadding={12}
                  style={popoverLayers.contentStyle}
                  className={popoverLayers.contentClassName}
                >
                  <div
                    className={exportPanelDropdownMenuItemClass}
                    onClick={() => {
                      setExportConfig({ ...exportConfig, quality: "low" });
                      setQualityDropdownOpen(false);
                    }}
                  >
                    Low
                  </div>
                  <div
                    className={exportPanelDropdownMenuItemClass}
                    onClick={() => {
                      setExportConfig({ ...exportConfig, quality: "medium" });
                      setQualityDropdownOpen(false);
                    }}
                  >
                    Medium
                  </div>
                  <div
                    className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                    onClick={() => {
                      setExportConfig({ ...exportConfig, quality: "high" });
                      setQualityDropdownOpen(false);
                    }}
                  >
                    High
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {exportConfig.format === "webm" && (
          <>
            <div>
              <div className={exportPanelFieldLabelClass}>
                Max duration (seconds)
                {videoDuration && (
                  <span className="ml-1 text-[10px] text-[color:var(--muted)] font-light normal-case tracking-normal">
                    (Video: {videoDuration.toFixed(1)}s)
                  </span>
                )}
              </div>
              <input
                type="range"
                min="1"
                max={videoDuration ? Math.max(10, Math.ceil(videoDuration)) : 10}
                step="1"
                value={exportConfig.duration || 3}
                onChange={(e) => setExportConfig({ ...exportConfig, duration: parseInt(e.target.value) })}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg accent-[var(--accent,#3b82f6)]"
                style={{
                  background: "rgba(255,255,255,0.15)",
                }}
              />
              <div className="mt-2 text-center text-[10px] text-[color:var(--muted)]">
                {(() => {
                  const maxDuration = exportConfig.duration || 3;
                  const actualDuration = videoDuration ? Math.min(videoDuration, maxDuration) : maxDuration;
                  return videoDuration && videoDuration < maxDuration
                    ? `${actualDuration.toFixed(1)}s (full video)`
                    : `${maxDuration}s`;
                })()}
              </div>
            </div>
            <div>
              <div className={exportPanelFieldLabelClass}>Export fps</div>
              <div className="mt-1 text-center text-[10px] text-[color:var(--muted)]">
                {sourceFps != null
                  ? `${Math.round(sourceFps)} fps (source)`
                  : "Detecting source… (falls back to 30)"}
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setVideoVisibility((prev) => ({ ...prev, showVideo: !prev.showVideo }))}
          className="w-full rounded-lg border border-border-theme bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2 text-center text-xs font-light text-[color:var(--foreground)] opacity-90 transition-colors hover:border-border-theme hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
        >
          {videoVisibility.showVideo ? "Hide video in export" : "Show video in export"}
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border-theme bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2.5 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-border-theme border-t-[color:var(--foreground)]" />
              Exporting…
            </>
          ) : exportSuccess ? (
            "✓ Exported!"
          ) : (
            <>
              <Download className="h-3.5 w-3.5 opacity-90" />
              Export asset
            </>
          )}
        </button>
      </div>
    </div>
  );
}
