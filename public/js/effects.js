// === CRT Effects: Beep, Processing Delay, Clock ===

const Effects = {
  audioCtx: null,

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  /**
   * Play an error beep - square wave, short duration
   */
  beep() {
    try {
      this.initAudio();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio not available
    }
  },

  /**
   * Play a soft keystroke sound
   */
  keyClick() {
    try {
      this.initAudio();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.03);
    } catch (e) {
      // Audio not available
    }
  },

  /**
   * Calculate processing delay based on command type
   */
  getDelay(command) {
    const cmd = command.toUpperCase();

    // Availability searches are slow (the joke)
    if (/^\d/.test(cmd) && cmd.length > 6) return 1200 + Math.random() * 1300;

    // Sell operations
    if (/^0\d[A-Z]\d/.test(cmd)) return 800 + Math.random() * 700;

    // Name searches
    if (cmd.startsWith('-')) return 900 + Math.random() * 800;

    // End transaction
    if (cmd === 'ET' || cmd === 'ER') return 600 + Math.random() * 600;

    // Display commands are faster
    if (cmd.startsWith('*')) return 300 + Math.random() * 400;

    // Default
    return 400 + Math.random() * 400;
  },

  /**
   * Update the clock in Zulu time (UTC)
   */
  updateClock() {
    const now = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const day = now.getUTCDate().toString().padStart(2, '0');
    const mon = months[now.getUTCMonth()];
    const hrs = now.getUTCHours().toString().padStart(2, '0');
    const mins = now.getUTCMinutes().toString().padStart(2, '0');

    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = `SFO1A  ${day}${mon}  ${hrs}${mins}Z`;
    }
  },

  startClock() {
    this.updateClock();
    setInterval(() => this.updateClock(), 10000);
  }
};
