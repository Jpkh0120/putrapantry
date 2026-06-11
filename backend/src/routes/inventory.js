const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/inventory — all authenticated users
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('inventory').orderBy('itemName').get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory', message: err.message });
  }
});

// POST /api/inventory/add — admin only
router.post('/add', verifyToken, requireAdmin, async (req, res) => {
  const { itemName, quantity, expiryDate, category } = req.body;

  if (!itemName || quantity === undefined || !expiryDate || !category) {
    return res.status(400).json({ error: 'itemName, quantity, expiryDate, category are required' });
  }

  try {
    const db = getDb();
    const newItem = {
      itemName,
      quantity: Number(quantity),
      expiryDate,
      category,
      lastUpdated: new Date().toISOString(),
    };
    const docRef = await db.collection('inventory').add(newItem);
    res.status(201).json({ id: docRef.id, ...newItem });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item', message: err.message });
  }
});

// PUT /api/inventory/update/:id — admin only
router.put('/update/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Prevent overwriting the doc id
  delete updates.id;
  updates.lastUpdated = new Date().toISOString();

  try {
    const db = getDb();
    await db.collection('inventory').doc(id).update(updates);
    res.json({ message: 'Item updated', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item', message: err.message });
  }
});

// DELETE /api/inventory/delete/:id — admin only
router.delete('/delete/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    await db.collection('inventory').doc(id).delete();
    res.json({ message: 'Item deleted', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item', message: err.message });
  }
});

module.exports = router;
