"use client";

// Chart series color palette using CSS variables
const seriesColors = [
  'var(--results-chart-series-1)',
  'var(--results-chart-series-2)',
  'var(--results-chart-series-3)',
  'var(--results-chart-series-4)',
  'var(--results-chart-series-5)',
  'var(--results-chart-series-6)',
  'var(--results-chart-series-7)',
  'var(--results-chart-series-8)',
];

// Custom legend formatter for field/value hierarchy and value capping
function legendFormatter(value: any, entry: any) {
  // If value is a number, cap at 2 decimals
  let displayValue = value;
  if (typeof value === 'number') {
    displayValue = value.toFixed(2);
  }
  return (
    <span>
      <span style={{ fontSize: '9px', fontWeight: 700 }}>{entry?.dataKey || ''}</span>
      {typeof value !== 'undefined' && (
        <span style={{ fontSize: '12px', fontWeight: 300, marginLeft: 4 }}>{displayValue}</span>
      )}
    </span>
  );
}

// Custom Legend content renderer for field/value hierarchy and value capping
function CustomLegendContent({ payload, data }: any) {
  if (!payload || !data || data.length === 0) return null;
  // Get the latest data point
  const latest = data[data.length - 1];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {payload.map((entry: any, idx: number) => {
        const value = latest[entry.dataKey];
        let displayValue = value;
        if (typeof value === 'number') {
          displayValue = value.toFixed(2);
        }
        return (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: entry.color, borderRadius: 2, display: 'inline-block', marginRight: 6 }} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{entry.value}</span>
            <span style={{ fontSize: '13px', fontWeight: 400, marginLeft: 4 }}>{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}

import { useParams, useSearchParams } from "next/navigation";
import { useTheme } from '../../../contexts/ThemeContext';
import Link from "next/link";
import { useEffect, useState } from "react";
import { Exercise } from "../../../types";
import SideBySideVideoPlayer from "../../../components/SideBySideVideoPlayer";
import AssetGenerationModal from "../../../components/AssetGenerationModal";
import { advancedAnalysisService, AdvancedAnalysisResult } from "../../../lib/advancedAnalysisService";
import { 
  getTabsForExerciseType, 
  getChartOptionsForExerciseType, 
  getDefaultChartForExerciseType,
  shouldShowChartForExerciseType,
  getChartTitleForExerciseType
} from "../../../lib/exerciseTypeUtils";
import { 
  prepareAngleComparisonData, 
  prepareRadarData, 
  prepareJointScoresData,
  getMetricLabelsForExerciseType,
  getMetricsForExerciseType,
  prepareRepAngleComparisonData,
  prepareRepBoundaries,
  prepareRepPhases,
  getRepMetricDescriptions,
  prepareFlowSequenceData
} from "../../../lib/chartDataUtils";
import { 
  BaseAngleComparisonChart, 
  BaseRadarChart, 
  BaseJointAnalysisChart,
  RepAngleComparisonChart
} from "../../../components/charts";
import {
  Tooltip,
  ReferenceLine,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

import { useRef } from 'react';
import React from "react"; // Added missing import for React
import InfoTooltip from "../../../components/InfoTooltip";
import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { getAngleWithConfidence, getTrunkAngleWithConfidence } from '../../../lib/analysisUtils';

// Utility to calculate angle at point b (in degrees)
function getAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// Utility to calculate trunk angle
function getTrunkAngle(shoulder: { x: number; y: number }, hip: { x: number; y: number }) {
  const vertical = { x: shoulder.x, y: shoulder.y - 100 };
  return getAngle(vertical, shoulder, hip);
}

// Utility to compare angles and provide feedback
function compareAngles(current: number | null, reference: number | null, tolerance: number = 15): 'good' | 'warning' | 'poor' | null {
  if (current === null || reference === null) return null;
  
  const difference = Math.abs(current - reference);
  if (difference <= tolerance) return 'good';
  if (difference <= tolerance * 2) return 'warning';
  return 'poor';
}

// Calculate overall comparison results
function calculateComparison(userAngles: any, referenceAngles: any, jointsOfInterest: string[]) {
  // Add null checks for flow exercises
  if (!userAngles || !referenceAngles) {
    console.warn('Missing angle data for comparison calculation:', { userAngles: !!userAngles, referenceAngles: !!referenceAngles });
    return {
      overall: {
        score: 0,
        grade: 'N/A'
      }
    };
  }
  
  const results: any = {};
  let totalScore = 0;
  let totalComparisons = 0;
  
  jointsOfInterest.forEach(joint => {
    let userAngleArray: (number | null)[] = [];
    let refAngleArray: (number | null)[] = [];
    
    switch (joint) {
      case 'leftKnee':
        userAngleArray = userAngles.leftKneeAngles || [];
        refAngleArray = referenceAngles.leftKneeAngles || [];
        break;
      case 'rightKnee':
        userAngleArray = userAngles.rightKneeAngles || [];
        refAngleArray = referenceAngles.rightKneeAngles || [];
        break;
      case 'leftHip':
        userAngleArray = userAngles.leftHipAngles || [];
        refAngleArray = referenceAngles.leftHipAngles || [];
        break;
      case 'rightHip':
        userAngleArray = userAngles.rightHipAngles || [];
        refAngleArray = referenceAngles.rightHipAngles || [];
        break;
      case 'leftElbow':
        userAngleArray = userAngles.leftElbowAngles || [];
        refAngleArray = referenceAngles.leftElbowAngles || [];
        break;
      case 'rightElbow':
        userAngleArray = userAngles.rightElbowAngles || [];
        refAngleArray = referenceAngles.rightElbowAngles || [];
        break;
      case 'leftShoulder':
        userAngleArray = userAngles.leftShoulderAbdAngles || [];
        refAngleArray = referenceAngles.leftShoulderAbdAngles || [];
        break;
      case 'rightShoulder':
        userAngleArray = userAngles.rightShoulderAbdAngles || [];
        refAngleArray = referenceAngles.rightShoulderAbdAngles || [];
        break;
      case 'trunk':
        userAngleArray = userAngles.trunkAngles || [];
        refAngleArray = referenceAngles.trunkAngles || [];
        break;
    }
    
    // Calculate average difference
    let totalDifference = 0;
    let validComparisons = 0;
    
    for (let i = 0; i < Math.min(userAngleArray.length, refAngleArray.length); i++) {
      const userAngle = userAngleArray[i];
      const refAngle = refAngleArray[i];
      
      if (userAngle !== null && refAngle !== null) {
        totalDifference += Math.abs(userAngle - refAngle);
        validComparisons++;
      }
    }
    
    const avgDifference = validComparisons > 0 ? totalDifference / validComparisons : 0;
    const score = validComparisons > 0 ? Math.max(0, 100 - (avgDifference * 2)) : 0;
    
    results[joint] = {
      avgDifference: Math.round(avgDifference * 10) / 10,
      score: Math.round(score),
      validComparisons
    };
    
    totalScore += score;
    totalComparisons++;
  });
  
  results.overall = {
    score: totalComparisons > 0 ? Math.round(totalScore / totalComparisons) : 0,
    grade: totalComparisons > 0 ? 
      (totalScore / totalComparisons >= 90 ? 'A' :
       totalScore / totalComparisons >= 80 ? 'B' :
       totalScore / totalComparisons >= 70 ? 'C' :
       totalScore / totalComparisons >= 60 ? 'D' : 'F') : 'N/A'
  };
  
  return results;
}

function ResultsTabs({
  comparisonResults,
  advancedAnalysis,
  exerciseTitle,
  userAngles,
  referenceAngles,
  jointsOfInterest,
  isLoadingAdvanced,
  onRetryAdvanced,
  poses,
  videoUrl,
  currentFrame,
  onSeekFrame,
  enhancedSessionStats,
  exerciseType = 'repetition',
  repAnalysis = null,
  poseAnalysis = null,
  onResetAnalysis
}: any) {
  const [activeTab, setActiveTab] = useState<'charts' | 'feedback' | 'summary'>('summary');
  
  // Chart selection states - use exercise type to determine default
  const [selectedMainChart, setSelectedMainChart] = useState<string>(getDefaultChartForExerciseType(exerciseType));
  
  // Chart options - use exercise type to determine available charts
  const chartOptions = getChartOptionsForExerciseType(exerciseType);
  


  // Prepare rep boundary and phase data using unified rep counting
  const userFrameData = poses?.filter((pose: any) => pose !== null && pose !== undefined)?.map((pose: any, index: number) => ({
    frameIndex: index,
    time: index / 30, // Assume 30fps
    angles: pose?.angles || {}
  })) || [];
  
  // Create exercise object from available data for rep counting
  const exerciseForRepCounting = {
    exerciseType,
    jointsOfInterest,
    repAnalysis
  };
  
  // Use unified rep counting from advanced analysis if available, otherwise calculate it
  let repBoundaries = [];
  let repPhases = [];
  let unifiedRepCount = 0;
  
  // First, try to use unified rep analysis from advanced analysis result
  if (advancedAnalysis?.unified_rep_analysis) {
    unifiedRepCount = advancedAnalysis.unified_rep_analysis.rep_count;
    repBoundaries = advancedAnalysis.unified_rep_analysis.rep_boundaries;
    repPhases = advancedAnalysis.unified_rep_analysis.rep_phases;
    console.log('🎯 Using unified rep data from advanced analysis:', {
      repCount: unifiedRepCount,
      repBoundariesCount: repBoundaries.length,
      repPhasesCount: repPhases.length
    });
  } else if (userFrameData.length > 0 && exerciseForRepCounting.repAnalysis) {
    // Fallback: calculate unified rep counting on the fly
    try {
      const { analyzeRepetitions } = require('../../../lib/repCountingUtils');
      const unifiedRepAnalysis = analyzeRepetitions(userFrameData, exerciseForRepCounting);
      repBoundaries = unifiedRepAnalysis.repBoundaries;
      repPhases = unifiedRepAnalysis.repPhases;
      unifiedRepCount = unifiedRepAnalysis.repCount;
      console.log('🎯 Charts using calculated unified rep data:', {
        repCount: unifiedRepCount,
        repBoundariesCount: repBoundaries.length,
        repPhasesCount: repPhases.length
      });
    } catch (error) {
      console.warn('Failed to calculate unified rep data for charts:', error);
      // Fallback to old method
      repBoundaries = prepareRepBoundaries(repAnalysis);
      repPhases = prepareRepPhases(repAnalysis);
    }
  } else {
    // Fallback to old method
    repBoundaries = prepareRepBoundaries(repAnalysis);
    repPhases = prepareRepPhases(repAnalysis);
  }
  


  // Prepare data for angle comparison chart using utility function
  const getAngleComparisonData = () => {
    // Add null checks for userAngles and referenceAngles
    if (!userAngles || !referenceAngles) {
      console.warn('Missing angle data for chart preparation:', { userAngles: !!userAngles, referenceAngles: !!referenceAngles });
      return [];
    }
    
    if (exerciseType === 'repetition' && repBoundaries.length > 0) {
      return prepareRepAngleComparisonData(userAngles, referenceAngles, jointsOfInterest, repBoundaries, repPhases);
    }
    return prepareAngleComparisonData(userAngles, referenceAngles, jointsOfInterest);
  };

  // Prepare data for flow sequence timeline chart
  const getFlowSequenceData = () => {
    if (exerciseType !== 'flow') {
      return [];
    }
    
    // For flow exercises, use the same angle comparison data as other exercises
    // This shows actual joint angles over time for user vs reference
    return getAngleComparisonData();
  };

  // Prepare data for flow analysis bar chart (DTW and Cosine scores)
  const getFlowAnalysisData = () => {
    if (exerciseType !== 'flow' || !advancedAnalysis?.flow_analysis) {
      return [];
    }

    return jointsOfInterest.map((joint: string) => ({
      joint: joint.replace(/([A-Z])/g, ' $1').trim(),
      dtw_score: advancedAnalysis.flow_analysis.dtw_scores[joint]?.score || 0,
      cosine_score: advancedAnalysis.flow_analysis.cosine_scores[joint]?.score || 0,
    }));
  };

  // Handler for chart click/seek
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      if (onSeekFrame) onSeekFrame(data.activeLabel);
    }
  };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  // Prepare data for Radar Chart using utility function
  const getRadarData = () => {
    return prepareRadarData(advancedAnalysis, exerciseType);
  };

  // Prepare data for Bar Chart (Joint Analysis) using utility function
  const getJointScoresData = () => {
    const data = prepareJointScoresData(advancedAnalysis, jointsOfInterest, exerciseType);
    if (exerciseType === 'pose') {
      console.log('🔍 Joint scores data for pose exercise:', {
        exerciseType,
        dataLength: data.length,
        sampleData: data[0],
        allData: data,
        advancedAnalysisKeys: advancedAnalysis ? Object.keys(advancedAnalysis) : null,
        poseAnalysisKeys: advancedAnalysis?.pose_analysis ? Object.keys(advancedAnalysis.pose_analysis) : null,
        jointAccuracyKeys: advancedAnalysis?.pose_analysis?.joint_accuracy ? Object.keys(advancedAnalysis.pose_analysis.joint_accuracy) : null
      });
    }
    return data;
  };

  // Prepare data for Hold Duration Analysis chart
  const getHoldDurationData = () => {
    if (exerciseType !== 'pose' || !advancedAnalysis?.pose_analysis?.hold_periods) {
      return [];
    }

    const holdPeriods = advancedAnalysis.pose_analysis.hold_periods;
    const jointHoldData: { [joint: string]: any } = {};

    // Group hold periods by joint
    holdPeriods.forEach((period: any) => {
      const joint = period.joint;
      if (!jointHoldData[joint]) {
        jointHoldData[joint] = {
          total_duration: 0,
          hold_count: 0,
          avg_duration: 0,
          max_duration: 0,
          accuracy: 0
        };
      }
      
      jointHoldData[joint].total_duration += period.duration;
      jointHoldData[joint].hold_count += 1;
      jointHoldData[joint].max_duration = Math.max(jointHoldData[joint].max_duration, period.duration);
      jointHoldData[joint].accuracy += period.accuracy;
    });

    // Calculate averages and format data
    return jointsOfInterest.map((joint: string) => {
      const data = jointHoldData[joint] || {
        total_duration: 0,
        hold_count: 0,
        avg_duration: 0,
        max_duration: 0,
        accuracy: 0
      };

      return {
        joint: joint.replace(/([A-Z])/g, ' $1').trim(),
        total_duration: data.total_duration,
        hold_count: data.hold_count,
        avg_duration: data.hold_count > 0 ? data.total_duration / data.hold_count : 0,
        max_duration: data.max_duration,
        accuracy: data.hold_count > 0 ? data.accuracy / data.hold_count : 0
      };
    });
  };





  // Helper function to get properly typed metric labels
  const getTypedMetricLabels = () => {
    const labels = getMetricLabelsForExerciseType(exerciseType);
    return Object.fromEntries(
      Object.entries(labels).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;
  };

  // Function to render selected charts using base components
  const renderSelectedCharts = () => {
    const charts = [];
    switch (selectedMainChart) {
      case 'angle-comparison':
        if (exerciseType === 'repetition' && repBoundaries.length > 0) {
          charts.push(
            <RepAngleComparisonChart
              key="rep-angle-comparison"
              data={getAngleComparisonData()}
              jointsOfInterest={jointsOfInterest}
              currentFrame={currentFrame}
              onChartClick={handleChartClick}
              title="Repetition Angle Comparison Over Time"
              showReference={true}
              repBoundaries={repBoundaries}
              repPhases={repPhases}
              showRepBoundaries={true}
              showRepPhases={true}
              showRepCount={true}
            />
          );
        } else {
          charts.push(
            <BaseAngleComparisonChart
              key="angle-comparison"
              data={getAngleComparisonData()}
              jointsOfInterest={jointsOfInterest}
              currentFrame={currentFrame}
              onChartClick={handleChartClick}
              title="Angle Comparison Over Time"
              showReference={true}
              showRepBoundaries={false}
            />
          );
        }
        break;

      case 'joint-analysis':
        charts.push(
          <BaseJointAnalysisChart
            key="joint-analysis"
            data={getJointScoresData()}
            title={exerciseType === 'repetition' ? "Repetition Joint Analysis" : "Advanced Joint Analysis"}
            metrics={getMetricsForExerciseType(exerciseType)}
            metricLabels={getTypedMetricLabels()}
          />
        );
        break;

      case 'pose-accuracy':
        charts.push(
          <BaseJointAnalysisChart
            key="pose-accuracy"
            data={getJointScoresData()}
            title="Pose Accuracy Analysis"
            metrics={getMetricsForExerciseType(exerciseType)}
            metricLabels={getTypedMetricLabels()}
          />
        );
        break;

      case 'hold-duration':
        charts.push(
          <BaseJointAnalysisChart
            key="hold-duration"
            data={getHoldDurationData()}
            title="Hold Duration Analysis"
            metrics={['total_duration', 'avg_duration', 'max_duration', 'accuracy']}
            metricLabels={{
              total_duration: 'Total Duration (s)',
              avg_duration: 'Avg Duration (s)',
              max_duration: 'Max Duration (s)',
              accuracy: 'Hold Accuracy (%)'
            }}
          />
        );
        break;

      case 'pose-timeline':
        // For now, use angle comparison chart for pose timeline
        charts.push(
          <BaseAngleComparisonChart
            key="pose-timeline"
            data={getAngleComparisonData()}
            jointsOfInterest={jointsOfInterest}
            currentFrame={currentFrame}
            onChartClick={handleChartClick}
            title="Pose Timeline"
            showReference={false}
            showRepBoundaries={false}
            holdPeriods={advancedAnalysis?.pose_analysis?.hold_periods || []}
          />
        );
        break;

      case 'flow-sequence':
        charts.push(
          <BaseAngleComparisonChart
            key="flow-sequence"
            data={getFlowSequenceData()}
            jointsOfInterest={jointsOfInterest}
            currentFrame={currentFrame}
            onChartClick={handleChartClick}
            title="Flow Sequence Timeline"
            showReference={true}
            showRepBoundaries={false}
            holdPeriods={[]}
          />
        );
        break;

      case 'flow-analysis':
        charts.push(
          <BaseJointAnalysisChart
            key="flow-analysis"
            data={getFlowAnalysisData()}
            title="Flow Analysis (DTW & Cosine Scores)"
            metrics={['dtw_score', 'cosine_score']}
            metricLabels={{
              dtw_score: 'DTW Score',
              cosine_score: 'Cosine Score'
            }}
          />
        );
        break;

      case 'radar':
        charts.push(
          <BaseRadarChart
            key="radar"
            data={getRadarData()}
            title={getChartTitleForExerciseType('radar', exerciseType)}
          />
        );
        break;
    }
    return charts;
  };

  // Chart dropdown open state
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setChartDropdownOpen(false);
      }
    }

    if (chartDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [chartDropdownOpen]);

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="flex flex-row flex-wrap items-center justify-start ml-4 mr-0 mb-0"
        style={{
          padding: 6,
          gap: 6,
          background: 'transparent',
          border: '1px solid var(--results-tabs-border-color)',
          borderRadius: 6,
        }}
      >
        <button
          type="button"
          style={{
            borderRadius: 6,
            padding: '3px 6px',
            marginRight: 6,
            background: activeTab === 'summary' ? 'var(--results-tab-bg-active)' : 'var(--results-tab-bg-inactive)',
            color: activeTab === 'summary' ? 'var(--results-tab-text-active)' : 'var(--results-tab-text-inactive)',
            border: `1.5px solid ${activeTab === 'summary' ? 'var(--results-tab-border-active)' : 'var(--results-tab-border-inactive)'}`,
            //fontWeight: 600,
            //fontSize: 12,
            fontSize: activeTab === 'feedback' ? 12 : 12,
            fontWeight: activeTab === 'feedback' ? 600 : 500,
            transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            cursor: 'pointer',
            boxShadow: activeTab === 'summary' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          }}
          onMouseOver={e => {
            if (activeTab !== 'summary') {
              e.currentTarget.style.background = 'var(--results-tab-hover-bg)';
              e.currentTarget.style.color = 'var(--results-tab-hover-text)';
              e.currentTarget.style.border = '1.5px solid var(--results-tab-hover-border)';
            }
          }}
          onMouseOut={e => {
            if (activeTab !== 'summary') {
              e.currentTarget.style.background = 'var(--results-tab-bg-inactive)';
              e.currentTarget.style.color = 'var(--results-tab-text-inactive)';
              e.currentTarget.style.border = '1.5px solid var(--results-tab-border-inactive)';
            }
          }}
          onClick={() => setActiveTab('summary')}
        >
          {getTabsForExerciseType(exerciseType)[0]}
        </button>
        <button
          type="button"
          style={{
            borderRadius: 6,
            padding: '3px 6px',
            marginRight: 6,
            background: activeTab === 'charts' ? 'var(--results-tab-bg-active)' : 'var(--results-tab-bg-inactive)',
            color: activeTab === 'charts' ? 'var(--results-tab-text-active)' : 'var(--results-tab-text-inactive)',
            border: `1.5px solid ${activeTab === 'charts' ? 'var(--results-tab-border-active)' : 'var(--results-tab-border-inactive)'}`,
            //fontWeight: 600,
            //fontSize: 12,
            fontSize: activeTab === 'feedback' ? 12 : 12,
            fontWeight: activeTab === 'feedback' ? 600 : 500,
            transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            cursor: 'pointer',
            boxShadow: activeTab === 'charts' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          }}
          onMouseOver={e => {
            if (activeTab !== 'charts') {
              e.currentTarget.style.background = 'var(--results-tab-hover-bg)';
              e.currentTarget.style.color = 'var(--results-tab-hover-text)';
              e.currentTarget.style.border = '1.5px solid var(--results-tab-hover-border)';
            }
          }}
          onMouseOut={e => {
            if (activeTab !== 'charts') {
              e.currentTarget.style.background = 'var(--results-tab-bg-inactive)';
              e.currentTarget.style.color = 'var(--results-tab-text-inactive)';
              e.currentTarget.style.border = '1.5px solid var(--results-tab-border-inactive)';
            }
          }}
          onClick={() => setActiveTab('charts')}
        >
          {getTabsForExerciseType(exerciseType)[1]}
        </button>
        <button
          type="button"
          style={{
            borderRadius: 6,
            padding: '3px 6px',
            marginRight: 6,
            background: activeTab === 'feedback' ? 'var(--results-tab-bg-active)' : 'var(--results-tab-bg-inactive)',
            color: activeTab === 'feedback' ? 'var(--results-tab-text-active)' : 'var(--results-tab-text-inactive)',
            border: `1.5px solid ${activeTab === 'feedback' ? 'var(--results-tab-border-active)' : 'var(--results-tab-border-inactive)'}`,
            //fontWeight: 600,
            //fontSize: 12,
            fontSize: activeTab === 'feedback' ? 12 : 12,
            fontWeight: activeTab === 'feedback' ? 600 : 500,
            transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
            cursor: 'pointer',
            boxShadow: activeTab === 'feedback' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          }}
          onMouseOver={e => {
            if (activeTab !== 'feedback') {
              e.currentTarget.style.background = 'var(--results-tab-hover-bg)';
              e.currentTarget.style.color = 'var(--results-tab-hover-text)';
              e.currentTarget.style.border = '1.5px solid var(--results-tab-hover-border)';
            }
          }}
                      onMouseOut={e => {
              if (activeTab !== 'feedback') {
                e.currentTarget.style.background = 'var(--results-tab-bg-inactive)';
                e.currentTarget.style.color = 'var(--results-tab-text-inactive)';
                e.currentTarget.style.border = '1.5px solid var(--results-tab-border-inactive)';
              }
            }}
          onClick={() => setActiveTab('feedback')}
        >
          {getTabsForExerciseType(exerciseType)[2]}
        </button>
      </div>
      <div className="space-y-4 p-0 mt-2 ml-2 w-full">
        {activeTab === 'charts' && (
          <div className="space-y-4 p-2">
            {/* Chart Selection Controls */}
            <div className="bg-transparent w-full rounded-lg shadow p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Chart Dropdown */}
                <div ref={dropdownRef} className="flex-1" style={{ position: 'relative', minWidth: '160px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 500, color: 'var(--vp-label)', marginBottom: '4px' }}>
                    Chart
                  </div>
                  <button
                    className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
                    style={{
                      border: '1px solid var(--vp-dropdown-border, #e5e7eb)',
                      color: 'var(--vp-dropdown-label, #353839)',
                      background: 'var(--vp-dropdown-bg, #fff)',
                      fontWeight: 500,
                      marginBottom: '3px',
                      borderRadius: '3px',
                      transition: 'color 0.2s, border 0.2s, background 0.2s',
                    }}
                    onClick={() => setChartDropdownOpen((open) => !open)}
                    type="button"
                  >
                    {chartOptions.find(opt => opt.value === selectedMainChart)?.label}
                    <span style={{ 
                      marginLeft: '8px', 
                      display: 'flex', 
                      alignItems: 'center',
                      transform: chartDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease-in-out'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 8L10 12L14 8" stroke="var(--vp-dropdown-chevron, #353839)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </button>
                  {chartDropdownOpen && (
                    <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 20, minWidth: '160px', width: 'max-content', background: 'var(--vp-dropdown-bg)', border: '1px solid var(--vp-dropdown-border)', boxShadow: 'var(--vp-dropdown-shadow)' }} className="rounded-lg p-2 vp-dropdown-anim open">
                      {chartOptions.map(opt => (
                        <label
                          key={opt.value}
                          className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                          style={{ background: 'var(--vp-dropdown-item-bg)', color: 'var(--vp-dropdown-item-text)', whiteSpace: 'nowrap' }}
                          onMouseOver={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-hover-bg)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'var(--vp-dropdown-item-bg)')}
                          onClick={() => { setSelectedMainChart(opt.value as any); setChartDropdownOpen(false); }}
                        >
                          <input
                            type="radio"
                            checked={selectedMainChart === opt.value}
                            readOnly
                            style={{ marginRight: '9px' }}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Render selected charts */}
            {renderSelectedCharts()}
          </div>
        )}
        {activeTab === 'feedback' && (
          <div className="space-y-4 p-2 ml-0 mr-0 w-full">
            {/* Overall Feedback */}
            {exerciseType !== 'flow' && (
            <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <h3 style={{ fontSize: 21, fontWeight: 300, color: 'var(--results-summary-title)' }}>Overall Feedback</h3>
                <InfoTooltip content="Your overall performance score and grade based on how well your joint angles matched the reference video. The advanced score uses more sophisticated analysis methods.">
                  <span
                    style={{
                      color: 'var(--results-info-icon)',
                      cursor: 'help',
                      transition: 'color 0.18s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginLeft: 6,
                      fontSize: '1em',
                      verticalAlign: 'middle',
                    }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--results-info-icon-hover)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--results-info-icon)')}
                  >
                    ⓘ
                  </span>
                </InfoTooltip>
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold mb-2">
                    {comparisonResults?.overall?.score ?? 'N/A'}%
                  </div>
                  <div className="text-lg font-semibold mb-1">
                    Grade: {comparisonResults?.overall?.grade ?? 'N/A'}
                  </div>
                  {advancedAnalysis?.overall_score && (
                    <div className="flex items-center gap-2 text-md text-onyx-30 mt-2">
                      <span>Advanced Score:</span>
                      <InfoTooltip content="A more sophisticated analysis that considers movement patterns, timing, and overall form quality beyond just angle matching.">
                        <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                      </InfoTooltip>
                      <span>{Math.round(advancedAnalysis.overall_score)}%</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 text-md text-onyx-30 mb-2">
                    <span>Joints Analyzed:</span>
                    <InfoTooltip content="Number of joints that were tracked and compared to the reference video.">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                    </InfoTooltip>
                    <span>{jointsOfInterest?.length ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-md text-onyx-30 mb-2">
                    <span>Best Joint:</span>
                    <InfoTooltip content="The joint that most closely matched the reference video's movement pattern.">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                    </InfoTooltip>
                    <span>{jointsOfInterest && comparisonResults ? jointsOfInterest.reduce((best: string, joint: string) => {
                      const currentScore = comparisonResults?.[joint]?.score || 0;
                      const bestScore = comparisonResults?.[best]?.score || 0;
                      return currentScore > bestScore ? joint : best;
                    }, jointsOfInterest[0])?.replace(/([A-Z])/g, ' $1').trim() : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-md text-onyx-30">
                    <span>Needs Work:</span>
                    <InfoTooltip content="The joint that showed the biggest difference from the reference video and may need the most attention.">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                    </InfoTooltip>
                    <span>{jointsOfInterest && comparisonResults ? jointsOfInterest.reduce((worst: string, joint: string) => {
                      const currentScore = comparisonResults?.[joint]?.score || 0;
                      const worstScore = comparisonResults?.[worst]?.score || 0;
                      return currentScore < worstScore ? joint : worst;
                    }, jointsOfInterest[0])?.replace(/([A-Z])/g, ' $1').trim() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            )}
            {/* Joint-by-Joint Feedback */}
            <div className="bg-var(--results-summary-bg) rounded-lg shadow p-6" style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <h3 style={{ fontSize: 21, fontWeight: 300, color: 'var(--results-summary-title)' }}>Joint-by-Joint Feedback</h3>
                <InfoTooltip content="Detailed feedback for each joint showing your score and average angle difference from the reference. Green scores (80%+) are excellent, yellow (60-79%) need improvement, red (below 60%) need significant work.">
                  <span
                    style={{
                      color: 'var(--results-info-icon)',
                      cursor: 'help',
                      transition: 'color 0.18s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginLeft: 6,
                      fontSize: '1em',
                      verticalAlign: 'middle',
                    }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--results-info-icon-hover)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--results-info-icon)')}
                  >
                    ⓘ
                  </span>
                </InfoTooltip>
              </div>
              {/* Helper function to match suggestions to joints */}
              {(() => {
                const getJointSuggestions = (jointName: string) => {
                  if (!advancedAnalysis?.improvement_suggestions) return [];
                  
                  const jointDisplayName = jointName.replace(/([A-Z])/g, ' $1').trim();
                  const jointShortName = jointName.replace('Angles', '');
                  
                  return advancedAnalysis.improvement_suggestions.filter((suggestion: string) => 
                    suggestion.toLowerCase().includes(jointDisplayName.toLowerCase()) ||
                    suggestion.toLowerCase().includes(jointShortName.toLowerCase())
                  );
                };

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jointsOfInterest?.map((joint: string) => {
                      const jointData = comparisonResults?.[joint];
                      const score = jointData?.score || 0;
                      const avgDiff = jointData?.avgDifference || 0;
                      // Use unified rep analysis data instead of old repetition_analysis
                      const unifiedRepData = advancedAnalysis?.unified_rep_analysis;
                      const repData = {
                        avg_rom: advancedAnalysis?.joint_analysis?.[joint]?.rom_score || 0
                      };
                      const jointSuggestions = getJointSuggestions(joint);
                      
                      // For flow exercises, use DTW and Cosine scores
                      const flowDtwScore = exerciseType === 'flow' ? advancedAnalysis?.flow_analysis?.dtw_scores?.[joint]?.score || 0 : 0;
                      const flowCosineScore = exerciseType === 'flow' ? advancedAnalysis?.flow_analysis?.cosine_scores?.[joint]?.score || 0 : 0;
                      
                      return (
                        <div key={joint} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-onyx-10 mb-2">
                            {joint.replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                          <div className="space-y-2">
                            {exerciseType === 'flow' ? (
                              <>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-onyx-30">DTW Score:</span>
                                    <InfoTooltip content="Dynamic Time Warping score measuring sequence alignment with reference. Higher is better."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                                  </div>
                                  <span className={`font-bold ${flowDtwScore >= 80 ? 'text-green-600' : flowDtwScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{Math.round(flowDtwScore)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-onyx-30">Cosine Score:</span>
                                    <InfoTooltip content="Cosine similarity score measuring pattern matching with reference. Higher is better."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                                  </div>
                                  <span className={`font-bold ${flowCosineScore >= 80 ? 'text-green-600' : flowCosineScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{Math.round(flowCosineScore)}%</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-onyx-30">Score:</span>
                                    <InfoTooltip content="Percentage accuracy of your joint angles compared to the reference video. Higher is better."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                                  </div>
                                  <span className={`font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-onyx-30">Avg Difference:</span>
                                    <InfoTooltip content="Average difference in degrees between your joint angles and the reference video. Lower is better." />
                                  </div>
                                  <span className="font-medium">{typeof avgDiff === 'number' ? avgDiff.toFixed(1) : '0.0'}°</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-onyx-30">Avg ROM:</span>
                                    <InfoTooltip content="Average range of motion achieved during each repetition."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                                  </div>
                                  <span className="font-medium">{repData && typeof repData.avg_rom === 'number' ? repData.avg_rom.toFixed(1) + '°' : 'N/A'}</span>
                                </div>
                              </>
                            )}
                            
                            {/* Joint-specific feedback suggestions */}
                            {exerciseType !== 'flow' && jointSuggestions.length > 0 && (
                              <div className="mt-4" style={{ padding: 6, borderWidth: '0px', borderRadius: 6, borderColor: 'var(--results-summary-border)' }}>
                                <div className="flex items-center gap-1 mb-2">
                                  <span className="text-sm font-medium" style={{ color: 'var(--results-chart-series-1)' }}>Suggestions:</span>
                                </div>
                                <div className="space-y-1">
                                  {jointSuggestions.map((suggestion: string, idx: number) => (
                                    <div key={idx} className="text-xs leading-relaxed" style={{ color: 'var(--results-summary-text)' }}>
                                      • {suggestion}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        )}
        {activeTab === 'summary' && (
          <SessionSummaryTab
            basicComparison={comparisonResults}
            advancedAnalysis={advancedAnalysis}
            exerciseTitle={exerciseTitle}
            userAngles={userAngles}
            referenceAngles={referenceAngles}
            jointsOfInterest={jointsOfInterest}
            poses={poses}
            videoUrl={videoUrl}
            enhancedSessionStats={enhancedSessionStats}
            exerciseType={exerciseType}
            repAnalysis={repAnalysis}
            poseAnalysis={poseAnalysis}
            unifiedRepCount={unifiedRepCount}
            onResetAnalysis={onResetAnalysis}
          />
        )}
      </div>
    </div>
  );
}

// Add SessionSummaryTab implementation (moved and adapted from AdvancedResultsDisplay)
function SessionSummaryTab({ 
  basicComparison, 
  advancedAnalysis, 
  exerciseTitle, 
  userAngles, 
  referenceAngles, 
  jointsOfInterest, 
  poses, 
  videoUrl,
  enhancedSessionStats, // Add enhanced session stats prop
  exerciseType = 'repetition',
  repAnalysis = null,
  poseAnalysis = null,
  onResetAnalysis,
  unifiedRepCount = 0
}: any) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<{ [key: string]: any }>({});
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Use the unified rep count passed from the parent component
  
  // Calculate session stats with enhanced real-time analysis data
  const sessionStats = {
    overallScore: exerciseType === 'pose' 
      ? (advancedAnalysis?.pose_analysis?.overall_accuracy || basicComparison?.overall?.score || 0)
      : exerciseType === 'flow'
      ? (advancedAnalysis?.flow_analysis?.overall_flow_score || basicComparison?.overall?.score || 0)
      : (basicComparison?.overall?.score || 0),
    grade: exerciseType === 'pose'
      ? (advancedAnalysis?.grade || basicComparison?.overall?.grade || 'N/A')
      : exerciseType === 'flow'
      ? (advancedAnalysis?.grade || basicComparison?.overall?.grade || 'N/A')
      : (basicComparison?.overall?.grade || 'N/A'),
    totalJoints: jointsOfInterest.length,
    bestJoint: exerciseType === 'pose'
      ? jointsOfInterest.reduce((best: string, joint: string) => {
          const currentScore = advancedAnalysis?.pose_analysis?.joint_accuracy?.[joint]?.accuracy_score || 0;
          const bestScore = advancedAnalysis?.pose_analysis?.joint_accuracy?.[best]?.accuracy_score || 0;
          return currentScore > bestScore ? joint : best;
        }, jointsOfInterest[0])
      : exerciseType === 'flow'
      ? jointsOfInterest.reduce((best: string, joint: string) => {
          const currentScore = advancedAnalysis?.flow_analysis?.dtw_scores?.[joint]?.score || 0;
          const bestScore = advancedAnalysis?.flow_analysis?.dtw_scores?.[best]?.score || 0;
          return currentScore > bestScore ? joint : best;
        }, jointsOfInterest[0])
      : jointsOfInterest.reduce((best: string, joint: string) => {
          const currentScore = basicComparison?.[joint]?.score || 0;
          const bestScore = basicComparison?.[best]?.score || 0;
          return currentScore > bestScore ? joint : best;
        }, jointsOfInterest[0]),
    worstJoint: exerciseType === 'pose'
      ? jointsOfInterest.reduce((worst: string, joint: string) => {
          const currentScore = advancedAnalysis?.pose_analysis?.joint_accuracy?.[joint]?.accuracy_score || 0;
          const worstScore = advancedAnalysis?.pose_analysis?.joint_accuracy?.[worst]?.accuracy_score || 0;
          return currentScore < worstScore ? joint : worst;
        }, jointsOfInterest[0])
      : exerciseType === 'flow'
      ? jointsOfInterest.reduce((worst: string, joint: string) => {
          const currentScore = advancedAnalysis?.flow_analysis?.dtw_scores?.[joint]?.score || 0;
          const worstScore = advancedAnalysis?.flow_analysis?.dtw_scores?.[worst]?.score || 0;
          return currentScore < worstScore ? joint : worst;
        }, jointsOfInterest[0])
      : jointsOfInterest.reduce((worst: string, joint: string) => {
          const currentScore = basicComparison?.[joint]?.score || 0;
          const worstScore = basicComparison?.[worst]?.score || 0;
          return currentScore < worstScore ? joint : worst;
        }, jointsOfInterest[0]),
    advancedScore: advancedAnalysis?.overall_score || 0,
    balanceScore: exerciseType === 'flow' ? 0 : advancedAnalysis?.balance_metrics?.stability_score || 0,
    repCount: (() => {
      // For pose exercises, return hold duration instead of rep count
      if (exerciseType === 'pose') {
        const holdDuration = advancedAnalysis?.pose_analysis?.hold_periods?.reduce((total: number, period: any) => total + period.duration, 0) || 0;
        console.log('🎯 Pose exercise - total hold duration:', holdDuration);
        return holdDuration;
      }
      
      // For flow exercises, return flow sequence score instead of rep count
      if (exerciseType === 'flow') {
        const flowScore = advancedAnalysis?.flow_analysis?.overall_flow_score || 0;
        console.log('🌊 Flow exercise - overall flow score:', flowScore);
        return flowScore;
      }
      
      // First, try to use unified rep analysis from advanced analysis
      if (advancedAnalysis?.unified_rep_analysis?.rep_count) {
        console.log('🎯 Using unified rep count from advanced analysis:', advancedAnalysis.unified_rep_analysis.rep_count);
        return advancedAnalysis.unified_rep_analysis.rep_count;
      }
      
      // Fallback to unified rep count passed as prop
      if (unifiedRepCount > 0) {
        console.log('🎯 Using unified rep count from prop:', unifiedRepCount);
        return unifiedRepCount;
      }
      
      // Final fallback to old repetition analysis
      const fallbackCount = advancedAnalysis ? 
        Object.values(advancedAnalysis.repetition_analysis || {})
          .reduce((sum: number, analysis: any) => sum + (analysis.rep_count || 0), 0) : 0;
      
      console.log('🎯 Using fallback rep count:', fallbackCount);
      return fallbackCount;
    })(),
    // Enhanced real-time analysis stats
    realTimeAverageScore: enhancedSessionStats?.averageScore || 0,
    realTimeFormConsistency: enhancedSessionStats?.formConsistency || 0,
    realTimeImprovementTrend: enhancedSessionStats?.improvementTrend || 0,
    timeInGoodForm: enhancedSessionStats?.timeInGoodForm || 0,
    timeInWarningForm: enhancedSessionStats?.timeInWarningForm || 0,
    timeInPoorForm: enhancedSessionStats?.timeInPoorForm || 0,
    bestRealTimeFrame: enhancedSessionStats?.bestFrame || null,
    worstRealTimeFrame: enhancedSessionStats?.worstFrame || null,
    jointPerformance: enhancedSessionStats?.jointPerformance || {}
  };

  const assetTypes = [
    {
      id: 'muybridge',
      name: 'Muybridge Sequence',
      description: 'Grid of key frames with pose overlays',
      icon: '🎬',
      preview: 'Grid layout of 4-8 key frames'
    },
    {
      id: 'motion-trail',
      name: 'Motion Trail Video',
      description: 'Animated skeleton with trailing effect',
      icon: '🌊',
      preview: 'Short video with ghost trail effect'
    },
    {
      id: 'composite',
      name: 'Composite Image',
      description: 'All poses stacked with transparency',
      icon: '🎭',
      preview: 'Single image showing full range of motion'
    },
    {
      id: 'geometric',
      name: 'Geometric Overlay',
      description: 'Artistic overlays with golden ratios',
      icon: '✨',
      preview: 'Key frame with geometric patterns'
    },
    {
      id: 'summary-card',
      name: 'Session Summary Card',
      description: 'Trading card style with stats',
      icon: '🏆',
      preview: 'Card with best pose and performance stats'
    }
  ];

  // Placeholder asset generation logic
  const generateAsset = async (assetType: string) => {
    setIsGenerating(true);
    setSelectedAsset(assetType);
    setTimeout(() => {
      setGeneratedAssets(prev => ({ ...prev, [assetType]: { data: '#', filename: `${assetType}.png`, mimeType: 'image/png' } }));
      setIsGenerating(false);
    }, 1000);
  };

  const downloadAsset = (assetType: string) => {
    alert(`Download ${assetType} (placeholder)`);
  };

  const shareAsset = async (assetType: string) => {
    alert(`Share ${assetType} (placeholder)`);
  };

  const downloadAllAssets = async () => {
    alert('Download all assets (placeholder)');
  };

  // Utility to convert poses to CSV
  function posesToCSV(poses: any[]): string {
    if (!poses || poses.length === 0) return '';
    // Assume each pose has a 'keypoints' array with { name, x, y, score }
    const headers = ['frame', 'keypoint_name', 'x', 'y', 'score'];
    let csv = headers.join(',') + '\n';
    poses.forEach((pose, frameIdx) => {
      const keypoints = pose.keypoints || pose;
      if (Array.isArray(keypoints)) {
        keypoints.forEach((kp: any) => {
          const name = kp.name || kp.part || '';
          const x = kp.x ?? kp.position?.x ?? '';
          const y = kp.y ?? kp.position?.y ?? '';
          const score = kp.score ?? '';
          csv += `${frameIdx + 1},${name},${x},${y},${score}\n`;
        });
      }
    });
    return csv;
  }

  // Replace shareSession with downloadMotionData
  const downloadMotionData = () => {
    if (!poses || poses.length === 0) return;
    const csv = posesToCSV(poses);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'motion_keypoints.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-2 ml-0 mr-0 w-full">
      {/* Session Summary Card */}
      <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 0 }}>
          <h3 style={{ fontSize: 21, fontWeight: 300, marginBottom: 0, color: 'var(--results-summary-title)' }}>Motion Summary</h3>
          <InfoTooltip content="Overview analysis of your body's movements, with key performance metrics and highlights.">
            <span
              style={{
                color: 'var(--results-info-icon)',
                cursor: 'help',
                transition: 'color 0.18s',
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: 6,
                fontSize: '1em',
                verticalAlign: 'middle',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--results-info-icon-hover)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--results-info-icon)')}
            >
              ⓘ
            </span>
          </InfoTooltip>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 6, paddingTop: 9, paddingBottom: 9 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{Math.round(sessionStats.overallScore)}%</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Overall Score</div>
          </div>
          {exerciseType === 'flow' ? (() => {
            const dtwScores = Object.values(advancedAnalysis?.flow_analysis?.dtw_scores || {}).map((result: any) => result.score || 0);
            const avgDtwScore = dtwScores.length > 0 ? dtwScores.reduce((a, b) => a + b, 0) / dtwScores.length : 0;
            const cosineScores = Object.values(advancedAnalysis?.flow_analysis?.cosine_scores || {}).map((result: any) => result.score || 0);
            const avgCosineScore = cosineScores.length > 0 ? cosineScores.reduce((a, b) => a + b, 0) / cosineScores.length : 0;
            
            return (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>{Math.round(avgDtwScore)}%</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>DTW Score</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>{Math.round(avgCosineScore)}%</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Cosine Score</div>
                </div>
              </>
            );
          })() : (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{sessionStats.grade}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Grade</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 500 }}>
                  {exerciseType === 'pose' ? sessionStats.repCount.toFixed(1) : sessionStats.repCount}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {exerciseType === 'pose' ? 'Hold Duration (s)' : 'Repetitions'}
                </div>
              </div>
            </>
          )}
          {exerciseType !== 'flow' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{typeof sessionStats.balanceScore === 'number' ? Math.round(sessionStats.balanceScore) : sessionStats.balanceScore}%</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Balance</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--results-summary-info-bg)', color: 'var(--results-summary-info-text)', borderRadius: 6, padding: 12 }}>
            <div className="text-xs opacity-90">Best Joint</div>
            <div className="text-sm font-semibold">{sessionStats.bestJoint?.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
          <div style={{ background: 'var(--results-summary-info-bg)', color: 'var(--results-summary-info-text)', borderRadius: 6, padding: 12 }}>
            <div className="text-xs opacity-90">Needs Work</div>
            <div className="text-sm font-semibold">{sessionStats.worstJoint?.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
        </div>
        
        {/* Real-time Analysis Data Section */}
        {sessionStats.realTimeAverageScore > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <h4 style={{ fontSize: 16, fontWeight: 500, color: 'var(--results-summary-title)' }}>Real-time Analysis</h4>
              <InfoTooltip content="Enhanced metrics from real-time analysis during your workout session.">
                <span className="text-onyx-30 hover:text-onyx-20 cursor-help"
                  style={{
                    color: 'var(--results-info-icon)',
                    cursor: 'help',
                    transition: 'color 0.18s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: 6,
                    fontSize: '1em',
                    verticalAlign: 'middle',
                  }}
                >ⓘ</span>
              </InfoTooltip>
            </div>
            
            {/* Real-time Performance Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 6, marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{Math.round(sessionStats.realTimeAverageScore)}%</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>Real-time Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{Math.round(sessionStats.realTimeFormConsistency)}</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>Consistency</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: sessionStats.realTimeImprovementTrend > 0 ? '#2CFF05' : sessionStats.realTimeImprovementTrend < 0 ? '#FF2C2C' : 'inherit' }}>
                  {sessionStats.realTimeImprovementTrend > 0 ? '+' : ''}{Math.round(sessionStats.realTimeImprovementTrend * 100) / 100}
                </div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>Trend</div>
              </div>
            </div>
            
            {/* Form Quality Distribution */}
            <div style={{ background: 'var(--results-summary-info-bg)', borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <div className="text-xs opacity-90 mb-2">Form Quality Distribution</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, background: '#2CFF05', height: 8, borderRadius: 4, position: 'relative' }}>
                  <div style={{ 
                    width: `${sessionStats.timeInGoodForm}%`, 
                    height: '100%', 
                    background: '#2CFF05', 
                    borderRadius: 4,
                    transition: 'width 0.3s ease'
                  }} />
                  <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }}>
                    {Math.round(sessionStats.timeInGoodForm)}%
                  </div>
                </div>
                <div style={{ flex: 1, background: '#FFA500', height: 8, borderRadius: 4, position: 'relative' }}>
                  <div style={{ 
                    width: `${sessionStats.timeInWarningForm}%`, 
                    height: '100%', 
                    background: '#FFA500', 
                    borderRadius: 4,
                    transition: 'width 0.3s ease'
                  }} />
                  <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }}>
                    {Math.round(sessionStats.timeInWarningForm)}%
                  </div>
                </div>
                <div style={{ flex: 1, background: '#FF2C2C', height: 8, borderRadius: 4, position: 'relative' }}>
                  <div style={{ 
                    width: `${sessionStats.timeInPoorForm}%`, 
                    height: '100%', 
                    background: '#FF2C2C', 
                    borderRadius: 4,
                    transition: 'width 0.3s ease'
                  }} />
                  <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }}>
                    {Math.round(sessionStats.timeInPoorForm)}%
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 8 }}>
                <span style={{ color: '#2CFF05' }}>Good</span>
                <span style={{ color: '#FFA500' }}>Warning</span>
                <span style={{ color: '#FF2C2C' }}>Poor</span>
              </div>
            </div>
            
            {/* Joint Performance Breakdown */}
            {Object.keys(sessionStats.jointPerformance).length > 0 && (
              <div style={{ background: 'var(--results-summary-info-bg)', borderRadius: 6, padding: 12 }}>
                <div className="text-xs opacity-90 mb-2">Joint Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  {Object.entries(sessionStats.jointPerformance).map(([joint, score]) => (
                    <div key={joint} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{Math.round(score as number)}%</div>
                      <div style={{ fontSize: 10, opacity: 0.8 }}>{joint.replace(/([A-Z])/g, ' $1').trim()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Quick Actions */}
      <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <h3 style={{ fontSize: 21, fontWeight: 300, marginBottom: '0px', color: 'var(--results-summary-title)' }}>Quick Actions</h3>
          <InfoTooltip content="Quick actions to download, share, or retry your workout session.">
            <span className="text-onyx-30 hover:text-onyx-20 cursor-help"
                          style={{
                            color: 'var(--results-info-icon)',
                            cursor: 'help',
                            transition: 'color 0.18s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginLeft: 6,
                            fontSize: '1em',
                            verticalAlign: 'middle',
                          }}
            >ⓘ</span>
          </InfoTooltip>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 9, paddingBottom: 9 }}>
          <button 
            onClick={() => setIsAssetModalOpen(true)}
            className="px-2 py-2 border-2 rounded-md font-medium text-xs"
            style={{ background: 'transparent', borderColor: '#2CFF05', color: '--primary-button-text' , cursor: 'pointer' }}
          >
            Shareable Graphic
          </button>
          <button
            onClick={downloadMotionData}
            className={`px-2 py-2 border-2 rounded-md font-medium text-xs${!poses || poses.length === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
            style={{ background: 'transparent', borderColor: '#D805FF', color: '--primary-button-text' , cursor: 'pointer' }}
            disabled={!poses || poses.length === 0}
          >
            Download Motion Data
          </button>
          <button 
            onClick={onResetAnalysis || (() => window.location.reload())}
            className="px-2 py-2 border-2 rounded-md font-medium text-xs"
            style={{ background: 'transparent', borderColor: '#5B05FF', color: '--primary-button-text' , cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </div>
      
      {/* Asset Generation Modal */}
      <AssetGenerationModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        videoUrl={videoUrl}
        poses={poses}
        exerciseTitle={exerciseTitle}

      />
    </div>
  );
}

export default function ResultsPage() {
  const { theme, toggleTheme } = useTheme();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const videoUrl = searchParams.get("video");
  const videoDuration = searchParams.get("duration");
  
  console.log('🔍 URL params:', { params, id, videoUrl, videoDuration });

//  console.log('Results page - videoUrl:', videoUrl);
//  console.log('Results page - videoDuration:', videoDuration);
//  console.log('Results page - parsed duration:', videoDuration ? parseFloat(videoDuration) : undefined);

  // State
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [poses, setPoses] = useState<any[]>([]);
  const [angles, setAngles] = useState<any>(null);
  const [referenceAngles, setReferenceAngles] = useState<any>(null);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  
  // Advanced analysis state
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedAnalysisResult | null>(null);
  const [isLoadingAdvanced, setIsLoadingAdvanced] = useState(false);
  const [advancedAnalysisError, setAdvancedAnalysisError] = useState<string | null>(null);

  // Real-time analysis data state
  const [realTimeAnalysisData, setRealTimeAnalysisData] = useState<any[]>([]);
  const [enhancedSessionStats, setEnhancedSessionStats] = useState<any>(null);

  // Video tracking state
  const [currentFrame, setCurrentFrame] = useState<number>(0); // For video->chart sync
  const [seekFrame, setSeekFrame] = useState<number | null>(null); // For chart->video sync
  const [referenceFrame, setReferenceFrame] = useState(0);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  
  // Debug reference video URL changes
  useEffect(() => {
    console.log('🎬 Reference video URL updated:', referenceVideoUrl);
  }, [referenceVideoUrl]);
  const [referencePoses, setReferencePoses] = useState<any[]>([]);

  // Function to reset all analysis state when starting a new recording
  const resetAnalysisState = () => {
    console.log('🔄 Resetting analysis state for new recording');
    setPoses([]);
    setAngles(null);
    setReferenceAngles(null);
    setComparisonResults(null);
    setAdvancedAnalysis(null);
    setIsLoadingAdvanced(false);
    setAdvancedAnalysisError(null);
    setRealTimeAnalysisData([]);
    setEnhancedSessionStats(null);
    setCurrentFrame(0);
    setSeekFrame(null);
    setReferenceFrame(0);
    setReferenceVideoUrl(null);
    setReferencePoses([]);
  };

  // Fetch exercise data
  useEffect(() => {
    const fetchExercise = async () => {
      try {
        console.log('🔍 Fetching exercise data for ID:', id);
        setLoading(true);
        const response = await fetch(`/api/exercises/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Exercise not found');
          } else {
            throw new Error('Failed to fetch exercise');
          }
          return;
        }

        const exerciseData = await response.json();
        console.log('📋 Raw API response:', exerciseData);
        
        // Check if the response has the expected structure
        if (!exerciseData.exercise) {
          console.error('❌ API response missing exercise data:', exerciseData);
          setError('Invalid exercise data received');
          return;
        }
        
        const exercise = exerciseData.exercise;
        console.log('📋 Exercise data received:', {
          id: exercise.id,
          title: exercise.title,
          referenceVideoUrl: exercise.referenceVideoUrl,
          referenceKeypointsUrl: exercise.referenceKeypointsUrl
        });
        
        // Convert string arrays back to arrays
        const formattedExercise: Exercise = {
          ...exercise,
          tags: Array.isArray(exercise.tags) ? exercise.tags : (exercise.tags ? exercise.tags.split(',').filter(Boolean) : []),
          equipment: Array.isArray(exercise.equipment) ? exercise.equipment : (exercise.equipment ? exercise.equipment.split(',').filter(Boolean) : []),
          muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups : (exercise.muscleGroups ? exercise.muscleGroups.split(',').filter(Boolean) : []),
          jointsOfInterest: Array.isArray(exercise.jointsOfInterest) ? exercise.jointsOfInterest : (exercise.jointsOfInterest ? exercise.jointsOfInterest.split(',').filter(Boolean) : []),
          instructions: Array.isArray(exercise.instructions) ? exercise.instructions : (exercise.instructions ? JSON.parse(exercise.instructions) : []),
          relatedExercises: Array.isArray(exercise.relatedExercises) ? exercise.relatedExercises : (exercise.relatedExercises ? exercise.relatedExercises.split(',').filter(Boolean) : []),
          author: { name: exercise.authorName || 'Unknown', profileUrl: exercise.authorProfileUrl },
          exerciseType: exercise.exerciseType || 'repetition',
          exerciseSubtype: exercise.exerciseSubtype,
          classificationConfidence: exercise.classificationConfidence
        };

        setExercise(formattedExercise);
        console.log('✅ Exercise state set:', {
          id: formattedExercise.id,
          title: formattedExercise.title,
          referenceVideoUrl: formattedExercise.referenceVideoUrl,
          referenceKeypointsUrl: formattedExercise.referenceKeypointsUrl,
          jointsOfInterest: formattedExercise.jointsOfInterest,
          exerciseType: formattedExercise.exerciseType
        });

        // Get signed URL for image if it's a Google Cloud Storage path
        if (formattedExercise.image && !formattedExercise.image.startsWith('http') && !formattedExercise.image.startsWith('/')) {
          try {
            const signedUrlResponse = await fetch('/api/storage/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: formattedExercise.image }),
            });
            
            if (signedUrlResponse.ok) {
              const { signedUrl } = await signedUrlResponse.json();
              setImageUrl(signedUrl);
            } else {
              setImageUrl(formattedExercise.image);
            }
          } catch (error) {
            console.error('Error getting signed URL:', error);
            setImageUrl(formattedExercise.image);
          }
        } else {
          setImageUrl(formattedExercise.image);
        }

      } catch (err) {
        console.error('Error fetching exercise:', err);
        setError('Failed to load exercise');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [id]);

  // Load reference data and calculate comparison
  useEffect(() => {
    const loadReferenceData = async () => {
      // Load basic comparison data
      const lastAngles = localStorage.getItem("lastAngles");
      const lastComparison = localStorage.getItem("lastComparison");
      
      if (lastAngles) {
        setAngles(JSON.parse(lastAngles));
      }
      if (lastComparison) {
        setComparisonResults(JSON.parse(lastComparison));
      }
      
      // Load poses if available
      const lastPoses = localStorage.getItem("lastPoses");
      if (lastPoses) {
        setPoses(JSON.parse(lastPoses));
      }
      
      // Load reference angles and video
      if (!exercise?.referenceKeypointsUrl) {
        console.log('No reference keypoints URL found');
        return;
      }
      
      try {
        // Load reference keypoints
        const response = await fetch('/api/storage/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl }),
        });
        
        if (response.ok) {
          const keypointsData = await response.json();

          setReferencePoses(keypointsData);
          
          // Calculate reference angles
          const refAngles = {
            leftKneeAngles: [] as (number | null)[],
            rightKneeAngles: [] as (number | null)[],
            leftHipAngles: [] as (number | null)[],
            rightHipAngles: [] as (number | null)[],
            leftElbowAngles: [] as (number | null)[],
            rightElbowAngles: [] as (number | null)[],
            leftShoulderAbdAngles: [] as (number | null)[],
            rightShoulderAbdAngles: [] as (number | null)[],
            trunkAngles: [] as (number | null)[]
          };
          
          keypointsData.forEach((pose: any) => {
            let poseKeypoints = null;
            if (pose && pose.keypoints && Array.isArray(pose.keypoints)) {
              poseKeypoints = pose.keypoints;
            } else if (pose && Array.isArray(pose)) {
              poseKeypoints = pose;
            }
            
            if (!poseKeypoints || !Array.isArray(poseKeypoints) || poseKeypoints.length < 17) {
              refAngles.leftKneeAngles.push(null);
              refAngles.rightKneeAngles.push(null);
              refAngles.leftHipAngles.push(null);
              refAngles.rightHipAngles.push(null);
              refAngles.leftElbowAngles.push(null);
              refAngles.rightElbowAngles.push(null);
              refAngles.leftShoulderAbdAngles.push(null);
              refAngles.rightShoulderAbdAngles.push(null);
              refAngles.trunkAngles.push(null);
              return;
            }
            
            const keypoints = poseKeypoints;
            const leftHip = keypoints[11];
            const rightHip = keypoints[12];
            const leftKnee = keypoints[13];
            const rightKnee = keypoints[14];
            const leftAnkle = keypoints[15];
            const rightAnkle = keypoints[16];
            const leftShoulder = keypoints[5];
            const rightShoulder = keypoints[6];
            const leftElbow = keypoints[7];
            const rightElbow = keypoints[8];
            const leftWrist = keypoints[9];
            const rightWrist = keypoints[10];

            refAngles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngleWithConfidence(leftHip, leftKnee, leftAnkle).angle : null);
            refAngles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngleWithConfidence(rightHip, rightKnee, rightAnkle).angle : null);
            refAngles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngleWithConfidence(leftShoulder, leftHip, leftKnee).angle : null);
            refAngles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngleWithConfidence(rightShoulder, rightHip, rightKnee).angle : null);
            refAngles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngleWithConfidence(leftShoulder, leftElbow, leftWrist).angle : null);
            refAngles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngleWithConfidence(rightShoulder, rightElbow, rightWrist).angle : null);
            refAngles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngleWithConfidence(leftHip, leftShoulder, leftElbow).angle : null);
            refAngles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngleWithConfidence(rightHip, rightShoulder, rightElbow).angle : null);
            refAngles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngleWithConfidence(leftShoulder, leftHip).angle : null);
          });
          
          setReferenceAngles(refAngles);
          
          // Trigger advanced analysis
          if (lastAngles) {
            runAdvancedAnalysis(JSON.parse(lastAngles), refAngles);
          }
        }

        // Load reference video URL
        console.log('🔍 Loading reference video URL:', exercise.referenceVideoUrl);
        if (exercise.referenceVideoUrl) {
          // Get signed URL for reference video if it's a Google Cloud Storage path
          if (!exercise.referenceVideoUrl.startsWith('http') && !exercise.referenceVideoUrl.startsWith('/')) {
            try {
              console.log('🔍 Getting signed URL for reference video:', exercise.referenceVideoUrl);
              const signedUrlResponse = await fetch('/api/storage/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: exercise.referenceVideoUrl }),
              });
              
              if (signedUrlResponse.ok) {
                const { signedUrl } = await signedUrlResponse.json();
                console.log('✅ Got signed URL for reference video:', signedUrl);
                setReferenceVideoUrl(signedUrl);
              } else {
                console.log('⚠️ Failed to get signed URL, using original:', exercise.referenceVideoUrl);
                setReferenceVideoUrl(exercise.referenceVideoUrl);
              }
            } catch (error) {
              console.error('❌ Error getting signed URL for reference video:', error);
              setReferenceVideoUrl(exercise.referenceVideoUrl);
            }
          } else {
            console.log('✅ Using direct reference video URL:', exercise.referenceVideoUrl);
            setReferenceVideoUrl(exercise.referenceVideoUrl);
          }
        } else {
          console.log('⚠️ No reference video URL found in exercise');
        }
      } catch (error) {
        console.error('Failed to load reference data:', error);
      }
    };
    
    if (exercise) {
      loadReferenceData();
    }
  }, [exercise]);

  // Advanced analysis function
  const runAdvancedAnalysis = async (userAngles: any, refAngles: any) => {
    if (!exercise || !userAngles || !refAngles) return;
    
    setIsLoadingAdvanced(true);
    setAdvancedAnalysisError(null);
    
    try {
      // Check if backend is available
      const isBackendHealthy = await advancedAnalysisService.checkBackendHealth();
      console.log('🔍 Backend health check result:', isBackendHealthy);
      if (!isBackendHealthy) {
        console.log('Python backend not available, using mock pose analysis for testing');
        
        // For pose exercises, create a mock analysis result for testing
        if (exercise.exerciseType === 'pose') {
          const mockPoseAnalysis = {
            overall_score: 85,
            grade: "B",
            confidence: 75,
            joint_analysis: {
              leftElbow: {
                dtw_score: 90,
                cosine_similarity: 0.85,
                cosine_score: 85,
                rom_score: 80,
                user_rom: 15,
                ref_rom: 20
              },
              rightElbow: {
                dtw_score: 88,
                cosine_similarity: 0.82,
                cosine_score: 82,
                rom_score: 78,
                user_rom: 12,
                ref_rom: 18
              }
            },
            tempo_analysis: {}, // Empty for pose exercises
            balance_metrics: {
              stability_score: 80,
              symmetry_score: 85,
              sway_metrics: {
                variance: 0.15,
                velocity: 0.08,
                mean_angle: 90,
                std_angle: 2.5
              }
            },
            repetition_analysis: {}, // Empty for pose exercises
            pose_analysis: {
              overall_accuracy: 85,
              joint_accuracy: {
                leftElbow: {
                  accuracy_score: 90,
                  target_angle: 90,
                  user_avg_angle: 88,
                  angle_deviation: 2,
                  in_range_percentage: 85,
                  hold_duration: 3.5,
                  stability_score: 80
                },
                rightElbow: {
                  accuracy_score: 88,
                  target_angle: 90,
                  user_avg_angle: 87,
                  angle_deviation: 3,
                  in_range_percentage: 82,
                  hold_duration: 3.2,
                  stability_score: 78
                }
              },
              hold_periods: [
                {
                  joint: "leftElbow",
                  start_frame: 10,
                  end_frame: 115,
                  duration: 3.5,
                  accuracy: 90
                },
                {
                  joint: "rightElbow",
                  start_frame: 12,
                  end_frame: 108,
                  duration: 3.2,
                  accuracy: 88
                }
              ],
              pose_quality: {
                balance_score: 82,
                symmetry_score: 85,
                stability_score: 80
              }
            },
            improvement_suggestions: [
              "Maintain consistent elbow angles throughout the pose",
              "Try to hold the pose for longer periods",
              "Focus on balance and stability"
            ],
            detailed_charts: {}
          };
          
          setAdvancedAnalysis(mockPoseAnalysis);
          setIsLoadingAdvanced(false);
          return;
        }
        
        setIsLoadingAdvanced(false);
        return;
      }
      
      // Fetch exercise analysis data for rep counting
      let exerciseAnalysisData = null;
      try {
        const analysisResponse = await fetch(`/api/exercises/${exercise.id}/analysis`);
        if (analysisResponse.ok) {
          const responseData = await analysisResponse.json();
          exerciseAnalysisData = responseData.exercise;
          console.log('📋 Exercise analysis data loaded for rep counting:', {
            hasRepAnalysis: !!exerciseAnalysisData?.repAnalysis,
            jointAngleRules: exerciseAnalysisData?.repAnalysis?.jointAngleRules
          });
        }
      } catch (error) {
        console.warn('Failed to fetch exercise analysis data:', error);
      }
      
      console.log('🔍 Debug - Exercise data being passed to analysis:', {
        exerciseId: exercise.id,
        exerciseType: exercise.exerciseType,
        jointsOfInterest: exercise.jointsOfInterest,
        hasExerciseAnalysisData: !!exerciseAnalysisData,
        exerciseAnalysisDataKeys: exerciseAnalysisData ? Object.keys(exerciseAnalysisData) : null,
        repAnalysis: exerciseAnalysisData?.repAnalysis,
        poseAnalysis: exerciseAnalysisData?.poseAnalysis,
        jointAngleRules: exerciseAnalysisData?.repAnalysis?.jointAngleRules
      });
      
      console.log('🔍 Debug - User angles data:', {
        userAnglesKeys: Object.keys(userAngles),
        userAnglesSample: Object.fromEntries(
          Object.entries(userAngles).map(([key, value]) => [key, Array.isArray(value) ? value.length : value])
        )
      });
      
      // Prepare analysis data
      const analysisData = advancedAnalysisService.prepareAnalysisData(
        userAngles,
        refAngles,
        exercise.jointsOfInterest,
        exercise.title,
        exerciseAnalysisData, // Pass exercise data for rep counting
        exercise.exerciseType, // Pass exercise type
        exerciseAnalysisData?.poseAnalysis, // Pass pose analysis data
        {
          video_duration: poses.length / 30, // Assuming 30fps
          frame_count: poses.length,
        }
      );
      
      console.log('🔍 Analysis data prepared:', {
        exerciseType: exercise.exerciseType,
        hasPoseAnalysis: !!exerciseAnalysisData?.poseAnalysis,
        poseAnalysisKeys: exerciseAnalysisData?.poseAnalysis ? Object.keys(exerciseAnalysisData.poseAnalysis) : null,
        analysisDataKeys: analysisData ? Object.keys(analysisData) : null
      });
      
      if (!analysisData) {
        console.log('Could not prepare analysis data');
        setIsLoadingAdvanced(false);
        return;
      }
      
      // Run advanced analysis
      const result = await advancedAnalysisService.analyzeExercise(analysisData);
      console.log('🔍 Advanced analysis result for pose exercise:', {
        exerciseType: exercise.exerciseType,
        hasPoseAnalysis: !!result.pose_analysis,
        poseAnalysisKeys: result.pose_analysis ? Object.keys(result.pose_analysis) : null,
        overallScore: result.overall_score,
        grade: result.grade,
        jointAnalysis: result.joint_analysis,
        poseAnalysisData: result.pose_analysis
      });
      setAdvancedAnalysis(result);
      
    } catch (error) {
      setAdvancedAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsLoadingAdvanced(false);
    }
  };

  const retryAdvancedAnalysis = () => {
    if (angles && referenceAngles && exercise) {
      runAdvancedAnalysis(angles, referenceAngles);
    }
  };

  // Load analysis data from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const posesData = localStorage.getItem("lastPoses");
        const anglesData = localStorage.getItem("lastAngles");
        const comparisonData = localStorage.getItem("lastComparison");
        

        
        // Only load data if it exists and is recent (within last 5 minutes)
        const now = Date.now();
        const dataTimestamp = localStorage.getItem("lastAnalysisTimestamp");
        const isRecent = dataTimestamp && (now - parseInt(dataTimestamp)) < 300000; // 5 minutes
        
        if (anglesData && isRecent) {
          const parsedAngles = JSON.parse(anglesData);
          setAngles(parsedAngles);
          
          // If we have angles but no comparison data, or if comparison data is missing joints, recalculate
        if (comparisonData && isRecent) {
            const parsedComparison = JSON.parse(comparisonData);

            setComparisonResults(parsedComparison);
          } else if (referenceAngles && exercise?.jointsOfInterest) {
            // Recalculate comparison if we have the data
            const recalculatedComparison = calculateComparison(parsedAngles, referenceAngles, exercise.jointsOfInterest);
            setComparisonResults(recalculatedComparison);
          }
        }
        if (posesData && isRecent) {
          setPoses(JSON.parse(posesData));
        }
      } catch (error) {
        console.error('Error loading analysis data:', error);
      }
    }
  }, [exercise, referenceAngles]); // Add referenceAngles as dependency

  // Load real-time analysis data from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedData = localStorage.getItem("realTimeAnalysisData");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setRealTimeAnalysisData(parsedData);
          console.log('📊 Loaded real-time analysis data:', parsedData.length, 'frames');
          
          // Calculate enhanced session stats
          calculateEnhancedSessionStats(parsedData);
        }
      } catch (error) {
        console.error('Error loading real-time analysis data:', error);
      }
    }
  }, []);

  // Calculate enhanced session statistics from real-time analysis data
  const calculateEnhancedSessionStats = (data: any[]) => {
    if (!data || data.length === 0) return;

    const stats = {
      averageScore: 0,
      repCount: 0,
      formConsistency: 0,
      improvementTrend: 0,
      bestFrame: null as any,
      worstFrame: null as any,
      jointPerformance: {} as { [joint: string]: number },
      timeInGoodForm: 0,
      timeInWarningForm: 0,
      timeInPoorForm: 0
    };

    let totalScore = 0;
    let goodFormFrames = 0;
    let warningFormFrames = 0;
    let poorFormFrames = 0;
    let bestScore = 0;
    let worstScore = 100;

    data.forEach((frameData, index) => {
      const analysis = frameData.analysis;
      totalScore += analysis.score;

      // Track form quality distribution
      switch (analysis.severity) {
        case 'good':
          goodFormFrames++;
          break;
        case 'warning':
          warningFormFrames++;
          break;
        case 'poor':
          poorFormFrames++;
          break;
      }

      // Track best and worst frames
      if (analysis.score > bestScore) {
        bestScore = analysis.score;
        stats.bestFrame = frameData;
      }
      if (analysis.score < worstScore) {
        worstScore = analysis.score;
        stats.worstFrame = frameData;
      }

      // Aggregate joint performance
      if (analysis.metrics.jointScores) {
        Object.keys(analysis.metrics.jointScores).forEach(joint => {
          if (!stats.jointPerformance[joint]) {
            stats.jointPerformance[joint] = 0;
          }
          stats.jointPerformance[joint] += analysis.metrics.jointScores[joint];
        });
      }
    });

    // Calculate averages
    stats.averageScore = totalScore / data.length;
    stats.timeInGoodForm = (goodFormFrames / data.length) * 100;
    stats.timeInWarningForm = (warningFormFrames / data.length) * 100;
    stats.timeInPoorForm = (poorFormFrames / data.length) * 100;

    // Average joint performance
    Object.keys(stats.jointPerformance).forEach(joint => {
      stats.jointPerformance[joint] = stats.jointPerformance[joint] / data.length;
    });

    // Calculate form consistency (standard deviation of scores)
    const scoreVariance = data.reduce((sum, frameData) => {
      const diff = frameData.analysis.score - stats.averageScore;
      return sum + (diff * diff);
    }, 0) / data.length;
    stats.formConsistency = Math.sqrt(scoreVariance);

    // Calculate improvement trend (linear regression slope)
    if (data.length > 1) {
      const xValues = data.map((_, index) => index);
      const yValues = data.map(frameData => frameData.analysis.score);
      const n = data.length;
      
      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = yValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      stats.improvementTrend = slope;
    }

    setEnhancedSessionStats(stats);
    console.log('📊 Enhanced session stats calculated:', stats);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-onyx-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-onyx-10 text-xl">Loading results...</div>
      </main>
    );
  }

  if (error || !exercise) {
    return (
      <main className="min-h-screen bg-onyx-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-red-600 text-xl mb-4">{error || 'Exercise not found'}</div>
        <Link href="/" className="text-blue-70">
          ← Back to Library
        </Link>
      </main>
    );
  }

  // Prepare chart data for confidence
  const confidenceChartData = poses.length > 0 ? poses.map((pose, idx) => {
    if (!pose || !pose.keypoints) {
      return {
        frame: idx + 1,
        confidence: 0,
      };
    }
    const validKeypoints = pose.keypoints.filter((kp: any) => typeof kp.score === "number");
    const avgConfidence =
      validKeypoints && validKeypoints.length > 0
        ? validKeypoints.reduce((sum: number, kp: any) => sum + kp.score, 0) / validKeypoints.length
        : 0;
    return {
      frame: idx + 1,
      confidence: avgConfidence,
    };
  }) : [];

  // Prepare chart data for angles
  const angleChartData = angles ? Array.from({ length: Math.max(
    angles.leftKneeAngles?.length || 0,
    angles.rightKneeAngles?.length || 0,
    angles.leftHipAngles?.length || 0,
    angles.rightHipAngles?.length || 0,
    angles.leftElbowAngles?.length || 0,
    angles.rightElbowAngles?.length || 0,
    angles.leftShoulderAbdAngles?.length || 0,
    angles.rightShoulderAbdAngles?.length || 0,
    angles.trunkAngles?.length || 0
  ) }, (_, idx) => ({
    frame: idx + 1,
    leftKnee: angles.leftKneeAngles?.[idx] || null,
    rightKnee: angles.rightKneeAngles?.[idx] || null,
    leftHip: angles.leftHipAngles?.[idx] || null,
    rightHip: angles.rightHipAngles?.[idx] || null,
    leftElbow: angles.leftElbowAngles?.[idx] || null,
    rightElbow: angles.rightElbowAngles?.[idx] || null,
    leftShoulderAbd: angles.leftShoulderAbdAngles?.[idx] || null,
    rightShoulderAbd: angles.rightShoulderAbdAngles?.[idx] || null,
    trunk: angles.trunkAngles?.[idx] || null,
  })).filter(point => 
    point.leftKnee !== null || point.rightKnee !== null || 
    point.leftHip !== null || point.rightHip !== null ||
    point.leftElbow !== null || point.rightElbow !== null ||
    point.leftShoulderAbd !== null || point.rightShoulderAbd !== null ||
    point.trunk !== null
  ) : [];

  // Calculate statistics
  const framesWithPerson = poses.length > 0 ? poses.filter(
    (pose) => pose && pose.keypoints && pose.keypoints.some((kp: any) => kp.score > 0.4)
  ).length : 0;

  const getStats = (arr: (number | null)[]) => {
    const validAngles = arr.filter(a => a !== null) as number[];
    if (validAngles.length === 0) return { min: 0, max: 0, avg: 0 };
    return {
      min: Math.round(Math.min(...validAngles)),
      max: Math.round(Math.max(...validAngles)),
      avg: Math.round(validAngles.reduce((a, b) => a + b, 0) / validAngles.length)
    };
  };

  return (
    <main className="bg-onyx-100 flex flex-col items-center px-0 pb-0" style={{ maxWidth: '2560px', marginLeft: '3%', marginRight: '3%' }}>
      <div className="w-full max-w-6xl flex flex-row" style={{ maxWidth: '2560px', minHeight: '70vh' }}>
        {/* Left: Side-by-Side Video Player (50%) */}
        <div className="flex-1 min-w-0 max-w-[50%] flex flex-col justify-start" style={{ maxWidth: '50%'}}>
          <SideBySideVideoPlayer
            className="h-full"
            userVideoUrl={videoUrl}
            referenceVideoUrl={referenceVideoUrl}
            userPoses={poses}
            referencePoses={referencePoses}
            exercise={exercise}
            onUserFrameChange={setCurrentFrame}
            seekFrame={seekFrame}
            onSeekFrameHandled={() => setSeekFrame(null)}
            onReferenceFrameChange={setReferenceFrame}
            userVideoDuration={videoDuration ? parseFloat(videoDuration) : undefined}
            //maxHeight="60vh"
          />
        </div>
        {/* Right: Tabbed Panel (50%) */}
        <div className="flex-1 min-w-0 max-w-[50%] flex flex-col justify-start" style={{ maxWidth: '50%' }}>
        <div className="w-full mx-auto">
          <div
            style={{
              background: 'var(--results-summary-bg)',
              color: 'var(--results-summary-title)',
              borderRadius: 6,
              //boxShadow: 'var(--results-summary-shadow)',
              //border: '1.5px solid var(--results-summary-border)',
              //padding: 12,
              marginBottom: 12
            }}
          >
          <ResultsTabs
            comparisonResults={comparisonResults}
            advancedAnalysis={advancedAnalysis}
            exerciseTitle={exercise.title}
            userAngles={angles}
            referenceAngles={referenceAngles}
            jointsOfInterest={exercise.jointsOfInterest}
            isLoadingAdvanced={isLoadingAdvanced}
            onRetryAdvanced={retryAdvancedAnalysis}
            poses={poses}
            videoUrl={videoUrl}
            currentFrame={currentFrame}
            onSeekFrame={setSeekFrame}
            enhancedSessionStats={enhancedSessionStats}
            exerciseType={exercise.exerciseType}
            repAnalysis={exercise.repAnalysis}
            poseAnalysis={exercise.poseAnalysis}
            onResetAnalysis={resetAnalysisState}
          />
          </div>
        </div>

        </div>
      </div>
      {/* Navigation */}
      <div className="mt-8 mb-6 text-center" style={{ border: 'transparent' }}>
        <Link href={`/exercises/${exercise.id}`} className="text-sm font-regular text-blue-70">
          ← Back to {exercise.title} details
        </Link>
      </div>
    </main>
  );
}

// Custom active bar for BarChart (highlight on hover/active)
const CustomActiveBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={
        props.isSelection
          ? 'var(--results-chart-selection)'
          : 'var(--results-chart-highlight)'
      }
      stroke="var(--results-chart-selection)"
      strokeWidth={2}
      rx={3}
    />
  );
};
