# PutraPantry 🥗

A smart food bank management system for UPM students and admins.

## Project Structure

```
putrapantry/
├── frontend/          # React.js (Vite)
├── backend/           # Node.js + Express.js
├── ai-service/        # Python Flask microservice
└── docs/              # Architecture & setup docs
```

---

## ⚙️ Prerequisites

- Node.js >= 18
- Python >= 3.10
- Firebase project (Firestore + Auth enabled)
- Google Gemini API key

---

## 🚀 Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/putrapantry.git
cd putrapantry
```

---

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project: `putrapantry`
3. Enable **Authentication** → Sign-in method → Email/Password
4. Enable **Firestore Database** → Start in test mode (then apply security rules)
5. Go to **Project Settings** → Your Apps → Add Web App
6. Copy the Firebase config object
7. Go to **Project Settings** → Service Accounts → Generate new private key
8. Save the downloaded JSON as `backend/src/config/serviceAccountKey.json`

---

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

---

### 4. AI Service Setup

```bash
cd ai-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in GEMINI_API_KEY and FIREBASE_CREDENTIALS_PATH in .env
python app.py
```

AI service runs on: `http://localhost:8000`

---

### 5. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Fill in your Firebase web config values in .env
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 🗂️ Git Repository Setup (New Repo)

```bash
# From project root
git init
git add .
git commit -m "feat: initial PutraPantry project structure"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/putrapantry.git
git push -u origin main
```

### Recommended Branch Strategy

```
main          → stable, production-ready
dev           → integration branch
feature/*     → individual features (e.g. feature/inventory-crud)
sprint/*      → sprint branches (e.g. sprint/2-core-platform)
```

---

## 📦 Environment Variables Summary

| File | Key Variables |
|---|---|
| `backend/.env` | `PORT`, `FIREBASE_CREDENTIALS_PATH`, `AI_SERVICE_URL` |
| `ai-service/.env` | `GEMINI_API_KEY`, `FIREBASE_CREDENTIALS_PATH`, `PORT` |
| `frontend/.env` | All `VITE_FIREBASE_*` config values |

---

## 🧪 Running All Services

Open 3 terminals:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd ai-service && source venv/bin/activate && python app.py

# Terminal 3
cd frontend && npm run dev
```
