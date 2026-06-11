const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/student/history/:studentId — pickup history for a student
router.get('/history/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;
  const requestingUid = req.user.uid;

  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(requestingUid).get();
    const role = userDoc.data()?.role;

    if (role !== 'admin' && requestingUid !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await db
      .collection('pickupHistory')
      .where('studentId', '==', studentId)
      .orderBy('pickedUpAt', 'desc')
      .get();

    const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pickup history', message: err.message });
  }
});

// GET /api/student/all — admin only: list all students
router.get('/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'student')
      .orderBy('name')
      .get();
    const students = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students', message: err.message });
  }
});

//Admin action to Verify or Suspend a student profile
router.post('/update-status', verifyToken, requireAdmin, async (req, res) => {
  const { studentId, action } = req.body; 

  try {
    const db = getDb();
    const auth = getAuth();
    
    let firestoreUpdate = {};
    let authUpdate = {};

    if (action === 'verify') {
      firestoreUpdate = { isVerified: true };
    } else if (action === 'suspend') {
      firestoreUpdate = { status: 'suspended' };
      authUpdate = { disabled: true }; 
    } else if (action === 'unsuspend') {
      firestoreUpdate = { status: 'active' };
      authUpdate = { disabled: false }; 
    } else {
      return res.status(400).json({ error: 'Invalid management action specified' });
    }

   
    await db.collection('users').doc(studentId).update(firestoreUpdate);

   
    if (Object.keys(authUpdate).length > 0) {
      await auth.updateUser(studentId, authUpdate);
    }

    res.status(200).json({ message: `Successfully executed management action: ${action}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user administrative status', message: error.message });
  }
});

//Admin action to permanently Delete user profile account
router.delete('/:studentId', verifyToken, requireAdmin, async (req, res) => {
  const { studentId } = req.params;

  try {
    const db = getDb();
    const auth = getAuth();

    await auth.deleteUser(studentId);

    await db.collection('users').doc(studentId).delete();

    res.status(200).json({ message: 'User account profiles cleanly removed from platform databases' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fully purge user profiles from registries', message: error.message });
  }
});

module.exports = router;
