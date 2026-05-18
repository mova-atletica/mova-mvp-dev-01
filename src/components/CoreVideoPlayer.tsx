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
  openMenu?: CoreVideoPlayerOpenMenu;
  setOpenMenu?: (menu: CoreVideoPlayerOpenMenu) => void;
  /** Export + Motion viz menus only (live studio fullscreen). */
  compactToolbar?: boolean;
  panelContent?: React.ReactNode;
  // New props for the custom play bar
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  hidePlayBar?: boolean; // New prop to hide the play bar
  /** Fill parent; letterbox video with flex center (live fullscreen). */
  fillContainer?: boolean;
  /** Renders first in the vertical toolbar (e.g. dismiss fullscreen live modal). */
  onToolbarClose?: () => void;
  /** Extra toolbar buttons (e.g. mobile live camera / orientation), rendered below close. */
  toolbarActions?: CoreVideoToolbarAction[];
  /** Centered strip over the video (e.g. live record / change method). */
  bottomOverlay?: React.ReactNode;

  // Remove: repCountOverlay?: { enabled: boolean; count: number; onReset: () => void };
  
  // Add: unified feedback system
  feedbackOverlay?: {
    type: 'rep' | 'pose' | 'flow' | 'plank' | null;
    // Rep-based data
    repCount?: number;
    onResetRep?: () => void;
    // Pose-based data
    currentPose?: string;
    holdDuration?: number;
    feedback?: string;
    severity?: 'good' | 'warning' | 'poor';
    // Flow-based data (placeholder)
    flowPhase?: string;
    flowProgress?: number;
    plankMessage?: string;
    plankVariant?: 'good' | 'adjust' | 'setup';
  };
}

export type CoreVideoPlayerMenu = 'export' | 'style' | 'focus' | 'analysis' | 'motionViz';
export type CoreVideoPlayerOpenMenu = CoreVideoPlayerMenu | null;

export type CoreVideoToolbarAction = {
  id: string;
  ariaLabel: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
};

const toolbarButtonStyle = (
  active: boolean,
  disabled?: boolean
): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 6,
  background: active ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)',
  border: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  color: active ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)',
  borderBottom: '1px solid var(--vp-panel-border)',
  opacity: disabled ? 0.45 : 1,
});

// Custom SVG Icons
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

const CloseToolbarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const MotionVizIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
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
  fillContainer = false,
  onToolbarClose,
  toolbarActions,
  bottomOverlay,
  compactToolbar = false,
  feedbackOverlay, // New prop for unified feedback overlay
}: CoreVideoPlayerProps) {
  // If controlled props are provided, use them; otherwise, use local state (for backward compatibility)
  const [uncontrolledOpenMenu, setUncontrolledOpenMenu] = useState<CoreVideoPlayerOpenMenu>(null);
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
        <div className={`flex flex-col items-center w-full h-full ${fillContainer ? 'min-h-0' : ''}`}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              position: 'relative',
              width: '100%',
              height: '100%',
              minHeight: fillContainer ? 0 : undefined,
            }}
          >
            {/* Video Player Container */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: fillContainer ? 0 : undefined,
                minWidth: fillContainer ? 0 : undefined,
                width: '100%',
                height: '100%',
              }}
            >
              <div
                style={
                  fillContainer
                    ? {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        minHeight: 0,
                        minWidth: 0,
                      }
                    : { display: 'inline-block', position: 'relative' }
                }
              >
                {/* --- New Vertical Controls Overlay (moved here) --- */}
                <div style={{
                  position: 'absolute',
                  top: fillContainer ? 'max(12px, env(safe-area-inset-top))' : 12,
                  right: fillContainer ? 'max(12px, env(safe-area-inset-right))' : 12,
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px', // Reduced gap for smaller buttons
                }}>
                  {onToolbarClose ? (
                    <button
                      type="button"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        background: 'var(--vp-panel-icon-bg)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: 'var(--vp-panel-icon)',
                        borderBottom: '1px solid var(--vp-panel-border)',
                      }}
                      onClick={onToolbarClose}
                      aria-label="Close"
                    >
                      <CloseToolbarIcon />
                    </button>
                  ) : null}
                  {toolbarActions?.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      style={toolbarButtonStyle(false, action.disabled)}
                      onClick={action.disabled ? undefined : action.onClick}
                      disabled={action.disabled}
                      aria-label={action.ariaLabel}
                    >
                      {action.icon}
                    </button>
                  ))}
                  {/* Export */}
                  <button
                    type="button"
                    style={toolbarButtonStyle(openMenu === 'export')}
                    onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
                    aria-label="Export"
                  >
                    <DownloadIcon />
                  </button>

                  {compactToolbar ? (
                    <button
                      type="button"
                      style={toolbarButtonStyle(openMenu === 'motionViz')}
                      onClick={() => setOpenMenu(openMenu === 'motionViz' ? null : 'motionViz')}
                      aria-label="Motion viz"
                    >
                      <MotionVizIcon />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        style={toolbarButtonStyle(openMenu === 'analysis')}
                        onClick={() => setOpenMenu(openMenu === 'analysis' ? null : 'analysis')}
                        aria-label="Real-time Analysis"
                      >
                        <MotionVizIcon />
                      </button>
                      <button
                        type="button"
                        style={toolbarButtonStyle(openMenu === 'style')}
                        onClick={() => setOpenMenu(openMenu === 'style' ? null : 'style')}
                        aria-label="Style"
                      >
                        <StyleIcon />
                      </button>
                      <button
                        type="button"
                        style={toolbarButtonStyle(openMenu === 'focus')}
                        onClick={() => setOpenMenu(openMenu === 'focus' ? null : 'focus')}
                        aria-label="Focus Selection"
                      >
                        <FocusIcon />
                      </button>
                    </>
                  )}
                </div>
                {/* --- Floating Panel for Open Menu (moved here) --- */}
                {openMenu && (
                  <div style={{
                    position: 'absolute',
                    top: fillContainer ? 'max(12px, env(safe-area-inset-top))' : 12,
                    right: fillContainer
                      ? onToolbarClose
                        ? 'max(87px, calc(env(safe-area-inset-right) + 75px))'
                        : 'max(51px, calc(env(safe-area-inset-right) + 39px))'
                      : onToolbarClose
                        ? 87
                        : 51,
                    background: 'var(--vp-panel-bg)',
                    borderRadius: 9,
                    boxShadow: 'var(--vp-panel-shadow)',
                    padding: '12px 12px',
                    zIndex: 52,
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
                {/* Unified Feedback Overlay */}
                {feedbackOverlay?.type && (
                  <div
                    style={
                      feedbackOverlay.type === 'plank'
                        ? {
                            position: 'absolute',
                            top: fillContainer ? 'max(12px, env(safe-area-inset-top))' : 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 35,
                            maxWidth: 'min(92vw, 22rem)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            border: '1px solid rgba(255,255,255,0.22)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                            background:
                              feedbackOverlay.plankVariant === 'good'
                                ? 'rgba(22, 163, 74, 0.9)'
                                : feedbackOverlay.plankVariant === 'setup'
                                  ? 'rgba(180, 83, 9, 0.92)'
                                  : 'rgba(220, 38, 38, 0.9)',
                          }
                        : {
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            zIndex: 30,
                            background: 'rgba(0, 0, 0, 0.7)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }
                    }
                  >
                    {/* Rep-based Feedback */}
                    {feedbackOverlay.type === 'rep' && (
                      <>
                        <span style={{ color: 'white', fontSize: '9px', fontWeight: '500' }}>
                          Rep Count:
                        </span>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '15px' }}>
                          {feedbackOverlay.repCount}
                        </span>
                        <button
                          onClick={feedbackOverlay.onResetRep}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: '#c0c9cc',
                            color: '#181a1a',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                          title="Reset rep count"
                        >
                          Reset
                        </button>
                      </>
                    )}
                    
                    {/* Pose-based Feedback */}
                    {feedbackOverlay.type === 'pose' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'white', fontSize: '9px', fontWeight: '500' }}>
                            {feedbackOverlay.currentPose}
                          </span>
                          <span style={{ 
                            color: feedbackOverlay.severity === 'good' ? '#10b981' : 
                                   feedbackOverlay.severity === 'warning' ? '#f59e0b' : '#ef4444', 
                            fontSize: '8px', 
                            fontWeight: '500' 
                          }}>
                            {feedbackOverlay.holdDuration?.toFixed(1)}s
                          </span>
                        </div>
                        <div style={{ 
                          color: 'white', 
                          fontSize: '8px', 
                          maxWidth: '120px',
                          lineHeight: '1.2'
                        }}>
                          {feedbackOverlay.feedback}
                        </div>
                      </>
                    )}
                    
                    {/* Flow-based Feedback (placeholder) */}
                    {feedbackOverlay.type === 'flow' && (
                      <>
                        <span style={{ color: 'white', fontSize: '9px', fontWeight: '500' }}>
                          {feedbackOverlay.flowPhase}
                        </span>
                        <span style={{ color: '#3b82f6', fontSize: '8px', fontWeight: '500' }}>
                          {feedbackOverlay.flowProgress}%
                        </span>
                      </>
                    )}

                    {feedbackOverlay.type === 'plank' && feedbackOverlay.plankMessage ? (
                      <span
                        style={{
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 600,
                          lineHeight: 1.35,
                        }}
                      >
                        {feedbackOverlay.plankMessage}
                      </span>
                    ) : null}
                  </div>
                )}
                {bottomOverlay ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: fillContainer ? 'max(14px, env(safe-area-inset-bottom))' : 14,
                      zIndex: 48,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      paddingLeft: fillContainer ? 'max(8px, env(safe-area-inset-left))' : 8,
                      paddingRight: fillContainer ? 'max(8px, env(safe-area-inset-right))' : 8,
                    }}
                  >
                    <div
                      style={{
                        pointerEvents: 'auto',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        maxWidth: 'min(96vw, 28rem)',
                      }}
                    >
                      {bottomOverlay}
                    </div>
                  </div>
                ) : null}
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