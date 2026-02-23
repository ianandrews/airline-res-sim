const express = require('express');
const router = express.Router();
const { createSession, getSession } = require('../services/sessionManager');
const { parseAndExecute } = require('../services/commandParser');

// Initialize a new session
router.get('/session/init', (req, res) => {
  const session = createSession();
  res.json({ sessionId: session.id });
});

// Process a command
router.post('/command', async (req, res) => {
  const { sessionId, command } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'SESSION ID REQUIRED' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'SESSION NOT FOUND - REFRESH PAGE' });
  }

  if (!command && command !== '') {
    return res.status(400).json({ error: 'COMMAND REQUIRED' });
  }

  try {
    const result = await parseAndExecute(session, command);
    res.json({
      output: result.output || '',
      beep: result.beep || false,
      delay: result.delay || 0,
      isDemo: result.isDemo || false,
      commandCount: session.commandCount,
      keystrokeCount: session.keystrokeCount
    });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'SYSTEM ERROR - CONTACT HELP DESK' });
  }
});

module.exports = router;
