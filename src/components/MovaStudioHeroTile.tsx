"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, LayoutDashboard } from "lucide-react";

const DEFAULT_STUDIO_TILE_IMAGE = "/images/sports/studio.jpg";
const DEFAULT_STUDIO_TILE_VIDEO = "/images/sports/studio.mp4";

const MOTION_STUDIO_TITLE = "Motion Studio";
const MOTION_STUDIO_TAG = "Studio";

interface MovaStudioHeroTileProps {
  layout?: "desktop" | "mobile";
  mediaSrc?: string;
  videoSrc?: string;
  isAuthenticated?: boolean;
  onOpen: () => void;
}

export default function MovaStudioHeroTile({
  layout = "desktop",
  mediaSrc = DEFAULT_STUDIO_TILE_IMAGE,
  videoSrc = DEFAULT_STUDIO_TILE_VIDEO,
  isAuthenticated = false,
  onOpen,
}: MovaStudioHeroTileProps) {
  const isDesktop = layout === "desktop";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const showPhoto = isDesktop && Boolean(mediaSrc) && !imageFailed;
  const showVideo = showPhoto && Boolean(videoSrc) && !videoFailed;
  const mobileSimple = !isDesktop && !showPhoto;
  const mobileAriaLabel = isAuthenticated
    ? `${MOTION_STUDIO_TITLE} — available on desktop`
    : `${MOTION_STUDIO_TITLE} — create a free account for desktop analysis`;

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
      aria-label={
        mobileSimple
          ? mobileAriaLabel
          : `${MOTION_STUDIO_TITLE} — record or upload any movement`
      }
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
          padding: "18px 18px",
          boxSizing: "border-box",
          minHeight: "inherit",
        }}
      >
        {showPhoto ? (
          <span className="mini-app-glass-photo-studio-tag">
            <LayoutDashboard size={12} aria-hidden />
            {MOTION_STUDIO_TAG}
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
            <LayoutDashboard size={12} aria-hidden />
            {MOTION_STUDIO_TAG}
          </span>
        )}

        {showPhoto ? (
          <span aria-hidden style={{ flex: 1, minHeight: "1rem" }} />
        ) : (
          <span aria-hidden style={{ flex: 1 }} />
        )}

        <div>
          {showPhoto ? (
            <>
              <h2 className="mini-app-glass-photo-studio-title">{MOTION_STUDIO_TITLE}</h2>
              <p className="mini-app-glass-photo-studio-description">
              Upload a video. Add overlays to vizualize your form. Export &amp; share.
              </p>
              <span className="mini-app-glass-photo-studio-cta gap-2">
                <Camera size={14} aria-hidden />
                Open
              </span>
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
                {MOTION_STUDIO_TITLE}
              </h2>
              <p
                style={{
                  marginBottom: "12px",
                  fontSize: "12px",
                  lineHeight: 1.45,
                  color: "var(--mini-app-glass-text-muted)",
                }}
              >
                {mobileSimple
                  ? "Full video analysis on desktop. Overlays, export & share."
                  : "Upload a video. Add overlays to vizualize your form. Export & share."}
              </p>
              {mobileSimple ? (
                <span
                  className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-center text-xs font-semibold tracking-wide"
                  style={{
                    background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
                    color: "var(--mini-app-glass-text)",
                    border: "1px solid var(--border-secondary)",
                  }}
                >
                  {isAuthenticated ? "Available on desktop" : "Create free account"}
                </span>
              ) : (
                <span
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: "var(--mini-app-glass-cta-bg)",
                    color: "var(--mini-app-glass-cta-text)",
                    padding: "12px 12px",
                  }}
                >
                  <Camera size={14} aria-hidden />
                  Open
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}
