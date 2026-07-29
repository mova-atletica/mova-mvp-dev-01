"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MiniApp } from "../data/miniApps";
import { MINI_APPS, MOVA_STUDIO_MINI_APP } from "../data/miniApps";
import { getQuickAnalysisBySlug } from "../data/quickAnalysisMovements";
import { useMockTierQueryParam, useAccount } from "../contexts/MockAuthContext";
import type { LeaderboardScorePayload } from "../types/account";
import type { ActivityPersistAnalysisMeta } from "../lib/activityPersistMeta";
import {
  openMoveModalTargetFromMiniApp,
  type OpenMoveStudioModalTarget,
} from "../types/openMoveStudioModal";
import {
  persistMiniAppActivitySession,
  persistOpenMoveStudioActivitySession,
} from "../lib/persistActivitySession";
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
    requestStudioAccess,
    isAuthenticated,
    profile,
    hasProAccess,
    hasCoachAccess,
  } = useAccount();
  const [modalTarget, setModalTarget] = useState<OpenMoveStudioModalTarget | null>(null);
  const modalOpen = modalTarget !== null;

  const openStudioModal = useCallback(() => {
    requestStudioAccess(() => {
      setModalTarget({ type: "studio" });
    });
  }, [requestStudioAccess]);

  const openCoachStudio = useCallback(() => {
    if (!hasCoachAccess) return;
    router.push("/coach-studio");
  }, [hasCoachAccess, router]);

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
    (score: LeaderboardScorePayload, meta?: ActivityPersistAnalysisMeta) => {
      // Leaderboard post is offered on the Studio left rail (not an auto modal).
      if (!isAuthenticated || !profile) return;

      const supabase = createClient();
      void persistMiniAppActivitySession(supabase, {
        userId: profile.id,
        score,
        meta,
        hasProAccess,
      }).then(({ error }) => {
        if (error) console.error("Failed to save activity session", error);
      });
    },
    [isAuthenticated, profile, hasProAccess]
  );

  const handleStudioSessionPersist = useCallback(
    async (meta: ActivityPersistAnalysisMeta) => {
      if (!isAuthenticated || !profile) {
        return { activityId: null, error: "Not signed in" };
      }
      const supabase = createClient();
      const result = await persistOpenMoveStudioActivitySession(supabase, {
        userId: profile.id,
        meta,
        hasProAccess,
      });
      if (result.error) {
        console.error("Failed to save Open Movement Viz session", result.error);
      }
      return result;
    },
    [isAuthenticated, profile, hasProAccess]
  );

  return (
    <>
      <HomeToolsHero
        hasStudio={MINI_APPS.some((app) => app.id === MOVA_STUDIO_MINI_APP.id)}
        showCoachStudio={hasCoachAccess}
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
        onStudioSessionPersist={handleStudioSessionPersist}
      />
    </>
  );
}
