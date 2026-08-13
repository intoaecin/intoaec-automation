const { When, Then } = require('@cucumber/cucumber');
const DeleteMeetingPage = require('../../../../../pages/admin/crm/lead-profile/event/DeleteMeetingPage');

function getDeleteMeetingPage(world) {
  if (!world.deleteMeetingPage) {
    world.deleteMeetingPage = new DeleteMeetingPage(world.page);
  }
  return world.deleteMeetingPage;
}

When('I create a meeting ready for deletion', { timeout: 300000 }, async function () {
  await getDeleteMeetingPage(this).createMeetingForDeletion();
});

When('I open delete from the three dots menu for the created meeting', { timeout: 120000 }, async function () {
  await getDeleteMeetingPage(this).openDeleteFromMeetingActionMenu();
});

When('I confirm meeting deletion from the popup', { timeout: 120000 }, async function () {
  await getDeleteMeetingPage(this).confirmMeetingDeletion();
});

When('I cancel meeting deletion from the popup', { timeout: 120000 }, async function () {
  await getDeleteMeetingPage(this).cancelMeetingDeletion();
});

Then('I should see the meeting deleted successfully', { timeout: 120000 }, async function () {
  await getDeleteMeetingPage(this).verifyMeetingDeletedSuccessfully();
});

Then('I should see the meeting delete confirmation popup', { timeout: 120000 }, async function () {
  await getDeleteMeetingPage(this).expectDeleteConfirmationPopupVisible();
});

Then('I should see the meeting still present in the offline events tab', { timeout: 120000 }, async function () {
  await getDeleteMeetingPage(this).verifyMeetingStillPresentInEventsTab();
});
