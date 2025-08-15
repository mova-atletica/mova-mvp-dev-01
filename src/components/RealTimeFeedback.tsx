// Real-time Feedback Component for Live Exercise Guidance
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RealTimeAnalysisResult } from '../hooks/useRealTimeAnalysis_01';

interface RealTimeFeedbackProps {
  analysis: RealTimeAnalysisResult;
  exerciseType: string;
  isVisible: boolean;
}

export default function RealTimeFeedback({ analysis, exerciseType, isVisible }: RealTimeFeedbackProps) {
  if (!isVisible || !analysis) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'good':
        return 'text-green-500 bg-green-100 border-green-300';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'poor':
        return 'text-red-600 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'good':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          {/* Main Feedback Card */}
          <div className="bg-white rounded-lg shadow-lg border-2 overflow-hidden">
            {/* Header */}
            <div className={`px-4 py-3 border-b-2 ${getSeverityColor(analysis.severity)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getSeverityIcon(analysis.severity)}</span>
                  <span className="font-semibold">Real-time Feedback</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}%
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Feedback Message */}
              <div className="text-center">
                <p className="text-lg font-medium text-gray-800">
                  {analysis.feedback}
                </p>
                {analysis.confidence < 0.7 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Low confidence analysis
                  </p>
                )}
              </div>

              {/* Exercise Type Specific Display */}
              {exerciseType === 'repetition' && analysis.repCount !== undefined && (
                <RepetitionDisplay analysis={analysis} />
              )}

              {exerciseType === 'pose' && analysis.poseHoldDuration !== undefined && (
                <PoseDisplay analysis={analysis} />
              )}

              {exerciseType === 'flow' && (
                <FlowDisplay analysis={analysis} />
              )}

              {/* Metrics */}
              <MetricsDisplay analysis={analysis} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Repetition Exercise Display
function RepetitionDisplay({ analysis }: { analysis: RealTimeAnalysisResult }) {
  return (
    <div className="bg-blue-50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">Repetitions</p>
          <p className="text-2xl font-bold text-blue-600">{analysis.repCount || 0}</p>
        </div>
        {analysis.currentPhase && (
          <div className="text-right">
            <p className="text-sm font-medium text-blue-800">Phase</p>
            <p className="text-lg font-semibold text-blue-600 capitalize">
              {analysis.currentPhase}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Pose Exercise Display
function PoseDisplay({ analysis }: { analysis: RealTimeAnalysisResult }) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-purple-50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-purple-800">Hold Duration</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatDuration(analysis.poseHoldDuration || 0)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-purple-800">Status</p>
          <p className="text-lg font-semibold text-purple-600">
            {analysis.severity === 'good' ? 'Holding' : 'Adjusting'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Flow Exercise Display
function FlowDisplay({ analysis }: { analysis: RealTimeAnalysisResult }) {
  return (
    <div className="bg-green-50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">Flow Progress</p>
          <p className="text-2xl font-bold text-green-600">{analysis.score}%</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-green-800">Status</p>
          <p className="text-lg font-semibold text-green-600">In Progress</p>
        </div>
      </div>
    </div>
  );
}

// Metrics Display
function MetricsDisplay({ analysis }: { analysis: RealTimeAnalysisResult }) {
  const metrics = [
    {
      label: 'Angle Accuracy',
      value: Math.round(100 - analysis.metrics.angleDifference),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Pattern Match',
      value: Math.round(analysis.metrics.patternSimilarity * 100),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Stability',
      value: Math.round(analysis.metrics.stabilityScore),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Performance Metrics</p>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${metric.bgColor} rounded-lg p-2 text-center`}
          >
            <p className="text-xs font-medium text-gray-600">{metric.label}</p>
            <p className={`text-lg font-bold ${metric.color}`}>{metric.value}%</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Compact Feedback Component for smaller displays
export function CompactFeedback({ analysis, exerciseType }: { analysis: RealTimeAnalysisResult; exerciseType: string }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'good':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div className="bg-white rounded-full shadow-lg border-2 border-gray-200 p-3">
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className={`w-3 h-3 rounded-full ${getSeverityColor(analysis.severity)}`} />
          
          {/* Score */}
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}%
            </div>
            <div className="text-xs text-gray-500">
              {exerciseType === 'repetition' && analysis.repCount !== undefined && `${analysis.repCount} reps`}
              {exerciseType === 'pose' && analysis.poseHoldDuration !== undefined && 
                `${Math.floor((analysis.poseHoldDuration || 0) / 1000)}s`}
            </div>
          </div>
          
          {/* Feedback Icon */}
          <div className="text-lg">
            {getSeverityIcon(analysis.severity)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper functions
function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'good':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'poor':
      return '❌';
    default:
      return 'ℹ️';
  }
} 