'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';


// COCO keypoint names mapping
const COCO_KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

export interface RepBoundary {
  id: string;
  startTime: number;
  endTime: number;
  bottomTime?: number;
  startFrame: number;
  endFrame: number;
  phases?: Array<{
    name: string;
    startTime: number;
    endTime: number;
  }>;
}

export interface Phase {
  name: string;
  startTime: number;
  duration: number;
  color: string;
}

export interface InteractiveTimelineChartProps {
  keypointsData?: any[];
  videoUrl?: string;
  repBoundaries: RepBoundary[];
  phases: Phase[];
  selectedJoints: string[];
  repAnalysisData?: any;
  exerciseId?: string;
  exerciseType?: string;
  onRepBoundaryChange?: (boundaries: RepBoundary[]) => void;
  onPhaseChange?: (phases: Phase[]) => void;
  onRepAnalysisChange?: (data: any) => void;
  onTimeChange?: (time: number) => void;
  onDataReload?: () => void;
  currentTime?: number;
  isPlaying?: boolean;
}

// Joint color mapping
const getJointColor = (jointName: string): string => {
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
  return colors[jointName] || '#6b7280';
};

// Phase color mapping
const getPhaseColor = (phaseName: string): string => {
  const colorMap: { [key: string]: string } = {
    'eccentric': '#ef4444', // Red
    'concentric': '#22c55e', // Green
    'isometric': '#3b82f6', // Blue
    'rest': '#f59e0b', // Amber
  };
  
  return colorMap[phaseName.toLowerCase()] || '#6b7280'; // Default gray
};

export default function InteractiveTimelineChart({
  keypointsData,
  videoUrl,
  repBoundaries,
  phases,
  selectedJoints,
  repAnalysisData,
  exerciseId,
  exerciseType,
  onRepBoundaryChange,
  onPhaseChange,
  onRepAnalysisChange,
  onTimeChange,
  onDataReload,
  currentTime = 0,
  isPlaying = false
}: InteractiveTimelineChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [hoveredValues, setHoveredValues] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState<'timeline' | 'configuration'>('timeline');

  // Debug: Log the data being received
  useEffect(() => {
    console.log('InteractiveTimelineChart received repBoundaries:', repBoundaries);
    console.log('InteractiveTimelineChart received repAnalysisData:', repAnalysisData);
  }, [repBoundaries, repAnalysisData]);

  // Calculate the full duration based on the maximum time from rep boundaries or keypoints
  const calculateFullDuration = () => {
    let fullDuration = videoDuration;
    
    // If we have rep boundaries, use the maximum end time
    if (repBoundaries && repBoundaries.length > 0) {
      const maxRepTime = Math.max(...repBoundaries.map(b => b.endTime || 0));
      fullDuration = Math.max(fullDuration || 0, maxRepTime);
    }
    
    // If we still don't have a duration, estimate from keypoints (assuming 30fps)
    if ((!fullDuration || fullDuration === 0) && keypointsData && keypointsData.length > 0) {
      fullDuration = keypointsData.length / 30;
    }
    
    // Add some padding to show the full timeline
    fullDuration = Math.max(fullDuration, 10); // Minimum 10 seconds
    
    return fullDuration;
  };

  const fullDuration = calculateFullDuration();

  // Process keypoints data for chart
  useEffect(() => {
    if (!keypointsData || keypointsData.length === 0) return;

    // Map numeric indices to joint names and filter selected joints
    const numericJoints = Object.keys(keypointsData[0]?.keypoints || {});
    const allMappedJoints = numericJoints.map(index => {
      const jointIndex = parseInt(index);
      return COCO_KEYPOINT_NAMES[jointIndex] || `joint_${index}`;
    });

    // Filter to only selected joints
    const filteredJoints = selectedJoints.length > 0 
      ? allMappedJoints.filter((joint, index) => {
          const selectedJointsCOCO = selectedJoints.map(j => j.replace(/([A-Z])/g, '_$1').toLowerCase());
          return selectedJointsCOCO.includes(joint);
        })
      : allMappedJoints;

    // Create chart data with actual timestamps
    const processedData = keypointsData.map((frame: any, index: number) => {
      const dataPoint: any = {
        frame: index,
        time: (index / keypointsData.length) * fullDuration,
        timestamp: index,
      };

      // Add joint data
      if (frame.keypoints) {
        filteredJoints.forEach((jointName) => {
          // Find the correct index for this joint in the COCO keypoints array
          const jointIndex = COCO_KEYPOINT_NAMES.indexOf(jointName);
          if (jointIndex !== -1 && frame.keypoints[jointIndex]) {
            // Use Y position for vertical movement visualization
            dataPoint[jointName] = frame.keypoints[jointIndex].y || 0;
          }
        });
      }

      return dataPoint;
    });

    setChartData(processedData);
    setVideoDuration(fullDuration);
  }, [keypointsData, selectedJoints, videoDuration, fullDuration]);

  // Handle chart click for seeking
  const handleChartClick = (data: any) => {
    if (data && data.time !== undefined && onTimeChange) {
      onTimeChange(data.time);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg w-full">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Interactive Timeline
          </button>
          <button
            onClick={() => setActiveTab('configuration')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'configuration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Rep Analysis Configuration
          </button>

        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'timeline' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 px-0">Interactive Timeline</h3>
              
              {chartData.length > 0 ? (
                <div className="space-y-4 px-0">
                  {/* Chart */}
                  <div className="h-96 w-[100%]">
                    <div className="h-80 w-[100%]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          onClick={handleChartClick}
                          onMouseMove={(e) => {
                            if (e && e.activeLabel !== undefined) {
                              const time = Number(e.activeLabel);
                              const dataPoint = chartData.find(point => Math.abs(point.time - time) < 0.1);
                              if (dataPoint) {
                                const values: {[key: string]: number} = {};
                                selectedJoints.forEach((joint) => {
                                  const jointName = joint.replace(/([A-Z])/g, '_$1').toLowerCase();
                                  if (dataPoint[jointName] !== undefined) {
                                    values[joint] = dataPoint[jointName];
                                  }
                                });
                                setHoveredValues(values);
                              }
                            }
                          }}
                          onMouseLeave={() => setHoveredValues({})}
                          style={{ cursor: 'pointer' }}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="time"
                            type="number"
                            domain={[0, fullDuration]}
                            tickFormatter={(value) => `${value.toFixed(1)}s`}
                          />
                          <YAxis 
                            domain={['dataMin - 50', 'dataMax + 50']}
                            tickFormatter={(value) => Math.round(value).toString()}
                          />

                          {/* Legend hidden - using custom display below */}

                          {/* Current time indicator */}
                          {currentTime > 0 && (
                            <ReferenceLine
                              x={currentTime}
                              stroke="#2563EB"
                              strokeWidth={2}
                              label={{ value: 'Current', position: 'top' }}
                            />
                          )}

                          {/* Phase bands (background) - from rep boundaries */}
                          {repBoundaries && repBoundaries.map((boundary, repIndex) => 
                            boundary.phases && boundary.phases.map((phase, phaseIndex) => (
                              <ReferenceArea
                                key={`phase-${repIndex}-${phaseIndex}`}
                                x1={phase.startTime}
                                x2={phase.endTime}
                                fill={getPhaseColor(phase.name)}
                                fillOpacity={0.1}
                              />
                            ))
                          )}

                          {/* Interactive Rep boundaries */}
                          {repBoundaries && repBoundaries.map((boundary, index) => (
                            <g key={`rep-${index}`}>
                              {/* Start boundary */}
                              <ReferenceLine
                                x={boundary.startTime}
                                stroke="#ff6b6b"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                label={{ 
                                  value: `Rep ${index + 1}`, 
                                  position: 'bottom',
                                  fill: '#ff6b6b',
                                  fontSize: 12
                                }}
                              />
                              {/* End boundary */}
                              <ReferenceLine
                                x={boundary.endTime}
                                stroke="#ff6b6b"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                              />
                              {/* Rep area highlight */}
                              <ReferenceArea
                                x1={boundary.startTime}
                                x2={boundary.endTime}
                                fill="#ff6b6b"
                                fillOpacity={0.1}
                              />
                            </g>
                          ))}

                          {/* Joint data lines */}
                          {selectedJoints.map((joint) => {
                            const jointName = joint.replace(/([A-Z])/g, '_$1').toLowerCase();
                            return (
                              <Line
                                key={jointName}
                                type="monotone"
                                dataKey={jointName}
                                stroke={getJointColor(jointName)}
                                strokeWidth={2}
                                dot={false}
                                name={joint}
                                activeDot={{ r: 4, stroke: getJointColor(jointName), strokeWidth: 2 }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Timeline Controls and Legend */}
                  <div className="space-y-3">
                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div>
                        {chartData.length} frames • {fullDuration.toFixed(1)}s timeline • {repBoundaries.length} reps
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>Current:</span>
                        <span className="font-medium">{currentTime.toFixed(1)}s</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {/* Joints Legend */}
                      <div className="flex flex-col space-y-2">
                        <span className="font-medium text-gray-700">Joints:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedJoints.map((joint) => {
                            const jointName = joint.replace(/([A-Z])/g, '_$1').toLowerCase();
                            const hoveredValue = hoveredValues[joint];
                            return (
                              <div key={joint} className="flex items-center space-x-2 p-1 bg-gray-50 rounded">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: getJointColor(jointName) }}
                                />
                                <span className="text-gray-600 text-sm">{joint}</span>
                                {hoveredValue !== undefined && (
                                  <span className="text-xs text-gray-500 ml-auto">
                                    {hoveredValue.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Phases Legend */}
                      {repBoundaries && repBoundaries.some(boundary => boundary.phases && boundary.phases.length > 0) && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700">Phases:</span>
                          {Array.from(new Set(repBoundaries.flatMap(boundary => 
                            boundary.phases?.map(phase => phase.name) || []
                          ))).map((phaseName) => (
                            <div key={phaseName} className="flex items-center space-x-1">
                              <div 
                                className="w-3 h-3 rounded" 
                                style={{ backgroundColor: getPhaseColor(phaseName) }}
                              />
                              <span className="text-gray-600">{phaseName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded">
                      💡 Click on the chart to seek to that time.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📊</div>
                  <div>No keypoint data available</div>
                  <div className="text-sm mt-2">ChartData length: {chartData.length}</div>
                  <div className="text-sm">KeypointsData length: {keypointsData?.length || 0}</div>
                </div>
              )}
            </div>
          ) : activeTab === 'configuration' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rep Analysis Configuration</h3>
              
              {/* Rep Count */}
              <div className="mb-6">

              </div>

              {/* Mark as validated */}
              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={repAnalysisData?.validatedByAdmin || false}
                    onChange={(e) => {
                      if (onRepAnalysisChange) {
                        onRepAnalysisChange({
                          ...repAnalysisData,
                          validatedByAdmin: e.target.checked
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Mark as validated</span>
                </div>
              </div>
              
                              {/* Gold Standard Rep Definition */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Gold Standard Rep Definition</h5>
                  
                  {/* Rep Start, End, and Bottom Times */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Rep Start time (seconds)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={repAnalysisData?.goldStandardRep?.startTime ?? 0}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && onRepAnalysisChange) {
                              onRepAnalysisChange({
                                ...repAnalysisData,
                                goldStandardRep: {
                                  ...repAnalysisData?.goldStandardRep,
                                  startTime: value
                                }
                              });
                            }
                          }}
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => {
                            if (onRepAnalysisChange) {
                              onRepAnalysisChange({
                                ...repAnalysisData,
                                goldStandardRep: {
                                  ...repAnalysisData?.goldStandardRep,
                                  startTime: currentTime
                                }
                              });
                            }
                          }}
                          className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                          title="Set start time to current video position"
                        >
                          📍
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Bottom position (seconds)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={repAnalysisData?.goldStandardRep?.bottomTime ?? 2.3}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && onRepAnalysisChange) {
                              onRepAnalysisChange({
                                ...repAnalysisData,
                                goldStandardRep: {
                                  ...repAnalysisData?.goldStandardRep,
                                  bottomTime: value
                                }
                              });
                            }
                          }}
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => {
                            if (onRepAnalysisChange) {
                              onRepAnalysisChange({
                                ...repAnalysisData,
                                goldStandardRep: {
                                  ...repAnalysisData?.goldStandardRep,
                                  bottomTime: currentTime
                                }
                              });
                            }
                          }}
                          className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                          title="Set bottom position to current video position"
                        >
                          📍
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600">Rep End time (seconds)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={repAnalysisData?.goldStandardRep?.endTime ?? 5}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && onRepAnalysisChange) {
                              onRepAnalysisChange({
                                ...repAnalysisData,
                                goldStandardRep: {
                                  ...repAnalysisData?.goldStandardRep,
                                  endTime: value
                                }
                              });
                            }
                          }}
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => {
                            if (onRepAnalysisChange) {
                              onRepAnalysisChange({
                                ...repAnalysisData,
                                goldStandardRep: {
                                  ...repAnalysisData?.goldStandardRep,
                                  endTime: currentTime
                                }
                              });
                            }
                          }}
                          className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                          title="Set end time to current video position"
                        >
                          📍
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phase Timing */}
                  <div className="space-y-3">
                    <h6 className="text-sm font-medium text-gray-600">Phase Timing</h6>
                    
                    {/* Eccentric Phase */}
                    <div className="pl-3 border-l-2 border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-2">Eccentric Phase</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">Start time (seconds)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={repAnalysisData?.goldStandardRep?.phases?.[0]?.startTime ?? 0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[0] = {
                                    ...updatedPhases[0],
                                    name: 'eccentric',
                                    startTime: value
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                            />
                            <button
                              onClick={() => {
                                if (onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[0] = {
                                    ...updatedPhases[0],
                                    name: 'eccentric',
                                    startTime: currentTime
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                              title="Set start time to current video position"
                            >
                              📍
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">End time (seconds)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={repAnalysisData?.goldStandardRep?.phases?.[0]?.endTime ?? 2.3}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[0] = {
                                    ...updatedPhases[0],
                                    name: 'eccentric',
                                    endTime: value
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                            />
                            <button
                              onClick={() => {
                                if (onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[0] = {
                                    ...updatedPhases[0],
                                    name: 'eccentric',
                                    endTime: currentTime
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                              title="Set end time to current video position"
                            >
                              📍
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Concentric Phase */}
                    <div className="pl-3 border-l-2 border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-2">Concentric Phase</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">Start time (seconds)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={repAnalysisData?.goldStandardRep?.phases?.[1]?.startTime ?? 2.3}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[1] = {
                                    ...updatedPhases[1],
                                    name: 'concentric',
                                    startTime: value
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                            />
                            <button
                              onClick={() => {
                                if (onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[1] = {
                                    ...updatedPhases[1],
                                    name: 'concentric',
                                    startTime: currentTime
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                              title="Set start time to current video position"
                            >
                              📍
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">End time (seconds)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={repAnalysisData?.goldStandardRep?.phases?.[1]?.endTime ?? 5}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[1] = {
                                    ...updatedPhases[1],
                                    name: 'concentric',
                                    endTime: value
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded"
                            />
                            <button
                              onClick={() => {
                                if (onRepAnalysisChange) {
                                  const currentPhases = repAnalysisData?.goldStandardRep?.phases || [];
                                  const updatedPhases = Array.isArray(currentPhases) ? [...currentPhases] : [];
                                  updatedPhases[1] = {
                                    ...updatedPhases[1],
                                    name: 'concentric',
                                    endTime: currentTime
                                  };
                                  onRepAnalysisChange({
                                    ...repAnalysisData,
                                    goldStandardRep: {
                                      ...repAnalysisData?.goldStandardRep,
                                      phases: updatedPhases
                                    }
                                  });
                                }
                              }}
                              className="px-3 py-2 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                              title="Set end time to current video position"
                            >
                              📍
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              
              {/* Generate Rules Button */}
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-900 mb-3">Generate Analysis Rules</h5>
                  <p className="text-sm text-blue-700 mb-4">
                    Generate joint angle rules and rep counting rules based on the gold standard rep data. 
                    This will create rules for real-time feedback during exercise performance.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // Call the generate-rules API
                        const response = await fetch('/api/analysis/generate-rules', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            exerciseId: exerciseId,
                            exerciseType: exerciseType || 'rep-based',
                            goldStandardRep: repAnalysisData?.goldStandardRep,
                            repBoundaries: repBoundaries
                          })
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Failed to generate rules');
                        }

                        const result = await response.json();
                        alert('✅ Rules generated and saved successfully!');
                        
                        // Reload the data to show the new rules
                        if (onDataReload) {
                          onDataReload();
                        }
                      } catch (error) {
                        console.error('Error generating rules:', error);
                        alert('❌ Error generating rules: ' + (error instanceof Error ? error.message : 'Unknown error'));
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    🎯 Generate Rules
                  </button>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
