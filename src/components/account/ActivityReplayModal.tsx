"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import type { AccountActivityItem } from "../../types/accountActivity";
import type { OpenMoveAngleSeries } from "../../lib/openMoveAngleSeries";
import type {
  PlankAnalysisResult,
  PullUpsAnalysisResult,
  SquatAnalysisResult,
  SportAnalysisKind,
} from "../../lib/sportAnalysis";
import {
  createSignedActivityVideoUrl,
  fetchActivityPosesJson,
} from "../../lib/activitySessions";
import { createClient } from "../../lib/supabase/client";
import MotionAnalysisPanel from "../../app/motion-explore/MotionAnalysisPanel";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

interface ActivityReplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: AccountActivityItem | null;
}

function stubPoses(length: number): any[] {
  return Array.from({ length }, () => ({ keypoints: [] }));
}

export default function ActivityReplayModal({
  open,
  onOpenChange,
  activity,
}: ActivityReplayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [poses, setPoses] = useState<any[]>([]);
  const [angles, setAngles] = useState<OpenMoveAngleSeries | null>(null);
  const [frameIntervalSec, setFrameIntervalSec] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !activity) {
      setVideoUrl(null);
      setPoses([]);
      setAngles(null);
      setFrameIntervalSec(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    void (async () => {
      try {
        const nextAngles = activity.angles ?? null;
        setAngles(nextAngles);
        setFrameIntervalSec(activity.frameIntervalSec ?? null);

        let nextPoses: any[] = [];
        if (activity.posesPath) {
          const loaded = await fetchActivityPosesJson(supabase, activity.posesPath);
          if (loaded.error) {
            console.warn(loaded.error);
          } else {
            nextPoses = loaded.poses;
            if (loaded.frameIntervalSec != null) {
              setFrameIntervalSec(loaded.frameIntervalSec);
            }
          }
        }
        if (!nextPoses.length && nextAngles?.leftKneeAngles?.length) {
          nextPoses = stubPoses(nextAngles.leftKneeAngles.length);
        }
        if (!cancelled) setPoses(nextPoses);

        if (activity.videoPath) {
          const { url, error: signError } = await createSignedActivityVideoUrl(
            supabase,
            activity.videoPath
          );
          if (!cancelled) {
            if (signError) console.warn(signError);
            setVideoUrl(url);
          }
        } else if (!cancelled) {
          setVideoUrl(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, activity]);

  const sportKind = (activity?.sportAnalysisKind ?? activity?.sportSlug ?? null) as
    | SportAnalysisKind
    | null;

  const sportProps = useMemo(() => {
    if (!activity?.sportAnalysis || !sportKind) {
      return { enableSportAnalysisTab: false as const };
    }
    const result = activity.sportAnalysis;
    if (sportKind === "plank") {
      return {
        enableSportAnalysisTab: true as const,
        sportAnalysisKind: "plank" as const,
        plankAnalysisResult: result as PlankAnalysisResult,
      };
    }
    if (sportKind === "squat") {
      return {
        enableSportAnalysisTab: true as const,
        sportAnalysisKind: "squat" as const,
        squatAnalysisResult: result as SquatAnalysisResult,
      };
    }
    if (sportKind === "pullups") {
      return {
        enableSportAnalysisTab: true as const,
        sportAnalysisKind: "pullups" as const,
        pullUpsAnalysisResult: result as PullUpsAnalysisResult,
      };
    }
    return { enableSportAnalysisTab: false as const };
  }, [activity, sportKind]);

  const hasAnalysis = Boolean(angles && poses.length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[280] bg-black/70" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed inset-0 z-[290] flex flex-col overflow-hidden bg-[var(--background)] shadow-2xl md:inset-[4vh_4vw] md:rounded-xl"
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-secondary)" }}
          >
            <div className="min-w-0">
              <Dialog.Title className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                {activity?.title ?? "Session"}
              </Dialog.Title>
              <Dialog.Description className="truncate text-xs text-[color:var(--muted-foreground)]">
                {activity?.subtitle ?? "Saved analysis"}
                {!activity?.videoPath ? " · Video available on Pro" : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="relative flex min-h-[40vh] flex-1 items-center justify-center bg-[var(--background)] md:min-h-0">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-[color:var(--muted-foreground)]" />
              ) : videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="max-w-xs px-6 text-center text-sm text-[color:var(--muted-foreground)]">
                  No video for this session. Analysis charts are still available
                  {activity?.kind === "mini-app" ? " on the right" : ""}.
                </p>
              )}
            </div>

            <div
              className="flex min-h-0 w-full flex-col overflow-hidden md:w-[min(28rem,40vw)]"
              style={{ borderLeft: "1px solid var(--border-secondary)" }}
            >
              {error ? (
                <p className="p-4 text-sm text-red-500">{error}</p>
              ) : loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[color:var(--muted-foreground)]" />
                </div>
              ) : hasAnalysis && angles ? (
                <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto p-2">
                  <MotionAnalysisPanel
                    poses={poses}
                    angles={angles}
                    videoUrl={videoUrl ?? ""}
                    frameIntervalSec={frameIntervalSec}
                    syncPlaybackFrame={Boolean(videoUrl)}
                    {...sportProps}
                  />
                </div>
              ) : (
                <p className="p-4 text-sm text-[color:var(--muted-foreground)]">
                  No analysis payload stored for this session.
                </p>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
