const { When, Then } = require('@cucumber/cucumber');
const PreviewQuestionnairePage = require('../../../../pages/admin/crm/questionnaire/PreviewQuestionnairePage');

function getPreviewQuestionnairePage(world) {
  if (!world.previewQuestionnairePage) {
    world.previewQuestionnairePage = new PreviewQuestionnairePage(world.page);
  }
  return world.previewQuestionnairePage;
}

When('I open the lead Questionnaire module for preview', { timeout: 180000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.openQuestionnaireModuleForPreview();
});

When('I select a questionnaire template for preview', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.selectQuestionnaireTemplateForPreview();
});

When('I click preview questionnaire', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.clickPreviewQuestionnaire();
});

Then('I should see the questionnaire preview opened successfully', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.expectQuestionnairePreviewOpened();
});

Then('I should see the questionnaire preview title displayed', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.expectQuestionnairePreviewTitleDisplayed();
});

Then('I should see all questionnaire preview questions visible', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.expectAllPreviewQuestionsVisible();
});

When('I navigate to the last questionnaire preview page', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.navigateToLastPreviewPage();
});

Then('I should see the disabled questionnaire preview submit button', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.expectPreviewSubmitButtonDisabled();
});

Then('I should see the questionnaire preview close button displayed', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.expectPreviewCloseButtonDisplayed();
});

When('I close the questionnaire preview', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.closeQuestionnairePreview();
});

Then('I should see the questionnaire preview closed successfully', { timeout: 120000 }, async function () {
  const previewPage = getPreviewQuestionnairePage(this);
  await previewPage.expectQuestionnairePreviewClosed();
});
