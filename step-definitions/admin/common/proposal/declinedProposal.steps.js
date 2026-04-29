const { Given, When, Then } = require('@cucumber/cucumber');
const DeclinedProposalPage = require('../../../../pages/admin/common/proposal/DeclinedProposalPage');

function getDeclinedProposalPage(world) {
  if (!world.declinedProposalPage) {
    world.declinedProposalPage = new DeclinedProposalPage(world.page);
  }
  return world.declinedProposalPage;
}

Given('I want to decline a proposal and create a client with Yopmail', { timeout: 300000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.createClientWithYopmail();
});

When('I open the proposal section for the new client', { timeout: 180000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.openProposalForCreatedClient();
});

When('I pick the default proposal template', { timeout: 180000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.chooseDefaultProposalTemplate();
});

When('I dispatch the proposal via email', { timeout: 300000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.sendProposalViaEmail();
});

When('I access Yopmail to view the sent proposal', { timeout: 180000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.openYopmailForProposal();
});

When('I await the proposal email and preview it', { timeout: 300000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.waitForProposalMailAndOpenPreview();
});

When('I decline the proposal choosing a reason', { timeout: 180000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.declineProposal();
});

Then('the proposal should be marked as declined in the CRM', { timeout: 180000 }, async function () {
  const declinedProposalPage = getDeclinedProposalPage(this);
  await declinedProposalPage.verifyProposalDeclinedStatusInApp();
});
