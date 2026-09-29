import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type Props = {
  text: string;
  startFrame: number;
  durationFrames?: number;
};

export const CtaOverlay: React.FC<Props> = ({
  text,
  startFrame,
  durationFrames = 45,
}) => {
  const frame = useCurrentFrame();
  if (!text || frame < startFrame) return null;

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + Math.min(12, durationFrames)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 120,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          maxWidth: "78%",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: 0.3,
          color: "#fafafa",
          textShadow: "0 2px 16px rgba(0,0,0,0.65)",
          padding: "14px 22px",
          borderRadius: 14,
          background: "rgba(10,10,12,0.45)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(10px)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
