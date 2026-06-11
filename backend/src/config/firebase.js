const admin = require('firebase-admin');
const path = require('path');

let db;
let auth;

function initializeFirebase() {
  if (admin.apps.length === 0) {
    const credentialsPath = path.resolve(
      process.env.FIREBASE_CREDENTIALS_PATH || './src/config/serviceAccountKey.json'
    );

    const serviceAccount = require(credentialsPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized');
  }

  db = admin.firestore();
  auth = admin.auth();
}

function getDb() {
  if (!db) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return db;
}

function getAuth() {
  if (!auth) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return auth;
}

module.exports = { initializeFirebase, getDb, getAuth };

