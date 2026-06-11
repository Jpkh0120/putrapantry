const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { FieldValue } = require('firebase-admin').firestore;

// 1. ADMIN: GET ALL PENDING
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('reservations').where('status', '==', 'pending').get();
    if (snapshot.empty) return res.json([]);
    const data = await Promise.all(snapshot.docs.map(async (doc) => {
      const resData = doc.data();
      let itemName = 'Unknown Item', studentName = 'Unknown Student';
      if (resData.itemId) {
        const itemDoc = await db.collection('inventory').doc(resData.itemId).get();
        if (itemDoc.exists) itemName = itemDoc.data().itemName;
      }
      if (resData.studentId) {
        const userDoc = await db.collection('users').doc(resData.studentId).get();
        if (userDoc.exists) studentName = userDoc.data().name;
      }
      return { id: doc.id, ...resData, item: itemName, studentName };
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. STUDENT: GET OWN RESERVATIONS
router.get('/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;
  try {
    const db = getDb();
    const snapshot = await db.collection('reservations').where('studentId', '==', studentId).get();
    if (snapshot.empty) return res.json([]);
    const data = await Promise.all(snapshot.docs.map(async (doc) => {
      const resData = doc.data();
      let itemName = 'Unknown Item';
      if (resData.itemId) {
        const itemDoc = await db.collection('inventory').doc(resData.itemId).get();
        if (itemDoc.exists) itemName = itemDoc.data().itemName;
      }
      return { id: doc.id, ...resData, item: itemName };
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. POST: CREATE RESERVATION
router.post('/create', verifyToken, async (req, res) => {
  const { itemId, quantity } = req.body;
  const studentId = req.user.uid;
  try {
    const db = getDb();
    const itemRef = db.collection('inventory').doc(itemId);
    const reservationRef = db.collection('reservations').doc();
    const reservation = { studentId, itemId, quantity: Number(quantity), status: 'pending', reservedAt: new Date().toISOString() };
    await db.runTransaction(async (t) => {
      const itemDoc = await t.get(itemRef);
      if (!itemDoc.exists) throw new Error('NOT_FOUND');
      const currentQty = itemDoc.data().quantity;
      if (currentQty < quantity) throw new Error('INSUFFICIENT_STOCK');
      t.update(itemRef, { quantity: currentQty - Number(quantity), lastUpdated: new Date().toISOString() });
      t.set(reservationRef, reservation);
    });
    res.status(201).json({ id: reservationRef.id, ...reservation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. PUT: CANCEL ITEM (student)
router.put('/cancel/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const resRef = db.collection('reservations').doc(id);
    const resDoc = await resRef.get();
    if (!resDoc.exists) return res.status(404).json({ error: 'Not found' });
    const resData = resDoc.data();
    await db.collection('inventory').doc(resData.itemId).update({
      quantity: FieldValue.increment(resData.quantity),
      lastUpdated: new Date().toISOString()
    });
    await resRef.update({ status: 'cancelled' });
    res.json({ message: 'Cancelled', id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. STUDENT: CONFIRM COLLECTION GROUP
router.put('/student-collect-group', verifyToken, async (req, res) => {
  const requestingUid = req.user.uid;
  const { reservedAt } = req.body;

  if (!reservedAt) {
    return res.status(400).json({ error: 'Validation Error', message: 'reservedAt string is required' });
  }

  try {
    const db = getDb();
    const startOfMinute = new Date(reservedAt);

    if (isNaN(startOfMinute.getTime())) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid Date format provided' });
    }

    startOfMinute.setSeconds(0);
    startOfMinute.setMilliseconds(0);
    const endOfMinute = new Date(startOfMinute);
    endOfMinute.setMinutes(endOfMinute.getMinutes() + 1);

    const snapshot = await db
      .collection('reservations')
      .where('studentId', '==', requestingUid)
      .where('status', 'in', ['pending', 'approved'])
      .where('reservedAt', '>=', startOfMinute.toISOString())
      .where('reservedAt', '<', endOfMinute.toISOString())
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Not Found', message: 'No collectable items found in this minute group.' });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      const itemData = doc.data();
      batch.update(doc.ref, { status: 'collected' });
      const historyRef = db.collection('pickupHistory').doc();
      batch.set(historyRef, {
        studentId: itemData.studentId,
        itemId: itemData.itemId,
        quantityTaken: itemData.quantity,
        pickedUpAt: new Date().toISOString()
      });
    });

    await batch.commit();
    res.json({ message: 'Success', count: snapshot.size });
  } catch (err) {
    res.status(500).json({ error: 'Internal Error', message: err.message });
  }
});

// 6. ADMIN: APPROVE RESERVATION
router.put('/approve/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const resRef = db.collection('reservations').doc(id);
    const resDoc = await resRef.get();
    if (!resDoc.exists) return res.status(404).json({ error: 'Not found' });
    await resRef.update({ status: 'approved', approvedAt: new Date().toISOString() });
    res.json({ message: 'Approved', id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. ADMIN: REJECT RESERVATION (returns stock)
router.put('/reject/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    const resRef = db.collection('reservations').doc(id);
    const resDoc = await resRef.get();
    if (!resDoc.exists) return res.status(404).json({ error: 'Not found' });
    const resData = resDoc.data();
    await db.collection('inventory').doc(resData.itemId).update({
      quantity: FieldValue.increment(resData.quantity),
      lastUpdated: new Date().toISOString()
    });
    await resRef.update({ status: 'rejected', rejectedAt: new Date().toISOString() });
    res.json({ message: 'Rejected', id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;