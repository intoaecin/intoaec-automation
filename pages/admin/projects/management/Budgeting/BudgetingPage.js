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
    this.actualBudgetTitle = page.getByText(/^actual budget$/i).first();
    this.linkButton = page.getByRole('button', { name: /^link$/i }).first();
    this.budgetTable = page
      .locator('table')
      .filter({ hasText: /phase\/schedule|phase|schedule/i })
      .first();

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
    const title = await this.actualBudgetTitle.isVisible({ timeout: 2000 }).catch(() => false);
    const link = await this.linkButton.isVisible({ timeout: 2000 }).catch(() => false);
    const heading = await this.page
      .getByText(/^budgeting$/i)
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    return title || link || heading;
  }

  async waitForModuleToLoad() {
    if (await this.isOnBudgetingModule()) {
      await expect(this.actualBudgetTitle).toBeVisible({ timeout: this.uiTimeout }).catch(() => {});
      await this.logStep('Budgeting module already loaded');
      return;
    }
    await expect(async () => {
      expect(await this.isOnBudgetingModule()).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1500, 3000] });
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

    const currentUrl = this.page.url();
    const projectBaseMatch = currentUrl.match(/(.*\/project\/[^/]+)/);
    if (projectBaseMatch) {
      await this.page.goto(projectBaseMatch[1], { waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.page.waitForTimeout(1500);
    }

    const pmBtn = profile.projectManagementHeading;
    if (!(await pmBtn.isVisible({ timeout: 8000 }).catch(() => false))) {
      const ProjectNavigationPage = require('../../ProjectNavigationPage');
      const nav = new ProjectNavigationPage(this.page);
      if (await nav.projectsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nav.projectsLink.click({ force: true });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
      if (await nav.firstProject.isVisible({ timeout: 8000 }).catch(() => false)) {
        await nav.firstProject.click({ timeout: 15000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
    }

    if (await pmBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await pmBtn.click({ force: true, timeout: 15000 });
      await this.page.waitForTimeout(800);
    }

    await profile.clickModuleCard('Budgeting');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForModuleToLoad();
  }

  actualBudgetCard() {
    return this.page
      .locator('.MuiPaper-root, [class*="MuiCard"], section, div')
      .filter({ has: this.page.getByText(/^actual budget$/i) })
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
    await expect(this.linkButton).toBeVisible({ timeout: this.uiTimeout });
    await this.linkButton.click({ force: true });
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
    const card = this.actualBudgetCard();
    await expect(card).toBeVisible({ timeout: this.uiTimeout });

    const totalText = await card.locator('h5, .MuiTypography-h5').first().innerText().catch(() => '0');
    const total = this.parseMoney(totalText);

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

  async expectScheduleInBudgetTable(name) {
    const table = this.page.locator('table').first();
    const cell = this.page
      .getByText(new RegExp(this._escapeRegex(name), 'i'))
      .first();
    await expect(cell).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Budget table shows schedule: ${name}`);
  }

  linkItemCard(name) {
    const panel = this.linkOffcanvas();
    return panel
      .locator('.MuiPaper-root')
      .filter({ hasText: new RegExp(this._escapeRegex(name), 'i') })
      .first();
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

    // Category: try budgeting-related or default
    const categorySelect = dialog.locator('.MuiSelect-select, [role="combobox"]').first();
    await expect(categorySelect).toBeVisible({ timeout: this.defaultTimeout });
    await categorySelect.click();
    const budgetingCat = this.page
      .getByRole('option', { name: /budgeting|default/i })
      .first();
    if (await budgetingCat.isVisible({ timeout: 3000 }).catch(() => false)) {
      await budgetingCat.click();
    } else {
      await this.page.locator('[role="option"][data-value="DEFAULT"]').first().click().catch(async () => {
        await this.page.getByRole('option').first().click();
      });
    }
    await this.page.waitForTimeout(400);

    const proposalSelect = dialog.locator('.MuiSelect-select, [role="combobox"]').nth(1);
    await expect(proposalSelect).toBeVisible({ timeout: this.defaultTimeout });
    await proposalSelect.click();
    const named = this.page.getByRole('option', { name: new RegExp(this._escapeRegex(templateName), 'i') }).first();
    await expect(named).toBeVisible({ timeout: this.defaultTimeout });
    await named.click();

    const proceed = this.page.getByRole('button', { name: /proceed|send|confirm|add/i }).first();
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
}

module.exports = BudgetingPage;
