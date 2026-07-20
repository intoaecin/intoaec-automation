const { When, Then } = require('@cucumber/cucumber');
const QuestionnairePage = require('../../../../pages/admin/crm/questionnaire/QuestionnairePage');

function getQuestionnairePage(world) {
  if (!world.questionnairePage) {
    world.questionnairePage = new QuestionnairePage(world.page);
  }
  return world.questionnairePage;
}

When('I open the lead Questionnaire tab', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.openQuestionnaireTab();
});

When('I choose a questionnaire template and confirm', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.chooseQuestionnaireAndConfirm();
});

Then('I should see the questionnaire send preference page', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.expectSendPreferencePageVisible();
});

When('I send the questionnaire via email', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.sendQuestionnaireViaEmail();
});

Then('I should see questionnaire sent successfully', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.expectQuestionnaireSentSuccessfully();
});

When('I open the sent via tab', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.openSentViaTab();
});

When('I open the sent via email dropdown', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.openSentViaTab();
});

Then('I should see the sent questionnaire in the list', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.expectSentQuestionnaireVisibleInList();
});

When('I expand the sent questionnaire details', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.expandSentQuestionnaireDetails();
});

Then('I should see the questionnaire email details', { timeout: 120000 }, async function () {
  const questionnairePage = getQuestionnairePage(this);
  await questionnairePage.expectQuestionnaireEmailDetailsVisible();
});
