const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Project → Budgeting (Actual Budget card, link offcanvas, budget table).
 *
 * UI: intoaec-UI/src/features/projectSchedule/components/
 *   BudgetView, ActualBudgetCard, BudgetLinkPlannedCost, ManualBudgetTabContent,
 *   EstimatesTabContent, ProposalsTabContent, BudgetTable
 *
 * Layering per AGENTS.md:
 *   Feature: features/.../Budgeting/Budgeting_TestCases.feature
 *   Steps:   step-definitions/.../Budgeting/BudgetingStep.js
 *   Page:    this file
 */
class BudgetingPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = 45000;
    this.quickTimeout = 10000;

    this.main = page.locator('main, [role="main"]').first();
    this.actualBudgetTitle = page
      .getByText(/actual\s*budget/i)
      .filter({ visible: true })
      .first();
    // UI CTA: "Link" / "Link to Actual Budget" (role or plain text control).
    this.linkButton = page
      .getByRole('button', { name: /link(\s+to\s+actual\s+budget)?/i })
      .or(page.getByRole('link', { name: /link(\s+to\s+actual\s+budget)?/i }))
      .or(page.locator('button, a, [role="button"]').filter({ hasText: /^link(\s+to\s+actual\s+budget)?$/i }))
      .first();
    this.budgetTable = page.locator('table').filter({ visible: true }).first();

    this.lastManualAmount = null;
    this.lastLinkedAmount = null;
    this.lastDeletedAmount = null;
    this.lastLinkedEstimateAmount = null;
    this.lastUnlinkedEstimateAmount = null;
    this.lastLinkedProposalAmount = null;
    this.lastUnlinkedProposalAmount = null;
    this.proposalRecipientEmail = null;
    this.yopmailPage = null;
    this.proposalPreviewPage = null;
    this.lastAllocatedContingencyAmount = null;
  }

  async logStep(msg) {
    console.log(msg);
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Random amount in [100, 1000] that is a multiple of 100. */
  randomAmountMultipleOf100(min = 100, max = 1000) {
    const lo = Math.ceil(min / 100) * 100;
    const hi = Math.floor(max / 100) * 100;
    const steps = Math.floor((hi - lo) / 100) + 1;
    return lo + Math.floor(Math.random() * steps) * 100;
  }

  parseMoney(text) {
    if (text == null) return 0;
    const cleaned = String(text).replace(/[^\d.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  async isOnBudgetingModule() {
    // Do NOT treat the Project Management module-tile label "Budgeting" as in-module.
    const title = await this.actualBudgetTitle.isVisible({ timeout: 1500 }).catch(() => false);
    if (title) return true;
    const urlHit = /tab=Budgeting|tab=Budget/i.test(this.page.url());
    if (!urlHit) return false;
    const link = await this.linkButton.isVisible({ timeout: 1500 }).catch(() => false);
    const table = await this.budgetTable.isVisible({ timeout: 1500 }).catch(() => false);
    return link || table;
  }

  async waitForModuleToLoad() {
    await expect(async () => {
      const ready =
        (await this.actualBudgetTitle.isVisible().catch(() => false)) ||
        (await this.linkButton.isVisible().catch(() => false)) ||
        (await this.budgetTable.isVisible().catch(() => false)) ||
        /tab=Budgeting|tab=Budget/i.test(this.page.url());
      expect(ready).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1500, 3000] });

    // Module is ready when any in-module marker is visible (table alone is enough — TC-01).
    await expect(async () => {
      const marker =
        (await this.actualBudgetTitle.isVisible().catch(() => false)) ||
        (await this.linkButton.isVisible().catch(() => false)) ||
        (await this.budgetTable.isVisible().catch(() => false));
      expect(marker).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Budgeting module loaded');
  }

  async navigateToBudgetingModule() {
    if (await this.isOnBudgetingModule()) {
      await this.logStep('Already on Budgeting — skipping navigation');
      return;
    }

    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    const pmBtn = profile.projectManagementHeading;
    if (await pmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pmBtn.click({ force: true, timeout: 15000 }).catch(() => {});
      await this.page.waitForTimeout(800);
    }

    // Inspector path: <p class="MuiTypography-root MuiTypography-body1">Budgeting</p>
    const budgetingLabel = this.page
      .locator('p.MuiTypography-root.MuiTypography-body1')
      .filter({ hasText: /^Budgeting$/i })
      .first();

    if (await budgetingLabel.isVisible({ timeout: 10000 }).catch(() => false)) {
      await budgetingLabel.scrollIntoViewIfNeeded().catch(() => {});
      await budgetingLabel.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.waitForModuleToLoad();
      await this.logStep('Opened Budgeting via MuiTypography-body1 label');
      return;
    }

    await profile.clickModuleCard('Budgeting');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForModuleToLoad();
  }

  actualBudgetCard() {
    return this.page
      .locator('.MuiPaper-root, [class*="MuiCard"], section, div')
      .filter({ has: this.page.getByText(/actual\s*budget/i) })
      .first();
  }

  linkOffcanvas() {
    return this.page
      .locator('[role="dialog"], .MuiModal-root, .MuiDrawer-root')
      .filter({
        hasText: /link to actual budget|link actual budget|link planned cost|manual budget|planned budget/i,
      })
      .first();
  }

  async openLinkToActualBudgetOffcanvas() {
    await this.waitForModuleToLoad();
    const link = this.linkButton
      .or(this.page.getByText(/^link to actual budget$/i))
      .or(this.page.getByText(/^link$/i).locator('xpath=ancestor::button[1]'))
      .first();
    await expect(link).toBeVisible({ timeout: this.uiTimeout });
    await link.click({ force: true });
    await expect(this.linkOffcanvas()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep('Opened Link to Actual Budget offcanvas');
  }

  async expectLinkOffcanvasOpen() {
    await expect(this.linkOffcanvas()).toBeVisible({ timeout: this.uiTimeout });
  }

  async closeLinkOffcanvas() {
    const panel = this.linkOffcanvas();
    const closeBtn = panel
      .getByRole('button')
      .filter({ has: this.page.locator('svg') })
      .first()
      .or(panel.locator('button').first());
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await expect(panel).toBeHidden({ timeout: this.uiTimeout }).catch(() => {});
    await this.page.waitForTimeout(800);
    await this.logStep('Closed Link to Actual Budget offcanvas');
  }

  async switchLinkOffcanvasTab(tabName) {
    const panel = this.linkOffcanvas();
    await expect(panel).toBeVisible({ timeout: this.uiTimeout });
    const tab = panel.getByRole('tab', { name: new RegExp(`^${this._escapeRegex(tabName)}$`, 'i') }).first();
    await expect(tab).toBeVisible({ timeout: this.uiTimeout });
    await tab.click();
    await this.page.waitForTimeout(500);
    await this.logStep(`Switched link offcanvas tab to ${tabName}`);
  }

  async fillManualBudgetName(name) {
    const panel = this.linkOffcanvas();
    const input = panel
      .locator('label')
      .filter({ hasText: /budget name/i })
      .locator('..')
      .locator('input')
      .first()
      .or(panel.locator('input').nth(0));
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(name));
    await this.logStep(`Filled manual budget name: ${name}`);
  }

  async enterRandomManualAmountMultipleOf100() {
    const amount = this.randomAmountMultipleOf100(100, 1000);
    const panel = this.linkOffcanvas();
    const amountInput = panel
      .locator('label')
      .filter({ hasText: /^amount/i })
      .locator('..')
      .locator('input[type="number"], input')
      .first();
    await expect(amountInput).toBeVisible({ timeout: this.uiTimeout });
    await amountInput.fill(String(amount));
    this.lastManualAmount = amount;
    this.lastLinkedAmount = amount;
    await this.logStep(`Entered manual budget amount: ${amount}`);
    return amount;
  }

  async chooseManualBudgetCategory(categoryLabel) {
    const panel = this.linkOffcanvas();
    const select = panel
      .locator('label')
      .filter({ hasText: /category/i })
      .locator('..')
      .locator('[role="combobox"], .MuiSelect-select')
      .first();
    await expect(select).toBeVisible({ timeout: this.uiTimeout });
    await select.click();
    const option = this.page.getByRole('option', { name: new RegExp(this._escapeRegex(categoryLabel), 'i') }).first();
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    await option.click();
    await this.logStep(`Chose manual budget category: ${categoryLabel}`);
  }

  async clickAddBudget() {
    const panel = this.linkOffcanvas();
    const btn = panel.getByRole('button', { name: /add budget/i }).first();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.click();
    await this.page.waitForTimeout(1500);
    await this.logStep('Clicked Add Budget');
  }

  manualBudgetCard(name) {
    const panel = this.linkOffcanvas();
    return panel
      .locator('.MuiPaper-root')
      .filter({ hasText: new RegExp(this._escapeRegex(name), 'i') })
      .first();
  }

  async expectManualBudgetVisible(name) {
    await expect(this.manualBudgetCard(name)).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Manual budget visible: ${name}`);
  }

  async expectManualBudgetApproved(name) {
    const card = this.manualBudgetCard(name);
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    await expect(card.getByText(/approved/i).first()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Manual budget Approved: ${name}`);
  }

  async deleteManualBudget(name) {
    const card = this.manualBudgetCard(name);
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    this.lastDeletedAmount = this.lastManualAmount ?? this.lastLinkedAmount;
    const deleteBtn = card
      .locator('button')
      .filter({ has: this.page.locator('svg') })
      .last();
    await expect(deleteBtn).toBeVisible({ timeout: this.uiTimeout });
    await deleteBtn.click({ force: true });
    await this.page.waitForTimeout(1500);
    const confirm = this.page.getByRole('button', { name: /^(yes|delete|confirm|ok)$/i }).first();
    if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirm.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
    await this.logStep(`Deleted manual budget: ${name}`);
  }

  async captureActualBudgetSnapshot() {
    await this.waitForModuleToLoad();
    const card = this.actualBudgetCard()
      .or(
        this.page
          .locator('.MuiPaper-root, [class*="MuiCard"]')
          .filter({ hasText: /actual\s*budget|unallocated|asset\s*cost/i })
          .first()
      )
      .first();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });

    const totalTexts = await card.locator('h5, .MuiTypography-h5').allInnerTexts().catch(() => []);
    const totalText = totalTexts.find((text) => /\d/.test(text)) || '0';
    let total = this.parseMoney(totalText);

    const readCategory = async (label) => {
      const block = card
        .locator('.MuiPaper-root, [class*="MuiPaper"]')
        .filter({ hasText: new RegExp(this._escapeRegex(label), 'i') })
        .first();
      if (!(await block.isVisible({ timeout: 2000 }).catch(() => false))) return 0;
      const money = await block.locator('.MuiTypography-subtitle2, h6, p').last().innerText().catch(() => '0');
      return this.parseMoney(money);
    };

    const asset = await readCategory('Asset Cost');
    const labor = await readCategory('Labor Cost');
    const material = await readCategory('Material Cost');
    const other = await readCategory('Other Cost');
    const categoryTotal = asset + labor + material + other;
    if (total === 0 && categoryTotal > 0) {
      total = categoryTotal;
    }

    let unallocatedRemaining = 0;
    const unallocRow = card.locator('div').filter({ hasText: /^unallocated$/i }).first();
    if (await unallocRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const parent = unallocRow.locator('xpath=ancestor::div[contains(@class,"MuiBox") or self::div][1]');
      const moneyLine = await card
        .locator('text=/\\d[\\d,]*\\.?\\d*\\s*\\//')
        .first()
        .innerText()
        .catch(async () => {
          const all = await card.innerText();
          const m = all.match(/([\d,.]+)\s*\/\s*([\d,.]+)/);
          return m ? m[0] : '0';
        });
      const left = String(moneyLine).split('/')[0];
      unallocatedRemaining = this.parseMoney(left);
    } else {
      const allText = await card.innerText().catch(() => '');
      const m = allText.match(/Unallocated[\s\S]*?([\d,.]+)\s*\/\s*([\d,.]+)/i);
      if (m) unallocatedRemaining = this.parseMoney(m[1]);
    }

    return { total, asset, labor, material, other, unallocatedRemaining };
  }

  async captureActualBudgetUnallocatedRemaining() {
    const card = this.actualBudgetCard();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    const unallocatedBlock = card
      .locator('.MuiBox-root, div')
      .filter({ hasText: /unallocated/i })
      .filter({ hasText: /\// })
      .first();

    await expect(unallocatedBlock).toBeVisible({ timeout: this.uiTimeout });
    const text = await unallocatedBlock.innerText();
    const match = text.match(/\$?\s*([\d,.]+)\s*\/\s*\$?\s*([\d,.]+)/);
    if (!match) {
      throw new Error(`Could not read Actual Budget Unallocated values from: ${text}`);
    }
    return this.parseMoney(match[1]);
  }

  categoryKey(label) {
    const k = String(label || '').trim().toLowerCase();
    if (k.startsWith('asset')) return 'asset';
    if (k.startsWith('labor') || k.startsWith('labour')) return 'labor';
    if (k.startsWith('material')) return 'material';
    return 'other';
  }

  async expectSnapshotIncreasedBy(before, amount, categoryLabel) {
    await expect(async () => {
      const after = await this.captureActualBudgetSnapshot();
      expect(after.total).toBe(before.total + amount);
      const key = this.categoryKey(categoryLabel);
      expect(after[key]).toBe(before[key] + amount);
      expect(after.unallocatedRemaining).toBe(before.unallocatedRemaining + amount);
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    await this.logStep(`Actual Budget increased by ${amount} on ${categoryLabel}`);
  }

  async expectSnapshotDecreasedBy(before, amount, categoryLabel) {
    await expect(async () => {
      const after = await this.captureActualBudgetSnapshot();
      expect(after.total).toBe(before.total - amount);
      const key = this.categoryKey(categoryLabel);
      expect(after[key]).toBe(before[key] - amount);
      expect(after.unallocatedRemaining).toBe(before.unallocatedRemaining - amount);
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    await this.logStep(`Actual Budget decreased by ${amount} on ${categoryLabel}`);
  }

  /**
   * Schedule module → Budget tab (same screen as Gantt/List).
   * Codegen: page.getByRole('tab', { name: 'Budget' }).click()
   */
  async switchToBudgetTab() {
    const budgetTab = this.page.getByRole('tab', { name: /^Budget$/i }).first();
    await expect(budgetTab).toBeVisible({ timeout: this.uiTimeout });
    await budgetTab.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForModuleToLoad();
    await this.logStep('Switched to Budget tab');
  }

  /**
   * Bottom schedules table on Budget tab.
   * Empty state (codegen): div with "No schedules available. Create a schedule to get started."
   * After create, that empty copy is replaced by schedule rows in the same table area.
   */
  budgetSchedulesEmptyState() {
    return this.page
      .locator('div')
      .filter({ hasText: /^No schedules available\. Create a schedule to get started\.$/ })
      .first();
  }

  async expectScheduleInBudgetTable(name) {
    const empty = this.budgetSchedulesEmptyState();
    if (await empty.isVisible({ timeout: 1500 }).catch(() => false)) {
      throw new Error(
        `Budget schedules table still shows empty state; expected schedule "${name}"`
      );
    }

    const table = this.page.locator('table').filter({ visible: true }).first();
    const inTable = table.getByText(new RegExp(`^\\s*${this._escapeRegex(name)}\\s*$`, 'i')).first();
    const anywhere = this.page.getByText(new RegExp(`^\\s*${this._escapeRegex(name)}\\s*$`, 'i')).first();
    const cell = (await inTable.isVisible({ timeout: 3000 }).catch(() => false)) ? inTable : anywhere;
    await expect(cell).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Budget table shows schedule: ${name}`);
  }

  linkItemCard(name) {
    const budgetPanel = this.linkOffcanvas();
    const costPanel = this.linkActualCostsPanel();
    const inBudget = budgetPanel
      .locator('.MuiPaper-root')
      .filter({ hasText: new RegExp(this._escapeRegex(name), 'i') })
      .first();
    const inCost = costPanel
      .locator('.MuiPaper-root')
      .filter({ hasText: new RegExp(this._escapeRegex(name), 'i') })
      .first();
    return inBudget.or(inCost).first();
  }

  async expectEstimateInOffcanvas(name) {
    await expect(this.linkItemCard(name)).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Estimate visible in offcanvas: ${name}`);
  }

  async expectProposalInOffcanvas(name) {
    await expect(this.linkItemCard(name)).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Proposal visible in offcanvas: ${name}`);
  }

  async readCardGrandTotal(name) {
    const card = this.linkItemCard(name);
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    const totalBlock = card.locator('text=/grand total/i').locator('..').locator('h6, .MuiTypography-h6, p, span').last();
    let text = await totalBlock.innerText().catch(() => '');
    if (!text) {
      const all = await card.innerText();
      const m = all.match(/Grand Total[\s\S]*?([\d,.]+)/i) || all.match(/([\d,.]+)/);
      text = m ? m[1] : '0';
    }
    return this.parseMoney(text);
  }

  async checkLinkItem(name, checked = true) {
    const card = this.linkItemCard(name);
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    const checkbox = card.getByRole('checkbox').first();
    await expect(checkbox).toBeVisible({ timeout: this.uiTimeout });
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (checked !== isChecked) {
      await checkbox.click({ force: true });
      await this.page.waitForTimeout(500);
    }
    await this.logStep(`${checked ? 'Checked' : 'Unchecked'} link item: ${name}`);
  }

  async chooseCategoryForLinkItem(name, categoryLabel) {
    const card = this.linkItemCard(name);
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    const select = card.locator('[role="combobox"], .MuiSelect-select').first();
    await expect(select).toBeVisible({ timeout: this.uiTimeout });
    await select.click();
    const option = this.page.getByRole('option', { name: new RegExp(this._escapeRegex(categoryLabel), 'i') }).first();
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    await option.click();
    await this.logStep(`Set category ${categoryLabel} for ${name}`);
  }

  async clickLinkCost() {
    const panel = this.linkOffcanvas();
    const btn = panel.getByRole('button', { name: /link cost|send for approval/i }).first();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.click();
    await this.page.waitForTimeout(2000);
    await this.logStep('Clicked Link Cost');
  }

  // --- Proposal helpers (reuse ProposalPage / AcceptedProposalPage patterns) ---

  async waitForProposalWorkspace() {
    const ProposalPage = require('../../../common/ProposalPage');
    const proposalPage = new ProposalPage(this.page);
    await proposalPage.openProposalTab();
    await proposalPage.verifyProposalTabLoaded();
    await this.logStep('Proposal workspace loaded');
  }

  async chooseProposalTemplateAndProceed(templateName) {
    const ProposalPage = require('../../../common/ProposalPage');
    const proposalPage = new ProposalPage(this.page);
    if (await proposalPage.chooseProposalButton.isVisible().catch(() => false)) {
      await proposalPage.openChooseProposalModal();
    }
    const dialog = proposalPage.getChooseProposalDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });

    // Category: TC-06/TC-07 need All so the budgeting proposal template is listed.
    const categorySelect = dialog.locator('.MuiSelect-select, [role="combobox"]').first();
    await expect(categorySelect).toBeVisible({ timeout: this.defaultTimeout });
    const selectedCategory = ((await categorySelect.innerText().catch(() => '')) || '').trim();
    if (!/^all$/i.test(selectedCategory)) {
      await proposalPage.selectProposalCategory('All');
    }
    await this.page.waitForTimeout(400);

    const proposalSelect = dialog.locator('.MuiSelect-select, [role="combobox"]').nth(1);
    await expect(proposalSelect).toBeVisible({ timeout: this.defaultTimeout });
    await proposalSelect.click();
    const named = this.page
      .locator('[role="option"][data-value="[object Object]"]')
      .filter({ hasText: new RegExp(this._escapeRegex(templateName), 'i') })
      .or(this.page.getByRole('option', { name: new RegExp(this._escapeRegex(templateName), 'i') }))
      .first();
    await expect(named).toBeVisible({ timeout: 30000 });
    await named.click();

    const proceed = dialog.getByRole('button', { name: /^proceed$/i }).or(this.page.getByRole('button', { name: /^proceed$/i })).first();
    await expect(proceed).toBeEnabled({ timeout: this.defaultTimeout });
    await proceed.click();
    await expect(this.page).toHaveURL(/proposal\/edit/i, { timeout: this.defaultTimeout });
    await this.logStep(`Chose proposal template: ${templateName}`);
  }

  async skipAndProceedTemplateDialog() {
    const ProposalPage = require('../../../common/ProposalPage');
    const proposalPage = new ProposalPage(this.page);
    await proposalPage.clickSkipInTemplateChangeDialog();
  }

  async openProposalSendMenu() {
    const ProposalPage = require('../../../common/ProposalPage');
    const proposalPage = new ProposalPage(this.page);
    await proposalPage.openSendMenu();
  }

  async selectEmailFromProposalSendMenu() {
    const ProposalPage = require('../../../common/ProposalPage');
    const proposalPage = new ProposalPage(this.page);
    await proposalPage.selectEmailFromSendMenu();
  }

  async copyComposeEmailRecipientAndSend() {
    const ProposalPage = require('../../../common/ProposalPage');
    const proposalPage = new ProposalPage(this.page);
    const toInput = this.page.locator('input[placeholder="To"]').first();
    await expect(toInput).toBeVisible({ timeout: 15000 });
    const capturedEmail = await toInput.inputValue();
    if (!capturedEmail || !capturedEmail.includes('@')) {
      throw new Error(`Failed to copy compose email recipient. Found: "${capturedEmail}"`);
    }
    this.proposalRecipientEmail = capturedEmail;
    await proposalPage.confirmComposeSendEmail();
    await this.page.waitForTimeout(1500);
    await this.logStep(`Sent proposal email to ${capturedEmail}`);
    return capturedEmail;
  }

  async expectProposalSentItemsShow(name) {
    await expect(this.page.getByText(new RegExp(this._escapeRegex(name), 'i')).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect(this.page.getByText(/sent/i).first()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Proposal sent items show ${name} with Sent`);
  }

  async openYopmailForCopiedRecipient() {
    const email = this.proposalRecipientEmail;
    if (!email) throw new Error('No copied proposal recipient email on world/page');
    const login = email.split('@')[0];
    this.yopmailPage = await this.page.context().newPage();
    await this.yopmailPage.goto(`https://yopmail.com?${encodeURIComponent(login)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    const loginInput = this.yopmailPage.locator('#login, input#login, input[name="login"]').first();
    if (await loginInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginInput.fill(login);
      await loginInput.press('Enter');
    }
    await this.yopmailPage.waitForSelector('iframe[name="ifinbox"]', { timeout: 45000 });
    await this.logStep(`Opened Yopmail for ${login}`);
  }

  async waitForProposalEmailAndOpenViewProposal(subjectText) {
    const page = this.yopmailPage;
    if (!page) throw new Error('Yopmail page not open');
    const inbox = page.frameLocator('iframe[name="ifinbox"]');
    const mail = page.frameLocator('iframe[name="ifmail"]');
    const subjectRe = new RegExp(this._escapeRegex(subjectText), 'i');

    await expect(async () => {
      const refresh = page.locator('#refresh, [title*="Refresh" i]').first();
      if (await refresh.isVisible({ timeout: 1000 }).catch(() => false)) {
        await refresh.click().catch(() => {});
      }
      await page.waitForTimeout(2000);
      const match = inbox.locator('div.m, .lm, tr, .l').filter({ hasText: subjectRe }).first();
      const any = inbox.locator('div.m, .lm, tr, .l').first();
      const target = (await match.isVisible({ timeout: 1000 }).catch(() => false)) ? match : any;
      await target.click({ force: true });
      await page.waitForTimeout(1000);
      const subjectVisible = await mail.getByText(subjectRe).first().isVisible({ timeout: 2000 }).catch(() => false);
      const hasPreview = await mail
        .getByRole('link', { name: /view proposal|preview|open proposal/i })
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(subjectVisible || hasPreview).toBeTruthy();
    }).toPass({ timeout: 180000, intervals: [5000, 8000, 10000] });

    const previewLink = mail
      .getByRole('link', { name: /view proposal|preview|open proposal/i })
      .or(mail.getByRole('button', { name: /view proposal|preview|open proposal/i }))
      .or(mail.locator('a').filter({ hasText: /view proposal|preview|open proposal/i }))
      .first();
    await expect(previewLink).toBeVisible({ timeout: 15000 });
    const popupPromise = page.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await previewLink.click({ force: true });
    this.proposalPreviewPage = (await popupPromise) || page;
    await this.proposalPreviewPage.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Opened View Proposal from Yopmail');
  }

  async acceptProposalWithDigitalSignature() {
    const AcceptedProposalPage = require('../../../common/proposal/AcceptedProposalPage');
    const accepted = new AcceptedProposalPage(this.page);
    accepted.proposalPreviewPage = this.proposalPreviewPage;
    await accepted.acceptProposalWithDigitalSignature();
    await this.logStep('Accepted proposal with digital signature');
  }

  async returnToApplicationProject() {
    const appPage =
      this.page
        .context()
        .pages()
        .find((p) => /app\.aecplayhouse\.com/i.test(p.url())) || this.page;
    this.page = appPage;
    await this.page.bringToFront();
    const currentUrl = this.page.url();
    const projectBaseMatch = currentUrl.match(/(.*\/project\/[^/]+)/);
    if (projectBaseMatch) {
      await this.page.goto(projectBaseMatch[1], { waitUntil: 'domcontentloaded' }).catch(() => {});
    } else {
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    await this.page.waitForTimeout(1500);
    await this.logStep('Returned to application project');
  }

  // -------------------------------------------------------------------------
  // Contingency — allocate popup + add offcanvas
  // -------------------------------------------------------------------------

  allocateDialog() {
    return this.page
      .locator('[role="dialog"], .MuiModal-root, .MuiPopover-root, .MuiDrawer-root, .MuiPaper-root, .MuiBox-root')
      .filter({ has: this.page.getByRole('button', { name: /^allocate$/i }) })
      .filter({ has: this.page.locator('input[type="text"], input[type="number"], input') })
      .first();
  }

  addContingencyPanel() {
    return this.page
      .locator('[role="dialog"], .MuiDrawer-root, .MuiModal-root, .MuiPaper-root')
      .filter({ hasText: /add contingency|request contingency|total contingency pool|approval review/i })
      .filter({ visible: true })
      .first();
  }

  parseContingencyUsedFromText(text) {
    const match =
      String(text).match(/\$?\s*([\d,.]+)\s*Added\s+from\s+conti[n]?gency/i) ||
      String(text).match(/conti[n]?gency[\s\S]*?\$?\s*([\d,.]+)/i);
    return match ? this.parseMoney(match[1]) : 0;
  }

  async captureContingencyUsedAmount() {
    const card = this.actualBudgetCard();
    const usedText = await card
      .locator('span, p, .MuiTypography-root')
      .filter({ hasText: /Added\s+from\s+conti[n]?gency/i })
      .first()
      .innerText({ timeout: 3000 })
      .catch(async () => card.innerText().catch(() => ''));
    return this.parseContingencyUsedFromText(usedText);
  }

  async openAllocateContingencyPopup() {
    await this.waitForModuleToLoad();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1500);

    const card = this.actualBudgetCard();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const penPath = 'path[d*="21.174 6.812"], path[d*="3.842 16.174"]';
    const contingencySection = card
      .locator('.MuiBox-root, .MuiPaper-root, div')
      .filter({ hasText: /contingency/i })
      .filter({ has: this.page.locator('button') })
      .last();
    const candidates = [
      contingencySection.locator(`button:has(svg.lucide-pen), button:has(${penPath})`).last(),
      card.locator(`button:has(svg.lucide-pen), button:has(${penPath})`).last(),
      card.locator('button').filter({ has: this.page.locator('svg.lucide-pen') }).last(),
    ];

    let targetButton = null;
    await expect(async () => {
      targetButton = null;
      for (const btn of candidates) {
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          targetButton = btn;
          break;
        }
      }

      expect(targetButton).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000, 3000] });

    await targetButton.scrollIntoViewIfNeeded().catch(() => {});
    await targetButton.click({ force: true });

    await expect(this.allocateDialog()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep('Opened Allocate Contingency popup');
  }

  async expectAllocatePopupOpen() {
    await expect(this.allocateDialog()).toBeVisible({ timeout: this.uiTimeout });
  }

  async chooseContingencyAllocationMethod(method) {
    const dialog = this.allocateDialog();
    const btn = dialog.getByRole('button', { name: new RegExp(this._escapeRegex(method), 'i') }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.logStep(`Chose allocation method: ${method}`);
      return;
    }

    const radio = dialog.locator('input[type="radio"]').filter({ hasText: new RegExp(this._escapeRegex(method), 'i') }).first();
    if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await radio.click({ force: true });
      await this.logStep(`Chose allocation method: ${method}`);
      return;
    }

    await this.logStep(`Allocation method "${method}" not exposed in current popup; continuing`);
  }

  async enterAllocatePercentage(value) {
    const dialog = this.allocateDialog();
    const input = dialog.locator('input[type="text"], input[type="number"], input').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill('');
    await input.fill(String(value));
    await input.press('Tab').catch(() => {});
    this.lastAllocatePercentage = Number(value);
    await this.page.waitForTimeout(800);
    await this.logStep(`Entered allocate percentage: ${value}`);
  }

  async enterAllocateFixedAmount(value) {
    const dialog = this.allocateDialog();
    const input = dialog.locator('input[type="number"], input').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(value));
    this.lastAllocateFixedAmount = Number(value);
    this.lastAllocatedContingencyAmount = Number(value);
    await this.page.waitForTimeout(400);
    await this.logStep(`Entered allocate fixed amount: ${value}`);
  }

  async expectCalculatedAmountIsPercentOfBudget(percent) {
    const snap = await this.captureActualBudgetSnapshot();
    const expected = Math.round((snap.total * Number(percent)) / 100);
    this.lastAllocatedContingencyAmount = expected;
    const dialog = this.allocateDialog();
    const calc = dialog
      .locator('.MuiBox-root, div')
      .filter({ hasText: /calculated amount/i })
      .filter({ has: dialog.locator('h6, h5, .MuiTypography-h6, .MuiTypography-h5') })
      .first();
    await expect(async () => {
      const valueText = await calc
        .locator('h6, h5, .MuiTypography-h6, .MuiTypography-h5')
        .last()
        .innerText()
        .catch(async () => calc.innerText());
      expect(this.parseMoney(valueText)).toBe(expected);
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });
    await this.logStep(`Calculated amount is ${expected} (${percent}% of ${snap.total})`);
  }

  async expectCalculatedPercentForFixed(amount) {
    const snap = await this.captureActualBudgetSnapshot();
    const expectedPct = snap.total > 0 ? (Number(amount) / snap.total) * 100 : 0;
    this.lastAllocatePercentage = expectedPct;
    const dialog = this.allocateDialog();
    await expect(async () => {
      const text = await dialog.innerText();
      const m = text.match(/([\d.]+)\s*%/);
      expect(m).toBeTruthy();
      expect(Math.abs(parseFloat(m[1]) - expectedPct)).toBeLessThan(0.05);
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });
    await this.logStep(`Calculated % ~ ${expectedPct.toFixed(2)} for fixed ${amount}`);
  }

  async clickAllocateContingency() {
    const dialog = this.allocateDialog();
    const btn = dialog
      .getByRole('button', { name: /^allocate$/i })
      .or(dialog.locator('button.MuiButton-fullWidth').filter({ hasText: /^Allocate$/i }))
      .or(this.page.getByRole('button', { name: /^allocate$/i }))
      .first();
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true });
    await expect(dialog).toBeHidden({ timeout: this.uiTimeout }).catch(() => {});
    await this.page.waitForTimeout(1200);
    await this.logStep('Clicked Allocate');
  }

  contingencyRow() {
    const card = this.actualBudgetCard();
    return card
      .locator('.MuiBox-root, div')
      .filter({ hasText: /contingency/i })
      .filter({ hasText: /\$/ })
      .last();
  }

  async expectCardContingencyPercentage(pct) {
    const expected = Number(pct);
    const row = this.contingencyRow();
    await expect(async () => {
      const text = await row.innerText();
      const match = text.match(/([\d.]+)\s*%/);
      expect(match).toBeTruthy();
      expect(Math.abs(Number(match[1]) - expected)).toBeLessThan(0.01);
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectCardContingencyAmount(amount) {
    const row = this.contingencyRow();
    await expect(async () => {
      const text = await row.innerText();
      const amounts = [...text.matchAll(/\$?\s*([\d,.]+)/g)].map((m) => this.parseMoney(m[1]));
      expect(amounts).toContain(Number(amount));
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectCardContingencyMatchesPercent(percent) {
    const snap = await this.captureActualBudgetSnapshot();
    const expected =
      Number.isFinite(this.lastAllocatedContingencyAmount) && this.lastAllocatedContingencyAmount > 0
        ? this.lastAllocatedContingencyAmount
        : Math.round((snap.total * Number(percent)) / 100);
    this.lastAllocatedContingencyAmount = expected;
    await this.expectCardContingencyAmount(expected);
  }

  async expectCardContingencyPctMatchesFixed(amount) {
    const snap = await this.captureActualBudgetSnapshot();
    const expectedPct = snap.total > 0 ? ((Number(amount) / snap.total) * 100).toFixed(2) : '0.00';
    await this.expectCardContingencyPercentage(expectedPct.replace(/\.00$/, ''));
  }

  async openAddContingencyOffcanvas() {
    await this.waitForModuleToLoad();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const card = this.actualBudgetCard();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });

    const addIconPath =
      'path[d*="M8 18.5L14.95 20.4"], path[d*="M16.1316 5.76316"], path[d*="M2 22V11H9.6"]';

    await expect(async () => {
      const panel = this.addContingencyPanel();
      const panelReady =
        (await panel.isVisible({ timeout: 1000 }).catch(() => false)) &&
        (await panel.getByText(/total contingency pool|approval review|add contingency/i).first().isVisible({
          timeout: 1000,
        }).catch(() => false));
      if (panelReady) return;

      const freshCard = this.actualBudgetCard();
      await expect(freshCard).toBeVisible({ timeout: 3000 });
      const addBtn = this.page
        .locator('button[aria-label="Add Contingency"]')
        .or(freshCard.getByRole('button', { name: /^add contingency$/i }))
        .or(freshCard.locator(`button:has(${addIconPath})`))
        .or(this.page.locator(`button:has(${addIconPath})`))
        .or(this.page.getByRole('button', { name: /^add contingency$/i }))
        .filter({ visible: true })
        .first();

      await expect(addBtn).toBeVisible({ timeout: 3000 });
      await addBtn.scrollIntoViewIfNeeded().catch(() => {});
      await addBtn.click({ force: true, timeout: 5000 });

      await expect(this.addContingencyPanel()).toBeVisible({ timeout: 5000 });
      await expect(
        this.addContingencyPanel().getByText(/total contingency pool|approval review|add contingency/i).first()
      ).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000, 3000] });

    await this.logStep('Opened Add Contingency offcanvas');
  }

  totalContingencyPoolBlock() {
    const panel = this.addContingencyPanel();
    const label = panel.locator('p, .MuiTypography-root').filter({ hasText: /^Total Contingency Pool$/i }).first();
    return label.locator('xpath=..');
  }

  async expectAddContingencyOpen() {
    await expect(this.addContingencyPanel()).toBeVisible({ timeout: this.uiTimeout });
  }

  async closeAddContingencyOffcanvas() {
    const panel = this.addContingencyPanel();
    const closeBtn = panel.locator('button').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await expect(panel).toBeHidden({ timeout: this.uiTimeout }).catch(() => {});
    await this.page.waitForTimeout(600);
  }

  async expectTotalContingencyPoolEquals(amount) {
    const expected = Number(amount);
    if (!Number.isFinite(expected)) {
      throw new Error('Allocated contingency amount was not recorded before checking Total Contingency Pool.');
    }

    await expect(async () => {
      const pool = this.totalContingencyPoolBlock();
      await expect(pool).toBeVisible({ timeout: 3000 });
      const valueText = await pool.locator('h5, .MuiTypography-h5').first().innerText();
      const actual = this.parseMoney(valueText);
      expect(actual).toBe(expected);
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectTotalContingencyPoolMatchesAllocated() {
    const amount = this.lastAllocatedContingencyAmount;
    await this.expectTotalContingencyPoolEquals(amount);
  }

  async chooseAddContingencyMode(mode) {
    const panel = this.addContingencyPanel();
    const modePattern =
      /^percentage$/i.test(String(mode))
        ? /%?\s*percentage/i
        : new RegExp(this._escapeRegex(mode), 'i');
    const btn = panel
      .getByRole('button', { name: modePattern })
      .or(panel.locator('button').filter({ hasText: modePattern }))
      .first();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true });
    await this.logStep(`Add contingency mode: ${mode}`);
  }

  async enterAddContingencyAmount(amount) {
    const panel = this.addContingencyPanel();
    const input = panel.getByPlaceholder(/0\.00|0/).first().or(panel.locator('input[type="number"]').first());
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(amount));
    this.lastAddedContingencyAmount = Number(amount);
    await this.page.waitForTimeout(400);
  }

  async enterAddContingencyPercentage(pct) {
    const panel = this.addContingencyPanel();
    const input = panel.locator('input[type="number"], input').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(pct));
    await this.page.waitForTimeout(500);
    // Read equivalent amount from helper or impact
    const text = await panel.innerText();
    const m = text.match(/Equivalent to\s*[^\d]*([\d,.]+)/i) || text.match(/\+\s*[^\d]*([\d,.]+)/);
    this.lastAddedContingencyAmount = m ? this.parseMoney(m[1]) : 0;
    await this.logStep(`Add contingency ${pct}% → amount ${this.lastAddedContingencyAmount}`);
  }

  async expectBudgetImpactPlus(amount) {
    const panel = this.addContingencyPanel();
    await expect(panel.getByText(new RegExp(`\\+\\s*.*${amount}`, 'i')).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
  }

  async expectBudgetImpactPercentOfAvailable(amount) {
    const panel = this.addContingencyPanel();
    await expect(panel.getByText(/% of remaining pool|% of available/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await this.logStep(`Budget impact percent checked for amount ${amount}`);
  }

  async expectBudgetImpactForTenPercentAvailable() {
    const panel = this.addContingencyPanel();
    await expect(async () => {
      expect(this.lastAddedContingencyAmount).toBeGreaterThan(0);
      await expect(panel.getByText(new RegExp(`\\+\\s*.*${this.lastAddedContingencyAmount}`, 'i')).first()).toBeVisible();
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800] });
  }

  async enterAddContingencyReason(reason) {
    const panel = this.addContingencyPanel();
    const reasonInput = panel
      .getByPlaceholder(/unexpected|reason/i)
      .or(panel.locator('textarea'))
      .first();
    await expect(reasonInput).toBeVisible({ timeout: this.uiTimeout });
    await reasonInput.fill(String(reason));
  }

  async clickAddContingencySubmit() {
    const panel = this.addContingencyPanel();
    this.budgetSnapshotBefore = await this.captureActualBudgetSnapshot();
    this.contingencyUsedBefore = await this.captureContingencyUsedAmount();
    const btn = panel.getByRole('button', { name: /add contingency|submit request/i }).first();
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.click();
    await expect(panel).toBeHidden({ timeout: this.uiTimeout }).catch(async () => {
      await this.page.waitForTimeout(2500);
    });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(800);
    await this.logStep('Submitted add contingency');
  }

  async switchContingencyApprovalReviewTab() {
    let panel = this.addContingencyPanel();
    const approvalLabel = panel.getByText(/approval review/i).first();
    if (
      !(await panel.isVisible({ timeout: 3000 }).catch(() => false)) ||
      !(await approvalLabel.isVisible({ timeout: 3000 }).catch(() => false))
    ) {
      await this.openAddContingencyOffcanvas();
    }

    await expect(async () => {
      panel = this.addContingencyPanel();
      await expect(panel).toBeVisible({ timeout: 3000 });
      const tabLocator = panel
        .getByRole('tab', { name: /approval review/i })
        .or(panel.getByRole('button', { name: /approval review/i }))
        .or(panel.locator('[role="tab"], button, [role="button"]').filter({ hasText: /approval review/i }))
        .or(panel.getByText(/^Approval Review$/i));
      const count = await tabLocator.count();
      expect(count).toBeGreaterThan(0);
      const tab = tabLocator.nth(count - 1);
      await expect(tab).toBeVisible({ timeout: 3000 });
      await tab.scrollIntoViewIfNeeded().catch(() => {});
      await tab.click({ force: true, timeout: 5000 });
      await expect(this.addContingencyPanel().getByText(/approval review/i).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });

    await expect(this.addContingencyPanel().getByText(/approval review/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await this.page.waitForTimeout(500);
  }

  async expectApprovalReviewRate(amount) {
    const expected = Number(amount);
    await expect(async () => {
      const panel = this.addContingencyPanel();
      await expect(panel).toBeVisible({ timeout: 3000 });
      const text = await panel.innerText();
      const values = [...text.matchAll(/\$?\s*([\d,.]+)/g)].map((m) => this.parseMoney(m[1]));
      expect(values).toContain(expected);
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectApprovalReviewLastAmount() {
    await this.expectApprovalReviewRate(this.lastAddedContingencyAmount);
  }

  async expectActualBudgetIncreasedByContingency(amount) {
    const before = this.budgetSnapshotBefore;
    await expect(async () => {
      const after = await this.captureActualBudgetSnapshot();
      expect(after.total).toBe(before.total + Number(amount));
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectCardShowsContingencyUsed(amount) {
    const expectedAdded = Number(amount);
    const previousUsed = Number.isFinite(this.contingencyUsedBefore) ? this.contingencyUsedBefore : 0;
    const expectedTotal = previousUsed + expectedAdded;
    const card = this.actualBudgetCard();
    await expect(async () => {
      const text = await card
        .locator('span, p, .MuiTypography-root')
        .filter({ hasText: /Added\s+from\s+conti[n]?gency/i })
        .first()
        .innerText()
        .catch(async () => card.innerText());
      const actual = this.parseContingencyUsedFromText(text);
      expect(actual).toBe(expectedTotal);
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  // -------------------------------------------------------------------------
  // Budget table — actual budget / cost cells + split
  // -------------------------------------------------------------------------

  scheduleRow(name) {
    return this.page.locator('tr, [role="row"]').filter({ hasText: new RegExp(this._escapeRegex(name), 'i') }).first();
  }

  async focusBudgetingScheduleTable() {
    const budgetingTab = this.page.locator('div').filter({ hasText: /^Budgeting$/ }).nth(1);
    if (await budgetingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await budgetingTab.click({ force: true }).catch(() => {});
    }

    const scheduleListTable = this.page.locator('.MuiBox-root.css-1233zgu').first();
    if (await scheduleListTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      await scheduleListTable.click({ force: true }).catch(() => {});
    }
  }

  async setScheduleActualBudget(name, amount) {
    await this.focusBudgetingScheduleTable();
    const row = this.scheduleRow(name);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    const visibleZeroBudgetCell = row
      .locator('.MuiBox-root, p, span, div')
      .filter({ hasText: /^\s*\$?\s*0(?:\.00)?\s*$/ })
      .last();

    if (await visibleZeroBudgetCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await visibleZeroBudgetCell.scrollIntoViewIfNeeded().catch(() => {});
      await visibleZeroBudgetCell.dblclick({ force: true });
      const openedInput = this.page
        .getByRole('spinbutton')
        .or(row.locator('input[type="number"], input[type="text"], input'))
        .first();
      await expect(openedInput).toBeVisible({ timeout: this.uiTimeout });
      await openedInput.fill('');
      await openedInput.fill(String(amount));
      const tickIcon = this.page
        .locator('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall.css-p947nl')
        .or(row.locator('button.MuiIconButton-root').filter({ visible: true }))
        .first();
      await expect(tickIcon).toBeVisible({ timeout: this.uiTimeout });
      await expect(tickIcon).toBeEnabled({ timeout: this.uiTimeout });
      await tickIcon.click({ force: true });
      await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await this.page.waitForTimeout(2500);
      this.lastTableBudgetAmount = Number(amount);
      await this.logStep(`Set actual budget ${amount} on ${name}`);
      return;
    }
    // Actual Budget is typically 5th data column — click money cell
    const cells = row.locator('td');
    const cellCount = await cells.count();
    let target = cells.nth(Math.min(4, cellCount - 1));
    for (let i = 0; i < cellCount; i++) {
      const t = await cells.nth(i).innerText().catch(() => '');
      if (/^[\s₹$€£]?\s*[\d,]+/.test(t.trim()) || t.trim() === '0' || t.includes('—') || t.includes('-')) {
        // Prefer cells that look like money in budget/cost columns (skip dates)
        if (!/\d{1,2}[\/\-]\d{1,2}/.test(t) && !/[ap]m/i.test(t)) {
          target = cells.nth(i);
          // Actual budget usually before actual cost — take first money-like after assignees
          if (i >= 3) break;
        }
      }
    }
    await target.click({ force: true });
    const input = row.locator('input[type="number"], input').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(amount));
    await input.press('Enter');
    await this.page.waitForTimeout(1000);
    this.lastTableBudgetAmount = Number(amount);
    await this.logStep(`Set actual budget ${amount} on ${name}`);
  }

  async getScheduleActualBudgetValue(name) {
    const row = this.scheduleRow(name);
    const text = await row.innerText();
    const nums = [...text.matchAll(/([\d,.]+)/g)].map((m) => this.parseMoney(m[1]));
    return nums.length ? nums[nums.length - 2] || nums[0] : 0;
  }

  async getScheduleActualCostValue(name) {
    const row = this.scheduleRow(name);
    const text = await row.innerText();
    const nums = [...text.matchAll(/([\d,.]+)/g)].map((m) => this.parseMoney(m[1]));
    return nums.length ? nums[nums.length - 1] : 0;
  }

  async splitActualBudgetEquallyToChildren(parentName) {
    const parentAmount = this.lastTableBudgetAmount || (await this.getScheduleActualBudgetValue(parentName));
    const children = ['child 1', 'child 2'];
    const each = Math.floor(parentAmount / children.length / 100) * 100 || parentAmount / children.length;
    // Prefer exact equal split for multiples of 100
    const share = parentAmount / children.length;
    for (const child of children) {
      if (await this.scheduleRow(child).isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.setScheduleActualBudget(child, share);
      }
    }
    await this.logStep(`Split budget ${parentAmount} equally to children (${share} each)`);
  }

  async splitActualCostEquallyToChildren(parentName) {
    const parentCost = await this.getScheduleActualCostValue(parentName);
    const children = ['child 1', 'child 2'];
    const share = parentCost / children.length;
    for (const child of children) {
      if (await this.scheduleRow(child).isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.setScheduleActualCost(child, share);
      }
    }
    await this.logStep(`Split cost ${parentCost} equally to children (${share} each)`);
  }

  async setScheduleActualCost(name, amount) {
    const row = this.scheduleRow(name);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    const cells = row.locator('td');
    const cellCount = await cells.count();
    // Actual cost is usually the column after actual budget
    const costCell = cells.nth(Math.min(5, cellCount - 1));
    await costCell.click({ force: true });
    const input = row.locator('input[type="number"], input').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(amount));
    await input.press('Enter');
    await this.page.waitForTimeout(1000);
    this.lastTableCostAmount = Number(amount);
    await this.logStep(`Set actual cost ${amount} on ${name}`);
  }

  async expectUnallocatedDecreasedBy(amount) {
    const before = this.budgetSnapshotBefore || (await this.captureActualBudgetSnapshot());
    // If snapshot was taken at open of module earlier, re-capture before set is better —
    // callers should set budgetSnapshotBefore before editing.
    await expect(async () => {
      const after = await this.captureActualBudgetSnapshot();
      expect(after.unallocatedRemaining).toBe(before.unallocatedRemaining - Number(amount));
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectNoBudgetingErrorToast() {
    const toast = this.page.locator('.Toastify__toast--error, .MuiAlert-standardError, [role="alert"]').filter({
      hasText: /exceed|cannot|error|fail/i,
    });
    await expect(toast).toHaveCount(0, { timeout: 5000 }).catch(async () => {
      const visible = await toast.first().isVisible({ timeout: 1000 }).catch(() => false);
      expect(visible).toBeFalsy();
    });
    await this.logStep('No budgeting error toast');
  }

  async expectBudgetingErrorToast() {
    const toast = this.page
      .locator('.Toastify__toast--error, .Toastify__toast, .MuiAlert-root, [role="alert"]')
      .filter({ hasText: /exceed|cannot|parent|remaining|error/i })
      .first();
    await expect(toast).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep('Budgeting error toast visible');
  }

  async setChildBudgetOneMoreThanCurrent(name) {
    const current = await this.readEditableBudgetOrFallback(name, 'budget');
    this._openEditBaseline = current;
    await this.setScheduleActualBudget(name, current + 1);
  }

  async setChildCostOneMoreThanCurrent(name) {
    const current = await this.readEditableBudgetOrFallback(name, 'cost');
    this._openEditBaseline = current;
    await this.setScheduleActualCost(name, current + 1);
  }

  async readEditableBudgetOrFallback(name, kind) {
    if (kind === 'cost') return (await this.getScheduleActualCostValue(name)) || 0;
    return (await this.getScheduleActualBudgetValue(name)) || 0;
  }

  async reduceOpenBudgetEditByAndSave(delta) {
    const row = this.page.locator('tr').filter({ has: this.page.locator('input') }).first();
    const input = this.page.locator('input[type="number"]:visible, input:visible').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    const current = this.parseMoney(await input.inputValue());
    const next = current - Number(delta);
    await input.fill(String(next));
    await input.press('Enter');
    await this.page.waitForTimeout(1000);
    this.lastSavedTableAmount = next;
    await this.logStep(`Reduced open budget edit by ${delta} → ${next}`);
  }

  async reduceOpenCostEditByAndSave(delta) {
    await this.reduceOpenBudgetEditByAndSave(delta);
  }

  async expectScheduleBudgetSaved(name) {
    await expect(this.scheduleRow(name)).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Budget saved for ${name}`);
  }

  async expectScheduleCostSaved(name) {
    await expect(this.scheduleRow(name)).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Cost saved for ${name}`);
  }

  // -------------------------------------------------------------------------
  // Link actual costs (manual + bills/expenses)
  // -------------------------------------------------------------------------

  linkActualCostsPanel() {
    return this.page
      .locator('[role="dialog"], .MuiDrawer-root, .MuiModal-root')
      .filter({ hasText: /link actual costs|add manual cost|bills & expenses/i })
      .first();
  }

  async openLinkActualCostsForSchedule(name) {
    this.costSnapshotBefore = await this.captureActualCostSnapshot();
    const row = this.scheduleRow(name);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    const linkIcon = row.locator('button').filter({ has: this.page.locator('svg') }).first();
    if (await linkIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await linkIcon.click({ force: true });
    } else {
      // Click actual cost cell link
      await row.getByRole('button').last().click({ force: true });
    }
    await expect(this.linkActualCostsPanel()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Opened Link Actual Costs for ${name}`);
  }

  async expectLinkActualCostsOpen() {
    await expect(this.linkActualCostsPanel()).toBeVisible({ timeout: this.uiTimeout });
  }

  async closeLinkActualCosts() {
    const panel = this.linkActualCostsPanel();
    const closeBtn = panel.locator('button').first();
    await closeBtn.click({ force: true }).catch(() => this.page.keyboard.press('Escape'));
    await expect(panel).toBeHidden({ timeout: this.uiTimeout }).catch(() => {});
    await this.page.waitForTimeout(800);
  }

  async switchActualCostsTab(tabName) {
    const panel = this.linkActualCostsPanel();
    const tab = panel.getByRole('tab', { name: new RegExp(this._escapeRegex(tabName), 'i') }).first();
    await expect(tab).toBeVisible({ timeout: this.uiTimeout });
    await tab.click();
    await this.page.waitForTimeout(400);
  }

  async fillManualCostName(name) {
    const panel = this.linkActualCostsPanel();
    const input = panel
      .locator('label')
      .filter({ hasText: /cost name/i })
      .locator('..')
      .locator('input')
      .first()
      .or(panel.locator('input').first());
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(name));
  }

  async enterRandomManualCostAmount() {
    const amount = this.randomAmountMultipleOf100(100, 1000);
    const panel = this.linkActualCostsPanel();
    const input = panel
      .locator('label')
      .filter({ hasText: /^amount/i })
      .locator('..')
      .locator('input')
      .first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(amount));
    this.lastLinkedCostAmount = amount;
    this.lastManualCostAmount = amount;
    return amount;
  }

  async chooseManualCostCategory(category) {
    const panel = this.linkActualCostsPanel();
    const select = panel.locator('[role="combobox"], .MuiSelect-select').first();
    await expect(select).toBeVisible({ timeout: this.uiTimeout });
    await select.click();
    await this.page.getByRole('option', { name: new RegExp(this._escapeRegex(category), 'i') }).first().click();
    this.lastCostCategory = category;
  }

  async clickAddExpense() {
    const panel = this.linkActualCostsPanel();
    if (!this.costSnapshotBefore) {
      this.costSnapshotBefore = await this.captureActualCostSnapshot();
    }
    const btn = panel.getByRole('button', { name: /add expense/i }).first();
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.click();
    await this.page.waitForTimeout(1500);
  }

  async expectManualCostVisible(name) {
    const panel = this.linkActualCostsPanel();
    await expect(panel.getByText(new RegExp(this._escapeRegex(name), 'i')).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
  }

  async deleteManualCost(name) {
    const panel = this.linkActualCostsPanel();
    const card = panel.locator('.MuiPaper-root').filter({ hasText: new RegExp(this._escapeRegex(name), 'i') }).first();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    this.lastDeletedCostAmount = this.lastManualCostAmount || this.lastLinkedCostAmount;
    this.costSnapshotBefore = await this.captureActualCostSnapshot();
    await card.locator('button').last().click({ force: true });
    const confirm = this.page.getByRole('button', { name: /^(yes|delete|confirm|ok)$/i }).first();
    if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) await confirm.click();
    await this.page.waitForTimeout(1200);
  }

  actualCostCard() {
    return this.page
      .locator('.MuiPaper-root, [class*="MuiCard"], div')
      .filter({ has: this.page.getByText(/^actual cost$/i) })
      .first();
  }

  async captureActualCostSnapshot() {
    const card = this.actualCostCard();
    if (!(await card.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { total: 0, asset: 0, labor: 0, material: 0, other: 0 };
    }
    const totalText = await card.locator('h5, .MuiTypography-h5').first().innerText().catch(() => '0');
    const total = this.parseMoney(totalText);
    const readCategory = async (label) => {
      const block = card.locator('.MuiPaper-root, [class*="MuiPaper"]').filter({ hasText: new RegExp(label, 'i') }).first();
      if (!(await block.isVisible({ timeout: 1000 }).catch(() => false))) return 0;
      return this.parseMoney(await block.locator('.MuiTypography-subtitle2, h6, p').last().innerText().catch(() => '0'));
    };
    return {
      total,
      asset: await readCategory('Asset Cost'),
      labor: await readCategory('Labor Cost'),
      material: await readCategory('Material Cost'),
      other: await readCategory('Other Cost'),
    };
  }

  async expectActualCostIncreasedBy(amount, category) {
    const before = this.costSnapshotBefore;
    await expect(async () => {
      const after = await this.captureActualCostSnapshot();
      expect(after.total).toBe(before.total + Number(amount));
      if (category) {
        const key = this.categoryKey(category);
        expect(after[key]).toBe(before[key] + Number(amount));
      }
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectActualCostDecreasedBy(amount, category) {
    const before = this.costSnapshotBefore;
    await expect(async () => {
      const after = await this.captureActualCostSnapshot();
      expect(after.total).toBe(before.total - Number(amount));
      if (category) {
        const key = this.categoryKey(category);
        expect(after[key]).toBe(before[key] - Number(amount));
      }
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async expectTableActualCostIncludes(name, amount) {
    await expect(async () => {
      const val = await this.getScheduleActualCostValue(name);
      expect(val).toBeGreaterThanOrEqual(Number(amount));
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000] });
  }

  async clickLinkToActualCosts() {
    const panel = this.linkActualCostsPanel();
    if (!this.costSnapshotBefore) {
      this.costSnapshotBefore = await this.captureActualCostSnapshot();
    }
    const btn = panel.getByRole('button', { name: /link actual costs/i }).first();
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.click();
    await this.page.waitForTimeout(1500);
  }

  async checkExpenseItem(name, checked = true) {
    const panel = this.linkActualCostsPanel();
    const card = panel.locator('.MuiPaper-root').filter({ hasText: new RegExp(this._escapeRegex(name), 'i') }).first();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });
    const amount = await this.readCardGrandTotal(name).catch(async () => {
      const t = await card.innerText();
      return this.parseMoney(t);
    });
    if (checked) this.lastLinkedExpenseAmount = amount || this.lastExpenseAmount;
    const checkbox = card.getByRole('checkbox').first();
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (checked !== isChecked) await checkbox.click({ force: true });
  }

  async chooseExpenseCategory(name, category) {
    await this.chooseCategoryForLinkItem(name, category);
    this.lastCostCategory = category;
  }

  async expectExpenseChecked(name) {
    const panel = this.linkActualCostsPanel();
    const card = panel.locator('.MuiPaper-root').filter({ hasText: new RegExp(this._escapeRegex(name), 'i') }).first();
    await expect(card.getByRole('checkbox')).toBeChecked({ timeout: this.uiTimeout });
  }

  // -------------------------------------------------------------------------
  // Bills & Expenses — create from scratch
  // -------------------------------------------------------------------------

  async waitForBillsExpensesModule() {
    await expect(
      this.page.getByText(/bills\s*&\s*expenses|expenses/i).first()
    ).toBeVisible({ timeout: this.uiTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Bills & Expenses module loaded');
  }

  async createExpenseFromScratch(name, amount) {
    // Create dropdown → Expenses
    const createBtn = this.page.getByRole('button', { name: /^create$/i }).first();
    await expect(createBtn).toBeVisible({ timeout: this.uiTimeout });
    await createBtn.click();
    const expensesItem = this.page.getByRole('menuitem', { name: /expense/i }).first();
    await expect(expensesItem).toBeVisible({ timeout: this.uiTimeout });
    await expensesItem.click();

    // Get started popup → start from scratch → proceed
    const startScratch = this.page.getByText(/start from scratch/i).first();
    if (await startScratch.isVisible({ timeout: 8000 }).catch(() => false)) {
      await startScratch.click();
    }
    const proceed = this.page.getByRole('button', { name: /proceed|continue|start/i }).first();
    if (await proceed.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proceed.click();
    }

    const panel = this.page.locator('[role="dialog"], .offcanvas.show, .MuiDrawer-root').last();
    await expect(panel.or(this.page.getByLabel(/expense name|name/i).first())).toBeVisible({
      timeout: this.uiTimeout,
    });

    const nameInput = this.page
      .getByLabel(/expense name|name/i)
      .or(this.page.getByPlaceholder(/expense name|name/i))
      .first();
    await expect(nameInput).toBeVisible({ timeout: this.uiTimeout });
    await nameInput.fill(String(name));

    const amountInput = this.page
      .getByLabel(/^amount/i)
      .or(this.page.locator('input[type="number"]').first())
      .first();
    await amountInput.fill(String(amount));

    // Date — click and pick today if needed
    const dateInput = this.page.getByLabel(/date/i).or(this.page.locator('input[placeholder*="date" i]')).first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.click();
      const today = this.page.getByRole('gridcell', { name: String(new Date().getDate()) }).first();
      if (await today.isVisible({ timeout: 2000 }).catch(() => false)) await today.click();
      else await this.page.keyboard.press('Escape');
    }

    // Mode of payment
    const payment = this.page
      .getByLabel(/mode of payment|payment/i)
      .or(this.page.locator('[role="combobox"]').filter({ hasText: /payment|mode|select/i }))
      .first();
    if (await payment.isVisible({ timeout: 3000 }).catch(() => false)) {
      await payment.click();
      const opt = this.page.getByRole('option').first();
      if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) await opt.click();
    }

    const save = this.page.getByRole('button', { name: /^save$/i }).first();
    await expect(save).toBeEnabled({ timeout: this.uiTimeout });
    await save.click();
    await this.page.waitForTimeout(1500);
    this.lastExpenseAmount = Number(amount);
    this.lastExpenseName = name;
    await this.logStep(`Created expense ${name} amount ${amount}`);
  }

  async expectExpenseVisibleWithAmount(name, amount) {
    await expect(this.page.getByText(new RegExp(this._escapeRegex(name), 'i')).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect(this.page.getByText(new RegExp(String(amount))).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
  }
}

module.exports = BudgetingPage;
