const pool = require('../config/database');
const { formatAvailability } = require('./formatService');
const { parseGDSDate, toISODate } = require('../utils/dateParser');

/**
 * Search flight availability: 125DECSFOJFK
 * Format: <seats><date><origin><dest>
 */
async function searchAvailability(session, input) {
  // Parse: optional seat count (default 1), date (DDMMM), origin (3 chars), dest (3 chars)
  const match = input.match(/^(\d)?(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})$/);
  if (!match) {
    return { output: 'INVALID FORMAT - USE: 1DDMMMCCCYYY (E.G. 125DECSFOJFK)' };
  }

  const numSeats = parseInt(match[1] || '1', 10);
  const dateStr = match[2];
  const origin = match[3];
  const dest = match[4];

  const date = parseGDSDate(dateStr);
  if (!date) {
    return { output: 'INVALID DATE' };
  }

  // Find flights for this route
  const { rows: flights } = await pool.query(
    `SELECT f.id, f.flight_number, f.depart_time, f.arrive_time, f.equipment, f.duration_mins,
            f.origin, f.destination
     FROM flights f
     WHERE f.origin = $1 AND f.destination = $2
     ORDER BY f.depart_time`,
    [origin, dest]
  );

  if (flights.length === 0) {
    return { output: `NO FLIGHTS ${origin} TO ${dest}` };
  }

  // Get fare classes for each flight
  for (const f of flights) {
    const { rows: classes } = await pool.query(
      `SELECT class_code, total_seats, sold_seats FROM fare_classes
       WHERE flight_id = $1 ORDER BY
       CASE class_code WHEN 'Y' THEN 1 WHEN 'B' THEN 2 WHEN 'M' THEN 3 WHEN 'H' THEN 4 WHEN 'Q' THEN 5 WHEN 'K' THEN 6 END`,
      [f.id]
    );
    f.classes = classes;
  }

  // Cache results for sell command
  session.lastAvailability = {
    date,
    origin,
    dest,
    numSeats,
    flights
  };

  return { output: formatAvailability(date, origin, dest, flights) };
}

module.exports = { searchAvailability };
