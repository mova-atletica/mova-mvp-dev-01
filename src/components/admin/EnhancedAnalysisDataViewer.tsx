"use client";
import React, { useState, useEffect } from 'react';
import { AdminAnalysisData } from '@/types/analysis';

interface EnhancedAnalysisDataViewerProps {
  exerciseId: string;
  onDataChange?: (data: AdminAnalysisData) => void;
}

export default function EnhancedAnalysisDataViewer({ 
  exerciseId, 
  onDataChange 
}: EnhancedAnalysisDataViewerProps) {
  const [analysisData, setAnalysisData] = useState<AdminAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  useEffect(() => {
    fetchAnalysisData();
  }, [exerciseId]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exercises/${exerciseId}/analysis`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }
      
      const responseData = await response.json();
      const { repAnalysis, poseAnalysis } = responseData.exercise;
      
      const extractedAnalysisData: AdminAnalysisData = {
        exerciseType: responseData.exercise.exerciseType,
        jointsOfInterest: responseData.exercise.jointsOfInterest,
        repAnalysis,
        poseAnalysis,
      };

      setAnalysisData(extractedAnalysisData);
      
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const saveField = async (field: string, data: any) => {
    try {
      const updateData: any = {};
      updateData[field] = data;

      const response = await fetch(`/api/exercises/${exerciseId}/analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to save analysis data');
      }

      // Update local state
      setAnalysisData(prev => prev ? { ...prev, [field]: data } : null);
      
      // Notify parent component
      if (onDataChange && analysisData) {
        onDataChange({ ...analysisData, [field]: data });
      }
      
    } catch (err) {
      console.error('Error saving analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save analysis data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analysis data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchAnalysisData}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-medium">No Analysis Data</h3>
        <p className="text-yellow-600 text-sm">No analysis data found for this exercise.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50"
        >
          <h3 className="font-medium text-gray-900">Analysis Overview</h3>
          <span className="text-gray-500">
            {expandedSections.has('overview') ? '▼' : '▶'}
          </span>
        </button>
        
        {expandedSections.has('overview') && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-700 mb-2">Exercise Type</h4>
                <p className="text-sm text-gray-600">
                  {analysisData.exerciseType || 'Not set'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-700 mb-2">Joints of Interest</h4>
                <p className="text-sm text-gray-600">
                  {analysisData.jointsOfInterest?.length 
                    ? analysisData.jointsOfInterest.join(', ') 
                    : 'None specified'
                  }
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-700 mb-2">Repetition Analysis</h4>
                <p className="text-sm text-gray-600">
                  {analysisData.repAnalysis ? '✅ Available' : '❌ Missing'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-700 mb-2">Pose Analysis</h4>
                <p className="text-sm text-gray-600">
                  {analysisData.poseAnalysis ? '✅ Available' : '❌ Missing'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Repetition Analysis Section */}
      {analysisData.repAnalysis && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleSection('repAnalysis')}
            className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50"
          >
            <h3 className="font-medium text-gray-900">Repetition Analysis</h3>
            <span className="text-gray-500">
              {expandedSections.has('repAnalysis') ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedSections.has('repAnalysis') && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Gold Standard Rep</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.repAnalysis.goldStandardRep, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Rep Boundaries</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.repAnalysis.repBoundaries, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Joint Angle Rules</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.repAnalysis.jointAngleRules, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Admin Notes</h4>
                  <textarea
                    value={analysisData.repAnalysis.adminNotes || ''}
                    onChange={(e) => {
                      const updatedData = {
                        ...analysisData.repAnalysis,
                        adminNotes: e.target.value
                      };
                      saveField('repAnalysis', updatedData);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    rows={3}
                    placeholder="Add notes about this rep analysis..."
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={analysisData.repAnalysis.validatedByAdmin || false}
                      onChange={(e) => {
                        const updatedData = {
                          ...analysisData.repAnalysis,
                          validatedByAdmin: e.target.checked
                        };
                        saveField('repAnalysis', updatedData);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Validated by Admin</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pose Analysis Section */}
      {analysisData.poseAnalysis && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleSection('poseAnalysis')}
            className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50"
          >
            <h3 className="font-medium text-gray-900">Pose Analysis</h3>
            <span className="text-gray-500">
              {expandedSections.has('poseAnalysis') ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedSections.has('poseAnalysis') && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Target Poses</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.poseAnalysis.targetPoses, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Angle Ranges</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.poseAnalysis.angleRanges, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Primary Joints</h4>
                  <p className="text-sm text-gray-600">
                    {analysisData.poseAnalysis.primaryJoints?.join(', ') || 'None specified'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Tolerance Multipliers</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.poseAnalysis.toleranceMultipliers, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Feedback Messages</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(analysisData.poseAnalysis.feedbackMessages, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Admin Notes</h4>
                  <textarea
                    value={analysisData.poseAnalysis.adminNotes || ''}
                    onChange={(e) => {
                      const updatedData = {
                        ...analysisData.poseAnalysis,
                        adminNotes: e.target.value
                      };
                      saveField('poseAnalysis', updatedData);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    rows={3}
                    placeholder="Add notes about this pose analysis..."
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={analysisData.poseAnalysis.validatedByAdmin || false}
                      onChange={(e) => {
                        const updatedData = {
                          ...analysisData.poseAnalysis,
                          validatedByAdmin: e.target.checked
                        };
                        saveField('poseAnalysis', updatedData);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Validated by Admin</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={fetchAnalysisData}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}
