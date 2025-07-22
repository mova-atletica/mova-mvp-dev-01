"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import VideoPlayer, { VideoPlayerHandle } from './VideoPlayer';

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
              Switch to Side-by-Side
            </button>
            <button
              onClick={switchActiveVideo}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Switch to {activeVideo === 'user' ? 'Reference' : 'User'} Video
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Currently showing: <span className="font-semibold">{activeVideo === 'user' ? 'Your Video' : 'Reference Video'}</span>
          </div>
        </div>

        {/* Video Player Container - no overflow hidden */}
        <div className="w-full">
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
        <div className="text-sm text-gray-600">
          Side-by-side comparison view
        </div>
      </div>

      {/* Side-by-Side Videos Container - no overflow hidden */}
      <div className="w-full">
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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