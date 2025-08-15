"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import CoreVideoPlayer from "./CoreVideoPlayer";
import { getAngleWithConfidence } from '../lib/analysisUtils';
import { useRealTimeAnalysis, RealTimeAnalysisConfig, DEFAULT_CONFIG } from '../hooks/useRealTimeAnalysis_01';
import RealTimeFeedback from './RealTimeFeedback';

interface LiveVideoPlayerProps {
  onRecordingComplete: (videoUrl: string, duration: number, realTimeAnalysisData?: any[]) => void;
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

  // Add recording duration tracking
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number | null>(null);

  // Advanced panel state
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(true);
  const [advancedTab, setAdvancedTab] = useState<'focus' | 'style' | 'biomechanics'>('focus');
  const [openDropdown, setOpenDropdown] = useState<'angles' | 'joints' | 'bones' | 'focus' | 'exerciseType' | 'sensitivity' | 'feedbackLevel' | null>(null);
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

  // Controls for panel switching
  const [openMenu, setOpenMenu] = useState<null | 'export' | 'biomechanics' | 'style' | 'focus' | 'analysis'>(null);

  // Enhanced real-time analysis state
  const [currentPose, setCurrentPose] = useState<any>(null);
  const [exerciseAnalysisData, setExerciseAnalysisData] = useState<any>(null);
  const [showRealTimeFeedback, setShowRealTimeFeedback] = useState(true);
  const [isRealTimeAnalysisActive, setIsRealTimeAnalysisActive] = useState(false);
  
  // Real-time analysis configuration
  const [realTimeConfig, setRealTimeConfig] = useState<RealTimeAnalysisConfig>({
    ...DEFAULT_CONFIG,
    isActive: false,
    dataCollection: false
  });
  
  // Data collection during recording
  const [realTimeAnalysisData, setRealTimeAnalysisData] = useState<any[]>([]);

  // Enhanced real-time analysis hook with configuration
  const realTimeAnalysis = useRealTimeAnalysis(currentPose, exerciseAnalysisData, realTimeConfig);

  // Collect real-time analysis data when recording and shouldCollectData is true
  useEffect(() => {
    if (recording && realTimeAnalysis.shouldCollectData && realTimeAnalysis.rawData) {
      setRealTimeAnalysisData(prev => [...prev, {
        timestamp: realTimeAnalysis.timestamp,
        analysis: realTimeAnalysis,
        rawData: realTimeAnalysis.rawData
      }]);
    }
  }, [recording, realTimeAnalysis.shouldCollectData, realTimeAnalysis.rawData, realTimeAnalysis.timestamp]);

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
            
            // Auto-configure real-time analysis based on exercise type
            setRealTimeConfig(prev => ({
              ...prev,
              exerciseType: data.exercise.exerciseType || 'auto',
              jointsOfInterest: exercise.jointsOfInterest || undefined
            }));
          }
        })
        .catch(error => {
          console.error('Error loading exercise analysis data:', error);
        });
    }
  }, [exercise?.id, exercise?.jointsOfInterest]);

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
        setCurrentPose(pose); // Set current pose for real-time analysis
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

  // Enhanced recording functions with real-time analysis data collection
  const startRecording = () => {
    if (webcamRef.current && webcamRef.current.stream) {
      // Reset real-time analysis data collection
      setRealTimeAnalysisData([]);
      
      // Enable data collection in real-time analysis
      setRealTimeConfig(prev => ({
        ...prev,
        dataCollection: true
      }));
      
      // Safari-compatible MIME type detection
      const mimeType = MediaRecorder.isTypeSupported('video/webm') 
        ? 'video/webm' 
        : MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4' 
        : 'video/webm'; // fallback
      
      try {
        const recorder = new MediaRecorder(webcamRef.current.stream, { mimeType });
        const chunks: Blob[] = [];
        const startTime = Date.now(); // Store start time in a local variable
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          //console.log('Recording stopped, blob size:', blob.size);
          
          // Calculate actual recording duration using the local startTime variable
          const endTime = Date.now();
          const actualDuration = (endTime - startTime) / 1000; // Convert to seconds
          //console.log('Actual recording duration:', actualDuration, 'seconds');
          
          const url = URL.createObjectURL(blob);
          //console.log('LiveVideoPlayer: calling onRecordingComplete with URL:', url, 'duration:', actualDuration);
          
          // Pass real-time analysis data along with video
          onRecordingComplete(url, actualDuration, realTimeAnalysisData);
          
          setRecording(false);
          setRecordingStartTime(null);
          setRecordingDuration(actualDuration);
          
          // Disable data collection
          setRealTimeConfig(prev => ({
            ...prev,
            dataCollection: false
          }));
        };
        recorder.start();
        setMediaRecorder(recorder);
        setRecording(true);
        setRecordingStartTime(startTime);
      } catch (error) {
        console.error('Failed to start recording:', error);
        // Fallback: try without specifying MIME type
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
            const blob = new Blob(chunks);
            const endTime = Date.now();
            const actualDuration = (endTime - startTime) / 1000;
            const url = URL.createObjectURL(blob);
            
            // Pass real-time analysis data along with video
            onRecordingComplete(url, actualDuration, realTimeAnalysisData);
            
            setRecording(false);
            setRecordingStartTime(null);
            setRecordingDuration(actualDuration);
            
            // Disable data collection
            setRealTimeConfig(prev => ({
              ...prev,
              dataCollection: false
            }));
          };
          recorder.start();
          setMediaRecorder(recorder);
          setRecording(true);
          setRecordingStartTime(startTime);
        } catch (fallbackError) {
          console.error('Recording not supported in this browser:', fallbackError);
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

  // Enhanced real-time analysis toggle
  const toggleRealTimeAnalysis = () => {
    const newActive = !realTimeConfig.isActive;
    setRealTimeConfig(prev => ({
      ...prev,
      isActive: newActive
    }));
    setIsRealTimeAnalysisActive(newActive);
  };

  // Real-time analysis configuration handlers
  const updateRealTimeConfig = (updates: Partial<RealTimeAnalysisConfig>) => {
    setRealTimeConfig(prev => ({
      ...prev,
      ...updates
    }));
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
      <div className="flex flex-col" style={{ position: 'relative' }}>
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
            marginBottom: '3px',
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
            marginBottom: '3px',
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
  );
  const stylePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Style</div>
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
  );
  const actionsPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Biomechanics</div>
      {/* Skeleton Toggle (icon + text) */}
      <button
        onClick={() => setShowKeypoints(!showKeypoints)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showKeypoints ? EyeIcon : EyeOffIcon}Skeleton
      </button>
      {/* Angles Toggle (icon + text) */}
      <button
        onClick={() => setShowAngles(!showAngles)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showAngles ? EyeIcon : EyeOffIcon}Angles
      </button>
      {/* Show/Hide Video Toggle (icon + text) */}
      <button
        onClick={() => setVideoVisible(v => !v)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {videoVisible ? EyeIcon : EyeOffIcon}Video
      </button>
      {/* Live Analysis Toggle */}
      <button
        onClick={toggleRealTimeAnalysis}
        className={`px-3 py-2 rounded text-xs vp-btn flex items-center ${
          realTimeConfig.isActive ? 'bg-green-600 text-white' : ''
        }`}
        style={{ marginBottom: '4px' }}
      >
        {realTimeConfig.isActive ? '🟢' : '⚪'}Live Analysis
      </button>
      {/* Real-time Feedback Toggle */}
      <button
        onClick={() => setShowRealTimeFeedback(v => !v)}
        className="px-3 py-2 rounded text-xs vp-btn flex items-center"
        style={{ marginBottom: '4px' }}
      >
        {showRealTimeFeedback ? EyeIcon : EyeOffIcon}Feedback
      </button>
      {/* Export Frame Button */}
      <button
        onClick={exportCurrentFrame}
        className="px-3 py-2 rounded text-xs vp-btn"
        style={{ marginBottom: '4px' }}
      >
        Export Frame
      </button>
    </div>
  );
  const exportPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Export</div>
      {/* Export Frame Button only */}
      <button
        onClick={exportCurrentFrame}
        className="px-3 py-2 rounded text-xs vp-btn"
        style={{ marginBottom: '4px' }}
      >
        Export Frame
      </button>
    </div>
  );

  // Analysis Configuration Panel
  const analysisPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Real-time Analysis</div>
      
      {/* Live Analysis Toggle */}
      <button
        onClick={toggleRealTimeAnalysis}
        className={`px-3 py-2 rounded text-xs vp-btn flex items-center justify-between ${
          realTimeConfig.isActive ? 'bg-green-600 text-white' : ''
        }`}
        style={{ marginBottom: '4px' }}
      >
        <span>Live Analysis</span>
        <span>{realTimeConfig.isActive ? '🟢' : '⚪'}</span>
      </button>
      
      {/* Audio Feedback Toggle */}
      <button
        onClick={() => updateRealTimeConfig({ audioEnabled: !realTimeConfig.audioEnabled })}
        className={`px-3 py-2 rounded text-xs vp-btn flex items-center justify-between ${
          realTimeConfig.audioEnabled ? 'bg-blue-600 text-white' : ''
        }`}
        style={{ marginBottom: '4px' }}
      >
        <span>Audio Feedback</span>
        <span>{realTimeConfig.audioEnabled ? '🔊' : '🔇'}</span>
      </button>
      
      {/* Exercise Type Selection */}
      <div className="flex flex-col" style={{ position: 'relative', marginBottom: '4px' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'exerciseType' ? null : 'exerciseType')}
          type="button"
        >
          Exercise Type: {realTimeConfig.exerciseType}
          <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {openDropdown === 'exerciseType' &&
          <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
            {['auto', 'repetition', 'pose', 'flow'].map(type => (
              <button
                key={type}
                className="w-full text-left text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                style={{ 
                  background: realTimeConfig.exerciseType === type ? 'var(--vp-dropdown-item-selected-bg, #3b82f6)' : 'var(--vp-dropdown-item-bg)', 
                  color: realTimeConfig.exerciseType === type ? 'white' : 'var(--vp-dropdown-item-text)',
                  whiteSpace: 'nowrap' 
                }}
                onMouseOver={e => {
                  if (realTimeConfig.exerciseType !== type) {
                    e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)';
                  }
                }}
                onMouseOut={e => {
                  if (realTimeConfig.exerciseType !== type) {
                    e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)';
                  }
                }}
                onClick={() => {
                  updateRealTimeConfig({ exerciseType: type as any });
                  setOpenDropdown(null);
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        }
      </div>
      
      {/* Sensitivity Selection */}
      <div className="flex flex-col" style={{ position: 'relative', marginBottom: '4px' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'sensitivity' ? null : 'sensitivity')}
          type="button"
        >
          Sensitivity: {realTimeConfig.sensitivity}
          <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {openDropdown === 'sensitivity' &&
          <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
            {['low', 'medium', 'high'].map(sensitivity => (
              <button
                key={sensitivity}
                className="w-full text-left text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                style={{ 
                  background: realTimeConfig.sensitivity === sensitivity ? 'var(--vp-dropdown-item-selected-bg, #3b82f6)' : 'var(--vp-dropdown-item-bg)', 
                  color: realTimeConfig.sensitivity === sensitivity ? 'white' : 'var(--vp-dropdown-item-text)',
                  whiteSpace: 'nowrap' 
                }}
                onMouseOver={e => {
                  if (realTimeConfig.sensitivity !== sensitivity) {
                    e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)';
                  }
                }}
                onMouseOut={e => {
                  if (realTimeConfig.sensitivity !== sensitivity) {
                    e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)';
                  }
                }}
                onClick={() => {
                  updateRealTimeConfig({ sensitivity: sensitivity as any });
                  setOpenDropdown(null);
                }}
              >
                {sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1)}
              </button>
            ))}
          </div>
        }
      </div>
      
      {/* Feedback Level Selection */}
      <div className="flex flex-col" style={{ position: 'relative', marginBottom: '4px' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'feedbackLevel' ? null : 'feedbackLevel')}
          type="button"
        >
          Feedback: {realTimeConfig.feedbackLevel}
          <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {openDropdown === 'feedbackLevel' &&
          <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
            {['minimal', 'detailed', 'full'].map(level => (
              <button
                key={level}
                className="w-full text-left text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                style={{ 
                  background: realTimeConfig.feedbackLevel === level ? 'var(--vp-dropdown-item-selected-bg, #3b82f6)' : 'var(--vp-dropdown-item-bg)', 
                  color: realTimeConfig.feedbackLevel === level ? 'white' : 'var(--vp-dropdown-item-text)',
                  whiteSpace: 'nowrap' 
                }}
                onMouseOver={e => {
                  if (realTimeConfig.feedbackLevel !== level) {
                    e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)';
                  }
                }}
                onMouseOut={e => {
                  if (realTimeConfig.feedbackLevel !== level) {
                    e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)';
                  }
                }}
                onClick={() => {
                  updateRealTimeConfig({ feedbackLevel: level as any });
                  setOpenDropdown(null);
                }}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        }
      </div>
      
      {/* Status Display */}
      <div style={{ 
        background: 'var(--vp-dropdown-bg)', 
        border: '1px solid var(--vp-dropdown-border)', 
        borderRadius: '4px', 
        padding: '8px', 
        marginTop: '4px' 
      }}>
        <div style={{ fontSize: 10, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>Status:</div>
        <div style={{ fontSize: 10, color: realTimeConfig.isActive ? '#10b981' : '#6b7280' }}>
          {realTimeConfig.isActive ? 'Active' : 'Inactive'}
        </div>
        {realTimeConfig.isActive && (
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: '2px' }}>
            {realTimeConfig.exerciseType} • {realTimeConfig.sensitivity} • {realTimeConfig.feedbackLevel}
          </div>
        )}
      </div>
    </div>
  );

  // --- Panel Content Switch ---
  let panelContent: React.ReactNode = null;
  if (openMenu === 'focus') panelContent = selectionPanel; // Changed from 'selection'
  else if (openMenu === 'style') panelContent = stylePanel;
  else if (openMenu === 'biomechanics') panelContent = actionsPanel; // Changed from 'actions'
  else if (openMenu === 'export') panelContent = exportPanel;
  else if (openMenu === 'analysis') panelContent = analysisPanel;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      {/* Real-time Feedback */}
      <RealTimeFeedback
        analysis={realTimeAnalysis}
        exerciseType={exerciseAnalysisData?.exerciseType || 'repetition'}
        isVisible={showRealTimeFeedback && isRealTimeAnalysisActive && !!currentPose && !!exerciseAnalysisData}
      />
      
      {/* Recording Indicator */}
      {recording && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          <span className="text-sm font-medium">Recording...</span>
        </div>
      )}
      
      {/* Main video container */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
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
            panelContent={panelContent}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            showAdvancedPanel={showAdvancedPanel}
            onCloseAdvancedPanel={() => setShowAdvancedPanel(v => !v)}
            hidePlayBar={true}
          />
          
          {/* Recording controls overlaid with absolute positioning */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px',
            zIndex: 20
          }}>
            {controls}
          </div>
        </div>
        
        {/* Remove the controls from outside the video player */}
      </div>
    </div>
  );
} 