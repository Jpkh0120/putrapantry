const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// GET /api/ai/restock-suggestions — admin only
router.get('/restock-suggestions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/restock-suggestions`);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

// GET /api/ai/demand-forecast — admin only
router.get('/demand-forecast', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/demand-forecast`);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

// GET /api/ai/expiry-alerts — admin only
router.get('/expiry-alerts', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/expiry-alerts`);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

// POST /api/ai/chatbot — authenticated students and admins
router.post('/chatbot', verifyToken, async (req, res) => {
  const { query, studentId } = req.body;

  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/chatbot`, {
      query,
      studentId: studentId || req.user.uid,
    });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

module.exports = router;
