const pool = require('../config/database');
const { formatHistory } = require('./formatService');

async function addHistory(pnrId, action) {
  await pool.query(
    'INSERT INTO pnr_history (pnr_id, action) VALUES ($1, $2)',
    [pnrId, action]
  );
}

async function getHistory(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE FIRST' };
  }

  const { rows } = await pool.query(
    'SELECT action, agent, created_at FROM pnr_history WHERE pnr_id = $1 ORDER BY created_at',
    [session.currentPnrId]
  );

  return { output: formatHistory(rows) };
}

module.exports = { addHistory, getHistory };
