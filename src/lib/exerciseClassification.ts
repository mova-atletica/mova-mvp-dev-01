export interface ClassificationFeatures {
  peakCount: number;
  peakConsistency: number;
  velocityProfile: {
    staticPeriods: number;
    dynamicPeriods: number;
    smoothness: number;
  };
  jointCoordination: {
    symmetry: number;
    coupling: number;
    correlation: number;
  };
  temporalPatterns: {
    regularity: number;
    returnToStart: number;
    cycleConsistency: number;
  };
  keywordScore: number;
}

export interface ClassificationResult {
  exerciseType: 'repetition' | 'pose' | 'flow';
  exerciseSubtype: string;
  confidence: number;
  features: ClassificationFeatures;
  reasoning: string[];
}

export class EnsembleExerciseClassifier {
  
  public classifyExercise(
    keypoints: any[],
    exerciseTitle: string,
    jointsOfInterest: string[]
  ): ClassificationResult {
    
    // 1. PEAK DETECTION
    const peakFeatures = this.analyzePeaks(keypoints, jointsOfInterest);
    
    // 2. VELOCITY ANALYSIS
    const velocityFeatures = this.analyzeVelocity(keypoints, jointsOfInterest);
    
    // 3. JOINT COORDINATION
    const coordinationFeatures = this.analyzeJointCoordination(keypoints, jointsOfInterest);
    
    // 4. TEMPORAL PATTERNS
    const temporalFeatures = this.analyzeTemporalPatterns(keypoints, jointsOfInterest);
    
    // 5. KEYWORD ANALYSIS
    const keywordScore = this.analyzeKeywords(exerciseTitle);
    
    // 6. ENSEMBLE VOTING
    return this.ensembleVote({
      peakFeatures,
      velocityFeatures,
      coordinationFeatures,
      temporalFeatures,
      keywordScore
    }, exerciseTitle);
  }
  
  private analyzePeaks(keypoints: any[], jointsOfInterest: string[]): any {
    const peaks = {
      count: 0,
      consistency: 0,
      timing: [] as number[]
    };
    
    // Analyze primary joint for peak detection
    const primaryJoint = jointsOfInterest[0];
    const angles = this.extractJointAngles(keypoints, primaryJoint);
    
    if (angles.length === 0) return peaks;
    
    // Find local maxima and minima
    const maxima = this.findLocalMaxima(angles);
    const minima = this.findLocalMinima(angles);
    
    peaks.count = Math.max(maxima.length, minima.length);
    
    // Calculate peak timing consistency
    const allPeaks = [...maxima, ...minima].sort((a, b) => a.frame - b.frame);
    peaks.timing = allPeaks.map(p => p.frame);
    
    if (allPeaks.length > 1) {
      const intervals = [];
      for (let i = 1; i < allPeaks.length; i++) {
        intervals.push(allPeaks[i].frame - allPeaks[i-1].frame);
      }
      const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - meanInterval, 2), 0) / intervals.length;
      peaks.consistency = Math.max(0, 100 - (variance / meanInterval) * 10);
    }
    
    return peaks;
  }
  
  private analyzeVelocity(keypoints: any[], jointsOfInterest: string[]): any {
    const velocity = {
      staticPeriods: 0,
      dynamicPeriods: 0,
      smoothness: 0
    };
    
    const primaryJoint = jointsOfInterest[0];
    const angles = this.extractJointAngles(keypoints, primaryJoint);
    
    if (angles.length < 2) return velocity;
    
    // Calculate velocities
    const velocities = [];
    for (let i = 1; i < angles.length; i++) {
      velocities.push(Math.abs(angles[i] - angles[i-1]));
    }
    
    // Identify static vs dynamic periods
    const velocityThreshold = 2.0;
    let staticCount = 0;
    let dynamicCount = 0;
    
    velocities.forEach(v => {
      if (v < velocityThreshold) {
        staticCount++;
      } else {
        dynamicCount++;
      }
    });
    
    velocity.staticPeriods = staticCount / velocities.length;
    velocity.dynamicPeriods = dynamicCount / velocities.length;
    
    // Calculate smoothness (inverse of velocity variance)
    const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, b) => a + Math.pow(b - meanVelocity, 2), 0) / velocities.length;
    velocity.smoothness = Math.max(0, 100 - variance);
    
    return velocity;
  }
  
  private analyzeJointCoordination(keypoints: any[], jointsOfInterest: string[]): any {
    const coordination = {
      symmetry: 0,
      coupling: 0,
      correlation: 0
    };
    
    if (jointsOfInterest.length < 2) return coordination;
    
    // Analyze symmetry between left/right joints
    const leftJoints = jointsOfInterest.filter(j => j.includes('left'));
    const rightJoints = jointsOfInterest.filter(j => j.includes('right'));
    
    if (leftJoints.length > 0 && rightJoints.length > 0) {
      const leftAngles = this.extractJointAngles(keypoints, leftJoints[0]);
      const rightAngles = this.extractJointAngles(keypoints, rightJoints[0]);
      
      if (leftAngles.length > 0 && rightAngles.length > 0) {
        // Calculate correlation between left and right
        coordination.symmetry = this.calculateCorrelation(leftAngles, rightAngles);
      }
    }
    
    // Analyze coupling between different joints
    if (jointsOfInterest.length >= 2) {
      const joint1Angles = this.extractJointAngles(keypoints, jointsOfInterest[0]);
      const joint2Angles = this.extractJointAngles(keypoints, jointsOfInterest[1]);
      
      if (joint1Angles.length > 0 && joint2Angles.length > 0) {
        coordination.coupling = this.calculateCorrelation(joint1Angles, joint2Angles);
      }
    }
    
    // Overall correlation across all joints
    const allJointAngles = jointsOfInterest.map(joint => 
      this.extractJointAngles(keypoints, joint)
    ).filter(angles => angles.length > 0);
    
    if (allJointAngles.length >= 2) {
      coordination.correlation = this.calculateMultiJointCorrelation(allJointAngles);
    }
    
    return coordination;
  }
  
  private analyzeTemporalPatterns(keypoints: any[], jointsOfInterest: string[]): any {
    const temporal = {
      regularity: 0,
      returnToStart: 0,
      cycleConsistency: 0
    };
    
    const primaryJoint = jointsOfInterest[0];
    const angles = this.extractJointAngles(keypoints, primaryJoint);
    
    if (angles.length === 0) return temporal;
    
    // Check if exercise returns to starting position
    const startAngle = angles[0];
    const endAngle = angles[angles.length - 1];
    const angleDiff = Math.abs(endAngle - startAngle);
    temporal.returnToStart = Math.max(0, 100 - angleDiff);
    
    // Analyze cycle regularity
    const peaks = this.findLocalMaxima(angles);
    if (peaks.length > 1) {
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i].frame - peaks[i-1].frame);
      }
      const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - meanInterval, 2), 0) / intervals.length;
      temporal.regularity = Math.max(0, 100 - (variance / meanInterval) * 10);
      temporal.cycleConsistency = temporal.regularity;
    }
    
    return temporal;
  }
  
  private analyzeKeywords(exerciseTitle: string): number {
    const title = exerciseTitle.toLowerCase();
    
    // Repetition keywords
    const repetitionKeywords = ['squat', 'push-up', 'lunge', 'deadlift', 'bench', 'curl', 'press', 'row', 'pull', 'sit-up', 'burpee'];
    const repetitionScore = repetitionKeywords.some(keyword => title.includes(keyword)) ? 80 : 0;
    
    // Pose keywords
    const poseKeywords = ['plank', 'hold', 'bridge', 'yoga', 'stretch', 'static', 'isometric', 'balance', 'pose'];
    const poseScore = poseKeywords.some(keyword => title.includes(keyword)) ? 80 : 0;
    
    // Flow keywords
    const flowKeywords = ['flow', 'sequence', 'dance', 'martial', 'movement', 'routine', 'transition'];
    const flowScore = flowKeywords.some(keyword => title.includes(keyword)) ? 80 : 0;
    
    return Math.max(repetitionScore, poseScore, flowScore);
  }
  
  private ensembleVote(features: any, exerciseTitle: string): ClassificationResult {
    const scores = {
      repetition: 0,
      pose: 0,
      flow: 0
    };
    
    // Peak-based scoring
    if (features.peakFeatures.count > 3) {
      scores.repetition += 30;
    } else if (features.peakFeatures.count <= 1) {
      scores.pose += 40;
    }
    
    // Velocity-based scoring
    if (features.velocityFeatures.dynamicPeriods > 0.7) {
      scores.repetition += 25;
    } else if (features.velocityFeatures.staticPeriods > 0.7) {
      scores.pose += 30;
    }
    
    // Coordination-based scoring
    if (features.coordinationFeatures.symmetry > 0.8) {
      scores.repetition += 15;
    } else if (features.coordinationFeatures.coupling < 0.3) {
      scores.flow += 20;
    }
    
    // Temporal-based scoring
    if (features.temporalFeatures.returnToStart > 80) {
      scores.repetition += 20;
    } else if (features.temporalFeatures.regularity < 50) {
      scores.flow += 25;
    }
    
    // Keyword-based scoring
    if (features.keywordScore > 0) {
      if (features.keywordScore === 80) {
        // Determine which type based on keywords
        const title = exerciseTitle.toLowerCase();
        if (['squat', 'push-up', 'lunge', 'deadlift', 'bench', 'curl', 'press', 'row', 'pull', 'sit-up', 'burpee'].some(k => title.includes(k))) {
          scores.repetition += 10;
        } else if (['plank', 'hold', 'bridge', 'yoga', 'stretch', 'static', 'isometric', 'balance', 'pose'].some(k => title.includes(k))) {
          scores.pose += 10;
        } else if (['flow', 'dance', 'martial', 'movement', 'routine', 'transition'].some(k => title.includes(k))) {
          scores.flow += 10;
        }
      }
    }
    
    // Determine winner
    const maxScore = Math.max(scores.repetition, scores.pose, scores.flow);
    let exerciseType: 'repetition' | 'pose' | 'flow';
    let exerciseSubtype = '';
    
    if (scores.repetition === maxScore) {
      exerciseType = 'repetition';
      exerciseSubtype = features.peakFeatures.consistency > 80 ? 'cyclic' : 'progressive';
    } else if (scores.pose === maxScore) {
      exerciseType = 'pose';
      exerciseSubtype = features.velocityFeatures.staticPeriods > 0.8 ? 'static' : 'dynamic';
    } else {
      exerciseType = 'flow';
      exerciseSubtype = features.temporalFeatures.regularity < 30 ? 'freeform' : 'structured';
    }
    
    const confidence = maxScore / 100;
    const reasoning = this.generateReasoning(features, exerciseType);
    
    return {
      exerciseType,
      exerciseSubtype,
      confidence,
      features: {
        peakCount: features.peakFeatures.count,
        peakConsistency: features.peakFeatures.consistency,
        velocityProfile: features.velocityFeatures,
        jointCoordination: features.coordinationFeatures,
        temporalPatterns: features.temporalFeatures,
        keywordScore: features.keywordScore
      },
      reasoning
    };
  }
  
  private generateReasoning(features: any, exerciseType: string): string[] {
    const reasoning = [];
    
    if (features.peakFeatures.count > 3) {
      reasoning.push(`Detected ${features.peakFeatures.count} movement peaks`);
    }
    
    if (features.velocityFeatures.staticPeriods > 0.7) {
      reasoning.push('High proportion of static periods');
    }
    
    if (features.coordinationFeatures.symmetry > 0.8) {
      reasoning.push('Strong bilateral symmetry detected');
    }
    
    if (features.temporalPatterns.returnToStart > 80) {
      reasoning.push('Exercise returns to starting position');
    }
    
    return reasoning;
  }
  
  // Helper methods
  private extractJointAngles(keypoints: any[], joint: string): number[] {
    if (!keypoints || keypoints.length === 0) return [];
    
    // Extract angles for specific joint from keypoints
    // This is a simplified version - you'll need to adapt based on your keypoint structure
    const angles: number[] = [];
    
    keypoints.forEach((keypoint: any) => {
      if (keypoint && keypoint.keypoints) {
        // Extract angle based on joint type
        let angle = null;
        
        switch (joint) {
          case 'leftKnee':
            angle = this.calculateKneeAngle(keypoint.keypoints, 'left');
            break;
          case 'rightKnee':
            angle = this.calculateKneeAngle(keypoint.keypoints, 'right');
            break;
          case 'leftHip':
            angle = this.calculateHipAngle(keypoint.keypoints, 'left');
            break;
          case 'rightHip':
            angle = this.calculateHipAngle(keypoint.keypoints, 'right');
            break;
          case 'leftElbow':
            angle = this.calculateElbowAngle(keypoint.keypoints, 'left');
            break;
          case 'rightElbow':
            angle = this.calculateElbowAngle(keypoint.keypoints, 'right');
            break;
          case 'leftShoulder':
            angle = this.calculateShoulderAngle(keypoint.keypoints, 'left');
            break;
          case 'rightShoulder':
            angle = this.calculateShoulderAngle(keypoint.keypoints, 'right');
            break;
          case 'trunk':
            angle = this.calculateTrunkAngle(keypoint.keypoints);
            break;
        }
        
        if (angle !== null) {
          angles.push(angle);
        }
      }
    });
    
    return angles;
  }
  
  private calculateKneeAngle(keypoints: any[], side: 'left' | 'right'): number | null {
    const hip = side === 'left' ? keypoints[11] : keypoints[12];
    const knee = side === 'left' ? keypoints[13] : keypoints[14];
    const ankle = side === 'left' ? keypoints[15] : keypoints[16];
    
    if (hip && knee && ankle) {
      return this.calculateAngle(hip, knee, ankle);
    }
    return null;
  }
  
  private calculateHipAngle(keypoints: any[], side: 'left' | 'right'): number | null {
    const shoulder = side === 'left' ? keypoints[5] : keypoints[6];
    const hip = side === 'left' ? keypoints[11] : keypoints[12];
    const knee = side === 'left' ? keypoints[13] : keypoints[14];
    
    if (shoulder && hip && knee) {
      return this.calculateAngle(shoulder, hip, knee);
    }
    return null;
  }
  
  private calculateElbowAngle(keypoints: any[], side: 'left' | 'right'): number | null {
    const shoulder = side === 'left' ? keypoints[5] : keypoints[6];
    const elbow = side === 'left' ? keypoints[7] : keypoints[8];
    const wrist = side === 'left' ? keypoints[9] : keypoints[10];
    
    if (shoulder && elbow && wrist) {
      return this.calculateAngle(shoulder, elbow, wrist);
    }
    return null;
  }
  
  private calculateShoulderAngle(keypoints: any[], side: 'left' | 'right'): number | null {
    const hip = side === 'left' ? keypoints[11] : keypoints[12];
    const shoulder = side === 'left' ? keypoints[5] : keypoints[6];
    const elbow = side === 'left' ? keypoints[7] : keypoints[8];
    
    if (hip && shoulder && elbow) {
      return this.calculateAngle(hip, shoulder, elbow);
    }
    return null;
  }
  
  private calculateTrunkAngle(keypoints: any[]): number | null {
    const leftShoulder = keypoints[5];
    const leftHip = keypoints[11];
    
    if (leftShoulder && leftHip) {
      // Calculate trunk angle relative to vertical
      const dx = leftShoulder.x - leftHip.x;
      const dy = leftShoulder.y - leftHip.y;
      return Math.atan2(dx, dy) * (180 / Math.PI);
    }
    return null;
  }
  
  private calculateAngle(point1: any, point2: any, point3: any): number {
    const a = Math.sqrt(Math.pow(point2.x - point3.x, 2) + Math.pow(point2.y - point3.y, 2));
    const b = Math.sqrt(Math.pow(point1.x - point3.x, 2) + Math.pow(point1.y - point3.y, 2));
    const c = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
    
    const angle = Math.acos((a * a + c * c - b * b) / (2 * a * c));
    return angle * (180 / Math.PI);
  }
  
  private findLocalMaxima(values: number[]): any[] {
    const maxima = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i-1] && values[i] > values[i+1]) {
        maxima.push({ frame: i, value: values[i] });
      }
    }
    return maxima;
  }
  
  private findLocalMinima(values: number[]): any[] {
    const minima = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] < values[i-1] && values[i] < values[i+1]) {
        minima.push({ frame: i, value: values[i] });
      }
    }
    return minima;
  }
  
  private calculateCorrelation(arr1: number[], arr2: number[]): number {
    if (arr1.length !== arr2.length || arr1.length === 0) return 0;
    
    const mean1 = arr1.reduce((a, b) => a + b, 0) / arr1.length;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / arr2.length;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < arr1.length; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    return numerator / Math.sqrt(denom1 * denom2);
  }
  
  private calculateMultiJointCorrelation(jointAngles: number[][]): number {
    if (jointAngles.length < 2) return 0;
    
    let totalCorrelation = 0;
    let correlationCount = 0;
    
    for (let i = 0; i < jointAngles.length; i++) {
      for (let j = i + 1; j < jointAngles.length; j++) {
        totalCorrelation += this.calculateCorrelation(jointAngles[i], jointAngles[j]);
        correlationCount++;
      }
    }
    
    return correlationCount > 0 ? totalCorrelation / correlationCount : 0;
  }
} 