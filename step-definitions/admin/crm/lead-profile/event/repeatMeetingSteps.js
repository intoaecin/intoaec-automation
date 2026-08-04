const { When, Then } = require('@cucumber/cucumber');
const RepeatMeetingPage = require('../../../../../pages/admin/crm/lead-profile/event/RepeatMeetingPage');

function getRepeatMeetingPage(world) {
  if (!world.repeatMeetingPage) {
    world.repeatMeetingPage = new RepeatMeetingPage(world.page);
  }
  world.eventPage = world.repeatMeetingPage;
  return world.repeatMeetingPage;
}

When('I create a backdated offline meeting with location and participants', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).fillBackdatedOfflineMeetingForm();
  await getRepeatMeetingPage(this).submitCreateMeetingForm();
});

When('I open the Past events tab', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).openEventsScheduleTab('past');
});

When('I open the Upcoming events tab', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).openEventsScheduleTab('upcoming');
});

Then('I should see the created backdated meeting in the Past tab', { timeout: 120000 }, async function () {
  const page = getRepeatMeetingPage(this);
  await page.verifyMeetingVisibleInScheduleTab(page.meetingData.title, 'past');
});

When('I open repeat for the created meeting from the three dots menu', { timeout: 180000 }, async function () {
  await getRepeatMeetingPage(this).openRepeatForCreatedMeeting();
});

Then('the Edit Meeting page should open with the original meeting details prefilled', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).expectEditMeetingPageWithPrefilledDetails();
});

When('I schedule the repeated meeting with a future date and updated times', { timeout: 180000 }, async function () {
  await getRepeatMeetingPage(this).scheduleRepeatedMeetingWithFutureDateAndUpdatedTimes();
});

When('I save the repeated meeting from the Edit Meeting page', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).submitSaveMeetingForm();
});

Then('I should see the repeated meeting saved successfully', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).verifyRepeatedMeetingSavedSuccessfully();
});

When('I navigate back to Lead Events', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).navigateBackToLeadEvents();
});

Then('I should see the repeated meeting in the Upcoming tab with the updated schedule', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).verifyRepeatedMeetingInUpcomingTabWithUpdatedSchedule();
});

Then('I should see the original backdated meeting unchanged in the Past tab', { timeout: 120000 }, async function () {
  await getRepeatMeetingPage(this).verifyOriginalBackdatedMeetingUnchangedInPastTab();
});
