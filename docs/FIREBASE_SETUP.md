# Firebase Setup Guide — PutraPantry

## Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click **Add project** → name it `putrapantry` → Continue
3. Disable Google Analytics (optional) → Create project

---

## Step 2: Enable Authentication
1. Left sidebar → **Build → Authentication** → Get Started
2. **Sign-in method** tab → Enable **Email/Password** → Save

---

## Step 3: Create Firestore Database
1. Left sidebar → **Build → Firestore Database** → Create database
2. Choose **Start in test mode** (we will apply security rules later)
3. Select a Cloud Firestore location closest to Malaysia (e.g. `asia-southeast1`) → Enable

---

## Step 4: Get Web App Config (for Frontend)
1. Left sidebar → **Project Settings** (gear icon)
2. Scroll to **Your apps** → Click **</>** (Web)
3. Register app name: `putrapantry-web` → Register App
4. Copy the `firebaseConfig` object values into `frontend/.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Step 5: Get Service Account Key (for Backend + AI Service)
1. **Project Settings** → **Service accounts** tab
2. Click **Generate new private key** → Download JSON
3. Rename the file to `serviceAccountKey.json`
4. Place it at: `backend/src/config/serviceAccountKey.json`
   - **NEVER commit this file to Git** — it is in `.gitignore`

---

## Step 6: Apply Firestore Security Rules
1. In the Firebase Console → **Firestore Database** → **Rules** tab
2. Copy the contents of `docs/firestore.rules` and paste it in
3. Click **Publish**

---

## Step 7: Verify Setup
Run all three services (see README.md) and:
- Visit `http://localhost:5173` → Register a student account
- Check Firebase Console → Authentication → Users to confirm registration
- Check Firestore → `users` collection for the created document
