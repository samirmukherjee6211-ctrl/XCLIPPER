# Onboarding Flow Documentation

## User Journey

### 1. Landing Page (`index.html`)
**First page visitors see**

- Beautiful hero section with "Create Viral YouTube Thumbnails with AI"
- Features showcase (6 key features)
- CTA buttons: "Get Started Free" and "Learn More"
- Navigation with "Sign In" button
- Glassmorphic design matching the app theme

**Actions:**
- Click "Get Started Free" → Goes to `/signin.html`
- Click "Sign In" → Goes to `/signin.html`
- Click "Learn More" → Scrolls to features section

---

### 2. Sign In/Sign Up Page (`signin.html`)
**Authentication page**

- Sign up with Google (one-click)
- Sign up with Email/Password
- Form validation
- Firebase Authentication integration
- Terms & Privacy Policy checkboxes

**After Successful Sign Up/Sign In:**
- Redirects to `/app.html` (the workspace)

---

### 3. Workspace (`app.html`)
**Main application**

- Full thumbnail generation interface
- Prompt mode with AI generation
- Recreate and Edit modes
- Persona management
- Credit system (1,000 credits to start)
- Optimize page for thumbnail analysis
- Upgrade page with pricing

---

## File Structure

```
/
├── index.html          # Landing page (public)
├── signin.html         # Sign in/Sign up page
├── app.html           # Main workspace (requires auth)
├── App.tsx            # React app component
├── index.tsx          # React entry point
└── ...
```

## URLs

- **Landing**: `https://yourdomain.com/`
- **Sign In**: `https://yourdomain.com/signin.html`
- **Workspace**: `https://yourdomain.com/app.html`

## Authentication Flow

1. User visits landing page
2. Clicks "Get Started Free"
3. Lands on sign in page
4. Signs up with Google or Email
5. Firebase creates account
6. Redirects to `/app.html`
7. User starts with 1,000 credits

## Notes

- Landing page is public (no auth required)
- Sign in page is public (no auth required)
- Workspace (`app.html`) should check for authentication
- Credits are managed locally (no Firebase persistence yet)
- All pages use the same glassmorphic design theme

## Next Steps

To add authentication protection to the workspace:

1. Add auth check at the top of `app.html`
2. Redirect to `/signin.html` if not authenticated
3. Store user session in localStorage or Firebase Auth state

Example:
```javascript
// Add to app.html
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '/signin.html';
  }
});
```
