/**
 * Cross-scenario memory for Purchase Order (TC-01 → TC-02 vendor Preview).
 * PO number is dynamic (e.g. PO0000093) — never hardcode the digits.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '.vendor-po-session.json');

const state = {
  poTitle: 'New PO 1',
  poNumber: '',
  vendorEmail: '',
  products: [],
  quantities: ['1', '2', '3'],
  unit: 'Each',
  adminProjectName: '',
  adminProjectUrl: '',
};

function writeFileState() {
  const payload = JSON.stringify(
    {
      ...state,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  );
  try {
    fs.writeFileSync(FILE, payload, 'utf8');
  } catch (err) {
    console.warn(`[VendorPO session] Could not write ${FILE}: ${err.message}`);
  }
  try {
    const os = require('os');
    fs.writeFileSync(path.join(os.tmpdir(), 'intoaec-vendor-po-session.json'), payload, 'utf8');
  } catch {
    /* optional */
  }
}

function readFileState() {
  const candidates = [FILE];
  try {
    const os = require('os');
    candidates.push(path.join(os.tmpdir(), 'intoaec-vendor-po-session.json'));
  } catch {
    /* ignore */
  }
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      return JSON.parse(fs.readFileSync(candidate, 'utf8') || '{}') || {};
    } catch {
      /* try next */
    }
  }
  return {};
}

function hydrateFromDisk() {
  const disk = readFileState();
  if (disk.poTitle) state.poTitle = disk.poTitle;
  if (disk.poNumber) state.poNumber = disk.poNumber;
  if (disk.vendorEmail) state.vendorEmail = disk.vendorEmail;
  if (Array.isArray(disk.products)) state.products = disk.products;
  if (Array.isArray(disk.quantities)) state.quantities = disk.quantities;
  if (disk.unit) state.unit = disk.unit;
  if (disk.adminProjectName) state.adminProjectName = disk.adminProjectName;
  if (disk.adminProjectUrl) state.adminProjectUrl = disk.adminProjectUrl;
}

function saveFromWorld(world = {}) {
  hydrateFromDisk();
  const title = String(world.lastPoTitle || state.poTitle || 'New PO 1').trim();
  const poNumber = String(
    world.lastPoNumber || world.purchaseOrderCreatePoPage?.lastPoNumber || state.poNumber || ''
  )
    .trim()
    .toUpperCase();
  // Reject false captures like PO1 from title "New PO 1".
  const poDigits = (poNumber.match(/(\d{4,})/) || [])[0] || '';
  const safePoNumber = poDigits ? (poNumber.match(/PO\d{4,}/i) || [`PO${poDigits}`])[0].toUpperCase() : '';
  const email = String(
    world.vendorYopmailEmail || world.vendorRfqLoginEmail || state.vendorEmail || ''
  ).trim();
  const products =
    world.lastPoSelectedProducts ||
    world.purchaseOrderCreatePoPage?.lastPoSelectedProducts ||
    state.products ||
    [];
  const projectName = String(world.lastAdminProjectName || state.adminProjectName || '').trim();
  const projectUrl = String(
    world.lastVendorPoAdminProjectUrl || world.page?.url?.() || state.adminProjectUrl || ''
  ).trim();
  state.poTitle = title || 'New PO 1';
  if (safePoNumber) state.poNumber = safePoNumber;
  else state.poNumber = '';
  if (email) state.vendorEmail = email;
  if (Array.isArray(products) && products.length) state.products = products;
  if (projectName) state.adminProjectName = projectName;
  if (projectUrl && /client\/profile|projectId=/i.test(projectUrl)) {
    state.adminProjectUrl = projectUrl;
  }
  state.quantities = ['1', '2', '3'];
  state.unit = 'Each';
  writeFileState();
  console.log(
    `[VendorPO session] Saved PO "${state.poTitle}" number=${state.poNumber || '(most recent PO######)'} project="${state.adminProjectName || '(unknown)'}" vendor=${state.vendorEmail || '(none)'} products=${state.products.length}`
  );
}

function applyToWorld(world) {
  hydrateFromDisk();
  world.lastPoTitle = state.poTitle || 'New PO 1';
  if (state.poNumber) world.lastPoNumber = state.poNumber;
  if (state.vendorEmail) {
    world.vendorYopmailEmail = state.vendorEmail;
    world.vendorRfqLoginEmail = state.vendorEmail;
  }
  if (Array.isArray(state.products) && state.products.length) {
    world.lastPoSelectedProducts = state.products;
  }
  if (state.adminProjectName) world.lastAdminProjectName = state.adminProjectName;
  if (state.adminProjectUrl) world.lastVendorPoAdminProjectUrl = state.adminProjectUrl;
  world.lastPoQuantities = state.quantities || ['1', '2', '3'];
  world.lastPoUnit = state.unit || 'Each';
  console.log(
    `[VendorPO session] Loaded PO "${world.lastPoTitle}" number=${world.lastPoNumber || '(match latest PO######)'} project="${world.lastAdminProjectName || '(any)'}" for TC-02 Preview (3-dots)`
  );
}

function getPoTitle() {
  hydrateFromDisk();
  return String(state.poTitle || 'New PO 1').trim();
}

function getPoNumber() {
  hydrateFromDisk();
  return String(state.poNumber || '').trim().toUpperCase();
}

function getVendorEmail() {
  hydrateFromDisk();
  return String(state.vendorEmail || '').trim();
}

function getProducts() {
  hydrateFromDisk();
  return Array.isArray(state.products) ? state.products : [];
}

function getAdminProjectName() {
  hydrateFromDisk();
  return String(state.adminProjectName || '').trim();
}

function getAdminProjectUrl() {
  hydrateFromDisk();
  return String(state.adminProjectUrl || '').trim();
}

function saveAdminProject({ url, name } = {}) {
  hydrateFromDisk();
  if (url !== undefined && url !== null) {
    state.adminProjectUrl = String(url).trim();
  }
  if (name !== undefined && name !== null) {
    state.adminProjectName = String(name).trim();
  }
  writeFileState();
  console.log(
    `[VendorPO session] Saved Admin project${name ? ` "${name}"` : ''}: ${state.adminProjectUrl || '(cleared)'}`
  );
}

function setVendorEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return;
  hydrateFromDisk();
  state.vendorEmail = e;
  writeFileState();
  console.log(`[VendorPO session] Saved PO vendor email for portal login: ${e}`);
}

module.exports = {
  FILE,
  saveFromWorld,
  applyToWorld,
  getPoTitle,
  getPoNumber,
  getVendorEmail,
  setVendorEmail,
  getProducts,
  getAdminProjectName,
  getAdminProjectUrl,
  saveAdminProject,
};
