"use client";
import { ReactNode } from 'react';

interface CoreVideoPlayerProps {
  videoElement: ReactNode; // <video> or <Webcam>
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlays: ReactNode; // overlays (e.g., skeleton, angles)
  controls: ReactNode; // playback or live controls
  advancedPanel: ReactNode; // advanced panel UI
  containerClassName?: string;
  loading?: boolean;
  error?: string | null;
  showAdvancedPanel?: boolean;
  onCloseAdvancedPanel?: () => void;
  style?: React.CSSProperties;
  height?: string;
}

export default function CoreVideoPlayer({
  videoElement,
  canvasRef,
  overlays,
  controls,
  advancedPanel,
  containerClassName = '',
  loading = false,
  error = null,
  showAdvancedPanel = false,
  onCloseAdvancedPanel,
  style = {},
  height,
}: CoreVideoPlayerProps) {
  if (error) {
    return (
      <div className={`relative flex items-center justify-center ${containerClassName}`} style={style}>
        <div className="text-center text-red-500">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`flex flex-col items-center ${containerClassName}`} 
        style={{ ...style, height: height || undefined }}
      >
        <div className="flex flex-col items-center w-full h-full">
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', position: 'relative', width: '100%', height: '100%' }}>
            
            {/* Advanced Panel */}
            {showAdvancedPanel && (
              <div style={{ minWidth: '260px', maxWidth: '300px', marginRight: '-24px', zIndex: 2, overflow: 'visible' }}>
                {advancedPanel}
              </div>
            )}
            
            {/* Video Player Container */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                {/* Toggle Button - Absolutely positioned over video/canvas */}
                <button
                  onClick={onCloseAdvancedPanel}
                  aria-label={showAdvancedPanel ? "Hide advanced controls" : "Show advanced controls"}
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    width: 32,
                    height: 32,
                    background: 'rgba(0, 0, 0, 0.42)',
                    border: '1px solid var(--vp-dropdown-border, rgba(255, 255, 255, 1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 30,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    transition: 'background 0.2s, border 0.2s',
                  }}
                  tabIndex={0}
                >
                  {showAdvancedPanel ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 6L14 14M14 6L6 14" stroke="rgba(255, 255, 255, 1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 12h14M3 6h14M3 18h14" stroke="rgba(255, 255, 255, 1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                {/* Video or Webcam Element */}
                {videoElement}
                {/* Canvas for Overlays */}
                <canvas
                  ref={canvasRef}
                  className="absolute pointer-events-none"
                  style={{ zIndex: 10, top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {/* Custom Overlays (e.g., feedback, angles) */}
                {overlays}
                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <div className="text-sm">Loading video...</div>
                    </div>
                  </div>
                )}
                {/* Always Visible Overlay Controls */}
                <div 
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '20px 16px 16px 16px',
                    zIndex: 15,
                  }}
                >
                  <div className="flex flex-row flex-wrap items-center justify-center" style={{ gap: '16px', maxWidth: '520px', margin: '0 auto' }}>
                    {controls}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        :root {
          --vp-panel-green: #22c55e;
          --vp-tab-active: #22c55e;
          --vp-tab-inactive: #222;
        }
        [data-theme='dark'] {
          --vp-panel-green: #22c55e;
          --vp-tab-active: #22c55e;
          --vp-tab-inactive: #eee;
        }
        .vp-btn {
          background: var(--vp-button-bg);
          color: var(--vp-button-text);
          border: 1px solid var(--vp-button-border);
          transition: background 0.15s, box-shadow 0.15s, border 0.15s;
        }
        .vp-btn:hover, .vp-btn:focus {
          background: var(--vp-button-hover-bg);
          box-shadow: 0 0 0 2px var(--accent, #3b82f6);
          outline: none;
        }
        .dropdown-scroll::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        .dropdown-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .vp-dropdown-anim {
          opacity: 0;
          transform: translateY(-8px);
          pointer-events: none;
          transition: opacity 0.18s cubic-bezier(.4,0,.2,1), transform 0.18s cubic-bezier(.4,0,.2,1);
        }
        .vp-dropdown-anim.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        /* Custom slider thumb */
        input[type="range"].slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent, #3b82f6);
          border: 2px solid var(--vp-slider-thumb, #3b82f6);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
        }
        input[type="range"].slider:focus::-webkit-slider-thumb {
          outline: 2px solid var(--accent, #3b82f6);
        }
        input[type="range"].slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent, #3b82f6);
          border: 2px solid var(--vp-slider-thumb, #3b82f6);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
        }
        input[type="range"].slider:focus::-moz-range-thumb {
          outline: 2px solid var(--accent, #3b82f6);
        }
        input[type="range"].slider::-ms-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent, #3b82f6);
          border: 2px solid var(--vp-slider-thumb, #3b82f6);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
        }
        input[type="range"].slider:focus::-ms-thumb {
          outline: 2px solid var(--accent, #3b82f6);
        }
        input[type="range"].slider {
          outline: none;
        }
      `}</style>
    </>
  );
} 