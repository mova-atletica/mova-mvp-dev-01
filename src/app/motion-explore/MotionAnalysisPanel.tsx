// Updated MotionAnalysisPanel.tsx
"use client";
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface MotionAnalysisPanelProps {
  poses: any[];
  angles: {
    leftKneeAngles: (number | null)[];
    rightKneeAngles: (number | null)[];
    leftHipAngles: (number | null)[];
    rightHipAngles: (number | null)[];
    leftElbowAngles: (number | null)[];
    rightElbowAngles: (number | null)[];
    leftShoulderAbdAngles: (number | null)[];
    rightShoulderAbdAngles: (number | null)[];
    trunkAngles: (number | null)[];
  };
  videoUrl: string;
}

type TabType = 'overview' | 'joints';

export default function MotionAnalysisPanel({ poses, angles, videoUrl }: MotionAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Early return if no data
  if (!poses || poses.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">��</div>
          <p style={{ color: 'var(--foreground)' }}>No motion data available</p>
        </div>
      </div>
    );
  }

  // Calculate basic statistics
  const stats = useMemo(() => {
    const totalFrames = poses.length;
    const validFrames = poses.filter(pose => pose && pose.keypoints && pose.keypoints.length > 0).length;
    
    // Calculate range of motion for each joint
    const calculateROM = (angleArray: (number | null)[]) => {
      const validAngles = angleArray.filter(angle => angle !== null) as number[];
      if (validAngles.length === 0) return { min: 0, max: 0, range: 0, avg: 0 };
      
      const min = Math.min(...validAngles);
      const max = Math.max(...validAngles);
      const range = max - min;
      const avg = validAngles.reduce((sum, angle) => sum + angle, 0) / validAngles.length;
      
      return { min, max, range, avg };
    };

    const jointStats = {
      leftKnee: calculateROM(angles.leftKneeAngles),
      rightKnee: calculateROM(angles.rightKneeAngles),
      leftHip: calculateROM(angles.leftHipAngles),
      rightHip: calculateROM(angles.rightHipAngles),
      leftElbow: calculateROM(angles.leftElbowAngles),
      rightElbow: calculateROM(angles.rightElbowAngles),
      leftShoulder: calculateROM(angles.leftShoulderAbdAngles),
      rightShoulder: calculateROM(angles.rightShoulderAbdAngles),
      trunk: calculateROM(angles.trunkAngles)
    };

    // Calculate symmetry (left vs right)
    const calculateSymmetry = (left: any, right: any) => {
      if (left.avg === 0 || right.avg === 0) return 0;
      const diff = Math.abs(left.avg - right.avg);
      return Math.max(0, 100 - (diff / Math.max(left.avg, right.avg)) * 100);
    };

    const symmetry = {
      knee: calculateSymmetry(jointStats.leftKnee, jointStats.rightKnee),
      hip: calculateSymmetry(jointStats.leftHip, jointStats.rightHip),
      elbow: calculateSymmetry(jointStats.leftElbow, jointStats.rightElbow),
      shoulder: calculateSymmetry(jointStats.leftShoulder, jointStats.rightShoulder)
    };

    return {
      totalFrames,
      validFrames,
      detectionRate: (validFrames / totalFrames) * 100,
      jointStats,
      symmetry
    };
  }, [poses, angles]);

  // Prepare chart data for joint angles over time
  const chartData = useMemo(() => {
    return poses.map((_, index) => ({
      frame: index,
      leftKnee: angles.leftKneeAngles[index] || 0,
      rightKnee: angles.rightKneeAngles[index] || 0,
      leftHip: angles.leftHipAngles[index] || 0,
      rightHip: angles.rightHipAngles[index] || 0,
      leftElbow: angles.leftElbowAngles[index] || 0,
      rightElbow: angles.rightElbowAngles[index] || 0,
    }));
  }, [poses, angles]);

  // Prepare ROM data for bar chart
  const romData = useMemo(() => {
    return [
      { joint: 'Left Knee', range: stats.jointStats.leftKnee.range, avg: stats.jointStats.leftKnee.avg },
      { joint: 'Right Knee', range: stats.jointStats.rightKnee.range, avg: stats.jointStats.rightKnee.avg },
      { joint: 'Left Hip', range: stats.jointStats.leftHip.range, avg: stats.jointStats.leftHip.avg },
      { joint: 'Right Hip', range: stats.jointStats.rightHip.range, avg: stats.jointStats.rightHip.avg },
      { joint: 'Left Elbow', range: stats.jointStats.leftElbow.range, avg: stats.jointStats.leftElbow.avg },
      { joint: 'Right Elbow', range: stats.jointStats.rightElbow.range, avg: stats.jointStats.rightElbow.avg },
    ];
  }, [stats.jointStats]);

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'joints' as TabType, label: 'Joints' }
  ];

  const renderOverviewTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Session Overview</h3>
      
      {/* Basic Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold text-blue-600">{stats.totalFrames}</div>
          <div className="text-sm" style={{ color: 'var(--foreground)' }}>Total Frames</div>
        </div>
        <div className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold text-green-600">{stats.detectionRate.toFixed(1)}%</div>
          <div className="text-sm" style={{ color: 'var(--foreground)' }}>Detection Rate</div>
        </div>
      </div>

      {/* Range of Motion Chart */}
      <div>
        <h4 className="text-md font-medium mb-2" style={{ color: 'var(--foreground)' }}>Range of Motion</h4>
        {romData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={romData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="joint" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="range" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>

      {/* Symmetry Analysis */}
      <div>
        <h4 className="text-md font-medium mb-2" style={{ color: 'var(--foreground)' }}>Symmetry Analysis</h4>
        <div className="space-y-2">
          {Object.entries(stats.symmetry).map(([joint, score]) => (
            <div key={joint} className="flex justify-between items-center">
              <span className="text-sm capitalize">{joint}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{score.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Data Section */}
      <div>
        <h4 className="text-md font-medium mb-2" style={{ color: 'var(--foreground)' }}>Export Motion Data</h4>
        <div className="space-y-2">
          <button
            className="w-full p-2 rounded-lg font-medium text-sm text-left transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }}
            onClick={() => {
              // Export as CSV
              const csvData = chartData.map(row => 
                `Frame ${row.frame},${row.leftKnee},${row.rightKnee},${row.leftHip},${row.rightHip},${row.leftElbow},${row.rightElbow}`
              ).join('\n');
              const csv = `Frame,Left Knee,Right Knee,Left Hip,Right Hip,Left Elbow,Right Elbow\n${csvData}`;
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'motion-data.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export as CSV
          </button>
          
          <button
            className="w-full p-2 rounded-lg font-medium text-sm text-left transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }}
            onClick={() => {
              // Export as JSON
              const jsonData = {
                poses,
                angles,
                stats,
                timestamp: new Date().toISOString()
              };
              
              const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'motion-data.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export as JSON
          </button>

        </div>
      </div>
    </div>
  );

  const renderJointsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Joint Analysis</h3>
      
      {/* Joint Angles Over Time */}
      <div>
        <h4 className="text-md font-medium mb-2" style={{ color: 'var(--foreground)' }}>Joint Angles Over Time</h4>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="frame" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="leftKnee" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="rightKnee" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="leftHip" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="rightHip" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-72 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>

      {/* Joint Statistics */}
      <div>
        <h4 className="text-md font-medium mb-2" style={{ color: 'var(--foreground)' }}>Joint Statistics</h4>
        <div className="space-y-2">
          {Object.entries(stats.jointStats).map(([joint, data]) => (
            <div key={joint} className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <div className="font-medium capitalize mb-1">{joint.replace(/([A-Z])/g, ' $1')}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Min: {data.min.toFixed(0)}°</div>
                <div>Max: {data.max.toFixed(0)}°</div>
                <div>Range: {data.range.toFixed(0)}°</div>
                <div>Avg: {data.avg.toFixed(0)}°</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation - Using Results Page Styling */}
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              borderRadius: 6,
              padding: '3px 6px',
              marginRight: 6,
              background: activeTab === tab.id ? 'var(--results-tab-bg-active)' : 'var(--results-tab-bg-inactive)',
              color: activeTab === tab.id ? 'var(--results-tab-text-active)' : 'var(--results-tab-text-inactive)',
              border: `1.5px solid ${activeTab === tab.id ? 'var(--results-tab-border-active)' : 'var(--results-tab-border-inactive)'}`,
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 500,
              transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
            onMouseOver={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'var(--results-tab-hover-bg)';
                e.currentTarget.style.color = 'var(--results-tab-hover-text)';
                e.currentTarget.style.border = '1.5px solid var(--results-tab-hover-border)';
              }
            }}
            onMouseOut={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'var(--results-tab-bg-inactive)';
                e.currentTarget.style.color = 'var(--results-tab-text-inactive)';
                e.currentTarget.style.border = '1.5px solid var(--results-tab-border-inactive)';
              }
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'joints' && renderJointsTab()}
      </div>

    </div>
  );
}