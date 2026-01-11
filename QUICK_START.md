# Quick Start Guide

## What I've Set Up

✅ Backend server (server.js) that calls Vertex AI Imagen  
✅ Frontend updated to call the backend for prompt-to-image generation  
✅ Edit and Recreate features remain unchanged (using Gemini API directly)

## What You Need To Do

### 1. Get Your Google Cloud Project ID

1. Go to https://console.cloud.google.com/
2. At the top, you'll see your project name
3. Click on it to see the **Project ID** (not the name!)
4. Copy the Project ID

### 2. Enable Vertex AI API

1. In Google Cloud Console, go to: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
2. Click **Enable**

### 3. Create Service Account & Download Key

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **Create Service Account**
3. Name it: `imagen-service`
4. Click **Create and Continue**
5. Select role: **Vertex AI User**
6. Click **Done**
7. Click on the service account you just created
8. Go to **Keys** tab
9. Click **Add Key** > **Create new key** > **JSON**
10. Save the downloaded file as `service-account-key.json` in your project folder

### 4. Update .env.local

Open `.env.local` and replace `your-project-id-here` with your actual Project ID:

```env
GOOGLE_CLOUD_PROJECT_ID=my-actual-project-id
```

### 5. Run the App

Open **TWO** terminal windows:

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Test It!

1. Open http://localhost:5173
2. Click **Prompt** mode
3. Type: "A man swimming underwater with a shark"
4. Click **Generate**
5. Wait 5-10 seconds for Vertex AI to generate the image

## How It Works

- **Prompt Mode**: Uses Vertex AI Imagen (imagegeneration@006) via backend server
- **Edit Mode**: Uses Gemini API directly (unchanged)
- **Recreate Mode**: Uses Gemini API directly (unchanged)

## Need Help?

Check `SETUP_VERTEX_AI.md` for detailed troubleshooting.
