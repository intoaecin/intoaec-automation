const fs = require('fs');
const path = require('path');

/** Off by default; set SCREENSHOTS_ENABLED=true to capture failure/step screenshots again. */
function isScreenshotsEnabled() {
  return process.env.SCREENSHOTS_ENABLED === 'true';
}

function getScreenshotDir() {
  return path.join(process.cwd(), 'screenshots');
}

async function captureScreenshot(page, filePath) {
  if (!isScreenshotsEnabled() || !page || page.isClosed()) return false;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath });
  return true;
}

module.exports = {
  isScreenshotsEnabled,
  getScreenshotDir,
  captureScreenshot,
};
