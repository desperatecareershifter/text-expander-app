// Windows-only helpers that shell out to PowerShell.
// No native compilation required - this just spawns powershell.exe, which
// ships with every supported version of Windows.

const { exec, execFile } = require('child_process');

const FOREGROUND_PROCESS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class SnapExpandWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
$hwnd = [SnapExpandWin32]::GetForegroundWindow()
$procId = 0
[SnapExpandWin32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
try { (Get-Process -Id $procId -ErrorAction Stop).ProcessName } catch { "" }
`;

/**
 * Returns the process name (no .exe suffix) of the window currently in the
 * foreground, e.g. "chrome", "msedge", "notepad". Resolves to "" on failure
 * or on non-Windows platforms.
 */
function getForegroundProcessName() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve('');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', FOREGROUND_PROCESS_SCRIPT],
      { timeout: 2000 },
      (err, stdout) => {
        if (err) return resolve('');
        resolve((stdout || '').trim().toLowerCase());
      }
    );
  });
}

// Escape a string for SendKeys, which treats + ^ % ~ ( ) { } [ ] as special.
function escapeForSendKeys(text) {
  return text.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
}

// Build a SendKeys-compatible string that deletes `backspaces` characters
// then types `text`, translating newlines/tabs into their SendKeys codes.
function buildSendKeysPayload(text, backspaces) {
  const lines = text.split('\n');
  const typed = lines.map((line) => escapeForSendKeys(line)).join('{ENTER}');
  const del = backspaces > 0 ? `{BACKSPACE ${backspaces}}` : '';
  return del + typed;
}

/**
 * Deletes `backspaces` characters at the cursor, then types `text`, using
 * System.Windows.Forms.SendKeys. Returns a promise that resolves once the
 * injection command has been dispatched to the OS.
 */
function injectExpansion(text, backspaces) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return resolve();

    const payload = buildSendKeysPayload(text, backspaces).replace(/'/g, "''");
    const script = `Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 30; [System.Windows.Forms.SendKeys]::SendWait('${payload}')`;

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 4000 },
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

module.exports = { getForegroundProcessName, injectExpansion, escapeForSendKeys, buildSendKeysPayload };
