/**
 * URL Monitoring Dashboard — Frontend Application
 *
 * Handles:
 * - Fetching and rendering website data
 * - Adding and deleting websites
 * - Auto-refresh every 30 seconds
 * - Client-side search filtering
 * - Toast notifications
 * - Check history modal
 */

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const API_BASE = '/api';
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let allWebsites = [];
let refreshTimer = null;

// ─────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────
const elements = {
  // Stats
  statTotal: document.getElementById('statTotal'),
  statOnline: document.getElementById('statOnline'),
  statOffline: document.getElementById('statOffline'),
  statAvgResponse: document.getElementById('statAvgResponse'),

  // Form
  addForm: document.getElementById('addWebsiteForm'),
  inputName: document.getElementById('inputName'),
  inputUrl: document.getElementById('inputUrl'),
  btnAdd: document.getElementById('btnAddWebsite'),

  // Table
  tableBody: document.getElementById('websiteTableBody'),
  emptyState: document.getElementById('emptyState'),

  // Search
  searchInput: document.getElementById('searchInput'),

  // Refresh
  btnRefresh: document.getElementById('btnRefresh'),
  lastRefreshTime: document.getElementById('lastRefreshTime'),

  // History modal
  historyTableBody: document.getElementById('historyTableBody'),
  historyModalLabel: document.getElementById('historyModalLabel'),

  // Toast
  toastContainer: document.getElementById('toastContainer'),
};

// ─────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────

/**
 * Fetch all monitored websites from the API
 */
async function fetchWebsites() {
  try {
    const response = await fetch(`${API_BASE}/websites`);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Failed to fetch websites:', error);
    showToast('Failed to fetch websites', 'danger');
    return [];
  }
}

/**
 * Fetch dashboard statistics
 */
async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return null;
  }
}

/**
 * Add a new website via the API
 */
async function addWebsite(name, url) {
  try {
    const response = await fetch(`${API_BASE}/websites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to add website:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Delete a website via the API
 */
async function deleteWebsite(id) {
  try {
    const response = await fetch(`${API_BASE}/websites/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to delete website:', error);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Fetch check history for a specific website
 */
async function fetchHistory(id) {
  try {
    const response = await fetch(`${API_BASE}/websites/${id}/history`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return { success: false, data: [] };
  }
}

// ─────────────────────────────────────────────
// Rendering Functions
// ─────────────────────────────────────────────

/**
 * Update the stats cards with fresh data
 */
function renderStats(stats) {
  if (!stats) return;

  animateValue(elements.statTotal, stats.total);
  animateValue(elements.statOnline, stats.online);
  animateValue(elements.statOffline, stats.offline);
  animateValue(elements.statAvgResponse, stats.avgResponseTime);
}

/**
 * Simple number animation for stat cards
 */
function animateValue(element, newValue) {
  const currentValue = parseInt(element.textContent) || 0;

  if (currentValue === newValue) return;

  const duration = 400;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(currentValue + (newValue - currentValue) * eased);

    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Render the websites table
 */
function renderWebsites(websites) {
  const searchTerm = elements.searchInput.value.toLowerCase().trim();

  // Filter by search term
  const filtered = searchTerm
    ? websites.filter(
        (w) =>
          w.name.toLowerCase().includes(searchTerm) ||
          w.url.toLowerCase().includes(searchTerm)
      )
    : websites;

  // Show/hide empty state
  if (filtered.length === 0) {
    elements.tableBody.innerHTML = '';
    elements.emptyState.classList.remove('d-none');
    return;
  }

  elements.emptyState.classList.add('d-none');

  elements.tableBody.innerHTML = filtered
    .map((website, index) => {
      const statusBadge = getStatusBadge(website.status);
      const httpCode = getHttpCodePill(website.statusCode);
      const responseTime = getResponseTimeLabel(website.responseTime);
      const lastChecked = getLastCheckedLabel(website.lastChecked);

      return `
        <tr style="animation-delay: ${index * 0.02}s">
          <td>
            <span class="website-name">${escapeHtml(website.name)}</span>
            <span class="website-url">${escapeHtml(website.url)}</span>
          </td>
          <td>${statusBadge}</td>
          <td>${httpCode}</td>
          <td>${responseTime}</td>
          <td>${lastChecked}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center gap-1">
              <button
                class="btn-action history"
                title="View history"
                onclick="showHistory('${website._id}', '${escapeHtml(website.name)}')"
              >
                <i class="bi bi-clock-history"></i>
              </button>
              <button
                class="btn-action delete"
                title="Remove website"
                onclick="confirmDelete('${website._id}', '${escapeHtml(website.name)}')"
              >
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Get a styled status badge
 */
function getStatusBadge(status) {
  switch (status) {
    case 'ONLINE':
      return `<span class="badge-status badge-online"><i class="bi bi-check-circle-fill"></i> Online</span>`;
    case 'OFFLINE':
      return `<span class="badge-status badge-offline"><i class="bi bi-x-circle-fill"></i> Offline</span>`;
    default:
      return `<span class="badge-status badge-pending"><i class="bi bi-hourglass-split"></i> Pending</span>`;
  }
}

/**
 * Get a styled HTTP code pill
 */
function getHttpCodePill(code) {
  if (!code) return '<span class="text-muted">—</span>';

  const cssClass = code >= 200 && code < 400 ? 'success' : 'error';
  return `<span class="http-code ${cssClass}">${code}</span>`;
}

/**
 * Get a styled response time label
 */
function getResponseTimeLabel(ms) {
  if (ms === null || ms === undefined) return '<span class="text-muted">—</span>';

  let cssClass = 'fast';
  if (ms > 1000) cssClass = 'slow';
  else if (ms > 500) cssClass = 'medium';

  return `<span class="response-time ${cssClass}">${ms}ms</span>`;
}

/**
 * Format a date as a human-readable "last checked" label
 */
function getLastCheckedLabel(dateStr) {
  if (!dateStr) return '<span class="text-muted">Never</span>';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);

  let relative;
  if (diffSec < 60) relative = 'Just now';
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffHrs < 24) relative = `${diffHrs}h ago`;
  else relative = date.toLocaleDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return `
    <span class="checked-time">${timeStr}</span>
    <span class="checked-time-relative">${relative}</span>
  `;
}

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

/**
 * Refresh all data — websites and stats
 */
async function refreshDashboard() {
  const [websites, stats] = await Promise.all([fetchWebsites(), fetchStats()]);

  allWebsites = websites;
  renderStats(stats);
  renderWebsites(websites);

  // Update last refresh timestamp
  const now = new Date();
  elements.lastRefreshTime.textContent = `Updated ${now.toLocaleTimeString()}`;
}

/**
 * Handle adding a new website
 */
async function handleAddWebsite(event) {
  event.preventDefault();

  const name = elements.inputName.value.trim();
  const url = elements.inputUrl.value.trim();

  if (!name || !url) {
    showToast('Please fill in both fields', 'warning');
    return;
  }

  // Disable button during submission
  elements.btnAdd.disabled = true;
  elements.btnAdd.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Adding...';

  const result = await addWebsite(name, url);

  if (result.success) {
    showToast(`${name} added successfully!`, 'success');
    elements.addForm.reset();
    await refreshDashboard();
  } else {
    showToast(result.message || 'Failed to add website', 'danger');
  }

  elements.btnAdd.disabled = false;
  elements.btnAdd.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Add';
}

/**
 * Confirm and delete a website
 */
async function confirmDelete(id, name) {
  if (!confirm(`Are you sure you want to remove "${name}"?\nThis will also delete all its check history.`)) {
    return;
  }

  const result = await deleteWebsite(id);

  if (result.success) {
    showToast(`${name} removed`, 'success');
    await refreshDashboard();
  } else {
    showToast(result.message || 'Failed to remove website', 'danger');
  }
}

/**
 * Show check history for a website in a modal
 */
async function showHistory(id, name) {
  elements.historyModalLabel.innerHTML = `<i class="bi bi-clock-history me-2"></i>History — ${name}`;
  elements.historyTableBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        Loading history...
      </td>
    </tr>
  `;

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('historyModal'));
  modal.show();

  // Fetch history data
  const result = await fetchHistory(id);

  if (!result.success || result.data.length === 0) {
    elements.historyTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="4">No history available yet. Wait for the next check cycle.</td>
      </tr>
    `;
    return;
  }

  elements.historyTableBody.innerHTML = result.data
    .map((check) => {
      const statusBadge = getStatusBadge(check.status);
      const httpCode = getHttpCodePill(check.statusCode);
      const responseTime = getResponseTimeLabel(check.responseTime);
      const checkedAt = new Date(check.checkedAt).toLocaleString();

      return `
        <tr>
          <td>${statusBadge}</td>
          <td>${httpCode}</td>
          <td>${responseTime}</td>
          <td class="checked-time">${checkedAt}</td>
        </tr>
      `;
    })
    .join('');
}

// ─────────────────────────────────────────────
// Toast Notifications
// ─────────────────────────────────────────────

/**
 * Show a Bootstrap toast notification
 * @param {string} message - The message to display
 * @param {'success'|'danger'|'warning'|'info'} type - Toast variant
 */
function showToast(message, type = 'info') {
  const iconMap = {
    success: 'bi-check-circle-fill',
    danger: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill',
  };

  const colorMap = {
    success: 'var(--accent-success)',
    danger: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    info: 'var(--accent-info)',
  };

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast toast-custom" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="bi ${iconMap[type]} me-2" style="color: ${colorMap[type]}"></i>
        <strong class="me-auto" style="color: ${colorMap[type]}">
          ${type.charAt(0).toUpperCase() + type.slice(1)}
        </strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">${escapeHtml(message)}</div>
    </div>
  `;

  elements.toastContainer.insertAdjacentHTML('beforeend', toastHtml);

  const toastEl = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });

  // Clean up DOM after hiding
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());

  toast.show();
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ─────────────────────────────────────────────
// Event Listeners & Initialization
// ─────────────────────────────────────────────

// Add website form submission
elements.addForm.addEventListener('submit', handleAddWebsite);

// Search input — filter on keyup
elements.searchInput.addEventListener('input', () => {
  renderWebsites(allWebsites);
});

// Manual refresh button
elements.btnRefresh.addEventListener('click', () => {
  const icon = elements.btnRefresh.querySelector('i');
  icon.classList.add('spin-once');
  refreshDashboard();
  setTimeout(() => icon.classList.remove('spin-once'), 600);
});

// Add a spinning animation class for the refresh icon
const style = document.createElement('style');
style.textContent = `
  @keyframes spinOnce {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin-once {
    animation: spinOnce 0.6s ease;
  }
`;
document.head.appendChild(style);

// ─────────────────────────────────────────────
// Initialize Dashboard
// ─────────────────────────────────────────────
(async function init() {
  console.log('🌐 URL Monitoring Dashboard initialized');
  console.log(`📡 Auto-refresh: every ${AUTO_REFRESH_INTERVAL / 1000}s`);

  // Initial data load
  await refreshDashboard();

  // Set up auto-refresh interval
  refreshTimer = setInterval(refreshDashboard, AUTO_REFRESH_INTERVAL);
})();
