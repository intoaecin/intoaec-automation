const { When, Then } = require('@cucumber/cucumber');
const DeleteNotePage = require('../../../../pages/admin/common/Note/DeleteNotePage');

function getDeleteNotePage(world) {
  if (!world.deleteNotePage) {
    world.deleteNotePage = new DeleteNotePage(world.page);
  }
  return world.deleteNotePage;
}

When('I create a note ready for deletion', { timeout: 300000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.createNoteForDeletion();
});

When('I open delete from the three dots menu for the created note', { timeout: 120000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.openDeleteFromRowActionMenu();
});

When('I confirm note deletion from the popup', { timeout: 120000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.confirmNoteDeletion();
});

Then('I should see the note deleted successfully', { timeout: 120000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.verifyNoteDeletedSuccessfully();
});

Then('I should see the note delete confirmation popup', { timeout: 120000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.expectDeleteConfirmationPopupVisible();
});

When('I cancel note deletion from the popup', { timeout: 120000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.cancelNoteDeletion();
});

Then('I should see the note still present in the list', { timeout: 120000 }, async function () {
  const deleteNotePage = getDeleteNotePage(this);
  await deleteNotePage.verifyNoteStillPresentInList();
});
