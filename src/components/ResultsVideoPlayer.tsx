"use client";
import React, { useRef, useEffect, useState } from 'react';
import CoreVideoPlayer from './CoreVideoPlayer';

interface ResultsVideoPlayerProps {
  videoUrl: string | null;
  poses: any[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  height?: string;
}

export default function ResultsVideoPlayer({
  videoUrl,
  poses,
  currentFrame,
  onFrameChange,
  height = "400px"
}: ResultsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Draw pose skeleton on canvas
  const drawPose = (ctx: CanvasRenderingContext2D, pose: any, scaleX: number, scaleY: number) => {
    if (!pose || !pose.keypoints) return;

    const keypoints = pose.keypoints;
    
    // Draw connections (skeleton)
    const connections = [
      // Head
      [5, 6], // shoulders
      [5, 7], // left shoulder to left elbow
      [7, 9], // left elbow to left wrist
      [6, 8], // right shoulder to right elbow
      [8, 10], // right elbow to right wrist
      // Torso
      [5, 11], // left shoulder to left hip
      [6, 12], // right shoulder to right hip
      [11, 12], // hips
      // Legs
      [11, 13], // left hip to left knee
      [13, 15], // left knee to left ankle
      [12, 14], // right hip to right knee
      [14, 16], // right knee to right ankle
    ];

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];
      
      if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * scaleX, startPoint.y * scaleY);
        ctx.lineTo(endPoint.x * scaleX, endPoint.y * scaleY);
        ctx.stroke();
      }
    });

    // Draw keypoints
    ctx.fillStyle = '#ff0000';
    keypoints.forEach((kp: any) => {
      if (kp && kp.score > 0.3) {
        ctx.beginPath();
        ctx.arc(kp.x * scaleX, kp.y * scaleY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  // Update canvas when frame changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !poses.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw current pose
    if (poses[currentFrame]) {
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      drawPose(ctx, poses[currentFrame], scaleX, scaleY);
    }
  }, [currentFrame, poses]);

  // Handle video time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !poses.length) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Analysis is at 10fps (every 3rd frame of 30fps video)
      const frameIdx = Math.floor(video.currentTime * 10);
      const newFrame = Math.min(frameIdx, poses.length - 1);
      onFrameChange(newFrame);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [poses.length, onFrameChange]);

  // Video controls component
  const VideoControls = () => (
    <div className="flex items-center gap-4">
      <button
        onClick={() => {
          if (videoRef.current) {
            if (isPlaying) {
              videoRef.current.pause();
            } else {
              videoRef.current.play();
            }
          }
        }}
        className="vp-btn px-4 py-2 rounded"
      >
        {isPlaying ? '⏸️ Pause' : '▶️ Play'}
      </button>
      
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs" style={{ color: 'var(--vp-label)' }}>
          {Math.floor(currentTime)}s
        </span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => {
            if (videoRef.current) {
              videoRef.current.currentTime = parseFloat(e.target.value);
            }
          }}
          className="slider flex-1"
          style={{ background: 'var(--vp-slider-bg)' }}
        />
        <span className="text-xs" style={{ color: 'var(--vp-label)' }}>
          {Math.floor(duration)}s
        </span>
      </div>
      
      <div className="text-xs" style={{ color: 'var(--vp-label)' }}>
        Frame: {currentFrame + 1} / {poses.length}
      </div>
    </div>
  );

  // Video element
  const VideoElement = (
    <video
      ref={videoRef}
      src={videoUrl || undefined}
      className="w-full h-full object-contain"
      style={{ background: 'var(--vp-bg)' }}
    />
  );

  // Overlays (pose visualization is handled by canvas)
  const Overlays = null; // Canvas is handled separately in CoreVideoPlayer

  // Advanced panel (empty for now)
  const AdvancedPanel = null;

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📹</div>
          <div className="text-sm">No video available</div>
        </div>
      </div>
    );
  }

  return (
    <CoreVideoPlayer
      videoElement={VideoElement}
      canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
      overlays={Overlays}
      controls={<VideoControls />}
      advancedPanel={AdvancedPanel}
      containerClassName="w-full"
      height={height}
      style={{ background: 'var(--vp-bg)' }}
    />
  );
} 