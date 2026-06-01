const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const { startMonitoring } = require('./services/monitor');

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

// Enable CORS for all origins
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
app.use(morgan('dev'));

// Serve static files from the public directory
app.use(express.static('public'));

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

app.use('/api', apiRoutes);

// ─────────────────────────────────────────────
// Health check endpoint
// ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the Express server
    app.listen(PORT, () => {
      console.log('\n' + '═'.repeat(50));
      console.log('  🌐 URL Monitoring Dashboard');
      console.log('═'.repeat(50));
      console.log(`  🚀 Server running on port ${PORT}`);
      console.log(`  📊 Dashboard: http://localhost:${PORT}`);
      console.log(`  📡 API Base:  http://localhost:${PORT}/api`);
      console.log('═'.repeat(50) + '\n');

      // Start the URL monitoring cron job
      startMonitoring();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
