"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MiniApp } from "../data/miniApps";
import {
  CyclingBikeIcon,
  FlexibilityStretchIcon,
  PlankSideIcon,
  PullUpBarIcon,
  PushUpIcon,
  SquatIcon,
  type MiniAppSportIcon,
} from "./icons/miniAppSportIcons";
import {
  HOME_TOOLS_SPORTS_TILE,
  MINI_APP_CARD_SIZE,
} from "../lib/archiveLayout";

const SPORT_ICON_SIZE = 44;
const SPORT_ICON_STROKE = 2.5;

const ICON_BY_APP_ID: Record<string, MiniAppSportIcon> = {
  plank: PlankSideIcon,
  squat: SquatIcon,
  flexibility: FlexibilityStretchIcon,
  cycling: CyclingBikeIcon,
  pullups: PullUpBarIcon,
  pushups: PushUpIcon,
};

interface MiniAppIconTileProps {
  app: MiniApp;
  compact?: boolean;
  /** Sports tile in the tools hero grid — icon, title, camera tag. */
  gridCell?: boolean;
  layout?: "desktop" | "mobile";
  /** Opens archive modal instead of navigating (homepage hero). */
  onOpen?: () => void;
}

export default function MiniAppIconTile({
  app,
  compact = false,
  gridCell = false,
  layout = "desktop",
  onOpen,
}: MiniAppIconTileProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = ICON_BY_APP_ID[app.id] ?? FlexibilityStretchIcon;

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
      return;
    }
    router.push(app.href);
  };

  if (gridCell) {
    const isDesktop = layout === "desktop";
    const showPhoto = Boolean(app.tileImage) && !imageFailed;

    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`${app.title} — ${app.tileDescription ?? app.subtitle}`}
        className={`mini-app-glass-surface home-tools-sports-tile-hover${showPhoto ? " mini-app-glass-surface--photo" : ""}`}
        style={{
          width: "100%",
          height: isDesktop ? "100%" : "auto",
          minHeight: isDesktop ? 0 : `${HOME_TOOLS_SPORTS_TILE.height}px`,
          aspectRatio: isDesktop ? undefined : "178 / 181",
          padding: showPhoto ? 0 : "12px 14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        {showPhoto && app.tileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.tileImage}
            alt=""
            className="mini-app-glass-media"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        {showPhoto ? (
          <span className="mini-app-glass-scrim mini-app-glass-photo-scrim" aria-hidden />
        ) : null}

        <span
          className={`mini-app-glass-content${showPhoto ? " mini-app-glass-photo-content" : ""}`}
          style={
            showPhoto
              ? { padding: "12px 14px" }
              : {
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  width: "100%",
                  height: "100%",
                }
          }
        >
          {!showPhoto ? (
            <span className="mini-app-glass-photo-fallback-icon" aria-hidden>
              <Icon size={SPORT_ICON_SIZE} strokeWidth={SPORT_ICON_STROKE} />
            </span>
          ) : null}

          <span style={{ width: "100%" }}>
            {showPhoto ? (
              <>
                <span className="mini-app-glass-photo-title">
                  {app.tileDescription ?? app.title}
                </span>
                <span className="mini-app-glass-photo-badge">{app.badge}</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: 1.25,
                    color: "var(--mini-app-glass-text)",
                    marginBottom: "8px",
                  }}
                >
                  {app.tileDescription ?? app.title}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    lineHeight: 1.3,
                    color: "var(--mini-app-glass-text-muted)",
                    backgroundColor: "var(--mini-app-glass-tag-bg)",
                  }}
                >
                  {app.badge}
                </span>
              </>
            )}
          </span>
        </span>
      </button>
    );
  }

  const tileSize = MINI_APP_CARD_SIZE.width;

  return (
    <button
      type="button"
      onClick={handleOpen}
      title={compact ? app.title : undefined}
      className="group flex flex-col items-center gap-1.5 rounded-lg transition-transform duration-200 hover:scale-[1.03]"
      style={{
        width: `${tileSize}px`,
        flexShrink: 0,
      }}
      aria-label={`${app.title} — ${app.subtitle}`}
    >
      <span
        className="mini-app-glass-surface flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.02]"
        style={{
          width: `${tileSize}px`,
          height: `${MINI_APP_CARD_SIZE.height}px`,
        }}
      >
        <Icon
          size={40}
          strokeWidth={SPORT_ICON_STROKE}
          style={{ color: "var(--mini-app-glass-icon)" }}
          aria-hidden
        />
      </span>
      <span
        className={`line-clamp-2 text-center text-[10px] font-medium leading-tight ${compact ? "home-tools-icon-label" : ""}`}
        style={{ color: "var(--section-subtitle)", maxWidth: `${tileSize}px` }}
      >
        {app.title}
      </span>
    </button>
  );
}
