const { When, Then } = require('@cucumber/cucumber');
const QuestionnairePage = require('../../../../pages/admin/crm/questionnaire/QuestionnairePage');
const CRMResponsePage = require('../../../../pages/admin/crm/questionnaire/CRMResponsePage');

function getQuestionnairePage(world) {
  if (!world.questionnairePage) {
    world.questionnairePage = new QuestionnairePage(world.page);
  }
  return world.questionnairePage;
}

function getCrmResponsePage(world) {
  if (!world.crmResponsePage || world.crmResponsePage.page !== world.page) {
    world.crmResponsePage = new CRMResponsePage(world.page);
  }
  return world.crmResponsePage;
}

function getExternalQuestionnairePage(world) {
  if (!world.externalQuestionnairePage) {
    throw new Error('The questionnaire link has not been opened from the mailbox in this scenario.');
  }
  return world.externalQuestionnairePage;
}

When(
  'I send the questionnaire via email with a manual expiry of {int} minute(s)',
  { timeout: 180000 },
  async function (minutes) {
    await getQuestionnairePage(this).sendQuestionnaireViaEmailWithManualExpiry(minutes);
  }
);

Then(
  'the sent questionnaire should be recorded with a manual expiry of {int} minute(s)',
  { timeout: 180000 },
  async function (minutes) {
    const questionnairePage = getQuestionnairePage(this);
    const crmResponsePage = getCrmResponsePage(this);
    const name = questionnairePage.selectedQuestionnaireName || questionnairePage.resolveQuestionnaireName();
    await crmResponsePage.recordLatestSentQuestionnaire(name);
    crmResponsePage.expectManualExpiryWithin(minutes, questionnairePage.manualExpiryAppliedAt);
  }
);

When('I wait for the sent questionnaire link to expire', { timeout: 300000 }, async function () {
  await getCrmResponsePage(this).waitUntilLatestSentQuestionnaireExpires();
});

Then('the questionnaire link should show the link expired page', { timeout: 120000 }, async function () {
  await getExternalQuestionnairePage(this).expectLinkExpiredPage();
});

Then('Resend should be available for the expired questionnaire', { timeout: 120000 }, async function () {
  await getCrmResponsePage(this).expectResendAvailableOnLatestCard();
});
