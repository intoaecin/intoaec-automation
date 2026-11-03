const { When, Then, After } = require('@cucumber/cucumber');
const QuestionnairePage = require('../../../../pages/admin/crm/questionnaire/QuestionnairePage');
const CRMResponsePage = require('../../../../pages/admin/crm/questionnaire/CRMResponsePage');
const ExternalQuestionnairePage = require('../../../../pages/admin/crm/questionnaire/ExternalQuestionnairePage');

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

async function getExternalQuestionnairePage(world) {
  const cached = world.externalQuestionnairePage;
  if (!cached || cached.page.isClosed() || cached.page.context() !== world.page.context()) {
    world.externalQuestionnairePage = new ExternalQuestionnairePage(await world.page.context().newPage());
  }
  return world.externalQuestionnairePage;
}

// The mailbox tab lives in the shared browser context; left open it stalls later scenarios' lead profile reloads.
After(async function () {
  const mailboxPage = this.externalQuestionnairePage?.page;
  if (mailboxPage && !mailboxPage.isClosed()) {
    await mailboxPage.close().catch(() => {});
  }
  this.externalQuestionnairePage = null;
  if (this.page && !this.page.isClosed()) {
    await this.page.bringToFront().catch(() => {});
  }
});

function sentQuestionnaireName(world) {
  const questionnairePage = getQuestionnairePage(world);
  return questionnairePage.selectedQuestionnaireName || questionnairePage.resolveQuestionnaireName();
}

Then('the sent questionnaire should be recorded in the Sent via email list', { timeout: 180000 }, async function () {
  await getCrmResponsePage(this).recordLatestSentQuestionnaire(sentQuestionnaireName(this));
});

When('I open the questionnaire link from the lead mailbox', { timeout: 600000 }, async function () {
  const { questionnaireId } = getCrmResponsePage(this).requireLatestSentQuestionnaire();
  const externalPage = await getExternalQuestionnairePage(this);
  await externalPage.openQuestionnaireLinkFromMailbox(getQuestionnairePage(this).leadEmail, questionnaireId);
});

When('I answer all mandatory questions as the client', { timeout: 180000 }, async function () {
  await (await getExternalQuestionnairePage(this)).answerAllMandatoryQuestions();
});

When('I submit the client questionnaire', { timeout: 120000 }, async function () {
  await (await getExternalQuestionnairePage(this)).submitClientQuestionnaire();
});

Then('the client should see the questionnaire submitted page', { timeout: 120000 }, async function () {
  await (await getExternalQuestionnairePage(this)).expectSubmittedPage();
});

When('I open the questionnaire link again', { timeout: 120000 }, async function () {
  await (await getExternalQuestionnairePage(this)).reopenQuestionnaireLink();
});

When('I reload the lead Sent via email list', { timeout: 180000 }, async function () {
  await getCrmResponsePage(this).reloadSentViaEmailList(sentQuestionnaireName(this));
});

Then('the sent questionnaire card should show {string}', { timeout: 120000 }, async function (status) {
  await getCrmResponsePage(this).expectLatestCardStatus(status, sentQuestionnaireName(this));
});

When('I open View Response for the sent questionnaire', { timeout: 120000 }, async function () {
  await getCrmResponsePage(this).openViewResponseOnLatestCard();
});

Then('the response should show the submitted answers', { timeout: 120000 }, async function () {
  const { submittedTextAnswers } = await getExternalQuestionnairePage(this);
  await getCrmResponsePage(this).expectResponseShowsAnswers(submittedTextAnswers);
});
