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

When('I refresh the Call Log page', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.refreshCallLogPage();
});

Then('I should see the edited call log persisted after refresh', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.verifyEditedCallLogPersistsAfterRefresh();
});

When('I clear the call log mandatory fields and attempt to save', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.clearMandatoryEditFieldsAndAttemptSave();
});

Then('I should see call log edit mandatory validation', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.expectCallLogEditMandatoryValidation();
});

Then('the call log should not be updated', { timeout: 120000 }, async function () {
  const editCallLogPage = getEditCallLogPage(this);
  await editCallLogPage.expectCallLogNotUpdated();
});
