// pages/admin/client/master/ClientMasterPage.js
const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const ProjectNavigationPage = require('../../projects/ProjectNavigationPage');
const env = require('../../../../config/env');

class ClientMasterPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.projectNav = new ProjectNavigationPage(page);
    this.lastClientName = null;
    this.lastClientNames = [];
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[ClientMasterPage] ${msg}`);
  }

  clientRows() {
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

  async navigateToClientManager() {
    const base = String(env.admin || '').replace(/\/$/, '');
    const url = `${base}/client?isActive=true`;
    if (!/\/client(\?|$)/i.test(this.page.url()) || /\/client\/(profile|create|initial|upload)/i.test(this.page.url())) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    }
    if (!/\/client\?isActive=true/i.test(this.page.url()) && !/\/client$/i.test(this.page.url().split('?')[0])) {
      await this.projectNav.openClientsProjectsList().catch(async () => {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
      });
    }
    await this.waitForListReady();
  }

  async waitForListReady() {
    await expect(this.page).toHaveURL(/\/client(\?|$)/i, { timeout: this.defaultTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const hasRows = await this.clientRows().first().isVisible({ timeout: 15000 }).catch(() => false);
    const empty = await this.page
      .getByText(/no data|no clients|no projects|nothing to show|no results/i)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasRows && !empty) {
      await this.page.waitForTimeout(2000).catch(() => {});
    }
    this.logStep(`Client Manager list ready (${this.page.url()})`);
  }

  async dismissBlockingDialogs() {
    await this.page.keyboard.press('Escape').catch(() => {});
    const dialog = this.dialog();
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      await dialog
        .getByRole('button', { name: /close|ok|done|cancel|got it/i })
        .first()
        .click({ force: true, timeout: 5000 })
        .catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  statusTabUrl(tabName) {
    const base = String(env.admin || '').replace(/\/$/, '');
    const key = String(tabName || '').trim().toLowerCase();
    if (key === 'archive') return `${base}/client?isActive=false`;
    if (key === 'completed') return `${base}/client?isProjectCompleted=true`;
    return `${base}/client?isActive=true`;
  }

  statusTabUrlRe(tabName) {
    const key = String(tabName || '').trim().toLowerCase();
    if (key === 'archive') return /\/client\?.*isActive=false/i;
    if (key === 'completed') return /\/client\?.*isProjectCompleted=true/i;
    return /\/client\?.*isActive=true/i;
  }

  async openStatusTab(tabName) {
    await this.dismissBlockingDialogs();
    const expectedRe = this.statusTabUrlRe(tabName);
    // Prefer the MUI tab strip only (avoid matching bulk/row "Archive" buttons).
    const tab = this.page
      .getByRole('tab', { name: new RegExp(this.escapeRegex(tabName), 'i') })
      .filter({ visible: true })
      .first();
    if (await tab.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tab.click({ force: true, timeout: 15000 });
    } else {
      await this.page.goto(this.statusTabUrl(tabName), {
        waitUntil: 'domcontentloaded',
        timeout: this.defaultTimeout,
      });
    }
    // Congrats overlays / filter restore can steal the first click — fall back to URL.
    const landed = await expect
      .poll(async () => expectedRe.test(this.page.url()), {
        timeout: 8000,
        intervals: [400, 800, 1200],
      })
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);
    if (!landed) {
      await this.dismissBlockingDialogs();
      await this.page.goto(this.statusTabUrl(tabName), {
        waitUntil: 'domcontentloaded',
        timeout: this.defaultTimeout,
      });
      await expect(this.page).toHaveURL(expectedRe, { timeout: this.defaultTimeout });
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});
    this.logStep(`Opened status tab: ${tabName}`);
  }

  async createDisposableClient(prefix = 'QA CM') {
    const name = `${prefix} ${Date.now().toString(36)}`;
    const addClient = this.page
      .getByRole('button', { name: /add client/i })
      .filter({ visible: true })
      .first();
    await expect(addClient).toBeVisible({ timeout: this.defaultTimeout });
    await addClient.click({ timeout: 15000 });
    await expect(this.page).toHaveURL(/\/client\/initial/i, { timeout: this.defaultTimeout });

    const addNew = this.page.getByRole('button', { name: /^add new$/i }).first();
    await expect(addNew).toBeVisible({ timeout: this.defaultTimeout });
    await addNew.click({ timeout: 15000 });
    await expect(this.page).toHaveURL(/\/client\/create/i, { timeout: this.defaultTimeout });

    const nameInput = this.page
      .getByRole('combobox', { name: /client name|lead name|name/i })
      .or(this.page.getByRole('textbox', { name: /client name|lead name/i }))
      .first();
    await expect(nameInput).toBeVisible({ timeout: this.defaultTimeout });
    await nameInput.click();
    await nameInput.pressSequentially(name, { delay: 30 });
    const option = this.page
      .getByRole('option')
      .filter({ hasText: new RegExp(`${this.escapeRegex(name)}\\s*$`, 'i') })
      .last();
    await expect(option).toBeVisible({ timeout: this.defaultTimeout });
    await option.click();

    const next = this.page.getByRole('button', { name: /^next$/i }).first();
    await expect(next).toBeEnabled({ timeout: this.defaultTimeout });
    await next.click();
    await expect(this.page.locator('.MuiStepLabel-label.Mui-active').first()).toHaveText(/project/i, {
      timeout: this.defaultTimeout,
    });
    await expect(next).toBeEnabled({ timeout: this.defaultTimeout });
    await next.click();
    await expect(this.page.locator('.MuiStepLabel-label.Mui-active').first()).toHaveText(/success/i, {
      timeout: this.defaultTimeout,
    });

    const submit = this.page
      .getByRole('button', { name: /add client|create client|create lead/i })
      .last();
    await expect(submit).toBeEnabled({ timeout: this.defaultTimeout });
    await submit.click({ timeout: 15000 });
    await expect(this.toast(/client added successfully|lead added successfully/i)).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.page).toHaveURL(/\/client(\?|$)/i, { timeout: this.defaultTimeout });
    // Congrats / leftover dialogs can block ExpandableSearch after create.
    await this.page.keyboard.press('Escape').catch(() => {});
    const leftover = this.dialog();
    if (await leftover.isVisible({ timeout: 1500 }).catch(() => false)) {
      await leftover.getByRole('button', { name: /close|ok|done|cancel/i }).first().click({ force: true }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.waitForListReady();
    this.lastClientName = name;
    this.lastClientNames.push(name);
    this.logStep(`Created disposable client: ${name}`);
    return name;
  }

  async searchClient(clientName = this.lastClientName) {
    const q = String(clientName || '').trim();
    if (!q) throw new Error('Client name required for search');

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.dismissChatOverlay();
    const searchRoot = this.page.getByRole('search').first();
    const trigger = searchRoot
      .getByRole('button')
      .or(this.page.getByRole('button', { name: /^search$/i }))
      .or(this.page.locator('button[aria-label*="search" i]'))
      .filter({ visible: true })
      .first();
    const input = this.page
      .getByPlaceholder(/search client|client name|project name|search/i)
      .or(searchRoot.getByRole('textbox'))
      .filter({ visible: true })
      .first();

    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) {
      if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
        await trigger.click({ force: true, timeout: 10000 });
      }
    }
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.click({ force: true });
    await input.fill('');
    await input.fill(q);
    // Client search API fires at length >= 3.
    await this.page.waitForTimeout(1500).catch(() => {});
    this.logStep(`Searched for client: ${q}`);
  }

  clientRowByName(clientName) {
    const name = String(clientName || this.lastClientName || '').trim();
    return this.clientRows()
      .filter({
        has: this.page
          .getByLabel(name, { exact: true })
          .or(this.page.getByText(new RegExp(this.escapeRegex(name), 'i'))),
      })
      .first();
  }

  async expectClientVisibleInList(clientName = this.lastClientName) {
    const row = this.clientRowByName(clientName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectNoClientMatch(query) {
    await this.searchClient(query);
    const empty = this.page
      .getByText(/no data|no clients|no projects|nothing to show|no results|0 project/i)
      .filter({ visible: true })
      .first();
    const rowGone = !(await this.clientRowByName(query).isVisible({ timeout: 4000 }).catch(() => false));
    expect((await empty.isVisible({ timeout: 5000 }).catch(() => false)) || rowGone).toBeTruthy();
  }

  async hoverClientRow(clientName = this.lastClientName) {
    const row = this.clientRowByName(clientName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ force: true });
    await this.page.waitForTimeout(300).catch(() => {});
    return row;
  }

  async openRowActionsMenu(clientName = this.lastClientName) {
    await this.dismissBlockingDialogs();
    const row = await this.hoverClientRow(clientName);
    const more = row
      .getByRole('button', { name: /more|actions/i })
      .or(row.locator('button[aria-label*="more" i], .menu-button-container button'))
      .filter({ visible: true })
      .first();
    await expect(more).toBeVisible({ timeout: this.defaultTimeout });
    await more.click({ force: true, timeout: 15000 });
    await expect(
      this.page
        .getByRole('menuitem')
        .or(this.page.locator('[role="menuitem"], .MuiMenu-list li, [role="menu"] li'))
        .first()
    ).toBeVisible({ timeout: 15000 });
    this.logStep(`Opened row actions for ${clientName}`);
  }

  async chooseRowAction(actionName) {
    const actionRe = new RegExp(this.escapeRegex(actionName), 'i');
    const item = this.page
      .getByRole('menuitem', { name: actionRe })
      .or(this.page.locator('[role="menuitem"], .MuiMenu-list li, [role="menu"] li').filter({ hasText: actionRe }))
      .or(this.page.getByRole('option', { name: actionRe }))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: 30000 });
    await item.click({ force: true, timeout: 15000 });
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

  async expectNoRowKebabOnCompleted() {
    const kebab = this.page.locator('.menu-button-container button').filter({ visible: true });
    await expect(kebab).toHaveCount(0);
  }

  async selectClientRow(clientName = this.lastClientName) {
    const row = await this.hoverClientRow(clientName);
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
    this.logStep(`Selected client row: ${clientName}`);
  }

  async expectBulkActionsVisible(visible = true) {
    if (visible) {
      const trigger = this.page
        .locator('button')
        .filter({ hasText: /actions|more|archive|completed|delete|undo/i })
        .filter({ visible: true })
        .first();
      await expect(trigger).toBeVisible({ timeout: this.defaultTimeout });
    } else {
      const menuOpen = await this.page
        .getByRole('menuitem', { name: /^(archive|delete|undo|mark as completed)$/i })
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
    await expect(this.page.getByRole('menuitem').filter({ visible: true }).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async chooseBulkAction(actionName) {
    await this.openBulkActionsMenu();
    await this.chooseRowAction(actionName);
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
    const reset = this.dialog().getByRole('button', { name: /reset/i }).first();
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
    // Client grid labels leadName as "Client Name"; accept either.
    const nameRe =
      /^lead name$/i.test(String(headerName).trim())
        ? /client name|lead name/i
        : new RegExp(this.escapeRegex(headerName), 'i');
    const header = this.page
      .getByRole('columnheader', { name: nameRe })
      .or(this.page.locator('th, [role="columnheader"], thead td, thead th').filter({ hasText: nameRe }))
      .filter({ visible: true })
      .first();
    await expect(header).toBeVisible({ timeout: this.defaultTimeout });
    const sortLabel = header.locator('.MuiTableSortLabel-root, button, [role="button"]').first();
    if (await sortLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sortLabel.click({ force: true, timeout: 15000 });
    } else {
      await header.click({ force: true, timeout: 15000 });
    }
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
    const dialog = this.dialog();
    const reason = dialog
      .getByLabel(/reason/i)
      .or(dialog.locator('textarea, input[name*="reason" i], input[name*="Description" i]'))
      .filter({ visible: true })
      .first();
    if (await reason.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reason.fill(`QA CM reason ${Date.now().toString(36)}`).catch(async () => {
        await reason.click({ force: true });
        await this.page.keyboard.type(`QA CM reason ${Date.now().toString(36)}`);
      });
    }
    const yes = this.page
      .getByRole('button', { name: /^(yes|confirm|ok|save|archive|delete|complete)$/i })
      .filter({ visible: true })
      .last();
    if (await yes.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yes.click({ timeout: 15000 });
    }
    // Wait briefly for toast / API; archive also opens a congrats dialog that blocks tabs.
    await this.page.waitForTimeout(1500).catch(() => {});
    await this.dismissBlockingDialogs();
    await this.page.waitForTimeout(500).catch(() => {});
    await this.dismissBlockingDialogs();
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

  async expectToastMatching(re) {
    await expect(this.toast(re)).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectOnClientOverview() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      dialog.getByRole('tab', { name: /overview/i }).or(dialog.getByText(/^overview$/i)).first()
    ).toBeVisible({ timeout: 30000 });
    if (this.lastClientName) {
      await expect(
        dialog.getByText(new RegExp(this.escapeRegex(String(this.lastClientName)), 'i')).first()
      ).toBeVisible({ timeout: 30000 });
    }
  }

  async expectStillOnClientList() {
    await expect(this.page).toHaveURL(/\/client(\?|$)/i, { timeout: this.defaultTimeout });
  }

  async expectNavigatedToClientProfile() {
    await expect(this.page).toHaveURL(/\/client\/profile/i, { timeout: this.defaultTimeout });
  }

  async expectOnCompletedTab() {
    await expect
      .poll(async () => /isProjectCompleted=true/i.test(this.page.url()), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
  }

  async copyProjectIdFromRow(clientName = this.lastClientName) {
    await this.openRowActionsMenu(clientName);
    await this.chooseRowAction('Copy Project Id');
    await expect(this.page).toHaveURL(/\/client(\?|$)/i, { timeout: 15000 });
    await expect(this.page.getByRole('menuitem').first())
      .toBeHidden({ timeout: 10000 })
      .catch(() => {});
    this.logStep('Copy Project Id chosen (clipboard read skipped)');
  }
}

module.exports = ClientMasterPage;
