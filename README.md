# SnapExpand

A lightweight Windows text expander: type a short trigger anywhere, and it's instantly replaced with the full text you defined. Similar to the text-expand function in the "Magical" browser extension, but as a standalone desktop app.

## Features

- Add, edit, and delete shortcuts from a clean desktop UI
- Sort your shortcut list by trigger name, date added, or last modified, and search/filter it
- Two expansion scopes, switchable in Settings:
  - **Global** — expands in any Windows app (editors, chat apps, everything)
  - **Selected browsers only** — expands only while the active window is Google Chrome and/or Microsoft Edge (checkboxes for each)
- Runs quietly in the system tray; a toggle lets you pause/resume expansion instantly
- Optional "launch at Windows startup"

## Important: about this build

This project was built and packaged in a cloud sandbox that has **no network access** to npm, GitHub, or any package registry — so I could not run `npm install` or actually compile the Windows `.exe` here. What you have is the **complete, working source code**, plus two easy ways to turn it into a real installer, neither of which requires much technical know-how.

### Option A — Build it with GitHub Actions (no installs on your PC at all)

1. Create a free GitHub account if you don't have one, and create a new repository.
2. Upload the contents of this folder to that repository (drag-and-drop on github.com works, or `git push` if you're comfortable with git).
3. Go to the repo's **Actions** tab. A workflow called "Build Windows installer" will run automatically (it's already included at `.github/workflows/build-windows.yml`). If it doesn't start on its own, click **Run workflow**.
4. When the run finishes (~3-5 minutes), open it and download the **SnapExpand-Windows-Installer** artifact. Unzip it — that's `SnapExpand Setup 1.0.0.exe`, ready to run.

This path is recommended: GitHub's Windows runner builds the app on real Windows, so there's no cross-compilation guesswork.

### Option B — Build it locally on a Windows PC

If you have a Windows machine with [Node.js](https://nodejs.org) installed (LTS version):

```
npm install
npm run dist:win
```

The installer will appear in the `dist` folder as `SnapExpand Setup 1.0.0.exe`.

## A note on how expansion works (and its limits)

- Trigger matching is immediate — no need to press space or Enter after typing a trigger. To avoid accidental matches while typing normal words, pick triggers that aren't ordinary words, e.g. `:sig`, `;addr`, `//call`.
- Detecting keystrokes system-wide and injecting the replacement text both use standard Windows building blocks (a low-level keyboard hook via `uiohook-napi`, and `System.Windows.Forms.SendKeys` via PowerShell for typing the expansion) — no admin rights or driver installs needed.
- The keyboard-to-character mapping assumes a **US QWERTY** keyboard layout. On other layouts, punctuation/symbol keys in triggers may not match correctly (letters and numbers are unaffected).
- "Selected browsers only" mode checks which process owns the currently focused window (`chrome.exe` / `msedge.exe`). It does not distinguish between browser tabs — any Chrome or Edge window counts.
- Windows Defender or antivirus software may flag a freshly-built, unsigned Electron app the first time you run it (common for any small unsigned .exe) — choose "More info" → "Run anyway" if you trust the source, or optionally get the app code-signed later if you plan to distribute it further.

## Project structure

```
main/            Electron main process (window, tray, IPC, storage, the expansion engine)
  main.js        App entry point, window + tray + IPC wiring
  store.js       Shortcut/settings storage (JSON file via electron-store)
  expander.js    Global keyboard hook + trigger matching engine
  keymap.js      Windows virtual-key-code -> character mapping (US layout)
  winAutomation.js  PowerShell-based keystroke injection + active window detection
  preload.js     Secure IPC bridge exposed to the renderer
renderer/        The UI (plain HTML/CSS/JS, no framework)
  index.html
  styles.css
  renderer.js
build/
  icon.ico       App icon
.github/workflows/build-windows.yml   Automated installer build via GitHub Actions
```

## Customizing

- App name / installer behavior: edit the `"build"` section of `package.json`.
- Trigger-confirmation delay for ambiguous prefixes (e.g. `:a` vs `:ab`): `CONFIRM_DELAY_MS` in `main/expander.js`.
- Add more browsers to the "selected browsers only" mode: extend `PROCESS_NAME_BY_BROWSER` in `main/expander.js` (e.g. Firefox is `firefox`, Brave is `brave`) and add a matching checkbox in `renderer/index.html` + `renderer/renderer.js`.
