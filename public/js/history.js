// === Command History (Up/Down Arrow) ===

const CommandHistory = {
  history: [],
  index: -1,
  tempInput: '',

  add(command) {
    if (command && command !== this.history[this.history.length - 1]) {
      this.history.push(command);
    }
    this.index = this.history.length;
    this.tempInput = '';
  },

  up(currentInput) {
    if (this.history.length === 0) return null;

    if (this.index === this.history.length) {
      this.tempInput = currentInput;
    }

    if (this.index > 0) {
      this.index--;
      return this.history[this.index];
    }

    return this.history[0];
  },

  down() {
    if (this.index >= this.history.length - 1) {
      this.index = this.history.length;
      return this.tempInput;
    }

    this.index++;
    return this.history[this.index];
  }
};
