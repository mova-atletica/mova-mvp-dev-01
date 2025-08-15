"use client";
import React, { useState } from 'react';
import { 
  EyeIcon, 
  CogIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface ExerciseRulesViewerProps {
  rules: any;
}

export default function ExerciseRulesViewer({ rules }: ExerciseRulesViewerProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleRule = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  if (!rules) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
          <h4 className="text-lg font-semibold text-yellow-800">No Exercise Rules Generated</h4>
        </div>
        <p className="text-yellow-700 mb-4">
          Exercise rules haven't been generated yet. Rules are created from validated analysis data and provide the foundation for real-time feedback.
        </p>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h5 className="font-semibold text-yellow-800 mb-2">What are Exercise Rules?</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Define acceptable angle ranges for each joint</li>
            <li>• Set timing requirements for movement phases</li>
            <li>• Establish quality thresholds for real-time feedback</li>
            <li>• Provide guidance for form correction</li>
          </ul>
        </div>
      </div>
    );
  }

  const renderRuleCard = (ruleId: string, ruleData: any) => {
    const isExpanded = expandedRules.has(ruleId);
    const ruleType = ruleData.type || 'general';
    
    const getRuleIcon = (type: string) => {
      switch (type) {
        case 'angle': return <CogIcon className="h-5 w-5" />;
        case 'timing': return <DocumentTextIcon className="h-5 w-5" />;
        case 'quality': return <CheckCircleIcon className="h-5 w-5" />;
        default: return <InformationCircleIcon className="h-5 w-5" />;
      }
    };

    const getRuleColor = (type: string) => {
      switch (type) {
        case 'angle': return 'bg-blue-50 border-blue-200 text-blue-800';
        case 'timing': return 'bg-green-50 border-green-200 text-green-800';
        case 'quality': return 'bg-purple-50 border-purple-200 text-purple-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    return (
      <div key={ruleId} className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleRule(ruleId)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getRuleColor(ruleType)}`}>
              {getRuleIcon(ruleType)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 capitalize">
                {ruleData.name || ruleId.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
              <p className="text-sm text-gray-600">
                {ruleData.description || `${ruleType} rule for ${ruleData.joint || 'movement'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRuleColor(ruleType)}`}>
              {ruleType}
            </span>
            <EyeIcon className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="space-y-4">
              {/* Rule Parameters */}
              {ruleData.parameters && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Parameters</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(ruleData.parameters).map(([key, value]: [string, any]) => (
                      <div key={key} className="bg-gray-50 p-2 rounded">
                        <span className="text-xs font-medium text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="text-sm font-mono text-gray-900">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rule Logic */}
              {ruleData.logic && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Logic</h5>
                  <pre className="bg-gray-100 p-3 rounded text-sm font-mono overflow-auto">
                    {JSON.stringify(ruleData.logic, null, 2)}
                  </pre>
                </div>
              )}

              {/* Thresholds */}
              {ruleData.thresholds && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Thresholds</h5>
                  <div className="space-y-2">
                    {Object.entries(ruleData.thresholds).map(([level, value]: [string, any]) => (
                      <div key={level} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium capitalize text-gray-700">
                          {level}
                        </span>
                        <span className="text-sm font-mono text-gray-900">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Messages */}
              {ruleData.feedback && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Feedback Messages</h5>
                  <div className="space-y-2">
                    {Object.entries(ruleData.feedback).map(([level, message]: [string, any]) => (
                      <div key={level} className="p-2 bg-gray-50 rounded">
                        <span className="text-xs font-medium text-gray-600 capitalize mb-1 block">
                          {level}
                        </span>
                        <p className="text-sm text-gray-900">{String(message)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Priority: {ruleData.priority || 'normal'}</span>
                  <span>Active: {ruleData.active ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRulesSummary = () => {
    const ruleTypes = {
      angle: 0,
      timing: 0,
      quality: 0,
      general: 0
    };

    Object.values(rules).forEach((rule: any) => {
      const type = rule.type || 'general';
      ruleTypes[type as keyof typeof ruleTypes]++;
    });

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-3">Rules Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(ruleTypes).map(([type, count]) => (
            <div key={type} className="text-center">
              <div className="text-2xl font-bold text-blue-600">{count}</div>
              <div className="text-xs text-blue-700 capitalize">{type} rules</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRulesByType = () => {
    const rulesByType: { [key: string]: any[] } = {};
    
    Object.entries(rules).forEach(([ruleId, ruleData]: [string, any]) => {
      const type = ruleData.type || 'general';
      if (!rulesByType[type]) {
        rulesByType[type] = [];
      }
      rulesByType[type].push({ id: ruleId, ...ruleData });
    });

    return (
      <div className="space-y-6">
        {Object.entries(rulesByType).map(([type, typeRules]) => (
          <div key={type}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
              {type} Rules ({typeRules.length})
            </h3>
            <div className="space-y-3">
              {typeRules.map((rule) => renderRuleCard(rule.id, rule))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rules Summary */}
      {renderRulesSummary()}

      {/* Rules by Type */}
      {renderRulesByType()}

      {/* Rules Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Rules Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span>Ready for real-time analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-4 w-4 text-blue-600" />
            <span>Based on validated analysis data</span>
          </div>
          <div className="flex items-center gap-2">
            <CogIcon className="h-4 w-4 text-purple-600" />
            <span>Automatically applied to video players</span>
          </div>
        </div>
      </div>
    </div>
  );
}
