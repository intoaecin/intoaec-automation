const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Customer portal → Files → My Files → Create → Folder.
 * UI-only navigation (direct /files/* URLs break on staging).
 */
class CustomerMyFilesPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;
    this.lastFolderName = null;
    this.lastFolderCreateOk = false;
    this.lastParentFolderName = null;
    this.lastUploadedFolderName = null;
    this.lastUploadFolderPath = null;

    this.filesNav = page
      .getByRole('link', { name: /^files$/i })
      .or(page.getByRole('button', { name: /^files$/i }))
      .or(page.getByRole('menuitem', { name: /^files$/i }))
      .or(
        page
          .locator('.MuiDrawer-root, aside, nav, [role="navigation"], [class*="sidebar" i], [class*="drawer" i]')
          .getByText(/^files$/i)
      )
      .first();

    this.filesSectionMarker = page
      .getByRole('tab', { name: /^organization$/i })
      .or(page.getByRole('tab', { name: /^my files$/i }))
      .or(page.getByPlaceholder(/search files/i))
      .first();

    this.myFilesContentTab = page
      .getByRole('tab', { name: /^my files$/i })
      .or(page.locator('.MuiTab-root, [role="tab"]').filter({ hasText: /^my files$/i }))
      .first();
  }

  logStep(msg) {
    console.log(`[CustomerMyFiles] ${msg}`);
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _main() {
    return this.page.locator('main, [role="main"]').first();
  }

  _navPanelScopes() {
    return [
      this.page.locator('.MuiDrawer-root').first(),
      this.page.locator('[class*="sidebar" i], [class*="Sidebar" i]').first(),
      this.page.locator('[class*="drawer" i], [class*="Drawer" i]').first(),
      this.page.locator('aside').first(),
      this.page.locator('nav').first(),
      this.page.locator('[role="navigation"]').first(),
      this.page.locator('body'),
    ];
  }

  createFolderButton() {
    return this._main()
      .getByRole('button', { name: /create\s*folder|new\s*folder|add\s*folder/i })
      .or(this._main().locator('button, a').filter({ hasText: /create\s*folder|new\s*folder|add\s*folder/i }))
      .filter({ visible: true })
      .first();
  }

  _filesContent() {
    return this.page.locator('main, [role="main"]').first();
  }

  enabledCreateButton() {
    return this._filesContent()
      .locator('button:not([disabled]):not(.Mui-disabled)')
      .filter({ hasText: /^\s*\+?\s*create\s*$/i })
      .first()
      .or(
        this.page
          .getByRole('button', { name: /^\+\s*create$|^create$/i })
          .filter({ hasNot: this.page.locator('[disabled], .Mui-disabled') })
          .first()
      );
  }

  myFilesTab() {
    return this.myFilesContentTab;
  }

  createFolderMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /folder/i })
      .or(this.page.getByRole('option', { name: /folder/i }))
      .or(this.page.locator('[role="menu"], .MuiMenu-list, .MuiPopover-root').getByText(/^folder$/i))
      .filter({ visible: true })
      .first();
  }

  folderNameInput() {
    const dialog = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').filter({ visible: true }).first();
    return dialog
      .getByLabel(/folder name|^name$/i)
      .or(dialog.getByPlaceholder(/folder name|enter folder|name/i))
      .or(dialog.locator('input[type="text"]'))
      .first();
  }

  createDialogButton() {
    const dialog = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').filter({ visible: true }).first();
    return dialog.getByRole('button', { name: /^create$/i }).last();
  }

  _folderLocator(folderName) {
    const escaped = this._escapeRegex(folderName);
    return this.page
      .locator('tr, [role="row"], .MuiCard-root, .MuiListItem-root, li, div, span, a, button')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();
  }

  _folderLocatorLoose(folderName) {
    return this._folderDataRowLocator(folderName).or(this._folderCardLocator(folderName));
  }

  _folderCardLocator(folderName) {
    const escaped = this._escapeRegex(folderName);
    return this.page
      .locator('.MuiCard-root, .MuiListItem-root, li, a, button, [class*="file" i], [class*="folder" i]')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .filter({ visible: true })
      .first();
  }

  _folderDataRowLocator(folderName) {
    const escaped = this._escapeRegex(folderName);
    return this.page
      .locator('tbody tr, [role="row"]')
      .filter({ hasNot: this.page.locator('th, [role="columnheader"]') })
      .filter({
        has: this.page
          .locator('td, [role="gridcell"]')
          .first()
          .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }),
      })
      .filter({ visible: true })
      .first();
  }

  async _folderExistsLoose(folderName) {
    const wanted = String(folderName || '').trim();
    if (!wanted || this._isNoiseFolderLabel(wanted)) return false;
    const row = this._folderDataRowLocator(wanted);
    if (await row.isVisible({ timeout: 1000 }).catch(() => false)) return true;
    return this._folderCardLocator(wanted).isVisible({ timeout: 1000 }).catch(() => false);
  }

  _isNoiseFolderLabel(name) {
    const normalized = String(name || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return true;
    if (/^title\s+time\s*stamp/i.test(normalized)) return true;
    if (/uploaded\s*by/i.test(normalized) && /action/i.test(normalized)) return true;
    if (/^(title|name|size|modified|actions?|type|date|uploaded by|time stamp)$/i.test(normalized)) return true;
    if (normalized.split(/\s+/).length >= 4 && /title|timestamp|uploaded|action/i.test(normalized)) return true;
    return false;
  }

  _isLikelyUploadedFolderName(name) {
    const normalized = String(name || '').replace(/\s+/g, ' ').trim();
    if (!normalized || this._isNoiseFolderLabel(normalized)) return false;
    if (normalized.length < 2 || normalized.length > 80) return false;
    return true;
  }

  _filterUploadCandidates(names) {
    const parent = String(this.lastParentFolderName || '').trim();
    return names.filter(
      (name) =>
        this._isLikelyUploadedFolderName(name) &&
        name !== parent &&
        !/^my folder(\s+\d+)?$/i.test(name)
    );
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async _assertPortalPageHealthy() {
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
    if (body.includes('multisite support not enabled')) {
      throw new Error(
        'Customer portal returned "Multisite support not enabled". Use sidebar navigation (Files → My Files) only.'
      );
    }
  }

  async waitForPortalHome() {
    await this.waitForNetworkSettled();
    await this._assertPortalPageHealthy();
    const homeMarker = this.page
      .getByRole('button', { name: /account settings|profile settings|logout/i })
      .or(this.page.getByText(/pick up where you left off|my projects|project dashboard|welcome/i))
      .first();
    await expect(homeMarker).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Customer portal home is ready (${this.page.url()})`);
  }

  _textMatchesLabel(text, labelRe) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (labelRe.test(normalized)) return true;
    const firstLine = normalized.split(/\n/)[0]?.trim() || '';
    return labelRe.test(firstLine);
  }

  async _clickNavByRole(labelRe, labelName) {
    const roles = ['link', 'button', 'menuitem'];
    for (const role of roles) {
      const el = this.page.getByRole(role, { name: labelRe }).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ timeout: this.uiTimeout, force: true });
        this.logStep(`Clicked "${labelName}" via role=${role}`);
        return true;
      }
    }
    return false;
  }

  async _clickNavLabel(labelRe, labelName) {
    for (const scope of this._navPanelScopes()) {
      if (!(await scope.isVisible({ timeout: 300 }).catch(() => false))) continue;

      const clickables = scope.locator(
        'a, button, [role="link"], [role="button"], [role="menuitem"], li, div[class*="ListItem"], span'
      );
      const count = Math.min(await clickables.count().catch(() => 0), 100);

      for (let i = 0; i < count; i += 1) {
        const item = clickables.nth(i);
        if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;

        const text = (await item.innerText().catch(() => '')) || '';
        const aria = (await item.getAttribute('aria-label').catch(() => '')) || '';
        if (!this._textMatchesLabel(text, labelRe) && !labelRe.test(aria)) continue;

        await item.scrollIntoViewIfNeeded().catch(() => {});
        const inner = item.locator('a, button, [role="link"], [role="button"]').first();
        if (await inner.isVisible({ timeout: 400 }).catch(() => false)) {
          await inner.click({ timeout: this.uiTimeout, force: true });
        } else {
          await item.click({ timeout: this.uiTimeout, force: true });
        }
        this.logStep(`Clicked "${labelName}" in nav panel`);
        return true;
      }
    }
    return false;
  }

  async _clickNav(labelRe, labelName) {
    const byRole = await this._clickNavByRole(labelRe, labelName);
    if (byRole) return true;

    const loc = labelRe.source === '^files$' ? this.filesNav : null;
    if (loc && (await loc.isVisible({ timeout: 2000 }).catch(() => false))) {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: this.uiTimeout, force: true });
      this.logStep(`Clicked "${labelName}" via nav locator`);
      return true;
    }

    return this._clickNavLabel(labelRe, labelName);
  }

  async _isMyFilesTabActive() {
    const tab = this.myFilesContentTab;
    if (!(await tab.isVisible({ timeout: 800 }).catch(() => false))) return false;

    const selected = await tab.getAttribute('aria-selected').catch(() => null);
    if (selected === 'true') return true;

    const className = (await tab.getAttribute('class').catch(() => '')) || '';
    return /Mui-selected|active|selected/i.test(className);
  }

  async _isOnFilesSection() {
    return this.filesSectionMarker.isVisible({ timeout: 1500 }).catch(() => false);
  }

  async _isMyFilesContentReady() {
    await this._assertPortalPageHealthy().catch(() => {});
    if (!(await this._isMyFilesTabActive())) return false;
    return this.enabledCreateButton().isVisible({ timeout: 1200 }).catch(() => false);
  }

  /** Step 1 — open Files section from logged-in home. */
  async navigateToFiles() {
    await this.waitForPortalHome();

    if (await this._isMyFilesContentReady()) {
      this.logStep('Already on customer My Files page');
      return;
    }

    if (await this._isOnFilesSection()) {
      this.logStep('Already on customer Files section');
      return;
    }

    const clicked = await this._clickNav(/^files$/i, 'Files');
    if (!clicked) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 350);
      throw new Error(`Could not find Files navigation on customer portal. Visible snippet: ${snippet}`);
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});
    await this._assertPortalPageHealthy();
    await expect(this.filesSectionMarker).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Navigated to customer Files section');
  }

  /** Step 2 — click My Files tab and wait for + Create button. */
  async clickMyFiles() {
    if (await this._isMyFilesContentReady()) {
      this.logStep('Already on customer My Files page');
      return;
    }

    await expect(this.filesSectionMarker).toBeVisible({ timeout: this.defaultTimeout });

    const tab = this.myFilesContentTab;
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked My Files tab');

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});

    await expect(this.enabledCreateButton()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Customer My Files page is ready (+ Create visible)');
  }

  async navigateToMyFiles() {
    await this.navigateToFiles();
    await this.clickMyFiles();
  }

  async expectMyFilesPageDisplayed() {
    await this._assertPortalPageHealthy();
    await expect(this.myFilesContentTab).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.enabledCreateButton()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Customer My Files page is displayed (+ Create visible)');
  }

  /** Step 3 — click + Create → Folder. */
  async clickCreateFolder() {
    const createBtn = this.enabledCreateButton();
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(createBtn).toBeEnabled({ timeout: this.uiTimeout });
    await createBtn.click({ timeout: this.uiTimeout });
    this.logStep('Clicked + Create button on My Files');

    await this.page.waitForTimeout(800).catch(() => {});
    const folderItem = this.createFolderMenuItem();
    await expect(folderItem).toBeVisible({ timeout: this.uiTimeout });
    await folderItem.click({ timeout: this.uiTimeout });
    this.logStep('Selected Folder from Create menu');

    await expect(this.folderNameInput()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Create Folder dialog is open');
  }

  async clickCreateOnMyFilesPage() {
    await this.clickCreateFolder();
  }

  async _folderExists(folderName) {
    return this._folderLocator(folderName).isVisible({ timeout: 800 }).catch(() => false);
  }

  /** Pick "My Folder", or "My Folder 1", "My Folder 2", … if name already exists. */
  async resolveUniqueFolderName(baseName) {
    const base = String(baseName || 'My Folder').trim();
    const max = 25;
    for (let i = 0; i <= max; i += 1) {
      const candidate = i === 0 ? base : `${base} ${i}`;
      if (!(await this._folderExists(candidate))) {
        this.logStep(`Resolved unique folder name: "${candidate}"`);
        return candidate;
      }
    }
    const fallback = `${base} ${Date.now()}`;
    this.logStep(`Using timestamp folder name: "${fallback}"`);
    return fallback;
  }

  async enterUniqueFolderName(baseName) {
    const wanted = await this.resolveUniqueFolderName(baseName);
    this.lastFolderName = wanted;
    await this.enterFolderName(wanted);
    return wanted;
  }

  async enterFolderName(folderName) {
    const wanted = String(folderName || '').trim();
    if (!wanted) throw new Error('Folder name is required');
    this.lastFolderName = wanted;

    const input = this.folderNameInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: this.uiTimeout });
    await input.fill('');
    await input.pressSequentially(wanted, { delay: 30 });
    this.logStep(`Entered folder name: ${wanted}`);
  }

  async clickCreateOnFolderDialog() {
    const createBtn = this.createDialogButton();
    await expect(createBtn).toBeVisible({ timeout: this.uiTimeout });
    await expect(createBtn).toBeEnabled({ timeout: this.uiTimeout });
    await createBtn.click({ timeout: this.uiTimeout });

    const duplicateToast = this.page
      .locator('.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({ hasText: /already exist|duplicate|name.*taken/i })
      .first();

    await this.page.waitForTimeout(1200).catch(() => {});

    if (await duplicateToast.isVisible({ timeout: 2000 }).catch(() => false)) {
      this.logStep('Folder name already exists — retrying with next available suffix');
      const base = String(this.lastFolderName || 'My Folder').replace(/\s+\d+$/, '').trim();
      const nextName = await this.resolveUniqueFolderName(base);
      if (nextName !== this.lastFolderName) {
        this.lastFolderName = nextName;
        await this.enterFolderName(nextName);
        await expect(createBtn).toBeEnabled({ timeout: this.uiTimeout });
        await createBtn.click({ timeout: this.uiTimeout });
      }
    }

    await expect
      .poll(
        async () => {
          const toast = await this.page
            .locator('.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
            .filter({ hasText: /created|success|folder/i })
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
          const folderVisible = await this._folderLocator(this.lastFolderName).isVisible({ timeout: 500 }).catch(() => false);
          return toast || folderVisible;
        },
        { timeout: 30000, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy()
      .catch(() => {});

    this.lastFolderCreateOk = true;
    await this.waitForNetworkSettled();
    this.logStep('Clicked Create on folder dialog');
  }

  async expectFolderCreatedSuccessfully(folderName) {
    const wanted = String(folderName || this.lastFolderName || '').trim();
    await expect(this._folderLocator(wanted)).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Folder "${wanted}" created successfully`);
  }

  async expectFolderInList(folderName) {
    const wanted = String(folderName || '').trim();
    await expect(this._folderLocator(wanted)).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Folder "${wanted}" is displayed in My Files list`);
  }

  uploadFolderMenuItem() {
    return this._uploadFolderMenuItemInScope(
      this.page.locator('[role="menu"], .MuiMenu-list, .MuiPopover-root, [role="listbox"]').filter({ visible: true })
    );
  }

  _uploadFolderMenuItemInScope(scope) {
    return scope
      .getByRole('menuitem', { name: /upload\s*folder|folder\s*upload|upload\s*directory/i })
      .or(scope.getByRole('option', { name: /upload\s*folder|folder\s*upload|upload\s*directory/i }))
      .or(
        scope
          .locator('[role="menuitem"], [role="option"], .MuiMenuItem-root, li, span, div')
          .filter({ hasText: /upload\s*folder|folder\s*upload|upload\s*directory/i })
      )
      .filter({ visible: true })
      .first();
  }

  uploadFolderButton() {
    return this._filesContent()
      .getByRole('button', { name: /upload\s*folder|folder\s*upload|upload\s*directory/i })
      .or(this._filesContent().getByLabel(/upload\s*folder|folder\s*upload/i))
      .or(this._filesContent().locator('button, a, [role="button"]').filter({ hasText: /upload\s*folder|folder\s*upload/i }))
      .or(this.page.getByRole('button', { name: /upload\s*folder|folder\s*upload/i }))
      .filter({ visible: true })
      .first();
  }

  uploadActionButton() {
    return this._filesContent()
      .getByRole('button', { name: /^upload$/i })
      .or(this._filesContent().locator('button:not([disabled]):not(.Mui-disabled)').filter({ hasText: /^\+\s*upload$/i }))
      .or(this._filesContent().getByLabel(/^upload$/i))
      .filter({ visible: true })
      .first();
  }

  enabledActionMenuButtons() {
    return this._filesContent()
      .locator('button:not([disabled]):not(.Mui-disabled)')
      .filter({ hasText: /^\s*\+?\s*(create|new|upload)\s*$/i })
      .filter({ visible: true });
  }

  async _collectVisibleMenuLabels() {
    const menu = this.page.locator('[role="menu"], .MuiMenu-list, .MuiPopover-root').filter({ visible: true }).last();
    if (!(await menu.isVisible({ timeout: 500 }).catch(() => false))) return [];

    const items = menu.locator('[role="menuitem"], [role="option"], .MuiMenuItem-root, li');
    const count = Math.min(await items.count().catch(() => 0), 30);
    const labels = [];
    for (let i = 0; i < count; i += 1) {
      const text = ((await items.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (text) labels.push(text);
    }
    return labels;
  }

  async _findUploadFolderMenuItem() {
    const menus = this.page
      .locator('[role="menu"], .MuiMenu-list, .MuiPopover-root, [role="listbox"]')
      .filter({ visible: true });
    const menuCount = Math.min(await menus.count().catch(() => 0), 5);

    for (let m = 0; m < menuCount; m += 1) {
      const item = this._uploadFolderMenuItemInScope(menus.nth(m));
      if (await item.isVisible({ timeout: 500 }).catch(() => false)) return item;
    }

    const loose = this.page
      .locator('[role="menuitem"], [role="option"], .MuiMenuItem-root, li, button, a, [role="button"], span, div')
      .filter({ hasText: /upload\s*folder|folder\s*upload|upload\s*directory/i })
      .filter({ visible: true })
      .first();
    if (await loose.isVisible({ timeout: 500 }).catch(() => false)) return loose;

    return null;
  }

  async _tryUploadFolderSubmenu() {
    const menus = this.page.locator('[role="menu"], .MuiMenu-list, .MuiPopover-root').filter({ visible: true });
    const menuCount = Math.min(await menus.count().catch(() => 0), 5);

    for (let m = 0; m < menuCount; m += 1) {
      const menu = menus.nth(m);
      const uploadParent = menu
        .locator('[role="menuitem"], [role="option"], .MuiMenuItem-root, li')
        .filter({ hasText: /^upload$/i })
        .filter({ visible: true })
        .first();
      if (!(await uploadParent.isVisible({ timeout: 500 }).catch(() => false))) continue;

      await uploadParent.click({ timeout: this.uiTimeout });
      await this.page.waitForTimeout(600).catch(() => {});

      const folderChild = await this._findUploadFolderMenuItem();
      if (folderChild) {
        await folderChild.click({ timeout: this.uiTimeout });
        this.logStep('Selected Upload → Folder from nested menu');
        return true;
      }

      const folderOnly = this.page
        .locator('[role="menuitem"], [role="option"], .MuiMenuItem-root, li')
        .filter({ hasText: /^folder$/i })
        .filter({ visible: true })
        .last();
      if (await folderOnly.isVisible({ timeout: 1500 }).catch(() => false)) {
        await folderOnly.click({ timeout: this.uiTimeout });
        this.logStep('Selected Upload → Folder from nested menu (folder option)');
        return true;
      }
    }

    return false;
  }

  async _waitForFolderInterior(folderName) {
    const wanted = String(folderName || this.lastParentFolderName || '').trim();
    await expect(async () => {
      const createVisible = await this.enabledCreateButton().isVisible({ timeout: 800 }).catch(() => false);
      const uploadVisible = await this.uploadFolderButton().isVisible({ timeout: 800 }).catch(() => false);
      const uploadBtnVisible = await this.uploadActionButton().isVisible({ timeout: 800 }).catch(() => false);
      const actionCount = await this.enabledActionMenuButtons().count().catch(() => 0);
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
      const breadcrumb = wanted ? body.includes(wanted.toLowerCase()) : false;
      expect(createVisible || uploadVisible || uploadBtnVisible || actionCount > 0 || breadcrumb).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.logStep(`Folder interior ready${wanted ? ` for "${wanted}"` : ''}`);
  }

  uploadDialog() {
    return this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').filter({ visible: true }).first();
  }

  uploadDialogButton() {
    return this.uploadDialog().getByRole('button', { name: /^upload$/i }).last();
  }

  defaultUploadFolderPath() {
    const fromEnv = process.env.CUSTOMER_UPLOAD_FOLDER_PATH;
    if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
    const fixture = path.resolve(__dirname, '../../../fixtures/Upload Test Folder');
    if (!fs.existsSync(fixture)) {
      throw new Error(`Upload fixture folder missing: ${fixture}`);
    }
    return fixture;
  }

  /** Find existing "My Folder" (or My Folder 1, 2, …) created by TC-03. */
  async resolveExistingFolderName(baseName = 'My Folder') {
    const base = String(baseName || 'My Folder').trim();
    if (await this._folderExists(base)) {
      this.logStep(`Found existing folder: "${base}"`);
      return base;
    }
    for (let i = 1; i <= 25; i += 1) {
      const candidate = `${base} ${i}`;
      if (await this._folderExists(candidate)) {
        this.logStep(`Found existing folder: "${candidate}"`);
        return candidate;
      }
    }
    throw new Error(`No existing folder matching "${base}" — create it first (TC-03).`);
  }

  async openFolder(folderName) {
    const wanted = String(folderName || '').trim();
    this.lastParentFolderName = wanted;
    const folder = this._folderLocator(wanted);
    await expect(folder).toBeVisible({ timeout: this.defaultTimeout });
    await folder.scrollIntoViewIfNeeded().catch(() => {});
    await folder.dblclick({ timeout: this.uiTimeout }).catch(async () => {
      await folder.click({ timeout: this.uiTimeout, force: true });
    });
    await this.waitForNetworkSettled();
    await this._waitForFolderInterior(wanted);
    this.logStep(`Opened customer folder "${wanted}"`);
  }

  async openExistingFolder(baseName) {
    const wanted = await this.resolveExistingFolderName(baseName);
    await this.openFolder(wanted);
    return wanted;
  }

  async clickUploadFolder() {
    await this.page.bringToFront().catch(() => {});
    await this.waitForNetworkSettled();

    const autoOk = await this._tryAutoClickUploadFolder();
    if (autoOk) {
      this.logStep('Clicked Upload Folder automatically');
      return;
    }

    this.logStep('Upload Folder not found automatically — waiting for manual click');
    await this.waitForEnterInTerminal(
      [
        'Inside My Folder: click Upload Folder in the customer portal browser.',
        'When the upload dialog / folder picker is open, press ENTER here to continue.',
      ].join('\n')
    );
  }

  async _tryAutoClickUploadFolder() {
    const direct = this.uploadFolderButton();
    if (await direct.isVisible({ timeout: 2000 }).catch(() => false)) {
      await direct.click({ timeout: this.uiTimeout });
      return true;
    }

    const uploadBtn = this.uploadActionButton();
    if (await uploadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await uploadBtn.click({ timeout: this.uiTimeout });
      await this.page.waitForTimeout(700).catch(() => {});

      if (await this._tryUploadFolderSubmenu()) return true;

      const uploadItem = await this._findUploadFolderMenuItem();
      if (uploadItem) {
        await uploadItem.click({ timeout: this.uiTimeout });
        return true;
      }

      const fileInput = this.page.locator('input[type="file"][webkitdirectory], input[type="file"][directory]').first();
      const dialogOpen = await this.uploadDialog().isVisible({ timeout: 1500 }).catch(() => false);
      if (dialogOpen || (await fileInput.count().catch(() => 0)) > 0) return true;
    }

    const triggers = this.enabledActionMenuButtons();
    const triggerCount = Math.min(await triggers.count().catch(() => 0), 6);
    for (let i = 0; i < triggerCount; i += 1) {
      const trigger = triggers.nth(i);
      await trigger.click({ timeout: this.uiTimeout });
      await this.page.waitForTimeout(800).catch(() => {});

      const uploadItem = await this._findUploadFolderMenuItem();
      if (uploadItem) {
        await uploadItem.click({ timeout: this.uiTimeout });
        return true;
      }

      if (await this._tryUploadFolderSubmenu()) return true;

      await this.page.keyboard.press('Escape').catch(() => {});
    }

    const labels = await this._collectVisibleMenuLabels();
    if (labels.length) {
      this.logStep(`Upload Folder auto-click skipped — visible menu labels: ${labels.join(' | ')}`);
    }
    return false;
  }

  async waitForFolderSelectionWindow() {
    const dialog = this.uploadDialog();
    const fileInput = this.page.locator('input[type="file"]').first();
    const open = await dialog.or(fileInput).isVisible({ timeout: 5000 }).catch(() => false);
    if (open) {
      this.logStep('Customer folder selection / upload window is open');
      return;
    }

    this.logStep('Upload dialog not detected — waiting for manual folder picker');
    await this.waitForEnterInTerminal(
      'Select the folder in the system file picker and confirm it appears in the upload section, then press ENTER here.'
    );
    this.logStep('Continuing after manual folder selection');
  }

  async waitForManualFolderUpload() {
    await this.page.bringToFront().catch(() => {});
    const testData = require('../../../utils/testData');
    const defaultName =
      process.env.CUSTOMER_UPLOADED_FOLDER_NAME ||
      testData.client?.myFiles?.uploadFolderName ||
      'Upload Test Folder';

    await this.waitForEnterInTerminal(
      [
        'Manual folder upload — complete these steps in the browser:',
        '  1) Select the folder in the file picker',
        '  2) Verify it appears in the upload section',
        '  3) Click Upload and wait until the upload finishes',
        'Then press ENTER in this terminal to continue the test.',
      ].join('\n')
    );

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(2000).catch(() => {});

    const detected = await this.captureUploadedFolderNameAfterManualUpload(defaultName);
    this.logStep(`Manual folder upload completed — using folder "${detected}"`);
    return detected;
  }

  async _listVisibleFolderNames() {
    const names = new Set();
    const rows = this.page.locator('tbody tr, [role="row"]').filter({ visible: true });
    const count = Math.min(await rows.count().catch(() => 0), 50);

    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      const isHeader = await row.locator('th, [role="columnheader"]').count().catch(() => 0);
      if (isHeader) continue;

      const firstCell = row.locator('td, [role="gridcell"]').first();
      const text = ((await firstCell.innerText().catch(() => '')) || '').trim();
      const firstLine = text.split('\n')[0]?.trim();
      if (this._isLikelyUploadedFolderName(firstLine)) {
        names.add(firstLine);
      }
    }

    const cards = this._filesContent().locator('.MuiCard-root, .MuiListItem-root, li');
    const cardCount = Math.min(await cards.count().catch(() => 0), 40);
    for (let i = 0; i < cardCount; i += 1) {
      const text = ((await cards.nth(i).innerText().catch(() => '')) || '').trim();
      const firstLine = text.split('\n')[0]?.trim();
      if (this._isLikelyUploadedFolderName(firstLine)) {
        names.add(firstLine);
      }
    }

    return [...names];
  }

  async captureUploadedFolderNameAfterManualUpload(defaultName) {
    const testData = require('../../../utils/testData');
    const fallback =
      process.env.CUSTOMER_UPLOADED_FOLDER_NAME ||
      defaultName ||
      testData.client?.myFiles?.uploadFolderName ||
      'Upload Test Folder';
    const preferred = [
      ...new Set(
        [
          process.env.CUSTOMER_UPLOADED_FOLDER_NAME,
          defaultName,
          process.env.CUSTOMER_UPLOAD_FOLDER_PATH
            ? path.basename(path.resolve(process.env.CUSTOMER_UPLOAD_FOLDER_PATH))
            : null,
          testData.client?.myFiles?.uploadFolderName,
        ].filter(Boolean)
      ),
    ];

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      for (const name of preferred) {
        if (await this._folderExistsLoose(name)) {
          this.lastUploadedFolderName = name;
          return name;
        }
      }

      const candidates = this._filterUploadCandidates(await this._listVisibleFolderNames());
      const uploadLike = candidates.find((name) => /upload|test|sample/i.test(name));
      if (uploadLike) {
        this.lastUploadedFolderName = uploadLike;
        return uploadLike;
      }

      if (candidates.length === 1) {
        this.lastUploadedFolderName = candidates[0];
        return candidates[0];
      }

      await this.page.waitForTimeout(2000).catch(() => {});
    }

    const typed = await this.promptForTextInTerminal(
      'Type the uploaded folder name exactly as shown in the My Folder file list',
      fallback
    );
    if (!typed || this._isNoiseFolderLabel(typed)) {
      throw new Error(
        `Invalid uploaded folder name "${typed || ''}". Type the folder name from the file list (not table headers).`
      );
    }

    this.lastUploadedFolderName = typed;
    return typed;
  }

  async selectUploadFolderFromSystem(folderPath) {
    const resolved = path.resolve(folderPath || this.defaultUploadFolderPath());
    if (!fs.existsSync(resolved)) {
      throw new Error(`Upload folder not found on disk: ${resolved}`);
    }

    this.lastUploadFolderPath = resolved;
    this.lastUploadedFolderName = path.basename(resolved);

    const dialog = this.uploadDialog();
    const fileInput = dialog
      .locator('input[type="file"]')
      .first()
      .or(this.page.locator('input[type="file"]').first());

    if (await fileInput.count().catch(() => 0)) {
      await fileInput.setInputFiles(resolved);
      this.logStep(`Selected upload folder via file input: ${this.lastUploadedFolderName}`);
      return this.lastUploadedFolderName;
    }

    const browseTrigger = dialog
      .getByRole('button', { name: /browse|choose|select|upload/i })
      .or(dialog.getByText(/browse|choose\s*folder|select\s*folder|click to upload/i))
      .filter({ visible: true })
      .first();

    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 30000 }),
      browseTrigger.click({ timeout: this.uiTimeout, force: true }),
    ]);
    await fileChooser.setFiles(resolved);
    this.logStep(`Selected upload folder via file chooser: ${this.lastUploadedFolderName}`);
    return this.lastUploadedFolderName;
  }

  async expectSelectedFolderInUploadSection(folderName) {
    const wanted = String(folderName || this.lastUploadedFolderName || '').trim();
    const dialog = this.uploadDialog();
    await expect(async () => {
      const inDialog = await dialog.getByText(new RegExp(this._escapeRegex(wanted), 'i')).isVisible({ timeout: 1000 }).catch(() => false);
      const body = (await this.page.locator('body').innerText().catch(() => '')) || '';
      expect(inDialog || body.toLowerCase().includes(wanted.toLowerCase())).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000] });
    this.logStep(`Selected folder "${wanted}" is shown in upload section`);
  }

  async clickUploadOnFolderDialog() {
    const uploadBtn = this.uploadDialogButton();
    await expect(uploadBtn).toBeVisible({ timeout: this.uiTimeout });
    await expect(uploadBtn).toBeEnabled({ timeout: this.uiTimeout });
    await uploadBtn.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Upload on customer folder upload dialog');
  }

  async expectFolderUploadCompleted() {
    await expect
      .poll(
        async () => {
          const toast = await this.page
            .locator('.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
            .filter({ hasText: /upload|success|completed|folder/i })
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
          const folderVisible = await this._folderLocator(this.lastUploadedFolderName).isVisible({ timeout: 500 }).catch(() => false);
          const dialogClosed = !(await this.uploadDialog().isVisible({ timeout: 300 }).catch(() => false));
          return toast || (folderVisible && dialogClosed);
        },
        { timeout: 60000, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();
    this.logStep('Customer folder upload completed successfully');
  }

  async expectUploadedFolderInsideParent(parentFolderName, uploadedFolderName) {
    const parent = String(parentFolderName || this.lastParentFolderName || '').trim();
    const uploaded = String(uploadedFolderName || this.lastUploadedFolderName || '').trim();
    if (this._isNoiseFolderLabel(uploaded)) {
      throw new Error(
        `Invalid uploaded folder name "${uploaded}". Re-run and type the folder name from the file list when prompted.`
      );
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.waitForNetworkSettled();

    const escaped = this._escapeRegex(uploaded);
    const exactName = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
    const containsName = new RegExp(escaped, 'i');
    const folder = this._folderLocator(uploaded);
    const byText = this.page.getByText(exactName).filter({ visible: true }).first();
    const loose = this.page
      .locator('div, span, p, td, a, button, li')
      .filter({ hasText: containsName })
      .filter({ visible: true })
      .first();

    await expect
      .poll(
        async () => {
          if (await folder.isVisible({ timeout: 800 }).catch(() => false)) return 'locator';
          if (await byText.isVisible({ timeout: 800 }).catch(() => false)) return 'text';
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
          if (containsName.test(body) && (await loose.isVisible({ timeout: 500 }).catch(() => false))) {
            return 'body';
          }
          return '';
        },
        { timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] }
      )
      .toBeTruthy();

    this.logStep(`Uploaded folder "${uploaded}" is displayed inside "${parent}"`);
  }
}

module.exports = CustomerMyFilesPage;
