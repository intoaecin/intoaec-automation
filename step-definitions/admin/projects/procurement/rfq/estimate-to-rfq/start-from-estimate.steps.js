const { When, Then } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../../../../pages/admin/projects/ProjectProfilePage');
const EstimatePage = require('../../../../../../pages/admin/projects/design/estimate/estimate.page');
const RFQPage = require('../../../../../../pages/admin/projects/procurement/rfq/RFQPage');
const StartFromEstimatePage = require('../../../../../../pages/admin/projects/procurement/rfq/estimate-to-rfq/start-from-estimate.page');

function getEstimatePage(world) {
  if (!world.estimatePage) {
    world.estimatePage = new EstimatePage(world.page);
  }
  return world.estimatePage;
}

function getRfqPage(world) {
  if (!world.rfqPage) {
    world.rfqPage = new RFQPage(world.page);
  }
  return world.rfqPage;
}

function getStartFromEstimatePage(world) {
  if (!world.startFromEstimatePage) {
    world.startFromEstimatePage = new StartFromEstimatePage(world.page);
  }
  return world.startFromEstimatePage;
}

async function openProjectModule(world, headingName, moduleName) {
  const nav = new ProjectNavigationPage(world.page);
  const profile = new ProjectProfilePage(world.page);

  await nav.navigateToProjects();
  await nav.clickFirstProject();
  await profile.selectHeading(headingName);
  await profile.clickModuleCard(moduleName);
}

When(
  'I create and send an estimate using estimate flow 2 for start from estimate',
  { timeout: 300000 },
  async function () {
    const estimatePage = getEstimatePage(this);
    const title = `RFQ Estimate ${Date.now()}`;

    this.createdEstimateTitle = title;

    await openProjectModule(this, 'Design & Estimates', 'Estimate');
    await estimatePage.waitForModuleToLoad();
    await estimatePage.createAndSendMinimalEstimateForRfq(title);
    await estimatePage.isToastVisible('Estimation created successfully|Email sent successfully');
  }
);

When('I return to Procurement RFQ module', { timeout: 240000 }, async function () {
  const rfq = getRfqPage(this);
  // Prefer left Client menu → RFQ (more stable than heading/module cards after navigation).
  const nav = new ProjectNavigationPage(this.page);
  await nav.openRfqFromClientMenu();
  await rfq.expectRfqPageLoaded();
});

When(
  'I create RFQ from the created estimate through group flow and send email',
  { timeout: 420000 },
  async function () {
    const rfq = getStartFromEstimatePage(this);
    // If the freshly created estimate isn't visible in the RFQ picker immediately,
    // the page object will fall back to selecting the 2nd visible estimate.
    const details = await rfq.completeStartFromEstimateGroupedFlow(this.createdEstimateTitle);
    this.createdEstimateGroupName = details.groupName;
    this.lastRfqTitle = details.rfqTitle;
  }
);

When(
  'I start RFQ from estimate and proceed',
  { timeout: 120000 },
  async function () {
    const rfq = getStartFromEstimatePage(this);
    await rfq.startFromEstimateAndProceed();
  }
);

Then(
  'I should see the created estimate in start from estimate list',
  { timeout: 120000 },
  async function () {
    const rfq = getStartFromEstimatePage(this);
    await rfq.expectEstimateVisible(this.createdEstimateTitle);
  }
);

