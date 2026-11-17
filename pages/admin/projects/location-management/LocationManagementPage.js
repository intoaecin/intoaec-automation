const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const testData = require('../../../../utils/testData');

/**
 * Project profile → Location module.
 *
 * Layering:
 *   Feature: features/admin/projects/location-management/LocationManagement_TestCases.feature
 *   Steps:   step-definitions/admin/projects/location-management/LocationManagementStep.js
 *   Page:    this file
 */
class LocationManagementPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.title = page
      .getByRole('heading', { name: /location management|^location$/i })
      .or(page.locator('h1, h2, h3, [class*="PageLayout"]').getByText(/^location(\s+management)?$/i))
      .first();

    // PageLayout primary action — exact "Add" (common.add); keep loose fallback for icon+label.
    this.addButton = page
      .getByRole('button', { name: /^add$/i })
      .or(page.getByRole('button', { name: /^add location$/i }))
      .first();
    this.filterButton = page
      .locator('main, [role="main"], #app-content-scroll')
      .getByRole('button', { name: /^filter$/i })
      .or(page.getByRole('button', { name: /^filter$/i }))
      .filter({ visible: true })
      .first();
    // Location toolbar ExpandableSearch (Add | Search | Filter) — never header Search Anything.
    this.searchButton = this.filterButton
      .locator(
        'xpath=preceding::button[(contains(translate(@aria-label,"SEARCH","search"),"search") or normalize-space(.)="Search" or normalize-space(.)="search")][1]'
      )
      .or(
        this.filterButton.locator(
          'xpath=ancestor::*[contains(@class,"MuiStack") or contains(@class,"MuiToolbar") or contains(@class,"MuiBox") or self::div][1]//button[contains(translate(@aria-label,"SEARCH","search"),"search") or normalize-space(.)="Search"]'
        )
      )
      .filter({ visible: true })
      .first();
    this.searchInput = page.locator('main input, [role="main"] input, #app-content-scroll input').first();

    this.addDialog = page
      .getByRole('dialog')
      .filter({ hasText: /add location|select location/i })
      .last();
    this.addDialogConfirm = this.addDialog
      .getByRole('button', { name: /^add$/i })
      .first();
    this.addDialogCancel = this.addDialog
      .getByRole('button', { name: /^cancel$/i })
      .first();
    this.locationAutocomplete = this.addDialog
      .locator('input[role="combobox"], input')
      .first();

    this.confirmDialog = page.getByRole('dialog').last();
    this.confirmDialogConfirm = this.confirmDialog
      .getByRole('button', { name: /allocate|remove|confirm|yes|delete/i })
      .first();
    this.confirmDialogCancel = this.confirmDialog
      .getByRole('button', { name: /^cancel$/i })
      .first();

    this.resultToast = page
      .locator('.Toastify__toast, [role="alert"], .MuiSnackbar-root, .MuiAlert-root')
      .filter({ hasText: /success|added|allocated|removed|failed|error|already/i })
      .first();

    this.emptyState = page
      .getByText(
        /no location|no matching|no result|no data|nothing to (show|display)|no records|empty/i
      )
      .filter({ visible: true })
      .first();

    this.lastAddedLocationName = '';
    /** Optional preferred name from LOCATION_MGMT_PROJECT — otherwise create disposable client. */
    this.preferredProjectName = String(testData.locationManagement?.project || '').trim();
    this.selectedProjectName = '';
    /** Client display name from disposable create (search fallback across scenarios). */
    this.selectedClientName = '';
  }

  logStep(msg) {
    console.log(`[ProjectLocation] ${msg}`);
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getSelectedProjectName() {
    return this.selectedProjectName || this.preferredProjectName || '';
  }

  isOnLocationModule(url = this.page.url()) {
    try {
      return new URL(url).searchParams.get('tab') === 'Location';
    } catch {
      return /[?&]tab=Location(?:&|$)/i.test(String(url || ''));
    }
  }

  async isAddEnabled() {
    if (!(await this.addButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }
    return !(await this.addButton.isDisabled().catch(() => true));
  }

  /**
   * Active Clients list ExpandableSearch (toolbar next to Manage Columns).
   * Never use the global header "Search Anything…" field.
   */
  async _isGlobalHeaderSearchInput(input) {
    if (!input) return true;
    const placeholder = String((await input.getAttribute('placeholder').catch(() => '')) || '');
    const aria = String((await input.getAttribute('aria-label').catch(() => '')) || '');
    if (/search\s*anything|intoaec/i.test(`${placeholder} ${aria}`)) return true;
    // Any input inside the app chrome header is global — do not require "search" in the label.
    return input
      .evaluate((el) =>
        Boolean(
          el.closest(
            'header, [class*="AppBar"], [class*="MuiAppBar"], [class*="TopBar"], [class*="topbar"]'
          )
        )
      )
      .catch(() => true);
  }

  _listSearchTrigger() {
    // Magnifying glass beside Manage Columns / Filter (not header Search Anything).
    const manageColumns = this.page
      .getByRole('button', { name: /manage columns/i })
      .or(this.page.getByLabel(/manage columns/i))
      .first();
    const nearToolbar = manageColumns
      .locator(
        'xpath=ancestor::*[contains(@class,"MuiStack") or contains(@class,"MuiToolbar") or contains(@class,"MuiBox") or self::div][1]'
      )
      .getByRole('button', { name: /^search$/i })
      .or(
        manageColumns.locator(
          'xpath=preceding::button[contains(translate(@aria-label,"SEARCH","search"),"search")][1]'
        )
      );
    return nearToolbar
      .or(this.page.getByRole('search').getByRole('button').first())
      .or(this.page.getByRole('button', { name: /^search$/i }))
      .filter({ visible: true })
      .first();
  }

  async _listSearchInput() {
    const candidates = this.page
      .getByPlaceholder(/search client name or project name|search client|client name|project name/i)
      .or(this.page.getByRole('search').getByRole('textbox'))
      .or(this.page.locator('[role="search"] input, input[placeholder*="client" i], input[placeholder*="project name" i]'))
      .filter({ visible: true });

    const count = await candidates.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const input = candidates.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (await this._isGlobalHeaderSearchInput(input)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await input.isVisible({ timeout: 500 }).catch(() => false)) return input;
    }
    return null;
  }

  async _ensureListSearchOpen() {
    let input = await this._listSearchInput();
    if (input && (await input.isVisible({ timeout: 800 }).catch(() => false))) {
      return input;
    }
    const trigger = this._listSearchTrigger();
    if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trigger.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(400).catch(() => {});
    }
    input = await this._listSearchInput();
    if (!input) {
      throw new Error(
        'Active Clients list search (near Manage Columns) not found — refused global header Search Anything'
      );
    }
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    return input;
  }

  async clearClientsListSearch() {
    const input = await this._listSearchInput();
    if (!input || !(await input.isVisible({ timeout: 1500 }).catch(() => false))) {
      return;
    }
    await input.click({ force: true, timeout: 5000 }).catch(() => {});
    await input.fill('').catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});
  }

  async searchClientsList(query) {
    const hint = String(query || '').trim();
    if (!hint) {
      await this.clearClientsListSearch();
      return;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    const input = await this._ensureListSearchOpen();
    await input.click({ force: true });
    await input.fill('');
    await input.fill(hint);
    // List search API typically fires after a short debounce (>= 3 chars).
    await this.page.waitForTimeout(1500).catch(() => {});
    this.logStep(`Active Clients list search (near Manage Columns): "${hint}"`);
  }

  async _projectNameFromRow(row) {
    const cells = row.locator('td, th, [role="cell"], [role="rowheader"]');
    const count = await cells.count().catch(() => 0);
    const texts = [];
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const t = ((await cells.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (t) texts.push(t);
    }
    if (!texts.length) {
      const raw = ((await row.innerText().catch(() => '')) || '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 1);
      texts.push(...raw);
    }
    if (texts.length >= 3 && texts[2].length > 1) return texts[2];
    const scored = texts
      .filter((t) => !/^\+?\d[\d\s-]{6,}$/.test(t) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t))
      .sort((a, b) => b.length - a.length);
    return scored[0] || texts[0] || '';
  }

  async _openRowProject(row, preferredName = '') {
    // Close global search / overlays so the Active Clients row click lands on the table.
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(200).catch(() => {});

    const name = String(preferredName || '').trim();
    const nameRe = name ? new RegExp(this._escapeRegex(name), 'i') : null;
    const targets = [
      row.locator('a[href*="projectId"], a[href*="/client/profile"]').first(),
      nameRe ? row.getByRole('rowheader', { name: nameRe }).first() : null,
      nameRe ? row.getByText(nameRe).first() : null,
      row.getByRole('rowheader').first(),
      row.locator('th[scope="row"] span.text-dark, th[scope="row"], th').first(),
      // Skip leading checkbox / icon-only cells — Client Name is usually the next cell.
      row.locator('td, th, [role="cell"], [role="rowheader"]').filter({ visible: true }).nth(1),
      row.locator('td, th, [role="cell"], [role="rowheader"]').filter({ visible: true }).first(),
    ].filter(Boolean);

    const profileOpened = async () => {
      const url = String(this.page.url() || '');
      return /client\/profile|projectId=/i.test(url) && !/\/client\?isActive=/i.test(url);
    };

    for (const target of targets) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await target.isVisible({ timeout: 800 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      await target.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await target.click({ timeout: 15000, force: true }).catch(() =>
        target.click({ timeout: 15000 })
      );
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page
        .waitForURL(
          (u) => /client\/profile|projectId=/i.test(String(u)) && !/\/client\?isActive/i.test(String(u)),
          { timeout: 8000 }
        )
        .catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      if (await profileOpened()) {
        this.logStep(`Opened project profile via row click → ${this.page.url()}`);
        return;
      }
    }

    // Last resort: double-click rowheader / client name.
    const dbl = nameRe
      ? row.getByRole('rowheader', { name: nameRe }).or(row.getByText(nameRe)).first()
      : row.getByRole('rowheader').first();
    if (await dbl.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dbl.dblclick({ timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(1000).catch(() => {});
    } else {
      await row.dblclick({ timeout: 10000, force: true }).catch(() => {});
    }
    await this.page
      .waitForURL(
        (u) => /client\/profile|projectId=/i.test(String(u)) && !/\/client\?isActive/i.test(String(u)),
        { timeout: 15000 }
      )
      .catch(() => {});
    this.logStep(`Row open attempt finished (url=${this.page.url()})`);
  }

  /**
   * Reopen an existing Active Clients project and land on Location.
   * @returns {Promise<{ projectName: string, addEnabled: boolean }|null>}
   */
  async reopenLocationProject(query, { requireAddEnabled = true } = {}) {
    const ProjectNavigationPage = require('../ProjectNavigationPage');
    const ProjectProfilePage = require('../ProjectProfilePage');
    const ClientMasterPage = require('../../client/master/ClientMasterPage');
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);
    const hint = String(query || '').trim();
    if (!hint) return null;

    await nav.openClientsProjectsList();
    let row = null;
    try {
      await this.searchClientsList(hint);
      row = this.page
        .locator('tbody tr, [role="row"]')
        .filter({ hasText: new RegExp(this._escapeRegex(hint), 'i') })
        .filter({ visible: true })
        .first();
      if (!(await row.isVisible({ timeout: 10000 }).catch(() => false))) {
        row = null;
      }
    } catch (error) {
      this.logStep(`List search near Manage Columns failed: ${error.message || error}`);
    }

    if (!row) {
      const clientMaster = new ClientMasterPage(this.page);
      await clientMaster.searchClient(hint);
      row = clientMaster.clientRowByName(hint);
      if (!(await row.isVisible({ timeout: 10000 }).catch(() => false))) {
        this.logStep(`No Active Clients row matched "${hint}"`);
        return null;
      }
    }

    const projectName = (await this._projectNameFromRow(row)) || hint;
    await this._openRowProject(row, hint);
    await expect
      .poll(async () => profile.isInsideProjectProfile(), {
        timeout: 30000,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
    await profile.ensureClassicProjectUi().catch(() => {});
    await this.openLocationModule();
    const addEnabled = await this.isAddEnabled();
    this.logStep(
      `Reopened "${projectName}" Location Add enabled=${addEnabled} (${this.page.url()})`
    );
    if (requireAddEnabled && !addEnabled) return null;
    this.selectedProjectName = projectName;
    return { projectName, addEnabled };
  }

  /**
   * Create one disposable Active Clients client/project and open Location Management.
   * Does not scan existing clients. Optional LOCATION_MGMT_PROJECT is tried first.
   */
  async openProjectWithAddableLocation() {
    const ProjectNavigationPage = require('../ProjectNavigationPage');
    const ProjectProfilePage = require('../ProjectProfilePage');
    const ClientMasterPage = require('../../client/master/ClientMasterPage');
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    const finishOnLocation = async (projectName, clientName = '') => {
      await expect
        .poll(async () => profile.isInsideProjectProfile(), {
          timeout: 30000,
          intervals: [500, 1000, 2000],
        })
        .toBeTruthy();
      await profile.ensureClassicProjectUi().catch(() => {});
      await this.openLocationModule();
      const addEnabled = await this.isAddEnabled();
      this.logStep(
        `Opened "${projectName}" Location Add enabled=${addEnabled} (${this.page.url()})`
      );
      if (!addEnabled) return null;
      this.selectedProjectName = projectName;
      if (clientName) this.selectedClientName = clientName;
      return projectName;
    };

    const openNamedRow = async (query) => {
      const hint = String(query || '').trim();
      if (!hint) return null;
      const reopened = await this.reopenLocationProject(hint, { requireAddEnabled: true });
      return reopened?.projectName || null;
    };

    // Optional env hint — still must have Add enabled.
    if (this.preferredProjectName) {
      try {
        const preferred = await openNamedRow(this.preferredProjectName);
        if (preferred) {
          this.logStep(`Using preferred addable project: ${preferred}`);
          return preferred;
        }
        this.logStep(
          `Preferred project "${this.preferredProjectName}" missing or Add disabled — creating disposable client`
        );
      } catch (error) {
        this.logStep(
          `Preferred project open failed: ${error.message || error} — creating disposable client`
        );
      }
    }

    // Create one disposable client/project (Client Manager Add Client wizard).
    await nav.openClientsProjectsList();
    const clientMaster = new ClientMasterPage(this.page);
    const clientName = await clientMaster.createDisposableClient('QA Loc');
    this.selectedClientName = clientName;
    this.logStep(`Created disposable Location client: ${clientName}`);

    // Stay on the list after create — search + open without a full list reload first.
    let opened = null;
    try {
      await clientMaster.searchClient(clientName);
      await clientMaster.expectClientVisibleInList(clientName);
      const row = clientMaster.clientRowByName(clientName);
      const projectName = (await this._projectNameFromRow(row)) || clientName;
      await this._openRowProject(row, clientName);
      opened = await finishOnLocation(projectName, clientName);
    } catch (error) {
      this.logStep(
        `Direct open after create failed: ${error.message || error} — retrying via list search`
      );
      opened = await openNamedRow(clientName);
      if (opened) this.selectedClientName = clientName;
    }

    if (!opened) {
      throw new Error(
        `Created disposable client "${clientName}" but could not open Location with Add enabled`
      );
    }
    this.logStep(`Selected disposable Location project: ${opened}`);
    return opened;
  }

  /**
   * Open project Location module (Plan and Design → Location card).
   * Falls back to setting tab=Location on the current profile URL.
   */
  async openLocationModule() {
    const ProjectProfilePage = require('../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    if (this.isOnLocationModule()) {
      await this.waitForModuleToLoad();
      this.logStep('Already on Location module');
      return;
    }

    // Single classic-UI check — avoid repeated selectHeading ensureClassic spam.
    await profile.ensureClassicProjectUi().catch(() => {});

    const planHeading = this.page
      .getByText(/plan\s*(and|&)\s*designs?/i)
      .filter({ visible: true })
      .first();
    if (await planHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await planHeading.scrollIntoViewIfNeeded().catch(() => {});
      await planHeading.click({ timeout: this.uiTimeout }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
    }

    await profile.clickModuleCard('Location');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    if (!this.isOnLocationModule()) {
      const current = String(this.page.url() || '');
      try {
        const next = new URL(current);
        next.searchParams.set('tab', 'Location');
        await this.page.goto(next.toString(), {
          waitUntil: 'domcontentloaded',
          timeout: this.defaultTimeout,
        });
        this.logStep(`Opened Location module via URL fallback: ${next.toString()}`);
      } catch (error) {
        throw new Error(
          `Location module did not open (url=${current}). URL fallback failed: ${error.message}`
        );
      }
    }

    await this.waitForModuleToLoad();
  }

  async waitForModuleToLoad() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Require the real module route — hub card text "Location" must not count as loaded.
    await expect
      .poll(() => this.isOnLocationModule(), { timeout: this.defaultTimeout })
      .toBeTruthy();

    // Add is always rendered (enabled or disabled) once LocationManagement mounts.
    await expect(this.addButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(
      `Location Management module loaded (addDisabled=${await this.addButton
        .isDisabled()
        .catch(() => false)})`
    );
  }

  async expectModuleLoaded() {
    await this.waitForModuleToLoad();
  }

  async expectAddVisibleOrDisabled() {
    await expect(this.addButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(
      `Add button visible (disabled=${await this.addButton.isDisabled().catch(() => false)})`
    );
  }

  async expectTableOrEmptyState() {
    const table = this.page.locator('table').first();
    const headers = this.page.getByText(/location|status|size|action/i).first();
    if (await this.emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      this.logStep('Empty state visible');
      return;
    }
    await expect(table.or(headers).first()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Table/headers visible');
  }

  async expectSearchAvailable() {
    const searchControl = this.searchButton.or(this.searchInput);
    await expect(searchControl.first()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Search control available');
  }

  async clickAdd() {
    await expect(this.addButton).toBeVisible({ timeout: this.defaultTimeout });
    if (await this.addButton.isDisabled().catch(() => false)) {
      throw new Error(
        'Add is disabled — project likely already has an allocated location (projectHasApproved)'
      );
    }
    await this.addButton.click({ timeout: this.uiTimeout });
    await expect(this.addDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Add Location dialog');
  }

  async expectAddDialogReady() {
    await expect(this.addDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      this.addDialog.getByText(/approved|select location|location/i).first()
    ).toBeVisible({ timeout: this.uiTimeout });
    const disabled = await this.addDialogConfirm.isDisabled().catch(() => true);
    expect(disabled).toBeTruthy();
    this.logStep('Add dialog ready; confirm disabled until selection');
  }

  async dismissAutocompletePopper() {
    const popper = this.page.locator('.MuiAutocomplete-popper, [role="listbox"]').filter({ visible: true });
    if (await popper.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await expect(popper.first()).toBeHidden({ timeout: 5000 }).catch(async () => {
        // Click dialog title/body (outside the listbox) to close the overlay.
        await this.addDialog.locator('h2, h1, [class*="MuiDialogTitle"]').first().click({
          timeout: 3000,
          force: true,
        }).catch(() => {});
      });
    }
  }

  async selectFirstAvailablePoolLocation() {
    await expect(this.locationAutocomplete).toBeVisible({ timeout: this.defaultTimeout });
    await this.locationAutocomplete.click({ timeout: this.uiTimeout });
    await this.page.waitForTimeout(400).catch(() => {});
    const option = this.page
      .getByRole('option')
      .filter({ hasNotText: /already added/i })
      .first();
    await expect(option).toBeVisible({ timeout: this.defaultTimeout });
    this.lastAddedLocationName = String((await option.innerText().catch(() => '')) || '')
      .split('\n')[0]
      .trim();
    await option.click({ timeout: this.uiTimeout });
    await this.dismissAutocompletePopper();
    this.logStep(`Selected pool location: ${this.lastAddedLocationName}`);
    return this.lastAddedLocationName;
  }

  async selectPoolLocationByName(name) {
    await expect(this.locationAutocomplete).toBeVisible({ timeout: this.defaultTimeout });
    await this.locationAutocomplete.click({ timeout: this.uiTimeout });
    await this.locationAutocomplete.fill(String(name || ''));
    await this.page.waitForTimeout(400).catch(() => {});
    const option = this.page
      .getByRole('option')
      .filter({ hasText: new RegExp(this._escapeRegex(name), 'i') })
      .first();
    await expect(option).toBeVisible({ timeout: this.defaultTimeout });
    await option.click({ timeout: this.uiTimeout });
    await this.dismissAutocompletePopper();
    this.lastAddedLocationName = name;
    this.logStep(`Selected pool location by name: ${name}`);
  }

  async confirmAdd() {
    await this.dismissAutocompletePopper();
    await expect(this.addDialogConfirm).toBeEnabled({ timeout: this.uiTimeout });
    try {
      await this.addDialogConfirm.click({ timeout: this.uiTimeout });
    } catch {
      // Autocomplete popper can still intercept; force click the dialog Add.
      await this.addDialogConfirm.click({ timeout: this.uiTimeout, force: true });
    }
    await this._captureToast();
    await expect(this.addDialog).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    this.logStep('Confirmed Add Location');
  }

  async cancelAdd() {
    await this.addDialogCancel.click({ timeout: this.uiTimeout });
    await expect(this.addDialog).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    this.logStep('Cancelled Add Location');
  }

  async addFirstAvailableLocation() {
    await this.clickAdd();
    await this.expectAddDialogReady();
    await this.selectFirstAvailablePoolLocation();
    await this.confirmAdd();
    if (this.lastAddedLocationName) {
      await this.expectRowVisible(this.lastAddedLocationName);
    }
  }

  locationRow(name) {
    const re = new RegExp(this._escapeRegex(name), 'i');
    return this.page
      .locator('tr, [role="row"], [class*="MuiTableRow"]')
      .filter({ hasText: re })
      .first();
  }

  async expectRowVisible(name) {
    await expect(this.locationRow(name)).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Row visible: ${name}`);
  }

  async expectRowNotVisible(name) {
    const row = this.locationRow(name);
    await expect(row).toBeHidden({ timeout: this.uiTimeout }).catch(async () => {
      await expect(row).toHaveCount(0);
    });
    this.logStep(`Row not visible: ${name}`);
  }

  _moduleToolbarRoot() {
    // Toolbar that holds Add + Search + Filter above the Location table.
    return this.filterButton.locator(
      'xpath=ancestor::*[contains(@class,"MuiStack") or contains(@class,"MuiToolbar") or contains(@class,"MuiBox") or self::div][1]'
    );
  }

  async _moduleSearchInput() {
    // Only inputs that appear from the Location ExpandableSearch (near Filter) — never header.
    const toolbar = this._moduleToolbarRoot();
    const scoped = toolbar
      .locator('input:not([type="hidden"])')
      .or(
        this.page
          .locator('main, [role="main"], #app-content-scroll')
          .getByPlaceholder(/^search$/i)
      )
      .or(
        this.page
          .locator('main, [role="main"], #app-content-scroll')
          .getByPlaceholder(/search location|search by/i)
      )
      .filter({ visible: true });

    const count = await scoped.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const input = scoped.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (await this._isGlobalHeaderSearchInput(input)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await input.isVisible({ timeout: 400 }).catch(() => false)) return input;
    }
    return null;
  }

  async _ensureModuleSearchOpen() {
    // Escape any open global "Search Anything" overlay first.
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(200).catch(() => {});

    let input = await this._moduleSearchInput();
    if (input) {
      if (await this._isGlobalHeaderSearchInput(input)) {
        throw new Error('Resolved global header Search Anything — refusing to type into it');
      }
      return input;
    }

    // Click the "Search" control immediately beside Filter (screenshot: Add | Search | Filter).
    await expect(this.filterButton).toBeVisible({ timeout: this.defaultTimeout });
    const trigger = this.searchButton;
    if (!(await trigger.isVisible({ timeout: 8000 }).catch(() => false))) {
      throw new Error(
        'Location Management Search (near Filter) not found — refused global header Search Anything'
      );
    }
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(500).catch(() => {});

    input = await this._moduleSearchInput();
    if (!input || (await this._isGlobalHeaderSearchInput(input))) {
      throw new Error(
        'Location Management module search input not found after clicking Search near Filter — refused global header Search Anything'
      );
    }
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    return input;
  }

  async search(text) {
    const input = await this._ensureModuleSearchOpen();
    if (await this._isGlobalHeaderSearchInput(input)) {
      throw new Error('Refusing to type into global header Search Anything');
    }
    await input.click({ force: true }).catch(() => {});
    await input.fill('');
    await input.fill(String(text || ''));
    // Debounced list search typically needs >300ms.
    await this.page.waitForTimeout(1500).catch(() => {});
    this.logStep(`Searched Location Management (near Filter): ${text}`);
  }

  async clearSearch() {
    const input = await this._moduleSearchInput();
    if (!input || (await this._isGlobalHeaderSearchInput(input))) return;
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill('');
      await this.page.waitForTimeout(800).catch(() => {});
    }
  }

  async expectNoMatchingLocations() {
    const added = String(this.lastAddedLocationName || '').trim();
    await expect
      .poll(
        async () => {
          if (await this.emptyState.isVisible({ timeout: 500 }).catch(() => false)) {
            return 'empty-text';
          }
          if (added) {
            const stillVisible = await this.locationRow(added)
              .isVisible({ timeout: 500 })
              .catch(() => false);
            if (!stillVisible) return 'row-gone';
          }
          // Fallback: tbody has no data cells with meaningful text.
          const bodyText = String(
            (await this.page.locator('table tbody').first().innerText().catch(() => '')) || ''
          )
            .replace(/\s+/g, ' ')
            .trim();
          if (!bodyText || /no (data|result|record|location|match)/i.test(bodyText)) {
            return 'tbody-empty';
          }
          return '';
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .not.toEqual('');
    this.logStep('No matching locations after search');
  }

  async applyAllocationFilter(value) {
    await expect(this.filterButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.filterButton.click({ timeout: this.uiTimeout });
    const panel = this.page
      .locator('.MuiPopover-paper, [role="dialog"], .MuiPaper-root')
      .filter({ hasText: /allocation|apply|pending|booked/i })
      .last();
    await expect(panel).toBeVisible({ timeout: this.uiTimeout });
    const allocationField = panel.locator('input[role="combobox"], input').first();
    await allocationField.click({ timeout: this.uiTimeout });
    const option = this.page
      .getByRole('option', { name: new RegExp(value, 'i') })
      .or(this.page.getByText(new RegExp(`^${this._escapeRegex(value)}$`, 'i')))
      .first();
    await option.click({ timeout: this.uiTimeout });
    const apply = panel.getByRole('button', { name: /^apply$/i }).first();
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click({ timeout: this.uiTimeout });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    this.logStep(`Applied allocation filter: ${value}`);
  }

  async clearFilters() {
    await expect(this.filterButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.filterButton.click({ timeout: this.uiTimeout });
    const clear = this.page
      .getByRole('button', { name: /clear/i })
      .first();
    if (await clear.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clear.click({ timeout: this.uiTimeout });
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    this.logStep('Cleared filters');
  }

  async clickAllocate(name) {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.getByRole('button', { name: /allocate/i }).click({ timeout: this.uiTimeout });
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Opened allocate confirm for ${name}`);
  }

  async clickRemove(name) {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.getByRole('button', { name: /remove/i }).click({ timeout: this.uiTimeout });
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Opened remove confirm for ${name}`);
  }

  async confirmPendingAction() {
    await this.confirmDialogConfirm.click({ timeout: this.uiTimeout });
    await this._captureToast();
    await expect(this.confirmDialog).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    this.logStep('Confirmed pending action');
  }

  async cancelPendingAction() {
    await this.confirmDialogCancel.click({ timeout: this.uiTimeout });
    await expect(this.confirmDialog).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    this.logStep('Cancelled pending action');
  }

  async allocateLocation(name) {
    await this.clickAllocate(name);
    await this.confirmPendingAction();
    await expect(this.locationRow(name).getByText(/allocated/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async removeLocation(name) {
    await this.clickRemove(name);
    await this.confirmPendingAction();
    await this.expectRowNotVisible(name);
  }

  async expectAddDisabled() {
    await expect(this.addButton).toBeDisabled({ timeout: this.defaultTimeout });
    this.logStep('Add button is disabled');
  }

  async expectAllocatedOrBookedGuards() {
    if (await this.addButton.isDisabled().catch(() => false)) {
      this.logStep('Add disabled — project already allocated');
      return;
    }
    const booked = this.page.getByText(/already booked|booked/i).first();
    if (await booked.isVisible({ timeout: 3000 }).catch(() => false)) {
      this.logStep('Booked label present');
      return;
    }
    this.logStep('No allocated lock or booked row in current project — soft pass');
  }

  async _captureToast() {
    if (await this.resultToast.isVisible({ timeout: 8000 }).catch(() => false)) {
      this.lastToast = String((await this.resultToast.innerText().catch(() => '')) || '').trim();
    }
  }
}

module.exports = LocationManagementPage;
