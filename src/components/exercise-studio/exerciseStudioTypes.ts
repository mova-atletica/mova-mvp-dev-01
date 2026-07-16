import type { computeAngleSeriesFromOpenMovePoses } from "../../lib/openMoveAngleSeries";

export type ClipSessionStatus = "idle" | "loading" | "processing_video" | "ready" | "error";

export type ClipSession = {
  status: ClipSessionStatus;
  errorMessage?: string;
  videoUrl: string | null;
  videoSources: Array<{ src: string; type: string }> | null;
  poses: unknown[];
  angles: ReturnType<typeof computeAngleSeriesFromOpenMovePoses> | null;
  frameIntervalSec: number | null;
  sessionLabel: string;
  source: "reference" | "upload" | "live";
};

export type ReadyClipSession = ClipSession & {
  status: "ready";
  videoUrl: string;
  poses: unknown[];
  angles: NonNullable<ClipSession["angles"]>;
};

export const emptyClipSession: ClipSession = {
  status: "idle",
  videoUrl: null,
  videoSources: null,
  poses: [],
  angles: null,
  frameIntervalSec: null,
  sessionLabel: "",
  source: "reference",
};

export function isReadyClipSession(session: ClipSession): session is ReadyClipSession {
  return (
    session.status === "ready" &&
    !!session.videoUrl &&
    (session.poses?.length ?? 0) > 0 &&
    session.angles != null
  );
}
