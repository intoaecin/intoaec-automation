/**
 * Shared proposal email flow: open the first lead (CRM → Lead Manager → first lead, same entry as Questionnaire),
 * choose the default template, send by email and read the proposal mail in Yopmail.
 * The flow page chosen in the first step is cached on the world for the scenario-specific steps.
 */
const { Given, When, After } = require('@cucumber/cucumber');
const AcceptedProposalPage = require('../../../../pages/admin/common/proposal/AcceptedProposalPage');
const DeclinedProposalPage = require('../../../../pages/admin/common/proposal/DeclinedProposalPage');
const CommentByLeadPage = require('../../../../pages/admin/common/proposal/CommentByLeadPage');
const CommentByAecPage = require('../../../../pages/admin/common/proposal/CommentByAecPage');
const EditProposalPage = require('../../../../pages/admin/common/proposal/EditProposalPage');

const PROPOSAL_FLOWS = {
  send: { worldKey: 'proposalSendFlowPage', PageClass: AcceptedProposalPage },
  accepted: { worldKey: 'acceptedProposalPage', PageClass: AcceptedProposalPage },
  declined: { worldKey: 'declinedProposalPage', PageClass: DeclinedProposalPage },
  'lead comment': { worldKey: 'commentByLeadPage', PageClass: CommentByLeadPage },
  'AEC reply': { worldKey: 'commentByAecPage', PageClass: CommentByAecPage },
  revision: { worldKey: 'editProposalPage', PageClass: EditProposalPage },
};

function startProposalFlow(world, flowName) {
  const flow = PROPOSAL_FLOWS[flowName];
  if (!flow) {
    throw new Error(`Unknown proposal flow "${flowName}". Use one of: ${Object.keys(PROPOSAL_FLOWS).join(', ')}.`);
  }
  if (!world[flow.worldKey] || world[flow.worldKey].page !== world.page) {
    world[flow.worldKey] = new flow.PageClass(world.page);
  }
  world.proposalFlowPage = world[flow.worldKey];
  return world.proposalFlowPage;
}

/** Returns the flow page started by "I open the first lead for the ... proposal flow". */
function getProposalFlowPage(world, PageClass = AcceptedProposalPage) {
  const flowPage = world.proposalFlowPage;
  if (!flowPage) {
    throw new Error('No proposal flow started. Begin with: I open the first lead for the "<flow>" proposal flow');
  }
  if (!(flowPage instanceof PageClass)) {
    throw new Error(`This step needs a ${PageClass.name} flow, but the scenario started a ${flowPage.constructor.name} flow.`);
  }
  return flowPage;
}

Given('I open the first lead for the {string} proposal flow', { timeout: 300000 }, async function (flowName) {
  await startProposalFlow(this, flowName).createClientWithYopmail();
});

When('I open the Proposal module for the lead', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this).openProposalForCreatedClient();
});

When('I choose the default proposal template for the lead', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this).chooseDefaultProposalTemplate();
});

When('I send the proposal to the lead via email', { timeout: 300000 }, async function () {
  await getProposalFlowPage(this).sendProposalViaEmail();
});

When('I open Yopmail for the lead', { timeout: 180000 }, async function () {
  await getProposalFlowPage(this).openYopmailForProposal();
});

When('I wait for the proposal email and open the proposal preview', { timeout: 600000 }, async function () {
  await getProposalFlowPage(this).waitForProposalMailAndOpenPreview();
});

// Yopmail and client preview tabs share the browser context; left open they stall later scenarios.
After(async function () {
  if (this.proposalFlowPage) {
    await this.proposalFlowPage.closeExternalTabs().catch(() => {});
  }
  if (this.page && !this.page.isClosed()) {
    await this.page.bringToFront().catch(() => {});
  }
});

module.exports = { getProposalFlowPage };
