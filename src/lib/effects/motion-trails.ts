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
  isExport: boolean = false
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

  // Calculate frame indices based on actual video timing
  // Assuming poses array contains frames at regular intervals
  const totalDuration = video.duration || 1;
  const totalFrames = poses.length;
  const framesPerSecond = totalFrames / totalDuration;
  
  // Find the current frame index based on actual video time
  const currentFrameIndex = Math.floor(frameTime * framesPerSecond);
  const startFrame = Math.max(0, currentFrameIndex - trailLength);
  const endFrame = Math.min(totalFrames - 1, currentFrameIndex);



  // Get poses for the trail period
  const trailPoses = poses.slice(startFrame, endFrame + 1);
  
  if (trailPoses.length < 2) {
    return;
  }

  // Scale factors for canvas
  // Ensure motion trails align with the video as it's drawn on canvas
  const scaleX = ctx.canvas.width / video.videoWidth;
  const scaleY = ctx.canvas.height / video.videoHeight;

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
          const startPoint = pose.keypoints.find((kp: any) => kp.name === startKeypoint);
          const endPoint = pose.keypoints.find((kp: any) => kp.name === endKeypoint);
          
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
        const keypoint = pose.keypoints.find((kp: any) => kp.name === keypointName);
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