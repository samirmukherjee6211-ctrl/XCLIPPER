# Deploy Backend to Google Cloud Run

## Prerequisites

1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Make sure you're logged in: `gcloud auth login`

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

Run the deployment script:

```bash
./deploy.sh
```

This will:
- Build a Docker container
- Deploy to Google Cloud Run
- Give you a public URL (e.g., https://imagen-backend-xxxxx-uc.a.run.app)

### Option 2: Manual Deployment

```bash
# Set your project
gcloud config set project xclipper-thumbnail-maker

# Deploy to Cloud Run
gcloud run deploy imagen-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT_ID=xclipper-thumbnail-maker,GOOGLE_CLOUD_LOCATION=us-central1 \
  --service-account imagen-service@xclipper-thumbnail-maker.iam.gserviceaccount.com \
  --memory 512Mi \
  --timeout 60s
```

## After Deployment

1. Copy the service URL (e.g., `https://imagen-backend-xxxxx-uc.a.run.app`)
2. Update your frontend code to use this URL instead of `http://localhost:3001`

### Update Frontend

Create a new file `.env.local` in your project root:

```env
VITE_API_KEY=AIzaSyA5TyJSz8_Eh9HAJShZG9EHS_32QCXjq7o
VITE_BACKEND_URL=https://your-cloud-run-url.run.app
```

Then update `services/geminiService.ts`:

```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

async generateImageFromPrompt(prompt: string): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/generate-image`, {
    // ... rest of the code
  });
}
```

## Cost

- Google Cloud Run has a **generous free tier**
- First 2 million requests per month are free
- You only pay when the service is running (serverless)

## Troubleshooting

### Error: "Permission denied"
Make sure the service account has the correct permissions:
```bash
gcloud projects add-iam-policy-binding xclipper-thumbnail-maker \
  --member="serviceAccount:imagen-service@xclipper-thumbnail-maker.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Error: "Cloud Run API not enabled"
Enable it:
```bash
gcloud services enable run.googleapis.com
```

### Check Logs
```bash
gcloud run logs read imagen-backend --region us-central1
```

## Update Deployment

To update your backend after making changes:

```bash
./deploy.sh
```

The URL will remain the same.
