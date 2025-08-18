import React, { useState, useEffect } from 'react';
import { JointAngleRules } from '@/types/analysis';

interface RepThresholdEditorProps {
  jointAngleRules?: JointAngleRules;
  onThresholdsChange: (rules: JointAngleRules) => void;
  selectedJoints: string[];
  disabled?: boolean;
}

export default function RepThresholdEditor({ 
  jointAngleRules, 
  onThresholdsChange, 
  selectedJoints,
  disabled = false 
}: RepThresholdEditorProps) {
  const [localRules, setLocalRules] = useState<JointAngleRules>({
    phaseThresholds: { eccentric: {}, concentric: {} },
    repCompletion: {}
  });

  // Initialize local rules when jointAngleRules prop changes
  useEffect(() => {
    if (jointAngleRules) {
      setLocalRules({
        phaseThresholds: jointAngleRules.phaseThresholds || { eccentric: {}, concentric: {} },
        repCompletion: jointAngleRules.repCompletion || {}
      });
    }
  }, [jointAngleRules]);

  // Update threshold for a specific joint
  const updateThreshold = (joint: string, field: 'startThreshold' | 'completionThreshold' | 'returnThreshold' | 'hysteresis', value: number) => {
    const updatedRules = {
      ...localRules,
      repCompletion: {
        ...localRules.repCompletion,
        [joint]: {
          ...localRules.repCompletion[joint],
          [field]: value
        }
      }
    };
    
    setLocalRules(updatedRules);
    onThresholdsChange(updatedRules);
  };

  // Get current threshold value for a joint and field
  const getThresholdValue = (joint: string, field: 'startThreshold' | 'completionThreshold' | 'returnThreshold' | 'hysteresis'): number => {
    return localRules.repCompletion[joint]?.[field] || 0;
  };

  // Validate threshold value
  const validateThreshold = (value: number): boolean => {
    return !isNaN(value) && value >= 0 && value <= 180;
  };

  // Handle input change with validation
  const handleInputChange = (joint: string, field: 'startThreshold' | 'completionThreshold' | 'returnThreshold' | 'hysteresis', value: string) => {
    const numValue = parseFloat(value);
    if (validateThreshold(numValue)) {
      updateThreshold(joint, field, numValue);
    }
  };

  // Filter joints to only show selected ones that have data
  const availableJoints = selectedJoints.filter(joint => 
    localRules.repCompletion[joint] || 
    Object.keys(localRules.repCompletion).includes(joint)
  );

  if (availableJoints.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-800 mb-2">Rep Completion Thresholds</h4>
        <p className="text-sm text-gray-600">
          No rep completion thresholds found. Generate rules first to see threshold data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-md font-medium text-gray-800 mb-3">Rep Completion Thresholds</h4>
      <p className="text-sm text-gray-600 mb-4">
        Configure rep completion threshold angles for each joint. These values determine when a rep is counted.
      </p>
      
      <div className="space-y-4">
        {availableJoints.map(joint => (
          <div key={joint} className="bg-white rounded-lg border border-gray-200 p-4">
            <h5 className="font-medium text-gray-800 mb-3 capitalize">
              {joint.replace(/([A-Z])/g, ' $1').trim()}
            </h5>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Threshold (°)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={getThresholdValue(joint, 'startThreshold')}
                  onChange={(e) => handleInputChange(joint, 'startThreshold', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Completion Threshold (°)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={getThresholdValue(joint, 'completionThreshold')}
                  onChange={(e) => handleInputChange(joint, 'completionThreshold', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Return Threshold (°)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={getThresholdValue(joint, 'returnThreshold')}
                  onChange={(e) => handleInputChange(joint, 'returnThreshold', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Hysteresis (°)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  value={getThresholdValue(joint, 'hysteresis')}
                  onChange={(e) => handleInputChange(joint, 'hysteresis', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="5"
                />
              </div>
            </div>
            
            {/* Summary display */}
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <span className="font-medium">Rep Cycle: </span>
              Start: {getThresholdValue(joint, 'startThreshold')}° → 
              Complete: {getThresholdValue(joint, 'completionThreshold')}° → 
              Return: {getThresholdValue(joint, 'returnThreshold')}° 
              (Hysteresis: {getThresholdValue(joint, 'hysteresis')}°)
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <strong>Note:</strong> Changes are saved automatically. These thresholds are used by the video player for real-time rep counting.
      </div>
    </div>
  );
}
