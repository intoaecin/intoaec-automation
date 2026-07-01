const { When, Then } = require('@cucumber/cucumber');
const EditNotePage = require('../../../../pages/admin/common/Note/EditNotePage');

function getEditNotePage(world) {
  if (!world.editNotePage) {
    world.editNotePage = new EditNotePage(world.page);
  }
  return world.editNotePage;
}

When('I create a note ready for editing', { timeout: 300000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.createNoteForEditing();
});

When('I open edit for the created note from the three dots menu', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.openEditForCreatedNote();
});

When('I edit the note title and paragraph', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.editNoteTitleAndParagraph();
});

When('I save the note update', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.submitNoteUpdate();
});

Then('I should see the note updated successfully', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.verifyNoteUpdatedSuccessfully();
});

When('I refresh the notes page', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.refreshNotesPage();
});

Then('I should see the edited note persisted after refresh', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.verifyEditedNotePersistsAfterRefresh();
});

When('I clear the note title and attempt to save', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.clearNoteTitleAndAttemptSave();
});

When('I clear the note paragraph and attempt to save', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.clearNoteParagraphAndAttemptSave();
});

Then('I should see note validation message', { timeout: 120000 }, async function () {
  const editNotePage = getEditNotePage(this);
  await editNotePage.expectNoteValidationMessageVisible();
});
