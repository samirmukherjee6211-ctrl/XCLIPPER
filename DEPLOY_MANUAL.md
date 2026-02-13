# Manual Deployment Guide (Easiest Method)

Since automated deployment is having issues, let's deploy manually through the Google Cloud Console. This is actually easier!

## Step 1: Prepare the Backend Code

Create a new folder called `backend` and copy these files into it:
- `server.js`
- `package-backend.json` (rename to `package.json`)
- `Dockerfile`

## Step 2: Deploy via Google Cloud Console

1. Go to: https://console.cloud.google.com/run?project=xclipper-thumbnail-maker

2. Click **CREATE SERVICE**

3. Choose **"Continuously deploy from a repository (source-based)"**

4. Click **SET UP WITH CLOUD BUILD**

5. Choose **GitHub** or **Cloud Source Repositories**
   - If using GitHub: Connect your repository
   - If no repo: Choose "Upload files" option

6. Configure the service:
   - **Service name**: `imagen-backend`
   - **Region**: `us-central1`
   - **Authentication**: Allow unauthenticated invocations
   - **Container port**: `8080`
   - **Memory**: `1 GiB`
   - **CPU**: `1`
   - **Timeout**: `60 seconds`

7. Click **VARIABLES & SECRETS** tab:
   - Add environment variable:
     - Name: `GOOGLE_CLOUD_PROJECT_ID`
     - Value: `xclipper-thumbnail-maker`

8. Click **CREATE**

9. Wait 2-3 minutes for deployment

10. Copy the service URL (e.g., `https://imagen-backend-xxxxx-uc.a.run.app`)

## Step 3: Update Frontend

Update `.env.local`:

```env
VITE_BACKEND_URL=https://imagen-backend-xxxxx-uc.a.run.app
```

Replace with your actual Cloud Run URL.

## Step 4: Test

1. Run frontend: `npm run dev`
2. Go to http://localhost:5173
3. Click Prompt mode
4. Enter a prompt
5. Click Generate

Done! Your backend is now hosted in the cloud and you don't need to run `npm run server` anymore.

## Alternative: Use Vercel/Netlify for Full Stack

If Cloud Run is too complex, you can also deploy the entire app (frontend + backend) to:
- **Vercel** (easiest, free tier)
- **Netlify** (also easy, free tier)
- **Railway** (simple, free tier)

Would you like instructions for any of these instead?
