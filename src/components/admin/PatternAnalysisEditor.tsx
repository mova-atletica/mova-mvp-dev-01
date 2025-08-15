"use client";
import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PatternAnalysisEditorProps {
  data: any;
  onSave: (data: any) => void;
  editingField: string | null;
  onStartEditing: (field: string) => void;
  onCancelEditing: () => void;
}

export default function PatternAnalysisEditor({
  data,
  onSave,
  editingField,
  onStartEditing,
  onCancelEditing
}: PatternAnalysisEditorProps) {
  const [localData, setLocalData] = useState(data || {});
  const [editingValue, setEditingValue] = useState<any>(null);

  const handleEdit = (field: string, value: any) => {
    setEditingValue(value);
    onStartEditing(field);
  };

  const handleSave = (field: string) => {
    const updatedData = { ...localData, [field]: editingValue };
    setLocalData(updatedData);
    onSave(updatedData);
    setEditingValue(null);
  };

  const handleCancel = () => {
    setEditingValue(null);
    onCancelEditing();
  };

  const renderField = (field: string, value: any, type: 'text' | 'number' | 'json' | 'array' = 'text') => {
    const isEditing = editingField === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {type === 'json' ? (
            <textarea
              value={JSON.stringify(editingValue, null, 2)}
              onChange={(e) => {
                try {
                  setEditingValue(JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, keep as string
                }
              }}
              className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
              rows={4}
            />
          ) : type === 'array' ? (
            <div className="flex-1">
              <ArrayEditor
                value={editingValue}
                onChange={setEditingValue}
              />
            </div>
          ) : (
            <input
              type={type}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded"
            />
          )}
          <button
            onClick={() => handleSave(field)}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {type === 'json' ? (
            <pre className="text-sm font-mono bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : type === 'array' ? (
            <div className="text-sm">
              {Array.isArray(value) ? value.join(', ') : 'Not an array'}
            </div>
          ) : (
            <span className="text-sm">{String(value)}</span>
          )}
        </div>
        <button
          onClick={() => handleEdit(field, value)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded ml-2"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const renderToleranceMultipliers = () => {
    const tolerances = localData.toleranceMultipliers;
    
    if (!tolerances) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 mb-2">No tolerance multipliers defined</p>
          <button
            onClick={() => {
              const defaultTolerances = {
                'knee': 1.0,
                'hip': 1.0,
                'ankle': 1.2,
                'shoulder': 1.1,
                'elbow': 1.0
              };
              handleEdit('toleranceMultipliers', defaultTolerances);
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Create Default Tolerances
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {Object.entries(tolerances).map(([joint, multiplier]) => (
          <div key={joint} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm font-medium capitalize">{joint}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{String(multiplier)}x</span>
              <button
                onClick={() => handleEdit(`toleranceMultipliers.${joint}`, multiplier)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const newJoint = prompt('Enter joint name:');
            if (newJoint) {
              const updatedTolerances = { ...tolerances, [newJoint]: 1.0 };
              handleEdit('toleranceMultipliers', updatedTolerances);
            }
          }}
          className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Add Joint
        </button>
      </div>
    );
  };

  const renderMovementPatterns = () => {
    const patterns = localData.movementPatterns;
    
    if (!patterns) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 mb-2">No movement patterns defined</p>
          <button
            onClick={() => {
              const defaultPatterns = {
                'squat': {
                  primaryJoints: ['knee', 'hip', 'ankle'],
                  keyPhases: ['descent', 'bottom', 'ascent'],
                  angleRanges: {
                    'knee': { min: 60, max: 180 },
                    'hip': { min: 30, max: 180 }
                  }
                }
              };
              handleEdit('movementPatterns', defaultPatterns);
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Create Default Patterns
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(patterns).map(([patternName, patternData]: [string, any]) => (
          <div key={patternName} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-900 capitalize">{patternName}</h5>
              <button
                onClick={() => {
                  const { [patternName]: removed, ...rest } = patterns;
                  handleEdit('movementPatterns', rest);
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            <pre className="text-sm font-mono bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(patternData, null, 2)}
            </pre>
          </div>
        ))}
        <button
          onClick={() => {
            const newPattern = prompt('Enter pattern name:');
            if (newPattern) {
              const updatedPatterns = { 
                ...patterns, 
                [newPattern]: {
                  primaryJoints: [],
                  keyPhases: [],
                  angleRanges: {}
                }
              };
              handleEdit('movementPatterns', updatedPatterns);
            }
          }}
          className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Add Pattern
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Pattern Analysis Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Joints
          </label>
          {renderField('primaryJoints', localData.primaryJoints, 'array')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pattern Type
          </label>
          {renderField('patternType', localData.patternType, 'text')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confidence Score
          </label>
          {renderField('confidenceScore', localData.confidenceScore, 'number')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pattern Complexity
          </label>
          {renderField('patternComplexity', localData.patternComplexity, 'text')}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Notes
        </label>
        {renderField('adminNotes', localData.adminNotes, 'text')}
      </div>

      {/* Tolerance Multipliers Section */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Tolerance Multipliers</h4>
        {renderToleranceMultipliers()}
      </div>

      {/* Movement Patterns Section */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Movement Patterns</h4>
        {renderMovementPatterns()}
      </div>

      {/* Advanced Pattern Data */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Advanced Pattern Data</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Frames
            </label>
            {renderField('keyFrames', localData.keyFrames, 'json')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Angle Ranges
            </label>
            {renderField('angleRanges', localData.angleRanges, 'json')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Velocity Profiles
            </label>
            {renderField('velocityProfiles', localData.velocityProfiles, 'json')}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for editing arrays (same as in RepAnalysisEditor)
function ArrayEditor({ value, onChange }: { value: any, onChange: (value: any) => void }) {
  const [items, setItems] = useState<string[]>(Array.isArray(value) ? value : []);

  const addItem = () => {
    setItems([...items, '']);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded text-sm"
            placeholder="Enter item"
          />
          <button
            onClick={() => removeItem(index)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
      >
        <PlusIcon className="h-4 w-4" />
        Add Item
      </button>
    </div>
  );
}
