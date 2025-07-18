# Google Cloud Storage Setup Guide

## Files Created ✅
- `.env.local` - Environment variables (update with your actual values)
- `google-cloud-key.json` - Placeholder for your service account key
- Updated `.gitignore` to exclude the key file

## Next Steps

### 1. Get Your Project ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Your project ID is shown at the top of the page
3. Copy it and replace `your-project-id-here` in `.env.local`

### 2. Get Your Bucket Name
1. Go to "Cloud Storage" > "Buckets"
2. Copy your bucket name
3. Replace `your-bucket-name-here` in `.env.local`

### 3. Get Your Service Account Key
1. Go to "IAM & Admin" > "Service Accounts"
2. Click on your service account
3. Go to "Keys" tab
4. Click "Add Key" > "Create new key" > "JSON"
5. Download the file
6. Replace the contents of `google-cloud-key.json` with your actual key

### 4. Update `.env.local`
Replace the placeholder values with your actual values:

```env
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-actual-bucket-name
GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json
DATABASE_URL="file:./dev.db"
```

### 5. Test the Setup
Once you've updated the files, restart your development server:

```bash
npm run dev
```

Then try uploading an image in the admin panel. If it works, you'll see the image URL change to a Google Cloud Storage URL!

## Security Notes
- ✅ The key file is already in `.gitignore`
- ✅ Never commit your actual credentials
- ✅ The service account only has Storage Object Admin permissions (secure)

## Troubleshooting
If you get errors:
1. Check that your project ID is correct
2. Verify the bucket name exists
3. Ensure the service account has the right permissions
4. Make sure the key file is valid JSON 