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

module.exports = router;
