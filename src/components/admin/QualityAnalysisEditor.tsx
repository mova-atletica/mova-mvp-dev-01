"use client";
import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';

interface QualityAnalysisEditorProps {
  data: any;
  onSave: (data: any) => void;
  editingField: string | null;
  onStartEditing: (field: string) => void;
  onCancelEditing: () => void;
}

export default function QualityAnalysisEditor({
  data,
  onSave,
  editingField,
  onStartEditing,
  onCancelEditing
}: QualityAnalysisEditorProps) {
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

  const renderField = (field: string, value: any, type: 'text' | 'number' | 'json' | 'select' = 'text') => {
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
          ) : type === 'select' ? (
            <select
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="excellent">Excellent</option>
            </select>
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

  const renderQualityScore = (score: number) => {
    const getScoreColor = (score: number) => {
      if (score >= 0.8) return 'text-green-600';
      if (score >= 0.6) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getScoreIcon = (score: number) => {
      if (score >= 0.8) return '⭐';
      if (score >= 0.6) return '⭐';
      return '⭐';
    };

    return (
      <div className="flex items-center gap-2">
        <span className={getScoreColor(score)}>{getScoreIcon(score)}</span>
        <span className={`font-semibold ${getScoreColor(score)}`}>
          {(score * 100).toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderValidationStatus = () => {
    const status = localData.validationStatus;
    
    if (!status) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 mb-2">No validation status set</p>
          <button
            onClick={() => handleEdit('validationStatus', 'pending')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Set as Pending
          </button>
        </div>
      );
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'validated': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <button
          onClick={() => handleEdit('validationStatus', status)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const renderQualityMetrics = () => {
    const metrics = localData.qualityMetrics;
    
    if (!metrics) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 mb-2">No quality metrics defined</p>
          <button
            onClick={() => {
              const defaultMetrics = {
                'keypointAccuracy': 0.85,
                'motionSmoothness': 0.78,
                'formConsistency': 0.92,
                'dataCompleteness': 0.95
              };
              handleEdit('qualityMetrics', defaultMetrics);
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Create Default Metrics
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(metrics).map(([metric, score]: [string, any]) => (
          <div key={metric} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium capitalize">
                  {metric.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {renderQualityScore(score)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${score * 100}%` }}
                ></div>
              </div>
            </div>
            <button
              onClick={() => handleEdit(`qualityMetrics.${metric}`, score)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded ml-2"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Quality Analysis Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Overall Quality Score
          </label>
          <div className="flex items-center justify-between">
            {renderQualityScore(localData.overallQualityScore || 0)}
            <button
              onClick={() => handleEdit('overallQualityScore', localData.overallQualityScore || 0)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Quality Level
          </label>
          {renderField('dataQualityLevel', localData.dataQualityLevel, 'select')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confidence Level
          </label>
          {renderField('confidenceLevel', localData.confidenceLevel, 'number')}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reliability Score
          </label>
          {renderField('reliabilityScore', localData.reliabilityScore, 'number')}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Notes
        </label>
        {renderField('adminNotes', localData.adminNotes, 'text')}
      </div>

      {/* Validation Status Section */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Validation Status</h4>
        {renderValidationStatus()}
      </div>

      {/* Quality Metrics Section */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Quality Metrics</h4>
        {renderQualityMetrics()}
      </div>

      {/* Advanced Quality Data */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Advanced Quality Data</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quality Factors
            </label>
            {renderField('qualityFactors', localData.qualityFactors, 'json')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Validation Criteria
            </label>
            {renderField('validationCriteria', localData.validationCriteria, 'json')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quality Thresholds
            </label>
            {renderField('qualityThresholds', localData.qualityThresholds, 'json')}
          </div>
        </div>
      </div>

      {/* Last Updated Info */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Update Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Updated By
            </label>
            {renderField('lastUpdatedBy', localData.lastUpdatedBy, 'text')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Updated At
            </label>
            <span className="text-sm text-gray-600">
              {localData.lastUpdatedAt ? new Date(localData.lastUpdatedAt).toLocaleString() : 'Not set'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
