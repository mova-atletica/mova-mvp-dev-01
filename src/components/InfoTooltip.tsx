import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface InfoTooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
  delayDuration?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  maxWidth?: string;
  useCustomTrigger?: boolean; // Changed to useCustomTrigger for backward compatibility
}

export default function InfoTooltip({ 
  content, 
  children, 
  className = '',
  delayDuration = 150,
  side = 'top',
  align = 'center',
  maxWidth = '280px',
  useCustomTrigger = false // Default to false to use standardized SVG trigger
}: InfoTooltipProps) {
  // Standardized SVG tooltip trigger
  const SvgTooltipTrigger = React.forwardRef<HTMLButtonElement>((props, ref) => (
    <button
      ref={ref}
      aria-label="Information"
      className="ml-1 p-1 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-150"
      style={{ 
        verticalAlign: 'middle', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--results-info-icon, #6B7280)'
      }}
      onMouseOver={e => (e.currentTarget.style.color = 'var(--results-info-icon-hover, #374151)')}
      onMouseOut={e => (e.currentTarget.style.color = 'var(--results-info-icon, #6B7280)')}
      {...props}
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" />
        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    </button>
  ));

  SvgTooltipTrigger.displayName = 'SvgTooltipTrigger';

  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {useCustomTrigger ? (
            <span className={`inline-block cursor-help ${className}`}>
              {children}
            </span>
          ) : (
            <SvgTooltipTrigger />
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50"
            style={{
              background: 'var(--tooltip-bg',
              color: 'var(--results-chart-tooltip-text, #000000)',
              borderColor: 'var(--tooltip-border)',
              borderWidth: '1px',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '12px',
              fontWeight: 400,
              boxShadow: 'var(--tooltip-shadow, 0 2px 8px rgba(0,0,0,0.10))',
              maxWidth: maxWidth,
              lineHeight: '1.4',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
            sideOffset={8}
            side={side}
            align={align}
            avoidCollisions={true}
          >
            {content}
            <Tooltip.Arrow 
              style={{ 
                fill: 'var(--tooltip-bg, #ffffff)',
                stroke: 'none'
              }} 
            />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}