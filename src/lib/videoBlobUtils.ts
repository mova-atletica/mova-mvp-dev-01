/** Video blob helpers for activity session uploads (stored at source quality). */

export async function fetchBlobFromUrl(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** Read duration from a video blob without re-encoding. */
export async function getVideoBlobDurationMs(blob: Blob): Promise<number | null> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to read video metadata"));
    });
    const ms = Math.round((video.duration || 0) * 1000);
    return ms > 0 ? ms : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
