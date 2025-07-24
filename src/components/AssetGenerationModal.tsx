"use client";
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Settings, Download, ChevronDown, ChevronUp } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import * as Accordion from '@radix-ui/react-accordion';
import * as Checkbox from '@radix-ui/react-checkbox';
import { renderMuybridge, preExtractKeyFrames, clearFrameCache } from '../lib/effects/muybridge';
import { exportAsset, downloadBlob, ExportConfig } from '../lib/exportService';

// 1. Add Tailwind and minimal custom CSS for transitions, shadows, and responsive design
import './AssetGenerationModal.css';

interface AssetGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  poses: any[];
  exerciseTitle: string;
}

interface Effect {
  id: string;
  name: string;
  description: string;
  icon: string;
  preview: string;
  category: string;
}

interface ActiveEffect {
  id: string;
  effect: Effect;
  config: any;
  enabled: boolean;
  order: number;
}

const availableEffects: Effect[] = [
  // Motion Effects
  { id: "muybridge", name: "Muybridge", description: "Grid of key frames", icon: "🎬", preview: "Grid layout", category: "Motion" },
  { id: "motion-trails", name: "Motion Trails", description: "Ghost trail effect", icon: "🌊", preview: "Trailing animation", category: "Motion" },
  { id: "performance-heatmap", name: "Heatmap", description: "Intensity mapping", icon: "🔥", preview: "Color-coded overlay", category: "Motion" },
  { id: "vitruvian-composite", name: "Vitruvian", description: "Pose composition", icon: "🎭", preview: "Stacked poses", category: "Motion" },
  { id: "geometric-overlays", name: "Geometric", description: "Artistic overlays", icon: "✨", preview: "Geometric patterns", category: "Motion" },
  { id: "particle-systems", name: "Particles", description: "Motion particles", icon: "⭐", preview: "Dynamic particles", category: "Motion" },
  { id: "motion-blur", name: "Motion Blur", description: "Artistic blur", icon: "🎨", preview: "Blur overlay", category: "Motion" },
  // Creative Effects
  { id: "color-grading", name: "Color Grading", description: "Cinematic colors", icon: "🎨", preview: "Enhanced palette", category: "Creative" },
  { id: "lighting-effects", name: "Lighting", description: "Dynamic lighting", icon: "💡", preview: "Lighting overlay", category: "Creative" },
  // Stats Effects
  { id: "rom", name: "Range of Motion", description: "Joint angle measurements", icon: "📐", preview: "ROM overlay", category: "Stats" },
  { id: "live", name: "Live Metrics", description: "Real-time performance data", icon: "📊", preview: "Live data overlay", category: "Stats" },
];

// Add SVG icon components for effect types
const MotionIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#55595B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M3 10c2-4 6-4 8 0s6 4 8 0" />
  </svg>
);
const CreativeIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M10 2v4M10 14v4M2 10h4M14 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M5.5 14.5l2.5-2.5M12 8l2.5-2.5" />
  </svg>
);
const StatsIcon = () => (
  <svg width="20" height="20" fill="none" stroke="#181A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <rect x="3" y="10" width="3" height="7" />
    <rect x="8.5" y="6" width="3" height="11" />
    <rect x="14" y="13" width="3" height="4" />
  </svg>
);

// Map effect categories to icons
type EffectType = 'Motion' | 'Creative' | 'Stats';
const effectTypeIcon: Record<EffectType, React.ReactElement> = {
  Motion: <MotionIcon />,
  Creative: <CreativeIcon />,
  Stats: <StatsIcon />,
};

export default function AssetGenerationModal({
  isOpen,
  onClose,
  videoUrl,
  poses,
  exerciseTitle
}: AssetGenerationModalProps) {
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [configPopover, setConfigPopover] = useState<string | null>(null);
  const [statsConfig, setStatsConfig] = useState<any>({ rom: true, live: true });
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 'high',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EffectType | 'export' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync canvas size to video rendered size
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function syncCanvasSize() {
      if (!video || !canvas) return;
      // Set canvas pixel size to video natural size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Set canvas CSS size to 100% to match video
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }

    video.addEventListener('loadedmetadata', syncCanvasSize);
    window.addEventListener('resize', syncCanvasSize);
    syncCanvasSize();

    return () => {
      video.removeEventListener('loadedmetadata', syncCanvasSize);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [isOpen]);

  // Cleanup frame cache when modal closes or video changes
  useEffect(() => {
    return () => {
      // Clear frame cache when component unmounts
      clearFrameCache();
    };
  }, [videoUrl]);

  // Get effects for selected category
  const getEffectsForCategory = (category: EffectType | 'export') => {
    if (category === 'export') return [];
    return availableEffects.filter(effect => {
      if (category === 'Motion') return ['muybridge', 'motion-trails', 'performance-heatmap', 'vitruvian-composite', 'geometric-overlays', 'particle-systems', 'motion-blur'].includes(effect.id);
      if (category === 'Creative') return ['color-grading', 'lighting-effects'].includes(effect.id);
      if (category === 'Stats') return ['rom', 'live'].includes(effect.id);
      return false;
    });
  };

  // Check if effect is already active
  const isEffectActive = (effectId: string) => {
    return activeEffects.some(active => active.effect.id === effectId);
  };

  // Add effect to the stack
  const addEffect = (effect: Effect) => {
    // Set default configuration based on effect type
    let defaultConfig: any = { intensity: 50, duration: 5, style: 'minimal' };
    
    if (effect.id === 'muybridge') {
      defaultConfig = {
        gridRows: 3,
        gridCols: 3,
        padding: 8,
        frameStagger: 0.5,
        showBorders: true,
        borderColor: '#666666',
        borderWidth: 2
      };
    }
    
    const newActiveEffect: ActiveEffect = {
      id: `${effect.id}-${Date.now()}`,
      effect,
      config: defaultConfig,
      enabled: true,
      order: activeEffects.length
    };
    setActiveEffects([...activeEffects, newActiveEffect]);
    
    // Pre-extract frames for Muybridge effect
    if (effect.id === 'muybridge') {
      const video = videoRef.current;
      if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA
        preExtractKeyFrames(video, defaultConfig).catch(console.error);
      } else if (video) {
        // Wait for video to be ready
        const handleCanPlay = () => {
          if (video) {
            preExtractKeyFrames(video, defaultConfig).catch(console.error);
          }
          video.removeEventListener('canplay', handleCanPlay);
        };
        video.addEventListener('canplay', handleCanPlay);
      }
    }
  };

  // Remove effect from the stack
  const removeEffect = (effectId: string) => {
    const effectToRemove = activeEffects.find(e => e.id === effectId);
    setActiveEffects(activeEffects.filter(e => e.id !== effectId));
    if (configPopover === effectId) {
      setConfigPopover(null);
    }
    
    // Clear frame cache if Muybridge effect is removed
    if (effectToRemove?.effect.id === 'muybridge') {
      clearFrameCache(videoUrl);
    }
  };

  // Update effect configuration
  const updateEffectConfig = (effectId: string, config: any) => {
    const effect = activeEffects.find(e => e.id === effectId);
    if (!effect) return;
    
    const newConfig = { ...effect.config, ...config };
    setActiveEffects(activeEffects.map(e => 
      e.id === effectId ? { ...e, config: newConfig } : e
    ));
    
    // Re-extract frames if Muybridge grid size changes
    if (effect.effect.id === 'muybridge') {
      const oldGridSize = (effect.config.gridRows || 3) * (effect.config.gridCols || 3);
      const newGridSize = (newConfig.gridRows || 3) * (newConfig.gridCols || 3);
      
      if (oldGridSize !== newGridSize) {
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          // Clear old cache and re-extract with new grid size
          clearFrameCache(videoUrl);
          preExtractKeyFrames(video, newConfig).catch(console.error);
        }
      }
    }
  };

  // Toggle effect enabled/disabled
  const toggleEffect = (effectId: string) => {
    setActiveEffects(activeEffects.map(e => 
      e.id === effectId ? { ...e, enabled: !e.enabled } : e
    ));
  };

  // Move effect up in order
  const moveEffectUp = (effectId: string) => {
    const currentIndex = activeEffects.findIndex(e => e.id === effectId);
    if (currentIndex > 0) {
      const newEffects = [...activeEffects];
      [newEffects[currentIndex], newEffects[currentIndex - 1]] = [newEffects[currentIndex - 1], newEffects[currentIndex]];
      setActiveEffects(newEffects.map((e, i) => ({ ...e, order: i })));
    }
  };

  // Move effect down in order
  const moveEffectDown = (effectId: string) => {
    const currentIndex = activeEffects.findIndex(e => e.id === effectId);
    if (currentIndex < activeEffects.length - 1) {
      const newEffects = [...activeEffects];
      [newEffects[currentIndex], newEffects[currentIndex + 1]] = [newEffects[currentIndex + 1], newEffects[currentIndex]];
      setActiveEffects(newEffects.map((e, i) => ({ ...e, order: i })));
    }
  };

  // Handle export
  const handleExport = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error('No video available for export');
      return;
    }

    setIsExporting(true);
    
    try {
      console.log('Starting export with config:', { activeEffects, exportConfig });
      
      const result = await exportAsset(video, poses, activeEffects, exportConfig);
      
      if (result.success && result.data instanceof Blob && result.filename) {
        // Download the exported file
        downloadBlob(result.data, result.filename);
        console.log('Export successful:', result.filename);
        
        // Show success feedback
        setExportSuccess(true);
        setIsExporting(false);
        
        // Clear success message after 3 seconds
    setTimeout(() => {
          setExportSuccess(false);
        }, 3000);
      } else {
        console.error('Export failed:', result.error);
        // Show error feedback (you could add a toast notification here)
        setIsExporting(false);
      }
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
    }
  };

  // Live preview: render Muybridge effect if active
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Find the first enabled Muybridge effect
    const muybridgeEffect = activeEffects.find(
      (e) => e.effect.id === 'muybridge' && e.enabled
    );

    let rafId: number;
    let lastDrawTime = 0;
    let lastConfigHash = '';
    
    function draw() {
      if (muybridgeEffect && video && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const currentTime = video.currentTime;
          const configHash = JSON.stringify(muybridgeEffect.config);
          
          // Only redraw if:
          // 1. Video time has changed significantly (every 0.5 seconds for animation)
          // 2. Config has changed
          // 3. It's been more than 2 seconds since last draw
          const timeChanged = Math.abs(currentTime - lastDrawTime) > 0.5;
          const configChanged = configHash !== lastConfigHash;
          const timeSinceLastDraw = Date.now() - lastDrawTime > 2000;
          
          if (timeChanged || configChanged || timeSinceLastDraw) {
            renderMuybridge(
              ctx,
              video,
              poses,
              muybridgeEffect.config,
              currentTime
            );
            lastDrawTime = currentTime;
            lastConfigHash = configHash;
          }
        }
      } else if (canvas) {
        // Clear canvas if Muybridge not active
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      rafId = requestAnimationFrame(draw);
    }
    
    draw();
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [activeEffects, poses]);

  // Render configuration popover content
  const renderConfigPopoverContent = (effect: ActiveEffect) => (
    <Popover.Content 
      className="bg-white rounded-lg shadow-lg border p-4 w-80 z-50"
      side="top"
      align="center"
      sideOffset={8}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{effect.effect.icon}</span>
          <h3 className="font-semibold text-onyx-10">{effect.effect.name}</h3>
        </div>
        <Popover.Close asChild>
          <button className="text-onyx-30 hover:text-onyx-10">
            <X className="w-4 h-4" />
          </button>
        </Popover.Close>
      </div>

      <div className="space-y-4">
        {/* Muybridge-specific configuration */}
        {effect.effect.id === 'muybridge' && (
          <>
            <div>
              <label className="block text-sm font-medium text-onyx-10 mb-2">Grid Size</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-onyx-30 mb-1">Rows</label>
                  <input
                    type="number"
                    min="2"
                    max="5"
                    value={effect.config.gridRows || 3}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      gridRows: parseInt(e.target.value) || 3 
                    })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-onyx-30 mb-1">Columns</label>
                  <input
                    type="number"
                    min="2"
                    max="5"
                    value={effect.config.gridCols || 3}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      gridCols: parseInt(e.target.value) || 3 
                    })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-onyx-10 mb-2">Frame Stagger (seconds)</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={effect.config.frameStagger || 0.5}
                className="w-full"
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                  frameStagger: parseFloat(e.target.value) 
                })}
              />
              <div className="flex justify-between text-xs text-onyx-30 mt-1">
                <span>0.1s</span>
                <span>{effect.config.frameStagger || 0.5}s</span>
                <span>2.0s</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-onyx-10 mb-2">Padding</label>
              <input
                type="range"
                min="0"
                max="20"
                value={effect.config.padding || 8}
                className="w-full"
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                  padding: parseInt(e.target.value) 
                })}
              />
              <div className="flex justify-between text-xs text-onyx-30 mt-1">
                <span>None</span>
                <span>{effect.config.padding || 8}px</span>
                <span>20px</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showBorders"
                checked={effect.config.showBorders !== false}
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                  showBorders: e.target.checked 
                })}
                className="rounded"
              />
              <label htmlFor="showBorders" className="text-sm text-onyx-10">Show borders</label>
            </div>

            {/* Border thickness slider - only show when borders are enabled */}
            {effect.config.showBorders !== false && (
              <div>
                <label className="block text-sm font-medium text-onyx-10 mb-2">Border Thickness</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={effect.config.borderWidth || 2}
                  className="w-full"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    borderWidth: parseInt(e.target.value) 
                  })}
                />
                <div className="flex justify-between text-xs text-onyx-30 mt-1">
                  <span>Thin</span>
                  <span>{effect.config.borderWidth || 2}px</span>
                  <span>Thick</span>
                </div>
              </div>
            )}

            {/* Border color picker - only show when borders are enabled */}
            {effect.config.showBorders !== false && (
              <div>
                <label className="block text-sm font-medium text-onyx-10 mb-2">Border Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={effect.config.borderColor || '#333'}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      borderColor: e.target.value 
                    })}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={effect.config.borderColor || '#333'}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      borderColor: e.target.value 
                    })}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                    placeholder="#333"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Generic intensity control for other effects */}
        {effect.effect.id !== 'muybridge' && (
        <div>
          <label className="block text-sm font-medium text-onyx-10 mb-2">Intensity</label>
          <input
            type="range"
            min="0"
            max="100"
            value={effect.config.intensity || 50}
            className="w-full"
            onChange={(e) => updateEffectConfig(effect.id, { intensity: e.target.value })}
          />
          <div className="flex justify-between text-xs text-onyx-30 mt-1">
            <span>Subtle</span>
            <span>Dramatic</span>
          </div>
        </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => moveEffectUp(effect.id)}
            className="flex-1 px-3 py-2 bg-gray-100 text-onyx-10 rounded text-sm hover:bg-gray-200 transition"
          >
            ↑ Move Up
          </button>
          <button
            onClick={() => moveEffectDown(effect.id)}
            className="flex-1 px-3 py-2 bg-gray-100 text-onyx-10 rounded text-sm hover:bg-gray-200 transition"
          >
            ↓ Move Down
          </button>
        </div>

        <button
          onClick={() => {
            removeEffect(effect.id);
            setConfigPopover(null);
          }}
          className="w-full px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
        >
          Remove Effect
        </button>
      </div>
    </Popover.Content>
  );

  return isOpen ? (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-2xl w-full h-full m-0 overflow-hidden flex flex-col shadow-2xl max-w-3xl mx-auto animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-onyx-10">Create Shareable Asset</h1>
            <p className="text-xs text-onyx-30 font-medium">{exerciseTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-0 hover:bg-gray-100 rounded-lg transition active:scale-95 focus:ring-2 focus:ring-onyx-20"
            >
              <X className="w-4 h-4 text-onyx-30" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Video Preview */}
          <div className="flex-1 p-1 flex flex-col items-center justify-center min-h-0">
            {/* Video Container */}
            <div
              style={{
                position: 'relative',
                width: '400px',
                height: '711px',
                margin: '0 auto',
                background: '#111214',
                borderRadius: '0.75rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                  borderRadius: '0.75rem', // matches rounded-xl
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                controls
                loop
                muted
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2,
                  borderRadius: '0.75rem',
                }}
              />

              {/* Vertical Icon Menu - Upper Right */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Export Button */}
                <button
                  onClick={() => setSelectedCategory(selectedCategory === 'export' ? null : 'export')}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedCategory === 'export' ? '#F97316' : '#f5f6f7',
                    color: selectedCategory === 'export' ? 'white' : '#55595B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedCategory === 'export' ? '0 2px 8px rgba(249, 115, 22, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== 'export') {
                      e.currentTarget.style.background = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== 'export') {
                      e.currentTarget.style.background = '#f5f6f7';
                    }
                  }}
                >
                  <Download style={{ 
                    width: '20px', 
                    height: '20px', 
                    stroke: selectedCategory === 'export' ? 'white' : '#55595B' 
                  }} />
                </button>

                {(['Motion', 'Creative', 'Stats'] as EffectType[]).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedCategory === category ? '#F97316' : '#f5f6f7',
                      color: selectedCategory === category ? 'white' : '#55595B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedCategory === category ? '0 2px 8px rgba(249, 115, 22, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCategory !== category) {
                        e.currentTarget.style.background = '#e5e7eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCategory !== category) {
                        e.currentTarget.style.background = '#f5f6f7';
                      }
                    }}
                  >
                    {React.cloneElement(effectTypeIcon[category], {
                      width: '20px',
                      height: '20px',
                      stroke: selectedCategory === category ? 'white' : '#55595B',
                    } as any)}
                    </button>
                ))}
                </div>

              {/* Horizontal Sub-menu - Left of Vertical Menu */}
              {selectedCategory && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '80px', // Position to the left of vertical menu
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    backdropFilter: 'blur(8px)',
                    maxWidth: '200px',
                    minWidth: '160px',
                  }}
                >
                  {selectedCategory === 'export' ? (
                    // Export Settings Menu
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#181A1A', marginBottom: '8px' }}>
                        Export Settings
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Format</div>
                    <Select.Root value={exportConfig.format} onValueChange={(value: 'png' | 'jpg' | 'webp' | 'mp4') => setExportConfig({ ...exportConfig, format: value })}>
                            <Select.Trigger style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              fontSize: '11px',
                              background: '#F9FAFB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                            }}>
                        <Select.Value />
                        <Select.Icon>
                                <ChevronDown style={{ width: '12px', height: '12px' }} />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                              <Select.Content style={{
                                background: 'white',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                zIndex: 50,
                              }}>
                                <Select.Viewport style={{ padding: '4px' }}>
                                  <Select.Item value="png" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                  }} className="hover:bg-gray-100">
                              <Select.ItemText>PNG Image</Select.ItemText>
                            </Select.Item>
                                  <Select.Item value="jpg" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                  }} className="hover:bg-gray-100">
                              <Select.ItemText>JPG Image</Select.ItemText>
                            </Select.Item>
                                  <Select.Item value="webp" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                  }} className="hover:bg-gray-100">
                              <Select.ItemText>WebP Image</Select.ItemText>
                            </Select.Item>
                                  <Select.Item value="mp4" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    opacity: 0.5,
                                  }} className="hover:bg-gray-100" disabled>
                              <Select.ItemText>MP4 Video (Coming Soon)</Select.ItemText>
                            </Select.Item>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                  <div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Quality</div>
                    <Select.Root value={exportConfig.quality} onValueChange={(value: 'high' | 'medium' | 'low') => setExportConfig({ ...exportConfig, quality: value })}>
                            <Select.Trigger style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              fontSize: '11px',
                              background: '#F9FAFB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                            }}>
                        <Select.Value />
                        <Select.Icon>
                                <ChevronDown style={{ width: '12px', height: '12px' }} />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                              <Select.Content style={{
                                background: 'white',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                zIndex: 50,
                              }}>
                                <Select.Viewport style={{ padding: '4px' }}>
                                  <Select.Item value="high" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                  }} className="hover:bg-gray-100">
                              <Select.ItemText>High Quality</Select.ItemText>
                            </Select.Item>
                                  <Select.Item value="medium" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                  }} className="hover:bg-gray-100">
                              <Select.ItemText>Medium Quality</Select.ItemText>
                            </Select.Item>
                                  <Select.Item value="low" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                  }} className="hover:bg-gray-100">
                              <Select.ItemText>Low Quality</Select.ItemText>
                            </Select.Item>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                  
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: exportSuccess ? '#10B981' : isExporting ? '#6B7280' : '#10B981',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '4px',
                          }}
                          onMouseEnter={(e) => {
                            if (!isExporting && !exportSuccess) {
                              e.currentTarget.style.background = '#059669';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isExporting && !exportSuccess) {
                              e.currentTarget.style.background = '#10B981';
                            }
                          }}
                  >
                          <Download style={{ width: '12px', height: '12px' }} />
                    {isExporting ? 'Exporting...' : exportSuccess ? '✓ Exported!' : 'Export Asset'}
                  </button>
                </div>
                    </>
                  ) : (
                    // Effect Category Menu
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#181A1A', marginBottom: '8px' }}>
                        {selectedCategory} Effects
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {getEffectsForCategory(selectedCategory).map((effect) => {
                          const isActive = isEffectActive(effect.id);
                          return (
            <button
                              key={effect.id}
                              onClick={() => {
                                if (!isActive) {
                                  addEffect(effect);
                                }
                              }}
                              disabled={isActive}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isActive ? '#e5f3ff' : '#f5f6f7',
                                color: isActive ? '#0066cc' : '#181A1A',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: isActive ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.background = '#e5e7eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.background = isActive ? '#e5f3ff' : '#f5f6f7';
                                }
                              }}
                            >
                              <span style={{ fontSize: '14px' }}>{effect.icon}</span>
                              <span>{effect.name}</span>
                              {isActive && (
                                <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700 }}>✓</span>
                              )}
            </button>
                          );
                        })}
          </div>
                    </>
                  )}
                </div>
              )}

              {/* Active Effects Chips - Bottom of Video */}
              <div 
                className="hide-scrollbar"
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  alignItems: 'center',
                  minHeight: '32px',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  paddingBottom: '4px', /* Space for potential scrollbar */
                }}
              >
              {activeEffects.map((activeEffect) => (
                <Popover.Root key={activeEffect.id} open={configPopover === activeEffect.id} onOpenChange={(open) => setConfigPopover(open ? activeEffect.id : null)}>
                  <Popover.Trigger asChild>
                    <div
                        style={{
                          background: activeEffect.enabled ? '#e5f3ff' : '#f5f6f7',
                          border: `1px solid ${activeEffect.enabled ? '#0066cc' : '#d1d5db'}`,
                          borderRadius: '16px',
                          padding: '4px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: activeEffect.enabled ? '#0066cc' : '#6b7280',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>{activeEffect.effect.icon}</span>
                        <span>{activeEffect.effect.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEffect(activeEffect.id);
                        }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                            color: 'inherit',
                            opacity: 0.7,
                            marginLeft: '4px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                          }}
                      >
                        {activeEffect.enabled ? '●' : '○'}
                      </button>
                    </div>
                  </Popover.Trigger>
                  {renderConfigPopoverContent(activeEffect)}
                </Popover.Root>
              ))}
              
              {activeEffects.length === 0 && (
                  <div style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    fontStyle: 'italic',
                  }}>
                    No effects selected
                  </div>
                )}
              </div>


              
              {/* Stats Overlay */}
              {statsConfig.rom && (
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-3 text-sm shadow-lg animate-fade-in">
                  <div>ROM: Knee 120°</div>
                  <div>Hip 90°</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
} 