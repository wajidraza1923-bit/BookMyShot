const mongoose = require("mongoose");

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bookmyshot";
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
