# Video Thumbnail Generation

This feature automatically generates thumbnails from uploaded videos using the browser's Canvas API. It's designed to work with the existing video upload workflow and provides both automatic and manual thumbnail generation options.

## How It Works

### 1. **Automatic Thumbnail Generation**
When you upload a video and save an exercise, the system automatically:
- Extracts a frame from the video at 2 seconds
- Generates a 200x355 pixel thumbnail (9:16 aspect ratio)
- Uploads the thumbnail to Google Cloud Storage
- Updates the exercise with the new thumbnail URL

### 2. **Manual Thumbnail Generation**
You can manually generate thumbnails in two ways:

#### A. During Exercise Creation
- Upload a video in the admin panel
- Click the "🖼️ Generate Thumbnail" button
- The thumbnail will be set as the exercise image

#### B. Bulk Generation for Existing Exercises
- Go to `/admin/thumbnails` 
- Click "Generate All Thumbnails" to process all exercises with videos
- Or generate thumbnails individually for specific exercises

## Technical Implementation

### Frontend Components
- **`src/lib/thumbnailGenerator.ts`** - Core thumbnail generation utilities
- **`src/app/admin/thumbnails/page.tsx`** - Bulk thumbnail generation interface
- **`src/app/admin/upload/page.tsx`** - Manual thumbnail generation during upload

### API Endpoints
- **`/api/upload/image`** - Uploads generated thumbnails to GCS
- **`/api/upload/thumbnail`** - Placeholder for future server-side thumbnail generation

### Key Functions

#### `generateVideoThumbnail(videoUrl, timeInSeconds, width, height)`
- Creates a thumbnail from a video using Canvas API
- Extracts frame at specified time (default: 2 seconds)
- Returns a data URL of the thumbnail

#### `generateAndUploadThumbnail(videoUrl, fileName, timeInSeconds)`
- Generates thumbnail and uploads it to GCS
- Returns the uploaded thumbnail URL

## Usage Examples

### Basic Thumbnail Generation
```javascript
import { generateAndUploadThumbnail } from '@/lib/thumbnailGenerator';

// Generate thumbnail from video
const thumbnailUrl = await generateAndUploadThumbnail(
  'https://example.com/video.mp4',
  'my-exercise-thumbnail.jpg',
  2 // Extract frame at 2 seconds
);
```

### Custom Thumbnail Size
```javascript
import { generateVideoThumbnail } from '@/lib/thumbnailGenerator';

// Generate custom size thumbnail
const thumbnailDataUrl = await generateVideoThumbnail(
  'https://example.com/video.mp4',
  3, // 3 seconds
  300, // width
  533  // height (9:16 ratio)
);
```

## Configuration

### Default Settings
- **Frame extraction time**: 2 seconds
- **Thumbnail size**: 200x355 pixels (9:16 aspect ratio)
- **Image quality**: 80% JPEG
- **Storage location**: Google Cloud Storage `/thumbnails/` folder

### Customization
You can modify the default settings in `src/lib/thumbnailGenerator.ts`:
- Change default thumbnail dimensions
- Adjust frame extraction time
- Modify image quality settings

## Error Handling

The system handles common errors gracefully:
- **Video loading failures**: Shows error message and continues
- **Canvas context errors**: Logs error and falls back to default image
- **Upload failures**: Continues exercise creation without thumbnail
- **Network issues**: Retries with exponential backoff

## Performance Considerations

### Browser Compatibility
- Requires modern browsers with Canvas API support
- Works with most video formats (MP4, WebM, etc.)
- Cross-origin video support for GCS URLs

### Processing Time
- **Small videos (< 10MB)**: ~1-2 seconds
- **Medium videos (10-50MB)**: ~3-5 seconds  
- **Large videos (> 50MB)**: ~5-10 seconds

### Memory Usage
- Thumbnails are processed in memory using Canvas
- Large videos may temporarily use more memory
- Automatic cleanup after processing

## Future Enhancements

### Planned Features
1. **Server-side processing** using ffmpeg for better performance
2. **Multiple thumbnail generation** at different timestamps
3. **Smart frame selection** based on motion detection
4. **Batch processing** for large video libraries
5. **Custom thumbnail editing** interface

### Advanced Options
- **Frame selection algorithm**: Choose best frame based on content
- **Multiple aspect ratios**: Generate different sizes automatically
- **Video preview generation**: Create short animated previews
- **Quality optimization**: Adaptive quality based on video size

## Troubleshooting

### Common Issues

**"Failed to load video"**
- Check video URL is accessible
- Verify CORS settings for external videos
- Ensure video format is supported

**"Could not get canvas context"**
- Browser doesn't support Canvas API
- Try updating browser or using different browser

**"Thumbnail generation failed"**
- Check network connection
- Verify GCS credentials are configured
- Check browser console for detailed errors

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debugThumbnails', 'true');
```

## Integration with Exercise Cards

Generated thumbnails automatically appear in:
- Exercise cards on the homepage
- Exercise detail pages
- Admin exercise management interface
- Curated section displays

The system maintains backward compatibility with existing exercises that don't have thumbnails by using default images. 