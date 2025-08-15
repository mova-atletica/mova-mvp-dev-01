'use client';

import { useState, useEffect } from 'react';
import { PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

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

interface RepAnalysisEditorProps {
  data: RepAnalysisData | null;
  onSave: (data: RepAnalysisData) => void;
  editingField: string | null;
  onStartEditing: (field: string) => void;
  onCancelEditing: () => void;
}

export default function RepAnalysisEditor({ 
  data, 
  onSave, 
  editingField, 
  onStartEditing, 
  onCancelEditing 
}: RepAnalysisEditorProps) {
  const [localData, setLocalData] = useState<RepAnalysisData>(data || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setLocalData(data || {});
  }, [data]);

  const updateField = (field: string, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts editing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateAndSave = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate rep boundaries
    if (localData.repBoundaries && localData.repBoundaries.length > 0) {
      for (let i = 0; i < localData.repBoundaries.length; i++) {
        const rep = localData.repBoundaries[i];
        if (rep.startTime >= rep.endTime) {
          newErrors.repBoundaries = `Rep ${i + 1} start time must be before end time`;
          break;
        }
      }
    }

    // Validate gold standard rep
    if (localData.goldStandardRep) {
      const gsr = localData.goldStandardRep;
      if (gsr.startFrame >= gsr.endFrame) {
        newErrors.goldStandardRep = 'Gold standard rep start frame must be before end frame';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave(localData);
      onCancelEditing();
    }
  };

  const renderField = (field: string, label: string, type: 'text' | 'number' | 'textarea' | 'json' = 'text') => {
    const isEditing = editingField === field;
    const value = localData[field as keyof RepAnalysisData];
    const error = errors[field];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {!isEditing ? (
            <button
              onClick={() => onStartEditing(field)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={validateAndSave}
                className="p-1 text-green-600 hover:text-green-800"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={onCancelEditing}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        {!isEditing ? (
          <div className="p-3 bg-gray-50 rounded-md">
            {type === 'json' ? (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {value ? JSON.stringify(value, null, 2) : 'No data'}
              </pre>
            ) : (
              <span className="text-sm text-gray-700">
                {value || 'No data'}
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {type === 'textarea' ? (
              <textarea
                value={value as string || ''}
                onChange={(e) => updateField(field, e.target.value)}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : type === 'json' ? (
              <textarea
                value={value ? JSON.stringify(value, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateField(field, parsed);
                  } catch (error) {
                    // Allow invalid JSON during editing
                    updateField(field, e.target.value);
                  }
                }}
                rows={8}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Enter valid JSON..."
              />
            ) : (
              <input
                type={type}
                value={value as string || ''}
                onChange={(e) => updateField(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>
        )}
        
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Database Fields Only</h4>
        <p className="text-sm text-blue-700">
          This editor only shows fields that actually exist in the database schema.
        </p>
      </div>

      {renderField('adminNotes', 'Admin Notes', 'textarea')}
      {renderField('repBoundaries', 'Rep Boundaries', 'json')}
      {renderField('goldStandardRep', 'Gold Standard Rep', 'json')}
      {renderField('jointAngleRules', 'Joint Angle Rules', 'json')}
      {renderField('repCountingRules', 'Rep Counting Rules', 'json')}
    </div>
  );
}
