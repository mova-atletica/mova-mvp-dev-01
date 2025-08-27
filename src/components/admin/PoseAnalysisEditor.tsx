import React, { useState, useEffect, useRef } from 'react';
import { EnhancedPoseAnalysis, TargetPose, PoseFeedbackMessages } from '@/types/analysis';
import VideoPlayer, { VideoPlayerHandle } from '../VideoPlayer';

interface PoseAnalysisEditorProps {
  data: EnhancedPoseAnalysis | null;
  onSave: (data: EnhancedPoseAnalysis) => void;
  exerciseId: string;
  videoUrl?: string;
  selectedJoints: string[];
  disabled?: boolean;
}

export default function PoseAnalysisEditor({ 
  data, 
  onSave, 
  exerciseId,
  videoUrl,
  selectedJoints,
  disabled = false 
}: PoseAnalysisEditorProps) {
  const [poseData, setPoseData] = useState<EnhancedPoseAnalysis>(data || {
    targetPoses: [],
    angleRanges: {},
    toleranceMultipliers: {},
    feedbackMessages: {
      achievement: [],
      holdProgress: [],
      formCorrection: []
    },
    adminNotes: '',
    validatedByAdmin: false
  });
  
  const [keypointsData, setKeypointsData] = useState<any>(null);
  const [isLoadingKeypoints, setIsLoadingKeypoints] = useState(false);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const prevSelectedJointsRef = useRef<string[]>([]);

  // Load keypoints data when component mounts
  useEffect(() => {
    if (exerciseId) {
      loadKeypointsData();
    }
  }, [exerciseId]);

  // Update pose data when data prop changes
  useEffect(() => {
    if (data) {
      setPoseData(data);
    }
  }, [data]);

  // Clean up old joint data when selectedJoints changes or when component initializes
  useEffect(() => {
    if (poseData && selectedJoints.length > 0) {
      const prevJoints = prevSelectedJointsRef.current;
      
      // Run cleanup if joints were removed OR if this is the first load (prevJoints is empty)
      if (prevJoints.length === 0 || prevJoints.length > selectedJoints.length) {
        // Get all joints that currently have data
        const allJointsWithData = new Set([
          ...Object.keys(poseData.angleRanges || {}),
          ...Object.keys(poseData.toleranceMultipliers || {}),
          ...poseData.targetPoses.flatMap(pose => Object.keys(pose.targetAngles || {}))
        ]);

        // Find joints that are no longer selected
        const jointsToRemove = Array.from(allJointsWithData).filter(
          joint => !selectedJoints.includes(joint)
        );

        if (jointsToRemove.length > 0) {
          console.log('🧹 Cleaning up data for removed joints:', jointsToRemove);
          
          // Clean up angleRanges
          const cleanedAngleRanges = { ...poseData.angleRanges };
          jointsToRemove.forEach(joint => {
            delete cleanedAngleRanges[joint];
          });

          // Clean up toleranceMultipliers
          const cleanedToleranceMultipliers = { ...poseData.toleranceMultipliers };
          jointsToRemove.forEach(joint => {
            delete cleanedToleranceMultipliers[joint];
          });

          // Clean up targetPoses targetAngles
          const cleanedTargetPoses = poseData.targetPoses.map(pose => {
            const cleanedTargetAngles = { ...pose.targetAngles };
            jointsToRemove.forEach(joint => {
              delete cleanedTargetAngles[joint];
            });
            return { ...pose, targetAngles: cleanedTargetAngles };
          });

          // Update the pose data with cleaned data
          setPoseData(prev => ({
            ...prev,
            angleRanges: cleanedAngleRanges,
            toleranceMultipliers: cleanedToleranceMultipliers,
            targetPoses: cleanedTargetPoses
          }));
        }
      }
      
      // Update the ref with current selectedJoints
      prevSelectedJointsRef.current = [...selectedJoints];
    }
  }, [selectedJoints, poseData]); // Run when selectedJoints or poseData changes

  const loadKeypointsData = async () => {
    if (!exerciseId) return;
    
    setIsLoadingKeypoints(true);
    try {
      // First get the exercise to find the keypoints URL
      const exerciseResponse = await fetch(`/api/exercises/${exerciseId}`);
      if (exerciseResponse.ok) {
        const exerciseData = await exerciseResponse.json();
        const exercise = exerciseData.exercise;
        
        if (exercise.referenceKeypointsUrl) {
          // Use the proxy endpoint to fetch keypoints
          const keypointsResponse = await fetch('/api/storage/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl })
          });
          
          if (keypointsResponse.ok) {
            const keypoints = await keypointsResponse.json();
            setKeypointsData(keypoints);
          }
        }
      }
    } catch (error) {
      console.error('Error loading keypoints data:', error);
    } finally {
      setIsLoadingKeypoints(false);
    }
  };

  const handleSave = () => {
    // Clean up any old joint data before saving
    const cleanedPoseData = { ...poseData };
    
    // Get all joints that currently have data
    const allJointsWithData = new Set([
      ...Object.keys(cleanedPoseData.angleRanges || {}),
      ...Object.keys(cleanedPoseData.toleranceMultipliers || {}),
      ...cleanedPoseData.targetPoses.flatMap(pose => Object.keys(pose.targetAngles || {}))
    ]);

    // Find joints that are no longer selected
    const jointsToRemove = Array.from(allJointsWithData).filter(
      joint => !selectedJoints.includes(joint)
    );

    if (jointsToRemove.length > 0) {
      console.log('🧹 Final cleanup before saving - removing joints:', jointsToRemove);
      
      // Clean up angleRanges
      jointsToRemove.forEach(joint => {
        delete cleanedPoseData.angleRanges[joint];
      });

      // Clean up toleranceMultipliers
      if (cleanedPoseData.toleranceMultipliers) {
        jointsToRemove.forEach(joint => {
          delete cleanedPoseData.toleranceMultipliers![joint];
        });
      }

      // Clean up targetPoses targetAngles
      cleanedPoseData.targetPoses = cleanedPoseData.targetPoses.map(pose => {
        const cleanedTargetAngles = { ...pose.targetAngles };
        jointsToRemove.forEach(joint => {
          delete cleanedTargetAngles[joint];
        });
        return { ...pose, targetAngles: cleanedTargetAngles };
      });
    }

    // Update local state with cleaned data
    setPoseData(cleanedPoseData);
    
    // Save the cleaned data
    onSave(cleanedPoseData);
  };

  const updateTargetPoses = (targetPoses: TargetPose[]) => {
    setPoseData(prev => ({
      ...prev,
      targetPoses
    }));
  };

  const updateAngleRanges = (angleRanges: { [joint: string]: { min: number; max: number } }) => {
    setPoseData(prev => ({
      ...prev,
      angleRanges
    }));
  };

  const updateFeedbackMessages = (feedbackMessages: PoseFeedbackMessages) => {
    setPoseData(prev => ({
      ...prev,
      feedbackMessages
    }));
  };

  const updateAdminNotes = (adminNotes: string) => {
    setPoseData(prev => ({
      ...prev,
      adminNotes
    }));
  };

  const toggleValidation = () => {
    setPoseData(prev => ({
      ...prev,
      validatedByAdmin: !prev.validatedByAdmin
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pose Analysis Editor</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save Changes
          </button>
          <button
            onClick={toggleValidation}
            disabled={disabled}
            className={`px-4 py-2 rounded ${
              poseData.validatedByAdmin 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-700'
            } disabled:opacity-50`}
          >
            {poseData.validatedByAdmin ? 'Validated' : 'Mark Validated'}
          </button>
        </div>
      </div>

      {/* Video Player Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">Video Player</h4>
        <p className="text-sm text-gray-600 mb-4">
          Reference video for this exercise. Use this to help determine target angles for poses.
        </p>
        
        {videoUrl ? (
          <div className="space-y-4">
            <VideoPlayer
              ref={videoPlayerRef}
              videoUrl={`/api/storage/video-proxy?fileName=${encodeURIComponent(videoUrl)}`}
              onTimeUpdate={(time) => {
                // Video time updates handled by VideoPlayer component
              }}
              keypointData={keypointsData}
              className="w-full"
            />
            
            {/* Pose capture controls */}
            <div className="flex gap-2 items-center">
              {isLoadingKeypoints && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading pose data...
                </div>
              )}
              
              {!keypointsData && !isLoadingKeypoints && (
                <div className="text-sm text-gray-500">
                  No pose data available for this exercise
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">🎥</div>
            <div>No reference video available</div>
          </div>
        )}
      </div>

      {/* Target Poses */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Target Poses ({poseData.targetPoses.length})</h4>
        <p className="text-sm text-gray-600 mb-4">
          Define the target poses for this exercise with their angle requirements and hold durations.
        </p>
        
        <div className="space-y-4">
          {poseData.targetPoses.map((pose, index) => (
            <div key={`pose-${index}`} className="border border-gray-200 rounded p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pose Name
                  </label>
                  <input
                    type="text"
                    value={pose.name}
                    onChange={(e) => {
                      const newPoses = [...poseData.targetPoses];
                      newPoses[index] = { ...pose, name: e.target.value };
                      updateTargetPoses(newPoses);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Plank, Bridge, Warrior"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hold Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={pose.holdDuration ?? 30}
                    onChange={(e) => {
                      const newPoses = [...poseData.targetPoses];
                      newPoses[index] = { ...pose, holdDuration: parseFloat(e.target.value) || 0 };
                      updateTargetPoses(newPoses);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="30"
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Angles
                </label>
                <div className="space-y-2">
                  {selectedJoints.length > 0 ? (
                    selectedJoints.map((joint) => {
                      const currentAngle = pose.targetAngles[joint] ?? 0;
                      return (
                        <div key={joint} className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 capitalize w-24">
                            {joint.replace(/([A-Z])/g, ' $1').trim()}:
                          </label>
                          <input
                            type="number"
                            value={currentAngle}
                            onChange={(e) => {
                              const newPoses = [...poseData.targetPoses];
                              const newTargetAngles = { ...pose.targetAngles };
                              const angleValue = parseFloat(e.target.value) || 0;
                              
                              if (angleValue > 0) {
                                newTargetAngles[joint] = angleValue;
                              } else {
                                delete newTargetAngles[joint];
                              }
                              
                              newPoses[index] = { ...pose, targetAngles: newTargetAngles };
                              updateTargetPoses(newPoses);
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                            min="0"
                            max="180"
                          />
                          <span className="text-xs text-gray-500">°</span>
                          {currentAngle > 0 && (
                            <button
                              onClick={() => {
                                const newPoses = [...poseData.targetPoses];
                                const newTargetAngles = { ...pose.targetAngles };
                                delete newTargetAngles[joint];
                                newPoses[index] = { ...pose, targetAngles: newTargetAngles };
                                updateTargetPoses(newPoses);
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-500 py-2">
                      <p className="text-xs">No joints of interest selected.</p>
                      <p className="text-xs">Select joints in the "Joints of Interest" section above.</p>
                    </div>
                  )}
                </div>
                
                {/* JSON Preview (for debugging) */}
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Show JSON
                  </summary>
                  <textarea
                    value={JSON.stringify(pose.targetAngles, null, 2)}
                    onChange={(e) => {
                      try {
                        const targetAngles = JSON.parse(e.target.value);
                        const newPoses = [...poseData.targetPoses];
                        newPoses[index] = { ...pose, targetAngles };
                        updateTargetPoses(newPoses);
                      } catch (error) {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono"
                    rows={2}
                    placeholder='{"leftElbow": 90, "rightElbow": 90}'
                  />
                </details>
              </div>
              
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tolerance (degrees)
                </label>
                <input
                  type="number"
                  value={pose.tolerance ?? 10}
                  onChange={(e) => {
                    const newPoses = [...poseData.targetPoses];
                    newPoses[index] = { ...pose, tolerance: parseFloat(e.target.value) || 0 };
                    updateTargetPoses(newPoses);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10"
                />
              </div>
              
              <button
                onClick={() => {
                  const newPoses = poseData.targetPoses.filter((_, i) => i !== index);
                  updateTargetPoses(newPoses);
                }}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Remove Pose
              </button>
            </div>
          ))}
          
          <button
            onClick={() => {
              const newPose: TargetPose = {
                name: '',
                targetAngles: {},
                holdDuration: 30,
                tolerance: 10
              };
              const updatedPoses = [...poseData.targetPoses, newPose];
              updateTargetPoses(updatedPoses);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Target Pose ({poseData.targetPoses.length})
          </button>
        </div>
      </div>

      {/* Angle Ranges */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Angle Ranges</h4>
        <p className="text-sm text-gray-600 mb-4">
          Define acceptable angle ranges for each joint during the exercise.
        </p>
        
        <div className="space-y-4">
          {selectedJoints.length > 0 ? (
            selectedJoints.map((joint) => {
              const jointRange = poseData.angleRanges[joint] ?? { min: 0, max: 180 };
              return (
                <div key={joint} className="border border-gray-200 rounded p-3">
                  <div className="mb-2">
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {joint.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Angle (°)</label>
                      <input
                        type="number"
                        value={jointRange.min ?? 0}
                        onChange={(e) => {
                          const newAngleRanges = { ...poseData.angleRanges };
                          newAngleRanges[joint] = {
                            ...newAngleRanges[joint],
                            min: parseFloat(e.target.value) || 0
                          };
                          updateAngleRanges(newAngleRanges);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                        min="0"
                        max="180"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Angle (°)</label>
                      <input
                        type="number"
                        value={jointRange.max ?? 180}
                        onChange={(e) => {
                          const newAngleRanges = { ...poseData.angleRanges };
                          newAngleRanges[joint] = {
                            ...newAngleRanges[joint],
                            max: parseFloat(e.target.value) || 180
                          };
                          updateAngleRanges(newAngleRanges);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="180"
                        min="0"
                        max="180"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Range: {(jointRange.max ?? 180) - (jointRange.min ?? 0)}° 
                    {(jointRange.max ?? 180) < (jointRange.min ?? 0) && (
                      <span className="text-red-600 ml-2">⚠️ Max should be greater than Min</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p>No joints of interest selected.</p>
              <p className="text-sm">Select joints in the "Joints of Interest" section above.</p>
            </div>
          )}
          
          <div className="pt-2">
          </div>
        </div>
        
        {/* JSON Preview (for debugging) */}
        <details className="mt-4">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            Show JSON Preview
          </summary>
          <textarea
            value={JSON.stringify(poseData.angleRanges, null, 2)}
            onChange={(e) => {
              try {
                const angleRanges = JSON.parse(e.target.value);
                updateAngleRanges(angleRanges);
              } catch (error) {
                // Invalid JSON, ignore
              }
            }}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono"
            rows={4}
            placeholder='{"leftKnee": {"min": 90, "max": 180}, "rightKnee": {"min": 90, "max": 180}}'
          />
        </details>
      </div>

      {/* Tolerance Multipliers */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Tolerance Multipliers</h4>
        <p className="text-sm text-gray-600 mb-4">
          Set tolerance multipliers for each joint. These values multiply the base tolerance for more precise control.
        </p>
        
        <div className="space-y-3">
          {selectedJoints.length > 0 ? (
            selectedJoints.map((joint) => {
              const multiplier = poseData.toleranceMultipliers?.[joint] ?? 1.0;
              return (
                <div key={joint} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {joint.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={multiplier}
                      onChange={(e) => {
                        const newMultipliers = { ...poseData.toleranceMultipliers };
                        const value = parseFloat(e.target.value) || 1.0;
                        if (value > 0) {
                          newMultipliers[joint] = value;
                        } else {
                          delete newMultipliers[joint];
                        }
                        setPoseData(prev => ({
                          ...prev,
                          toleranceMultipliers: newMultipliers
                        }));
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1.0"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                    />
                    <span className="text-xs text-gray-500">×</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p>No joints of interest selected.</p>
              <p className="text-sm">Select joints in the "Joints of Interest" section above.</p>
            </div>
          )}
        </div>
        
        {/* JSON Preview (for debugging) */}
        <details className="mt-4">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            Show JSON Preview
          </summary>
          <textarea
            value={JSON.stringify(poseData.toleranceMultipliers || {}, null, 2)}
            onChange={(e) => {
              try {
                const toleranceMultipliers = JSON.parse(e.target.value);
                setPoseData(prev => ({
                  ...prev,
                  toleranceMultipliers
                }));
              } catch (error) {
                // Invalid JSON, ignore
              }
            }}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono"
            rows={3}
            placeholder='{"leftKnee": 1.2, "rightKnee": 1.0}'
          />
        </details>
      </div>

      {/* Feedback Messages */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Feedback Messages</h4>
        <p className="text-sm text-gray-600 mb-4">
          Customize feedback messages for different scenarios.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Achievement Messages
            </label>
            <div className="space-y-2">
              {(poseData.feedbackMessages?.achievement || []).map((message, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      const newMessages = [...(poseData.feedbackMessages?.achievement || [])];
                      newMessages[index] = e.target.value;
                      const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                      updateFeedbackMessages({ ...currentMessages, achievement: newMessages });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Great form!"
                  />
                  <button
                    onClick={() => {
                      const newMessages = (poseData.feedbackMessages?.achievement || []).filter((_, i) => i !== index);
                      const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                      updateFeedbackMessages({ ...currentMessages, achievement: newMessages });
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newMessages = [...(poseData.feedbackMessages?.achievement || []), ''];
                  const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                  updateFeedbackMessages({ ...currentMessages, achievement: newMessages });
                }}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Message
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hold Progress Messages
            </label>
            <div className="space-y-2">
              {(poseData.feedbackMessages?.holdProgress || []).map((message, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      const newMessages = [...(poseData.feedbackMessages?.holdProgress || [])];
                      newMessages[index] = e.target.value;
                      const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                      updateFeedbackMessages({ ...currentMessages, holdProgress: newMessages });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Keep holding!"
                  />
                  <button
                    onClick={() => {
                      const newMessages = (poseData.feedbackMessages?.holdProgress || []).filter((_, i) => i !== index);
                      const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                      updateFeedbackMessages({ ...currentMessages, holdProgress: newMessages });
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newMessages = [...(poseData.feedbackMessages?.holdProgress || []), ''];
                  const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                  updateFeedbackMessages({ ...currentMessages, holdProgress: newMessages });
                }}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Message
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Correction Messages
            </label>
            <div className="space-y-2">
              {(poseData.feedbackMessages?.formCorrection || []).map((message, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      const newMessages = [...(poseData.feedbackMessages?.formCorrection || [])];
                      newMessages[index] = e.target.value;
                      const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                      updateFeedbackMessages({ ...currentMessages, formCorrection: newMessages });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Adjust your knees"
                  />
                  <button
                    onClick={() => {
                      const newMessages = (poseData.feedbackMessages?.formCorrection || []).filter((_, i) => i !== index);
                      const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                      updateFeedbackMessages({ ...currentMessages, formCorrection: newMessages });
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newMessages = [...(poseData.feedbackMessages?.formCorrection || []), ''];
                  const currentMessages = poseData.feedbackMessages || { achievement: [], holdProgress: [], formCorrection: [] };
                  updateFeedbackMessages({ ...currentMessages, formCorrection: newMessages });
                }}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Admin Notes</h4>
        <textarea
          value={poseData.adminNotes || ''}
          onChange={(e) => updateAdminNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Add any admin notes or observations about this pose analysis..."
        />
      </div>
    </div>
  );
}
