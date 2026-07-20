"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CoachEditorState } from "../../types/coachSession";
import {
  buildFrameSchedule,
  safeCoachFps,
  scheduleIndexForSourceTime,
  type ScheduledFrame,
} from "./playbackSchedule";
import { paceDeadlineSlot, paceFullFrameSlot, seekVideoTo } from "./seekVideo";

export interface UseCoachPreviewPlaybackOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  editor: CoachEditorState;
  /** Source video duration in seconds. */
  sourceDurationSec: number;
  fps: number | null | undefined;
  onSourceTimeMs: (ms: number) => void;
}

export interface CoachPreviewPlayback {
  isPlaying: boolean;
  togglePlay: () => void;
  /** Scrub to source time — interrupts playback (scrub wins). */
  seekToSourceMs: (ms: number) => void;
  playbackFreezeId: string | null;
  playbackPhaseId: string | null;
}

/**
 * Freeze-aware preview: walks the same frame schedule as export.
 * Each schedule step awaits video seek so motion frames don't outrun the element.
 */
export function useCoachPreviewPlayback({
  videoRef,
  editor,
  sourceDurationSec,
  fps,
  onSourceTimeMs,
}: UseCoachPreviewPlaybackOptions): CoachPreviewPlayback {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFreezeId, setPlaybackFreezeId] = useState<string | null>(null);
  const [playbackPhaseId, setPlaybackPhaseId] = useState<string | null>(null);

  const scheduleRef = useRef<ScheduledFrame[]>([]);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const playbackGenRef = useRef(0);
  const frameMsRef = useRef(1000 / 30);

  const onSourceTimeMsRef = useRef(onSourceTimeMs);
  onSourceTimeMsRef.current = onSourceTimeMs;

  // Rebuild schedule when freezes / phases / duration / fps change
  useEffect(() => {
    const safeFps = safeCoachFps(fps);
    frameMsRef.current = 1000 / safeFps;
    scheduleRef.current = buildFrameSchedule(editor, sourceDurationSec, safeFps);
    if (indexRef.current >= scheduleRef.current.length) {
      indexRef.current = Math.max(0, scheduleRef.current.length - 1);
    }
  }, [editor, sourceDurationSec, fps]);

  const applyFrame = useCallback(
    async (frame: ScheduledFrame) => {
      const video = videoRef.current;
      if (video) {
        if (!video.paused) video.pause();
        await seekVideoTo(video, frame.sourceTimeSec);
      }
      onSourceTimeMsRef.current(Math.round(frame.sourceTimeSec * 1000));
      setPlaybackFreezeId(frame.activeFreezeId);
      setPlaybackPhaseId(frame.activePhaseId);
    },
    [videoRef]
  );

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    playbackGenRef.current += 1;
    setIsPlaying(false);
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
  }, [videoRef]);

  const runPlaybackLoop = useCallback(
    async (gen: number) => {
      const schedule = scheduleRef.current;
      if (schedule.length === 0) {
        stopPlayback();
        return;
      }

      const frameMs = frameMsRef.current;
      let segmentStart = performance.now();
      let segmentFrames = 0;
      let prevWasHold = false;

      while (playingRef.current && playbackGenRef.current === gen) {
        const idx = indexRef.current;
        const frame = schedule[idx];
        if (!frame) break;

        const isHold = frame.activeFreezeId != null;
        if (isHold !== prevWasHold) {
          segmentStart = performance.now();
          segmentFrames = 0;
          prevWasHold = isHold;
        }

        const frameStartedAt = performance.now();
        try {
          await applyFrame(frame);
        } catch {
          stopPlayback();
          return;
        }

        if (!playingRef.current || playbackGenRef.current !== gen) break;

        indexRef.current = (idx + 1) % schedule.length;
        segmentFrames += 1;

        if (isHold) {
          await paceFullFrameSlot(frameStartedAt, frameMs);
        } else {
          await paceDeadlineSlot(segmentStart, segmentFrames, frameMs);
        }

        if (indexRef.current === 0) {
          segmentFrames = 0;
          segmentStart = performance.now();
          prevWasHold = false;
        }
      }

      if (playbackGenRef.current === gen) {
        playingRef.current = false;
        setIsPlaying(false);
      }
    },
    [applyFrame, stopPlayback]
  );

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();

    const schedule = scheduleRef.current;
    if (schedule.length === 0) return;

    const sourceSec = video?.currentTime ?? 0;
    indexRef.current = scheduleIndexForSourceTime(schedule, sourceSec);

    playingRef.current = true;
    setIsPlaying(true);
    const gen = ++playbackGenRef.current;
    void runPlaybackLoop(gen);
  }, [runPlaybackLoop, videoRef]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) stopPlayback();
    else startPlayback();
  }, [startPlayback, stopPlayback]);

  const seekToSourceMs = useCallback(
    (ms: number) => {
      stopPlayback();
      setPlaybackFreezeId(null);
      setPlaybackPhaseId(null);

      const video = videoRef.current;
      const sourceSec = Math.max(0, ms / 1000);
      if (video) {
        const dur = video.duration || sourceDurationSec || sourceSec;
        video.currentTime = Math.min(sourceSec, Math.max(0, dur - 0.001));
      }
      onSourceTimeMsRef.current(Math.round(sourceSec * 1000));

      const schedule = scheduleRef.current;
      if (schedule.length > 0) {
        indexRef.current = scheduleIndexForSourceTime(schedule, sourceSec);
      }
    },
    [stopPlayback, sourceDurationSec, videoRef]
  );

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  useEffect(() => {
    if (!playingRef.current) return;
    const video = videoRef.current;
    const sourceSec = video?.currentTime ?? 0;
    indexRef.current = scheduleIndexForSourceTime(scheduleRef.current, sourceSec);
  }, [editor.freezes, editor.phases, videoRef]);

  return {
    isPlaying,
    togglePlay,
    seekToSourceMs,
    playbackFreezeId,
    playbackPhaseId,
  };
}
