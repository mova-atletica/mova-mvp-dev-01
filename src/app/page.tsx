"use client";
import { useState, useEffect } from 'react';
import ExerciseCarousel from '../components/ExerciseCarousel';
import { fetchCuratedSections, fetchFeaturedContent, fetchExerciseById, CuratedSection, FeaturedContent } from '../lib/exerciseService';
import { Exercise } from '../data/exercises';

export default function Home() {
  const [sections, setSections] = useState<CuratedSection[]>([]);
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent | null>(null);
  const [featuredExercise, setFeaturedExercise] = useState<Exercise | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                console.error('Failed to get signed URL for hero image');
                setHeroImageUrl(featured.heroImage); // Fallback to original
              }
            } catch (error) {
              console.error('Error getting signed URL:', error);
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
        console.error('Error loading content:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--foreground)' }} className="text-xl">Loading exercise library...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--error)' }} className="text-xl">{error}</div>
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
      {/* Page Header */}
      <div
        className="px-0 mb-8 pt-24"
        style={{
          marginLeft: '3%',
          marginRight: '3%',
          marginTop: '21px',
        }}
      >
          <h1 className="text-3xl font-light mb-2" style={{ color: 'var(--section-title)' }}>
            Mova Exercise Library
          </h1>
          <p className="text-l" style={{ color: 'var(--section-subtitle)' }}>
            Discover curated exercises with biomechanical analysis and real-time feedback.
          </p>
        </div>

              {/* Featured Section - Netflix Style with Header Overlay */}
      {featuredContent && (
        <div className="relative overflow-hidden mx-auto rounded-lg" style={{ 
          height: '57vh', 
          maxWidth: '2560px', 
          marginTop: '0px', 
          marginLeft: '3%', 
          marginRight: '3%', 
          width: '94%',
          background: 'linear-gradient(to right, var(--surface), var(--surface-hover))'
        }}>
          {/* Background Image - Bleeds to top */}
          {heroImageUrl && (
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url(${heroImageUrl})`,
                filter: 'blur(1px) brightness(0.7)',
                width: '100%',
                height: '100%',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          )}
          
          {/* Horizontal Black Gradient Overlay */}
          <div className="absolute inset-0 h-full rounded-lg" style={{ 
            zIndex: 5, 
            background: `linear-gradient(to right, var(--featured-overlay), var(--featured-overlay-light), var(--featured-overlay-transparent))`
          }} />
          
          {/* Gradient Overlay - Enhanced for header overlay effect */}
          <div className="absolute inset-0 h-full" style={{ 
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
                    {featuredExercise.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full text-sm backdrop-blur-sm" style={{ 
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
                        onClick={() => window.location.href = `/try/${featuredContent.exerciseId}`}
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
                        {featuredContent.ctaText}
                      </button>
                      <button 
                        onClick={() => window.location.href = `/exercises/${featuredContent.exerciseId}`}
                        className="px-6 py-3 rounded-lg font-regular transition-all duration-200 cursor-pointer backdrop-blur-sm"
                        style={{ 
                          backgroundColor: 'rgba(53, 56, 57, 0)', 
                          color: 'rgba(245, 246, 247, 1)',
                          border: '1px solid #c0c9cc',
                          transform: 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#181a1a';
                          e.currentTarget.style.color = '#D7D8D9';
                          e.currentTarget.style.transform = 'scale(1.03)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(53, 56, 57, 0)';
                          e.currentTarget.style.color = 'rgba(245, 246, 247, 1)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Learn More
                      </button>
                    </>
                  ) : featuredContent.ctaUrl ? (
                    <button 
                      onClick={() => window.location.href = featuredContent.ctaUrl!}
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
                      onClick={() => window.location.href = '/exercises'}
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

      {/* Exercise Categories */}
      <div className="mx-auto py-0 mt-[30px]" style={{ maxWidth: '2560px', marginLeft: '3%', marginRight: '3%', width: '94%' }}>
        {/* Exercise Carousels */}
        {sections.map((section, index) => (
          <div key={section.id} style={{ 
            marginTop: index === 0 ? '36px' : '36px', 
            marginBottom: index === 0 ? '36px' : '36px' 
          }}>
            <ExerciseCarousel
              title={section.title}
              exercises={section.exercises}
            />
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
