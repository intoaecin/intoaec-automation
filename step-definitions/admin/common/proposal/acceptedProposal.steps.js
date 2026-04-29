const { Given, When, Then } = require('@cucumber/cucumber');
const AcceptedProposalPage = require('../../../../pages/admin/common/proposal/AcceptedProposalPage');

function getAcceptedProposalPage(world) {
  if (!world.acceptedProposalPage) {
    world.acceptedProposalPage = new AcceptedProposalPage(world.page);
  }
  return world.acceptedProposalPage;
}

Given('I create a client with a fresh Yopmail email', { timeout: 300000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.createClientWithYopmail();
});

When('I open proposal for the created client', { timeout: 180000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.openProposalForCreatedClient();
});

When('I choose the default proposal template for the created client', { timeout: 180000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.chooseDefaultProposalTemplate();
});

When('I send the proposal to the created client via email', { timeout: 300000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.sendProposalViaEmail();
});

When('I open Yopmail for the created client', { timeout: 180000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.openYopmailForProposal();
});

When('I wait for the proposal email and open the proposal preview', { timeout: 300000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.waitForProposalMailAndOpenPreview();
});

When('I accept the proposal with a digital signature', { timeout: 180000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.acceptProposalWithDigitalSignature();
});

Then('the proposal status should be updated to accepted in the app', { timeout: 180000 }, async function () {
  const acceptedProposalPage = getAcceptedProposalPage(this);
  await acceptedProposalPage.verifyProposalAcceptedStatusInApp();
});
