"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import VideoPlayer, { VideoPlayerHandle } from './VideoPlayer';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

interface SideBySideVideoPlayerProps {
  userVideoUrl: string | null;
  referenceVideoUrl: string | null;
  userPoses: any[];
  referencePoses?: any[];
  onUserFrameChange?: (frame: number) => void;
  onReferenceFrameChange?: (frame: number) => void;
  onUserTimeUpdate?: (time: number) => void;
  onReferenceTimeUpdate?: (time: number) => void;
  className?: string;
  height?: string;
  maxHeight?: string;
  seekFrame?: number | null;
  onSeekFrameHandled?: () => void;
}

export default function SideBySideVideoPlayer({
  userVideoUrl,
  referenceVideoUrl,
  userPoses,
  referencePoses = [],
  onUserFrameChange,
  onReferenceFrameChange,
  onUserTimeUpdate,
  onReferenceTimeUpdate,
  className = '',
  height = "500px",
  maxHeight,
  seekFrame,
  onSeekFrameHandled
}: SideBySideVideoPlayerProps) {
  const [viewMode, setViewMode] = useState<'single' | 'side-by-side'>('single');
  const [activeVideo, setActiveVideo] = useState<'user' | 'reference'>('user');

  // Ref for user video player
  const userVideoRef = useRef<VideoPlayerHandle>(null);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'single' ? 'side-by-side' : 'single');
  }, []);

  const switchActiveVideo = useCallback(() => {
    setActiveVideo(prev => prev === 'user' ? 'reference' : 'user');
  }, []);

  // Seek logic for chart->video sync
  useEffect(() => {
    if (seekFrame !== undefined && seekFrame !== null && userVideoRef.current) {
      userVideoRef.current.seekToFrame(seekFrame);
      if (onSeekFrameHandled) onSeekFrameHandled();
    }
  }, [seekFrame, onSeekFrameHandled]);

  // Single view mode
  if (viewMode === 'single') {
    const currentVideoUrl = activeVideo === 'user' ? userVideoUrl : referenceVideoUrl;
    const currentPoses = activeVideo === 'user' ? userPoses : referencePoses;
    const currentOnFrameChange = activeVideo === 'user' ? onUserFrameChange : onReferenceFrameChange;
    const currentOnTimeUpdate = activeVideo === 'user' ? onUserTimeUpdate : onReferenceTimeUpdate;

    return (
      <div className={`w-full ${className}`} style={maxHeight ? { maxHeight } : {}}>
        {/* Toggle Controls */}
        <div className="flex items-center space-x-2 mb-4 px-2">
          <ToggleGroup.Root
            type="single"
            value={viewMode}
            onValueChange={val => { if (val) setViewMode(val as 'single' | 'side-by-side'); }}
            className="flex"
          >
            <ToggleGroup.Item
              value="side-by-side"
              aria-label="Switch to Side-by-Side"
              className="px-2 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 data-[state=on]:bg-blue-600 data-[state=on]:text-white transition"
              style={{ minWidth: 0 }}
            >
              Side-by-Side
            </ToggleGroup.Item>
          </ToggleGroup.Root>
            <button
              onClick={switchActiveVideo}
            className="px-2 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
            style={{ minWidth: 0 }}
            >
            Switch to {activeVideo === 'user' ? 'Reference' : 'User'}
            </button>
        </div>
        {/* Video Player Container */}
        <div className="w-full" style={maxHeight ? { maxHeight } : {}}>
          <VideoPlayer
            ref={activeVideo === 'user' ? userVideoRef : undefined}
            videoUrl={currentVideoUrl || ""}
            keypointData={currentPoses}
            onFrameChange={currentOnFrameChange}
            onTimeUpdate={currentOnTimeUpdate}
          />
        </div>
      </div>
    );
  }

  // Side-by-side view mode
  return (
    <div className={`w-full ${className}`} style={maxHeight ? { maxHeight } : undefined}>
      {/* Toggle Controls */}
      <div 
        className="flex items-center justify-between mb-4 px-2"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleViewMode}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Switch to Single View
          </button>
        </div>
      </div>

      {/* Side-by-Side Videos Container - no overflow hidden */}
      <div className="h-full">
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
          {/* User Video */}
          <div className="w-full flex flex-col">
            <div className="text-sm font-semibold text-gray-700 mb-2 px-2">Your Video</div>
            <div>
              <VideoPlayer
                ref={userVideoRef}
                videoUrl={userVideoUrl || ""}
                keypointData={userPoses}
                onFrameChange={onUserFrameChange}
                onTimeUpdate={onUserTimeUpdate}
              />
            </div>
          </div>

          {/* Reference Video */}
          <div className="w-full flex flex-col">
            <div className="text-sm font-semibold text-gray-700 mb-2 px-2">Reference Video</div>
            <div>
              <VideoPlayer
                videoUrl={referenceVideoUrl || ""}
                keypointData={referencePoses}
                onFrameChange={onReferenceFrameChange}
                onTimeUpdate={onReferenceTimeUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 