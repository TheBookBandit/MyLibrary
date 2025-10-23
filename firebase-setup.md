# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name your project (e.g., "math-library")
4. Disable Google Analytics (not needed)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

## Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your preferred location
5. Click **Done**

## Step 4: Set Up Security Rules

Go to **Firestore Database** → **Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Admins can read/write all user profiles
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Admin notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click **Web** icon (</>)
4. Register your app (name: "Math Library")
5. Copy the Firebase configuration object

```javascript
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCdt0HTxWn0q8vn0Zm_jifySmO7HtSrjRc",
  authDomain: "my-library-2004.firebaseapp.com",
  projectId: "my-library-2004",
  storageBucket: "my-library-2004.firebasestorage.app",
  messagingSenderId: "198113963221",
  appId: "1:198113963221:web:fa09911d75300ce7c4065c",
  measurementId: "G-0YYS0DT0J8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

## Step 6: Update Your Code

Replace the Firebase config in `index.html`:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

## Step 7: Update Admin Email

In `auth.js`, change line 24:
```javascript
const ADMIN_EMAIL = 'your-actual-admin-email@domain.com';
```

## Step 8: Deploy to GitHub Pages

1. Push all files to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Your site will be available at: `https://username.github.io/repository-name/`

## Security Notes

- The first user who registers with the ADMIN_EMAIL becomes the admin automatically
- All other users need admin approval before accessing the library
- Firestore security rules ensure users can only access their own data
- Admin can approve/reject users and manage all user accounts

## Testing

1. Register with your admin email - you'll get immediate access
2. Register with a different email - you'll see "Pending Approval"
3. Login as admin and approve the pending user
4. Test both Library Lite and Library Full access
