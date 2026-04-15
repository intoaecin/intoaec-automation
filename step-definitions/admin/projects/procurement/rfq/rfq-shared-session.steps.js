const { Given, AfterAll } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const LoginPage = require('../../../../../pages/admin/auth/LoginPage');
const ProjectNavigationPage = require('../../../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../../../pages/admin/projects/ProjectProfilePage');
const RFQPage = require('../../../../../pages/admin/projects/procurement/rfq/RFQPage');
const {
  isRfqSuiteSessionPrimed,
  setRfqSuiteSessionPrimed,
  resetRfqSuiteSession,
} = require('../../../../../support/rfq-shared-session');

async function loginAndNavigateToRfqModule(world, email, password) {
  const { page } = world;
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  const ok = await loginPage.isLoginSuccessful();
  expect(ok).toBeTruthy();

  const nav = new ProjectNavigationPage(page);
  await nav.navigateToProjects();
  await nav.clickFirstProject();

  const profile = new ProjectProfilePage(page);
  await profile.selectHeading('Procurement');
  await profile.clickModuleCard('RFQ');

  const rfq = new RFQPage(page);
  await rfq.expectRfqPageLoaded();
}

async function navigateBackToRfqList(world) {
  const { page } = world;
  const loginPage = new LoginPage(page);
  if (!loginPage.isAlreadyAuthenticated()) {
    throw new Error(
      'RFQ suite: session lost (still on sign-in?). Re-run the suite.'
    );
  }

  const nav = new ProjectNavigationPage(page);
  await nav.navigateToProjects();
  await nav.clickFirstProject();

  const profile = new ProjectProfilePage(page);
  await profile.selectHeading('Procurement');
  await profile.clickModuleCard('RFQ');

  const rfq = new RFQPage(page);
  await rfq.expectRfqPageLoaded();
}

/**
 * First scenario in a run: full login + Procurement → RFQ.
 * Later scenarios: same browser session, only navigate back to the RFQ list.
 */
Given(
  'the RFQ suite is ready with login and Procurement RFQ module open',
  { timeout: 300000 },
  async function () {
    const email = process.env.RFQ_TEST_EMAIL || 'testintoaec@gmail.com';
    const password = process.env.RFQ_TEST_PASSWORD || 'Courage@10';

    if (isRfqSuiteSessionPrimed()) {
      // eslint-disable-next-line no-console
      console.log(
        `[RFQ suite][${new Date().toISOString()}] Reusing browser session — opening RFQ module only`
      );
      await navigateBackToRfqList(this);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[RFQ suite][${new Date().toISOString()}] One-time login + navigation for this cucumber run`
    );
    await loginAndNavigateToRfqModule(this, email, password);
    setRfqSuiteSessionPrimed(true);
  }
);

AfterAll(function () {
  resetRfqSuiteSession();
});
