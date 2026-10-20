const { When, Then } = require('@cucumber/cucumber');
const CommentByAecPage = require('../../../../pages/admin/crm/proposal/CommentByAecPage');
const { getProposalFlowPage } = require('./proposalFlow.steps');

When('I trigger the proposal preview viewer in the CRM', { timeout: 120000 }, async function () {
  await getProposalFlowPage(this, CommentByAecPage).openCRMProposalPreviewViewer();
});

When('I author an AEC reply to the lead\'s comment and save it', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this, CommentByAecPage).addAECReplyAndSave();
});

When('I fetch the latest Yopmail notification for the reply', { timeout: 600000 }, async function () {
  await getProposalFlowPage(this, CommentByAecPage).checkYopmailForAecReply();
});

Then('the AEC reply text should successfully render in the client view', { timeout: 120000 }, async function () {
  await getProposalFlowPage(this, CommentByAecPage).assertAECReplyVisibleInClient();
});
