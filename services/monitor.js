const axios = require('axios');
const cron = require('node-cron');
const Website = require('../models/Website');
const CheckHistory = require('../models/CheckHistory');

/**
 * Check a single website's availability.
 * Measures response time, records the HTTP status code,
 * and saves a history entry.
 *
 * @param {Object} website - Mongoose Website document
 */
const checkWebsite = async (website) => {
  const startTime = Date.now();

  try {
    const response = await axios.get(website.url, {
      timeout: parseInt(process.env.CHECK_TIMEOUT) || 10000,
      // Don't follow too many redirects
      maxRedirects: 5,
      // Accept any status code so we can record it
      validateStatus: () => true,
      // We only care about headers, not the full body
      headers: {
        'User-Agent': 'URL-Monitor-Bot/1.0',
      },
    });

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;

    // Consider 2xx and 3xx as ONLINE
    const status = statusCode >= 200 && statusCode < 400 ? 'ONLINE' : 'OFFLINE';

    // Update the website document with latest check results
    website.status = status;
    website.statusCode = statusCode;
    website.responseTime = responseTime;
    website.lastChecked = new Date();
    await website.save();

    // Save a history record for this check
    await CheckHistory.create({
      websiteId: website._id,
      url: website.url,
      status,
      statusCode,
      responseTime,
      checkedAt: new Date(),
    });

    console.log(
      `  ✅ ${website.name} (${website.url}) — ${status} | ${statusCode} | ${responseTime}ms`
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Any network error means the site is OFFLINE
    website.status = 'OFFLINE ';
    website.statusCode = null;
    website.responseTime = responseTime;
    website.lastChecked = new Date();
    await website.save();

    // Record the failed check in history
    await CheckHistory.create({
      websiteId: website._id,
      url: website.url,
      status: 'OFFLINE',
      statusCode: null,
      responseTime,
      checkedAt: new Date(),
    });

    // Log the specific error reason
    const reason = error.code || error.message || 'Unknown error';
    console.log(`  ❌ ${website.name} (${website.url}) — OFFLINE | ${reason} | ${responseTime}ms`);
  }
};

/**
 * Check all monitored websites.
 * Fetches every website from the database and checks each one.
 */
const checkAllWebsites = async () => {
  try {
    const websites = await Website.find();

    if (websites.length === 0) {
      console.log('⚠️  No websites to monitor. Add some via the dashboard!');
      return;
    }

    console.log(`\n🔍 Checking ${websites.length} website(s)...`);
    console.log('─'.repeat(60));

    // Check websites concurrently for speed
    await Promise.all(websites.map((website) => checkWebsite(website)));

    console.log('─'.repeat(60));
    console.log(`✅ Check complete at ${new Date().toLocaleTimeString()}\n`);
  } catch (error) {
    console.error('❌ Error during monitoring cycle:', error.message);
  }
};

/**
 * Start the monitoring cron job.
 * Runs checkAllWebsites() on the schedule defined in CRON_SCHEDULE.
 * Defaults to every 1 minute: "* * * * *"
 */
const startMonitoring = () => {
  const schedule = process.env.CRON_SCHEDULE || '* * * * *';

  console.log(`\n🕐 Monitoring scheduler started (cron: "${schedule}")`);
  console.log('📡 URLs will be checked every minute\n');

  // Run an initial check immediately on startup
  checkAllWebsites();

  // Schedule recurring checks
  cron.schedule(schedule, () => {
    checkAllWebsites();
  });
};

module.exports = { checkWebsite, checkAllWebsites, startMonitoring };
