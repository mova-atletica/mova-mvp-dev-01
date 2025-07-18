// Asset Generation Utilities
// This file contains functions for generating creative assets from pose data

export interface AssetGenerationOptions {
  width?: number;
  height?: number;
  quality?: number;
  includeStats?: boolean;
  statsOverlay?: boolean;
}

export interface GeneratedAsset {
  type: string;
  data: string; // Base64 data URL or blob URL
  filename: string;
  mimeType: string;
}

// Generate Muybridge-style sequence
export async function generateMuybridgeSequence(
  poses: any[],
  options: AssetGenerationOptions = {}
): Promise<GeneratedAsset> {
  const { width = 800, height = 600, includeStats = true } = options;
  
  // Filter out poses with low confidence
  const validPoses = poses.filter(pose => 
    pose && pose.keypoints && pose.keypoints.some((kp: any) => kp.score > 0.4)
  );
  
  if (validPoses.length === 0) {
    throw new Error('No valid poses found for Muybridge sequence');
  }
  
  // Extract key frames: start, 25%, 50%, 75%, end, and peak moments
  const keyFrames = [];
  const totalFrames = validPoses.length;
  
  // Add start frame
  keyFrames.push({ pose: validPoses[0], label: 'Start', index: 0 });
  
  // Add percentage-based frames
  const percentages = [25, 50, 75];
  percentages.forEach(percent => {
    const index = Math.floor((totalFrames * percent) / 100);
    if (index < totalFrames && index > 0) {
      keyFrames.push({ 
        pose: validPoses[index], 
        label: `${percent}%`, 
        index 
      });
    }
  });
  
  // Add end frame
  if (totalFrames > 1) {
    keyFrames.push({ 
      pose: validPoses[totalFrames - 1], 
      label: 'End', 
      index: totalFrames - 1 
    });
  }
  
  // Limit to 6 frames maximum for grid layout
  const finalKeyFrames = keyFrames.slice(0, 6);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);
  
  // Calculate grid layout
  const cols = 3;
  const rows = Math.ceil(finalKeyFrames.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const padding = 20;
  const frameWidth = cellWidth - (padding * 2);
  const frameHeight = cellHeight - (padding * 2);
  
  // Draw title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Muybridge Sequence', width / 2, 30);
  
  // Draw each key frame
  finalKeyFrames.forEach((frameData, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth + padding;
    const y = row * cellHeight + padding + 40; // Account for title
    
    // Frame background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, frameWidth, frameHeight);
    
    // Draw pose skeleton
    drawPoseSkeleton(ctx, frameData.pose, x, y, frameWidth, frameHeight);
    
    // Frame label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(frameData.label, x + frameWidth / 2, y + frameHeight + 15);
    
    // Frame number
    ctx.font = '12px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText(`Frame ${frameData.index + 1}`, x + frameWidth / 2, y + frameHeight + 30);
  });
  
  return {
    type: 'muybridge',
    data: canvas.toDataURL('image/png', 0.9),
    filename: `muybridge-sequence-${Date.now()}.png`,
    mimeType: 'image/png'
  };
}

// Helper function to draw pose skeleton
function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D, 
  pose: any, 
  x: number, 
  y: number, 
  width: number, 
  height: number
) {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  
  // Scale and center the pose within the frame
  const poseBounds = getPoseBounds(keypoints);
  if (!poseBounds) return;
  
  const scale = Math.min(
    (width * 0.8) / poseBounds.width,
    (height * 0.8) / poseBounds.height
  );
  
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const poseCenterX = poseBounds.minX + poseBounds.width / 2;
  const poseCenterY = poseBounds.minY + poseBounds.height / 2;
  
  // Draw skeleton lines (MoveNet format)
  const connections = [
    [5, 7], [7, 9], // Left arm
    [6, 8], [8, 10], // Right arm
    [5, 6], // Shoulders
    [5, 11], [6, 12], // Torso
    [11, 12], // Hips
    [11, 13], [13, 15], // Left leg
    [12, 14], [14, 16], // Right leg
  ];
  
  ctx.strokeStyle = '#64FF58';
  ctx.lineWidth = 2;
  
  connections.forEach(([start, end]) => {
    const startKp = keypoints[start];
    const endKp = keypoints[end];
    
    if (startKp && endKp && startKp.score > 0.4 && endKp.score > 0.4) {
      const startX = (startKp.x - poseCenterX) * scale + centerX;
      const startY = (startKp.y - poseCenterY) * scale + centerY;
      const endX = (endKp.x - poseCenterX) * scale + centerX;
      const endY = (endKp.y - poseCenterY) * scale + centerY;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
  
  // Draw keypoints
  keypoints.forEach((kp: any) => {
    if (kp && kp.score > 0.4) {
      const kpX = (kp.x - poseCenterX) * scale + centerX;
      const kpY = (kp.y - poseCenterY) * scale + centerY;
      
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.arc(kpX, kpY, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// Helper function to get pose bounds
function getPoseBounds(keypoints: any[]) {
  if (!keypoints || keypoints.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidPoints = false;
  
  keypoints.forEach((kp: any) => {
    if (kp && kp.score > 0.4) {
      minX = Math.min(minX, kp.x);
      minY = Math.min(minY, kp.y);
      maxX = Math.max(maxX, kp.x);
      maxY = Math.max(maxY, kp.y);
      hasValidPoints = true;
    }
  });
  
  if (!hasValidPoints) return null;
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Generate motion trail video/GIF
export async function generateMotionTrail(
  poses: any[],
  options: AssetGenerationOptions = {}
): Promise<GeneratedAsset> {
  const { width = 400, height = 600, includeStats = true } = options;
  
  // Filter out poses with low confidence
  const validPoses = poses.filter(pose => 
    pose && pose.keypoints && pose.keypoints.some((kp: any) => kp.score > 0.4)
  );
  
  if (validPoses.length === 0) {
    throw new Error('No valid poses found for motion trail');
  }
  
  // Sample poses for trail effect (every 3rd pose)
  const sampledPoses = validPoses.filter((_, index) => index % 3 === 0);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add motion blur effect background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < width; i += 2) {
    for (let j = 0; j < height; j += 2) {
      if (Math.random() > 0.95) {
        ctx.fillRect(i, j, 1, 1);
      }
    }
  }
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Motion Trail Analysis', width / 2, 40);
  
  // Subtitle
  ctx.font = '14px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`Movement path over ${sampledPoses.length} frames`, width / 2, 60);
  
  // Calculate overall pose bounds
  const overallBounds = getOverallPoseBounds(sampledPoses);
  if (!overallBounds) {
    throw new Error('Could not calculate pose bounds');
  }
  
  // Scale and center all poses
  const scale = Math.min(
    (width * 0.7) / overallBounds.width,
    (height * 0.6) / overallBounds.height
  );
  
  const centerX = width / 2;
  const centerY = height / 2 + 50;
  const poseCenterX = overallBounds.minX + overallBounds.width / 2;
  const poseCenterY = overallBounds.minY + overallBounds.height / 2;
  
  // Draw motion trail (ghost poses with decreasing opacity)
  sampledPoses.forEach((pose, index) => {
    const opacity = 0.05 + (index / sampledPoses.length) * 0.3; // 0.05 to 0.35
    drawMotionTrailPose(ctx, pose, centerX, centerY, poseCenterX, poseCenterY, scale, opacity);
  });
  
  // Draw the current pose with full opacity
  if (sampledPoses.length > 0) {
    const currentPose = sampledPoses[sampledPoses.length - 1];
    drawMotionTrailPose(ctx, currentPose, centerX, centerY, poseCenterX, poseCenterY, scale, 1.0);
  }
  
  // Draw motion path lines
  drawMotionPath(ctx, sampledPoses, centerX, centerY, poseCenterX, poseCenterY, scale);
  
  // Draw velocity indicators
  drawVelocityIndicators(ctx, sampledPoses, centerX, centerY, poseCenterX, poseCenterY, scale);
  
  // Stats overlay
  if (includeStats) {
    drawMotionStatsOverlay(ctx, width, height, sampledPoses.length, validPoses.length);
  }
  
  return {
    type: 'motion-trail',
    data: canvas.toDataURL('image/png', 0.9),
    filename: `motion-trail-${Date.now()}.png`,
    mimeType: 'image/png'
  };
}

// Helper function to draw a pose for motion trail
function drawMotionTrailPose(
  ctx: CanvasRenderingContext2D,
  pose: any,
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number,
  opacity: number
) {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  
  // Set opacity
  ctx.globalAlpha = opacity;
  
  // Draw skeleton lines with motion blur effect
  const connections = [
    [5, 7], [7, 9], // Left arm
    [6, 8], [8, 10], // Right arm
    [5, 6], // Shoulders
    [5, 11], [6, 12], // Torso
    [11, 12], // Hips
    [11, 13], [13, 15], // Left leg
    [12, 14], [14, 16], // Right leg
  ];
  
  ctx.strokeStyle = `rgba(100, 255, 255, ${opacity})`;
  ctx.lineWidth = 3;
  
  connections.forEach(([start, end]) => {
    const startKp = keypoints[start];
    const endKp = keypoints[end];
    
    if (startKp && endKp && startKp.score > 0.4 && endKp.score > 0.4) {
      const startX = (startKp.x - poseCenterX) * scale + centerX;
      const startY = (startKp.y - poseCenterY) * scale + centerY;
      const endX = (endKp.x - poseCenterX) * scale + centerX;
      const endY = (endKp.y - poseCenterY) * scale + centerY;
      
      // Draw motion blur effect
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = opacity * (1 - i * 0.3);
        ctx.beginPath();
        ctx.moveTo(startX + i * 2, startY + i * 2);
        ctx.lineTo(endX + i * 2, endY + i * 2);
        ctx.stroke();
      }
    }
  });
  
  // Draw keypoints with glow effect
  keypoints.forEach((kp: any) => {
    if (kp && kp.score > 0.4) {
      const kpX = (kp.x - poseCenterX) * scale + centerX;
      const kpY = (kp.y - poseCenterY) * scale + centerY;
      
      // Glow effect
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(kpX, kpY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Core point
      ctx.fillStyle = `rgba(100, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(kpX, kpY, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  
  // Reset opacity
  ctx.globalAlpha = 1.0;
}

// Helper function to draw motion path
function drawMotionPath(
  ctx: CanvasRenderingContext2D,
  poses: any[],
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number
) {
  if (poses.length < 2) return;
  
  // Draw path through center of mass
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);
  
  ctx.beginPath();
  
  poses.forEach((pose, index) => {
    const center = getPoseCenter(pose);
    if (center) {
      const x = (center.x - poseCenterX) * scale + centerX;
      const y = (center.y - poseCenterY) * scale + centerY;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw direction arrows
  for (let i = 0; i < poses.length - 1; i += 5) {
    const currentPose = poses[i];
    const nextPose = poses[i + 1];
    
    if (!currentPose || !nextPose) continue;
    
    const currentCenter = getPoseCenter(currentPose);
    const nextCenter = getPoseCenter(nextPose);
    
    if (currentCenter && nextCenter) {
      const startX = (currentCenter.x - poseCenterX) * scale + centerX;
      const startY = (currentCenter.y - poseCenterY) * scale + centerY;
      const endX = (nextCenter.x - poseCenterX) * scale + centerX;
      const endY = (nextCenter.y - poseCenterY) * scale + centerY;
      
      // Draw arrow
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 15;
      const arrowAngle = Math.PI / 6;
      
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
  }
}

// Helper function to draw velocity indicators
function drawVelocityIndicators(
  ctx: CanvasRenderingContext2D,
  poses: any[],
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number
) {
  if (poses.length < 2) return;
  
  // Calculate velocity between consecutive poses
  for (let i = 0; i < poses.length - 1; i += 3) {
    const currentPose = poses[i];
    const nextPose = poses[i + 1];
    
    if (!currentPose || !nextPose) continue;
    
    const currentCenter = getPoseCenter(currentPose);
    const nextCenter = getPoseCenter(nextPose);
    
    if (currentCenter && nextCenter) {
      const startX = (currentCenter.x - poseCenterX) * scale + centerX;
      const startY = (currentCenter.y - poseCenterY) * scale + centerY;
      const endX = (nextCenter.x - poseCenterX) * scale + centerX;
      const endY = (nextCenter.y - poseCenterY) * scale + centerY;
      
      // Calculate velocity magnitude
      const dx = endX - startX;
      const dy = endY - startY;
      const velocity = Math.sqrt(dx * dx + dy * dy);
      
      // Color based on velocity
      let color;
      if (velocity > 20) {
        color = 'rgba(255, 100, 100, 0.8)'; // Fast
      } else if (velocity > 10) {
        color = 'rgba(255, 255, 100, 0.8)'; // Medium
      } else {
        color = 'rgba(100, 255, 100, 0.8)'; // Slow
      }
      
      // Draw velocity indicator
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(startX, startY, Math.min(velocity / 2, 10), 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// Helper function to draw motion stats overlay
function drawMotionStatsOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sampledCount: number,
  totalCount: number
) {
  const overlayX = width - 200;
  const overlayY = height - 120;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(overlayX, overlayY, 180, 100);
  
  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(overlayX, overlayY, 180, 100);
  
  // Stats
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Motion Analysis', overlayX + 10, overlayY + 20);
  
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(`Total Frames: ${totalCount}`, overlayX + 10, overlayY + 40);
  ctx.fillText(`Trail Length: ${sampledCount}`, overlayX + 10, overlayY + 55);
  ctx.fillText(`Effect: Ghost Trail`, overlayX + 10, overlayY + 70);
  ctx.fillText(`Path: Center of Mass`, overlayX + 10, overlayY + 85);
}

// Generate composite image
export async function generateCompositeImage(
  poses: any[],
  options: AssetGenerationOptions = {}
): Promise<GeneratedAsset> {
  const { width = 800, height = 600, includeStats = true } = options;
  
  // Filter out poses with low confidence
  const validPoses = poses.filter(pose => 
    pose && pose.keypoints && pose.keypoints.some((kp: any) => kp.score > 0.4)
  );
  
  if (validPoses.length === 0) {
    throw new Error('No valid poses found for composite image');
  }
  
  // Sample poses to avoid overcrowding (every 5th pose)
  const sampledPoses = validPoses.filter((_, index) => index % 5 === 0);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Range of Motion Composite', width / 2, 40);
  
  // Subtitle
  ctx.font = '14px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`${sampledPoses.length} poses overlaid`, width / 2, 60);
  
  // Calculate overall pose bounds from all poses
  const overallBounds = getOverallPoseBounds(sampledPoses);
  if (!overallBounds) {
    throw new Error('Could not calculate pose bounds');
  }
  
  // Scale and center all poses
  const scale = Math.min(
    (width * 0.8) / overallBounds.width,
    (height * 0.7) / overallBounds.height
  );
  
  const centerX = width / 2;
  const centerY = height / 2 + 50; // Account for title
  const poseCenterX = overallBounds.minX + overallBounds.width / 2;
  const poseCenterY = overallBounds.minY + overallBounds.height / 2;
  
  // Draw poses with decreasing opacity (newer poses more visible)
  sampledPoses.forEach((pose, index) => {
    const opacity = 0.1 + (index / sampledPoses.length) * 0.4; // 0.1 to 0.5
    drawCompositePose(ctx, pose, centerX, centerY, poseCenterX, poseCenterY, scale, opacity);
  });
  
  // Draw the most recent pose with full opacity
  if (sampledPoses.length > 0) {
    const latestPose = sampledPoses[sampledPoses.length - 1];
    drawCompositePose(ctx, latestPose, centerX, centerY, poseCenterX, poseCenterY, scale, 1.0);
  }
  
  // Add motion flow arrows
  drawMotionFlowArrows(ctx, sampledPoses, centerX, centerY, poseCenterX, poseCenterY, scale);
  
  // Stats overlay
  if (includeStats) {
    drawStatsOverlay(ctx, width, height, sampledPoses.length, validPoses.length);
  }
  
  return {
    type: 'composite',
    data: canvas.toDataURL('image/png', 0.9),
    filename: `composite-image-${Date.now()}.png`,
    mimeType: 'image/png'
  };
}

// Helper function to draw a pose for composite
function drawCompositePose(
  ctx: CanvasRenderingContext2D,
  pose: any,
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number,
  opacity: number
) {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  
  // Set opacity
  ctx.globalAlpha = opacity;
  
  // Draw skeleton lines (MoveNet format)
  const connections = [
    [5, 7], [7, 9], // Left arm
    [6, 8], [8, 10], // Right arm
    [5, 6], // Shoulders
    [5, 11], [6, 12], // Torso
    [11, 12], // Hips
    [11, 13], [13, 15], // Left leg
    [12, 14], [14, 16], // Right leg
  ];
  
  ctx.strokeStyle = `rgba(100, 255, 88, ${opacity})`;
  ctx.lineWidth = 2;
  
  connections.forEach(([start, end]) => {
    const startKp = keypoints[start];
    const endKp = keypoints[end];
    
    if (startKp && endKp && startKp.score > 0.4 && endKp.score > 0.4) {
      const startX = (startKp.x - poseCenterX) * scale + centerX;
      const startY = (startKp.y - poseCenterY) * scale + centerY;
      const endX = (endKp.x - poseCenterX) * scale + centerX;
      const endY = (endKp.y - poseCenterY) * scale + centerY;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
  
  // Draw keypoints
  keypoints.forEach((kp: any) => {
    if (kp && kp.score > 0.4) {
      const kpX = (kp.x - poseCenterX) * scale + centerX;
      const kpY = (kp.y - poseCenterY) * scale + centerY;
      
      ctx.fillStyle = `rgba(30, 58, 138, ${opacity})`;
      ctx.beginPath();
      ctx.arc(kpX, kpY, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  
  // Reset opacity
  ctx.globalAlpha = 1.0;
}

// Helper function to get overall bounds from multiple poses
function getOverallPoseBounds(poses: any[]) {
  if (poses.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidPoints = false;
  
  poses.forEach(pose => {
    if (!pose || !pose.keypoints) return;
    
    pose.keypoints.forEach((kp: any) => {
      if (kp && kp.score > 0.4) {
        minX = Math.min(minX, kp.x);
        minY = Math.min(minY, kp.y);
        maxX = Math.max(maxX, kp.x);
        maxY = Math.max(maxY, kp.y);
        hasValidPoints = true;
      }
    });
  });
  
  if (!hasValidPoints) return null;
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Helper function to draw motion flow arrows
function drawMotionFlowArrows(
  ctx: CanvasRenderingContext2D,
  poses: any[],
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number
) {
  if (poses.length < 2) return;
  
  // Draw arrows between consecutive poses (every 3rd pose to avoid clutter)
  for (let i = 0; i < poses.length - 1; i += 3) {
    const currentPose = poses[i];
    const nextPose = poses[i + 1];
    
    if (!currentPose || !nextPose) continue;
    
    // Get center of mass for each pose
    const currentCenter = getPoseCenter(currentPose);
    const nextCenter = getPoseCenter(nextPose);
    
    if (currentCenter && nextCenter) {
      const startX = (currentCenter.x - poseCenterX) * scale + centerX;
      const startY = (currentCenter.y - poseCenterY) * scale + centerY;
      const endX = (nextCenter.x - poseCenterX) * scale + centerX;
      const endY = (nextCenter.y - poseCenterY) * scale + centerY;
      
      // Draw arrow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw arrowhead
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
  }
}

// Helper function to get pose center
function getPoseCenter(pose: any) {
  if (!pose || !pose.keypoints) return null;
  
  let sumX = 0, sumY = 0, count = 0;
  
  pose.keypoints.forEach((kp: any) => {
    if (kp && kp.score > 0.4) {
      sumX += kp.x;
      sumY += kp.y;
      count++;
    }
  });
  
  if (count === 0) return null;
  
  return {
    x: sumX / count,
    y: sumY / count
  };
}

// Helper function to draw stats overlay
function drawStatsOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sampledCount: number,
  totalCount: number
) {
  const overlayX = width - 200;
  const overlayY = height - 120;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(overlayX, overlayY, 180, 100);
  
  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(overlayX, overlayY, 180, 100);
  
  // Stats
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Motion Analysis', overlayX + 10, overlayY + 20);
  
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(`Total Poses: ${totalCount}`, overlayX + 10, overlayY + 40);
  ctx.fillText(`Sampled: ${sampledCount}`, overlayX + 10, overlayY + 55);
  ctx.fillText(`Range: Full Motion`, overlayX + 10, overlayY + 70);
  ctx.fillText(`Opacity: Time-based`, overlayX + 10, overlayY + 85);
}

// Generate geometric overlay
export async function generateGeometricOverlay(
  poses: any[],
  options: AssetGenerationOptions = {}
): Promise<GeneratedAsset> {
  const { width = 800, height = 600, includeStats = true } = options;
  
  // Find the best pose (highest average confidence)
  const bestPose = poses.reduce((best, current) => {
    if (!current || !current.keypoints) return best;
    
    const currentConfidence = current.keypoints.reduce((sum: number, kp: any) => 
      sum + (kp.score || 0), 0) / current.keypoints.length;
    
    const bestConfidence = best ? best.keypoints.reduce((sum: number, kp: any) => 
      sum + (kp.score || 0), 0) / best.keypoints.length : 0;
    
    return currentConfidence > bestConfidence ? current : best;
  }, null);
  
  if (!bestPose) {
    throw new Error('No valid pose found for geometric overlay');
  }
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.5, '#1e293b');
  gradient.addColorStop(1, '#334155');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle star field effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2;
    ctx.fillRect(x, y, size, size);
  }
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Geometric Analysis', width / 2, 40);
  
  // Subtitle
  ctx.font = '14px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('Golden Ratio & Biomechanical Patterns', width / 2, 60);
  
  // Calculate pose bounds and scale
  const poseBounds = getPoseBounds(bestPose.keypoints);
  if (!poseBounds) {
    throw new Error('Could not calculate pose bounds');
  }
  
  const scale = Math.min(
    (width * 0.6) / poseBounds.width,
    (height * 0.6) / poseBounds.height
  );
  
  const centerX = width / 2;
  const centerY = height / 2 + 50;
  const poseCenterX = poseBounds.minX + poseBounds.width / 2;
  const poseCenterY = poseBounds.minY + poseBounds.height / 2;
  
  // Draw the pose first
  drawPoseSkeleton(ctx, bestPose, centerX - (poseBounds.width * scale) / 2, centerY - (poseBounds.height * scale) / 2, poseBounds.width * scale, poseBounds.height * scale);
  
  // Draw golden ratio spiral
  drawGoldenSpiral(ctx, centerX, centerY, Math.min(width, height) * 0.3);
  
  // Draw geometric overlays
  drawGeometricPatterns(ctx, bestPose, centerX, centerY, poseCenterX, poseCenterY, scale);
  
  // Draw biomechanical analysis lines
  drawBiomechanicalLines(ctx, bestPose, centerX, centerY, poseCenterX, poseCenterY, scale);
  
  // Draw symmetry analysis
  drawSymmetryAnalysis(ctx, bestPose, centerX, centerY, poseCenterX, poseCenterY, scale);
  
  return {
    type: 'geometric',
    data: canvas.toDataURL('image/png', 0.9),
    filename: `geometric-overlay-${Date.now()}.png`,
    mimeType: 'image/png'
  };
}

// Helper function to draw golden ratio spiral
function drawGoldenSpiral(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, maxRadius: number) {
  const phi = 1.618033988749895; // Golden ratio
  const segments = 20;
  
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  for (let i = 0; i < segments; i++) {
    const angle = i * Math.PI / 2;
    const radius = maxRadius * Math.pow(phi, i / segments);
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
}

// Helper function to draw geometric patterns
function drawGeometricPatterns(
  ctx: CanvasRenderingContext2D,
  pose: any,
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number
) {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  
  // Draw circles around major joints
  const majorJoints = [5, 6, 11, 12, 13, 14]; // shoulders, hips, knees
  ctx.strokeStyle = 'rgba(100, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  
  majorJoints.forEach(jointIndex => {
    const kp = keypoints[jointIndex];
    if (kp && kp.score > 0.4) {
      const x = (kp.x - poseCenterX) * scale + centerX;
      const y = (kp.y - poseCenterY) * scale + centerY;
      
      // Draw concentric circles
      for (let radius = 20; radius <= 60; radius += 20) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  });
  
  // Draw connecting lines between major joints
  ctx.strokeStyle = 'rgba(255, 100, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  const connections = [[5, 6], [11, 12], [13, 14]]; // shoulders, hips, knees
  connections.forEach(([start, end]) => {
    const startKp = keypoints[start];
    const endKp = keypoints[end];
    
    if (startKp && endKp && startKp.score > 0.4 && endKp.score > 0.4) {
      const startX = (startKp.x - poseCenterX) * scale + centerX;
      const startY = (startKp.y - poseCenterY) * scale + centerY;
      const endX = (endKp.x - poseCenterX) * scale + centerX;
      const endY = (endKp.y - poseCenterY) * scale + centerY;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
  
  ctx.setLineDash([]);
}

// Helper function to draw biomechanical analysis lines
function drawBiomechanicalLines(
  ctx: CanvasRenderingContext2D,
  pose: any,
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number
) {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  
  // Draw center of mass line
  const centerOfMass = getPoseCenter(pose);
  if (centerOfMass) {
    const cmX = (centerOfMass.x - poseCenterX) * scale + centerX;
    const cmY = (centerOfMass.y - poseCenterY) * scale + centerY;
    
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    
    // Vertical line through center of mass
    ctx.beginPath();
    ctx.moveTo(cmX, cmY - 100);
    ctx.lineTo(cmX, cmY + 100);
    ctx.stroke();
    
    // Horizontal line through center of mass
    ctx.beginPath();
    ctx.moveTo(cmX - 100, cmY);
    ctx.lineTo(cmX + 100, cmY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Center of mass marker
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(cmX, cmY, 8, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // Draw balance indicators
  const leftShoulder = keypoints[5];
  const rightShoulder = keypoints[6];
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];
  
  if (leftShoulder && rightShoulder && leftHip && rightHip &&
      leftShoulder.score > 0.4 && rightShoulder.score > 0.4 &&
      leftHip.score > 0.4 && rightHip.score > 0.4) {
    
    // Shoulder line
    const shoulderX1 = (leftShoulder.x - poseCenterX) * scale + centerX;
    const shoulderY1 = (leftShoulder.y - poseCenterY) * scale + centerY;
    const shoulderX2 = (rightShoulder.x - poseCenterX) * scale + centerX;
    const shoulderY2 = (rightShoulder.y - poseCenterY) * scale + centerY;
    
    // Hip line
    const hipX1 = (leftHip.x - poseCenterX) * scale + centerX;
    const hipY1 = (leftHip.y - poseCenterY) * scale + centerY;
    const hipX2 = (rightHip.x - poseCenterX) * scale + centerX;
    const hipY2 = (rightHip.y - poseCenterY) * scale + centerY;
    
    // Draw balance lines
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    ctx.beginPath();
    ctx.moveTo(shoulderX1, shoulderY1);
    ctx.lineTo(shoulderX2, shoulderY2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(hipX1, hipY1);
    ctx.lineTo(hipX2, hipY2);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
}

// Helper function to draw symmetry analysis
function drawSymmetryAnalysis(
  ctx: CanvasRenderingContext2D,
  pose: any,
  centerX: number,
  centerY: number,
  poseCenterX: number,
  poseCenterY: number,
  scale: number
) {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  
  // Draw symmetry axis
  const centerOfMass = getPoseCenter(pose);
  if (centerOfMass) {
    const cmX = (centerOfMass.x - poseCenterX) * scale + centerX;
    const cmY = (centerOfMass.y - poseCenterY) * scale + centerY;
    
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 5]);
    
    ctx.beginPath();
    ctx.moveTo(cmX, cmY - 150);
    ctx.lineTo(cmX, cmY + 150);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Symmetry axis label
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Symmetry Axis', cmX, cmY - 170);
  }
  
  // Draw symmetry indicators for paired joints
  const pairedJoints = [
    [5, 6],   // shoulders
    [7, 8],   // elbows
    [9, 10],  // wrists
    [11, 12], // hips
    [13, 14], // knees
    [15, 16]  // ankles
  ];
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  
  pairedJoints.forEach(([left, right]) => {
    const leftKp = keypoints[left];
    const rightKp = keypoints[right];
    
    if (leftKp && rightKp && leftKp.score > 0.4 && rightKp.score > 0.4) {
      const leftX = (leftKp.x - poseCenterX) * scale + centerX;
      const leftY = (leftKp.y - poseCenterY) * scale + centerY;
      const rightX = (rightKp.x - poseCenterX) * scale + centerX;
      const rightY = (rightKp.y - poseCenterY) * scale + centerY;
      
      // Draw symmetry indicators
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(leftX, leftY, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(rightX, rightY, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw connecting line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
      ctx.stroke();
    }
  });
}

// Generate session summary card
export async function generateSummaryCard(
  poses: any[],
  sessionStats: any,
  exerciseTitle: string,
  options: AssetGenerationOptions = {}
): Promise<GeneratedAsset> {
  const { width = 400, height = 600, includeStats = true } = options;
  
  // Find the best pose (highest average confidence)
  const bestPose = poses.reduce((best, current) => {
    if (!current || !current.keypoints) return best;
    
    const currentConfidence = current.keypoints.reduce((sum: number, kp: any) => 
      sum + (kp.score || 0), 0) / current.keypoints.length;
    
    const bestConfidence = best ? best.keypoints.reduce((sum: number, kp: any) => 
      sum + (kp.score || 0), 0) / best.keypoints.length : 0;
    
    return currentConfidence > bestConfidence ? current : best;
  }, null);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(0.5, '#764ba2');
  gradient.addColorStop(1, '#f093fb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle pattern overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < width; i += 20) {
    for (let j = 0; j < height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 2, 2);
      }
    }
  }
  
  // Card border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  
  // Inner border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  
  // Title section
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(exerciseTitle, width / 2, 50);
  
  // Date
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), width / 2, 70);
  
  // Stats grid
  const statsY = 100;
  const stats = [
    { label: 'Score', value: `${sessionStats.overallScore}%`, color: '#4ade80' },
    { label: 'Grade', value: sessionStats.grade, color: '#fbbf24' },
    { label: 'Reps', value: sessionStats.repCount.toString(), color: '#60a5fa' },
    { label: 'Balance', value: `${sessionStats.balanceScore}%`, color: '#a78bfa' }
  ];
  
  stats.forEach((stat, index) => {
    const x = (width / 2) - 60 + (index % 2) * 120;
    const y = statsY + Math.floor(index / 2) * 60;
    
    // Stat background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x - 50, y - 25, 100, 50);
    
    // Stat value
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, x, y);
    
    // Stat label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.fillText(stat.label, x, y + 20);
  });
  
  // Best pose section
  const poseY = statsY + 140;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(30, poseY, width - 60, 200);
  
  if (bestPose) {
    // Draw the best pose
    drawPoseSkeleton(ctx, bestPose, 30, poseY, width - 60, 200);
  } else {
    // Placeholder if no pose available
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Best Pose', width / 2, poseY + 100);
  }
  
  // Performance highlights
  const highlightsY = poseY + 220;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Performance Highlights', 30, highlightsY);
  
  const highlights = [
    `Best Joint: ${sessionStats.bestJoint?.replace(/([A-Z])/g, ' $1').trim()}`,
    `Needs Work: ${sessionStats.worstJoint?.replace(/([A-Z])/g, ' $1').trim()}`
  ];
  
  highlights.forEach((highlight, index) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '14px Arial';
    ctx.fillText(highlight, 30, highlightsY + 25 + (index * 20));
  });
  
  // Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Generated by Mova', width / 2, height - 20);
  
  return {
    type: 'summary-card',
    data: canvas.toDataURL('image/png', 0.9),
    filename: `summary-card-${Date.now()}.png`,
    mimeType: 'image/png'
  };
}

// Download asset helper
export function downloadAsset(asset: GeneratedAsset): void {
  const link = document.createElement('a');
  link.href = asset.data;
  link.download = asset.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Share asset helper (device-native sharing)
export async function shareAsset(asset: GeneratedAsset): Promise<void> {
  if (navigator.share) {
    try {
      // Convert data URL to blob for sharing
      const response = await fetch(asset.data);
      const blob = await response.blob();
      
      await navigator.share({
        title: 'My Workout Session',
        text: `Check out my ${asset.type} from my ${asset.filename}!`,
        files: [new File([blob], asset.filename, { type: asset.mimeType })]
      });
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to download
      downloadAsset(asset);
    }
  } else {
    // Fallback to download if sharing not supported
    downloadAsset(asset);
  }
} 