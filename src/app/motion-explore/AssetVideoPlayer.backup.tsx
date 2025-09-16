"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Download, ChevronDown, Settings } from 'lucide-react';
import { renderMuybridge } from '../../lib/effects/muybridge';
import { renderMotionTrails } from '../../lib/effects/motion-trails';
import { renderStats } from '../../lib/effects/stats';
import { exportAsset, downloadBlob, ExportConfig } from '../../lib/exportService';

interface AssetVideoPlayerProps {
  videoUrl: string;
  poses: any[];
  exerciseTitle?: string; // Add optional exercise title
  exercise?: any; // Add optional exercise object
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
  // Add missing Branding effect
  { 
    id: "exercise-details", 
    name: "Branding", 
    description: "Exercise title and branding overlay", 
    preview: "Branding overlay", 
    category: "Stats",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: 'normal',
      renderOrder: 'after'
    }
  }
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

export default function AssetVideoPlayer({ videoUrl, poses, exerciseTitle, exercise }: AssetVideoPlayerProps) {
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  
  // Debug: Log activeEffects changes
  useEffect(() => {
    console.log('AssetVideoPlayer activeEffects changed:', activeEffects.length, 'effects active');
    activeEffects.forEach(effect => {
      console.log(`- ${effect.effect.name}: ${effect.enabled ? 'ENABLED' : 'DISABLED'}`);
    });
  }, [activeEffects]);
  
  // Debug: Log poses data
  useEffect(() => {
    console.log('AssetVideoPlayer poses:', poses?.length || 0, 'poses received');
    if (poses && poses.length > 0) {
      console.log('First pose sample:', poses[0]);
    }
  }, [poses]);
  
  
  const [configPopover, setConfigPopover] = useState<string | null>(null);
  const [statsConfig, setStatsConfig] = useState<any>({ rom: true, live: true });
  // Use ExportConfig type from exportService for consistency
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 'high',
    duration: 3,
    framerate: 30,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EffectType | 'export' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoVisibility, setVideoVisibility] = useState({
    showVideo: true,
    opacity: 1.0,
    blendMode: 'source-over' as GlobalCompositeOperation
  });
  
  // Custom dropdown states
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const qualityDropdownRef = useRef<HTMLDivElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
          import('../../lib/effects/muybridge'),
          import('../../lib/effects/motion-trails'),
          import('../../lib/effects/stats')
        ]);
        
        effectModulesRef.current = {
          renderMuybridge: muybridgeModule.renderMuybridge,
          renderMuybridgeFromCanvas: muybridgeModule.renderMuybridgeFromCanvas,
          renderMotionTrails: motionTrailsModule.renderMotionTrails,
          renderStats: statsModule.renderStats,
        };
      } catch (error) {
        console.error('Failed to load effect modules:', error);
      }
    };

    loadEffectModules();
  }, []);


  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const addEffect = (effect: Effect) => {
    const newActiveEffect: ActiveEffect = {
      id: effect.id,
      effect,
      config: getDefaultConfigForEffect(effect),
      enabled: true,
      order: activeEffects.length
    };
    setActiveEffects(prev => [...prev, newActiveEffect]);
  };

  const getDefaultConfigForEffect = (effect: Effect) => {
    switch (effect.id) {
      case 'muybridge':
        return {
          gridSize: 3,
          gridRows: 3,
          gridCols: 3,
          padding: 8,
          frameStagger: 0.5,
          showBorders: true,
          borderColor: '#666666',
          borderWidth: 2
        };
      case 'motion-trails':
        return {
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
      case 'joint-angles':
        return {
          showJointAngles: true,
          enabledJoints: ['left_knee', 'right_knee', 'left_hip', 'right_hip'],
          angleColor: '#00ff00',
          angleSize: 18,
          showROM: false,
          romJoints: [],
          showGlobalStats: false,
          safeZoneEnabled: true
        };
      case 'range-of-motion':
        return {
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
      // Add missing exercise-details config
      case 'exercise-details':
        return {
          showJointAngles: false,
          enabledJoints: [],
          showROM: false,
          romJoints: [],
          showGlobalStats: true,
          exerciseTitle: exercise?.title || exerciseTitle || 'My Motion',
          muscleGroups: [], // Remove muscle groups
          showLogo: true,
          logoPosition: 'bottom_right',
          safeZoneEnabled: true,
          textColor: '#ffffff',
          backgroundColor: '#000000',
          backgroundOpacity: 0.8,
          fontSize: 48 // Match AssetGenerationModal fontSize
        };
      default:
        return {};
    }
  };

  const removeEffect = (effectId: string) => {
    setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
  };

  const isEffectActive = (effectId: string) => {
    return activeEffects.some(effect => effect.id === effectId);
  };

  const getEffectsForCategory = (category: EffectType) => {
    return availableEffects.filter(effect => effect.category === category);
  };

  const hasProblematicCombination = () => {
    const hasMuybridge = activeEffects.some(e => e.id === 'muybridge');
    // Disable video export if Muybridge is active (it replaces video with grid of frames)
    return hasMuybridge;
  };

  const handleExport = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error('No video available for export');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const result = await exportAsset(video, poses, activeEffects, {
        ...exportConfig,
        videoVisibility
      });
      
      if (result.success && result.data instanceof Blob && result.filename) {
        downloadBlob(result.data, result.filename);
        
        // Show success feedback
        setExportSuccess(true);
        setIsExporting(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setExportSuccess(false), 3000);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
    }
  };

  // Canvas rendering effect - exact same as AssetGenerationModal
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

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
          
          // Render video background FIRST if no effect disables it and Muybridge is not active
          if (!hasVideoReplacement && !hasMuybridgeEffect) {
            // Apply video visibility settings
            if (videoVisibility.showVideo) {
              ctx.globalAlpha = videoVisibility.opacity;
              ctx.globalCompositeOperation = videoVisibility.blendMode;
              // Draw video scaled to fit the canvas (which now matches display size)
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.globalCompositeOperation = 'source-over';
              ctx.globalAlpha = 1.0;
            }
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
                
                // Then apply stats effects last (foreground effects)
                for (const effect of activeEffects) {
                  if (!effect.enabled || effect.effect.id === 'muybridge') continue;
                  
                  switch (effect.effect.id) {
                    case 'joint-angles':
                    case 'range-of-motion':
                      // Only render joint angles and ROM in individual tiles
                      if (effectModulesRef.current.renderStats && framePoses && framePoses.length > 0) {
                        effectModulesRef.current.renderStats(frameCtx, frameVideo, framePoses, effect.config, frameTime);
                      }
                      break;
                    case 'exercise-details':
                      // Skip exercise-details - will be rendered once over entire canvas
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
                    // No transformation needed - canvas is now at video natural size
                    console.log('Rendering motion trails effect');
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
                case 'exercise-details':
                  if (effectModulesRef.current.renderStats && poses && poses.length > 0) {
                    // No transformation needed - canvas is now at video natural size
                    console.log(`Rendering stats effect: ${effect.effect.name}`, {
                      posesLength: poses.length,
                      config: effect.config,
                      currentTime,
                      canvasSize: { width: canvas.width, height: canvas.height },
                      hasRenderStats: !!effectModulesRef.current.renderStats
                    });
                    try {
                      // Debug: Log what we're passing to the effect (reduced logging)
                      console.log(`Calling renderStats for ${effect.effect.name} - currentTime: ${currentTime.toFixed(2)}`);
                      
                      // Save canvas state before rendering effect
                      ctx.save();
                      effectModulesRef.current.renderStats(ctx, video, poses, effect.config, currentTime);
                      // Restore canvas state after rendering effect
                      ctx.restore();
                      console.log(`Successfully called renderStats for ${effect.effect.name}`);
                    } catch (error) {
                      console.error(`Error rendering ${effect.effect.name}:`, error);
                    }
                  } else {
                    console.log(`Skipping ${effect.effect.name} - renderStats: ${!!effectModulesRef.current.renderStats}, poses: ${poses?.length || 0}`);
                  }
                  break;
                default:
                  // Skip non-stats effects
                  break;
              }
            }
          }
          
          // Debug: Draw a test rectangle at the end to see if effects are on top
          ctx.fillStyle = 'blue';
          ctx.fillRect(canvas.width - 60, 10, 50, 50);
          
          // Debug: Draw a test circle to see if effects are being rendered
          ctx.fillStyle = 'green';
          ctx.beginPath();
          ctx.arc(50, 50, 25, 0, 2 * Math.PI);
          ctx.fill();
          
          // Debug: Draw a test line to see if effects are being rendered
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(100, 100);
          ctx.lineTo(200, 200);
          ctx.stroke();
          
          // Debug: Log key info only
          console.log('Video currentTime:', currentTime.toFixed(2), 'paused:', video.paused);
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

  // Handle click outside dropdowns to close them
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

  // Sync canvas size to video rendered size - match AssetGenerationModal approach
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function syncCanvasSize() {
      if (!video || !canvas) return;
      // Set canvas pixel size to video natural size - same as AssetGenerationModal
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
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">

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
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
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

            {/* Effect Configuration Pills Overlay - Bottom of Video */}
            {activeEffects.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '99px',
                padding: '8px 8px',
                zIndex: 10,
                backdropFilter: 'blur(1px)',
              }}>
                <div 
                  className="effect-pills-container"
                  style={{
                    display: 'flex',
                    gap: '6px',
                    justifyContent: 'left',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '0px',
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
                          removeEffect(activeEffect.effect.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '10px',
                          color: 'inherit',
                          opacity: 0.7,
                          marginLeft: '4px',
                          padding: '2px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                onClick={() => {
                  setSelectedCategory(selectedCategory === 'export' ? null : 'export');
                  setConfigPopover(null); // Close any open config popover
                }}
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
                  onClick={() => {
                    setSelectedCategory(selectedCategory === category ? null : category);
                    setConfigPopover(null); // Close any open config popover
                  }}
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
                <div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                          Format
                          {hasProblematicCombination() && (
                            <span style={{ color: '#F59E0B', marginLeft: '4px' }}>⚠️ Video disabled when Muybridge effect is active</span>
                          )}
                        </div>
                        <div ref={formatDropdownRef} style={{ position: 'relative', width: '100%' }}>
                          <button
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#374151',
                              background: '#F9FAFB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'color 0.2s, border 0.2s, background 0.2s',
                            }}
                            onClick={() => setFormatDropdownOpen((open) => !open)}
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
                              zIndex: 20, 
                              width: '100%', 
                              background: 'white', 
                              border: '1px solid #D1D5DB', 
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              marginTop: '2px'
                            }}>
                              <div
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: '#374151',
                                  borderRadius: '4px',
                                  borderBottom: '1px solid #F3F4F6'
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = '#F9FAFB')}
                                onMouseOut={e => (e.currentTarget.style.background = 'white')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, format: 'png' }); 
                                  setFormatDropdownOpen(false); 
                                }}
                              >
                                PNG Image
                              </div>
                              <div
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  cursor: hasProblematicCombination() ? 'not-allowed' : 'pointer',
                                  color: hasProblematicCombination() ? '#9CA3AF' : '#374151',
                                  opacity: hasProblematicCombination() ? 0.5 : 1,
                                  borderRadius: '4px',
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = hasProblematicCombination() ? 'white' : '#F9FAFB')}
                                onMouseOut={e => (e.currentTarget.style.background = 'white')}
                                onClick={() => { 
                                  if (!hasProblematicCombination()) {
                                    setExportConfig({ ...exportConfig, format: 'webm' }); 
                                    setFormatDropdownOpen(false); 
                                  }
                                }}
                              >
                                Video
                                {hasProblematicCombination() && (
                                  <span style={{ fontSize: '9px', marginLeft: '4px' }}>(disabled)</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                          Quality
                        </div>
                        <div ref={qualityDropdownRef} style={{ position: 'relative', width: '100%' }}>
                          <button
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#374151',
                              background: '#F9FAFB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'color 0.2s, border 0.2s, background 0.2s',
                            }}
                            onClick={() => setQualityDropdownOpen((open) => !open)}
                            type="button"
                          >
                            {exportConfig.quality === 'low' ? 'Low' : exportConfig.quality === 'medium' ? 'Medium' : 'High'}
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
                              zIndex: 20, 
                              width: '100%', 
                              background: 'white', 
                              border: '1px solid #D1D5DB', 
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              marginTop: '2px'
                            }}>
                              <div
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: '#374151',
                                  borderRadius: '4px',
                                  borderBottom: '1px solid #F3F4F6'
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = '#F9FAFB')}
                                onMouseOut={e => (e.currentTarget.style.background = 'white')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, quality: 'low' }); 
                                  setQualityDropdownOpen(false); 
                                }}
                              >
                                Low
                              </div>
                              <div
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: '#374151',
                                  borderRadius: '4px',
                                  borderBottom: '1px solid #F3F4F6'
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = '#F9FAFB')}
                                onMouseOut={e => (e.currentTarget.style.background = 'white')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, quality: 'medium' }); 
                                  setQualityDropdownOpen(false); 
                                }}
                              >
                                Medium
                              </div>
                              <div
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: '#374151',
                                  borderRadius: '4px',
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = '#F9FAFB')}
                                onMouseOut={e => (e.currentTarget.style.background = 'white')}
                                onClick={() => { 
                                  setExportConfig({ ...exportConfig, quality: 'high' }); 
                                  setQualityDropdownOpen(false); 
                                }}
                              >
                                High
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Duration and Framerate controls for video exports */}
                      {(exportConfig.format === 'webm') && !hasProblematicCombination() && (
                        <>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Duration (seconds)</div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={exportConfig.duration || 3}
                              onChange={(e) => setExportConfig({ ...exportConfig, duration: parseInt(e.target.value) })}
                              disabled={hasProblematicCombination()}
                              style={{
                                width: '100%',
                                height: '4px',
                                borderRadius: '2px',
                                background: hasProblematicCombination() ? '#E5E7EB' : '#D1D5DB',
                                outline: 'none',
                                cursor: hasProblematicCombination() ? 'not-allowed' : 'pointer',
                                opacity: hasProblematicCombination() ? 0.6 : 1,
                              }}
                            />
                            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px', textAlign: 'center' }}>
                              {exportConfig.duration || 3}s
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Framerate (fps)</div>
                            <input
                              type="range"
                              min="15"
                              max="60"
                              step="5"
                              value={exportConfig.framerate || 30}
                              onChange={(e) => setExportConfig({ ...exportConfig, framerate: parseInt(e.target.value) })}
                              disabled={hasProblematicCombination()}
                              style={{
                                width: '100%',
                                height: '4px',
                                borderRadius: '2px',
                                background: hasProblematicCombination() ? '#E5E7EB' : '#D1D5DB',
                                outline: 'none',
                                cursor: hasProblematicCombination() ? 'not-allowed' : 'pointer',
                                opacity: hasProblematicCombination() ? 0.6 : 1,
                              }}
                            />
                            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px', textAlign: 'center' }}>
                              {exportConfig.framerate || 30} fps
                              {hasProblematicCombination() && (
                                <span style={{ color: '#F59E0B', marginLeft: '4px' }}>
                                  (disabled - Muybridge active)
                                </span>
                              )}
                            </div>
                            {hasProblematicCombination() && (
                              <div style={{ 
                                fontSize: '9px', 
                                color: '#F59E0B', 
                                marginTop: '4px', 
                                padding: '4px 8px',
                                background: '#FEF3C7',
                                borderRadius: '4px',
                                border: '1px solid #F59E0B'
                              }}>
                                Video export is disabled when Muybridge effect is active (it replaces video with a grid of frames)
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
                          background: isExporting ? '#9CA3AF' : '#F97316',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: isExporting ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {isExporting ? (
                          <>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }} />
                            Exporting...
                          </>
                        ) : exportSuccess ? (
                          '✓ Exported!'
                        ) : (
                          <>
                            <Download style={{ width: '12px', height: '12px' }} />
                            Export Asset
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  // Effect Category Menu
                  <>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#181A1A', marginBottom: '8px' }}>
                      {selectedCategory === 'Stats' ? 'Stats Overlays' : `${selectedCategory} Effects`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getEffectsForCategory(selectedCategory).map((effect) => (
                        <button
                          key={effect.id}
                          onClick={() => {
                            if (isEffectActive(effect.id)) {
                              removeEffect(effect.id);
                            } else {
                              addEffect(effect);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: isEffectActive(effect.id) ? '#F97316' : '#f5f6f7',
                            color: isEffectActive(effect.id) ? 'white' : '#55595B',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => {
                            if (!isEffectActive(effect.id)) {
                              e.currentTarget.style.background = '#e5e7eb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isEffectActive(effect.id)) {
                              e.currentTarget.style.background = '#f5f6f7';
                            }
                          }}
                        >
                          <span>{effect.name}</span>
                          {isEffectActive(effect.id) && (
                            <div style={{
                              width: '16px',
                              height: '16px',
                              background: 'rgba(255, 255, 255, 0.2)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                            }}>
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}



            {/* Individual Effect Configuration Popover */}
            {configPopover && activeEffects.find(e => e.id === configPopover) && (
              <div style={{
                position: 'absolute',
                bottom: '60px',
                left: '10px',
                right: '10px',
                background: 'rgba(255, 255, 255, 0.720)',
                borderRadius: '6px',
                padding: '12px',
                minWidth: '250px',
                maxWidth: '400px',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(3px)',
              }}>
                {(() => {
                  const activeEffect = activeEffects.find(e => e.id === configPopover);
                  if (!activeEffect) return null;
                  
                  return (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#181A1A', marginBottom: '8px' }}>
                        {activeEffect.effect.name} Settings
                      </div>
                      
                      {/* Effect-specific configuration */}
                      {activeEffect.effect.id === 'muybridge' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Grid Size */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Grid Size
                            </label>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                min="2"
                                max="6"
                                step="1"
                                value={activeEffect.config.gridSize || 3}
                                onChange={(e) => {
                                  const gridSize = parseInt(e.target.value);
                                  const newConfig = { 
                                    ...activeEffect.config, 
                                    gridSize: gridSize,
                                    gridRows: gridSize,
                                    gridCols: gridSize
                                  };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ 
                                  width: '40px', 
                                  padding: '4px 6px', 
                                  fontSize: '10px', 
                                  border: '1px solid #d1d5db', 
                                  borderRadius: '4px',
                                  color: '#181A1A'
                                }}
                              />
                              <span style={{ fontSize: '10px', color: '#181A1A' }}>
                                {activeEffect.config.gridSize || 3}x{activeEffect.config.gridSize || 3}
                              </span>
                            </div>
                          </div>

                          {/* Frame Timing */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Frame Timing
                            </label>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="range"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={activeEffect.config.frameStagger || 0.5}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, frameStagger: parseFloat(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '30px', color: '#181A1A' }}>
                                {activeEffect.config.frameStagger || 0.5}s
                              </span>
                            </div>
                          </div>

                          {/* Styling */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Styling
                            </label>
                            
                            {/* Borders Checkbox */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <input
                                type="checkbox"
                                checked={activeEffect.config.showBorders !== false}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, showBorders: e.target.checked };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '16px', height: '16px' }}
                              />
                              <span style={{ fontSize: '10px', color: '#181A1A' }}>Borders</span>
                            </div>

                            {/* Padding */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '10px', width: '50px', color: '#181A1A' }}>Padding</span>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                value={activeEffect.config.padding || 8}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, padding: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '30px', color: '#181A1A' }}>
                                {activeEffect.config.padding || 8}px
                              </span>
                            </div>

                            {/* Border Width */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '10px', width: '50px', color: '#181A1A' }}>Border</span>
                              <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={activeEffect.config.borderWidth || 2}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, borderWidth: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '30px', color: '#181A1A' }}>
                                {activeEffect.config.borderWidth || 2}px
                              </span>
                            </div>

                            {/* Color */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', width: '50px', color: '#181A1A' }}>Color</span>
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: activeEffect.config.borderColor || '#666666',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  const colorInput = document.createElement('input');
                                  colorInput.type = 'color';
                                  colorInput.value = activeEffect.config.borderColor || '#666666';
                                  colorInput.onchange = (e) => {
                                    const newConfig = { ...activeEffect.config, borderColor: (e.target as HTMLInputElement).value };
                                    const updatedEffects = activeEffects.map(effect => 
                                      effect.effect.id === activeEffect.effect.id 
                                        ? { ...effect, config: newConfig }
                                        : effect
                                    );
                                    setActiveEffects(updatedEffects);
                                  };
                                  colorInput.click();
                                }}
                              />
                              <input
                                type="text"
                                value={activeEffect.config.borderColor || '#666666'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, borderColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ 
                                  flex: 1, 
                                  padding: '4px 6px', 
                                  fontSize: '10px', 
                                  border: '1px solid #d1d5db', 
                                  borderRadius: '4px', 
                                  fontFamily: 'monospace', 
                                  color: '#181A1A' 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeEffect.effect.id === 'motion-trails' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Trail Properties */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Trail Properties
                            </label>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Length</span>
                              <input
                                type="range"
                                min="5"
                                max="30"
                                step="1"
                                value={activeEffect.config.trailLength || 10}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, trailLength: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#9CA3AF' }}>
                                {activeEffect.config.trailLength || 10}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Opacity</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={(activeEffect.config.trailOpacity || 0.6) * 100}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, trailOpacity: parseInt(e.target.value) / 100 };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#181A1A' }}>
                                {Math.round((activeEffect.config.trailOpacity || 0.6) * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Style Settings */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Style
                            </label>
                            
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                              <select
                                value={activeEffect.config.trailStyle || 'simple'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, trailStyle: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, padding: '4px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', color: '#181A1A' }}
                              >
                                <option value="simple">Simple</option>
                                <option value="gradient">Gradient</option>
                              </select>
                              <input
                                type="color"
                                value={activeEffect.config.color || '#181A1A'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, color: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '24px', height: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Thickness</span>
                              <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={activeEffect.config.thickness || 2}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, thickness: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#181A1A' }}>
                                {activeEffect.config.thickness || 2}px
                              </span>
                            </div>
                          </div>

                          {/* Options */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Options
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="checkbox"
                                  checked={activeEffect.config.fadeOut !== false}
                                  onChange={(e) => {
                                    const newConfig = { ...activeEffect.config, fadeOut: e.target.checked };
                                    const updatedEffects = activeEffects.map(effect => 
                                      effect.effect.id === activeEffect.effect.id 
                                        ? { ...effect, config: newConfig }
                                        : effect
                                    );
                                    setActiveEffects(updatedEffects);
                                  }}
                                  style={{ width: '12px', height: '12px' }}
                                />
                                <span style={{ fontSize: '10px', color: '#181A1A' }}>Fade out</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="checkbox"
                                  checked={activeEffect.config.showBones === true}
                                  onChange={(e) => {
                                    const newConfig = { ...activeEffect.config, showBones: e.target.checked };
                                    const updatedEffects = activeEffects.map(effect => 
                                      effect.effect.id === activeEffect.effect.id 
                                        ? { ...effect, config: newConfig }
                                        : effect
                                    );
                                    setActiveEffects(updatedEffects);
                                  }}
                                  style={{ width: '12px', height: '12px' }}
                                />
                                <span style={{ fontSize: '10px', color: '#181A1A' }}>Show bones</span>
                              </label>
                            </div>
                          </div>

                          {/* Bone Settings - Only show when bones enabled */}
                          {activeEffect.config.showBones && (
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                                Bone Settings
                              </label>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Color</span>
                                <input
                                  type="color"
                                  value={activeEffect.config.boneColor || '#181A1A'}
                                  onChange={(e) => {
                                    const newConfig = { ...activeEffect.config, boneColor: e.target.value };
                                    const updatedEffects = activeEffects.map(effect => 
                                      effect.effect.id === activeEffect.effect.id 
                                        ? { ...effect, config: newConfig }
                                        : effect
                                    );
                                    setActiveEffects(updatedEffects);
                                  }}
                                  style={{ width: '24px', height: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                />
                                <input
                                  type="text"
                                  value={activeEffect.config.boneColor || '#ff0000'}
                                  onChange={(e) => {
                                    const newConfig = { ...activeEffect.config, boneColor: e.target.value };
                                    const updatedEffects = activeEffects.map(effect => 
                                      effect.effect.id === activeEffect.effect.id 
                                        ? { ...effect, config: newConfig }
                                        : effect
                                    );
                                    setActiveEffects(updatedEffects);
                                  }}
                                  style={{ flex: 1, padding: '4px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace', color: '#181A1A' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Joint Angles Configuration */}
                      {activeEffect.effect.id === 'joint-angles' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Joint Selection */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Joint Selection
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {[
                                { key: 'left_knee', label: 'Left Knee' },
                                { key: 'right_knee', label: 'Right Knee' },
                                { key: 'left_hip', label: 'Left Hip' },
                                { key: 'right_hip', label: 'Right Hip' },
                                { key: 'left_elbow', label: 'Left Elbow' },
                                { key: 'right_elbow', label: 'Right Elbow' }
                              ].map(joint => (
                                <label key={joint.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="checkbox"
                                    checked={(activeEffect.config.enabledJoints || []).includes(joint.key)}
                                    onChange={(e) => {
                                      const currentJoints = activeEffect.config.enabledJoints || [];
                                      const newJoints = e.target.checked 
                                        ? [...currentJoints, joint.key]
                                        : currentJoints.filter((j: string) => j !== joint.key);
                                      const newConfig = { ...activeEffect.config, enabledJoints: newJoints };
                                      const updatedEffects = activeEffects.map(effect => 
                                        effect.effect.id === activeEffect.effect.id 
                                          ? { ...effect, config: newConfig }
                                          : effect
                                      );
                                      setActiveEffects(updatedEffects);
                                    }}
                                    style={{ width: '12px', height: '12px' }}
                                  />
                                  <span style={{ fontSize: '10px', color: '#181A1A' }}>{joint.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Appearance */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Appearance
                            </label>
                            
                            {/* Color and Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Color</span>
                              <input
                                type="color"
                                value={activeEffect.config.angleColor || '#00ff00'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, angleColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '24px', height: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              />
                              <input
                                type="text"
                                value={activeEffect.config.angleColor || '#00ff00'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, angleColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, padding: '4px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace', color: '#181A1A' }}
                              />
                            </div>

                            {/* Text Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Size</span>
                              <input
                                type="range"
                                min="8"
                                max="32"
                                step="1"
                                value={activeEffect.config.angleSize || 18}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, angleSize: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#181A1A' }}>
                                {activeEffect.config.angleSize || 18}px
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Range of Motion Configuration */}
                      {activeEffect.effect.id === 'range-of-motion' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Joint Selection */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Joint Selection
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {[
                                { key: 'left_knee', label: 'Left Knee' },
                                { key: 'right_knee', label: 'Right Knee' },
                                { key: 'left_hip', label: 'Left Hip' },
                                { key: 'right_hip', label: 'Right Hip' },
                                { key: 'left_elbow', label: 'Left Elbow' },
                                { key: 'right_elbow', label: 'Right Elbow' }
                              ].map(joint => (
                                <label key={joint.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="checkbox"
                                    checked={(activeEffect.config.romJoints || []).includes(joint.key)}
                                    onChange={(e) => {
                                      const currentJoints = activeEffect.config.romJoints || [];
                                      const newJoints = e.target.checked 
                                        ? [...currentJoints, joint.key]
                                        : currentJoints.filter((j: string) => j !== joint.key);
                                      const newConfig = { ...activeEffect.config, romJoints: newJoints };
                                      const updatedEffects = activeEffects.map(effect => 
                                        effect.effect.id === activeEffect.effect.id 
                                          ? { ...effect, config: newConfig }
                                          : effect
                                      );
                                      setActiveEffects(updatedEffects);
                                    }}
                                    style={{ width: '12px', height: '12px' }}
                                  />
                                  <span style={{ fontSize: '10px', color: '#181A1A' }}>{joint.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Appearance */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Appearance
                            </label>
                            
                            {/* Color and Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Color</span>
                              <input
                                type="color"
                                value={activeEffect.config.romColor || '#00ff00'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, romColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '24px', height: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              />
                              <input
                                type="text"
                                value={activeEffect.config.romColor || '#00ff00'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, romColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, padding: '4px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace', color: '#181A1A' }}
                              />
                            </div>

                            {/* Text Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Size</span>
                              <input
                                type="range"
                                min="8"
                                max="32"
                                step="1"
                                value={activeEffect.config.angleSize || 16}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, angleSize: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#181A1A' }}>
                                {activeEffect.config.angleSize || 16}px
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Branding Configuration */}
                      {activeEffect.effect.id === 'exercise-details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Text Styling */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Text Styling
                            </label>
                            
                            {/* Text Color */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Text Color</span>
                              <input
                                type="color"
                                value={activeEffect.config.textColor || '#ffffff'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, textColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '24px', height: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              />
                              <input
                                type="text"
                                value={activeEffect.config.textColor || '#ffffff'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, textColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, padding: '4px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace', color: '#181A1A' }}
                              />
                            </div>

                            {/* Background Color */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Bg</span>
                              <input
                                type="color"
                                value={activeEffect.config.backgroundColor || '#000000'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, backgroundColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '24px', height: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              />
                              <input
                                type="text"
                                value={activeEffect.config.backgroundColor || '#000000'}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, backgroundColor: e.target.value };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, padding: '4px 6px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace', color: '#181A1A' }}
                              />
                            </div>

                            {/* Background Opacity */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Opacity</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={(activeEffect.config.backgroundOpacity || 0.8) * 100}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, backgroundOpacity: parseInt(e.target.value) / 100 };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#181A1A' }}>
                                {Math.round((activeEffect.config.backgroundOpacity || 0.8) * 100)}%
                              </span>
                            </div>

                            {/* Text Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', width: '40px', color: '#181A1A' }}>Size</span>
                              <input
                                type="range"
                                min="16"
                                max="48"
                                step="1"
                                value={activeEffect.config.fontSize || 24}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, fontSize: parseInt(e.target.value) };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ flex: 1, height: '4px' }}
                              />
                              <span style={{ fontSize: '10px', width: '20px', color: '#181A1A' }}>
                                {activeEffect.config.fontSize || 24}px
                              </span>
                            </div>
                          </div>

                          {/* Logo Settings */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Branding
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <label style={{ fontSize: '10px', color: '#181A1A' }}>Show Logo</label>
                              <input
                                type="checkbox"
                                checked={activeEffect.config.showLogo !== false}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, showLogo: e.target.checked };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '16px', height: '16px' }}
                              />
                            </div>
                            <div style={{ fontSize: '10px', marginTop: '4px', color: '#6B7280' }}>
                              Logo will be positioned in the bottom right corner
                            </div>
                          </div>

                          {/* Safe Zone Settings */}
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#181A1A', display: 'block', marginBottom: '6px' }}>
                              Layout
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <label style={{ fontSize: '10px', color: '#181A1A' }}>Instagram Safe Zones</label>
                              <input
                                type="checkbox"
                                checked={activeEffect.config.safeZoneEnabled !== false}
                                onChange={(e) => {
                                  const newConfig = { ...activeEffect.config, safeZoneEnabled: e.target.checked };
                                  const updatedEffects = activeEffects.map(effect => 
                                    effect.effect.id === activeEffect.effect.id 
                                      ? { ...effect, config: newConfig }
                                      : effect
                                  );
                                  setActiveEffects(updatedEffects);
                                }}
                                style={{ width: '16px', height: '16px' }}
                              />
                            </div>
                            <div style={{ fontSize: '10px', marginTop: '4px', color: '#6B7280' }}>
                              Positions text and logo within Instagram Stories safe areas
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
