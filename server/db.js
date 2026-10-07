const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const mongoose = require('mongoose');

let cachedPromise = null;

function isValidMongoUri(uri) {
  return typeof uri === 'string' && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
}

async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedPromise && mongoose.connection.readyState === 2) {
    await cachedPromise;
    return mongoose.connection;
  }

  const mongoUri = String(process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
  if (!isValidMongoUri(mongoUri)) {
    throw new Error('MONGODB_URI environment variable is missing or invalid.');
  }

  mongoose.set('strictQuery', false);

  cachedPromise = mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10
  });

  try {
    await cachedPromise;
    console.log('[DB] Central MongoDB Atlas connected successfully (State: 1)');
  } catch (err) {
    cachedPromise = null;
    console.error('[DB] Central MongoDB connection failed:', err.message);
    throw err;
  }

  return mongoose.connection;
}

module.exports = { connectDB, isValidMongoUri };

