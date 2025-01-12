const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// Use Electron's app.getPath() for proper path resolution
const logDir = path.join(
  process.env.NODE_ENV === 'production'
    ? app.getPath('logs') // Use system logs directory in production
    : path.join(__dirname, '../logs') // Use local logs directory in development
)

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const logFilePath = path.join(logDir, 'app.log')

function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`

  // Write to file
  fs.appendFileSync(logFilePath, logMessage)

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(logMessage.trim())
  }
}

module.exports = {
  log,
  error: (message) => log(message, 'error'),
  warn: (message) => log(message, 'warn'),
  info: (message) => log(message, 'info'),
  debug: (message) => log(message, 'debug'),
}
