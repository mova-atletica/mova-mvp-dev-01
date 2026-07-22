"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MiniApp } from "../data/miniApps";
import { MINI_APPS, MOVA_STUDIO_MINI_APP } from "../data/miniApps";
import { getQuickAnalysisBySlug } from "../data/quickAnalysisMovements";
import { useMockTierQueryParam, useAccount } from "../contexts/MockAuthContext";
import type { LeaderboardScorePayload } from "../types/account";
import {
  openMoveModalTargetFromMiniApp,
  type OpenMoveStudioModalTarget,
} from "../types/openMoveStudioModal";
import {
  activityKindForMiniApp,
  activitySubtitleForScore,
  activityTitleForScore,
  metricsFromLeaderboardScore,
} from "../lib/activityFromScore";
import {
  createActivitySession,
  updateActivitySessionVideo,
  uploadActivityVideo,
} from "../lib/activitySessions";
import { encodeVideoBlobTo720p, fetchBlobFromUrl } from "../lib/encodeVideo720p";
import { createClient } from "../lib/supabase/client";
import HomeToolsHero from "./HomeToolsHero";
import OpenMoveStudioModal from "./open-move/OpenMoveStudioModal";

interface HomeArchiveClientProps {
  children: React.ReactNode;
}

export default function HomeArchiveClient({ children }: HomeArchiveClientProps) {
  useMockTierQueryParam();
  const router = useRouter();
  const {
    queueLeaderboardSave,
    requestStudioAccess,
    isAuthenticated,
    profile,
    hasProAccess,
  } = useAccount();
  const [modalTarget, setModalTarget] = useState<OpenMoveStudioModalTarget | null>(null);
  const modalOpen = modalTarget !== null;

  const openStudioModal = useCallback(() => {
    requestStudioAccess(() => {
      setModalTarget({ type: "studio" });
    });
  }, [requestStudioAccess]);

  const openCoachStudio = useCallback(() => {
    requestStudioAccess(() => {
      router.push("/coach-studio");
    });
  }, [requestStudioAccess, router]);

  const openMiniAppModal = useCallback((app: MiniApp) => {
    const target = openMoveModalTargetFromMiniApp(app);
    if (target) setModalTarget(target);
  }, []);

  const openSportBySlug = useCallback(
    (sportSlug: string) => {
      const movement = getQuickAnalysisBySlug(sportSlug);
      if (!movement || movement.featured === false) return;
      const app = MINI_APPS.find((a) => a.id === sportSlug);
      if (app) openMiniAppModal(app);
    },
    [openMiniAppModal]
  );

  const handleQuickAnalysisComplete = useCallback(
    (score: LeaderboardScorePayload, meta?: { videoUrl?: string | null }) => {
      queueLeaderboardSave(score);

      if (!isAuthenticated || !profile) return;

      const supabase = createClient();
      void (async () => {
        const { data: activity, error } = await createActivitySession(supabase, {
          userId: profile.id,
          kind: activityKindForMiniApp(),
          title: activityTitleForScore(score),
          subtitle: activitySubtitleForScore(score),
          sportSlug: score.sportSlug,
          tags: [score.sportSlug],
          metricLabel: score.metricLabel,
          metricValueText: score.formattedScore,
          metricNumeric: score.metricValue,
          metrics: metricsFromLeaderboardScore(score),
        });

        if (error || !activity) {
          console.error("Failed to save activity session", error);
          return;
        }

        if (!hasProAccess || !meta?.videoUrl) return;

        try {
          const raw = await fetchBlobFromUrl(meta.videoUrl);
          if (!raw) return;
          const encoded = await encodeVideoBlobTo720p(raw);
          const contentType = encoded.blob.type || "video/webm";
          const extension = contentType.includes("mp4") ? "mp4" : "webm";
          const { path, error: uploadError } = await uploadActivityVideo(supabase, {
            userId: profile.id,
            sessionId: activity.id,
            file: encoded.blob,
            contentType,
            extension,
          });
          if (uploadError || !path) {
            console.error("Failed to upload activity video", uploadError);
            return;
          }
          await updateActivitySessionVideo(supabase, activity.id, {
            videoPath: path,
            videoDurationMs: encoded.durationMs || null,
          });
        } catch (err) {
          console.error("Pro video save failed", err);
        }
      })();
    },
    [queueLeaderboardSave, isAuthenticated, profile, hasProAccess]
  );

  return (
    <>
      <HomeToolsHero
        hasStudio={MINI_APPS.some((app) => app.id === MOVA_STUDIO_MINI_APP.id)}
        onOpenStudio={openStudioModal}
        onOpenCoachStudio={openCoachStudio}
        onTrySport={openSportBySlug}
      />

      {children}

      <OpenMoveStudioModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) setModalTarget(null);
        }}
        target={modalTarget}
        onQuickAnalysisComplete={handleQuickAnalysisComplete}
      />
    </>
  );
}
