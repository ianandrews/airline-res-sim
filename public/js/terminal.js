// === SABRE Terminal Emulator ===

const Terminal = {
  sessionId: null,
  isProcessing: false,
  outputEl: null,
  inputEl: null,
  cursorEl: null,

  async init() {
    this.outputEl = document.getElementById('output');
    this.inputEl = document.getElementById('command-input');
    this.cursorEl = document.getElementById('cursor');

    // Start clock
    Effects.startClock();

    // Init audio on first interaction
    document.addEventListener('click', () => Effects.initAudio(), { once: true });
    document.addEventListener('keydown', () => Effects.initAudio(), { once: true });

    // Get session
    try {
      const res = await fetch('/api/session/init');
      const data = await res.json();
      this.sessionId = data.sessionId;
    } catch (e) {
      this.sessionId = 'offline-' + Date.now();
    }

    // Show banner with typewriter effect
    await this.showBanner();

    // Set up input handling
    this.setupInput();

    // Focus input
    this.inputEl.focus();

    // Always refocus on click
    document.addEventListener('click', () => this.inputEl.focus());
  },

  setupInput() {
    this.inputEl.addEventListener('keydown', async (e) => {
      if (this.isProcessing) {
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const command = this.inputEl.value.trim();
        this.inputEl.value = '';
        CommandHistory.add(command);
        await this.executeCommand(command);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = CommandHistory.up(this.inputEl.value);
        if (prev !== null) this.inputEl.value = prev;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = CommandHistory.down();
        if (next !== null) this.inputEl.value = next;
      } else {
        // Key click sound for regular keys
        if (e.key.length === 1) {
          Effects.keyClick();
        }
      }
    });
  },

  async executeCommand(command) {
    // Echo command
    this.appendOutput(command ? `>${command}` : '>', 'output-command');

    if (!command) return;

    // Show processing
    this.isProcessing = true;
    this.cursorEl.classList.remove('blink');
    const processingEl = this.appendOutput('PROCESSING...', 'processing');

    // Calculate delay
    const delay = Effects.getDelay(command);

    try {
      // Make API call with simulated delay
      const [result] = await Promise.all([
        this.sendCommand(command),
        this.sleep(delay)
      ]);

      // Remove processing indicator
      processingEl.remove();

      // Handle server-specified additional delay
      if (result.delay) {
        await this.sleep(result.delay);
      }

      // Beep on error
      if (result.beep) {
        Effects.beep();
      }

      // Display output
      if (result.output) {
        // Check if output contains stats (flight change complete)
        if (result.output.includes('FLIGHT CHANGE COMPLETE')) {
          const parts = result.output.split('╔');
          if (parts[0]) {
            this.appendOutput(parts[0].trim(), 'output-response');
          }
          this.appendOutput('╔' + parts[1], 'output-stats');
        } else {
          this.appendOutput(result.output, 'output-response');
        }
      }

      // Handle error responses
      if (result.error) {
        this.appendOutput(result.error, 'output-error');
        Effects.beep();
      }

    } catch (err) {
      processingEl.remove();
      this.appendOutput('COMMUNICATION ERROR - RETRY', 'output-error');
      Effects.beep();
    }

    this.isProcessing = false;
    this.cursorEl.classList.add('blink');
    this.inputEl.focus();
    this.scrollToBottom();
  },

  async sendCommand(command) {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        command: command
      })
    });
    return await res.json();
  },

  appendOutput(text, className) {
    const div = document.createElement('div');
    div.className = `output-entry ${className || ''}`;
    div.textContent = text;
    this.outputEl.appendChild(div);
    this.scrollToBottom();
    return div;
  },

  scrollToBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async showBanner() {
    const banner = `
*****************************************************
*                                                   *
*         SABRE AIRLINE RESERVATION SYSTEM          *
*              SEMI-AUTOMATED BUSINESS              *
*          RESEARCH ENVIRONMENT (SABRE)             *
*                                                   *
*   EDUCATIONAL SIMULATOR - NOT A REAL GDS          *
*   "NOW YOU KNOW WHY IT TAKES SO LONG"             *
*                                                   *
*****************************************************`;

    const lines = banner.split('\n').filter(l => l.length > 0);

    for (const line of lines) {
      this.appendOutput(line, 'output-system');
      await this.sleep(60);
    }

    await this.sleep(500);

    const info = [
      '',
      'SIGN-IN ACCEPTED',
      `AGENT: GTR001  DUTY CODE: *  WORK AREA: A`,
      `AAA: SFO1A  DATE: ${this.getGDSDate()}  TIME: ${this.getZuluTime()}`,
      '',
      "TYPE 'HELP' FOR COMMAND REFERENCE",
      "TYPE 'DEMO' FOR A GUIDED WALKTHROUGH",
      ''
    ];

    for (const line of info) {
      this.appendOutput(line, line.includes('TYPE') ? 'output-response' : 'output-system');
      await this.sleep(40);
    }
  },

  getGDSDate() {
    const now = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = now.getUTCDate().toString().padStart(2, '0');
    return d + months[now.getUTCMonth()];
  },

  getZuluTime() {
    const now = new Date();
    const h = now.getUTCHours().toString().padStart(2, '0');
    const m = now.getUTCMinutes().toString().padStart(2, '0');
    return h + m + 'Z';
  }
};

// Boot up
document.addEventListener('DOMContentLoaded', () => Terminal.init());
