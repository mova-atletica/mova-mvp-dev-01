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
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import InfoTooltip from '../InfoTooltip';
import BaseAngleComparisonChart from './BaseAngleComparisonChart';

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

// Rep boundary interface
export interface RepBoundary {
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
  phase?: 'eccentric' | 'concentric';
  quality?: number;
}

// Rep phase interface
export interface RepPhase {
  name: 'eccentric' | 'concentric';
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
}

// Custom Legend content renderer for field/value hierarchy and value capping
function CustomLegendContent({ payload, data }: any) {
  if (!payload || !data || data.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {payload.map((entry: any, idx: number) => {
        return (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: entry.color, borderRadius: 2, display: 'inline-block', marginRight: 6 }} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

interface RepAngleComparisonChartProps {
  data: any[];
  jointsOfInterest: string[];
  currentFrame?: number | null;
  onChartClick?: (data: any) => void;
  title?: string;
  showReference?: boolean;
  repBoundaries?: RepBoundary[];
  repPhases?: RepPhase[];
  showRepBoundaries?: boolean;
  showRepPhases?: boolean;
  showRepCount?: boolean;
  className?: string;
}

export default function RepAngleComparisonChart({
  data,
  jointsOfInterest,
  currentFrame,
  onChartClick,
  title = "Repetition Angle Comparison Over Time",
  showReference = true,
  repBoundaries = [],
  repPhases = [],
  showRepBoundaries = true,
  showRepPhases = true,
  showRepCount = true,
  className = ""
}: RepAngleComparisonChartProps) {
  
  // Handler for chart click/seek
  const handleChartClick = (data: any) => {
    if (onChartClick && data && data.activeLabel) {
      onChartClick(data);
    }
  };

  // Get current rep information
  const getCurrentRepInfo = (frame: number) => {
    const currentRep = repBoundaries.find(rep => 
      frame >= rep.startFrame && frame <= rep.endFrame
    );
    
    if (currentRep) {
      const repIndex = repBoundaries.indexOf(currentRep) + 1;
      const currentPhase = repPhases.find(phase => 
        frame >= phase.startFrame && frame <= phase.endFrame
      );
      
      return {
        repIndex,
        phase: currentPhase?.name,
        quality: currentRep.quality
      };
    }
    
    return null;
  };

  const currentRepInfo = currentFrame ? getCurrentRepInfo(currentFrame) : null;

  return (
    <div 
      className={`${className}`}
      style={{ 
        background: 'var(--results-summary-bg)', 
        color: 'var(--results-summary-title)', 
        borderRadius: 6, 
        boxShadow: 'var(--results-summary-shadow)', 
        border: '1px solid var(--results-summary-border)', 
        padding: 21, 
        marginBottom: 18 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <h3 style={{ fontSize: 18, paddingBottom: '0px', fontWeight: 300, color: 'var(--results-summary-title)' }}>
          {title}
        </h3>
        <InfoTooltip content="Shows your joint angles over time with repetition boundaries and phases highlighted. Compare your movement pattern to the reference.">
          <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
        </InfoTooltip>
        {showRepCount && currentRepInfo && (
          <div style={{ 
            marginLeft: 'auto', 
            background: 'var(--results-chart-highlight)', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: 4, 
            fontSize: '12px', 
            fontWeight: 600 
          }}>
            Rep {currentRepInfo.repIndex}
            {currentRepInfo.phase && (
              <span style={{ marginLeft: 8, opacity: 0.8 }}>
                {currentRepInfo.phase}
              </span>
            )}
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={400} style={{ paddingTop: 9, paddingBottom: 9 }}>
        <LineChart data={data} onClick={handleChartClick} style={{ background: 'var(--results-chart-bg)' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--results-chart-grid)" />
          <XAxis dataKey="frame" stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <YAxis 
            domain={[0, 100]} 
            stroke="var(--results-chart-axis)" 
            tick={{ 
              fill: 'var(--results-chart-axis)', 
              fontSize: '13px', 
              fontWeight: 400
            }}
            tickFormatter={(value) => Math.round(value).toString()} // Convert to string
          />
          <Tooltip 
            contentStyle={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', border: 'none', borderRadius: 8, fontSize: '13px', fontWeight: 400 }}
            labelStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '11px', fontWeight: 700 }}
            itemStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '13px', fontWeight: 400 }}
            formatter={(value: any, name: string) => [Math.round(Number(value)).toString(), name]}
          />
          <Legend wrapperStyle={{ color: 'var(--results-chart-legend)' }} content={props => <CustomLegendContent {...props} data={data} />} />
          
          {/* Render joint lines */}
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
              {showReference && (
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
              )}
            </React.Fragment>
          ))}
          
          {/* Rep phase highlighting */}
          {showRepPhases && repPhases.map((phase, index) => (
            <ReferenceArea
              key={`phase-${index}`}
              x1={phase.startFrame}
              x2={phase.endFrame}
              fill={phase.name === 'eccentric' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(76, 175, 80, 0.1)'}
              stroke="none"
            />
          ))}
          
          {/* Rep boundaries */}
          {showRepBoundaries && repBoundaries.map((boundary, index) => (
            <ReferenceLine 
              key={`rep-start-${index}`}
              x={boundary.startFrame} 
              stroke="#FF6B6B" 
              strokeWidth={2} 
              strokeDasharray="3 3"
              label={{ 
                value: `Rep ${index + 1}`, 
                position: 'top',
                fill: '#FF6B6B',
                fontSize: 10,
                fontWeight: 600
              }}
            />
          ))}
          
          {/* Vertical cursor for current video frame */}
          {currentFrame !== null && (
            <ReferenceLine x={currentFrame} stroke="#000" strokeWidth={2} label="Video" />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Rep summary */}
      {repBoundaries.length > 0 && (
        <div style={{ 
          marginTop: 12, 
          padding: 8, 
          background: 'var(--results-chart-bg)', 
          borderRadius: 4, 
          fontSize: '12px',
          color: 'var(--results-chart-axis)'
        }}>
          <strong>Repetition Summary:</strong> {repBoundaries.length} reps detected
          {repPhases.length > 0 && (
            <span style={{ marginLeft: 16 }}>
              Phases: {repPhases.filter(p => p.name === 'eccentric').length} eccentric, {repPhases.filter(p => p.name === 'concentric').length} concentric
            </span>
          )}
        </div>
      )}
    </div>
  );
}
