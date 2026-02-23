const pool = require('../config/database');
const { addHistory } = require('./historyService');

/**
 * Cancel segments: X1, X1-3, X1/3
 */
async function cancelSegments(session, segInput) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE FIRST' };
  }

  // Parse segment numbers
  let segNumbers = [];

  // Range: X1-3
  const rangeMatch = segInput.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    for (let i = start; i <= end; i++) segNumbers.push(i);
  }
  // List: X1/3
  else if (segInput.includes('/')) {
    segNumbers = segInput.split('/').map(n => parseInt(n));
  }
  // Single: X1
  else {
    segNumbers = [parseInt(segInput)];
  }

  if (segNumbers.some(isNaN)) {
    return { output: 'INVALID SEGMENT NUMBER' };
  }

  // Get current segments
  const { rows: segments } = await pool.query(
    `SELECT s.*, f.flight_number FROM segments s
     JOIN flights f ON s.flight_id = f.id
     WHERE s.pnr_id = $1 ORDER BY s.seg_number`,
    [session.currentPnrId]
  );

  const results = [];
  for (const num of segNumbers) {
    const seg = segments.find(s => s.seg_number === num);
    if (!seg) {
      results.push(`SEGMENT ${num} NOT FOUND`);
      continue;
    }

    // Track original segment for stats
    if (!session.originalSegment) {
      session.originalSegment = {
        flight_number: seg.flight_number,
        date: seg.travel_date,
        class: seg.class_code
      };
      session.flightChangeStartedAt = Date.now();
    }

    // Update status to XX (cancelled)
    await pool.query(
      'UPDATE segments SET status = $1 WHERE id = $2',
      ['XX', seg.id]
    );

    // Release seats back
    await pool.query(
      'UPDATE fare_classes SET sold_seats = GREATEST(sold_seats - $1, 0) WHERE flight_id = $2 AND class_code = $3',
      [seg.num_passengers, seg.flight_id, seg.class_code]
    );

    // Delete the segment
    await pool.query('DELETE FROM segments WHERE id = $1', [seg.id]);

    await addHistory(session.currentPnrId, `CANCELLED SEG ${num} ${seg.flight_number}`);
    results.push(`SEGMENT ${num} ${seg.flight_number} - CANCELLED`);
  }

  // Renumber remaining segments
  const { rows: remaining } = await pool.query(
    'SELECT id FROM segments WHERE pnr_id = $1 ORDER BY seg_number',
    [session.currentPnrId]
  );
  for (let i = 0; i < remaining.length; i++) {
    await pool.query('UPDATE segments SET seg_number = $1 WHERE id = $2', [i + 1, remaining[i].id]);
  }

  session.pnrModified = true;

  return { output: results.join('\n') };
}

module.exports = { cancelSegments };
