import express from 'express';
import claudeHandler from './claude.js';

const router = express.Router();

// POST /api/claude
router.post('/', async (req, res) => {
  try {
    await claudeHandler(req, res);
  } catch (err) {
    console.error('❌ Unhandled error in claudeHandler:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

export default router; 