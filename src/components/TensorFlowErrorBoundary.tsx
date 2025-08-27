"use client";
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class TensorFlowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a TensorFlow-related error
    const isTensorFlowError = 
      error.message.includes('fetch') ||
      error.message.includes('webgl') ||
      error.message.includes('tensorflow') ||
      error.message.includes('pose-detection') ||
      error.message.includes('Failed to fetch');
    
    return { 
      hasError: isTensorFlowError, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TensorFlow Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-lg font-semibold mb-2">
            TensorFlow Model Loading Error
          </div>
          <div className="text-red-500 text-sm text-center mb-4">
            Unable to load the pose detection model. This might be due to:
          </div>
          <ul className="text-red-500 text-sm text-left space-y-1 mb-4">
            <li>• Network connectivity issues</li>
            <li>• Browser compatibility problems</li>
            <li>• Temporary service unavailability</li>
          </ul>
          <div className="text-red-500 text-sm text-center">
            Please try refreshing the page or check your internet connection.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
