// Muybridge effect: draw a grid of key frames (updated for aspect ratio and padding)

export interface MuybridgeConfig {
  gridRows?: number;
  gridCols?: number;
  padding?: number; // px, between 0 and 9
  // Add more config options as needed
}

/**
 * Draws the Muybridge effect on the given canvas context.
 * @param ctx CanvasRenderingContext2D
 * @param video HTMLVideoElement (for preview) or video frame (for export)
 * @param poses Array of pose data
 * @param config MuybridgeConfig
 * @param frameTime Current time in seconds
 */
export function renderMuybridge(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: MuybridgeConfig = {},
  frameTime: number = 0
) {
  const rows = config.gridRows || 3;
  const cols = config.gridCols || 3;
  const padding = Math.max(0, Math.min(9, config.padding ?? 8));
  const { width, height } = ctx.canvas;

  // Calculate cell size (including padding)
  const totalPadX = padding * (cols - 1);
  const totalPadY = padding * (rows - 1);
  const cellW = (width - totalPadX) / cols;
  const cellH = (height - totalPadY) / rows;

  ctx.clearRect(0, 0, width, height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (cellW + padding);
      const y = r * (cellH + padding);
      ctx.fillStyle = (r + c) % 2 === 0 ? '#e0e0e0' : '#b0b0b0';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
    }
  }
} 