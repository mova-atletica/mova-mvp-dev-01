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
    <div className="mt-8 mb-8 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-md w-[92vw] rounded-lg p-8 text-center">
        <h1 className="text-3xl font-thin mb-3" style={{ color: 'var(--foreground)' }}>Whoops!</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--foreground)' }}>
          An unexpected error occurred while loading this page. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105"
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
            className="px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)', 
              color: 'var(--secondary-button-text)',
              border: '1px solid var(--secondary-button-border)'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
