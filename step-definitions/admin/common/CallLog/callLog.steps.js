const { When, Then } = require('@cucumber/cucumber');
const CallLogPage = require('../../../../pages/admin/common/CallLog/CallLogPage');

function getCallLogPage(world) {
  if (!world.callLogPage) {
    world.callLogPage = new CallLogPage(world.page);
  }
  return world.callLogPage;
}

When('I navigate to the project Call Log form', { timeout: 120000 }, async function () {
  const callLogPage = getCallLogPage(this);
  await callLogPage.navigateToCallLogForm();
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
