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

export type VideoUploadFormat = {
  contentType: string;
  extension: string;
};

/**
 * Prefer original container: MOV / MP4 / WebM from blob type or filename.
 * Defaults to MP4 (iOS-safe) when unknown — not WebM.
 */
export function videoUploadFormatForBlob(
  blob: Blob,
  fileNameHint?: string | null
): VideoUploadFormat {
  const type = (blob.type || "").toLowerCase();
  const name =
    (blob instanceof File ? blob.name : null) || fileNameHint || "";

  if (type.includes("quicktime") || /\.mov$/i.test(name)) {
    return { contentType: type || "video/quicktime", extension: "mov" };
  }
  if (type.includes("mp4") || type.includes("m4v") || /\.(mp4|m4v)$/i.test(name)) {
    return { contentType: type.includes("m4v") ? type : type || "video/mp4", extension: "mp4" };
  }
  if (type.includes("webm") || /\.webm$/i.test(name)) {
    return { contentType: type || "video/webm", extension: "webm" };
  }

  return { contentType: type || "video/mp4", extension: "mp4" };
}

/** Prefer in-memory blob (upload/live); fall back to fetching videoUrl. */
export async function resolveVideoBlobForUpload(opts: {
  videoBlob?: Blob | null;
  videoUrl?: string | null;
}): Promise<Blob | null> {
  if (opts.videoBlob && opts.videoBlob.size > 0) return opts.videoBlob;
  if (opts.videoUrl) return fetchBlobFromUrl(opts.videoUrl);
  return null;
}

/** MP4-first MediaRecorder mime (iOS-safe); WebM only as fallback. */
export function pickLiveRecordingMimeType(): { mimeType: string; extension: "mp4" | "webm" } {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "video/webm", extension: "webm" };
  }
  if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2")) {
    return { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" };
  }
  if (MediaRecorder.isTypeSupported("video/mp4;codecs=h264")) {
    return { mimeType: "video/mp4;codecs=h264", extension: "mp4" };
  }
  if (MediaRecorder.isTypeSupported("video/mp4")) {
    return { mimeType: "video/mp4", extension: "mp4" };
  }
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return { mimeType: "video/webm;codecs=vp9", extension: "webm" };
  }
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    return { mimeType: "video/webm;codecs=vp8", extension: "webm" };
  }
  if (MediaRecorder.isTypeSupported("video/webm")) {
    return { mimeType: "video/webm", extension: "webm" };
  }
  return { mimeType: "video/webm", extension: "webm" };
}
