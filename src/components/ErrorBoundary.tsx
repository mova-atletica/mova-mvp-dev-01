"use client";
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Here you could send to an error logging service
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-md w-full rounded-lg p-8 border" style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full mb-6" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <svg className="w-10 h-10" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-thin text-center mb-3" style={{ color: 'var(--foreground)' }}>
          Something went wrong
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--muted)' }}>
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
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
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-md font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: 'var(--secondary-button-bg)', 
              color: 'var(--secondary-button-text)',
              border: '1px solid var(--secondary-button-border)'
            }}
          >
            Refresh Page
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-8 p-4 rounded text-xs border" style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--foreground)' }}>Error Details (Development)</summary>
            <pre className="mt-3 whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>{error.message}</pre>
            <pre className="mt-2 whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>{error.stack}</pre>
          </details>
        )}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Mova • Motion Analysis Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
