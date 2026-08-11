const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const BudgetingPage = require('../../../../../pages/admin/projects/management/Budgeting/BudgetingPage');
const EstimatePage = require('../../../../../pages/admin/projects/design/estimate/estimate.page');
const AcceptedProposalPage = require('../../../../../pages/admin/common/proposal/AcceptedProposalPage');

/** Per AGENTS.md: cucumber timeout aligned with heavy module loads; steps stay thin. */
setDefaultTimeout(120000);

const BUDGETING_TEST_CASE_LOG = {
  TC01: 'TC-01 — Schedule phase + children in budgeting table',
  TC02: 'TC-02 — Link manual actual budget',
  TC03: 'TC-03 — Delete manual actual budget',
  TC04: 'TC-04 — Link sent estimate',
  TC05: 'TC-05 — Unlink estimate',
  TC06: 'TC-06 — Send proposal, accept, link',
  TC07: 'TC-07 — Unlink proposal',
};

Before({ tags: '@budgeting' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && BUDGETING_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${BUDGETING_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getBudgetingPage(world) {
  if (!world.budgetingPage || world.budgetingPage.page !== world.page) {
    world.budgetingPage = new BudgetingPage(world.page);
  }
  return world.budgetingPage;
}

function getEstimatePage(world) {
  if (!world.estimatePage || world.estimatePage.page !== world.page) {
    world.estimatePage = new EstimatePage(world.page);
  }
  return world.estimatePage;
}

// ---------------------------------------------------------------------------
// Navigation / module
// ---------------------------------------------------------------------------

When('I navigate to the budgeting module', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.navigateToBudgetingModule();
});

When('I wait for the budgeting module to load', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.waitForModuleToLoad();
});

Then('I should see schedule {string} in the budgeting bottom table', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectScheduleInBudgetTable(name);
});

// ---------------------------------------------------------------------------
// Link offcanvas — open / tabs / close
// ---------------------------------------------------------------------------

When('I open the link to actual budget offcanvas', async function () {
  const budgetingPage = getBudgetingPage(this);
  this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  await budgetingPage.openLinkToActualBudgetOffcanvas();
});

Then('the link to actual budget offcanvas should be open', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectLinkOffcanvasOpen();
});

When('I close the link to actual budget offcanvas', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.closeLinkOffcanvas();
});

When('I switch to the manual budget tab in the link offcanvas', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.switchLinkOffcanvasTab('Manual Budget');
});

When('I switch to the estimate tab in the link offcanvas', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.switchLinkOffcanvasTab('Estimate');
});

When('I switch to the proposal tab in the link offcanvas', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.switchLinkOffcanvasTab('Proposal');
});

// ---------------------------------------------------------------------------
// Manual budget
// ---------------------------------------------------------------------------

When('I fill manual budget name with {string}', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.fillManualBudgetName(name);
});

When('I enter a random amount multiple of 100 on the manual budget form', async function () {
  const budgetingPage = getBudgetingPage(this);
  const amount = await budgetingPage.enterRandomManualAmountMultipleOf100();
  this.lastLinkedAmount = amount;
  this.pendingManualAmount = amount;
});

When('I choose budget category {string} on the manual budget form', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  this.lastBudgetCategory = category;
  await budgetingPage.chooseManualBudgetCategory(category);
});

When('I click add budget on the manual budget form', async function () {
  const budgetingPage = getBudgetingPage(this);
  if (!this.budgetSnapshotBefore) {
    this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  }
  await budgetingPage.clickAddBudget();
  this.lastLinkedAmount = this.pendingManualAmount ?? budgetingPage.lastLinkedAmount;
});

Then('I should see manual budget {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectManualBudgetVisible(name);
});

Then('manual budget {string} should show Approved status', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectManualBudgetApproved(name);
});

When('I delete manual budget {string} from the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  this.lastDeletedAmount = this.lastLinkedAmount ?? budgetingPage.lastManualAmount;
  await budgetingPage.deleteManualBudget(name);
  budgetingPage.lastDeletedAmount = this.lastDeletedAmount;
});

// ---------------------------------------------------------------------------
// Actual Budget card assertions (delta vs snapshot)
// ---------------------------------------------------------------------------

Then('the actual budget card total should include the last linked amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const amount = this.lastLinkedAmount;
  const before = this.budgetSnapshotBefore;
  const category = this.lastBudgetCategory || 'Asset';
  await expectSnapshotDelta(budgetingPage, before, amount, category, 'increase');
});

Then('the actual budget card category {string} should include the last linked amount', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const before = this.budgetSnapshotBefore;
  const amount = this.lastLinkedAmount;
  const key = budgetingPage.categoryKey(category);
  expect(after[key]).toBe(before[key] + amount);
});

Then('the actual budget card unallocated should include the last linked amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const before = this.budgetSnapshotBefore;
  const amount = this.lastLinkedAmount;
  expect(after.unallocatedRemaining).toBe(before.unallocatedRemaining + amount);
});

Then('the actual budget card total should have deducted the last deleted amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const amount = this.lastDeletedAmount;
  const before = this.budgetSnapshotBefore;
  const category = this.lastBudgetCategory || 'Asset';
  await expectSnapshotDelta(budgetingPage, before, amount, category, 'decrease');
});

Then('the actual budget card category {string} should have deducted the last deleted amount', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const before = this.budgetSnapshotBefore;
  const amount = this.lastDeletedAmount;
  const key = budgetingPage.categoryKey(category);
  expect(after[key]).toBe(before[key] - amount);
});

Then('the actual budget card unallocated should have deducted the last deleted amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const before = this.budgetSnapshotBefore;
  const amount = this.lastDeletedAmount;
  expect(after.unallocatedRemaining).toBe(before.unallocatedRemaining - amount);
});

Then('the actual budget card total should include the last linked estimate amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const amount = this.lastLinkedEstimateAmount;
  await expectSnapshotDelta(budgetingPage, this.budgetSnapshotBefore, amount, this.lastBudgetCategory || 'Material', 'increase');
});

Then('the actual budget card category {string} should include the last linked estimate amount', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const key = budgetingPage.categoryKey(category);
  expect(after[key]).toBe(this.budgetSnapshotBefore[key] + this.lastLinkedEstimateAmount);
});

Then('the actual budget card unallocated should include the last linked estimate amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  expect(after.unallocatedRemaining).toBe(
    this.budgetSnapshotBefore.unallocatedRemaining + this.lastLinkedEstimateAmount
  );
});

Then('the actual budget card total should have deducted the last unlinked estimate amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  await expectSnapshotDelta(
    budgetingPage,
    this.budgetSnapshotBefore,
    this.lastUnlinkedEstimateAmount,
    this.lastBudgetCategory || 'Material',
    'decrease'
  );
});

Then('the actual budget card category {string} should have deducted the last unlinked estimate amount', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const key = budgetingPage.categoryKey(category);
  expect(after[key]).toBe(this.budgetSnapshotBefore[key] - this.lastUnlinkedEstimateAmount);
});

Then('the actual budget card unallocated should have deducted the last unlinked estimate amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  expect(after.unallocatedRemaining).toBe(
    this.budgetSnapshotBefore.unallocatedRemaining - this.lastUnlinkedEstimateAmount
  );
});

Then('the actual budget card total should include the last linked proposal amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  await expectSnapshotDelta(
    budgetingPage,
    this.budgetSnapshotBefore,
    this.lastLinkedProposalAmount,
    this.lastBudgetCategory || 'Labor',
    'increase'
  );
});

Then('the actual budget card category {string} should include the last linked proposal amount', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const key = budgetingPage.categoryKey(category);
  expect(after[key]).toBe(this.budgetSnapshotBefore[key] + this.lastLinkedProposalAmount);
});

Then('the actual budget card unallocated should include the last linked proposal amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  expect(after.unallocatedRemaining).toBe(
    this.budgetSnapshotBefore.unallocatedRemaining + this.lastLinkedProposalAmount
  );
});

Then('the actual budget card total should have deducted the last unlinked proposal amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  await expectSnapshotDelta(
    budgetingPage,
    this.budgetSnapshotBefore,
    this.lastUnlinkedProposalAmount,
    this.lastBudgetCategory || 'Labor',
    'decrease'
  );
});

Then('the actual budget card category {string} should have deducted the last unlinked proposal amount', async function (category) {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  const key = budgetingPage.categoryKey(category);
  expect(after[key]).toBe(this.budgetSnapshotBefore[key] - this.lastUnlinkedProposalAmount);
});

Then('the actual budget card unallocated should have deducted the last unlinked proposal amount', async function () {
  const budgetingPage = getBudgetingPage(this);
  const after = await budgetingPage.captureActualBudgetSnapshot();
  expect(after.unallocatedRemaining).toBe(
    this.budgetSnapshotBefore.unallocatedRemaining - this.lastUnlinkedProposalAmount
  );
});

async function expectSnapshotDelta(budgetingPage, before, amount, categoryLabel, direction) {
  await expect(async () => {
    const after = await budgetingPage.captureActualBudgetSnapshot();
    const delta = direction === 'increase' ? amount : -amount;
    expect(after.total).toBe(before.total + delta);
    const key = budgetingPage.categoryKey(categoryLabel);
    expect(after[key]).toBe(before[key] + delta);
    expect(after.unallocatedRemaining).toBe(before.unallocatedRemaining + delta);
  }).toPass({ timeout: 45000, intervals: [500, 1000, 2000] });
}

// ---------------------------------------------------------------------------
// Estimate link / unlink
// ---------------------------------------------------------------------------

When('I add manual estimate item with amount multiple of 100', { timeout: 180000 }, async function () {
  const estimatePage = getEstimatePage(this);
  const budgetingPage = getBudgetingPage(this);
  const rate = budgetingPage.randomAmountMultipleOf100(100, 1000);
  const name = `bgt${Math.random().toString(36).slice(2, 6)}`;
  await estimatePage.addManualItem({
    name,
    qty: 1,
    unit: 'Nos',
    rate,
    profit: 0,
  });
  this.lastEstimateItemAmount = rate;
  this.lastLinkedEstimateAmount = rate;
  console.log(`Added estimate item amount (qty1×rate, profit0): ${rate}`);
});

Then('I should see estimate {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectEstimateInOffcanvas(name);
});

When('I check estimate {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  const amount = await budgetingPage.readCardGrandTotal(name);
  // Prefer UI grand total when it is a multiple of 100; else fall back to known item amount
  this.lastLinkedEstimateAmount =
    amount > 0 && amount % 100 === 0 ? amount : this.lastEstimateItemAmount || amount;
  await budgetingPage.checkLinkItem(name, true);
});

When('I uncheck estimate {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  this.lastUnlinkedEstimateAmount = this.lastLinkedEstimateAmount;
  await budgetingPage.checkLinkItem(name, false);
  await this.page.waitForTimeout(1500);
});

When('I choose budget category {string} for estimate {string}', async function (category, name) {
  const budgetingPage = getBudgetingPage(this);
  this.lastBudgetCategory = category;
  await budgetingPage.chooseCategoryForLinkItem(name, category);
});

When('I click link cost on the link offcanvas', async function () {
  const budgetingPage = getBudgetingPage(this);
  if (!this.budgetSnapshotBefore) {
    this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  }
  await budgetingPage.clickLinkCost();
});

// ---------------------------------------------------------------------------
// Proposal link / unlink + send / yopmail
// ---------------------------------------------------------------------------

When('I wait for the proposal workspace to load', { timeout: 120000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.waitForProposalWorkspace();
});

When('I choose proposal template {string} and proceed', { timeout: 180000 }, async function (templateName) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.chooseProposalTemplateAndProceed(templateName);
});

When('I skip and proceed in the template change dialog', { timeout: 240000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.skipAndProceedTemplateDialog();
});

When('I open the proposal send menu', { timeout: 240000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.openProposalSendMenu();
});

When('I select email from the proposal send menu', { timeout: 240000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.selectEmailFromProposalSendMenu();
});

When('I copy the compose email recipient and send proposal email', { timeout: 240000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  const email = await budgetingPage.copyComposeEmailRecipientAndSend();
  this.proposalRecipientEmail = email;
  this.vendorYopmailEmail = email;
});

Then('the proposal sent items should show {string} with Sent label', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectProposalSentItemsShow(name);
});

When('I open Yopmail for the copied proposal recipient', { timeout: 180000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  budgetingPage.proposalRecipientEmail = this.proposalRecipientEmail || budgetingPage.proposalRecipientEmail;
  await budgetingPage.openYopmailForCopiedRecipient();
  this.yopmailPage = budgetingPage.yopmailPage;
});

When(
  'I wait for proposal email subject {string} and open View Proposal',
  { timeout: 300000 },
  async function (subject) {
    const budgetingPage = getBudgetingPage(this);
    await budgetingPage.waitForProposalEmailAndOpenViewProposal(subject);
    this.proposalPreviewPage = budgetingPage.proposalPreviewPage;
    // Reuse existing @acceptedProposal step: I accept the proposal with a digital signature
    if (!this.acceptedProposalPage) {
      this.acceptedProposalPage = new AcceptedProposalPage(this.page);
    }
    this.acceptedProposalPage.proposalPreviewPage = budgetingPage.proposalPreviewPage;
    const email = this.proposalRecipientEmail || budgetingPage.proposalRecipientEmail || '';
    this.acceptedProposalPage.clientData = {
      ...(this.acceptedProposalPage.clientData || {}),
      email,
      yopmailLocalPart: email.includes('@') ? email.split('@')[0] : email,
    };
  }
);

When('I return to the application project', { timeout: 120000 }, async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.returnToApplicationProject();
});

Then('I should see proposal {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.expectProposalInOffcanvas(name);
});

When('I check proposal {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  const amount = await budgetingPage.readCardGrandTotal(name);
  this.lastLinkedProposalAmount = amount;
  await budgetingPage.checkLinkItem(name, true);
});

When('I uncheck proposal {string} in the link offcanvas', async function (name) {
  const budgetingPage = getBudgetingPage(this);
  this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  this.lastUnlinkedProposalAmount = this.lastLinkedProposalAmount;
  await budgetingPage.checkLinkItem(name, false);
  await this.page.waitForTimeout(1500);
});

When('I choose budget category {string} for proposal {string}', async function (category, name) {
  const budgetingPage = getBudgetingPage(this);
  this.lastBudgetCategory = category;
  await budgetingPage.chooseCategoryForLinkItem(name, category);
});
