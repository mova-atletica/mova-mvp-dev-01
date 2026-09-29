import React, { useCallback, useEffect, useState } from "react";
import { AbsoluteFill, type OnVideoFrame } from "remotion";
import { Video } from "@remotion/media";

type Props = {
  src: string;
  /** Mute plate audio (default false — keep plate sound; UI device stays muted separately). */
  muted?: boolean;
  /** Latest decoded frame — used for joint-angle HUD glass sampling. */
  onVideoFrame?: OnVideoFrame;
};

/**
 * Full-bleed 9:16 cover crop.
 * Uses `@remotion/media` Video for Player + web-renderer export compatibility.
 */
export const CoverVideo: React.FC<Props> = ({
  src,
  muted = false,
  onVideoFrame,
}) => {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => {
    setFailed(true);
    return "fail" as const;
  }, []);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(160deg, #0c0c0e 0%, #1a1a1f 50%, #0e1014 100%)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 28,
            textAlign: "center",
            padding: 40,
          }}
        >
          {failed
            ? "Plate video failed to load"
            : "Drop plate.mp4 in reels/public\nor hydrate an activity"}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <Video
        src={src}
        muted={muted}
        objectFit="cover"
        style={{
          width: "100%",
          height: "100%",
        }}
        onVideoFrame={onVideoFrame}
        onError={onError}
      />
    </AbsoluteFill>
  );
};
