const mongoose = require('mongoose');

let cachedConnection = null;
let connectionPromise = null;

function isValidMongoUri(uri) {
  return typeof uri === 'string' && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
}

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    cachedConnection = mongoose.connection;
    return mongoose.connection;
  }

  if (connectionPromise) {
    try {
      await connectionPromise;
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        cachedConnection = mongoose.connection;
        return mongoose.connection;
      }
    } catch (e) {
      connectionPromise = null;
    }
  }

  let mongoUri = process.env.MONGODB_URI;
  if (!isValidMongoUri(mongoUri)) {
    mongoUri = 'mongodb+srv://palamiphomaly_db_user:LtcJobs2026@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';
  }

  mongoose.set('strictQuery', false);

  try {
    if (!cachedConnection || mongoose.connection.readyState !== 1) {
      console.log('[DB] Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
      });
      cachedConnection = mongoose.connection;
      console.log('[DB] Central MongoDB Atlas connected successfully (State: ' + mongoose.connection.readyState + ')');
    }
  } catch (err) {
    console.warn('[DB] Central MongoDB connection warning:', err.message);
  }

  return mongoose.connection;
}

module.exports = { connectDB, isValidMongoUri };

