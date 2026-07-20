const { When, Then } = require('@cucumber/cucumber');
const ClientReportPage = require('../../../../../pages/admin/projects/communication/client-report/client-report.page');

function getClientReportPage(world) {
  if (!world.clientReportPage) {
    world.clientReportPage = new ClientReportPage(world.page);
  }
  return world.clientReportPage;
}

When('I navigate to the client report module', { timeout: 180000 }, async function () {
  await getClientReportPage(this).navigateToClientReportModule();
});

When('I complete the client report create flow with three create clicks', { timeout: 180000 }, async function () {
  await getClientReportPage(this).completeClientReportCreateWithThreeCreateClicks();
});

When('I open the client report create page', { timeout: 180000 }, async function () {
  await getClientReportPage(this).openClientReportCreatePage();
});

When('I edit client report notes with random text from the notes edit popup', { timeout: 180000 }, async function () {
  await getClientReportPage(this).editClientReportNotesWithRandomText();
});

When('I replace the client report title with a random site process update title', { timeout: 120000 }, async function () {
  await getClientReportPage(this).replaceReportTitleWithRandomSiteProcessUpdate();
});

When('I click Create on the client report create page', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickCreateOnClientReportCreatePage();
});

When(
  'I complete the client report create journey with notes edit and random title',
  { timeout: 360000 },
  async function () {
    await getClientReportPage(this).completeClientReportCreateWithNotesAndTitleJourney();
  }
);

Then('I should see the client report created successfully', { timeout: 120000 }, async function () {
  await getClientReportPage(this).expectClientReportCreatedSuccessfully();
});
