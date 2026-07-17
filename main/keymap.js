// Maps Windows Virtual-Key codes (VK_*) to the character they produce on a
// standard US QWERTY layout. uiohook-napi's `rawcode` field passes through
// the native platform keycode untouched, which on Windows *is* the VK code
// used by the low-level keyboard hook (WM_KEYDOWN wParam). Using rawcode
// instead of uiohook's own cross-platform `keycode` keeps this mapping
// stable across uiohook-napi versions.
//
// Known limitation: this assumes a US QWERTY layout. Non-US layouts (AZERTY,
// QWERTZ, etc.) will produce incorrect characters for punctuation/symbol
// keys. This is a common limitation shared by most low-level-hook-based text
// expanders.

// code -> [unshifted, shifted]
const VK_CHAR_MAP = {
  0x20: [' ', ' '],

  0x30: ['0', ')'],
  0x31: ['1', '!'],
  0x32: ['2', '@'],
  0x33: ['3', '#'],
  0x34: ['4', '$'],
  0x35: ['5', '%'],
  0x36: ['6', '^'],
  0x37: ['7', '&'],
  0x38: ['8', '*'],
  0x39: ['9', '('],

  0xba: [';', ':'],
  0xbb: ['=', '+'],
  0xbc: [',', '<'],
  0xbd: ['-', '_'],
  0xbe: ['.', '>'],
  0xbf: ['/', '?'],
  0xc0: ['`', '~'],
  0xdb: ['[', '{'],
  0xdc: ['\\', '|'],
  0xdd: [']', '}'],
  0xde: ["'", '"'],

  0x60: ['0', '0'],
  0x61: ['1', '1'],
  0x62: ['2', '2'],
  0x63: ['3', '3'],
  0x64: ['4', '4'],
  0x65: ['5', '5'],
  0x66: ['6', '6'],
  0x67: ['7', '7'],
  0x68: ['8', '8'],
  0x69: ['9', '9'],
  0x6a: ['*', '*'],
  0x6b: ['+', '+'],
  0x6d: ['-', '-'],
  0x6e: ['.', '.'],
  0x6f: ['/', '/']
};

for (let vk = 0x41; vk <= 0x5a; vk++) {
  const letter = String.fromCharCode(vk); // 'A'..'Z'
  VK_CHAR_MAP[vk] = [letter.toLowerCase(), letter.toUpperCase()];
}

// Keys that should reset the typed-text buffer (cursor context changes or
// the user clearly isn't mid-word anymore).
const RESET_KEYS = new Set([
  0x09, // Tab
  0x0d, // Enter
  0x1b, // Escape
  0x21, // Page Up
  0x22, // Page Down
  0x23, // End
  0x24, // Home
  0x25, // Left
  0x26, // Up
  0x27, // Right
  0x28, // Down
  0x2d, // Insert
  0x2e // Delete
]);

const BACKSPACE_KEY = 0x08;

function charForEvent(rawcode, shiftKey) {
  const pair = VK_CHAR_MAP[rawcode];
  if (!pair) return null;
  return shiftKey ? pair[1] : pair[0];
}

module.exports = { charForEvent, RESET_KEYS, BACKSPACE_KEY };
