"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, LayoutDashboard } from "lucide-react";

const DEFAULT_STUDIO_TILE_IMAGE = "/images/sports/studio.jpg";
const DEFAULT_STUDIO_TILE_VIDEO = "/images/sports/studio.mp4";

const OPEN_MOVE_TITLE = "Open Movement Viz";
const OPEN_MOVE_TAG = "Viz";

interface MovaStudioHeroTileProps {
  layout?: "desktop" | "mobile";
  mediaSrc?: string;
  videoSrc?: string;
  onOpen: () => void;
}

export default function MovaStudioHeroTile({
  layout = "desktop",
  mediaSrc = DEFAULT_STUDIO_TILE_IMAGE,
  videoSrc = DEFAULT_STUDIO_TILE_VIDEO,
  onOpen,
}: MovaStudioHeroTileProps) {
  const isDesktop = layout === "desktop";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const showPhoto = Boolean(mediaSrc) && !imageFailed;
  const showVideo = showPhoto && Boolean(videoSrc) && !videoFailed;

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
      className={`mini-app-glass-surface home-tools-sports-tile-hover block h-full min-h-0 w-full cursor-pointer border-0 p-0 text-left${
        showPhoto ? " mini-app-glass-surface--photo mini-app-glass-surface--studio-hero" : ""
      }`}
      style={{
        position: "relative",
        minHeight: isDesktop ? undefined : "12rem",
        height: "100%",
        boxSizing: "border-box",
        border: "none",
        boxShadow: "none",
      }}
      aria-label={`${OPEN_MOVE_TITLE} — record or upload any movement`}
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
            <LayoutDashboard size={12} aria-hidden />
            {OPEN_MOVE_TAG}
          </span>
        ) : (
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "var(--mini-app-glass-tag-bg)",
              color: "var(--mini-app-glass-text)",
            }}
          >
            <LayoutDashboard size={12} aria-hidden />
            {OPEN_MOVE_TAG}
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
              <h2 className="mini-app-glass-photo-studio-title">{OPEN_MOVE_TITLE}</h2>
              <p className="mini-app-glass-photo-studio-description">
                Easily add overlays to your videos to visualize your body's movement!
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
                {OPEN_MOVE_TITLE}
              </h2>
              <p
                style={{
                  marginBottom: "12px",
                  fontSize: "12px",
                  lineHeight: 1.45,
                  color: "var(--mini-app-glass-text-muted)",
                }}
              >
                Record or upload any movement. Motion overlays &amp; export.
              </p>
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
            </>
          )}
        </div>
      </div>
    </button>
  );
}
