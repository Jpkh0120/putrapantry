const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// =========================================================================
// 1. GET /api/ai/restock-suggestions — Admin Only
// =========================================================================
router.get('/restock-suggestions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/restock-suggestions`);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

// =========================================================================
// 2. GET /api/ai/demand-forecast — Admin Only
// =========================================================================
router.get('/demand-forecast', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/demand-forecast`);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

// =========================================================================
// 3. GET /api/ai/expiry-alerts — Admin Only
// =========================================================================
router.get('/expiry-alerts', verifyToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/expiry-alerts`);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

// =========================================================================
// 4. POST /api/ai/chatbot — Legacy Endpoint mapping
// =========================================================================
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

// =========================================================================
// 5. 🌟 ADDED ALIAS: POST /api/ai/chat — Resolves AdminDashboard client routing conflict
// =========================================================================
router.post('/chat', verifyToken, async (req, res) => {
  const { query, studentId, role } = req.body;

  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    // Relays cleanly to your Python microservice framework on port 8000
    const response = await axios.post(`${AI_SERVICE_URL}/ai/chatbot`, {
      query,
      studentId: studentId || req.user.uid,
      role: role || 'admin'
    });
    
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable', message: err.message });
  }
});

module.exports = router;