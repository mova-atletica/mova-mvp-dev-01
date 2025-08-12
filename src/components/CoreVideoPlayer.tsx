"use client";
import { ReactNode } from 'react';
import React, { useState } from 'react';

interface CoreVideoPlayerProps {
  videoElement: ReactNode; // <video> or <Webcam>
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlays: ReactNode; // overlays (e.g., skeleton, angles)
  controls?: ReactNode; // playback or live controls (optional now)
  advancedPanel?: ReactNode; // advanced panel UI (optional)
  containerClassName?: string;
  loading?: boolean;
  error?: string | null;
  showAdvancedPanel?: boolean;
  onCloseAdvancedPanel?: () => void;
  style?: React.CSSProperties;
  height?: string;
  openMenu?: null | 'export' | 'biomechanics' | 'style' | 'focus';
  setOpenMenu?: (menu: null | 'export' | 'biomechanics' | 'style' | 'focus') => void;
  panelContent?: React.ReactNode;
  // New props for the custom play bar
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  hidePlayBar?: boolean; // New prop to hide the play bar
}

// Custom SVG Icons
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BiomechanicsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StyleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 21V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M1 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 12H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const FocusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 20V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M2 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Helper function to format time
const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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
  openMenu: controlledOpenMenu,
  setOpenMenu: controlledSetOpenMenu,
  panelContent,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onPlayPause,
  onSeek,
  hidePlayBar = false, // New prop to hide the play bar
}: CoreVideoPlayerProps) {
  // If controlled props are provided, use them; otherwise, use local state (for backward compatibility)
  const [uncontrolledOpenMenu, setUncontrolledOpenMenu] = useState<null | 'export' | 'biomechanics' | 'style' | 'focus'>(null);
  const openMenu = controlledOpenMenu !== undefined ? controlledOpenMenu : uncontrolledOpenMenu;
  const setOpenMenu = controlledSetOpenMenu !== undefined ? controlledSetOpenMenu : setUncontrolledOpenMenu;

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
            {/* Video Player Container */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                {/* --- New Vertical Controls Overlay (moved here) --- */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px', // Reduced gap for smaller buttons
                }}>
                  {/* Download Button */}
                  <button
                    style={{
                      width: 30, height: 30, borderRadius: 6, background: openMenu === 'export' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'export' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)', borderBottom: '1px solid var(--vp-panel-border)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
                    aria-label="Export"
                  >
                    <DownloadIcon />
                  </button>
                  
                  {/* Biomechanics Button (formerly Actions) */}
                  <button
                    style={{
                      width: 30, height: 30, borderRadius: 6, background: openMenu === 'biomechanics' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'biomechanics' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)', borderBottom: '1px solid var(--vp-panel-border)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'biomechanics' ? null : 'biomechanics')}
                    aria-label="Biomechanics"
                  >
                    <BiomechanicsIcon />
                  </button>
                  
                  {/* Style Button */}
                  <button
                    style={{
                      width: 30, height: 30, borderRadius: 6, background: openMenu === 'style' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'style' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)', borderBottom: '1px solid var(--vp-panel-border)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'style' ? null : 'style')}
                    aria-label="Style"
                  >
                    <StyleIcon />
                  </button>
                  
                  {/* Focus Selection Button (formerly Selection) */}
                  <button
                    style={{
                      width: 30, height: 30, borderRadius: 6, background: openMenu === 'focus' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'focus' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'focus' ? null : 'focus')}
                    aria-label="Focus Selection"
                  >
                    <FocusIcon />
                  </button>
                </div>
                {/* --- Floating Panel for Open Menu (moved here) --- */}
                {openMenu && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 51, // Adjusted for smaller buttons
                    background: 'var(--vp-panel-bg)',
                    borderRadius: 9,
                    boxShadow: 'var(--vp-panel-shadow)',
                    padding: '12px 12px',
                    zIndex: 41,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 15,
                    alignItems: 'flex-start',
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--vp-panel-title)',
                    width: 'auto',
                    maxWidth: '90vw',
                    border: '1px solid var(--vp-panel-border)',
                  }}>
                    {panelContent}
                  </div>
                )}
                {/* --- End Overlay --- */}
                {videoElement}
                <canvas
                  ref={canvasRef}
                  className="absolute pointer-events-none"
                  style={{ zIndex: 10, top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {overlays}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <div className="text-sm">Loading video...</div>
                    </div>
                  </div>
                )}
                {/* Playback Bar - Simplified and more visible */}
                {!hidePlayBar && (
                  <div 
                    style={{
                      width: '97%',
                      //maxWidth: '400px',
                      background: 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 12px 6px 12px',
                      //margin: '15px 15px 15px 15px',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      display: 'flex',
                      zIndex: 20,
                      position: 'absolute',
                      bottom: 9,
                      left: 6,
                      right: 6,
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* Play Button */}
                    <button
                      onClick={onPlayPause}
                      style={{
                        background: '#ffffff',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '15px',
                        minHeight: '15px'
                      }}
                    >
                      {isPlaying ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="#181A1A"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5V19L19 12L8 5Z" fill="#181A1A"/>
                        </svg>
                      )}
                    </button>
                    
                    {/* Progress Bar */}
                    <div 
                      style={{
                        flex: 1,
                        height: '6px',
                        background: '#f5f6f7',
                        borderRadius: '3px',
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      className="progress-bar-container"
                      onMouseDown={(e) => {
                        if (onSeek && duration > 0) {
                          const progressBar = e.currentTarget;
                          const rect = progressBar.getBoundingClientRect();
                          const startX = e.clientX - rect.left;
                          const startPercentage = Math.max(0, Math.min(1, startX / rect.width));
                          const startTime = startPercentage * duration;
                          
                          // Handle the initial click immediately
                          onSeek(startTime);
                          
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            // Calculate position relative to the original rect for better performance
                            const clickX = moveEvent.clientX - rect.left;
                            const rawPercentage = clickX / rect.width;
                            const percentage = Math.max(0, Math.min(1, rawPercentage));
                            const newTime = percentage * duration;
                            
                            // Debug logging (you can remove this later)
                            console.log('Scrub:', {
                              clickX,
                              width: rect.width,
                              rawPercentage: rawPercentage.toFixed(4),
                              percentage: percentage.toFixed(4),
                              newTime: newTime.toFixed(2),
                              duration
                            });
                            
                            onSeek(newTime);
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };

                          // Use standard event listeners for better cross-browser compatibility
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }
                      }}
                    >
                      <div 
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          background: '#CCC19E',
                          borderRadius: '3px',
                          width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                        }}
                      />
                    </div>
                    
                    {/* Time Display */}
                    <div 
                      style={{
                        fontFamily: 'Roboto, sans-serif',
                        fontWeight: 'bold',
                        fontSize: '9px',
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.9px',
                        whiteSpace: 'nowrap',
                        minWidth: '60px',
                        textAlign: 'right'
                      }}
                    >
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                )}
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
          --vp-panel-icon-active-bg: #c0c9cc;
        }
        [data-theme='dark'] {
          --vp-panel-green: #22c55e;
          --vp-tab-active: #22c55e;
          --vp-tab-inactive: #eee;
          --vp-panel-icon-active-bg: #c0c9cc;
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
        .progress-bar-container::before {
          content: '';
          position: absolute;
          top: -8px;
          bottom: -8px;
          left: -8px;
          right: -8px;
          cursor: pointer;
          z-index: 1;
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