"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, Plus, Upload } from "lucide-react";
import ArchiveNavShell from "../../components/archive/ArchiveNavShell";
import { useAccount } from "../../contexts/MockAuthContext";
import { createClient } from "../../lib/supabase/client";
import {
  createCoachSession,
  createSignedCoachVideoUrl,
  listCoachSessions,
  uploadCoachSourceVideo,
} from "../../lib/coachStudio/coachSessions";
import {
  CoachVideoTooLongError,
  probeCoachVideoFile,
} from "../../lib/coachStudio/probeCoachVideo";
import { createActivitySession } from "../../lib/activitySessions";
import { useTranslations } from "../../i18n/LocaleProvider";
import type { CoachSession } from "../../types/coachSession";

export default function CoachStudioProjects() {
  const t = useTranslations();
  const router = useRouter();
  const { profile, isAuthenticated, openSignIn } = useAccount();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listCoachSessions(supabase, { status: "draft", limit: 30 });
    if (error) {
      setListError(error);
      setLoading(false);
      return;
    }
    setListError(null);
    setSessions(data);
    setLoading(false);

    const entries = await Promise.all(
      data
        .filter((s) => s.sourceVideoPath)
        .map(async (s) => {
          const { url } = await createSignedCoachVideoUrl(supabase, s.sourceVideoPath!);
          return [s.id, url] as const;
        })
    );
    setThumbs((prev) => {
      const next = { ...prev };
      for (const [id, url] of entries) if (url) next[id] = url;
      return next;
    });
  }, [supabase]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshList();
  }, [isAuthenticated, refreshList]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!isAuthenticated || !profile?.id) {
      openSignIn();
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const probe = await probeCoachVideoFile(file);
      const sessionId = crypto.randomUUID();
      const { path, error: uploadError } = await uploadCoachSourceVideo(supabase, {
        userId: profile.id,
        sessionId,
        file,
      });
      if (uploadError || !path) throw new Error(uploadError ?? t("coachStudio.uploadFailed"));

      const baseTitle = file.name.replace(/\.[^.]+$/, "") || t("coachStudio.untitledDraft");
      const { data, error: createError } = await createCoachSession(supabase, {
        id: sessionId,
        userId: profile.id,
        title: baseTitle,
        sourceVideoPath: path,
        sourceDurationMs: probe.durationMs,
        sourceWidth: probe.width,
        sourceHeight: probe.height,
        sourceFps: probe.fps,
        metadata: { title: baseTitle },
      });
      if (createError || !data) throw new Error(createError ?? t("coachStudio.createFailed"));

      void createActivitySession(supabase, {
        userId: profile.id,
        kind: "coach",
        title: baseTitle,
        subtitle: t("coachStudio.activitySubtitle"),
        tags: ["coach-studio"],
        coachSessionId: data.id,
        metricLabel: t("coachStudio.durationLabel"),
        metricValueText: `${(probe.durationMs / 1000).toFixed(1)}s`,
        metricNumeric: probe.durationMs / 1000,
      }).then(({ error: activityError }) => {
        if (activityError) console.error("Failed to save Coach Studio activity", activityError);
      });

      router.push(`/coach-studio/${data.id}`);
    } catch (err) {
      if (err instanceof CoachVideoTooLongError) setActionError(err.message);
      else setActionError(err instanceof Error ? err.message : t("coachStudio.uploadFailed"));
      setBusy(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ArchiveNavShell activeApp="coach">
      <header className="pt-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[color:var(--foreground)]">
          <Clapperboard size={20} className="text-[var(--accent,#3b82f6)]" />
          {t("coachStudio.title")}
        </h1>
        <p className="mt-1 max-w-md text-sm text-[color:var(--muted-foreground)]">
          {t("coachStudio.subtitle")}
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
      />

      {actionError ? (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">{actionError}</p>
      ) : null}

      {!isAuthenticated ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ border: "1px solid var(--border-secondary)", backgroundColor: "var(--card-bg)" }}
        >
          <p className="text-sm text-[color:var(--foreground)]">{t("coachStudio.signInRequired")}</p>
          <button
            type="button"
            onClick={openSignIn}
            className="mt-4 rounded-lg px-4 py-2.5 text-sm font-medium"
            style={{
              background: "var(--primary-button-bg)",
              color: "var(--primary-button-text)",
              border: "2px solid var(--primary-button-border)",
            }}
          >
            {t("common.signInCreateAccount")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-xl text-xs text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)] disabled:opacity-60"
            style={{
              border: "1.5px dashed var(--border-secondary)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            {busy ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                <span className="text-xs">{t("coachStudio.working")}</span>
              </>
            ) : (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent, #3b82f6) 18%, transparent)",
                  }}
                >
                  <Plus size={18} className="text-[var(--accent,#3b82f6)]" />
                </span>
                <span className="font-medium">{t("coachStudio.newProject")}</span>
                <span className="flex items-center gap-1 text-[10px] text-[color:var(--muted-foreground)]">
                  <Upload size={10} /> {t("coachStudio.maxDurationHint")}
                </span>
              </>
            )}
          </button>

          {loading ? (
            <div className="col-span-full flex items-center gap-2 py-6 text-xs text-[color:var(--muted-foreground)]">
              <Loader2 size={14} className="animate-spin" /> {t("coachStudio.working")}
            </div>
          ) : listError ? (
            <p className="col-span-full text-xs text-red-500">{listError}</p>
          ) : (
            sessions.map((s) => (
              <Link
                key={s.id}
                href={`/coach-studio/${s.id}`}
                className="group flex aspect-[4/5] flex-col overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5"
                style={{
                  border: "1px solid var(--border-secondary)",
                  backgroundColor: "var(--card-bg)",
                }}
              >
                <div className="relative flex-1 overflow-hidden bg-black">
                  {thumbs[s.id] ? (
                    <video
                      src={`${thumbs[s.id]}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Clapperboard size={22} className="text-white/40" />
                    </div>
                  )}
                </div>
                <div className="p-1.5">
                  <div className="truncate text-[11px] font-medium text-[color:var(--foreground)]">
                    {s.title || t("coachStudio.untitledDraft")}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-[color:var(--muted-foreground)]">
                    {s.sourceDurationMs != null ? `${(s.sourceDurationMs / 1000).toFixed(1)}s` : "—"}
                    {s.sourceFps != null ? ` · ${s.sourceFps} fps` : ""}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </ArchiveNavShell>
  );
}
