/**
 * Shared MoveNet video processing (same sampling as Open Move Studio).
 * Used by open-move-v2 when reference keypoints are missing.
 */
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";

/** Seconds between pose samples when scanning video (must match `processVideoUrlForPoses`). */
export function getPoseSamplingFrameIntervalSec(): number {
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  return isMobile ? 0.2 : 0.1;
}

export async function createMoveNetDetector(): Promise<poseDetection.PoseDetector> {
  try {
    await tf.setBackend("webgl");
    await tf.ready();
  } catch {
    await tf.setBackend("cpu");
    await tf.ready();
  }

  try {
    return await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
  } catch {
    await tf.setBackend("cpu");
    await tf.ready();
    return await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
  }
}

export async function processVideoUrlForPoses(
  detector: poseDetection.PoseDetector,
  url: string,
  onProgress?: (percent: number) => void
): Promise<{ poses: any[]; frameIntervalSec: number }> {
  const tempVideo = document.createElement("video");
  tempVideo.src = url;
  tempVideo.muted = true;
  tempVideo.playsInline = true;
  tempVideo.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Video loading timeout")), 30000);

    const checkReady = () => {
      if (
        tempVideo.readyState >= 4 &&
        tempVideo.videoWidth > 0 &&
        tempVideo.videoHeight > 0 &&
        tempVideo.duration > 0
      ) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };

    tempVideo.addEventListener(
      "loadedmetadata",
      () => setTimeout(checkReady, 50),
      { once: true }
    );
    tempVideo.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Video load error"));
    }, { once: true });
    tempVideo.load();
    checkReady();
  });

  const poses: any[] = [];
  let duration = tempVideo.duration;
  if (duration === Infinity || duration <= 0 || isNaN(duration)) {
    duration = 60;
  }

  const frameInterval = getPoseSamplingFrameIntervalSec();
  const totalFrames = Math.ceil(duration / frameInterval);
  let processedFrames = 0;

  for (let t = 0; t < duration; t += frameInterval) {
    await new Promise<void>((resolve, reject) => {
      const seekTimeout = setTimeout(() => reject(new Error(`Seek timeout at ${t}s`)), 5000);
      tempVideo.onseeked = () => {
        clearTimeout(seekTimeout);
        resolve();
      };
      tempVideo.onerror = () => {
        clearTimeout(seekTimeout);
        reject(new Error("Video seek error"));
      };
      tempVideo.currentTime = t;
    });

    if (tempVideo.ended || tempVideo.currentTime >= duration) break;

    try {
      const detectedPoses = await detector.estimatePoses(tempVideo);
      if (detectedPoses?.length) {
        poses.push(detectedPoses[0]);
      } else {
        poses.push(null);
      }
    } catch {
      poses.push(null);
    }

    processedFrames++;
    const progress = Math.min(100, Math.round((processedFrames / totalFrames) * 100));
    onProgress?.(progress);
  }

  tempVideo.src = "";
  tempVideo.load();
  return { poses, frameIntervalSec: frameInterval };
}
