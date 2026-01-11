# Firebase Setup Instructions

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Enable Firestore Database

1. In your Firebase project, go to "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (we'll set up rules next)
4. Select a location closest to your users
5. Click "Enable"

## Step 3: Set Up Firestore Security Rules

Go to the "Rules" tab in Firestore and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Admin can read/write all users (for credit management)
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Admins collection
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.uid == adminId;
    }
  }
}
```

## Step 4: Get Firebase Configuration

1. Go to Project Settings (gear icon) → "General"
2. Scroll down to "Your apps"
3. Click the web icon (</>) to add a web app
4. Register your app with a nickname
5. Copy the `firebaseConfig` object

## Step 5: Update .env.local

Replace the placeholder values in `.env.local` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Step 6: Enable Authentication (Optional but Recommended)

1. Go to "Build" → "Authentication"
2. Click "Get started"
3. Enable your preferred sign-in methods (Email/Password, Google, etc.)

## Step 7: Test the Setup

1. Restart your development server: `npm run dev`
2. The app will automatically create a user document with 10 default credits
3. Each image generation will cost 10 credits

## Managing User Credits in Firebase

### View User Credits:
1. Go to Firestore Database in Firebase Console
2. Navigate to the `users` collection
3. Click on a user document to see their credits

### Manually Update Credits:
1. Click on a user document
2. Edit the `credits` field
3. Save changes

### User Document Structure:
```json
{
  "credits": 10,
  "createdAt": "2024-01-11T12:00:00.000Z",
  "lastUpdated": "2024-01-11T12:00:00.000Z"
}
```

## Credit System Details

- **Default Credits**: 10 credits for new users
- **Generation Cost**: 10 credits per image generation
- **Auto-Refund**: Credits are automatically refunded if generation fails
- **Real-time Updates**: Credit balance updates immediately after each operation

## Troubleshooting

### "Failed to fetch credits" Error
- Check that Firebase config is correct in `.env.local`
- Verify Firestore is enabled in Firebase Console
- Check browser console for detailed error messages

### Credits Not Updating
- Verify Firestore security rules are set correctly
- Check that the user ID is valid
- Look for errors in browser console

### Permission Denied
- Update Firestore security rules as shown in Step 3
- Make sure authentication is enabled if using auth

## Future Enhancements

You can extend the credit system by:
- Adding purchase history tracking
- Implementing subscription plans
- Adding credit expiration dates
- Creating admin dashboard for credit management
- Adding analytics for credit usage
