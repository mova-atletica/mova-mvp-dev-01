"use client";
import { useState, useEffect } from 'react';
import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from "next/link";
import ExerciseCard from '../../../components/ExerciseCard';
import VideoPlayer from '../../../components/VideoPlayer';
import { Exercise } from '../../../data/exercises';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Temporary regular import to test module resolution
import PracticeTab from './PracticeTab';

type Props = {
  params: Promise<{ id: string }>
};

export default function ExerciseDetail({ params }: Props) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [relatedExercises, setRelatedExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [referenceKeypoints, setReferenceKeypoints] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ details: boolean; instructions: boolean }>({
    details: false,
    instructions: false
  });
  const router = useRouter();

  // Reset scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Level badge colors - same as ExerciseCard
  const LEVEL_COLORS = {
    beginner: { bg: '#c0c9cc', text: '#053600' },
    intermediate: { bg: '#c0c9cc', text: '#B54B00' },
    advanced: { bg: '#c0c9cc', text: '#002CAA' },
    default: { bg: '#c0c9cc', text: '#FFFFFF' }
  } as const;

  // Get level badge styling
  const getLevelBadgeStyle = (level: string) => {
    const levelKey = level.toLowerCase() as keyof typeof LEVEL_COLORS;
    return LEVEL_COLORS[levelKey] || LEVEL_COLORS.default;
  };

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Accordion toggle function
  const toggleSection = (section: 'details' | 'instructions') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        setLoading(true);
        
        // Fetch the specific exercise
        const response = await fetch(`/api/exercises/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Exercise not found');
          } else {
            throw new Error('Failed to fetch exercise');
          }
          return;
        }

        const exerciseData = await response.json();
        
        // Convert string arrays back to arrays
        const formattedExercise: Exercise = {
          ...exerciseData,
          tags: Array.isArray(exerciseData.tags) ? exerciseData.tags : (exerciseData.tags ? exerciseData.tags.split(',').filter(Boolean) : []),
          equipment: Array.isArray(exerciseData.equipment) ? exerciseData.equipment : (exerciseData.equipment ? exerciseData.equipment.split(',').filter(Boolean) : []),
          muscleGroups: Array.isArray(exerciseData.muscleGroups) ? exerciseData.muscleGroups : (exerciseData.muscleGroups ? exerciseData.muscleGroups.split(',').filter(Boolean) : []),
          jointsOfInterest: Array.isArray(exerciseData.jointsOfInterest) ? exerciseData.jointsOfInterest : (exerciseData.jointsOfInterest ? exerciseData.jointsOfInterest.split(',').filter(Boolean) : []),
          instructions: Array.isArray(exerciseData.instructions) ? exerciseData.instructions : (exerciseData.instructions ? JSON.parse(exerciseData.instructions) : []),
          relatedExercises: Array.isArray(exerciseData.relatedExercises) ? exerciseData.relatedExercises : (exerciseData.relatedExercises ? exerciseData.relatedExercises.split(',').filter(Boolean) : []),
          author: { name: exerciseData.authorName || 'Unknown', profileUrl: exerciseData.authorProfileUrl }
        };

        setExercise(formattedExercise);

        // Get signed URL for image if it's a Google Cloud Storage path
        if (formattedExercise.image && !formattedExercise.image.startsWith('http') && !formattedExercise.image.startsWith('/')) {
          try {
            const signedUrlResponse = await fetch('/api/storage/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: formattedExercise.image }),
            });
            
            if (signedUrlResponse.ok) {
              const { signedUrl } = await signedUrlResponse.json();
              setImageUrl(signedUrl);
            } else {
              setImageUrl(formattedExercise.image);
            }
          } catch (error) {
            console.error('Error getting signed URL:', error);
            setImageUrl(formattedExercise.image);
          }
        } else {
          setImageUrl(formattedExercise.image);
        }

        // Get video URL if reference video exists
        if (formattedExercise.referenceVideoUrl) {
          try {
            const videoProxyUrl = `/api/storage/video-proxy?fileName=${encodeURIComponent(formattedExercise.referenceVideoUrl)}`;
            setVideoUrl(videoProxyUrl);
          } catch (error) {
            console.error('Error setting up video URL:', error);
          }
        }

        // Load reference keypoints if available
        if (formattedExercise.referenceKeypointsUrl) {
          try {
            console.log('Loading keypoints from:', formattedExercise.referenceKeypointsUrl);
            fetch('/api/storage/proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: formattedExercise.referenceKeypointsUrl }),
            })
              .then(res => {
                if (!res.ok) throw new Error('Failed to fetch reference keypoints');
                return res.json();
              })
              .then(data => {
                console.log('Loaded keypoints:', data);
                setReferenceKeypoints(data);
              })
              .catch((error) => {
                console.error('Error loading keypoints:', error);
                setReferenceKeypoints([]);
              });
          } catch (error) {
            console.error('Error loading reference keypoints:', error);
            setReferenceKeypoints([]);
          }
        }

        // Fetch related exercises if any
        if (formattedExercise.relatedExercises.length > 0) {
          const relatedResponse = await fetch('/api/exercises');
          if (relatedResponse.ok) {
            const allExercises = await relatedResponse.json();
            const related = allExercises
              .filter((ex: any) => formattedExercise.relatedExercises.includes(ex.id))
              .map((ex: any) => ({
                ...ex,
                tags: Array.isArray(ex.tags) ? ex.tags : (ex.tags ? ex.tags.split(',').filter(Boolean) : []),
                equipment: Array.isArray(ex.equipment) ? ex.equipment : (ex.equipment ? ex.equipment.split(',').filter(Boolean) : []),
                muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups : (ex.muscleGroups ? ex.muscleGroups.split(',').filter(Boolean) : []),
                jointsOfInterest: Array.isArray(ex.jointsOfInterest) ? ex.jointsOfInterest : (ex.jointsOfInterest ? ex.jointsOfInterest.split(',').filter(Boolean) : []),
                instructions: Array.isArray(ex.instructions) ? ex.instructions : (ex.instructions ? JSON.parse(ex.instructions) : []),
                relatedExercises: Array.isArray(ex.relatedExercises) ? ex.relatedExercises : (ex.relatedExercises ? ex.relatedExercises.split(',').filter(Boolean) : []),
                author: { name: ex.authorName || 'Unknown', profileUrl: ex.authorProfileUrl }
              }));
            setRelatedExercises(related);
          }
        }

      } catch (err) {
        console.error('Error fetching exercise:', err);
        setError('Failed to load exercise');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-onyx-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-onyx-10 text-xl">Loading exercise...</div>
      </main>
    );
  }

  if (error || !exercise) {
    return (
      <main className="min-h-screen bg-onyx-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-red-600 text-xl mb-4">{error || 'Exercise not found'}</div>
        <Link href="/" className="text-blue-70 underline">
          ← Back to Library
        </Link>
      </main>
    );
  }

  return (
    <main 
      className="min-h-screen bg-onyx-100 flex flex-col items-left px-0 py-0 bg-onyx-90 rounded-lg p-0"
      style={{
        maxWidth: '2560px',
        marginLeft: '3%',
        marginRight: '3%',
        width: '94%'
      }}
    >
        {/* Page Header */}
        <div className="mb-0 px-0 py-4 flex flex-row flex-wrap gap-2" style={{ border: '0px transparent' }}>
          
          <div style={{ border: '0px transparent', padding: '0rem', borderRadius: '0px', marginBottom: '0', flex: 1 }}>
            {/* Level Badge and Tags - moved above title */}
            <div className="flex flex-wrap gap-2 p-0" style={{ border: '0px transparent', margin: 0 }}>
              <span 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: getLevelBadgeStyle(exercise.level).bg,
                  color: getLevelBadgeStyle(exercise.level).text,
                  margin: "0rem",
                  border: '1px solid #f3f3f4'
                }}
              >
                {capitalizeFirst(exercise.level)}
              </span>
            </div>
            <div style={{ border: '0px transparent', padding: '10px 0px 0px 0px', margin: 0 }}>
              <h1 className="text-4xl font-light text-onyx-10" style={{ padding: '0rem 0rem 0rem 0rem', margin: 0 }}>{exercise.title}</h1>
              {/* Author Info - moved here */}
              <div className="pt-0" style={{ marginBottom: '12px' , padding: 0}}>
                <span className="text-xs font-thin" style={{ color: 'var(--accordion-text)' }}>by: </span>
                {exercise.author.profileUrl ? (
                  <a href={exercise.author.profileUrl} target="_blank" rel="noopener noreferrer" className="text-onyx-30 hover:text-blue-800 underline text-xs font-medium">
                    {exercise.author.name}
                  </a>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--accordion-text)' }}>{exercise.author.name}</span>
                )}
              </div>
              <p className="text-onyx-30 text-xs font-regular" style={{ margin: 0 }}>{exercise.description}</p>
            </div>
            {/* Exercise Details - moved here */}
            <div 
              className="w-full"
              style={{
                backgroundColor: 'transparent',
                border: '0px transparent',
                borderRadius: '0px',
                margin: 0,
                padding: '1.5rem 0'
              }}
            >
              <div className="space-y-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--accordion-text)' }}>Equipment</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercise.equipment.map(item => (
                        <span key={item} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--accordion-text)' }}>Muscle Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercise.muscleGroups.map(muscle => (
                        <span key={muscle} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Joints of Interest */}
                {exercise.jointsOfInterest.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--accordion-text)' }}>Joints of Interest</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercise.jointsOfInterest.map(joint => (
                        <span key={joint} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                          {joint}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Practice Section - moved to purple-bordered div */}
            <div className="w-full min-w-0" style={{ marginTop: '0px', paddingBottom: '21px' }}>
              <PracticeTab exercise={exercise} router={router} />
            </div>
            {/* Instructions Accordion - moved below PracticeTab */}
            <div className="flex flex-row flex-wrap p-0 m-0" style={{ border: '0px transparent', columnGap: '18px', marginTop: '12px' }}>
              {/* Instructions Accordion */}
              <div 
                className="transition-all duration-300 ease-in-out overflow-hidden flex-1"
                style={{
                  backgroundColor: 'var(--accordion-bg)',
                  border: '1px solid var(--accordion-border)',
                  boxShadow: 'var(--accordion-shadow)',
                  borderRadius: '3px',
                  //margin: 0,
                  //padding: 0
                }}
              >
                <button
                  onClick={() => toggleSection('instructions')}
                  className="w-full flex items-center justify-between text-left transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--accordion-bg)',
                    color: 'var(--accordion-text)',
                    margin: 0,
                    padding: '0.60rem 1rem', // py-3 px-4
                    //minHeight: '48px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    width: '100%'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--accordion-hover-bg)';
                    e.currentTarget.style.boxShadow = 'var(--accordion-shadow-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'var(--accordion-bg)';
                    e.currentTarget.style.boxShadow = 'var(--accordion-shadow)';
                  }}
                >
                  <div className="flex items-center gap-3 m-0 p-0">
                    <h3 className="text-xs font-semibold m-0 p-0" style={{ color: 'var(--accordion-text)' }}>Instructions on Form</h3>
                  </div>
                  <svg 
                    className="w-4 h-4 transition-transform duration-300"
                    style={{ 
                      transform: expandedSections.instructions ? 'rotate(180deg)' : 'rotate(0deg)',
                      color: 'var(--accordion-chevron)'
                    }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Only add padding to the expanded content area */}
                <div 
                  className="overflow-hidden transition-all duration-300 ease-in-out w-full"
                  style={{
                    maxHeight: expandedSections.instructions ? '500px' : '0px',
                    opacity: expandedSections.instructions ? 1 : 0,
                    padding: expandedSections.instructions ? '1rem 1rem 1rem 1rem' : '0',
                    margin: 0
                  }}
                >
                  <div className="w-full">
                    <ol className="space-y-2" style={{ color: 'var(--accordion-text)' }}>
                      {exercise.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </span>
                          <span className="text-sm leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Video/Image - Moved from left column */}
          <div className="mb-0 border-0 p-0 w-full" style={{ minWidth: 360, flex: 1 , height: '80vh' }}>
            {videoUrl ? (
              <div style={{ border: '0px transparent', height: '80vh' }}>
                <VideoPlayer 
                  className="h-[72vh]"
                  videoUrl={videoUrl}
                  aspectRatio="auto"
                  keypointData={referenceKeypoints}
                />
              </div>
            ) : (
              <div className="h-full" style={{ border: '2px solid blue' }}>
                <img src={imageUrl} alt={exercise.title} className="w-full h-80 object-cover rounded-lg" />
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        {/* Related Exercises */}
        {relatedExercises.length > 0 && (
          <div className="mt-2 p-0" style={{ borderTop: '1px solid gray', paddingTop: '12px' }}>
            <h2 className="text-2xl font-regular text-onyx-10 mb-4">Related Exercises</h2>
            <div className="flex flex-wrap gap-8" style={{ gap: '15px' }}>
              {relatedExercises.map(rel => (
                <ExerciseCard key={rel.id} exercise={rel} />
              ))}
            </div>
          </div>
        )}

        {/* Back to Library */}
        <div className="mt-8 mb-2 text-center border-2 border-gray-400">
          <Link href="/" className="text-sm font-regular">
            ← Back to Library
          </Link>
        </div>
    </main>
  );
}
