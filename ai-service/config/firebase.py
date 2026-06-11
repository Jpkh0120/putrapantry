import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def initialize_firebase():
    global _db
    if not firebase_admin._apps:
        # Prefer JSON service account from env var (set as encrypted secret in Vercel)
        sa_json = os.getenv('FIREBASE_SERVICE_ACCOUNT')
        if sa_json:
            try:
                import json
                sa = json.loads(sa_json)
            except Exception as e:
                raise RuntimeError('FIREBASE_SERVICE_ACCOUNT contains invalid JSON') from e
            cred = credentials.Certificate(sa)
            firebase_admin.initialize_app(cred)
            print('✅ Firebase initialized from FIREBASE_SERVICE_ACCOUNT')
        else:
            cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
            if not cred_path:
                raise RuntimeError('FIREBASE_CREDENTIALS_PATH not set in .env and no FIREBASE_SERVICE_ACCOUNT present')
            # Normalize path for Windows
            cred_path = os.path.normpath(cred_path)
            if not os.path.exists(cred_path):
                raise FileNotFoundError(f'Service account key not found at: {cred_path}')
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print(f'✅ Firebase initialized in AI service (from file)')
    _db = firestore.client()

def get_db():
    if _db is None:
        raise RuntimeError('Firebase not initialized. Call initialize_firebase() first.')
    return _db