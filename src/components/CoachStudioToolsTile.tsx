"use client";

import { useCallback, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { useTranslations } from "../i18n/LocaleProvider";

const DEFAULT_COACH_TILE_IMAGE = "/images/sports/coach-studio.png";
const DEFAULT_COACH_TILE_VIDEO = "/images/sports/coach-studio-demo.mp4";

interface CoachStudioToolsTileProps {
  onOpen: () => void;
  /** Hero poster image. */
  mediaSrc?: string;
  /** Hover preview video. */
  videoSrc?: string;
  layout?: "desktop" | "mobile";
}

/** Equal-height glass tile under Open Movement Viz in the homepage tools hero. */
export default function CoachStudioToolsTile({
  onOpen,
  mediaSrc = DEFAULT_COACH_TILE_IMAGE,
  videoSrc = DEFAULT_COACH_TILE_VIDEO,
  layout = "desktop",
}: CoachStudioToolsTileProps) {
  const t = useTranslations();
  const isDesktop = layout === "desktop";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const showPhoto = isDesktop && Boolean(mediaSrc) && !imageFailed;
  const showVideo = showPhoto && Boolean(videoSrc) && !videoFailed;
  const mobileSimple = !isDesktop && !showPhoto;

  const playPreview = useCallback(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;
    video.currentTime = 0;
    void video.play().catch(() => {
      setVideoFailed(true);
    });
  }, [showVideo]);

  const pausePreview = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={playPreview}
      onMouseLeave={pausePreview}
      onFocus={playPreview}
      onBlur={pausePreview}
      className={`block h-full min-h-0 w-full cursor-pointer p-0 text-left${
        mobileSimple
          ? " mini-app-glass-surface--mobile-simple"
          : ` mini-app-glass-surface home-tools-sports-tile-hover${
              showPhoto ? " mini-app-glass-surface--photo mini-app-glass-surface--studio-hero border-0" : ""
            }`
      }`}
      style={{
        position: "relative",
        minHeight: isDesktop ? undefined : "12rem",
        height: "100%",
        boxSizing: "border-box",
        ...(showPhoto ? { border: "none", boxShadow: "none" } : {}),
      }}
      aria-label={`${t("coachStudio.title")} — ${t("coachStudio.toolsTileSubtitle")}`}
    >
      {showPhoto && mediaSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaSrc}
          alt=""
          className="mini-app-glass-media mini-app-glass-media-poster"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {showVideo ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="mini-app-glass-media-video"
          muted
          playsInline
          loop
          preload="metadata"
          aria-hidden
          onError={() => setVideoFailed(true)}
        />
      ) : null}
      {showPhoto ? (
        <span className="mini-app-glass-scrim mini-app-glass-photo-scrim mini-app-glass-photo-studio-scrim" aria-hidden />
      ) : null}

      <div
        className={`mini-app-glass-content${
          showPhoto ? " mini-app-glass-photo-studio-content" : " flex h-full flex-col justify-between"
        }`}
        style={{
          padding: "16px 18px",
          boxSizing: "border-box",
          minHeight: "inherit",
        }}
      >
        {showPhoto ? (
          <span className="mini-app-glass-photo-studio-tag">
            <Clapperboard size={12} aria-hidden />
            {t("coachStudio.toolsTileTag")}
          </span>
        ) : (
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide${
              mobileSimple ? " mini-app-glass-mobile-tag" : ""
            }`}
            style={{
              backgroundColor: "var(--mini-app-glass-tag-bg)",
              color: "var(--mini-app-glass-text)",
            }}
          >
            <Clapperboard size={12} aria-hidden />
            {t("coachStudio.toolsTileTag")}
          </span>
        )}

        {showPhoto ? <span aria-hidden style={{ flex: 1, minHeight: "1rem" }} /> : <span aria-hidden style={{ flex: 1 }} />}

        <div>
          {showPhoto ? (
            <>
              <h2 className="mini-app-glass-photo-studio-title">{t("coachStudio.title")}</h2>
              <p className="mini-app-glass-photo-studio-description">
                {t("coachStudio.toolsTileSubtitle")}
              </p>
              <span className="mini-app-glass-photo-studio-cta">{t("coachStudio.toolsTileCta")}</span>
            </>
          ) : (
            <>
              <h2
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                  fontWeight: 300,
                  lineHeight: 1.2,
                  color: "var(--mini-app-glass-text)",
                }}
              >
                {t("coachStudio.title")}
              </h2>
              <p
                style={{
                  marginBottom: "12px",
                  fontSize: "12px",
                  lineHeight: 1.45,
                  color: "var(--mini-app-glass-text-muted)",
                }}
              >
                {t("coachStudio.toolsTileSubtitle")}
              </p>
              <span
                className={`inline-flex w-full items-center justify-center rounded-lg text-xs font-medium${
                  mobileSimple ? " mini-app-glass-mobile-cta" : ""
                }`}
                style={{
                  backgroundColor: "var(--mini-app-glass-cta-bg)",
                  color: "var(--mini-app-glass-cta-text)",
                  padding: "10px 12px",
                }}
              >
                {t("coachStudio.toolsTileCta")}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
