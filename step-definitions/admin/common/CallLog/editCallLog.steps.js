const { When, Then } = require('@cucumber/cucumber');
const EditCallLogPage = require('../../../../pages/admin/common/CallLog/EditCallLogPage');

function getEditCallLogPage(world) {
  if (!world.editCallLogPage) {
    world.editCallLogPage = new EditCallLogPage(world.page);
  }
  return world.editCallLogPage;
}

When('I create a call log ready for editing', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.createCallLogForEditing();
});

When('I open edit from the row action menu for the created call log', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.openEditForCreatedCallLog();
});

When('I edit the call log mandatory fields', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.editCallLogMandatoryFields();
});

When('I submit the call log update form', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.submitCallLogUpdate();
});

Then('I should see the call log updated successfully', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.verifyCallLogUpdatedSuccessfully();
});
