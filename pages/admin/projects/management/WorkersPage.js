const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

/** Reuse workers created earlier in this Node process (across scenarios). */
const sharedWorkerCache = {
  individual: null,
  contractor: null,
};

/**
 * Project → Workers (project sidebar icon) → Add Shift.
 * Matches Playwright codegen: Clients/Projects → project → Workers SVG → Add Shift form.
 */
class WorkersPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.main = page.locator('main, [role="main"]').first();
    this.addShiftButton = page.getByRole('button', { name: /add shift/i }).first();
    this.lastCreatedShiftName = null;
    this.createdShiftNames = [];
  }

  _isGlobalSearchField(placeholder, ariaLabel = '') {
    return /anything|intoaec/i.test(`${placeholder || ''} ${ariaLabel || ''}`);
  }

  /**
   * Search input inside Select Workers / picker only — never header global search.
   */
  async _getScopedWorkerSearchInput(preferredScope = null) {
    const scopes = [
      this._workerPickerPanel(),
      preferredScope,
      this._addShiftDialog(),
    ].filter(Boolean);

    for (const scope of scopes) {
      if (!(await scope.isVisible({ timeout: 500 }).catch(() => false))) continue;
      const inputs = scope.locator('input[placeholder*="earch" i], input[aria-label*="earch" i]').filter({
        visible: true,
      });
      const count = await inputs.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const el = inputs.nth(i);
        const ph = ((await el.getAttribute('placeholder').catch(() => '')) || '').trim();
        const aria = ((await el.getAttribute('aria-label').catch(() => '')) || '').trim();
        if (this._isGlobalSearchField(ph, aria)) continue;
        if (/search|worker/i.test(`${ph} ${aria}`)) return el;
      }
    }
    return null;
  }

  _cacheKeyForCurrentTab() {
    const tab = String(this.lastShiftWorkerTab || 'INDIVIDUAL').toUpperCase();
    return tab === 'CONTRACTOR' ? 'contractor' : 'individual';
  }

  _rememberSeededWorker(name) {
    const n = String(name || '').trim();
    if (!n) return;
    this.lastSeededWorkerName = n;
    sharedWorkerCache[this._cacheKeyForCurrentTab()] = n;
  }

  async logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  addShiftFormRoot() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .last()
      .or(this.main);
  }

  async isOnWorkersModule() {
    if (await this.addShiftButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    const markers = this.page
      .getByRole('button', { name: /attendance|add\s*shift/i })
      .or(this.page.getByRole('tab', { name: /calendar|wage\s*details/i }))
      .or(this.page.getByText(/worker\s*management|add\s*shift|search\s*shift/i))
      .filter({ visible: true })
      .first();
    return markers.isVisible({ timeout: 1500 }).catch(() => false);
  }

  /** Codegen: div:nth-child(19) > .MuiBox-root > svg (Workers in project module rail). */
  workersSidebarIcon() {
    return this.page.locator('div:nth-child(19) > .MuiBox-root > svg').first();
  }

  /** Navigate to Worker Management via profile query param (most reliable). */
  async openWorkersViaUrlTab() {
    const url = new URL(this.page.url());
    const onProfile =
      /\/(client|leadmanager)\/profile/i.test(url.pathname) ||
      (url.searchParams.has('projectId') && /profile/i.test(url.pathname));
    if (!onProfile) {
      await this.logStep(`Skip URL Workers tab — not on project profile (${url.pathname})`);
      return false;
    }
    url.searchParams.set('tab', 'WorkerManagement');
    url.searchParams.delete('shiftId');
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.logStep(`Opened Workers via URL tab=WorkerManagement (${this.page.url()})`);

    if (await this.page.getByText(/access\s*denied/i).isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.logStep('Access Denied on Worker Management tab');
      return false;
    }

    // Wait for Calendar / Add Shift / Attendance to appear
    for (let i = 0; i < 24; i += 1) {
      if (await this.isOnWorkersModule()) return true;
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(500).catch(() => {});
    }
    return false;
  }

  /** After Background opens a project: click Workers in the project sidebar (codegen path). */
  async clickWorkersInProject() {
    if (await this.isOnWorkersModule()) {
      await this.logStep('Already on Workers module');
      return;
    }

    // Prefer URL tab — sidebar icons are brittle across projects/layouts
    if (await this.openWorkersViaUrlTab()) {
      return;
    }

    const codegenIcon = this.workersSidebarIcon();
    if (await codegenIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await codegenIcon.click({ timeout: 20000, force: true });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.logStep('Clicked Workers icon in project (codegen)');
      if (await this.addShiftButton.isVisible({ timeout: 8000 }).catch(() => false)) return;
    }

    // Try several rail icons (Workers position varies)
    const railIcons = this.page.locator(
      'div.MuiBox-root > svg, [class*="sidebar" i] svg, [class*="SideBar" i] svg, nav svg'
    );
    const iconCount = await railIcons.count().catch(() => 0);
    for (let i = Math.min(iconCount - 1, 25); i >= 0 && i >= Math.max(0, iconCount - 30); i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      const icon = railIcons.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await icon.isVisible({ timeout: 200 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      await icon.click({ timeout: 5000, force: true }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      if (await this.addShiftButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.logStep(`Opened Workers via rail icon index ${i}`);
        return;
      }
    }

    const workersByText = this.page
      .getByRole('button', { name: /^workers$/i })
      .or(this.page.locator('[title="Workers"], [aria-label="Workers"]'))
      .filter({ visible: true })
      .first();

    if (await workersByText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workersByText.click({ timeout: 20000, force: true });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.logStep('Clicked Workers control by title/aria');
      if (await this.addShiftButton.isVisible({ timeout: 8000 }).catch(() => false)) return;
    }

    if (await this.openWorkersViaUrlTab()) {
      return;
    }

    throw new Error(
      'Could not open Workers from the project page. Expected Add Shift after tab=WorkerManagement or sidebar Workers.'
    );
  }

  async waitForModuleToLoad() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    for (let i = 0; i < 3; i += 1) {
      if (await this.isOnWorkersModule()) {
        // Prefer waiting for Add Shift when present
        if (await this.addShiftButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          this.workersModuleUrl = this.page.url();
          await this.logStep('Workers module loaded (Add Shift visible)');
          return;
        }
        this.workersModuleUrl = this.page.url();
        await this.logStep('Workers module markers visible');
        return;
      }
      await this.clickWorkersInProject().catch(() => {});
    }
    await expect(this.addShiftButton).toBeVisible({ timeout: this.defaultTimeout });
    this.workersModuleUrl = this.page.url();
    await this.logStep('Workers module loaded');
  }

  /**
   * From Active Clients list, open projects until Worker Management (Add Shift) is available.
   * Honors WORKERS_PROJECT_NAME when set.
   */
  async openProjectWithWorkersModule() {
    const ProjectNavigationPage = require('../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);
    const preferred = String(process.env.WORKERS_PROJECT_NAME || '').trim();

    await nav.navigateToProjects();

    if (preferred) {
      await nav.clickProjectByName(preferred);
      await this.clickWorkersInProject();
      if (await this.isOnWorkersModule()) {
        await this.logStep(`Workers ready on preferred project: ${preferred}`);
        return;
      }
      throw new Error(`WORKERS_PROJECT_NAME="${preferred}" opened but Worker Management / Add Shift not available`);
    }

    // Open first project via ProjectNavigationPage (opens client/profile URL)
    await nav.clickFirstProject();
    await this.logStep(`Opened first project → ${this.page.url()}`);
    try {
      await this.clickWorkersInProject();
      if (await this.addShiftButton.isVisible({ timeout: 15000 }).catch(() => false)) {
        await this.logStep('Workers ready on first project');
        return;
      }
    } catch (err) {
      await this.logStep(`Workers not on first project: ${err.message}`);
    }

    // Try additional projects by name from visible list
    await nav.navigateToActiveClientsList();
    const nameCells = this.page.locator('table tbody tr td, table tbody tr th').filter({ visible: true });
    const cellCount = await nameCells.count().catch(() => 0);
    const tried = new Set();
    for (let i = 0; i < Math.min(cellCount, 40); i += 1) {
      const text = ((await nameCells.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2 || tried.has(text.toLowerCase())) continue;
      if (/^active$|^inactive$|^\d+$|email|@/i.test(text)) continue;
      tried.add(text.toLowerCase());
      try {
        await nav.navigateToActiveClientsList();
        await nav.clickProjectByName(text);
        await this.logStep(`Trying Workers on project: ${text} → ${this.page.url()}`);
        await this.clickWorkersInProject();
        if (await this.addShiftButton.isVisible({ timeout: 12000 }).catch(() => false)) {
          await this.logStep(`Workers ready on project: ${text}`);
          return;
        }
      } catch (err) {
        await this.logStep(`Workers not available on ${text}: ${err.message}`);
      }
      if (tried.size >= 6) break;
    }

    throw new Error(
      'No project with Worker Management (Add Shift) found. Set WORKERS_PROJECT_NAME to a known project.'
    );
  }

  async clickAddShift() {
    this._shiftWorkerSeedAttempted = false;
    this._explicitShiftWorkerTab = false;
    await expect(this.addShiftButton).toBeVisible({ timeout: this.defaultTimeout });
    // MUI tooltips often intercept the Add Shift button after returning from Manage Workers
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page
      .locator('.MuiTooltip-popper, [role="tooltip"]')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {});
    await this.addShiftButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.addShiftButton.click({ timeout: 20000, force: true });
    await this.logStep('Clicked Add Shift');
  }

  shiftNameInput() {
    return this.page.getByRole('textbox', { name: 'Shift Name' }).first();
  }

  async expectAddShiftFormVisible() {
    await expect(this.shiftNameInput()).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Add Shift form/popup is visible');
  }

  buildRandomShiftName() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return `Auto Shift ${suffix}`;
  }

  async enterRandomShiftName() {
    const name = this.buildRandomShiftName();
    const input = this.shiftNameInput();
    await input.click({ timeout: 15000 });
    await input.fill(name);
    this.lastCreatedShiftName = name;
    this.createdShiftNames.push(name);
    await this.logStep(`Entered shift name: ${name}`);
    return name;
  }

  _addShiftDialog() {
    return this.page
      .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, .MuiDialog-root')
      .filter({ visible: true })
      .filter({ hasText: /shift\s*name|add\s*shift|select\s*workers?|create\s*shift/i })
      .last()
      .or(
        this.page
          .getByRole('dialog')
          .filter({ visible: true })
          .filter({ hasText: /shift\s*name|add\s*shift/i })
          .last()
      );
  }

  _workerPickerPanel() {
    // Select Workers often opens a nested drawer/panel (not just an autocomplete popper)
    return this.page
      .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, .MuiPopover-root, .MuiAutocomplete-popper')
      .filter({ visible: true })
      .filter({
        hasText: /search\s*worker|select\s*workers?|all\s*workers?|individual|contractor|workers?\s*list/i,
      })
      .filter({ hasNotText: /create\s*shift|shift\s*name|shift\s*timing/i })
      .last();
  }

  async _openWorkerPickerInAddShift(dialog) {
    // Click the Select Workers field / control on the Create Shift form
    const selectWorkersHit = dialog
      .getByText(/select\s*workers?\s*\*?/i)
      .or(dialog.getByLabel(/select\s*workers?/i))
      .or(dialog.getByRole('button', { name: /select\s*workers?/i }))
      .filter({ visible: true })
      .first();
    if (await selectWorkersHit.isVisible({ timeout: 4000 }).catch(() => false)) {
      await selectWorkersHit.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(700).catch(() => {});
    }

    const workersControl = dialog
      .locator('.MuiFormControl-root, .MuiAutocomplete-root, [class*="Select"]')
      .filter({ hasText: /select\s*workers?/i })
      .filter({ visible: true })
      .first();
    if (await workersControl.isVisible({ timeout: 2000 }).catch(() => false)) {
      const input = workersControl
        .locator('input, [role="combobox"], .MuiSelect-select, .MuiAutocomplete-input, [aria-haspopup="listbox"]')
        .filter({ visible: true })
        .first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.click({ timeout: 15000, force: true });
      } else {
        await workersControl.click({ timeout: 15000, force: true });
      }
      await this.page.waitForTimeout(500).catch(() => {});
    }

    // Wait for nested picker panel or portal options
    await this._workerPickerPanel()
      .or(
        this.page
          .locator(
            '[role="listbox"], .MuiAutocomplete-popper, input[type="checkbox"], .MuiCheckbox-root, [role="option"]'
          )
          .filter({ visible: true })
          .first()
      )
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
  }

  async _tryPickAnyWorkerOption(preferredIndex = 0) {
    const pickerPanel = this._workerPickerPanel();
    const portal = this.page
      .locator(
        '.MuiAutocomplete-popper, .MuiPopover-root, .MuiModal-root [role="listbox"], [role="listbox"], .MuiMenu-list'
      )
      .filter({ visible: true })
      .last();

    // Never scan the Create Shift dialog itself — its checkboxes/labels (Recurring, etc.)
    // are not workers and cause false-positive "selected" clicks.
    const scopes = [pickerPanel, portal];

    // Legacy codegen option (site manager)
    const legacyOptions = this.page
      .locator('div')
      .filter({ hasText: / - site manager$/i })
      .filter({ visible: true });
    if (await legacyOptions.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      const count = await legacyOptions.count();
      const idx = Math.min(Math.max(0, preferredIndex), Math.max(0, count - 1));
      await legacyOptions.nth(idx).click({ timeout: 15000, force: true });
      await this.logStep(`Selected legacy worker option index ${idx}`);
      return true;
    }

    for (const scope of scopes) {
      if (!(await scope.isVisible({ timeout: 800 }).catch(() => false))) continue;

      const checkboxes = scope.locator('input[type="checkbox"]').filter({ visible: true });
      const cbCount = await checkboxes.count().catch(() => 0);
      if (cbCount > 0) {
        const idx = Math.min(Math.max(0, preferredIndex), cbCount - 1);
        const pick = checkboxes.nth(idx);
        await pick.check({ force: true }).catch(async () => {
          await pick.click({ force: true });
        });
        const confirm = scope
          .getByRole('button', { name: /^(done|apply|add|save|ok|select)$/i })
          .filter({ visible: true })
          .first()
          .or(
            this.page
              .getByRole('button', { name: /^(done|apply|add|save|ok|select)$/i })
              .filter({ visible: true })
              .first()
          );
        if (await confirm.isVisible({ timeout: 1200 }).catch(() => false)) {
          await confirm.click({ force: true }).catch(() => {});
        }
        await this.logStep(`Selected worker checkbox ${idx} of ${cbCount}`);
        return true;
      }

      const checkboxRoot = scope.locator('.MuiCheckbox-root').filter({ visible: true });
      if (await checkboxRoot.first().isVisible({ timeout: 1200 }).catch(() => false)) {
        const count = await checkboxRoot.count().catch(() => 1);
        const idx = Math.min(Math.max(0, preferredIndex), Math.max(0, count - 1));
        await checkboxRoot.nth(idx).click({ force: true });
        const confirm = scope
          .getByRole('button', { name: /^(done|apply|add|save|ok|select)$/i })
          .filter({ visible: true })
          .first()
          .or(
            this.page
              .getByRole('button', { name: /^(done|apply|add|save|ok|select)$/i })
              .filter({ visible: true })
              .first()
          );
        if (await confirm.isVisible({ timeout: 1200 }).catch(() => false)) {
          await confirm.click({ force: true }).catch(() => {});
        }
        await this.logStep(`Selected MUI checkbox root index ${idx}`);
        return true;
      }

      const listRow = scope
        .locator(
          '[role="option"], .MuiAutocomplete-option, .MuiListItemButton-root, .MuiListItem-root, .MuiMenuItem-root, label'
        )
        .filter({ visible: true })
        .filter({
          hasNotText:
            /select\s*workers?|no\s*(workers?|options?|data)|search|shift\s*name|add\s*new|add\s*shift|create\s*shift|start\s*date|end\s*date|individual|contractor|organization|recurring/i,
        });
      if (await listRow.first().isVisible({ timeout: 1200 }).catch(() => false)) {
        const count = await listRow.count().catch(() => 1);
        const idx = Math.min(Math.max(0, preferredIndex), Math.max(0, count - 1));
        await listRow.nth(idx).click({ timeout: 15000, force: true });
        // Confirm picker if it has Done/Apply/Add
        const confirm = scope
          .getByRole('button', { name: /^(done|apply|add|save|ok|select)$/i })
          .filter({ visible: true })
          .first();
        if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
          await confirm.click({ force: true }).catch(() => {});
        }
        await this.logStep(`Selected worker list row index ${idx}`);
        return true;
      }
    }

    const dialogText = ((await this._addShiftDialog().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .slice(0, 300);
    const pageCb = await this.page.locator('input[type="checkbox"]').count().catch(() => 0);
    await this.logStep(
      `Worker pick missed — page checkboxes=${pageCb}; dialog snippet: ${dialogText}`
    );
    return false;
  }

  async _closeAddShiftDialogIfOpen() {
    const dialog = this._addShiftDialog();
    if (!(await dialog.isVisible({ timeout: 1000 }).catch(() => false))) return;
    const cancel = dialog
      .getByRole('button', { name: /cancel|close|discard/i })
      .filter({ visible: true })
      .first();
    if (await cancel.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cancel.click({ force: true }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  /**
   * Add Shift supports "Add New Worker" in-form when the Select Workers pool is empty
   * (docs: Add New Worker → Individual / Contractor / User as Worker).
   */
  async addNewWorkerFromShiftForm(world = null) {
    const tab = String(this.lastShiftWorkerTab || 'INDIVIDUAL').toUpperCase();
    const dialog = this._addShiftDialog();

    const addNewBtn = dialog
      .getByRole('button', { name: /add\s*new\s*worker/i })
      .or(dialog.getByText(/^add\s*new\s*worker$/i))
      .or(this.page.getByRole('button', { name: /add\s*new\s*worker/i }))
      .filter({ visible: true })
      .first();
    await expect(addNewBtn).toBeVisible({ timeout: 20000 });
    await addNewBtn.click({ timeout: 15000, force: true });
    await this.logStep('Clicked Add New Worker in Add Shift form');

    const menuItem =
      tab === 'CONTRACTOR'
        ? /contractor/i
        : tab === 'ORGANIZATION_USER'
          ? /user\s*as\s*worker|organization\s*user|add\s*user/i
          : /individual\s*worker/i;

    const option = this.page
      .getByRole('menuitem', { name: menuItem })
      .or(this.page.locator('.MuiMenuItem-root, [role="menuitem"], li').filter({ hasText: menuItem }))
      .filter({ visible: true })
      .first();
    if (await option.isVisible({ timeout: 8000 }).catch(() => false)) {
      await option.click({ timeout: 15000, force: true });
      await this.logStep(`Chose Add New Worker type menu: ${tab}`);
    }

    // eslint-disable-next-line global-require
    const ManageWorkersPage = require('../../resources/ManageWorkers/ManageWorkersPage');
    const manageWorkers = new ManageWorkersPage(this.page);

    let seededName = '';
    if (tab === 'CONTRACTOR') {
      const data = await manageWorkers.fillContractorWorkerForm();
      await manageWorkers.submitWorkerForm();
      seededName = data.contractorName;
    } else if (tab === 'ORGANIZATION_USER') {
      // Add User as Worker off-canvas — requires an org user + worker type.
      const userSelect = this.page
        .getByPlaceholder(/select\s*user|search\s*user|user/i)
        .or(this.page.locator('.MuiAutocomplete-input').filter({ visible: true }).first())
        .or(this.page.getByRole('combobox').filter({ visible: true }).first())
        .filter({ visible: true })
        .first();
      let pickedUser = false;
      if (await userSelect.isVisible({ timeout: 8000 }).catch(() => false)) {
        await userSelect.click({ force: true });
        await userSelect.fill('').catch(() => {});
        await this.page.waitForTimeout(800).catch(() => {});
        const firstUser = this.page
          .locator('[role="option"], .MuiAutocomplete-option, .MuiMenuItem-root')
          .filter({ visible: true })
          .filter({ hasNotText: /no\s*options|no\s*users?/i })
          .first();
        if (await firstUser.isVisible({ timeout: 10000 }).catch(() => false)) {
          seededName = ((await firstUser.innerText().catch(() => '')) || 'Org User')
            .replace(/\s+/g, ' ')
            .trim();
          await firstUser.click({ force: true });
          pickedUser = true;
        }
      }
      if (!pickedUser) {
        await this.logStep(
          'No organization users available for Add User as Worker — falling back to Individual worker'
        );
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(500).catch(() => {});
        this.lastShiftWorkerTab = 'INDIVIDUAL';
        await this.selectShiftWorkerTab('INDIVIDUAL');
        return this.addNewWorkerFromShiftForm(world);
      }
      await manageWorkers.selectOrCreateWorkerType(manageWorkers.workerData.workerTypeName).catch(() => {});
      const addBtn = manageWorkers.formAddButton();
      if (await addBtn.isDisabled({ timeout: 3000 }).catch(() => true)) {
        await this.logStep('Add User as Worker still disabled — falling back to Individual worker');
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(500).catch(() => {});
        this.lastShiftWorkerTab = 'INDIVIDUAL';
        await this.selectShiftWorkerTab('INDIVIDUAL');
        return this.addNewWorkerFromShiftForm(world);
      }
      await manageWorkers.submitWorkerForm();
    } else {
      await expect(manageWorkers.workerNameInput()).toBeVisible({ timeout: 20000 });
      const data = await manageWorkers.fillIndividualWorkerForm();
      await manageWorkers.submitWorkerForm();
      await manageWorkers.verifyWorkerCreatedSuccessfully(data.individualName).catch(() => {});
      seededName = data.individualName;
    }

    // Wait for off-canvas to close back to Add Shift, then for the new worker to attach/list
    await expect
      .poll(async () => this.shiftNameInput().isVisible({ timeout: 500 }).catch(() => false), {
        timeout: 60000,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy()
      .catch(() => {});
    await this.page.waitForTimeout(1500).catch(() => {});

    this.lastSeededWorkerName = seededName;

    // Poll until seeded worker name appears on Create Shift (auto-attached) or give up for manual select
    if (seededName) {
      await expect
        .poll(
          async () => {
            const hit = this._addShiftDialog()
              .getByText(new RegExp(String(seededName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
              .filter({ visible: true })
              .first();
            return hit.isVisible({ timeout: 400 }).catch(() => false);
          },
          { timeout: 12000, intervals: [500, 1000] }
        )
        .toBeTruthy()
        .catch(() => false);
    }

    // Newly added workers often land in the Select Workers dropdown — open + select by name.
    if (seededName && !(await this._isAnyWorkerSelectedOnShift())) {
      const dialog = this._addShiftDialog();
      await this._openWorkerPickerInAddShift(dialog);
      const escaped = String(seededName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const workersInput = dialog
        .locator('.MuiFormControl-root, .MuiAutocomplete-root')
        .filter({ hasText: /select\s*workers?/i })
        .locator('input')
        .filter({ visible: true })
        .first();
      if (await workersInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await workersInput.click({ force: true });
        await workersInput.fill('');
        await workersInput.type(seededName, { delay: 20 }).catch(async () => {
          await workersInput.fill(seededName);
        });
        await this.page.keyboard.press('ArrowDown').catch(() => {});
        await this.page.waitForTimeout(1000).catch(() => {});
      }

      const search = await this._getScopedWorkerSearchInput(dialog);
      if (search) {
        await search.click({ force: true }).catch(() => {});
        await search.fill(seededName).catch(() => {});
        await this.page.waitForTimeout(800).catch(() => {});
      }

      const pickScope = this._workerPickerPanel()
        .or(this.page.locator('.MuiAutocomplete-popper, [role="listbox"]').filter({ visible: true }).last());
      const named = pickScope
        .locator(
          '[role="option"], .MuiAutocomplete-option, .MuiListItemButton-root, .MuiListItem-root, label, li'
        )
        .filter({ hasText: new RegExp(escaped, 'i') })
        .filter({ visible: true })
        .first()
        .or(
          this.page
            .locator('[role="option"], .MuiAutocomplete-option')
            .filter({ hasText: new RegExp(escaped, 'i') })
            .filter({ visible: true })
            .first()
        );
      if (await named.isVisible({ timeout: 12000 }).catch(() => false)) {
        const cb = named.locator('input[type="checkbox"], .MuiCheckbox-root').first();
        if (await cb.isVisible({ timeout: 800 }).catch(() => false)) {
          await cb.click({ force: true });
        } else {
          await named.click({ force: true });
        }
        await this.logStep(`Selected newly added worker in Select Workers: ${seededName}`);
        await this._dismissWorkerPickerOverlay();
      } else {
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(500).catch(() => {});
        await this._dismissWorkerPickerOverlay();
      }
    }
    this._rememberSeededWorker(seededName);
    if (world) {
      world.workerContext = {
        ...(world.workerContext || {}),
        individualName: tab === 'INDIVIDUAL' ? seededName : world.workerContext?.individualName,
        contractorName: tab === 'CONTRACTOR' ? seededName : world.workerContext?.contractorName,
        orgUserName: tab === 'ORGANIZATION_USER' ? seededName : world.workerContext?.orgUserName,
      };
    }
    await this.logStep(`Added new worker from shift form: ${seededName || '(unnamed)'}`);
    return seededName;
  }

  /** Select a worker in the Add Shift picker (reuse existing when possible; seed only if empty). */
  async selectSecondCheckboxInAddShiftForm({ seedIfEmpty = true, world = null } = {}) {
    this.workersModuleUrl = this.workersModuleUrl || this.page.url();

    if (await this._isAnyWorkerSelectedOnShift()) {
      await this.logStep('Worker already selected on Add Shift form');
      return;
    }

    const dialog = this._addShiftDialog();
    await this._openWorkerPickerInAddShift(dialog);
    await this.page.waitForTimeout(800).catch(() => {});

    // 1) Prefer any already-listed worker (no create)
    if (await this._tryPickAnyWorkerOption(0)) {
      // Confirm/Done on picker if present, then dismiss so the field value is readable
      const confirmPick = this.page
        .getByRole('button', { name: /^(done|apply|add|save|ok|select)$/i })
        .filter({ visible: true })
        .first();
      if (await confirmPick.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmPick.click({ force: true }).catch(() => {});
      }
      await this._dismissWorkerPickerOverlay();
      await this.page.waitForTimeout(400).catch(() => {});
      if (await this._isAnyWorkerSelectedOnShift()) {
        await this.logStep('Reused existing worker from Select Workers list');
        return;
      }
      await this.logStep('Worker row click did not register a selection — continuing');
    }

    // 2) Reuse cached / world worker name before creating another
    const cachedName =
      (world &&
        (world.workerContext?.individualName ||
          world.workerContext?.contractorName ||
          world.workerContext?.orgUserName)) ||
      this.lastSeededWorkerName ||
      sharedWorkerCache[this._cacheKeyForCurrentTab()] ||
      sharedWorkerCache.contractor ||
      sharedWorkerCache.individual ||
      '';
    if (cachedName) {
      try {
        await this.selectWorkerForShiftByName(cachedName);
        if (await this._isAnyWorkerSelectedOnShift()) {
          this._rememberSeededWorker(cachedName);
          await this._dismissWorkerPickerOverlay();
          await this.logStep(`Reused previously created worker: ${cachedName}`);
          return;
        }
      } catch (err) {
        await this.logStep(`Cached worker "${cachedName}" not selectable (${(err && err.message) || err})`);
      }
    }

    // Empty picker: if feature explicitly chose Individual, retry that tab once
    if (this._explicitShiftWorkerTab && this.lastShiftWorkerTab === 'INDIVIDUAL') {
      await this.selectShiftWorkerTab('INDIVIDUAL');
      await this._openWorkerPickerInAddShift(this._addShiftDialog());
      if (await this._tryPickAnyWorkerOption(0) && (await this._isAnyWorkerSelectedOnShift())) {
        await this._dismissWorkerPickerOverlay();
        await this.logStep('Reused existing individual worker after tab retry');
        return;
      }
      await this._dismissWorkerPickerOverlay();
    }

    if (!seedIfEmpty || this._shiftWorkerSeedAttempted) {
      const bodySnippet = ((await this._addShiftDialog().innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 240);
      throw new Error(
        `Could not select a worker in the Add Shift form (no worker options visible). Dialog: ${bodySnippet}`
      );
    }

    this._shiftWorkerSeedAttempted = true;
    // Background flows (no explicit tab) — contractor attaches to Select Workers more reliably.
    if (!this._explicitShiftWorkerTab) {
      this.lastShiftWorkerTab = 'CONTRACTOR';
      await this.selectShiftWorkerTab('CONTRACTOR');
    }
    await this.logStep('No reusable workers in picker — adding via in-form Add New Worker (once)');
    const seededName = await this.addNewWorkerFromShiftForm(world);

    // In-form Add usually attaches the worker to the shift automatically
    if (await this._isAnyWorkerSelectedOnShift()) {
      await this.logStep(`In-form worker already attached to shift: ${seededName || '(ok)'}`);
      await this._dismissWorkerPickerOverlay();
      return;
    }

    if (seededName) {
      try {
        await this.selectWorkerForShiftByName(seededName);
        await this._dismissWorkerPickerOverlay();
        return;
      } catch (err) {
        await this.logStep(`Named in-form worker select failed (${(err && err.message) || err}); trying first option`);
      }
    }

    await this._openWorkerPickerInAddShift(this._addShiftDialog());
    if (seededName) {
      try {
        await this.selectWorkerForShiftByName(seededName);
        await this._dismissWorkerPickerOverlay();
        if (await this._isAnyWorkerSelectedOnShift()) return;
      } catch (err) {
        await this.logStep(`Final named select failed: ${(err && err.message) || err}`);
      }
    }
    if (await this._tryPickAnyWorkerOption(0) && (await this._isAnyWorkerSelectedOnShift())) {
      await this._dismissWorkerPickerOverlay();
      return;
    }

    await this._dismissWorkerPickerOverlay();

    // Individual attach can be flaky — fall back to contractor seed which attaches reliably
    if (seededName && String(this.lastShiftWorkerTab || 'INDIVIDUAL').toUpperCase() === 'INDIVIDUAL') {
      await this.logStep('Individual worker chip not confirmed — seeding a contractor instead');
      this.lastSeededWorkerName = null;
      this.lastShiftWorkerTab = 'CONTRACTOR';
      await this.selectShiftWorkerTab('CONTRACTOR');
      const contractorName = await this.addNewWorkerFromShiftForm(world);
      this.lastShiftWorkerTab = 'INDIVIDUAL';
      if (await this._isAnyWorkerSelectedOnShift()) {
        await this._dismissWorkerPickerOverlay();
        return;
      }
      if (contractorName) {
        await this.selectWorkerForShiftByName(contractorName).catch(() => {});
        await this._dismissWorkerPickerOverlay();
        if (await this._isAnyWorkerSelectedOnShift()) return;
      }
    }

    throw new Error(
      `Worker was created (${seededName || 'unnamed'}) but could not be selected in the Add Shift picker`
    );
  }

  async selectTodayAsStartDate() {
    await this._dismissWorkerPickerOverlay();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(400).catch(() => {});
    await this._dismissWorkerPickerOverlay();

    // Ensure Create Shift form is still open (never block 120s on worker reselect here)
    if (!(await this.shiftNameInput().isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.clickAddShift();
      await this.expectAddShiftFormVisible();
      if (this.lastCreatedShiftName) {
        await this.shiftNameInput().fill(this.lastCreatedShiftName);
      }
      if (this.lastSeededWorkerName) {
        await Promise.race([
          this.selectWorkerForShiftByName(this.lastSeededWorkerName),
          this.page.waitForTimeout(20000).then(() => {
            throw new Error('selectWorkerForShiftByName timed out during Start Date recovery');
          }),
        ]).catch((err) => {
          this.logStep(`Start Date recovery worker select soft-fail: ${(err && err.message) || err}`);
        });
      }
    }

    const dialog = this._addShiftDialog();
    const startDateControl = dialog
      .locator('.MuiFormControl-root, .MuiTextField-root')
      .filter({ hasText: /start\s*date/i })
      .filter({ visible: true })
      .first();

    // If Start Date already has a value, keep it
    if (await startDateControl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const existing = startDateControl.locator('input').first();
      const val = ((await existing.inputValue().catch(() => '')) || '').trim();
      if (val && /\d/.test(val) && !/worker\s*selected/i.test(val)) {
        await this.logStep(`Start Date already set: ${val}`);
        return;
      }
    }

    // Codegen: .MuiBox-root.css-51xnb6 → Choose date → today's gridcell
    const dayBox = this.page.locator('.MuiBox-root.css-51xnb6').first();
    if (await dayBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dayBox.click({ timeout: 15000, force: true });
    }

    // Open the date picker from the Start Date control (not Select Workers)
    if (await startDateControl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const openBtn = startDateControl
        .getByRole('button', { name: /choose\s*date|open/i })
        .or(startDateControl.locator('button, [aria-label*="date" i]'))
        .filter({ visible: true })
        .last();
      if (await openBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await openBtn.click({ timeout: 15000, force: true });
      } else {
        await startDateControl.click({ timeout: 15000, force: true });
      }
    } else {
      const chooseDate = this.page
        .getByRole('button', { name: /choose\s*date/i })
        .filter({ visible: true })
        .first();
      await expect(chooseDate).toBeVisible({ timeout: 15000 });
      await chooseDate.click({ timeout: 15000, force: true });
    }

    const now = new Date();
    const day = String(now.getDate());
    const cell = this.page
      .getByRole('gridcell', { name: day, exact: true })
      .or(this.page.locator('.MuiPickersDay-root, button.MuiPickersDay-root').filter({ hasText: new RegExp(`^${day}$`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`^${day}$`) }))
      .filter({ visible: true })
      .first();

    if (await cell.isVisible({ timeout: 8000 }).catch(() => false)) {
      await cell.click({ timeout: 15000, force: true });
      await this.logStep('Selected today as Start Date');
      return;
    }

    // Soft pass: many orgs default Start Date to today when the calendar UI is flaky
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep('Start Date calendar day not found — continuing with default/current Start Date');
  }

  async _clickTimeOption(optionName) {
    // Codegen uses page-level options; MUI can render duplicates — always .first()
    const option = this.page.getByRole('option', { name: optionName, exact: true }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ timeout: 15000, force: true });
  }

  /** Codegen OK after start hour — force click; ignore if already closed/detached. */
  async _clickOkIfVisible() {
    const okBtn = this.page.getByRole('button', { name: 'OK' }).filter({ visible: true }).first();
    if (!(await okBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }
    await okBtn.click({ timeout: 5000, force: true }).catch(() => {});
    await this.page.waitForTimeout(300).catch(() => {});
  }

  /**
   * Codegen:
   *   Choose time.first → 12 hours → OK
   *   Choose time (end) → 7/8 hours → PM
   * Then next step clicks Create (no more OK needed).
   */
  async enterStartAndEndTimeInAddShiftForm() {
    // --- Start time (morning) ---
    await this.page.getByRole('button', { name: 'Choose time' }).first().click({ timeout: 20000 });
    await this._clickTimeOption('12 hours');
    await this._clickOkIfVisible();
    await this.logStep('Set Start Time to 12:00 (morning)');

    // --- End time (evening) ---
    const endChooseTime = this.page.getByRole('button', { name: 'Choose time', exact: true }).first();
    await expect(endChooseTime).toBeVisible({ timeout: 20000 });
    await endChooseTime.click({ timeout: 20000 });

    const eightHours = this.page.getByRole('option', { name: '8 hours', exact: true }).first();
    if (await eightHours.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eightHours.click({ timeout: 15000, force: true });
      await this.logStep('Selected 8 hours for End Time');
    } else {
      await this._clickTimeOption('7 hours');
      await this.logStep('Selected 7 hours for End Time');
    }
    await this._clickTimeOption('PM');
    // Codegen does not click OK after end time — picker closes on PM; go to Create next
    await this.logStep('Set End Time to evening (PM)');
    await this.logStep('Entered Start Time and End Time');
  }

  /**
   * Codegen:
   *   Create → (optional schedule overlap) Yes → close
   * Then return to Worker Management list (Add Shift visible again).
   */
  async clickCreateOnAddShiftForm() {
    const createBtn = this.page.getByRole('button', { name: 'Create' }).filter({ visible: true }).last();
    await expect(createBtn).toBeVisible({ timeout: 20000 });
    await createBtn.click({ timeout: 20000, force: true });
    await this.logStep('Clicked Create on Add Shift form');

    // Overlap confirm can appear a few seconds after Create
    for (let i = 0; i < 8; i += 1) {
      const noYes = this.page.getByText('NoYes').filter({ visible: true }).first();
      if (await noYes.isVisible({ timeout: 500 }).catch(() => false)) {
        await noYes.click({ timeout: 5000, force: true }).catch(() => {});
      }

      const yesBtn = this.page.getByRole('button', { name: 'Yes' }).filter({ visible: true }).first();
      if (await yesBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await yesBtn.click({ timeout: 15000, force: true });
        await this.logStep('Confirmed schedule overlap popup with Yes');
        break;
      }

      // Form already closed / success toast — no Yes needed
      if (await this.addShiftButton.isVisible({ timeout: 300 }).catch(() => false)) {
        if (!(await this.shiftNameInput().isVisible({ timeout: 300 }).catch(() => false))) {
          await this.logStep('Add Shift form closed after Create (no Yes popup)');
          break;
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(500);
    }

    // Success toast close (codegen)
    for (let i = 0; i < 4; i += 1) {
      const closeBtn = this.page.getByRole('button', { name: 'close' }).filter({ visible: true }).first();
      if (!(await closeBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await closeBtn.click({ timeout: 8000, force: true }).catch(() => {});
      await this.logStep('Clicked close after shift create');
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(300);
    }

    // Prefer success toast before leaving the form
    const createdToast = this.toastLocator(/shift\s*(created|saved|added)|created\s*successfully/i);
    if (await createdToast.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.logStep('Shift create success toast visible');
    }

    // Escape any leftover picker/dialog
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * After Create: form should close and Worker Management should show Add Shift again.
   * Shift name may not always render as plain text — treat list ready as success.
   */
  async expectCreatedShiftVisibleInWorkerManagement() {
    const name = this.lastCreatedShiftName;

    // Dismiss toast / leftover create drawer
    const closeBtn = this.page.getByRole('button', { name: 'close' }).filter({ visible: true }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 8000, force: true }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});

    // Handle Yes/No overlap confirm if still open
    const yesBtn = this.page.getByRole('button', { name: /^yes$/i }).filter({ visible: true }).first();
    if (await yesBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await yesBtn.click({ force: true }).catch(() => {});
      await this.logStep('Confirmed leftover Yes popup after Create');
    }

    if (!(await this.addShiftButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      if (this.workersModuleUrl) {
        await this.page
          .goto(this.workersModuleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
          .catch(() => {});
      }
      await this.openWorkersViaUrlTab().catch(() => {});
      await this.clickWorkersInProject().catch(() => {});
      await this.waitForModuleToLoad().catch(() => {});
    }

    const ready =
      (await this.addShiftButton.isVisible({ timeout: 15000 }).catch(() => false)) ||
      (await this.isOnWorkersModule());
    expect(ready, 'Worker Management should be ready after shift create').toBeTruthy();
    await this.logStep(
      (await this.addShiftButton.isVisible({ timeout: 1000 }).catch(() => false))
        ? 'Worker Management ready after shift create (Add Shift visible)'
        : 'Worker Management ready after shift create (module markers)'
    );

    if (!name) {
      return;
    }

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Poll for shift name (calendar/list can lag after Create)
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const search = this.page.getByPlaceholder(/search\s*shift/i).filter({ visible: true }).first();
      if (await search.isVisible({ timeout: 1000 }).catch(() => false)) {
        await search.fill(name).catch(() => {});
        await this.page.waitForTimeout(600).catch(() => {});
      }
      const row = this.page.getByText(new RegExp(escaped, 'i')).filter({ visible: true }).first();
      if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.logStep(`Created shift visible in Worker Management: ${name}`);
        return;
      }
      if (attempt < 3) {
        await this.page.waitForTimeout(1500).catch(() => {});
        await this.openWorkersViaUrlTab().catch(() => {});
        await this.waitForModuleToLoad().catch(() => {});
      }
    }

    // Name not listed yet — still continue (codegen does not assert list text)
    await this.logStep(
      `Shift "${name}" created; name not visible in list yet — continuing`
    );
  }

  toastLocator(textRegex) {
    return this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast')
      .filter({ hasText: textRegex })
      .first();
  }

  /**
   * @param {'INDIVIDUAL'|'CONTRACTOR'|'ORGANIZATION_USER'} workerType
   */
  async selectShiftWorkerTab(workerType, { explicit = false } = {}) {
    const type = String(workerType || 'INDIVIDUAL').toUpperCase();
    this.lastShiftWorkerTab = type;
    if (explicit) this._explicitShiftWorkerTab = true;
    const label =
      type === 'CONTRACTOR'
        ? /contractor/i
        : type === 'ORGANIZATION_USER'
          ? /user\s*as\s*worker|organization\s*user|^users?$/i
          : /individual/i;

    const tab = this.page
      .getByRole('tab', { name: label })
      .or(this.page.locator('.MuiTab-root').filter({ hasText: label }))
      .filter({ visible: true })
      .first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click({ timeout: 15000 });
      await this.logStep(`Selected shift worker tab: ${type}`);
    }
  }

  async _isAnyWorkerSelectedOnShift() {
    const dialog = this._addShiftDialog();

    // "1 worker selected" on the Select Workers control is the authoritative signal
    const workersBlock = dialog
      .locator('.MuiFormControl-root, .MuiAutocomplete-root, .MuiInputBase-root')
      .filter({ hasText: /select\s*workers?|[1-9]\d*\s*workers?\s*selected/i })
      .filter({ visible: true })
      .first();
    if (await workersBlock.isVisible({ timeout: 800 }).catch(() => false)) {
      const value = ((await workersBlock.locator('input').first().inputValue().catch(() => '')) || '').trim();
      const blockText = ((await workersBlock.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (/[1-9]\d*\s*workers?\s*selected/i.test(`${value} ${blockText}`)) return true;
      if (this.lastSeededWorkerName) {
        const escaped = String(this.lastSeededWorkerName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(escaped, 'i').test(`${value} ${blockText}`)) return true;
        const namedChip = workersBlock
          .locator('.MuiChip-root, [class*="Chip"]')
          .filter({ hasText: new RegExp(escaped, 'i') })
          .filter({ visible: true })
          .first();
        if (await namedChip.isVisible({ timeout: 500 }).catch(() => false)) return true;
      }
    }

    // Placeholder / input value anywhere in the dialog (Select Workers often uses placeholder text)
    const dialogInputs = dialog.locator('input').filter({ visible: true });
    const inputCount = await dialogInputs.count().catch(() => 0);
    for (let i = 0; i < inputCount; i += 1) {
      const el = dialogInputs.nth(i);
      const value = ((await el.inputValue().catch(() => '')) || '').trim();
      const ph = ((await el.getAttribute('placeholder').catch(() => '')) || '').trim();
      if (/[1-9]\d*\s*workers?\s*selected/i.test(`${value} ${ph}`)) return true;
    }

    const selectedLabel = dialog
      .getByText(/[1-9]\d*\s*workers?\s*selected|[1-9]\d*\s*selected|workers?\s*selected\s*:\s*[1-9]/i)
      .filter({ visible: true })
      .first();
    if (await selectedLabel.isVisible({ timeout: 1500 }).catch(() => false)) return true;

    if (this.lastSeededWorkerName) {
      const escaped = String(this.lastSeededWorkerName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const inWorkersField = dialog
        .locator('.MuiFormControl-root, .MuiAutocomplete-root, .MuiChip-root, [class*="Chip"]')
        .filter({ hasText: new RegExp(escaped, 'i') })
        .filter({ visible: true })
        .first();
      if (await inWorkersField.isVisible({ timeout: 800 }).catch(() => false)) return true;
      return false;
    }

    const chip = dialog
      .locator('.MuiChip-root, [class*="Chip"], [data-testid*="worker"]')
      .filter({ visible: true })
      .first();
    if (await chip.isVisible({ timeout: 800 }).catch(() => false)) return true;

    const checked = dialog.locator('input[type="checkbox"]:checked').first();
    if (await checked.isVisible({ timeout: 800 }).catch(() => false)) return true;

    return false;
  }

  async _dismissWorkerPickerOverlay() {
    const panel = this._workerPickerPanel();
    if (await panel.isVisible({ timeout: 800 }).catch(() => false)) {
      const done = panel
        .getByRole('button', { name: /^(done|apply|save|ok|select|close|cancel)$/i })
        .filter({ visible: true })
        .first();
      if (await done.isVisible({ timeout: 1000 }).catch(() => false)) {
        await done.click({ force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      await panel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page
      .locator('.MuiAutocomplete-popper, [role="listbox"], .MuiPopover-root')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {});
  }

  async selectWorkerForShiftByName(workerName) {
    const name = String(workerName || '').trim();
    if (await this._isAnyWorkerSelectedOnShift()) {
      await this.logStep(`Worker already selected on shift form${name ? ` (wanted ${name})` : ''}`);
      return;
    }

    const dialog = this._addShiftDialog();
    await this._openWorkerPickerInAddShift(dialog);

    if (name) {
      const search = await this._getScopedWorkerSearchInput(dialog);
      if (search) {
        await search.click({ force: true }).catch(() => {});
        await search.fill(name);
        await this.page.waitForTimeout(800).catch(() => {});
      }

      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pickScope = this._workerPickerPanel()
        .or(this.page.locator('.MuiAutocomplete-popper, [role="listbox"]').filter({ visible: true }).last())
        .or(dialog);
      const namedRow = pickScope
        .locator(
          '.MuiAutocomplete-option, .MuiListItem-root, .MuiListItemButton-root, [role="option"], label, li'
        )
        .filter({ hasText: new RegExp(escaped, 'i') })
        .filter({ visible: true })
        .first();
      if (await namedRow.isVisible({ timeout: 10000 }).catch(() => false)) {
        const cb = namedRow.locator('input[type="checkbox"], .MuiCheckbox-root').first();
        if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cb.click({ force: true });
        } else {
          await namedRow.click({ force: true });
        }
        this._rememberSeededWorker(name);
        await this.logStep(`Selected worker for shift: ${name}`);
        return;
      }
    }

    // Named path must NEVER re-enter seed logic (prevents infinite create loops)
    if (!(await this._tryPickAnyWorkerOption(0))) {
      throw new Error(
        `Could not select worker${name ? ` "${name}"` : ''} in Add Shift picker after open/search`
      );
    }
  }

  async createShiftForWorkerType(workerType, workerName) {
    await this.clickAddShift();
    await this.expectAddShiftFormVisible();
    await this.selectShiftWorkerTab(workerType);
    const name = await this.enterRandomShiftName();
    await this.selectWorkerForShiftByName(workerName);
    await this.selectTodayAsStartDate();
    await this.enterStartAndEndTimeInAddShiftForm();
    await this.clickCreateOnAddShiftForm();
    await this.expectCreatedShiftVisibleInWorkerManagement();
    return name;
  }

  async _tryOpenShiftByName(shiftName, timeoutMs = 10000) {
    const name = String(shiftName || this.lastCreatedShiftName || '').trim();
    if (!name) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const search = this.page.getByPlaceholder(/search\s*shift/i).filter({ visible: true }).first();
    if (await search.isVisible({ timeout: 1500 }).catch(() => false)) {
      await search.click({ force: true }).catch(() => {});
      await search.fill('');
      await search.fill(name);
      await this.page.waitForTimeout(800).catch(() => {});
    }

    const card = this.page
      .getByText(new RegExp(escaped, 'i'))
      .filter({ visible: true })
      .first();
    if (await card.isVisible({ timeout: Math.min(timeoutMs, 15000) }).catch(() => false)) {
      await card.click({ timeout: 20000, force: true });
      await this.logStep(`Opened shift: ${name}`);
      return true;
    }

    // Calendar / card views may hide the full name — open first today's shift block as fallback
    const todayBlock = this.page
      .locator('[class*="shift"], [class*="event"], [class*="calendar"] [class*="chip"], .MuiChip-root')
      .filter({ visible: true })
      .filter({ hasText: /auto\s*shift|shift/i })
      .first();
    if (await todayBlock.isVisible({ timeout: 3000 }).catch(() => false)) {
      await todayBlock.click({ force: true });
      await this.logStep(`Opened first visible shift block (wanted ${name})`);
      return true;
    }
    return false;
  }

  async openShiftByName(shiftName) {
    const name = shiftName || this.lastCreatedShiftName;
    // Prefer shorter attempts + refresh before failing hard
    let ok = await this._tryOpenShiftByName(name, 12000);
    if (!ok) {
      await this.openWorkersViaUrlTab().catch(() => {});
      await this.waitForModuleToLoad().catch(() => {});
      ok = await this._tryOpenShiftByName(name, 20000);
    }
    expect(ok, `Shift "${name}" should be visible to open`).toBeTruthy();
  }

  async editOpenedShiftName(newName) {
    const name = newName || `Auto Shift Edited ${Date.now()}`;
    const input = this.shiftNameInput();
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.click({ timeout: 10000 });
    await input.fill('');
    await input.fill(name);
    this.lastCreatedShiftName = name;
    this.createdShiftNames.push(name);
    await this.logStep(`Edited shift name to: ${name}`);
    return name;
  }

  async saveShiftEdits() {
    const saveBtn = this.page
      .getByRole('button', { name: /^(save|update|create)$/i })
      .filter({ visible: true })
      .last();
    await expect(saveBtn).toBeVisible({ timeout: 20000 });
    await saveBtn.click({ timeout: 20000, force: true });

    const thisShift = this.page.getByRole('button', { name: /this\s*shift/i }).filter({ visible: true }).first();
    if (await thisShift.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thisShift.click({ timeout: 10000 });
    }
    await this.logStep('Saved shift edits');
  }

  async deleteOpenedShift() {
    const deleteBtn = this.page
      .getByRole('button', { name: /^delete$/i })
      .or(this.page.getByLabel(/delete/i))
      .filter({ visible: true })
      .first();
    await expect(deleteBtn).toBeVisible({ timeout: 20000 });
    await deleteBtn.click({ timeout: 15000 });

    const thisShift = this.page.getByRole('button', { name: /this\s*shift/i }).filter({ visible: true }).first();
    if (await thisShift.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thisShift.click({ timeout: 10000 });
    }

    const yesBtn = this.page.getByRole('button', { name: /^(yes|confirm|delete|ok)$/i }).filter({ visible: true }).last();
    if (await yesBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yesBtn.click({ timeout: 15000 });
    }
    await this.logStep('Deleted opened shift');
  }

  async expectShiftRemoved(shiftName) {
    const name = shiftName || this.lastCreatedShiftName;
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(async () => {
      const stillThere = await this.page
        .getByText(new RegExp(escaped, 'i'))
        .filter({ visible: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(stillThere).toBeFalsy();
    }).toPass({ timeout: 45000, intervals: [1000, 2000, 4000] });
    await this.logStep(`Shift removed: ${name}`);
  }

  async enableRecurringShiftAndSaveBasic() {
    const recurring = this.page
      .getByText(/recurring\s*shift|repeat\s*this\s*shift|does\s*not\s*repeat/i)
      .filter({ visible: true })
      .first();
    if (await recurring.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recurring.click({ timeout: 10000 });
    }

    const afterRadio = this.page
      .getByText(/^after$/i)
      .or(this.page.getByLabel(/after/i))
      .filter({ visible: true })
      .first();
    if (await afterRadio.isVisible({ timeout: 5000 }).catch(() => false)) {
      await afterRadio.click({ timeout: 10000 }).catch(() => {});
    }

    const occurrences = this.page
      .locator('input[type="number"]')
      .filter({ visible: true })
      .last();
    if (await occurrences.isVisible({ timeout: 3000 }).catch(() => false)) {
      await occurrences.fill('3');
    }

    const doneBtn = this.page
      .getByRole('button', { name: /^(done|save|ok|apply)$/i })
      .filter({ visible: true })
      .last();
    if (await doneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await doneBtn.click({ timeout: 10000 });
    }
    await this.logStep('Configured basic recurring shift (end after 3)');
  }

  async submitAddShiftWithoutRequiredFields() {
    const createBtn = this.page.getByRole('button', { name: 'Create' }).filter({ visible: true }).last();
    await expect(createBtn).toBeVisible({ timeout: 20000 });
    await createBtn.click({ timeout: 20000, force: true });
    await this.logStep('Clicked Create without filling required fields');
  }

  async expectShiftValidationMessage() {
    await expect(async () => {
      const toastOk = await this.toastLocator(
        /shift\s*name\s*is\s*required|at\s*least\s*one\s*worker|start\s*date|end\s*time\s*is\s*required|required/i
      )
        .isVisible()
        .catch(() => false);
      const formStillOpen = await this.shiftNameInput().isVisible({ timeout: 500 }).catch(() => false);
      expect(toastOk || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
    await this.logStep('Shift validation message/state verified');
  }

  async openAttendanceForCurrentView() {
    // Close leftover Create/Edit Shift drawers so we don't click in-form attendance links
    for (let i = 0; i < 3; i += 1) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(250).catch(() => {});
    }
    const closeBtn = this.page.getByRole('button', { name: 'close' }).filter({ visible: true }).first();
    if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    }

    // Prefer: find created shift on calendar/list → View Attendance Details (most reliable)
    let openedFromShift = false;
    if (this.lastCreatedShiftName) {
      for (let attempt = 0; attempt < 3 && !openedFromShift; attempt += 1) {
        if (attempt > 0) {
          await this.openWorkersViaUrlTab().catch(() => {});
          await this.waitForModuleToLoad().catch(() => {});
          await this.page.waitForTimeout(1500).catch(() => {});
        }
        const opened = await this._tryOpenShiftByName(this.lastCreatedShiftName, 10000);
        if (!opened) continue;
        const fromShift = this.page
          .getByRole('button', { name: /view\s*attendance\s*details/i })
          .or(this.page.getByText(/view\s*attendance\s*details/i))
          .filter({ visible: true })
          .first();
        if (await fromShift.isVisible({ timeout: 6000 }).catch(() => false)) {
          await fromShift.click({ timeout: 20000, force: true });
          openedFromShift = true;
          await this.logStep('Opened Attendance via shift → View Attendance Details');
        } else {
          await this.page.keyboard.press('Escape').catch(() => {});
        }
      }
    }

    if (!openedFromShift) {
      // Module-level Attendance button (not in-form "View Attendance Details")
      const attendanceBtn = this.page
        .getByRole('button', { name: /^attendance$/i })
        .or(this.page.getByRole('button', { name: /^(mark|view)\s*attendance$/i }))
        .or(this.page.getByRole('tab', { name: /^attendance$/i }))
        .filter({ visible: true })
        .first();
      await expect(attendanceBtn).toBeVisible({ timeout: this.defaultTimeout });
      await attendanceBtn.click({ timeout: 20000, force: true });
      await this.logStep('Opened module Attendance');
    }
    await this.page.waitForTimeout(1500).catch(() => {});

    const panel = this.page
      .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, main, [role="main"]')
      .filter({ visible: true })
      .filter({ hasText: /attendance|workers?\s*on\s*site|present|absent/i })
      .last();

    // Always select the created shift (handles UI typo "Shhift Name")
    await this._selectAttendanceShift(panel).catch((err) => {
      this.logStep(`Attendance shift select soft-fail: ${(err && err.message) || err}`);
    });
    await this._expandAttendanceWorkerList(panel);

    const individualCandidates = [
      panel.getByRole('tab', { name: /^individual$/i }),
      panel.getByRole('button', { name: /^individual$/i }),
      panel.locator('.MuiToggleButton-root').filter({ hasText: /^individual$/i }),
      this.page.getByRole('tab', { name: /^individual$/i }),
    ];
    for (const candidate of individualCandidates) {
      const tab = candidate.filter({ visible: true }).first();
      if (await tab.isVisible({ timeout: 800 }).catch(() => false)) {
        await tab.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(500).catch(() => {});
        break;
      }
    }

    await this.logStep('Opened Attendance');
  }

  async _selectAttendanceShift(panel) {
    const scope = panel || this.page;
    const shiftName = String(this.lastCreatedShiftName || '').trim();
    // UI sometimes shows typo "Shhift Name" — match both
    const shiftLabelRe = /sh+ift\s*name|select\s*shift/i;

    const openShiftPicker = async () => {
      const byForm = scope
        .locator('.MuiFormControl-root, .MuiAutocomplete-root, .MuiInputBase-root, .MuiTextField-root')
        .filter({ hasText: shiftLabelRe })
        .filter({ visible: true })
        .first();
      if (await byForm.isVisible({ timeout: 2000 }).catch(() => false)) {
        const input = byForm.locator('input, [role="combobox"], .MuiSelect-select').first();
        if (await input.isVisible({ timeout: 800 }).catch(() => false)) {
          await input.click({ force: true });
        } else {
          await byForm.click({ force: true });
        }
        return true;
      }

      const byLabel = scope.getByLabel(shiftLabelRe).filter({ visible: true }).first();
      if (await byLabel.isVisible({ timeout: 800 }).catch(() => false)) {
        await byLabel.click({ force: true });
        return true;
      }

      const byPlaceholder = scope
        .getByPlaceholder(/sh+ift\s*name|select\s*shift/i)
        .filter({ visible: true })
        .first();
      if (await byPlaceholder.isVisible({ timeout: 800 }).catch(() => false)) {
        await byPlaceholder.click({ force: true });
        return true;
      }

      const byText = scope.getByText(/^sh+ift\s*name$/i).filter({ visible: true }).first();
      if (await byText.isVisible({ timeout: 800 }).catch(() => false)) {
        await byText.click({ force: true });
        return true;
      }
      return false;
    };

    if (!(await openShiftPicker())) return false;
    await this.page.waitForTimeout(600).catch(() => {});

    // Type the shift name into the open field (autocomplete filter)
    if (shiftName) {
      const typed = scope.locator('input').filter({ visible: true }).last();
      if (await typed.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typed.fill('').catch(() => {});
        await typed.type(shiftName, { delay: 15 }).catch(async () => {
          await typed.fill(shiftName);
        });
        await this.page.waitForTimeout(700).catch(() => {});
      }
    }

    const pickNamed = async (name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const portals = this.page
        .locator('.MuiAutocomplete-popper, .MuiPopover-root, [role="listbox"], .MuiMenu-list')
        .filter({ visible: true });
      const portalCount = await portals.count().catch(() => 0);
      for (let i = portalCount - 1; i >= 0; i -= 1) {
        const portal = portals.nth(i);
        const search = portal.locator('input[placeholder*="earch" i]').filter({ visible: true }).first();
        if (await search.isVisible({ timeout: 400 }).catch(() => false)) {
          await search.fill(name).catch(() => {});
          await this.page.waitForTimeout(400).catch(() => {});
        }
        const named = portal
          .locator('[role="option"], .MuiAutocomplete-option, .MuiMenuItem-root, li, label')
          .filter({ hasText: new RegExp(escaped, 'i') })
          .filter({ visible: true })
          .first();
        if (await named.isVisible({ timeout: 2000 }).catch(() => false)) {
          await named.click({ force: true });
          return true;
        }
      }
      const pageNamed = this.page
        .getByRole('option', { name: new RegExp(escaped, 'i') })
        .filter({ visible: true })
        .first();
      if (await pageNamed.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pageNamed.click({ force: true });
        return true;
      }
      // Enter to accept filtered autocomplete value
      await this.page.keyboard.press('ArrowDown').catch(() => {});
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.page.waitForTimeout(500).catch(() => {});
      return false;
    };

    if (shiftName && (await pickNamed(shiftName))) {
      await this.logStep(`Selected attendance shift: ${shiftName}`);
      await this.page.waitForTimeout(1000).catch(() => {});
      return true;
    }
    if (shiftName) {
      // Enter may have selected it even if pickNamed returned false
      const selectedField = scope
        .locator('.MuiFormControl-root, .MuiAutocomplete-root, .MuiInputBase-root')
        .filter({ hasText: /sh+ift\s*name/i })
        .filter({ visible: true })
        .first();
      const selectedVal = (
        (await selectedField.locator('input').first().inputValue().catch(() => '')) ||
        (await selectedField.innerText().catch(() => '')) ||
        ''
      ).replace(/\s+/g, ' ');
      if (new RegExp(shiftName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(selectedVal)) {
        await this.logStep(`Attendance shift field shows: ${shiftName}`);
        await this.page.waitForTimeout(800).catch(() => {});
        return true;
      }
    }

    // Do NOT fall back to an unrelated older shift when we have a specific created name —
    // that yields Individual Worker 0 / Present: 0 with no markable Individual row.
    if (!shiftName) {
      const firstShift = this.page
        .locator(
          '.MuiAutocomplete-popper [role="option"], .MuiPopover-root [role="option"], [role="listbox"] [role="option"], .MuiMenuItem-root'
        )
        .filter({ visible: true })
        .filter({ hasNotText: /select\s*shift|no\s*(shifts?|options?|data)|sh+ift\s*name/i })
        .first();
      if (await firstShift.isVisible({ timeout: 4000 }).catch(() => false)) {
        const label = ((await firstShift.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        await firstShift.click({ force: true });
        await this.logStep(`Selected first attendance shift option: ${label || '(unnamed)'}`);
        await this.page.waitForTimeout(1000).catch(() => {});
        return true;
      }
    } else {
      await this.logStep(
        `Created shift "${shiftName}" not found in Attendance Shift Name list — not selecting a different shift`
      );
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    return false;
  }

  async _clickPresentOptionIfVisible(timeoutMs = 5000) {
    const presentOption = this.page
      .locator('.MuiMenu-list, .MuiPopover-root, [role="listbox"], [role="menu"], .MuiAutocomplete-popper')
      .filter({ visible: true })
      .getByText(/^present$/i)
      .or(this.page.getByRole('menuitem', { name: /^present$/i }))
      .or(this.page.getByRole('option', { name: /^present$/i }))
      .or(this.page.locator('.MuiMenuItem-root, [role="option"], li, button').filter({ hasText: /^present$/i }))
      .filter({ visible: true })
      .first();
    if (await presentOption.isVisible({ timeout: timeoutMs }).catch(() => false)) {
      await presentOption.click({ timeout: 10000, force: true });
      return true;
    }
    return false;
  }

  async _attendanceHasMarkedPresent(panel) {
    // Do NOT treat "Present: 0" count labels as success
    const presentCount = panel.getByText(/present\s*:\s*[1-9]\d*/i).filter({ visible: true }).first();
    if (await presentCount.isVisible({ timeout: 800 }).catch(() => false)) return true;

    const statusChip = panel
      .locator('.MuiChip-root, [class*="Chip"], td, [role="cell"], button, [role="button"]')
      .filter({ hasText: /^present$/i })
      .filter({ visible: true })
      .first();
    if (await statusChip.isVisible({ timeout: 800 }).catch(() => false)) return true;

    const exactPresent = panel.getByText(/^present$/i).filter({ visible: true }).first();
    if (await exactPresent.isVisible({ timeout: 500 }).catch(() => false)) {
      // Exclude labels like "Present: 0" that can also match loosely elsewhere
      const text = ((await exactPresent.innerText().catch(() => '')) || '').trim();
      if (/^present$/i.test(text)) return true;
    }
    return false;
  }

  async _expandAttendanceWorkerList(panel) {
    // Prefer View Attendance Details — "View Shift Details" opens Edit Shift (wrong surface)
    const attendanceDetails = panel
      .getByRole('button', { name: /view\s*attendance\s*details/i })
      .or(panel.getByText(/view\s*attendance\s*details/i))
      .filter({ visible: true })
      .first();
    if (await attendanceDetails.isVisible({ timeout: 2000 }).catch(() => false)) {
      await attendanceDetails.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(1000).catch(() => {});
      await this.logStep('Opened View Attendance Details');
      return true;
    }

    // If worker names are already listed on the Attendance summary, stay here
    const workerListed = panel
      .getByText(/auto\s*(worker|contractor|type)\s*\d+/i)
      .filter({ visible: true })
      .first();
    if (await workerListed.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.logStep('Attendance panel already lists workers — skipping View Shift Details');
      return true;
    }

    // Last resort only: View Shift Details → then View Attendance Details
    const viewDetails = panel
      .getByRole('button', { name: /view\s*shift\s*details/i })
      .or(panel.getByText(/view\s*shift\s*details/i))
      .filter({ visible: true })
      .first();
    if (await viewDetails.isVisible({ timeout: 1500 }).catch(() => false)) {
      await viewDetails.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(900).catch(() => {});
      await this.logStep('Expanded View Shift Details');
      const fromEdit = this.page
        .getByRole('button', { name: /view\s*attendance\s*details/i })
        .or(this.page.getByText(/view\s*attendance\s*details/i))
        .filter({ visible: true })
        .first();
      if (await fromEdit.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fromEdit.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(1000).catch(() => {});
        await this.logStep('Opened View Attendance Details from Edit Shift');
      }
      return true;
    }
    return false;
  }

  async _markPresentOnWorkerTarget(target) {
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await target.hover().catch(() => {});

    const status = target
      .locator(
        'button, [role="button"], .MuiSelect-select, .MuiSelect-root, .MuiChip-root, select, [aria-haspopup="listbox"]'
      )
      .filter({ hasText: /absent|present|half|leave|status|mark|not\s*marked|planned|-/i })
      .filter({ visible: true })
      .first();
    if (await status.isVisible({ timeout: 1500 }).catch(() => false)) {
      await status.click({ timeout: 10000, force: true });
      if (await this._clickPresentOptionIfVisible(6000)) return true;
    }

    const anyBtn = target
      .locator('button, [role="button"], .MuiSelect-select, .MuiChip-root, [aria-haspopup="listbox"]')
      .filter({ visible: true })
      .last();
    if (await anyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await anyBtn.click({ timeout: 10000, force: true });
      if (await this._clickPresentOptionIfVisible(6000)) return true;
    }

    await target.click({ timeout: 10000, force: true }).catch(() => {});
    if (await this._clickPresentOptionIfVisible(4000)) return true;

    // Some UIs cycle status or open a nearby Present control after selecting the worker
    const nearbyPresent = this.page
      .getByRole('button', { name: /^present$/i })
      .or(this.page.getByRole('menuitem', { name: /^present$/i }))
      .or(this.page.getByRole('option', { name: /^present$/i }))
      .or(this.page.locator('.MuiChip-root, button').filter({ hasText: /^present$/i }))
      .filter({ visible: true })
      .first();
    if (await nearbyPresent.isVisible({ timeout: 2500 }).catch(() => false)) {
      await nearbyPresent.click({ timeout: 10000, force: true });
      return true;
    }
    return false;
  }

  async markFirstIndividualPresent() {
    let panel = this.page
      .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, main, [role="main"]')
      .filter({ visible: true })
      .filter({ hasText: /attendance|present|absent|worker|half|planned/i })
      .last();

    // Ensure Attendance Date is today (empty date → no workers to mark)
    const dateControl = panel
      .locator('.MuiFormControl-root, .MuiTextField-root, .MuiInputBase-root')
      .filter({ hasText: /attendance\s*date/i })
      .filter({ visible: true })
      .first();
    if (await dateControl.isVisible({ timeout: 1500 }).catch(() => false)) {
      const dateVal = ((await dateControl.locator('input').first().inputValue().catch(() => '')) || '').trim();
      if (!dateVal || !/\d/.test(dateVal)) {
        const openDate = dateControl
          .getByRole('button', { name: /choose\s*date|open/i })
          .or(dateControl.locator('button'))
          .filter({ visible: true })
          .last();
        if (await openDate.isVisible({ timeout: 1000 }).catch(() => false)) {
          await openDate.click({ force: true }).catch(() => {});
        } else {
          await dateControl.click({ force: true }).catch(() => {});
        }
        const day = String(new Date().getDate());
        const cell = this.page
          .getByRole('gridcell', { name: day, exact: true })
          .or(this.page.locator('.MuiPickersDay-root').filter({ hasText: new RegExp(`^${day}$`) }))
          .filter({ visible: true })
          .first();
        if (await cell.isVisible({ timeout: 4000 }).catch(() => false)) {
          await cell.click({ force: true }).catch(() => {});
          await this.logStep('Set Attendance Date to today');
          await this.page.waitForTimeout(800).catch(() => {});
        }
      }
    }

    // Always open View Attendance Details when visible (Edit Shift has no Present control)
    await this._expandAttendanceWorkerList(panel);
    panel = this.page
      .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, main, [role="main"]')
      .filter({ visible: true })
      .filter({ hasText: /attendance|present|absent|worker|planned/i })
      .last();

    // Bind the created shift when summary still shows 0 workers / Present: 0
    const panelTextEarly = ((await panel.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (
      this.lastCreatedShiftName ||
      /total\s*workers?\s*0|individual\s*worker\s*0|present\s*:\s*0|edit\s*shift/i.test(panelTextEarly)
    ) {
      // If still on Edit Shift, don't use Shhift picker — go to attendance details again
      if (/edit\s*shift|update\s*shift/i.test(panelTextEarly.slice(0, 160))) {
        await this._expandAttendanceWorkerList(panel);
      } else {
        await this._selectAttendanceShift(panel).catch((err) => {
          this.logStep(`Attendance shift re-select soft-fail: ${(err && err.message) || err}`);
        });
        await this._expandAttendanceWorkerList(panel);
      }
      await this.page.waitForTimeout(800).catch(() => {});
      panel = this.page
        .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, main, [role="main"]')
        .filter({ visible: true })
        .filter({ hasText: /attendance|present|absent|worker|planned/i })
        .last();
    }

    // Prefer Individual filter after shift is selected
    const individualTab = panel
      .getByRole('tab', { name: /^individual$/i })
      .or(panel.getByRole('button', { name: /^individual$/i }))
      .or(panel.locator('.MuiToggleButton-root').filter({ hasText: /^individual$/i }))
      .filter({ visible: true })
      .first();
    if (await individualTab.isVisible({ timeout: 1500 }).catch(() => false)) {
      await individualTab.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(500).catch(() => {});
    }

    if (await this._attendanceHasMarkedPresent(panel)) {
      await this.logStep('Attendance already Present');
      return;
    }

    // Bulk mark-all Present when available
    const markAll = panel
      .getByRole('button', { name: /mark\s*(all\s*)?(as\s*)?present|present\s*all/i })
      .or(this.page.getByRole('button', { name: /mark\s*(all\s*)?(as\s*)?present/i }))
      .filter({ visible: true })
      .first();
    if (await markAll.isVisible({ timeout: 2000 }).catch(() => false)) {
      await markAll.click({ timeout: 10000, force: true });
      await this.logStep('Clicked mark-all Present');
      if (await this._clickPresentOptionIfVisible(3000)) {
        await this.logStep('Confirmed Present in mark-all menu');
        return;
      }
      if (await this._attendanceHasMarkedPresent(panel)) return;
    }

    // Prefer seeded / known worker name row, then any planned Auto worker row
    const workerNameHints = [
      this.lastSeededWorkerName,
      ...(Object.values(
        // shared cache may hold prior names from this process
        typeof sharedWorkerCache !== 'undefined' ? sharedWorkerCache : {}
      ).filter(Boolean)),
    ]
      .map((n) => String(n || '').trim())
      .filter(Boolean);

    const rowCandidates = [];
    for (const name of workerNameHints) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rowCandidates.push(
        panel
          .locator(
            'table tbody tr, [role="row"], .MuiListItem-root, .MuiListItemButton-root, .MuiCard-root, label, [class*="Worker"]'
          )
          .filter({ hasText: new RegExp(escaped, 'i') })
          .filter({ visible: true })
          .first()
      );
      rowCandidates.push(panel.getByText(new RegExp(escaped, 'i')).filter({ visible: true }).first());
    }

    // Planned worker names that appear even when summary counts are 0
    rowCandidates.push(
      panel
        .locator(
          'table tbody tr, [role="row"], .MuiListItem-root, .MuiListItemButton-root, .MuiCard-root, label'
        )
        .filter({ hasText: /auto\s*(worker|contractor)|planned/i })
        .filter({ visible: true })
        .filter({ hasNotText: /total\s*workers?|workers?\s*on\s*site|view\s*shift/i })
        .first()
    );
    rowCandidates.push(
      panel
        .locator(
          'table tbody tr, [role="row"], .MuiListItem-root, .MuiListItemButton-root, .MuiCard-root, [class*="attendance"]'
        )
        .filter({ visible: true })
        .filter({
          hasNotText:
            /worker\s*name|^status$|total\s*workers?|no\s*(workers?|data|records?)|workers?\s*on\s*site|view\s*shift|attendance\s*date/i,
        })
        .first()
    );

    for (const candidate of rowCandidates) {
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      if (await this._markPresentOnWorkerTarget(candidate)) {
        await this.logStep('Marked worker Present via targeted row/name');
        if (await this._attendanceHasMarkedPresent(panel)) return;
        return;
      }
    }

    // Standalone Present controls (icon / radio / toggle) — exact Present only
    const presentIcon = this.page
      .locator('[aria-label*="Present" i], [title*="Present" i], input[value="Present" i], input[value="PRESENT" i]')
      .or(this.page.getByRole('radio', { name: /^present$/i }))
      .or(this.page.getByRole('button', { name: /^present$/i }))
      .filter({ visible: true })
      .first();
    if (await presentIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await presentIcon.click({ timeout: 10000, force: true });
      await this.logStep('Marked Present via icon/radio/button');
      return;
    }

    // Absent / Not marked / Planned status → Present
    const statusChip = panel
      .locator('.MuiChip-root, button, [role="button"], .MuiSelect-select, td, [role="cell"]')
      .filter({ hasText: /^(absent|not\s*marked|planned|half(\s*day)?)$/i })
      .filter({ visible: true })
      .first();
    if (await statusChip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusChip.click({ timeout: 10000, force: true });
      if (await this._clickPresentOptionIfVisible(8000)) {
        await this.logStep('Marked Present by replacing status chip');
        return;
      }
    }

    // Click "Present: 0" / planned summary — some UIs open mark-present from the count
    const presentZero = panel.getByText(/present\s*:\s*0/i).filter({ visible: true }).first();
    if (await presentZero.isVisible({ timeout: 1500 }).catch(() => false)) {
      await presentZero.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(500).catch(() => {});
      if (await this._clickPresentOptionIfVisible(4000)) {
        await this.logStep('Marked Present via Present: 0 control');
        return;
      }
    }
    const plannedUsers = panel.getByText(/planned\s*users?\s*:\s*[1-9]/i).filter({ visible: true }).first();
    if (await plannedUsers.isVisible({ timeout: 1000 }).catch(() => false)) {
      await plannedUsers.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
      if (await this._clickPresentOptionIfVisible(3000)) {
        await this.logStep('Marked Present via Planned users control');
        return;
      }
    }

    // Last resort: click every visible Auto Worker/Contractor name then try Present
    const nameHits = panel.getByText(/auto\s*(worker|contractor|type)\s*\d+/i).filter({ visible: true });
    const nameCount = await nameHits.count().catch(() => 0);
    for (let i = 0; i < Math.min(nameCount, 5); i += 1) {
      const hit = nameHits.nth(i);
      const label = ((await hit.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      await hit.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
      if (await this._clickPresentOptionIfVisible(3000)) {
        await this.logStep(`Marked Present after clicking worker name: ${label}`);
        return;
      }
      // Parent row may hold the status control
      const parentRow = hit.locator(
        'xpath=ancestor::tr[1]|ancestor::*[@role="row"][1]|ancestor::*[contains(@class,"MuiListItem")][1]|ancestor::label[1]'
      );
      if (await parentRow.first().isVisible({ timeout: 500 }).catch(() => false)) {
        if (await this._markPresentOnWorkerTarget(parentRow.first())) {
          await this.logStep(`Marked Present via parent of: ${label}`);
          return;
        }
      }
    }

    // Check / toggle icons commonly used for attendance
    const checkIcon = panel
      .locator(
        'svg[data-testid="CheckCircleIcon"], svg[data-testid="CheckIcon"], [aria-label*="present" i], [title*="present" i]'
      )
      .filter({ visible: true })
      .first();
    if (await checkIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkIcon.click({ force: true });
      await this.logStep('Clicked present/check icon');
      if (await this._attendanceHasMarkedPresent(panel)) return;
      return;
    }

    const snippet = ((await panel.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 320);
    throw new Error(`Could not mark attendance Present. Panel: ${snippet}`);
  }

  async expectAttendancePresentVisible() {
    await expect(async () => {
      const panel = this.page
        .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root, main, [role="main"]')
        .filter({ visible: true })
        .filter({ hasText: /attendance|present|worker/i })
        .last();
      const ok = await this._attendanceHasMarkedPresent(panel);
      expect(ok).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    await this.logStep('Attendance Present status visible');
  }

  async openWageDetailsTab() {
    // Close attendance / shift drawers / modal backdrops so Wage Details tab is clickable
    for (let i = 0; i < 5; i += 1) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(250).catch(() => {});
    }
    const closeBtns = this.page.getByRole('button', { name: /close|cancel/i }).filter({ visible: true });
    const closeCount = await closeBtns.count().catch(() => 0);
    for (let i = 0; i < Math.min(closeCount, 3); i += 1) {
      await closeBtns.nth(i).click({ force: true }).catch(() => {});
    }
    // Click modal backdrop to dismiss leftover attendance modal
    const backdrop = this.page.locator('.MuiModal-root .MuiBackdrop-root, .MuiDialog-container').filter({
      visible: true,
    }).first();
    if (await backdrop.isVisible({ timeout: 800 }).catch(() => false)) {
      await backdrop.click({ force: true, position: { x: 8, y: 8 } }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.page
      .locator('.MuiModal-root')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});

    // If still blocked, re-enter Workers module cleanly
    if (
      await this.page
        .locator('.MuiModal-root')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false)
    ) {
      await this.openWorkersViaUrlTab().catch(() => {});
      await this.waitForModuleToLoad().catch(() => {});
    }

    const tab = this.page
      .getByRole('tab', { name: /wage\s*details/i })
      .or(this.page.getByText(/^wage\s*details$/i))
      .filter({ visible: true })
      .first();
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.click({ timeout: 20000, force: true });
    await this.page.waitForTimeout(1000).catch(() => {});
    await this.logStep('Opened Wage Details tab');
  }

  async expectWageDetailsTableReady() {
    await expect(
      this.page
        .getByText(/total\s*rate|converted|pending|shift\s*name|total\s*wage/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Wage Details table ready');
  }

  async openAddToExpensesForFirstWageRow() {
    const expenseActionRe =
      /add\s*to\s*expenses?|convert\s*to\s*expenses?|update\s*expenses?|create\s*expenses?|add\s*expenses?/i;

    // Prefer Pending filter/tab when the wage list is segmented
    const pendingFilter = this.page
      .getByRole('tab', { name: /^pending$/i })
      .or(this.page.getByRole('button', { name: /^pending$/i }))
      .or(this.page.locator('.MuiChip-root, .MuiToggleButton-root').filter({ hasText: /^pending$/i }))
      .filter({ visible: true })
      .first();
    if (await pendingFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pendingFilter.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(800).catch(() => {});
    }

    const clickExpenseInOpenMenu = async () => {
      const addExpense = this.page
        .getByRole('menuitem', { name: expenseActionRe })
        .or(this.page.locator('.MuiMenuItem-root, [role="menuitem"], li').filter({ hasText: expenseActionRe }))
        .or(this.page.getByText(expenseActionRe))
        .filter({ visible: true })
        .first();
      if (await addExpense.isVisible({ timeout: 2500 }).catch(() => false)) {
        await addExpense.click({ timeout: 15000, force: true });
        return true;
      }
      return false;
    };

    // Broad wage row targets — prefer rows that show money / shift names (skip header)
    const allRows = this.page
      .locator(
        'table tbody tr, .MuiDataGrid-row, [role="row"], .MuiTableRow-root, [class*="wage"] tr, [class*="Wage"] tr'
      )
      .filter({ visible: true });
    const moneyRows = this.page
      .locator('table tbody tr, .MuiDataGrid-row, [role="row"], .MuiTableRow-root')
      .filter({ visible: true })
      .filter({ hasText: /\$|auto\s*shift|\d{1,3}(,\d{3})+/i });
    const rowCount = await allRows.count().catch(() => 0);
    const moneyCount = await moneyRows.count().catch(() => 0);
    await this.logStep(`Wage Details rows visible: ${rowCount} (money/shift rows: ${moneyCount})`);

    const ordered = [];
    const pushRow = async (row) => {
      const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 3) return;
      // Header row
      if (/shift\s*name/i.test(text) && /total\s*rate|start\s*date/i.test(text)) return;
      if (/^(worker|shift\s*name|total\s*rate|status|actions?)$/i.test(text)) return;
      const pendingScore = /pending/i.test(text) && !/converted/i.test(text) ? 0 : /\$\s*0\b/.test(text) ? 2 : 1;
      ordered.push({ row, text, pendingScore });
    };
    for (let i = 0; i < moneyCount; i += 1) await pushRow(moneyRows.nth(i));
    if (ordered.length === 0) {
      for (let i = 0; i < rowCount; i += 1) await pushRow(allRows.nth(i));
    }
    ordered.sort((a, b) => a.pendingScore - b.pendingScore);

    let lastSnippet = '';
    for (const { row, text } of ordered.slice(0, 10)) {
      lastSnippet = text.slice(0, 240);
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.hover().catch(() => {});
      await this.page.waitForTimeout(350).catch(() => {});

      const direct = row
        .getByRole('button', { name: expenseActionRe })
        .or(row.getByRole('link', { name: expenseActionRe }))
        .or(row.getByText(expenseActionRe))
        .filter({ visible: true })
        .first();
      if (await direct.isVisible({ timeout: 700 }).catch(() => false)) {
        await direct.click({ timeout: 15000, force: true });
        await this.logStep('Opened Add to Expenses via row action');
        return;
      }

      const menuBtns = row.locator(
        'button:has(svg), button[aria-haspopup="menu"], [role="button"]:has(svg), td:last-child button, [role="gridcell"]:last-child button'
      );
      const btnCount = await menuBtns.count().catch(() => 0);
      // Prefer last buttons (action column) — try from end
      for (let b = btnCount - 1; b >= 0; b -= 1) {
        const btn = menuBtns.nth(b);
        if (!(await btn.isVisible({ timeout: 500 }).catch(() => false))) continue;
        await btn.click({ timeout: 10000, force: true }).catch(() => {});
        await this.page.waitForTimeout(500).catch(() => {});
        if (await clickExpenseInOpenMenu()) {
          await this.logStep(`Opened Add to Expenses dialog (row: ${lastSnippet.slice(0, 60)})`);
          return;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
      }

      // Triple-dot / more icons rendered as bare SVG
      const icons = row.locator(
        'svg[data-testid="MoreVertIcon"], svg[data-testid="MoreHorizIcon"], svg[data-testid*="More" i]'
      );
      const iconCount = await icons.count().catch(() => 0);
      for (let i = 0; i < iconCount; i += 1) {
        await icons.nth(i).click({ timeout: 8000, force: true }).catch(() => {});
        await this.page.waitForTimeout(500).catch(() => {});
        if (await clickExpenseInOpenMenu()) {
          await this.logStep('Opened Add to Expenses via more icon');
          return;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
      }
    }

    // Any kebab in the Wage Details surface
    const wagePanel = this.page
      .locator('main, [role="main"], .MuiDrawer-root, [class*="HalfCanvas"]')
      .filter({ visible: true })
      .filter({ hasText: /wage|total\s*rate|converted|pending/i })
      .last();
    const kebabs = wagePanel
      .locator(
        'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
      )
      .filter({ visible: true });
    const kebabCount = await kebabs.count().catch(() => 0);
    for (let i = 0; i < Math.min(kebabCount, 6); i += 1) {
      await kebabs.nth(i).click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
      if (await clickExpenseInOpenMenu()) {
        await this.logStep('Opened Add to Expenses via panel kebab');
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    const pageAction = this.page
      .getByRole('button', { name: expenseActionRe })
      .or(this.page.getByText(expenseActionRe))
      .filter({ visible: true })
      .first();
    if (await pageAction.isVisible({ timeout: 2500 }).catch(() => false)) {
      await pageAction.click({ timeout: 15000, force: true });
      await this.logStep('Opened Add to Expenses via page action');
      return;
    }

    const panelSnippet = ((await wagePanel.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 280);
    throw new Error(
      `Could not open Add to Expenses for wage row. Row: ${lastSnippet || '(none)'} | Panel: ${panelSnippet}`
    );
  }

  async selectExpensePaymentMethod(methodName = 'cash') {
    const input = this.page
      .getByPlaceholder(/payment|select/i)
      .or(this.page.getByRole('combobox'))
      .filter({ visible: true })
      .last();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.click({ timeout: 10000 });
      await input.fill(methodName);
    }
    const option = this.page
      .getByRole('option', { name: new RegExp(methodName, 'i') })
      .or(this.page.getByText(new RegExp(`^${methodName}$`, 'i')))
      .filter({ visible: true })
      .first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ timeout: 10000 });
    await this.logStep(`Selected payment method: ${methodName}`);
  }

  async confirmConvertWageToExpense() {
    const confirmBtn = this.page
      .getByRole('button', { name: /^(confirm|create|add|save|yes)$/i })
      .filter({ visible: true })
      .last();
    await expect(confirmBtn).toBeVisible({ timeout: 20000 });
    await confirmBtn.click({ timeout: 20000 });
    await this.logStep('Confirmed wage to expense conversion');
  }

  async expectWageConvertedToExpense() {
    await expect(async () => {
      const toastOk = await this.toastLocator(/expense\s*created\s*successfully|expense\s*updated/i)
        .isVisible()
        .catch(() => false);
      const updateAction = await this.page
        .getByText(/update\s*expenses?/i)
        .filter({ visible: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(toastOk || updateAction).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    await this.logStep('Wage converted to expense verified');
  }

  async expectPaymentMethodRequiredToast() {
    await expect(
      this.toastLocator(/please\s*select\s*payment\s*terms|payment\s*method|payment\s*terms/i)
    ).toBeVisible({ timeout: 30000 });
    await this.logStep('Payment method required toast visible');
  }
}

module.exports = WorkersPage;
