const { When, Then } = require('@cucumber/cucumber');
const MeetingUIPage = require('../../../../../pages/admin/crm/lead-profile/event/MeetingUIPage');

function getMeetingUIPage(world) {
  if (!world.meetingUIPage) {
    world.meetingUIPage = new MeetingUIPage(world.page);
  }
  return world.meetingUIPage;
}

When('I open the Create Meeting popup for UI validation', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).openCreateMeetingPopup();
});

When(/^I click the (Online|Offline) tab on Create Meeting popup$/, { timeout: 120000 }, async function (tabName) {
  await getMeetingUIPage(this).clickMeetingTab(tabName);
});

When('I click the Create Meeting close icon', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).clickCloseIcon();
});

Then('the Create Meeting popup should be displayed', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectCreateMeetingPopupDisplayed();
});

Then('the Create Meeting popup title should be correct', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectPopupTitleCorrect();
});

Then('the Online and Offline tabs should be visible on Create Meeting popup', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectOnlineAndOfflineTabsVisible();
});

Then('the Create Meeting close icon should be visible and clickable', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectCloseIconVisibleAndClickable();
});

Then('all mandatory Create Meeting fields should be displayed on the popup', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectMandatoryFieldsDisplayed();
});

Then('the Create Meeting button should be displayed', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectCreateMeetingButtonDisplayed();
});

Then('all Create Meeting popup controls should be properly aligned', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectControlsProperlyAligned();
});

Then('the Online meeting form should be displayed', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectOnlineMeetingFormDisplayed();
});

Then('the Offline meeting form should be displayed', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectOfflineMeetingFormDisplayed();
});

Then('no UI issues should occur while switching Create Meeting tabs', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectTabSwitchingWithoutUiIssues();
});

Then('the Create Meeting popup should be closed', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectCreateMeetingPopupClosed();
});

Then('I should be returned to the Events page', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectUserReturnedToEventsPage();
});

Then('the Create Meeting popup UI should be valid', { timeout: 120000 }, async function () {
  await getMeetingUIPage(this).expectCreateMeetingPopupUI();
});
