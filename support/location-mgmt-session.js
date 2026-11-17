/**
 * Cross-scenario fixture for Project Location Management.
 * World is recreated each scenario; this module keeps the disposable
 * client/project name for the whole cucumber process.
 *
 * Create once → reuse while Location Add stays enabled.
 * Clear / recreate when Add is locked (e.g. after allocate) or open fails.
 */
const state = {
  projectName: '',
  clientName: '',
  addLocked: false,
};

function getLocationMgmtSession() {
  return {
    projectName: String(state.projectName || '').trim(),
    clientName: String(state.clientName || '').trim(),
    addLocked: Boolean(state.addLocked),
  };
}

function hasReusableLocationProject() {
  const { projectName, clientName, addLocked } = getLocationMgmtSession();
  return !addLocked && Boolean(projectName || clientName);
}

function setLocationMgmtSession({ projectName = '', clientName = '', addLocked = false } = {}) {
  state.projectName = String(projectName || '').trim();
  state.clientName = String(clientName || '').trim();
  state.addLocked = Boolean(addLocked);
}

function markLocationMgmtAddLocked() {
  state.addLocked = true;
}

function clearLocationMgmtSession() {
  state.projectName = '';
  state.clientName = '';
  state.addLocked = false;
}

module.exports = {
  getLocationMgmtSession,
  hasReusableLocationProject,
  setLocationMgmtSession,
  markLocationMgmtAddLocked,
  clearLocationMgmtSession,
};
