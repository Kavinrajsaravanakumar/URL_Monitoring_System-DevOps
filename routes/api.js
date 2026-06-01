const express = require('express');
const router = express.Router();
const Website = require('../models/Website');
const CheckHistory = require('../models/CheckHistory');

// ─────────────────────────────────────────────
// POST /api/websites — Add a new website to monitor
// ─────────────────────────────────────────────
router.post('/websites', async (req, res) => {
  try {
    const { url, name } = req.body;

    // Validate required fields
    if (!url || !name) {
      return res.status(400).json({
        success: false,
        message: 'Both "url" and "name" are required',
      });
    }

    // Normalize the URL — ensure it has a protocol
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Check if this URL is already being monitored
    const existing = await Website.findOne({ url: normalizedUrl });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This URL is already being monitored',
      });
    }

    // Create the new website document
    const website = await Website.create({
      url: normalizedUrl,
      name: name.trim(),
    });

    console.log(`➕ Added website: ${website.name} (${website.url})`);

    res.status(201).json({
      success: true,
      message: 'Website added successfully',
      data: website,
    });
  } catch (error) {
    console.error('Error adding website:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add website',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/websites/:id — Remove a monitored website
// ─────────────────────────────────────────────
router.delete('/websites/:id', async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
      });
    }

    // Remove the website and all its history
    await CheckHistory.deleteMany({ websiteId: website._id });
    await Website.findByIdAndDelete(req.params.id);

    console.log(`🗑️  Removed website: ${website.name} (${website.url})`);

    res.json({
      success: true,
      message: 'Website removed successfully',
    });
  } catch (error) {
    console.error('Error deleting website:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete website',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/websites — Get all monitored websites
// ─────────────────────────────────────────────
router.get('/websites', async (req, res) => {
  try {
    // Sort by creation date, newest first
    const websites = await Website.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: websites.length,
      data: websites,
    });
  } catch (error) {
    console.error('Error fetching websites:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch websites',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/websites/:id/history — Get check history for a website
// ─────────────────────────────────────────────
router.get('/websites/:id/history', async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found',
      });
    }

    // Get the last 50 checks, most recent first
    const history = await CheckHistory.find({ websiteId: req.params.id })
      .sort({ checkedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      website: website.name,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats — Get dashboard statistics
// ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const websites = await Website.find();

    const total = websites.length;
    const online = websites.filter((w) => w.status === 'ONLINE').length;
    const offline = websites.filter((w) => w.status === 'OFFLINE').length;
    const pending = websites.filter((w) => w.status === 'PENDING').length;

    // Calculate average response time (only for sites that have been checked)
    const checkedSites = websites.filter((w) => w.responseTime !== null);
    const avgResponseTime =
      checkedSites.length > 0
        ? Math.round(
            checkedSites.reduce((sum, w) => sum + w.responseTime, 0) / checkedSites.length
          )
        : 0;

    // Find fastest and slowest
    const fastest =
      checkedSites.length > 0
        ? checkedSites.reduce((min, w) => (w.responseTime < min.responseTime ? w : min))
        : null;

    const slowest =
      checkedSites.length > 0
        ? checkedSites.reduce((max, w) => (w.responseTime > max.responseTime ? w : max))
        : null;

    res.json({
      success: true,
      data: {
        total,
        online,
        offline,
        pending,
        avgResponseTime,
        fastest: fastest ? { name: fastest.name, responseTime: fastest.responseTime } : null,
        slowest: slowest ? { name: slowest.name, responseTime: slowest.responseTime } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

module.exports = router;
