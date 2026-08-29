const mongoose = require('mongoose');

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let isConnecting = false;

function isValidMongoUri(uri) {
  return typeof uri === 'string' && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (isConnecting) {
    let attempts = 0;
    while (isConnecting && attempts < 80) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (mongoose.connection.readyState === 1) return mongoose.connection;
  }

  let mongoUri = process.env.MONGODB_URI;
  if (!isValidMongoUri(mongoUri)) {
    mongoUri = DEFAULT_CLOUD_MONGO_URI;
  }
  if (!isValidMongoUri(mongoUri)) {
    console.warn('[DB] Invalid MongoDB URI provided. Running in offline/fallback mode.');
    return null;
  }

  isConnecting = true;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('[DB] Central MongoDB Atlas connected successfully');
  } catch (err) {
    console.warn('[DB] Central MongoDB connection warning:', err.message);
  } finally {
    isConnecting = false;
  }

  return mongoose.connection;
}

module.exports = { connectDB, isValidMongoUri };

