"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "../types";
import { parseExerciseRecord } from "../lib/parseExerciseRecord";

export interface ExerciseStudioData {
  exercise: Exercise | null;
  videoUrl: string | null;
  referencePoses: unknown[] | null;
  loading: boolean;
  error: string | null;
}

async function resolveReferenceVideoUrl(referenceVideoUrl: string | undefined): Promise<string | null> {
  if (!referenceVideoUrl) return null;
  if (referenceVideoUrl.startsWith("http") || referenceVideoUrl.startsWith("/")) {
    return referenceVideoUrl;
  }
  return `/api/storage/video-proxy?fileName=${encodeURIComponent(referenceVideoUrl)}`;
}

async function loadReferenceKeypoints(keypointsUrl: string | undefined): Promise<unknown[] | null> {
  if (!keypointsUrl) return null;
  try {
    const res = await fetch("/api/storage/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: keypointsUrl }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { poses?: unknown[] }).poses)) {
      return (data as { poses: unknown[] }).poses;
    }
    return null;
  } catch {
    return null;
  }
}

export function useExerciseStudioData(exerciseId: string): ExerciseStudioData {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [referencePoses, setReferencePoses] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setExercise(null);
      setVideoUrl(null);
      setReferencePoses(null);

      try {
        const res = await fetch(`/api/exercises/${exerciseId}`);
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 404 ? "Exercise not found" : "Failed to load exercise");
            setLoading(false);
          }
          return;
        }

        const responseData = await res.json();
        const exerciseData = responseData.exercise ?? responseData;
        const parsed = parseExerciseRecord({
          ...exerciseData,
          dateAdded:
            typeof exerciseData.dateAdded === "string"
              ? exerciseData.dateAdded
              : exerciseData.dateAdded?.toISOString?.() ?? new Date().toISOString(),
        });

        const resolvedVideo = await resolveReferenceVideoUrl(parsed.referenceVideoUrl);
        const poses = await loadReferenceKeypoints(parsed.referenceKeypointsUrl);

        if (cancelled) return;

        if (!resolvedVideo) {
          setError("This exercise has no reference video yet.");
          setExercise(parsed);
          setLoading(false);
          return;
        }

        setExercise(parsed);
        setVideoUrl(resolvedVideo);
        setReferencePoses(poses?.length ? poses : null);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Failed to load exercise");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return { exercise, videoUrl, referencePoses, loading, error };
}
