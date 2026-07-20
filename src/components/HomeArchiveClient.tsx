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
import HomeToolsHero from "./HomeToolsHero";
import OpenMoveStudioModal from "./open-move/OpenMoveStudioModal";

interface HomeArchiveClientProps {
  children: React.ReactNode;
}

export default function HomeArchiveClient({ children }: HomeArchiveClientProps) {
  useMockTierQueryParam();
  const router = useRouter();
  const { queueLeaderboardSave, requestStudioAccess } = useAccount();
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
      if (!movement) return;
      const app = MINI_APPS.find((a) => a.id === sportSlug);
      if (app) openMiniAppModal(app);
    },
    [openMiniAppModal]
  );

  const handleQuickAnalysisComplete = useCallback(
    (score: LeaderboardScorePayload) => {
      queueLeaderboardSave(score);
    },
    [queueLeaderboardSave]
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
