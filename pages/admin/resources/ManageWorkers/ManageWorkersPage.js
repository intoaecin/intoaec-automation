const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const env = require('../../../../config/env');
const {
  buildRandomSuffix,
  buildWorkerContext,
  syncContextToWorld,
} = require('./workerTestContext');

/**
 * Resources → Manage Workers (`/worker-management`).
 * Org-level Individual / Contractor CRUD (not project calendar).
 */
class ManageWorkersPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.workerData = buildWorkerContext();

    this.resourcesNav = page
      .getByRole('button', { name: /resources/i })
      .or(page.getByRole('link', { name: /resources/i }))
      .or(page.getByLabel(/resources/i))
      .first();

    this.manageWorkersEntry = page
      .getByRole('button', { name: /manage\s*workers?/i })
      .or(page.getByRole('link', { name: /manage\s*workers?/i }))
      .or(page.getByText(/^manage\s*workers?$/i))
      .first();

    this.addWorkerButton = page
      .getByRole('button', { name: /add\s*worker/i })
      .first();

    this.individualWorkerMenuItem = page
      .getByRole('menuitem', { name: /individual\s*worker/i })
      .or(page.getByText(/^individual\s*worker$/i))
      .first();

    this.contractorWorkersMenuItem = page
      .getByRole('menuitem', { name: /contractor\s*(&|and)\s*workers?/i })
      .or(page.getByText(/contractor\s*(&|and)\s*workers?/i))
      .first();

    this.allWorkersHeading = page
      .getByText(/all\s*workers/i)
      .first();

    this.manageWorkerTypesButton = page
      .getByRole('button', { name: /manage\s*worker\s*types?/i })
      .or(page.getByText(/^manage\s*worker\s*types?$/i))
      .first();

    this.filterButton = page
      .getByRole('button', { name: /^filter$/i })
      .or(page.getByLabel(/^filter$/i))
      .first();

    // Page ExpandableSearch only (near Filter) — NEVER header global "Search Anything in IntoAEC"
    this.listSearchRegion = page
      .getByRole('search', { name: /search\s*worker\s*name/i })
      .or(
        page
          .locator('[role="search"]')
          .filter({ has: page.getByPlaceholder(/search\s*worker\s*name/i) })
      )
      .or(
        page
          .locator('main, [role="main"], #app-content-scroll')
          .locator('[role="search"]')
          .filter({ has: page.getByPlaceholder(/search\s*worker\s*name|search/i) })
      )
      .first();

    this.listSearchToggle = page
      .getByRole('button', { name: /search\s*worker\s*name/i })
      .or(this.listSearchRegion.getByRole('button', { name: /search/i }))
      .or(
        page
          .locator('main, [role="main"], #app-content-scroll')
          .getByRole('button', { name: /^search$/i })
      )
      .first();

    this.searchInput = page
      .getByRole('textbox', { name: /search\s*worker\s*name/i })
      .or(page.getByPlaceholder(/search\s*worker\s*name/i))
      .or(this.listSearchRegion.getByRole('textbox'))
      .or(this.listSearchRegion.locator('input:not([type="hidden"])'))
      .first();
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[ManageWorkersPage] ${msg}`);
  }

  formScope() {
    return this.page
      .locator('.MuiDrawer-root, [class*="HalfCanvas"], [role="dialog"], .MuiModal-root')
      .filter({ visible: true })
      .filter({
        hasText: /add\s*individual\s*worker|edit\s*individual\s*worker|add\s*contractor|edit\s*contractor|worker\s*name|contractor\s*name/i,
      })
      .last()
      .or(this.page.locator('body'));
  }

  workerNameInput() {
    const scope = this.formScope();
    // Prefer name= attribute — never match list "Search Worker Name"
    return scope
      .locator('input[name="workerName"]')
      .or(scope.getByPlaceholder(/^worker\s*name$/i))
      .or(scope.getByRole('textbox', { name: /^worker\s*name$/i }))
      .first();
  }

  contractorNameInput() {
    const scope = this.formScope();
    return scope
      .getByPlaceholder(/contractor\s*name|enter\s*contractor\s*name/i)
      .or(scope.locator('input[name="workerName"]'))
      .or(scope.getByRole('textbox', { name: /contractor\s*name/i }))
      .first();
  }

  workerTypeInput() {
    const scope = this.formScope();
    return scope
      .getByPlaceholder(/worker\s*type/i)
      .or(scope.getByRole('combobox', { name: /worker\s*type/i }))
      .or(scope.locator('input').filter({ hasText: '' }).nth(1))
      .first();
  }

  rateInput() {
    const scope = this.formScope();
    return scope.locator('input[name="rate"]').first();
  }

  workingHoursInput() {
    const scope = this.formScope();
    return scope
      .getByPlaceholder(/working\s*hours|hours/i)
      .or(scope.locator('input[name="workingHours"], input[name="workHours"], input[name="shiftDuration"]'))
      .or(scope.getByLabel(/working\s*hours/i))
      .first();
  }

  formAddButton() {
    const scope = this.formScope();
    return scope
      .getByRole('button', { name: /^(add|update)$/i })
      .filter({ visible: true })
      .last();
  }

  toastLocator(textRegex) {
    return this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast')
      .filter({ hasText: textRegex })
      .first();
  }

  getWorkerRow(name) {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('tr, [role="row"], .MuiTableRow-root')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .filter({ visible: true })
      .first();
  }

  async openResources() {
    const entryVisible = await this.manageWorkersEntry.isVisible({ timeout: 3000 }).catch(() => false);
    if (entryVisible) return;
    if (await this.resourcesNav.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.resourcesNav.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }
  }

  async openManageWorkers() {
    if (await this.manageWorkersEntry.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.manageWorkersEntry.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      return;
    }
    const base = String(env.admin || '').replace(/\/$/, '');
    await this.page.goto(`${base}/worker-management`, { waitUntil: 'domcontentloaded' });
  }

  async navigateToManageWorkers() {
    this.logStep('Navigating to Resources > Manage Workers');
    await this.openResources();
    await this.openManageWorkers();
    await this.waitForWorkersListReady();
  }

  async waitForWorkersListReady() {
    await expect(this.addWorkerButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Manage Workers list ready');
  }

  async dismissOpenOverlays() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async openAddWorkerMenu() {
    await this.dismissOpenOverlays();
    await expect(this.addWorkerButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addWorkerButton.click({ timeout: 20000 });
    const menuReady = this.page
      .getByRole('menuitem', { name: /individual\s*worker|contractor/i })
      .or(this.page.locator('[role="menu"] li, .MuiMenu-list li, .MuiMenuItem-root'))
      .filter({ visible: true })
      .first();
    await expect(menuReady).toBeVisible({ timeout: 15000 });
  }

  async clickAddWorkerMenuOption(labelRegex) {
    const byRole = this.page.getByRole('menuitem', { name: labelRegex }).filter({ visible: true }).first();
    if (await byRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      await byRole.click({ timeout: 15000 });
      return;
    }
    const byMenuItem = this.page
      .locator('.MuiMenuItem-root, [role="menuitem"], [role="menu"] li')
      .filter({ hasText: labelRegex })
      .filter({ visible: true })
      .first();
    await expect(byMenuItem).toBeVisible({ timeout: 15000 });
    await byMenuItem.click({ timeout: 15000 });
  }

  async startCreateIndividualWorker() {
    this.logStep('Starting Create Individual Worker');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.openAddWorkerMenu();
        await this.clickAddWorkerMenuOption(/individual\s*worker/i);
        await expect(this.workerNameInput()).toBeVisible({ timeout: 20000 });
        return;
      } catch (err) {
        this.logStep(`Add Individual Worker attempt ${attempt + 1} failed; retrying`);
        await this.dismissOpenOverlays();
      }
    }
    throw new Error('Could not open Add Individual Worker form');
  }

  async startCreateContractorWorker() {
    this.logStep('Starting Create Contractor & Workers');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.openAddWorkerMenu();
        await this.clickAddWorkerMenuOption(/contractor\s*(&|and)?\s*workers?/i);
        await expect(this.contractorNameInput()).toBeVisible({ timeout: 20000 });
        return;
      } catch (err) {
        this.logStep(`Add Contractor attempt ${attempt + 1} failed; retrying`);
        await this.dismissOpenOverlays();
      }
    }
    throw new Error('Could not open Add Contractor & Workers form');
  }

  async selectOrCreateWorkerType(typeName, { contractor = false } = {}) {
    const scope = this.formScope();
    // Individual: placeholder "Worker Type"; Contractor row: placeholder "Select"
    const input = contractor
      ? scope
          .getByPlaceholder(/^select$/i)
          .or(scope.getByPlaceholder(/worker\s*type/i))
          .filter({ visible: true })
          .first()
      : scope
          .getByPlaceholder(/worker\s*type/i)
          .or(scope.locator('input[placeholder*="Worker Type" i]'))
          .filter({ visible: true })
          .first();

    await expect(input).toBeVisible({ timeout: 30000 });
    await input.click({ timeout: 10000 });
    await input.fill('');
    await input.fill('a');
    await this.page.waitForTimeout(400).catch(() => {});

    const firstOpt = this.page
      .locator('[role="listbox"] [role="option"], .MuiAutocomplete-option, [role="option"]')
      .filter({ visible: true })
      .first();

    if (await firstOpt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstOpt.click({ timeout: 10000 });
      this.logStep('Selected first available worker type');
      return;
    }

    const newType = typeName || `Auto Type ${buildRandomSuffix()}`;
    await input.fill('');
    await input.fill(newType);
    await this.page.waitForTimeout(400).catch(() => {});

    const addType = this.page
      .getByText(/add\s*worker\s*type/i)
      .or(this.page.getByRole('option', { name: /add\s*worker\s*type/i }))
      .filter({ visible: true })
      .first();
    if (await addType.isVisible({ timeout: 4000 }).catch(() => false)) {
      await addType.click({ timeout: 10000 });
      this.logStep(`Created new worker type: ${newType}`);
      return;
    }

    if (await firstOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstOpt.click({ timeout: 10000 });
      this.logStep('Selected worker type option after typed search');
      return;
    }

    throw new Error('Could not select or create a worker type');
  }

  async fillIndividualWorkerForm(overrides = {}) {
    const data = { ...this.workerData, ...overrides };
    this.workerData = data;

    const nameInput = this.workerNameInput();
    await nameInput.click({ timeout: 10000 });
    await nameInput.fill('');
    await nameInput.fill(data.individualName);

    await this.selectOrCreateWorkerType(data.workerTypeName);

    if (data.rate != null && data.rate !== '') {
      const rate = this.rateInput();
      if (await rate.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rate.click().catch(() => {});
        await rate.fill(String(data.rate));
      }
    }

    if (data.workingHours != null && data.workingHours !== '') {
      const hours = this.workingHoursInput();
      if (await hours.isVisible({ timeout: 3000 }).catch(() => false)) {
        await hours.click().catch(() => {});
        await hours.fill(String(data.workingHours));
      }
    }

    this.logStep(`Filled individual worker form: ${data.individualName}`);
    return data;
  }

  async fillContractorWorkerForm(overrides = {}) {
    const data = { ...this.workerData, ...overrides };
    this.workerData = data;
    const scope = this.formScope();

    const nameInput = this.contractorNameInput();
    await expect(nameInput).toBeVisible({ timeout: this.defaultTimeout });
    await nameInput.click({ timeout: 10000 });
    await nameInput.fill('');
    await nameInput.fill(data.contractorName);

    await this.selectOrCreateWorkerType(data.workerTypeName, { contractor: true });

    const hours = scope
      .getByPlaceholder(/working\s*hours/i)
      .or(scope.locator('input[name="shiftDuration"]'))
      .filter({ visible: true })
      .first();
    await expect(hours).toBeVisible({ timeout: 20000 });
    await hours.click().catch(() => {});
    await hours.fill(String(data.workingHours || '8'));

    const rate = scope
      .getByPlaceholder(/enter\s*rate/i)
      .or(scope.locator('input[name="rate"]'))
      .filter({ visible: true })
      .first();
    if (await rate.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rate.fill(String(data.rate || '100'));
    }

    this.logStep(`Filled contractor worker form: ${data.contractorName}`);
    return data;
  }

  async leaveRequiredIndividualFieldsEmpty() {
    const nameInput = this.workerNameInput();
    await nameInput.click().catch(() => {});
    await nameInput.fill('');
    this.logStep('Left required individual worker fields empty');
  }

  async submitWorkerForm() {
    const btn = this.formAddButton();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeEnabled({ timeout: this.defaultTimeout });
    await btn.click({ timeout: 20000 });
    this.logStep('Submitted worker form');
  }

  async verifyCreateButtonDisabled() {
    const btn = this.formAddButton();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeDisabled({ timeout: 15000 });
    this.logStep('Create/Add button is disabled as expected');
  }

  async verifyWorkerCreatedSuccessfully(name) {
    const workerName = name || this.workerData.individualName || this.workerData.contractorName;
    await expect(async () => {
      const toastOk = await this.toastLocator(
        /worker\s*created\s*successfully|contractor\s*and\s*workers\s*added\s*successfully|created\s*successfully/i
      )
        .isVisible()
        .catch(() => false);
      const formClosed = !(await this.workerNameInput().isVisible({ timeout: 500 }).catch(() => false));
      const listReady = await this.addWorkerButton.isVisible({ timeout: 500 }).catch(() => false);
      expect(toastOk || (formClosed && listReady)).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep(`Worker created successfully: ${workerName}`);
  }

  async verifyWorkerUpdatedSuccessfully() {
    await expect(async () => {
      const toastOk = await this.toastLocator(
        /worker\s*updated\s*successfully|contractor\s*and\s*workers\s*updated\s*successfully|updated\s*successfully/i
      )
        .isVisible()
        .catch(() => false);
      const formClosed = !(await this.workerNameInput().isVisible({ timeout: 500 }).catch(() => false));
      expect(toastOk || formClosed).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep('Worker updated successfully');
  }

  isGlobalSearchLocator(locator) {
    return (async () => {
      const ph = ((await locator.getAttribute('placeholder').catch(() => '')) || '').trim();
      const aria = ((await locator.getAttribute('aria-label').catch(() => '')) || '').trim();
      return /anything|intoaec/i.test(`${ph} ${aria}`);
    })();
  }

  async openListSearchInput() {
    // ExpandableSearch on the worker list (near Filter) — never header global search
    if (await this.searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await this.isGlobalSearchLocator(this.searchInput))) {
        return this.searchInput;
      }
    }

    this.logStep('Opening page-level worker list search (not global search)');
    const toggle = this.listSearchToggle;
    if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await toggle.click({ force: true });
      await this.page.waitForTimeout(300).catch(() => {});
    } else {
      const region = this.listSearchRegion;
      if (await region.isVisible({ timeout: 5000 }).catch(() => false)) {
        await region.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(300).catch(() => {});
      } else if (await this.filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click search control adjacent to Filter in the toolbar
        const nearFilterSearch = this.filterButton
          .locator('xpath=preceding-sibling::*[1]//button | preceding-sibling::*[1]//input | ../button[contains(@aria-label,"Search") or contains(@aria-label,"search")]')
          .first()
          .or(
            this.page
              .locator('main, [role="main"]')
              .getByRole('button', { name: /search\s*worker\s*name|^search$/i })
              .first()
          );
        if (await nearFilterSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nearFilterSearch.click({ force: true });
          await this.page.waitForTimeout(300).catch(() => {});
        }
      }
    }

    await expect(this.searchInput).toBeVisible({ timeout: 15000 });
    if (await this.isGlobalSearchLocator(this.searchInput)) {
      throw new Error(
        '[ManageWorkersPage] Resolved global header search instead of worker list search. Refusing to type into global search.'
      );
    }
    return this.searchInput;
  }

  async searchForWorker(name) {
    const term = name || this.workerData.individualName;
    this.logStep(`Searching worker list for: ${term} (page ExpandableSearch only)`);
    // Search fires at length >= 3
    const input = await this.openListSearchInput();
    await input.click({ force: true }).catch(() => {});
    await input.press('Control+A').catch(() => {});
    await input.fill('');
    await input.fill(String(term));
    await input.press('Enter').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(400).catch(() => {});
  }

  async verifyWorkerVisibleInList(name) {
    const workerName = name || this.workerData.individualName;
    await this.searchForWorker(workerName);
    await expect(async () => {
      const row = this.getWorkerRow(workerName);
      const textMatch = this.page.getByText(new RegExp(workerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
      const visible =
        (await row.isVisible().catch(() => false)) ||
        (await textMatch.isVisible().catch(() => false));
      expect(visible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep(`Worker visible in list: ${workerName}`);
  }

  async openRowMenuForWorker(name) {
    const workerName = name || this.workerData.individualName;
    await this.searchForWorker(workerName);
    const row = this.getWorkerRow(workerName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    const menuBtn = row
      .getByRole('button')
      .filter({ visible: true })
      .last()
      .or(row.locator('button, [aria-label*="more" i], svg').last());

    await menuBtn.click({ timeout: 15000, force: true }).catch(async () => {
      await this.page
        .locator('tr, [role="row"]')
        .filter({ hasText: new RegExp(workerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .locator('button')
        .last()
        .click({ force: true });
    });
  }

  async clickEditOnWorkerRow(name) {
    await this.openRowMenuForWorker(name);
    const editItem = this.page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(this.page.getByText(/^edit$/i))
      .first();
    await expect(editItem).toBeVisible({ timeout: 15000 });
    await editItem.click({ timeout: 15000 });
    await expect(this.workerNameInput()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Edit worker form');
  }

  async updateIndividualWorkerDetails(overrides = {}) {
    const editedName = overrides.editedName || this.workerData.editedName || `Auto Worker Edited ${buildRandomSuffix()}`;
    const editedRate = overrides.editedRate != null ? overrides.editedRate : this.workerData.editedRate;
    this.workerData.editedName = editedName;
    this.workerData.individualName = editedName;

    const nameInput = this.workerNameInput();
    await nameInput.click({ timeout: 10000 });
    await nameInput.fill('');
    await nameInput.fill(editedName);

    if (editedRate != null) {
      const rate = this.rateInput();
      if (await rate.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rate.fill(String(editedRate));
      }
    }
    this.logStep(`Updated worker details to: ${editedName}`);
  }

  async clickDeleteOnWorkerRow(name) {
    await this.openRowMenuForWorker(name);
    const deleteItem = this.page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(this.page.getByText(/^delete$/i))
      .first();
    await expect(deleteItem).toBeVisible({ timeout: 15000 });
    await deleteItem.click({ timeout: 15000 });
    this.logStep('Opened Delete worker confirmation');
  }

  async fillDeleteReason(reason) {
    const text = reason || this.workerData.deleteReason || `Automation delete ${buildRandomSuffix()}`;
    this.workerData.deleteReason = text;
    const reasonInput = this.page
      .getByPlaceholder(/reason|enter\s*reason/i)
      .or(this.page.locator('textarea, input[type="text"]').filter({ visible: true }).last())
      .first();
    await expect(reasonInput).toBeVisible({ timeout: this.defaultTimeout });
    await reasonInput.fill(text);
    this.logStep(`Filled delete reason: ${text}`);
  }

  async confirmDeleteWorker() {
    const yesBtn = this.page
      .getByRole('button', { name: /^(yes|confirm|delete|ok)$/i })
      .filter({ visible: true })
      .last();
    await expect(yesBtn).toBeVisible({ timeout: this.defaultTimeout });
    await yesBtn.click({ timeout: 20000 });
    this.logStep('Confirmed worker delete');
  }

  async verifyWorkerDeletedSuccessfully(name) {
    const workerName = name || this.workerData.individualName;
    await expect(async () => {
      const toastOk = await this.toastLocator(/worker\s*deleted\s*successfully|deleted\s*successfully/i)
        .isVisible()
        .catch(() => false);
      await this.searchForWorker(workerName);
      const stillVisible = await this.getWorkerRow(workerName).isVisible().catch(() => false);
      expect(toastOk || !stillVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep(`Worker deleted: ${workerName}`);
  }

  async ensureOnManageWorkers() {
    if (await this.addWorkerButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
    await this.navigateToManageWorkers();
  }

  async createIndividualWorkerQuick(world, overrides = {}) {
    await this.ensureOnManageWorkers();
    await this.startCreateIndividualWorker();
    const data = await this.fillIndividualWorkerForm(overrides);
    await this.submitWorkerForm();
    await this.verifyWorkerCreatedSuccessfully(data.individualName);
    if (world) {
      syncContextToWorld(world, {
        individualName: data.individualName,
        rate: data.rate,
        workingHours: data.workingHours,
        workerTypeName: data.workerTypeName,
      });
    }
    return data;
  }

  async createContractorWorkerQuick(world, overrides = {}) {
    await this.ensureOnManageWorkers();
    await this.startCreateContractorWorker();
    const data = await this.fillContractorWorkerForm(overrides);
    await this.submitWorkerForm();
    await this.verifyWorkerCreatedSuccessfully(data.contractorName);
    if (world) {
      syncContextToWorld(world, {
        contractorName: data.contractorName,
        rate: data.rate,
        workingHours: data.workingHours,
        workerTypeName: data.workerTypeName,
      });
    }
    return data;
  }

  // --- Manage Worker Types ---

  manageWorkerTypesPanel() {
    return this.page
      .locator('.MuiModal-root, [role="presentation"]')
      .filter({ visible: true })
      .filter({ hasText: /manage\s*worker\s*types?/i })
      .last();
  }

  workerTypeFormDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /add\s*worker\s*type|edit\s*worker\s*type/i })
      .last();
  }

  async openManageWorkerTypes() {
    await this.ensureOnManageWorkers();
    await expect(this.manageWorkerTypesButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.manageWorkerTypesButton.click({ timeout: 20000 });
    await expect(
      this.page.getByText(/manage\s*worker\s*types?/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      this.page.getByRole('button', { name: /add\s*worker\s*type/i }).filter({ visible: true }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Manage Worker Types panel');
  }

  async closeManageWorkerTypes() {
    const panel = this.manageWorkerTypesPanel();
    const closeBtn = panel
      .getByRole('button')
      .filter({ visible: true })
      .first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 10000 }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    this.logStep('Closed Manage Worker Types panel');
  }

  async startAddWorkerType() {
    const addBtn = this.page
      .getByRole('button', { name: /add\s*worker\s*type/i })
      .filter({ visible: true })
      .first();
    await expect(addBtn).toBeVisible({ timeout: this.defaultTimeout });
    await addBtn.click({ timeout: 15000 });
    await expect(this.workerTypeFormDialog()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Add Worker Type dialog');
  }

  async fillWorkerTypeNameField(typeName) {
    const dialog = this.workerTypeFormDialog();
    // freeSolo SingleSelectSearchDropDown — onInputChange commits the typed value
    const typeInput = dialog
      .getByRole('combobox')
      .or(dialog.locator('.MuiAutocomplete-root input, input[role="combobox"]'))
      .or(dialog.locator('input').filter({ visible: true }).first())
      .first();
    await expect(typeInput).toBeVisible({ timeout: this.defaultTimeout });
    await typeInput.click({ timeout: 10000 });
    await typeInput.fill('');
    await typeInput.pressSequentially(String(typeName), { delay: 25 });
    await this.page.waitForTimeout(200).catch(() => {});
  }

  async fillWorkerTypeForm({ name, description } = {}) {
    const typeName = name || this.workerData.workerTypeName || `Auto Type ${buildRandomSuffix()}`;
    const desc = description != null ? description : `Automation worker type ${buildRandomSuffix()}`;
    this.workerData.workerTypeName = typeName;
    this.workerData.workerTypeDescription = desc;

    await this.fillWorkerTypeNameField(typeName);

    const dialog = this.workerTypeFormDialog();
    const descInput = dialog
      .locator('#description')
      .or(dialog.getByPlaceholder(/enter\s*description|description/i))
      .or(dialog.locator('textarea'))
      .first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill(desc);
    }

    this.logStep(`Filled worker type form: ${typeName}`);
    return { name: typeName, description: desc };
  }

  async leaveWorkerTypeNameEmpty() {
    const dialog = this.workerTypeFormDialog();
    const typeInput = dialog
      .getByRole('combobox')
      .or(dialog.locator('input').filter({ visible: true }).first())
      .first();
    if (await typeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeInput.click().catch(() => {});
      await typeInput.fill('');
    }
    this.logStep('Left worker type name empty');
  }

  async submitWorkerTypeForm() {
    const dialog = this.workerTypeFormDialog();
    const btn = dialog
      .getByRole('button', { name: /^(create|update)$/i })
      .filter({ visible: true })
      .last();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeEnabled({ timeout: this.defaultTimeout });
    await btn.click({ timeout: 20000 });
    this.logStep('Submitted worker type form');
  }

  async verifyWorkerTypeCreateButtonDisabled() {
    const dialog = this.workerTypeFormDialog();
    const btn = dialog
      .getByRole('button', { name: /^(create|update)$/i })
      .filter({ visible: true })
      .last();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeDisabled({ timeout: 15000 });
    this.logStep('Worker type Create button is disabled as expected');
  }

  async verifyWorkerTypeCreatedSuccessfully(name) {
    const typeName = name || this.workerData.workerTypeName;
    await expect(async () => {
      const toastOk = await this.toastLocator(
        /worker\s*type\s*(created|added)\s*successfully/i
      )
        .isVisible()
        .catch(() => false);
      const formClosed = !(await this.workerTypeFormDialog().isVisible({ timeout: 500 }).catch(() => false));
      expect(toastOk || formClosed).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep(`Worker type created: ${typeName}`);
  }

  async verifyWorkerTypeUpdatedSuccessfully() {
    await expect(async () => {
      const toastOk = await this.toastLocator(/worker\s*type\s*updated\s*successfully/i)
        .isVisible()
        .catch(() => false);
      const formClosed = !(await this.workerTypeFormDialog().isVisible({ timeout: 500 }).catch(() => false));
      expect(toastOk || formClosed).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep('Worker type updated successfully');
  }

  async searchWorkerTypeInPanel(name) {
    const typeName = name || this.workerData.workerTypeName;
    const search = this.page
      .getByPlaceholder(/search\s*worker\s*type/i)
      .filter({ visible: true })
      .first();
    await expect(search).toBeVisible({ timeout: this.defaultTimeout });
    await search.click().catch(() => {});
    await search.fill('');
    await search.fill(typeName);
    await this.page.waitForTimeout(300).catch(() => {});
    this.logStep(`Searched worker types panel for: ${typeName}`);
  }

  getWorkerTypeRow(name) {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('tr, [role="row"]')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .filter({ visible: true })
      .first();
  }

  async verifyWorkerTypeVisibleInPanel(name) {
    const typeName = name || this.workerData.workerTypeName;
    await this.searchWorkerTypeInPanel(typeName);
    await expect(this.getWorkerTypeRow(typeName)).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Worker type visible in panel: ${typeName}`);
  }

  async openEditWorkerType(name) {
    const typeName = name || this.workerData.workerTypeName;
    await this.searchWorkerTypeInPanel(typeName);
    const row = this.getWorkerTypeRow(typeName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const editBtn = row
      .getByRole('button')
      .filter({ visible: true })
      .first();
    await editBtn.click({ timeout: 15000 });
    await expect(this.workerTypeFormDialog()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Opened Edit Worker Type for: ${typeName}`);
  }

  async updateWorkerTypeDetails(overrides = {}) {
    const editedName =
      overrides.name ||
      this.workerData.editedWorkerTypeName ||
      `Auto Type Edited ${buildRandomSuffix()}`;
    const desc = overrides.description != null ? overrides.description : `Edited ${buildRandomSuffix()}`;
    this.workerData.editedWorkerTypeName = editedName;
    this.workerData.workerTypeName = editedName;
    this.workerData.workerTypeDescription = desc;

    await this.fillWorkerTypeNameField(editedName);

    const dialog = this.workerTypeFormDialog();
    const descInput = dialog.locator('#description').or(dialog.locator('textarea')).first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill(desc);
    }
    this.logStep(`Updated worker type details to: ${editedName}`);
    return { name: editedName, description: desc };
  }

  async openDeleteWorkerType(name) {
    const typeName = name || this.workerData.workerTypeName;
    await this.searchWorkerTypeInPanel(typeName);
    const row = this.getWorkerTypeRow(typeName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const deleteBtn = row.getByRole('button').filter({ visible: true }).last();
    await deleteBtn.click({ timeout: 15000 });
    this.logStep(`Opened delete confirm for worker type: ${typeName}`);
  }

  async confirmDeleteWorkerType() {
    const yesBtn = this.page
      .getByRole('button', { name: /^(yes|confirm|delete|ok)$/i })
      .filter({ visible: true })
      .last();
    await expect(yesBtn).toBeVisible({ timeout: this.defaultTimeout });
    await yesBtn.click({ timeout: 20000 });
    this.logStep('Confirmed worker type delete');
  }

  async verifyWorkerTypeDeletedSuccessfully(name) {
    const typeName = name || this.workerData.workerTypeName;
    await expect(async () => {
      const toastOk = await this.toastLocator(/worker\s*type\s*deleted\s*successfully/i)
        .isVisible()
        .catch(() => false);
      await this.searchWorkerTypeInPanel(typeName);
      const stillVisible = await this.getWorkerTypeRow(typeName).isVisible().catch(() => false);
      expect(toastOk || !stillVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep(`Worker type deleted: ${typeName}`);
  }

  async createWorkerTypeQuick(world, overrides = {}) {
    await this.openManageWorkerTypes();
    await this.startAddWorkerType();
    const data = await this.fillWorkerTypeForm(overrides);
    await this.submitWorkerTypeForm();
    await this.verifyWorkerTypeCreatedSuccessfully(data.name);
    if (world) {
      syncContextToWorld(world, {
        workerTypeName: data.name,
        workerTypeDescription: data.description,
      });
    }
    return data;
  }
}

module.exports = ManageWorkersPage;
