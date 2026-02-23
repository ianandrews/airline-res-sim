const express = require('express');
const path = require('path');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', apiRouter);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server with auto-migrate and seed
async function start() {
  try {
    await migrate();
    await seed();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SABRE GDS SIMULATOR ONLINE - PORT ${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err.message);
    // Start anyway even if DB fails (for development without DB)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SABRE GDS SIMULATOR ONLINE - PORT ${PORT} (NO DATABASE)`);
    });
  }
}

start();
