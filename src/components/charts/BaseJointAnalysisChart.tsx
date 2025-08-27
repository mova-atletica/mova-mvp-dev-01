import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

interface BaseJointAnalysisChartProps {
  data: any[];
  title?: string;
  className?: string;
  metrics?: string[];
  metricLabels?: Record<string, string>;
}

export default function BaseJointAnalysisChart({
  data,
  title = "Advanced Joint Analysis",
  className = "",
  metrics = ['dtw_score', 'cosine_score', 'rom_score', 'basic_score'],
  metricLabels = {}
}: BaseJointAnalysisChartProps) {

  // Default metric labels if none provided
  const defaultMetricLabels: Record<string, string> = {
    dtw_score: 'DTW Pattern',
    cosine_score: 'Cosine Similarity',
    rom_score: 'Range of Motion',
    basic_score: 'Basic Score',
  };

  const finalMetricLabels = { ...defaultMetricLabels, ...metricLabels };

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
        <InfoTooltip content="Shows performance metrics for each joint. Higher scores indicate better form and movement quality.">
          <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
        </InfoTooltip>
      </div>
      <ResponsiveContainer width="100%" height={400} style={{ paddingTop: 9, paddingBottom: 9 }}>
        <BarChart data={data} style={{ background: 'var(--results-chart-bg)' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--results-chart-grid)" />
          <XAxis dataKey="joint" stroke="var(--results-chart-axis)" tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }} />
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
          />
          <Legend wrapperStyle={{ color: 'var(--results-chart-legend)' }} content={props => <CustomLegendContent {...props} data={data} />} />
          
          {/* Render metric bars */}
          {metrics.map((metric: string, index: number) => (
            <Bar 
              key={metric}
              dataKey={metric} 
              fill={seriesColors[index % seriesColors.length]} 
              name={finalMetricLabels[metric] || metric}
              activeBar={CustomActiveBar} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
