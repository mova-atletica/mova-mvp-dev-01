// Updated motion-explore/page.tsx
"use client";
import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Lazy load components for better performance
const MotionAnalysisPanel = lazy(() => import('./MotionAnalysisPanel'));
const AssetVideoPlayer = lazy(() => import('./AssetVideoPlayer'));

interface MotionData {
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
  isRecordedVideo: boolean;
  timestamp: string;
}

export default function MotionExplorePage() {
  const router = useRouter();
  const [motionData, setMotionData] = useState<MotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Remove body padding-top for motion explore page since header is not fixed
    const body = document.body;
    const originalPaddingTop = body.style.paddingTop;
    body.style.paddingTop = '3vh';
    
    // Load motion data from localStorage
    try {
      const storedData = localStorage.getItem('openMoveData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setMotionData(data);
        } catch (err) {
          console.error('Error parsing motion data:', err);
          setError('Failed to load motion data. The data may be corrupted.');
        }
      } else {
        setError('No motion data found. Please record or upload a video first.');
      }
    } catch (storageError) {
      console.error('Error accessing localStorage:', storageError);
      setError('Unable to access stored data. Please try again or clear your browser data.');
    }
    setLoading(false);
    
    // Cleanup: restore original padding when component unmounts
    return () => {
      body.style.paddingTop = originalPaddingTop || '';
    };
  }, []);

  const handleBackToOpenMove = () => {
    router.push('/open-move');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--foreground)' }}>Loading motion data...</p>
        </div>
      </main>
    );
  }

  if (error || !motionData || !motionData.poses || motionData.poses.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-md w-full rounded-lg p-8 text-center" style={{ 
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)'
        }}>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            No Motion Data
          </h1>
          <p className="text-gray-600 mb-6" style={{ color: 'var(--foreground)' }}>
            {error || 'Please record or upload a video first to explore motion data.'}
          </p>
          <button
            onClick={handleBackToOpenMove}
            className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Go to Open Move
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-onyx-100 flex flex-col items-center px-0 pb-4" style={{ maxWidth: '2560px', marginLeft: '3%', marginRight: '3%', marginTop: '30px' }}>
      <div className="w-full max-w-6xl flex flex-col md:flex-row" style={{ maxWidth: '2560px', minHeight: '100vh' }}>
        {/* Video Player - Full width on mobile, 50% on desktop */}
        <div className="w-full md:flex-1 md:min-w-0 md:max-w-[50%] flex flex-col justify-start" style={{ maxWidth: '100%' }}>
          <div className="w-full mx-auto">
            <div
              style={{
                background: 'var(--results-summary-bg)',
                color: 'var(--results-summary-title)',
                borderRadius: 6,
                marginBottom: 12
              }}
            >
              {/* Video Player with Effects - Using AssetGenerationModal's video player */}
              <Suspense fallback={
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p style={{ color: 'var(--foreground)' }}>Loading video player...</p>
                  </div>
                </div>
              }>
                <AssetVideoPlayer 
                  videoUrl={motionData.videoUrl}
                  poses={motionData.poses}
                  exerciseTitle="My Motion"
                  exercise={{ title: "My Motion", muscleGroups: [] }}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Analysis Panel - Full width on mobile, 50% on desktop */}
        <div className="w-full md:flex-1 md:min-w-0 md:max-w-[50%] flex flex-col justify-start" style={{ maxWidth: '100%' }}>
          <div className="w-full mx-auto">
            <div
              style={{
                background: 'var(--results-summary-bg)',
                color: 'var(--results-summary-title)',
                borderRadius: 6,
                marginBottom: 12
              }}
            >
              <Suspense fallback={
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p style={{ color: 'var(--foreground)' }}>Loading analysis panel...</p>
                  </div>
                </div>
              }>
                <MotionAnalysisPanel 
                  poses={motionData.poses}
                  angles={motionData.angles}
                  videoUrl={motionData.videoUrl}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}