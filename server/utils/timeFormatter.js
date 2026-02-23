/**
 * Format a time string (HH:MM:SS or HH:MM) to GDS style: 520P, 1015A
 */
function formatGDSTime(timeStr) {
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  const mins = parts[1];
  const suffix = hours >= 12 ? 'P' : 'A';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return hours.toString() + mins + suffix;
}

/**
 * Format a time string to 24h display: 1720
 */
function formatTime24(timeStr) {
  const parts = timeStr.split(':');
  return parts[0] + parts[1];
}

/**
 * Format duration in minutes to Xh Ym
 */
function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + ':' + m.toString().padStart(2, '0');
}

module.exports = { formatGDSTime, formatTime24, formatDuration };
