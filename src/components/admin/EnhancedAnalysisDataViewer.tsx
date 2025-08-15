"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PencilIcon, 
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { AdminAnalysisData, GoldStandardRep, RepBoundaries } from '@/types/analysis';

interface EnhancedAnalysisDataViewerProps {
  exerciseId: string;
  exerciseTitle: string;
  onDataUpdate?: (data: AdminAnalysisData) => void;
}

export default function EnhancedAnalysisDataViewer({ 
  exerciseId, 
  exerciseTitle, 
  onDataUpdate 
}: EnhancedAnalysisDataViewerProps) {
  const [analysisData, setAnalysisData] = useState<AdminAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['workflow', 'help']));
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedExerciseType, setSelectedExerciseType] = useState<'rep-based' | 'pose-based' | 'flow-based' | null>(null);

  // Convert AdminAnalysisData.repAnalysis to RepAnalysisEditor.RepAnalysisData format
  const convertRepAnalysisData = (repAnalysis: any) => {
    if (!repAnalysis) return null;
    
    return {
      // Only include fields that actually exist in the database schema
      repBoundaries: repAnalysis.repBoundaries,
      goldStandardRep: repAnalysis.goldStandardRep,
      adminNotes: repAnalysis.adminNotes,
      jointAngleRules: repAnalysis.jointAngleRules,
      repCountingRules: repAnalysis.repCountingRules,
    };
  };

  // Load analysis data
  useEffect(() => {
    loadAnalysisData();
  }, [exerciseId]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exercises/${exerciseId}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to load analysis data');
      }
      const data = await response.json();
      console.log('Loaded analysis data:', data);
      setAnalysisData(data);
    } catch (err) {
      console.error('Error loading analysis data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const startEditing = (field: string) => {
    setEditingField(field);
  };

  const cancelEditing = () => {
    setEditingField(null);
  };

  const saveField = async (field: string, value: any) => {
    if (!analysisData) return;

    try {
      setSaving(true);
      const updatedData = { ...analysisData };
      
      // Update the specific field
      if (field.startsWith('rep.')) {
        const repField = field.replace('rep.', '');
        updatedData.repAnalysis = { ...updatedData.repAnalysis, [repField]: value };
      } else if (field.startsWith('pattern.')) {
        const patternField = field.replace('pattern.', '');
        updatedData.patternAnalysis = { ...updatedData.patternAnalysis, [patternField]: value };
      } else if (field.startsWith('quality.')) {
        const qualityField = field.replace('quality.', '');
        updatedData.analysisQuality = { ...updatedData.analysisQuality, [qualityField]: value };
      }

      // Save to API immediately
      const response = await fetch(`/api/exercises/${exerciseId}/analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      setAnalysisData(updatedData);
      setEditingField(null);
      onDataUpdate?.(updatedData);
      
      // Show success message for rule changes
      if (field === 'rep.jointAngleRules' || field === 'rep.repCountingRules') {
        console.log('Rules saved successfully to database');
      }
    } catch (err) {
      alert('Error saving data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const generateRules = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/analysis/generate-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate rules');
      }

      const result = await response.json();
      alert('Rules generated successfully! Check the Exercise Rules section below.');
      await loadAnalysisData(); // Reload to show new rules
      setCurrentStep(5); // Move to validation step
    } catch (err) {
      alert('Error generating rules: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const generateRealAnalysis = async () => {
    try {
      setSaving(true);
      console.log('Generating real analysis for exercise:', exerciseId);
      
      const response = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId })
      });

      const result = await response.json();
      console.log('Analysis generation result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate analysis');
      }

      alert('Real analysis generated successfully!');
      await loadAnalysisData(); // Reload to show new data
      setCurrentStep(3); // Move to configuration step
    } catch (err) {
      console.error('Error generating analysis:', err);
      alert('Error generating analysis: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Determine current step based on exercise type and data availability
  const determineCurrentStep = () => {
    if (!selectedExerciseType) return 1;
    if (!analysisData) return 2;
    
    // Check for type-specific analysis
    const hasTypeSpecificAnalysis = selectedExerciseType === 'rep-based' 
      ? analysisData.repAnalysis && analysisData.repAnalysis.goldStandardRep
      : analysisData.patternAnalysis && analysisData.patternAnalysis.referencePatterns;
    
    const hasQualityAnalysis = analysisData.analysisQuality && analysisData.analysisQuality.overallQuality;
    const hasRules = analysisData.exerciseRules && Object.keys(analysisData.exerciseRules).length > 0;

    if (!hasTypeSpecificAnalysis || !hasQualityAnalysis) return 2;
    if (hasTypeSpecificAnalysis && hasQualityAnalysis && !hasRules) return 3;
    if (!hasRules) return 4;
    return 5;
  };

  // Update current step when data changes
  useEffect(() => {
    if (analysisData) {
      setCurrentStep(determineCurrentStep());
    }
  }, [analysisData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={loadAnalysisData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No analysis data available for this exercise.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{exerciseTitle}</h2>
            <p className="text-blue-100">Enhanced Analysis Data Viewer</p>
            <p className="text-blue-200 text-sm mt-1">
              {!selectedExerciseType 
                ? "Select exercise type to begin analysis workflow."
                : !analysisData 
                ? "No analysis data available. Generate real analysis to get started."
                : analysisData?.exerciseRules 
                ? "Analysis complete. Rules generated and ready for real-time use."
                : currentStep === 3
                ? "Analysis data available. Configure analysis parameters before generating rules."
                : "Analysis data available. Generate rules for real-time feedback."
              }
            </p>
          </div>
          <div className="flex gap-2">
            {selectedExerciseType && !analysisData && (
              <button
                onClick={generateRealAnalysis}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 disabled:opacity-50"
                title={`Generate ${selectedExerciseType} analysis from video data`}
              >
                {saving ? 'Generating...' : 'Generate Real Analysis'}
              </button>
            )}
            {selectedExerciseType && analysisData && !analysisData.exerciseRules && (
              <>
                {currentStep === 3 && (
                  <button
                    onClick={() => setExpandedSections(new Set([selectedExerciseType === 'rep-based' ? 'rep' : 'pattern', 'quality']))}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-500 disabled:opacity-50"
                    title="Open analysis editors for configuration"
                  >
                    Configure Analysis
                  </button>
                )}
                <button
                  onClick={generateRules}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50"
                  title="Create real-time analysis rules from validated data"
                >
                  {saving ? 'Generating...' : 'Generate Rules'}
                </button>
              </>
            )}
            <button
              onClick={loadAnalysisData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400"
              title="Reload analysis data from database"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Help Section */}
        <AnalysisSection
          title="Button Help"
          expanded={expandedSections.has('help')}
          onToggle={() => toggleSection('help')}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">What Each Button Does</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-green-600 rounded mt-0.5 flex-shrink-0"></div>
                  <div>
                    <strong>Generate Real Analysis:</strong> Creates exercise-type-specific analysis from the exercise video. For rep-based exercises, generates rep analysis. For pose/flow exercises, generates pattern analysis. Always includes quality metrics. Only shows after exercise type is selected.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-orange-600 rounded mt-0.5 flex-shrink-0"></div>
                  <div>
                    <strong>Configure Analysis:</strong> Opens the relevant analysis editors based on exercise type. For rep-based exercises, shows rep analysis editor. For pose/flow exercises, shows pattern analysis editor. Always includes quality analysis editor. Only shows when analysis exists but rules don't.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-blue-600 rounded mt-0.5 flex-shrink-0"></div>
                  <div>
                    <strong>Generate Rules:</strong> Creates real-time analysis rules from validated analysis data. These rules are used by the video player to provide live feedback during exercise performance. Only shows when analysis exists but rules don't.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded mt-0.5 flex-shrink-0"></div>
                  <div>
                    <strong>Refresh:</strong> Reloads the analysis data from the database. Use this if you've made changes elsewhere or want to see the latest data.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnalysisSection>

        {/* Workflow Section */}
        <AnalysisSection
          title="Analysis Workflow"
          expanded={expandedSections.has('workflow')}
          onToggle={() => toggleSection('workflow')}
        >
          <div className="space-y-4">
            {/* Exercise Type Selector */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Step 1: Select Exercise Type</h4>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Choose the type of exercise to determine which analysis will be generated:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedExerciseType('rep-based')}
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
                    onClick={() => setSelectedExerciseType('pose-based')}
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
                    onClick={() => setSelectedExerciseType('flow-based')}
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Step-by-Step Analysis Process</h4>
              <div className="space-y-3">
                <WorkflowStep
                  step={1}
                  currentStep={currentStep}
                  title="Select Exercise Type"
                  description="Choose the type of exercise for analysis"
                  status={selectedExerciseType ? 'complete' : 'current'}
                />
                <WorkflowStep
                  step={2}
                  currentStep={currentStep}
                  title="Generate Real Analysis"
                  description={`Create ${selectedExerciseType || 'exercise-type-specific'} analysis from video data`}
                  status={determineCurrentStep() >= 2 ? 'complete' : 'pending'}
                />
                <WorkflowStep
                  step={3}
                  currentStep={currentStep}
                  title="Configure Analysis"
                  description={`Edit ${selectedExerciseType || 'exercise-type-specific'} analysis parameters`}
                  status={determineCurrentStep() >= 3 ? 'complete' : 'pending'}
                />
                <WorkflowStep
                  step={4}
                  currentStep={currentStep}
                  title="Generate Rules"
                  description="Create real-time analysis rules from validated data"
                  status={determineCurrentStep() >= 4 ? 'complete' : 'pending'}
                />
                <WorkflowStep
                  step={5}
                  currentStep={currentStep}
                  title="Validate & Save"
                  description="Review and validate analysis for real-time use"
                  status={determineCurrentStep() >= 5 ? 'complete' : 'pending'}
                />
              </div>
            </div>
          </div>
        </AnalysisSection>



        {/* Type-Specific Analysis Sections */}
        {selectedExerciseType === 'rep-based' && (
          <AnalysisSection
            title="Rep Analysis Details"
            expanded={expandedSections.has('rep')}
            onToggle={() => toggleSection('rep')}
          >
            <RepAnalysisEditor
              data={convertRepAnalysisData(analysisData.repAnalysis)}
              onSave={(data) => saveField('rep', data)}
              editingField={editingField}
              onStartEditing={startEditing}
              onCancelEditing={cancelEditing}
            />
          </AnalysisSection>
        )}

        {(selectedExerciseType === 'pose-based' || selectedExerciseType === 'flow-based') && (
          <AnalysisSection
            title="Pattern Analysis Details"
            expanded={expandedSections.has('pattern')}
            onToggle={() => toggleSection('pattern')}
          >
            <PatternAnalysisEditor
              data={analysisData.patternAnalysis}
              onSave={(data) => saveField('pattern', data)}
              editingField={editingField}
              onStartEditing={startEditing}
              onCancelEditing={cancelEditing}
            />
          </AnalysisSection>
        )}

        {/* Quality Analysis Section - Always shown */}
        <AnalysisSection
          title="Quality Analysis Details"
          expanded={expandedSections.has('quality')}
          onToggle={() => toggleSection('quality')}
        >
          <QualityAnalysisEditor
            data={analysisData.analysisQuality}
            onSave={(data) => saveField('quality', data)}
            editingField={editingField}
            onStartEditing={startEditing}
            onCancelEditing={cancelEditing}
          />
        </AnalysisSection>

        {/* Exercise Rules Section */}
        <AnalysisSection
          title="Exercise Rules"
          expanded={expandedSections.has('rules')}
          onToggle={() => toggleSection('rules')}
        >
          <ExerciseRulesViewer rules={analysisData.exerciseRules} />
        </AnalysisSection>
      </div>
    </div>
  );
}

// Helper Components
interface AnalysisSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AnalysisSection({ title, expanded, onToggle, children }: AnalysisSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {expanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface OverviewCardProps {
  title: string;
  status: 'complete' | 'missing' | 'partial';
  data: any;
}

function OverviewCard({ title, status, data }: OverviewCardProps) {
  // Determine actual status based on data content
  const getActualStatus = () => {
    if (!data) return 'missing';
    
    switch (title) {
      case 'Rep Analysis':
        return data.goldStandardRep ? 'complete' : 'partial';
      case 'Pattern Analysis':
        return data.referencePatterns ? 'complete' : 'partial';
      case 'Quality Analysis':
        return data.overallQuality ? 'complete' : 'partial';
      default:
        return Object.keys(data).length > 0 ? 'partial' : 'missing';
    }
  };

  const actualStatus = getActualStatus();

  const getStatusColor = () => {
    switch (actualStatus) {
      case 'complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'missing': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIcon = () => {
    switch (actualStatus) {
      case 'complete': return '✅';
      case 'partial': return '⚠️';
      case 'missing': return '❌';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
          {getStatusIcon()} {actualStatus}
        </span>
      </div>
      <div className="text-sm text-gray-600">
        {data ? (
          <div className="space-y-1">
            {Object.entries(data).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="font-mono text-xs">
                  {typeof value === 'object' ? JSON.stringify(value).slice(0, 20) + '...' : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
}

import RepAnalysisEditor from './RepAnalysisEditor';
import PatternAnalysisEditor from './PatternAnalysisEditor';
import QualityAnalysisEditor from './QualityAnalysisEditor';
import ExerciseRulesViewer from './ExerciseRulesViewer';

// Workflow Step Component
interface WorkflowStepProps {
  step: number;
  currentStep: number;
  title: string;
  description: string;
  status: 'complete' | 'current' | 'pending';
  action?: React.ReactNode;
}

function WorkflowStep({ step, currentStep, title, description, status, action }: WorkflowStepProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'current': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'complete': return '✅';
      case 'current': return '🔄';
      case 'pending': return '⏳';
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-current">
          <span className="text-sm font-bold">{step}</span>
        </div>
        <div>
          <h5 className="font-semibold">{title}</h5>
          <p className="text-sm opacity-80">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{getStatusIcon()} {status}</span>
        {action}
      </div>
    </div>
  );
}
