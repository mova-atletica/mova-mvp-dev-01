"use client";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import CoreVideoPlayer from '../../components/CoreVideoPlayer';
import { getAngleWithConfidence } from '../../lib/analysisUtils';

interface MotionExplorePlayerProps {
  videoUrl: string;
  poses: any[];
  angles: {
    leftKneeAngles: (number | null)[];
    rightKneeAngles: (number | null)[];
    leftHipAngles: (number | null)[];
    rightHipAngles: (number | null)[];
    leftElbowAngles: (number | null)[];
    rightElbowAngles: (number | null)[];
    leftShoulderAbdAngles: (number | null)[];
    rightShoulderAbdAngles: (number | null)[];
    trunkAngles: (number | null)[];
  };
}

export default function MotionExplorePlayer({ videoUrl, poses, angles }: MotionExplorePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Calculate current frame based on time
  const getCurrentFrame = useCallback((time: number) => {
    if (duration === 0) return 0;
    return Math.floor((time / duration) * poses.length);
  }, [duration, poses.length]);

  // Handle video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      setCurrentFrame(getCurrentFrame(time));
    }
  }, [getCurrentFrame]);

  // Handle video loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Handle seek
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      setCurrentFrame(getCurrentFrame(time));
    }
  }, [getCurrentFrame]);

  // Render skeleton overlay
  const renderSkeletonOverlay = useCallback(() => {
    if (!showSkeleton || !canvasRef.current || currentFrame >= poses.length) {
      return null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !videoRef.current) return null;

    const pose = poses[currentFrame];
    if (!pose || !pose.keypoints) return null;

    // Set canvas size to match video
    const video = videoRef.current;
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw skeleton
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00ff00';

    // Draw keypoints
    pose.keypoints.forEach((keypoint: any) => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw connections
    const connections = [
      [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], // Face
      [5, 11], [6, 12], [11, 12], // Shoulders
      [11, 13], [12, 14], [13, 15], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24], // Torso
      [23, 25], [24, 26], [25, 27], [26, 28], // Legs
      [27, 29], [28, 30], [29, 31], [30, 32] // Feet
    ];

    connections.forEach(([start, end]) => {
      const startPoint = pose.keypoints[start];
      const endPoint = pose.keypoints[end];
      
      if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });
  }, [showSkeleton, currentFrame, poses]);

  // Render angle overlay
  const renderAngleOverlay = useCallback(() => {
    if (!showAngles || !canvasRef.current || currentFrame >= poses.length) {
      return null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pose = poses[currentFrame];
    if (!pose || !pose.keypoints) return null;

    // Set canvas size to match video
    const video = videoRef.current;
    if (!video) return null;

    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Draw angles
    ctx.fillStyle = '#ff0000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    // Left knee angle
    if (angles.leftKneeAngles[currentFrame] !== null) {
      const leftKneeAngle = angles.leftKneeAngles[currentFrame];
      const leftKneeKeypoint = pose.keypoints[25];
      if (leftKneeKeypoint && leftKneeKeypoint.score > 0.3) {
        ctx.fillText(`L Knee: ${leftKneeAngle?.toFixed(0)}°`, leftKneeKeypoint.x, leftKneeKeypoint.y - 20);
      }
    }

    // Right knee angle
    if (angles.rightKneeAngles[currentFrame] !== null) {
      const rightKneeAngle = angles.rightKneeAngles[currentFrame];
      const rightKneeKeypoint = pose.keypoints[26];
      if (rightKneeKeypoint && rightKneeKeypoint.score > 0.3) {
        ctx.fillText(`R Knee: ${rightKneeAngle?.toFixed(0)}°`, rightKneeKeypoint.x, rightKneeKeypoint.y - 20);
      }
    }

    // Left hip angle
    if (angles.leftHipAngles[currentFrame] !== null) {
      const leftHipAngle = angles.leftHipAngles[currentFrame];
      const leftHipKeypoint = pose.keypoints[23];
      if (leftHipKeypoint && leftHipKeypoint.score > 0.3) {
        ctx.fillText(`L Hip: ${leftHipAngle?.toFixed(0)}°`, leftHipKeypoint.x, leftHipKeypoint.y - 40);
      }
    }

    // Right hip angle
    if (angles.rightHipAngles[currentFrame] !== null) {
      const rightHipAngle = angles.rightHipAngles[currentFrame];
      const rightHipKeypoint = pose.keypoints[24];
      if (rightHipKeypoint && rightHipKeypoint.score > 0.3) {
        ctx.fillText(`R Hip: ${rightHipAngle?.toFixed(0)}°`, rightHipKeypoint.x, rightHipKeypoint.y - 40);
      }
    }
  }, [showAngles, currentFrame, poses, angles]);

  // Update overlays when frame changes
  useEffect(() => {
    renderSkeletonOverlay();
    renderAngleOverlay();
  }, [renderSkeletonOverlay, renderAngleOverlay]);

  // Video element
  const videoElement = (
    <video
      ref={videoRef}
      src={videoUrl}
      className="w-full h-auto"
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      controls={false} // We'll use custom controls
    />
  );

  // Overlays
  const overlays = (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );

  // Controls
  const controls = (
    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="px-3 py-1 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <span className="text-sm">
            {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')} / 
            {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              showSkeleton ? 'bg-green-600' : 'bg-gray-600'
            } hover:bg-opacity-80`}
          >
            Skeleton
          </button>
          <button
            onClick={() => setShowAngles(!showAngles)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              showAngles ? 'bg-red-600' : 'bg-gray-600'
            } hover:bg-opacity-80`}
          >
            Angles
          </button>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={(e) => seekTo(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <CoreVideoPlayer
        videoElement={videoElement}
        canvasRef={canvasRef}
        overlays={overlays}
        controls={controls}
        containerClassName="w-full h-full"
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onPlayPause={togglePlay}
        onSeek={seekTo}
      />
    </div>
  );
}
