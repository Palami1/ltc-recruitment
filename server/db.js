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

  let mongoUri = String(process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
  if (!isValidMongoUri(mongoUri)) {
    mongoUri = 'mongodb+srv://palamiphomaly_db_user:LtcJobs2026@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';
  }

  mongoose.set('strictQuery', false);

  cachedPromise = mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10
  });

  try {
    await cachedPromise;
    console.log('[DB] Central MongoDB Atlas connected successfully (State: 1)');
  } catch (err) {
    cachedPromise = null;
    console.error('[DB] Central MongoDB connection warning:', err.message);
    throw err;
  }

  return mongoose.connection;
}

module.exports = { connectDB, isValidMongoUri };

