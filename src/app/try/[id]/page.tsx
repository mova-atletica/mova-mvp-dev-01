"use client";
import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import { Exercise } from '../../../data/exercises';
import { 
  calculateEnhancedComparison, 
  calculateBalanceMetrics,
  getAngleWithConfidence,
  getTrunkAngleWithConfidence 
} from '../../../lib/analysisUtils';
import LiveVideoPlayer from '../../../components/LiveVideoPlayer';

// Utility to calculate angle at point b (in degrees)
function getAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// Utility to calculate trunk angle
function getTrunkAngle(shoulder: { x: number; y: number }, hip: { x: number; y: number }) {
  const vertical = { x: shoulder.x, y: shoulder.y - 100 };
  return getAngle(vertical, shoulder, hip);
}

// Utility to compare angles and provide feedback
function compareAngles(current: number | null, reference: number | null, tolerance: number = 15): 'good' | 'warning' | 'poor' | null {
  if (current === null || reference === null) return null;
  
  const difference = Math.abs(current - reference);
  if (difference <= tolerance) return 'good';
  if (difference <= tolerance * 2) return 'warning';
  return 'poor';
}

// Utility to get feedback message based on joint and comparison
function getFeedbackMessage(joint: string, comparison: 'good' | 'warning' | 'poor'): string {
  const messages = {
    'leftKnee': {
      good: 'Left knee angle looks good!',
      warning: 'Adjust left knee angle slightly',
      poor: 'Fix left knee position'
    },
    'rightKnee': {
      good: 'Right knee angle looks good!',
      warning: 'Adjust right knee angle slightly', 
      poor: 'Fix right knee position'
    },
    'leftHip': {
      good: 'Left hip position is correct',
      warning: 'Adjust left hip slightly',
      poor: 'Fix left hip alignment'
    },
    'rightHip': {
      good: 'Right hip position is correct',
      warning: 'Adjust right hip slightly',
      poor: 'Fix right hip alignment'
    },
    'leftElbow': {
      good: 'Left elbow angle is good',
      warning: 'Adjust left elbow slightly',
      poor: 'Fix left elbow position'
    },
    'rightElbow': {
      good: 'Right elbow angle is good',
      warning: 'Adjust right elbow slightly',
      poor: 'Fix right elbow position'
    },
    'leftShoulder': {
      good: 'Left shoulder position is good',
      warning: 'Adjust left shoulder slightly',
      poor: 'Fix left shoulder position'
    },
    'rightShoulder': {
      good: 'Right shoulder position is good',
      warning: 'Adjust right shoulder slightly',
      poor: 'Fix right shoulder position'
    },
    'trunk': {
      good: 'Trunk alignment is correct',
      warning: 'Adjust trunk position slightly',
      poor: 'Fix trunk alignment'
    }
  };
  
  return messages[joint as keyof typeof messages]?.[comparison] || 'Keep going!';
}

// Calculate overall comparison results
const calculateComparison = (userAngles: any, referenceAngles: any, jointsOfInterest: string[]) => {
  console.log('calculateComparison called with:', { userAngles, referenceAngles, jointsOfInterest });
  
  const results: any = {};
  let totalScore = 0;
  let totalComparisons = 0;
  
  jointsOfInterest.forEach(joint => {
    console.log(`Processing joint: ${joint}`);
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
    
    console.log(`${joint} - User angles: ${userAngleArray.length} frames, Reference angles: ${refAngleArray.length} frames`);
    console.log(`${joint} - Sample user angles:`, userAngleArray.slice(0, 5));
    console.log(`${joint} - Sample reference angles:`, refAngleArray.slice(0, 5));
    
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
    
    console.log(`${joint} - Valid comparisons: ${validComparisons}, Avg difference: ${avgDifference}, Score: ${score}`);
    
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

export default function TryExercise() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  
  // State
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  // Video and detection
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoAnalysisActive, setVideoAnalysisActive] = useState(false);
  
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
  const [referenceAngles, setReferenceAngles] = useState<{
    leftKneeAngles: (number | null)[];
    rightKneeAngles: (number | null)[];
    leftHipAngles: (number | null)[];
    rightHipAngles: (number | null)[];
    leftElbowAngles: (number | null)[];
    rightElbowAngles: (number | null)[];
    leftShoulderAbdAngles: (number | null)[];
    rightShoulderAbdAngles: (number | null)[];
    trunkAngles: (number | null)[];
  } | null>(null);
  
  // Remove all enhanced feedback related state and code
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const [feedbackColor, setFeedbackColor] = useState<'green' | 'yellow' | 'red'>('green');
  // Remove: enhancedAnalysis, smoothFeedback, audioFeedback, smoothFeedbackSystem, showEnhancedFeedback, audioEnabled
  
  // Video analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRecordedVideo, setIsRecordedVideo] = useState(false);
  const [currentAnalysisPose, setCurrentAnalysisPose] = useState<any>(null);
  
  // Enhanced analysis state
  const [enhancedComparison, setEnhancedComparison] = useState<any>(null);
  const [balanceMetrics, setBalanceMetrics] = useState<any>(null);

  // Fetch exercise data
  useEffect(() => {
    const fetchExercise = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/exercises/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Exercise not found');
          } else {
            throw new Error('Failed to fetch exercise');
          }
          return;
        }

        const exerciseData = await response.json();
        
        // Convert string arrays back to arrays
        const formattedExercise: Exercise = {
          ...exerciseData,
          tags: Array.isArray(exerciseData.tags) ? exerciseData.tags : (exerciseData.tags ? exerciseData.tags.split(',').filter(Boolean) : []),
          equipment: Array.isArray(exerciseData.equipment) ? exerciseData.equipment : (exerciseData.equipment ? exerciseData.equipment.split(',').filter(Boolean) : []),
          muscleGroups: Array.isArray(exerciseData.muscleGroups) ? exerciseData.muscleGroups : (exerciseData.muscleGroups ? exerciseData.muscleGroups.split(',').filter(Boolean) : []),
          jointsOfInterest: Array.isArray(exerciseData.jointsOfInterest) ? exerciseData.jointsOfInterest : (exerciseData.jointsOfInterest ? exerciseData.jointsOfInterest.split(',').filter(Boolean) : []),
          instructions: Array.isArray(exerciseData.instructions) ? exerciseData.instructions : (exerciseData.instructions ? JSON.parse(exerciseData.instructions) : []),
          relatedExercises: Array.isArray(exerciseData.relatedExercises) ? exerciseData.relatedExercises : (exerciseData.relatedExercises ? exerciseData.relatedExercises.split(',').filter(Boolean) : []),
          author: { name: exerciseData.authorName || 'Unknown', profileUrl: exerciseData.authorProfileUrl }
        };

        setExercise(formattedExercise);

        // Get signed URL for image if it's a Google Cloud Storage path
        if (formattedExercise.image && !formattedExercise.image.startsWith('http') && !formattedExercise.image.startsWith('/')) {
          try {
            const signedUrlResponse = await fetch('/api/storage/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: formattedExercise.image }),
            });
            
            if (signedUrlResponse.ok) {
              const { signedUrl } = await signedUrlResponse.json();
              setImageUrl(signedUrl);
            } else {
              setImageUrl(formattedExercise.image);
            }
          } catch (error) {
            console.error('Error getting signed URL:', error);
            setImageUrl(formattedExercise.image);
          }
        } else {
          setImageUrl(formattedExercise.image);
        }

      } catch (err) {
        console.error('Error fetching exercise:', err);
        setError('Failed to load exercise');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [id]);

  // Load reference keypoints and calculate reference angles
  useEffect(() => {
    const loadReferenceData = async () => {
      console.log('Loading reference data for exercise:', exercise?.title);
      console.log('Reference keypoints URL:', exercise?.referenceKeypointsUrl);
      
      if (!exercise?.referenceKeypointsUrl) {
        console.log('No reference keypoints URL found - this is normal for new exercises');
        return;
      }
      
      try {
        // Use proxy to fetch reference keypoints (avoids CORS issues)
        console.log('Fetching reference keypoints via proxy');
        const response = await fetch('/api/storage/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl }),
        });
        
        console.log('Reference keypoints response status:', response.status);
        
        if (response.ok) {
          const keypointsData = await response.json();
          console.log('Reference keypoints loaded:', keypointsData.length, 'frames');
          console.log('Sample pose structure:', keypointsData[0]);
          console.log('Sample pose keypoints:', keypointsData[0]?.keypoints);
          console.log('Sample keypoint structure:', keypointsData[0]?.keypoints?.[0]);
          setReferenceKeypoints(keypointsData);
          
          // Calculate reference angles
          const refAngles = {
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
          
          keypointsData.forEach((pose: any, index: number) => {
            // Debug the first few poses to understand the structure
            if (index < 3) {
              console.log(`Pose ${index} structure:`, pose);
              console.log(`Pose ${index} keys:`, Object.keys(pose));
              if (pose.keypoints) {
                console.log(`Pose ${index} keypoints type:`, typeof pose.keypoints);
                console.log(`Pose ${index} keypoints length:`, Array.isArray(pose.keypoints) ? pose.keypoints.length : 'not array');
              }
            }
            
            // Handle different possible data structures
            let poseKeypoints = null;
            if (pose && pose.keypoints && Array.isArray(pose.keypoints)) {
              // Standard MoveNet pose structure
              poseKeypoints = pose.keypoints;
            } else if (pose && Array.isArray(pose)) {
              // Direct keypoints array
              poseKeypoints = pose;
            } else if (pose && typeof pose === 'object' && Object.keys(pose).length > 0) {
              // Try to find keypoints in the object
              const possibleKeypoints = Object.values(pose).find(val => Array.isArray(val) && val.length > 0);
              if (possibleKeypoints) {
                poseKeypoints = possibleKeypoints;
              }
            }
            
            // Skip poses with null or missing keypoints
            if (!poseKeypoints || !Array.isArray(poseKeypoints) || poseKeypoints.length < 17) {
              console.log('Skipping pose with invalid keypoints structure');
              // Add null values for all angles to maintain array length
              refAngles.leftKneeAngles.push(null);
              refAngles.rightKneeAngles.push(null);
              refAngles.leftHipAngles.push(null);
              refAngles.rightHipAngles.push(null);
              refAngles.leftElbowAngles.push(null);
              refAngles.rightElbowAngles.push(null);
              refAngles.leftShoulderAbdAngles.push(null);
              refAngles.rightShoulderAbdAngles.push(null);
              refAngles.trunkAngles.push(null);
              return;
            }
            
            const keypoints = poseKeypoints;
            
            // Get keypoint indices (MoveNet format)
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

            // Calculate angles
            refAngles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle).angle : null);
            refAngles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle).angle : null);
            refAngles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee).angle : null);
            refAngles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee).angle : null);
            refAngles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist).angle : null);
            refAngles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist).angle : null);
            refAngles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow).angle : null);
            refAngles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow).angle : null);
            refAngles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip).angle : null);
          });
          
          setReferenceAngles(refAngles);
          console.log('Reference angles calculated:', refAngles);
        } else {
          console.log('Failed to fetch reference keypoints - file may not exist');
        }
      } catch (error) {
        console.log('Failed to fetch reference keypoints:', error);
        console.log('This is normal for new exercises without reference data');
      }
    };
    
    loadReferenceData();
  }, [exercise]);

  // Load the MoveNet model once
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

  // Set canvas size to match video
  useEffect(() => {
    function updateCanvasSize(video: HTMLVideoElement | null) {
      const canvas = canvasRef.current;
      if (video && canvas) {
        // Set canvas to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Also set CSS dimensions to match the display size
        const videoElement = videoUrl ? videoRef.current : webcamRef.current?.video;
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          canvas.style.width = rect.width + 'px';
          canvas.style.height = rect.height + 'px';
        }
      }
    }
    
    if (videoUrl && videoRef.current) {
      videoRef.current.onloadedmetadata = () => updateCanvasSize(videoRef.current);
    } else if (!videoUrl && cameraActive && webcamRef.current && webcamRef.current.video) {
      webcamRef.current.video.onloadedmetadata = () =>
        updateCanvasSize(webcamRef.current?.video as HTMLVideoElement);
    }
  }, [videoUrl, cameraActive]);

  // Ensure canvas is sized when camera becomes active
  useEffect(() => {
    if (cameraActive && webcamRef.current?.video && canvasRef.current) {
      const video = webcamRef.current.video;
      const checkVideoSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvasRef.current!.width = video.videoWidth;
          canvasRef.current!.height = video.videoHeight;
        } else {
          // If video size not ready, check again in a bit
          setTimeout(checkVideoSize, 100);
        }
      };
      checkVideoSize();
    }
  }, [cameraActive]);



  // Run pose detection in a loop (only for live camera)
  useEffect(() => {
    // Only run pose detection for live camera, not uploaded videos
    if (!detector || !cameraActive) {
      return;
    }

    let animationId: number;
    async function detectPose() {
      let video: HTMLVideoElement | null = null;
      if (!videoUrl && cameraActive && webcamRef.current && webcamRef.current.video) {
        video = webcamRef.current.video as HTMLVideoElement;
      }
      

      
      if (
        detector &&
        video &&
        canvasRef.current &&
        video.readyState === 4 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const poses = await detector.estimatePoses(video);
        // Use enhanced pose visualization instead of basic drawing
        if (poses && poses.length > 0) {
          // The EnhancedPoseVisualization component will handle drawing
          // We just need to update the poses state
        }
        if (poses && poses.length > 0) {
          setAllPoses(prev => [...prev, poses[0]]);
          
          // Calculate angles
          const pose = poses[0];
          const keypoints = pose.keypoints;
          
          // Get keypoint indices (MoveNet format)
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

          // Calculate angles with confidence
          const leftKneeResult = leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle) : { angle: null, confidence: 0 };
          const rightKneeResult = rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle) : { angle: null, confidence: 0 };
          const leftHipResult = leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee) : { angle: null, confidence: 0 };
          const rightHipResult = rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee) : { angle: null, confidence: 0 };
          const leftElbowResult = leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist) : { angle: null, confidence: 0 };
          const rightElbowResult = rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist) : { angle: null, confidence: 0 };
          const leftShoulderAbdResult = leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow) : { angle: null, confidence: 0 };
          const rightShoulderAbdResult = rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow) : { angle: null, confidence: 0 };
          const trunkResult = leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip) : { angle: null, confidence: 0 };

          const leftKneeAngle = leftKneeResult.angle;
          const rightKneeAngle = rightKneeResult.angle;
          const leftHipAngle = leftHipResult.angle;
          const rightHipAngle = rightHipResult.angle;
          const leftElbowAngle = leftElbowResult.angle;
          const rightElbowAngle = rightElbowResult.angle;
          const leftShoulderAbdAngle = leftShoulderAbdResult.angle;
          const rightShoulderAbdAngle = rightShoulderAbdResult.angle;
          const trunkAngle = trunkResult.angle;

          // Update angle arrays
          setLeftKneeAngles(prev => [...prev, leftKneeAngle]);
          setRightKneeAngles(prev => [...prev, rightKneeAngle]);
          setLeftHipAngles(prev => [...prev, leftHipAngle]);
          setRightHipAngles(prev => [...prev, rightHipAngle]);
          setLeftElbowAngles(prev => [...prev, leftElbowAngle]);
          setRightElbowAngles(prev => [...prev, rightElbowAngle]);
          setLeftShoulderAbdAngles(prev => [...prev, leftShoulderAbdAngle]);
          setRightShoulderAbdAngles(prev => [...prev, rightShoulderAbdAngle]);
          setTrunkAngles(prev => [...prev, trunkAngle]);
          
          // Enhanced live feedback analysis
          if (referenceAngles && exercise?.jointsOfInterest) {
            const currentFrameIndex = allPoses.length;
            
            // Use enhanced analysis system
            // This function is no longer needed as EnhancedFeedbackDisplay and EnhancedPoseVisualization are removed
            // The feedback logic is now handled by the pose detection itself and the comparison.
            // For now, we'll just update the currentFeedback and feedbackColor based on the comparison.
            
            // Calculate comparison - removed for now
            // const comparison = calculateComparison(angles, referenceAngles, exercise.jointsOfInterest);
            // console.log(Comparison result:', comparison);
            
            // Determine feedback based on comparison - simplified
            setCurrentFeedback('Keep going!');
              setFeedbackColor('green');
          } else if (!referenceAngles) {
            // Show message when reference data is not available
            setCurrentFeedback('Reference data loading...');
            setFeedbackColor('yellow');
          } else if (!exercise?.jointsOfInterest?.length) {
            // Show message when no joints of interest are defined
            setCurrentFeedback('No joints of interest defined for this exercise');
            setFeedbackColor('yellow');
          }
        }
      }
      animationId = requestAnimationFrame(detectPose);
    }
    detectPose();
    return () => cancelAnimationFrame(animationId);
  }, [detector, videoUrl, cameraActive]);

  // Enhanced pose visualization is now handled by EnhancedPoseVisualization component

  // Start recording
  const startRecording = () => {
    if (webcamRef.current && webcamRef.current.stream) {
      const recorder = new MediaRecorder(webcamRef.current.stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          console.log('Recording stopped, setting video URL:', url);
          setVideoUrl(url);
          setIsRecordedVideo(true);

          // Wait for the video element to load metadata before processing
          const checkAndProcess = () => {
            console.log('checkAndProcess called');
            console.log('videoRef.current:', !!videoRef.current);
            if (videoRef.current) {
              console.log('videoRef.current.readyState:', videoRef.current.readyState);
              console.log('videoRef.current.src:', videoRef.current.src);
            }
            
            if (videoRef.current && videoRef.current.readyState >= 1) {
              console.log('Video is ready, calling processRecordedVideo');
              processRecordedVideo(url); // Pass the URL directly
            } else if (videoRef.current) {
              console.log('Video not ready, setting onloadedmetadata handler');
              videoRef.current.onloadedmetadata = () => {
                console.log('onloadedmetadata fired, calling processRecordedVideo');
                processRecordedVideo(url); // Pass the URL directly
              };
            } else {
              console.log('videoRef.current is null, retrying in 100ms');
              setTimeout(checkAndProcess, 100);
            }
          };
          
          // Give React time to update the DOM with the new video URL
          setTimeout(checkAndProcess, 100);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      
      // Reset angle arrays when starting new recording
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
      
      // Reset smooth feedback system
      // smoothFeedbackSystem.reset(); // Removed
      // setSmoothFeedback(null); // Removed
      // setEnhancedAnalysis(null); // Removed
    }
  };

  // Handle camera activation
  const handleStartCamera = () => {
    setCameraActive(true);
    setRecording(false);
    setAllPoses([]);
    
    // Reset angle arrays
    setLeftKneeAngles([]);
    setRightKneeAngles([]);
    setLeftHipAngles([]);
    setRightHipAngles([]);
    setLeftElbowAngles([]);
    setRightElbowAngles([]);
    setLeftShoulderAbdAngles([]);
    setRightShoulderAbdAngles([]);
    setTrunkAngles([]);
    
    // Reset smooth feedback system
    // smoothFeedbackSystem.reset(); // Removed
    // setSmoothFeedback(null); // Removed
    // setEnhancedAnalysis(null); // Removed
    
    // Small delay to ensure webcam is initialized
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

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      
      // Clear current feedback when stopping recording
      setCurrentFeedback('');
    }
  };

  // Process recorded video (called after recording stops)
  const processRecordedVideo = async (videoUrlParam?: string) => {
    console.log('=== processRecordedVideo called ===');
    console.log('videoRef.current:', !!videoRef.current);
    console.log('detector:', !!detector);
    console.log('canvasRef.current:', !!canvasRef.current);
    
    if (videoRef.current) {
      console.log('Video details:');
      console.log('- readyState:', videoRef.current.readyState);
      console.log('- src:', videoRef.current.src);
      console.log('- duration:', videoRef.current.duration);
      console.log('- videoWidth:', videoRef.current.videoWidth);
      console.log('- videoHeight:', videoRef.current.videoHeight);
    }
    
    if (!videoRef.current || !detector || !canvasRef.current) {
      console.log('Missing required refs, returning early');
      return;
    }
    
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
          console.log('Checking video readiness...');
          console.log('- readyState:', video.readyState);
          console.log('- duration:', video.duration);
          console.log('- videoWidth:', video.videoWidth);
          console.log('- videoHeight:', video.videoHeight);

          // Only require readyState >= 2 and videoWidth > 0
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('Video is ready for processing');
            resolve(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        // Also listen for the loadedmetadata event
        video.onloadedmetadata = () => setTimeout(checkReady, 50);
        
        // Start checking immediately
        checkReady();
      });
      
      let duration = video.duration;
      if (!duration || duration === Infinity) {
        console.log('Duration is Infinity or 0, using fallback duration of 10 seconds');
        duration = 10; // or use all available frames until video.ended
      }

      console.log('Video processing starting...');
      console.log('Final video details:');
      console.log('- duration:', video.duration);
      console.log('- videoWidth:', video.videoWidth);
      console.log('- videoHeight:', video.videoHeight);
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const frameRate = 30;
      const step = 1; // Process every frame (30fps) for better accuracy
      const totalFrames = Math.floor(duration * frameRate / step);
      let processedFrames = 0;
      
      for (let t = 0; t < duration; t += step / frameRate) {
        video.currentTime = t;
        await new Promise((resolve) => (video.onseeked = resolve));
        
        const pose = await detector.estimatePoses(video);
        if (pose && pose.length > 0) {
          poses.push(pose[0]);
          setCurrentAnalysisPose(pose[0]); // Update pose for visualization
          
          // Enhanced pose visualization will handle drawing
          
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
            console.log('Calculating comparison...');
            console.log('User angles:', angles);
            console.log('Reference angles:', referenceAngles);
            console.log('Joints of interest:', exercise.jointsOfInterest);
            
            const comparison = calculateComparison(angles, referenceAngles, exercise.jointsOfInterest);
            console.log('Comparison result:', comparison);
            localStorage.setItem("lastComparison", JSON.stringify(comparison));
          } else {
            console.log('Cannot calculate comparison:');
            console.log('- Reference angles available:', !!referenceAngles);
            console.log('- Exercise available:', !!exercise);
            console.log('- Joints of interest:', exercise?.jointsOfInterest);
          }
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      }
      
      const urlToUse = videoUrlParam || videoUrl;
      if (exercise && exercise.id && urlToUse) {
        console.log('Attempting navigation to results page...');
        console.log('Exercise ID:', exercise.id);
        console.log('Video URL:', urlToUse);
        try {
          await router.push(`/results/${exercise.id}?video=${encodeURIComponent(urlToUse)}`);
          console.log('Navigation successful');
        } catch (error) {
          console.error('Navigation failed:', error);
        }
      } else {
        console.log('Cannot navigate - missing data:');
        console.log('- Exercise:', !!exercise);
        console.log('- Exercise ID:', exercise?.id);
        console.log('- Video URL:', !!urlToUse);
      }
      
    } catch (error) {
      console.error('Error processing video:', error);
      alert('Error processing video. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // Handle file upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      setIsRecordedVideo(false);
      
      // Reset angle arrays when uploading new video
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
    }
  };

  // Process uploaded video offline
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
          console.log('Checking video readiness...');
          console.log('- readyState:', video.readyState);
          console.log('- duration:', video.duration);
          console.log('- videoWidth:', video.videoWidth);
          console.log('- videoHeight:', video.videoHeight);
          
          if (video.readyState >= 1 && video.duration > 0 && video.duration !== Infinity) {
            console.log('Video is fully ready');
            resolve(true);
          } else {
            console.log('Video not ready yet, waiting...');
            setTimeout(checkReady, 100);
          }
        };
        
        // Also listen for the loadedmetadata event
        video.onloadedmetadata = () => {
          console.log('onloadedmetadata fired');
          setTimeout(checkReady, 50);
        };
        
        // Start checking immediately
        checkReady();
      });
      
      console.log('Video processing starting...');
      console.log('Final video details:');
      console.log('- duration:', video.duration);
      console.log('- videoWidth:', video.videoWidth);
      console.log('- videoHeight:', video.videoHeight);
      
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
          
          // Enhanced pose visualization will handle drawing
          
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
            console.log('Calculating comparison...');
            console.log('User angles:', angles);
            console.log('Reference angles:', referenceAngles);
            console.log('Joints of interest:', exercise.jointsOfInterest);
            
            const comparison = calculateComparison(angles, referenceAngles, exercise.jointsOfInterest);
            console.log('Comparison result:', comparison);
            localStorage.setItem("lastComparison", JSON.stringify(comparison));
          } else {
            console.log('Cannot calculate comparison:');
            console.log('- Reference angles available:', !!referenceAngles);
            console.log('- Exercise available:', !!exercise);
            console.log('- Joints of interest:', exercise?.jointsOfInterest);
          }
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      }
      
      if (exercise && exercise.id && videoUrl) {
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

  if (loading) {
    return (
      <main className="min-h-screen bg-onyx-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-onyx-10 text-xl">Loading exercise...</div>
      </main>
    );
  }

  if (error || !exercise) {
    return (
      <main className="min-h-screen bg-onyx-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-red-600 text-xl mb-4">{error || 'Exercise not found'}</div>
        <Link href="/" className="text-blue-70 underline">
          ← Back to Library
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-onyx-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <img src={imageUrl} alt={exercise.title} className="w-16 h-16 object-cover rounded" />
            <div>
              <h1 className="text-2xl font-extrabold text-onyx-10">{exercise.title}</h1>
              <p className="text-onyx-30">{exercise.description}</p>
              <div className="flex gap-2 mt-2">
                <span className="bg-blue-100 text-white px-2 py-1 rounded text-xs">
                  {exercise.level}
                </span>
                {exercise.jointsOfInterest.map(joint => (
                  <span key={joint} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    {joint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Interface */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-onyx-10 mb-4">Motion Analysis</h2>
          
          {!videoUrl ? (
            <>
              {!cameraActive ? (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-onyx-10 mb-4">Choose Your Method</h3>
                  <div className="flex gap-4 justify-center mb-4">
                    <button
                      className="bg-blue-100 text-white px-6 py-3 rounded font-bold hover:bg-blue-90 transition"
                      onClick={handleStartCamera}
                    >
                      🎥 Record Live
                    </button>
                    <label className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700 transition cursor-pointer">
                      📁 Upload Video
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                    </label>
                  </div>
                  <p className="text-onyx-30 text-sm">
                    Choose to record live with your camera or upload an existing video
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative mb-4 w-full max-w-md mx-auto">
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
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 10 }}
                    />
                    {/* Enhanced pose visualization */}
                    {/* EnhancedPoseVisualization component removed */}
                    {/* Enhanced Feedback Display - positioned relative to video */}
                    {/* EnhancedFeedbackDisplay component removed */}
                  </div>
                  <div className="flex gap-2 justify-center mb-4">
                    {!recording ? (
                      <button
                        className="bg-blue-100 text-white px-6 py-3 rounded font-bold hover:bg-blue-90 transition"
                        onClick={startRecording}
                      >
                        🎥 Start Recording
                      </button>
                    ) : (
                      <button
                        className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition"
                        onClick={stopRecording}
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                    <button
                      className="bg-gray-600 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 transition"
                      onClick={() => setCameraActive(false)}
                    >
                      🔄 Change Method
                    </button>
                    {/* Enhanced Feedback UI elements removed */}
                    {/* Audio toggle button removed */}
                  </div>
                  <p className="text-center text-onyx-30 text-sm">
                    Position yourself in frame and start recording when ready
                  </p>
                  {cameraActive && (
                    <div className="text-center mt-2">
                      <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Camera Active - Pose Detection Running
                      </div>
                    </div>
                  )}
                  
                  {/* Live Feedback */}
                  {cameraActive && currentFeedback && (
                    <div className="text-center mt-4">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
                        feedbackColor === 'green' ? 'bg-green-500' : 
                        feedbackColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        <div className={`w-3 h-3 rounded-full animate-pulse ${
                          feedbackColor === 'green' ? 'bg-green-200' : 
                          feedbackColor === 'yellow' ? 'bg-yellow-200' : 'bg-red-200'
                        }`}></div>
                        {currentFeedback}
                      </div>
                    </div>
                  )}
                  
                  {/* Debug info */}
                  {cameraActive && (
                    <div className="text-center mt-2 text-xs text-gray-500">
                      Reference data: {referenceAngles ? 'Loaded' : 'Not loaded'} | 
                      Feedback: {currentFeedback || 'None'} | 
                      Poses: {allPoses.length} | 
                      Analysis: {'Basic'}
                    </div>
                  )}
                  
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md mb-4">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="rounded w-full"
                  onLoadedMetadata={() => {
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
                {/* Enhanced pose visualization for uploaded videos */}
                {isAnalyzing && currentAnalysisPose && (
                  {/* EnhancedPoseVisualization component removed */}
                )}
              </div>
              
              {/* Analysis Progress */}
              {isAnalyzing && (
                <div className="w-full max-w-md mb-4">
                  <div className="bg-onyx-20 rounded-lg p-4">
                    <h3 className="font-semibold text-onyx-10 mb-2">Processing Video...</h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-100 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${analysisProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-onyx-30">{analysisProgress}% complete</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2 w-full max-w-md">
                {!isAnalyzing ? (
                  <>
                    {!isRecordedVideo && (
                    <button
                      className="bg-blue-100 text-white px-6 py-3 rounded font-bold hover:bg-blue-90 transition"
                      onClick={processUploadedVideo}
                    >
                      🔍 Analyze Video
                    </button>
                    )}
                    <button
                      className="bg-gray-600 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 transition"
                      onClick={() => {
                        setVideoUrl(null);
                        setIsRecordedVideo(false);
                      }}
                    >
                      🔄 Record/Upload New Video
                    </button>
                  </>
                ) : (
                  <div className="text-center text-onyx-30">
                    {isRecordedVideo ? "Processing your recorded video..." : "Please wait while we analyze your video..."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link href={`/exercises/${exercise.id}`} className="text-blue-70 underline">
            ← Back to {exercise.title} details
          </Link>
        </div>
      </div>
    </main>
  );
}