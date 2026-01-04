"use client";
import { lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { forwardRef } from 'react';
import type { OpenMovePracticeTabHandle } from './OpenMovePracticeTab';

// Error fallback component
const ErrorFallback = forwardRef<OpenMovePracticeTabHandle>((props, ref) => {
  return <div>Error loading component</div>;
});
ErrorFallback.displayName = 'ErrorFallback';

// Lazy load the OpenMovePracticeTab component
const OpenMovePracticeTab = lazy(() => 
  import('./OpenMovePracticeTab').catch(() => ({ default: ErrorFallback }))
);

export default function OpenMovePage() {
  const router = useRouter();
  const guidelinesModalRef = useRef<OpenMovePracticeTabHandle | null>(null);

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
            Record/Upload (beta)
          </h1>
          <p className="text-l" style={{ color: 'var(--section-subtitle)' }}>
          Create videos and analyze your body's movements. Record or upload any video to get started. <span 
            className="cursor-pointer underline hover:opacity-80 transition-opacity" 
            style={{ color: 'var(--primary-button-bg)' }}
            onClick={() => guidelinesModalRef.current?.open()}
          >
            Review our filming guidelines to get the best results
          </span>.
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
          <OpenMovePracticeTab ref={guidelinesModalRef} />
        </Suspense>
    </main>
  );
}
