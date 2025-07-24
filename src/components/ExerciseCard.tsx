"use client";
import { Exercise } from '../data/exercises';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(exercise.image);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('Exercise data:', exercise);
    console.log('Exercise level:', exercise.level);
  }, [exercise]);

  useEffect(() => {
    // If the image is a Google Cloud Storage path, get a signed URL
    if (exercise.image && !exercise.image.startsWith('http') && !exercise.image.startsWith('/')) {
      const getSignedUrl = async () => {
        try {
          const response = await fetch('/api/storage/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: exercise.image }),
          });
          
          if (response.ok) {
            const { signedUrl } = await response.json();
            setImageUrl(signedUrl);
          }
        } catch (error) {
          console.error('Error getting signed URL:', error);
        }
      };
      
      getSignedUrl();
    }
  }, [exercise.image]);

  useEffect(() => {
    // Get video URL if exercise has a reference video
    if (exercise.referenceVideoUrl) {
      const getVideoUrl = async () => {
        try {
          let videoUrlToUse = exercise.referenceVideoUrl;
          
          // If it's a GCS path, get signed URL
          if (!exercise.referenceVideoUrl.startsWith('http') && !exercise.referenceVideoUrl.startsWith('blob:')) {
            const response = await fetch('/api/storage/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: exercise.referenceVideoUrl }),
            });
            
            if (response.ok) {
              const { signedUrl } = await response.json();
              videoUrlToUse = signedUrl;
            }
          }
          
          setVideoUrl(videoUrlToUse);
        } catch (error) {
          console.error('Error getting video URL:', error);
        }
      };
      
      getVideoUrl();
    }
  }, [exercise.referenceVideoUrl]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    // Do NOT reset isVideoLoaded here
  };

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
    if (isHovered && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Level badge colors - single source of truth
  const LEVEL_COLORS = {
    beginner: { bg: 'rgba(192, 201, 204, 0.8)', text: '#053600' },
    intermediate: { bg: 'rgba(192, 201, 204, 0.8)', text: '#B54B00' },
    advanced: { bg: 'rgba(192, 201, 204, 0.8)', text: '#002CAA' },
    default: { bg: 'rgba(192, 201, 204, 1)', text: '#FFFFFF' }
  } as const;

  // Get level badge styling
  const getLevelBadgeStyle = (level: string) => {
    const levelKey = level.toLowerCase() as keyof typeof LEVEL_COLORS;
    return LEVEL_COLORS[levelKey] || LEVEL_COLORS.default;
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
      style={{ 
        width: '200px', 
        height: '355px', 
        position: 'relative',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '8px'
      }}
      onClick={() => router.push(`/exercises/${exercise.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Container - Shows on hover if video exists */}
      {videoUrl && isHovered && (
        <div className="absolute inset-0 z-20" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            onLoadedData={handleVideoLoad}
          />
          {!isVideoLoaded && (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <div className="text-sm" style={{ color: 'var(--foreground)' }}>Loading...</div>
            </div>
          )}
        </div>
      )}
      
      {/* Image Container - Full Card Background (hidden when video is playing) */}
      <div className="absolute inset-0" style={{ 
        display: isHovered && videoUrl ? 'none' : 'block',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <img 
          src={imageUrl} 
          alt={exercise.title} 
          className="w-full h-full object-cover" 
        />
      </div>
      
      {/* Play Icon - Shows when hovering over image if video exists */}
      
      {/* Level Badge - Clean styling */}
      {exercise.level && (
        <div 
          className="absolute px-3 py-1 rounded text-xs font-medium z-30 shadow-lg"
          style={{ 
            top: '12px', 
            left: '12px',
            backgroundColor: getLevelBadgeStyle(exercise.level).bg,
            color: getLevelBadgeStyle(exercise.level).text,
            border: '1px solid #f3f3f4'
          }}
        >
          {capitalizeFirst(exercise.level)}
        </div>
      )}
      
      {/* Exercise Details - Always Visible */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-30" style={{ 
        height: '105px', 
        backgroundColor: 'var(--card-overlay)', 
        position: 'absolute', 
        bottom: '0', 
        left: '0', 
        right: '0',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px'
      }}>
        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--card-title)' }}>{exercise.title}</h3>
        {exercise.author && exercise.author.name && (
          <div className="text-xs text-gray-400 mb-1" style={{ color: 'var(--card-description)' }}>
            by {exercise.author.name}
          </div>
        )}
        <p
          className="text-xs"
          style={{
            color: 'var(--card-description)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {exercise.description}
        </p>
      </div>
    </div>
  );
}
