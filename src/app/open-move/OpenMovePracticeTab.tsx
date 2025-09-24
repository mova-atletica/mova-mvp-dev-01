"use client";
import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import { getAngleWithConfidence } from '../../lib/analysisUtils';
import { useRouter } from 'next/navigation';

export default function OpenMovePracticeTab() {
  const router = useRouter();
  
  // --- State and refs ---
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRecordedVideo, setIsRecordedVideo] = useState(false);
  const [currentDemoSlide, setCurrentDemoSlide] = useState(0);

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

  // --- Start recording ---
  const startRecording = () => {
    if (webcamRef.current && webcamRef.current.stream) {
      const recorder = new MediaRecorder(webcamRef.current.stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecordedVideo(true);
        // Wait for the video element to load metadata before processing
        const checkAndProcess = () => {
          if (videoRef.current && videoRef.current.readyState >= 1) {
            processRecordedVideo(url);
          } else if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => processRecordedVideo(url);
          } else {
            setTimeout(checkAndProcess, 100);
          }
        };
        setTimeout(checkAndProcess, 100);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      resetAllState();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleStartCamera = () => {
    setCameraActive(true);
    setRecording(false);
    resetAllState();
    setTimeout(() => {
      if (webcamRef.current?.video) {
        const video = webcamRef.current.video;
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      }
    }, 500);
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

  const processRecordedVideo = async (url: string) => {
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
                  <button
                    onClick={handleStartCamera}
                    className="px-2 py-2 mt-2 rounded-md font-medium text-xs transition cursor-pointer"
                    style={{
                      background: 'var(--secondary-button-bg)',
                      color: 'var(--secondary-button-text)',
                      border: '2px solid var(--secondary-button-border)'
                    }}
                  >
                    📹 Start Camera
                  </button>
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

        {/* Camera Preview and Recording Controls */}
        {cameraActive && !videoUrl && (
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                width={640}
                height={480}
                className="w-full h-auto"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: 'none' }}
              />
            </div>
            
            {/* Recording Controls */}
            <div className="flex justify-center gap-4 mt-4">
              {!recording ? (
                <>
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    Start Recording
                  </button>
                  <button
                    onClick={() => setCameraActive(false)}
                    className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300"
                  >
                    Close Camera
                  </button>
                </>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 rounded-lg font-medium text-white bg-gray-600 hover:bg-gray-700"
                >
                  Stop Recording
                </button>
              )}
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
      </div>


    </div>
  );
}
