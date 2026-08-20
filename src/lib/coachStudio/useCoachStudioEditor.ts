"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../supabase/client";
import {
  createSignedCoachVideoUrl,
  getCoachSession,
  updateCoachSessionDraft,
} from "./coachSessions";
import { loadCoachKeypoints, saveCoachKeypoints } from "./keypoints";
import { migrateCoachEditorState, phaseAtSourceMs, phaseBoundsMs, syncPhasesFromFreezes } from "./migrateEditor";
import { getDisplayCoachPoses } from "./smoothPoses";
import type { Pose } from "./joints";
import {
  defaultCoachAngleChipStyle,
  defaultCoachCaptionStyle,
  defaultCoachConnectorStyle,
  defaultCoachArrowStyle,
  emptyCoachEditorState,
  emptyCoachOverlayBundle,
  cloneOverlayBundleWithFreshIds,
  COACH_CONNECTOR_MAX_COUNT,
  COACH_CONNECTOR_MAX_JOINTS,
  COACH_CONNECTOR_MIN_JOINTS,
  normalizeCoachConnector,
  type CoachAngleChip,
  type CoachAngleChipJoint,
  type CoachAngleChipStyle,
  type CoachCaption,
  type CoachCaptionStyle,
  type CoachConnector,
  type CoachEditorState,
  type CoachFocusHighlight,
  type CoachFreeze,
  type CoachJointArrow,
  type CoachJointId,
  type CoachMobilityGeometry,
  type CoachOverlayBundle,
  type CoachPoint,
  type CoachSession,
} from "../../types/coachSession";
import { clampCoachCaptionText } from "./renderCoachOverlay";

export type TrackStatus = "idle" | "loading" | "tracking" | "ready" | "error";

export type CoachSelection =
  | { kind: "freeze"; id: string }
  | { kind: "phase"; id: string }
  | null;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function patchBundle(
  bundle: CoachOverlayBundle,
  fn: (b: CoachOverlayBundle) => CoachOverlayBundle
): CoachOverlayBundle {
  return fn(bundle);
}

export interface CoachStudioEditor {
  session: CoachSession | null;
  videoUrl: string | null;
  loading: boolean;
  loadError: string | null;

  poses: Pose[];
  /** Temporally smoothed poses for overlay preview/export (raw `poses` stay cached). */
  displayPoses: Pose[];
  frameIntervalSec: number;
  trackStatus: TrackStatus;
  trackProgress: number;
  posesFromCache: boolean;
  retrack: () => void;

  editor: CoachEditorState;
  title: string;
  instructions: string;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;

  selection: CoachSelection;
  setSelection: (s: CoachSelection) => void;
  selectedFreezeId: string | null;
  selectedPhaseId: string | null;

  setTitle: (v: string) => void;
  setInstructions: (v: string) => void;

  addFreezeAt: (tMs: number) => string;
  updateFreeze: (id: string, patch: Partial<Pick<CoachFreeze, "holdMs" | "tMs">>) => void;
  removeFreeze: (id: string) => void;

  addCaption: (target: { kind: "freeze" | "phase"; id: string }) => string | null;
  updateCaption: (
    target: { kind: "freeze" | "phase"; id: string },
    captionId: string,
    patch: Partial<Pick<CoachCaption, "text" | "anchor">> & { style?: Partial<CoachCaptionStyle> }
  ) => void;
  moveCaption: (
    target: { kind: "freeze" | "phase"; id: string },
    captionId: string,
    anchor: CoachPoint
  ) => void;
  removeCaption: (target: { kind: "freeze" | "phase"; id: string }, captionId: string) => void;

  addConnector: (
    target: { kind: "freeze" | "phase"; id: string },
    joints: CoachJointId[],
    style?: Partial<
      Pick<
        CoachConnector,
        "stroke" | "color" | "thickness" | "showJoints" | "jointColor" | "jointRadius"
      >
    >
  ) => string | null;
  updateConnector: (
    target: { kind: "freeze" | "phase"; id: string },
    connectorId: string,
    patch: Partial<
      Pick<
        CoachConnector,
        | "joints"
        | "stroke"
        | "color"
        | "thickness"
        | "showJoints"
        | "jointColor"
        | "jointRadius"
      >
    >
  ) => void;
  removeConnector: (target: { kind: "freeze" | "phase"; id: string }, connectorId: string) => void;
  addJointArrow: (
    target: { kind: "freeze" | "phase"; id: string },
    joint: CoachJointId,
    mode?: "motion" | "segment",
    toJoint?: CoachJointId,
    style?: Partial<Pick<CoachJointArrow, "stroke" | "color" | "thickness">>
  ) => string | null;
  updateJointArrow: (
    target: { kind: "freeze" | "phase"; id: string },
    arrowId: string,
    patch: Partial<Pick<CoachJointArrow, "stroke" | "color" | "thickness">>
  ) => void;
  removeJointArrow: (target: { kind: "freeze" | "phase"; id: string }, arrowId: string) => void;
  addFocusJoint: (
    target: { kind: "freeze" | "phase"; id: string },
    joint: CoachJointId
  ) => string | null;
  updateFocusJoint: (
    target: { kind: "freeze" | "phase"; id: string },
    focusId: string,
    patch: Partial<Pick<CoachFocusHighlight, "color" | "opacity" | "radius">>
  ) => void;
  removeFocusJoint: (target: { kind: "freeze" | "phase"; id: string }, focusId: string) => void;
  updateMobilityGeometry: (
    target: { kind: "freeze" | "phase"; id: string },
    patch: Partial<CoachMobilityGeometry>
  ) => void;
  addAngleChip: (
    target: { kind: "freeze" | "phase"; id: string },
    joint: CoachAngleChipJoint
  ) => string | null;
  updateAngleChip: (
    target: { kind: "freeze" | "phase"; id: string },
    chipId: string,
    patch: Partial<Pick<CoachAngleChip, "joint">> & { style?: Partial<CoachAngleChipStyle> }
  ) => void;
  removeAngleChip: (target: { kind: "freeze" | "phase"; id: string }, chipId: string) => void;

  save: () => Promise<boolean>;
}

export function useCoachStudioEditor(sessionId: string): CoachStudioEditor {
  const supabase = useMemo(() => createClient(), []);

  const [session, setSession] = useState<CoachSession | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [poses, setPoses] = useState<Pose[]>([]);
  const [frameIntervalSec, setFrameIntervalSec] = useState(0.1);
  const [trackStatus, setTrackStatus] = useState<TrackStatus>("idle");
  const [trackProgress, setTrackProgress] = useState(0);
  const [posesFromCache, setPosesFromCache] = useState(false);
  const [trackNonce, setTrackNonce] = useState(0);

  const [editor, setEditor] = useState<CoachEditorState>(emptyCoachEditorState());
  const [title, setTitleState] = useState("");
  const [instructions, setInstructionsState] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selection, setSelection] = useState<CoachSelection>(null);

  const sessionRef = useRef<CoachSession | null>(null);
  sessionRef.current = session;
  const forceRetrackRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setVideoUrl(null);
    setPoses([]);
    setTrackStatus("idle");
    setPosesFromCache(false);
    setTrackNonce(0);
    forceRetrackRef.current = false;
    setSelection(null);
    (async () => {
      const { data, error } = await getCoachSession(supabase, sessionId);
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error ?? "Session not found.");
        setLoading(false);
        return;
      }
      setSession(data);
      setEditor(migrateCoachEditorState(data.editor));
      setTitleState(data.title);
      setInstructionsState(data.metadata.instructions ?? "");

      if (data.sourceVideoPath) {
        const signed = await createSignedCoachVideoUrl(supabase, data.sourceVideoPath);
        if (cancelled) return;
        if (signed.url) setVideoUrl(signed.url);
        else setLoadError(signed.error ?? "Could not load video.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, sessionId]);

  useEffect(() => {
    if (!videoUrl || !sessionRef.current) return;
    const sess = sessionRef.current;
    let cancelled = false;
    const forceRetrack = forceRetrackRef.current;

    (async () => {
      setTrackStatus("loading");
      setTrackProgress(0);
      setPosesFromCache(false);

      const preferCache = !forceRetrack && !!sess.keypointsPath;

      if (preferCache && sess.keypointsPath) {
        const cached = await loadCoachKeypoints(supabase, sess.keypointsPath);
        if (cancelled) return;
        if (cached.data && cached.data.poses.length > 0) {
          setPoses(cached.data.poses);
          setFrameIntervalSec(cached.data.frameIntervalSec);
          setPosesFromCache(true);
          setTrackStatus("ready");
          setTrackProgress(100);
          forceRetrackRef.current = false;
          return;
        }
      }

      try {
        const { createMoveNetDetector, processVideoUrlForPoses } = await import(
          "../tfjsProcessVideo"
        );
        const detector = await createMoveNetDetector();
        if (cancelled) return;
        setTrackStatus("tracking");
        const { poses: detected, frameIntervalSec: interval, videoWidth, videoHeight } =
          await processVideoUrlForPoses(detector, videoUrl, (pct) => {
            if (!cancelled) setTrackProgress(pct);
          });
        if (cancelled) return;
        const nextPoses = detected as Pose[];
        setPoses(nextPoses);
        setFrameIntervalSec(interval);
        setPosesFromCache(false);
        setTrackStatus("ready");
        detector.dispose?.();

        const saved = await saveCoachKeypoints(supabase, {
          userId: sess.userId,
          sessionId: sess.id,
          poses: nextPoses,
          frameIntervalSec: interval,
          videoWidth,
          videoHeight,
        });
        if (!cancelled && saved.session) setSession(saved.session);
      } catch {
        if (!cancelled) setTrackStatus("error");
      } finally {
        forceRetrackRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoUrl, trackNonce, supabase]);

  const retrack = useCallback(() => {
    forceRetrackRef.current = true;
    setTrackNonce((n) => n + 1);
  }, []);

  const mutateEditor = useCallback((fn: (prev: CoachEditorState) => CoachEditorState) => {
    setEditor((prev) => fn(prev));
    setDirty(true);
  }, []);

  const updateOverlays = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      fn: (b: CoachOverlayBundle) => CoachOverlayBundle
    ) => {
      mutateEditor((prev) => {
        if (target.kind === "freeze") {
          return {
            ...prev,
            freezes: prev.freezes.map((f) =>
              f.id === target.id ? { ...f, overlays: patchBundle(f.overlays, fn) } : f
            ),
          };
        }
        return {
          ...prev,
          phases: prev.phases.map((p) =>
            p.id === target.id ? { ...p, overlays: patchBundle(p.overlays, fn) } : p
          ),
        };
      });
    },
    [mutateEditor]
  );

  const setTitle = useCallback((v: string) => {
    setTitleState(v);
    setDirty(true);
  }, []);

  const setInstructions = useCallback((v: string) => {
    setInstructionsState(v);
    setDirty(true);
  }, []);

  const addFreezeAt = useCallback(
    (tMs: number) => {
      const id = uid("frz");
      const rounded = Math.round(tMs);
      mutateEditor((prev) => {
        const sorted = [...prev.freezes].sort((a, b) => a.tMs - b.tMs);
        const durationMs = Math.max(
          sessionRef.current?.sourceDurationMs ?? 0,
          rounded + 1,
          sorted[sorted.length - 1]?.tMs ?? 0,
          1
        );

        // Prefer overlays from the phase under the playhead; fall back to neighbor freeze.
        const candidate = phaseAtSourceMs(prev, rounded, durationMs);
        let coveringPhase = null as ReturnType<typeof phaseAtSourceMs>;
        if (candidate) {
          const { startMs, endMs } = phaseBoundsMs(candidate, prev.freezes, durationMs);
          const isLast = candidate.beforeFreezeId === null;
          if (rounded >= startMs && (isLast ? rounded <= endMs : rounded < endMs)) {
            coveringPhase = candidate;
          }
        }

        const prior = [...sorted].reverse().find((f) => f.tMs <= rounded);
        const neighborFreeze = prior ?? sorted.find((f) => f.tMs > rounded);
        const overlaySource = coveringPhase?.overlays ?? neighborFreeze?.overlays;

        const freeze: CoachFreeze = {
          id,
          tMs: rounded,
          holdMs: neighborFreeze?.holdMs ?? 2000,
          captions: [],
          overlays: overlaySource
            ? cloneOverlayBundleWithFreshIds(overlaySource)
            : emptyCoachOverlayBundle(),
        };
        const freezes = [...prev.freezes, freeze].sort((a, b) => a.tMs - b.tMs);
        return {
          ...prev,
          freezes,
          phases: syncPhasesFromFreezes(freezes, prev.phases),
        };
      });
      setSelection({ kind: "freeze", id });
      return id;
    },
    [mutateEditor]
  );

  const updateFreeze = useCallback(
    (id: string, patch: Partial<Pick<CoachFreeze, "holdMs" | "tMs">>) => {
      mutateEditor((prev) => {
        const freezes = prev.freezes
          .map((f) => (f.id === id ? { ...f, ...patch } : f))
          .sort((a, b) => a.tMs - b.tMs);
        return {
          ...prev,
          freezes,
          phases: syncPhasesFromFreezes(freezes, prev.phases),
        };
      });
    },
    [mutateEditor]
  );

  const removeFreeze = useCallback(
    (id: string) => {
      mutateEditor((prev) => {
        const freezes = prev.freezes.filter((f) => f.id !== id);
        return {
          ...prev,
          freezes,
          phases: syncPhasesFromFreezes(freezes, prev.phases),
        };
      });
      setSelection((cur) => (cur?.kind === "freeze" && cur.id === id ? null : cur));
    },
    [mutateEditor]
  );

  const addCaption = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }) => {
      let created: string | null = null;
      const makeCaption = (existingCount: number): CoachCaption => {
        const id = uid("cap");
        created = id;
        return {
          id,
          text: "",
          anchor: { x: 0.5, y: existingCount === 0 ? 0.15 : 0.28 },
          style: defaultCoachCaptionStyle(),
        };
      };
      mutateEditor((prev) => {
        if (target.kind === "freeze") {
          return {
            ...prev,
            freezes: prev.freezes.map((f) => {
              if (f.id !== target.id || f.captions.length >= 2) return f;
              return { ...f, captions: [...f.captions, makeCaption(f.captions.length)] };
            }),
          };
        }
        return {
          ...prev,
          phases: prev.phases.map((p) => {
            if (p.id !== target.id || p.captions.length >= 2) return p;
            return { ...p, captions: [...p.captions, makeCaption(p.captions.length)] };
          }),
        };
      });
      return created;
    },
    [mutateEditor]
  );

  const updateCaption = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      captionId: string,
      patch: Partial<Pick<CoachCaption, "text" | "anchor">> & { style?: Partial<CoachCaptionStyle> }
    ) => {
      const nextPatch =
        patch.text != null ? { ...patch, text: clampCoachCaptionText(patch.text) } : patch;
      const mapList = (captions: CoachCaption[]) =>
        captions.map((c) => {
          if (c.id !== captionId) return c;
          return {
            ...c,
            ...nextPatch,
            style: nextPatch.style ? { ...c.style, ...nextPatch.style } : c.style,
          };
        });
      mutateEditor((prev) => {
        if (target.kind === "freeze") {
          return {
            ...prev,
            freezes: prev.freezes.map((f) =>
              f.id === target.id ? { ...f, captions: mapList(f.captions) } : f
            ),
          };
        }
        return {
          ...prev,
          phases: prev.phases.map((p) =>
            p.id === target.id ? { ...p, captions: mapList(p.captions) } : p
          ),
        };
      });
    },
    [mutateEditor]
  );

  const moveCaption = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      captionId: string,
      anchor: CoachPoint
    ) => {
      const clamped = {
        x: Math.min(1, Math.max(0, anchor.x)),
        y: Math.min(1, Math.max(0, anchor.y)),
      };
      updateCaption(target, captionId, { anchor: clamped });
    },
    [updateCaption]
  );

  const removeCaption = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, captionId: string) => {
      mutateEditor((prev) => {
        if (target.kind === "freeze") {
          return {
            ...prev,
            freezes: prev.freezes.map((f) =>
              f.id === target.id
                ? { ...f, captions: f.captions.filter((c) => c.id !== captionId) }
                : f
            ),
          };
        }
        return {
          ...prev,
          phases: prev.phases.map((p) =>
            p.id === target.id
              ? { ...p, captions: p.captions.filter((c) => c.id !== captionId) }
              : p
          ),
        };
      });
    },
    [mutateEditor]
  );

  const addConnector = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      joints: CoachJointId[],
      style?: Partial<
        Pick<
          CoachConnector,
          "stroke" | "color" | "thickness" | "showJoints" | "jointColor" | "jointRadius"
        >
      >
    ) => {
      const collapsed: CoachJointId[] = [];
      for (const j of joints.slice(0, COACH_CONNECTOR_MAX_JOINTS)) {
        if (collapsed[collapsed.length - 1] !== j) collapsed.push(j);
      }
      if (collapsed.length < COACH_CONNECTOR_MIN_JOINTS) return null;

      const defaults = defaultCoachConnectorStyle();
      const key = collapsed.join(">");
      let createdId: string | null = null;
      updateOverlays(target, (b) => {
        if (b.connectors.length >= COACH_CONNECTOR_MAX_COUNT) return b;
        if (b.connectors.some((c) => c.joints.join(">") === key)) return b;
        const connector: CoachConnector = {
          id: uid("con"),
          joints: collapsed,
          stroke: style?.stroke ?? defaults.stroke,
          color: style?.color ?? defaults.color,
          thickness: style?.thickness ?? defaults.thickness,
          showJoints: style?.showJoints ?? defaults.showJoints,
          jointColor: style?.jointColor ?? defaults.jointColor,
          jointRadius: style?.jointRadius ?? defaults.jointRadius,
        };
        createdId = connector.id;
        return { ...b, connectors: [...b.connectors, connector] };
      });
      return createdId;
    },
    [updateOverlays]
  );

  const updateConnector = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      connectorId: string,
      patch: Partial<
        Pick<
          CoachConnector,
          | "joints"
          | "stroke"
          | "color"
          | "thickness"
          | "showJoints"
          | "jointColor"
          | "jointRadius"
        >
      >
    ) => {
      updateOverlays(target, (b) => ({
        ...b,
        connectors: b.connectors.map((c) => {
          if (c.id !== connectorId) return c;
          const next = { ...c, ...patch };
          if (patch.joints) {
            const collapsed: CoachJointId[] = [];
            for (const j of patch.joints.slice(0, COACH_CONNECTOR_MAX_JOINTS)) {
              if (collapsed[collapsed.length - 1] !== j) collapsed.push(j);
            }
            if (collapsed.length < COACH_CONNECTOR_MIN_JOINTS) return c;
            next.joints = collapsed;
          }
          return normalizeCoachConnector(next) ?? c;
        }),
      }));
    },
    [updateOverlays]
  );

  const removeConnector = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, connectorId: string) => {
      updateOverlays(target, (b) => ({
        ...b,
        connectors: b.connectors.filter((c) => c.id !== connectorId),
      }));
    },
    [updateOverlays]
  );

  const addJointArrow = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      joint: CoachJointId,
      mode: "motion" | "segment" = "motion",
      toJoint?: CoachJointId,
      style?: Partial<Pick<CoachJointArrow, "stroke" | "color" | "thickness">>
    ) => {
      const defaults = defaultCoachArrowStyle();
      let createdId: string | null = null;
      updateOverlays(target, (b) => {
        const arrow: CoachJointArrow = {
          id: uid("arr"),
          joint,
          mode,
          toJoint,
          stroke: style?.stroke ?? defaults.stroke,
          color: style?.color ?? defaults.color,
          thickness: style?.thickness ?? defaults.thickness,
        };
        createdId = arrow.id;
        return { ...b, jointArrows: [...b.jointArrows, arrow] };
      });
      return createdId;
    },
    [updateOverlays]
  );

  const updateJointArrow = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      arrowId: string,
      patch: Partial<Pick<CoachJointArrow, "stroke" | "color" | "thickness">>
    ) => {
      updateOverlays(target, (b) => ({
        ...b,
        jointArrows: b.jointArrows.map((a) =>
          a.id === arrowId ? { ...a, ...patch } : a
        ),
      }));
    },
    [updateOverlays]
  );

  const removeJointArrow = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, arrowId: string) => {
      updateOverlays(target, (b) => ({
        ...b,
        jointArrows: b.jointArrows.filter((a) => a.id !== arrowId),
      }));
    },
    [updateOverlays]
  );

  const addFocusJoint = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, joint: CoachJointId) => {
      let createdId: string | null = null;
      updateOverlays(target, (b) => {
        if (b.focusJoints.some((f) => f.joint === joint)) return b;
        const focus: CoachFocusHighlight = {
          id: uid("foc"),
          joint,
          color: "#f472b6",
          opacity: 0.45,
          radius: 40,
        };
        createdId = focus.id;
        return { ...b, focusJoints: [...b.focusJoints, focus] };
      });
      return createdId;
    },
    [updateOverlays]
  );

  const updateFocusJoint = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      focusId: string,
      patch: Partial<Pick<CoachFocusHighlight, "color" | "opacity" | "radius">>
    ) => {
      updateOverlays(target, (b) => ({
        ...b,
        focusJoints: b.focusJoints.map((f) =>
          f.id === focusId ? { ...f, ...patch } : f
        ),
      }));
    },
    [updateOverlays]
  );

  const removeFocusJoint = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, focusId: string) => {
      updateOverlays(target, (b) => ({
        ...b,
        focusJoints: b.focusJoints.filter((f) => f.id !== focusId),
      }));
    },
    [updateOverlays]
  );

  const updateMobilityGeometry = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      patch: Partial<CoachMobilityGeometry>
    ) => {
      updateOverlays(target, (b) => {
        const base = b.mobility ?? { axes: [], arcs: [] };
        return {
          ...b,
          mobility: {
            axes: patch.axes ?? base.axes,
            arcs: patch.arcs ?? base.arcs,
          },
        };
      });
    },
    [updateOverlays]
  );

  const addAngleChip = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, joint: CoachAngleChipJoint) => {
      let createdId: string | null = null;
      updateOverlays(target, (b) => {
        const chips = b.angleChips ?? [];
        if (chips.some((c) => c.joint === joint)) return b;
        const chip: CoachAngleChip = {
          id: uid("ang"),
          joint,
          style: defaultCoachAngleChipStyle(),
        };
        createdId = chip.id;
        return { ...b, angleChips: [...chips, chip] };
      });
      return createdId;
    },
    [updateOverlays]
  );

  const updateAngleChip = useCallback(
    (
      target: { kind: "freeze" | "phase"; id: string },
      chipId: string,
      patch: Partial<Pick<CoachAngleChip, "joint">> & { style?: Partial<CoachAngleChipStyle> }
    ) => {
      updateOverlays(target, (b) => ({
        ...b,
        angleChips: (b.angleChips ?? []).map((c) => {
          if (c.id !== chipId) return c;
          return {
            ...c,
            ...("joint" in patch && patch.joint ? { joint: patch.joint } : null),
            style: patch.style
              ? { ...defaultCoachAngleChipStyle(), ...c.style, ...patch.style }
              : c.style,
          };
        }),
      }));
    },
    [updateOverlays]
  );

  const removeAngleChip = useCallback(
    (target: { kind: "freeze" | "phase"; id: string }, chipId: string) => {
      updateOverlays(target, (b) => ({
        ...b,
        angleChips: (b.angleChips ?? []).filter((c) => c.id !== chipId),
      }));
    },
    [updateOverlays]
  );

  const save = useCallback(async () => {
    if (!session) return false;
    setSaving(true);
    setSaveError(null);
    const nextMetadata = {
      ...session.metadata,
      title: title.trim() || session.title,
      instructions,
    };
    const { data, error } = await updateCoachSessionDraft(supabase, session.id, {
      title: title.trim() || session.title,
      editor,
      metadata: nextMetadata,
    });
    setSaving(false);
    if (error || !data) {
      setSaveError(error ?? "Could not save.");
      return false;
    }
    setSession(data);
    setEditor(migrateCoachEditorState(data.editor));
    setDirty(false);
    return true;
  }, [supabase, session, title, instructions, editor]);

  const selectedFreezeId = selection?.kind === "freeze" ? selection.id : null;
  const selectedPhaseId = selection?.kind === "phase" ? selection.id : null;

  const displayPoses = useMemo(
    () => getDisplayCoachPoses(poses, frameIntervalSec),
    [poses, frameIntervalSec]
  );

  // Drop selection if the freeze/phase no longer exists (e.g. after freeze edits).
  useEffect(() => {
    if (!selection) return;
    if (selection.kind === "freeze") {
      if (!editor.freezes.some((f) => f.id === selection.id)) setSelection(null);
      return;
    }
    if (!editor.phases.some((p) => p.id === selection.id)) setSelection(null);
  }, [editor.freezes, editor.phases, selection]);

  return {
    session,
    videoUrl,
    loading,
    loadError,
    poses,
    displayPoses,
    frameIntervalSec,
    trackStatus,
    trackProgress,
    posesFromCache,
    retrack,
    editor,
    title,
    instructions,
    dirty,
    saving,
    saveError,
    selection,
    setSelection,
    selectedFreezeId,
    selectedPhaseId,
    setTitle,
    setInstructions,
    addFreezeAt,
    updateFreeze,
    removeFreeze,
    addCaption,
    updateCaption,
    moveCaption,
    removeCaption,
    addConnector,
    updateConnector,
    removeConnector,
    addJointArrow,
    updateJointArrow,
    removeJointArrow,
    addFocusJoint,
    updateFocusJoint,
    removeFocusJoint,
    updateMobilityGeometry,
    addAngleChip,
    updateAngleChip,
    removeAngleChip,
    save,
  };
}
