/**
 * Cross-scenario + cross-process memory for Vendor RFQ (TC-01 → TC-02).
 * Written after Admin project is opened in TC-01; read by TC-02.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '.vendor-rfq-session.json');

const state = {
  adminProjectUrl: '',
  adminProjectName: '',
  rfqTitle: 'New One',
  rfqNumber: '',
  vendorEmail: '',
};

function writeFileState() {
  const payload = JSON.stringify(
    {
      adminProjectUrl: state.adminProjectUrl,
      adminProjectName: state.adminProjectName,
      rfqTitle: state.rfqTitle,
      rfqNumber: state.rfqNumber,
      vendorEmail: state.vendorEmail,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  );
  const targets = [FILE];
  try {
    const os = require('os');
    targets.push(path.join(os.tmpdir(), 'intoaec-vendor-rfq-session.json'));
  } catch {
    /* ignore */
  }
  for (const target of targets) {
    try {
      fs.writeFileSync(target, payload, 'utf8');
    } catch (err) {
      console.warn(`[VendorRFQ session] Could not write ${target}: ${err.message}`);
    }
  }
}

function readFileState() {
  const candidates = [FILE];
  try {
    const os = require('os');
    candidates.push(path.join(os.tmpdir(), 'intoaec-vendor-rfq-session.json'));
  } catch {
    /* ignore */
  }
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8') || '{}') || {};
      if (parsed.adminProjectUrl) return parsed;
    } catch {
      /* try next */
    }
  }
  return {};
}

function hydrateFromDisk() {
  const disk = readFileState();
  if (!state.adminProjectUrl && disk.adminProjectUrl) state.adminProjectUrl = disk.adminProjectUrl;
  if (!state.adminProjectName && disk.adminProjectName) state.adminProjectName = disk.adminProjectName;
  if (disk.rfqTitle) state.rfqTitle = disk.rfqTitle;
  if (disk.rfqNumber) state.rfqNumber = disk.rfqNumber;
  if (disk.vendorEmail) state.vendorEmail = String(disk.vendorEmail).trim().toLowerCase();
}

function saveAdminProject({ url, name } = {}) {
  hydrateFromDisk();
  if (url !== undefined && url !== null) {
    state.adminProjectUrl = String(url).trim();
    process.env.VENDOR_RFQ_LAST_ADMIN_PROJECT_URL = state.adminProjectUrl;
  }
  if (name !== undefined && name !== null) {
    state.adminProjectName = String(name).trim();
    process.env.VENDOR_RFQ_LAST_ADMIN_PROJECT_NAME = state.adminProjectName;
  }
  writeFileState();
  console.log(
    `[VendorRFQ session] Saved Admin project${name ? ` "${name}"` : ''}: ${state.adminProjectUrl || '(cleared)'}`
  );
}

function clearAdminProject() {
  state.adminProjectUrl = '';
  state.adminProjectName = '';
  process.env.VENDOR_RFQ_LAST_ADMIN_PROJECT_URL = '';
  process.env.VENDOR_RFQ_LAST_ADMIN_PROJECT_NAME = '';
  writeFileState();
  console.log('[VendorRFQ session] Cleared saved Admin project');
}

function getAdminProjectUrl() {
  hydrateFromDisk();
  return String(
    state.adminProjectUrl || process.env.VENDOR_RFQ_LAST_ADMIN_PROJECT_URL || ''
  ).trim();
}

function getAdminProjectName() {
  hydrateFromDisk();
  return String(
    state.adminProjectName || process.env.VENDOR_RFQ_LAST_ADMIN_PROJECT_NAME || ''
  ).trim();
}

function getRfqTitle() {
  hydrateFromDisk();
  return String(state.rfqTitle || 'New One').trim();
}

function setRfqTitle(title) {
  const t = String(title || '').trim();
  if (!t) return;
  state.rfqTitle = t;
  writeFileState();
}

function setRfqNumber(num) {
  const n = String(num ?? '').trim();
  if (!n) return;
  state.rfqNumber = n;
  writeFileState();
}

function getRfqNumber() {
  hydrateFromDisk();
  return String(state.rfqNumber || '').trim();
}

function setVendorEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return;
  hydrateFromDisk();
  state.vendorEmail = e;
  process.env.VENDOR_RFQ_LAST_VENDOR_EMAIL = e;
  writeFileState();
  console.log(`[VendorRFQ session] Saved RFQ vendor email for portal login: ${e}`);
}

function getVendorEmail() {
  hydrateFromDisk();
  return String(
    state.vendorEmail || process.env.VENDOR_RFQ_LAST_VENDOR_EMAIL || ''
  )
    .trim()
    .toLowerCase();
}

module.exports = {
  saveAdminProject,
  clearAdminProject,
  getAdminProjectUrl,
  getAdminProjectName,
  getRfqTitle,
  setRfqTitle,
  setRfqNumber,
  getRfqNumber,
  setVendorEmail,
  getVendorEmail,
  FILE,
};
