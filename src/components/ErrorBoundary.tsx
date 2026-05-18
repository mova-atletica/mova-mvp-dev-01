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
    <div className="mt-8 mb-8 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-md w-[92vw] rounded-lg p-8 border" style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 className="text-2xl font-thin text-center mb-3" style={{ color: 'var(--foreground)' }}>
          Whoops!
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--foreground)' }}>
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <div className="flex flex-col gap-3 justify-center">
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
      </div>
    </div>
  );
}

export default ErrorBoundary;
