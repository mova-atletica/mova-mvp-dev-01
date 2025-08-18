"use client";
import React, { useState, useEffect } from 'react';
import { 
  EyeIcon, 
  PencilIcon, 
  ChartBarIcon, 
  CogIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import EnhancedAnalysisDataViewer from './EnhancedAnalysisDataViewer';

interface UnifiedExerciseManagerProps {
  exercises: any[];
  onExerciseUpdate: () => void;
}

type ViewMode = 'list' | 'edit' | 'analysis';

export default function UnifiedExerciseManager({ 
  exercises, 
  onExerciseUpdate 
}: UnifiedExerciseManagerProps) {
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Reset state when exercises change
  useEffect(() => {
    if (!selectedExercise || !exercises.find(e => e.id === selectedExercise.id)) {
      setSelectedExercise(null);
      setViewMode('list');
      setEditingExercise(null);
    }
  }, [exercises, selectedExercise]);

  const handleEditExercise = (exercise: any) => {
    console.log('🔧🔧🔧 UNIFIED EXERCISE MANAGER - handleEditExercise CALLED 🔧🔧🔧');
    console.log('UnifiedExerciseManager handleEditExercise called with exercise:', exercise);
    console.log('Raw exercise.jointsOfInterest:', exercise.jointsOfInterest);
    console.log('Type of exercise.jointsOfInterest:', typeof exercise.jointsOfInterest);
    console.log('Is Array?', Array.isArray(exercise.jointsOfInterest));
    console.log('Raw exercise.tags:', exercise.tags);
    console.log('Raw exercise.equipment:', exercise.equipment);
    console.log('Raw exercise.muscleGroups:', exercise.muscleGroups);
    
    setSelectedExercise(exercise);
    setEditingExercise(exercise);
    
    // Parse the data properly - API already converts to arrays, but filter empty strings
    const parsedData = {
      title: exercise.title || '',
      description: exercise.description || '',
      level: exercise.level || 'beginner',
      tags: Array.isArray(exercise.tags) ? exercise.tags.filter((t: string) => t && t.trim()) : [],
      equipment: Array.isArray(exercise.equipment) ? exercise.equipment.filter((e: string) => e && e.trim()) : [],
      muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups.filter((m: string) => m && m.trim()) : [],
      jointsOfInterest: Array.isArray(exercise.jointsOfInterest) ? exercise.jointsOfInterest.filter((j: string) => j && j.trim()) : [],
      instructions: Array.isArray(exercise.instructions) ? exercise.instructions.filter((i: string) => i && i.trim()) : [''],
      authorName: exercise.authorName || '',
      authorProfileUrl: exercise.authorProfileUrl || '',
      relatedExercises: Array.isArray(exercise.relatedExercises) ? exercise.relatedExercises.filter((r: string) => r && r.trim()) : [],
    };
    
    console.log('Parsed data for edit form:', parsedData);
    console.log('Tags:', parsedData.tags);
    console.log('Equipment:', parsedData.equipment);
    console.log('Muscle Groups:', parsedData.muscleGroups);
    console.log('Joints of Interest:', parsedData.jointsOfInterest);
    console.log('Instructions:', parsedData.instructions);
    
    setEditForm(parsedData);
    setViewMode('edit');
  };

  const handleViewAnalysis = (exercise: any) => {
    // Navigate to the dedicated analysis page
    window.location.href = `/admin/exercises/${exercise.id}/analysis`;
  };

  const handleGenerateRealAnalysis = async (exercise: any) => {
    if (!confirm(`Generate real analysis for "${exercise.title}"? This will replace any existing analysis with actual keypoint-based analysis.`)) {
      return;
    }

    try {
      const response = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise.id })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`Real analysis generated for ${exercise.title}!`);
        onExerciseUpdate(); // Reload exercises to show new data
      } else {
        alert(`Error: ${result.error}\n\nDetails: ${result.details || 'No details available'}`);
      }
    } catch (error) {
      alert('Error generating analysis: ' + (error as Error).message);
    }
  };

  const handleSaveExercise = async () => {
    if (!editingExercise) return;

    try {
      const response = await fetch(`/api/exercises/${editingExercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update exercise');
      }

      alert('Exercise updated successfully!');
      onExerciseUpdate();
      setViewMode('list');
      setEditingExercise(null);
    } catch (error) {
      alert('Error updating exercise: ' + (error as Error).message);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete exercise');
      }

      alert('Exercise deleted successfully!');
      onExerciseUpdate();
    } catch (error) {
      alert('Error deleting exercise: ' + (error as Error).message);
    }
  };

  const renderExerciseList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Exercise Management</h2>
        <div className="text-sm text-gray-600">
          {exercises.length} exercises total
        </div>
      </div>
      
      <div className="grid gap-4">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
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
                  <h3 className="text-lg font-semibold text-gray-900">{exercise.title}</h3>
                  <p className="text-sm text-gray-600">{exercise.level}</p>
                  <p className="text-sm text-gray-500">
                    Type: {exercise.exerciseType || 'Not classified'} 
                    {exercise.exerciseSubtype && ` (${exercise.exerciseSubtype})`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewAnalysis(exercise)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="View Analysis"
                >
                  <ChartBarIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleEditExercise(exercise)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Edit Exercise"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteExercise(exercise.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete Exercise"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Analysis Status */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-700">Rep Analysis</div>
                <div className="text-gray-600">
                  {exercise.repAnalysis && exercise.repAnalysis.goldStandardRep ? '✅ Available' : '❌ Missing'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-700">Pattern Analysis</div>
                <div className="text-gray-600">
                  {exercise.patternAnalysis && exercise.patternAnalysis.referencePatterns ? '✅ Available' : '❌ Missing'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-700">Quality Analysis</div>
                <div className="text-gray-600">
                  {exercise.analysisQuality && exercise.analysisQuality.overallQuality ? '✅ Available' : '❌ Missing'}
                </div>
              </div>
            </div>
            

          </div>
        ))}
      </div>
    </div>
  );

  const renderEditForm = () => {
    if (!editingExercise) return null;

    const updateField = (field: string, value: any) => {
      setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const updateArrayField = (field: string, value: string[]) => {
      setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Exercise</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveExercise}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={editForm.level}
                onChange={(e) => updateField('level', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
              <input
                type="text"
                value={editForm.authorName}
                onChange={(e) => updateField('authorName', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author Profile URL</label>
              <input
                type="url"
                value={editForm.authorProfileUrl}
                onChange={(e) => updateField('authorProfileUrl', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Array Fields */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ArrayFieldEditor
              label="Tags"
              value={editForm.tags}
              onChange={(value) => updateArrayField('tags', value)}
            />
            <ArrayFieldEditor
              label="Equipment"
              value={editForm.equipment}
              onChange={(value) => updateArrayField('equipment', value)}
            />
            <ArrayFieldEditor
              label="Muscle Groups"
              value={editForm.muscleGroups}
              onChange={(value) => updateArrayField('muscleGroups', value)}
            />
          </div>

          {/* Joints of Interest - Checkbox Interface */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Joints of Interest</label>
            <p className="text-xs text-gray-500 mb-3">Select the joints that should be analyzed for this exercise:</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'leftShoulder', label: 'Left Shoulder' },
                { key: 'rightShoulder', label: 'Right Shoulder' },
                { key: 'leftElbow', label: 'Left Elbow' },
                { key: 'rightElbow', label: 'Right Elbow' },
                { key: 'leftWrist', label: 'Left Wrist' },
                { key: 'rightWrist', label: 'Right Wrist' },
                { key: 'leftHip', label: 'Left Hip' },
                { key: 'rightHip', label: 'Right Hip' },
                { key: 'leftKnee', label: 'Left Knee' },
                { key: 'rightKnee', label: 'Right Knee' },
                { key: 'leftAnkle', label: 'Left Ankle' },
                { key: 'rightAnkle', label: 'Right Ankle' },
                { key: 'trunk', label: 'Trunk' }
              ].map(joint => (
                <label key={joint.key} className="flex items-center text-sm cursor-pointer p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={Array.isArray(editForm.jointsOfInterest) && editForm.jointsOfInterest.includes(joint.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateArrayField('jointsOfInterest', [...editForm.jointsOfInterest, joint.key]);
                      } else {
                        updateArrayField('jointsOfInterest', editForm.jointsOfInterest.filter((j: string) => j !== joint.key));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-700">{joint.label}</span>
                </label>
              ))}
            </div>
            
            {Array.isArray(editForm.jointsOfInterest) && editForm.jointsOfInterest.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Selected joints:</p>
                <div className="flex flex-wrap gap-2">
                  {editForm.jointsOfInterest.map((joint: string, index: number) => (
                    <span key={index} className="bg-blue-100 text-blue-900 px-2 py-1 rounded text-xs font-medium">
                      {joint}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <div className="space-y-2">
              {editForm.instructions.map((instruction: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <span className="text-sm font-medium text-gray-600 mt-2">{index + 1}.</span>
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => {
                      const newInstructions = [...editForm.instructions];
                      newInstructions[index] = e.target.value;
                      updateArrayField('instructions', newInstructions);
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder={`Step ${index + 1}...`}
                  />
                  {editForm.instructions.length > 1 && (
                    <button
                      onClick={() => {
                        const newInstructions = editForm.instructions.filter((_: string, i: number) => i !== index);
                        updateArrayField('instructions', newInstructions);
                      }}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  updateArrayField('instructions', [...editForm.instructions, '']);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Step
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="space-y-6">
      {viewMode === 'list' && renderExerciseList()}
      {viewMode === 'edit' && renderEditForm()}
    </div>
  );
}

// Helper component for editing array fields
interface ArrayFieldEditorProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}

function ArrayFieldEditor({ label, value, onChange }: ArrayFieldEditorProps) {
  const [input, setInput] = useState('');

  const addItem = () => {
    if (input.trim() && !value.includes(input.trim())) {
      onChange([...value, input.trim()]);
      setInput('');
    }
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          placeholder={`Add ${label.toLowerCase()}...`}
        />
        <button
          onClick={addItem}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm flex items-center gap-1">
            {item}
            <button
              onClick={() => removeItem(index)}
              className="text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
