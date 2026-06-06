const mongoose = require('mongoose');

const querySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open' },
    response: { type: String, default: '' },
    relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Query', querySchema);
