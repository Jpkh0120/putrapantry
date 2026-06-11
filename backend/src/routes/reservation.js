const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/reservation/:studentId — student sees own reservations, admin sees any
router.get('/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;
  const requestingUid = req.user.uid;

  // Students can only query their own reservations
  // Admins can query any student's reservations
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(requestingUid).get();
    const role = userDoc.data()?.role;

    if (role !== 'admin' && requestingUid !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await db
      .collection('reservations')
      .where('studentId', '==', studentId)
      .orderBy('reservedAt', 'desc')
      .get();

    const reservations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reservations', message: err.message });
  }
});

// POST /api/reservation/create
router.post('/create', verifyToken, async (req, res) => {
  const { itemId, quantity } = req.body;
  const studentId = req.user.uid;

  if (!itemId || !quantity) {
    return res.status(400).json({ error: 'itemId and quantity are required' });
  }

  try {
    const db = getDb();

    // Check stock availability
    const itemDoc = await db.collection('inventory').doc(itemId).get();
    if (!itemDoc.exists) return res.status(404).json({ error: 'Item not found' });

    const currentQty = itemDoc.data().quantity;
    if (currentQty < quantity) {
      return res.status(400).json({ error: 'Insufficient stock', available: currentQty });
    }

    // Create reservation
    const reservation = {
      studentId,
      itemId,
      quantity: Number(quantity),
      status: 'pending',
      reservedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('reservations').add(reservation);

    // Decrement inventory
    await db.collection('inventory').doc(itemId).update({
      quantity: currentQty - Number(quantity),
      lastUpdated: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, ...reservation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reservation', message: err.message });
  }
});

// PUT /api/reservation/cancel/:id
router.put('/cancel/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const resDoc = await db.collection('reservations').doc(id).get();
    if (!resDoc.exists) return res.status(404).json({ error: 'Reservation not found' });

    const resData = resDoc.data();

    // Only owner or admin can cancel
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const role = userDoc.data()?.role;
    if (role !== 'admin' && resData.studentId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (resData.status === 'collected') {
      return res.status(400).json({ error: 'Cannot cancel a collected reservation' });
    }

    // Restore inventory quantity
    await db.collection('inventory').doc(resData.itemId).update({
      quantity: require('firebase-admin').firestore.FieldValue.increment(resData.quantity),
      lastUpdated: new Date().toISOString(),
    });

    await db.collection('reservations').doc(id).update({ status: 'cancelled' });

    res.json({ message: 'Reservation cancelled', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel reservation', message: err.message });
  }
});

// PUT /api/reservation/collect/:id — admin marks as collected and logs pickup
router.put('/collect/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const resDoc = await db.collection('reservations').doc(id).get();
    if (!resDoc.exists) return res.status(404).json({ error: 'Reservation not found' });

    const resData = resDoc.data();

    await db.collection('reservations').doc(id).update({ status: 'collected' });

    // Log to pickupHistory
    await db.collection('pickupHistory').add({
      studentId: resData.studentId,
      itemId: resData.itemId,
      quantityTaken: resData.quantity,
      pickedUpAt: new Date().toISOString(),
    });

    res.json({ message: 'Marked as collected', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reservation', message: err.message });
  }
});

module.exports = router;
