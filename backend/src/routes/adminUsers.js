const express = require('express');
const router = express.Router();
const admin = require('firebase-admin'); 
const { getDb } = require('../config/firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// =========================================================================
// STEP 2: GET /api/admin/students — Fetch all student records
// =========================================================================
router.get('/students', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    
    // Query users collection filtering down exclusively to students
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'student')
      .get();

    if (snapshot.empty) return res.json([]);

    const studentList = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    res.json(studentList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student account roster.', message: err.message });
  }
});

// =========================================================================
// STEP 3A: PUT /api/admin/verify/:uid — Toggle verification flag
// =========================================================================
router.put('/verify/:uid', verifyToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { isVerified } = req.body; 

  try {
    const db = getDb();
    
    await db.collection('users').doc(uid).update({
      isVerified: Boolean(isVerified),
      status: isVerified ? 'active' : 'pending', 
      lastUpdated: new Date().toISOString()
    });

    res.json({ message: `Student status verification set to ${isVerified}`, uid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to modify student verification flags.', message: err.message });
  }
});

// =========================================================================
// STEP 3B: PUT /api/admin/suspend/:uid — Suspend Student (Auth & DB)
// =========================================================================
router.put('/suspend/:uid', verifyToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { isSuspended } = req.body; 

  try {
    const db = getDb();

    // 1. Mutate state inside the safe Firebase Authentication system to block/permit login tokens
    await admin.auth().updateUser(uid, {
      disabled: Boolean(isSuspended)
    });

    // 2. Sync account status down within the public facing Firestore profile record
    await db.collection('users').doc(uid).update({
      status: isSuspended ? 'suspended' : 'active',
      lastUpdated: new Date().toISOString()
    });

    res.json({ message: isSuspended ? 'Student account suspended.' : 'Student account activated.', uid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute structural block state modifications.', message: err.message });
  }
});

// =========================================================================
// STEP 3C: DELETE /api/admin/delete/:uid — Full Purge Delete
// =========================================================================
router.delete('/delete/:uid', verifyToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;

  try {
    const db = getDb();

    // 1. Permanently remove credentials profile out of Firebase Authentication
    await admin.auth().deleteUser(uid);

    // 2. Delete data tracking profiles out of Firestore collection entries
    await db.collection('users').doc(uid).delete();

    res.json({ message: 'Student completely dropped and removed from system registries.', uid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to completely purge user record.', message: err.message });
  }
});

module.exports = router;