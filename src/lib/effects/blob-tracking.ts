export interface BlobTrackingConfig {
  threshold: number; // 0-255
  showBoundingBoxes: boolean;
  showCentroids: boolean;
  showConnections: boolean;
  minBlobSize: number; // Minimum pixel count
  boundingBoxColor: string;
  boundingBoxShape: 'square' | 'circle';
  boundingBoxSize: number; // Scale factor 0.1-2.0
  boundingBoxRegionStyle: 'none' | 'frame' | 'l-frame' | 'x-frame' | 'grid' | 'scope';
  boundingBoxLineWidth: number;
  centroidColor: string;
  connectionColor: string;
  connectionStyle: 'solid' | 'dashed';
  connectionLineWidth: number;
  showText: boolean;
  textType: 'position' | 'count';
  textFontSize: number;
  textColor: string;
}

interface Blob {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number; // Centroid X
  cy: number; // Centroid Y
  count: number; // Pixel count
}

export function renderBlobTracking(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: Partial<BlobTrackingConfig> = {},
  frameTime: number = 0,
  isExport: boolean = false
) {
  const {
    threshold = 60,
    showBoundingBoxes = true,
    showCentroids = true,
    showConnections = true,
    minBlobSize = 50,
    boundingBoxColor = '#00ff00',
    boundingBoxShape = 'square',
    boundingBoxSize = 1.0,
    boundingBoxRegionStyle = 'frame',
    boundingBoxLineWidth = 2,
    centroidColor = '#ff0000',
    connectionColor = '#ffffff',
    connectionStyle = 'solid',
    connectionLineWidth = 1,
    showText = false,
    textType = 'position',
    textFontSize = 12,
    textColor = '#ffffff'
  } = config;

  // Scale factors for canvas
  let scaleX = ctx.canvas.width / video.videoWidth;
  let scaleY = ctx.canvas.height / video.videoHeight;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  if (isExport) {
    const transform = ctx.getTransform();
    const contextScale = transform.a;
    
    if (contextScale !== 1) {
      scaleX = 1;
      scaleY = 1;
    }
  }

  // Get video frame pixels
  const w = video.videoWidth;
  const h = video.videoHeight;
  
  // Safety check for valid video dimensions
  if (!w || !h || w <= 0 || h <= 0) return;
  
  // Performance optimization: downsample large videos for processing
  // Process at max 640x480 for performance, then scale results back up
  const MAX_PROCESS_WIDTH = 640;
  const MAX_PROCESS_HEIGHT = 480;
  const shouldDownsample = w > MAX_PROCESS_WIDTH || h > MAX_PROCESS_HEIGHT;
  
  let processWidth = w;
  let processHeight = h;
  let processScaleX = 1;
  let processScaleY = 1;
  
  if (shouldDownsample) {
    const aspectRatio = w / h;
    if (w > h) {
      processWidth = MAX_PROCESS_WIDTH;
      processHeight = Math.round(MAX_PROCESS_WIDTH / aspectRatio);
    } else {
      processHeight = MAX_PROCESS_HEIGHT;
      processWidth = Math.round(MAX_PROCESS_HEIGHT * aspectRatio);
    }
    processScaleX = w / processWidth;
    processScaleY = h / processHeight;
  }
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = processWidth;
  tempCanvas.height = processHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  tempCtx.drawImage(video, 0, 0, processWidth, processHeight);
  const imageData = tempCtx.getImageData(0, 0, processWidth, processHeight);
  const pixels = imageData.data;
  
  // Create binary array based on threshold
  const binary = new Array(processWidth * processHeight).fill(0);
  for (let y = 0; y < processHeight; y++) {
    for (let x = 0; x < processWidth; x++) {
      const idx = (x + y * processWidth) * 4;
      const r = pixels[idx + 0];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = (r + g + b) / 3;
      if (lum > threshold) {
        binary[x + y * processWidth] = 1;
      }
    }
  }
  
  // Connected component analysis (flood fill)
  const visited = new Array(processWidth * processHeight).fill(false);
  const blobs: Blob[] = [];
  
  // Adjust minBlobSize for downsampled processing
  const adjustedMinBlobSize = shouldDownsample 
    ? Math.max(1, Math.floor(minBlobSize / (processScaleX * processScaleY)))
    : minBlobSize;
  
  for (let y = 0; y < processHeight; y++) {
    for (let x = 0; x < processWidth; x++) {
      const idx = x + y * processWidth;
      if (binary[idx] === 1 && !visited[idx]) {
        // Flood fill this blob
        const queue: [number, number][] = [[x, y]];
        let minX = x, minY = y, maxX = x, maxY = y;
        let sumX = 0, sumY = 0, count = 0;
        
        while (queue.length > 0) {
          const [qx, qy] = queue.pop()!;
          const qi = qx + qy * processWidth;
          
          if (visited[qi]) continue;
          if (qx < 0 || qx >= processWidth || qy < 0 || qy >= processHeight) continue;
          if (binary[qi] !== 1) continue;
          
          visited[qi] = true;
          sumX += qx;
          sumY += qy;
          count++;
          
          if (qx < minX) minX = qx;
          if (qy < minY) minY = qy;
          if (qx > maxX) maxX = qx;
          if (qy > maxY) maxY = qy;
          
          // Add neighbors
          if (qx > 0) queue.push([qx - 1, qy]);
          if (qx < processWidth - 1) queue.push([qx + 1, qy]);
          if (qy > 0) queue.push([qx, qy - 1]);
          if (qy < processHeight - 1) queue.push([qx, qy + 1]);
        }
        
        if (count > adjustedMinBlobSize) {
          // Scale blob coordinates back to original video dimensions
          const scaledMinX = minX * processScaleX;
          const scaledMinY = minY * processScaleY;
          const scaledMaxX = maxX * processScaleX;
          const scaledMaxY = maxY * processScaleY;
          const scaledCx = (sumX / count) * processScaleX;
          const scaledCy = (sumY / count) * processScaleY;
          
          blobs.push({
            minX: scaledMinX * scaleX,
            minY: scaledMinY * scaleY,
            maxX: scaledMaxX * scaleX,
            maxY: scaledMaxY * scaleY,
            cx: scaledCx * scaleX,
            cy: scaledCy * scaleY,
            count: count * (processScaleX * processScaleY) // Approximate pixel count in original resolution
          });
        }
      }
    }
  }
  
  if (blobs.length === 0) return;
  
  ctx.save();
  
  // Draw connections first (so they appear behind bounding boxes)
  if (showConnections && blobs.length > 1) {
    ctx.strokeStyle = connectionColor;
    ctx.lineWidth = connectionLineWidth;
    
    if (connectionStyle === 'dashed') {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }
    
    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        ctx.beginPath();
        ctx.moveTo(blobs[i].cx, blobs[i].cy);
        ctx.lineTo(blobs[j].cx, blobs[j].cy);
        ctx.stroke();
      }
    }
  }
  
  // Draw bounding boxes
  if (showBoundingBoxes) {
    ctx.strokeStyle = boundingBoxColor;
    ctx.lineWidth = boundingBoxLineWidth;
    ctx.setLineDash([]);
    
    blobs.forEach(blob => {
      const width = blob.maxX - blob.minX;
      const height = blob.maxY - blob.minY;
      const centerX = (blob.minX + blob.maxX) / 2;
      const centerY = (blob.minY + blob.maxY) / 2;
      
      // Apply size scale factor
      const scaledWidth = width * boundingBoxSize;
      const scaledHeight = height * boundingBoxSize;
      
      drawBoundingBox(
        ctx,
        centerX,
        centerY,
        scaledWidth,
        scaledHeight,
        boundingBoxShape,
        boundingBoxRegionStyle
      );
    });
  }
  
  // Draw centroids
  if (showCentroids) {
    ctx.fillStyle = centroidColor;
    blobs.forEach(blob => {
      ctx.beginPath();
      ctx.arc(blob.cx, blob.cy, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  // Draw text labels
  if (showText) {
    ctx.fillStyle = textColor;
    ctx.font = `${textFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    blobs.forEach(blob => {
      let text = '';
      if (textType === 'position') {
        text = `(${Math.round(blob.cx)}, ${Math.round(blob.cy)})`;
      } else if (textType === 'count') {
        text = blob.count.toString();
      }
      
      // Draw text with slight offset above centroid
      ctx.fillText(text, blob.cx, blob.cy - 15);
    });
  }
  
  ctx.restore();
}

function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  shape: 'square' | 'circle',
  regionStyle: 'none' | 'frame' | 'l-frame' | 'x-frame' | 'grid' | 'scope'
) {
  ctx.save();
  
  if (shape === 'circle') {
    const radius = Math.max(width, height) / 2;
    drawCircleRegion(ctx, centerX, centerY, radius, regionStyle);
  } else {
    drawRectRegion(ctx, centerX, centerY, width, height, regionStyle);
  }
  
  ctx.restore();
}

function drawRectRegion(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  style: 'none' | 'frame' | 'l-frame' | 'x-frame' | 'grid' | 'scope'
) {
  const halfW = width / 2;
  const halfH = height / 2;
  const left = centerX - halfW;
  const right = centerX + halfW;
  const top = centerY - halfH;
  const bottom = centerY + halfH;
  
  switch (style) {
    case 'none':
      // Just draw a simple rectangle
      ctx.strokeRect(left, top, width, height);
      break;
      
    case 'frame':
      // Simple rectangular frame
      ctx.strokeRect(left, top, width, height);
      break;
      
    case 'l-frame':
      // L-shaped corner frame
      const cornerSize = Math.min(width, height) * 0.3;
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(left, top + cornerSize);
      ctx.lineTo(left, top);
      ctx.lineTo(left + cornerSize, top);
      ctx.stroke();
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(right - cornerSize, top);
      ctx.lineTo(right, top);
      ctx.lineTo(right, top + cornerSize);
      ctx.stroke();
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(left, bottom - cornerSize);
      ctx.lineTo(left, bottom);
      ctx.lineTo(left + cornerSize, bottom);
      ctx.stroke();
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(right - cornerSize, bottom);
      ctx.lineTo(right, bottom);
      ctx.lineTo(right, bottom - cornerSize);
      ctx.stroke();
      break;
      
    case 'x-frame':
      // X-shaped diagonal lines
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(right, bottom);
      ctx.moveTo(right, top);
      ctx.lineTo(left, bottom);
      ctx.stroke();
      break;
      
    case 'grid':
      // Grid pattern
      const gridLines = 3;
      ctx.strokeRect(left, top, width, height);
      // Vertical lines
      for (let i = 1; i < gridLines; i++) {
        const x = left + (width / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      // Horizontal lines
      for (let i = 1; i < gridLines; i++) {
        const y = top + (height / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }
      break;
      
    case 'scope':
      // Scope/crosshair style
      const crosshairSize = Math.min(width, height) * 0.3;
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - crosshairSize, centerY);
      ctx.lineTo(centerX + crosshairSize, centerY);
      ctx.stroke();
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - crosshairSize);
      ctx.lineTo(centerX, centerY + crosshairSize);
      ctx.stroke();
      // Outer rectangle
      ctx.strokeRect(left, top, width, height);
      break;
  }
}

function drawCircleRegion(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  style: 'none' | 'frame' | 'l-frame' | 'x-frame' | 'grid' | 'scope'
) {
  switch (style) {
    case 'none':
    case 'frame':
      // Simple circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      break;
      
    case 'l-frame':
      // L-shaped corners on circle (approximate with arcs)
      const cornerAngle = Math.PI / 4;
      const cornerRadius = radius * 0.7;
      // Draw 4 corner arcs
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(
          centerX + Math.cos(angle) * cornerRadius,
          centerY + Math.sin(angle) * cornerRadius,
          radius * 0.3,
          angle - cornerAngle,
          angle + cornerAngle
        );
        ctx.stroke();
      }
      break;
      
    case 'x-frame':
      // X-shaped lines through circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY - radius);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.moveTo(centerX + radius, centerY - radius);
      ctx.lineTo(centerX - radius, centerY + radius);
      ctx.stroke();
      break;
      
    case 'grid':
      // Grid pattern on circle (concentric circles + radial lines)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      // Concentric circles
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * (i / 3), 0, 2 * Math.PI);
        ctx.stroke();
      }
      // Radial lines
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius
        );
        ctx.stroke();
      }
      break;
      
    case 'scope':
      // Scope/crosshair on circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      // Crosshair
      const crosshairSize = radius * 0.7;
      ctx.beginPath();
      ctx.moveTo(centerX - crosshairSize, centerY);
      ctx.lineTo(centerX + crosshairSize, centerY);
      ctx.moveTo(centerX, centerY - crosshairSize);
      ctx.lineTo(centerX, centerY + crosshairSize);
      ctx.stroke();
      break;
  }
}

