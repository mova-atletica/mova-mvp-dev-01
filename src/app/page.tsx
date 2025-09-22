"use client";
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCuratedSections, fetchFeaturedContent, fetchExerciseById, CuratedSection, FeaturedContent } from '../lib/exerciseService';
import { Exercise } from '../data/exercises';

// Lazy load components for better performance
const ExerciseCarousel = lazy(() => import('../components/ExerciseCarousel'));

export default function Home() {
  const router = useRouter();
  const [sections, setSections] = useState<CuratedSection[]>([]);
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent | null>(null);
  const [featuredExercise, setFeaturedExercise] = useState<Exercise | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFeaturedHovered, setIsFeaturedHovered] = useState(false);
  const [isFeaturedVideoLoaded, setIsFeaturedVideoLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const featuredVideoRef = useRef<HTMLVideoElement>(null);
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState<string | null>(null);

  // Level badge colors - same as ExerciseCard
  const LEVEL_COLORS = {
    beginner: { bg: '#FFFFFF', text: '#085900' },
    intermediate: { bg: '#FFFFFF', text: '#F87518' },
    advanced: { bg: '#FFFFFF', text: '#1D4ED8' },
    default: { bg: '#3B82F6', text: '#FFFFFF' }
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

  // Navigation handler with loading state
  const handleExerciseNavigation = (exerciseId: string) => {
    setIsNavigating(true);
    setNavigatingTo(exerciseId);
    router.push(`/exercises/${exerciseId}`);
  };

  const handleExercisesNavigation = () => {
    setIsNavigating(true);
    setNavigatingTo('exercises');
    router.push('/exercises');
  };

  const handleExternalNavigation = (url: string) => {
    setIsNavigating(true);
    setNavigatingTo('external');
    window.location.href = url;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load curated sections and featured content in parallel
        const [curatedSections, featured] = await Promise.all([
          fetchCuratedSections(),
          fetchFeaturedContent()
        ]);
        
        setSections(curatedSections);
        setFeaturedContent(featured);
        
        // Handle hero image URL for GCS images
        if (featured && featured.heroImage) {
          if (featured.heroImage.startsWith('http')) {
            // Direct URL, use as is
            setHeroImageUrl(featured.heroImage);
          } else {
            // GCS path, get signed URL
            try {
              const signedUrlResponse = await fetch('/api/storage/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: featured.heroImage }),
              });
              
              if (signedUrlResponse.ok) {
                const { signedUrl } = await signedUrlResponse.json();
                setHeroImageUrl(signedUrl);
              } else {
                setHeroImageUrl(featured.heroImage); // Fallback to original
              }
            } catch (error) {
              setHeroImageUrl(featured.heroImage); // Fallback to original
            }
          }
        }
        
        // If we have featured content with an exercise link, fetch that exercise
        if (featured && featured.exerciseId) {
          const exercise = await fetchExerciseById(featured.exerciseId);
          setFeaturedExercise(exercise);
        }
        
      } catch (err) {
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Reset navigation state when component unmounts
  useEffect(() => {
    return () => {
      setIsNavigating(false);
      setNavigatingTo(null);
    };
  }, []);

  useEffect(() => {
    if (featuredExercise?.referenceVideoUrl) {
      let url = featuredExercise.referenceVideoUrl;
      if (!url.startsWith('http') && !url.startsWith('blob:')) {
        // Fetch signed URL for GCS path
        fetch('/api/storage/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: url }),
        })
          .then(res => res.json())
          .then(data => setFeaturedVideoUrl(data.signedUrl))
          .catch(() => setFeaturedVideoUrl(null));
      } else {
        setFeaturedVideoUrl(url);
      }
    } else {
      setFeaturedVideoUrl(null);
    }
  }, [featuredExercise?.referenceVideoUrl]);

  // Add handlers for featured video hover
  const handleFeaturedMouseEnter = () => {
    setIsFeaturedHovered(true);
    if (featuredVideoRef.current && featuredVideoUrl) {
      featuredVideoRef.current.currentTime = 0;
      featuredVideoRef.current.play().catch(() => {});
    }
  };
  const handleFeaturedMouseLeave = () => {
    setIsFeaturedHovered(false);
    if (featuredVideoRef.current) {
      featuredVideoRef.current.pause();
      featuredVideoRef.current.currentTime = 0;
    }
  };
  const handleFeaturedVideoLoad = () => {
    setIsFeaturedVideoLoaded(true);
    if (isFeaturedHovered && featuredVideoRef.current) {
      featuredVideoRef.current.play().catch(() => {});
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--foreground)' }} className="text-2xl font-thin">Loading motion library...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--error)' }} className="text-xl font-light">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 rounded hover:transition-all duration-300"
          style={{ 
            backgroundColor: 'var(--button-bg)', 
            color: 'var(--button-text)',
            border: '1px solid var(--button-border)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
            e.currentTarget.style.color = 'var(--button-hover-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--button-bg)';
            e.currentTarget.style.color = 'var(--button-text)';
          }}
        >
          Try Again
        </button>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: 'var(--background)' }}>
      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-2xl font-light text-gray-700">
              {navigatingTo === 'exercises' ? 'Loading exercise library...' : 'Loading motion video...'}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Preparing your exercise experience
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div
        className="px-0 mb-8 pt-0"
        style={{
          marginLeft: '3%',
          marginRight: '3%',
          marginTop: '18px',
        }}
      >
          <h1 className="text-3xl font-light mb-2" style={{ color: 'var(--section-title)' }}>
            Mova Motion Library
          </h1>
          <p className="text-l" style={{ color: 'var(--section-subtitle)' }}>
            Discover curated exercises with biomechanical analysis and real-time feedback.
          </p>
        </div>

              {/* Featured Section - Netflix Style with Header Overlay */}
      {featuredContent && (
        <div
          className="relative overflow-hidden mx-auto rounded-lg"
          style={{
            height: '57vh',
            maxWidth: '2560px',
            marginTop: '0px',
            marginLeft: '3%',
            marginRight: '3%',
            width: '94%',
            background: 'linear-gradient(to right, var(--surface), var(--surface-hover))',
            borderRadius: '8px'
          }}
          onMouseEnter={handleFeaturedMouseEnter}
          onMouseLeave={handleFeaturedMouseLeave}
        >
          {/* Video and image container (no hover handlers here) */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{ borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', zIndex: 1, position: 'absolute' }}
            onClick={() => featuredContent.exerciseId && handleExerciseNavigation(featuredContent.exerciseId)}
          >
            {featuredVideoUrl && isFeaturedHovered && (
              <video
                ref={featuredVideoRef}
                src={featuredVideoUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                onLoadedData={e => { handleFeaturedVideoLoad(); }}
                onError={e => { /* Video error handled silently */ }}
              />
            )}
            {heroImageUrl && (!isFeaturedHovered || !featuredVideoUrl) && (
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${heroImageUrl})`,
                  filter: 'blur(0px) brightness(0.7)',
                  width: '100%',
                  height: '100%',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              />
            )}
          </div>
          {/* overlays, content, etc. */}
          
          {/* Horizontal Black Gradient Overlay */}
          <div className="absolute inset-0 h-full rounded-lg" style={{ 
            zIndex: 5, 
            borderRadius: '8px',
            background: `linear-gradient(to right, var(--featured-overlay), var(--featured-overlay-light), var(--featured-overlay-transparent))`
          }} />
          
          {/* Gradient Overlay - Enhanced for header overlay effect */}
          <div className="absolute inset-0 h-full" style={{ 
            borderRadius: '8px',
            background: 'linear-gradient(to bottom, var(--featured-overlay), var(--featured-overlay-light), transparent)'
          }} />
          
                      {/* Content - Adjusted positioning for header overlay */}
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-md px-4 py-6 rounded-lg" style={{ marginLeft: '60px', backgroundColor: 'rgba(0, 0, 0, 0)' }}>
              <div className="max-w-6xl mx-auto">
                {/* Level Badge - Moved to featured badge location */}
                {featuredExercise && featuredExercise.level && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium mb-4" style={{ 
                    backgroundColor: getLevelBadgeStyle(featuredExercise.level).bg,
                    color: getLevelBadgeStyle(featuredExercise.level).text
                  }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getLevelBadgeStyle(featuredExercise.level).text }}></span>
                    {capitalizeFirst(featuredExercise.level)}
                  </div>
                )}
                
                {/* Title */}
                <h1 className="text-4xl md:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--featured-title)' }}>
                  {featuredContent.title}
                </h1>
                
                {/* Description */}
                <p className="text-l font-regular mb-6 leading-relaxed" style={{ color: 'var(--featured-description)' }}>
                  {featuredContent.description}
                </p>
                
                {/* Tags - Show exercise tags if linked */}
                {featuredExercise && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {featuredExercise.tags.slice(0, 3).map((tag, index) => (
                      <span key={`${tag}-${index}`} className="px-3 py-1 rounded-full text-sm backdrop-blur-sm" style={{ 
                        backgroundColor: 'var(--featured-tag-bg)', 
                        color: 'var(--featured-tag-text)'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* CTA Buttons */}
                <div className="flex gap-6">
                  {featuredContent.exerciseId ? (
                    <>
                      <button 
                        onClick={() => featuredContent.exerciseId && handleExerciseNavigation(featuredContent.exerciseId)}
                        className="px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer"
                        style={{ 
                          backgroundColor: '#eef0f1', 
                          color: '#353839', 
                          border: '1px solid #F3F3F4', 
                          transform: 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#55595b';
                          e.currentTarget.style.color = '#D7D8D9';
                          e.currentTarget.style.transform = 'scale(1.03)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#eef0f1';
                          e.currentTarget.style.color = '#353839';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Learn More
                      </button>
                    </>
                  ) : featuredContent.ctaUrl ? (
                    <button 
                      onClick={() => handleExternalNavigation(featuredContent.ctaUrl!)}
                      className="px-8 py-3 rounded-lg font-bold transition-all duration-300 cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--button-bg)', 
                        color: 'var(--button-text)',
                        border: '1px solid var(--button-border)',
                        transform: 'scale(1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                        e.currentTarget.style.color = 'var(--button-hover-text)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                        e.currentTarget.style.color = 'var(--button-text)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {featuredContent.ctaText}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleExercisesNavigation()}
                      className="px-8 py-3 rounded-lg font-bold transition-all duration-300 cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--button-bg)', 
                        color: 'var(--button-text)',
                        border: '1px solid var(--button-border)',
                        transform: 'scale(1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
                        e.currentTarget.style.color = 'var(--button-hover-text)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                        e.currentTarget.style.color = 'var(--button-text)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {featuredContent.ctaText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Move Section */}
      <div className="mx-auto py-0 mt-[30px]" style={{ maxWidth: '2560px', marginLeft: '3%', marginRight: '3%', width: '94%' }}>
        <div className="mb-6">
          <h2 className="text-2xl font-regular mb-2" style={{ color: 'var(--section-title)' }}>Try Open Move</h2>
          <div className="w-16 h-1 rounded-full" style={{ backgroundColor: 'var(--section-accent)' }}></div>
        </div>
        
        <div 
          className="relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          style={{
            height: '200px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px'
          }}
          onClick={() => router.push('/open-move')}
        >
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="relative z-10 p-8 h-full flex flex-col justify-center text-white">
            <h3 className="text-2xl font-bold mb-2">Click Me!</h3>
            <p className="text-lg mb-4 opacity-90">
              Record or upload any video for motion analysis and exploration
            </p>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <span>Live Recording</span>
              <span>•</span>
              <span>Video Upload</span>
              <span>•</span>
              <span>Simple Motion Analysis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Categories */}
      <div className="mx-auto py-0 mt-[30px]" style={{ maxWidth: '2560px', marginLeft: '3%', marginRight: '3%', width: '94%' }}>
        {/* Exercise Carousels */}
        {sections.filter(section => section && section.id && section.exercises && section.exercises.length > 0).map((section, index) => (
          <div key={section.id} style={{ 
            marginTop: index === 0 ? '36px' : '36px', 
            marginBottom: index === 0 ? '36px' : '36px' 
          }}>
            <Suspense fallback={
              <div className="relative">
                {/* Section Header */}
                <div className="px-4 mb-6">
                  <h2 className="text-2xl font-regular mb-2" style={{ color: 'var(--section-title)' }}>{section.title}</h2>
                  <div className="w-16 h-1 rounded-full" style={{ backgroundColor: 'var(--section-accent)' }}></div>
                </div>
                {/* Loading placeholder */}
                <div className="flex gap-4 px-4 pb-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-shrink-0" style={{ width: '200px' }}>
                      <div 
                        className="rounded-lg animate-pulse" 
                        style={{ 
                          width: '200px', 
                          height: '355px', 
                          backgroundColor: 'var(--surface-hover)'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            }>
              <ExerciseCarousel
                title={section.title}
                exercises={section.exercises}
              />
            </Suspense>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="text-center py-16">
          <div className="text-xl mb-4" style={{ color: 'var(--section-subtitle)' }}>No exercises found</div>
          <p style={{ color: 'var(--muted)' }}>
            No exercises found!
          </p>
        </div>
      )}
    </main>
  );
}
