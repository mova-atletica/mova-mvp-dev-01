"use client";
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Settings, Download, ChevronDown, ChevronUp } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import * as Accordion from '@radix-ui/react-accordion';
import * as Checkbox from '@radix-ui/react-checkbox';
import { preExtractKeyFrames, clearFrameCache } from '../lib/effects/muybridge';
import { exportAsset, downloadBlob, ExportConfig } from '../lib/exportService';

// 1. Add Tailwind and minimal custom CSS for transitions, shadows, and responsive design
import './AssetGenerationModal.css';

interface AssetGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  poses: any[];
  exerciseTitle?: string; // Make optional for Open Move
  exercise?: any; // Full exercise object for auto-populating data
}

interface Effect {
  id: string;
  name: string;
  description: string;
  icon?: string;
  preview: string;
  category: string;
  videoConfig: {
    shouldRenderVideo: boolean;
    videoOpacity: number;
    blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
    renderOrder: 'before' | 'after' | 'replace';
  };
}

interface ActiveEffect {
  id: string;
  effect: Effect;
  config: any;
  enabled: boolean;
  order: number;
}

const availableEffects: Effect[] = [
  // Motion Effects (Working)
  { 
    id: "muybridge", 
    name: "Muybridge", 
    description: "Grid of key frames", 
    preview: "Grid layout", 
    category: "Motion",
    videoConfig: {
      shouldRenderVideo: false,
      videoOpacity: 0,
      blendMode: 'normal',
      renderOrder: 'replace'
    }
  },
  { 
    id: "motion-trails", 
    name: "Motion Trails", 
    description: "Ghost trail effect", 
 
    preview: "Trailing animation", 
    category: "Motion",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.3,
      blendMode: 'multiply',
      renderOrder: 'before'
    }
  },
  // Stats Effects (Working)
  { 
    id: "joint-angles", 
    name: "Joint Angles", 
    description: "Display joint angle measurements", 
 
    preview: "Angle display", 
    category: "Stats",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: 'normal',
      renderOrder: 'after'
    }
  },
  { 
    id: "range-of-motion", 
    name: "Range of Motion", 
    description: "Track joint ROM statistics", 
 
    preview: "ROM tracking", 
    category: "Stats",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: 'normal',
      renderOrder: 'after'
    }
  },
];

// Add SVG icon components for effect types
const MotionIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M3 10c2-4 6-4 8 0s6 4 8 0" />
  </svg>
);

const StatsIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <rect x="3" y="10" width="3" height="7" />
    <rect x="8.5" y="6" width="3" height="11" />
    <rect x="14" y="13" width="3" height="4" />
  </svg>
);

// Map effect categories to icons
type EffectType = 'Motion' | 'Stats';
const effectTypeIcon: Record<EffectType, React.ReactElement> = {
  Motion: <MotionIcon />,
  Stats: <StatsIcon />,
};

export default function AssetGenerationModal({
  isOpen,
  onClose,
  videoUrl,
  poses,
  exerciseTitle,
  exercise
}: AssetGenerationModalProps) {
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [configPopover, setConfigPopover] = useState<string | null>(null);
  const [statsConfig, setStatsConfig] = useState<any>({ rom: true, live: true });
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 'high',
    duration: 3,
    framerate: 30,
  });
  const [videoVisibility, setVideoVisibility] = useState({
    showVideo: true,
    opacity: 1.0,
    blendMode: 'source-over' as GlobalCompositeOperation
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EffectType | 'export' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);

  // Pre-load effect modules for better performance
  const effectModulesRef = useRef<{
    renderMuybridge?: any;
    renderMuybridgeFromCanvas?: any;
    renderMotionTrails?: any;
    renderStats?: any;
  }>({});

  // Load effect modules on mount
  useEffect(() => {
    const loadEffectModules = async () => {
      try {
        const [muybridgeModule, motionTrailsModule, statsModule] = await Promise.all([
          import('../lib/effects/muybridge'),
          import('../lib/effects/motion-trails'),
          import('../lib/effects/stats')
        ]);
        
        effectModulesRef.current = {
          renderMuybridge: muybridgeModule.renderMuybridge,
          renderMuybridgeFromCanvas: muybridgeModule.renderMuybridgeFromCanvas,
          renderMotionTrails: motionTrailsModule.renderMotionTrails,
          renderStats: statsModule.renderStats
        };
      } catch (error) {
        console.warn('Failed to pre-load effect modules:', error);
      }
    };
    
    loadEffectModules();
  }, []);

  // Set up video event listeners for play/pause state tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  // Disable scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY;
      
      // Add styles to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      
      // Cleanup function to restore scrolling
      return () => {
        // Restore body styles
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Restore scroll position with a small delay to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
      };
    }
  }, [isOpen]);

  // Clear frame cache utility
  const clearFrameCache = () => {
    if (typeof window !== 'undefined' && (window as any).frameCache) {
      (window as any).frameCache.clear();
    }
  };

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
      
      // Calculate the actual display size of the video within the container
      const containerWidth = 400; // Fixed container width
      const containerHeight = 711; // Fixed container height
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let displayWidth, displayHeight;
      
      if (videoAspectRatio > containerAspectRatio) {
        // Video is wider than container - fit to container width
        displayWidth = containerWidth;
        displayHeight = containerWidth / videoAspectRatio;
      } else {
        // Video is taller than container - fit to container height
        displayHeight = containerHeight;
        displayWidth = containerHeight * videoAspectRatio;
      }
      
      // Set canvas CSS size to match the video's actual display size
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Center the canvas within the container (same as video with objectFit: contain)
      canvas.style.position = 'absolute';
      canvas.style.top = `${(containerHeight - displayHeight) / 2}px`;
      canvas.style.left = `${(containerWidth - displayWidth) / 2}px`;
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
      if (category === 'Motion') return ['muybridge', 'motion-trails'].includes(effect.id);
      if (category === 'Stats') return ['joint-angles', 'range-of-motion'].includes(effect.id);
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
    } else if (effect.id === 'motion-trails') {
      defaultConfig = {
        trailLength: 10,
        trailOpacity: 0.6,
        trailStyle: 'simple',
        fadeOut: true,
        color: '#00ff00',
        thickness: 2,
        showBones: false,
        boneColor: '#ff0000',
        boneThickness: 1
      };
    } else if (effect.id === 'joint-angles') {
      defaultConfig = {
        showJointAngles: true,
        enabledJoints: ['left_knee', 'right_knee', 'left_hip', 'right_hip'],
        angleColor: '#00ff00',
        angleSize: 18,
        showROM: false,
        romJoints: [],
        showGlobalStats: false,
        safeZoneEnabled: true
      };
    } else if (effect.id === 'range-of-motion') {
      defaultConfig = {
        showJointAngles: false,
        enabledJoints: [],
        showROM: true,
        romJoints: ['left_knee', 'right_knee', 'left_hip', 'right_hip'],
        romDisplayStyle: 'min_max',
        romColor: '#ff6b35',
        angleSize: 16,
        showGlobalStats: false,
        safeZoneEnabled: false
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
      clearFrameCache();
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
          clearFrameCache();
          preExtractKeyFrames(video, newConfig).catch(console.error);
        }
      }
    }
  };

  // Toggle effect enabled/disabled
  const toggleEffect = (effectId: string) => {
    const newActiveEffects = activeEffects.map(e => 
      e.id === effectId ? { ...e, enabled: !e.enabled } : e
    );
    setActiveEffects(newActiveEffects);
    
    // Handle problematic combination restrictions
    const video = videoRef.current;
    if (video && poses.length > 0) {
      const hasMuybridge = newActiveEffects.some(e => e.effect.id === 'muybridge' && e.enabled);
      const hasMotionTrails = newActiveEffects.some(e => e.effect.id === 'motion-trails' && e.enabled);
      
      if (hasMuybridge && hasMotionTrails) {
        // Auto-switch to PNG if currently on video format
        if (exportConfig.format === 'webm') {
          setExportConfig(prev => ({
            ...prev,
            format: 'png'
          }));
  
        }
        
        // Remove the frame rate auto-detection since we're disabling video exports

      }
    }
  };



  // Check if problematic combination is active (Muybridge + Motion Trails) or Muybridge alone
  const hasProblematicCombination = (): boolean => {
    const hasMuybridge = activeEffects.some(e => e.effect.id === 'muybridge' && e.enabled);
    const hasMotionTrails = activeEffects.some(e => e.effect.id === 'motion-trails' && e.enabled);
    return hasMuybridge && hasMotionTrails;
  };

  // Check if video export should be disabled (Muybridge alone or problematic combination)
  const isVideoExportDisabled = (): boolean => {
    const hasMuybridge = activeEffects.some(e => e.effect.id === 'muybridge' && e.enabled);
    return hasMuybridge || hasProblematicCombination();
  };

  // Handle video play/pause toggle
  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.warn('Failed to play video:', error);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error('No video available for export');
      return;
    }

    // Prevent export if video format is disabled
    let finalExportConfig = { ...exportConfig };
    if (isVideoExportDisabled() && exportConfig.format === 'webm') {
      console.error('❌ Cannot export video with Muybridge effect');
      alert('Video exports are not supported when using Muybridge effects. Please use a static image format (PNG, JPG, WebP).');
      setIsExporting(false);
      return;
    }

    setIsExporting(true);
    
    try {
  
      
      const result = await exportAsset(video, poses, activeEffects, {
        ...finalExportConfig,
        videoVisibility
      });
      
      if (result.success && result.data instanceof Blob && result.filename) {
        // Download the exported file
        downloadBlob(result.data, result.filename);

        
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
      if (video && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const currentTime = video.currentTime;
          
          // Optimization: only redraw if time changed significantly or config changed
          const configHash = JSON.stringify(activeEffects.map(e => ({ id: e.effect.id, enabled: e.enabled, config: e.config })));
          const timeChanged = Math.abs(currentTime - lastDrawTime) > 0.1; // Update every 100ms
          const configChanged = configHash !== lastConfigHash;
          
          if (!timeChanged && !configChanged) {
            rafId = requestAnimationFrame(draw);
            return;
          }
          
          lastDrawTime = currentTime;
          lastConfigHash = configHash;
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Check if video should be rendered based on global toggle and effect overrides
          const hasVideoReplacement = activeEffects.some(effect => 
            effect.enabled && effect.effect.videoConfig?.shouldRenderVideo === false
          );
          
          // Check if Muybridge effect is active (it will handle its own video rendering)
          const hasMuybridgeEffect = activeEffects.some(effect => 
            effect.enabled && effect.effect.id === 'muybridge'
          );
          
          // Render video background if globally enabled, no effect disables it, and Muybridge is not active
          if (videoVisibility.showVideo && !hasVideoReplacement && !hasMuybridgeEffect) {
            ctx.globalAlpha = videoVisibility.opacity;
            ctx.globalCompositeOperation = videoVisibility.blendMode;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
          }
          
          // Check if Muybridge effect is active
          const muybridgeEffect = activeEffects.find(e => e.effect.id === 'muybridge' && e.enabled);
          
          if (muybridgeEffect && effectModulesRef.current.renderMuybridgeFromCanvas) {
            // If Muybridge is active, skip other effects and let Muybridge handle everything
            try {
              // Clear the main canvas for muybridge to render to
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Create a synchronous effect renderer function that applies all non-muybridge effects
              const effectRenderer = (frameCtx: CanvasRenderingContext2D, frameVideo: HTMLVideoElement, framePoses: any[], frameTime: number) => {
                
                // First apply motion effects (background effects)
                for (const effect of activeEffects) {
                  if (!effect.enabled || effect.effect.id === 'muybridge') continue;
                  
                  switch (effect.effect.id) {
                    case 'motion-trails':
                      if (effectModulesRef.current.renderMotionTrails) {
                        effectModulesRef.current.renderMotionTrails(frameCtx, frameVideo, framePoses, effect.config, frameTime);
                      }
                      break;
                    default:
                      // Skip stats effects for now - render them last
                      break;
                  }
                }
                
                // Then apply stats effects last (foreground effects) - but exclude exercise-details from tiles
                for (const effect of activeEffects) {
                  if (!effect.enabled || effect.effect.id === 'muybridge') continue;
                  
                  switch (effect.effect.id) {
                    case 'joint-angles':
                    case 'range-of-motion':
                      // Only render joint angles and ROM in individual tiles
                      if (effectModulesRef.current.renderStats) {
                        effectModulesRef.current.renderStats(frameCtx, frameVideo, framePoses, effect.config, frameTime);
                      }
                      break;
                    default:
                      // Skip non-stats effects
                      break;
                  }
                }
              };
              
              // Render muybridge with effects applied to each frame (now synchronous)
              effectModulesRef.current.renderMuybridgeFromCanvas(ctx, video, poses, muybridgeEffect.config, currentTime, false, effectRenderer, videoVisibility);
              
              // Render exercise-details once over the entire canvas (not in individual tiles)
              const exerciseDetailsEffect = activeEffects.find(e => e.effect.id === 'exercise-details' && e.enabled);
              if (exerciseDetailsEffect && effectModulesRef.current.renderStats) {
                effectModulesRef.current.renderStats(ctx, video, poses, exerciseDetailsEffect.config, currentTime);
              }
            } catch (error) {
              console.warn('Failed to render muybridge effect:', error);
            }
          } else {
            // If no Muybridge effect, render effects in proper order
            // First render motion effects (background effects)
            for (const effect of activeEffects) {
              if (!effect.enabled) continue;
              
              switch (effect.effect.id) {
                case 'motion-trails':
                  if (effectModulesRef.current.renderMotionTrails) {
                    effectModulesRef.current.renderMotionTrails(ctx, video, poses, effect.config, currentTime);
                  }
                  break;
                default:
                  // Skip stats effects for now - render them last
                  break;
              }
            }
            
            // Then render stats effects last (foreground effects)
            for (const effect of activeEffects) {
              if (!effect.enabled) continue;
              
              switch (effect.effect.id) {
                case 'joint-angles':
                case 'range-of-motion':
                  if (effectModulesRef.current.renderStats) {
                    effectModulesRef.current.renderStats(ctx, video, poses, effect.config, currentTime);
                  }
                  break;
                default:
                  // Skip non-stats effects
                  break;
              }
            }
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    }
    
    draw();
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [activeEffects, poses, videoVisibility]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(event.target as Node)) {
        setFormatDropdownOpen(false);
      }
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(event.target as Node)) {
        setQualityDropdownOpen(false);
      }
    }

    if (formatDropdownOpen || qualityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [formatDropdownOpen, qualityDropdownOpen]);

  // Render configuration popover content
  const renderConfigPopoverContent = (effect: ActiveEffect) => (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#181A1A', marginBottom: '8px' }}>
        {effect.effect.name} Settings
      </div>

      <div className="space-y-4">
        {/* Muybridge-specific configuration */}
        {effect.effect.id === 'muybridge' && (
          <div className="space-y-3">
            {/* Grid Size - Compact inline layout */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: '#181A1A' }}>Grid Size</label>
                <span className="text-xs" style={{ color: '#181A1A' }}>
                  {effect.config.gridRows || 3}×{effect.config.gridRows || 3}
                </span>
              </div>
              <input
                type="number"
                min="2"
                max="5"
                value={effect.config.gridRows || 3}
                onChange={(e) => {
                  const value = Math.max(2, Math.min(5, parseInt(e.target.value) || 3));
                  updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    gridRows: value,
                    gridCols: value  // Set both rows and cols to the same value
                  });
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                style={{
                  backgroundColor: '#f9f9f9',
                  color: '#333'
                }}
              />
            </div>

            {/* Frame Timing - Compact */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: '#181A1A' }}>Frame Timing</label>
                <span className="text-xs" style={{ color: '#181A1A' }}>
                  {effect.config.frameStagger || 0.5}s
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={effect.config.frameStagger || 0.5}
                className="w-full h-1"
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                  frameStagger: parseFloat(e.target.value) 
                })}
              />
            </div>

            {/* Styling - Grouped toggles and sliders */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Styling</label>
              
              {/* Borders toggle */}
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs" style={{ color: '#181A1A' }}>Borders</label>
                <input
                  type="checkbox"
                  checked={effect.config.showBorders !== false}
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    showBorders: e.target.checked 
                  })}
                  className="w-4 h-4"
                />
              </div>
              
              {/* Padding slider */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Padding</span>
              <input
                type="range"
                min="0"
                max="20"
                value={effect.config.padding || 8}
                  className="flex-1 h-1"
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                  padding: parseInt(e.target.value) 
                })}
              />
                <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                  {effect.config.padding || 8}px
                </span>
            </div>

              {/* Border thickness - only show when borders enabled */}
              {effect.config.showBorders !== false && (
            <div className="flex items-center gap-2">
                  <span className="text-xs w-12" style={{ color: '#181A1A' }}>Border</span>
              <input
                    type="range"
                    min="1"
                    max="8"
                    value={effect.config.borderWidth || 2}
                    className="flex-1 h-1"
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                      borderWidth: parseInt(e.target.value) 
                })}
              />
                  <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                    {effect.config.borderWidth || 2}px
                  </span>
            </div>
              )}

              {/* Border color - compact color picker */}
            {effect.config.showBorders !== false && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs w-12" style={{ color: '#181A1A' }}>Color</span>
                  <input
                    type="color"
                    value={effect.config.borderColor || '#333'}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      borderColor: e.target.value 
                    })}
                    className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={effect.config.borderColor || '#333'}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      borderColor: e.target.value 
                    })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                    style={{ color: '#181A1A' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Motion Trails-specific configuration */}
        {effect.effect.id === 'motion-trails' && (
          <div className="space-y-3">
            {/* Trail Properties - Compact sliders */}
              <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Trail Properties</label>
              
              {/* Trail Length */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Length</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={effect.config.trailLength || 10}
                  className="flex-1 h-1"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    trailLength: parseInt(e.target.value) 
                  })}
                />
                <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                  {effect.config.trailLength || 10}
                </span>
              </div>

              {/* Trail Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(effect.config.trailOpacity || 0.6) * 100}
                  className="flex-1 h-1"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    trailOpacity: parseInt(e.target.value) / 100 
                  })}
                />
                <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                  {Math.round((effect.config.trailOpacity || 0.6) * 100)}%
                </span>
              </div>
            </div>

            {/* Style & Appearance */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Style</label>
              
              {/* Trail Style and Color - Inline */}
              <div className="flex gap-2 mb-2">
                <select
                  value={effect.config.trailStyle || 'simple'}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    trailStyle: e.target.value 
                  })}
                >
                  <option value="simple">Simple</option>
                  <option value="gradient">Gradient</option>
                </select>
                <span className="text-xs flex items-center" style={{ color: '#181A1A' }}>Color</span>
                <input
                  type="color"
                  value={effect.config.color || '#00ff00'}
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    color: e.target.value 
                  })}
                  className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                />
              </div>

              {/* Thickness */}
              <div className="flex items-center gap-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Thickness</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={effect.config.thickness || 2}
                  className="flex-1 h-1"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    thickness: parseInt(e.target.value) 
                  })}
                />
                <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                  {effect.config.thickness || 2}px
                </span>
                </div>
              </div>

            {/* Options - Compact toggles */}
              <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Options</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={effect.config.fadeOut !== false}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      fadeOut: e.target.checked 
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-xs" style={{ color: '#181A1A' }}>Fade out</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={effect.config.showBones === true}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      showBones: e.target.checked 
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-xs" style={{ color: '#181A1A' }}>Show bones</span>
                </label>
              </div>
            </div>

            {/* Bone Settings - Only show when bones enabled */}
            {effect.config.showBones && (
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Bone Settings</label>
                
                {/* Bone Color and Thickness */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs w-12" style={{ color: '#181A1A' }}>Color</span>
                  <input
                    type="color"
                    value={effect.config.boneColor || '#ff0000'}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      boneColor: e.target.value 
                    })}
                    className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={effect.config.boneColor || '#ff0000'}
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      boneColor: e.target.value 
                    })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                    style={{ color: '#181A1A' }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs w-12" style={{ color: '#181A1A' }}>Thickness</span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={effect.config.boneThickness || 1}
                    className="flex-1 h-1"
                    onChange={(e) => updateEffectConfig(effect.id, { 
                      ...effect.config, 
                      boneThickness: parseInt(e.target.value) 
                    })}
                  />
                  <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                    {effect.config.boneThickness || 1}px
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Joint Angles-specific configuration */}
        {effect.effect.id === 'joint-angles' && (
          <div className="space-y-3">
            {/* Joint Selection */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Joint Selection</label>
              
              {/* Joint checkboxes - compact grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'left_knee', label: 'Left Knee' },
                  { key: 'right_knee', label: 'Right Knee' },
                  { key: 'left_hip', label: 'Left Hip' },
                  { key: 'right_hip', label: 'Right Hip' },
                  { key: 'left_elbow', label: 'Left Elbow' },
                  { key: 'right_elbow', label: 'Right Elbow' }
                ].map(joint => (
                  <label key={joint.key} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={(effect.config.enabledJoints || []).includes(joint.key)}
                      onChange={(e) => {
                        const currentJoints = effect.config.enabledJoints || [];
                        const newJoints = e.target.checked 
                          ? [...currentJoints, joint.key]
                          : currentJoints.filter((j: string) => j !== joint.key);
                        updateEffectConfig(effect.id, { 
                          ...effect.config, 
                          enabledJoints: newJoints 
                        });
                      }}
                      className="w-3 h-3"
                    />
                    <span className="text-xs" style={{ color: '#181A1A' }}>{joint.label}</span>
                  </label>
                ))}
              </div>
            </div>



            {/* Appearance */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>Appearance</label>
              
              {/* Color and Size */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Color</span>
                <input
                  type="color"
                  value={effect.config.angleColor || '#00ff00'}
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    angleColor: e.target.value 
                  })}
                  className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={effect.config.angleColor || '#00ff00'}
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    angleColor: e.target.value 
                  })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                />
              </div>

              {/* Text Size */}
              <div className="flex items-center gap-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Size</span>
                <input
                  type="range"
                  min="9"
                  max="30"
                  value={effect.config.angleSize || 18}
                  className="flex-1 h-1"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    angleSize: parseInt(e.target.value) 
                  })}
                />
                <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                  {effect.config.angleSize || 18}px
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Range of Motion-specific configuration */}
        {effect.effect.id === 'range-of-motion' && (
          <div className="space-y-3">
            {/* ROM Joint Selection */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>ROM Tracking Joints</label>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'left_knee', label: 'Left Knee' },
                  { key: 'right_knee', label: 'Right Knee' },
                  { key: 'left_hip', label: 'Left Hip' },
                  { key: 'right_hip', label: 'Right Hip' },
                  { key: 'left_elbow', label: 'Left Elbow' },
                  { key: 'right_elbow', label: 'Right Elbow' }
                ].map(joint => (
                  <label key={joint.key} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={(effect.config.romJoints || []).includes(joint.key)}
                      onChange={(e) => {
                        const currentJoints = effect.config.romJoints || [];
                        const newJoints = e.target.checked 
                          ? [...currentJoints, joint.key]
                          : currentJoints.filter((j: string) => j !== joint.key);
                        updateEffectConfig(effect.id, { 
                          ...effect.config, 
                          romJoints: newJoints 
                        });
                      }}
                      className="w-3 h-3"
                    />
                    <span className="text-xs" style={{ color: '#181A1A' }}>{joint.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ROM Display Style */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>ROM Display</label>
              <select
                value={effect.config.romDisplayStyle || 'min_max'}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                onChange={(e) => updateEffectConfig(effect.id, { 
                  ...effect.config, 
                  romDisplayStyle: e.target.value 
                })}
              >
                <option value="min_max">Min/Max Values</option>
                <option value="range_bar">Range Bar</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* ROM Appearance */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#181A1A' }}>ROM Appearance</label>
              
              {/* Color */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Color</span>
                <input
                  type="color"
                  value={effect.config.romColor || '#ff6b35'}
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    romColor: e.target.value 
                  })}
                  className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={effect.config.romColor || '#ff6b35'}
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    romColor: e.target.value 
                  })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                />
              </div>

              {/* Size */}
              <div className="flex items-center gap-2">
                <span className="text-xs w-12" style={{ color: '#181A1A' }}>Size</span>
                <input
                  type="range"
                  min="9"
                  max="30"
                  value={effect.config.angleSize || 16}
                  className="flex-1 h-1"
                  onChange={(e) => updateEffectConfig(effect.id, { 
                    ...effect.config, 
                    angleSize: parseInt(e.target.value) 
                  })}
                />
                <span className="text-xs w-8" style={{ color: '#181A1A' }}>
                  {effect.config.angleSize || 16}px
                </span>
              </div>
            </div>


          </div>
        )}

        {/* Generic intensity control for other effects */}
        {effect.effect.id !== 'muybridge' && effect.effect.id !== 'motion-trails' && effect.effect.id !== 'joint-angles' && effect.effect.id !== 'range-of-motion' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: '#181A1A' }}>Intensity</label>
            <span className="text-xs" style={{ color: '#181A1A' }}>
              {effect.config.intensity || 50}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={effect.config.intensity || 50}
            className="w-full h-1"
            onChange={(e) => updateEffectConfig(effect.id, { intensity: e.target.value })}
          />
        </div>
        )}

        <button
          onClick={() => {
            removeEffect(effect.id);
            setConfigPopover(null);
          }}
          className="w-full px-2 py-2 bg-white text-red-500 rounded text-xs font-normal hover:bg-red-600 hover:text-white transition"
        >
          Remove Effect
        </button>
      </div>
    </div>
  );

  return isOpen ? (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ width: '100vw', height: '100vh', padding: 0, background: 'rgba(0, 0, 0, 0.9)' }}>
      {/* Close Button */}
      <button
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black focus:outline-none"
        aria-label="Close"
        type="button"
        onClick={onClose}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      {/* Header */}
      <div className="flex flex-col items-center justify-center w-full h-full relative">
        <div className="text-sm font-normal pt-6 pb-0 text-white">Create Shareable Motion Asset: {exerciseTitle || 'Open Move Session'}</div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center w-full">
          {/* Video Preview */}
          <div className="flex flex-col items-center justify-center">
            {/* Video Container */}
            <div
              style={{
                position: 'relative',
                width: '400px',
                height: '711px',
                margin: '0 auto',
                paddingBottom: '30px',
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
                onClick={toggleVideoPlayback}
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
                  cursor: 'pointer',
                }}
                loop
                muted
              />
              
              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5,
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '20px solid white',
                      borderTop: '12px solid transparent',
                      borderBottom: '12px solid transparent',
                      marginLeft: '4px',
                    }}
                  />
                </div>
              )}
              
              <canvas
                ref={canvasRef}
                style={{
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
                    background: selectedCategory === 'export' ? '#777d7f' : '#f5f6f7',
                    color: selectedCategory === 'export' ? 'white' : '#55595B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedCategory === 'export' ? '0 2px 8px rgba(119, 125, 127, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
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

                {(['Motion', 'Stats'] as EffectType[]).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedCategory === category ? '#777d7f' : '#f5f6f7',
                      color: selectedCategory === category ? 'white' : '#55595B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedCategory === category ? '0 2px 8px rgba(119, 125, 127, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
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
                      color: selectedCategory === category ? 'white' : '#55595B',
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
                        Download Settings
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div ref={formatDropdownRef} style={{ position: 'relative' }}>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                              Media
                              {isVideoExportDisabled() && (
                                <span style={{ color: '#F59E0B', marginLeft: '4px' }}>⚠️ Video disabled</span>
                              )}
                            </div>
                          <button
                            className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
                            style={{
                              border: '1px solid #D1D5DB',
                              color: '#353839',
                              background: '#F9FAFB',
                              fontWeight: 500,
                              borderRadius: '4px',
                              fontSize: '11px',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              transition: 'color 0.2s, border 0.2s, background 0.2s',
                            }}
                            onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                            type="button"
                          >
                            {exportConfig.format === 'png' ? 'PNG Image' : 'Video'}
                            <span style={{ 
                              marginLeft: '8px', 
                              display: 'flex', 
                              alignItems: 'center',
                              transform: formatDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease-in-out'
                            }}>
                              <ChevronDown style={{ width: '12px', height: '12px' }} />
                            </span>
                          </button>
                          {formatDropdownOpen && (
                            <div style={{ 
                              position: 'absolute', 
                              left: 0, 
                              top: '100%', 
                              zIndex: 50, 
                              minWidth: '100%', 
                              width: 'max-content', 
                              background: 'white', 
                              border: '1px solid #D1D5DB', 
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              marginTop: '2px'
                            }} className="rounded-lg p-2">
                              <label
                                className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                                style={{ background: 'transparent', color: '#181A1A', whiteSpace: 'nowrap' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, format: 'png' }); 
                                  setFormatDropdownOpen(false); 
                                }}
                              >
                                <input
                                  type="radio"
                                  checked={exportConfig.format === 'png'}
                                  readOnly
                                  style={{ marginRight: '9px' }}
                                />
                                PNG Image
                              </label>
                              <label
                                className={`flex items-center text-xs mb-1 rounded px-1 py-1 transition-colors ${
                                  isVideoExportDisabled() ? 'cursor-not-allowed' : 'cursor-pointer'
                                }`}
                                style={{ 
                                  background: 'transparent', 
                                  color: isVideoExportDisabled() ? '#9CA3AF' : '#181A1A', 
                                  whiteSpace: 'nowrap',
                                  opacity: isVideoExportDisabled() ? 0.5 : 1
                                }}
                                onMouseOver={e => {
                                  if (!isVideoExportDisabled()) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                  }
                                }}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => { 
                                  if (!isVideoExportDisabled()) {
                                    setExportConfig({ ...exportConfig, format: 'webm' }); 
                                    setFormatDropdownOpen(false); 
                                  }
                                }}
                              >
                                <input
                                  type="radio"
                                  checked={exportConfig.format === 'webm'}
                                  readOnly
                                  disabled={isVideoExportDisabled()}
                                  style={{ marginRight: '9px' }}
                                />
                                Video
                                {isVideoExportDisabled() && (
                                  <span style={{ fontSize: '9px', marginLeft: '4px' }}>(disabled)</span>
                                )}
                              </label>
                            </div>
                          )}
                  </div>
                  <div ref={qualityDropdownRef} style={{ position: 'relative' }}>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Quality</div>
                          <button
                            className="w-full px-2 py-1 bg-transparent rounded text-xs border flex items-center justify-between"
                            style={{
                              border: '1px solid #D1D5DB',
                              color: '#353839',
                              background: '#F9FAFB',
                              fontWeight: 500,
                              borderRadius: '4px',
                              fontSize: '11px',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              transition: 'color 0.2s, border 0.2s, background 0.2s',
                            }}
                            onClick={() => setQualityDropdownOpen(!qualityDropdownOpen)}
                            type="button"
                          >
                            {exportConfig.quality === 'high' ? 'High Quality' : 
                             exportConfig.quality === 'medium' ? 'Medium Quality' : 'Low Quality'}
                            <span style={{ 
                              marginLeft: '8px', 
                              display: 'flex', 
                              alignItems: 'center',
                              transform: qualityDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease-in-out'
                            }}>
                              <ChevronDown style={{ width: '12px', height: '12px' }} />
                            </span>
                          </button>
                          {qualityDropdownOpen && (
                            <div style={{ 
                              position: 'absolute', 
                              left: 0, 
                              top: '100%', 
                              zIndex: 50, 
                              minWidth: '100%', 
                              width: 'max-content', 
                              background: 'white', 
                              border: '1px solid #D1D5DB', 
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              marginTop: '2px'
                            }} className="rounded-lg p-2">
                              <label
                                className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                                style={{ background: 'transparent', color: '#181A1A', whiteSpace: 'nowrap' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, quality: 'high' }); 
                                  setQualityDropdownOpen(false); 
                                }}
                              >
                                <input
                                  type="radio"
                                  checked={exportConfig.quality === 'high'}
                                  readOnly
                                  style={{ marginRight: '9px' }}
                                />
                                High Quality
                              </label>
                              <label
                                className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                                style={{ background: 'transparent', color: '#181A1A', whiteSpace: 'nowrap' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, quality: 'medium' }); 
                                  setQualityDropdownOpen(false); 
                                }}
                              >
                                <input
                                  type="radio"
                                  checked={exportConfig.quality === 'medium'}
                                  readOnly
                                  style={{ marginRight: '9px' }}
                                />
                                Medium Quality
                              </label>
                              <label
                                className="flex items-center text-xs mb-1 rounded px-1 py-1 cursor-pointer transition-colors"
                                style={{ background: 'transparent', color: '#181A1A', whiteSpace: 'nowrap' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, quality: 'low' }); 
                                  setQualityDropdownOpen(false); 
                                }}
                              >
                                <input
                                  type="radio"
                                  checked={exportConfig.quality === 'low'}
                                  readOnly
                                  style={{ marginRight: '9px' }}
                                />
                                Low Quality
                              </label>
                            </div>
                          )}
                  </div>
                  
                  {/* Duration and Framerate controls for video exports */}
                  {(exportConfig.format === 'webm') && !isVideoExportDisabled() && (
                    <>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Duration (seconds)</div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={exportConfig.duration || 3}
                          onChange={(e) => setExportConfig({ ...exportConfig, duration: parseFloat(e.target.value) })}
                          style={{
                            width: '100%',
                            height: '4px',
                            borderRadius: '2px',
                            background: '#D1D5DB',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px', textAlign: 'center' }}>
                          {exportConfig.duration || 3}s
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                          Framerate (fps)
                          {isVideoExportDisabled() && (
                            <span style={{ color: '#F59E0B', marginLeft: '4px' }}>⚠️ Auto-locked</span>
                          )}
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="60"
                          step="5"
                          value={exportConfig.framerate || 30}
                          onChange={(e) => setExportConfig({ ...exportConfig, framerate: parseInt(e.target.value) })}
                          disabled={isVideoExportDisabled()}
                          style={{
                            width: '100%',
                            height: '4px',
                            borderRadius: '2px',
                            background: isVideoExportDisabled() ? '#E5E7EB' : '#D1D5DB',
                            outline: 'none',
                            cursor: isVideoExportDisabled() ? 'not-allowed' : 'pointer',
                            opacity: isVideoExportDisabled() ? 0.6 : 1,
                          }}
                        />
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px', textAlign: 'center' }}>
                          {exportConfig.framerate || 30} fps
                          {isVideoExportDisabled() && (
                            <span style={{ color: '#F59E0B', marginLeft: '4px' }}>
                              (optimized for pose data)
                            </span>
                          )}
                        </div>
                        {isVideoExportDisabled() && (
                          <div style={{ 
                            fontSize: '9px', 
                            color: '#F59E0B', 
                            marginTop: '4px', 
                            padding: '4px 8px',
                            background: '#FEF3C7',
                            borderRadius: '4px',
                            border: '1px solid #F59E0B'
                          }}>
                            Frame rate is auto-locked when using Muybridge effects
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Video Visibility Toggle */}
                  <div>
                    <button
                      onClick={() => setVideoVisibility(prev => ({ ...prev, showVideo: !prev.showVideo }))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: videoVisibility.showVideo ? '#F3F4F6' : '#F9FAFB',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = videoVisibility.showVideo ? '#E5E7EB' : '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = videoVisibility.showVideo ? '#F3F4F6' : '#F9FAFB';
                      }}
                    >
                      {videoVisibility.showVideo ? 'Hide Video in Export' : 'Show Video in Export'}
                    </button>
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
                        {selectedCategory === 'Stats' ? 'Stats Overlays' : `${selectedCategory} Effects`}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {getEffectsForCategory(selectedCategory).map((effect) => {
                          const isActive = isEffectActive(effect.id);
                          const isComingSoon = effect.description.includes('Coming Soon');
                          const isImplemented = ['muybridge', 'motion-trails', 'joint-angles', 'range-of-motion'].includes(effect.id);
                          return (
            <button
                              key={effect.id}
                              onClick={() => {
                                if (!isActive && isImplemented) {
                                  addEffect(effect);
                                  // Close the menu after successfully adding the effect
                                  setSelectedCategory(null);
                                }
                              }}
                              disabled={isActive || !isImplemented}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isActive ? '#e5f3ff' : 
                                          !isImplemented ? '#f9f9f9' : '#f5f6f7',
                                color: isActive ? '#0066cc' : 
                                      !isImplemented ? '#9CA3AF' : '#181A1A',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: isActive || !isImplemented ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !isImplemented ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive && isImplemented) {
                                  e.currentTarget.style.background = '#e5e7eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive && isImplemented) {
                                  e.currentTarget.style.background = '#f5f6f7';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <span>{effect.name}</span>
                                {!isImplemented && (
                                  <span style={{ fontSize: '10px', color: '#181A1A', fontWeight: 400 }}>Coming Soon</span>
                                )}
                              </div>
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
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '99px',
                  padding: '8px 8px',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '6px',
                  alignItems: 'center',
                  minHeight: '32px',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  paddingBottom: '8px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0) transparent',
                }}
              >
              {activeEffects.map((activeEffect) => (
                <div
                  key={activeEffect.id}
                  onClick={() => setConfigPopover(configPopover === activeEffect.id ? null : activeEffect.id)}
                  style={{
                    background: activeEffect.enabled ? '#55595b' : '#f5f6f7',
                    border: `1px solid ${activeEffect.enabled ? '#55595b' : '#d1d5db'}`,
                    borderRadius: '16px',
                    padding: '4px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: activeEffect.enabled ? '#f3f3f4' : '#6b7280',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    minWidth: 'fit-content',
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

              {/* Configuration Panels - Positioned outside scrolling container */}
              {configPopover && activeEffects.find(e => e.id === configPopover) && (
                <div style={{
                  position: 'absolute',
                  bottom: '60px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(255, 255, 255, 0.720)',
                  borderRadius: '6px',
                  padding: '12px',
                  width: '90%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(3px)',
                }}>
                  {(() => {
                    const activeEffect = activeEffects.find(e => e.id === configPopover);
                    if (!activeEffect) return null;
                    return renderConfigPopoverContent(activeEffect);
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
} 