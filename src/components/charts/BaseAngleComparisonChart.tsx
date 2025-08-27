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

// Custom Legend content renderer for field/value hierarchy and value capping
function CustomLegendContent({ payload, data, holdPeriods }: any) {
  if (!payload || !data || data.length === 0) return null;
  
  // Calculate hold duration summary for each joint
  const holdDurationSummary: { [joint: string]: number } = {};
  if (holdPeriods && holdPeriods.length > 0) {
    holdPeriods.forEach((period: any) => {
      const joint = period.joint;
      if (!holdDurationSummary[joint]) {
        holdDurationSummary[joint] = 0;
      }
      holdDurationSummary[joint] += period.duration;
    });
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {payload.map((entry: any, idx: number) => {
        // Extract joint name from the data key (e.g., "leftElbow_user" -> "leftElbow")
        const jointName = entry.dataKey.replace(/_user$|_ref$/, '');
        const holdDuration = holdDurationSummary[jointName];
        
        return (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: entry.color, borderRadius: 2, display: 'inline-block', marginRight: 6 }} />
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{entry.value}</span>
            {holdDuration !== undefined && holdDuration > 0 && (
              <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: 4 }}>
                (Hold: {holdDuration.toFixed(1)}s)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface BaseAngleComparisonChartProps {
  data: any[];
  jointsOfInterest: string[];
  currentFrame?: number | null;
  onChartClick?: (data: any) => void;
  title?: string;
  showReference?: boolean;
  showRepBoundaries?: boolean;
  repBoundaries?: any[];
  holdPeriods?: Array<{
    joint: string;
    start_frame: number;
    end_frame: number;
    duration: number;
    accuracy: number;
  }>;
  className?: string;
}

export default function BaseAngleComparisonChart({
  data,
  jointsOfInterest,
  currentFrame,
  onChartClick,
  title = "Angle Comparison Over Time",
  showReference = true,
  showRepBoundaries = false,
  repBoundaries = [],
  holdPeriods = [],
  className = ""
}: BaseAngleComparisonChartProps) {
  
  // Handler for chart click/seek
  const handleChartClick = (data: any) => {
    if (onChartClick && data && data.activeLabel) {
      onChartClick(data);
    }
  };

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
        <InfoTooltip content={holdPeriods.length > 0 ? 
          "Shows your joint angles over time with hold duration periods highlighted in green. Higher values indicate better form alignment." :
          "Shows how your joint angles change over time compared to the reference. Higher values indicate better form alignment."
        }>
          <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
        </InfoTooltip>
      </div>
      <ResponsiveContainer width="100%" height={400} style={{ paddingTop: 9, paddingBottom: 9 }}>
        <LineChart data={data} onClick={handleChartClick} style={{ background: 'var(--results-chart-bg)' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--results-chart-grid)" />
          <XAxis dataKey="frame" stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
          <YAxis 
            domain={[0, 100]} 
            stroke="var(--results-chart-axis)" 
            tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }}
            tickFormatter={(value) => Math.round(value).toString()}
          />
          <Tooltip 
            contentStyle={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', border: 'none', borderRadius: 8, fontSize: '13px', fontWeight: 400 }}
            labelStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '11px', fontWeight: 700 }}
            itemStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '13px', fontWeight: 400 }}
            formatter={(value: any, name: string) => [Math.round(Number(value)).toString(), name]}
          />
          <Legend wrapperStyle={{ color: 'var(--results-chart-legend)' }} content={props => <CustomLegendContent {...props} data={data} holdPeriods={holdPeriods} />} />
          
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
          
          {/* Vertical cursor for current video frame */}
          {currentFrame !== null && (
            <ReferenceLine x={currentFrame} stroke="#000" strokeWidth={2} label="Video" />
          )}
          
          {/* Rep boundaries if enabled */}
          {showRepBoundaries && repBoundaries.map((boundary: any, index: number) => (
            <ReferenceLine 
              key={`rep-${index}`}
              x={boundary.startFrame || boundary.startTime} 
              stroke="#FF6B6B" 
              strokeWidth={2} 
              strokeDasharray="3 3"
              label={`Rep ${index + 1}`}
            />
          ))}
          
          {/* Hold duration periods */}
          {holdPeriods.map((period: any, index: number) => (
            <ReferenceArea
              key={`hold-${index}`}
              x1={period.start_frame}
              x2={period.end_frame}
              fill="rgba(76, 175, 80, 0.2)"
              stroke="rgba(76, 175, 80, 0.6)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
