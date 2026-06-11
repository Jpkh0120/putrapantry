const admin = require('firebase-admin');
const path = require('path');

let db;
let auth;

function initializeFirebase() {
  if (admin.apps.length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT contains invalid JSON');
      }
    } else {
      const credentialsPath = path.resolve(
        process.env.FIREBASE_CREDENTIALS_PATH || './src/config/serviceAccountKey.json'
      );

      serviceAccount = require(credentialsPath);
    }

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
 //hi