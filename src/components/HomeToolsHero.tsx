"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { MOVA_STUDIO_MINI_APP } from "../data/miniApps";
import {
  ARCHIVE_HERO_SECTION_CLASS,
  HOME_TOOLS_HERO_GAP,
  HOME_TOOLS_HERO_LAYOUT_STYLE,
  HOME_TOOLS_HERO_LEADERBOARD_FR,
  HOME_TOOLS_HERO_STUDIO_FR,
  HOME_TOOLS_STUDIO_TILE,
} from "../lib/archiveLayout";
import CoachStudioToolsTile from "./CoachStudioToolsTile";
import HomeLeaderboardBlock from "./HomeLeaderboardBlock";
import MobileDesktopBrowseBanner from "./MobileDesktopBrowseBanner";
import MobileDesktopInterstitial, {
  type MobileDesktopInterstitialKind,
} from "./MobileDesktopInterstitial";
import MovaStudioHeroTile from "./MovaStudioHeroTile";

interface HomeToolsHeroProps {
  hasStudio: boolean;
  showCoachStudio: boolean;
  isAuthenticated: boolean;
  onOpenStudio: () => void;
  onOpenCoachStudio: () => void;
  onTrySport: (sportSlug: string) => void;
  onCreateAccount: () => void;
}

export default function HomeToolsHero({
  hasStudio,
  showCoachStudio,
  isAuthenticated,
  onOpenStudio,
  onOpenCoachStudio,
  onTrySport,
  onCreateAccount,
}: HomeToolsHeroProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [viewportResolved, setViewportResolved] = useState(false);
  const [interstitial, setInterstitial] = useState<MobileDesktopInterstitialKind | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setIsDesktop(mq.matches);
      setViewportResolved(true);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!hasStudio) {
    return null;
  }

  // Column height ≈ two equal tiles (each ~half of original studio tile) + gap.
  // When Coach is hidden, Open Move still uses the full stacked column height.
  const stackedColumnHeight =
    HOME_TOOLS_STUDIO_TILE.height + HOME_TOOLS_HERO_GAP.row;

  const rowStyle: CSSProperties = isDesktop
    ? {
        display: "grid",
        width: "100%",
        gridTemplateColumns: `${HOME_TOOLS_HERO_STUDIO_FR}fr ${HOME_TOOLS_HERO_LEADERBOARD_FR}fr`,
        gap: `${HOME_TOOLS_HERO_GAP.row}px`,
        aspectRatio: `${
          HOME_TOOLS_HERO_STUDIO_FR + HOME_TOOLS_HERO_GAP.row + HOME_TOOLS_HERO_LEADERBOARD_FR
        } / ${stackedColumnHeight}`,
        alignItems: "stretch",
      }
    : {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: `${HOME_TOOLS_HERO_GAP.mobileRow}px`,
        width: "100%",
      };

  const studioColumnStyle: CSSProperties = isDesktop
    ? showCoachStudio
      ? {
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "1fr 1fr",
          gap: `${HOME_TOOLS_HERO_GAP.row}px`,
        }
      : {
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }
    : showCoachStudio
      ? {
          width: "100%",
          display: "grid",
          gridTemplateRows: "1fr 1fr",
          gap: "12px",
          minHeight: "28rem",
        }
      : {
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: "14rem",
        };

  const leaderboardColumnStyle: CSSProperties = isDesktop
    ? {
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }
    : { width: "100%", minHeight: "min(52vh, 420px)" };

  const tileSlotStyle: CSSProperties = {
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    flex: showCoachStudio ? undefined : 1,
  };

  const handleStudioOpen = () => {
    if (!viewportResolved || isDesktop) {
      onOpenStudio();
      return;
    }
    setInterstitial("studio");
  };

  const handleCoachOpen = () => {
    if (!viewportResolved || isDesktop) {
      onOpenCoachStudio();
      return;
    }
    setInterstitial("coach");
  };

  return (
    <section
      className={ARCHIVE_HERO_SECTION_CLASS}
      style={HOME_TOOLS_HERO_LAYOUT_STYLE}
      aria-label="Archive tools"
    >
      <header className="mb-5 sm:mb-6">
        <p
          className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]"
        >
          Mova Atlética
        </p>
        <h1
          className="text-xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-xl md:text-xl"
          style={{ fontFamily: "var(--font-roboto-mono), ui-monospace, monospace" }}
        >
          See. Analyze. Understand.
        </h1>
      </header>

      {viewportResolved && !isDesktop ? (
        <MobileDesktopBrowseBanner
          isAuthenticated={isAuthenticated}
          onCreateAccount={onCreateAccount}
        />
      ) : null}

      <div style={rowStyle} aria-label="Studio and leaderboards">
        <div style={studioColumnStyle}>
          <div style={tileSlotStyle}>
            <MovaStudioHeroTile
              onOpen={handleStudioOpen}
              mediaSrc={MOVA_STUDIO_MINI_APP.tileImage}
              videoSrc={MOVA_STUDIO_MINI_APP.tileVideo}
              layout={isDesktop ? "desktop" : "mobile"}
              isAuthenticated={isAuthenticated}
            />
          </div>
          {showCoachStudio ? (
            <div style={tileSlotStyle}>
              <CoachStudioToolsTile
                onOpen={handleCoachOpen}
                layout={isDesktop ? "desktop" : "mobile"}
              />
            </div>
          ) : null}
        </div>
        <div style={leaderboardColumnStyle}>
          <HomeLeaderboardBlock
            variant="hero"
            onTrySport={onTrySport}
            analysisCtaMode={viewportResolved && !isDesktop ? "desktop-gate" : "open"}
            isAuthenticated={isAuthenticated}
            onRequestAccount={onCreateAccount}
          />
        </div>
      </div>

      <MobileDesktopInterstitial
        open={interstitial !== null}
        onOpenChange={(open) => {
          if (!open) setInterstitial(null);
        }}
        kind={interstitial ?? "studio"}
        isAuthenticated={isAuthenticated}
        onCreateAccount={onCreateAccount}
      />
    </section>
  );
}
