"use client";
import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import { calculateEnhancedComparison, calculateBalanceMetrics, getAngleWithConfidence, getTrunkAngleWithConfidence } from '../../../lib/analysisUtils';
import LiveVideoPlayer from '../../../components/LiveVideoPlayer';
import { Exercise } from '../../../data/exercises';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import * as Dialog from '@radix-ui/react-dialog';
import InfoTooltip from '../../../components/InfoTooltip';

export type PracticeTabProps = { 
  exercise: Exercise; 
  router: AppRouterInstance; 
};

// Calculate overall comparison results
const calculateComparison = (userAngles: any, referenceAngles: any, jointsOfInterest: string[]) => {
  //console.log('calculateComparison called with:', { userAngles, referenceAngles, jointsOfInterest });
  
  const results: any = {};
  let totalScore = 0;
  let totalComparisons = 0;
  
  jointsOfInterest.forEach(joint => {
    //console.log(`Processing joint: ${joint}`);
    let userAngleArray: (number | null)[] = [];
    let refAngleArray: (number | null)[] = [];
    
    switch (joint) {
      case 'leftKnee':
        userAngleArray = userAngles.leftKneeAngles || [];
        refAngleArray = referenceAngles.leftKneeAngles || [];
        break;
      case 'rightKnee':
        userAngleArray = userAngles.rightKneeAngles || [];
        refAngleArray = referenceAngles.rightKneeAngles || [];
        break;
      case 'leftHip':
        userAngleArray = userAngles.leftHipAngles || [];
        refAngleArray = referenceAngles.leftHipAngles || [];
        break;
      case 'rightHip':
        userAngleArray = userAngles.rightHipAngles || [];
        refAngleArray = referenceAngles.rightHipAngles || [];
        break;
      case 'leftElbow':
        userAngleArray = userAngles.leftElbowAngles || [];
        refAngleArray = referenceAngles.leftElbowAngles || [];
        break;
      case 'rightElbow':
        userAngleArray = userAngles.rightElbowAngles || [];
        refAngleArray = referenceAngles.rightElbowAngles || [];
        break;
      case 'leftShoulder':
        userAngleArray = userAngles.leftShoulderAbdAngles || [];
        refAngleArray = referenceAngles.leftShoulderAbdAngles || [];
        break;
      case 'rightShoulder':
        userAngleArray = userAngles.rightShoulderAbdAngles || [];
        refAngleArray = referenceAngles.rightShoulderAbdAngles || [];
        break;
      case 'trunk':
        userAngleArray = userAngles.trunkAngles || [];
        refAngleArray = referenceAngles.trunkAngles || [];
        break;
    }
    
    //console.log(`${joint} - User angles: ${userAngleArray.length} frames, Reference angles: ${refAngleArray.length} frames`);
    //console.log(`${joint} - Sample user angles:`, userAngleArray.slice(0, 5));
    //console.log(`${joint} - Sample reference angles:`, refAngleArray.slice(0, 5));
    
    // Calculate average difference with better handling of different lengths
    let totalDifference = 0;
    let validComparisons = 0;
    
    // Use the shorter array length to avoid going out of bounds
    const minLength = Math.min(userAngleArray.length, refAngleArray.length);
    
    for (let i = 0; i < minLength; i++) {
      const userAngle = userAngleArray[i];
      const refAngle = refAngleArray[i];
      
      if (userAngle !== null && refAngle !== null) {
        const difference = Math.abs(userAngle - refAngle);
        totalDifference += difference;
        validComparisons++;
      }
    }
    
    const avgDifference = validComparisons > 0 ? totalDifference / validComparisons : 0;
    // Adjust scoring: 15 degrees = 100%, 30 degrees = 70%, 45 degrees = 40%, 60+ degrees = 10%
    const score = validComparisons > 0 ? Math.max(0, Math.min(100, 100 - (avgDifference * 1.5))) : 0;
    
    //console.log(`${joint} - Valid comparisons: ${validComparisons}, Avg difference: ${avgDifference}, Score: ${score}`);
    
    results[joint] = {
      avgDifference: Math.round(avgDifference * 10) / 10,
      score: Math.round(score),
      validComparisons
    };
    
    totalScore += score;
    totalComparisons++;
  });
  
  results.overall = {
    score: totalComparisons > 0 ? Math.round(totalScore / totalComparisons) : 0,
    grade: totalComparisons > 0 ? 
      (totalScore / totalComparisons >= 90 ? 'A' :
       totalScore / totalComparisons >= 80 ? 'B' :
       totalScore / totalComparisons >= 70 ? 'C' :
       totalScore / totalComparisons >= 60 ? 'D' : 'F') : 'N/A'
  };
  
  return results;
}

export default function PracticeTab({ exercise, router }: PracticeTabProps) {
  // --- State and refs (copied and adapted from try page) ---
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRecordedVideo, setIsRecordedVideo] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<string>("");
  const [feedbackColor, setFeedbackColor] = useState<'green' | 'yellow' | 'red'>('green');
  const [currentAnalysisPose, setCurrentAnalysisPose] = useState<any>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Add new state for live recording flow
  const [showLiveRecordingPreview, setShowLiveRecordingPreview] = useState(false);
  const [liveRecordingUrl, setLiveRecordingUrl] = useState<string | null>(null);
  const [liveRecordingDuration, setLiveRecordingDuration] = useState<number | null>(null);

  // Angle tracking
  const [leftKneeAngles, setLeftKneeAngles] = useState<(number | null)[]>([]);
  const [rightKneeAngles, setRightKneeAngles] = useState<(number | null)[]>([]);
  const [leftHipAngles, setLeftHipAngles] = useState<(number | null)[]>([]);
  const [rightHipAngles, setRightHipAngles] = useState<(number | null)[]>([]);
  const [leftElbowAngles, setLeftElbowAngles] = useState<(number | null)[]>([]);
  const [rightElbowAngles, setRightElbowAngles] = useState<(number | null)[]>([]);
  const [leftShoulderAbdAngles, setLeftShoulderAbdAngles] = useState<(number | null)[]>([]);
  const [rightShoulderAbdAngles, setRightShoulderAbdAngles] = useState<(number | null)[]>([]);
  const [trunkAngles, setTrunkAngles] = useState<(number | null)[]>([]);

  // Reference data and comparison
  const [referenceKeypoints, setReferenceKeypoints] = useState<any[]>([]);
  const [referenceAngles, setReferenceAngles] = useState<any>(null);

  // --- Load reference data if available ---
  useEffect(() => {
    if (exercise && exercise.referenceKeypointsUrl) {
      // Use proxy to fetch reference keypoints (avoids CORS and works with GCS)
      fetch('/api/storage/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl }),
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch reference keypoints');
          return res.json();
        })
        .then(data => setReferenceKeypoints(data))
        .catch(() => setReferenceKeypoints([]));
    }
  }, [exercise]);

  // --- Load pose detection model ---
  useEffect(() => {
    async function loadModel() {
      try {
        console.log('🔄 Loading TensorFlow backend...');
        await tf.setBackend("webgl");
        await tf.ready();
        console.log('✅ TensorFlow backend ready');
        
        console.log('🔄 Loading pose detection model...');
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        console.log('✅ Pose detection model loaded successfully');
        setDetector(detector);
      } catch (error) {
        console.error('❌ Error loading pose detection model:', error);
        
        // Retry with different backend if WebGL fails
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('webgl') || errorMessage.includes('fetch')) {
          console.log('🔄 Retrying with CPU backend...');
          try {
            await tf.setBackend("cpu");
            await tf.ready();
            const detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
            );
            console.log('✅ Pose detection model loaded with CPU backend');
            setDetector(detector);
          } catch (retryError) {
            console.error('❌ Failed to load model with CPU backend:', retryError);
          }
        }
      }
    }
    loadModel();
  }, []);

  // --- Process reference keypoints to get angles ---
  useEffect(() => {
    if (referenceKeypoints.length > 0) {
      const angles = {
        leftKneeAngles: [] as (number | null)[],
        rightKneeAngles: [] as (number | null)[],
        leftHipAngles: [] as (number | null)[],
        rightHipAngles: [] as (number | null)[],
        leftElbowAngles: [] as (number | null)[],
        rightElbowAngles: [] as (number | null)[],
        leftShoulderAbdAngles: [] as (number | null)[],
        rightShoulderAbdAngles: [] as (number | null)[],
        trunkAngles: [] as (number | null)[]
      };

      referenceKeypoints.forEach((pose: any) => {
        if (pose && pose.keypoints) {
          const keypoints = pose.keypoints;
          const leftHip = keypoints[11];
          const rightHip = keypoints[12];
          const leftKnee = keypoints[13];
          const rightKnee = keypoints[14];
          const leftAnkle = keypoints[15];
          const rightAnkle = keypoints[16];
          const leftShoulder = keypoints[5];
          const rightShoulder = keypoints[6];
          const leftElbow = keypoints[7];
          const rightElbow = keypoints[8];
          const leftWrist = keypoints[9];
          const rightWrist = keypoints[10];

          angles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle).angle : null);
          angles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle).angle : null);
          angles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee).angle : null);
          angles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee).angle : null);
          angles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist).angle : null);
          angles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist).angle : null);
          angles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow).angle : null);
          angles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow).angle : null);
          angles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip).angle : null);
        } else {
          angles.leftKneeAngles.push(null);
          angles.rightKneeAngles.push(null);
          angles.leftHipAngles.push(null);
          angles.rightHipAngles.push(null);
          angles.leftElbowAngles.push(null);
          angles.rightElbowAngles.push(null);
          angles.leftShoulderAbdAngles.push(null);
          angles.rightShoulderAbdAngles.push(null);
          angles.trunkAngles.push(null);
        }
      });

      setReferenceAngles(angles);
    }
  }, [referenceKeypoints]);

  // --- Canvas/video scaling logic (copied from try page) ---
  useEffect(() => {
    function updateCanvasSize(video: HTMLVideoElement | null) {
      const canvas = canvasRef.current;
      if (video && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Also set CSS dimensions to match the display size
        const rect = video.getBoundingClientRect();
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
      }
    }

    if (videoUrl && videoRef.current) {
      videoRef.current.onloadedmetadata = () => updateCanvasSize(videoRef.current);
    } else if (!videoUrl && cameraActive && webcamRef.current && webcamRef.current.video) {
      webcamRef.current.video.onloadedmetadata = () =>
        updateCanvasSize(webcamRef.current?.video as HTMLVideoElement);
    }
  }, [videoUrl, cameraActive]);

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

  // --- Reset all state on new recording/upload (copied from try page) ---
  function resetAllState() {
    setLeftKneeAngles([]);
    setRightKneeAngles([]);
    setLeftHipAngles([]);
    setRightHipAngles([]);
    setLeftElbowAngles([]);
    setRightElbowAngles([]);
    setLeftShoulderAbdAngles([]);
    setRightShoulderAbdAngles([]);
    setTrunkAngles([]);
    setAllPoses([]);
    setCurrentFeedback('');
  }

  // Add a function to reset the file input
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Start recording (copied from try page) ---
  const startRecording = () => {
    if (webcamRef.current && webcamRef.current.stream) {
      const recorder = new MediaRecorder(webcamRef.current.stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecordedVideo(true);
        // Wait for the video element to load metadata before processing
        const checkAndProcess = () => {
          if (videoRef.current && videoRef.current.readyState >= 1) {
            processRecordedVideo(url);
          } else if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => processRecordedVideo(url);
          } else {
            setTimeout(checkAndProcess, 100);
          }
        };
        setTimeout(checkAndProcess, 100);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      resetAllState();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      setCurrentFeedback('');
    }
  };

  const handleStartCamera = () => {
    setCameraActive(true);
    setRecording(false);
    resetAllState();
    setTimeout(() => {
      if (webcamRef.current?.video) {
        const video = webcamRef.current.video;
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      }
    }, 500);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      setIsRecordedVideo(false);
      setShowUploadModal(true);
      resetAllState();
    }
  };

  // --- Handlers for camera, upload, recording, analysis, etc. ---
  // Note: Both uploaded and recorded videos use the same processRecordedVideo function
  // This matches the original try page behavior

  // --- Video processing for recorded videos (called automatically when recording stops) ---
  const processRecordedVideo = async (videoUrlParam?: string) => {
    console.log('processRecordedVideo called', videoUrlParam);

    if (!videoRef.current || !detector || !canvasRef.current) {
      console.log('processRecordedVideo: missing requirements', {
        videoRef: !!videoRef.current,
        detector: !!detector,
        canvasRef: !!canvasRef.current
      });
      return;
    }

    console.log('processRecordedVideo: starting analysis loop');
    console.log('videoRef.current:', videoRef.current);
    console.log('detector:', detector);
    console.log('canvasRef.current:', canvasRef.current);

    if (typeof window !== "undefined") {
      localStorage.removeItem("lastAngles");
      localStorage.removeItem("lastComparison");
    }
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poses: any[] = [];
    const angles = {
      leftKneeAngles: [] as (number | null)[],
      rightKneeAngles: [] as (number | null)[],
      leftHipAngles: [] as (number | null)[],
      rightHipAngles: [] as (number | null)[],
      leftElbowAngles: [] as (number | null)[],
      rightElbowAngles: [] as (number | null)[],
      leftShoulderAbdAngles: [] as (number | null)[],
      rightShoulderAbdAngles: [] as (number | null)[],
      trunkAngles: [] as (number | null)[]
    };
    try {
      await new Promise((resolve) => {
        const checkReady = () => {
          if (video.readyState >= 1 && video.duration > 0 && video.duration !== Infinity) {
            resolve(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        // Also listen for the loadedmetadata event
        video.onloadedmetadata = () => {
          setTimeout(checkReady, 50);
        };
        
        // Start checking immediately
        checkReady();
      });
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      const frameRate = 30;
      const step = 3; // Process every 3rd frame (10fps) for efficiency
      const totalFrames = Math.floor(duration * frameRate / step);
      let processedFrames = 0;
      for (let t = 0; t < duration; t += step / frameRate) {
        video.currentTime = t;
        await new Promise((resolve) => (video.onseeked = resolve));
        const pose = await detector.estimatePoses(video);
        if (pose && pose.length > 0) {
          poses.push(pose[0]);
          setCurrentAnalysisPose(pose[0]);
          const keypoints = pose[0].keypoints;
          const leftHip = keypoints[11];
          const rightHip = keypoints[12];
          const leftKnee = keypoints[13];
          const rightKnee = keypoints[14];
          const leftAnkle = keypoints[15];
          const rightAnkle = keypoints[16];
          const leftShoulder = keypoints[5];
          const rightShoulder = keypoints[6];
          const leftElbow = keypoints[7];
          const rightElbow = keypoints[8];
          const leftWrist = keypoints[9];
          const rightWrist = keypoints[10];
          angles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle).angle : null);
          angles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle).angle : null);
          angles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee).angle : null);
          angles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee).angle : null);
          angles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist).angle : null);
          angles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist).angle : null);
          angles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow).angle : null);
          angles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow).angle : null);
          angles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip).angle : null);
        } else {
          poses.push(null);
          angles.leftKneeAngles.push(null);
          angles.rightKneeAngles.push(null);
          angles.leftHipAngles.push(null);
          angles.rightHipAngles.push(null);
          angles.leftElbowAngles.push(null);
          angles.rightElbowAngles.push(null);
          angles.leftShoulderAbdAngles.push(null);
          angles.rightShoulderAbdAngles.push(null);
          angles.trunkAngles.push(null);
        }
        processedFrames++;
        const progress = Math.round((processedFrames / totalFrames) * 100);
        setAnalysisProgress(progress);
        console.log('processRecordedVideo: progress updated', progress);
      }
      setAllPoses(poses);
      setLeftKneeAngles(angles.leftKneeAngles);
      setRightKneeAngles(angles.rightKneeAngles);
      setLeftHipAngles(angles.leftHipAngles);
      setRightHipAngles(angles.rightHipAngles);
      setLeftElbowAngles(angles.leftElbowAngles);
      setRightElbowAngles(angles.rightElbowAngles);
      setLeftShoulderAbdAngles(angles.leftShoulderAbdAngles);
      setRightShoulderAbdAngles(angles.rightShoulderAbdAngles);
      setTrunkAngles(angles.trunkAngles);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("lastPoses", JSON.stringify(poses));
          localStorage.setItem("lastAngles", JSON.stringify(angles));
          localStorage.setItem("lastAnalysisTimestamp", Date.now().toString());
          if (referenceAngles && exercise && exercise.jointsOfInterest && exercise.jointsOfInterest.length > 0) {
            const comparison = calculateComparison(angles, referenceAngles, exercise.jointsOfInterest);
            localStorage.setItem("lastComparison", JSON.stringify(comparison));
          }
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      }
      const urlToUse = videoUrlParam || videoUrl;
      if (exercise && exercise.id && urlToUse) {
        router.push(`/results/${exercise.id}?video=${encodeURIComponent(urlToUse)}`);
      }
    } catch (error) {
      console.error('Error processing video:', error);
      alert('Error processing video. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      console.log('processRecordedVideo: analysis complete');
    }
  };

  // --- Video processing for uploaded videos (called when clicking "Analyze Video") ---
  const processUploadedVideo = async () => {
    if (!videoRef.current || !detector || !canvasRef.current) return;
    
    // Clear previous analysis data
    if (typeof window !== "undefined") {
      localStorage.removeItem("lastAngles");
      localStorage.removeItem("lastComparison");
    }
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poses: any[] = [];
    const angles = {
      leftKneeAngles: [] as (number | null)[],
      rightKneeAngles: [] as (number | null)[],
      leftHipAngles: [] as (number | null)[],
      rightHipAngles: [] as (number | null)[],
      leftElbowAngles: [] as (number | null)[],
      rightElbowAngles: [] as (number | null)[],
      leftShoulderAbdAngles: [] as (number | null)[],
      rightShoulderAbdAngles: [] as (number | null)[],
      trunkAngles: [] as (number | null)[]
    };
    
    try {
      // Wait for video to be ready with valid duration
      await new Promise((resolve) => {
        const checkReady = () => {
          if (video.readyState >= 1 && video.duration > 0 && video.duration !== Infinity) {
            resolve(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        // Also listen for the loadedmetadata event
        video.onloadedmetadata = () => {
          setTimeout(checkReady, 50);
        };
        
        // Start checking immediately
        checkReady();
      });
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      const frameRate = 30;
      const step = 3; // Process every 3rd frame (10fps) for efficiency
      const totalFrames = Math.floor(duration * frameRate / step);
      let processedFrames = 0;
      
      for (let t = 0; t < duration; t += step / frameRate) {
        video.currentTime = t;
        await new Promise((resolve) => (video.onseeked = resolve));
        
        const pose = await detector.estimatePoses(video);
        if (pose && pose.length > 0) {
          poses.push(pose[0]);
          setCurrentAnalysisPose(pose[0]); // Update pose for visualization
          
          // Calculate angles
          const keypoints = pose[0].keypoints;
          const leftHip = keypoints[11];
          const rightHip = keypoints[12];
          const leftKnee = keypoints[13];
          const rightKnee = keypoints[14];
          const leftAnkle = keypoints[15];
          const rightAnkle = keypoints[16];
          const leftShoulder = keypoints[5];
          const rightShoulder = keypoints[6];
          const leftElbow = keypoints[7];
          const rightElbow = keypoints[8];
          const leftWrist = keypoints[9];
          const rightWrist = keypoints[10];

          angles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle).angle : null);
          angles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle).angle : null);
          angles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee).angle : null);
          angles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee).angle : null);
          angles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist).angle : null);
          angles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist).angle : null);
          angles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow).angle : null);
          angles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow).angle : null);
          angles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip).angle : null);
        } else {
          poses.push(null);
          angles.leftKneeAngles.push(null);
          angles.rightKneeAngles.push(null);
          angles.leftHipAngles.push(null);
          angles.rightHipAngles.push(null);
          angles.leftElbowAngles.push(null);
          angles.rightElbowAngles.push(null);
          angles.leftShoulderAbdAngles.push(null);
          angles.rightShoulderAbdAngles.push(null);
          angles.trunkAngles.push(null);
        }
        
        // Update progress
        processedFrames++;
        const progress = Math.round((processedFrames / totalFrames) * 100);
        setAnalysisProgress(progress);
      }
      
      // Store results
      setAllPoses(poses);
      setLeftKneeAngles(angles.leftKneeAngles);
      setRightKneeAngles(angles.rightKneeAngles);
      setLeftHipAngles(angles.leftHipAngles);
      setRightHipAngles(angles.rightHipAngles);
      setLeftElbowAngles(angles.leftElbowAngles);
      setRightElbowAngles(angles.rightElbowAngles);
      setLeftShoulderAbdAngles(angles.leftShoulderAbdAngles);
      setRightShoulderAbdAngles(angles.rightShoulderAbdAngles);
      setTrunkAngles(angles.trunkAngles);
      
      // Navigate to results
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("lastPoses", JSON.stringify(poses));
          localStorage.setItem("lastAngles", JSON.stringify(angles));
          localStorage.setItem("lastAnalysisTimestamp", Date.now().toString());
          
          if (referenceAngles && exercise && exercise.jointsOfInterest && exercise.jointsOfInterest.length > 0) {
            const comparison = calculateComparison(angles, referenceAngles, exercise.jointsOfInterest);
            localStorage.setItem("lastComparison", JSON.stringify(comparison));
          }
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      }
      
      if (exercise && exercise.id && videoUrl) {
        setShowUploadModal(false);
        router.push(`/results/${exercise.id}?video=${encodeURIComponent(videoUrl)}`);
      }
      
    } catch (error) {
      console.error('Error processing video:', error);
      alert('Error processing video. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // --- Live pose detection for enhanced feedback (only when not using LiveVideoPlayer) ---
  useEffect(() => {
    let animationFrameId: number;

    const runPoseDetection = async () => {
      // COMPLETELY DISABLE pose detection when LiveVideoPlayer is active
      if (cameraActive) {
        console.log('[DEBUG] PracticeTab pose detection DISABLED - LiveVideoPlayer is active');
        return;
      }

      if (!detector || !webcamRef.current || !webcamRef.current.video) {
        console.log('[DEBUG] Missing requirements for pose detection', {
          cameraActive,
          detectorLoaded: !!detector,
          webcam: !!webcamRef.current,
          video: !!webcamRef.current?.video
        });
        return;
      }

      const video = webcamRef.current.video;
      if (video.readyState !== 4) {
        console.log('[DEBUG] Video not ready', { readyState: video.readyState });
        return;
      }

      try {
        const poses = await detector.estimatePoses(video);
        console.log('[DEBUG] detector.estimatePoses called', { poses });
        const pose = poses[0] || null;
        setAllPoses(prev => {
          const updated = [...prev.slice(-29), pose];
          console.log('[DEBUG] setAllPoses', { updated });
          return updated;
        });
        setCurrentAnalysisPose(pose);
      } catch (err) {
        console.error('[DEBUG] Error in runPoseDetection', err);
      }
      
      // Only continue the loop if camera is NOT active
      if (!cameraActive) {
        animationFrameId = requestAnimationFrame(runPoseDetection);
      }
    };

    // COMPLETELY DISABLE pose detection when LiveVideoPlayer is active
    if (!cameraActive && detector) {
      console.log('[DEBUG] Starting PracticeTab pose detection (LiveVideoPlayer inactive)');
      animationFrameId = requestAnimationFrame(runPoseDetection);
    } else {
      console.log('[DEBUG] PracticeTab pose detection DISABLED - LiveVideoPlayer active or no detector');
    }
    
    return () => {
      if (animationFrameId) {
        console.log('[DEBUG] Cleaning up PracticeTab pose detection');
        cancelAnimationFrame(animationFrameId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, detector, exercise, referenceAngles]);

  // Handle recording completion from LiveVideoPlayer
  const handleRecordingComplete = (videoUrl: string, duration: number, realTimeAnalysisData?: any[]) => {
    console.log('🎬 handleRecordingComplete called with:', videoUrl, duration, realTimeAnalysisData);
    
    setLiveRecordingUrl(videoUrl);
    setLiveRecordingDuration(duration);
    
    // Store real-time analysis data for use in results
    if (realTimeAnalysisData && realTimeAnalysisData.length > 0) {
      console.log('📊 Real-time analysis data collected:', realTimeAnalysisData.length, 'frames');
      // Store in localStorage for access in results page
      if (typeof window !== "undefined") {
        localStorage.setItem("realTimeAnalysisData", JSON.stringify(realTimeAnalysisData));
      }
    }
    
    setShowLiveRecordingPreview(true);
    setShowLiveModal(false); // Close the live recording modal
  };

  // Handle analyzing the live recording
  const handleAnalyzeLiveRecording = async () => {
    if (!liveRecordingUrl) {
      console.error('No live recording URL available');
      return;
    }

    console.log('🔍 Starting analysis of live recording:', liveRecordingUrl);
    console.log('🔍 Detector available:', !!detector);
    
    // Clear previous analysis data
    if (typeof window !== "undefined") {
      localStorage.removeItem("lastAngles");
      localStorage.removeItem("lastComparison");
      localStorage.removeItem("lastPoses");
    }
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Create a temporary video element to process the recorded video
      const tempVideo = document.createElement('video');
      tempVideo.src = liveRecordingUrl;
      tempVideo.muted = true;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const checkReady = () => {
          /* console.log('🔍 Checking video readiness:', {
            readyState: tempVideo.readyState,
            duration: tempVideo.duration,
            videoWidth: tempVideo.videoWidth,
            videoHeight: tempVideo.videoHeight,
            src: tempVideo.src
          }) */;
          
          // Check if video is ready to process
          // readyState 4 means HAVE_ENOUGH_DATA, which is sufficient for processing
          // We'll handle duration calculation differently
          if (tempVideo.readyState >= 4 && tempVideo.videoWidth > 0 && tempVideo.videoHeight > 0) {
            console.log('✅ Video ready for processing:', {
              duration: tempVideo.duration,
              width: tempVideo.videoWidth,
              height: tempVideo.videoHeight
            });
            resolve(true);
      } else {
            //console.log('⏳ Video not ready yet, retrying...');
            setTimeout(checkReady, 100);
          }
        };
        
        tempVideo.addEventListener('loadedmetadata', () => {
          //console.log('📹 Video metadata loaded');
          setTimeout(checkReady, 50);
        });
        
        tempVideo.addEventListener('loadeddata', () => {
          //console.log('📹 Video data loaded');
          setTimeout(checkReady, 50);
        });
        
        tempVideo.addEventListener('canplay', () => {
          //console.log('📹 Video can play');
          setTimeout(checkReady, 50);
        });
        
        tempVideo.addEventListener('error', (error) => {
          console.error('❌ Error loading video:', error);
          reject(error);
        });
        
        //console.log('🔄 Starting video load...');
        tempVideo.load();
        checkReady();
      });
      
      // Process the video frames
      const poses: any[] = [];
      const angles = {
        leftKneeAngles: [] as (number | null)[],
        rightKneeAngles: [] as (number | null)[],
        leftHipAngles: [] as (number | null)[],
        rightHipAngles: [] as (number | null)[],
        leftElbowAngles: [] as (number | null)[],
        rightElbowAngles: [] as (number | null)[],
        leftShoulderAbdAngles: [] as (number | null)[],
        rightShoulderAbdAngles: [] as (number | null)[],
        trunkAngles: [] as (number | null)[]
      };
      
      // Get video duration, with fallback if it's Infinity
      let duration = tempVideo.duration;
      if (duration === Infinity || duration <= 0) {
        //console.log('⚠️ Video duration is Infinity, using actual recording duration');
        // Use the actual recording duration we tracked
        duration = liveRecordingDuration || 60; // Fallback to 60 seconds if not available
        //console.log('📏 Using actual recording duration:', duration);
      }
      
      const frameRate = 30;
      const step = 3; // Process every 3rd frame (10fps) for efficiency
      const totalFrames = Math.floor(duration * frameRate / step);
      let processedFrames = 0;
      
      //console.log('🎬 Processing video frames:', { duration, totalFrames });
      
      for (let t = 0; t < duration; t += step / frameRate) {
        //console.log(`🎬 Processing frame at time ${t}s (${processedFrames + 1}/${totalFrames})`);
        
        tempVideo.currentTime = t;
        await new Promise((resolve) => (tempVideo.onseeked = resolve));
        
        // Check if we've reached the end of the video
        if (tempVideo.ended) {
          //console.log('🎬 Reached end of video, stopping processing');
          break;
        }
        
        //console.log(`🎬 Seeking to time ${t}s complete, estimating poses...`);
        const pose = await detector!.estimatePoses(tempVideo);
        //console.log(`🎬 Pose estimation complete, found ${pose ? pose.length : 0} poses`);
        
        if (pose && pose.length > 0) {
          poses.push(pose[0]);
          setCurrentAnalysisPose(pose[0]);
          
          const keypoints = pose[0].keypoints;
          const leftHip = keypoints[11];
          const rightHip = keypoints[12];
          const leftKnee = keypoints[13];
          const rightKnee = keypoints[14];
          const leftAnkle = keypoints[15];
          const rightAnkle = keypoints[16];
          const leftShoulder = keypoints[5];
          const rightShoulder = keypoints[6];
          const leftElbow = keypoints[7];
          const rightElbow = keypoints[8];
          const leftWrist = keypoints[9];
          const rightWrist = keypoints[10];
          
          angles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle).angle : null);
          angles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle).angle : null);
          angles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee).angle : null);
          angles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee).angle : null);
          angles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist).angle : null);
          angles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist).angle : null);
          angles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow).angle : null);
          angles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow).angle : null);
          angles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip).angle : null);
        } else {
          poses.push(null);
          angles.leftKneeAngles.push(null);
          angles.rightKneeAngles.push(null);
          angles.leftHipAngles.push(null);
          angles.rightHipAngles.push(null);
          angles.leftElbowAngles.push(null);
          angles.rightElbowAngles.push(null);
          angles.leftShoulderAbdAngles.push(null);
          angles.rightShoulderAbdAngles.push(null);
          angles.trunkAngles.push(null);
        }
        
        processedFrames++;
        const progress = Math.round((processedFrames / totalFrames) * 100);
        setAnalysisProgress(progress);
        console.log('🎬 Progress:', progress + '%');
      }
      
      // Store results
      setAllPoses(poses);
      setLeftKneeAngles(angles.leftKneeAngles);
      setRightKneeAngles(angles.rightKneeAngles);
      setLeftHipAngles(angles.leftHipAngles);
      setRightHipAngles(angles.rightHipAngles);
      setLeftElbowAngles(angles.leftElbowAngles);
      setRightElbowAngles(angles.rightElbowAngles);
      setLeftShoulderAbdAngles(angles.leftShoulderAbdAngles);
      setRightShoulderAbdAngles(angles.rightShoulderAbdAngles);
      setTrunkAngles(angles.trunkAngles);
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("lastPoses", JSON.stringify(poses));
          localStorage.setItem("lastAngles", JSON.stringify(angles));
          localStorage.setItem("lastAnalysisTimestamp", Date.now().toString());
          
          if (referenceAngles && exercise && exercise.jointsOfInterest && exercise.jointsOfInterest.length > 0) {
            const comparison = calculateComparison(angles, referenceAngles, exercise.jointsOfInterest);
            localStorage.setItem("lastComparison", JSON.stringify(comparison));
          }
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      }
      
      // Navigate to results
      if (exercise && exercise.id && liveRecordingUrl) {
        console.log('✅ Analysis complete, navigating to results');
        const urlParams = new URLSearchParams();
        urlParams.set('video', liveRecordingUrl);
        if (liveRecordingDuration) {
          urlParams.set('duration', liveRecordingDuration.toString());
        }
        router.push(`/results/${exercise.id}?${urlParams.toString()}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing live recording:', error);
      alert('Error processing video. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      console.log('🎬 Live recording analysis complete');
    }
  };

  // Handle retaking the live recording
  const handleRetakeLiveRecording = () => {
    setShowLiveRecordingPreview(false);
    setLiveRecordingUrl(null);
    setShowLiveModal(true);
  };

  // Handle canceling the live recording
  const handleCancelLiveRecording = () => {
    setShowLiveRecordingPreview(false);
    setLiveRecordingUrl(null);
    resetAllState();
  };

  // --- UI ---
  // Custom video component that displays correct duration for live recordings
  const LiveRecordingVideo = ({ src, duration }: { src: string; duration: number }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        // Add null check to prevent errors during cleanup
        const videoElement = videoRef.current;
        if (videoElement) {
          try {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            videoElement.removeEventListener('play', handlePlay);
            videoElement.removeEventListener('pause', handlePause);
          } catch (error) {
            // Silently handle any cleanup errors
          }
        }
      };
    }, []);

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (video) {
        const newTime = (parseFloat(e.target.value) / 100) * duration;
        video.currentTime = newTime;
      }
    };

    const togglePlay = () => {
      const video = videoRef.current;
      if (video) {
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
      }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="relative w-full">
        <video
          ref={videoRef}
          src={src}
          className="w-full rounded-lg"
          style={{ maxHeight: '60vh', objectFit: 'contain' }}
          muted
        />
        
        {/* Custom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 rounded-b-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #6B7280 ${progress}%, #6B7280 100%)`
                }}
              />
            </div>
            
            <span className="text-white text-sm min-w-[80px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="p-0 border-0 border-red-500">
        
        <div className="text-left border-0 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-medium">Test Your Form</h2>
            <InfoTooltip 
              content="Recording Guidelines: Make sure your full body is in frame – especially ensuring that the joints of interest are clearly visible and in frame. Good lighting and good color contrast between clothes and background."
              side="top"
              align="center"
              maxWidth="280px"
            />
          </div>
          <p className="text-onyx-30 text-sm  mb-4">
            Compare and analyze your form to the reference video by either uploading a video or live-recording a video of yourself performing the movement(s).
          </p>
          <div className="flex gap-4 justify-left mb-0">
            <Dialog.Root open={showLiveModal} onOpenChange={setShowLiveModal}>
              <Dialog.Trigger asChild>
                <button
                  className="px-2 py-2 rounded-md font-medium text-xs transition cursor-pointer"
                  style={{
                    background: 'var(--secondary-button-bg)',
                    color: 'var(--secondary-button-text)',
                    border: '2px solid var(--secondary-button-border)'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'var(--secondary-button-hover-bg)';
                    e.currentTarget.style.color = 'var(--secondary-button-hover-text)';
                    e.currentTarget.style.borderColor = 'var(--secondary-button-hover-border)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'var(--secondary-button-bg)';
                    e.currentTarget.style.color = 'var(--secondary-button-text)';
                    e.currentTarget.style.borderColor = 'var(--secondary-button-border)';
                  }}
                >
                  Record Live
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content
                  className="fixed inset-0 z-50 flex flex-col"
                  style={{ width: '100vw', height: '100vh', padding: 0, background: 'rgba(24,24,27,0.92)' }}
                >
                  <button
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black focus:outline-none"
                    aria-label="Close"
                    type="button"
                    onClick={() => setShowLiveModal(false)}
                  >
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                  <div className="flex flex-col items-center justify-center w-full h-full relative">
                    <Dialog.Title className="text-sm font-regular text-white pt-2 pb-2" style={{ maxWidth: '400px', textAlign: 'center' }}>Live Method</Dialog.Title>
                    <Dialog.Description className="text-xs font-regular text-white pb-4" style={{ maxWidth: '400px', textAlign: 'center' }}>For best results, connect your phone to your browser as a webcam (Apple's Continuity Camera feature is recommended) and use a tripod. Ensure that your body is in frame and you are in a well-lit environment.</Dialog.Description>
                    <div className="flex items-center justify-center w-full">
                      <LiveVideoPlayer
                        onRecordingComplete={handleRecordingComplete}
                        onMethodChange={() => setShowLiveModal(false)}
                        referenceAngles={referenceAngles}
                        exercise={exercise}
                      />
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <label
              className="px-2 py-2 rounded-md font-medium text-xs transition cursor-pointer"
              style={{
                background: 'var(--primary-button-bg)',
                color: 'var(--primary-button-text)',
                border: '2px solid var(--primary-button-border)'
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLLabelElement).style.background = 'var(--primary-button-hover-bg)';
                (e.currentTarget as HTMLLabelElement).style.color = 'var(--primary-button-hover-text)';
                (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--primary-button-hover-border)';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLLabelElement).style.background = 'var(--primary-button-bg)';
                (e.currentTarget as HTMLLabelElement).style.color = 'var(--primary-button-text)';
                (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--primary-button-border)';
              }}
            >
              Upload Video
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>

        {/* Upload Video Modal */}
        <Dialog.Root open={showUploadModal} onOpenChange={setShowUploadModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content
              className="fixed inset-0 z-50 flex flex-col"
              style={{ width: '100vw', height: '100vh', padding: 0, background: 'rgba(24,24,27,0.92)' }}
            >
              <button
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black focus:outline-none"
                aria-label="Close"
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  resetFileInput();
                }}
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div className="flex flex-col items-center w-full h-full relative overflow-hidden">
                <Dialog.Title className="text-sm font-normal pt-6 pb-4 text-white" style={{ maxWidth: '400px', textAlign: 'center' }}>Click below to analyze your video. Ensure your body is in frame and you are in a well-light environment for best results.</Dialog.Title>
                <div className="flex-1 flex flex-col items-center w-full max-w-4xl px-4 min-h-0">
                  
                  {/* Video Player Section */}
                  <div className="flex flex-col w-full max-w-2xl flex-shrink-0">
                    <div className="relative w-full" style={{ maxHeight: '60vh' }}>
                      <video
                        ref={videoRef}
                        src={videoUrl || undefined}
                        controls
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture
                        className="rounded w-full h-auto video-controls-limited"
                        style={{ maxHeight: '60vh', objectFit: 'contain' }}
                        onLoadedMetadata={() => {
                          console.log('video onLoadedMetadata fired');
                          if (videoRef.current && canvasRef.current) {
                            canvasRef.current.width = videoRef.current.videoWidth;
                            canvasRef.current.height = videoRef.current.videoHeight;
                          }
                        }}
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      />
                    </div>
                    
                    {/* Analysis Progress */}
                    {isAnalyzing && (
                      <div className="w-full my-4 flex-shrink-0">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-white mb-2">Processing Video...</h3>
                          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${analysisProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-white">{analysisProgress}% complete</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons - Fixed at bottom */}
                    <div className="flex flex-row flex-wrap gap-4 mt-4 mb-6 justify-center flex-shrink-0">
                      {!isAnalyzing ? (
                        <>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'var(--primary-button-bg)',
                              color: 'var(--primary-button-text)',
                              border: '2px solid var(--primary-button-border)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--primary-button-hover-bg)';
                              e.currentTarget.style.color = 'var(--primary-button-hover-text)';
                              e.currentTarget.style.borderColor = 'var(--primary-button-hover-border)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'var(--primary-button-bg)';
                              e.currentTarget.style.color = 'var(--primary-button-text)';
                              e.currentTarget.style.borderColor = 'var(--primary-button-border)';
                            }}
                            onClick={processUploadedVideo}
                          >
                            Analyze Video
                          </button>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'var(--secondary-button-bg)',
                              color: 'var(--secondary-button-text)',
                              border: '2px solid var(--secondary-button-border)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--secondary-button-hover-bg)';
                              e.currentTarget.style.color = 'var(--secondary-button-hover-text)';
                              e.currentTarget.style.borderColor = 'var(--secondary-button-hover-border)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'var(--secondary-button-bg)';
                              e.currentTarget.style.color = 'var(--secondary-button-text)';
                              e.currentTarget.style.borderColor = 'var(--secondary-button-border)';
                            }}
                            onClick={() => {
                              setVideoUrl(null);
                              setIsRecordedVideo(false);
                              setShowUploadModal(false);
                              resetFileInput();
                            }}
                          >
                            Upload New Video
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-center text-white">
                          Please wait while we analyze your video...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        
        {/* Live Recording Preview Modal */}
        <Dialog.Root open={showLiveRecordingPreview} onOpenChange={setShowLiveRecordingPreview}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content
              className="fixed inset-0 z-50 flex flex-col"
              style={{ width: '100vw', height: '100vh', padding: 0, background: 'rgba(24,24,27,0.92)' }}
            >
              <button
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black focus:outline-none"
                aria-label="Close"
                type="button"
                onClick={handleCancelLiveRecording}
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              
              <div className="flex flex-col items-center justify-center w-full h-full relative">
                <Dialog.Title className="text-sm font-normal pt-6 pb-4 text-white">
                  Review Your Recording
                </Dialog.Title>
                
                <div className="flex-1 flex flex-col items-center w-full max-w-2xl px-4 min-h-0">
                  
                  {/* Video Preview */}
                  <div className="flex flex-col w-full flex-shrink-0">
                    <div className="relative w-full" style={{ maxHeight: '60vh' }}>
                    {!isAnalyzing ? (
                      // Show video when not analyzing
                      liveRecordingDuration && liveRecordingUrl ? (
                        <LiveRecordingVideo 
                          src={liveRecordingUrl} 
                          duration={liveRecordingDuration} 
                        />
                      ) : (
                        <video
                          src={liveRecordingUrl || undefined}
                          controls
                          controlsList="nodownload nofullscreen noremoteplayback"
                          disablePictureInPicture
                          className="rounded w-full h-auto"
                          style={{ maxHeight: '60vh', objectFit: 'contain' }}
                          autoPlay
                          muted
                        />
                      )
                    ) : (
                      // Show loading placeholder during analysis
                      <div className="w-full h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-white text-lg">Processing your recording...</p>
                        </div>
                      </div>
                    )}
                    </div>
                    
                    {/* Analysis Progress */}
                    {isAnalyzing && (
                      <div className="w-full my-4 flex-shrink-0">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-white mb-2">Processing Video...</h3>
                          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${analysisProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-white">{analysisProgress}% complete</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-row flex-wrap gap-4 mt-4 mb-6 justify-center flex-shrink-0">
                      {!isAnalyzing ? (
                        <>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'var(--primary-button-bg)',
                              color: 'var(--primary-button-text)',
                              border: '2px solid var(--primary-button-border)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--primary-button-hover-bg)';
                              e.currentTarget.style.color = 'var(--primary-button-hover-text)';
                              e.currentTarget.style.borderColor = 'var(--primary-button-hover-border)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'var(--primary-button-bg)';
                              e.currentTarget.style.color = 'var(--primary-button-text)';
                              e.currentTarget.style.borderColor = 'var(--primary-button-border)';
                            }}
                            onClick={handleAnalyzeLiveRecording}
                          >
                            Analyze Video
                          </button>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'var(--secondary-button-bg)',
                              color: 'var(--secondary-button-text)',
                              border: '2px solid var(--secondary-button-border)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--secondary-button-hover-bg)';
                              e.currentTarget.style.color = 'var(--secondary-button-hover-text)';
                              e.currentTarget.style.borderColor = 'var(--secondary-button-hover-border)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'var(--secondary-button-bg)';
                              e.currentTarget.style.color = 'var(--secondary-button-text)';
                              e.currentTarget.style.borderColor = 'var(--secondary-button-border)';
                            }}
                            onClick={handleRetakeLiveRecording}
                          >
                            Re-Take
                          </button>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'transparent',
                              color: 'white',
                              border: '2px solid #6B7280'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = '#6B7280';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                            onClick={handleCancelLiveRecording}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-center text-white">
                          Please wait while we analyze your video...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
  );
} 

