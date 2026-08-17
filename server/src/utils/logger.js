const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLOURS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[35m' };
const RESET = '\x1b[0m';

class Logger {
  constructor() {
    this.threshold = LEVELS[config.logLevel] ?? LEVELS.info;
    // File logging is opt-out: containers that mount a read-only filesystem, and
    // the test run, keep everything on stdout instead.
    this.fileLogging = !config.isTest && this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      fs.mkdirSync(config.logDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  format(level, message, data) {
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
    if (data === undefined || data === null) return line;
    if (data instanceof Error) return `${line}\n${data.stack}`;
    try {
      return `${line}\n${JSON.stringify(data, null, 2)}`;
    } catch {
      return `${line}\n[unserialisable payload]`;
    }
  }

  write(level, message, data) {
    if (LEVELS[level] > this.threshold) return;

    const line = this.format(level, message, data);
    const stream = level === 'error' || level === 'warn' ? console.error : console.log;
    stream(`${COLOURS[level]}${line}${RESET}`);

    if (!this.fileLogging) return;
    try {
      fs.appendFileSync(path.join(config.logDir, 'app.log'), `${line}\n`);
      if (level === 'error') {
        fs.appendFileSync(path.join(config.logDir, 'error.log'), `${line}\n`);
      }
    } catch {
      // A logger that throws is worse than a logger that misses a line.
      this.fileLogging = false;
    }
  }

  error(message, data) {
    this.write('error', message, data);
  }

  warn(message, data) {
    this.write('warn', message, data);
  }

  info(message, data) {
    this.write('info', message, data);
  }

  debug(message, data) {
    this.write('debug', message, data);
  }
}

module.exports = new Logger();
