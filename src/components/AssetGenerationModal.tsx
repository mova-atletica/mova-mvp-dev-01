"use client";
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Settings, Download, ChevronDown, ChevronUp } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import * as Accordion from '@radix-ui/react-accordion';
import * as Checkbox from '@radix-ui/react-checkbox';
import { renderMuybridge } from '../lib/effects/muybridge';

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
  // Creative Effects
  { id: "muybridge", name: "Muybridge", description: "Grid of key frames", icon: "🎬", preview: "Grid layout", category: "Creative" },
  { id: "motion-trails", name: "Motion Trails", description: "Ghost trail effect", icon: "🌊", preview: "Trailing animation", category: "Creative" },
  { id: "performance-heatmap", name: "Heatmap", description: "Intensity mapping", icon: "🔥", preview: "Color-coded overlay", category: "Creative" },
  { id: "vitruvian-composite", name: "Vitruvian", description: "Pose composition", icon: "🎭", preview: "Stacked poses", category: "Creative" },
  { id: "geometric-overlays", name: "Geometric", description: "Artistic overlays", icon: "✨", preview: "Geometric patterns", category: "Creative" },
  { id: "particle-systems", name: "Particles", description: "Motion particles", icon: "⭐", preview: "Dynamic particles", category: "Creative" },
  { id: "motion-blur", name: "Motion Blur", description: "Artistic blur", icon: "🎨", preview: "Blur overlay", category: "Creative" },
  // Visual Effects
  { id: "color-grading", name: "Color Grading", description: "Cinematic colors", icon: "🎨", preview: "Enhanced palette", category: "Visual" },
  { id: "lighting-effects", name: "Lighting", description: "Dynamic lighting", icon: "💡", preview: "Lighting overlay", category: "Visual" },
  { id: "filters", name: "Filters", description: "Artistic filters", icon: "🔮", preview: "Filter effects", category: "Visual" },
];

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
  const [exportConfig, setExportConfig] = useState<any>({ format: 'mp4', quality: 'high' });
  const [isExporting, setIsExporting] = useState(false);
  
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

  // Check if effect is already active
  const isEffectActive = (effectId: string) => {
    return activeEffects.some(active => active.effect.id === effectId);
  };

  // Add effect to the stack
  const addEffect = (effect: Effect) => {
    const newActiveEffect: ActiveEffect = {
      id: `${effect.id}-${Date.now()}`,
      effect,
      config: { intensity: 50, duration: 5, style: 'minimal' },
      enabled: true,
      order: activeEffects.length
    };
    setActiveEffects([...activeEffects, newActiveEffect]);
  };

  // Remove effect from the stack
  const removeEffect = (effectId: string) => {
    setActiveEffects(activeEffects.filter(e => e.id !== effectId));
    if (configPopover === effectId) {
      setConfigPopover(null);
    }
  };

  // Update effect configuration
  const updateEffectConfig = (effectId: string, config: any) => {
    setActiveEffects(activeEffects.map(e => 
      e.id === effectId ? { ...e, config: { ...e.config, ...config } } : e
    ));
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
    setIsExporting(true);
    // TODO: Implement actual export logic
    console.log('Exporting with config:', { activeEffects, statsConfig, exportConfig });
    setTimeout(() => {
      setIsExporting(false);
      onClose();
    }, 2000);
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
    function draw() {
      if (muybridgeEffect && video && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderMuybridge(
            ctx,
            video,
            poses,
            muybridgeEffect.config,
            video.currentTime
          );
        }
      } else if (canvas) {
        // Clear canvas if Muybridge not active
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in">
      <div className="bg-white rounded-2xl w-full h-full m-4 overflow-hidden flex flex-col shadow-2xl max-w-5xl mx-auto animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-onyx-10">Create Shareable Asset</h1>
            <p className="text-sm text-onyx-30 font-medium">{exerciseTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:scale-95 focus:ring-2 focus:ring-green-300 transition-all shadow-md">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export</span>
                </button>
              </Popover.Trigger>
              <Popover.Content 
                className="bg-white rounded-xl shadow-xl border p-4 w-64 z-50 animate-popover-in"
                side="bottom"
                align="end"
                sideOffset={8}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-onyx-10">Export Settings</h3>
                  <Popover.Close asChild>
                    <button className="text-onyx-30 hover:text-onyx-10">
                      <X className="w-4 h-4" />
                    </button>
                  </Popover.Close>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-onyx-10 mb-1">Format</label>
                    <Select.Root value={exportConfig.format} onValueChange={(value) => setExportConfig({ ...exportConfig, format: value })}>
                      <Select.Trigger className="w-full p-2 border border-gray-300 rounded-md text-sm flex items-center justify-between">
                        <Select.Value />
                        <Select.Icon>
                          <ChevronDown className="w-4 h-4" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50">
                          <Select.Viewport className="p-1">
                            <Select.Item value="mp4" className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded">
                              <Select.ItemText>MP4 Video</Select.ItemText>
                            </Select.Item>
                            <Select.Item value="webm" className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded">
                              <Select.ItemText>WebM Video</Select.ItemText>
                            </Select.Item>
                            <Select.Item value="gif" className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded">
                              <Select.ItemText>GIF Animation</Select.ItemText>
                            </Select.Item>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-onyx-10 mb-1">Quality</label>
                    <Select.Root value={exportConfig.quality} onValueChange={(value) => setExportConfig({ ...exportConfig, quality: value })}>
                      <Select.Trigger className="w-full p-2 border border-gray-300 rounded-md text-sm flex items-center justify-between">
                        <Select.Value />
                        <Select.Icon>
                          <ChevronDown className="w-4 h-4" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50">
                          <Select.Viewport className="p-1">
                            <Select.Item value="high" className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded">
                              <Select.ItemText>High Quality</Select.ItemText>
                            </Select.Item>
                            <Select.Item value="medium" className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded">
                              <Select.ItemText>Medium Quality</Select.ItemText>
                            </Select.Item>
                            <Select.Item value="low" className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded">
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export Asset'}
                  </button>
                </div>
              </Popover.Content>
            </Popover.Root>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition active:scale-95 focus:ring-2 focus:ring-onyx-20"
            >
              <X className="w-5 h-5 text-onyx-30" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-row flex-wrap overflow-hidden min-h-0">
          {/* Left: Video Preview */}
          <div className="flex-1 p-6 flex flex-col min-w-[300px] min-h-0" style={{ flexBasis: 0 }}>
            {/* Video Container */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
                  opacity: 0.8,
                  borderRadius: '0.75rem',
                }}
              />
              {/* Debug overlay for video/canvas sizes */}
              {process.env.NODE_ENV !== 'production' && (
                (() => {
                  const video = videoRef.current;
                  const canvas = canvasRef.current;
                  const vW = video?.videoWidth;
                  const vH = video?.videoHeight;
                  const vCW = video?.clientWidth;
                  const vCH = video?.clientHeight;
                  const cW = canvas?.width;
                  const cH = canvas?.height;
                  const cSW = canvas ? parseInt(canvas.style.width) : undefined;
                  const cSH = canvas ? parseInt(canvas.style.height) : undefined;
                  if (video && canvas) {
                    console.log('[DEBUG] video:', { videoWidth: vW, videoHeight: vH, clientWidth: vCW, clientHeight: vCH });
                    console.log('[DEBUG] canvas:', { width: cW, height: cH, styleWidth: cSW, styleHeight: cSH });
                  }
                  return (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, padding: 8, borderRadius: 6, zIndex: 20 }}>
                      <div>video: {vW}×{vH} px (attr), {vCW}×{vCH} px (client)</div>
                      <div>canvas: {cW}×{cH} px (attr), {cSW}×{cSH} px (style)</div>
                    </div>
                  );
                })()
              )}
              
              {/* Stats Overlay */}
              {statsConfig.rom && (
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-3 text-sm shadow-lg animate-fade-in">
                  <div>ROM: Knee 120°</div>
                  <div>Hip 90°</div>
                </div>
              )}
            </div>

            {/* Active Effects Chips */}
            <div className="mt-4 flex flex-wrap gap-2 min-h-[40px]">
              {activeEffects.map((activeEffect) => (
                <Popover.Root key={activeEffect.id} open={configPopover === activeEffect.id} onOpenChange={(open) => setConfigPopover(open ? activeEffect.id : null)}>
                  <Popover.Trigger asChild>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all cursor-pointer text-sm shadow-sm animate-chip-in hover:shadow-md active:scale-95 ${
                        activeEffect.enabled
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                    >
                      <span className="text-lg">{activeEffect.effect.icon}</span>
                      <span className="font-medium">{activeEffect.effect.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEffect(activeEffect.id);
                        }}
                        className="ml-1 text-sm opacity-70 hover:opacity-100 transition-colors"
                      >
                        {activeEffect.enabled ? '●' : '○'}
                      </button>
                    </div>
                  </Popover.Trigger>
                  {renderConfigPopoverContent(activeEffect)}
                </Popover.Root>
              ))}
              
              {activeEffects.length === 0 && (
                <div className="text-sm text-onyx-30 py-2 animate-fade-in">
                  Click on effects from the panel to add them →
                </div>
              )}
            </div>
          </div>

          {/* Right: Accordion Panel */}
          <div className="w-full sm:w-96 max-w-[400px] min-w-[260px] p-6 border-l border-gray-200 flex flex-col bg-white/80 shadow-lg rounded-none md:rounded-r-2xl transition-all h-full max-h-[calc(100vh-64px)]" style={{ flexBasis: '320px' }}>
            <div className="space-y-4 overflow-y-auto h-full">

              <Accordion.Root type="multiple" defaultValue={["effects"]} className="space-y-4">
                {/* 1. Choose Effects Accordion */}
                <Accordion.Item value="effects" className="border rounded-xl overflow-hidden">
                  <Accordion.Trigger className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-50 transition-all font-semibold text-onyx-10 group focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <span>Choose Effects</span>
                    <ChevronDown className="w-4 h-4 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                  <Accordion.Content className="p-4 pt-0 border-t data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="space-y-4">
                      {['Creative', 'Visual'].map(category => (
                        <div key={category}>
                          <h4 className="text-sm font-medium text-onyx-30 mb-2 uppercase tracking-wide">{category}</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {availableEffects
                              .filter(effect => effect.category === category)
                              .map(effect => {
                                const isActive = isEffectActive(effect.id);
                                return (
                                  <button
                                    key={effect.id}
                                    onClick={() => isActive ? null : addEffect(effect)}
                                    disabled={isActive}
                                    className={`flex items-center gap-3 p-3 border rounded-lg transition-all text-left shadow-sm hover:shadow-md active:scale-95 font-medium ${
                                      isActive 
                                        ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-not-allowed animate-added-label' 
                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                    }`}
                                  >
                                    <span className="text-lg">{effect.icon}</span>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{effect.name}</div>
                                      <div className="text-xs text-onyx-30">{effect.description}</div>
                                    </div>
                                    {isActive && (
                                      <span className="text-xs font-bold text-blue-700 animate-added-label">Added</span>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Accordion.Content>
                </Accordion.Item>

                {/* 2. Add Stats Accordion */}
                <Accordion.Item value="stats" className="border rounded-xl overflow-hidden">
                  <Accordion.Trigger className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-50 transition-all font-semibold text-onyx-10 group focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <span>Add Stats</span>
                    <ChevronDown className="w-4 h-4 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                  <Accordion.Content className="p-4 pt-0 border-t data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox.Root
                          checked={statsConfig.rom}
                          onCheckedChange={(checked) => setStatsConfig({ ...statsConfig, rom: checked })}
                          className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <Checkbox.Indicator>
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        <span className="text-sm text-onyx-10">Range of Motion</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox.Root
                          checked={statsConfig.live}
                          onCheckedChange={(checked) => setStatsConfig({ ...statsConfig, live: checked })}
                          className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <Checkbox.Indicator>
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        <span className="text-sm text-onyx-10">Live Metrics</span>
                      </div>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion.Root>

            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
} 