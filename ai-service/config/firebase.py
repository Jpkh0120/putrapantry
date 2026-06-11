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
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
        if not cred_path:
            raise RuntimeError('FIREBASE_CREDENTIALS_PATH not set in .env')
        
        # Normalize path for Windows
        cred_path = os.path.normpath(cred_path)
        
        if not os.path.exists(cred_path):
            raise FileNotFoundError(f'Service account key not found at: {cred_path}')
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f'✅ Firebase initialized in AI service')
    _db = firestore.client()

def get_db():
    if _db is None:
        raise RuntimeError('Firebase not initialized. Call initialize_firebase() first.')
    return _db