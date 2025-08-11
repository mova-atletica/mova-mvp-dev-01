// Advanced Analysis Service for Python Backend Integration

export interface AdvancedAnalysisRequest {
  user_angles: { [key: string]: (number | null)[] };
  reference_angles: { [key: string]: (number | null)[] };
  joints_of_interest: string[];
  exercise_name: string;
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
      return result;
    } catch (error) {
      //console.error('Advanced analysis error:', error);
      throw error;
    }
  }

  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
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
    metadata?: any
  ): AdvancedAnalysisRequest | null {
    if (!referenceAngles) {
      return null;
    }

    return {
      user_angles: userAngles,
      reference_angles: referenceAngles,
      joints_of_interest: jointsOfInterest,
      exercise_name: exerciseName,
      metadata: {
        ...metadata,
        recording_timestamp: new Date().toISOString(),
      },
    };
  }
}

export const advancedAnalysisService = new AdvancedAnalysisService(); 