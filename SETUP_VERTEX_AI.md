# Vertex AI Imagen Setup Guide

## Prerequisites
- Google Cloud Account
- Google Cloud Project with billing enabled

## Step 1: Enable Vertex AI API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to **APIs & Services** > **Library**
4. Search for "Vertex AI API"
5. Click **Enable**

## Step 2: Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `imagen-service-account`
4. Click **Create and Continue**
5. Add role: **Vertex AI User**
6. Click **Continue** then **Done**

## Step 3: Create Service Account Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Click **Create**
6. Save the downloaded JSON file as `service-account-key.json` in your project root

## Step 4: Configure Environment Variables

Update `.env.local` file:

```env
VITE_API_KEY=AIzaSyA5TyJSz8_Eh9HAJShZG9EHS_32QCXjq7o

# Replace with your actual Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

**Important**: Replace `your-project-id-here` with your actual Google Cloud Project ID

## Step 5: Run the Application

### Terminal 1 - Start Backend Server:
```bash
npm run server
```

### Terminal 2 - Start Frontend:
```bash
npm run dev
```

## Testing

1. Open http://localhost:5173 in your browser
2. Click on "Prompt" mode
3. Enter a prompt like: "A man swimming underwater with a shark"
4. Click "Generate"
5. The backend will call Vertex AI Imagen to generate the image

## Troubleshooting

### Error: "Project ID not configured"
- Make sure you updated `GOOGLE_CLOUD_PROJECT_ID` in `.env.local`

### Error: "Permission denied"
- Make sure the service account has "Vertex AI User" role
- Make sure Vertex AI API is enabled

### Error: "Service account key not found"
- Make sure `service-account-key.json` is in the project root
- Make sure the path in `.env.local` is correct

## Security Notes

- **Never commit** `service-account-key.json` to git
- **Never commit** `.env.local` with real credentials to git
- Add both files to `.gitignore`
