import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface InfoTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export default function InfoTooltip({ 
  content, 
  children, 
  className = ''
}: InfoTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className={`inline-block cursor-help ${className}`}>
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="text-xs font-normal rounded-lg px-3 py-2 z-50"
            style={{
              background: 'var(--tooltip-bg)',
              color: 'var(--tooltip-text)',
              border: '1px solid var(--tooltip-border)',
              boxShadow: 'var(--tooltip-shadow)',
              maxWidth: '24rem',
              minWidth: '15rem',
              width: 'max-content',
            }}
            sideOffset={8}
            side="top"
            align="center"
            avoidCollisions={true}
          >
            {content}
            <Tooltip.Arrow 
              style={{ 
                fill: 'var(--tooltip-bg)',
                stroke: 'var(--tooltip-border)',
                strokeWidth: 1
              }} 
            />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
} 