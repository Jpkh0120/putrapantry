const { getAuth } = require('../config/firebase');

/**
 * Verifies Firebase ID token from Authorization header,
 * checks Firestore for account verification status,
 * and attaches the decoded token payload to req.user.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Decode the core Firebase Auth token signatures
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;

    // 2. Fetch the corresponding user document from Firestore to check registration flags
    const { getDb } = require('../config/firebase');
    const userDoc = await getDb().collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Forbidden', message: 'User profile registry not found.' });
    }

    const userData = userDoc.data();

    // 3. ENFORCE BUSINESS RULE: Require verification for students, but allow admins straight through
    if (userData.role !== 'admin' && !userData.isVerified) {
      return res.status(403).json({ 
        error: 'UNVERIFIED_ACCOUNT', 
        message: 'Your account is currently pending administrator verification. Please wait for approval before accessing pantry resources.' 
      });
    }

    // Pass control securely to the next router endpoint handler
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to restrict access to admin role only.
 * Must run after verifyToken.
 */
async function requireAdmin(req, res, next) {
  const { getDb } = require('../config/firebase');
  try {
    const userDoc = await getDb().collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userRole = 'admin';
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify user role' });
  }
}

module.exports = { verifyToken, requireAdmin };