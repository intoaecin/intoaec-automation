const { When, Then } = require('@cucumber/cucumber');
const ProposalPage = require('../../../pages/admin/common/ProposalPage');

When('I send a proposal for the selected project', { timeout: 240000 }, async function () {
  const proposalPage = new ProposalPage(this.page);
  await proposalPage.sendProposalForSelectedProject();
});

Then('the proposal send flow should complete successfully', async function () {
  // Success is validated inside the page object with the final confirmation toast.
});
