"use client";
import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import CoreVideoPlayer from './CoreVideoPlayer';
import { getAngleWithConfidence } from '../lib/analysisUtils';
import { analyzeCurrentPose, calculateAnglesForPoseAnalysis, calculatePoseHoldDuration } from '../lib/poseAnalysisUtils';


interface VideoPlayerProps {
  videoUrl: string | null;
  aspectRatio?: 'landscape' | 'portrait' | 'auto';
  onFrameChange?: (frame: number) => void;
  onTimeUpdate?: (time: number) => void;
  className?: string;
  keypointData?: any[];
  duration?: number;
  exercise?: any; // Add exercise data prop
}

interface VideoMetadata {
  duration: number;
  frameRate: number;
  width: number;
  height: number;
  aspectRatio: 'landscape' | 'portrait';
}

// Update the RepState interface to match Python style:
interface RepState {
  s1_completed: boolean;
  s2_completed: boolean;
  s3_completed: boolean;
  lastAngle: number | null;
  repStartTime: number | null;
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

export interface VideoPlayerHandle {
  seekToFrame: (frame: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({ 
  videoUrl, 
  aspectRatio = 'auto',
  onFrameChange,
  onTimeUpdate,
  className = '',
  keypointData = [],
  duration: propDuration,
  exercise // Add exercise prop
}, ref) {
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentKeypointFrame, setCurrentKeypointFrame] = useState<any>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomTarget, setZoomTarget] = useState<'full' | 'upper-body' | 'lower-body' | 'knees' | 'shoulders' | 'hips'>('full');
  const [showAngles, setShowAngles] = useState(false);
  // Add state for selected angles, joints, and bones
  const [selectedAngles, setSelectedAngles] = useState<string[]>(ANGLE_OPTIONS.map(a => a.key));
  const [selectedJoints, setSelectedJoints] = useState<number[]>(JOINT_OPTIONS.map(j => j.key));
  const [selectedBones, setSelectedBones] = useState<string[]>(BONE_OPTIONS.map(b => b.key));
  // Add dropdown open state
  const [openDropdown, setOpenDropdown] = useState<'angles' | 'joints' | 'bones' | 'focus' | null>(null);
  
  // Refs for dropdown containers
  const focusDropdownRef = useRef<HTMLDivElement>(null);
  const anglesDropdownRef = useRef<HTMLDivElement>(null);
  const jointsDropdownRef = useRef<HTMLDivElement>(null);
  const bonesDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (openDropdown === 'focus' && focusDropdownRef.current && !focusDropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'angles' && anglesDropdownRef.current && !anglesDropdownRef.current.contains(target)) {
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
  // Add state for overlay theme controls
  const [boneColor, setBoneColor] = useState<string>('#00ff00');
  const [jointColor, setJointColor] = useState<string>('#00ff00');
  const [boneWeight, setBoneWeight] = useState<number>(2);
  const [jointSize, setJointSize] = useState<number>(4);
  const [videoVisible, setVideoVisible] = useState(true);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'focus' | 'style'>('focus');
  const [openMenu, setOpenMenu] = useState<null | 'export' | 'style' | 'focus' | 'analysis'>(null);

  // Helper function to get current angles from keypoint frame
  const getCurrentAngles = (keypointFrame: any) => {

    
    if (!keypointFrame?.keypoints) {

      return {};
    }
    
    const angles: { [joint: string]: number } = {};
    const kp = keypointFrame.keypoints;
    
    // Left leg angles
    if (kp[11] && kp[13] && kp[15]) {
      // Left knee angle (hip-knee-ankle)
      angles.leftKnee = getAngleWithConfidence(kp[11], kp[13], kp[15]).angle || 0;
    }
    
    if (kp[5] && kp[11] && kp[13]) {
      // Left hip angle (shoulder-hip-knee)
      angles.leftHip = getAngleWithConfidence(kp[5], kp[11], kp[13]).angle || 0;
    }
    
    // Right leg angles
    if (kp[12] && kp[14] && kp[16]) {
      // Right knee angle (hip-knee-ankle)
      angles.rightKnee = getAngleWithConfidence(kp[12], kp[14], kp[16]).angle || 0;
    }
    
    if (kp[6] && kp[12] && kp[14]) {
      // Right hip angle (shoulder-hip-knee)
      angles.rightHip = getAngleWithConfidence(kp[6], kp[12], kp[14]).angle || 0;
    }
    
    // Arm angles
    if (kp[5] && kp[7] && kp[9]) {
      // Left shoulder angle (hip-shoulder-elbow)
      angles.leftShoulder = getAngleWithConfidence(kp[5], kp[7], kp[9]).angle || 0;
    }
    
    if (kp[6] && kp[8] && kp[10]) {
      // Right shoulder angle (hip-shoulder-elbow)
      angles.rightShoulder = getAngleWithConfidence(kp[6], kp[8], kp[10]).angle || 0;
    }
    
    if (kp[7] && kp[9] && kp[11]) {
      // Left elbow angle (shoulder-elbow-wrist)
      angles.leftElbow = getAngleWithConfidence(kp[7], kp[9], kp[11]).angle || 0;
    }
    
    if (kp[8] && kp[10] && kp[12]) {
      // Right elbow angle (shoulder-elbow-wrist)
      angles.rightElbow = getAngleWithConfidence(kp[8], kp[10], kp[12]).angle || 0;
    }
    
    // Torso angle (using shoulders and hips)
    if (kp[5] && kp[6] && kp[11] && kp[12]) {
      const leftTorso = getAngleWithConfidence(kp[5], kp[11], kp[12]).angle || 0;
      const rightTorso = getAngleWithConfidence(kp[6], kp[12], kp[11]).angle || 0;
      angles.torso = (leftTorso + rightTorso) / 2;
    }
    

    return angles;
  };

    // Simple real-time feedback state

  const [repCountingEnabled, setRepCountingEnabled] = useState(false);
  const [currentRepCount, setCurrentRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [isInRep, setIsInRep] = useState(false);
  const [lastBottomTime, setLastBottomTime] = useState<number | null>(null);
  const [repStates, setRepStates] = useState<{[joint: string]: RepState}>({});
  
  // Pose feedback state
  const [poseFeedbackEnabled, setPoseFeedbackEnabled] = useState(false);
  const [currentPoseResult, setCurrentPoseResult] = useState<any>(null);
  const [poseHistory, setPoseHistory] = useState<any[]>([]);
  
  // Memoize current angles to prevent infinite loop
  const currentAngles = useMemo(() => {
    return currentKeypointFrame ? getCurrentAngles(currentKeypointFrame) : {};
  }, [currentKeypointFrame]);
  

  
  // Simple feedback functions

  
  const toggleRepCounting = (enabled: boolean) => {
    setRepCountingEnabled(enabled);
    if (enabled) {
      // Auto-enable skeleton and angles for rep counting feedback
      setShowKeypoints(true);
      setShowAngles(true);

    } else {
      // Reset rep counting state when disabled
      setCurrentRepCount(0);
      setIsInRep(false);
      setCurrentPhase(null);
      setLastBottomTime(null);
      setRepStates({}); // Reset all rep states
    }

  };
  
  const resetRepCount = () => {
    setCurrentRepCount(0);
    setCurrentPhase(null);
    setIsInRep(false);
    setLastBottomTime(null);
    // Reset all rep states
    setRepStates({});

  };
  
  const togglePoseFeedback = (enabled: boolean) => {
    setPoseFeedbackEnabled(enabled);
    if (enabled) {
      // Auto-enable skeleton and angles for pose feedback
      setShowKeypoints(true);
      setShowAngles(true);

    } else {
      // Reset pose feedback state when disabled
      setCurrentPoseResult(null);
      setPoseHistory([]);
    }

  };
  
// Replace the entire processRepFeedback function with this Python-inspired approach:

const processRepFeedback = () => {

  
  if (!repCountingEnabled || Object.keys(currentAngles).length === 0) {

    return;
  }
  
  // Get joints of interest from exercise data, with fallback to common joints
  const jointsOfInterest = (exercise?.jointsOfInterest && Array.isArray(exercise.jointsOfInterest)) 
    ? exercise.jointsOfInterest 
    : ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'];

  
  // Find available joints of interest that we have angle data for
  const availableJointsOfInterest = jointsOfInterest.filter((joint: string) => 
    currentAngles[joint] !== undefined
  );
  

  
  if (availableJointsOfInterest.length === 0) {

    // Fallback: use any available angle data
    const allAvailableJoints = Object.keys(currentAngles);
    if (allAvailableJoints.length === 0) {

      return;
    }
    availableJointsOfInterest.push(allAvailableJoints[0]);

  }
  
  // ALWAYS use joints of interest - prioritize joints that have generated rules
  let trackingJoint = null;
  let currentAngle = null;
  
  // Parse joint angle rules if they're stored as a JSON string
  const jointAngleRules = exercise?.repAnalysis?.jointAngleRules 
    ? (typeof exercise.repAnalysis.jointAngleRules === 'string' 
        ? JSON.parse(exercise.repAnalysis.jointAngleRules) 
        : exercise.repAnalysis.jointAngleRules)
    : null;
  
  // First, try to find a joint of interest that has generated rules
  if (jointAngleRules?.repCompletion) {
    for (const joint of availableJointsOfInterest) {
      if (jointAngleRules.repCompletion[joint] && currentAngles[joint] !== undefined) {
        trackingJoint = joint;
        currentAngle = currentAngles[joint];

        break;
      }
    }
  }
  
  // If no joint with rules found, use the first available joint of interest
  if (!trackingJoint || currentAngle === null || currentAngle === undefined) {
    trackingJoint = availableJointsOfInterest[0];
    currentAngle = currentAngles[trackingJoint];

  }
  
  // Safety check - if we still don't have a valid angle, skip rep detection
  if (currentAngle === null || currentAngle === undefined) {

    return;
  }
  
  // Get thresholds from rep analysis rules for the specific joint
  let angleThresholds;
  
  if (jointAngleRules?.repCompletion?.[trackingJoint]) {
    // Use enhanced joint angle rules for this joint
    const jointRule = jointAngleRules.repCompletion[trackingJoint];
    angleThresholds = {
      startThreshold: jointRule.startThreshold || 120,
      completionThreshold: jointRule.completionThreshold || 100,
      returnThreshold: jointRule.returnThreshold || 120,
      hysteresis: jointRule.hysteresis || 5
    };

  } else {
    // Fallback thresholds for testing
    angleThresholds = {
      startThreshold: 120,
      completionThreshold: 100,
      returnThreshold: 120,
      hysteresis: 5
    };

  }
  
  // Get or create rep state for this joint (Python-style persistent flags)
  let currentRepState = repStates[trackingJoint];
  if (!currentRepState) {
    currentRepState = {
      s1_completed: false,
      s2_completed: false,
      s3_completed: false,
      lastAngle: null,
      repStartTime: null
    };
    
    setRepStates(prev => ({
      ...prev,
      [trackingJoint]: currentRepState
    }));
  }
  
  // Determine exercise pattern based on threshold relationships
  const isDownwardExercise = angleThresholds.completionThreshold < angleThresholds.startThreshold; // Like squat
  

  
  // Python-style state logic with persistent flags
  let s1_completed = currentRepState.s1_completed;
  let s2_completed = currentRepState.s2_completed;
  let s3_completed = currentRepState.s3_completed;
  
  if (isDownwardExercise) {
    // DOWNWARD EXERCISE LOGIC (like squat: High → Low → High)
    
    // S1: Start position (high angle)
    if (currentAngle >= (angleThresholds.startThreshold  - (angleThresholds.hysteresis*1)) ) {
      s1_completed = true;
      s2_completed = false; // Clear S2 and S3 when returning to start
      s3_completed = false;
    }
    
    // S2: Mid position (medium angle) - only if S1 was completed
    else if (currentAngle <= (angleThresholds.completionThreshold + (angleThresholds.hysteresis*1)) && s1_completed) {
      s2_completed = true;
    }
    
    // S3: Return position (high angle) - only if S1 AND S2 were completed
    else if (currentAngle >= (angleThresholds.returnThreshold + (angleThresholds.hysteresis*1)) && s1_completed && s2_completed) {
      s3_completed = true;
    }
    
    // Check for complete rep OUTSIDE the state conditions (Python style)
    if (s1_completed && s2_completed && s3_completed) {
      setCurrentRepCount(prev => {
        const newCount = prev + 1;

        return newCount;
      });
      
      // Reset all flags after successful completion (Python style)
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;

      
      // IMPORTANT: Update the state immediately after resetting
      setRepStates(prev => ({
        ...prev,
        [trackingJoint]: {
          s1_completed: false,
          s2_completed: false,
          s3_completed: false,
          lastAngle: currentAngle,
          repStartTime: null
        }
      }));
      
      // Return early to avoid the final setRepStates call
      return;
    }
    
    // Error handling: Return to S1 without completing S3 (incomplete rep)
    if (currentAngle >= angleThresholds.startThreshold && s1_completed && s2_completed && !s3_completed) {

      // Reset all states
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;
    }
    
  } else {
    // UPWARD EXERCISE LOGIC (like leg lift: Low → High → Low)
    
    // S1: Start position (low angle)
    if (currentAngle <= (angleThresholds.startThreshold - (angleThresholds.hysteresis*1))) {
      s1_completed = true;
      s2_completed = false; // Clear S2 and S3 when returning to start
      s3_completed = false;
    }
    
    // S2: Peak position (high angle) - only if S1 was completed
    else if (currentAngle >= (angleThresholds.completionThreshold + (angleThresholds.hysteresis*1)) && s1_completed) {
      s2_completed = true;
    }
    
    // S3: Return position (low angle) - only if S1 AND S2 were completed
    else if (currentAngle <= (angleThresholds.returnThreshold + (angleThresholds.hysteresis*1)) && s1_completed && s2_completed) {
      s3_completed = true;
    }
    

    
    // Check for complete rep OUTSIDE the state conditions (Python style)
    if (s1_completed && s2_completed && s3_completed) {
      setCurrentRepCount(prev => {
        const newCount = prev + 1;

        return newCount;
      });
      
      // Reset all flags after successful completion
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;

      
      // IMPORTANT: Update the state immediately after resetting
      setRepStates(prev => ({
        ...prev,
        [trackingJoint]: {
          s1_completed: false,
          s2_completed: false,
          s3_completed: false,
          lastAngle: currentAngle,
          repStartTime: null
        }
      }));
      
      // Return early to avoid the final setRepStates call
      return;
    }
    
    // Error handling: Return to S1 without completing S3
    if (currentAngle <= angleThresholds.startThreshold && s1_completed && s2_completed && !s3_completed) {

      // Reset all states
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;
    }
  }

  // Update state with new flag values
  setRepStates(prev => ({
    ...prev,
    [trackingJoint]: {
      s1_completed,
      s2_completed,
      s3_completed,
      lastAngle: currentAngle,
      repStartTime: s1_completed && !prev[trackingJoint]?.s1_completed ? Date.now() : prev[trackingJoint]?.repStartTime
    }
  }));
  
  // Enhanced debugging

};

// Pose feedback processing function
const processPoseFeedback = () => {

  
  if (!poseFeedbackEnabled || !currentKeypointFrame) {

    return;
  }
  
  // Parse pose analysis data
  const poseAnalysisData = exercise?.poseAnalysis 
    ? (typeof exercise.poseAnalysis === 'string' 
      ? JSON.parse(exercise.poseAnalysis) 
      : exercise.poseAnalysis)
    : null;
  

  
  if (!poseAnalysisData?.targetPoses) {

    return;
  }
  
  // Parse nested JSON strings if they exist
  let parsedTargetPoses = poseAnalysisData.targetPoses;
  let parsedAngleRanges = poseAnalysisData.angleRanges || {};
  let parsedToleranceMultipliers = poseAnalysisData.toleranceMultipliers || {};
  
  // Parse targetPoses if it's a JSON string
  if (typeof parsedTargetPoses === 'string') {
    try {
      parsedTargetPoses = JSON.parse(parsedTargetPoses);

    } catch (error) {
      console.error('❌ Error parsing targetPoses JSON:', error);
      return;
    }
  }
  
  // Parse angleRanges if it's a JSON string
  if (typeof parsedAngleRanges === 'string') {
    try {
      parsedAngleRanges = JSON.parse(parsedAngleRanges);

    } catch (error) {
      console.error('❌ Error parsing angleRanges JSON:', error);
      parsedAngleRanges = {};
    }
  }
  
  // Parse toleranceMultipliers if it's a JSON string
  if (typeof parsedToleranceMultipliers === 'string') {
    try {
      parsedToleranceMultipliers = JSON.parse(parsedToleranceMultipliers);

    } catch (error) {
      console.error('❌ Error parsing toleranceMultipliers JSON:', error);
      parsedToleranceMultipliers = {};
    }
  }
  
  // Final validation
  if (!Array.isArray(parsedTargetPoses) || parsedTargetPoses.length === 0) {

    return;
  }
  

  
  // Calculate current angles from keypoints
  const currentAngles = calculateAnglesForPoseAnalysis(currentKeypointFrame);
  

  
  // If calculateAnglesForPoseAnalysis returns empty, fall back to getCurrentAngles
  if (Object.keys(currentAngles).length === 0) {
    const fallbackAngles = getCurrentAngles(currentKeypointFrame);
    
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
  

};
  
  // Process feedback on each frame
  useEffect(() => {

    
    if (currentKeypointFrame && repCountingEnabled) {
      processRepFeedback();
    }
  }, [currentKeypointFrame, repCountingEnabled]); // Removed currentAngles and exercise?.repAnalysis?.jointAngleRules from dependencies

  // Process pose feedback on each frame
  useEffect(() => {
    if (currentKeypointFrame && poseFeedbackEnabled) {
      processPoseFeedback();
    }
  }, [currentKeypointFrame, poseFeedbackEnabled]);

  // Exercise-type-specific content renderer
  const renderExerciseTypeSpecificContent = () => {
    const exerciseType = exercise?.exerciseType;
    
    switch (exerciseType) {
      case 'repetition':
      case 'rep-based':
        return (
          <>
            {/* Rep Counting Toggle */}
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
            {/* Pose Feedback Toggle */}
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
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: '2px', fontStyle: 'italic' }}>
                Skeleton and angles will be automatically enabled
              </div>
            </div>

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

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle video metadata loading
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const detectedAspectRatio = video.videoWidth > video.videoHeight ? 'landscape' : 'portrait';
    
    setMetadata({
      duration: propDuration || video.duration,
      frameRate: 30, // Default, will be refined
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: detectedAspectRatio
    });
    
    setDuration(propDuration || video.duration);
    setIsLoading(false);
  }, [propDuration]);

  // Handle video time updates
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    // Update keypoint frame if data is available
    if (showKeypoints && keypointData && keypointData.length > 0) {
      // Calculate keypoint timestamps (10fps)
      const keypointFrameRate = 10;
      const keypointTimestamps = Array.from({ length: keypointData.length }, (_, i) => i / keypointFrameRate);
      
      // Find nearest keypoint frame
      const nearestFrameIndex = findNearestTimestamp(time, keypointTimestamps);
      const keypointFrame = keypointData[nearestFrameIndex] || null;
      setCurrentKeypointFrame(keypointFrame);
    }
    
    onTimeUpdate?.(time);
    onFrameChange?.(Math.floor(time * 30)); // Keep original frame calculation for other uses
  }, [onTimeUpdate, onFrameChange, showKeypoints]); // Removed keypointData from dependencies

  // Helper function to find nearest timestamp
  const findNearestTimestamp = (targetTime: number, timestamps: number[]): number => {
    if (timestamps.length === 0) return 0;
    
    let nearestIndex = 0;
    let nearestDistance = Math.abs(timestamps[0] - targetTime);
    
    for (let i = 1; i < timestamps.length; i++) {
      const distance = Math.abs(timestamps[i] - targetTime);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  };

  // Handle video errors
  const handleError = useCallback(() => {
    setError('Failed to load video');
    setIsLoading(false);
  }, []);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  }, []);

  // Seek to a specific frame (assuming 30fps)
  const seekToFrame = useCallback((frame: number) => {
    if (!videoRef.current) return;
    const time = frame / 30;
    videoRef.current.currentTime = time;
  }, []);

  useImperativeHandle(ref, () => ({
    seekToFrame,
  }));

  // Playback speed control
  const changePlaybackSpeed = useCallback((speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  }, []);

  // Zoom control
  const changeZoom = useCallback((zoom: number) => {
    setZoomLevel(Math.max(0.5, Math.min(3, zoom))); // Limit zoom between 0.5x and 3x
  }, []);

  // Zoom preset control
  const setZoomPreset = useCallback((target: typeof zoomTarget) => {
    setZoomTarget(target);
    // Set appropriate zoom level for each preset
    const zoomLevels = {
      'full': 1,
      'upper-body': 1.5,
      'lower-body': 1.5,
      'knees': 2,
      'shoulders': 2,
      'hips': 2
    };
    setZoomLevel(zoomLevels[target]);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    
    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate angles for current pose
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

  // Handle touch gestures for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Will implement touch gestures in future phases
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Don't handle spacebar if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement).contentEditable === 'true'
        )) {
          return; // Let the input field handle the spacebar
        }
        
        e.preventDefault();
        togglePlay();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay]);

  // Draw keypoints on canvas
  useEffect(() => {
    if (!canvasRef.current || !showKeypoints || !currentKeypointFrame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size to match video display
    if (videoRef.current) {
      const video = videoRef.current;
      const videoRect = video.getBoundingClientRect();
      const containerRect = video.parentElement?.getBoundingClientRect();
      
      // Use the video's actual display size within its container
      canvas.width = videoRect.width;
      canvas.height = videoRect.height;
      
      // Set canvas CSS size to match video display size
      canvas.style.width = videoRect.width + 'px';
      canvas.style.height = videoRect.height + 'px';
      if (containerRect) {
        canvas.style.left = videoRect.left - containerRect.left + 'px';
        canvas.style.top = videoRect.top - containerRect.top + 'px';
      }
    }

    // Draw keypoints
    if (currentKeypointFrame.keypoints) {
      // Get video dimensions for scaling
      const video = videoRef.current;
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
        const startPoint = currentKeypointFrame.keypoints[start];
        const endPoint = currentKeypointFrame.keypoints[end];
        if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * scaleX + offsetX, startPoint.y * scaleY + offsetY);
          ctx.lineTo(endPoint.x * scaleX + offsetX, endPoint.y * scaleY + offsetY);
          ctx.stroke();
        }
      });
      // Only draw selected joints
      currentKeypointFrame.keypoints.forEach((keypoint: any, idx: number) => {
        if (keypoint.score > 0.3 && selectedJoints.includes(idx)) {
          ctx.beginPath();
          ctx.fillStyle = jointColor;
          ctx.arc(keypoint.x * scaleX + offsetX, keypoint.y * scaleY + offsetY, jointSize, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Draw angle measurements if enabled
      if (showAngles) {
        const angles = calculatePoseAngles(currentKeypointFrame);
        
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
              const keypoint = currentKeypointFrame.keypoints[keypointIndex];
              if (keypoint && keypoint.score > 0.3) {
                const x = keypoint.x * scaleX + offsetX;
                const y = keypoint.y * scaleY + offsetY;
                // --- Custom Angle Reading Styling ---
                const text = `${Math.round(angle)}°`;
                const textWidth = ctx.measureText(text).width;
                // Adjust these values for padding, corner radius, and text color:
                const horizontalPadding = 10; // px
                const verticalPadding = 6;    // px
                const rectHeight = 18;        // px
                const cornerRadius = 6;       // px
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
    }
  }, [showKeypoints, showAngles, currentKeypointFrame, selectedAngles, selectedJoints, selectedBones, boneColor, jointColor, boneWeight, jointSize]);

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

  // Helper to check for any height class
  const hasHeightClass = (className: string) => /h-(full|\[.*\])/.test(className);

  // Helper to extract height value from className
  const extractHeightFromClassName = (className: string): string | undefined => {
    const heightMatch = className.match(/h-\[([^\]]+)\]/);
    if (heightMatch) {
      return heightMatch[1];
    }
    if (className.includes('h-full')) {
      return '100%';
    }
    return undefined;
  };

  // Determine container classes based on aspect ratio
  const getContainerClasses = () => {
    const baseClasses = 'relative bg-black rounded-lg overflow-hidden';
    
    // Use className if provided, otherwise use default size constraints
    const sizeClasses = hasHeightClass(className) ? '' : 'max-h-96 mx-auto';
    
    return `${baseClasses} ${sizeClasses} ${className}`;
  };

  // Ref and state for video container width
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoContainerWidth, setVideoContainerWidth] = useState<number | undefined>(undefined);
  const [videoContainerHeight, setVideoContainerHeight] = useState<number | undefined>(undefined);

  // Update width on mount and resize
  useEffect(() => {
    function updateWidth() {
      if (videoContainerRef.current) {
        setVideoContainerWidth(videoContainerRef.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Update video container height on mount and resize
  useEffect(() => {
    function updateHeight() {
      if (videoContainerRef.current) {
        setVideoContainerHeight(videoContainerRef.current.offsetHeight);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Add a ref for closing dropdowns on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // fillRoundRect helper for angle backgrounds
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

  // Export current frame as PNG (video + overlays)
  const exportCurrentFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const overlay = canvasRef.current;
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
  }, [videoVisible]);

  // SVGs for eye/eye-off
  const EyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1em', height: '1.1em', marginRight: '0.35em', verticalAlign: 'middle', display: 'inline-block' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.5 7.5 7.5 4.5 12 4.5c4.5 0 8.5 3 9.75 7.5-1.25 4.5-5.25 7.5-9.75 7.5-4.5 0-8.5-3-9.75-7.5z" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
  const EyeOffIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1em', height: '1.1em', marginRight: '0.35em', verticalAlign: 'middle', display: 'inline-block' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.477 10.477A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .523-.134 1.015-.366 1.438m-1.157 1.157A3 3 0 019 12c0-.523.134-1.015.366-1.438m1.157-1.157A3 3 0 0112 15c-1.657 0-3-1.343-3-3 0-.523.134-1.015.366-1.438m1.157-1.157A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .523-.134 1.015-.366 1.438m-1.157 1.157A3 3 0 019 12c0-.523.134-1.015.366-1.438" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.5 7.5 7.5 4.5 12 4.5c2.042 0 3.97.627 5.563 1.7M21.75 12c-1.25 4.5-5.25 7.5-9.75 7.5-2.042 0-3.97-.627-5.563-1.7" />
    </svg>
  );

  // --- SHARED UI/LOGIC MOVED TO CoreVideoPlayer ---

// Video element for playback
const videoElement = videoUrl ? (
  <div style={{ overflow: 'hidden', position: 'relative' }}>
    <video
      ref={videoRef}
      src={videoUrl}
      className="block"
      style={{ 
        maxHeight: hasHeightClass(className) ? extractHeightFromClassName(className) : '80vh',
        maxWidth: '100%',
        objectFit: 'contain',
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'center center',
        opacity: videoVisible ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onError={handleError}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onTouchStart={handleTouchStart}
      playsInline
      preload="metadata"
    />
  </div>
) : (
  <div style={{ 
    overflow: 'hidden', 
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: hasHeightClass(className) ? extractHeightFromClassName(className) : '80vh',
    background: 'var(--vp-panel-bg)',
    color: 'var(--vp-panel-title)',
    fontSize: '16px'
  }}>
    No video available
  </div>
);

  // Overlays (e.g., feedback, angles) - currently handled by canvas drawing, so pass null
  const overlays = null;

  // Controls are now handled by CoreVideoPlayer's built-in play bar
  const controls = null;

  // --- Panel Content for Each Menu ---
      const selectionPanel = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vp-panel-title)', marginBottom: '3px' }}>Focus Selection</div>
      {/* Focus Dropdown */}
      <div ref={focusDropdownRef} className="flex flex-col" style={{ position: 'relative', minWidth: '100px' }}>
        <button
          className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
          style={{
            border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
            color: 'var(--vp-dropdown-label, #353839)',
            fontWeight: 500,
            marginBottom: '3px',
            transition: 'color 0.2s, border 0.2s',
          }}
          onClick={() => setOpenDropdown(openDropdown === 'focus' ? null : 'focus')}
          type="button"
        >
          {(() => {
            switch (zoomTarget) {
              case 'full': return 'Full Body';
              case 'upper-body': return 'Upper Body';
              case 'lower-body': return 'Lower Body';
              case 'knees': return 'Knees';
              case 'shoulders': return 'Shoulders';
              case 'hips': return 'Hips';
              default: return zoomTarget;
            }
          })()}
          <span style={{ 
            marginLeft: '8px', 
            display: 'flex', 
            alignItems: 'center',
            transform: openDropdown === 'focus' ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out'
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {openDropdown === 'focus' && (
          <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
            {[
              { value: 'full', label: 'Full Body' },
              { value: 'upper-body', label: 'Upper Body' },
              { value: 'lower-body', label: 'Lower Body' },
              { value: 'knees', label: 'Knees' },
              { value: 'shoulders', label: 'Shoulders' },
              { value: 'hips', label: 'Hips' },
            ].map(opt => (
              <label
                key={opt.value}
                className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                style={{ background: 'var(--vp-dropdown-item-bg)', color: 'var(--vp-dropdown-item-text)', whiteSpace: 'nowrap' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)')}
              >
                <input
                  type="radio"
                  checked={zoomTarget === opt.value}
                  onChange={() => { setZoomPreset(opt.value as typeof zoomTarget); setOpenDropdown(null); }}
                  style={{ marginRight: '9px' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>
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
        {openDropdown === 'joints' && (
          <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
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
        {openDropdown === 'bones' && (
          <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '100px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
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
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '0px' }}>Style</div>
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
;
      const exportPanel = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '0px' }}>Export</div>
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

  // Analysis Panel for recorded videos
  const analysisPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vp-panel-title)', marginBottom: '8px' }}>Motion Analysis</div>
      
      {/* Exercise Type and Classification */}
      <div style={{ 
        background: 'var(--vp-dropdown-bg)', 
        border: '1px solid var(--vp-dropdown-border)', 
        borderRadius: '4px', 
        padding: '8px', 
        marginBottom: '8px' 
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vp-dropdown-item-text)', marginBottom: '4px' }}>Motion Classification:</div>
        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
          Type: <span style={{ color: '#3b82f6', fontWeight: 500 }}>{exercise?.exerciseType || 'Unknown'}</span>
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: '2px' }}>
          Joints of Interest: <span style={{ color: '#3b82f6', fontWeight: 500 }}>
            {exercise?.jointsOfInterest && Array.isArray(exercise.jointsOfInterest) && exercise.jointsOfInterest.length > 0 
              ? exercise.jointsOfInterest.join(', ')
              : 'None specified'
            }
          </span>
        </div>
      </div>

        <button
          onClick={() => setShowKeypoints(!showKeypoints)}
          className="px-3 py-2 rounded text-xs vp-btn flex items-center"
          style={{ marginBottom: '4px' }}
        >
          {showKeypoints ? EyeIcon : EyeOffIcon}Skeleton
        </button>
        <button
          onClick={() => setShowAngles(!showAngles)}
          className="px-3 py-2 rounded text-xs vp-btn flex items-center"
          style={{ marginBottom: '4px' }}
        >
          {showAngles ? EyeIcon : EyeOffIcon}Angles
        </button>
        <button
          onClick={() => setVideoVisible(v => !v)}
          className="px-3 py-2 rounded text-xs vp-btn flex items-center"
          style={{ marginBottom: '4px' }}
        >
          {videoVisible ? EyeIcon : EyeOffIcon}Video
        </button>

      {/* Exercise-Type-Specific Content */}
      {renderExerciseTypeSpecificContent()}

    </div>
  );

  // --- Panel Content Switch ---
  let panelContent: React.ReactNode = null;
  if (openMenu === 'focus') panelContent = selectionPanel; // Changed from 'selection'
  else if (openMenu === 'style') panelContent = stylePanel;
  else if (openMenu === 'export') panelContent = exportPanel;
  else if (openMenu === 'analysis') panelContent = analysisPanel; // Added analysis panel

  // Strategy pattern for feedback overlay based on exercise type
  const renderFeedbackOverlay = () => {
    if (exercise?.exerciseType === 'pose' || exercise?.exerciseType === 'pose-based') {
      // Only show pose feedback overlay when pose feedback is enabled
      if (!poseFeedbackEnabled) {

        return { type: null };
      }
      

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

        return { type: null };
      }
      

      return {
        type: 'rep' as const,
        repCount: currentRepCount,
        onResetRep: resetRepCount
      };
    } else if (exercise?.exerciseType === 'flow' || exercise?.exerciseType === 'flow-based') {
      // Only show flow feedback overlay when flow feedback is enabled (placeholder for future)
      // For now, always return null since flow feedback isn't implemented yet

      return { type: null };
    } else {

      return { type: null };
    }
  };

  return (
    <CoreVideoPlayer
      videoElement={videoElement}
      canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
      overlays={overlays}
      controls={controls}
      advancedPanel={null}
      containerClassName={className}
      loading={isLoading}
      error={error}
      showAdvancedPanel={false}
      onCloseAdvancedPanel={undefined}
      height={extractHeightFromClassName(className)}
      openMenu={openMenu}
      setOpenMenu={setOpenMenu}
      panelContent={panelContent}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      onPlayPause={togglePlay}
      onSeek={seekTo}
      feedbackOverlay={renderFeedbackOverlay()}
    />
  );
});

export default VideoPlayer; 