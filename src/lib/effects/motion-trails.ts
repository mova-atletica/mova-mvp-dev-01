import { poseIndexAtTime, type PoseTimeline } from "../poseIndexAtTime";
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

export interface MotionTrailsConfig {
  trailLength: number; // Number of frames to trail
  trailOpacity: number; // Opacity of the trail (0-1)
  trailStyle: 'simple' | 'gradient' | 'particles';
  fadeOut: boolean; // Whether to fade out the trail
  color: string; // Trail color
  thickness: number; // Line thickness
  showBones: boolean; // Whether to show bone connections
  boneColor: string; // Color for bone trails
  boneThickness: number; // Thickness for bone lines
}

export function renderMotionTrails(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: Partial<MotionTrailsConfig> = {},
  frameTime: number = 0,
  isExport: boolean = false,
  timeline?: PoseTimeline | null
) {
  const {
    trailLength = 10,
    trailOpacity = 0.6,
    trailStyle = 'simple',
    fadeOut = true,
    color = '#00ff00',
    thickness = 2,
    showBones = false,
    boneColor = '#ff0000',
    boneThickness = 1
  } = config;

  if (!poses || poses.length === 0) return;

  const totalFrames = poses.length;
  const currentFrameIndex = poseIndexAtTime(frameTime, totalFrames, {
    timestamps: timeline?.timestamps,
    frameIntervalSec: timeline?.frameIntervalSec,
    durationSec: video.duration,
  });
  const startFrame = Math.max(0, currentFrameIndex - trailLength);
  const endFrame = Math.min(totalFrames - 1, currentFrameIndex);



  // Get poses for the trail period
  const trailPoses = poses.slice(startFrame, endFrame + 1);
  
  if (trailPoses.length < 2) {
    return;
  }

  // Scale factors for canvas
  // Ensure motion trails align with the video as it's drawn on canvas
  let scaleX = ctx.canvas.width / video.videoWidth;
  let scaleY = ctx.canvas.height / video.videoHeight;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to account for this to prevent double-scaling
  if (isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we need to use the original video dimensions
      scaleX = 1;
      scaleY = 1;
    }
  }

  ctx.save();
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Define bone connections (pairs of keypoint names)
  const boneConnections = [
    // Head and neck
    ['nose', 'left_eye'], ['nose', 'right_eye'],
    ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
    
    // Torso
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    
    // Arms
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    
    // Legs
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
  ];

  // Draw trails for each keypoint
  const keypointNames = ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear', 
                        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
                        'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];

  // Draw bone trails first (so they appear behind keypoint trails)
  if (showBones) {
    boneConnections.forEach(([startKeypoint, endKeypoint]) => {
      const boneTrail: { x1: number; y1: number; x2: number; y2: number; confidence: number }[] = [];
      
      // Collect bone positions over time
      trailPoses.forEach((pose, index) => {
        if (pose && pose.keypoints) {
          const startPoint = getKeypointByName(pose.keypoints, startKeypoint);
          const endPoint = getKeypointByName(pose.keypoints, endKeypoint);
          
          if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
            boneTrail.push({
              x1: startPoint.x * scaleX,
              y1: startPoint.y * scaleY,
              x2: endPoint.x * scaleX,
              y2: endPoint.y * scaleY,
              confidence: Math.min(startPoint.score, endPoint.score)
            });
          }
        }
      });

      if (boneTrail.length < 2) return;

      // Draw the bone trail
      if (trailStyle === 'simple') {
        drawSimpleBoneTrail(ctx, boneTrail, boneColor, trailOpacity, fadeOut, boneThickness);
      } else if (trailStyle === 'gradient') {
        drawGradientBoneTrail(ctx, boneTrail, boneColor, trailOpacity, fadeOut, boneThickness);
      } else if (trailStyle === 'particles') {
        drawParticleBoneTrail(ctx, boneTrail, boneColor, trailOpacity, fadeOut);
      }
    });
  }

  // Draw keypoint trails
  keypointNames.forEach(keypointName => {
    const keypointTrail: { x: number; y: number; confidence: number }[] = [];
    
    // Collect keypoint positions over time
    trailPoses.forEach((pose, index) => {
      if (pose && pose.keypoints) {
        const keypoint = getKeypointByName(pose.keypoints, keypointName);
        if (keypoint && keypoint.score > 0.3) {
          keypointTrail.push({
            x: keypoint.x * scaleX,
            y: keypoint.y * scaleY,
            confidence: keypoint.score
          });
        }
      }
    });

    if (keypointTrail.length < 2) return;

    // Draw the trail
    if (trailStyle === 'simple') {
      drawSimpleTrail(ctx, keypointTrail, color, trailOpacity, fadeOut);
    } else if (trailStyle === 'gradient') {
      drawGradientTrail(ctx, keypointTrail, color, trailOpacity, fadeOut);
    } else if (trailStyle === 'particles') {
      drawParticleTrail(ctx, keypointTrail, color, trailOpacity, fadeOut);
    }
  });

  ctx.restore();
}

function drawSimpleTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x: number; y: number; confidence: number }[],
  color: string,
  opacity: number,
  fadeOut: boolean
) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  
  ctx.beginPath();
  trail.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
}

function drawGradientTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x: number; y: number; confidence: number }[],
  color: string,
  opacity: number,
  fadeOut: boolean
) {
  // Create gradient from color to transparent
  const gradient = ctx.createLinearGradient(
    trail[0].x, trail[0].y,
    trail[trail.length - 1].x, trail[trail.length - 1].y
  );
  
  if (fadeOut) {
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
  } else {
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
  }
  
  ctx.strokeStyle = gradient;
  ctx.globalAlpha = opacity;
  
  ctx.beginPath();
  trail.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
}

function drawParticleTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x: number; y: number; confidence: number }[],
  color: string,
  opacity: number,
  fadeOut: boolean
) {
  trail.forEach((point, index) => {
    const alpha = fadeOut ? (index / trail.length) * opacity : opacity;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    
    // Draw small circles at each point
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// Bone trail drawing functions
function drawSimpleBoneTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x1: number; y1: number; x2: number; y2: number; confidence: number }[],
  color: string,
  opacity: number,
  fadeOut: boolean,
  thickness: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.globalAlpha = opacity;
  
  ctx.beginPath();
  trail.forEach((bone, index) => {
    if (index === 0) {
      ctx.moveTo(bone.x1, bone.y1);
      ctx.lineTo(bone.x2, bone.y2);
    } else {
      ctx.lineTo(bone.x1, bone.y1);
      ctx.lineTo(bone.x2, bone.y2);
    }
  });
  ctx.stroke();
}

function drawGradientBoneTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x1: number; y1: number; x2: number; y2: number; confidence: number }[],
  color: string,
  opacity: number,
  fadeOut: boolean,
  thickness: number
) {
  ctx.lineWidth = thickness;
  
  if (trail.length < 2) return;
  
  // Create gradient from color to transparent
  const gradient = ctx.createLinearGradient(
    trail[0].x1, trail[0].y1,
    trail[trail.length - 1].x2, trail[trail.length - 1].y2
  );
  
  if (fadeOut) {
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
  } else {
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
  }
  
  ctx.strokeStyle = gradient;
  ctx.globalAlpha = opacity;
  
  ctx.beginPath();
  trail.forEach((bone, index) => {
    if (index === 0) {
      ctx.moveTo(bone.x1, bone.y1);
      ctx.lineTo(bone.x2, bone.y2);
    } else {
      ctx.lineTo(bone.x1, bone.y1);
      ctx.lineTo(bone.x2, bone.y2);
    }
  });
  ctx.stroke();
}

function drawParticleBoneTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x1: number; y1: number; x2: number; y2: number; confidence: number }[],
  color: string,
  opacity: number,
  fadeOut: boolean
) {
  trail.forEach((bone, index) => {
    const alpha = fadeOut ? (index / trail.length) * opacity : opacity;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    
    // Draw small circles at the start and end of each bone
    ctx.beginPath();
    ctx.arc(bone.x1, bone.y1, 1.5, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(bone.x2, bone.y2, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  });
} 