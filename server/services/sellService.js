const pool = require('../config/database');
const { addHistory } = require('./historyService');
const { formatGDSDate } = require('../utils/dateParser');
const { formatGDSTime } = require('../utils/timeFormatter');

/**
 * Sell seats from availability display: 01Y2
 * Format: 0<numSeats><classCode><lineNumber>
 */
async function sellFromAvailability(session, numSeats, classCode, lineNumber) {
  if (!session.lastAvailability) {
    return { output: 'NO AVAILABILITY DISPLAYED - SEARCH FIRST' };
  }

  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE OR CREATE FIRST' };
  }

  const avail = session.lastAvailability;
  const idx = lineNumber - 1;

  if (idx < 0 || idx >= avail.flights.length) {
    return { output: `INVALID LINE NUMBER - ENTER 1 THROUGH ${avail.flights.length}` };
  }

  const flight = avail.flights[idx];

  // Check class availability
  const cls = flight.classes.find(c => c.class_code === classCode.toUpperCase());
  if (!cls) {
    return { output: `CLASS ${classCode} NOT AVAILABLE ON ${flight.flight_number}` };
  }

  const available = cls.total_seats - cls.sold_seats;
  if (available < numSeats) {
    if (available === 0) {
      return { output: `${classCode} CLASS CLOSED ON ${flight.flight_number} - TRY HIGHER CLASS` };
    }
    return { output: `ONLY ${available} SEATS AVAILABLE IN ${classCode} ON ${flight.flight_number}` };
  }

  // Sell the seats - update fare class
  await pool.query(
    'UPDATE fare_classes SET sold_seats = sold_seats + $1 WHERE flight_id = $2 AND class_code = $3',
    [numSeats, flight.id, classCode.toUpperCase()]
  );

  // Get next segment number
  const { rows } = await pool.query(
    'SELECT MAX(seg_number) as max_seg FROM segments WHERE pnr_id = $1',
    [session.currentPnrId]
  );
  const nextSeg = (rows[0].max_seg || 0) + 1;

  // Get passenger count
  const paxCount = (await pool.query(
    'SELECT COUNT(*) FROM passengers WHERE pnr_id = $1',
    [session.currentPnrId]
  )).rows[0].count;

  // Insert segment
  const travelDate = avail.date.toISOString().split('T')[0];
  await pool.query(
    `INSERT INTO segments (pnr_id, flight_id, seg_number, travel_date, class_code, status, num_passengers)
     VALUES ($1, $2, $3, $4, $5, 'HK', $6)`,
    [session.currentPnrId, flight.id, nextSeg, travelDate, classCode.toUpperCase(), parseInt(paxCount)]
  );

  session.pnrModified = true;

  // Track for stats
  session.newSegment = {
    flight_number: flight.flight_number,
    date: travelDate,
    class: classCode
  };

  if (!session.flightChangeStartedAt && session.originalSegment) {
    session.flightChangeStartedAt = session.flightChangeStartedAt || Date.now();
  }

  const dateStr = formatGDSDate(avail.date);
  const dep = formatGDSTime(flight.depart_time);
  const arr = formatGDSTime(flight.arrive_time);

  await addHistory(session.currentPnrId, `SOLD ${numSeats}${classCode} ${flight.flight_number} ${dateStr}`);

  return {
    output: ` ${nextSeg} ${flight.flight_number} ${classCode.toUpperCase()} ${dateStr} ${flight.origin}${flight.destination} HK${paxCount}  ${dep} ${arr}  ${flight.equipment}`
  };
}

module.exports = { sellFromAvailability };
