"use client";
import { useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';

// Lazy load the OpenMovePracticeTab component
const OpenMovePracticeTab = lazy(() => import('./OpenMovePracticeTab').catch(() => ({ default: () => <div>Error loading component</div> })));

export default function OpenMovePage() {
  const router = useRouter();

  return (
    <main style={{ backgroundColor: 'var(--background)', minHeight: '70vh' }}>
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
            Open Move
          </h1>
          <p className="text-l" style={{ color: 'var(--section-subtitle)' }}>
          Record a video or upload any video with a single person (beta) to analyze and explore your body's movements!
          </p>
        </div>

        {/* Practice Tab */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p style={{ color: 'var(--foreground)' }}>Loading Open Move...</p>
            </div>
          </div>
        }>
          <OpenMovePracticeTab />
        </Suspense>
    </main>
  );
}
