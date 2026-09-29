import React, { useCallback, useEffect, useState } from "react";
import { Video } from "@remotion/media";

export type GlassDeviceFrameProps = {
  uiSrc: string;
  width: number;
  height: number;
  borderRadius: number;
  glassBorderOpacity?: number;
  glassShadow?: number;
  style?: React.CSSProperties;
};

function Placeholder({ label }: { label: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(20,20,24,0.85)",
        color: "rgba(255,255,255,0.55)",
        fontSize: 22,
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: 16,
      }}
    >
      {label}
    </div>
  );
}

/**
 * Vertical rounded device frame — clean muted UI screen (no frost wash).
 * HUD glass knobs live on joint-angle chips / chart, not here.
 */
export const GlassDeviceFrame: React.FC<GlassDeviceFrameProps> = ({
  uiSrc,
  width,
  height,
  borderRadius,
  glassBorderOpacity = 0.25,
  glassShadow = 28,
  style,
}) => {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => {
    setFailed(true);
    return "fail" as const;
  }, []);

  useEffect(() => {
    setFailed(false);
  }, [uiSrc]);

  const border = `1px solid rgba(255,255,255,${glassBorderOpacity})`;
  const showVideo = Boolean(uiSrc) && !failed;

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        borderRadius,
        overflow: "hidden",
        border,
        boxShadow: `0 ${glassShadow * 0.35}px ${glassShadow}px rgba(0,0,0,0.45)`,
        background: "#0a0a0c",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {showVideo ? (
          <Video
            src={uiSrc}
            muted
            objectFit="cover"
            style={{
              width: "100%",
              height: "100%",
              objectPosition: "center top",
            }}
            onError={onError}
          />
        ) : (
          <Placeholder
            label={
              failed
                ? "UI video failed to load"
                : "Drop ui.mp4 in public/reels (Next) or reels/public (Studio)"
            }
          />
        )}
      </div>
    </div>
  );
};
