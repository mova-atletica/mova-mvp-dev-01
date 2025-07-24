"use client";
import { ReactNode } from 'react';
import { Download, Settings, Sun, BarChart2 } from 'lucide-react';
import React, { useState } from 'react';

interface CoreVideoPlayerProps {
  videoElement: ReactNode; // <video> or <Webcam>
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlays: ReactNode; // overlays (e.g., skeleton, angles)
  controls: ReactNode; // playback or live controls
  advancedPanel?: ReactNode; // advanced panel UI (optional)
  containerClassName?: string;
  loading?: boolean;
  error?: string | null;
  showAdvancedPanel?: boolean;
  onCloseAdvancedPanel?: () => void;
  style?: React.CSSProperties;
  height?: string;
  openMenu?: null | 'export' | 'selection' | 'style' | 'actions';
  setOpenMenu?: (menu: null | 'export' | 'selection' | 'style' | 'actions') => void;
  panelContent?: React.ReactNode;
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
  openMenu: controlledOpenMenu,
  setOpenMenu: controlledSetOpenMenu,
  panelContent,
}: CoreVideoPlayerProps) {
  // If controlled props are provided, use them; otherwise, use local state (for backward compatibility)
  const [uncontrolledOpenMenu, setUncontrolledOpenMenu] = useState<null | 'export' | 'selection' | 'style' | 'actions'>(null);
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
                  top: 24,
                  right: 24,
                  zIndex: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <button
                    style={{
                      width: 48, height: 48, borderRadius: '50%', background: openMenu === 'export' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'export' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)', borderBottom: '1px solid var(--vp-panel-border)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
                    aria-label="Export"
                  >
                    <Download size={24} />
                  </button>
                  <button
                    style={{
                      width: 48, height: 48, borderRadius: '50%', background: openMenu === 'selection' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'selection' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)', borderBottom: '1px solid var(--vp-panel-border)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'selection' ? null : 'selection')}
                    aria-label="Selection"
                  >
                    <Settings size={24} />
                  </button>
                  <button
                    style={{
                      width: 48, height: 48, borderRadius: '50%', background: openMenu === 'style' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'style' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)', borderBottom: '1px solid var(--vp-panel-border)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'style' ? null : 'style')}
                    aria-label="Style"
                  >
                    <Sun size={24} />
                  </button>
                  <button
                    style={{
                      width: 48, height: 48, borderRadius: '50%', background: openMenu === 'actions' ? 'var(--vp-panel-icon-active-bg)' : 'var(--vp-panel-icon-bg)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: openMenu === 'actions' ? 'var(--vp-panel-icon-active)' : 'var(--vp-panel-icon)',
                    }}
                    onClick={() => setOpenMenu(openMenu === 'actions' ? null : 'actions')}
                    aria-label="Actions"
                  >
                    <BarChart2 size={24} />
                  </button>
                </div>
                {/* --- Floating Panel for Open Menu (moved here) --- */}
                {openMenu && (
                  <div style={{
                    position: 'absolute',
                    top: 24,
                    right: 88,
                    background: 'var(--vp-panel-bg)',
                    borderRadius: 18,
                    boxShadow: 'var(--vp-panel-shadow)',
                    padding: '18px 14px',
                    zIndex: 41,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
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
                {/* Playback Bar (remains at bottom) */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '20px 16px 16px 16px',
                    zIndex: 15,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
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