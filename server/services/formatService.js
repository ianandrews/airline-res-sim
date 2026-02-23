const { formatGDSTime, formatDuration } = require('../utils/timeFormatter');
const { formatGDSDate } = require('../utils/dateParser');

/**
 * Pad or truncate string to exact width
 */
function pad(str, width, right = false) {
  const s = String(str || '');
  if (s.length >= width) return s.substring(0, width);
  return right ? s.padEnd(width) : s.padStart(width);
}

/**
 * Format a full PNR display (*B)
 */
function formatPNRDisplay(pnr, passengers, segments, phones) {
  const lines = [];

  // Header
  lines.push(`--- ${pnr.record_locator} ---`);
  lines.push('');

  // Passengers
  for (const p of passengers) {
    const title = p.title ? ` ${p.title}` : '';
    lines.push(` ${p.seq_number} ${p.last_name}/${p.first_name}${title}`);
  }
  lines.push('');

  // Segments
  for (const seg of segments) {
    lines.push(formatSegmentLine(seg));
  }
  lines.push('');

  // Phone
  for (let i = 0; i < phones.length; i++) {
    const typeLabel = { H: 'HOME', B: 'BUSINESS', M: 'MOBILE' }[phones[i].phone_type] || phones[i].phone_type;
    lines.push(` P${i + 1}.${typeLabel}-${phones[i].number}`);
  }

  // Received from / ticketing
  if (pnr.received_from) {
    lines.push(` 6.${pnr.received_from}`);
  }
  if (pnr.ticketing) {
    lines.push(` 7.${pnr.ticketing}`);
  }

  return lines.join('\n');
}

/**
 * Format itinerary only (*I)
 */
function formatItinerary(segments) {
  if (segments.length === 0) return 'NO ITINERARY';
  const lines = [];
  for (const seg of segments) {
    lines.push(formatSegmentLine(seg));
  }
  return lines.join('\n');
}

/**
 * Format a single segment line
 */
function formatSegmentLine(seg) {
  // Parse date as local to avoid timezone shift (YYYY-MM-DD → local date)
  const dateStr = seg.travel_date.toString().substring(0, 10);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = formatGDSDate(new Date(y, m - 1, d));
  const dep = formatGDSTime(seg.depart_time);
  const arr = formatGDSTime(seg.arrive_time);
  const dur = formatDuration(seg.duration_mins);
  const status = seg.status;

  return ` ${seg.seg_number} ${pad(seg.flight_number, 6, true)} ${seg.class_code} ${date} ${pad(seg.origin, 3, true)}${pad(seg.destination, 3, true)} ${status}${pad(seg.num_passengers, 1)}  ${pad(dep, 6, true)} ${pad(arr, 6, true)}  ${seg.equipment}`;
}

/**
 * Format passenger list (*N)
 */
function formatPassengers(passengers) {
  const lines = [];
  for (const p of passengers) {
    const title = p.title ? ` ${p.title}` : '';
    lines.push(` ${p.seq_number} ${p.last_name}/${p.first_name}${title}`);
  }
  return lines.join('\n');
}

/**
 * Format phone list (*P)
 */
function formatPhones(phones) {
  if (phones.length === 0) return 'NO PHONE FIELD';
  const lines = [];
  for (let i = 0; i < phones.length; i++) {
    const typeLabel = { H: 'HOME', B: 'BUSINESS', M: 'MOBILE' }[phones[i].phone_type] || phones[i].phone_type;
    lines.push(` P${i + 1}.${typeLabel}-${phones[i].number}`);
  }
  return lines.join('\n');
}

/**
 * Format availability display
 */
function formatAvailability(date, origin, dest, flights) {
  const dateStr = formatGDSDate(date);
  const lines = [];
  lines.push(`${dateStr} ${origin}${dest}`);
  lines.push('');

  if (flights.length === 0) {
    lines.push('NO FLIGHTS FOUND');
    return lines.join('\n');
  }

  // Header
  lines.push(pad('', 1) + pad('FLT', 8, true) + pad('CLS', 28, true) + '  ' + pad('DEP', 6, true) + ' ' + pad('ARR', 6, true) + '  ' + 'EQP');
  lines.push('');

  for (let i = 0; i < flights.length; i++) {
    const f = flights[i];
    const dep = formatGDSTime(f.depart_time);
    const arr = formatGDSTime(f.arrive_time);

    // Build class availability string
    let classStr = '';
    for (const cls of f.classes) {
      const avail = cls.total_seats - cls.sold_seats;
      let availChar;
      if (avail >= 9) availChar = '9';
      else if (avail > 0) availChar = String(avail);
      else availChar = '0';
      classStr += ` ${cls.class_code}${availChar}`;
    }

    const lineNum = (i + 1).toString();
    lines.push(`${pad(lineNum, 2)}${pad(f.flight_number, 7, true)} ${classStr}   ${pad(dep, 6, true)} ${pad(arr, 6, true)}  ${f.equipment}`);
  }

  return lines.join('\n');
}

/**
 * Format name search results
 */
function formatNameSearch(results) {
  const lines = [];
  lines.push(`${results.length} MATCH${results.length > 1 ? 'ES' : ''} FOUND`);
  lines.push('');
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    let segInfo = '';
    if (r.segments.length > 0) {
      const sd = r.segments[0].travel_date.toString().substring(0, 10);
      const [sy, sm, sday] = sd.split('-').map(Number);
      segInfo = ` ${r.segments[0].flight_number} ${formatGDSDate(new Date(sy, sm - 1, sday))}`;
    }
    lines.push(` ${i + 1}. ${r.record_locator}  ${r.last_name}/${r.first_name} ${r.title || ''}${segInfo}`);
  }
  lines.push('');
  lines.push('ENTER *N TO SELECT (E.G. *1)');
  return lines.join('\n');
}

/**
 * Format history display (*H)
 */
function formatHistory(history) {
  if (history.length === 0) return 'NO HISTORY';
  const lines = [];
  for (const h of history) {
    const ts = new Date(h.created_at);
    const dateStr = formatGDSDate(ts);
    const time = ts.toTimeString().substring(0, 5).replace(':', '');
    lines.push(` ${dateStr} ${time}Z  ${h.agent}  ${h.action}`);
  }
  return lines.join('\n');
}

module.exports = {
  pad,
  formatPNRDisplay,
  formatItinerary,
  formatSegmentLine,
  formatPassengers,
  formatPhones,
  formatAvailability,
  formatNameSearch,
  formatHistory
};
