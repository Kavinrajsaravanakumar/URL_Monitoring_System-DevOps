const axios = require('axios');
const cron = require('node-cron');
const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient } = require('../config/db');
const Website = require('../models/Website');
const CheckHistory = require('../models/CheckHistory');

/**
 * Send an email notification via AWS SNS.
 * 
 * @param {Object} website - Website document
 * @param {'DOWN'|'RECOVERY'} type - Alert type
 */
const sendSnsEmail = async (website, type) => {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.log(`  ⚠️ SNS_TOPIC_ARN environment variable is not defined. Skipping alert for ${website.name}.`);
    return;
  }

  let subject = '';
  let message = '';
  const checkTime = website.lastChecked ? website.lastChecked.toLocaleString() : new Date().toLocaleString();

  if (type === 'DOWN') {
    subject = `🚨 ALERT: Website Down - ${website.name}`;
    message = `The monitored website "${website.name}" (${website.url}) has failed 5 consecutive checks and is currently OFFLINE.\n\n` +
              `Details:\n` +
              `- Status: OFFLINE\n` +
              `- HTTP Status Code: ${website.statusCode !== null ? website.statusCode : 'Connection Error / Timeout'}\n` +
              `- Response Time: ${website.responseTime}ms\n` +
              `- Last Checked: ${checkTime}\n` +
              `- Consecutive Failure Count: ${website.failureCount}\n\n` +
              `Only one down alert email is sent while the website remains unreachable. You will receive a recovery email once it is online.`;
  } else if (type === 'RECOVERY') {
    subject = `✅ RECOVERY: Website Up - ${website.name}`;
    message = `The monitored website "${website.name}" (${website.url}) has recovered and is now ONLINE.\n\n` +
              `Details:\n` +
              `- Status: ONLINE\n` +
              `- HTTP Status Code: ${website.statusCode}\n` +
              `- Response Time: ${website.responseTime}ms\n` +
              `- Recovered At: ${checkTime}\n\n` +
              `The consecutive failure counter has been reset.`;
  }

  try {
    await snsClient.send(new PublishCommand({
      TopicArn: topicArn,
      Subject: subject,
      Message: message
    }));
    console.log(`  ✉️ SNS Email Alert (${type}) sent successfully for ${website.name}`);
  } catch (error) {
    console.error(`  ❌ Failed to send SNS alert for ${website.name}:`, error.message);
  }
};

/**
 * Check a single website's availability.
 * Measures response time, records the HTTP status code,
 * sends SNS email alerts on failure/recovery thresholds,
 * and saves results in DynamoDB.
 *
 * @param {Object} website - Website document
 */
const checkWebsite = async (website) => {
  const startTime = Date.now();
  let status = 'PENDING';
  let statusCode = null;
  let responseTime = 0;

  try {
    const response = await axios.get(website.url, {
      timeout: parseInt(process.env.CHECK_TIMEOUT) || 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'URL-Monitor-Bot/1.0',
      },
    });

    responseTime = Date.now() - startTime;
    statusCode = response.status;
    status = statusCode >= 200 && statusCode < 400 ? 'ONLINE' : 'OFFLINE';

    console.log(
      `  ✅ ${website.name} (${website.url}) — ${status} | ${statusCode} | ${responseTime}ms`
    );
  } catch (error) {
    responseTime = Date.now() - startTime;
    status = 'OFFLINE';
    statusCode = null;
    const reason = error.code || error.message || 'Unknown error';
    console.log(`  ❌ ${website.name} (${website.url}) — OFFLINE | ${reason} | ${responseTime}ms`);
  }

  // Update check attributes
  website.status = status;
  website.statusCode = statusCode;
  website.responseTime = responseTime;
  website.lastChecked = new Date();

  // Alerting logic based on status
  if (status === 'ONLINE') {
    if (website.alertSent) {
      await sendSnsEmail(website, 'RECOVERY');
      website.alertSent = false;
    }
    website.failureCount = 0;
  } else {
    website.failureCount = (website.failureCount || 0) + 1;
    if (website.failureCount >= 5 && !website.alertSent) {
      await sendSnsEmail(website, 'DOWN');
      website.alertSent = true;
    }
  }

  // Save the updated configuration to DynamoDB
  await website.save();

  // Record a history log in DynamoDB
  await CheckHistory.create({
    websiteId: website._id,
    url: website.url,
    status,
    statusCode,
    responseTime,
    checkedAt: website.lastChecked,
  });
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
