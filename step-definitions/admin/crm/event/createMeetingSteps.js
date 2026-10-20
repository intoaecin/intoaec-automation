const { After, When, Then } = require('@cucumber/cucumber');
const EventPage = require('../../../../../pages/admin/crm/lead-profile/event/EventPage');

function getEventPage(world) {
  if (!world.eventPage) {
    world.eventPage = new EventPage(world.page);
  }
  return world.eventPage;
}

After({ tags: '@meeting' }, async function () {
  if (!this.page || this.page.isClosed()) {
    return;
  }
  await getEventPage(this).dismissCreateMeetingPanel();
});

When('I navigate to the first available lead', { timeout: 120000 }, async function () {
  await getEventPage(this).navigateToFirstAvailableLead();
});

When('I open the Events module', { timeout: 120000 }, async function () {
  await getEventPage(this).openEventsModule();
});

When('I open the Events action menu', { timeout: 120000 }, async function () {
  await getEventPage(this).openActionMenu();
});

When('I select Create Meeting', { timeout: 120000 }, async function () {
  await getEventPage(this).selectCreateMeeting();
});

Then('the Create Meeting panel should open', { timeout: 120000 }, async function () {
  await getEventPage(this).expectCreateMeetingPanelOpen();
});

Then('all mandatory Create Meeting fields and action buttons should be displayed', { timeout: 120000 }, async function () {
  await getEventPage(this).expectMandatoryFieldsAndActionButtonsVisible();
});

Then('I should remain on the Create Meeting screen without errors', { timeout: 120000 }, async function () {
  await getEventPage(this).expectCreateMeetingScreenWithoutErrors();
});

When('I fill the Create Meeting online form with valid details', { timeout: 120000 }, async function () {
  await getEventPage(this).fillCreateMeetingOnlineForm();
});

When('I fill the Create Meeting offline form with valid details', { timeout: 120000 }, async function () {
  await getEventPage(this).fillCreateMeetingOfflineForm();
});

When(
  'I fill the Create Meeting offline form without location and agenda',
  { timeout: 120000 },
  async function () {
    await getEventPage(this).fillCreateMeetingOfflineFormWithoutOptionalFields();
  }
);

When('I submit the Create Meeting form', { timeout: 120000 }, async function () {
  await getEventPage(this).submitCreateMeetingForm();
});

Then('I should see the meeting created successfully', { timeout: 120000 }, async function () {
  await getEventPage(this).verifyMeetingCreatedSuccessfully();
});

Then(
  /^I should see the created meeting in the (online|offline) events tab$/,
  { timeout: 120000 },
  async function (meetingType) {
    await getEventPage(this).verifyMeetingVisibleInEventsTab(meetingType);
  }
);

Then('I should see the created meeting in the respective events tab', { timeout: 120000 }, async function () {
  await getEventPage(this).verifyMeetingCreatedInRespectiveEventsTab();
});
