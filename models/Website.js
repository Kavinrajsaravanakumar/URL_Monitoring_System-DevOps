const mongoose = require('mongoose');

/**
 * Website Schema
 * Represents a website being monitored for uptime.
 */
const websiteSchema = new mongoose.Schema(
  {
    // The full URL to monitor (e.g. https://google.com)
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },

    // A friendly display name for the website
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    // Current status of the website
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'PENDING'],
      default: 'PENDING',
    },

    // HTTP status code from the last check (e.g. 200, 404, 500)
    statusCode: {
      type: Number,
      default: null,
    },

    // Response time of the last check in milliseconds
    responseTime: {
      type: Number,
      default: null,
    },

    // Timestamp of the last successful check
    lastChecked: {
      type: Date,
      default: null,
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

module.exports = mongoose.model('Website', websiteSchema);
