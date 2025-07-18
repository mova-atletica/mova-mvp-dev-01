import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Path to your service account key
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mova-exercise-library';

export const uploadFile = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> => {
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(fileName);
  
  await blob.save(file, {
    metadata: {
      contentType,
    },
    resumable: false,
  });

  // Return the file path instead of a signed URL
  // We'll generate signed URLs on-demand when needed
  return fileName;
};

export const getSignedUrl = async (fileName: string): Promise<string> => {
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(fileName);
  
  // Generate a signed URL that expires in 7 days (maximum allowed)
  const [signedUrl] = await blob.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
  });

  return signedUrl;
};

export const deleteFile = async (fileName: string): Promise<void> => {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  await file.delete();
};

export const generateFileName = (originalName: string, prefix: string): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${prefix}/${timestamp}-${Math.random().toString(36).substring(2)}.${extension}`;
}; 