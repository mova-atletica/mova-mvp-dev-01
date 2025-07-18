"use client";
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { AdvancedAnalysisResult } from '../lib/advancedAnalysisService';
import {
  generateMuybridgeSequence,
  generateMotionTrail,
  generateCompositeImage,
  generateGeometricOverlay,
  generateSummaryCard,
  downloadAsset,
  shareAsset,
  GeneratedAsset
} from '../lib/assetGeneration';

interface AdvancedResultsDisplayProps {
  basicComparison: any;
  advancedAnalysis: AdvancedAnalysisResult | null;
  exerciseTitle: string;
  userAngles: any;
  referenceAngles: any;
  jointsOfInterest: string[];
  isLoadingAdvanced: boolean;
  onRetryAdvanced?: () => void;
  poses?: any[];
  videoUrl?: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function AdvancedResultsDisplay({
  basicComparison,
  advancedAnalysis,
  exerciseTitle,
  userAngles,
  referenceAngles,
  jointsOfInterest,
  isLoadingAdvanced,
  onRetryAdvanced,
  poses,
  videoUrl
}: AdvancedResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'summary'>('basic');

  // Prepare data for charts
  const prepareAngleComparisonData = () => {
    if (!userAngles || !referenceAngles) return [];
    
    const maxLength = Math.max(
      ...Object.values(userAngles).map((arr: any) => arr.length),
      ...Object.values(referenceAngles).map((arr: any) => arr.length)
    );
    
    const data = [];
    for (let i = 0; i < maxLength; i++) {
      const point: any = { frame: i };
      
      jointsOfInterest.forEach(joint => {
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

  const prepareJointScoresData = () => {
    if (!advancedAnalysis) return [];
    
    return jointsOfInterest.map(joint => {
      const analysis = advancedAnalysis.joint_analysis?.[joint] || {};
      return {
        joint: joint.replace(/([A-Z])/g, ' $1').trim(),
        dtw_score: analysis.dtw_score || 0,
        cosine_score: analysis.cosine_score || 0,
        rom_score: analysis.rom_score || 0,
        basic_score: basicComparison?.[joint]?.score || 0
      };
    });
  };

  const prepareRadarData = () => {
    if (!advancedAnalysis) return [];
    
    return [
      {
        metric: "DTW Pattern",
        score: Math.round(
          Object.values(advancedAnalysis.joint_analysis || {})
            .reduce((sum, analysis) => sum + (analysis.dtw_score || 0), 0) / 
          Math.max(Object.keys(advancedAnalysis.joint_analysis || {}).length, 1)
        )
      },
      {
        metric: "Cosine Similarity",
        score: Math.round(
          Object.values(advancedAnalysis.joint_analysis || {})
            .reduce((sum, analysis) => sum + (analysis.cosine_score || 0), 0) / 
          Math.max(Object.keys(advancedAnalysis.joint_analysis || {}).length, 1)
        )
      },
      {
        metric: "Range of Motion",
        score: Math.round(
          Object.values(advancedAnalysis.joint_analysis || {})
            .reduce((sum, analysis) => sum + (analysis.rom_score || 0), 0) / 
          Math.max(Object.keys(advancedAnalysis.joint_analysis || {}).length, 1)
        )
      },
      {
        metric: "Tempo Match",
        score: Math.round(
          Object.values(advancedAnalysis.tempo_analysis || {})
            .reduce((sum, analysis) => sum + (analysis.tempo_score || 0), 0) / 
          Math.max(Object.keys(advancedAnalysis.tempo_analysis || {}).length, 1)
        )
      },
      {
        metric: "Balance",
        score: Math.round(advancedAnalysis.balance_metrics?.stability_score || 0)
      },
      {
        metric: "Repetition Consistency",
        score: Math.round(
          Object.values(advancedAnalysis.repetition_analysis || {})
            .reduce((sum, analysis) => sum + (analysis.consistency || 0), 0) / 
          Math.max(Object.keys(advancedAnalysis.repetition_analysis || {}).length, 1)
        )
      }
    ];
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-onyx-10 mb-2">{exerciseTitle} Analysis</h1>
        <p className="text-onyx-30">Comprehensive motion analysis results</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Analysis
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Advanced Analysis
              {advancedAnalysis && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Available
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Session Summary & Assets
              <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                New
              </span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'basic' && (
            <BasicAnalysisTab 
              basicComparison={basicComparison}
              userAngles={userAngles}
              referenceAngles={referenceAngles}
              jointsOfInterest={jointsOfInterest}
            />
          )}

          {activeTab === 'advanced' && (
            <AdvancedAnalysisTab
              advancedAnalysis={advancedAnalysis}
              isLoadingAdvanced={isLoadingAdvanced}
              onRetryAdvanced={onRetryAdvanced}
              prepareJointScoresData={prepareJointScoresData}
              prepareRadarData={prepareRadarData}
              getGradeColor={getGradeColor}
              getScoreColor={getScoreColor}
            />
          )}

          {activeTab === 'summary' && (
            <SessionSummaryTab
              basicComparison={basicComparison}
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
    </div>
  );
}

// Basic Analysis Tab Component
function BasicAnalysisTab({ basicComparison, userAngles, referenceAngles, jointsOfInterest }: any) {
  const prepareAngleComparisonData = () => {
    if (!userAngles || !referenceAngles) return [];
    
    const maxLength = Math.max(
      ...Object.values(userAngles).map((arr: any) => arr.length),
      ...Object.values(referenceAngles).map((arr: any) => arr.length)
    );
    
    const data = [];
    for (let i = 0; i < maxLength; i++) {
      const point: any = { frame: i };
      
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

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Overall Score</h3>
          <div className="text-4xl font-bold">{basicComparison?.overall?.score || 0}%</div>
          <div className="text-sm opacity-90">Grade: {basicComparison?.overall?.grade || 'N/A'}</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Joints Analyzed</h3>
          <div className="text-4xl font-bold">{jointsOfInterest.length}</div>
          <div className="text-sm opacity-90">Primary focus areas</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Analysis Method</h3>
          <div className="text-2xl font-bold">Frame-by-Frame</div>
          <div className="text-sm opacity-90">Direct angle comparison</div>
        </div>
      </div>

      {/* Joint Scores */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Joint Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jointsOfInterest.map((joint: string) => {
            const jointData = basicComparison?.[joint];
            const score = jointData?.score || 0;
            const avgDiff = jointData?.avgDifference || 0;
            
            return (
              <div key={joint} className="border rounded-lg p-4">
                <h4 className="font-semibold text-onyx-10 mb-2">
                  {joint.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-onyx-30">Score:</span>
                    <span className={`font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {score}%
                    </span>
                  </div>
                              <div className="flex justify-between">
              <span className="text-sm text-onyx-30">Avg Difference:</span>
              <span className="font-medium">{typeof avgDiff === 'number' ? avgDiff.toFixed(1) : '0.0'}°</span>
            </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Angle Comparison Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Angle Comparison Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={prepareAngleComparisonData()}>
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Advanced Analysis Tab Component
function AdvancedAnalysisTab({ 
  advancedAnalysis, 
  isLoadingAdvanced, 
  onRetryAdvanced,
  prepareJointScoresData,
  prepareRadarData,
  getGradeColor,
  getScoreColor
}: any) {
  if (isLoadingAdvanced) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-onyx-10 mb-2">Running Advanced Analysis...</h3>
        <p className="text-onyx-30">This may take a few moments as we analyze your movement patterns</p>
      </div>
    );
  }

  if (!advancedAnalysis) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔬</div>
        <h3 className="text-lg font-semibold text-onyx-10 mb-2">Advanced Analysis Not Available</h3>
        <p className="text-onyx-30 mb-4">
          Advanced analysis requires the Python backend to be running. 
          This provides deeper insights using DTW, cosine similarity, and biomechanical analysis.
        </p>
        {onRetryAdvanced && (
          <button
            onClick={onRetryAdvanced}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Retry Advanced Analysis
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Advanced Score</h3>
          <div className="text-4xl font-bold">{Math.round(advancedAnalysis.overall_score || 0)}%</div>
          <div className={`text-2xl font-bold ${getGradeColor(advancedAnalysis.grade || 'F')}`}>
            Grade: {advancedAnalysis.grade || 'F'}
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Confidence</h3>
          <div className="text-4xl font-bold">{Math.round(advancedAnalysis.confidence || 0)}%</div>
          <div className="text-sm opacity-90">Analysis reliability</div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Balance Score</h3>
          <div className="text-4xl font-bold">{Math.round(advancedAnalysis.balance_metrics?.stability_score || 0)}%</div>
          <div className="text-sm opacity-90">Stability during exercise</div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Repetitions</h3>
          <div className="text-4xl font-bold">
            {Object.values(advancedAnalysis.repetition_analysis)
              .reduce((sum: number, analysis: any) => sum + (analysis.rep_count || 0), 0)}
          </div>
          <div className="text-sm opacity-90">Total detected</div>
        </div>
      </div>

      {/* Radar Chart - Overall Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Performance Radar</h3>
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

      {/* Joint Analysis Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Advanced Joint Analysis</h3>
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

      {/* Improvement Suggestions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Improvement Suggestions</h3>
        <div className="space-y-3">
          {(advancedAnalysis.improvement_suggestions || []).map((suggestion: string, index: number) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-blue-500 text-lg">💡</div>
              <p className="text-onyx-10">{suggestion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-onyx-10 mb-4">Balance & Stability</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-onyx-30">Stability Score:</span>
              <span className={`font-bold ${getScoreColor(advancedAnalysis.balance_metrics?.stability_score || 0)}`}>
                {Math.round(advancedAnalysis.balance_metrics?.stability_score || 0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-onyx-30">Symmetry Score:</span>
              <span className={`font-bold ${getScoreColor(advancedAnalysis.balance_metrics?.symmetry_score || 0)}`}>
                {Math.round(advancedAnalysis.balance_metrics?.symmetry_score || 0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-onyx-30">Sway Variance:</span>
              <span className="font-medium">
                {advancedAnalysis.balance_metrics?.sway_metrics?.variance ? 
                  advancedAnalysis.balance_metrics.sway_metrics.variance.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Repetition Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-onyx-10 mb-4">Repetition Analysis</h3>
          <div className="space-y-4">
            {Object.entries(advancedAnalysis.repetition_analysis || {}).map(([joint, analysis]: [string, any]) => (
              <div key={joint} className="border-b border-gray-200 pb-3">
                <h4 className="font-semibold text-onyx-10 mb-2">
                  {joint.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Reps: {analysis.rep_count || 0}</div>
                  <div>Consistency: {Math.round(analysis.consistency || 0)}%</div>
                  <div>Avg Duration: {typeof analysis.avg_duration === 'number' ? analysis.avg_duration.toFixed(2) : '0.00'}s</div>
                  <div>Avg ROM: {typeof analysis.avg_rom === 'number' ? analysis.avg_rom.toFixed(1) : '0.0'}°</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 

// Session Summary & Assets Tab Component
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
  const [generatedAssets, setGeneratedAssets] = useState<{ [key: string]: GeneratedAsset }>({});

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
      Object.values(advancedAnalysis.repetition_analysis)
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

  const generateAsset = async (assetType: string) => {
    if (!poses || poses.length === 0) {
      alert('No pose data available. Please complete a workout session first.');
      return;
    }

    setIsGenerating(true);
    setSelectedAsset(assetType);
    
    try {
      let generatedAsset: GeneratedAsset | null = null;
      
      switch (assetType) {
        case 'muybridge':
          generatedAsset = await generateMuybridgeSequence(poses);
          break;
        case 'motion-trail':
          generatedAsset = await generateMotionTrail(poses);
          break;
        case 'composite':
          generatedAsset = await generateCompositeImage(poses);
          break;
        case 'geometric':
          generatedAsset = await generateGeometricOverlay(poses);
          break;
        case 'summary-card':
          generatedAsset = await generateSummaryCard(poses, sessionStats, exerciseTitle);
          break;
        default:
          throw new Error(`Unknown asset type: ${assetType}`);
      }

      if (generatedAsset) {
        setGeneratedAssets(prev => ({
          ...prev,
          [assetType]: generatedAsset
        }));
        console.log('Generated Asset:', generatedAsset);
      }
    } catch (error) {
      console.error('Error generating asset:', error);
      alert(`Error generating ${assetType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsset = (assetType: string) => {
    const asset = generatedAssets[assetType];
    if (asset) {
      const link = document.createElement('a');
      link.href = asset.data;
      link.download = asset.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Asset not generated yet. Please generate it first.');
    }
  };

  const shareAsset = async (assetType: string) => {
    const asset = generatedAssets[assetType];
    if (asset) {
      try {
        if (navigator.share) {
          // Convert data URL to blob for sharing
          const response = await fetch(asset.data);
          const blob = await response.blob();
          
          await navigator.share({
            title: 'My Workout Session',
            text: `Check out my ${assetType} from my ${exerciseTitle} workout!`,
            files: [new File([blob], asset.filename, { type: asset.mimeType })]
          });
        } else {
          // Fallback to copying link
          navigator.clipboard.writeText(window.location.href);
          alert('Session link copied to clipboard!');
        }
      } catch (error) {
        console.error('Error sharing asset:', error);
        // Fallback to download
        downloadAsset(assetType);
      }
    } else {
      alert('Asset not generated yet. Please generate it first.');
    }
  };

  const downloadAllAssets = async () => {
    const generatedAssetTypes = Object.keys(generatedAssets);
    if (generatedAssetTypes.length === 0) {
      alert('No assets generated yet. Please generate some assets first.');
      return;
    }

    // Download each asset
    generatedAssetTypes.forEach(assetType => {
      downloadAsset(assetType);
    });
  };

  const shareSession = async () => {
    // Create a simple session summary for sharing
    const sessionText = `My ${exerciseTitle} workout session:
Score: ${sessionStats.overallScore}% (Grade: ${sessionStats.grade})
Repetitions: ${sessionStats.repCount}
Balance Score: ${sessionStats.balanceScore}%
Best Joint: ${sessionStats.bestJoint?.replace(/([A-Z])/g, ' $1').trim()}
Needs Work: ${sessionStats.worstJoint?.replace(/([A-Z])/g, ' $1').trim()}

Generated with Mova - Advanced Exercise Analysis`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Workout Session',
          text: sessionText,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing session:', error);
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(sessionText);
        alert('Session summary copied to clipboard!');
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(sessionText);
      alert('Session summary copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Summary Card */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-4">Session Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.overallScore}%</div>
            <div className="text-sm opacity-90">Overall Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.grade}</div>
            <div className="text-sm opacity-90">Grade</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.repCount}</div>
            <div className="text-sm opacity-90">Repetitions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sessionStats.balanceScore}%</div>
            <div className="text-sm opacity-90">Balance</div>
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
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Creative Assets</h3>
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
                  
                  <div className="bg-gray-100 rounded p-3 mb-3 text-sm text-onyx-30">
                    {asset.preview}
                  </div>
                  
                  <div className="flex gap-2">
                    {isCurrentlyGenerating ? (
                      <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                      </button>
                    ) : (
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
                    )}
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
        <h3 className="text-xl font-bold text-onyx-10 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
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
            className="bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition"
          >
            🎯 Try Again
          </button>
        </div>
      </div>
    </div>
  );
} 