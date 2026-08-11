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
  TC08: 'TC-08 — Allocate contingency 10%',
  TC09: 'TC-09 — Allocate contingency fixed 1000',
  TC10: 'TC-10 — Add contingency fixed 100',
  TC11: 'TC-11 — Add contingency 10%',
  TC12: 'TC-12 — Phase actual budget 500',
  TC13: 'TC-13 — Split budget to children',
  TC14: 'TC-14 — Manual actual cost Asset',
  TC15: 'TC-15 — Delete manual actual cost',
  TC16: 'TC-16 — Link bills expense Labor',
  TC17: 'TC-17 — Unlink bills expense Other',
  TC18: 'TC-18 — Split actual cost to children',
  TC19: 'TC-19 — Child budget over limit',
  TC20: 'TC-20 — Child cost over limit',
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

When('I switch schedule to the Budget tab', async function () {
  const budgetingPage = getBudgetingPage(this);
  await budgetingPage.switchToBudgetTab();
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
  await budgetingPage.waitForModuleToLoad();
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
  const result = await estimatePage.addManualItemWithQtyUnitRateMultipleOf100({
    name: `bgt${Math.random().toString(36).slice(2, 6)}`,
    qty: 1,
    unit: 'Nos',
    rate,
    profit: 0,
  });
  this.lastEstimateItemAmount = result.amount;
  this.lastLinkedEstimateAmount = result.amount;
  console.log(
    `Added estimate item Qty=${result.qty} Unit=${result.unit} Rate=${result.rate} Profit=${result.profit} → amount ${result.amount}`
  );
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

// ---------------------------------------------------------------------------
// Contingency allocate / add (TC-08 … TC-11)
// ---------------------------------------------------------------------------

When('I open the allocate contingency popup', async function () {
  const budgetingPage = getBudgetingPage(this);
  this.budgetSnapshotBefore = await budgetingPage.captureActualBudgetSnapshot();
  await budgetingPage.openAllocateContingencyPopup();
});

Then('the allocate contingency popup should be open', async function () {
  await getBudgetingPage(this).expectAllocatePopupOpen();
});

When('I choose contingency allocation method {string}', async function (method) {
  await getBudgetingPage(this).chooseContingencyAllocationMethod(method);
});

When('I enter contingency allocate percentage {string}', async function (value) {
  await getBudgetingPage(this).enterAllocatePercentage(value);
});

When('I enter contingency allocate fixed amount {string}', async function (value) {
  await getBudgetingPage(this).enterAllocateFixedAmount(value);
  this.lastAllocatedContingencyAmount = Number(value);
});

Then('the allocate contingency calculated amount should be 10 percent of actual budget total', async function () {
  await getBudgetingPage(this).expectCalculatedAmountIsPercentOfBudget(10);
});

Then(
  'the allocate contingency calculated percentage should match fixed amount {string} of actual budget total',
  async function (amount) {
    await getBudgetingPage(this).expectCalculatedPercentForFixed(amount);
  }
);

When('I click allocate contingency', async function () {
  await getBudgetingPage(this).clickAllocateContingency();
});

Then('the actual budget card should show contingency percentage {string}', async function (pct) {
  await getBudgetingPage(this).expectCardContingencyPercentage(pct);
});

Then('the actual budget card contingency amount should match 10 percent of actual budget total', async function () {
  await getBudgetingPage(this).expectCardContingencyMatchesPercent(10);
});

Then('the actual budget card should show contingency amount {string}', async function (amount) {
  await getBudgetingPage(this).expectCardContingencyAmount(amount);
});

Then(
  'the actual budget card contingency percentage should match fixed amount {string} of actual budget total',
  async function (amount) {
    await getBudgetingPage(this).expectCardContingencyPctMatchesFixed(amount);
  }
);

When('I open the add contingency offcanvas', async function () {
  await getBudgetingPage(this).openAddContingencyOffcanvas();
});

Then('the add contingency offcanvas should be open', async function () {
  await getBudgetingPage(this).expectAddContingencyOpen();
});

When('I close the add contingency offcanvas', async function () {
  await getBudgetingPage(this).closeAddContingencyOffcanvas();
});

Then('the total contingency pool should match the allocated contingency amount', async function () {
  await getBudgetingPage(this).expectTotalContingencyPoolMatchesAllocated();
});

Then('the total contingency pool should equal {string}', async function (amount) {
  await getBudgetingPage(this).expectTotalContingencyPoolEquals(amount);
});

When('I choose add contingency mode {string}', async function (mode) {
  await getBudgetingPage(this).chooseAddContingencyMode(mode);
});

When('I enter add contingency amount {string}', async function (amount) {
  await getBudgetingPage(this).enterAddContingencyAmount(amount);
  this.lastAddedContingencyAmount = Number(amount);
});

When('I enter add contingency percentage {string}', async function (pct) {
  const page = getBudgetingPage(this);
  await page.enterAddContingencyPercentage(pct);
  this.lastAddedContingencyAmount = page.lastAddedContingencyAmount;
});

Then('the contingency budget impact should show plus amount {string}', async function (amount) {
  await getBudgetingPage(this).expectBudgetImpactPlus(amount);
});

Then(
  'the contingency budget impact percent of available should be correct for amount {string}',
  async function (amount) {
    await getBudgetingPage(this).expectBudgetImpactPercentOfAvailable(amount);
  }
);

Then('the contingency budget impact should show plus amount for 10 percent of available', async function () {
  await getBudgetingPage(this).expectBudgetImpactForTenPercentAvailable();
});

When('I enter add contingency reason {string}', async function (reason) {
  await getBudgetingPage(this).enterAddContingencyReason(reason);
});

When('I click add contingency submit', async function () {
  await getBudgetingPage(this).clickAddContingencySubmit();
});

When('I switch to contingency approval review tab', async function () {
  await getBudgetingPage(this).switchContingencyApprovalReviewTab();
});

Then('the contingency approval review should show rate amount {string}', async function (amount) {
  await getBudgetingPage(this).expectApprovalReviewRate(amount);
});

Then('the contingency approval review should show the last added contingency amount', async function () {
  await getBudgetingPage(this).expectApprovalReviewLastAmount();
});

Then('the actual budget card total should have increased by contingency amount {string}', async function (amount) {
  await getBudgetingPage(this).expectActualBudgetIncreasedByContingency(amount);
});

Then('the actual budget card total should have increased by the last added contingency amount', async function () {
  const page = getBudgetingPage(this);
  await page.expectActualBudgetIncreasedByContingency(this.lastAddedContingencyAmount || page.lastAddedContingencyAmount);
});

Then('the actual budget card should show contingency used amount {string}', async function (amount) {
  await getBudgetingPage(this).expectCardShowsContingencyUsed(amount);
});

Then('the actual budget card should show contingency used equal to the last added contingency amount', async function () {
  const page = getBudgetingPage(this);
  await page.expectCardShowsContingencyUsed(this.lastAddedContingencyAmount || page.lastAddedContingencyAmount);
});

// ---------------------------------------------------------------------------
// Budget table — TC-12, TC-13, TC-18, TC-19, TC-20
// ---------------------------------------------------------------------------

When('I set actual budget {string} on schedule {string} in the budgeting table', async function (amount, name) {
  const page = getBudgetingPage(this);
  this.budgetSnapshotBefore = await page.captureActualBudgetSnapshot();
  await page.setScheduleActualBudget(name, amount);
});

Then('the actual budget card unallocated should have decreased by {string}', async function (amount) {
  await getBudgetingPage(this).expectUnallocatedDecreasedBy(amount);
});

When('I split schedule {string} actual budget equally to child schedules', async function (name) {
  await getBudgetingPage(this).splitActualBudgetEquallyToChildren(name);
});

When('I split schedule {string} actual cost equally to child schedules', async function (name) {
  await getBudgetingPage(this).splitActualCostEquallyToChildren(name);
});

Then('no budgeting error toast should be visible', async function () {
  await getBudgetingPage(this).expectNoBudgetingErrorToast();
});

Then('a budgeting error toast should be visible', async function () {
  await getBudgetingPage(this).expectBudgetingErrorToast();
});

When('I set actual budget on child schedule {string} to 1 more than its current amount', async function (name) {
  await getBudgetingPage(this).setChildBudgetOneMoreThanCurrent(name);
});

When('I set actual cost on child schedule {string} to 1 more than its current amount', async function (name) {
  await getBudgetingPage(this).setChildCostOneMoreThanCurrent(name);
});

When('I reduce the open actual budget edit by {string} and save', async function (delta) {
  await getBudgetingPage(this).reduceOpenBudgetEditByAndSave(delta);
});

When('I reduce the open actual cost edit by {string} and save', async function (delta) {
  await getBudgetingPage(this).reduceOpenCostEditByAndSave(delta);
});

Then('the budgeting table actual budget for schedule {string} should be saved', async function (name) {
  await getBudgetingPage(this).expectScheduleBudgetSaved(name);
});

Then('the budgeting table actual cost for schedule {string} should be saved', async function (name) {
  await getBudgetingPage(this).expectScheduleCostSaved(name);
});

// ---------------------------------------------------------------------------
// Manual actual cost + bills/expenses (TC-14 … TC-17)
// ---------------------------------------------------------------------------

When('I open link actual costs for schedule {string}', async function (name) {
  await getBudgetingPage(this).openLinkActualCostsForSchedule(name);
});

Then('the link actual costs offcanvas should be open', async function () {
  await getBudgetingPage(this).expectLinkActualCostsOpen();
});

When('I close the link actual costs offcanvas', async function () {
  await getBudgetingPage(this).closeLinkActualCosts();
});

When('I switch to the add manual cost tab', async function () {
  await getBudgetingPage(this).switchActualCostsTab('Add Manual Cost');
});

When('I switch to the bills and expenses tab', async function () {
  await getBudgetingPage(this).switchActualCostsTab('Bills & Expenses');
});

When('I fill manual cost name with {string}', async function (name) {
  await getBudgetingPage(this).fillManualCostName(name);
});

When('I enter a random amount multiple of 100 on the manual cost form', async function () {
  const amount = await getBudgetingPage(this).enterRandomManualCostAmount();
  this.lastLinkedCostAmount = amount;
});

When('I choose cost category {string} on the manual cost form', async function (category) {
  this.lastCostCategory = category;
  await getBudgetingPage(this).chooseManualCostCategory(category);
});

When('I click add expense on the manual cost form', async function () {
  await getBudgetingPage(this).clickAddExpense();
});

Then('I should see manual cost {string} in the link actual costs offcanvas', async function (name) {
  await getBudgetingPage(this).expectManualCostVisible(name);
});

When('I delete manual cost {string} from the link actual costs offcanvas', async function (name) {
  const page = getBudgetingPage(this);
  this.lastDeletedCostAmount = this.lastLinkedCostAmount;
  await page.deleteManualCost(name);
});

Then('the actual cost card total should include the last linked cost amount', async function () {
  await getBudgetingPage(this).expectActualCostIncreasedBy(this.lastLinkedCostAmount, this.lastCostCategory);
});

Then('the actual cost card category {string} should include the last linked cost amount', async function (category) {
  const page = getBudgetingPage(this);
  const after = await page.captureActualCostSnapshot();
  const before = page.costSnapshotBefore || this.costSnapshotBefore;
  const key = page.categoryKey(category);
  expect(after[key]).toBe(before[key] + this.lastLinkedCostAmount);
});

Then(
  'the budgeting table actual cost for schedule {string} should include the last linked cost amount',
  async function (name) {
    await getBudgetingPage(this).expectTableActualCostIncludes(name, this.lastLinkedCostAmount);
  }
);

Then('the actual cost card total should have deducted the last deleted cost amount', async function () {
  await getBudgetingPage(this).expectActualCostDecreasedBy(this.lastDeletedCostAmount, this.lastCostCategory);
});

Then('the actual cost card category {string} should have deducted the last deleted cost amount', async function (category) {
  const page = getBudgetingPage(this);
  const after = await page.captureActualCostSnapshot();
  const before = page.costSnapshotBefore;
  const key = page.categoryKey(category);
  expect(after[key]).toBe(before[key] - this.lastDeletedCostAmount);
});

Then(
  'the budgeting table actual cost for schedule {string} should have deducted the last deleted cost amount',
  async function (name) {
    await getBudgetingPage(this).expectTableActualCostIncludes(name, 0);
  }
);

When('I wait for bills and expenses module to load', async function () {
  await getBudgetingPage(this).waitForBillsExpensesModule();
});

When(
  'I create an expense from scratch named {string} with amount multiple of 100',
  async function (name) {
    const page = getBudgetingPage(this);
    const amount = page.randomAmountMultipleOf100(100, 1000);
    this.lastExpenseAmount = amount;
    this.lastLinkedExpenseAmount = amount;
    await page.createExpenseFromScratch(name, amount);
  }
);

Then('expense {string} should be visible with the last expense amount', async function (name) {
  await getBudgetingPage(this).expectExpenseVisibleWithAmount(name, this.lastExpenseAmount);
});

Then('I should see expense {string} in the link actual costs offcanvas', async function (name) {
  await getBudgetingPage(this).expectManualCostVisible(name);
});

When('I check expense {string} in the link actual costs offcanvas', async function (name) {
  const page = getBudgetingPage(this);
  await page.checkExpenseItem(name, true);
  this.lastLinkedExpenseAmount = page.lastLinkedExpenseAmount || this.lastExpenseAmount;
});

When('I uncheck expense {string} in the link actual costs offcanvas', async function (name) {
  const page = getBudgetingPage(this);
  page.costSnapshotBefore = await page.captureActualCostSnapshot();
  this.lastUnlinkedExpenseAmount = this.lastLinkedExpenseAmount;
  await page.checkExpenseItem(name, false);
  await this.page.waitForTimeout(1200);
});

When('I choose cost category {string} for expense {string}', async function (category, name) {
  this.lastCostCategory = category;
  await getBudgetingPage(this).chooseExpenseCategory(name, category);
});

When('I click link to actual costs', async function () {
  await getBudgetingPage(this).clickLinkToActualCosts();
});

Then('expense {string} should be checked in the link actual costs offcanvas', async function (name) {
  await getBudgetingPage(this).expectExpenseChecked(name);
});

Then('the actual cost card total should include the last linked expense amount', async function () {
  await getBudgetingPage(this).expectActualCostIncreasedBy(this.lastLinkedExpenseAmount, this.lastCostCategory);
});

Then('the actual cost card category {string} should include the last linked expense amount', async function (category) {
  const page = getBudgetingPage(this);
  const after = await page.captureActualCostSnapshot();
  const before = page.costSnapshotBefore;
  const key = page.categoryKey(category);
  expect(after[key]).toBe(before[key] + this.lastLinkedExpenseAmount);
});

Then(
  'the budgeting table actual cost for schedule {string} should include the last linked expense amount',
  async function (name) {
    await getBudgetingPage(this).expectTableActualCostIncludes(name, this.lastLinkedExpenseAmount);
  }
);

Then('the actual cost card total should have deducted the last unlinked expense amount', async function () {
  await getBudgetingPage(this).expectActualCostDecreasedBy(this.lastUnlinkedExpenseAmount, this.lastCostCategory);
});

Then(
  'the actual cost card category {string} should have deducted the last unlinked expense amount',
  async function (category) {
    const page = getBudgetingPage(this);
    const after = await page.captureActualCostSnapshot();
    const before = page.costSnapshotBefore;
    const key = page.categoryKey(category);
    expect(after[key]).toBe(before[key] - this.lastUnlinkedExpenseAmount);
  }
);

Then(
  'the budgeting table actual cost for schedule {string} should have deducted the last unlinked expense amount',
  async function (name) {
    await getBudgetingPage(this).expectTableActualCostIncludes(name, 0);
  }
);
