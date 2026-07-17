const { uIOhook } = require('uiohook-napi');
const { charForEvent, RESET_KEYS, BACKSPACE_KEY } = require('./keymap');
const { getForegroundProcessName, injectExpansion } = require('./winAutomation');

const MAX_BUFFER = 60;
const CONFIRM_DELAY_MS = 350; // wait this long before firing a trigger that is a prefix of a longer one

const PROCESS_NAME_BY_BROWSER = {
  chrome: ['chrome'],
  edge: ['msedge']
};

class ExpansionEngine {
  constructor({ getShortcuts, getSettings, onExpansion, onError }) {
    this.getShortcuts = getShortcuts;
    this.getSettings = getSettings;
    this.onExpansion = onExpansion || (() => {});
    this.onError = onError || (() => {});

    this.buffer = '';
    this.pendingTimer = null;
    this.pendingTrigger = null;
    this.isInjecting = false;
    this.running = false;

    this._onKeydown = this._onKeydown.bind(this);
  }

  start() {
    if (this.running) return;
    uIOhook.on('keydown', this._onKeydown);
    uIOhook.start();
    this.running = true;
  }

  stop() {
    if (!this.running) return;
    uIOhook.off('keydown', this._onKeydown);
    uIOhook.stop();
    this.running = false;
    this._clearPending();
    this.buffer = '';
  }

  _clearPending() {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
      this.pendingTrigger = null;
    }
  }

  _resetBuffer() {
    this.buffer = '';
    this._clearPending();
  }

  _onKeydown(event) {
    if (this.isInjecting) return; // ignore our own synthetic keystrokes

    const settings = this.getSettings();
    if (!settings.enabled) return;

    // Ignore key combos (Ctrl/Alt/Meta held) - those aren't normal typing.
    if (event.ctrlKey || event.altKey || event.metaKey) {
      this._resetBuffer();
      return;
    }

    if (event.rawcode === BACKSPACE_KEY) {
      this.buffer = this.buffer.slice(0, -1);
      this._clearPending();
      this._checkForMatch(settings);
      return;
    }

    if (RESET_KEYS.has(event.rawcode)) {
      this._resetBuffer();
      return;
    }

    const char = charForEvent(event.rawcode, event.shiftKey);
    if (char === null) return; // unrecognized key (F-keys, modifiers, etc.) - ignore, don't reset

    this.buffer = (this.buffer + char).slice(-MAX_BUFFER);
    this._checkForMatch(settings);
  }

  _checkForMatch(settings) {
    const shortcuts = this.getShortcuts();
    if (!shortcuts.length) return;

    const buffer = this.buffer;
    let best = null;
    for (const s of shortcuts) {
      if (s.trigger && buffer.endsWith(s.trigger)) {
        if (!best || s.trigger.length > best.trigger.length) best = s;
      }
    }

    if (!best) {
      this._clearPending();
      return;
    }

    const isAmbiguous = shortcuts.some(
      (s) => s.id !== best.id && s.trigger.startsWith(best.trigger) && s.trigger.length > best.trigger.length
    );

    this._clearPending();

    if (isAmbiguous) {
      this.pendingTrigger = best;
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        this.pendingTrigger = null;
        this._fire(best, settings);
      }, CONFIRM_DELAY_MS);
    } else {
      this._fire(best, settings);
    }
  }

  async _fire(shortcut, settings) {
    try {
      if (settings.mode === 'browsers') {
        const proc = await getForegroundProcessName();
        const allowedProcs = Object.entries(settings.browsers)
          .filter(([, enabled]) => enabled)
          .flatMap(([key]) => PROCESS_NAME_BY_BROWSER[key] || []);
        if (!allowedProcs.includes(proc)) {
          this._resetBuffer();
          return;
        }
      }

      this.isInjecting = true;
      this._resetBuffer();
      await injectExpansion(shortcut.expansion, shortcut.trigger.length);
      this.onExpansion(shortcut);
    } catch (err) {
      this.onError(err);
    } finally {
      // Small delay so trailing synthetic keydown events from SendKeys don't
      // get reinterpreted as real typing.
      setTimeout(() => {
        this.isInjecting = false;
      }, 60);
    }
  }
}

module.exports = { ExpansionEngine };
