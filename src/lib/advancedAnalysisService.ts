// Advanced Analysis Service for Python Backend Integration

export interface AdvancedAnalysisRequest {
  user_angles: { [key: string]: (number | null)[] };
  reference_angles: { [key: string]: (number | null)[] };
  joints_of_interest: string[];
  exercise_name: string;
  exercise_type?: 'repetition' | 'pose' | 'flow';
  exercise_data?: any; // Add exercise data for rep counting
  pose_analysis?: any; // Add pose analysis data for pose exercises
  metadata?: {
    video_duration?: number;
    frame_count?: number;
    recording_timestamp?: string;
    user_id?: string;
  };
}

export interface AdvancedAnalysisResult {
  overall_score: number;
  grade: string;
  confidence: number;
  joint_analysis: {
    [joint: string]: {
      dtw_score: number;
      cosine_similarity: number;
      cosine_score: number;
      rom_score: number;
      user_rom: number;
      ref_rom: number;
    };
  };
  tempo_analysis: {
    [joint: string]: {
      tempo_score: number;
      velocity_ratio: number;
      user_avg_velocity: number;
      ref_avg_velocity: number;
    };
  };
  balance_metrics: {
    stability_score: number;
    symmetry_score: number;
    sway_metrics: {
      variance: number;
      velocity: number;
      mean_angle: number;
      std_angle: number;
    };
  };
  repetition_analysis: {
    [joint: string]: {
      rep_count: number;
      reps: Array<{
        start_frame: number;
        end_frame: number;
        duration: number;
        rom: number;
        mean_angle: number;
        std_angle: number;
      }>;
      consistency: number;
      avg_duration: number;
      avg_rom: number;
    };
  };
  // Unified rep counting results
  unified_rep_analysis?: {
    rep_count: number;
    rep_boundaries: Array<{
      start_frame: number;
      end_frame: number;
      start_time: number;
      end_time: number;
      quality: number;
      rep_index: number;
    }>;
    rep_phases: Array<{
      name: string;
      start_frame: number;
      end_frame: number;
      start_time: number;
      end_time: number;
    }>;
  };
  // Pose analysis results
  pose_analysis?: {
    overall_accuracy: number;
    joint_accuracy: {
      [joint: string]: {
        accuracy_score: number;
        target_angle: number;
        user_avg_angle: number;
        angle_deviation: number;
        in_range_percentage: number;
        hold_duration: number;
        stability_score: number;
      };
    };
    hold_periods: Array<{
      joint: string;
      start_frame: number;
      end_frame: number;
      duration: number;
      accuracy: number;
    }>;
    pose_quality: {
      balance_score: number;
      symmetry_score: number;
      stability_score: number;
    };
  };
  // Flow analysis results
  flow_analysis?: {
    dtw_scores: {
      [joint: string]: {
        score: number;
        distance: number;
        normalized_distance: number;
        user_length: number;
        ref_length: number;
      };
    };
    cosine_scores: {
      [joint: string]: {
        score: number;
        similarity: number;
        user_mean: number;
        ref_mean: number;
        user_std: number;
        ref_std: number;
      };
    };
    movement_quality: {
      [joint: string]: {
        score: number;
        smoothness: number;
        consistency: number;
        variance: number;
        mean_angle: number;
        std_angle: number;
      };
    };
    overall_flow_score: number;
    flow_quality: {
      balance_score: number;
      symmetry_score: number;
      stability_score: number;
    };
  };
  improvement_suggestions: string[];
  detailed_charts: {
    [chart_name: string]: string; // Base64 encoded charts
  };
}

class AdvancedAnalysisService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
    console.log('🔍 AdvancedAnalysisService initialized with baseUrl:', this.baseUrl);
  }

  async analyzeExercise(request: AdvancedAnalysisRequest): Promise<AdvancedAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        //mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          // Convert null values to NaN for Python compatibility
          user_angles: this.convertNullsToNaN(request.user_angles),
          reference_angles: this.convertNullsToNaN(request.reference_angles),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Add unified rep counting to the result
      const enhancedResult = await this.addUnifiedRepCounting(result, request);
      
      return enhancedResult;
    } catch (error) {
      //console.error('Advanced analysis error:', error);
      throw error;
    }
  }

  private async addUnifiedRepCounting(result: AdvancedAnalysisResult, request: AdvancedAnalysisRequest): Promise<AdvancedAnalysisResult> {
    try {
      // Import the unified rep counting utilities
      const { analyzeRepetitions } = await import('./repCountingUtils');
      
      // Convert user angles to frame data format
      const frameData = this.convertAnglesToFrameData(request.user_angles);
      
      // Use the actual exercise data if provided, otherwise create a basic exercise object
      const exercise = request.exercise_data || {
        exerciseType: 'repetition', // Default to repetition
        jointsOfInterest: request.joints_of_interest,
        repAnalysis: {
          jointAngleRules: JSON.stringify({
            repCompletion: {
              rightHip: {
                startThreshold: 148,
                completionThreshold: 168,
                returnThreshold: 158,
                hysteresis: 2
              },
              leftHip: {
                startThreshold: 148,
                completionThreshold: 168,
                returnThreshold: 158,
                hysteresis: 2
              }
            }
          })
        }
      };
      
      console.log('🔍 Using exercise data for rep counting:', {
        exerciseType: exercise.exerciseType,
        jointsOfInterest: exercise.jointsOfInterest,
        hasRepAnalysis: !!exercise.repAnalysis,
        jointAngleRules: exercise.repAnalysis?.jointAngleRules,
        exerciseKeys: Object.keys(exercise),
        repAnalysisKeys: exercise.repAnalysis ? Object.keys(exercise.repAnalysis) : null
      });
      
      // Perform unified rep counting
      const unifiedRepAnalysis = analyzeRepetitions(frameData, exercise);
      
      console.log('🔍 Unified rep counting result:', {
        repCount: unifiedRepAnalysis.repCount,
        repBoundariesCount: unifiedRepAnalysis.repBoundaries.length,
        repPhasesCount: unifiedRepAnalysis.repPhases.length
      });
      
      // Add unified rep counting results to the analysis result
      return {
        ...result,
        unified_rep_analysis: {
          rep_count: unifiedRepAnalysis.repCount,
          rep_boundaries: unifiedRepAnalysis.repBoundaries.map(boundary => ({
            start_frame: boundary.startFrame,
            end_frame: boundary.endFrame,
            start_time: boundary.startTime,
            end_time: boundary.endTime,
            quality: boundary.quality,
            rep_index: boundary.repIndex
          })),
          rep_phases: unifiedRepAnalysis.repPhases.map(phase => ({
            name: phase.name,
            start_frame: phase.startFrame,
            end_frame: phase.endFrame,
            start_time: phase.startTime,
            end_time: phase.endTime
          }))
        }
      };
    } catch (error) {
      console.warn('Failed to add unified rep counting:', error);
      return result; // Return original result if unified rep counting fails
    }
  }

  private convertAnglesToFrameData(userAngles: { [key: string]: (number | null)[] }): Array<{ frameIndex: number; time: number; angles: Record<string, number> }> {
    const frameData: Array<{ frameIndex: number; time: number; angles: Record<string, number> }> = [];
    
    // Find the maximum length of any angle array
    const maxFrames = Math.max(...Object.values(userAngles).map(angles => angles.length));
    
    console.log('🔍 convertAnglesToFrameData:', {
      userAnglesKeys: Object.keys(userAngles),
      maxFrames,
      sampleFrame0: Object.fromEntries(
        Object.entries(userAngles).map(([key, angles]) => [key, angles[0]])
      )
    });
    
    for (let i = 0; i < maxFrames; i++) {
      const frameAngles: Record<string, number> = {};
      
      // Extract angle values for this frame and convert to the format expected by rep counting
      for (const [joint, angles] of Object.entries(userAngles)) {
        if (angles[i] !== null && angles[i] !== undefined) {
          // Convert from "leftKneeAngles" format to "leftKnee" format
          const convertedJoint = joint.replace('Angles', '');
          frameAngles[convertedJoint] = angles[i] as number;
        }
      }
      
      frameData.push({
        frameIndex: i,
        time: i / 30, // Assume 30fps
        angles: frameAngles
      });
    }
    
    console.log('🔍 Frame data created:', {
      totalFrames: frameData.length,
      sampleFrame0: frameData[0]?.angles,
      sampleFrame10: frameData[10]?.angles
    });
    
    return frameData;
  }

  async checkBackendHealth(): Promise<boolean> {
    const maxRetries = 3;
    const timeoutMs = 6000; // 6 second timeout
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let timeoutId: NodeJS.Timeout | undefined;
      
      try {
        console.log(`🔍 Checking backend health (attempt ${attempt}/${maxRetries}) at:`, `${this.baseUrl}/health`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(`${this.baseUrl}/health`, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (timeoutId) clearTimeout(timeoutId);
        console.log(`🔍 Backend health response (attempt ${attempt}):`, response.status, response.ok);
        
        if (response.ok) {
          return true;
        }
        
        // If response is not ok, wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000); // Max 3 seconds
          console.log(`⏳ Backend health check failed, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
      } catch (error: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⏰ Backend health check timed out (attempt ${attempt}/${maxRetries})`);
        } else {
          console.warn(`⚠️ Backend health check failed (attempt ${attempt}/${maxRetries}):`, error);
        }
        
        // If this is the last attempt, return false
        if (attempt === maxRetries) {
          console.log('❌ All backend health check attempts failed, falling back to mock data');
          return false;
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`⏳ Retrying backend health check in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    return false;
  }

  private convertNullsToNaN(angles: { [key: string]: (number | null)[] }): { [key: string]: number[] } {
    const converted: { [key: string]: number[] } = {};
    
    for (const [key, values] of Object.entries(angles)) {
      // Filter out null values and only keep valid numbers
      converted[key] = values.filter(value => value !== null) as number[];
    }
    
    return converted;
  }

  // Helper method to prepare analysis data from the current app state
  prepareAnalysisData(
    userAngles: {
      leftKneeAngles: (number | null)[];
      rightKneeAngles: (number | null)[];
      leftHipAngles: (number | null)[];
      rightHipAngles: (number | null)[];
      leftElbowAngles: (number | null)[];
      rightElbowAngles: (number | null)[];
      leftShoulderAbdAngles: (number | null)[];
      rightShoulderAbdAngles: (number | null)[];
      trunkAngles: (number | null)[];
    },
    referenceAngles: {
      leftKneeAngles: (number | null)[];
      rightKneeAngles: (number | null)[];
      leftHipAngles: (number | null)[];
      rightHipAngles: (number | null)[];
      leftElbowAngles: (number | null)[];
      rightElbowAngles: (number | null)[];
      leftShoulderAbdAngles: (number | null)[];
      rightShoulderAbdAngles: (number | null)[];
      trunkAngles: (number | null)[];
    } | null,
    jointsOfInterest: string[],
    exerciseName: string,
    exerciseData?: any, // Add exercise data parameter
    exerciseType?: 'repetition' | 'pose' | 'flow', // Add exercise type parameter
    poseAnalysis?: any, // Add pose analysis parameter
    metadata?: any
  ): AdvancedAnalysisRequest | null {
    // For pose exercises, we don't need reference angles
    if (exerciseType === 'pose') {
      return {
        user_angles: userAngles,
        reference_angles: {}, // Empty for pose exercises
        joints_of_interest: jointsOfInterest,
        exercise_name: exerciseName,
        exercise_type: exerciseType,
        exercise_data: exerciseData,
        pose_analysis: poseAnalysis,
        metadata: {
          ...metadata,
          recording_timestamp: new Date().toISOString(),
        },
      };
    }
    
    // For flow exercises, we need reference angles (like repetition)
    if (exerciseType === 'flow') {
      if (!referenceAngles) {
        return null;
      }
      
      return {
        user_angles: userAngles,
        reference_angles: referenceAngles, // Need reference for DTW/cosine
        joints_of_interest: jointsOfInterest,
        exercise_name: exerciseName,
        exercise_type: exerciseType,
        exercise_data: exerciseData,
        pose_analysis: poseAnalysis,
        metadata: {
          ...metadata,
          recording_timestamp: new Date().toISOString(),
        },
      };
    }
    
    // For repetition exercises, we need reference angles
    if (!referenceAngles) {
      return null;
    }

    return {
      user_angles: userAngles,
      reference_angles: referenceAngles,
      joints_of_interest: jointsOfInterest,
      exercise_name: exerciseName,
      exercise_type: exerciseType,
      exercise_data: exerciseData, // Include exercise data
      pose_analysis: poseAnalysis,
      metadata: {
        ...metadata,
        recording_timestamp: new Date().toISOString(),
      },
    };
  }
}

export const advancedAnalysisService = new AdvancedAnalysisService(); 