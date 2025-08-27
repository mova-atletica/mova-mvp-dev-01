/**
 * Debug utility for TensorFlow.js issues
 */

export interface TensorFlowDebugInfo {
  userAgent: string;
  webglSupported: boolean;
  webglContext: string | null;
  tensorflowAvailable: boolean;
  networkConnectivity: boolean;
  timestamp: string;
}

/**
 * Collects debugging information about the browser environment
 */
export async function collectTensorFlowDebugInfo(): Promise<TensorFlowDebugInfo> {
  const info: TensorFlowDebugInfo = {
    userAgent: navigator.userAgent,
    webglSupported: false,
    webglContext: null,
    tensorflowAvailable: false,
    networkConnectivity: false,
    timestamp: new Date().toISOString()
  };

  // Check WebGL support
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    info.webglSupported = !!gl;
    info.webglContext = gl ? gl.getParameter(gl.VERSION) : null;
  } catch (error) {
    console.error('WebGL check failed:', error);
  }

  // Check TensorFlow.js availability
  try {
    const tf = await import('@tensorflow/tfjs-core');
    info.tensorflowAvailable = !!tf;
  } catch (error) {
    console.error('TensorFlow.js check failed:', error);
  }

  // Check network connectivity
  try {
    const response = await fetch('https://www.google.com/favicon.ico', { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    info.networkConnectivity = true;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
  }

  return info;
}

/**
 * Logs debugging information to console
 */
export function logTensorFlowDebugInfo(info: TensorFlowDebugInfo) {
  console.group('🔍 TensorFlow.js Debug Information');
  console.log('User Agent:', info.userAgent);
  console.log('WebGL Supported:', info.webglSupported);
  console.log('WebGL Context:', info.webglContext);
  console.log('TensorFlow.js Available:', info.tensorflowAvailable);
  console.log('Network Connectivity:', info.networkConnectivity);
  console.log('Timestamp:', info.timestamp);
  console.groupEnd();
}

/**
 * Suggests solutions based on debug information
 */
export function suggestTensorFlowSolutions(info: TensorFlowDebugInfo): string[] {
  const suggestions: string[] = [];

  if (!info.webglSupported) {
    suggestions.push('WebGL is not supported in this browser. Try using a different browser or enabling hardware acceleration.');
  }

  if (!info.tensorflowAvailable) {
    suggestions.push('TensorFlow.js failed to load. Check your internet connection and try refreshing the page.');
  }

  if (!info.networkConnectivity) {
    suggestions.push('Network connectivity issues detected. Check your internet connection.');
  }

  if (info.userAgent.includes('Safari') && !info.userAgent.includes('Chrome')) {
    suggestions.push('Safari may have issues with TensorFlow.js. Try using Chrome or Firefox.');
  }

  if (suggestions.length === 0) {
    suggestions.push('All checks passed. The issue might be temporary. Try refreshing the page.');
  }

  return suggestions;
}
