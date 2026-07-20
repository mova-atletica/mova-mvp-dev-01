"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { poseIndexForTime, type Pose } from "../../../lib/coachStudio/joints";
import { phaseAtSourceMs } from "../../../lib/coachStudio/migrateEditor";
import {
  measureCaptionChip,
  renderCoachOverlay,
} from "../../../lib/coachStudio/renderCoachOverlay";
import type { CoachEditorState, CoachPoint } from "../../../types/coachSession";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CaptionBox {
  kind: "freeze" | "phase";
  ownerId: string;
  captionId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CoachStudioStageProps {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  editor: CoachEditorState;
  poses: Pose[];
  frameIntervalSec: number;
  /** Freeze whose captions/overlays show (playback hold or editor selection). */
  activeFreezeId: string | null;
  sourceTimeMs: number;
  durationMs: number;
  showSkeleton: boolean;
  /** When true, ignore video seek events for playhead (schedule owns time). */
  playbackControlled?: boolean;
  onTimeChange: (ms: number) => void;
  onDurationChange: (ms: number) => void;
  onMoveCaption: (
    target: { kind: "freeze" | "phase"; id: string },
    captionId: string,
    anchor: CoachPoint
  ) => void;
}

export default function CoachStudioStage({
  videoUrl,
  videoRef,
  editor,
  poses,
  frameIntervalSec,
  activeFreezeId,
  sourceTimeMs,
  durationMs,
  showSkeleton,
  playbackControlled = false,
  onTimeChange,
  onDurationChange,
  onMoveCaption,
}: CoachStudioStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionBoxesRef = useRef<CaptionBox[]>([]);
  const draggingRef = useRef<{
    kind: "freeze" | "phase";
    ownerId: string;
    captionId: string;
  } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const recomputeRect = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || !cw || !ch) return;
    const scale = Math.min(cw / vw, ch / vh);
    const width = vw * scale;
    const height = vh * scale;
    setRect({
      left: (cw - width) / 2,
      top: (ch - height) / 2,
      width,
      height,
    });
  }, [videoRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => recomputeRect());
    ro.observe(container);
    return () => ro.disconnect();
  }, [recomputeRect]);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.videoWidth) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const sourceTimeSec = sourceTimeMs / 1000;
          const poseIdx = poseIndexForTime(sourceTimeSec, poses.length, frameIntervalSec);
          const pose = poses[poseIdx] ?? null;
          const prevPose = poseIdx > 0 ? poses[poseIdx - 1] ?? null : null;
          renderCoachOverlay({
            ctx,
            width: canvas.width,
            height: canvas.height,
            editor,
            pose,
            prevPose,
            activeFreezeId,
            sourceTimeMs,
            durationMs,
            showSkeleton,
            scale: 1,
            glassSource: video,
          });
          captionBoxesRef.current = computeCaptionBoxes(
            ctx,
            canvas,
            editor,
            activeFreezeId,
            sourceTimeMs,
            durationMs
          );
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    editor,
    poses,
    frameIntervalSec,
    activeFreezeId,
    sourceTimeMs,
    durationMs,
    showSkeleton,
    videoRef,
  ]);

  const toNormalized = useCallback(
    (clientX: number, clientY: number): CoachPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return null;
      return {
        x: (clientX - bounds.left) / bounds.width,
        y: (clientY - bounds.top) / bounds.height,
      };
    },
    []
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const p = toNormalized(e.clientX, e.clientY);
      if (!p) return;
      const hit = [...captionBoxesRef.current]
        .reverse()
        .find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
      if (hit) {
        draggingRef.current = {
          kind: hit.kind,
          ownerId: hit.ownerId,
          captionId: hit.captionId,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [toNormalized]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const p = toNormalized(e.clientX, e.clientY);
      if (p) onMoveCaption({ kind: drag.kind, id: drag.ownerId }, drag.captionId, p);
    },
    [toNormalized, onMoveCaption]
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (draggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    }
    draggingRef.current = null;
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        playsInline
        muted
        preload="auto"
        onLoadedMetadata={(e) => {
          recomputeRect();
          onDurationChange(Math.round((e.currentTarget.duration || 0) * 1000));
          if (!playbackControlled) {
            onTimeChange(Math.round((e.currentTarget.currentTime || 0) * 1000));
          }
        }}
        onSeeked={(e) => {
          if (!playbackControlled) {
            onTimeChange(Math.round(e.currentTarget.currentTime * 1000));
          }
        }}
        style={
          rect
            ? {
                position: "absolute",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }
            : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }
        }
      />
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="touch-none"
        style={
          rect
            ? {
                position: "absolute",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }
            : { position: "absolute", inset: 0 }
        }
      />
    </div>
  );
}

function computeCaptionBoxes(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  editor: CoachEditorState,
  activeFreezeId: string | null,
  sourceTimeMs: number,
  durationMs: number
): CaptionBox[] {
  const captions =
    activeFreezeId != null
      ? (() => {
          const freeze = editor.freezes.find((f) => f.id === activeFreezeId);
          return freeze
            ? freeze.captions.map((c) => ({
                kind: "freeze" as const,
                ownerId: freeze.id,
                caption: c,
              }))
            : [];
        })()
      : (() => {
          const phase = phaseAtSourceMs(
            editor,
            sourceTimeMs,
            durationMs || sourceTimeMs + 1
          );
          return phase
            ? phase.captions.map((c) => ({
                kind: "phase" as const,
                ownerId: phase.id,
                caption: c,
              }))
            : [];
        })();

  const boxes: CaptionBox[] = [];
  const w = canvas.width;
  const h = canvas.height;
  for (const item of captions) {
    const measured = measureCaptionChip(ctx, item.caption, w, h, 1);
    if (!measured) continue;
    boxes.push({
      kind: item.kind,
      ownerId: item.ownerId,
      captionId: item.caption.id,
      x: (measured.cx - measured.boxW / 2) / w,
      y: (measured.cy - measured.boxH / 2) / h,
      w: measured.boxW / w,
      h: measured.boxH / h,
    });
  }
  return boxes;
}
