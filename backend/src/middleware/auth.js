const { getAuth } = require('../config/firebase');

/**
 * Verifies Firebase ID token from Authorization header.
 * Attaches decoded token to req.user.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;
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
