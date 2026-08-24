const { When, Then } = require('@cucumber/cucumber');
const EditMeetingPage = require('../../../../../pages/admin/crm/lead-profile/event/EditMeetingPage');

function getEditMeetingPage(world) {
  if (!world.editMeetingPage) {
    world.editMeetingPage = new EditMeetingPage(world.page);
  }
  return world.editMeetingPage;
}

When('I create a meeting ready for editing', { timeout: 300000 }, async function () {
  await getEditMeetingPage(this).createMeetingForEditing();
});

When('I open edit for the created meeting from the three dots menu', { timeout: 120000 }, async function () {
  await getEditMeetingPage(this).openEditForCreatedMeeting();
});

When('I edit the meeting title and agenda', { timeout: 120000 }, async function () {
  await getEditMeetingPage(this).editMeetingTitleAndAgenda();
});

When('I save the meeting update', { timeout: 120000 }, async function () {
  await getEditMeetingPage(this).submitMeetingUpdate();
});

Then('I should see the meeting updated successfully', { timeout: 120000 }, async function () {
  await getEditMeetingPage(this).verifyMeetingUpdatedSuccessfully();
});

Then('I should see the updated meeting in the offline events tab', { timeout: 120000 }, async function () {
  const page = getEditMeetingPage(this);
  const editedTitle = page.editedMeetingData?.title;
  await page.verifyMeetingVisibleByTitle(editedTitle, 'offline');
});
