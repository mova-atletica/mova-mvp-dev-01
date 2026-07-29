"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, Copy, Save } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { updateActivitySessionVisualConfig } from "../../lib/activitySessions";
import {
  hydrateVisualOverlayPreset,
  parseVisualOverlayPreset,
  serializeVisualOverlayPreset,
  type VisualOverlayPreset,
} from "../../lib/visualOverlayPreset";
import { useOptionalAssetVideoEngine } from "./assetVideoEngineContext";

type StatusTone = "idle" | "ok" | "err";

interface VisualOverlayConfigActionsProps {
  /** Saved / hydrated activity id — enables Save to activity + import auto-update. */
  activityId?: string | null;
  /** Keeps parent persist flow in sync with latest overlays. */
  visualConfigRef?: React.MutableRefObject<VisualOverlayPreset | null>;
  className?: string;
}

export function VisualOverlayConfigActions({
  activityId = null,
  visualConfigRef,
  className = "",
}: VisualOverlayConfigActionsProps) {
  const engine = useOptionalAssetVideoEngine();
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({
    tone: "idle",
    text: "",
  });
  const clearTimerRef = useRef<number | null>(null);

  const flash = useCallback((tone: StatusTone, text: string) => {
    setStatus({ tone, text });
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => {
      setStatus({ tone: "idle", text: "" });
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visualConfigRef || !engine) return;
    visualConfigRef.current = serializeVisualOverlayPreset(engine.activeEffects);
  }, [engine, engine?.activeEffects, visualConfigRef]);

  const persistToActivity = useCallback(
    async (preset: VisualOverlayPreset, successMessage: string) => {
      if (!activityId) {
        flash("err", "Save the session first");
        return false;
      }
      const supabase = createClient();
      const { error } = await updateActivitySessionVisualConfig(
        supabase,
        activityId,
        preset
      );
      if (error) {
        flash("err", error);
        return false;
      }
      flash("ok", successMessage);
      return true;
    },
    [activityId, flash]
  );

  const handleCopy = useCallback(async () => {
    if (!engine) {
      flash("err", "Open a clip first");
      return;
    }
    const preset = serializeVisualOverlayPreset(engine.activeEffects);
    try {
      await navigator.clipboard.writeText(JSON.stringify(preset, null, 2));
      flash("ok", "Config copied");
    } catch {
      flash("err", "Clipboard unavailable");
    }
  }, [engine, flash]);

  const handleImport = useCallback(async () => {
    if (!engine) {
      flash("err", "Open a clip first");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const preset = parseVisualOverlayPreset(text);
      if (!preset) {
        flash("err", "Invalid config on clipboard");
        return;
      }
      const effects = hydrateVisualOverlayPreset(preset);
      if (effects.length === 0) {
        flash("err", "No matching effects in config");
        return;
      }
      engine.setActiveEffects(effects);
      const nextPreset = serializeVisualOverlayPreset(effects);
      if (visualConfigRef) visualConfigRef.current = nextPreset;
      if (activityId) {
        await persistToActivity(nextPreset, "Imported & saved");
      } else {
        flash("ok", "Config imported");
      }
    } catch {
      flash("err", "Could not read clipboard");
    }
  }, [activityId, engine, flash, persistToActivity, visualConfigRef]);

  const handleSave = useCallback(async () => {
    if (!engine) {
      flash("err", "Open a clip first");
      return;
    }
    const preset = serializeVisualOverlayPreset(engine.activeEffects);
    await persistToActivity(preset, "Saved to activity");
  }, [engine, persistToActivity]);

  if (!engine) return null;

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-theme bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={`flex min-w-0 flex-col items-end gap-0.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={iconBtn}
          title="Copy visual config"
          aria-label="Copy visual config"
          onClick={() => void handleCopy()}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={iconBtn}
          title="Paste visual config from clipboard"
          aria-label="Paste visual config from clipboard"
          onClick={() => void handleImport()}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={iconBtn}
          title={activityId ? "Save visual config to activity" : "Save the session first"}
          aria-label="Save visual config to activity"
          disabled={!activityId}
          onClick={() => void handleSave()}
        >
          <Save className="h-3.5 w-3.5" />
        </button>
      </div>
      {status.text ? (
        <p
          className={`max-w-[11rem] truncate text-[10px] leading-tight ${
            status.tone === "err" ? "text-red-500/90" : "text-[color:var(--muted)]"
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
