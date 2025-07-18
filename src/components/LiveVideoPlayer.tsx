"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import CoreVideoPlayer from "./CoreVideoPlayer";

interface LiveVideoPlayerProps {
  onRecordingComplete: (videoUrl: string) => void;
  onMethodChange: () => void;
  referenceAngles?: any;
  exercise: any;
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

export default function LiveVideoPlayer({ onRecordingComplete, onMethodChange, referenceAngles, exercise }: LiveVideoPlayerProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(true);

  // Advanced panel state
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(true);
  const [advancedTab, setAdvancedTab] = useState<'selection' | 'style' | 'actions'>('selection');
  const [openDropdown, setOpenDropdown] = useState<'angles' | 'joints' | 'bones' | 'focus' | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(ANGLE_OPTIONS.map(a => a.key));
  const [selectedJoints, setSelectedJoints] = useState<number[]>(JOINT_OPTIONS.map(j => j.key));
  const [selectedBones, setSelectedBones] = useState<string[]>(BONE_OPTIONS.map(b => b.key));
  const [zoomTarget, setZoomTarget] = useState<'full' | 'upper-body' | 'lower-body' | 'knees' | 'shoulders' | 'hips'>('full');
  const [boneColor, setBoneColor] = useState<string>('#00ff00');
  const [jointColor, setJointColor] = useState<string>('#00ff00');
  const [boneWeight, setBoneWeight] = useState<number>(2);
  const [jointSize, setJointSize] = useState<number>(4);
  const [videoVisible, setVideoVisible] = useState(true);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [showAngles, setShowAngles] = useState(false);

  // Add a ref for closing dropdowns on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load pose detection model
  useEffect(() => {
    async function loadModel() {
      await tf.setBackend("webgl");
      await tf.ready();
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      setDetector(detector);
    }
    loadModel();
  }, []);

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
  }, [cameraActive]);

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
        setAllPoses(prev => {
          const newPoses = [...prev, pose];
          // Keep only the last 10 poses to avoid memory issues
          return newPoses.slice(-10);
        });
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
    };
  }, [cameraActive, detector]);

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
    
    let scaleX, scaleY, offsetX = 0, offsetY = 0;
    
    if (videoAspectRatio > canvasAspectRatio) {
      // Video is wider than canvas - scale by width, center vertically
      scaleX = canvasWidth / videoWidth;
      scaleY = scaleX;
      offsetY = (canvasHeight - videoHeight * scaleY) / 2;
    } else {
      // Video is taller than canvas - scale by height, center horizontally
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
              const text = `${angle}°`;
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
  }, [showKeypoints, showAngles, allPoses, selectedAngles, selectedJoints, selectedBones, boneColor, jointColor, boneWeight, jointSize, cameraActive]);

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
  const calculateAngle = (p1: any, p2: any, p3: any): number | null => {
    if (!p1 || !p2 || !p3 || p1.score < 0.3 || p2.score < 0.3 || p3.score < 0.3) {
      return null;
    }
    
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                  Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let degrees = angle * 180 / Math.PI;
    
    // Normalize to 0-360
    if (degrees < 0) degrees += 360;
    return Math.round(degrees);
  };

  const calculatePoseAngles = (pose: any) => {
    if (!pose || !pose.keypoints) return {};
    
    const keypoints = pose.keypoints;
    return {
      leftKnee: calculateAngle(keypoints[11], keypoints[13], keypoints[15]), // Left hip, knee, ankle
      rightKnee: calculateAngle(keypoints[12], keypoints[14], keypoints[16]), // Right hip, knee, ankle
      leftHip: calculateAngle(keypoints[5], keypoints[11], keypoints[13]), // Left shoulder, hip, knee
      rightHip: calculateAngle(keypoints[6], keypoints[12], keypoints[14]), // Right shoulder, hip, knee
      leftElbow: calculateAngle(keypoints[5], keypoints[7], keypoints[9]), // Left shoulder, elbow, wrist
      rightElbow: calculateAngle(keypoints[6], keypoints[8], keypoints[10]), // Right shoulder, elbow, wrist
      leftShoulder: calculateAngle(keypoints[7], keypoints[5], keypoints[11]), // Left elbow, shoulder, hip
      rightShoulder: calculateAngle(keypoints[8], keypoints[6], keypoints[12]), // Right elbow, shoulder, hip
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

  // Recording functions
  const startRecording = () => {
    if (webcamRef.current && webcamRef.current.stream) {
      const recorder = new MediaRecorder(webcamRef.current.stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        console.log('Recording stopped, blob size:', blob.size, 'url:', url);
        setVideoUrl(url);
        onRecordingComplete(url);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setRecording(false);
    }
  };

  const setZoomPreset = (target: typeof zoomTarget) => {
    setZoomTarget(target);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 0', minWidth: '260px' }}>
        {!recording ? (
          <button
            className="px-6 py-3 rounded text-xs font-medium transition cursor-pointer"
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
            Start Recording
          </button>
        ) : (
          <button
            className="bg-red-600 text-white px-6 py-3 rounded text-xs font-medium hover:bg-red-700 transition"
            onClick={stopRecording}
          >
            Stop Recording
          </button>
        )}
        <button
          className="px-6 py-3 rounded text-xs font-medium transition cursor-pointer"
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

  // Advanced panel UI (tabs, dropdowns, style/actions)
  const advancedPanel = (
    <div
      style={{
        background: 'transparent',
        borderRadius: '9px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
        padding: '18px 14px',
        border: '2px solid var(--vp-panel-border,rgb(17, 255, 0))',
        color: 'var(--vp-panel-text, #222)',
        minHeight: '100px',
        maxHeight: '1000px',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        alignItems: 'stretch',
      }}
    >
      {/* Tab Bar */}
      <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '10px', gap: '4px' }}>
        <button
          onClick={() => setAdvancedTab('selection')}
          style={{
            flex: 1,
            padding: '6px 0',
            border: 'none',
            borderBottom: advancedTab === 'selection'
              ? '0px solid var(--vp-tab-border-active)'
              : '0px solid var(--vp-tab-border-inactive)',
            background: advancedTab === 'selection'
              ? 'var(--vp-tab-bg-active)'
              : 'var(--vp-tab-bg-inactive)',
            color: advancedTab === 'selection'
              ? 'var(--vp-tab-active)'
              : 'var(--vp-tab-inactive)',
            fontWeight: 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            borderRadius: '6px 6px 6px 6px',
            transition: 'color 0.3s, background 0.3s, border-bottom 0.0s',
          }}
        >Selection</button>
        <button
          onClick={() => setAdvancedTab('style')}
          style={{
            flex: 1,
            padding: '6px 0',
            border: 'none',
            borderBottom: advancedTab === 'style'
              ? '0px solid var(--vp-tab-border-active)'
              : '0px solid var(--vp-tab-border-inactive)',
            background: advancedTab === 'style'
              ? 'var(--vp-tab-bg-active)'
              : 'var(--vp-tab-bg-inactive)',
            color: advancedTab === 'style'
              ? 'var(--vp-tab-active)'
              : 'var(--vp-tab-inactive)',
            fontWeight: 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            borderRadius: '6px 6px 6px 6px',
            transition: 'color 0.3s, background 0.3s, border-bottom 0.0s',
          }}
        >Style</button>
        <button
          onClick={() => setAdvancedTab('actions')}
          style={{
            flex: 1,
            padding: '6px 0',
            border: 'none',
            borderBottom: advancedTab === 'actions'
              ? '0px solid var(--vp-tab-border-active)'
              : '0px solid var(--vp-tab-border-inactive)',
            background: advancedTab === 'actions'
              ? 'var(--vp-tab-bg-active)'
              : 'var(--vp-tab-bg-inactive)',
            color: advancedTab === 'actions'
              ? 'var(--vp-tab-active)'
              : 'var(--vp-tab-inactive)',
            fontWeight: 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            borderRadius: '6px 6px 6px 6px',
            transition: 'color 0.3s, background 0.3s, border-bottom 0.0s',
          }}
        >Actions</button>
      </div>
      {/* Tab Content */}
      {advancedTab === 'selection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Angles Dropdown */}
          <div className="flex flex-col" style={{ position: 'relative' }}>
            <button
              className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
              style={{
                border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
                color: 'var(--vp-dropdown-label, #353839)',
                fontWeight: 500,
                marginBottom: '10px',
                transition: 'color 0.2s, border 0.2s',
              }}
              onClick={() => setOpenDropdown(openDropdown === 'angles' ? null : 'angles')}
              type="button"
            >
              Angles
              <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>
            {openDropdown === 'angles' &&
              <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
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
            }
          </div>
          {/* Joints Dropdown */}
          <div className="flex flex-col" style={{ position: 'relative' }}>
            <button
              className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
              style={{
                border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
                color: 'var(--vp-dropdown-label, #353839)',
                fontWeight: 500,
                marginBottom: '10px',
                transition: 'color 0.2s, border 0.2s',
              }}
              onClick={() => setOpenDropdown(openDropdown === 'joints' ? null : 'joints')}
              type="button"
            >
              Joints
              <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>
            {openDropdown === 'joints' && (
              <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open dropdown-scroll">
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
            )}
          </div>
          {/* Bones Dropdown */}
          <div className="flex flex-col" style={{ position: 'relative' }}>
            <button
              className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
              style={{
                border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
                color: 'var(--vp-dropdown-label, #353839)',
                fontWeight: 500,
                marginBottom: '10px',
                transition: 'color 0.2s, border 0.2s',
              }}
              onClick={() => setOpenDropdown(openDropdown === 'bones' ? null : 'bones')}
              type="button"
            >
              Bones
              <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>
            {openDropdown === 'bones' && (
              <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open dropdown-scroll">
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
            )}
          </div>
        </div>
      )}
      {advancedTab === 'style' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Overlay Theme Controls */}
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
            <label className="text-xs mb-1" style={{ color: 'var(--vp-label)' }}>
              Bone Weight
              <input
                type="range"
                min={1}
                max={8}
                value={boneWeight}
                onChange={e => setBoneWeight(Number(e.target.value))}
                style={{ marginLeft: '8px', width: '60px', verticalAlign: 'middle' }}
              />
              <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--vp-label)' }}>{boneWeight}px</span>
            </label>
            <label className="text-xs mb-1" style={{ color: 'var(--vp-label)' }}>
              Joint Size
              <input
                type="range"
                min={2}
                max={16}
                value={jointSize}
                onChange={e => setJointSize(Number(e.target.value))}
                style={{ marginLeft: '8px', width: '60px', verticalAlign: 'middle' }}
              />
              <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--vp-label)' }}>{jointSize}px</span>
            </label>
          </div>
        </div>
      )}
      {advancedTab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Skeleton Toggle (icon + text) */}
          <button
            onClick={() => setShowKeypoints(!showKeypoints)}
            className="px-3 py-2 rounded text-sm vp-btn flex items-center"
            style={{ marginBottom: '4px' }}
          >
            {showKeypoints ? EyeIcon : EyeOffIcon}Skeleton
          </button>
          {/* Angles Toggle (icon + text) */}
          <button
            onClick={() => setShowAngles(!showAngles)}
            className="px-3 py-2 rounded text-sm vp-btn flex items-center"
            style={{ marginBottom: '4px' }}
          >
            {showAngles ? EyeIcon : EyeOffIcon}Angles
          </button>
          {/* Show/Hide Video Toggle (icon + text) */}
          <button
            onClick={() => setVideoVisible(v => !v)}
            className="px-3 py-2 rounded text-sm vp-btn flex items-center"
            style={{ marginBottom: '4px' }}
          >
            {videoVisible ? EyeIcon : EyeOffIcon}Video
          </button>
          {/* Export Frame Button */}
          <button
            onClick={exportCurrentFrame}
            className="px-3 py-2 rounded text-sm vp-btn"
            style={{ marginBottom: '4px' }}
          >
            Export Frame
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      {/* Main video container */}
      <div style={{ position: 'relative', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Video player */}
        <div style={{ position: 'relative' }}>
          <CoreVideoPlayer
            videoElement={
              <div style={{ opacity: videoVisible ? 1 : 0, pointerEvents: videoVisible ? 'auto' : 'none', transition: 'opacity 0.2s ease-in-out' }}>
    <Webcam
      ref={webcamRef}
      audio={false}
      videoConstraints={{
        width: 360,
        height: 640,
        aspectRatio: 9 / 16,
        facingMode: "user",
      }}
      className="rounded w-full"
                />
              </div>
            }
        canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
            overlays={<></>}
        controls={controls}
        advancedPanel={advancedPanel}
        showAdvancedPanel={showAdvancedPanel}
        onCloseAdvancedPanel={() => setShowAdvancedPanel(v => !v)}
      />
        </div>
      </div>
    </div>
  );
} 