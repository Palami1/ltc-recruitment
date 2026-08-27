const mongoose = require('mongoose');

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let isConnecting = false;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (isConnecting) {
    let attempts = 0;
    while (isConnecting && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (mongoose.connection.readyState === 1) return mongoose.connection;
  }

  isConnecting = true;
  const mongoUri = process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000
    });
    console.log('[DB] Central MongoDB Atlas connected successfully');
  } catch (err) {
    console.warn('[DB] Central MongoDB connection warning:', err.message);
    throw err;
  } finally {
    isConnecting = false;
  }

  return mongoose.connection;
}

module.exports = { connectDB };
