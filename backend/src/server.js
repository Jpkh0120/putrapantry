require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeFirebase } = require('./config/firebase');

// Route imports
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const reservationRoutes = require('./routes/reservation');
const studentRoutes = require('./routes/student');
const aiRoutes = require('./routes/ai');
const adminUsersRoutes = require('./routes/adminUsers'); 

// Initialize Firebase Admin SDK
initializeFirebase();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,        // set in Vercel env vars
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'putrapantry-backend' });
});

// Root and API index for visibility
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'PutraPantry backend',
    health: '/health',
    api_index: '/api',
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    apis: [
      '/api/auth (POST /register, POST /logout, GET /me)',
      '/api/inventory (GET, POST /add, PUT /update/:id, DELETE /delete/:id)',
      '/api/reservation',
      '/api/student',
      '/api/ai',
      '/api/admin'
    ]
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reservation', reservationRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminUsersRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 PutraPantry backend running on port ${PORT}`);
});