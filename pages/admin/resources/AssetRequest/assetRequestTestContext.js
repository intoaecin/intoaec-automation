const STATUS_VALUES = {
  pending: /pending/i,
  requested: /requested/i,
  approved: /approved/i,
  declined: /declined|rejected/i,
};

function buildRandomSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function buildAssetRequestContext(overrides = {}) {
  const suffix = buildRandomSuffix();
  const assetName = overrides.assetName || '';
  return {
    assetName,
    projectName: overrides.projectName || '',
    quantity: overrides.quantity || '1',
    returnDuration: overrides.returnDuration || '24',
    returnDurationUnit: overrides.returnDurationUnit || 'Hr',
    approxReturnDate: overrides.approxReturnDate || buildApproxReturnDate(7),
    notes: overrides.notes || `Automation request note ${suffix}`,
    lastStatus: overrides.lastStatus || 'Requested',
    isBulkAsset: overrides.isBulkAsset ?? false,
    ...overrides,
  };
}

function buildApproxReturnDate(daysAhead = 7) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, daysAhead));
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return {
    inputDate: `${yyyy}-${mm}-${dd}`,
    textDate: `${mm}/${dd}/${yyyy}`,
    day: String(date.getDate()),
  };
}

function syncContextToWorld(world, patch = {}) {
  world.assetRequestContext = {
    ...(world.assetRequestContext || {}),
    ...patch,
  };
  return world.assetRequestContext;
}

function getContext(world) {
  if (!world.assetRequestContext) {
    world.assetRequestContext = buildAssetRequestContext();
  }
  return world.assetRequestContext;
}

function statusToRegex(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  const aliases = {
    pending: 'pending',
    requested: 'requested',
    approved: 'approved',
    declined: 'declined',
    rejected: 'declined',
  };

  const key = aliases[normalized];
  if (key && STATUS_VALUES[key]) {
    return STATUS_VALUES[key];
  }

  return new RegExp(String(status).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

module.exports = {
  STATUS_VALUES,
  buildAssetRequestContext,
  buildApproxReturnDate,
  syncContextToWorld,
  getContext,
  statusToRegex,
};
