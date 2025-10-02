const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logger with different levels
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'app.log');
    this.errorFile = path.join(logsDir, 'error.log');
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      return `${logMessage}\n${JSON.stringify(data, null, 2)}\n`;
    }
    
    return `${logMessage}\n`;
  }

  writeToFile(filename, message) {
    if (process.env.NODE_ENV !== 'test') {
      fs.appendFileSync(filename, message);
    }
  }

  info(message, data = null) {
    const formattedMessage = this.formatMessage('info', message, data);
    console.log(`\x1b[36m${formattedMessage.trim()}\x1b[0m`); // Cyan
    this.writeToFile(this.logFile, formattedMessage);
  }

  warn(message, data = null) {
    const formattedMessage = this.formatMessage('warn', message, data);
    console.warn(`\x1b[33m${formattedMessage.trim()}\x1b[0m`); // Yellow
    this.writeToFile(this.logFile, formattedMessage);
  }

  error(message, data = null) {
    const formattedMessage = this.formatMessage('error', message, data);
    console.error(`\x1b[31m${formattedMessage.trim()}\x1b[0m`); // Red
    this.writeToFile(this.errorFile, formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      const formattedMessage = this.formatMessage('debug', message, data);
      console.debug(`\x1b[35m${formattedMessage.trim()}\x1b[0m`); // Magenta
      this.writeToFile(this.logFile, formattedMessage);
    }
  }

  success(message, data = null) {
    const formattedMessage = this.formatMessage('success', message, data);
    console.log(`\x1b[32m${formattedMessage.trim()}\x1b[0m`); // Green
    this.writeToFile(this.logFile, formattedMessage);
  }
}

module.exports = new Logger();