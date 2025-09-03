import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { collectTensorFlowDebugInfo, logTensorFlowDebugInfo, suggestTensorFlowSolutions } from './debugUtils';

export interface ModelLoadResult {
  detector: poseDetection.PoseDetector;
  backend: string;
}

/**
 * Loads TensorFlow pose detection model with error handling and fallback
 * @param preferredBackend - Preferred backend to use (webgl, cpu, etc.)
 * @param maxRetries - Maximum number of retries for network issues
 * @returns Promise with detector and backend used
 */
export async function loadPoseDetectionModel(
  preferredBackend: 'webgl' | 'cpu' = 'webgl',
  maxRetries: number = 3
): Promise<ModelLoadResult> {
  const backends = preferredBackend === 'webgl' ? ['webgl', 'cpu'] : ['cpu', 'webgl'];
  
  for (const backend of backends) {
    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        if (retry > 0) {
          const delay = Math.pow(2, retry - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`🔄 Retry ${retry}/${maxRetries} for ${backend} backend (waiting ${delay}ms)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`🔄 Loading TensorFlow backend: ${backend}...`);
        await tf.setBackend(backend);
        await tf.ready();
        console.log(`✅ TensorFlow backend ready: ${backend}`);
        
        console.log('🔄 Loading pose detection model...');
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        console.log('✅ Pose detection model loaded successfully');
        
        return { detector, backend };
      } catch (error) {
        console.error(`❌ Failed to load with ${backend} backend (attempt ${retry + 1}/${maxRetries + 1}):`, error);
        
        // If this is the last retry for the last backend, collect debug info and throw the error
        if (retry === maxRetries && backend === backends[backends.length - 1]) {
          console.log('🔍 Collecting debug information...');
          const debugInfo = await collectTensorFlowDebugInfo();
          logTensorFlowDebugInfo(debugInfo);
          
          const suggestions = suggestTensorFlowSolutions(debugInfo);
          console.log('💡 Suggested solutions:', suggestions);
          
          throw new Error(`Failed to load pose detection model with any backend after ${maxRetries + 1} retries. Last error: ${error}`);
        }
        
        // If this is the last retry for this backend, continue to the next backend
        if (retry === maxRetries) {
          console.log(`🔄 Trying next backend...`);
          break;
        }
        
        // Otherwise, continue to the next retry
        console.log(`🔄 Will retry...`);
      }
    }
  }
  
  throw new Error('No backends available');
}

/**
 * Checks if TensorFlow.js is available and ready
 */
/* export async function checkTensorFlowAvailability(): Promise<boolean> {
  try {
    await tf.ready();
    return true;
  } catch (error) {
    console.error('TensorFlow.js not available:', error);
    return false;
  }
} */

/**
 * Gets the current TensorFlow backend
 */
/* export function getCurrentBackend(): string {
  return tf.getBackend();
} */
