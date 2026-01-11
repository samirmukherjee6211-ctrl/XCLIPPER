#!/bin/bash

# Configuration
PROJECT_ID="humixo-thumbnail-maker"
SERVICE_NAME="imagen-backend"
REGION="us-central1"
SERVICE_ACCOUNT="imagen-backend@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 Deploying to Google Cloud Run..."

# Set the project
gcloud config set project $PROJECT_ID

echo "📝 Checking service account..."
# Check if service account exists, create if not
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT 2>/dev/null; then
  echo "Creating service account..."
  gcloud iam service-accounts create imagen-backend \
    --display-name="Imagen Backend Service Account"
fi

echo "🔑 Granting Vertex AI permissions..."
# Grant necessary permissions to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/aiplatform.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.objectViewer" \
  --condition=None

echo "🏗️ Building and deploying to Cloud Run..."
# Build and deploy to Cloud Run with service account
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account=$SERVICE_ACCOUNT \
  --set-env-vars GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION \
  --memory 1Gi \
  --timeout 120s \
  --max-instances 10

echo "✅ Deployment complete!"
echo "Your backend URL will be shown above (ends with .run.app)"
echo ""
echo "🔍 Testing the deployment..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo "Backend URL: $SERVICE_URL"
echo "Health check: $SERVICE_URL/health"
curl -s "$SERVICE_URL/health" | jq '.' || echo "Health check failed"
