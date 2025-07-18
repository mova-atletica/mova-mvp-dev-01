"use client";
import { useState, useRef, useEffect } from 'react';
import ExerciseCard from './ExerciseCard';
import { Exercise } from '../data/exercises';

interface ExerciseCarouselProps {
  title: string;
  exercises: Exercise[];
  className?: string;
}

export default function ExerciseCarousel({ title, exercises, className = "" }: ExerciseCarouselProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = 216; // Adjust based on card width + gap (200px + 16px gap)
    const newScrollLeft = carouselRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const hasOverflow = scrollWidth > clientWidth + 1;
    setShowLeftArrow(hasOverflow && scrollLeft > 0);
    setShowRightArrow(hasOverflow && scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const updateArrows = () => {
      if (!carouselRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const hasOverflow = scrollWidth > clientWidth + 1;
      setShowLeftArrow(hasOverflow && scrollLeft > 0);
      setShowRightArrow(hasOverflow && scrollLeft < scrollWidth - clientWidth - 10);
    };
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [exercises.length]);

  if (exercises.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Section Header */}
      <div className="px-4 mb-6">
        <h2 className="text-2xl font-regular mb-2" style={{ color: 'var(--section-title)' }}>{title}</h2>
        <div className="w-16 h-1 rounded-full" style={{ backgroundColor: 'var(--section-accent)' }}></div>
      </div>
      
      <div className="relative group overflow-hidden">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-50 rounded-full p-3 shadow-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--carousel-arrow-bg)',
              color: 'var(--carousel-arrow-text)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--carousel-arrow-hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--carousel-arrow-bg)';
            }}
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-50 rounded-full p-3 shadow-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--carousel-arrow-bg)',
              color: 'var(--carousel-arrow-text)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--carousel-arrow-hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--carousel-arrow-bg)';
            }}
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-6 relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingTop: '9px', paddingBottom: '18px' }}
        >
          {exercises.map((exercise) => (
            <div key={exercise.id} className="flex-shrink-0" style={{ width: '200px', padding: '0px' }}>
              <ExerciseCard exercise={exercise} />
            </div>
          ))}
        </div>
        

      </div>
    </div>
  );
} 