"use client";
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import CoreVideoPlayer, {
  type CoreVideoPlayerOpenMenu,
  type CoreVideoToolbarAction,
} from "./CoreVideoPlayer";
import { getAngleWithConfidence } from '../lib/analysisUtils';
import { analyzeCurrentPose, calculateAnglesForPoseAnalysis, calculatePoseHoldDuration } from '../lib/poseAnalysisUtils';
import { loadPoseDetectionModel } from '../lib/tensorflowUtils';
import {
  createPlankCoachRefs,
  speakPlankLine,
  stepPlankLiveCoach,
  type PlankCoachRefs,
} from '../lib/sportAnalysis/plankLiveCoach';
import type { PlankFacingSide } from '../lib/sportAnalysis/plankTypes';
import { PLANK_ANGLE_PRESET } from '../lib/sportAnalysis/plankConfig';
import { analyzePlankFrame, type PlankFrameResult } from '../lib/sportAnalysis/plankGeometry';
import {
  createSquatCoachRefs,
  stepSquatLiveCoach,
  type SquatCoachRefs,
} from "../lib/sportAnalysis/squatLiveCoach";
import type { SquatSide } from "../lib/sportAnalysis/squatTypes";
import { pickLiveRecordingMimeType } from "../lib/videoBlobUtils";

/** Throttle plank debug logs so rAF + pose does not flood the console. */
const PLANK_LIVE_DEBUG_INTERVAL_MS = 800;

function plankSelectedSideScores(
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null,
  facingSide: PlankFacingSide
): { nose?: number; ipsiEar?: number; shoulder?: number; hip?: number; ankle?: number } {
  const kp = pose?.keypoints;
  if (!kp?.length) return {};
  const idx =
    facingSide === 'left'
      ? { shoulder: 5, hip: 11, ankle: 15, ear: 3 }
      : { shoulder: 6, hip: 12, ankle: 16, ear: 4 };
  return {
    nose: kp[0]?.score,
    ipsiEar: kp[idx.ear]?.score,
    shoulder: kp[idx.shoulder]?.score,
    hip: kp[idx.hip]?.score,
    ankle: kp[idx.ankle]?.score,
  };
}

/** Dev aid: open DevTools → Console while plank live coach is on. */
function logPlankLiveDebug(payload: {
  facingSide: PlankFacingSide;
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null;
  frame: PlankFrameResult | null;
  hipZone: 'ok' | 'hip_high' | 'hip_low';
}): void {
  const { facingSide, pose, frame, hipZone } = payload;
  const scores = plankSelectedSideScores(pose, facingSide);
  if (!frame) {
    let hint = 'no_pose_or_missing_core_keypoints';
    const kp = pose?.keypoints;
    if (kp?.length) {
      if (!kp[5] || !kp[6] || !kp[11] || !kp[12] || !kp[15] || !kp[16]) {
        hint = 'missing_moveNet_shoulders_hips_ankles';
      }
    }
    console.log('[plank-live]', { facingSide, frame: null, hint, scores });
    return;
  }
  const primary = frame.issues[0];
  console.log('[plank-live]', {
    facingSide,
    hipZone,
    in_plank: frame.in_plank,
    primaryKey: primary?.key,
    issueKeys: frame.issues.map((i) => i.key),
    hip_deg: frame.metrics.hip_angle_deg != null ? Number(frame.metrics.hip_angle_deg.toFixed(1)) : null,
    knee_deg: frame.metrics.knee_angle_deg != null ? Number(frame.metrics.knee_angle_deg.toFixed(1)) : null,
    shoulder_deg: frame.metrics.shoulder_angle_deg != null ? Number(frame.metrics.shoulder_angle_deg.toFixed(1)) : null,
    scores,
  });
}

const PortraitPhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="8" y="3" width="8" height="18" rx="1.5" />
    <circle cx="12" cy="18" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

const LandscapePhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="8" width="18" height="8" rx="1.5" />
    <circle cx="18" cy="12" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

const SwitchCameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h11a3 3 0 0 1 3 3v1M19 16H8a3 3 0 0 1-3-3v-1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5L5 8l3 3M16 19l3-3-3-3" />
  </svg>
);

/** Touch-friendly − / + control for style numeric values (replaces tiny range sliders). */
function NumericStepperControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const decDisabled = value <= min;
  const incDisabled = value >= max;
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: 10,
    border: "1px solid var(--vp-panel-border)",
    background: "var(--vp-panel-icon-bg)",
    color: "var(--vp-panel-icon)",
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="text-xs" style={{ color: "var(--vp-label)" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={decDisabled}
          onClick={() => onChange(Math.max(min, value - step))}
          style={btnStyle(decDisabled)}
        >
          −
        </button>
        <span
          style={{
            minWidth: 48,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--vp-panel-title)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
          {unit}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={incDisabled}
          onClick={() => onChange(Math.min(max, value + step))}
          style={btnStyle(incDisabled)}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface LiveVideoPlayerProps {
  onRecordingComplete: (
    result: { url: string; blob: Blob; durationSec: number },
    realTimeAnalysisData?: any[]
  ) => void;
  onMethodChange: () => void;
  referenceAngles?: any;
  exercise: any;
  /** Open Move Studio: side-view plank voice cues (speechSynthesis) while camera is active. */
  plankLiveCoach?: boolean;
  /** Which side faces the camera for plank geometry (must match Studio export panel). */
  plankFacingSide?: PlankFacingSide;
  /** Open Move Studio: side-view squat cues + squat counter while camera is active. */
  squatLiveCoach?: boolean;
  squatSide?: SquatSide;
  /** Studio live modal: edge-to-edge video, safe-area controls, optional orientation toggle (mobile). */
  layoutVariant?: 'default' | 'embeddedFullscreen';
  /** Fullscreen: first toolbar button closes the host (e.g. dialog). */
  onEmbeddedClose?: () => void;
}

const ANGLE_OPTIONS = [
  { key: 'leftKnee', label: 'Left Knee' },
  { key: 'rightKnee', label: 'Right Knee' },
  { key: 'leftHip', label: 'Left Hip' },
  { key: 'rightHip', label: 'Right Hip' },
  { key: 'leftElbow', label: 'Left Elbow' },
  { key: 'rightElbow', label: 'Right Elbow' },
  { key: 'leftShoulder', label: 'Left Shoulder' },
  { key: 'rightShoulder', label: 'Right Shoulder' },
];

const JOINT_OPTIONS = [
  { key: 5, label: 'Left Shoulder' },
  { key: 6, label: 'Right Shoulder' },
  { key: 7, label: 'Left Elbow' },
  { key: 8, label: 'Right Elbow' },
  { key: 9, label: 'Left Wrist' },
  { key: 10, label: 'Right Wrist' },
  { key: 11, label: 'Left Hip' },
  { key: 12, label: 'Right Hip' },
  { key: 13, label: 'Left Knee' },
  { key: 14, label: 'Right Knee' },
  { key: 15, label: 'Left Ankle' },
  { key: 16, label: 'Right Ankle' },
];

const BONE_OPTIONS = [
  { key: '5-7', label: 'Left Upper Arm' },
  { key: '7-9', label: 'Left Lower Arm' },
  { key: '6-8', label: 'Right Upper Arm' },
  { key: '8-10', label: 'Right Lower Arm' },
  { key: '11-13', label: 'Left Thigh' },
  { key: '13-15', label: 'Left Lower Leg' },
  { key: '12-14', label: 'Right Thigh' },
  { key: '14-16', label: 'Right Lower Leg' },
  { key: '5-6', label: 'Shoulders' },
  { key: '11-12', label: 'Hips' },
  { key: '5-11', label: 'Left Torso' },
  { key: '6-12', label: 'Right Torso' },
];

export default function LiveVideoPlayer({
  onRecordingComplete,
  onMethodChange,
  referenceAngles,
  exercise,
  plankLiveCoach = false,
  plankFacingSide = 'left',
  squatLiveCoach = false,
  squatSide = 'left',
  layoutVariant = 'default',
  onEmbeddedClose,
}: LiveVideoPlayerProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(true);

  // Add recording duration tracking
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number | null>(null);

  // Advanced panel state
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<'angles' | 'joints' | 'bones' | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(ANGLE_OPTIONS.map(a => a.key));
  const [selectedJoints, setSelectedJoints] = useState<number[]>(JOINT_OPTIONS.map(j => j.key));
  const [selectedBones, setSelectedBones] = useState<string[]>(BONE_OPTIONS.map(b => b.key));
  const [boneColor, setBoneColor] = useState<string>('#00ff00');
  const [jointColor, setJointColor] = useState<string>('#00ff00');
  const [boneWeight, setBoneWeight] = useState<number>(2);
  const [jointSize, setJointSize] = useState<number>(4);
  const videoVisible = true;
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [showAngles, setShowAngles] = useState(false);

  // Refs for dropdown containers (focus selection panel on non-studio layouts)
  const anglesDropdownRef = useRef<HTMLDivElement>(null);
  const jointsDropdownRef = useRef<HTMLDivElement>(null);
  const bonesDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (openDropdown === 'angles' && anglesDropdownRef.current && !anglesDropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'joints' && jointsDropdownRef.current && !jointsDropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'bones' && bonesDropdownRef.current && !bonesDropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Controls for panel switching
  const [openMenu, setOpenMenu] = useState<CoreVideoPlayerOpenMenu>(null);

  // Simple rep counting state (matching VideoPlayer)
  const [currentPose, setCurrentPose] = useState<any>(null);
  const [exerciseAnalysisData, setExerciseAnalysisData] = useState<any>(null);

  const [repCountingEnabled, setRepCountingEnabled] = useState(false);
  const [currentRepCount, setCurrentRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [isInRep, setIsInRep] = useState(false);
  const [lastBottomTime, setLastBottomTime] = useState<number | null>(null);
  const [repStates, setRepStates] = useState<{[key: string]: any}>({});

  // Pose feedback state (matching VideoPlayer)
  const [poseFeedbackEnabled, setPoseFeedbackEnabled] = useState(false);
  const [currentPoseResult, setCurrentPoseResult] = useState<any>(null);
  const [poseHistory, setPoseHistory] = useState<any[]>([]);

  const plankCoachRef = useRef<PlankCoachRefs>(createPlankCoachRefs());
  const plankDebugLastLogRef = useRef(0);
  const plankBannerKeyRef = useRef('');
  const [plankBanner, setPlankBanner] = useState<{
    message: string;
    variant: 'good' | 'adjust' | 'setup';
  } | null>(null);
  const squatCoachRef = useRef<SquatCoachRefs>(createSquatCoachRefs());
  const squatBannerKeyRef = useRef("");
  const [squatBanner, setSquatBanner] = useState<{ message: string; variant: "good" | "adjust" | "setup" } | null>(
    null
  );
  const [squatRepCount, setSquatRepCount] = useState(0);

  const embeddedFullscreen = layoutVariant === 'embeddedFullscreen';
  const [captureAspect, setCaptureAspect] = useState<'portrait' | 'landscape'>('portrait');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  /** visualViewport box — counters iOS Safari landscape page-zoom / chrome resize. */
  const [viewportBox, setViewportBox] = useState<{ w: number; h: number } | null>(null);

  // Detect mobile device (safe for SSR)
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    // Mark as mounted and check if we're on mobile - only runs on client side
    setIsMounted(true);
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, []);

  // Memoize videoConstraints to only create on client side (SSR-safe)
  const videoConstraints = useMemo(() => {
    if (!isMounted) {
      return {
        width: 640,
        height: 480,
        facingMode: "user" as const,
      };
    }
    const facingMode =
      isMobile && embeddedFullscreen
        ? cameraFacing
        : isMobile
          ? ("environment" as const)
          : ("user" as const);
    if (!embeddedFullscreen) {
      // Non-studio layouts: keep a simple request without forced portrait aspectRatio.
      return {
        width: 640,
        height: 480,
        facingMode,
      };
    }
    // Studio fullscreen on desktop: landscape capture (plank / side view).
    if (!isMobile) {
      return {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode,
      };
    }
    // Mobile live: Parque-style wide FOV (no aspectRatio — avoids iOS center-crop "2×").
    // Landscape toggle prefers a wider ideal; portrait uses classic VGA like Mova Parque.
    if (captureAspect === "landscape") {
      return {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode,
      };
    }
    return {
      width: 640,
      height: 480,
      facingMode,
    };
  }, [isMounted, isMobile, embeddedFullscreen, captureAspect, cameraFacing]);

  /** Sync capture aspect to device orientation; reset scroll to fight iOS landscape zoom. */
  useEffect(() => {
    if (!embeddedFullscreen || !isMobile || !isMounted) return;

    const readBox = () => {
      const vv = window.visualViewport;
      return {
        w: Math.round(vv?.width ?? window.innerWidth),
        h: Math.round(vv?.height ?? window.innerHeight),
      };
    };

    const stabilize = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setViewportBox(readBox());
    };

    const syncFromDevice = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setCaptureAspect(landscape ? "landscape" : "portrait");
      stabilize();
    };

    syncFromDevice();

    const onOrientation = () => {
      // iOS fires orientationchange before layout settles.
      window.setTimeout(syncFromDevice, 50);
      window.setTimeout(stabilize, 250);
    };

    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("resize", stabilize);
    window.visualViewport?.addEventListener("resize", stabilize);
    window.visualViewport?.addEventListener("scroll", stabilize);

    return () => {
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("resize", stabilize);
      window.visualViewport?.removeEventListener("resize", stabilize);
      window.visualViewport?.removeEventListener("scroll", stabilize);
    };
  }, [embeddedFullscreen, isMobile, isMounted]);

  useEffect(() => {
    if (!plankLiveCoach) {
      plankBannerKeyRef.current = '';
      setPlankBanner(null);
    }
    plankCoachRef.current = createPlankCoachRefs();
  }, [plankLiveCoach, plankFacingSide]);

  useEffect(() => {
    if (!squatLiveCoach) {
      squatBannerKeyRef.current = "";
      setSquatBanner(null);
      setSquatRepCount(0);
    }
    squatCoachRef.current = createSquatCoachRefs();
    setSquatRepCount(0);
  }, [squatLiveCoach, squatSide]);

  useEffect(() => {
    if (cameraActive) {
      setShowKeypoints(true);
      setShowAngles(true);
    }
  }, [cameraActive]);

  // Load pose detection model
  useEffect(() => {
    async function loadModel() {
      try {
        const result = await loadPoseDetectionModel('webgl');
        setDetector(result.detector);
        console.log(`✅ Model loaded successfully with ${result.backend} backend`);
      } catch (error) {
        console.error('❌ Failed to load pose detection model:', error);
      }
    }
    loadModel();
  }, []);

  // Load exercise analysis data
  useEffect(() => {
    if (exercise?.id) {
      fetch(`/api/exercises/${exercise.id}/analysis`)
        .then(res => res.json())
        .then(data => {
          if (data.exercise) {
            setExerciseAnalysisData({
              exerciseType: data.exercise.exerciseType || 'repetition',
              repAnalysis: data.exercise.repAnalysis,
              patternAnalysis: data.exercise.patternAnalysis,
              quality: data.exercise.analysisQuality
            });
          }
        })
        .catch(error => {
          console.error('Error loading exercise analysis data:', error);
        });
    }
  }, [exercise?.id]);

  // Canvas/video scaling logic
  useEffect(() => {
    if (cameraActive && webcamRef.current?.video && canvasRef.current) {
      const video = webcamRef.current.video;
      const checkVideoSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvasRef.current!.width = video.videoWidth;
          canvasRef.current!.height = video.videoHeight;
        } else {
          setTimeout(checkVideoSize, 100);
        }
      };
      checkVideoSize();
    }
  }, [cameraActive, embeddedFullscreen, captureAspect, cameraFacing]);

  // Live pose detection loop
  useEffect(() => {
    let animationFrameId: number;

    const runPoseDetection = async () => {
      if (!cameraActive || !detector || !webcamRef.current || !webcamRef.current.video) {
        return;
      }
      const video = webcamRef.current.video as HTMLVideoElement;
      if (video.readyState < 2) {
        animationFrameId = requestAnimationFrame(runPoseDetection);
        return;
      }
      try {
        const poses = await detector.estimatePoses(video);
        const pose = poses[0] || null;
        setCurrentPose(pose); // Set current pose for real-time analysis
        setAllPoses(prev => {
          const newPoses = [...prev, pose];
          // Keep only the last 10 poses to avoid memory issues
          return newPoses.slice(-10);
        });
        if (plankLiveCoach) {
          const nowSec = performance.now() / 1000;
          const line = stepPlankLiveCoach(pose, nowSec, plankCoachRef.current, plankFacingSide);
          if (line) speakPlankLine(line);

          const frame = analyzePlankFrame(pose, PLANK_ANGLE_PRESET, {
            facingSide: plankFacingSide,
            hipHysteresis: plankCoachRef.current.hipHysteresis,
            rolling: plankCoachRef.current.rolling,
          });
          const nowMs = performance.now();
          if (nowMs - plankDebugLastLogRef.current >= PLANK_LIVE_DEBUG_INTERVAL_MS) {
            plankDebugLastLogRef.current = nowMs;
            logPlankLiveDebug({
              facingSide: plankFacingSide,
              pose,
              frame,
              hipZone: plankCoachRef.current.hipHysteresis.zone,
            });
          }
          if (frame) {
            const primary = frame.issues[0];
            const variant: 'good' | 'adjust' | 'setup' =
              primary.key === 'good_form' ? 'good' : primary.key === 'not_in_plank' ? 'setup' : 'adjust';
            const key = `${variant}|${primary.message}`;
            if (key !== plankBannerKeyRef.current) {
              plankBannerKeyRef.current = key;
              setPlankBanner({ message: primary.message, variant });
            }
          } else if (plankBannerKeyRef.current !== '') {
            plankBannerKeyRef.current = '';
            setPlankBanner(null);
          }
        } else if (squatLiveCoach) {
          const nowSec = performance.now() / 1000;
          const { line, frame } = stepSquatLiveCoach(pose, nowSec, squatCoachRef.current, squatSide);
          if (line) speakPlankLine(line);
          if (frame) {
            setSquatRepCount((prev) => (prev === frame.repCount ? prev : frame.repCount));
            const key = `${frame.variant}|${frame.message}|${frame.repCount}`;
            if (key !== squatBannerKeyRef.current) {
              squatBannerKeyRef.current = key;
              setSquatBanner({ message: frame.message, variant: frame.variant });
            }
          } else if (squatBannerKeyRef.current !== "") {
            squatBannerKeyRef.current = "";
            setSquatBanner(null);
          }
        }
      } catch (error) {
        console.error('Error in pose detection:', error);
      }
      animationFrameId = requestAnimationFrame(runPoseDetection);
    };

    if (cameraActive && detector) {
      runPoseDetection();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if ((plankLiveCoach || squatLiveCoach) && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cameraActive, detector, plankLiveCoach, plankFacingSide, squatLiveCoach, squatSide]);

  // Draw skeletal overlay on canvas
  useEffect(() => {
    if (!canvasRef.current || !showKeypoints || !allPoses.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get the latest pose
    const pose = allPoses[allPoses.length - 1];
    if (!pose || !pose.keypoints) return;

    // Set canvas size to match video display
    if (webcamRef.current?.video) {
      const video = webcamRef.current.video;
      const videoRect = video.getBoundingClientRect();
      const containerRect = video.parentElement?.getBoundingClientRect();
      
      canvas.width = videoRect.width;
      canvas.height = videoRect.height;
      
      canvas.style.width = videoRect.width + 'px';
      canvas.style.height = videoRect.height + 'px';
      if (containerRect) {
        canvas.style.left = videoRect.left - containerRect.left + 'px';
        canvas.style.top = videoRect.top - containerRect.top + 'px';
      }
    }

    // Get video dimensions for scaling
    const video = webcamRef.current?.video;
    if (!video) return;
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate scale factors for object-fit: contain
    const videoAspectRatio = videoWidth / videoHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;

    let scaleX: number;
    let scaleY: number;
    let offsetX = 0;
    let offsetY = 0;

    if (embeddedFullscreen) {
      // Match CSS object-fit: cover (fill view, center crop)
      const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
      scaleX = scale;
      scaleY = scale;
      offsetX = (canvasWidth - videoWidth * scale) / 2;
      offsetY = (canvasHeight - videoHeight * scale) / 2;
    } else if (videoAspectRatio > canvasAspectRatio) {
      scaleX = canvasWidth / videoWidth;
      scaleY = scaleX;
      offsetY = (canvasHeight - videoHeight * scaleY) / 2;
    } else {
      scaleY = canvasHeight / videoHeight;
      scaleX = scaleY;
      offsetX = (canvasWidth - videoWidth * scaleX) / 2;
    }
    
    ctx.strokeStyle = boneColor;
    ctx.lineWidth = boneWeight;

    // Draw skeleton connections
    const allConnections = [
      [5, 7], [7, 9], // Left arm
      [6, 8], [8, 10], // Right arm
      [11, 13], [13, 15], // Left leg
      [12, 14], [14, 16], // Right leg
      [5, 6], // Shoulders
      [11, 12], // Hips
      [5, 11], // Left torso
      [6, 12], // Right torso
    ];
    
    // Only draw selected bones
    allConnections.forEach(([start, end]) => {
      const key = `${start}-${end}`;
      if (!selectedBones.includes(key)) return;
      const startPoint = pose.keypoints[start];
      const endPoint = pose.keypoints[end];
      if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * scaleX + offsetX, startPoint.y * scaleY + offsetY);
        ctx.lineTo(endPoint.x * scaleX + offsetX, endPoint.y * scaleY + offsetY);
        ctx.stroke();
      }
    });

    // Only draw selected joints
    pose.keypoints.forEach((keypoint: any, idx: number) => {
      if (keypoint.score > 0.3 && selectedJoints.includes(idx)) {
        ctx.beginPath();
        ctx.fillStyle = jointColor;
        ctx.arc(keypoint.x * scaleX + offsetX, keypoint.y * scaleY + offsetY, jointSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw angle measurements if enabled
    if (showAngles) {
      const angles = calculatePoseAngles(pose);
      
      // Configure text style
      ctx.font = '14px Arial';
      ctx.fillStyle = '#ffff00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      
      // Draw angles next to joints
      Object.entries(angles).forEach(([joint, angle]) => {
        if (!selectedAngles.includes(joint)) return;
        if (angle !== null) {
          const keypointIndex = {
            leftKnee: 13, rightKnee: 14,
            leftHip: 11, rightHip: 12,
            leftElbow: 7, rightElbow: 8,
            leftShoulder: 5, rightShoulder: 6
          }[joint];
          if (keypointIndex !== undefined) {
            const keypoint = pose.keypoints[keypointIndex];
            if (keypoint && keypoint.score > 0.3) {
              const x = keypoint.x * scaleX + offsetX;
              const y = keypoint.y * scaleY + offsetY;
              const text = `${Math.round(angle)}°`;
              const textWidth = ctx.measureText(text).width;
              const horizontalPadding = 10;
              const verticalPadding = 6;
              const rectHeight = 18;
              const cornerRadius = 6;
              
              // Draw rounded background
              ctx.save();
              ctx.globalAlpha = 0.85;
              ctx.fillStyle = 'rgba(0,0,0,0.7)';
              fillRoundRect(
                ctx,
                x - textWidth / 2 - horizontalPadding,
                y - rectHeight - verticalPadding,
                textWidth + horizontalPadding * 2,
                rectHeight + verticalPadding * 2,
                cornerRadius
              );
              ctx.restore();
              
              // Draw text (white)
              ctx.font = 'bold 14px Arial';
              ctx.fillStyle = '#fff';
              ctx.textBaseline = 'alphabetic';
              ctx.strokeStyle = 'rgba(0,0,0,0.7)';
              ctx.lineWidth = 2;
              ctx.strokeText(text, x, y - 5);
              ctx.fillText(text, x, y - 5);
            }
          }
        }
      });
    }
  }, [
    showKeypoints,
    showAngles,
    allPoses,
    selectedAngles,
    selectedJoints,
    selectedBones,
    boneColor,
    jointColor,
    boneWeight,
    jointSize,
    cameraActive,
    embeddedFullscreen,
  ]);

  // Process pose feedback on each frame
  const processPoseFeedback = useCallback(() => {
    console.log('🔍 processPoseFeedback called:', {
      poseFeedbackEnabled,
      currentPose: !!currentPose,
      exercise: !!exercise,
      exerciseType: exercise?.exerciseType,
      poseAnalysis: !!exercise?.poseAnalysis
    });

    if (!poseFeedbackEnabled || !currentPose || !exercise?.poseAnalysis) {
      return;
    }

    // Parse pose analysis data from exercise
    const poseAnalysisData = exercise.poseAnalysis;
    console.log('🔍 Parsed pose analysis data:', poseAnalysisData);

    // Parse target poses, angle ranges, and tolerance multipliers
    let parsedTargetPoses, parsedAngleRanges, parsedToleranceMultipliers;

    try {
      parsedTargetPoses = typeof poseAnalysisData.targetPoses === 'string' 
        ? JSON.parse(poseAnalysisData.targetPoses) 
        : poseAnalysisData.targetPoses;
      
      parsedAngleRanges = typeof poseAnalysisData.angleRanges === 'string' 
        ? JSON.parse(poseAnalysisData.angleRanges) 
        : poseAnalysisData.angleRanges;
      
      parsedToleranceMultipliers = typeof poseAnalysisData.toleranceMultipliers === 'string' 
        ? JSON.parse(poseAnalysisData.toleranceMultipliers) 
        : poseAnalysisData.toleranceMultipliers;

      console.log('🔍 Parsed targetPoses:', parsedTargetPoses);
      console.log('🔍 Parsed angleRanges:', parsedAngleRanges);
      console.log('🔍 Parsed toleranceMultipliers:', parsedToleranceMultipliers);

      if (!Array.isArray(parsedTargetPoses)) {
        console.log('❌ No valid pose analysis data available - skipping pose detection');
        return;
      }

      console.log('✅ All pose analysis data parsed successfully!');
      console.log('✅ targetPoses count:', parsedTargetPoses.length);
      console.log('✅ angleRanges keys:', Object.keys(parsedAngleRanges || {}));
      console.log('✅ toleranceMultipliers keys:', Object.keys(parsedToleranceMultipliers || {}));

    } catch (error) {
      console.error('❌ Error parsing pose analysis data:', error);
      return;
    }

    // Calculate current angles from keypoints
    const currentAngles = calculateAnglesForPoseAnalysis(currentPose);
    console.log('🔍 Current angles from keypoints:', currentAngles);

    // If calculateAnglesForPoseAnalysis returns empty, use fallback
    if (Object.keys(currentAngles).length === 0) {
      console.log('⚠️ calculateAnglesForPoseAnalysis returned empty, using calculatePoseAngles fallback');
      const rawFallbackAngles = calculatePoseAngles(currentPose);
      // Convert undefined values to null to match expected type
      const fallbackAngles = Object.fromEntries(
        Object.entries(rawFallbackAngles).map(([key, value]) => [key, value ?? null])
      );
      console.log('🔍 Fallback angles from calculatePoseAngles:', fallbackAngles);

      // Use the fallback angles for pose analysis
      const poseResult = analyzeCurrentPose(
        fallbackAngles,
        parsedTargetPoses,
        parsedAngleRanges,
        parsedToleranceMultipliers,
        poseAnalysisData.primaryJoints || []
      );
      
      // Update pose history for hold duration tracking
      setPoseHistory(prev => {
        const newHistory = [...prev, poseResult];
        // Keep only last 30 frames (1 second at 30fps)
        return newHistory.slice(-30);
      });
      
      // Calculate hold duration using the updated history
      const updatedHistory = [...poseHistory, poseResult].slice(-30);
      const holdDuration = calculatePoseHoldDuration(updatedHistory, parsedTargetPoses[0]);
      
      // Update pose result with calculated hold duration
      const poseResultWithHoldDuration = {
        ...poseResult,
        holdDuration
      };
      
      // Update current pose result
      setCurrentPoseResult(poseResultWithHoldDuration);
      
      console.log('🎯 Pose analysis result (fallback):', poseResultWithHoldDuration);
      return;
    }

    // Analyze current pose
    const poseResult = analyzeCurrentPose(
      currentAngles,
      parsedTargetPoses,
      parsedAngleRanges,
      parsedToleranceMultipliers,
      poseAnalysisData.primaryJoints || []
    );
    
    // Update pose history for hold duration tracking
    setPoseHistory(prev => {
      const newHistory = [...prev, poseResult];
      // Keep only last 30 frames (1 second at 30fps)
      return newHistory.slice(-30);
    });
    
    // Calculate hold duration using the updated history
    const updatedHistory = [...poseHistory, poseResult].slice(-30);
    const holdDuration = calculatePoseHoldDuration(updatedHistory, parsedTargetPoses[0]);
    
    // Update pose result with calculated hold duration
    const poseResultWithHoldDuration = {
      ...poseResult,
      holdDuration
    };
    
    // Update current pose result
    setCurrentPoseResult(poseResultWithHoldDuration);
    
    console.log('🎯 Pose analysis result:', poseResultWithHoldDuration);
  }, [currentPose, poseFeedbackEnabled, exercise, poseHistory]);

  // Clear canvas when keypoints are toggled off
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!showKeypoints) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showKeypoints]);

  // Utility functions
  const calculatePoseAngles = (pose: any) => {
    if (!pose || !pose.keypoints) return {};
    
    const keypoints = pose.keypoints;
    return {
      leftKnee: getAngleWithConfidence(keypoints[11], keypoints[13], keypoints[15]).angle, // Left hip, knee, ankle
      rightKnee: getAngleWithConfidence(keypoints[12], keypoints[14], keypoints[16]).angle, // Right hip, knee, ankle
      leftHip: getAngleWithConfidence(keypoints[5], keypoints[11], keypoints[13]).angle, // Left shoulder, hip, knee
      rightHip: getAngleWithConfidence(keypoints[6], keypoints[12], keypoints[14]).angle, // Right shoulder, hip, knee
      leftElbow: getAngleWithConfidence(keypoints[5], keypoints[7], keypoints[9]).angle, // Left shoulder, elbow, wrist
      rightElbow: getAngleWithConfidence(keypoints[6], keypoints[8], keypoints[10]).angle, // Right shoulder, elbow, wrist
      leftShoulder: getAngleWithConfidence(keypoints[11], keypoints[5], keypoints[7]).angle, // Left elbow, shoulder, hip
      rightShoulder: getAngleWithConfidence(keypoints[12], keypoints[6], keypoints[8]).angle, // Right elbow, shoulder, hip
    };
  };

  function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  // Enhanced recording functions — MP4-first for iOS-safe Activity storage.
  const startRecording = () => {
    if (webcamRef.current && webcamRef.current.stream) {
      const { mimeType } = pickLiveRecordingMimeType();

      try {
        const recorder = new MediaRecorder(webcamRef.current.stream, { mimeType });
        const chunks: Blob[] = [];
        const startTime = Date.now();

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blobType = chunks[0]?.type || mimeType;
          const blob = new Blob(chunks, { type: blobType });
          const endTime = Date.now();
          const actualDuration = (endTime - startTime) / 1000;
          const url = URL.createObjectURL(blob);
          onRecordingComplete({ url, blob, durationSec: actualDuration }, []);
          setRecording(false);
          setRecordingStartTime(null);
          setRecordingDuration(actualDuration);
        };
        recorder.start();
        setMediaRecorder(recorder);
        setRecording(true);
        setRecordingStartTime(startTime);
      } catch (error) {
        console.error("Failed to start recording:", error);
        // Fallback: browser default mime (may be WebM on Chrome).
        try {
          const recorder = new MediaRecorder(webcamRef.current.stream);
          const chunks: Blob[] = [];
          const startTime = Date.now();

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          recorder.onstop = () => {
            const blobType = chunks[0]?.type || "video/webm";
            const blob = new Blob(chunks, { type: blobType });
            const endTime = Date.now();
            const actualDuration = (endTime - startTime) / 1000;
            const url = URL.createObjectURL(blob);
            onRecordingComplete({ url, blob, durationSec: actualDuration }, []);
            setRecording(false);
            setRecordingStartTime(null);
            setRecordingDuration(actualDuration);
          };
          recorder.start();
          setMediaRecorder(recorder);
          setRecording(true);
          setRecordingStartTime(startTime);
        } catch (fallbackError) {
          console.error("Recording not supported in this browser:", fallbackError);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  // Simple rep counting functions (matching VideoPlayer)

  
  const toggleRepCounting = (enabled: boolean) => {
    setRepCountingEnabled(enabled);
    if (enabled) {
      // Auto-enable skeleton and angles for rep counting feedback
      setShowKeypoints(true);
      setShowAngles(true);
      console.log('🦴 Auto-enabled skeleton and angles for rep counting feedback');
    } else {
      // Reset rep counting state when disabled
      setCurrentRepCount(0);
      setIsInRep(false);
      setCurrentPhase(null);
      setLastBottomTime(null);
      setRepStates({}); // Reset all rep states
    }
    console.log('🔢 Rep counting:', enabled ? 'enabled' : 'disabled');
  };
  
  const togglePoseFeedback = (enabled: boolean) => {
    setPoseFeedbackEnabled(enabled);
    if (enabled) {
      // Auto-enable skeleton and angles for pose feedback
      setShowKeypoints(true);
      setShowAngles(true);
      console.log('🦴 Auto-enabled skeleton and angles for pose feedback');
    } else {
      // Reset pose feedback state when disabled
      setCurrentPoseResult(null);
      setPoseHistory([]);
    }
    console.log('🎯 Pose feedback:', enabled ? 'enabled' : 'disabled');
  };

  // Process pose feedback when pose feedback is enabled/disabled
  useEffect(() => {
    if (poseFeedbackEnabled && currentPose && exercise?.poseAnalysis) {
      processPoseFeedback();
    }
  }, [poseFeedbackEnabled, exercise?.poseAnalysis]); // Removed currentPose dependency

  // Process pose feedback periodically when enabled (every 100ms instead of every frame)
  useEffect(() => {
    if (!poseFeedbackEnabled || !exercise?.poseAnalysis) {
      return;
    }

    const intervalId = setInterval(() => {
      if (currentPose) {
        processPoseFeedback();
      }
    }, 100); // Process every 100ms instead of every frame

    return () => clearInterval(intervalId);
  }, [poseFeedbackEnabled, exercise?.poseAnalysis, processPoseFeedback]);
  
  const resetRepCount = () => {
    setCurrentRepCount(0);
    setCurrentPhase(null);
    setIsInRep(false);
    setLastBottomTime(null);
    // Reset all rep states
    setRepStates({});
    console.log('🔄 Rep count and states reset');
  };

  const exportCurrentFrame = () => {
    if (!webcamRef.current || !canvasRef.current) return;
    const video = webcamRef.current.video;
    const overlay = canvasRef.current;
    if (!video) return;
    
    // Create an offscreen canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = overlay.width;
    exportCanvas.height = overlay.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    
    // Draw video frame if visible
    if (videoVisible) {
      ctx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
    }
    // Draw overlay (skeleton, angles, etc.)
    ctx.drawImage(overlay, 0, 0, exportCanvas.width, exportCanvas.height);
    
    // Download as PNG
    exportCanvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'frame.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // SVGs for eye/eye-off
  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1em', height: '1.1em', marginRight: '0.35em', verticalAlign: 'middle', display: 'inline-block' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.5 7.5 7.5 4.5 12 4.5c4.5 0 8.5 3 9.75 7.5-1.25 4.5-5.25 7.5-9.75 7.5-4.5 0-8.5-3-9.75-7.5z" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
  const EyeOffIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1em', height: '1.1em', marginRight: '0.35em', verticalAlign: 'middle', display: 'inline-block' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.477 10.477A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .523-.134 1.015-.366 1.438m-1.157 1.157A3 3 0 019 12c0-.523.134-1.015.366-1.438m1.157-1.157A3 3 0 0112 15c-1.657 0-3-1.343-3-3 0-.523.134-1.015.366-1.438m1.157-1.157A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .523-.134 1.015-.366-1.438m-1.157-1.157A3 3 0 019 12c0-.523.134-1.015.366-1.438" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.5 7.5 7.5 4.5 12 4.5c2.042 0 3.97.627 5.563 1.7M21.75 12c-1.25 4.5-5.25 7.5-9.75 7.5-2.042 0-3.97-.627-5.563-1.7" />
    </svg>
  );

  // Controls: Start/stop recording, toggles, audio, advanced panel trigger
  const controls = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        {!recording ? (
          <button
            className="px-4 py-2 rounded text-xs font-medium transition cursor-pointer flex items-center gap-2"
            style={{
              background: '#1AAA00',
              color: '#f3f3f4',
              border: '2px solid transparent'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#118000';
              e.currentTarget.style.color = '##f3f3f4';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#1AAA00';
              e.currentTarget.style.color = '#f3f3f4';
              e.currentTarget.style.borderColor = '2px solid transparent';
            }}
            onClick={startRecording}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            className="bg-red-600 text-white px-4 py-2 rounded text-xs font-medium hover:bg-red-700 transition flex items-center gap-2"
            onClick={stopRecording}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            Stop Recording
          </button>
        )}
        <button
          className="px-4 py-2 rounded text-xs font-medium transition cursor-pointer"
          style={{
            background: 'rgba(0, 0, 0, 0.42)',
            color: '#f3f3f4',
            border: '2px solid #f3f3f4'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.66)';
            e.currentTarget.style.color = '#f3f3f4';
            e.currentTarget.style.borderColor = '#f3f3f4';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.42)';
            e.currentTarget.style.color = '#f3f3f4';
            e.currentTarget.style.borderColor = '#f3f3f4';
          }}
          onClick={onMethodChange}
        >
          Change Method
        </button>
      </div>
    </>
  );

  // --- Panel Content for Each Menu ---
  const selectionPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Focus Selection</div>
      {/* Angles Dropdown */}
      <div ref={anglesDropdownRef} className="flex flex-col" style={{ position: 'relative' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            marginBottom: '3px',
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'angles' ? null : 'angles')}
          type="button"
        >
          Angles
          <span style={{ 
            marginLeft: '8px', 
            display: 'flex', 
            alignItems: 'center',
            transform: openDropdown === 'angles' ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        <div
          style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }}
          className={`rounded-lg p-2 vp-dropdown-anim${openDropdown === 'angles' ? ' open' : ''}`}
          aria-hidden={openDropdown !== 'angles'}
        >
            {ANGLE_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors" style={{ background: 'var(--vp-dropdown-item-bg)', color: 'var(--vp-dropdown-item-text)', whiteSpace: 'nowrap' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)')} onMouseOut={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)')}>
                <input
                  type="checkbox"
                  checked={selectedAngles.includes(opt.key)}
                  onChange={() => setSelectedAngles(selectedAngles => selectedAngles.includes(opt.key)
                    ? selectedAngles.filter(a => a !== opt.key)
                    : [...selectedAngles, opt.key])}
                  style={{ marginRight: '9px' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
      </div>
      {/* Joints Dropdown */}
      <div ref={jointsDropdownRef} className="flex flex-col" style={{ position: 'relative' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            marginBottom: '3px',
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'joints' ? null : 'joints')}
          type="button"
        >
          Joints
          <span style={{ 
            marginLeft: '8px', 
            display: 'flex', 
            alignItems: 'center',
            transform: openDropdown === 'joints' ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        <div
          style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }}
          className={`rounded-lg p-2 vp-dropdown-anim${openDropdown === 'joints' ? ' open' : ''} dropdown-scroll`}
          aria-hidden={openDropdown !== 'joints'}
        >
            {JOINT_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors" style={{ background: 'var(--vp-dropdown-item-bg)', color: 'var(--vp-dropdown-item-text)', whiteSpace: 'nowrap' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)')} onMouseOut={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)')}>
                <input
                  type="checkbox"
                  checked={selectedJoints.includes(opt.key)}
                  onChange={() => setSelectedJoints(selectedJoints => selectedJoints.includes(opt.key)
                    ? selectedJoints.filter(j => j !== opt.key)
                    : [...selectedJoints, opt.key])}
                  style={{ marginRight: '9px' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
      </div>
      {/* Bones Dropdown */}
      <div ref={bonesDropdownRef} className="flex flex-col" style={{ position: 'relative' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            marginBottom: '3px',
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'bones' ? null : 'bones')}
          type="button"
        >
          Bones
          <span style={{ 
            marginLeft: '8px', 
            display: 'flex', 
            alignItems: 'center',
            transform: openDropdown === 'bones' ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        <div
          style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }}
          className={`rounded-lg p-2 vp-dropdown-anim${openDropdown === 'bones' ? ' open' : ''} dropdown-scroll`}
          aria-hidden={openDropdown !== 'bones'}
        >
            {BONE_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors" style={{ background: 'var(--vp-dropdown-item-bg)', color: 'var(--vp-dropdown-item-text)', whiteSpace: 'nowrap' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)')} onMouseOut={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)')}>
                <input
                  type="checkbox"
                  checked={selectedBones.includes(opt.key)}
                  onChange={() => setSelectedBones(selectedBones => selectedBones.includes(opt.key)
                    ? selectedBones.filter(b => b !== opt.key)
                    : [...selectedBones, opt.key])}
                  style={{ marginRight: '9px' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
      </div>
    </div>
  );
  const stylePanelControls = (
    <div className="flex flex-col gap-2" style={{ borderTop: '0px solid var(--vp-border)', paddingTop: '6px' }}>
        <label className="text-xs mb-1" style={{ color: 'var(--vp-label)' }}>
          Bone Color
          <input
            type="color"
            value={boneColor}
            onChange={e => setBoneColor(e.target.value)}
            style={{ marginLeft: '8px', width: '28px', height: '22px', border: 'none', background: 'none', verticalAlign: 'middle', cursor: 'pointer' }}
          />
        </label>
        <label className="text-xs mb-1" style={{ color: 'var(--vp-label)' }}>
          Joint Color
          <input
            type="color"
            value={jointColor}
            onChange={e => setJointColor(e.target.value)}
            style={{ marginLeft: '8px', width: '28px', height: '22px', border: 'none', background: 'none', verticalAlign: 'middle', cursor: 'pointer' }}
          />
        </label>
        <NumericStepperControl
          label="Bone Weight"
          value={boneWeight}
          min={1}
          max={8}
          step={1}
          unit="px"
          onChange={setBoneWeight}
        />
        <NumericStepperControl
          label="Joint Size"
          value={jointSize}
          min={2}
          max={16}
          step={1}
          unit="px"
          onChange={setJointSize}
        />
    </div>
  );

  const stylePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Style</div>
      {stylePanelControls}
    </div>
  );

  // Exercise-type-specific content renderer
  const renderExerciseTypeSpecificContent = () => {
    // Don't render anything if exercise is null/undefined (e.g., Open Move Studio)
    if (!exercise) {
      return null;
    }
    
    const exerciseType = exercise?.exerciseType;
    
    switch (exerciseType) {
      case 'repetition':
      case 'rep-based':
        return (
          <>
            {/* Real-time Rep Analysis - Only show when enabled */}
            {repCountingEnabled && (
              <div style={{ 
                background: 'var(--vp-dropdown-bg)', 
                border: '1px solid var(--vp-dropdown-border)', 
                borderRadius: '4px', 
                padding: '8px', 
                marginBottom: '8px' 
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
                  Real-time Analysis:
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
                  Rep Count: <span style={{ color: '#3b82f6', fontWeight: 500 }}>{currentRepCount}</span>
                  <button 
                    onClick={resetRepCount}
                    style={{ 
                      marginLeft: '8px', 
                      fontSize: '8px', 
                      padding: '2px 4px', 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                    title="Reset rep count"
                  >
                    Reset
                  </button>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
                  Current Phase: <span style={{ 
                    color: currentPhase === 'eccentric' ? '#f59e0b' : 
                           currentPhase === 'concentric' ? '#10b981' : 
                           currentPhase === 'transition' ? '#8b5cf6' : '#6b7280', 
                    fontWeight: 500 
                  }}>{currentPhase || 'None'}</span>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
                  In Rep: <span style={{ color: isInRep ? '#10b981' : '#6b7280', fontWeight: 500 }}>
                    {isInRep ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </>
        );
        
      case 'pose':
      case 'pose-based':
        return (
          <>
            {/* Real-time Pose Analysis - Only show when enabled */}
            {poseFeedbackEnabled && (
              <div style={{ 
                background: 'var(--vp-dropdown-bg)', 
                border: '1px solid var(--vp-dropdown-border)', 
                borderRadius: '4px', 
                padding: '8px', 
                marginBottom: '8px',
                width: '100%',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
                  Real-time Pose Analysis:
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
                  Current Pose: <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                    {currentPoseResult?.currentPose || 'None'}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
                  Hold Duration: <span style={{ color: '#10b981', fontWeight: 500 }}>
                    {currentPoseResult?.holdDuration?.toFixed(1) || '0'}s
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px', maxWidth: '200px' }}>
                  Feedback: <span style={{ 
                    color: currentPoseResult?.severity === 'good' ? '#10b981' : 
                           currentPoseResult?.severity === 'warning' ? '#f59e0b' : '#ef4444', 
                    fontWeight: 500 
                  }}>
                    {currentPoseResult?.feedback || 'No feedback'}
                  </span>
                </div>
              </div>
            )}
          </>
        );
        
      case 'flow':
      case 'flow-based':
        return (
          <>

          </>
        );
        
      default:
        return (
          <div style={{ 
            background: 'var(--vp-dropdown-bg)', 
            border: '1px solid var(--vp-dropdown-border)', 
            borderRadius: '4px', 
            padding: '8px', 
            marginBottom: '8px' 
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
              Exercise Type: {exercise?.exerciseType || 'Unknown'}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>
              No feedback system configured for this exercise type.
            </div>
          </div>
        );
    }
  };

  // Analysis Panel (matching VideoPlayer)
  const analysisPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Motion Analysis</div>
      
      {/* Exercise Type and Classification */}
      {exercise && (
        <div style={{ 
          background: 'var(--vp-dropdown-bg)', 
          border: '1px solid var(--vp-dropdown-border)', 
          borderRadius: '4px', 
          padding: '8px', 
          marginBottom: '8px' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>Motion Classification:</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
            Type: <span style={{ color: '#3b82f6', fontWeight: 500 }}>{exerciseAnalysisData?.exerciseType || 'Unknown'}</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
            Joints of Interest: <span style={{ color: '#10b981', fontWeight: 500 }}>
              {exercise?.jointsOfInterest && Array.isArray(exercise.jointsOfInterest) && exercise.jointsOfInterest.length > 0 
                ? exercise.jointsOfInterest.join(', ')
                : 'None specified'
              }
            </span>
          </div>
        </div>
      )}

      {/* Skeleton Toggle */}
      <button
        onClick={() => setShowKeypoints(!showKeypoints)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showKeypoints ? EyeIcon : EyeOffIcon}Skeleton
      </button>
      
      {/* Angles Toggle */}
      <button
        onClick={() => setShowAngles(!showAngles)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showAngles ? EyeIcon : EyeOffIcon}Angles
      </button>

      {/* Rep Counting Toggle - Only show for rep-based exercises */}
      {(exercise?.exerciseType === 'repetition' || exercise?.exerciseType === 'rep-based') && (
        <div style={{ 
          background: 'var(--vp-dropdown-bg)', 
          border: '1px solid var(--vp-dropdown-border)', 
          borderRadius: '4px', 
          padding: '8px', 
          marginBottom: '8px' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
            Rep Counting:
          </div>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--vp-dropdown-item-text)' }}>
            <input
              type="checkbox"
              checked={repCountingEnabled}
              onChange={(e) => toggleRepCounting(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Enable real-time rep counting
          </label>
          <div style={{ fontSize: 9, color: 'var(--vp-dropdown-item-text)', marginTop: '2px', fontStyle: 'italic' }}>
            Skeleton and angles will be automatically enabled
          </div>
        </div>
      )}

      {/* Pose Feedback Toggle - Only show for pose-based exercises */}
      {(exercise?.exerciseType === 'pose' || exercise?.exerciseType === 'pose-based') && (
        <div style={{ 
          background: 'var(--vp-dropdown-bg)', 
          border: '1px solid var(--vp-dropdown-border)', 
          borderRadius: '4px', 
          padding: '8px', 
          marginBottom: '8px' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
            Pose Feedback:
          </div>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--vp-dropdown-item-text)' }}>
            <input
              type="checkbox"
              checked={poseFeedbackEnabled}
              onChange={(e) => togglePoseFeedback(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Enable real-time pose feedback
          </label>
          <div style={{ fontSize: 9, color: 'var(--vp-dropdown-item-text)', marginTop: '2px', fontStyle: 'italic' }}>
            Skeleton and angles will be automatically enabled
          </div>
        </div>
      )}

      {/* Exercise-Type-Specific Content */}
      {renderExerciseTypeSpecificContent()}


    </div>
  );

  const motionVizPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Motion viz</div>

      
      {/* Exercise Type and Classification */}
      {exercise && (
        <div style={{ 
          background: 'var(--vp-dropdown-bg)', 
          border: '1px solid var(--vp-dropdown-border)', 
          borderRadius: '4px', 
          padding: '8px', 
          marginBottom: '8px' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>Motion Classification:</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
            Type: <span style={{ color: '#3b82f6', fontWeight: 500 }}>{exerciseAnalysisData?.exerciseType || 'Unknown'}</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
            Joints of Interest: <span style={{ color: '#10b981', fontWeight: 500 }}>
              {exercise?.jointsOfInterest && Array.isArray(exercise.jointsOfInterest) && exercise.jointsOfInterest.length > 0 
                ? exercise.jointsOfInterest.join(', ')
                : 'None specified'
              }
            </span>
          </div>
        </div>
      )}

      {/* Skeleton Toggle */}
      <button
        onClick={() => setShowKeypoints(!showKeypoints)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showKeypoints ? EyeIcon : EyeOffIcon}Skeleton
      </button>
      
      {/* Angles Toggle */}
      <button
        onClick={() => setShowAngles(!showAngles)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showAngles ? EyeIcon : EyeOffIcon}Angles
      </button>

      {/* Rep Counting Toggle - Only show for rep-based exercises */}
      {(exercise?.exerciseType === 'repetition' || exercise?.exerciseType === 'rep-based') && (
        <div style={{ 
          background: 'var(--vp-dropdown-bg)', 
          border: '1px solid var(--vp-dropdown-border)', 
          borderRadius: '4px', 
          padding: '8px', 
          marginBottom: '8px' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
            Rep Counting:
          </div>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--vp-dropdown-item-text)' }}>
            <input
              type="checkbox"
              checked={repCountingEnabled}
              onChange={(e) => toggleRepCounting(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Enable real-time rep counting
          </label>
          <div style={{ fontSize: 9, color: 'var(--vp-dropdown-item-text)', marginTop: '2px', fontStyle: 'italic' }}>
            Skeleton and angles will be automatically enabled
          </div>
        </div>
      )}

      {/* Pose Feedback Toggle - Only show for pose-based exercises */}
      {(exercise?.exerciseType === 'pose' || exercise?.exerciseType === 'pose-based') && (
        <div style={{ 
          background: 'var(--vp-dropdown-bg)', 
          border: '1px solid var(--vp-dropdown-border)', 
          borderRadius: '4px', 
          padding: '8px', 
          marginBottom: '8px' 
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>
            Pose Feedback:
          </div>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--vp-dropdown-item-text)' }}>
            <input
              type="checkbox"
              checked={poseFeedbackEnabled}
              onChange={(e) => togglePoseFeedback(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Enable real-time pose feedback
          </label>
          <div style={{ fontSize: 9, color: 'var(--vp-dropdown-item-text)', marginTop: '2px', fontStyle: 'italic' }}>
            Skeleton and angles will be automatically enabled
          </div>
        </div>
      )}

      {/* Exercise-Type-Specific Content */}
      {renderExerciseTypeSpecificContent()}



      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--vp-panel-title)',
          marginTop: '8px',
          marginBottom: '4px',
        }}
      >
        Style
      </div>
      {stylePanelControls}
    </div>
  );

  // --- Panel Content Switch ---
  let panelContent: React.ReactNode = null;
  if (embeddedFullscreen) {
    if (openMenu === 'motionViz') panelContent = motionVizPanel;
  } else if (openMenu === 'focus') panelContent = selectionPanel;
  else if (openMenu === 'style') panelContent = stylePanel;
  else if (openMenu === 'analysis') panelContent = analysisPanel;
  
  // Strategy pattern for feedback overlay based on exercise type
  const renderFeedbackOverlay = () => {
    if (exercise?.exerciseType === 'pose' || exercise?.exerciseType === 'pose-based') {
      // Only show pose feedback overlay when pose feedback is enabled
      if (!poseFeedbackEnabled) {
        console.log('🎭 Pose feedback overlay: HIDDEN (pose feedback disabled)');
        return { type: null };
      }
      
      console.log('🎭 Pose feedback overlay: SHOWN (pose feedback enabled)');
      return {
        type: 'pose' as const,
        currentPose: currentPoseResult?.currentPose || 'No pose detected',
        holdDuration: currentPoseResult?.holdDuration || 0,
        feedback: currentPoseResult?.feedback || 'No feedback',
        severity: currentPoseResult?.severity || 'poor'
      };
    } else if (exercise?.exerciseType === 'repetition' || exercise?.exerciseType === 'rep-based') {
      // Only show rep feedback overlay when rep counting is enabled
      if (!repCountingEnabled) {
        console.log('🔄 Rep feedback overlay: HIDDEN (rep counting disabled)');
        return { type: null };
      }
      
      console.log('🔄 Rep feedback overlay: SHOWN (rep counting enabled)');
      return {
        type: 'rep' as const,
        repCount: currentRepCount,
        onResetRep: resetRepCount
      };
    } else if (exercise?.exerciseType === 'flow' || exercise?.exerciseType === 'flow-based') {
      // Only show flow feedback overlay when flow feedback is enabled (placeholder for future)
      // For now, always return null since flow feedback isn't implemented yet
      console.log('🌊 Flow feedback overlay: HIDDEN (not implemented yet)');
      return { type: null };
    } else {
      // No feedback overlay for unsupported exercise types (expected for Open Move Studio)
      return { type: null };
    }
  };

  const sportBanner =
    (plankLiveCoach && plankBanner) || (squatLiveCoach && squatBanner) || null;

  const feedbackForPlayer =
    sportBanner
      ? {
          type: 'plank' as const,
          plankMessage: sportBanner.message,
          plankVariant: sportBanner.variant,
        }
      : renderFeedbackOverlay();

  const showMobileLiveToolbar = isMobile && embeddedFullscreen;
  const cameraControlsDisabled = recording;

  const mobileLiveToolbarActions: CoreVideoToolbarAction[] | undefined = showMobileLiveToolbar
    ? [
        {
          id: 'orientation',
          ariaLabel:
            captureAspect === 'portrait' ? 'Switch to landscape' : 'Switch to portrait',
          disabled: cameraControlsDisabled,
          onClick: () =>
            setCaptureAspect((a) => (a === 'portrait' ? 'landscape' : 'portrait')),
          icon: captureAspect === 'portrait' ? <PortraitPhoneIcon /> : <LandscapePhoneIcon />,
        },
        {
          id: 'camera-facing',
          ariaLabel: cameraFacing === 'environment' ? 'Use front camera' : 'Use back camera',
          disabled: cameraControlsDisabled,
          onClick: () =>
            setCameraFacing((f) => (f === 'environment' ? 'user' : 'environment')),
          icon: <SwitchCameraIcon />,
        },
      ]
    : undefined;

  // Don't render Webcam during SSR
  if (!isMounted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p style={{ color: 'var(--foreground)' }}>Loading camera...</p>
          </div>
        </div>
      </div>
    );
  }

  const liveBottomOverlay = controls;

  const squatRepOverlay =
    squatLiveCoach ? (
      <div
        style={{
          position: "absolute",
          top: embeddedFullscreen ? "max(12px, env(safe-area-inset-top))" : 12,
          left: embeddedFullscreen ? "max(12px, env(safe-area-inset-left))" : 12,
          zIndex: 36,
          background: "rgba(0, 0, 0, 0.7)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8,
          padding: "8px 10px",
          color: "white",
          minWidth: 78,
          pointerEvents: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", opacity: 0.9 }}>SQUAT REPS</div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{squatRepCount}</div>
      </div>
    ) : null;

  const videoShell = (
    <div style={{ width: '100%', height: embeddedFullscreen ? '100%' : undefined, minHeight: embeddedFullscreen ? 0 : undefined }}>
      <CoreVideoPlayer
        videoElement={
          <div
            style={{
              opacity: videoVisible ? 1 : 0,
              pointerEvents: videoVisible ? 'auto' : 'none',
              transition: 'opacity 0.2s ease-in-out',
              width: embeddedFullscreen ? '100%' : undefined,
              height: embeddedFullscreen ? '100%' : undefined,
              minHeight: embeddedFullscreen ? 0 : undefined,
              position: embeddedFullscreen ? 'relative' : undefined,
            }}
          >
            <Webcam
              key={
                embeddedFullscreen
                  ? isMobile
                    ? `live-${captureAspect}-${cameraFacing}`
                    : "live-fs-desktop-landscape"
                  : "live-default"
              }
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              className={
                embeddedFullscreen
                  ? 'block h-full w-full min-h-0 object-cover'
                  : 'rounded w-full'
              }
            />
          </div>
        }
        canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
        overlays={squatRepOverlay}
        panelContent={panelContent}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        showAdvancedPanel={showAdvancedPanel}
        onCloseAdvancedPanel={() => setShowAdvancedPanel(v => !v)}
        hidePlayBar={true}
        fillContainer={embeddedFullscreen}
        onToolbarClose={embeddedFullscreen ? onEmbeddedClose : undefined}
        toolbarActions={mobileLiveToolbarActions}
        compactToolbar={embeddedFullscreen}
        touchToolbar={showMobileLiveToolbar}
        onToolbarExport={exportCurrentFrame}
        bottomOverlay={liveBottomOverlay}
        containerClassName={embeddedFullscreen ? 'w-full h-full min-h-0' : ''}
        style={embeddedFullscreen ? { width: '100%', height: '100%', minHeight: 0 } : undefined}
        feedbackOverlay={feedbackForPlayer}
      />
    </div>
  );

  if (embeddedFullscreen) {
    const shellStyle: React.CSSProperties =
      isMobile && viewportBox
        ? {
            position: "fixed",
            top: 0,
            left: 0,
            width: viewportBox.w,
            height: viewportBox.h,
            maxWidth: "100dvw",
            maxHeight: "100dvh",
            overflow: "hidden",
            overscrollBehavior: "none",
            touchAction: "manipulation",
          }
        : {
            minHeight: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            overscrollBehavior: "none",
            touchAction: "manipulation",
          };

    return (
      <div
        className="relative flex flex-col bg-black"
        style={shellStyle}
      >
        {recording ? (
          <div
            className="pointer-events-none absolute left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-white shadow-lg animate-pulse"
            style={{ top: 'max(10px, env(safe-area-inset-top))' }}
          >
            <span className="h-2 w-2 animate-ping rounded-full bg-white" />
            <span className="text-xs font-medium">Recording</span>
          </div>
        ) : null}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">{videoShell}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      {recording && (
        <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white animate-pulse">
          <div className="h-2 w-2 animate-ping rounded-full bg-white" />
          <span className="text-sm font-regular">Recording...</span>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {videoShell}
      </div>
    </div>
  );
} 