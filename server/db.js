const mongoose = require('mongoose');

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

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
    mongoUri = DEFAULT_CLOUD_MONGO_URI;
  }

  mongoose.set('strictQuery', false);

  connectionPromise = mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 20000,
    maxPoolSize: 10,
    bufferCommands: false
  }).then(m => {
    cachedConnection = m.connection;
    console.log('[DB] Central MongoDB Atlas connected successfully');
    return m.connection;
  }).catch(err => {
    connectionPromise = null;
    console.warn('[DB] Central MongoDB connection warning:', err.message);
    throw err;
  });

  try {
    await connectionPromise;
  } catch (err) {
    console.warn('[DB] connectDB failed:', err.message);
  }

  return mongoose.connection;
}

module.exports = { connectDB, isValidMongoUri };

