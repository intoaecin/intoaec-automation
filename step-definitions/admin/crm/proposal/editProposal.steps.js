const { When, Then } = require('@cucumber/cucumber');
const EditProposalPage = require('../../../../pages/admin/common/proposal/EditProposalPage');
const { getProposalFlowPage } = require('./proposalFlow.steps');

When('I click the edit proposal icon button', { timeout: 120000 }, async function () {
  await getProposalFlowPage(this, EditProposalPage).clickEditProposal();
});

When('I iterate through the proposal builder and click skip for now', { timeout: 120000 }, async function () {
  await getProposalFlowPage(this, EditProposalPage).stepThroughEditBuilderAndSkip();
});

When('I broadcast the revised proposal via email', { timeout: 300000 }, async function () {
  await getProposalFlowPage(this, EditProposalPage).sendProposalViaEmail();
});

Then('the revision number should be updated in the CRM', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this, EditProposalPage).verifyRevisionUpdated();
});
