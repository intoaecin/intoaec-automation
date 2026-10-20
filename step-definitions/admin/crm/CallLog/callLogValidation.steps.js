const { When, Then } = require('@cucumber/cucumber');
const CallLogValidationPage = require('../../../../pages/admin/common/CallLog/CallLogValidationPage');

function getCallLogValidationPage(world) {
  if (!world.callLogValidationPage) {
    world.callLogValidationPage = new CallLogValidationPage(world.page);
  }
  return world.callLogValidationPage;
}

When('I leave the call purpose empty and fill other call log mandatory fields', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).leaveCallPurposeEmptyAndFillOtherFields();
});

When('I leave the call outcome empty and fill other call log mandatory fields', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).leaveCallOutcomeEmptyAndFillOtherFields();
});

When('I leave the call log comments empty and fill other call log mandatory fields', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).leaveCommentsEmptyAndFillOtherFields();
});

When('I fill the call purpose exceeding the maximum character limit', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).fillCallPurposeExceedingMaxLength();
});

When('I fill the call log comments exceeding the maximum character limit', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).fillCommentsExceedingMaxLength();
});

When('I fill special characters in the call purpose', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).fillSpecialCharactersInCallPurpose();
});

When('I open the call outcome dropdown', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).openCallOutcomeDropdown();
});

When('I attempt to submit the call log create form', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).attemptSubmitCallLogExpectingValidation();
});

Then('I should see call purpose mandatory validation', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectCallPurposeMandatoryValidation();
});

Then('I should see call outcome mandatory validation', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectCallOutcomeMandatoryValidation();
});

Then('I should see call log comments mandatory validation', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectCommentsMandatoryValidation();
});

Then('the call log should not be created', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectCallLogNotCreated();
});

Then('I should see call purpose maximum character validation', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectCallPurposeMaxLengthValidation();
});

Then('I should see call log comments maximum character validation', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectCommentsMaxLengthValidation();
});

Then('I should see call purpose special character input handled correctly', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectSpecialCharacterInputHandled();
});

Then('I should see all expected call outcome options', { timeout: 120000 }, async function () {
  await getCallLogValidationPage(this).expectAllCallOutcomeOptions();
});
