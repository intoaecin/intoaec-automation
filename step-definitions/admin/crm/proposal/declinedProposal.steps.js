const { When, Then } = require('@cucumber/cucumber');
const DeclinedProposalPage = require('../../../../pages/admin/crm/proposal/DeclinedProposalPage');
const { getProposalFlowPage } = require('./proposalFlow.steps');

When('I decline the proposal choosing a reason', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this, DeclinedProposalPage).declineProposal();
});

Then('the proposal should be marked as declined in the CRM', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this, DeclinedProposalPage).verifyProposalDeclinedStatusInApp();
});
