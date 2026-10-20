const { When, Then } = require('@cucumber/cucumber');
const MeetingValidationPage = require('../../../../../pages/admin/crm/lead-profile/event/MeetingValidationPage');

function getMeetingValidationPage(world) {
  if (!world.meetingValidationPage) {
    world.meetingValidationPage = new MeetingValidationPage(world.page);
  }
  return world.meetingValidationPage;
}

When('I open the Create Meeting popup for validation', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).openCreateMeetingPopupForValidation();
});

When(
  'I leave the Create Meeting title empty and fill other mandatory fields',
  { timeout: 120000 },
  async function () {
    await getMeetingValidationPage(this).fillOnlineMandatoryFieldsExceptTitle();
  }
);

When('I fill Create Meeting mandatory fields except Participants', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).fillMandatoryFieldsExceptParticipants();
});

When('I fill Create Meeting mandatory fields with invalid schedule times', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).fillMandatoryFieldsWithInvalidSchedule();
});

When('I attempt to submit the Create Meeting form expecting validation', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).attemptSubmitCreateMeetingExpectingValidation();
});

Then('I should see Create Meeting title mandatory validation', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).expectTitleMandatoryValidation();
});

Then('I should see Create Meeting participants mandatory validation', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).expectParticipantsMandatoryValidation();
});

Then('I should see Create Meeting invalid schedule validation', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).expectInvalidScheduleValidation();
});

Then('the meeting should not be created', { timeout: 120000 }, async function () {
  await getMeetingValidationPage(this).expectMeetingNotCreated();
});
