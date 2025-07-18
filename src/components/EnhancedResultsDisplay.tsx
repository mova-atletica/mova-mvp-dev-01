"use client";
import React from 'react';
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
  Cell
} from "recharts";
import {
  EnhancedComparisonResult,
  Repetition,
  TempoAnalysis,
  BalanceMetrics
} from '../lib/analysisUtils';

interface EnhancedResultsDisplayProps {
  comparisonResult: EnhancedComparisonResult;
  balanceMetrics: BalanceMetrics;
  exerciseTitle: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function EnhancedResultsDisplay({
  comparisonResult,
  balanceMetrics,
  exerciseTitle
}: EnhancedResultsDisplayProps) {
  const { overall, joints, tempo, repetitions } = comparisonResult;

  // Prepare data for rep count chart
  const repCountData = Object.entries(joints).map(([joint, data]) => ({
    joint: joint.replace(/([A-Z])/g, ' $1').trim(),
    reps: data.repCount,
    score: data.score
  }));

  // Prepare data for tempo analysis
  const tempoData = [
    { name: 'Eccentric', value: tempo.eccentricConcentricRatio > 0 ? tempo.eccentricConcentricRatio : 0 },
    { name: 'Concentric', value: tempo.eccentricConcentricRatio > 0 ? 1 : 0 },
    { name: 'Isometric', value: 0 }
  ];

  // Prepare data for phase scores
  const phaseData = Object.entries(joints).map(([joint, data]) => ({
    joint: joint.replace(/([A-Z])/g, ' $1').trim(),
    eccentric: data.phaseScores.eccentric,
    concentric: data.phaseScores.concentric,
    isometric: data.phaseScores.isometric
  }));

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {exerciseTitle} Analysis
          </h2>
          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600">{overall.score}%</div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-purple-600">{overall.grade}</div>
              <div className="text-sm text-gray-600">Grade</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(overall.confidence * 100)}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
          </div>
        </div>
      </div>

      {/* Repetition Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Repetition Count</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="joint" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reps" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Tempo Analysis</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tempoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tempoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Eccentric:Concentric Ratio: {tempo.eccentricConcentricRatio.toFixed(2)}:1
            </div>
            <div className="text-sm text-gray-600">
              Velocity Score: {tempo.velocityScore}%
            </div>
            <div className="text-sm text-gray-600">
              Consistency: {tempo.consistencyScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Joint-by-Joint Analysis */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Joint Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Joint</th>
                <th className="text-center py-2">Score</th>
                <th className="text-center py-2">Reps</th>
                <th className="text-center py-2">Eccentric</th>
                <th className="text-center py-2">Concentric</th>
                <th className="text-center py-2">Tempo</th>
                <th className="text-center py-2">Consistency</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(joints).map(([joint, data]) => (
                <tr key={joint} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">
                    {joint.replace(/([A-Z])/g, ' $1').trim()}
                  </td>
                  <td className="text-center py-2">
                    <span className={`font-bold ${
                      data.score >= 90 ? 'text-green-600' :
                      data.score >= 80 ? 'text-yellow-600' :
                      data.score >= 70 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {data.score}%
                    </span>
                  </td>
                  <td className="text-center py-2">{data.repCount}</td>
                  <td className="text-center py-2">{data.phaseScores.eccentric}%</td>
                  <td className="text-center py-2">{data.phaseScores.concentric}%</td>
                  <td className="text-center py-2">{data.tempoScore}%</td>
                  <td className="text-center py-2">{data.consistencyScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase Analysis Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Phase Performance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={phaseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="joint" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="eccentric" fill="#8884d8" name="Eccentric" />
              <Bar dataKey="concentric" fill="#82ca9d" name="Concentric" />
              <Bar dataKey="isometric" fill="#ffc658" name="Isometric" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Balance and Stability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Balance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Stability Score:</span>
              <span className={`font-bold text-lg ${
                balanceMetrics.stabilityScore >= 80 ? 'text-green-600' :
                balanceMetrics.stabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {balanceMetrics.stabilityScore}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sway Area:</span>
              <span className="font-semibold">{balanceMetrics.swayArea.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sway Velocity:</span>
              <span className="font-semibold">{balanceMetrics.swayVelocity.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Synchronization</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {repetitions.synchronizationScore}%
            </div>
            <div className="text-sm text-gray-600 mb-4">Rep Synchronization</div>
            <div className="text-sm text-gray-500">
              User: {repetitions.user.length} reps | Reference: {repetitions.reference.length} reps
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Repetition Analysis */}
      {repetitions.user.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Repetition Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Rep #</th>
                  <th className="text-center py-2">Type</th>
                  <th className="text-center py-2">Duration (s)</th>
                  <th className="text-center py-2">Range (°)</th>
                  <th className="text-center py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {repetitions.user.slice(0, 10).map((rep, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{index + 1}</td>
                    <td className="text-center py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rep.type === 'eccentric' ? 'bg-red-100 text-red-800' :
                        rep.type === 'concentric' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rep.type}
                      </span>
                    </td>
                    <td className="text-center py-2">{rep.duration.toFixed(2)}</td>
                    <td className="text-center py-2">{rep.rangeOfMotion.toFixed(1)}</td>
                    <td className="text-center py-2">
                      <span className={`font-medium ${
                        rep.confidence >= 0.8 ? 'text-green-600' :
                        rep.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(rep.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {repetitions.user.length > 10 && (
            <div className="text-center mt-4 text-sm text-gray-600">
              Showing first 10 of {repetitions.user.length} repetitions
            </div>
          )}
        </div>
      )}

      {/* Improvement Suggestions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Improvement Suggestions</h3>
        <div className="space-y-3">
          {Object.entries(joints).map(([joint, data]) => {
            const suggestions = [];
            
            if (data.score < 80) {
              suggestions.push(`Focus on improving ${joint.replace(/([A-Z])/g, ' $1').trim()} form`);
            }
            if (data.phaseScores.eccentric < 70) {
              suggestions.push(`Work on eccentric phase control for ${joint.replace(/([A-Z])/g, ' $1').trim()}`);
            }
            if (data.phaseScores.concentric < 70) {
              suggestions.push(`Improve concentric phase power for ${joint.replace(/([A-Z])/g, ' $1').trim()}`);
            }
            if (data.consistencyScore < 70) {
              suggestions.push(`Maintain more consistent movement patterns for ${joint.replace(/([A-Z])/g, ' $1').trim()}`);
            }
            
            return suggestions.map((suggestion, index) => (
              <div key={`${joint}-${index}`} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-700">{suggestion}</span>
              </div>
            ));
          })}
          
          {tempo.velocityScore < 70 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700">Adjust movement tempo to match reference timing</span>
            </div>
          )}
          
          {balanceMetrics.stabilityScore < 70 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700">Improve balance and stability during exercise</span>
            </div>
          )}
          
          {repetitions.synchronizationScore < 70 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-gray-700">Work on consistent repetition count and timing</span>
            </div>
          )}
          
          {Object.values(joints).every(data => data.score >= 80) && 
           tempo.velocityScore >= 80 && 
           balanceMetrics.stabilityScore >= 80 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700">Excellent form! Keep practicing to maintain consistency.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 