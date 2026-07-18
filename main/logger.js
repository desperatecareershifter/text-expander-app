const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logPath = null;

function getLogPath() {
  if (!logPath) {
    logPath = path.join(app.getPath('userData'), 'snapexpand.log');
  }
  return logPath;
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(getLogPath(), line);
  } catch (e) {
    // Nothing we can do if we can't even write the log.
  }
  console.log(line.trim());
}

function logError(context, err) {
  const detail = err && err.stack ? err.stack : String(err);
  log(`ERROR (${context}): ${detail}`);
}

module.exports = { log, logError, getLogPath };
