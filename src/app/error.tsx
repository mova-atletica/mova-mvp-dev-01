"use client";
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-md w-full rounded-lg p-8 text-center border" style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full mb-6" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <svg className="w-10 h-10" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-3xl font-thin mb-3" style={{ color: 'var(--foreground)' }}>Error</h1>
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--foreground)' }}>Something went wrong</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          An unexpected error occurred while loading this page. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-md font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: 'var(--primary-button-bg)', 
              color: 'var(--primary-button-text)',
              border: '1px solid var(--primary-button-border)'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 rounded-md font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)', 
              color: 'var(--secondary-button-text)',
              border: '1px solid var(--secondary-button-border)'
            }}
          >
            Go Home
          </button>
        </div>
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Mova • Motion Analysis Platform
          </p>
        </div>
      </div>
    </div>
  );
}
