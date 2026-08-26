let app;
try {
  app = require('../server/index.js');
} catch (err) {
  console.error('Failed to load server/index.js:', err);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({ error: 'Server initialization error', details: err.message, stack: err.stack });
  });
}

module.exports = app;
