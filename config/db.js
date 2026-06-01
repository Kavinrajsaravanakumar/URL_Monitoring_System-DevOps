const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Reads the connection URI from the MONGO_URI environment variable.
 * Logs connection success or failure to the console.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 uses the new URL parser and unified topology by default
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure code
    process.exit(1);
  }
};

module.exports = connectDB;
