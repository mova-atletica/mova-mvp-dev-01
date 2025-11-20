"use client";
import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import { getAngleWithConfidence } from '../../lib/analysisUtils';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import LiveVideoPlayer from '../../components/LiveVideoPlayer';

export default function OpenMovePracticeTab() {
  const router = useRouter();
  
  // --- State and refs ---
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRecordedVideo, setIsRecordedVideo] = useState(false);
  const [currentDemoSlide, setCurrentDemoSlide] = useState(0);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showLiveRecordingPreview, setShowLiveRecordingPreview] = useState(false);
  const [liveRecordingUrl, setLiveRecordingUrl] = useState<string | null>(null);
  const [liveRecordingDuration, setLiveRecordingDuration] = useState<number | null>(null);

  // Demo carousel data
  const demoSlides = [
    {
      id: 1,
      title: "Upload or Record Video",
      description: "Use good lighting and make sure your full body is in frame of the video.",
      image: "/demo/step-01.webp"
    },
    {
      id: 2,
      title: "Review Your Bio-Mechanics",
      description: "Share your motion data with professionals; add motion data effects, and share with friends.",
      image: "/demo/step-02.webp"
    },
    {
      id: 3,
      title: "Download & Share",
      description: "Download your assets in 9:16 to share on socials.",
      image: "/demo/step-03.webp"
    }
  ];

  // Utility function to check storage availability
  const checkStorageAvailability = () => {
    try {
      const testKey = 'storage_test_' + Date.now();
      const testData = 'test';
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Utility function to clear old motion data
  const clearOldMotionData = () => {
    try {
      localStorage.removeItem('openMoveData');
      console.log('Cleared old motion data');
    } catch (error) {
      console.error('Error clearing old motion data:', error);
    }
  };


  // Angle tracking for all major joints
  const [leftKneeAngles, setLeftKneeAngles] = useState<(number | null)[]>([]);
  const [rightKneeAngles, setRightKneeAngles] = useState<(number | null)[]>([]);
  const [leftHipAngles, setLeftHipAngles] = useState<(number | null)[]>([]);
  const [rightHipAngles, setRightHipAngles] = useState<(number | null)[]>([]);
  const [leftElbowAngles, setLeftElbowAngles] = useState<(number | null)[]>([]);
  const [rightElbowAngles, setRightElbowAngles] = useState<(number | null)[]>([]);
  const [leftShoulderAbdAngles, setLeftShoulderAbdAngles] = useState<(number | null)[]>([]);
  const [rightShoulderAbdAngles, setRightShoulderAbdAngles] = useState<(number | null)[]>([]);
  const [trunkAngles, setTrunkAngles] = useState<(number | null)[]>([]);

  // --- Load pose detection model ---
  useEffect(() => {
    async function loadModel() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();

        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );

        setDetector(detector);
      } catch (error) {
        console.error('❌ Error loading pose detection model:', error);
        
        // Retry with different backend if WebGL fails
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('webgl') || errorMessage.includes('fetch')) {
          try {
            await tf.setBackend("cpu");
            await tf.ready();
            
            const detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
            );
            
            setDetector(detector);
          } catch (cpuError) {
            console.error('❌ Error loading pose detection model with CPU backend:', cpuError);
          }
        }
      }
    }

    loadModel();
  }, []);

  // --- Reset all state ---
  const resetAllState = () => {
    setAllPoses([]);
    setLeftKneeAngles([]);
    setRightKneeAngles([]);
    setLeftHipAngles([]);
    setRightHipAngles([]);
    setLeftElbowAngles([]);
    setRightElbowAngles([]);
    setLeftShoulderAbdAngles([]);
    setRightShoulderAbdAngles([]);
    setTrunkAngles([]);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
  };

  // --- Reset file input ---
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle recording completion from LiveVideoPlayer
  const handleRecordingComplete = (videoUrl: string, duration: number, realTimeAnalysisData?: any[]) => {
    setLiveRecordingUrl(videoUrl);
    setLiveRecordingDuration(duration);
    
    // Store real-time analysis data if available (for future use)
    if (realTimeAnalysisData && realTimeAnalysisData.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem("realTimeAnalysisData", JSON.stringify(realTimeAnalysisData));
      }
    }
    
    setShowLiveRecordingPreview(true);
    setShowLiveModal(false); // Close the live recording modal
  };

  // Handle analyzing the live recording
  const handleAnalyzeLiveRecording = async () => {
    if (!liveRecordingUrl) {
      console.error('No live recording URL available');
      return;
    }
    
    // Set the video URL and process it
    // Keep the modal open during processing
    setVideoUrl(liveRecordingUrl);
    setIsRecordedVideo(true);
    setIsAnalyzing(true);
    
    // Wait for the video element to be ready and loaded, then process
    // Use a combination of checking and event listeners to ensure video is ready
    const waitForVideoReady = (attempts = 0) => {
      if (attempts > 50) {
        // Give up after 5 seconds (50 * 100ms)
        console.error('Video element not ready after timeout');
        setIsAnalyzing(false);
        setShowLiveRecordingPreview(false);
        return;
      }
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Check if video is already loaded
        if (video.readyState >= 2) {
          // Video is ready (HAVE_CURRENT_DATA or higher)
          processRecordedVideo(liveRecordingUrl, () => {
            setShowLiveRecordingPreview(false);
          });
          return;
        }
        
        // Set up event listeners for when video loads
        const handleLoadedMetadata = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            processRecordedVideo(liveRecordingUrl, () => {
              setShowLiveRecordingPreview(false);
            });
          }
        };
        
        const handleError = () => {
          console.error('Error loading video');
          setIsAnalyzing(false);
          setShowLiveRecordingPreview(false);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        video.addEventListener('error', handleError, { once: true });
        
        // Also trigger load if not already loading
        if (video.readyState === 0) {
          video.load();
        }
      } else {
        // Video element doesn't exist yet, try again after a short delay
        setTimeout(() => waitForVideoReady(attempts + 1), 100);
      }
    };
    
    // Start waiting for video to be ready
    // Give React time to render the video element
    setTimeout(() => waitForVideoReady(), 200);
  };

  // Handle retaking the live recording
  const handleRetakeLiveRecording = () => {
    setShowLiveRecordingPreview(false);
    setLiveRecordingUrl(null);
    setLiveRecordingDuration(null);
    setShowLiveModal(true);
  };

  // Handle canceling the live recording
  const handleCancelLiveRecording = () => {
    setShowLiveRecordingPreview(false);
    setLiveRecordingUrl(null);
    setLiveRecordingDuration(null);
    resetAllState();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      setIsRecordedVideo(false);
      resetAllState();
    }
  };

  // --- Process recorded video ---
  const redoVideo = () => {
    setVideoUrl(null);
    setAllPoses([]);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setIsRecordedVideo(false);
    // Reset all angle arrays
    setLeftKneeAngles([]);
    setRightKneeAngles([]);
    setLeftHipAngles([]);
    setRightHipAngles([]);
    setLeftElbowAngles([]);
    setRightElbowAngles([]);
    setLeftShoulderAbdAngles([]);
    setRightShoulderAbdAngles([]);
    setTrunkAngles([]);
  };

  const processRecordedVideo = async (url: string, onComplete?: () => void) => {
    if (!detector || !videoRef.current) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const video = videoRef.current;
    const poses: any[] = [];
    const angles = {
      leftKneeAngles: [] as (number | null)[],
      rightKneeAngles: [] as (number | null)[],
      leftHipAngles: [] as (number | null)[],
      rightHipAngles: [] as (number | null)[],
      leftElbowAngles: [] as (number | null)[],
      rightElbowAngles: [] as (number | null)[],
      leftShoulderAbdAngles: [] as (number | null)[],
      rightShoulderAbdAngles: [] as (number | null)[],
      trunkAngles: [] as (number | null)[]
    };

    const processFrame = async (currentTime: number) => {
      if (currentTime >= video.duration) {
        // Analysis complete
        setAllPoses(poses);
        setLeftKneeAngles(angles.leftKneeAngles);
        setRightKneeAngles(angles.rightKneeAngles);
        setLeftHipAngles(angles.leftHipAngles);
        setRightHipAngles(angles.rightHipAngles);
        setLeftElbowAngles(angles.leftElbowAngles);
        setRightElbowAngles(angles.rightElbowAngles);
        setLeftShoulderAbdAngles(angles.leftShoulderAbdAngles);
        setRightShoulderAbdAngles(angles.rightShoulderAbdAngles);
        setTrunkAngles(angles.trunkAngles);
        setIsAnalyzing(false);
        setAnalysisProgress(100);
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete();
        }
        return;
      }

      video.currentTime = currentTime;
      
      await new Promise(resolve => {
        video.onseeked = () => {
          if (detector) {
            detector.estimatePoses(video).then((detectedPoses) => {
              if (detectedPoses.length > 0) {
                const pose = detectedPoses[0];
                poses.push(pose);

                // Calculate angles for all joints
                const leftKneeAngle = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[13], pose.keypoints[15]).angle;
                const rightKneeAngle = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[14], pose.keypoints[16]).angle;
                const leftHipAngle = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[13], pose.keypoints[15]).angle;
                const rightHipAngle = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[14], pose.keypoints[16]).angle;
                const leftElbowAngle = getAngleWithConfidence(pose.keypoints[5], pose.keypoints[7], pose.keypoints[9]).angle;
                const rightElbowAngle = getAngleWithConfidence(pose.keypoints[6], pose.keypoints[8], pose.keypoints[10]).angle;
                const leftShoulderAbdAngle = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[5], pose.keypoints[7]).angle;
                const rightShoulderAbdAngle = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[6], pose.keypoints[8]).angle;
                const trunkAngle = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[12], pose.keypoints[23]).angle;

                angles.leftKneeAngles.push(leftKneeAngle);
                angles.rightKneeAngles.push(rightKneeAngle);
                angles.leftHipAngles.push(leftHipAngle);
                angles.rightHipAngles.push(rightHipAngle);
                angles.leftElbowAngles.push(leftElbowAngle);
                angles.rightElbowAngles.push(rightElbowAngle);
                angles.leftShoulderAbdAngles.push(leftShoulderAbdAngle);
                angles.rightShoulderAbdAngles.push(rightShoulderAbdAngle);
                angles.trunkAngles.push(trunkAngle);
              } else {
                // No pose detected, add null values
                angles.leftKneeAngles.push(null);
                angles.rightKneeAngles.push(null);
                angles.leftHipAngles.push(null);
                angles.rightHipAngles.push(null);
                angles.leftElbowAngles.push(null);
                angles.rightElbowAngles.push(null);
                angles.leftShoulderAbdAngles.push(null);
                angles.rightShoulderAbdAngles.push(null);
                angles.trunkAngles.push(null);
              }

              const progress = Math.min(100, (currentTime / video.duration) * 100);
              setAnalysisProgress(progress);
              
              resolve(undefined);
            });
          }
        };
      });

      // Process next frame
      await processFrame(currentTime + 0.1);
    };

    await processFrame(0);
  };

  // Custom video component that displays correct duration for live recordings
  const LiveRecordingVideo = ({ src, duration }: { src: string; duration: number }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        const videoElement = videoRef.current;
        if (videoElement) {
          try {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            videoElement.removeEventListener('play', handlePlay);
            videoElement.removeEventListener('pause', handlePause);
          } catch (error) {
            // Silently handle any cleanup errors
          }
        }
      };
    }, []);

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (video) {
        const newTime = (parseFloat(e.target.value) / 100) * duration;
        video.currentTime = newTime;
      }
    };

    const togglePlay = () => {
      const video = videoRef.current;
      if (video) {
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
      }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="relative w-full">
        <video
          ref={videoRef}
          src={src}
          className="w-full rounded-lg"
          style={{ maxHeight: '60vh', objectFit: 'contain' }}
          muted
        />
        
        {/* Custom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 rounded-b-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #6B7280 ${progress}%, #6B7280 100%)`
                }}
              />
            </div>
            
            <span className="text-white text-sm min-w-[80px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // --- Handle extract motion ---
  const handleExtractMotion = async () => {
    if (!videoUrl || allPoses.length === 0) return;

    try {
      // Convert blob URL to base64 data URL for persistence
      let persistentVideoUrl = videoUrl;
      if (videoUrl.startsWith('blob:')) {
        try {
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          
          // Check blob size before converting
          if (blob.size > 5 * 1024 * 1024) { // 5MB limit
            console.warn('Video file is too large for localStorage, using blob URL');
            // Keep the blob URL instead of converting to base64
            persistentVideoUrl = videoUrl;
          } else {
            const reader = new FileReader();
            persistentVideoUrl = await new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          console.error('Error converting blob to data URL:', error);
          // Fallback to original URL
        }
      }

      // Optimize pose data to reduce storage size
      const optimizedPoses = allPoses.map(pose => ({
        keypoints: pose.keypoints?.map((keypoint: any) => ({
          x: Math.round(keypoint.x * 100) / 100, // Round to 2 decimal places
          y: Math.round(keypoint.y * 100) / 100,
          score: Math.round(keypoint.score * 1000) / 1000 // Round to 3 decimal places
        })) || []
      }));

      // Store data in localStorage for the motion explore page
      const motionData = {
        videoUrl: persistentVideoUrl,
        poses: optimizedPoses,
        angles: {
          leftKneeAngles,
          rightKneeAngles,
          leftHipAngles,
          rightHipAngles,
          leftElbowAngles,
          rightElbowAngles,
          leftShoulderAbdAngles,
          rightShoulderAbdAngles,
          trunkAngles
        },
        isRecordedVideo,
        timestamp: new Date().toISOString()
      };

      // Check storage availability before attempting to save
      if (!checkStorageAvailability()) {
        alert('Storage is not available. Please clear your browser data and try again.');
        return;
      }

      // Try to save to localStorage with error handling
      try {
        localStorage.setItem('openMoveData', JSON.stringify(motionData));
      } catch (storageError) {
        console.error('Storage quota exceeded:', storageError);
        
        // Clear old data and try again
        clearOldMotionData();
        try {
          localStorage.setItem('openMoveData', JSON.stringify(motionData));
        } catch (retryError) {
          console.error('Still unable to save data after clearing:', retryError);
          
          // Show user-friendly error message with options
          const userChoice = confirm(
            'Unable to save motion data due to storage limitations. ' +
            'This could be due to a large video file or accumulated data. ' +
            'Would you like to clear all stored data and try again?'
          );
          
          if (userChoice) {
            try {
              localStorage.clear();
              localStorage.setItem('openMoveData', JSON.stringify(motionData));
            } catch (finalError) {
              console.error('Still unable to save after clearing all data:', finalError);
              alert('Unable to save motion data. Please try with a shorter video or contact support.');
              return;
            }
          } else {
            return;
          }
        }
      }
      
      // Navigate to motion explore page
      router.push('/motion-explore');
      
    } catch (error) {
      console.error('Error in handleExtractMotion:', error);
      alert('An error occurred while processing your motion data. Please try again.');
    }
  };

  return (
    <div className="w-full mx-auto" style={{ 
      maxWidth: '2560px', 
      marginLeft: '3%', 
      marginRight: '3%',
      width: '94%' // Match header width
    }}>
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md p-2" style={{ backgroundColor: 'var(--transparent)' }}>
          {/* Instructions with Demo Carousel */}
          {!videoUrl && (
          <div className="py-4">
            {/* Record/Upload Buttons */}
            <div className="text-center mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--transparent)' }}>
                  <strong>Record Live</strong>
                  <p className="text-xs font-normal" style={{ color: 'var(--transparent)' }}>Start your camera to record new movement</p>
                  <Dialog.Root open={showLiveModal} onOpenChange={setShowLiveModal}>
                    <Dialog.Trigger asChild>
                      <button
                        className="px-2 py-2 mt-2 rounded-md font-medium text-xs transition cursor-pointer"
                        style={{
                          background: 'var(--secondary-button-bg)',
                          color: 'var(--secondary-button-text)',
                          border: '2px solid var(--secondary-button-border)'
                        }}
                      >
                        📹 Record Live
                      </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                      <Dialog.Content
                        className="fixed inset-0 z-50 flex flex-col"
                        style={{ width: '100vw', height: '100vh', padding: 0, background: 'rgba(24,24,27,0.92)' }}
                      >
                        <button
                          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black focus:outline-none"
                          aria-label="Close"
                          type="button"
                          onClick={() => setShowLiveModal(false)}
                        >
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                        <div className="flex flex-col items-center justify-center w-full h-full relative">
                          <Dialog.Title className="text-sm font-regular text-white pt-2 pb-2" style={{ maxWidth: '400px', textAlign: 'center' }}>Live Recording</Dialog.Title>
                          <Dialog.Description className="text-xs font-regular text-white pb-4" style={{ maxWidth: '400px', textAlign: 'center' }}>For best results, connect your phone to your browser as a webcam (Apple's Continuity Camera feature is recommended) and use a tripod. Ensure that your body is in frame and you are in a well-lit environment.</Dialog.Description>
                          <div className="flex items-center justify-center w-full">
                            <LiveVideoPlayer
                              onRecordingComplete={handleRecordingComplete}
                              onMethodChange={() => setShowLiveModal(false)}
                              referenceAngles={undefined}
                              exercise={null}
                            />
                          </div>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--transparent)' }}>
                  <strong>Upload Video</strong>
                  <p className="text-xs font-normal" style={{ color: 'var(--transparent)' }}>Upload MP4 or MOV video files to analyze</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-2 mt-2 rounded-md font-medium text-xs transition cursor-pointer"
                    style={{
                      background: 'var(--primary-button-bg)',
                      color: 'var(--primary-button-text)',
                      border: '2px solid var(--primary-button-border)'
                    }}
                  >
                    📁 Upload Video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Demo Carousel Section */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-center mb-4" style={{ color: 'var(--foreground)' }}>
                Guidlines for Motion Videos:
              </h3>
              
              {/* Carousel Container */}
              <div className="relative mx-auto" style={{ width: 'fit-content', maxWidth: '300px' }}>
                {/* Carousel Slides */}
                <div className="overflow-hidden rounded-lg">
                  <div 
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${currentDemoSlide * 100}%)` }}
                  >
                    {demoSlides.map((slide) => (
                      <div key={slide.id} className="w-full flex-shrink-0">
                        <div className="flex flex-col items-center">
                          {/* Demo Image - Scaled Down 70% */}
                          <div className="w-full mx-auto mb-2" style={{ maxWidth: '70%' }}>
                            <div className="aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                              <img 
                                src={slide.image}
                                alt={slide.title}
                                className="w-full object-contain"
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          </div>
                          
                          {/* Slide Content */}
                          <div className="text-center px-2">
                            <h4 className="font-medium mb-1 text-sm" style={{ color: 'var(--foreground)' }}>
                              {slide.title}
                            </h4>
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>
                              {slide.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Carousel Navigation Dots */}
                <div className="flex justify-center mt-4 space-x-2">
                  {demoSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentDemoSlide(index)}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{
                        backgroundColor: index === currentDemoSlide 
                          ? 'var(--primary, #3b82f6)' 
                          : 'var(--muted, #d1d5db)'
                      }}
                    />
                  ))}
                </div>
                
                {/* Navigation Arrows - Positioned closer to video */}
                <button
                  onClick={() => setCurrentDemoSlide(prev => 
                    prev === 0 ? demoSlides.length - 1 : prev - 1
                  )}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 rounded-full p-2 shadow-lg hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--background, #ffffff)', color: 'var(--foreground, #000000)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentDemoSlide(prev => 
                    prev === demoSlides.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full p-2 shadow-lg hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--background, #ffffff)', color: 'var(--foreground, #000000)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Video Preview */}
        {videoUrl && (
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-auto max-h-96"
                style={{ display: 'block' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: 'none' }}
              />
            </div>
            
            {/* Process Video Button */}
            {!isAnalyzing && allPoses.length === 0 && (
              <div className="mt-4 text-center">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => processRecordedVideo(videoUrl)}
                    className="px-2 py-2 rounded-lg font-medium text-xs text-white cursor-pointer"
                    style={{
                      background: 'var(--secondary-button-bg)',
                      color: 'var(--secondary-button-text)',
                      border: '2px solid var(--secondary-button-border)'
                    }}
                  >
                    Process Video
                  </button>
                  <button
                    onClick={redoVideo}
                    className="px-2 py-2 rounded-lg font-medium text-xs text-white cursor-pointer"
                    style={{
                      background: 'var(--danger-button-bg, #dc2626)',
                      color: 'var(--danger-button-text, #ffffff)',
                      border: '2px solid var(--danger-button-border, #dc2626)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center mt-2" style={{ color: 'var(--foreground)' }}>
                  Analyzing motion... {Math.round(analysisProgress)}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Extract Motion Button */}
        {videoUrl && allPoses.length > 0 && !isAnalyzing && (
          <div className="text-center">
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleExtractMotion}
                className="px-4 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                style={{
                  background: 'var(--secondary-button-bg)',
                  color: 'var(--secondary-button-text)',
                  border: '2px solid var(--secondary-button-border)'
                }}
              >
                See Motion Analysis
              </button>
              <button
                onClick={redoVideo}
                className="px-4 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                style={{
                  background: 'var(--danger-button-bg, #dc2626)',
                  color: 'var(--danger-button-text, #ffffff)',
                  border: '2px solid var(--danger-button-border, #dc2626)'
                }}
              >
                Re-do Video
              </button>
            </div>
          </div>
        )}

        {/* Live Recording Preview Modal */}
        <Dialog.Root open={showLiveRecordingPreview} onOpenChange={setShowLiveRecordingPreview}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content
              className="fixed inset-0 z-50 flex flex-col"
              style={{ width: '100vw', height: '100vh', padding: 0, background: 'rgba(24,24,27,0.92)' }}
            >
              <button
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black focus:outline-none"
                aria-label="Close"
                type="button"
                onClick={handleCancelLiveRecording}
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              
              <div className="flex flex-col items-center justify-center w-full h-full relative">
                <Dialog.Title className="text-sm font-normal pt-6 pb-4 text-white">
                  Review Your Recording
                </Dialog.Title>
                
                <div className="flex-1 flex flex-col items-center w-full max-w-2xl px-4 min-h-0">
                  
                  {/* Video Preview */}
                  <div className="flex flex-col w-full flex-shrink-0">
                    <div className="relative w-full" style={{ maxHeight: '60vh' }}>
                    {!isAnalyzing ? (
                      // Show video when not analyzing
                      liveRecordingDuration && liveRecordingUrl ? (
                        <LiveRecordingVideo 
                          src={liveRecordingUrl} 
                          duration={liveRecordingDuration} 
                        />
                      ) : (
                        <video
                          src={liveRecordingUrl || undefined}
                          controls
                          controlsList="nodownload nofullscreen noremoteplayback"
                          disablePictureInPicture
                          className="rounded w-full h-auto"
                          style={{ maxHeight: '60vh', objectFit: 'contain' }}
                          autoPlay
                          muted
                        />
                      )
                    ) : (
                      // Show loading placeholder during analysis
                      <div className="w-full h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                          <p className="text-white text-lg">Processing your recording...</p>
                        </div>
                      </div>
                    )}
                    </div>
                    
                    {/* Analysis Progress */}
                    {isAnalyzing && (
                      <div className="w-full my-4 flex-shrink-0">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-white mb-2">Processing Video...</h3>
                          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${analysisProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-white">{analysisProgress}% complete</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-row flex-wrap gap-4 mt-4 mb-6 justify-center flex-shrink-0">
                      {!isAnalyzing ? (
                        <>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'var(--primary-button-bg)',
                              color: 'var(--primary-button-text)',
                              border: '2px solid var(--primary-button-border)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--primary-button-hover-bg)';
                              e.currentTarget.style.color = 'var(--primary-button-hover-text)';
                              e.currentTarget.style.borderColor = 'var(--primary-button-hover-border)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'var(--primary-button-bg)';
                              e.currentTarget.style.color = 'var(--primary-button-text)';
                              e.currentTarget.style.borderColor = 'var(--primary-button-border)';
                            }}
                            onClick={handleAnalyzeLiveRecording}
                          >
                            Process Video
                          </button>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'var(--secondary-button-bg)',
                              color: 'var(--secondary-button-text)',
                              border: '2px solid var(--secondary-button-border)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--secondary-button-hover-bg)';
                              e.currentTarget.style.color = 'var(--secondary-button-hover-text)';
                              e.currentTarget.style.borderColor = 'var(--secondary-button-hover-border)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'var(--secondary-button-bg)';
                              e.currentTarget.style.color = 'var(--secondary-button-text)';
                              e.currentTarget.style.borderColor = 'var(--secondary-button-border)';
                            }}
                            onClick={handleRetakeLiveRecording}
                          >
                            Re-Take
                          </button>
                          <button
                            className="px-6 py-3 rounded text-sm font-bold transition cursor-pointer"
                            style={{
                              background: 'transparent',
                              color: 'white',
                              border: '2px solid #6B7280'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = '#6B7280';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                            onClick={handleCancelLiveRecording}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-center text-white">
                          Please wait while we process your video...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>


    </div>
  );
}
