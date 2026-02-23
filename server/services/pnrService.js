const pool = require('../config/database');
const { formatPNRDisplay, formatItinerary, formatPassengers, formatPhones, formatNameSearch } = require('./formatService');
const { addHistory } = require('./historyService');
const { clearPnrContext } = require('./sessionManager');
const recordLocator = require('../utils/recordLocator');

/**
 * Load full PNR data by ID
 */
async function loadPNR(pnrId) {
  const pnr = (await pool.query('SELECT * FROM pnrs WHERE id = $1', [pnrId])).rows[0];
  if (!pnr) return null;

  const passengers = (await pool.query(
    'SELECT * FROM passengers WHERE pnr_id = $1 ORDER BY seq_number', [pnrId]
  )).rows;

  const segments = (await pool.query(
    `SELECT s.*, f.flight_number, f.origin, f.destination, f.depart_time, f.arrive_time, f.equipment, f.duration_mins
     FROM segments s JOIN flights f ON s.flight_id = f.id
     WHERE s.pnr_id = $1 ORDER BY s.seg_number`, [pnrId]
  )).rows;

  const phones = (await pool.query(
    'SELECT * FROM phones WHERE pnr_id = $1 ORDER BY id', [pnrId]
  )).rows;

  return { pnr, passengers, segments, phones };
}

/**
 * Retrieve PNR by record locator: *ABCDEF
 */
async function retrieveByLocator(session, locator) {
  const { rows } = await pool.query('SELECT * FROM pnrs WHERE record_locator = $1', [locator.toUpperCase()]);
  if (rows.length === 0) {
    return { output: `RECORD LOCATOR ${locator} - NOT FOUND` };
  }

  const pnrId = rows[0].id;
  session.currentPnrId = pnrId;
  session.currentPnrLocator = rows[0].record_locator;
  session.pnrModified = false;
  session.pnrOpenedAt = Date.now();

  const data = await loadPNR(pnrId);
  return { output: formatPNRDisplay(data.pnr, data.passengers, data.segments, data.phones) };
}

/**
 * Search by name: -SMITH/JOHN
 */
async function searchByName(session, lastName, firstName) {
  let query = `
    SELECT p.id as pnr_id, p.record_locator, pax.last_name, pax.first_name, pax.title
    FROM pnrs p
    JOIN passengers pax ON pax.pnr_id = p.id
    WHERE UPPER(pax.last_name) = $1
  `;
  const params = [lastName.toUpperCase()];

  if (firstName) {
    query += ' AND UPPER(pax.first_name) LIKE $2';
    params.push(firstName.toUpperCase() + '%');
  }

  query += ' ORDER BY p.record_locator';

  const { rows } = await pool.query(query, params);

  if (rows.length === 0) {
    return { output: `NO PNR FOUND FOR ${lastName}${firstName ? '/' + firstName : ''}` };
  }

  // Get first segment for each result for context
  for (const row of rows) {
    const segs = (await pool.query(
      `SELECT f.flight_number, s.travel_date FROM segments s
       JOIN flights f ON s.flight_id = f.id
       WHERE s.pnr_id = $1 ORDER BY s.seg_number LIMIT 1`, [row.pnr_id]
    )).rows;
    row.segments = segs;
  }

  if (rows.length === 1) {
    // Single match - load directly
    session.currentPnrId = rows[0].pnr_id;
    const pnr = (await pool.query('SELECT * FROM pnrs WHERE id = $1', [rows[0].pnr_id])).rows[0];
    session.currentPnrLocator = pnr.record_locator;
    session.pnrModified = false;
    session.pnrOpenedAt = Date.now();

    const data = await loadPNR(rows[0].pnr_id);
    return { output: formatPNRDisplay(data.pnr, data.passengers, data.segments, data.phones) };
  }

  // Multiple matches - store for selection
  session.nameSearchResults = rows;
  return { output: formatNameSearch(rows) };
}

/**
 * Select from name search results: *1, *2, etc.
 */
async function selectFromSearch(session, index) {
  if (!session.nameSearchResults) {
    return { output: 'NO NAME SEARCH ACTIVE - SEARCH FIRST' };
  }

  const idx = index - 1;
  if (idx < 0 || idx >= session.nameSearchResults.length) {
    return { output: `INVALID SELECTION - ENTER *1 THROUGH *${session.nameSearchResults.length}` };
  }

  const selected = session.nameSearchResults[idx];
  session.currentPnrId = selected.pnr_id;
  session.nameSearchResults = null;

  const pnr = (await pool.query('SELECT * FROM pnrs WHERE id = $1', [selected.pnr_id])).rows[0];
  session.currentPnrLocator = pnr.record_locator;
  session.pnrModified = false;
  session.pnrOpenedAt = Date.now();

  const data = await loadPNR(selected.pnr_id);
  return { output: formatPNRDisplay(data.pnr, data.passengers, data.segments, data.phones) };
}

/**
 * Display booking: *B
 */
async function displayBooking(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE FIRST' };
  }
  const data = await loadPNR(session.currentPnrId);
  return { output: formatPNRDisplay(data.pnr, data.passengers, data.segments, data.phones) };
}

/**
 * Display itinerary: *I
 */
async function displayItinerary(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE FIRST' };
  }
  const data = await loadPNR(session.currentPnrId);
  return { output: formatItinerary(data.segments) };
}

/**
 * Display names: *N
 */
async function displayNames(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE FIRST' };
  }
  const { rows } = await pool.query(
    'SELECT * FROM passengers WHERE pnr_id = $1 ORDER BY seq_number', [session.currentPnrId]
  );
  return { output: formatPassengers(rows) };
}

/**
 * Display phones: *P
 */
async function displayPhones(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE FIRST' };
  }
  const { rows } = await pool.query(
    'SELECT * FROM phones WHERE pnr_id = $1 ORDER BY id', [session.currentPnrId]
  );
  return { output: formatPhones(rows) };
}

/**
 * Add passenger name: -DOE/JANE MRS
 */
async function addPassenger(session, lastName, firstName, title) {
  if (!session.currentPnrId) {
    // Creating new PNR
    const loc = recordLocator.generate();
    const res = await pool.query(
      'INSERT INTO pnrs (record_locator) VALUES ($1) RETURNING id', [loc]
    );
    session.currentPnrId = res.rows[0].id;
    session.currentPnrLocator = loc;
    session.pnrModified = true;
    session.pnrOpenedAt = Date.now();
  }

  // Get next seq number
  const { rows } = await pool.query(
    'SELECT seq_number FROM passengers WHERE pnr_id = $1 ORDER BY seq_number DESC LIMIT 1',
    [session.currentPnrId]
  );

  let nextSeq;
  if (rows.length === 0) {
    nextSeq = '1.1';
  } else {
    const parts = rows[0].seq_number.split('.');
    nextSeq = parts[0] + '.' + (parseInt(parts[1]) + 1);
  }

  await pool.query(
    'INSERT INTO passengers (pnr_id, seq_number, last_name, first_name, title) VALUES ($1, $2, $3, $4, $5)',
    [session.currentPnrId, nextSeq, lastName.toUpperCase(), firstName.toUpperCase(), title ? title.toUpperCase() : null]
  );

  session.pnrModified = true;
  const titleStr = title ? ` ${title.toUpperCase()}` : '';
  return { output: ` ${nextSeq} ${lastName.toUpperCase()}/${firstName.toUpperCase()}${titleStr}` };
}

/**
 * Add phone: 9415-555-0123-H
 */
async function addPhone(session, number, phoneType) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT - RETRIEVE OR CREATE FIRST' };
  }

  await pool.query(
    'INSERT INTO phones (pnr_id, phone_type, number) VALUES ($1, $2, $3)',
    [session.currentPnrId, phoneType.toUpperCase(), number]
  );

  session.pnrModified = true;
  const typeLabel = { H: 'HOME', B: 'BUSINESS', M: 'MOBILE' }[phoneType.toUpperCase()] || phoneType;
  return { output: ` ${typeLabel}-${number} ADDED` };
}

/**
 * Set received from: 6SMITH/J
 */
async function setReceivedFrom(session, value) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT' };
  }

  await pool.query('UPDATE pnrs SET received_from = $1 WHERE id = $2', [value.toUpperCase(), session.currentPnrId]);
  session.pnrModified = true;
  return { output: `RECEIVED FROM - ${value.toUpperCase()}` };
}

/**
 * Set ticketing: 7TAW25NOV/
 */
async function setTicketing(session, value) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT' };
  }

  await pool.query('UPDATE pnrs SET ticketing = $1 WHERE id = $2', [value.toUpperCase(), session.currentPnrId]);
  session.pnrModified = true;
  return { output: `TICKETING - ${value.toUpperCase()}` };
}

/**
 * End transaction: ET
 */
async function endTransaction(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT' };
  }

  // Validate required fields
  const pnr = (await pool.query('SELECT * FROM pnrs WHERE id = $1', [session.currentPnrId])).rows[0];
  const passengers = (await pool.query('SELECT * FROM passengers WHERE pnr_id = $1', [session.currentPnrId])).rows;
  const segments = (await pool.query('SELECT * FROM segments WHERE pnr_id = $1', [session.currentPnrId])).rows;
  const phones = (await pool.query('SELECT * FROM phones WHERE pnr_id = $1', [session.currentPnrId])).rows;

  const errors = [];
  if (passengers.length === 0) errors.push('NEED PASSENGER NAME');
  if (segments.length === 0) errors.push('NEED ITINERARY SEGMENT');
  if (phones.length === 0) errors.push('NEED PHONE FIELD');
  if (!pnr.received_from) errors.push('NEED RECEIVED FROM');

  if (errors.length > 0) {
    return { output: 'UNABLE TO END TRANSACTION\n' + errors.join('\n') };
  }

  await pool.query('UPDATE pnrs SET updated_at = NOW() WHERE id = $1', [session.currentPnrId]);
  await addHistory(session.currentPnrId, 'END TRANSACTION');

  const locator = session.currentPnrLocator;
  clearPnrContext(session);

  return {
    output: `OK - ${locator}`,
    locator
  };
}

/**
 * End and redisplay: ER
 */
async function endAndRedisplay(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT' };
  }

  const pnrId = session.currentPnrId;

  // Validate same as ET
  const pnr = (await pool.query('SELECT * FROM pnrs WHERE id = $1', [pnrId])).rows[0];
  const passengers = (await pool.query('SELECT * FROM passengers WHERE pnr_id = $1', [pnrId])).rows;
  const segments = (await pool.query('SELECT * FROM segments WHERE pnr_id = $1', [pnrId])).rows;
  const phones = (await pool.query('SELECT * FROM phones WHERE pnr_id = $1', [pnrId])).rows;

  const errors = [];
  if (passengers.length === 0) errors.push('NEED PASSENGER NAME');
  if (segments.length === 0) errors.push('NEED ITINERARY SEGMENT');
  if (phones.length === 0) errors.push('NEED PHONE FIELD');
  if (!pnr.received_from) errors.push('NEED RECEIVED FROM');

  if (errors.length > 0) {
    return { output: 'UNABLE TO END TRANSACTION\n' + errors.join('\n') };
  }

  await pool.query('UPDATE pnrs SET updated_at = NOW() WHERE id = $1', [pnrId]);
  await addHistory(pnrId, 'END TRANSACTION');

  // Redisplay
  session.pnrModified = false;
  session.pnrOpenedAt = Date.now();
  const data = await loadPNR(pnrId);
  return { output: `OK - ${pnr.record_locator}\n\n${formatPNRDisplay(data.pnr, data.passengers, data.segments, data.phones)}` };
}

/**
 * Ignore: I
 */
async function ignore(session) {
  if (!session.currentPnrId) {
    return { output: 'NO PNR IN CONTEXT' };
  }

  // In a real GDS this would revert changes. We'll just clear context.
  // For the simulator, we'll note that changes are NOT saved.
  const locator = session.currentPnrLocator;
  clearPnrContext(session);
  return { output: `IGNORED - ${locator || ''}` };
}

module.exports = {
  loadPNR,
  retrieveByLocator,
  searchByName,
  selectFromSearch,
  displayBooking,
  displayItinerary,
  displayNames,
  displayPhones,
  addPassenger,
  addPhone,
  setReceivedFrom,
  setTicketing,
  endTransaction,
  endAndRedisplay,
  ignore
};
