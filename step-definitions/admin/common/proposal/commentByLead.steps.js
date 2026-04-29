const { Given, When, Then } = require('@cucumber/cucumber');
const CommentByLeadPage = require('../../../../pages/admin/common/proposal/CommentByLeadPage');

let commentPage;

Given('I want to comment on a proposal and access an existing client', async function () {
  commentPage = new CommentByLeadPage(this.page);
  // Uses existing implementation to grab existing client identically to other tests
  await commentPage.createClientWithYopmail();
});

When('I access the proposal area for the target client', async function () {
  await commentPage.openProposalForCreatedClient();
});

When('I initiate the default proposal template', async function () {
  await commentPage.chooseDefaultProposalTemplate();
});

When('I transmit the proposal via email', async function () {
  await commentPage.sendProposalViaEmail();
});

When('I navigate to Yopmail to view the sent proposal', async function () {
  await commentPage.openYopmailForProposal();
});

When('I wait for the proposal mail and open the preview', async function () {
  await commentPage.waitForProposalMailAndOpenPreview();
});

When('I add suggestions and save comments in the proposal', async function () {
  await commentPage.addCommentsToProposal();
});

Then('the proposal should be marked as lead commented in the CRM', async function () {
  await commentPage.verifyLeadCommentedStatus();
});
