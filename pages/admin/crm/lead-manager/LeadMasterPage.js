// pages/admin/crm/lead-manager/LeadMasterPage.js
const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const NavigationPage = require('../../common/NavigationPage');
const LeadPage = require('../lead-profile/LeadPage');
const env = require('../../../../config/env');

class LeadMasterPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.navigationPage = new NavigationPage(page);
    this.leadPage = new LeadPage(page);
    this.lastLeadName = null;
    this.lastLeadNames = [];
    this.lastCopiedProjectId = null;
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[LeadMasterPage] ${msg}`);
  }

  leadRows() {
    return this.page.locator('tbody tr').filter({ visible: true });
  }

  toast(textRe) {
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root')
      .filter({ hasText: textRe })
      .first();
  }

  dialog() {
    return this.page.getByRole('dialog').filter({ visible: true }).last();
  }

  async navigateToLeadManager() {
    const base = String(env.admin || '').replace(/\/$/, '');
    const url = `${base}/leadmanager/master?isActive=true&isSnoozed=false`;
    if (!/leadmanager\/master/i.test(this.page.url())) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    }
    if (!/leadmanager\/master/i.test(this.page.url())) {
      await this.navigationPage.clickCrmDropdown().catch(() => {});
      await this.navigationPage.clickLeadManager();
    }
    await this.waitForListReady();
  }

  async waitForListReady() {
    await expect(this.page).toHaveURL(/leadmanager\/master/i, { timeout: this.defaultTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const hasRows = await this.leadRows().first().isVisible({ timeout: 15000 }).catch(() => false);
    const empty = await this.page
      .getByText(/no data|no leads|nothing to show|no results/i)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasRows && !empty) {
      await this.page.waitForTimeout(2000).catch(() => {});
    }
    this.logStep(`Lead Manager list ready (${this.page.url()})`);
  }

  async openStatusTab(tabName) {
    const tab = this.page
      .getByRole('tab', { name: new RegExp(`^${this.escapeRegex(tabName)}$`, 'i') })
      .or(this.page.getByRole('button', { name: new RegExp(`^${this.escapeRegex(tabName)}$`, 'i') }))
      .filter({ visible: true })
      .first();
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(800).catch(() => {});
    this.logStep(`Opened status tab: ${tabName}`);
  }

  async createDisposableLead(prefix = 'QA LM') {
    const name = `${prefix} ${Date.now().toString(36)}`;
    await this.leadPage.openCreateLeadForm();
    await this.leadPage.enterLeadName(name);
    await this.leadPage.goThroughLeadAndProjectSteps();
    await this.leadPage.submitCreateLead();
    await this.leadPage.expectLeadAddedToast();
    await this.leadPage.expectReturnedToLeadList();
    this.lastLeadName = name;
    this.lastLeadNames.push(name);
    this.logStep(`Created disposable lead: ${name}`);
    return name;
  }

  async searchLead(leadName = this.lastLeadName) {
    const q = String(leadName || '').trim();
    if (!q) throw new Error('Lead name required for search');

    await this.page.keyboard.press('Escape').catch(() => {});
    const searchRoot = this.page.getByRole('search').first();
    const trigger = searchRoot
      .getByRole('button')
      .or(this.page.getByRole('button', { name: /^search$/i }))
      .filter({ visible: true })
      .first();
    const input = searchRoot
      .getByRole('textbox')
      .or(this.page.getByPlaceholder(/search lead|lead name/i))
      .filter({ visible: true })
      .first();

    if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
      if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trigger.click({ timeout: 10000 });
      }
    }
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.fill('');
    await input.fill(q);
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep(`Searched for lead: ${q}`);
  }

  leadRowByName(leadName) {
    const name = String(leadName || this.lastLeadName || '').trim();
    return this.leadRows()
      .filter({
        has: this.page
          .getByLabel(name, { exact: true })
          .or(this.page.getByText(new RegExp(this.escapeRegex(name), 'i'))),
      })
      .first();
  }

  async expectLeadVisibleInList(leadName = this.lastLeadName) {
    const row = this.leadRowByName(leadName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectNoLeadMatch(query) {
    await this.searchLead(query);
    const empty = this.page
      .getByText(/no data|no leads|nothing to show|no results|0 leads/i)
      .filter({ visible: true })
      .first();
    const rowGone = !(await this.leadRowByName(query).isVisible({ timeout: 4000 }).catch(() => false));
    expect(
      (await empty.isVisible({ timeout: 5000 }).catch(() => false)) || rowGone
    ).toBeTruthy();
  }

  async hoverLeadRow(leadName = this.lastLeadName) {
    const row = this.leadRowByName(leadName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ force: true });
    await this.page.waitForTimeout(300).catch(() => {});
    return row;
  }

  async openRowActionsMenu(leadName = this.lastLeadName) {
    const row = await this.hoverLeadRow(leadName);
    const more = row
      .getByRole('button', { name: /more|actions/i })
      .or(row.locator('button[aria-label*="more" i], .menu-button-container button'))
      .filter({ visible: true })
      .first();
    await expect(more).toBeVisible({ timeout: this.defaultTimeout });
    await more.click({ force: true, timeout: 15000 });
    await expect(
      this.page.getByRole('menuitem').or(this.page.locator('[role="menuitem"]')).first()
    ).toBeVisible({ timeout: 15000 });
    this.logStep(`Opened row actions for ${leadName}`);
  }

  async chooseRowAction(actionName) {
    const item = this.page
      .getByRole('menuitem', { name: new RegExp(this.escapeRegex(actionName), 'i') })
      .or(this.page.locator('[role="menuitem"]').filter({ hasText: new RegExp(this.escapeRegex(actionName), 'i') }))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 15000 });
    this.logStep(`Chose row action: ${actionName}`);
  }

  async expectRowActionVisible(actionName, visible = true) {
    const item = this.page
      .getByRole('menuitem', { name: new RegExp(this.escapeRegex(actionName), 'i') })
      .filter({ visible: true })
      .first();
    if (visible) {
      await expect(item).toBeVisible({ timeout: 10000 });
    } else {
      await expect(item).toHaveCount(0);
    }
  }

  async selectLeadRow(leadName = this.lastLeadName) {
    const row = await this.hoverLeadRow(leadName);
    const checkbox = row
      .getByRole('checkbox')
      .or(row.locator('input[type="checkbox"]'))
      .first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    const checked = await checkbox.isChecked().catch(() => false);
    if (!checked) {
      await checkbox.check({ force: true }).catch(async () => {
        await checkbox.click({ force: true });
      });
    }
    this.logStep(`Selected lead row: ${leadName}`);
  }

  async expectBulkActionsVisible(visible = true) {
    const bulk = this.page
      .getByRole('button', { name: /more actions|actions|won|snooze|archive/i })
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('button')
          .filter({ hasText: /^(won|lost|snooze|archive|delete|more)$/i })
          .filter({ visible: true })
          .first()
      );
    if (visible) {
      // After selection, Active tab shows CustomMoreActionActive trigger
      const trigger = this.page
        .locator('button')
        .filter({ hasText: /actions|more|won|snooze|archive/i })
        .filter({ visible: true })
        .first();
      await expect(trigger).toBeVisible({ timeout: this.defaultTimeout });
    } else {
      const menuOpen = await this.page
        .getByRole('menuitem', { name: /^(won|lost|snooze|archive|delete)$/i })
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      expect(menuOpen).toBeFalsy();
    }
  }

  async openBulkActionsMenu() {
    const trigger = this.page
      .locator('button')
      .filter({ hasText: /actions|more/i })
      .filter({ visible: true })
      .last();
    await expect(trigger).toBeVisible({ timeout: this.defaultTimeout });
    await trigger.click({ timeout: 15000 });
    await expect(
      this.page.getByRole('menuitem').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 15000 });
  }

  async chooseBulkAction(actionName) {
    await this.openBulkActionsMenu();
    await this.chooseRowAction(actionName);
  }

  async switchToKanbanView() {
    const tab = this.page
      .getByRole('tab', { name: /kanban/i })
      .or(this.page.getByRole('button', { name: /kanban/i }))
      .filter({ visible: true })
      .first();
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.click({ timeout: 15000 });
    await expect
      .poll(async () => /view=kanban/i.test(this.page.url()), {
        timeout: 30000,
        intervals: [500, 1000],
      })
      .toBeTruthy();
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep('Switched to Kanban view');
  }

  async switchToListView() {
    const tab = this.page
      .getByRole('tab', { name: /list/i })
      .or(this.page.getByRole('button', { name: /list view|list/i }))
      .filter({ visible: true })
      .first();
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.click({ timeout: 15000 });
    await this.page.waitForTimeout(800).catch(() => {});
    await expect(this.leadRows().first().or(this.page.getByText(/no data|no leads/i).first())).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.logStep('Switched to List view');
  }

  async expectKanbanBoardVisible() {
    const board = this.page
      .locator('[data-rbd-droppable-id], [data-kanban-column-scroll], .lead-kanban-card')
      .or(this.page.getByText(/new|connected|proposal/i).first())
      .filter({ visible: true })
      .first();
    await expect(board).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectExportHiddenOnKanban() {
    const exportBtn = this.page
      .getByRole('button', { name: /export/i })
      .filter({ visible: true })
      .first();
    await expect(exportBtn).toHaveCount(0);
  }

  async openManageColumns() {
    const btn = this.page
      .getByRole('button', { name: /manage columns/i })
      .or(this.page.locator('button[aria-label*="manage columns" i]'))
      .filter({ visible: true })
      .first();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await btn.click({ timeout: 15000 });
    const dialog = this.dialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await dialog
      .getByRole('progressbar')
      .first()
      .waitFor({ state: 'hidden', timeout: 60000 })
      .catch(() => {});
    await expect(
      dialog
        .locator('input[type="checkbox"], [role="switch"]')
        .or(dialog.getByText(/lead name|show\/hide|column/i))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Manage Columns');
  }

  manageColumnToggle(columnLabel) {
    const dialog = this.dialog();
    const labelRe = new RegExp(`^\\s*${this.escapeRegex(columnLabel)}\\s*$`, 'i');
    // Deployed Manage Columns uses checkbox inputs (MUI Switch may not expose role=switch).
    const row = dialog
      .locator('div')
      .filter({ has: this.page.getByText(labelRe) })
      .filter({ has: this.page.locator('input[type="checkbox"], [role="switch"]') })
      .last();
    return row.locator('input[type="checkbox"], [role="switch"]').first();
  }

  async toggleManageColumn(columnLabel, turnOn) {
    const toggle = this.manageColumnToggle(columnLabel);
    await expect(toggle).toBeVisible({ timeout: this.defaultTimeout });
    await toggle.scrollIntoViewIfNeeded().catch(() => {});

    const setChecked = async (desired) => {
      const checked = await toggle.isChecked().catch(() => false);
      if (Boolean(checked) === Boolean(desired)) return false;
      // Click the MUI control root when the native input is visually hidden.
      await toggle.click({ force: true }).catch(async () => {
        await toggle.evaluate((el) => el.click());
      });
      for (let i = 0; i < 15; i += 1) {
        const now = await toggle.isChecked().catch(() => false);
        if (Boolean(now) === Boolean(desired)) return true;
        await this.page.waitForTimeout(200);
      }
      throw new Error(
        `Manage Columns toggle "${columnLabel}" did not become ${desired ? 'on' : 'off'}`
      );
    };

    await setChecked(turnOn);
  }

  async saveManageColumns() {
    const dialog = this.dialog();
    const save = dialog.getByRole('button', { name: /^save$/i }).first();
    const enabled = await save.isEnabled().catch(() => false);
    if (!enabled) {
      // No-op when draft already matches saved settings (e.g. Reset with no diffs).
      await this.cancelManageColumns();
      return;
    }
    await save.click({ timeout: 15000 });
    await expect(dialog).toBeHidden({ timeout: this.defaultTimeout });
  }

  async cancelManageColumns() {
    const cancel = this.dialog().getByRole('button', { name: /^cancel$/i }).first();
    await cancel.click({ timeout: 15000 });
    await expect(this.dialog()).toBeHidden({ timeout: 15000 });
  }

  async resetManageColumns() {
    const reset = this.dialog()
      .getByRole('button', { name: /reset/i })
      .first();
    await expect(reset).toBeVisible({ timeout: this.defaultTimeout });
    await reset.click({ timeout: 15000 });
  }

  async openTransferUsers() {
    const btn = this.page
      .getByRole('button', { name: /transfer user/i })
      .filter({ visible: true })
      .first();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await btn.click({ timeout: 15000 });
    await expect(this.dialog()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Transfer Users');
  }

  async closeOpenListboxes() {
    const listbox = this.page.getByRole('listbox').filter({ visible: true }).first();
    if (await listbox.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  async fillTransferUsers({ role, fromIndex = 0, toIndex = 1 } = {}) {
    const dialog = this.dialog();
    if (role) {
      const roleField = dialog.getByLabel(/role|transfer as/i).or(dialog.getByRole('combobox').first());
      await roleField.click({ timeout: 10000 });
      await this.page
        .getByRole('option', { name: new RegExp(role, 'i') })
        .first()
        .click({ timeout: 10000 });
      await this.closeOpenListboxes();
    }

    const combos = dialog.getByRole('combobox');
    const from = combos.nth(1);
    if (await from.isVisible({ timeout: 3000 }).catch(() => false)) {
      await from.click({ timeout: 10000 });
      const options = this.page.getByRole('option').filter({ visible: true });
      await options.nth(fromIndex).click({ timeout: 10000 });
      await this.closeOpenListboxes();
    }

    const to = combos.nth(2);
    if (await to.isVisible({ timeout: 3000 }).catch(() => false)) {
      await to.click({ timeout: 10000 });
      const options = this.page.getByRole('option').filter({ visible: true });
      const count = await options.count();
      const idx = Math.min(toIndex, Math.max(count - 1, 0));
      await options.nth(idx).click({ timeout: 10000 });
      await this.closeOpenListboxes();
    }
  }

  async confirmTransferUsers() {
    await this.closeOpenListboxes();
    const confirm = this.dialog()
      .getByRole('button', { name: /confirm|transfer|start/i })
      .filter({ visible: true })
      .first();
    await confirm.click({ force: true, timeout: 15000 });
  }

  async cancelTransferUsers() {
    const cancel = this.dialog().getByRole('button', { name: /^cancel$/i }).first();
    await cancel.click({ timeout: 15000 });
    await expect(this.dialog()).toBeHidden({ timeout: 15000 });
  }

  async openFilters() {
    const filterBtn = this.page
      .getByRole('button', { name: /filter/i })
      .filter({ visible: true })
      .first();
    await expect(filterBtn).toBeVisible({ timeout: this.defaultTimeout });
    await filterBtn.click({ timeout: 15000 });
    await this.page.waitForTimeout(500).catch(() => {});
  }

  async clearFilters() {
    const clear = this.page
      .getByRole('button', { name: /clear|reset filter/i })
      .filter({ visible: true })
      .first();
    if (await clear.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clear.click({ timeout: 10000 });
      await this.page.waitForTimeout(800).catch(() => {});
    }
  }

  async sortByHeader(headerName) {
    const header = this.page
      .getByRole('columnheader', { name: new RegExp(headerName, 'i') })
      .or(this.page.locator('th, [role="columnheader"]').filter({ hasText: new RegExp(headerName, 'i') }))
      .filter({ visible: true })
      .first();
    await expect(header).toBeVisible({ timeout: this.defaultTimeout });
    await header.click({ timeout: 15000 });
    await this.page.waitForTimeout(800).catch(() => {});
  }

  async setRowsPerPage(count) {
    const select = this.page
      .getByRole('combobox', { name: /rows per page/i })
      .or(this.page.locator('.MuiTablePagination-select, [class*="Pagination"] [role="combobox"]'))
      .filter({ visible: true })
      .first();
    if (await select.isVisible({ timeout: 5000 }).catch(() => false)) {
      await select.click({ timeout: 10000 });
      await this.page
        .getByRole('option', { name: new RegExp(`^${count}$`) })
        .first()
        .click({ timeout: 10000 });
      await this.page.waitForTimeout(800).catch(() => {});
    }
  }

  async dismissChatOverlay() {
    await this.page
      .locator('#fc_frame, iframe#fc_widget, iframe[title="Chat"]')
      .evaluateAll((nodes) => {
        nodes.forEach((n) => {
          n.style.pointerEvents = 'none';
          n.style.display = 'none';
        });
      })
      .catch(() => {});
  }

  async goToNextPage() {
    await this.dismissChatOverlay();
    const next = this.page
      .getByRole('button', { name: /next page|go to next/i })
      .or(this.page.locator('button[aria-label*="next" i]'))
      .filter({ visible: true })
      .first();
    if (await next.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await next.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(800).catch(() => {});
      return true;
    }
    return false;
  }

  async confirmDialogYes() {
    const yes = this.page
      .getByRole('button', { name: /^(yes|confirm|ok|save|archive|snooze|delete)$/i })
      .filter({ visible: true })
      .last();
    if (await yes.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yes.click({ timeout: 15000 });
    }
  }

  async cancelDialog() {
    const cancel = this.page
      .getByRole('button', { name: /^cancel$/i })
      .filter({ visible: true })
      .last();
    if (await cancel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cancel.click({ timeout: 15000 });
    }
  }

  async fillSnoozeDateIfPresent() {
    const dialog = this.dialog();
    const dateInput = dialog
      .locator('input[type="date"], input[placeholder*="date" i]')
      .or(dialog.getByLabel(/date|snooze/i))
      .filter({ visible: true })
      .first();
    if (!(await dateInput.isVisible({ timeout: 3000 }).catch(() => false))) return false;
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const iso = future.toISOString().slice(0, 10);
    await dateInput.fill(iso).catch(async () => {
      await dateInput.click({ force: true });
      await this.page.keyboard.type(iso);
    });
    return true;
  }

  async expectToastMatching(re) {
    await expect(this.toast(re)).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectOnLeadProfile() {
    // View Details opens LeadOverview dialog (not /leadmanager/profile navigation).
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      dialog.getByRole('tab', { name: /overview/i }).or(dialog.getByText(/^overview$/i)).first()
    ).toBeVisible({ timeout: 30000 });
    if (this.lastLeadName) {
      await expect(
        dialog.getByText(new RegExp(this.escapeRegex(String(this.lastLeadName)), 'i')).first()
      ).toBeVisible({ timeout: 30000 });
    }
  }

  async expectStillOnLeadList() {
    await expect(this.page).toHaveURL(/leadmanager\/master/i, { timeout: this.defaultTimeout });
  }

  async expectNavigatedToLeadProfile() {
    // Edit (and similar) navigate to /leadmanager/profile — not the LeadOverview dialog.
    await expect(this.page).toHaveURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout });
  }

  async copyProjectIdFromRow(leadName = this.lastLeadName) {
    await this.openRowActionsMenu(leadName);
    await this.chooseRowAction('Copy Project ID');
    // Do not call clipboard.readText() — headed Chromium often hangs on a permission prompt.
    this.lastCopiedProjectId = null;
    await expect(this.page).toHaveURL(/leadmanager\/master/i, { timeout: 15000 });
    await expect(this.page.getByRole('menuitem').first())
      .toBeHidden({ timeout: 10000 })
      .catch(() => {});
    this.logStep('Copy Project ID chosen (clipboard read skipped; menu should close)');
  }

  async openKanbanCardMenu(leadName = this.lastLeadName) {
    const nameRe = new RegExp(this.escapeRegex(String(leadName).slice(0, 12)), 'i');
    const card = this.page
      .locator('[data-rbd-draggable-id]')
      .filter({ hasText: nameRe })
      .filter({ visible: true })
      .first();
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await card.hover({ force: true });
    await card.locator('.lead-card-menu').evaluate((el) => {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    }).catch(() => {});
    const more = card.locator('.lead-card-menu button[aria-label], .lead-card-menu button').first();
    await expect(more).toBeVisible({ timeout: 15000 });
    await more.dispatchEvent('click');
    const menuItem = this.page
      .getByRole('menuitem')
      .or(this.page.locator('li[role="menuitem"], [role="menuitem"]'))
      .or(this.page.getByText(/view details/i))
      .first();
    if (!(await menuItem.isVisible({ timeout: 4000 }).catch(() => false))) {
      await more.evaluate((el) => el.click());
    }
    await expect(menuItem).toBeVisible({ timeout: 15000 });
  }

  async expectKanbanCardVisible(leadName = this.lastLeadName) {
    const card = this.page
      .locator('.lead-kanban-card, [data-rbd-draggable-id], [class*="Card"]')
      .filter({ hasText: new RegExp(this.escapeRegex(String(leadName).slice(0, 12)), 'i') })
      .filter({ visible: true })
      .first();
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
  }

  async dragKanbanCardToColumn(leadName, targetStageText) {
    const card = this.page
      .locator('[data-rbd-draggable-id], .lead-kanban-card')
      .filter({ hasText: new RegExp(this.escapeRegex(String(leadName).slice(0, 12)), 'i') })
      .filter({ visible: true })
      .first();
    const column = this.page
      .locator('[data-kanban-column-scroll], [data-rbd-droppable-id]')
      .filter({ hasText: new RegExp(this.escapeRegex(targetStageText), 'i') })
      .filter({ visible: true })
      .first();
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await expect(column).toBeVisible({ timeout: this.defaultTimeout });
    const from = await card.boundingBox();
    const to = await column.boundingBox();
    if (!from || !to) throw new Error('Could not resolve drag boxes for Kanban card');
    await this.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 20 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(1500).catch(() => {});
  }
}

module.exports = LeadMasterPage;
