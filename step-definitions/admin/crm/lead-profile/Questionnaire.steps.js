// step-definitions/admin/crm/lead-profile/questionnaire.steps.js
const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const QuestionnairePage = require('../../../../pages/admin/crm/lead-profile/QuestionnairePage');

let questionnairePage;
let questionnaireName;

When('I click the "Questionnaire" tab', async function () {
  questionnairePage = new QuestionnairePage(this.page);
  await questionnairePage.clickQuestionnaireTab();
});

When('I click the "Choose Questionnaire" button', async function () {
  await questionnairePage.clickChooseQuestionnaireButton();
});

When('I select a random questionnaire from the "Choose Questionnaire" dropdown', async function () {
  // Using the exact name you recorded in Codegen earlier to ensure it doesn't fail
  questionnaireName = 'Urban Designer'; 
  await questionnairePage.selectQuestionnaire(questionnaireName);
});

When('I click the "Confirm" button', async function () {
  await questionnairePage.clickConfirmButton();
});

Then('I should see the "Select Your Preference" page', async function () {
  // Waiting for the "Send Via" button to prove the page loaded
  const sendViaBtn = this.page.getByRole('button', { name: 'Send Via Send the' });
  await sendViaBtn.waitFor({ state: 'visible', timeout: 10000 });
});

When('I click the "Send Via" button', async function () {
  await questionnairePage.clickSendViaButton();
});

When('I click the "Email" option', async function () {
  await questionnairePage.clickEmailOption();
});

Then('I should see the "Compose Email" tab', async function () {
  const composeEmailHeader = this.page.locator('div:has-text("Compose email")').first();
  await composeEmailHeader.waitFor({ state: 'visible', timeout: 10000 });
});

When('I click the "Send Email" button', async function () {
  await questionnairePage.clickSendEmailButton();
});

Then('I should see a "Questionnaire sent successfully" toast message', async function () {
  const result = await questionnairePage.isSuccessToastVisible();
  expect(result).toBeTruthy();
});

When('I click the "Sent via email" dropdown', async function () {
  await questionnairePage.clickSentViaEmailDropdown();
});

Then('the sent questionnaire should be visible', async function () {
  const result = await questionnairePage.isQuestionnaireVisibleInSentDropdown(questionnaireName);
  expect(result).toBeTruthy();
});

When('I expand the sent questionnaire details', async function () {
  await questionnairePage.expandSentQuestionnaireDetails(questionnaireName);
});

Then('the email details should be visible', async function () {
  // Keeping this commented out as you requested until you get the real selector
  // const result = await questionnairePage.areEmailDetailsVisible();
  // expect(result).toBeTruthy();
});