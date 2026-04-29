const { Given, When, Then } = require('@cucumber/cucumber');
const CommentByAecPage = require('../../../../pages/admin/common/proposal/CommentByAecPage');

let aecCommentPage;

Given('I orchestrate a proposal layout for an existing client', async function () {
  aecCommentPage = new CommentByAecPage(this.page);
  await aecCommentPage.createClientWithYopmail();
});

When('I navigate to the proposal table area', async function () {
  await aecCommentPage.openProposalForCreatedClient();
});

When('I execute the default proposal template', async function () {
  await aecCommentPage.chooseDefaultProposalTemplate();
});

When('I post the proposal via email', async function () {
  await aecCommentPage.sendProposalViaEmail();
});

When('I switch to Yopmail to view the sent proposal', async function () {
  await aecCommentPage.openYopmailForProposal();
});

When('I load the proposal mail and open the preview', async function () {
  await aecCommentPage.waitForProposalMailAndOpenPreview();
});

When('I append suggestions and save comments in the proposal', async function () {
  await aecCommentPage.addCommentsToProposal();
});

Then('the proposal should be confirmed as lead commented in the CRM', async function () {
  await aecCommentPage.verifyLeadCommentedStatus();
});

When('I trigger the proposal preview viewer in the CRM', async function () {
  await aecCommentPage.openCRMProposalPreviewViewer();
});

When('I author an AEC reply to the lead\'s comment and save it', async function () {
  await aecCommentPage.addAECReplyAndSave();
});

When('I fetch the latest Yopmail notification for the reply', async function () {
  await aecCommentPage.checkYopmailForAecReply();
});

Then('the AEC reply text should successfully render in the client view', async function () {
  await aecCommentPage.assertAECReplyVisibleInClient();
});
