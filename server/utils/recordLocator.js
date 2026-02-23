const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generate() {
  let loc = '';
  for (let i = 0; i < 6; i++) {
    loc += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return loc;
}

module.exports = { generate };
