const { Given, When, Then } = require('@cucumber/cucumber');
const GoogleIntegrationPage = require('../../../../../pages/admin/crm/lead-profile/event/GoogleIntegrationPage');
const GoogleIntegrationStorage = require('../../../../../support/googleIntegrationStorage');

function getGoogleIntegrationPage(world) {
  if (!world.googleIntegrationPage) {
    world.googleIntegrationPage = new GoogleIntegrationPage(world.page);
  }
  return world.googleIntegrationPage;
}

Given('Google Calendar integration is configured', { timeout: 120000 }, async function () {
  const storagePath = GoogleIntegrationStorage.resolveConfiguredPath();
  if (storagePath && GoogleIntegrationStorage.exists(storagePath)) {
    console.log(`[GoogleIntegration] Using storage state from ${storagePath}`);
  }

  await getGoogleIntegrationPage(this).ensureGoogleCalendarIntegrationConfigured();
});

When('I open Create Meeting and click the Online tab', { timeout: 120000 }, async function () {
  const page = getGoogleIntegrationPage(this);
  await page.openCreateMeetingFromEvents();
  await page.clickOnlineMeetingTab();
});

When('I click Connect Google Meet', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).clickConnectGoogleMeet();
});

When('I click the Google integration card', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).clickGoogleIntegrationCard();
});

When('I complete Google Calendar integration manually', { timeout: 600000 }, async function () {
  await getGoogleIntegrationPage(this).completeGoogleCalendarIntegrationManually();
});

When('I click Configure on the Google integration page', { timeout: 120000 }, async function () {
  const page = getGoogleIntegrationPage(this);
  page.pendingOAuthPopupPromise = page.waitForGoogleOAuthPopup().catch(() => null);
  await page.clickConfigure();
});

When('I close the Google OAuth popup without signing in', { timeout: 120000 }, async function () {
  const page = getGoogleIntegrationPage(this);
  const popup = page.pendingOAuthPopupPromise ? await page.pendingOAuthPopupPromise : null;
  page.pendingOAuthPopupPromise = null;

  if (popup) {
    await popup.close().catch(() => {});
  } else {
    await page.cancelGoogleAuthenticationPopup();
  }

  await page.page.waitForTimeout(1000);
});

When('I navigate back to Lead Events Create Meeting Online tab', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).navigateBackToLeadEventsCreateMeeting();
});

Then('Google Calendar should not be connected', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectGoogleCalendarNotConnected();
});

Then('Google Calendar should be connected', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectGoogleCalendarConnected();
});

Then('the Connect Google Meet screen should be displayed', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectConnectGoogleMeetScreenDisplayed();
});

Then('the Configure Google Account page should open', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectConfigureGoogleAccountPageOpen();
});

Then('the Google integration card should be displayed', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectGoogleIntegrationCardDisplayed();
});

Then('the Configure button should be displayed on the Google integration page', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectConfigureButtonDisplayed();
});

Then('the Online Meeting form should open directly', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectOnlineMeetingFormDisplayed();
});

Then('the Connect Google Meet screen should not be displayed', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectConnectGoogleMeetScreenNotDisplayed();
});

Then('I should be able to proceed to create an online meeting', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectCanProceedToCreateOnlineMeeting();
});

Then('I should remain on the Configure Google Account page', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectRemainsOnConfigureGoogleAccountPage();
});

Then('Online Meeting creation should be blocked until integration is completed', { timeout: 120000 }, async function () {
  await getGoogleIntegrationPage(this).expectOnlineMeetingBlockedUntilIntegration();
});
