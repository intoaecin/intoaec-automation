const { When, Then } = require('@cucumber/cucumber');
const LeadPage = require('../../../../pages/admin/crm/lead-profile/LeadPage');

function getLeadPage(world) {
  if (!world.leadPage || world.leadPage.page !== world.page) {
    world.leadPage = new LeadPage(world.page);
  }
  return world.leadPage;
}

When('I open the Create Lead form from Lead Manager', { timeout: 120000 }, async function () {
  await getLeadPage(this).openCreateLeadForm();
});

When('I enter a generated lead name', { timeout: 120000 }, async function () {
  await getLeadPage(this).enterLeadName();
});

When('I leave the lead name empty', { timeout: 120000 }, async function () {
  await getLeadPage(this).leaveLeadNameEmpty();
});

When('I go through the Lead and Project steps', { timeout: 120000 }, async function () {
  await getLeadPage(this).goThroughLeadAndProjectSteps();
});

When('I submit the Create Lead form', { timeout: 120000 }, async function () {
  await getLeadPage(this).submitCreateLead();
});

Then('I should see the lead added successfully toast', { timeout: 120000 }, async function () {
  await getLeadPage(this).expectLeadAddedToast();
});

Then('I should be returned to the Lead Manager list', { timeout: 120000 }, async function () {
  await getLeadPage(this).expectReturnedToLeadList();
});

Then('I should see the new lead in the Lead Manager list', { timeout: 120000 }, async function () {
  await getLeadPage(this).expectLeadInList();
});

Then('the Create Lead Next button should stay disabled', { timeout: 120000 }, async function () {
  await getLeadPage(this).expectNextDisabled();
});

Then('no lead should be created', { timeout: 120000 }, async function () {
  await getLeadPage(this).expectNoLeadCreated();
});
