/**
 * Gets a video URL that can be used for thumbnail generation
 * @param videoUrl - URL or GCS path of the video file
 * @returns Promise<string> - URL for the video (either direct or proxied)
 */
async function getVideoUrlForThumbnail(videoUrl: string): Promise<string> {
  console.log('Getting video URL for thumbnail generation:', videoUrl);
  
  // If it's a blob URL, return it directly (can't proxy blob URLs)
  if (videoUrl.startsWith('blob:')) {
    console.log('Blob URL detected, returning as is');
    return videoUrl;
  }
  
  // If it's already a full URL, return it
  if (videoUrl.startsWith('http')) {
    console.log('Already a full URL, returning as is');
    return videoUrl;
  }
  
  // If it's a GCS path, use the proxy endpoint
  console.log('Using proxy endpoint for GCS path:', videoUrl);
  const proxyUrl = `/api/storage/video-proxy?file=${encodeURIComponent(videoUrl)}`;
  console.log('Proxy URL:', proxyUrl);
  return proxyUrl;
}

/**
 * Generates a thumbnail from a video using Canvas API
 * @param videoUrl - URL of the video file
 * @param timeInSeconds - Time in seconds to extract frame from (default: 2)
 * @param width - Width of thumbnail (default: 200)
 * @param height - Height of thumbnail (default: 355 for 9:16 aspect ratio)
 * @returns Promise<string> - Data URL of the thumbnail
 */
export async function generateVideoThumbnail(
  videoUrl: string, 
  timeInSeconds: number = 2,
  width: number = 200,
  height: number = 355
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting thumbnail generation for:', videoUrl);
      
      // Check if this is a blob URL (browser recording) - these often fail
      if (videoUrl.startsWith('blob:')) {
        console.log('Blob URL detected - browser recordings may not be compatible with thumbnail generation');
        reject(new Error('Thumbnail generation not supported for browser recordings. Please upload the video file instead.'));
        return;
      }
      
      // Get video URL for thumbnail generation
      const videoUrlForThumbnail = await getVideoUrlForThumbnail(videoUrl);
      console.log('Using video URL:', videoUrlForThumbnail);
      
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Handle video events
      
      video.onseeked = () => {
        try {
          console.log('Video seeked, drawing frame to canvas');
          // Draw the video frame to canvas
          ctx.drawImage(video, 0, 0, width, height);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          console.log('Thumbnail generated successfully');
          resolve(dataUrl);
          
          // Clean up
          video.remove();
          canvas.remove();
        } catch (error) {
          console.error('Error in onseeked:', error);
          reject(error);
        }
      };
      
      video.onerror = (e) => {
        console.error('Video error event:', e);
        console.error('Video error details:', video.error);
        
        // Provide more specific error messages
        let errorMessage = 'Unknown error';
        if (video.error) {
          switch (video.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Video loading was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error while loading video';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Video format not supported or corrupted';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Video format not supported by browser';
              break;
            default:
              errorMessage = video.error.message || 'Unknown video error';
          }
        }
        
        reject(new Error(`Failed to load video: ${videoUrlForThumbnail} - ${errorMessage}`));
      };
      
      // Set video source and load
      video.crossOrigin = 'anonymous';
      video.src = videoUrlForThumbnail;
      console.log('Loading video with src:', videoUrlForThumbnail);
      video.load();
      
      // Add timeout for video loading (especially important for blob URLs)
      const timeout = setTimeout(() => {
        console.error('Video loading timeout');
        reject(new Error('Video loading timeout - video may be corrupted or in unsupported format'));
        video.remove();
        canvas.remove();
      }, 10000); // 10 second timeout
      
      // Clear timeout when video loads successfully
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        console.log('Video metadata loaded, seeking to:', timeInSeconds);
        console.log('Video duration:', video.duration);
        console.log('Video videoWidth:', video.videoWidth);
        console.log('Video videoHeight:', video.videoHeight);
        
        // Check if video is valid
        if (video.duration === Infinity || isNaN(video.duration) || video.duration <= 0) {
          reject(new Error('Invalid video duration - video may not be properly encoded'));
          return;
        }
        
        // Seek to the specified time
        video.currentTime = timeInSeconds;
      };
    } catch (error) {
      console.error('Error in generateVideoThumbnail:', error);
      reject(error);
    }
  });
}

/**
 * Uploads a thumbnail to the server
 * @param thumbnailDataUrl - Data URL of the thumbnail
 * @param fileName - Name for the thumbnail file
 * @returns Promise<string> - URL of the uploaded thumbnail
 */
export async function uploadThumbnail(thumbnailDataUrl: string, fileName: string): Promise<string> {
  try {
    console.log('Uploading thumbnail:', fileName);
    
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('image', blob, fileName);
    
    // Upload to server
    const uploadResponse = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('Upload failed:', errorData);
      throw new Error(`Failed to upload thumbnail: ${errorData.error || 'Unknown error'}`);
    }
    
    const { imageUrl } = await uploadResponse.json();
    console.log('Thumbnail uploaded successfully:', imageUrl);
    
    // Convert GCS URL to proxy URL for frontend access
    const proxyUrl = `/api/storage/image-proxy?file=${encodeURIComponent(imageUrl)}`;
    console.log('Returning proxy URL for thumbnail:', proxyUrl);
    return proxyUrl;
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    throw error;
  }
}

/**
 * Generates and uploads a thumbnail for a video
 * @param videoUrl - URL of the video file
 * @param fileName - Name for the thumbnail file
 * @param timeInSeconds - Time in seconds to extract frame from
 * @returns Promise<string> - URL of the uploaded thumbnail
 */
export async function generateAndUploadThumbnail(
  videoUrl: string, 
  fileName: string,
  timeInSeconds: number = 2
): Promise<string> {
  try {
    console.log('Generating thumbnail for video:', videoUrl);
    
    // Generate thumbnail
    const thumbnailDataUrl = await generateVideoThumbnail(videoUrl, timeInSeconds);
    
    // Upload thumbnail
    const thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, fileName);
    
    console.log('Thumbnail generated and uploaded successfully:', thumbnailUrl);
    return thumbnailUrl;
  } catch (error) {
    console.error('Error generating and uploading thumbnail:', error);
    throw error;
  }
} 