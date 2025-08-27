"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import VideoPlayer, { VideoPlayerHandle } from './VideoPlayer';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

interface SideBySideVideoPlayerProps {
  userVideoUrl: string | null;
  referenceVideoUrl: string | null;
  userPoses: any[];
  referencePoses?: any[];
  exercise?: any; // Add exercise prop for VideoPlayer
  onUserFrameChange?: (frame: number) => void;
  onReferenceFrameChange?: (frame: number) => void;
  onUserTimeUpdate?: (time: number) => void;
  onReferenceTimeUpdate?: (time: number) => void;
  className?: string;
  height?: string;
  maxHeight?: string;
  seekFrame?: number | null;
  onSeekFrameHandled?: () => void;
  userVideoDuration?: number;
}

export default function SideBySideVideoPlayer({
  userVideoUrl,
  referenceVideoUrl,
  userPoses,
  referencePoses = [],
  exercise,
  onUserFrameChange,
  onReferenceFrameChange,
  onUserTimeUpdate,
  onReferenceTimeUpdate,
  className = '',
  height = "500px",
  maxHeight,
  seekFrame,
  onSeekFrameHandled,
  userVideoDuration
}: SideBySideVideoPlayerProps) {
  console.log('🎬 SideBySideVideoPlayer props:', {
    userVideoUrl,
    referenceVideoUrl,
    userPosesLength: userPoses?.length,
    referencePosesLength: referencePoses?.length,
    exerciseId: exercise?.id
  });
  
  // PRESERVE: View mode and video switching functionality
  const [viewMode, setViewMode] = useState<'single' | 'side-by-side'>('single');
  const [activeVideo, setActiveVideo] = useState<'user' | 'reference'>('user');
  
  // PRESERVE: Refs for video players
  const userVideoRef = useRef<VideoPlayerHandle>(null);
  const referenceVideoRef = useRef<VideoPlayerHandle>(null);
  const singleViewVideoRef = useRef<VideoPlayerHandle>(null);

  // PRESERVE: View mode and video switching functions
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'single' ? 'side-by-side' : 'single');
  }, []);

  const switchActiveVideo = useCallback(() => {
    setActiveVideo(prev => prev === 'user' ? 'reference' : 'user');
  }, []);

  // PRESERVE: Seek logic for chart->video sync
  useEffect(() => {
    if (seekFrame !== undefined && seekFrame !== null) {
      const currentRef = viewMode === 'single' ? singleViewVideoRef : userVideoRef;
      if (currentRef.current) {
        currentRef.current.seekToFrame(seekFrame);
        if (onSeekFrameHandled) onSeekFrameHandled();
      }
    }
  }, [seekFrame, onSeekFrameHandled, viewMode]);

  // PRESERVE: Single view mode
  if (viewMode === 'single') {
    const currentVideoUrl = activeVideo === 'user' ? userVideoUrl : referenceVideoUrl;
    const currentPoses = activeVideo === 'user' ? userPoses : referencePoses;
    const currentOnFrameChange = activeVideo === 'user' ? onUserFrameChange : onReferenceFrameChange;
    const currentOnTimeUpdate = activeVideo === 'user' ? onUserTimeUpdate : onReferenceTimeUpdate;

    return (
      <div className={`w-full ${className}`} style={maxHeight ? { maxHeight } : {}}>
        {/* PRESERVE: Toggle Controls */}
        <div className="flex items-center space-x-2 mb-4 px-0">
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
            {referenceVideoUrl && (
              <button
                onClick={switchActiveVideo}
                className="px-2 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
                style={{ minWidth: 0 }}
              >
                Switch to {activeVideo === 'user' ? 'Reference' : 'User'}
              </button>
            )}
        </div>
        {/* PRESERVE: Video Player Container */}
        <div className="w-full" style={maxHeight ? { maxHeight } : {}}>
          <VideoPlayer
            ref={singleViewVideoRef}
            videoUrl={currentVideoUrl}
            keypointData={currentPoses}
            exercise={exercise}
            onFrameChange={currentOnFrameChange}
            onTimeUpdate={currentOnTimeUpdate}
            className={className}
          />
        </div>
      </div>
    );
  }

  // PRESERVE: Side-by-side view mode
  return (
    <div className={`w-full ${className}`} style={maxHeight ? { maxHeight } : undefined}>
      {/* PRESERVE: Toggle Controls */}
      <div 
        className="flex items-center justify-between mb-4 px-0"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleViewMode}
            className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Switch to Single View
          </button>
        </div>
      </div>

      {/* PRESERVE: Side-by-Side Videos Container */}
      <div className="h-full">
        {/* PRESERVE: Responsive Grid Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
          {/* PRESERVE: User Video */}
          <div className="w-full flex flex-col">
            <div className="text-xs font-medium color: 'var(--results-summary-title)' mb-2 px-0">Your Video</div>
            <div>
              <VideoPlayer
                ref={userVideoRef}
                videoUrl={userVideoUrl}
                keypointData={userPoses}
                exercise={exercise}
                onFrameChange={onUserFrameChange}
                onTimeUpdate={onUserTimeUpdate}
                className={className}
              />
            </div>
          </div>

          {/* PRESERVE: Reference Video */}
          <div className="w-full flex flex-col">
            <div className="text-xs font-medium color: 'var(--results-summary-title)' mb-2 px-0">
              Reference Video {!referenceVideoUrl && '(Not Available)'}
            </div>
            <div>
              {referenceVideoUrl ? (
                <VideoPlayer
                  ref={referenceVideoRef}
                  videoUrl={referenceVideoUrl}
                  keypointData={referencePoses}
                  exercise={exercise}
                  onFrameChange={onReferenceFrameChange}
                  onTimeUpdate={onReferenceTimeUpdate}
                  className={className}
                />
              ) : (
                <div style={{
                  height: maxHeight || '80vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--vp-panel-bg)',
                  color: 'var(--vp-panel-title)',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--vp-panel-border)'
                }}>
                  No reference video available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}