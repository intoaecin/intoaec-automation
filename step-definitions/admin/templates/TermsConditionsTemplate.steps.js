const { When, Then } = require('@cucumber/cucumber');
const TermsConditionsTemplatePage = require('../../../pages/admin/templates/TermsConditionsTemplatePage');

function getTermsConditionsTemplatePage(world) {
  if (!world.termsConditionsTemplatePage || world.termsConditionsTemplatePage.page !== world.page) {
    const previous = world.termsConditionsTemplatePage;
    world.termsConditionsTemplatePage = new TermsConditionsTemplatePage(world.page);
    if (previous?.lastCreatedTemplate?.name) {
      world.termsConditionsTemplatePage.lastCreatedTemplate = { ...previous.lastCreatedTemplate };
      world.termsConditionsTemplatePage.lastResultToastMessage = previous.lastResultToastMessage || '';
    }
  }
  return world.termsConditionsTemplatePage;
}

When('I navigate to Templates', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.navigateToTemplates();
});

When('I select Terms and Conditions in Templates', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.selectTermsAndConditions();
});

When('I click Create Template for Terms and Conditions', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.clickCreateTemplate();
});

When('I enter a sample Terms and Conditions template name', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.enterSampleTemplateName();
});

When('I select any available Terms and Conditions category', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.selectAnyCategory();
});

When('I enter the required Terms and Conditions content', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.enterTermsContent();
});

When('I save the Terms and Conditions template', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.saveTemplate();
  this.lastCreatedTermsTemplate = { ...templates.lastCreatedTemplate };
});

Then('the Terms and Conditions template should be created successfully', { timeout: 120000 }, async function () {
  const templates = getTermsConditionsTemplatePage(this);
  await templates.expectTemplateCreated();
});
