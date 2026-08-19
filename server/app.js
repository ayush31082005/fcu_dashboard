// Entry point for cPanel "Setup Node.js App" / Phusion Passenger
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

let app;
try {
  const dist = require('./dist/index.js');
  app = dist.default || dist;
} catch (err) {
  console.error('Error importing dist:', err);
  const express = require('express');
  app = express();
  app.get('*', (req, res) => {
    res.status(200).json({
      status: 'error',
      message: 'FCU Server startup error: ' + (err.message || String(err)),
      stack: err.stack
    });
  });
}

module.exports = app;
