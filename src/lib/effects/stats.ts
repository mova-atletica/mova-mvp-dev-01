// Stats effects for displaying joint angles, ROM, and global overlays
// Includes safe zone calculations for Instagram Stories/Reels compliance

// Logo loading utility
let logoImage: HTMLImageElement | null = null;
let logoLoaded = false;

function loadLogo(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (logoLoaded && logoImage) {
      resolve();
      return;
    }
    
    logoImage = new Image();
    logoImage.onload = () => {
      logoLoaded = true;
      resolve();
    };
    logoImage.onerror = reject;
    logoImage.src = '/images/brand/logo/Logo_Plain.svg';
  });
}

// Pre-load the logo when the module is imported
loadLogo().catch(console.warn);

// PoseNet keypoint name to index mapping (COCO-17 format)
const KEYPOINT_NAME_TO_INDEX: { [key: string]: number } = {
  'nose': 0,
  'left_eye': 1, 'right_eye': 2,
  'left_ear': 3, 'right_ear': 4,
  'left_shoulder': 5, 'right_shoulder': 6,
  'left_elbow': 7, 'right_elbow': 8,
  'left_wrist': 9, 'right_wrist': 10,
  'left_hip': 11, 'right_hip': 12,
  'left_knee': 13, 'right_knee': 14,
  'left_ankle': 15, 'right_ankle': 16
};

// Helper function to get keypoint by name (supports both named and indexed formats)
function getKeypointByName(keypoints: any[], name: string): any {
  // First try to find by name property (AssetGenerationModal format)
  const namedKeypoint = keypoints.find((kp: any) => kp.name === name);
  if (namedKeypoint) return namedKeypoint;
  
  // Fallback to index-based lookup (motion-explore localStorage format)
  const keypointIndex = KEYPOINT_NAME_TO_INDEX[name];
  if (keypointIndex !== undefined && keypoints[keypointIndex]) {
    return keypoints[keypointIndex];
  }
  
  return null;
}

export interface StatsConfig {
  // Joint Angle Display
  showJointAngles: boolean;
  enabledJoints: string[];
  angleColor: string;
  angleSize: number;
  
  // ROM Tracking
  showROM: boolean;
  romJoints: string[];
  romDisplayStyle: 'min_max' | 'range_bar' | 'both';
  romColor: string;
  
  // Global/Branding Overlays
  showGlobalStats: boolean;
  exerciseTitle: string;
  muscleGroups: string[];
  showLogo: boolean;
  logoPosition: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  
  // Exercise Info Styling
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontSize: number;
  
  // Safe Zone Settings
  safeZoneEnabled: boolean;
  canvasAspectRatio: '9:16' | '16:9' | 'custom';
  
  // Export mode flag
  isExport?: boolean;
}

export interface SafeZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerX: number;
  centerY: number;
  safeWidth: number;
  safeHeight: number;
}

export interface JointAngle {
  jointName: string;
  angle: number;
  position: { x: number; y: number };
  isVisible: boolean;
}

export interface ROMData {
  jointName: string;
  currentAngle: number;
  minAngle: number;
  maxAngle: number;
  range: number;
  position: { x: number; y: number };
}

// ROM tracking storage (persistent across frames)
const romStorage = new Map<string, { min: number; max: number; history: number[] }>();

/**
 * Calculate safe zones for Instagram Stories/Reels compliance
 * Based on 1080x1920 guidelines, scaled to actual canvas dimensions
 */
export function calculateSafeZone(canvasWidth: number, canvasHeight: number): SafeZone {
  // Base Instagram Stories dimensions: 1080x1920
  const baseWidth = 1080;
  const baseHeight = 1920;
  
  // Safe zone offsets (pixels from edges)
  const safeTop = 108;      // 5.6% from top
  const safeBottom = 320;   // 16.7% from bottom  
  const safeLeft = 60;      // 5.6% from left
  const safeRight = 120;    // 11.1% from right
  
  // Scale to actual canvas dimensions
  const scaleX = canvasWidth / baseWidth;
  const scaleY = canvasHeight / baseHeight;
  
  const top = safeTop * scaleY;
  const bottom = canvasHeight - (safeBottom * scaleY);
  const left = safeLeft * scaleX;
  const right = canvasWidth - (safeRight * scaleX);
  
  return {
    top,
    bottom,
    left,
    right,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    safeWidth: right - left,
    safeHeight: bottom - top
  };
}

/**
 * Calculate angle between three points (joint angle)
 * Returns angle in degrees
 */
export function calculateJointAngle(
  point1: { x: number; y: number },
  joint: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  const vector1 = {
    x: point1.x - joint.x,
    y: point1.y - joint.y
  };
  
  const vector2 = {
    x: point3.x - joint.x,
    y: point3.y - joint.y
  };
  
  const dot = vector1.x * vector2.x + vector1.y * vector2.y;
  const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = dot / (mag1 * mag2);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const radians = Math.acos(clampedCos);
  
  return radians * (180 / Math.PI);
}

/**
 * Get joint angles from pose data
 */
export function extractJointAngles(poses: any[], frameIndex: number): JointAngle[] {
  if (!poses || poses.length === 0 || frameIndex >= poses.length) return [];
  
  const pose = poses[frameIndex];
  if (!pose || !pose.keypoints) return [];
  
  const keypoints = pose.keypoints;
  const angles: JointAngle[] = [];
  
  // Scale factors for canvas positioning
  const scaleX = 1; // Will be set by caller
  const scaleY = 1; // Will be set by caller
  
  // Define joint angle calculations
  const jointDefinitions = [
    {
      name: 'left_knee',
      points: ['left_hip', 'left_knee', 'left_ankle'],
      displayName: 'Left Knee'
    },
    {
      name: 'right_knee', 
      points: ['right_hip', 'right_knee', 'right_ankle'],
      displayName: 'Right Knee'
    },
    {
      name: 'left_hip',
      points: ['left_shoulder', 'left_hip', 'left_knee'],
      displayName: 'Left Hip'
    },
    {
      name: 'right_hip',
      points: ['right_shoulder', 'right_hip', 'right_knee'],
      displayName: 'Right Hip'
    },
    {
      name: 'left_elbow',
      points: ['left_shoulder', 'left_elbow', 'left_wrist'],
      displayName: 'Left Elbow'
    },
    {
      name: 'right_elbow',
      points: ['right_shoulder', 'right_elbow', 'right_wrist'],
      displayName: 'Right Elbow'
    }
  ];
  
  for (const joint of jointDefinitions) {
    const [point1Name, jointName, point3Name] = joint.points;
    
    const point1 = getKeypointByName(keypoints, point1Name);
    const jointPoint = getKeypointByName(keypoints, jointName);
    const point3 = getKeypointByName(keypoints, point3Name);
    
    if (point1 && jointPoint && point3 && 
        point1.score > 0.3 && jointPoint.score > 0.3 && point3.score > 0.3) {
      
      const angle = calculateJointAngle(
        { x: point1.x * scaleX, y: point1.y * scaleY },
        { x: jointPoint.x * scaleX, y: jointPoint.y * scaleY },
        { x: point3.x * scaleX, y: point3.y * scaleY }
      );
      
      angles.push({
        jointName: joint.name,
        angle: Math.round(angle),
        position: {
          x: jointPoint.x * scaleX,
          y: jointPoint.y * scaleY
        },
        isVisible: true
      });
    }
  }
  
  return angles;
}

/**
 * Update ROM tracking data
 */
export function updateROMTracking(jointAngles: JointAngle[]): ROMData[] {
  const romData: ROMData[] = [];
  
  for (const joint of jointAngles) {
    const key = joint.jointName;
    
    if (!romStorage.has(key)) {
      romStorage.set(key, {
        min: joint.angle,
        max: joint.angle,
        history: [joint.angle]
      });
    }
    
    const stored = romStorage.get(key)!;
    stored.min = Math.min(stored.min, joint.angle);
    stored.max = Math.max(stored.max, joint.angle);
    stored.history.push(joint.angle);
    
    // Keep only last 100 measurements for performance
    if (stored.history.length > 100) {
      stored.history = stored.history.slice(-100);
    }
    
    romData.push({
      jointName: joint.jointName,
      currentAngle: joint.angle,
      minAngle: stored.min,
      maxAngle: stored.max,
      range: stored.max - stored.min,
      position: joint.position
    });
  }
  
  return romData;
}

/**
 * Clear ROM tracking data (call when starting new exercise)
 */
export function clearROMTracking(): void {
  romStorage.clear();
}

/**
 * Render joint angle display
 */
export function renderJointAngles(
  ctx: CanvasRenderingContext2D,
  jointAngles: JointAngle[],
  config: Partial<StatsConfig>
): void {
  if (!config.showJointAngles) return;
  
  ctx.save();
  ctx.fillStyle = config.angleColor || '#00ff00';
  ctx.strokeStyle = config.angleColor || '#00ff00';
  ctx.lineWidth = 2;
  
  // Scale text size based on canvas dimensions
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to account for this to prevent double-scaling
  let scaleFactor = 1;
  if (config.isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we don't need additional scaling
      scaleFactor = 1;
    } else {
      // Use a reference size that matches typical video display dimensions
      const referenceWidth = 400;
      const referenceHeight = 711;
      scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
    }
  } else {
    // Use a reference size that matches typical video display dimensions
    const referenceWidth = 400;
    const referenceHeight = 711;
    scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
  }
  
  const scaledAngleSize = Math.round((config.angleSize || 18) * scaleFactor);
  
  ctx.font = `bold ${scaledAngleSize}px 'Roboto', sans-serif`;
  ctx.textAlign = 'center';
  
  for (const joint of jointAngles) {
    if (!config.enabledJoints?.includes(joint.jointName)) continue;
    
    const { x, y } = joint.position;
    
    // Draw rounded background for text with proportional padding
    const text = `${joint.angle}°`;
    const textWidth = ctx.measureText(text).width;
    const fontSize = scaledAngleSize;
    const padding = Math.max(8, fontSize * 0.5); // Increased padding for larger text
    const backgroundHeight = fontSize + padding * 2; // Full padding top and bottom
    const borderRadius = Math.round(fontSize * 0.2);
    
    // Center the background properly - ensure text fits within container
    const bgWidth = textWidth + padding * 2;
    const bgX = x - bgWidth/2; // Center the entire container
    const bgY = y - backgroundHeight/2; // Center vertically around the text baseline
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, backgroundHeight, borderRadius);
    ctx.fill();
    
    // Draw angle text - center within the background container
    ctx.fillStyle = config.angleColor || '#00ff00';
    ctx.fillText(text, x, bgY + backgroundHeight/2 + fontSize/3); // Center text within background container
  }
  
  ctx.restore();
}

/**
 * Render ROM statistics
 */
export function renderROMStats(
  ctx: CanvasRenderingContext2D,
  romData: ROMData[],
  config: Partial<StatsConfig>
): void {
  if (!config.showROM) return;
  
  ctx.save();
  ctx.fillStyle = config.romColor || '#ff6b35';
  
  // Scale text size based on canvas dimensions
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to account for this to prevent double-scaling
  let scaleFactor = 1;
  if (config.isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we don't need additional scaling
      scaleFactor = 1;
    } else {
      // Use a reference size that matches typical video display dimensions
      const referenceWidth = 400;
      const referenceHeight = 711;
      scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
    }
  } else {
    // Use a reference size that matches typical video display dimensions
    const referenceWidth = 400;
    const referenceHeight = 711;
    scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
  }
  
  const scaledAngleSize = Math.round((config.angleSize || 16) * scaleFactor);
  
  ctx.font = `bold ${scaledAngleSize}px 'Roboto', sans-serif`;
  ctx.textAlign = 'center';
  
  for (const rom of romData) {
    if (!config.romJoints?.includes(rom.jointName)) continue;
    
    const { x, y } = rom.position;
    
    if (config.romDisplayStyle === 'min_max' || config.romDisplayStyle === 'both') {
      const text = `ROM: ${rom.minAngle}° - ${rom.maxAngle}°`;
      const textWidth = ctx.measureText(text).width;
      const fontSize = scaledAngleSize;
      const padding = Math.max(8, fontSize * 0.5); // Increased padding for larger text
      const backgroundHeight = fontSize + padding * 2; // Full padding top and bottom
      const borderRadius = Math.round(fontSize * 0.2);
      
      // Center the background properly - ensure text fits within container
      const bgWidth = textWidth + padding * 2;
      const bgX = x - bgWidth/2; // Center the entire container
      const bgY = y + fontSize - backgroundHeight/2; // Position below joint, centered vertically
      
      // Draw rounded background with proportional padding
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, backgroundHeight, borderRadius);
      ctx.fill();
      
              // Draw ROM text - center within the background container
        ctx.fillStyle = config.romColor || '#ff6b35';
        ctx.fillText(text, x, y + fontSize + padding/2);
    }
    
    if (config.romDisplayStyle === 'range_bar' || config.romDisplayStyle === 'both') {
      // Draw range bar
      const barWidth = 60 * scaleFactor;
      const barHeight = 4 * scaleFactor;
      const barX = x - barWidth/2;
      const barY = y + 25 * scaleFactor;
      
      // Background bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Progress bar
      if (rom.range > 0) {
        const progress = (rom.currentAngle - rom.minAngle) / rom.range;
        ctx.fillStyle = config.romColor || '#ff6b35';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      }
    }
  }
  
  ctx.restore();
}

/**
 * Render global overlays (exercise title, muscle groups, logo)
 */
export function renderGlobalOverlays(
  ctx: CanvasRenderingContext2D,
  config: Partial<StatsConfig>
): void {
  if (!config.showGlobalStats) return;
  
  // Get the actual canvas dimensions
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Replace lines 506-514 with:
  // Use canvas dimensions directly - they should always match video natural size
  // The scaling logic will handle the display size differences
  const effectiveWidth = canvasWidth;
  const effectiveHeight = canvasHeight;
  
  const safeZone = config.safeZoneEnabled 
    ? calculateSafeZone(effectiveWidth, effectiveHeight)
    : {
        top: 20,
        bottom: effectiveHeight - 20,
        left: 20,
        right: effectiveWidth - 20,
        centerX: effectiveWidth / 2,
        centerY: effectiveHeight / 2,
        safeWidth: effectiveWidth - 40,
        safeHeight: effectiveHeight - 40
      };
  
  // Calculate scale factor for consistent sizing across all elements
  const referenceWidth = 400;
  const referenceHeight = 711;
  const scaleFactor = Math.min(effectiveWidth / referenceWidth, effectiveHeight / referenceHeight);
  
  ctx.save();
  
  // Combined exercise info with customizable styling
  if (config.exerciseTitle || (config.muscleGroups && config.muscleGroups.length > 0)) {
    const titleText = config.exerciseTitle || '';
    const muscleText = (config.muscleGroups && config.muscleGroups.length > 0) 
      ? `Target: ${config.muscleGroups.join(', ')}` 
      : '';
    
    // Use the scale factor calculated at the top of the function
    
    // Get styling from config and apply scaling
    const baseFontSize = config.fontSize || 48;
    const scaledFontSize = Math.round(baseFontSize * scaleFactor);
    const titleFontSize = scaledFontSize;
    const muscleFontSize = Math.round(scaledFontSize * 0.6); // Muscle groups 60% of title size
    const textColor = config.textColor || '#ffffff';
    const backgroundColor = config.backgroundColor || '#000000';
    const backgroundOpacity = config.backgroundOpacity || 0.8;
    const padding = Math.round(scaledFontSize * 0.8); // Even more padding
    const borderRadius = Math.round(scaledFontSize * 0.25);
    const lineSpacing = Math.round(scaledFontSize * 0.6); // Even more spacing between title and muscle groups
    
    ctx.textAlign = 'center';
    
    // Measure text dimensions
    ctx.font = `100 ${titleFontSize}px 'Roboto', sans-serif`; // Thin Roboto font
    const titleMetrics = titleText ? ctx.measureText(titleText) : { width: 0 };
    
    ctx.font = `${muscleFontSize}px 'Roboto', sans-serif`;
    const muscleMetrics = muscleText ? ctx.measureText(muscleText) : { width: 0 };
    
    // Calculate container dimensions with bounds checking
    const maxWidth = Math.max(titleMetrics.width, muscleMetrics.width);
    const containerWidth = Math.min(maxWidth + padding * 2, effectiveWidth - 40); // Ensure it fits within canvas
    const totalTextHeight = (titleText ? titleFontSize : 0) + 
                           (muscleText ? muscleFontSize : 0) + 
                           (titleText && muscleText ? lineSpacing : 0);
    const containerHeight = totalTextHeight + padding * 2.5;
    
    // Position container - ensure it stays within canvas bounds
    const containerX = Math.max(20, Math.min(effectiveWidth - containerWidth - 20, effectiveWidth / 2 - containerWidth / 2));
    const containerY = Math.max(20, Math.min(effectiveHeight - containerHeight - 20, safeZone.top + 20));
    
    // Draw rounded background with custom color and opacity
    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`;
    
    ctx.beginPath();
    ctx.roundRect(containerX, containerY, containerWidth, containerHeight, borderRadius);
    ctx.fill();
    
    // Draw text content
    ctx.fillStyle = textColor;
    let currentY = containerY + padding;
    
    // Draw title
    if (titleText) {
      ctx.font = `100 ${titleFontSize}px 'Roboto', sans-serif`; // Thin Roboto font
      currentY += titleFontSize;
      ctx.fillText(titleText, effectiveWidth / 2, currentY);
      currentY += lineSpacing;
    }
    
    // Draw muscle groups
    if (muscleText) {
      ctx.font = `${muscleFontSize}px 'Roboto', sans-serif`;
      currentY += muscleFontSize;
      ctx.fillText(muscleText, effectiveWidth / 2, currentY);
    }
  }
  
  // App logo - always bottom right with white container
  if (config.showLogo && logoLoaded && logoImage) {
    // Scale logo size using the same scale factor as text for consistency
    const baseLogoSize = 32;
    const basePadding = 12;
    const scaledLogoSize = Math.round(baseLogoSize * scaleFactor);
    const scaledPadding = Math.round(basePadding * scaleFactor);
    const containerSize = scaledLogoSize + scaledPadding * 2;
    const edgePadding = Math.round(16 * scaleFactor);
    const logoX = safeZone.right - containerSize - edgePadding; // Add some padding from edge
    const logoY = safeZone.bottom - containerSize - edgePadding; // Add some padding from edge
    
    // Draw white container with rounded corners
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    const borderRadius = Math.round(12 * scaleFactor);
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, containerSize, containerSize, borderRadius);
    ctx.fill();
    
    // Draw the logo image centered in the container
    const logoOffsetX = logoX + scaledPadding;
    const logoOffsetY = logoY + scaledPadding;
    ctx.drawImage(logoImage, logoOffsetX, logoOffsetY, scaledLogoSize, scaledLogoSize);
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Main stats effect renderer
 */
export function renderStats(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: Partial<StatsConfig> = {},
  frameTime: number = 0,
  isExport: boolean = false
): void {
  if (!poses || poses.length === 0) return;
  
  // Calculate current frame index
  const totalDuration = video.duration || 1;
  const totalFrames = poses.length;
  const framesPerSecond = totalFrames / totalDuration;
  const currentFrameIndex = Math.floor(frameTime * framesPerSecond);
  
  if (currentFrameIndex >= poses.length) return;
  
  // Extract joint angles
  const jointAngles = extractJointAngles(poses, currentFrameIndex);
  
  // Update ROM tracking
  const romData = updateROMTracking(jointAngles);
  
  // Render joint angles
  renderJointAngles(ctx, jointAngles, config);
  
  // Render ROM stats
  renderROMStats(ctx, romData, config);
  
  // Render global overlays
  renderGlobalOverlays(ctx, config);
} 