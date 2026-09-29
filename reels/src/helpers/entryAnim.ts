import { Easing, interpolate } from "remotion";
import type { EntryPreset } from "../types";
import { COMP_HEIGHT, COMP_WIDTH, SAFE_X_MAX, SAFE_X_MIN, SAFE_Y_MAX, SAFE_Y_MIN } from "../types";

const ease = Easing.out(Easing.cubic);

export type EntryAnimResult = {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleMul: number;
};

/**
 * Before uiStartFrame: hidden.
 * During anim: ease into parked pose.
 * After: hold at rest.
 */
export function computeEntryAnim(opts: {
  frame: number;
  uiStartFrame: number;
  uiAnimDurationFrames: number;
  entry: EntryPreset;
  parkX: number;
  parkY: number;
  parkScale: number;
}): EntryAnimResult & { left: number; top: number; scale: number } {
  const {
    frame,
    uiStartFrame,
    uiAnimDurationFrames,
    entry,
    parkX,
    parkY,
    parkScale,
  } = opts;

  const x = Math.min(Math.max(parkX, SAFE_X_MIN), SAFE_X_MAX);
  const y = Math.min(Math.max(parkY, SAFE_Y_MIN), SAFE_Y_MAX);
  const left = x * COMP_WIDTH;
  const top = y * COMP_HEIGHT;

  if (frame < uiStartFrame) {
    return {
      opacity: 0,
      translateX: 0,
      translateY: 0,
      scaleMul: 1,
      left,
      top,
      scale: parkScale,
    };
  }

  const t = Math.min(
    1,
    Math.max(0, (frame - uiStartFrame) / Math.max(1, uiAnimDurationFrames))
  );
  const p = ease(t);

  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scaleMul = 1;

  switch (entry) {
    case "fade":
      opacity = interpolate(p, [0, 1], [0, 1]);
      break;
    case "bottom":
      opacity = interpolate(p, [0, 1], [0, 1]);
      translateY = interpolate(p, [0, 1], [COMP_HEIGHT * 0.35, 0]);
      break;
    case "side":
      opacity = interpolate(p, [0, 1], [0, 1]);
      translateX = interpolate(p, [0, 1], [COMP_WIDTH * 0.4, 0]);
      break;
    case "sideLeft":
      opacity = interpolate(p, [0, 1], [0, 1]);
      translateX = interpolate(p, [0, 1], [-COMP_WIDTH * 0.4, 0]);
      break;
    case "scale":
      opacity = interpolate(p, [0, 1], [0, 1]);
      scaleMul = interpolate(p, [0, 1], [0.55, 1]);
      break;
  }

  return {
    opacity,
    translateX,
    translateY,
    scaleMul,
    left,
    top,
    scale: parkScale * scaleMul,
  };
}
