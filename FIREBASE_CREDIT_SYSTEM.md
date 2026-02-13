# Firebase Credit System Setup

## Database Structure

### Collections

#### 1. `users` Collection
Each user document contains:

```json
{
  "credits": 10,                    // Current credit balance
  "totalCreditsEarned": 10,         // Total credits earned (purchases + free trial)
  "totalCreditsSpent": 0,           // Total credits spent on operations
  "plan": "FREE_TRIAL",             // Current plan: FREE_TRIAL, STARTER, BASIC, PRO, PREMIUM, ULTIMATE
  "createdAt": "2024-01-15T10:30:00.000Z",
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

#### 2. `users/{userId}/transactions` Subcollection
Transaction history for each user:

```json
{
  "amount": 1,                      // Credits added or deducted
  "type": "debit",                  // "credit" or "debit"
  "description": "generation",      // Operation type or plan name
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Credit System

### Free Trial
- **New users get**: 10 free credits
- **No credit card required**

### Credit Costs
- **Image Generation**: 1 credit
- **Edit Image**: 1 credit
- **Recreate Image**: 1 credit
- **Enhance Prompt**: FREE (0 credits)

### Pricing Plans

| Plan | Credits | Price | Price per Credit |
|------|---------|-------|------------------|
| Starter Pack | 50 | $5 | $0.10 |
| Basic Pack | 100 | $9 | $0.09 |
| Pro Pack | 250 | $20 | $0.08 |
| Premium Pack | 500 | $35 | $0.07 |
| Ultimate Pack | 1000 | $60 | $0.06 |

## Firestore Security Rules

Add these rules to your Firestore (simplified for easier setup):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Transactions subcollection
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

**For Testing Only** (allows all authenticated users - use temporarily):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Setup Steps

### 1. Enable Firestore
1. Go to Firebase Console: https://console.firebase.google.com/project/angular-fin-484311-c3
2. Click "Firestore Database" in the left menu
3. Click "Create database"
4. Choose "Start in production mode"
5. Select your region (closest to your users)
6. Click "Enable"

### 2. Set Security Rules
1. Go to "Firestore Database" → "Rules" tab
2. Copy and paste the security rules above
3. Click "Publish"

### 3. Test the System
1. Sign in to your app
2. Check that you receive 10 free credits
3. Generate an image (should deduct 1 credit)
4. Check your credit balance updates

## Monitoring Credits

### View User Credits in Firebase Console
1. Go to Firestore Database
2. Navigate to `users` collection
3. Click on a user document to see their credits

### View Transaction History
1. Go to Firestore Database
2. Navigate to `users/{userId}/transactions`
3. See all credit transactions for that user

## Future Enhancements

- Payment integration (Stripe/PayPal)
- Subscription plans (monthly credits)
- Referral system (earn credits by referring friends)
- Credit expiration dates
- Admin dashboard for credit management
- Usage analytics and reporting
