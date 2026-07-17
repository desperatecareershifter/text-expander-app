const Store = require('electron-store');
const { randomUUID } = require('crypto');

const store = new Store({
  name: 'snapexpand-data',
  defaults: {
    shortcuts: [],
    settings: {
      enabled: true,
      // mode: 'global' -> works everywhere. 'browsers' -> only in the selected browsers below.
      mode: 'global',
      browsers: {
        chrome: true,
        edge: true
      },
      launchAtLogin: true
    }
  }
});

function getShortcuts() {
  return store.get('shortcuts');
}

function getSettings() {
  return store.get('settings');
}

function addShortcut({ trigger, expansion }) {
  const shortcuts = getShortcuts();
  const trimmedTrigger = trigger.trim();

  if (!trimmedTrigger || !expansion) {
    throw new Error('Trigger and expansion text are both required.');
  }
  if (shortcuts.some((s) => s.trigger.toLowerCase() === trimmedTrigger.toLowerCase())) {
    throw new Error(`The trigger "${trimmedTrigger}" already exists.`);
  }

  const now = new Date().toISOString();
  const newShortcut = {
    id: randomUUID(),
    trigger: trimmedTrigger,
    expansion,
    dateAdded: now,
    dateModified: now
  };
  shortcuts.push(newShortcut);
  store.set('shortcuts', shortcuts);
  return newShortcut;
}

function updateShortcut(id, { trigger, expansion }) {
  const shortcuts = getShortcuts();
  const idx = shortcuts.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Shortcut not found.');

  const trimmedTrigger = trigger.trim();
  if (!trimmedTrigger || !expansion) {
    throw new Error('Trigger and expansion text are both required.');
  }
  if (
    shortcuts.some(
      (s) => s.id !== id && s.trigger.toLowerCase() === trimmedTrigger.toLowerCase()
    )
  ) {
    throw new Error(`The trigger "${trimmedTrigger}" already exists.`);
  }

  shortcuts[idx] = {
    ...shortcuts[idx],
    trigger: trimmedTrigger,
    expansion,
    dateModified: new Date().toISOString()
  };
  store.set('shortcuts', shortcuts);
  return shortcuts[idx];
}

function deleteShortcut(id) {
  const shortcuts = getShortcuts().filter((s) => s.id !== id);
  store.set('shortcuts', shortcuts);
}

function updateSettings(partial) {
  const settings = getSettings();
  const merged = {
    ...settings,
    ...partial,
    browsers: { ...settings.browsers, ...(partial.browsers || {}) }
  };
  store.set('settings', merged);
  return merged;
}

module.exports = {
  getShortcuts,
  getSettings,
  addShortcut,
  updateShortcut,
  deleteShortcut,
  updateSettings
};
