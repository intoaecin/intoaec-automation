const { When, Then } = require('@cucumber/cucumber');
const CommentByLeadPage = require('../../../../pages/admin/crm/proposal/CommentByLeadPage');
const { getProposalFlowPage } = require('./proposalFlow.steps');

When('I add suggestions and save comments in the proposal', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this, CommentByLeadPage).addCommentsToProposal();
});

Then('the proposal should be marked as lead commented in the CRM', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this, CommentByLeadPage).verifyLeadCommentedStatus();
});
