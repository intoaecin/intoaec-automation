/**
 * Remembers the Goods Receipt PO created in TC-01 so TC-01A (accept) and TC-01B (inventory GR)
 * can continue without repeating the create/send steps.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '.goods-receipt-session.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8') || '{}') || {};
  } catch {
    return {};
  }
}

function save(patch = {}) {
  const next = {
    ...load(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}

module.exports = { FILE, load, save };
