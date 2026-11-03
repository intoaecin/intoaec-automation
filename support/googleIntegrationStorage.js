const fs = require('fs');
const path = require('path');

const DEFAULT_RELATIVE_PATH = 'fixtures/google-integration/storage-state.json';

function getDefaultPath() {
  return path.resolve(process.cwd(), DEFAULT_RELATIVE_PATH);
}

function resolveConfiguredPath() {
  const configured =
    process.env.GOOGLE_INTEGRATION_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE;
  if (!configured) {
    return null;
  }
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function resolvePathForWorld() {
  const configuredPath = resolveConfiguredPath();
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }
  return null;
}

function exists(filePath = getDefaultPath()) {
  return fs.existsSync(filePath);
}

function ensureDirectory() {
  const directory = path.dirname(getDefaultPath());
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

module.exports = {
  DEFAULT_RELATIVE_PATH,
  getDefaultPath,
  resolveConfiguredPath,
  resolvePathForWorld,
  exists,
  ensureDirectory,
};
