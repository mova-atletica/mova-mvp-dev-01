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
import { Exercise } from "../../../data/exercises";
import AdvancedResultsDisplay from "../../../components/AdvancedResultsDisplay";
import SideBySideVideoPlayer from "../../../components/SideBySideVideoPlayer";
import AssetGenerationModal from "../../../components/AssetGenerationModal";
import { advancedAnalysisService, AdvancedAnalysisResult } from "../../../lib/advancedAnalysisService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
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
  onSeekFrame
}: any) {
  const [activeTab, setActiveTab] = useState<'charts' | 'feedback' | 'summary'>('summary');
  
  // Chart selection states
  const [selectedMainChart, setSelectedMainChart] = useState<'angle-comparison' | 'radar' | 'joint-analysis' | 'balance'>('angle-comparison');
  
  // Chart options - combined into one list
  const chartOptions = [
    { value: 'angle-comparison', label: 'Angle Comparison Over Time' },
    { value: 'radar', label: 'Performance Radar' },
    { value: 'joint-analysis', label: 'Advanced Joint Analysis' },
    { value: 'balance', label: 'Balance & Stability' },
  ];

  // Prepare data for angle comparison chart
  const prepareAngleComparisonData = () => {
    if (!userAngles || !referenceAngles) return [];
    const maxLength = Math.max(
      ...Object.values(userAngles).map((arr: any) => arr.length),
      ...Object.values(referenceAngles).map((arr: any) => arr.length)
    );
    const data = [];
    for (let i = 0; i < maxLength; i++) {
      const point: any = { frame: i + 1 };
      jointsOfInterest.forEach((joint: string) => {
        const userKey = `${joint}Angles`;
        const refKey = `${joint}Angles`;
        if (userAngles[userKey] && userAngles[userKey][i] !== null) {
          point[`${joint}_user`] = userAngles[userKey][i];
        }
        if (referenceAngles[refKey] && referenceAngles[refKey][i] !== null) {
          point[`${joint}_ref`] = referenceAngles[refKey][i];
        }
      });
      data.push(point);
    }
    return data;
  };

  // Handler for chart click/seek
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      if (onSeekFrame) onSeekFrame(data.activeLabel);
    }
  };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  // Prepare data for Radar Chart
  const prepareRadarData = () => {
    if (!advancedAnalysis || !jointsOfInterest) return [];
    const metrics = ['dtw_score', 'cosine_score', 'rom_score', 'basic_score'];
    const data = metrics.map((metric: string) => ({
      metric,
      score: advancedAnalysis.overall_score, // Use overall_score for radar chart
    }));
    return data;
  };

  // Prepare data for Bar Chart (Joint Analysis)
  const prepareJointScoresData = () => {
    if (!advancedAnalysis || !jointsOfInterest) return [];
    const data = jointsOfInterest.map((joint: string) => ({
      joint: joint.replace(/([A-Z])/g, ' $1').trim(),
      dtw_score: advancedAnalysis.joint_analysis?.[joint]?.dtw_score || 0,
      cosine_score: advancedAnalysis.joint_analysis?.[joint]?.cosine_score || 0,
      rom_score: advancedAnalysis.joint_analysis?.[joint]?.rom_score || 0,
      basic_score: advancedAnalysis.joint_analysis?.[joint]?.basic_score || 0,
    }));
    return data;
  };

  // Function to render selected charts
  const renderSelectedCharts = () => {
    const charts = [];
    switch (selectedMainChart) {
      case 'angle-comparison':
        charts.push(<div key="angle-comparison">{renderAngleComparisonChart()}</div>);
        break;
      case 'radar':
        charts.push(<div key="radar">{renderRadarChart()}</div>);
        break;
      case 'joint-analysis':
        charts.push(<div key="joint-analysis">{renderJointAnalysisChart()}</div>);
        break;
      case 'balance':
        charts.push(<div key="balance">{renderBalanceChart()}</div>);
        break;
    }
    return charts;
  };

  // Chart render functions
  const renderAngleComparisonChart = () => (
    <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <h3 style={{ fontSize: 21, fontWeight: 500, color: 'var(--results-summary-title)' }}>Angle Comparison Over Time</h3>
        <InfoTooltip content="Shows how your joint angles compare to the reference video over time. Click on the chart to jump to that moment in your video. The vertical line shows your current video position.">
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
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={prepareAngleComparisonData()} onClick={handleChartClick} style={{ background: 'var(--results-chart-bg)' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--results-chart-grid)" />
          <XAxis dataKey="frame" stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <YAxis domain={[0, 100]} stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <Tooltip 
            contentStyle={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', border: 'none', borderRadius: 8, fontSize: '13px', fontWeight: 400 }}
            labelStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '11px', fontWeight: 700 }}
            itemStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '13px', fontWeight: 400 }}
          />
          <Legend wrapperStyle={{ color: 'var(--results-chart-legend)' }} content={props => <CustomLegendContent {...props} data={prepareAngleComparisonData()} />} />
          {jointsOfInterest.map((joint: string, index: number) => (
            <React.Fragment key={joint}>
              <Line
                type="monotone"
                dataKey={`${joint}_user`}
                stroke={seriesColors[index % seriesColors.length]}
                strokeWidth={2}
                dot={false}
                name={`${joint} (User)`}
                activeDot={{ r: 6, fill: 'var(--results-chart-highlight)' }}
              />
              <Line
                type="monotone"
                dataKey={`${joint}_ref`}
                stroke={seriesColors[(index + jointsOfInterest.length) % seriesColors.length]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={`${joint} (Reference)`}
                activeDot={{ r: 6, fill: 'var(--results-chart-selection)' }}
              />
            </React.Fragment>
          ))}
          {/* Vertical cursor for current video frame */}
          {currentFrame !== null && (
            <ReferenceLine x={currentFrame} stroke="#000" strokeWidth={2} label="Video" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const radarMetricDescriptions: Record<string, { label: string; desc: string }> = {
    dtw_score: { label: 'DTW Pattern', desc: 'Movement similarity' },
    cosine_score: { label: 'Cosine Similarity', desc: 'Angle pattern match' },
    rom_score: { label: 'Range of Motion', desc: 'Flexibility' },
    basic_score: { label: 'Basic Score', desc: 'Overall accuracy' },
  };

  function RadarTooltipContent({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const { metric, score } = payload[0].payload;
    const info = radarMetricDescriptions[metric] || { label: metric, desc: '' };
    return (
      <div style={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{info.label}</div>
        <div style={{ fontSize: 12, color: 'var(--results-chart-tooltip-text)', marginBottom: 4 }}>{info.desc}</div>
        <div style={{ fontWeight: 500, fontSize: 15 }}>Score: {typeof score === 'number' ? score.toFixed(2) : score}</div>
      </div>
    );
  }

  // Add near radarMetricDescriptions:
  const radarShortLabels: Record<string, string> = {
    dtw_score: 'DTW',
    cosine_score: 'Cosine',
    rom_score: 'ROM',
    basic_score: 'Score',
  };

  function RadarAxisTick({ x, y, payload, index }: any) {
    const shortLabel = radarShortLabels[payload.value] || payload.value.replace(/_/g, ' ');
    let dx = 0, dy = 0;
    // Padding logic for each axis
    if (payload.value === 'cosine_score') dx = 22; // right axis, move right
    if (payload.value === 'basic_score') dx = -20; // left axis, move left
    if (payload.value === 'rom_score') dy = 16; // bottom axis, move up
    if (payload.value === 'dtw_score') dy = -16; // top axis, move down
    return (
      <text
        x={x}
        y={y}
        dx={dx}
        dy={dy}
        textAnchor="middle"
        fill="var(--results-chart-axis)"
        fontSize="12px"
        fontWeight="400"
        alignmentBaseline="middle"
      >
        {shortLabel}
      </text>
    );
  }

  const renderRadarChart = () => (
    <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <h3 style={{ fontSize: 21, fontWeight: 500, color: 'var(--results-summary-title)' }}>Performance Radar</h3>
        <InfoTooltip content="Overall performance metrics across different analysis methods. Larger areas indicate better performance. This gives you a quick visual overview of your movement quality.">
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
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={prepareRadarData()} style={{ background: 'var(--results-chart-bg)' }}>
          <PolarGrid stroke="var(--results-chart-grid)" />
          <PolarAngleAxis
            dataKey="metric"
            stroke="var(--results-chart-axis)"
            tick={<RadarAxisTick />}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <Radar
            name="Performance"
            dataKey="score"
            stroke={seriesColors[0]}
            fill={seriesColors[0]}
            fillOpacity={0.6}
          />
          <Tooltip 
            content={<RadarTooltipContent />}
            contentStyle={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', border: 'none', borderRadius: 8, fontSize: '13px', fontWeight: 400 }}
            itemStyle={{ fontSize: '13px', fontWeight: 400 }}
            labelStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '11px', fontWeight: 700 }}
            cursor={{ stroke: 'var(--results-chart-cursor)', strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderJointAnalysisChart = () => (
    <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <h3 style={{ fontSize: 21, fontWeight: 500, color: 'var(--results-summary-title)' }}>Advanced Joint Analysis</h3>
        <InfoTooltip content="Detailed analysis of each joint using multiple metrics: DTW Pattern (movement similarity), Cosine Similarity (angle patterns), Range of Motion (flexibility), and Basic Score (overall accuracy).">
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
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={prepareJointScoresData()} style={{ background: 'var(--results-chart-bg)' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--results-chart-grid)" />
          <XAxis dataKey="joint" stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <YAxis domain={[0, 100]} stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <Tooltip 
            contentStyle={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', border: 'none', borderRadius: 8, fontSize: '13px', fontWeight: 400 }}
            labelStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '11px', fontWeight: 700 }}
            itemStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '13px', fontWeight: 400 }}
          />
          <Legend wrapperStyle={{ color: 'var(--results-chart-legend)' }} content={props => <CustomLegendContent {...props} data={prepareJointScoresData()} />} />
          <Bar dataKey="dtw_score" fill={seriesColors[0]} name="DTW Pattern" activeBar={CustomActiveBar} />
          <Bar dataKey="cosine_score" fill={seriesColors[1]} name="Cosine Similarity" activeBar={CustomActiveBar} />
          <Bar dataKey="rom_score" fill={seriesColors[2]} name="Range of Motion" activeBar={CustomActiveBar} />
          <Bar dataKey="basic_score" fill={seriesColors[3]} name="Basic Score" activeBar={CustomActiveBar} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderBalanceChart = () => {
    if (!advancedAnalysis || !advancedAnalysis.balance_metrics) {
      return (
        <div className="bg-white rounded-lg shadow p-6 text-onyx-30">
          Balance & Stability metrics are not available for this session.
        </div>
      );
    }
    return (
      <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <h3 style={{ fontSize: 21, fontWeight: 500, color: 'var(--results-summary-title)' }}>Balance & Stability</h3>
          <InfoTooltip content="Measures your balance and stability during the exercise. Higher scores indicate better control and less sway. Most relevant for exercises requiring balance like squats or single-leg movements.">
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-onyx-30">Stability Score:</span>
              <InfoTooltip content="How steady you maintained your position throughout the exercise. Higher scores mean less unwanted movement.">
                <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
            <span className="font-bold">{Math.round(advancedAnalysis.balance_metrics.stability_score || 0)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-onyx-30">Symmetry Score:</span>
              <InfoTooltip content="How balanced your movement was between left and right sides. Higher scores indicate more symmetrical movement.">
                <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
            <span className="font-bold">{Math.round(advancedAnalysis.balance_metrics.symmetry_score || 0)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-onyx-30">Sway Variance:</span>
              <InfoTooltip content="A measure of how much your center of mass moved during the exercise. Lower values indicate better balance control.">
                <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
            <span className="font-medium">{advancedAnalysis.balance_metrics.sway_metrics?.variance ? advancedAnalysis.balance_metrics.sway_metrics.variance.toFixed(2) : '0.00'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Chart dropdown open state
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="flex flex-row flex-wrap items-center justify-start ml-4 mr-2 mb-0"
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
          Summary
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
          Charts
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
          Advanced Feedback
        </button>
      </div>
      <div className="space-y-4 p-0 mt-2 ml-2 w-full">
        {activeTab === 'charts' && (
          <div className="space-y-4 p-2">
            {/* Chart Selection Controls */}
            <div className="bg-transparent w-full rounded-lg shadow p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Chart Dropdown */}
                <div className="flex-1" style={{ position: 'relative', minWidth: '160px' }}>
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
                    <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
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
            <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <h3 style={{ fontSize: 21, fontWeight: 500, color: 'var(--results-summary-title)' }}>Overall Feedback</h3>
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
            {/* Joint-by-Joint Feedback */}
            <div className="bg-var(--results-summary-bg) rounded-lg shadow p-6" style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <h3 style={{ fontSize: 21, fontWeight: 500, color: 'var(--results-summary-title)' }}>Joint-by-Joint Feedback</h3>
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
                      const repData = advancedAnalysis?.repetition_analysis?.[joint];
                      const jointSuggestions = getJointSuggestions(joint);
                      
                      return (
                        <div key={joint} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-onyx-10 mb-2">
                            {joint.replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                          <div className="space-y-2">
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
                                <InfoTooltip content="Average difference in degrees between your joint angles and the reference video. Lower is better."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                              </div>
                              <span className="font-medium">{typeof avgDiff === 'number' ? avgDiff.toFixed(1) : '0.0'}°</span>
                            </div>
                            {/* Repetition Analysis Integration */}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-onyx-30">Consistency:</span>
                                <InfoTooltip content="How similar each repetition was to the others. Higher percentages mean more consistent form."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                              </div>
                              <span className="font-medium">{repData ? Math.round(repData.consistency || 0) + '%' : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-onyx-30">Avg Duration:</span>
                                <InfoTooltip content="Average time it took to complete each repetition."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                              </div>
                              <span className="font-medium">{repData && typeof repData.avg_duration === 'number' ? repData.avg_duration.toFixed(2) + 's' : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-onyx-30">Avg ROM:</span>
                                <InfoTooltip content="Average range of motion achieved during each repetition."><span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span></InfoTooltip>
                              </div>
                              <span className="font-medium">{repData && typeof repData.avg_rom === 'number' ? repData.avg_rom.toFixed(1) + '°' : 'N/A'}</span>
                            </div>
                            
                            {/* Joint-specific feedback suggestions */}
                            {jointSuggestions.length > 0 && (
                              <div className="mt-4" style={{ padding: 6, borderWidth: '1px', borderRadius: 6, borderColor: 'var(--results-summary-border)' }}>
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
  videoUrl 
}: any) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<{ [key: string]: any }>({});
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Calculate session stats
  const sessionStats = {
    overallScore: basicComparison?.overall?.score || 0,
    grade: basicComparison?.overall?.grade || 'N/A',
    totalJoints: jointsOfInterest.length,
    bestJoint: jointsOfInterest.reduce((best: string, joint: string) => {
      const currentScore = basicComparison?.[joint]?.score || 0;
      const bestScore = basicComparison?.[best]?.score || 0;
      return currentScore > bestScore ? joint : best;
    }, jointsOfInterest[0]),
    worstJoint: jointsOfInterest.reduce((worst: string, joint: string) => {
      const currentScore = basicComparison?.[joint]?.score || 0;
      const worstScore = basicComparison?.[worst]?.score || 0;
      return currentScore < worstScore ? joint : worst;
    }, jointsOfInterest[0]),
    advancedScore: advancedAnalysis?.overall_score || 0,
    balanceScore: advancedAnalysis?.balance_metrics?.stability_score || 0,
    repCount: advancedAnalysis ? 
      Object.values(advancedAnalysis.repetition_analysis || {})
        .reduce((sum: number, analysis: any) => sum + (analysis.rep_count || 0), 0) : 0
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <h3 style={{ fontSize: 21, fontWeight: 500, marginBottom: 0, color: 'var(--results-summary-title)' }}>Motion Summary</h3>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 27, fontWeight: 700 }}>{sessionStats.overallScore}%</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Overall Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 27, fontWeight: 700 }}>{sessionStats.grade}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Grade</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 27, fontWeight: 700 }}>{sessionStats.repCount}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Repetitions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 27, fontWeight: 700 }}>{typeof sessionStats.balanceScore === 'number' ? sessionStats.balanceScore.toFixed(2) : sessionStats.balanceScore}%</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Balance</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--results-summary-info-bg)', color: 'var(--results-summary-info-text)', borderRadius: 8, padding: 12 }}>
            <div className="text-sm opacity-90">Best Joint</div>
            <div className="font-semibold">{sessionStats.bestJoint?.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
          <div style={{ background: 'var(--results-summary-info-bg)', color: 'var(--results-summary-info-text)', borderRadius: 8, padding: 12 }}>
            <div className="text-sm opacity-90">Needs Work</div>
            <div className="font-semibold">{sessionStats.worstJoint?.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
        </div>
      </div>
      {/* Quick Actions */}
      <div style={{ background: 'var(--results-summary-bg)', color: 'var(--results-summary-title)', borderRadius: 6, boxShadow: 'var(--results-summary-shadow)', border: '1px solid var(--results-summary-border)', padding: 21, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <h3 style={{ fontSize: 21, fontWeight: 500, marginBottom: '6px', color: 'var(--results-summary-title)' }}>Quick Actions</h3>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button 
            onClick={() => setIsAssetModalOpen(true)}
            className="px-4 py-2 border-2 rounded-md font-medium text-sm hover:bg-purple-600 transition"
            style={{ background: 'transparent', borderColor: '#2CFF05', color: '--primary-button-text' , cursor: 'pointer' }}
          >
            Create Shareable Asset
          </button>
          <button
            onClick={downloadMotionData}
            className={`px-4 py-2 border-2 rounded-md font-medium text-sm hover:bg-green-600 transition${!poses || poses.length === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
            style={{ background: 'transparent', borderColor: '#D805FF', color: '--primary-button-text' , cursor: 'pointer' }}
            disabled={!poses || poses.length === 0}
          >
            Download Motion Data
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 border-2 rounded-md font-medium text-sm hover:bg-blue-600 transition"
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

  // Video tracking state
  const [currentFrame, setCurrentFrame] = useState<number>(0); // For video->chart sync
  const [seekFrame, setSeekFrame] = useState<number | null>(null); // For chart->video sync
  const [referenceFrame, setReferenceFrame] = useState(0);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [referencePoses, setReferencePoses] = useState<any[]>([]);

  // Fetch exercise data
  useEffect(() => {
    const fetchExercise = async () => {
      try {
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
        
        // Convert string arrays back to arrays
        const formattedExercise: Exercise = {
          ...exerciseData,
          tags: Array.isArray(exerciseData.tags) ? exerciseData.tags : (exerciseData.tags ? exerciseData.tags.split(',').filter(Boolean) : []),
          equipment: Array.isArray(exerciseData.equipment) ? exerciseData.equipment : (exerciseData.equipment ? exerciseData.equipment.split(',').filter(Boolean) : []),
          muscleGroups: Array.isArray(exerciseData.muscleGroups) ? exerciseData.muscleGroups : (exerciseData.muscleGroups ? exerciseData.muscleGroups.split(',').filter(Boolean) : []),
          jointsOfInterest: Array.isArray(exerciseData.jointsOfInterest) ? exerciseData.jointsOfInterest : (exerciseData.jointsOfInterest ? exerciseData.jointsOfInterest.split(',').filter(Boolean) : []),
          instructions: Array.isArray(exerciseData.instructions) ? exerciseData.instructions : (exerciseData.instructions ? JSON.parse(exerciseData.instructions) : []),
          relatedExercises: Array.isArray(exerciseData.relatedExercises) ? exerciseData.relatedExercises : (exerciseData.relatedExercises ? exerciseData.relatedExercises.split(',').filter(Boolean) : []),
          author: { name: exerciseData.authorName || 'Unknown', profileUrl: exerciseData.authorProfileUrl }
        };

        setExercise(formattedExercise);

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
          console.log('Reference keypoints loaded:', keypointsData.length, 'frames');
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
        if (exercise.referenceVideoUrl) {
          // Get signed URL for reference video if it's a Google Cloud Storage path
          if (!exercise.referenceVideoUrl.startsWith('http') && !exercise.referenceVideoUrl.startsWith('/')) {
            try {
              const signedUrlResponse = await fetch('/api/storage/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: exercise.referenceVideoUrl }),
              });
              
              if (signedUrlResponse.ok) {
                const { signedUrl } = await signedUrlResponse.json();
                setReferenceVideoUrl(signedUrl);
              } else {
                setReferenceVideoUrl(exercise.referenceVideoUrl);
              }
            } catch (error) {
              console.error('Error getting signed URL for reference video:', error);
              setReferenceVideoUrl(exercise.referenceVideoUrl);
            }
          } else {
            setReferenceVideoUrl(exercise.referenceVideoUrl);
          }
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
      if (!isBackendHealthy) {
        console.log('Python backend not available, skipping advanced analysis');
        setIsLoadingAdvanced(false);
        return;
      }
      
      // Prepare analysis data
      const analysisData = advancedAnalysisService.prepareAnalysisData(
        userAngles,
        refAngles,
        exercise.jointsOfInterest,
        exercise.title,
        {
          video_duration: poses.length / 30, // Assuming 30fps
          frame_count: poses.length,
        }
      );
      
      if (!analysisData) {
        console.log('Could not prepare analysis data');
        setIsLoadingAdvanced(false);
        return;
      }
      
      // Run advanced analysis
      const result = await advancedAnalysisService.analyzeExercise(analysisData);
      setAdvancedAnalysis(result);
      
    } catch (error) {
      console.error('Advanced analysis failed:', error);
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
            console.log('Results page - Setting comparison from localStorage:', parsedComparison);
            setComparisonResults(parsedComparison);
          } else if (referenceAngles && exercise?.jointsOfInterest) {
            // Recalculate comparison if we have the data
            console.log('Recalculating comparison in results page...');
            const recalculatedComparison = calculateComparison(parsedAngles, referenceAngles, exercise.jointsOfInterest);
            console.log('Recalculated comparison:', recalculatedComparison);
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
            onUserFrameChange={setCurrentFrame}
            seekFrame={seekFrame}
            onSeekFrameHandled={() => setSeekFrame(null)}
            onReferenceFrameChange={setReferenceFrame}
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
