const { When, Then } = require('@cucumber/cucumber');
const DeleteCallLogPage = require('../../../../pages/admin/common/CallLog/DeleteCallLogPage');

function getDeleteCallLogPage(world) {
  if (!world.deleteCallLogPage) {
    world.deleteCallLogPage = new DeleteCallLogPage(world.page);
  }
  return world.deleteCallLogPage;
}

When('I create a call log ready for deletion', { timeout: 300000 }, async function () {
  const deleteCallLogPage = getDeleteCallLogPage(this);
  await deleteCallLogPage.createCallLogForDeletion();
});

When('I open delete from the three dots menu for the created call log', { timeout: 120000 }, async function () {
  const deleteCallLogPage = getDeleteCallLogPage(this);
  await deleteCallLogPage.openDeleteFromRowActionMenu();
});

When('I confirm call log deletion from the popup', { timeout: 120000 }, async function () {
  const deleteCallLogPage = getDeleteCallLogPage(this);
  await deleteCallLogPage.confirmCallLogDeletion();
});

Then('I should see the call log deleted successfully', { timeout: 120000 }, async function () {
  const deleteCallLogPage = getDeleteCallLogPage(this);
  await deleteCallLogPage.verifyCallLogDeletedSuccessfully();
});
