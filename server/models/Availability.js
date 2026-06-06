const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, enum: ['available', 'unavailable', 'booked'], default: 'available' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Availability', availabilitySchema);
