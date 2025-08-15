import React, { useState } from 'react';
import { JointAngleRules, RepCountingRules } from '@/types/analysis';

interface RuleEditorProps {
  goldStandardRep?: any;
  jointAngleRules?: JointAngleRules;
  repCountingRules?: RepCountingRules;
  primaryJoints: string[];
  keypointData?: any[]; // ADD: For auto-generation
  onJointAngleRulesChange: (rules: JointAngleRules) => void;
  onRepCountingRulesChange: (rules: RepCountingRules) => void;
}

// Auto-generation utility functions
const generateRulesFromKeypoints = (
  keypointData: any[],
  goldStandardRep: any,
  primaryJoints: string[]
): { jointAngleRules: JointAngleRules; repCountingRules: RepCountingRules } => {
  if (!keypointData || keypointData.length === 0 || !goldStandardRep) {
    throw new Error('Missing keypoint data or gold standard rep');
  }

  // Calculate frame indices for gold standard rep
  const startFrame = Math.floor(goldStandardRep.startTime * 30); // Assuming 30fps
  const bottomFrame = Math.floor(goldStandardRep.bottomTime * 30);
  const endFrame = Math.floor(goldStandardRep.endTime * 30);

  // Ensure frames are within bounds
  const clampedStartFrame = Math.max(0, Math.min(startFrame, keypointData.length - 1));
  const clampedBottomFrame = Math.max(0, Math.min(bottomFrame, keypointData.length - 1));
  const clampedEndFrame = Math.max(0, Math.min(endFrame, keypointData.length - 1));

  // Initialize joint angle rules
  const jointAngleRules: JointAngleRules = {
    phaseThresholds: {
      eccentric: {},
      concentric: {}
    },
    repCompletion: {}
  };

  // Generate rep completion rules for each joint
  primaryJoints.forEach(joint => {
    const startAngle = extractJointAngle(keypointData[clampedStartFrame], joint);
    const bottomAngle = extractJointAngle(keypointData[clampedBottomFrame], joint);
    const endAngle = extractJointAngle(keypointData[clampedEndFrame], joint);

    if (startAngle !== null && bottomAngle !== null && endAngle !== null) {
      jointAngleRules.repCompletion[joint] = {
        startAngle: Math.round(startAngle),
        bottomAngle: Math.round(bottomAngle),
        endAngle: Math.round(endAngle)
      };
    }
  });

  // Generate phase thresholds based on the gold standard rep
  const eccentricFrames = keypointData.slice(clampedStartFrame, clampedBottomFrame + 1);
  const concentricFrames = keypointData.slice(clampedBottomFrame, clampedEndFrame + 1);

  primaryJoints.forEach(joint => {
    // Calculate eccentric phase thresholds
    const eccentricAngles = eccentricFrames
      .map(frame => extractJointAngle(frame, joint))
      .filter(angle => angle !== null) as number[];

    if (eccentricAngles.length > 0) {
      const minAngle = Math.min(...eccentricAngles);
      const maxAngle = Math.max(...eccentricAngles);
      const avgAngle = eccentricAngles.reduce((sum, angle) => sum + angle, 0) / eccentricAngles.length;

      jointAngleRules.phaseThresholds.eccentric[joint] = {
        minAngle: Math.round(minAngle),
        maxAngle: Math.round(maxAngle),
        targetAngle: Math.round(avgAngle),
        tolerancePercent: 15
      };
    }

    // Calculate concentric phase thresholds
    const concentricAngles = concentricFrames
      .map(frame => extractJointAngle(frame, joint))
      .filter(angle => angle !== null) as number[];

    if (concentricAngles.length > 0) {
      const minAngle = Math.min(...concentricAngles);
      const maxAngle = Math.max(...concentricAngles);
      const avgAngle = concentricAngles.reduce((sum, angle) => sum + angle, 0) / concentricAngles.length;

      jointAngleRules.phaseThresholds.concentric[joint] = {
        minAngle: Math.round(minAngle),
        maxAngle: Math.round(maxAngle),
        targetAngle: Math.round(avgAngle),
        tolerancePercent: 15
      };
    }
  });

  // Generate rep counting rules
  const repDuration = goldStandardRep.endTime - goldStandardRep.startTime;
  const repCountingRules: RepCountingRules = {
    countingMethod: 'hybrid',
    angleThresholds: {
      startThreshold: 170,
      completionThreshold: 90,
      returnThreshold: 160,
      hysteresis: 10
    },
    validation: {
      minimumRepDuration: repDuration * 0.7,
      maximumRepDuration: repDuration * 1.5,
      requiredRangeOfMotion: 60
    }
  };

  return { jointAngleRules, repCountingRules };
};

// Helper function to extract joint angles from keypoint data
const extractJointAngle = (pose: any, joint: string): number | null => {
  if (!pose || !pose.keypoints) return null;

  const indices = {
    leftShoulder: 5,
    rightShoulder: 6,
    leftHip: 11,
    rightHip: 12,
    leftKnee: 13,
    rightKnee: 14,
    leftAnkle: 15,
    rightAnkle: 16,
    leftElbow: 7,
    rightElbow: 8,
    leftWrist: 9,
    rightWrist: 10,
  };

  const jointIndex = indices[joint as keyof typeof indices];
  if (jointIndex === undefined) return null;

  const keypoint = pose.keypoints[jointIndex];
  if (!keypoint || keypoint.score < 0.4) return null;

  // Calculate angle based on joint type
  switch (joint) {
    case 'leftKnee':
    case 'rightKnee': {
      const hip = pose.keypoints[joint === 'leftKnee' ? indices.leftHip : indices.rightHip];
      const knee = keypoint;
      const ankle = pose.keypoints[joint === 'leftKnee' ? indices.leftAnkle : indices.rightAnkle];
      if (hip?.score > 0.4 && ankle?.score > 0.4) {
        return calculateAngle(hip, knee, ankle);
      }
      break;
    }
    case 'leftHip':
    case 'rightHip': {
      const shoulder = pose.keypoints[joint === 'leftHip' ? indices.leftShoulder : indices.rightShoulder];
      const hip = keypoint;
      const knee = pose.keypoints[joint === 'leftHip' ? indices.leftKnee : indices.rightKnee];
      if (shoulder?.score > 0.4 && knee?.score > 0.4) {
        return calculateAngle(shoulder, hip, knee);
      }
      break;
    }
    case 'leftElbow':
    case 'rightElbow': {
      const shoulder = pose.keypoints[joint === 'leftElbow' ? indices.leftShoulder : indices.rightShoulder];
      const elbow = keypoint;
      const wrist = pose.keypoints[joint === 'leftElbow' ? indices.leftWrist : indices.rightWrist];
      if (shoulder?.score > 0.4 && wrist?.score > 0.4) {
        return calculateAngle(shoulder, elbow, wrist);
      }
      break;
    }
    case 'leftShoulder':
    case 'rightShoulder': {
      const hip = pose.keypoints[joint === 'leftShoulder' ? indices.leftHip : indices.rightHip];
      const shoulder = keypoint;
      const elbow = pose.keypoints[joint === 'leftShoulder' ? indices.leftElbow : indices.rightElbow];
      if (hip?.score > 0.4 && elbow?.score > 0.4) {
        return calculateAngle(hip, shoulder, elbow);
      }
      break;
    }
  }

  return null;
};

// Helper function to calculate angle between three points
const calculateAngle = (p1: any, p2: any, p3: any): number => {
  const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let degrees = angle * 180 / Math.PI;
  if (degrees < 0) degrees += 360;
  return degrees;
};

export default function RuleEditor({
  goldStandardRep,
  jointAngleRules,
  repCountingRules,
  primaryJoints,
  keypointData,
  onJointAngleRulesChange,
  onRepCountingRulesChange
}: RuleEditorProps) {
  const [activeTab, setActiveTab] = useState<'joint_angles' | 'rep_counting'>('joint_angles');
  const [showPreview, setShowPreview] = useState(false);
  const [previewRules, setPreviewRules] = useState<{
    jointAngleRules: JointAngleRules;
    repCountingRules: RepCountingRules;
  } | null>(null);

  // Initialize default rules if not provided
  const defaultJointAngleRules: JointAngleRules = {
    phaseThresholds: {
      eccentric: {},
      concentric: {}
    },
    repCompletion: {
      // Initialize with first primary joint as default
      [primaryJoints[0] || 'leftKnee']: {
        startAngle: 170,
        bottomAngle: 90,
        endAngle: 165
      }
    }
  };

  const defaultRepCountingRules: RepCountingRules = {
    countingMethod: 'hybrid',
    angleThresholds: {
      startThreshold: 170,
      completionThreshold: 90,
      returnThreshold: 160,
      hysteresis: 10
    },
    validation: {
      minimumRepDuration: goldStandardRep ? (goldStandardRep.endTime - goldStandardRep.startTime) * 0.7 : 2.0,
      maximumRepDuration: goldStandardRep ? (goldStandardRep.endTime - goldStandardRep.startTime) * 1.5 : 6.0,
      requiredRangeOfMotion: 60
    }
  };

  // Use the provided rules or defaults, ensuring we always have valid objects
  const currentJointRules: JointAngleRules = jointAngleRules ? {
    phaseThresholds: jointAngleRules.phaseThresholds || { eccentric: {}, concentric: {} },
    repCompletion: jointAngleRules.repCompletion || {}
  } : defaultJointAngleRules;
  
  const currentCountingRules: RepCountingRules = repCountingRules ? {
    countingMethod: repCountingRules.countingMethod || 'hybrid',
    angleThresholds: repCountingRules.angleThresholds || {
      startThreshold: 170,
      completionThreshold: 90,
      returnThreshold: 160,
      hysteresis: 10
    },
    validation: repCountingRules.validation || {
      minimumRepDuration: 2.0,
      maximumRepDuration: 6.0,
      requiredRangeOfMotion: 60
    }
  } : defaultRepCountingRules;

  // Debug logging
  console.log('RuleEditor render - jointAngleRules prop:', jointAngleRules);
  console.log('RuleEditor render - repCountingRules prop:', repCountingRules);
  console.log('RuleEditor render - currentJointRules:', currentJointRules);
  console.log('RuleEditor render - currentCountingRules:', currentCountingRules);

  const updateJointAngleRule = (phase: string, joint: string, field: string, value: number) => {
    const updated = { ...currentJointRules };
    if (!updated.phaseThresholds[phase]) {
      updated.phaseThresholds[phase] = {};
    }
    if (!updated.phaseThresholds[phase][joint]) {
      updated.phaseThresholds[phase][joint] = {
        minAngle: 0,
        maxAngle: 180,
        targetAngle: 90,
        tolerancePercent: 15
      };
    }
    (updated.phaseThresholds[phase][joint] as any)[field] = value;
    onJointAngleRulesChange(updated);
  };

  const updateRepCountingRule = (category: string, field: string, value: any) => {
    const updated = { ...currentCountingRules };
    if (category === 'method') {
      updated.countingMethod = value;
    } else {
      (updated as any)[category][field] = value;
    }
    onRepCountingRulesChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Debug Info - Remove this later */}
      {keypointData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Debug: Keypoint Data Available</h4>
          <p className="text-xs text-blue-700">
            Keypoint data received: {keypointData.length} frames
          </p>
          <button
            onClick={() => {
              console.log('Keypoint data:', keypointData);
              alert(`Keypoint data available: ${keypointData.length} frames`);
            }}
            className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Log Keypoint Data
          </button>
        </div>
      )}

      {/* Auto-Generate Button */}
      {keypointData && keypointData.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Auto-Generate Rules</h4>
          <p className="text-xs text-green-700 mb-3">
            Generate rules from keypoint data using gold standard rep timing
          </p>
          <button
            onClick={() => {
              try {
                if (!goldStandardRep) {
                  alert('❌ Gold standard rep data is required for auto-generation. Please set up a gold standard rep first.');
                  return;
                }

                console.log('Auto-generating rules...');
                console.log('Gold standard rep:', goldStandardRep);
                console.log('Keypoint data frames:', keypointData.length);
                console.log('Primary joints:', primaryJoints);

                const generatedRules = generateRulesFromKeypoints(
                  keypointData,
                  goldStandardRep,
                  primaryJoints
                );

                // Show preview instead of immediately applying
                setPreviewRules(generatedRules);
                setShowPreview(true);

                console.log('Generated rules preview:', generatedRules);
              } catch (error) {
                console.error('Error generating rules:', error);
                alert(`❌ Error generating rules: ${(error as Error).message}`);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            🤖 Auto-Generate Rules
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('joint_angles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'joint_angles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Joint Angle Rules
          </button>
          <button
            onClick={() => setActiveTab('rep_counting')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rep_counting'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rep Counting Rules
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'joint_angles' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Joint Angle Thresholds</h3>
            
            {/* Phase-based Rules */}
            {goldStandardRep?.phases?.map((phase: any, phaseIndex: number) => (
              <div key={phase.name} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h4 className="text-md font-medium text-gray-800 mb-3 capitalize">
                  {phase.name} Phase ({phase.startTime}s - {phase.endTime}s)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {primaryJoints.map(joint => {
                    const rules = currentJointRules.phaseThresholds[phase.name]?.[joint] || {
                      minAngle: 0, maxAngle: 180, targetAngle: 90, tolerancePercent: 15
                    };
                    
                    return (
                      <div key={joint} className="space-y-3 p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-700">{joint}</h5>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Target Angle (°)</label>
                            <input
                              type="number"
                              min="0"
                              max="180"
                              value={rules.targetAngle}
                              onChange={(e) => updateJointAngleRule(phase.name, joint, 'targetAngle', Number(e.target.value))}
                              className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Tolerance (%)</label>
                            <input
                              type="number"
                              min="5"
                              max="50"
                              value={rules.tolerancePercent}
                              onChange={(e) => updateJointAngleRule(phase.name, joint, 'tolerancePercent', Number(e.target.value))}
                              className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                        
                        {/* Visual Range Display */}
                        <div className="text-xs text-gray-500">
                          Range: {Math.round(rules.targetAngle - (rules.targetAngle * rules.tolerancePercent / 100))}° - {Math.round(rules.targetAngle + (rules.targetAngle * rules.tolerancePercent / 100))}°
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Rep Completion Angles */}
            <div className="p-4 border border-gray-200 rounded-lg bg-blue-50">
              <h4 className="text-md font-medium text-gray-800 mb-3">Rep Completion Angles (Multi-Joint)</h4>
              <p className="text-sm text-gray-600 mb-4">
                Configure rep completion angles for all selected joints. Each joint needs start, bottom, and end angles.
              </p>
              
              {primaryJoints.map(joint => {
                const jointData = currentJointRules.repCompletion[joint] || {
                  startAngle: 170,
                  bottomAngle: 90,
                  endAngle: 165
                };
                
                return (
                  <div key={joint} className="mb-4 p-3 bg-white rounded border">
                    <h5 className="font-medium text-gray-800 mb-3 capitalize">{joint}</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Start Angle (°)</label>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          value={jointData.startAngle}
                          onChange={(e) => onJointAngleRulesChange({
                            ...currentJointRules,
                            repCompletion: {
                              ...currentJointRules.repCompletion,
                              [joint]: {
                                ...jointData,
                                startAngle: Number(e.target.value)
                              }
                            }
                          })}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Bottom Angle (°)</label>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          value={jointData.bottomAngle}
                          onChange={(e) => onJointAngleRulesChange({
                            ...currentJointRules,
                            repCompletion: {
                              ...currentJointRules.repCompletion,
                              [joint]: {
                                ...jointData,
                                bottomAngle: Number(e.target.value)
                              }
                            }
                          })}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">End Angle (°)</label>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          value={jointData.endAngle}
                          onChange={(e) => onJointAngleRulesChange({
                            ...currentJointRules,
                            repCompletion: {
                              ...currentJointRules.repCompletion,
                              [joint]: {
                                ...jointData,
                                endAngle: Number(e.target.value)
                              }
                            }
                          })}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Rep cycle: {jointData.startAngle}° → {jointData.bottomAngle}° → {jointData.endAngle}°
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rep_counting' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rep Counting Configuration</h3>
            
            {/* Counting Method */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h4 className="text-md font-medium text-gray-800 mb-3">Counting Method</h4>
              <select
                value={currentCountingRules.countingMethod}
                onChange={(e) => updateRepCountingRule('method', '', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              >
                <option value="phase_sequence">Phase Sequence (Most Accurate)</option>
                <option value="angle_threshold">Angle Threshold (Fast)</option>
                <option value="hybrid">Hybrid (Recommended)</option>
              </select>
            </div>

            {/* Angle Thresholds */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h4 className="text-md font-medium text-gray-800 mb-3">Angle Thresholds</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Threshold (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={currentCountingRules.angleThresholds.startThreshold}
                    onChange={(e) => updateRepCountingRule('angleThresholds', 'startThreshold', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Completion Threshold (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={currentCountingRules.angleThresholds.completionThreshold}
                    onChange={(e) => updateRepCountingRule('angleThresholds', 'completionThreshold', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Return Threshold (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={currentCountingRules.angleThresholds.returnThreshold}
                    onChange={(e) => updateRepCountingRule('angleThresholds', 'returnThreshold', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hysteresis (°)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={currentCountingRules.angleThresholds.hysteresis}
                    onChange={(e) => updateRepCountingRule('angleThresholds', 'hysteresis', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Validation Rules */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-green-50">
              <h4 className="text-md font-medium text-gray-800 mb-3">Validation Rules</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Min Duration (s)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={currentCountingRules.validation.minimumRepDuration}
                    onChange={(e) => updateRepCountingRule('validation', 'minimumRepDuration', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max Duration (s)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.1"
                    value={currentCountingRules.validation.maximumRepDuration}
                    onChange={(e) => updateRepCountingRule('validation', 'maximumRepDuration', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Min Range of Motion (°)</label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={currentCountingRules.validation.requiredRangeOfMotion}
                    onChange={(e) => updateRepCountingRule('validation', 'requiredRangeOfMotion', Number(e.target.value))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Rule Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Rule Summary</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• Rep starts when {currentCountingRules.angleThresholds.startThreshold}° is reached</div>
                <div>• Rep completes when {currentCountingRules.angleThresholds.completionThreshold}° is reached</div>
                <div>• Must return to {currentCountingRules.angleThresholds.returnThreshold}° for next rep</div>
                <div>• Duration must be {currentCountingRules.validation.minimumRepDuration}s - {currentCountingRules.validation.maximumRepDuration}s</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Preview Generated Rules</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Joint Angle Rules Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Joint Angle Rules</h3>
                  
                  {/* Rep Completion Angles */}
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Rep Completion Angles</h4>
                    <div className="grid gap-3">
                      {Object.entries(previewRules.jointAngleRules.repCompletion).map(([joint, angles]) => (
                        <div key={joint} className="bg-gray-50 p-3 rounded border">
                          <h5 className="font-medium text-gray-800 capitalize mb-2">{joint}</h5>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Start:</span>
                              <span className="ml-2 font-medium">{(angles as any).startAngle}°</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Bottom:</span>
                              <span className="ml-2 font-medium">{(angles as any).bottomAngle}°</span>
                            </div>
                            <div>
                              <span className="text-gray-600">End:</span>
                              <span className="ml-2 font-medium">{(angles as any).endAngle}°</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase Thresholds */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">Phase Thresholds</h4>
                    <div className="grid gap-4">
                      {['eccentric', 'concentric'].map(phase => (
                        <div key={phase} className="bg-gray-50 p-3 rounded border">
                          <h5 className="font-medium text-gray-800 capitalize mb-2">{phase} Phase</h5>
                          <div className="grid gap-2">
                            {Object.entries(previewRules.jointAngleRules.phaseThresholds[phase as keyof typeof previewRules.jointAngleRules.phaseThresholds] || {}).map(([joint, thresholds]) => (
                              <div key={joint} className="bg-white p-2 rounded border">
                                <span className="font-medium capitalize">{joint}:</span>
                                <span className="ml-2 text-sm text-gray-600">
                                  Target: {(thresholds as any).targetAngle}° | 
                                  Range: {(thresholds as any).minAngle}° - {(thresholds as any).maxAngle}° | 
                                  Tolerance: {(thresholds as any).tolerancePercent}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rep Counting Rules Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Rep Counting Rules</h3>
                  <div className="bg-gray-50 p-4 rounded border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Angle Thresholds</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">Start:</span> <span className="font-medium">{previewRules.repCountingRules.angleThresholds.startThreshold}°</span></div>
                          <div><span className="text-gray-600">Completion:</span> <span className="font-medium">{previewRules.repCountingRules.angleThresholds.completionThreshold}°</span></div>
                          <div><span className="text-gray-600">Return:</span> <span className="font-medium">{previewRules.repCountingRules.angleThresholds.returnThreshold}°</span></div>
                          <div><span className="text-gray-600">Hysteresis:</span> <span className="font-medium">{previewRules.repCountingRules.angleThresholds.hysteresis}°</span></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Validation</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">Min Duration:</span> <span className="font-medium">{previewRules.repCountingRules.validation.minimumRepDuration.toFixed(2)}s</span></div>
                          <div><span className="text-gray-600">Max Duration:</span> <span className="font-medium">{previewRules.repCountingRules.validation.maximumRepDuration.toFixed(2)}s</span></div>
                          <div><span className="text-gray-600">ROM Required:</span> <span className="font-medium">{previewRules.repCountingRules.validation.requiredRangeOfMotion}°</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Apply the generated rules
                    console.log('Applying rules:', previewRules);
                    onJointAngleRulesChange(previewRules.jointAngleRules);
                    onRepCountingRulesChange(previewRules.repCountingRules);
                    setShowPreview(false);
                    alert('✅ Rules applied successfully! Check the UI for updates.');
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
                >
                  Apply Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
