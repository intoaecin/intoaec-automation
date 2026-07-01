const { When, Then } = require('@cucumber/cucumber');
const NotePage = require('../../../../pages/admin/common/Note/NotePage');

function getNotePage(world) {
  if (!world.notePage) {
    world.notePage = new NotePage(world.page);
  }
  return world.notePage;
}

When('I navigate to the lead Notes create form', { timeout: 180000 }, async function () {
  const notePage = getNotePage(this);
  await notePage.navigateToNoteForm();
});

When('I fill the note mandatory fields', { timeout: 120000 }, async function () {
  const notePage = getNotePage(this);
  await notePage.fillMandatoryNoteFields();
});

When('I add a note attachment', { timeout: 300000 }, async function () {
  const notePage = getNotePage(this);
  await notePage.addNoteAttachment();
});

When('I submit the note create form', { timeout: 120000 }, async function () {
  const notePage = getNotePage(this);
  await notePage.submitCreateNote();
});

Then('I should see the note created successfully', { timeout: 120000 }, async function () {
  const notePage = getNotePage(this);
  await notePage.verifyNoteCreatedSuccessfully();
});
