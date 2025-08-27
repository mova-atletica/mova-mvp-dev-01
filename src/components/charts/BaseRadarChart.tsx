import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
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

interface BaseRadarChartProps {
  data: any[];
  title?: string;
  className?: string;
  metricDescriptions?: Record<string, { label: string; desc: string }>;
  shortLabels?: Record<string, string>;
}

export default function BaseRadarChart({
  data,
  title = "Performance Radar",
  className = "",
  metricDescriptions = {},
  shortLabels = {}
}: BaseRadarChartProps) {

  // Default metric descriptions if none provided
  const defaultMetricDescriptions: Record<string, { label: string; desc: string }> = {
    dtw_score: { label: 'DTW Pattern', desc: 'Movement similarity' },
    cosine_score: { label: 'Cosine Similarity', desc: 'Angle pattern match' },
    rom_score: { label: 'Range of Motion', desc: 'Flexibility' },
    basic_score: { label: 'Basic Score', desc: 'Overall accuracy' },
  };

  const finalMetricDescriptions = { ...defaultMetricDescriptions, ...metricDescriptions };

  // Default short labels if none provided
  const defaultShortLabels: Record<string, string> = {
    dtw_score: 'DTW',
    cosine_score: 'Cos',
    rom_score: 'ROM',
    basic_score: 'Score',
  };

  const finalShortLabels = { ...defaultShortLabels, ...shortLabels };

  function RadarTooltipContent({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const { metric, score } = payload[0].payload;
    const info = finalMetricDescriptions[metric] || { label: metric, desc: '' };
    return (
      <div style={{ background: 'var(--results-chart-tooltip-bg)', color: 'var(--results-chart-tooltip-text)', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{info.label}</div>
        <div style={{ fontSize: 12, color: 'var(--results-chart-tooltip-text)', marginBottom: 4 }}>{info.desc}</div>
        <div style={{ fontWeight: 700, fontSize: 12 }}>Score: {typeof score === 'number' ? score.toFixed(2) : score}</div>
      </div>
    );
  }

  function RadarAxisTick({ x, y, payload, index }: any) {
    const shortLabel = finalShortLabels[payload.value] || payload.value.replace(/_/g, ' ');
    let dx = 0, dy = 0;
    // Padding logic for each axis
    if (payload.value === 'cosine_score') dx = 16; // right axis, move right
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
        <InfoTooltip content="Radar chart showing performance across different metrics. Larger areas indicate better overall performance.">
          <span className="text-onyx-30 hover:text-onyx-20 cursor-help text-xs">ⓘ</span>
        </InfoTooltip>
      </div>
      <ResponsiveContainer width="100%" height={400} style={{ paddingTop: 9, paddingBottom: 9 }}>
        <RadarChart data={data} style={{ background: 'var(--results-chart-bg)' }}>
          <PolarGrid stroke="var(--results-chart-grid)" />
          <PolarAngleAxis
            dataKey="metric"
            stroke="var(--results-chart-axis)"
            tick={<RadarAxisTick />}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            stroke="var(--results-chart-axis)" 
            tick={{ fill: 'var(--results-chart-axis)', fontSize: '13px', fontWeight: 400 }}
            tickFormatter={(value) => Math.round(value).toString()}
          />
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
            itemStyle={{ fontSize: '12px', fontWeight: 400 }}
            labelStyle={{ color: 'var(--results-chart-tooltip-text)', fontSize: '11px', fontWeight: 700 }}
            cursor={{ stroke: 'var(--results-chart-cursor)', strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
