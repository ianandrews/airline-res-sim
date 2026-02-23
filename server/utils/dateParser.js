const MONTHS = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

/**
 * Parse GDS date format: 25DEC or 25DEC25 (day + month + optional year)
 * Returns a Date object or null if invalid.
 */
function parseGDSDate(str) {
  const match = str.match(/^(\d{1,2})([A-Z]{3})(\d{2})?$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthStr = match[2];
  const yearSuffix = match[3];

  if (!(monthStr in MONTHS)) return null;
  if (day < 1 || day > 31) return null;

  const month = MONTHS[monthStr];
  const now = new Date();
  let year = now.getFullYear();

  if (yearSuffix) {
    year = 2000 + parseInt(yearSuffix, 10);
  } else {
    // If the date is in the past, assume next year
    const candidate = new Date(year, month, day);
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      year++;
    }
  }

  return new Date(year, month, day);
}

/**
 * Format a Date to GDS display: 25DEC
 */
function formatGDSDate(date) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = date.getDate().toString().padStart(2, '0');
  return d + months[date.getMonth()];
}

/**
 * Format a Date to ISO date string YYYY-MM-DD
 */
function toISODate(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { parseGDSDate, formatGDSDate, toISODate };
