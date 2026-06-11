const express = require('express');
const router = express.Router();
const { getAuth, getDb } = require('../config/firebase');

// POST /api/auth/register
// Called after Firebase client-side registration to create the user doc in Firestore
router.post('/register', async (req, res) => {
  const { uid, name, email, role } = req.body;

  if (!uid || !name || !email) {
    return res.status(400).json({ error: 'uid, name, and email are required' });
  }

  const allowedRoles = ['student', 'admin'];
  const userRole = allowedRoles.includes(role) ? role : 'student';

  try {
    const db = getDb();
    await db.collection('users').doc(uid).set({
      name,
      email,
      role: userRole,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: 'User registered', uid, role: userRole });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register user', message: err.message });
  }
});

// POST /api/auth/logout  (server-side token revocation — optional)
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Missing token' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    await getAuth().revokeRefreshTokens(decoded.uid);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(401).json({ error: 'Failed to logout', message: err.message });
  }
});

// GET /api/auth/me — returns the current user's profile from Firestore
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    const db = getDb();
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ uid: decoded.uid, ...userDoc.data() });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', message: err.message });
  }
});

module.exports = router;
