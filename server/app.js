// Entry point for cPanel "Setup Node.js App" / Phusion Passenger
const path = require('path');
const http = require('http');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

let serverApp;
try {
  const mod = require('./dist/index.js');
  serverApp = mod.default || mod;
} catch (err) {
  console.error('Fatal FCU Server loading error:', err);
  try {
    const express = require('express');
    serverApp = express();
    serverApp.all('*', (req, res) => {
      res.status(500).json({
        status: 'error',
        message: 'FCU Server startup error: ' + (err.message || String(err)),
        stack: err.stack,
      });
    });
  } catch (e2) {
    serverApp = http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'NPM modules missing: ' + (err.message || String(err)) }));
    });
  }
}

if (typeof PhusionPassenger !== 'undefined' && serverApp && typeof serverApp.listen === 'function') {
  try {
    serverApp.listen('passenger');
  } catch (e) {}
}

module.exports = serverApp;

