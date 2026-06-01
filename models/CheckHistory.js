const mongoose = require('mongoose');

/**
 * CheckHistory Schema
 * Stores the result of each individual URL health check.
 * Each record is linked to a Website document via websiteId.
 */
const checkHistorySchema = new mongoose.Schema({
  // Reference to the parent Website document
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true,
  },

  // The URL that was checked (denormalized for convenience)
  url: {
    type: String,
    required: true,
  },

  // Result of the check
  status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE'],
    required: true,
  },

  // HTTP status code returned
  statusCode: {
    type: Number,
    default: null,
  },

  // Response time in milliseconds
  responseTime: {
    type: Number,
    default: null,
  },

  // When this check was performed
  checkedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries: get recent history for a website
checkHistorySchema.index({ websiteId: 1, checkedAt: -1 });

module.exports = mongoose.model('CheckHistory', checkHistorySchema);
