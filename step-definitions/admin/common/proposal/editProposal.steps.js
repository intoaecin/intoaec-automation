const { Given, When, Then } = require('@cucumber/cucumber');
const EditProposalPage = require('../../../../pages/admin/common/proposal/EditProposalPage');

let editProposalPage;

Given('I orchestrate a proposal layout for an existing client for edit operation', async function () {
  editProposalPage = new EditProposalPage(this.page);
  await editProposalPage.createClientWithYopmail();
});

When('I maneuver to the proposal table area specifically for editing', async function () {
  await editProposalPage.openProposalForCreatedClient();
});

When('I initialize the default proposal template for edit scenario', async function () {
  await editProposalPage.chooseDefaultProposalTemplate();
});

When('I broadcast the proposal via email for edit module', async function () {
  await editProposalPage.sendProposalViaEmail();
});

When('I click the edit proposal icon button', async function () {
  await editProposalPage.clickEditProposal();
});

When('I iterate through the proposal builder and click skip for now', async function () {
  await editProposalPage.stepThroughEditBuilderAndSkip();
});

When('I broadcast the revised proposal via email', async function () {
  await editProposalPage.sendProposalViaEmail();
});

Then('the revision number should be updated in the CRM', async function () {
  await editProposalPage.verifyRevisionUpdated();
});
