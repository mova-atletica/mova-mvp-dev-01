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
import HomeLeaderboardBlock from "./HomeLeaderboardBlock";
import MovaStudioHeroTile from "./MovaStudioHeroTile";

interface HomeToolsHeroProps {
  hasStudio: boolean;
  onOpenStudio: () => void;
  onTrySport: (sportSlug: string) => void;
}

export default function HomeToolsHero({ hasStudio, onOpenStudio, onTrySport }: HomeToolsHeroProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!hasStudio) {
    return null;
  }

  const rowStyle: CSSProperties = isDesktop
    ? {
        display: "grid",
        width: "100%",
        gridTemplateColumns: `${HOME_TOOLS_HERO_STUDIO_FR}fr ${HOME_TOOLS_HERO_LEADERBOARD_FR}fr`,
        gap: `${HOME_TOOLS_HERO_GAP.row}px`,
        aspectRatio: `${
          HOME_TOOLS_HERO_STUDIO_FR + HOME_TOOLS_HERO_GAP.row + HOME_TOOLS_HERO_LEADERBOARD_FR
        } / ${HOME_TOOLS_STUDIO_TILE.height}`,
        alignItems: "stretch",
      }
    : {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: "12px",
        width: "100%",
      };

  const studioColumnStyle: CSSProperties = isDesktop
    ? {
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        display: "flex",
      }
    : { width: "100%" };

  const leaderboardColumnStyle: CSSProperties = isDesktop
    ? {
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }
    : { width: "100%", minHeight: "min(52vh, 420px)" };

  return (
    <section
      className={ARCHIVE_HERO_SECTION_CLASS}
      style={HOME_TOOLS_HERO_LAYOUT_STYLE}
      aria-label="Archive tools"
    >
      <div style={rowStyle} aria-label="Studio and leaderboards">
        <div style={studioColumnStyle}>
          <MovaStudioHeroTile
            onOpen={onOpenStudio}
            mediaSrc={MOVA_STUDIO_MINI_APP.tileImage}
            videoSrc={MOVA_STUDIO_MINI_APP.tileVideo}
            layout={isDesktop ? "desktop" : "mobile"}
          />
        </div>
        <div style={leaderboardColumnStyle}>
          <HomeLeaderboardBlock variant="hero" onTrySport={onTrySport} />
        </div>
      </div>
    </section>
  );
}
