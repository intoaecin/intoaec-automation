const { When, Then } = require('@cucumber/cucumber');
const AcceptedProposalPage = require('../../../../pages/admin/crm/proposal/AcceptedProposalPage');
const { getProposalFlowPage } = require('./proposalFlow.steps');

function getAcceptedProposalPage(world) {
  // Budgeting opens the proposal through its own mailbox steps and caches this page on the world itself.
  if (!world.proposalFlowPage && world.acceptedProposalPage) {
    return world.acceptedProposalPage;
  }
  return getProposalFlowPage(world, AcceptedProposalPage);
}

When('I accept the proposal with a digital signature', { timeout: 180000 }, async function () {
  await getAcceptedProposalPage(this).acceptProposalWithDigitalSignature();
});

Then('the proposal status should be updated to accepted in the app', { timeout: 180000 }, async function () {
  await getAcceptedProposalPage(this).verifyProposalAcceptedStatusInApp();
});
