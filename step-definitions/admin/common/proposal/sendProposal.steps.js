const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const ProposalPage = require('../../../../pages/admin/common/ProposalPage');
const ProposalBuilderPage = require('../../../../pages/admin/common/proposal/ProposalBuilderPage');
const { EMBEDDED_JPEG_DATA_URL } = require('../../../../pages/admin/common/proposal/proposalEmbeddedTestImage');

function getProposalPage(world) {
  if (!world.proposalPage) {
    world.proposalPage = new ProposalPage(world.page);
  }
  return world.proposalPage;
}

function getBuilderPage(world) {
  if (!world.builderPage) {
    world.builderPage = new ProposalBuilderPage(world.page);
  }
  return world.builderPage;
}

/** Extra stabilization between Cucumber steps (POM already waits per action). */
async function waitBetweenSteps(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
}

When('I open the Proposal tab for the selected project', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.openProposalTab();
  await waitBetweenSteps(this.page);
});

Then('the proposal workspace should be available', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.verifyProposalTabLoaded();
});

Then('the sent proposal section should be visible', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.verifySentProposalSectionLoaded();
});

When('I open the choose proposal modal', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.openChooseProposalModal();
});

When('I choose the default proposal template', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.chooseDefaultProposal();
});

Then('the proposal selection list should be visible', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.verifyProposalSelectionListVisible();
});

Then(
  'the proceed button should remain disabled until a proposal is selected',
  { timeout: 120000 },
  async function () {
    const proposalPage = getProposalPage(this);
    await proposalPage.verifyProceedDisabledBeforeSelection();
  }
);

Then('the proposal category options should be available', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.verifyProposalCategoryOptions();
});

Then('I should land on the proposal editor page', { timeout: 120000 }, async function () {
  await expect(this.page).toHaveURL(/proposal\/edit/);
});

Then('the proposal editor should be ready', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.verifyProposalEditorReady();
  await waitBetweenSteps(this.page);
});

When('I click Next on the proposal editor', { timeout: 240000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.clickNextOnProposalEditor();
  await waitBetweenSteps(this.page);
});

When('I click Skip for now', { timeout: 240000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.clickSkipInTemplateChangeDialog();
  await waitBetweenSteps(this.page);
});

Then('the proposal send preview should be visible', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.assertProposalPreviewInSendFlow();
  await waitBetweenSteps(this.page);
});

When('I click Send', { timeout: 240000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.openSendMenu();
  await waitBetweenSteps(this.page);
});

When('I select Email channel', { timeout: 240000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.selectEmailFromSendMenu();
  await waitBetweenSteps(this.page);
});

When('I send proposal', { timeout: 240000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.confirmComposeSendEmail();
  await waitBetweenSteps(this.page);
});

Then('the proposal send flow should complete successfully', { timeout: 120000 }, async function () {
  const proposalPage = getProposalPage(this);
  await proposalPage.verifyProposalSent();
});

/* --- Editor / palette --- */

When('I add Cover Page', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.waitForBuilderToLoad();
  await builderPage.addCoverPage();
  await waitBetweenSteps(this.page);
});

When('I add Blank Page', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addBlankPage();
  await waitBetweenSteps(this.page);
});

When('I add Text element with sample text {string}', { timeout: 240000 }, async function (text) {
  const builderPage = getBuilderPage(this);
  await builderPage.addTextElement(text);
  await waitBetweenSteps(this.page);
});

When('I add Text element with random sample text', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addTextElementWithRandomSample();
  await waitBetweenSteps(this.page);
});

When('I add Image element with url {string}', { timeout: 240000 }, async function (url) {
  const builderPage = getBuilderPage(this);
  await builderPage.addImageElementByUrl(url);
  await waitBetweenSteps(this.page);
});

When('I add Image element using embedded jpeg test data', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addImageElementByUrl(EMBEDDED_JPEG_DATA_URL);
  await waitBetweenSteps(this.page);
});

When('I add Table element with sample rows', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addTableElementWithSampleRows();
  await waitBetweenSteps(this.page);
});

When('I add Divider element and verify it', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addDividerElementAndVerify();
  await waitBetweenSteps(this.page);
});

When('I add Checkbox element with label {string}', { timeout: 240000 }, async function (labelText) {
  const builderPage = getBuilderPage(this);
  await builderPage.addCheckboxElement(labelText);
  await waitBetweenSteps(this.page);
});

When('I add Checkbox element with random label', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addCheckboxWithRandomLabel();
  await waitBetweenSteps(this.page);
});

When('I add Signature element choosing ADMIN', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addSignatureElementChoosing('ADMIN');
  await waitBetweenSteps(this.page);
});

When('I add Shape element and apply random color', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addShapeElementAndApplyRandomColor();
  await waitBetweenSteps(this.page);
});

When('I add Pricing Table element and fill sample values', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addPricingTableElementAndFillSampleValues();
  await waitBetweenSteps(this.page);
});

When('I add Terms & Conditions element', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addTermsAndConditionsElement();
  await waitBetweenSteps(this.page);
});

When('I add Organization Logo element and verify it', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.addOrganizationLogoElementAndVerify();
  await waitBetweenSteps(this.page);
});

Then('I should have all elements added successfully', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.assertAllElementsAddedSuccessfully();
  await waitBetweenSteps(this.page);
});

Then('no UI errors should be shown', { timeout: 240000 }, async function () {
  const builderPage = getBuilderPage(this);
  await builderPage.assertNoUiErrors();
  await waitBetweenSteps(this.page);
});
