"use client";
import { useParams, useSearchParams } from "next/navigation";
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
  const [activeTab, setActiveTab] = useState<'charts' | 'feedback' | 'summary'>('charts');
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex border-b border-gray-200 bg-white">
        <button
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'charts' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('charts')}
        >
          Charts
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'feedback' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('feedback')}
        >
          Feedback
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'summary' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
      </div>
      <div className="flex-1 p-4 bg-white overflow-y-auto">
        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Angle Comparison Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-onyx-10">Angle Comparison Over Time</h3>
                <InfoTooltip content="Shows how your joint angles compare to the reference video over time. Click on the chart to jump to that moment in your video. The vertical line shows your current video position.">
                  <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                </InfoTooltip>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={prepareAngleComparisonData()} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frame" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {jointsOfInterest.map((joint: string, index: number) => (
                    <React.Fragment key={joint}>
                      <Line
                        type="monotone"
                        dataKey={`${joint}_user`}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        name={`${joint} (User)`}
                      />
                      <Line
                        type="monotone"
                        dataKey={`${joint}_ref`}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={`${joint} (Reference)`}
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
            {/* Advanced Analysis Charts */}
            {advancedAnalysis ? (
              <>
                {/* Radar Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-onyx-10">Performance Radar</h3>
                    <InfoTooltip content="Overall performance metrics across different analysis methods. Larger areas indicate better performance. This gives you a quick visual overview of your movement quality.">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                    </InfoTooltip>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={prepareRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Performance"
                        dataKey="score"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* Bar Chart: Joint Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-onyx-10">Advanced Joint Analysis</h3>
                    <InfoTooltip content="Detailed analysis of each joint using multiple metrics: DTW Pattern (movement similarity), Cosine Similarity (angle patterns), Range of Motion (flexibility), and Basic Score (overall accuracy).">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                    </InfoTooltip>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepareJointScoresData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="joint" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="dtw_score" fill="#0088FE" name="DTW Pattern" />
                      <Bar dataKey="cosine_score" fill="#00C49F" name="Cosine Similarity" />
                      <Bar dataKey="rom_score" fill="#FFBB28" name="Range of Motion" />
                      <Bar dataKey="basic_score" fill="#FF8042" name="Basic Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Balance & Stability */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-onyx-10">Balance & Stability</h3>
                    <InfoTooltip content="Measures your balance and stability during the exercise. Higher scores indicate better control and less sway. Most relevant for exercises requiring balance like squats or single-leg movements.">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
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
                      <span className="font-bold">{Math.round(advancedAnalysis.balance_metrics?.stability_score || 0)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-onyx-30">Symmetry Score:</span>
                        <InfoTooltip content="How balanced your movement was between left and right sides. Higher scores indicate more symmetrical movement.">
                          <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                        </InfoTooltip>
                      </div>
                      <span className="font-bold">{Math.round(advancedAnalysis.balance_metrics?.symmetry_score || 0)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-onyx-30">Sway Variance:</span>
                        <InfoTooltip content="A measure of how much your center of mass moved during the exercise. Lower values indicate better balance control.">
                          <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                        </InfoTooltip>
                      </div>
                      <span className="font-medium">{advancedAnalysis.balance_metrics?.sway_metrics?.variance ? advancedAnalysis.balance_metrics.sway_metrics.variance.toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </div>
                {/* Repetition Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-onyx-10">Repetition Analysis</h3>
                    <InfoTooltip content="Detailed breakdown of your repetitions for each joint. Shows consistency, timing, and range of motion across multiple reps. Most useful for exercises with clear repetitions like squats or push-ups.">
                      <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                    </InfoTooltip>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(advancedAnalysis.repetition_analysis || {}).map(([joint, analysis]: [string, any]) => (
                      <div key={joint} className="border-b border-gray-200 pb-3">
                        <h4 className="font-semibold text-onyx-10 mb-2">
                          {joint.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <span>Reps:</span>
                            <InfoTooltip content="Number of complete repetitions detected for this joint.">
                              <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                            </InfoTooltip>
                            <span>{analysis.rep_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Consistency:</span>
                            <InfoTooltip content="How similar each repetition was to the others. Higher percentages mean more consistent form.">
                              <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                            </InfoTooltip>
                            <span>{Math.round(analysis.consistency || 0)}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Avg Duration:</span>
                            <InfoTooltip content="Average time it took to complete each repetition.">
                              <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                            </InfoTooltip>
                            <span>{typeof analysis.avg_duration === 'number' ? analysis.avg_duration.toFixed(2) : '0.00'}s</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Avg ROM:</span>
                            <InfoTooltip content="Average range of motion achieved during each repetition.">
                              <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                            </InfoTooltip>
                            <span>{typeof analysis.avg_rom === 'number' ? analysis.avg_rom.toFixed(1) : '0.0'}°</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-onyx-30">Advanced analysis charts will appear here when available.</div>
            )}
          </div>
        )}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            {/* Overall Feedback */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-onyx-10">Overall Feedback</h3>
                <InfoTooltip content="Your overall performance score and grade based on how well your joint angles matched the reference video. The advanced score uses more sophisticated analysis methods.">
                  <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-onyx-10">Joint-by-Joint Feedback</h3>
                <InfoTooltip content="Detailed feedback for each joint showing your score and average angle difference from the reference. Green scores (80%+) are excellent, yellow (60-79%) need improvement, red (below 60%) need significant work.">
                  <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                </InfoTooltip>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jointsOfInterest?.map((joint: string) => {
                  const jointData = comparisonResults?.[joint];
                  const score = jointData?.score || 0;
                  const avgDiff = jointData?.avgDifference || 0;
                  return (
                    <div key={joint} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-onyx-10 mb-2">
                        {joint.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-onyx-30">Score:</span>
                            <InfoTooltip content="Percentage accuracy of your joint angles compared to the reference video. Higher is better.">
                              <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                            </InfoTooltip>
                          </div>
                          <span className={`font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-onyx-30">Avg Difference:</span>
                            <InfoTooltip content="Average difference in degrees between your joint angles and the reference video. Lower is better.">
                              <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
                            </InfoTooltip>
                          </div>
                          <span className="font-medium">{typeof avgDiff === 'number' ? avgDiff.toFixed(1) : '0.0'}°</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Improvement Suggestions */}
            {(advancedAnalysis?.improvement_suggestions?.length > 0) && (
              <div className="bg-blue-50 rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-onyx-10">Improvement Suggestions</h3>
                  <InfoTooltip content="AI-generated suggestions based on your performance analysis. These are specific, actionable tips to help you improve your form and technique.">
                    <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                  </InfoTooltip>
                </div>
                <div className="space-y-3">
                  {advancedAnalysis.improvement_suggestions.map((suggestion: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                      <div className="text-blue-500 text-lg">💡</div>
                      <p className="text-onyx-10">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!advancedAnalysis?.improvement_suggestions || advancedAnalysis.improvement_suggestions.length === 0) && (
              <div className="bg-blue-50 rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-onyx-10">Improvement Suggestions</h3>
                  <InfoTooltip content="AI-generated suggestions based on your performance analysis. These are specific, actionable tips to help you improve your form and technique.">
                    <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
                  </InfoTooltip>
                </div>
                <div className="text-onyx-30">No specific suggestions available. Review your joint scores above for areas to improve.</div>
              </div>
            )}
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

  const shareSession = async () => {
    alert('Share session (placeholder)');
  };

  return (
    <div className="space-y-6">
      {/* Session Summary Card */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-2xl font-bold">Session Summary</h3>
          <InfoTooltip content="Overview of your workout session with key performance metrics and highlights.">
            <span className="text-white opacity-80 hover:opacity-100 cursor-help">ⓘ</span>
          </InfoTooltip>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.overallScore}%</div>
            <div className="flex items-center justify-center gap-1 text-sm opacity-90">
              <span>Overall Score</span>
              <InfoTooltip content="Your overall performance score based on joint angle accuracy compared to the reference video.">
                <span className="text-white opacity-80 hover:opacity-100 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.grade}</div>
            <div className="flex items-center justify-center gap-1 text-sm opacity-90">
              <span>Grade</span>
              <InfoTooltip content="Letter grade based on your overall score: A (90%+), B (80-89%), C (70-79%), D (60-69%), F (below 60%).">
                <span className="text-white opacity-80 hover:opacity-100 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.repCount}</div>
            <div className="flex items-center justify-center gap-1 text-sm opacity-90">
              <span>Repetitions</span>
              <InfoTooltip content="Total number of complete repetitions detected across all joints during your session.">
                <span className="text-white opacity-80 hover:opacity-100 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.balanceScore}%</div>
            <div className="flex items-center justify-center gap-1 text-sm opacity-90">
              <span>Balance</span>
              <InfoTooltip content="Your stability score measuring how steady you maintained your position throughout the exercise.">
                <span className="text-white opacity-80 hover:opacity-100 cursor-help text-xs">ⓘ</span>
              </InfoTooltip>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <div className="text-sm opacity-90">Best Joint</div>
            <div className="font-semibold">{sessionStats.bestJoint?.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <div className="text-sm opacity-90">Needs Work</div>
            <div className="font-semibold">{sessionStats.worstJoint?.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
        </div>
      </div>
      {/* Creative Assets Gallery */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-bold text-onyx-10">Creative Assets</h3>
          <InfoTooltip content="Generate visual assets from your workout session to share on social media or keep for your fitness journey.">
            <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
          </InfoTooltip>
        </div>
        <p className="text-onyx-30 mb-6">Generate and share visual assets from your workout session</p>
        {!poses || poses.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📹</div>
            <h4 className="text-lg font-semibold text-onyx-10 mb-2">No Session Data Available</h4>
            <p className="text-onyx-30">Complete a workout session to generate creative assets</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetTypes.map((asset) => {
              const isGenerated = !!generatedAssets[asset.id];
              const isCurrentlyGenerating = selectedAsset === asset.id && isGenerating;
              return (
                <div key={asset.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-2xl">{asset.icon}</div>
                    <div>
                      <h4 className="font-semibold text-onyx-10">{asset.name}</h4>
                      <p className="text-sm text-onyx-30">{asset.description}</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded p-3 mb-3 text-sm text-onyx-30">{asset.preview}</div>
                  <div className="flex gap-2">
                    {isCurrentlyGenerating ? (
                      <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                      </button>
                    ) :
                      <>
                        <button
                          onClick={() => generateAsset(asset.id)}
                          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-600 transition"
                        >
                          {isGenerated ? 'Regenerate' : 'Generate'}
                        </button>
                        {isGenerated && (
                          <>
                            <button
                              onClick={() => downloadAsset(asset.id)}
                              className="bg-green-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-600 transition"
                              title="Download"
                            >
                              📥
                            </button>
                            <button
                              onClick={() => shareAsset(asset.id)}
                              className="bg-purple-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-600 transition"
                              title="Share"
                            >
                              📤
                            </button>
                          </>
                        )}
                      </>
                    }
                  </div>
                  {isGenerated && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ Generated successfully
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-bold text-onyx-10">Quick Actions</h3>
          <InfoTooltip content="Quick actions to download, share, or retry your workout session.">
            <span className="text-onyx-30 hover:text-onyx-20 cursor-help">ⓘ</span>
          </InfoTooltip>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsAssetModalOpen(true)}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition"
          >
            🎨 Create Shareable Asset
          </button>
          <button 
            onClick={downloadAllAssets}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition"
          >
            📊 Download All Assets
          </button>
          <button 
            onClick={shareSession}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition"
          >
            📱 Share Session
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition"
          >
            🎯 Try Again
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

            refAngles.leftKneeAngles.push(leftHip && leftKnee && leftAnkle ? getAngle(leftHip, leftKnee, leftAnkle) : null);
            refAngles.rightKneeAngles.push(rightHip && rightKnee && rightAnkle ? getAngle(rightHip, rightKnee, rightAnkle) : null);
            refAngles.leftHipAngles.push(leftShoulder && leftHip && leftKnee ? getAngle(leftShoulder, leftHip, leftKnee) : null);
            refAngles.rightHipAngles.push(rightShoulder && rightHip && rightKnee ? getAngle(rightShoulder, rightHip, rightKnee) : null);
            refAngles.leftElbowAngles.push(leftShoulder && leftElbow && leftWrist ? getAngle(leftShoulder, leftElbow, leftWrist) : null);
            refAngles.rightElbowAngles.push(rightShoulder && rightElbow && rightWrist ? getAngle(rightShoulder, rightElbow, rightWrist) : null);
            refAngles.leftShoulderAbdAngles.push(leftHip && leftShoulder && leftElbow ? getAngle(leftHip, leftShoulder, leftElbow) : null);
            refAngles.rightShoulderAbdAngles.push(rightHip && rightShoulder && rightElbow ? getAngle(rightHip, rightShoulder, rightElbow) : null);
            refAngles.trunkAngles.push(leftShoulder && leftHip ? getTrunkAngle(leftShoulder, leftHip) : null);
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
        <Link href="/" className="text-blue-70 underline">
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
    <main className="min-h-screen bg-onyx-100 flex flex-col items-center px-4 py-8" style={{ border: '4px solid red', maxWidth: '2560px', marginLeft: '3%', marginRight: '3%' }}>
      <div className="w-full max-w-6xl flex flex-row" style={{ border: '2px solid green', maxWidth: '2560px', minHeight: '70vh' }}>
        {/* Left: Side-by-Side Video Player (50%) */}
        <div className="flex-1 min-w-0 max-w-[50%] flex flex-col justify-start" style={{ border: '2px solid blue', maxWidth: '50%', minHeight: 0 }}>
          <SideBySideVideoPlayer
            userVideoUrl={videoUrl}
            referenceVideoUrl={referenceVideoUrl}
            userPoses={poses}
            referencePoses={referencePoses}
            onUserFrameChange={setCurrentFrame}
            seekFrame={seekFrame}
            onSeekFrameHandled={() => setSeekFrame(null)}
            onReferenceFrameChange={setReferenceFrame}
            maxHeight="70vh"
          />
        </div>
        {/* Right: Tabbed Panel (50%) */}
        <div className="flex-1 min-w-0 max-w-[50%] flex flex-col justify-start" style={{ border: '2px solid purple', maxWidth: '50%' }}>
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
      {/* Navigation */}
      <div className="mt-6 text-center" style={{ border: '2px solid orange' }}>
        <Link href={`/exercises/${exercise.id}`} className="text-blue-70 underline">
          ← Back to {exercise.title} details
        </Link>
      </div>
    </main>
  );
}
