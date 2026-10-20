const { When, Then } = require('@cucumber/cucumber');
const CallLogPage = require('../../../../pages/admin/common/CallLog/CallLogPage');

function getCallLogPage(world) {
  if (!world.callLogPage) {
    world.callLogPage = new CallLogPage(world.page);
  }
  return world.callLogPage;
}

When('I navigate to the lead Call Log form', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.navigateToCallLogForm();
});

When('I open the Call Log module', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.openCallLogModule();
});

When('I click Add Call Log', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.clickAddCallLog();
});

When('I fill the call log mandatory fields', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.fillMandatoryCallLogFields();
});

When('I submit the call log create form', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.submitCreateCallLog();
});

Then('I should see the call log created successfully', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.verifyCallLogCreatedSuccessfully();
});

When('I click the Call Log close icon', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.clickCallLogCloseIcon();
});

Then('the Call Log popup should be closed', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.expectCallLogPopupClosed();
});

Then('the entered call log should not be present in the list', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.expectEnteredCallLogNotInList();
});
