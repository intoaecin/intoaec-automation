const { When, Then } = require('@cucumber/cucumber');
const AnswerQuestionnairePage = require('../../../../pages/admin/crm/questionnaire/AnswerQuestionnairePage');

function getAnswerQuestionnairePage(world) {
  if (!world.answerQuestionnairePage) {
    world.answerQuestionnairePage = new AnswerQuestionnairePage(world.page);
  }
  return world.answerQuestionnairePage;
}

When('I open the lead Questionnaire module to answer by own', { timeout: 180000 }, async function () {
  await getAnswerQuestionnairePage(this).openQuestionnaireModuleToAnswerByOwn();
});

When('I select a questionnaire template to answer by own', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).selectQuestionnaireTemplateToAnswerByOwn();
});

When('I click answer by own questionnaire', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).clickAnswerByOwnQuestionnaire();
});

When('I fill all mandatory questionnaire questions', { timeout: 180000 }, async function () {
  await getAnswerQuestionnairePage(this).fillAllMandatoryQuestionnaireQuestions();
});

When('I submit the answered questionnaire', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).submitAnsweredQuestionnaire();
});

When('I open the answer by own tab', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).openAnswerByOwnTab();
});

Then('I should see the questionnaire submitted successfully', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).expectQuestionnaireSubmittedSuccessfully();
});

Then('I should see the questionnaire answer success message if displayed', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).expectQuestionnaireAnswerSuccessMessageIfDisplayed();
});

Then('I should see the submitted questionnaire in the answer by own tab', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).expectSubmittedQuestionnaireInAnswerByOwnTab();
});

Then('I should see the submitted questionnaire title and details displayed correctly', { timeout: 120000 }, async function () {
  await getAnswerQuestionnairePage(this).expectSubmittedQuestionnaireTitleAndDetailsDisplayed();
});
