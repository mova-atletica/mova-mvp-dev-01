export type OpenMoveSessionSnapshot = {
  status: "idle" | "loading_sample" | "clip_ready" | "processing_video" | "ready" | "error";
  source: "featured" | "upload" | "live";
};

/** True when closing would discard user-uploaded or analyzed work. */
export function openMoveSessionHasActiveWork(
  session: OpenMoveSessionSnapshot,
  isQuickAnalysis: boolean
): boolean {
  if (session.status === "processing_video") return true;
  if (session.status === "clip_ready") return true;
  if (session.status === "ready") {
    if (isQuickAnalysis) return true;
    if (session.source === "upload" || session.source === "live") return true;
  }
  return false;
}
