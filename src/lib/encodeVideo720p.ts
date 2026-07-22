/**
 * Re-encode a video blob to ~720p for Pro activity storage.
 * Uses canvas + MediaRecorder; falls back to the original blob on failure.
 */
export async function encodeVideoBlobTo720p(
  source: Blob,
  options?: { maxHeight?: number; videoBitsPerSecond?: number }
): Promise<{ blob: Blob; width: number; height: number; durationMs: number }> {
  const maxHeight = options?.maxHeight ?? 720;
  const videoBitsPerSecond = options?.videoBitsPerSecond ?? 1_500_000;
  const objectUrl = URL.createObjectURL(source);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video for encode"));
    });

    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    const durationMs = Math.max(1, Math.round((video.duration || 0) * 1000));

    const scale = srcH > maxHeight ? maxHeight / srcH : 1;
    const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    // Already ≤720p and not huge — skip re-encode when under ~8MB.
    if (scale >= 1 && source.size < 8 * 1024 * 1024) {
      return { blob: source, width: srcW, height: srcH, durationMs };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { blob: source, width: srcW, height: srcH, durationMs };
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : "";

    if (!mimeType) {
      return { blob: source, width: srcW, height: srcH, durationMs };
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.onerror = () => reject(new Error("MediaRecorder failed during 720p encode"));
    });

    recorder.start(250);
    video.currentTime = 0;
    await video.play();

    let raf = 0;
    const draw = () => {
      if (video.ended || video.paused) {
        cancelAnimationFrame(raf);
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }
      ctx.drawImage(video, 0, 0, width, height);
      raf = requestAnimationFrame(draw);
    };
    draw();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });
    cancelAnimationFrame(raf);
    if (recorder.state !== "inactive") recorder.stop();

    const blob = await done;
    return { blob, width, height, durationMs };
  } catch (err) {
    console.warn("720p encode failed; uploading original", err);
    return {
      blob: source,
      width: 0,
      height: 0,
      durationMs: 0,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function fetchBlobFromUrl(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}
