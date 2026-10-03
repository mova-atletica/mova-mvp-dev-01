import React from "react";
import { Composition, staticFile } from "remotion";
import { ProductInUse } from "./ProductInUse";
import { recipeToDefaultProps, RECIPES } from "./defaults";
import type { ProductInUseProps, ResolvedSegment } from "./types";
import { COMP_HEIGHT, COMP_WIDTH, DEFAULT_FPS } from "./types";
import { DEMO_ANGLES } from "./defaults";

/** Resolve local public files only when a non-empty relative path is set. */
function resolvePublicSrc(src: string | undefined): string {
  if (!src?.trim()) return "";
  if (
    src.startsWith("http") ||
    src.startsWith("blob:") ||
    src.startsWith("data:") ||
    src.startsWith("/static-")
  ) {
    return src;
  }
  // Next Partner Player uses absolute site paths like /reels/ui.mp4
  if (src.startsWith("/") && !src.startsWith("/static-")) {
    return src;
  }
  return staticFile(src.replace(/^\//, ""));
}

function withStaticUi(props: ProductInUseProps): ProductInUseProps {
  const segments: ResolvedSegment[] = props.segments.map((s) => ({
    ...s,
    plateUrl: resolvePublicSrc(s.plateUrl),
  }));

  return {
    ...props,
    uiSrc: resolvePublicSrc(props.uiSrc),
    segments,
  };
}

function durationFromProps(props: ProductInUseProps): number {
  const sum = props.segments.reduce(
    (acc, s) => acc + Math.max(1, s.durationInFrames || 0),
    0
  );
  return Math.max(1, sum || 240);
}

export const RemotionRoot: React.FC = () => {
  // Empty plateUrl / uiSrc until real files are dropped in reels/public/
  // (avoids Remotion MediaPlaybackError on missing plate.mp4 / ui.mp4).
  const reel01 = withStaticUi(
    recipeToDefaultProps(
      { ...RECIPES["reel-01"], uiSrc: "" },
      [
        {
          plateUrl: "",
          durationInFrames: 270,
          charts: [{ kind: "jointAngle", joint: "leftKneeAngles" }],
          chart: { kind: "jointAngle", joint: "leftKneeAngles" },
          overlays: "off",
          angles: DEMO_ANGLES,
        },
      ]
    )
  );

  const reel02 = withStaticUi(
    recipeToDefaultProps(
      { ...RECIPES["reel-02"], uiSrc: "" },
      [
        {
          plateUrl: "",
          durationInFrames: 150,
          charts: [{ kind: "jointAngle", joint: "leftKneeAngles" }],
          chart: { kind: "jointAngle", joint: "leftKneeAngles" },
          overlays: "off",
          angles: DEMO_ANGLES,
        },
        {
          plateUrl: "",
          durationInFrames: 150,
          charts: [{ kind: "jointAngle", joint: "trunkAngles" }],
          chart: { kind: "jointAngle", joint: "trunkAngles" },
          overlays: "off",
          angles: DEMO_ANGLES,
        },
      ]
    )
  );

  return (
    <>
      <Composition
        id="ProductInUse"
        component={ProductInUse}
        durationInFrames={durationFromProps(reel01)}
        fps={reel01.fps || DEFAULT_FPS}
        width={COMP_WIDTH}
        height={COMP_HEIGHT}
        defaultProps={reel01}
        calculateMetadata={async ({ props }) => {
          const p = props as ProductInUseProps;
          return {
            durationInFrames: durationFromProps(p),
            fps: p.fps || DEFAULT_FPS,
          };
        }}
      />
      <Composition
        id="ProductInUse-reel-02"
        component={ProductInUse}
        durationInFrames={durationFromProps(reel02)}
        fps={reel02.fps || DEFAULT_FPS}
        width={COMP_WIDTH}
        height={COMP_HEIGHT}
        defaultProps={reel02}
        calculateMetadata={async ({ props }) => {
          const p = props as ProductInUseProps;
          return {
            durationInFrames: durationFromProps(p),
            fps: p.fps || DEFAULT_FPS,
          };
        }}
      />
    </>
  );
};
