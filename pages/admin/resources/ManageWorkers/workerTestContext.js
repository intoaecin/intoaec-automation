function buildRandomSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function buildWorkerContext(overrides = {}) {
  const suffix = buildRandomSuffix();
  return {
    individualName: overrides.individualName || `Auto Worker ${suffix}`,
    contractorName: overrides.contractorName || `Auto Contractor ${suffix}`,
    workerTypeName: overrides.workerTypeName || `Auto Type ${suffix}`,
    workerTypeDescription: overrides.workerTypeDescription || `Automation worker type ${suffix}`,
    editedWorkerTypeName: overrides.editedWorkerTypeName || `Auto Type Edited ${suffix}`,
    rate: overrides.rate != null ? overrides.rate : '100',
    workingHours: overrides.workingHours != null ? overrides.workingHours : '8',
    overTimeRate: overrides.overTimeRate != null ? overrides.overTimeRate : '150',
    editedName: overrides.editedName || `Auto Worker Edited ${suffix}`,
    editedRate: overrides.editedRate != null ? overrides.editedRate : '125',
    deleteReason: overrides.deleteReason || `Automation delete ${suffix}`,
    orgUserName: overrides.orgUserName || '',
    orgUserEmail: overrides.orgUserEmail || '',
    orgUserRate: overrides.orgUserRate != null ? overrides.orgUserRate : '200',
    orgUserWorkingHours: overrides.orgUserWorkingHours != null ? overrides.orgUserWorkingHours : '8',
    shiftNames: overrides.shiftNames || [],
    lastShiftName: overrides.lastShiftName || '',
    expenseName: overrides.expenseName || '',
    expenseAmount: overrides.expenseAmount || '',
    ...overrides,
  };
}

function syncContextToWorld(world, patch = {}) {
  world.workerContext = {
    ...(world.workerContext || buildWorkerContext()),
    ...patch,
  };
  return world.workerContext;
}

function getContext(world) {
  if (!world.workerContext) {
    world.workerContext = buildWorkerContext();
  }
  return world.workerContext;
}

module.exports = {
  buildRandomSuffix,
  buildWorkerContext,
  syncContextToWorld,
  getContext,
};
