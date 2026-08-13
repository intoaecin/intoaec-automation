/**
 * One-time setup: log into the app, complete Google Calendar integration manually
 * in the browser, then persist Playwright storageState for reuse in automated runs.
 *
 * Usage:
 *   npm run setup:google-integration
 *
 * Then run connected scenarios with:
 *   GOOGLE_INTEGRATION_STORAGE_STATE=fixtures/google-integration/storage-state.json npm run test:admin:crm:lead-profile:google-integration:connected
 */
const { chromium } = require('playwright');
const LoginPage = require('../pages/admin/auth/LoginPage');
const GoogleIntegrationPage = require('../pages/admin/crm/lead-profile/event/GoogleIntegrationPage');
const GoogleIntegrationStorage = require('../support/googleIntegrationStorage');
const testData = require('../utils/testData');

async function main() {
  const storagePath = GoogleIntegrationStorage.getDefaultPath();
  GoogleIntegrationStorage.ensureDirectory();

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);
  await loginPage.ensureAuthenticated(
    testData.admin.validUser.email,
    testData.admin.validUser.password
  );

  const googlePage = new GoogleIntegrationPage(page);
  await googlePage.openCreateMeetingFromEvents();
  await googlePage.clickOnlineMeetingTab();

  const connected = await googlePage.isGoogleCalendarConnected();
  if (!connected) {
    console.log('[Setup] Google Calendar not connected — starting manual integration flow');
    await googlePage.clickConnectGoogleMeet();
    await googlePage.expectConfigureGoogleAccountPageOpen();
    await googlePage.completeGoogleCalendarIntegrationManually();
  } else {
    console.log('[Setup] Google Calendar already connected in this session');
  }

  await googlePage.reopenCreateMeetingOnlineTab();
  const formVisible = await googlePage.isOnlineMeetingFormVisible();
  if (!formVisible) {
    throw new Error(
      'Online Meeting form not available after setup. Complete Google OAuth in the popup and try again.'
    );
  }

  await context.storageState({ path: storagePath });
  console.log(`[Setup] Saved browser storage state to ${storagePath}`);
  console.log(
    `[Setup] Run connected tests with GOOGLE_INTEGRATION_STORAGE_STATE=${GoogleIntegrationStorage.DEFAULT_RELATIVE_PATH}`
  );

  await browser.close();
}

main().catch((error) => {
  console.error('[Setup] Failed to save Google integration storage state:', error.message);
  process.exit(1);
});
