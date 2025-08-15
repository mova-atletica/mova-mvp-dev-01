// Audio Feedback System for Real-time Exercise Guidance
export class AudioFeedbackService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;
  
  constructor() {
    this.initAudioContext();
  }
  
  private async initAudioContext() {
    try {
      // Check if Web Audio API is supported
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        await this.loadSounds();
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }
  
  private async loadSounds() {
    if (!this.audioContext) return;
    
    // Generate synthetic sounds since we don't have audio files yet
    await this.generateSyntheticSounds();
  }
  
  private async generateSyntheticSounds() {
    if (!this.audioContext) return;
    
    const sampleRate = this.audioContext.sampleRate;
    
    // Generate different sound types
    const sounds = {
      'rep-completion': this.generateClickSound(sampleRate, 800, 0.1),
      'pose-achievement': this.generateClickSound(sampleRate, 600, 0.15),
      'form-correction': this.generateBeepSound(sampleRate, 400, 0.2),
      'milestone': this.generateChimeSound(sampleRate, [800, 1000, 1200], 0.3)
    };
    
    // Convert to AudioBuffer
    for (const [type, audioData] of Object.entries(sounds)) {
      try {
        const audioBuffer = this.audioContext.createBuffer(1, audioData.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        channelData.set(audioData);
        this.sounds.set(type, audioBuffer);
      } catch (error) {
        console.error(`Failed to create audio buffer for ${type}:`, error);
      }
    }
  }
  
  private generateClickSound(sampleRate: number, frequency: number, duration: number): Float32Array {
    const length = Math.floor(sampleRate * duration);
    const audioData = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10); // Exponential decay
      audioData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }
    
    return audioData;
  }
  
  private generateBeepSound(sampleRate: number, frequency: number, duration: number): Float32Array {
    const length = Math.floor(sampleRate * duration);
    const audioData = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration); // Sine envelope
      audioData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.2;
    }
    
    return audioData;
  }
  
  private generateChimeSound(sampleRate: number, frequencies: number[], duration: number): Float32Array {
    const length = Math.floor(sampleRate * duration);
    const audioData = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5); // Slower decay for chime
      let sample = 0;
      
      frequencies.forEach((freq, index) => {
        const phase = index * Math.PI / 4; // Stagger the phases
        sample += Math.sin(2 * Math.PI * freq * t + phase) * envelope * 0.15;
      });
      
      audioData[i] = sample;
    }
    
    return audioData;
  }
  
  private playSound(type: string, volume: number = 0.5) {
    if (!this.audioContext || !this.sounds.has(type) || !this.isInitialized) {
      console.warn(`Audio not available for sound type: ${type}`);
      return;
    }
    
    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.sounds.get(type)!;
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.error(`Failed to play sound ${type}:`, error);
    }
  }
  
  // Exercise-type-specific feedback methods
  
  /**
   * Play rep completion sound for repetition exercises
   */
  playRepCompletion() {
    this.playSound('rep-completion', 0.6);
  }
  
  /**
   * Play pose achievement sound for pose exercises
   */
  playPoseAchievement() {
    this.playSound('pose-achievement', 0.6);
  }
  
  /**
   * Play form correction sound for any exercise type
   */
  playFormCorrection() {
    this.playSound('form-correction', 0.4);
  }
  
  /**
   * Play milestone sound (every 5 reps, every 10 seconds hold, etc.)
   */
  playMilestone() {
    this.playSound('milestone', 0.7);
  }
  
  /**
   * Play generic feedback sound
   */
  playFeedback(type: 'good' | 'warning' | 'poor') {
    switch (type) {
      case 'good':
        this.playSound('pose-achievement', 0.3);
        break;
      case 'warning':
        this.playSound('form-correction', 0.4);
        break;
      case 'poor':
        this.playSound('form-correction', 0.6);
        break;
    }
  }
  
  /**
   * Check if audio is available and initialized
   */
  isAudioAvailable(): boolean {
    return this.isInitialized && this.audioContext !== null;
  }
  
  /**
   * Resume audio context if suspended (required for some browsers)
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Singleton instance
let audioFeedbackInstance: AudioFeedbackService | null = null;

export function getAudioFeedbackService(): AudioFeedbackService {
  if (!audioFeedbackInstance) {
    audioFeedbackInstance = new AudioFeedbackService();
  }
  return audioFeedbackInstance;
}

// Utility functions for exercise-type-specific audio feedback
export class ExerciseAudioFeedback {
  private audioService: AudioFeedbackService;
  private exerciseType: string;
  private repCount = 0;
  private poseHoldStart: number | null = null;
  private lastMilestone = 0;
  
  constructor(exerciseType: string) {
    this.audioService = getAudioFeedbackService();
    this.exerciseType = exerciseType;
  }
  
  /**
   * Handle rep completion for repetition exercises
   */
  onRepCompletion() {
    if (this.exerciseType === 'repetition') {
      this.repCount++;
      this.audioService.playRepCompletion();
      
      // Play milestone every 5 reps
      if (this.repCount % 5 === 0) {
        this.audioService.playMilestone();
      }
    }
  }
  
  /**
   * Handle pose achievement for pose exercises
   */
  onPoseAchievement() {
    if (this.exerciseType === 'pose') {
      this.audioService.playPoseAchievement();
      
      // Start tracking hold duration
      if (this.poseHoldStart === null) {
        this.poseHoldStart = Date.now();
      }
    }
  }
  
  /**
   * Handle pose hold milestones for pose exercises
   */
  onPoseHoldUpdate(holdDuration: number) {
    if (this.exerciseType === 'pose' && this.poseHoldStart !== null) {
      const seconds = Math.floor(holdDuration / 1000);
      
      // Play milestone every 10 seconds
      if (seconds >= 10 && seconds % 10 === 0 && seconds !== this.lastMilestone) {
        this.audioService.playMilestone();
        this.lastMilestone = seconds;
      }
    }
  }
  
  /**
   * Handle form corrections for any exercise type
   */
  onFormCorrection(severity: 'good' | 'warning' | 'poor') {
    if (severity === 'poor') {
      this.audioService.playFormCorrection();
    } else if (severity === 'warning') {
      this.audioService.playFeedback('warning');
    }
  }
  
  /**
   * Reset counters and state
   */
  reset() {
    this.repCount = 0;
    this.poseHoldStart = null;
    this.lastMilestone = 0;
  }
  
  /**
   * Get current rep count
   */
  getRepCount(): number {
    return this.repCount;
  }
  
  /**
   * Get current pose hold duration in milliseconds
   */
  getPoseHoldDuration(): number {
    if (this.poseHoldStart === null) return 0;
    return Date.now() - this.poseHoldStart;
  }
} 