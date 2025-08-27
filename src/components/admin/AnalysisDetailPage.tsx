'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import RepAnalysisEditor from './RepAnalysisEditor';
import RepAnalysisVisualizer from './RepAnalysisVisualizer';
import PatternAnalysisEditor from './PatternAnalysisEditor';
import RepThresholdEditor from './RepThresholdEditor';
import PoseAnalysisEditor from './PoseAnalysisEditor';

interface Exercise {
  id: string;
  title: string;
  image: string;
  exerciseType: string;
  exerciseSubtype?: string;
  jointsOfInterest?: string;
  referenceVideoUrl?: string;
  referenceKeypointsUrl?: string;
}

interface AnalysisData {
  repAnalysis?: any;
  patternAnalysis?: any;
  poseAnalysis?: any;
  analysisQuality?: any;
  exerciseRules?: any;
}

interface AnalysisDetailPageProps {
  exerciseId: string;
}

export default function AnalysisDetailPage({ exerciseId }: AnalysisDetailPageProps) {
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [selectedExerciseType, setSelectedExerciseType] = useState<'rep-based' | 'pose-based' | 'flow-based'>('rep-based');
  const [originalExerciseType, setOriginalExerciseType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['analysis']));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);

  const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<string | null>(null);
  const [keypointsData, setKeypointsData] = useState<any>(null);
  const [selectedJoints, setSelectedJoints] = useState<string[]>([]);

  // Load exercise and analysis data
  useEffect(() => {
    loadExerciseAndAnalysis();
  }, [exerciseId]);

  // Debug: Log when selectedJoints changes
  useEffect(() => {
    console.log('selectedJoints state changed:', selectedJoints);
  }, [selectedJoints]);

  const loadExerciseAndAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load exercise data
      const exerciseResponse = await fetch(`/api/exercises/${exerciseId}`);
      if (!exerciseResponse.ok) throw new Error('Failed to load exercise');
      const exerciseData = await exerciseResponse.json();
      
      // Extract exercise data from the response
      const exercise = exerciseData.exercise || exerciseData;
      console.log('Loaded exercise data:', exercise);
      console.log('Exercise title:', exercise.title);
      console.log('Exercise referenceVideoUrl:', exercise.referenceVideoUrl);
      console.log('Exercise jointsOfInterest:', exercise.jointsOfInterest);
      console.log('Exercise jointsOfInterest type:', typeof exercise.jointsOfInterest);
      console.log('Exercise jointsOfInterest isArray:', Array.isArray(exercise.jointsOfInterest));
      setExercise(exercise);
      
      // Set initial exercise type from exercise data
      if (exercise.exerciseType) {
        // Map database values to UI values
        let exerciseType: 'rep-based' | 'pose-based' | 'flow-based';
        switch (exercise.exerciseType) {
          case 'repetition':
          case 'rep-based':
            exerciseType = 'rep-based';
            break;
          case 'pose':
          case 'pose-based':
            exerciseType = 'pose-based';
            break;
          case 'flow':
          case 'flow-based':
            exerciseType = 'flow-based';
            break;
          default:
            exerciseType = 'rep-based';
        }
        setSelectedExerciseType(exerciseType);
        setOriginalExerciseType(exerciseType);
        console.log('Set exercise type from database:', exercise.exerciseType, '->', exerciseType);
      } else {
        // If no exercise type is set, default to rep-based for new exercises
        setSelectedExerciseType('rep-based');
        setOriginalExerciseType(null);
        console.log('No exercise type in database, defaulting to rep-based');
      }

      // Set initial joints of interest
      if (exercise.jointsOfInterest && Array.isArray(exercise.jointsOfInterest)) {
        const joints = exercise.jointsOfInterest.filter((j: string) => j && j.trim());
        setSelectedJoints(joints);
        console.log('Set joints of interest from database (array format):', joints);
        console.log('Available joint options:', [
          'leftKnee', 'rightKnee', 'leftHip', 'rightHip',
          'leftElbow', 'rightElbow', 'leftShoulder', 'rightShoulder',
          'leftAnkle', 'rightAnkle', 'leftWrist', 'rightWrist'
        ]);
      } else if (exercise.jointsOfInterest && typeof exercise.jointsOfInterest === 'string') {
        // Fallback for string format
        const joints = exercise.jointsOfInterest.split(',').map((j: string) => j.trim()).filter((j: string) => j);
        setSelectedJoints(joints);
        console.log('Set joints of interest from database (string format):', joints);
      } else {
        setSelectedJoints([]);
        console.log('No joints of interest in database');
      }

      // Load keypoints data if available
      if (exercise.referenceKeypointsUrl) {
        try {
          const keypointsResponse = await fetch('/api/storage/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl })
          });
          
          if (keypointsResponse.ok) {
            const keypoints = await keypointsResponse.json();
            setKeypointsData(keypoints);
            console.log('Loaded keypoints data:', keypoints);
          }
        } catch (error) {
          console.warn('Failed to load keypoints data:', error);
        }
      }
      
      // Load analysis data
      const analysisResponse = await fetch(`/api/exercises/${exerciseId}/analysis`);
      if (analysisResponse.ok) {
        const responseData = await analysisResponse.json();
        console.log('Analysis API response:', responseData);
        
        // The API returns { exercise: parsedExercise }, so we need to extract the analysis data
        if (responseData.exercise) {
          const { repAnalysis, poseAnalysis } = responseData.exercise;
          const extractedAnalysisData = {
            repAnalysis,
            poseAnalysis, // Keep poseAnalysis as poseAnalysis
            patternAnalysis: null, // Keep patternAnalysis separate for flow-based exercises
            analysisQuality: null, // Not currently used
            exerciseRules: repAnalysis?.jointAngleRules || null
          };
          console.log('Extracted analysis data:', extractedAnalysisData);
          console.log('Rep analysis available:', !!extractedAnalysisData.repAnalysis);
          console.log('Pose analysis available:', !!extractedAnalysisData.poseAnalysis);
          console.log('Pattern analysis available:', !!extractedAnalysisData.patternAnalysis);
          console.log('Exercise title from analysis API:', responseData.exercise.title);
          console.log('Rep analysis details:', {
            repBoundaries: extractedAnalysisData.repAnalysis?.repBoundaries,
            goldStandardRep: extractedAnalysisData.repAnalysis?.goldStandardRep,
            jointAngleRules: extractedAnalysisData.repAnalysis?.jointAngleRules
          });
          setAnalysisData(extractedAnalysisData);
        } else {
          console.log('No exercise data in response');
          setAnalysisData(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateRealAnalysis = async () => {
    if (!selectedExerciseType) {
      alert('Please select an exercise type first');
      return;
    }

    if (!confirm(`Generate new analysis for "${exercise?.title}" as ${selectedExerciseType}? This will replace any existing analysis data.`)) {
      return;
    }

    setSaving(true);
    setIsGenerating(true);
    try {
      // Map UI exercise type to database format for generation
      let databaseExerciseType: string;
      switch (selectedExerciseType) {
        case 'rep-based':
          databaseExerciseType = 'repetition';
          break;
        case 'pose-based':
          databaseExerciseType = 'pose';
          break;
        case 'flow-based':
          databaseExerciseType = 'flow';
          break;
        default:
          databaseExerciseType = 'repetition';
      }

      const response = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exerciseId, 
          exerciseType: databaseExerciseType 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate analysis');
      }

      // Auto-reload data immediately after successful generation
      await loadExerciseAndAnalysis();
      setHasUnsavedChanges(true);
      
      // Show success message
      alert('Analysis generated successfully! Data has been loaded and is ready for review.');
    } catch (err) {
      alert('Error generating analysis: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
      setIsGenerating(false);
    }
  };

  const generateRules = async () => {
    if (!selectedExerciseType) {
      alert('Please select an exercise type first');
      return;
    }

    if (selectedJoints.length === 0) {
      alert('Please select at least one joint of interest before generating rules');
      return;
    }

    setSaving(true);
    setIsGeneratingRules(true);
    try {
      console.log('Generating rules with:', {
        exerciseId,
        exerciseType: selectedExerciseType,
        jointsOfInterest: selectedJoints
      });
      
      const response = await fetch('/api/analysis/generate-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exerciseId, 
          exerciseType: selectedExerciseType,
          jointsOfInterest: selectedJoints
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate rules');
      }

      // Auto-reload data immediately after successful generation
      await loadExerciseAndAnalysis();
      
      // Show success message
      alert('Rules generated successfully! Data has been loaded and is ready for use.');
    } catch (err) {
      alert('Error generating rules: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
      setIsGeneratingRules(false);
    }
  };

  const confirmTypeChange = () => {
    if (pendingTypeChange) {
      setSelectedExerciseType(pendingTypeChange as 'rep-based' | 'pose-based' | 'flow-based');
      setHasUnsavedChanges(true);
    }
    setShowTypeChangeWarning(false);
    setPendingTypeChange(null);
  };

  const cancelTypeChange = () => {
    setShowTypeChangeWarning(false);
    setPendingTypeChange(null);
  };

  const saveAll = async () => {
    if (!hasUnsavedChanges) return;
    
    if (!selectedExerciseType) {
      alert('Please select an exercise type first');
      return;
    }
    
    setSaving(true);
    try {
      // Map UI exercise type back to database format
      let databaseExerciseType: string;
      switch (selectedExerciseType) {
        case 'rep-based':
          databaseExerciseType = 'repetition';
          break;
        case 'pose-based':
          databaseExerciseType = 'pose';
          break;
        case 'flow-based':
          databaseExerciseType = 'flow';
          break;
        default:
          databaseExerciseType = 'repetition';
      }

      // First, update the main exercise table with exerciseType and jointsOfInterest
      const exerciseUpdateData = {
        exerciseType: databaseExerciseType,
        jointsOfInterest: selectedJoints
      };
      
      console.log('Updating exercise data:', exerciseUpdateData);
      
      const exerciseResponse = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseUpdateData),
      });
      
      if (!exerciseResponse.ok) {
        const errorText = await exerciseResponse.text();
        console.error('Exercise update failed with status:', exerciseResponse.status);
        console.error('Error response:', errorText);
        throw new Error(`Failed to update exercise: ${exerciseResponse.status} - ${errorText}`);
      }

      // Then, update the analysis data if it exists
      if (analysisData?.repAnalysis || analysisData?.patternAnalysis || analysisData?.poseAnalysis) {
        const analysisDataToSave = {
          repAnalysis: analysisData?.repAnalysis,
          patternAnalysis: analysisData?.patternAnalysis,
          poseAnalysis: analysisData?.poseAnalysis,
          analysisQuality: analysisData?.analysisQuality,
          exerciseRules: analysisData?.exerciseRules
        };
        
        console.log('Saving analysis data:', analysisDataToSave);
        
        const analysisResponse = await fetch(`/api/exercises/${exerciseId}/analysis`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisDataToSave),
        });
        
        if (!analysisResponse.ok) {
          const errorText = await analysisResponse.text();
          console.error('Analysis update failed with status:', analysisResponse.status);
          console.error('Error response:', errorText);
          throw new Error(`Failed to update analysis: ${analysisResponse.status} - ${errorText}`);
        }
      }
      
      setHasUnsavedChanges(false);
      setOriginalExerciseType(selectedExerciseType);
      alert('Exercise type and analysis data saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`Error saving data: ${(error as Error).message}`);
    } finally {
      setSaving(false);
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

  const startEditing = (field: string) => {
    setEditingField(field);
  };

  const cancelEditing = () => {
    setEditingField(null);
  };

  const saveField = async (field: string, data: any) => {
    setAnalysisData(prev => ({
      ...prev,
      [field]: data
    }));
    setEditingField(null);
    setHasUnsavedChanges(true);
    
    // Log the change for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Field ${field} updated:`, data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-800">Error: {error}</p>
          <button 
            onClick={loadExerciseAndAnalysis}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
          <p className="text-yellow-800">Exercise not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-6xl" style={{
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: '0px',
      paddingRight: '0px',
      width: '94%',
      maxWidth: '2560px',
      borderRadius: '6px'
    }}>
      
        <div className="bg-[white] rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6"
          style={{width: '100%', maxWidth: '2560px',
            borderRadius: '6px'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-blue-700 rounded transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                    {exercise.image && exercise.image !== '/images/squat.jpg' ? (
                      <img 
                        src={exercise.image} 
                        alt={exercise.title} 
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Image</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{exercise.title}</h2>
                    <p className="text-blue-100">Analysis Detail Page</p>
                    <p className="text-blue-200 text-sm mt-1">
                      {!selectedExerciseType 
                        ? "No exercise type set. Select a type to begin analysis."
                        : selectedExerciseType === 'rep-based' && !analysisData?.repAnalysis
                        ? `No rep analysis data available. Generate analysis to get started.`
                        : selectedExerciseType === 'pose-based' && !analysisData?.poseAnalysis
                        ? `No pose analysis data available. Generate analysis to get started.`
                        : selectedExerciseType === 'flow-based' && !analysisData?.patternAnalysis
                        ? `No pattern analysis data available. Generate analysis to get started.`
                        : analysisData?.exerciseRules 
                        ? `${selectedExerciseType} analysis complete. Rules generated and ready for real-time use.`
                        : `${selectedExerciseType} analysis available. Configure parameters or generate rules.`
                      }
                      {hasUnsavedChanges && " (Unsaved changes)"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedExerciseType && (
                  <>
                    {/* Show Generate Analysis button only if no analysis data exists for current type */}
                    {selectedExerciseType === 'rep-based' && !analysisData?.repAnalysis && (
                      <button
                        onClick={generateRealAnalysis}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 disabled:opacity-50"
                        title={`Generate ${selectedExerciseType} analysis from video data`}
                      >
                        {saving ? 'Generating...' : 'Generate Analysis'}
                      </button>
                    )}
                    {selectedExerciseType === 'pose-based' && !analysisData?.poseAnalysis && (
                      <button
                        onClick={generateRealAnalysis}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 disabled:opacity-50"
                        title={`Generate ${selectedExerciseType} analysis from video data`}
                      >
                        {saving ? 'Generating...' : 'Generate Analysis'}
                      </button>
                    )}
                    {selectedExerciseType === 'flow-based' && !analysisData?.patternAnalysis && (
                      <button
                        onClick={generateRealAnalysis}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 disabled:opacity-50"
                        title={`Generate ${selectedExerciseType} analysis from video data`}
                      >
                        {saving ? 'Generating...' : 'Generate Analysis'}
                      </button>
                    )}
                    {/* Show Generate Rules button if analysis exists but no rules */}
                    {analysisData && !analysisData.exerciseRules && (
                      <button
                        onClick={generateRules}
                        disabled={saving}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50"
                        title="Create real-time analysis rules from validated data"
                      >
                        {isGeneratingRules ? 'Generating Rules...' : 'Generate Rules'}
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={loadExerciseAndAnalysis}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400"
                  title="Reload analysis data from database"
                >
                  Refresh
                </button>
                <button
                  onClick={saveAll}
                  disabled={saving || !selectedExerciseType || !hasUnsavedChanges}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    hasUnsavedChanges 
                      ? 'bg-purple-600 text-white hover:bg-purple-500' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  title={hasUnsavedChanges ? "Save all analysis data and exercise type" : "No changes to save"}
                >
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Joints of Interest */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Joints of Interest</h4>
              <p className="text-sm text-gray-600 mb-3">
                Checkboxes to change/save joints relevant to this exercise analysis.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  'leftKnee', 'rightKnee', 'leftHip', 'rightHip',
                  'leftElbow', 'rightElbow', 'leftShoulder', 'rightShoulder',
                  'leftAnkle', 'rightAnkle', 'leftWrist', 'rightWrist'
                ].map((joint) => (
                  <label key={joint} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedJoints.includes(joint)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJoints(prev => [...prev, joint]);
                        } else {
                          setSelectedJoints(prev => prev.filter(j => j !== joint));
                        }
                        setHasUnsavedChanges(true);
                        console.log(`${joint} ${e.target.checked ? 'selected' : 'deselected'}`);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {joint.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Exercise Type Selector */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Exercise Type</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Current type: <span className="font-semibold">{selectedExerciseType || 'Not set'}</span>
                    {originalExerciseType && selectedExerciseType !== originalExerciseType && (
                      <span className="text-orange-600 ml-2">(Changed from {originalExerciseType})</span>
                    )}
                  </p>
                  {selectedExerciseType !== originalExerciseType && (
                    <button
                      onClick={() => {
                        setSelectedExerciseType(originalExerciseType as 'rep-based' | 'pose-based' | 'flow-based');
                        setHasUnsavedChanges(false);
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      Revert
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Select a different type to change the analysis approach:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      if (selectedExerciseType !== 'rep-based') {
                        // If this is a change from an existing type, show warning
                        if (originalExerciseType && originalExerciseType !== 'rep-based') {
                          setPendingTypeChange('rep-based');
                          setShowTypeChangeWarning(true);
                          return;
                        }
                        setSelectedExerciseType('rep-based');
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedExerciseType === 'rep-based'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Rep-based</div>
                    <div className="text-sm text-gray-600">
                      Exercises with repetitions (squats, push-ups, etc.)
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedExerciseType !== 'pose-based') {
                        // If this is a change from an existing type, show warning
                        if (originalExerciseType && originalExerciseType !== 'pose-based') {
                          setPendingTypeChange('pose-based');
                          setShowTypeChangeWarning(true);
                          return;
                        }
                        setSelectedExerciseType('pose-based');
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedExerciseType === 'pose-based'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Pose-based</div>
                    <div className="text-sm text-gray-600">
                      Static poses and holds (planks, yoga poses, etc.)
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedExerciseType !== 'flow-based') {
                        // If this is a change from an existing type, show warning
                        if (originalExerciseType && originalExerciseType !== 'flow-based') {
                          setPendingTypeChange('flow-based');
                          setShowTypeChangeWarning(true);
                          return;
                        }
                        setSelectedExerciseType('flow-based');
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedExerciseType === 'flow-based'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Flow-based</div>
                    <div className="text-sm text-gray-600">
                      Continuous movement patterns (dance, martial arts, etc.)
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Rep Completion Thresholds Editor */}
            {analysisData?.repAnalysis?.jointAngleRules && (
              <RepThresholdEditor
                jointAngleRules={analysisData.repAnalysis.jointAngleRules}
                onThresholdsChange={(updatedRules) => {
                  console.log('Rep thresholds changed:', updatedRules);
                  // Update joint angle rules in analysis data
                  if (analysisData?.repAnalysis) {
                    const updatedRepAnalysis = {
                      ...analysisData.repAnalysis,
                      jointAngleRules: updatedRules
                    };
                    setAnalysisData({
                      ...analysisData,
                      repAnalysis: updatedRepAnalysis
                    });
                    setHasUnsavedChanges(true);
                  }
                }}
                selectedJoints={selectedJoints}
                disabled={saving}
              />
            )}

            {/* Analysis Data Sections */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Analysis Data</h4>
              <p className="text-sm text-gray-600 mb-4">
                View and edit the analysis data for this {selectedExerciseType} exercise. Changes will be saved when you click "Save All".
              </p>
              
              {isGenerating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div className="text-blue-800 font-medium">Generating analysis data...</div>
                  </div>
                  <p className="text-blue-600 text-sm mt-2">This may take a few moments. Data will appear automatically when ready.</p>
                </div>
              )}
              
              {selectedExerciseType === 'rep-based' && (
                <div className="mb-6">
                  <div className="mb-3">
                    <h5 className="font-medium text-gray-900">Rep Analysis Details</h5>
                  </div>
                  
                  {(() => {
                    console.log('Rendering RepAnalysisVisualizer with:', {
                      exerciseTitle: exercise?.title,
                      videoUrl: exercise?.referenceVideoUrl,
                      repAnalysis: analysisData?.repAnalysis,
                      keypointsData: keypointsData,
                      selectedJoints: selectedJoints
                    });
                    return null;
                  })()}
                  
                  <RepAnalysisVisualizer
                    data={analysisData?.repAnalysis}
                    exerciseTitle={exercise?.title || 'Unknown Exercise'}
                    exerciseId={exerciseId}
                    exerciseType={selectedExerciseType}
                    keypointsData={keypointsData}
                    selectedJoints={selectedJoints}
                    videoUrl={exercise?.referenceVideoUrl}
                    // Debug logging
                    // console.log('Passing to RepAnalysisVisualizer:', {
                    //   exerciseTitle: exercise?.title,
                    //   videoUrl: exercise?.referenceVideoUrl,
                    //   repAnalysis: analysisData?.repAnalysis,
                    //   keypointsData: keypointsData
                    // })
                    onRepBoundaryChange={(boundaries) => {
                      console.log('Rep boundaries changed:', boundaries);
                      // Update rep boundaries in analysis data
                      if (analysisData?.repAnalysis) {
                        const updatedRepAnalysis = {
                          ...analysisData.repAnalysis,
                          repBoundaries: boundaries
                        };
                        setAnalysisData(prev => ({
                          ...prev,
                          repAnalysis: updatedRepAnalysis
                        }));

                        setHasUnsavedChanges(true);
                      }
                    }}
                    onPhaseChange={(phases) => {
                      console.log('Phases changed:', phases);
                      // Update phases in analysis data
                      if (analysisData?.repAnalysis) {
                        const updatedRepAnalysis = {
                          ...analysisData.repAnalysis,
                          phases: phases
                        };
                        setAnalysisData(prev => ({
                          ...prev,
                          repAnalysis: updatedRepAnalysis
                        }));

                        setHasUnsavedChanges(true);
                      }
                    }}
                    onRepAnalysisChange={(updatedData) => {
                      console.log('Rep analysis data updated:', updatedData);
                      // Update the entire rep analysis data
                      setAnalysisData(prev => ({
                        ...prev,
                        repAnalysis: updatedData
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    onDataReload={loadExerciseAndAnalysis}
                  />
                </div>
              )}

              {(selectedExerciseType === 'pose-based') && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-900 mb-3">Pose Analysis Details</h5>
                  <PoseAnalysisEditor
                    data={analysisData?.poseAnalysis}
                    onSave={(data) => saveField('poseAnalysis', data)}
                    exerciseId={exerciseId}
                    videoUrl={exercise?.referenceVideoUrl}
                    selectedJoints={selectedJoints}
                    disabled={saving}
                  />
                </div>
              )}

              {(selectedExerciseType === 'flow-based') && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-900 mb-3">Pattern Analysis Details</h5>
                  <PatternAnalysisEditor
                    data={analysisData?.patternAnalysis}
                    onSave={(data) => saveField('patternAnalysis', data)}
                    editingField={editingField}
                    onStartEditing={startEditing}
                    onCancelEditing={cancelEditing}
                  />
                </div>
              )}


            </div>
          </div>
        </div>
      

      {/* Type Change Warning Modal */}
      {showTypeChangeWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Change Exercise Type?
            </h3>
            <p className="text-gray-600 mb-6">
              Changing the exercise type from <strong>{originalExerciseType}</strong> to <strong>{pendingTypeChange}</strong> will:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              <li>• Generate new analysis data for the selected type</li>
              <li>• Replace any existing analysis data</li>
              <li>• Require re-generation of exercise rules</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={cancelTypeChange}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmTypeChange}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Change Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}