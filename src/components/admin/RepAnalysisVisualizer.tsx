'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import InteractiveTimelineChart from './InteractiveTimelineChart';
import VideoPlayer, { VideoPlayerHandle } from '../VideoPlayer';

interface RepAnalysisData {
  // Only fields that actually exist in the database schema
  repBoundaries?: Array<{
    startFrame: number;
    endFrame: number;
    startTime: number;
    endTime: number;
  }>;
  goldStandardRep?: {
    startFrame: number;
    endFrame: number;
    phases: Array<{
      name: string;
      startFrame: number;
      endFrame: number;
    }>;
  };
  adminNotes?: string;
  jointAngleRules?: any;
  repCountingRules?: any;
}

interface RepAnalysisVisualizerProps {
  data: RepAnalysisData | null;
  exerciseTitle: string;
  exerciseId?: string;
  exerciseType?: string;
  keypointsData?: any;
  selectedJoints?: string[];
  videoUrl?: string;
  onRepBoundaryChange?: (boundaries: any[]) => void;
  onPhaseChange?: (phases: any[]) => void;
  onRepAnalysisChange?: (updatedData: any) => void;
  onDataReload?: () => void;
}

export default function RepAnalysisVisualizer({ 
  data, 
  exerciseTitle, 
  exerciseId,
  exerciseType,
  keypointsData, 
  selectedJoints,
  videoUrl,
  onRepBoundaryChange,
  onPhaseChange,
  onRepAnalysisChange,
  onDataReload
}: RepAnalysisVisualizerProps) {
  const [selectedRep, setSelectedRep] = useState(0);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [exercise, setExercise] = useState<any>(null);

  // Load exercise data from database
  useEffect(() => {
    if (exerciseId) {
      fetch(`/api/exercises/${exerciseId}`)
        .then(res => res.json())
        .then(data => {
          setExercise(data);
        })
        .catch(error => {
          console.error('Error loading exercise data:', error);
        });
    }
  }, [exerciseId]);

  console.log('RepAnalysisVisualizer received data:', data);
  console.log('Exercise title:', exerciseTitle);
  console.log('Data types:', {
    repBoundaries: typeof data?.repBoundaries,
    isRepBoundariesArray: Array.isArray(data?.repBoundaries),
    goldStandardRep: typeof data?.goldStandardRep,
  });

  if (!data) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Rep Analysis Data</h3>
        <p className="text-gray-600">Generate analysis data to see rep visualization</p>
      </div>
    );
  }

  // Calculate duration from rep boundaries or gold standard rep
  const computedDuration = data.repBoundaries?.length 
    ? Math.max(...data.repBoundaries.map((r) => r.endTime || 0))
    : data.goldStandardRep?.endFrame ? data.goldStandardRep.endFrame / 30 : 5; // Convert frames to seconds (30fps) or default to 5 seconds

  const totalDuration = computedDuration;
  const repCount = data.repBoundaries?.length || 1;
  const phases = data.goldStandardRep?.phases || [];
  const keyFrames: any[] = []; // No keyFrames field in database
  // Create default rep boundaries if none exist
  let repBoundaries = Array.isArray(data.repBoundaries) ? data.repBoundaries.map((boundary: any) => {
    // Ensure each rep has phases
    if (!boundary.phases || boundary.phases.length === 0) {
      return {
        ...boundary,
        phases: [
          { name: 'eccentric', startTime: boundary.startTime || 0, endTime: (boundary.startTime || 0) + ((boundary.endTime || 0) - (boundary.startTime || 0)) * 0.5 },
          { name: 'concentric', startTime: (boundary.startTime || 0) + ((boundary.endTime || 0) - (boundary.startTime || 0)) * 0.5, endTime: boundary.endTime || 0 }
        ]
      };
    }
    return boundary;
  }) : [];

  // If no rep boundaries exist, create a default one
  if (repBoundaries.length === 0 && data) {
    const defaultRep = {
      id: `rep-${Date.now()}`,
      startTime: 0,
      endTime: 5,
      bottomTime: 2.3,
      startFrame: 0,
      endFrame: 150,
      phases: [
        { name: 'eccentric', startTime: 0, endTime: 2.3 },
        { name: 'concentric', startTime: 2.3, endTime: 5 }
      ]
    };
    repBoundaries = [defaultRep];
  }

  // Ensure gold standard rep exists with proper structure
  if (data && (!data.goldStandardRep || typeof data.goldStandardRep === 'string')) {
    const defaultGoldStandard = {
      startTime: 0,
      endTime: 5,
      bottomTime: 2.3,
      startFrame: 0,
      endFrame: 150,
      phases: [
        { name: 'eccentric', startTime: 0, endTime: 2.3, startFrame: 0, endFrame: 69 },
        { name: 'concentric', startTime: 2.3, endTime: 5, startFrame: 69, endFrame: 150 }
      ]
    };
    // Update the data object to include the default gold standard
    data.goldStandardRep = defaultGoldStandard;
  }
  
  // Debug: Log the data being loaded
  console.log('RepAnalysisVisualizer received data:', data);
  console.log('Exercise title:', exerciseTitle);
  console.log('Data types:', {
    repBoundaries: typeof data?.repBoundaries,
    isRepBoundariesArray: Array.isArray(data?.repBoundaries),
    goldStandardRep: typeof data?.goldStandardRep,
  });
  console.log('Extracted arrays:', {
    repBoundaries: repBoundaries
  });
  console.log('Rep boundaries with phases:', repBoundaries.map((boundary, index) => ({
    rep: index + 1,
    startTime: boundary.startTime,
    endTime: boundary.endTime,
    phases: boundary.phases
  })));

  // Chart data preparation
  const timelineData = [{ t: 0, v: 0 }, { t: computedDuration, v: 0 }];
  
  // Add keypoints data to timeline if available
  let keypointsTimelineData = timelineData;
  let jointsOfInterest: string[] = [];
  
  // COCO keypoint mapping (standard pose estimation format)
  const cocoKeypointNames = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];
  
  if (keypointsData && Array.isArray(keypointsData) && keypointsData.length > 0) {
    console.log('Keypoints data structure:', keypointsData[0]); // Debug first frame
    
    // Extract joints of interest from the first frame
    if (keypointsData[0] && keypointsData[0].keypoints) {
      const numericJoints = Object.keys(keypointsData[0].keypoints);
      console.log('Numeric joints:', numericJoints);
      
      // Map numeric indices to joint names
      const allMappedJoints = numericJoints.map(index => {
        const jointIndex = parseInt(index);
        return cocoKeypointNames[jointIndex] || `joint_${index}`;
      });
      
      console.log('All mapped joints:', allMappedJoints);
      console.log('Selected joints from database:', selectedJoints);
      
      // Filter to only show selected joints from database
      if (selectedJoints && selectedJoints.length > 0) {
        // Map database joint names to COCO format for comparison
        const selectedJointsCOCO = selectedJoints.map(joint => {
          // Convert camelCase to snake_case for comparison
          return joint.replace(/([A-Z])/g, '_$1').toLowerCase();
        });
        
        console.log('Selected joints in COCO format:', selectedJointsCOCO);
        
        // Filter joints to only include selected ones
        jointsOfInterest = allMappedJoints.filter((joint, index) => {
          const isSelected = selectedJointsCOCO.includes(joint);
          console.log(`Joint ${joint} (index ${index}) selected: ${isSelected}`);
          return isSelected;
        });
      } else {
        // If no joints selected, show all joints
        jointsOfInterest = allMappedJoints;
      }
      
      console.log('Final joints of interest (filtered):', jointsOfInterest);
      
      // Debug: Check what colors would be assigned
      jointsOfInterest.forEach((joint, index) => {
        const color = getJointColor(joint);
        console.log(`Joint: ${joint} -> Color: ${color}`);
      });
    }
    
    // Create timeline data points from keypoints with joint-specific data
    keypointsTimelineData = keypointsData.map((frame: any, index: number) => {
      const dataPoint: any = {
        t: (index / keypointsData.length) * computedDuration, // Distribute across timeline
        v: 0, // Base value
      };
      
      // Add joint-specific data
      if (frame.keypoints) {
        jointsOfInterest.forEach((jointName, jointIndex) => {
          const numericIndex = jointIndex.toString();
          if (frame.keypoints[numericIndex]) {
            // Use Y position (vertical movement) for visualization
            dataPoint[jointName] = frame.keypoints[numericIndex].y || 0;
          }
        });
      }
      
      return dataPoint;
    });
    
    console.log('Keypoints timeline data with joints:', keypointsTimelineData.slice(0, 3)); // Debug first 3 points
    console.log('Joints that will be rendered:', jointsOfInterest);
  }
  const phaseDurationData = phases.map((p) => ({
    name: p.name,
    duration: Number(((p.endFrame - p.startFrame) / 30).toFixed(2)), // Convert frames to seconds (30fps)
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{totalDuration.toFixed(1)}s</div>
          <div className="text-sm text-blue-700">Rep Duration (calculated)</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{repCount}</div>
          <div className="text-sm text-green-700">Rep Count (from boundaries)</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">{phases.length}</div>
          <div className="text-sm text-purple-700">Rep Phases</div>
        </div>
      </div>

      {/* Video and Timeline Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Video & Timeline Analysis</h3>
        
        {videoUrl ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-700">Reference Video</h4>
              {videoUrl ? (
                <VideoPlayer
                  ref={videoPlayerRef}
                  videoUrl={`/api/storage/video-proxy?fileName=${encodeURIComponent(videoUrl)}`}
                  onTimeUpdate={(time) => {
                    setCurrentVideoTime(time);
                    console.log('Video time update:', time);
                  }}
                  keypointData={keypointsData}
                  exercise={exercise}
                  className="w-full"
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">🎥</div>
                  <div>No reference video available</div>
                </div>
              )}
            </div>

            {/* Interactive Timeline Chart */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-700">Rep Data</h4>
              <InteractiveTimelineChart
                keypointsData={keypointsData || []}
                videoUrl={videoUrl}
                repBoundaries={repBoundaries.map((boundary, index) => ({
                  id: boundary.id || `rep-${index}`,
                  startTime: boundary.startTime || 0,
                  endTime: boundary.endTime || 0,
                  bottomTime: boundary.bottomTime || (boundary.startTime + boundary.endTime) / 2,
                  startFrame: boundary.startFrame || 0,
                  endFrame: boundary.endFrame || 0,
                  phases: boundary.phases || []
                }))}
                phases={[]} // We'll handle phases within each rep boundary instead
                selectedJoints={selectedJoints || []}
                repAnalysisData={data} // Pass the full rep analysis data
                exerciseId={exerciseId}
                exerciseType={exerciseType}
                onRepBoundaryChange={onRepBoundaryChange}
                onPhaseChange={onPhaseChange}
                onRepAnalysisChange={onRepAnalysisChange}
                onTimeChange={(time) => {
                  console.log('Time changed:', time);
                  // Sync video to chart click
                  if (videoPlayerRef.current) {
                    // Convert time to frame and seek
                    const frameRate = 30; // Assuming 30fps
                    const frame = Math.floor(time * frameRate);
                    videoPlayerRef.current.seekToFrame(frame);
                  }
                }}
                onDataReload={onDataReload}
                currentTime={currentVideoTime}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No timeline data available
          </div>
        )}
      </div>

      {/* Key Frames */}
      {keyFrames.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Frames</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyFrames.map((keyFrame, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Frame {keyFrame.frame}</span>
                  <span className="text-sm text-gray-500">{keyFrame.time.toFixed(1)}s</span>
                </div>
                <p className="text-sm text-gray-600">{keyFrame.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for phase colors
function getPhaseColor(phaseName: string): string {
  const colors: { [key: string]: string } = {
    'eccentric': '#fef3c7', // yellow-100
    'concentric': '#dbeafe', // blue-100
    'isometric': '#f3e8ff', // purple-100
    'transition': '#fef2f2', // red-100
    'rest': '#f0fdf4', // green-100
  };
  return colors[phaseName.toLowerCase()] || '#f3f4f6'; // gray-100 default
}

function getPhaseTextColor(phaseName: string): string {
  const colors: { [key: string]: string } = {
    'eccentric': '#92400e', // yellow-800
    'concentric': '#1e40af', // blue-800
    'isometric': '#6b21a8', // purple-800
    'transition': '#991b1b', // red-800
    'rest': '#166534', // green-800
  };
  return colors[phaseName.toLowerCase()] || '#374151'; // gray-700 default
}

function getJointColor(jointName: string): string {
  const colors: { [key: string]: string } = {
    // Database format (with underscores)
    'nose': '#ef4444', // red-500
    'left_eye': '#f97316', // orange-500
    'right_eye': '#f97316', // orange-500
    'left_ear': '#eab308', // yellow-500
    'right_ear': '#eab308', // yellow-500
    'left_shoulder': '#22c55e', // green-500
    'right_shoulder': '#22c55e', // green-500
    'left_elbow': '#3b82f6', // blue-500
    'right_elbow': '#3b82f6', // blue-500
    'left_wrist': '#8b5cf6', // purple-500
    'right_wrist': '#8b5cf6', // purple-500
    'left_hip': '#ec4899', // pink-500
    'right_hip': '#ec4899', // pink-500
    'left_knee': '#06b6d4', // cyan-500
    'right_knee': '#06b6d4', // cyan-500
    'left_ankle': '#84cc16', // lime-500
    'right_ankle': '#84cc16', // lime-500
    // UI format (camelCase)
    'leftKnee': '#06b6d4', // cyan-500
    'rightKnee': '#06b6d4', // cyan-500
    'leftHip': '#ec4899', // pink-500
    'rightHip': '#ec4899', // pink-500
    'leftElbow': '#3b82f6', // blue-500
    'rightElbow': '#3b82f6', // blue-500
    'leftShoulder': '#22c55e', // green-500
    'rightShoulder': '#22c55e', // green-500
    'leftAnkle': '#84cc16', // lime-500
    'rightAnkle': '#84cc16', // lime-500
    'leftWrist': '#8b5cf6', // purple-500
    'rightWrist': '#8b5cf6', // purple-500
  };
  return colors[jointName] || '#6b7280'; // gray-500 default
}
