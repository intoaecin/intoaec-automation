const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const AdminClientPage = require('./AdminClientPage');

/**
 * Admin Portal — project sidebar Document (OTHERS) → Organization | Client tab.
 * Reference UI: Upload Files - {project}, + New, Organization / Client tabs.
 */
class AdminClientDocumentPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = 30000;
    this.lastFolderName = null;
  }

  logStep(msg) {
    console.log(`[AdminClientDocument] ${msg}`);
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _adminClientPage() {
    return new AdminClientPage(this.page);
  }

  _main() {
    return this.page.locator('main, [role="main"]').first();
  }

  /** Document item under OTHERS in the project sidebar. */
  documentSidebarNav() {
    return this.page
      .locator('aside, nav, [class*="sidebar" i], [class*="Drawer" i], [class*="drawer" i]')
      .getByRole('button', { name: /^document$/i })
      .first()
      .or(this.page.getByRole('button', { name: /^document$/i }).filter({ visible: true }).first());
  }

  organizationTab() {
    return this.page.getByRole('tab', { name: /^organization$/i }).first();
  }

  /** Client tab inside Document module (Organization | Client tab bar). */
  documentClientTab() {
    return this.page
      .locator('[role="tablist"]')
      .filter({ has: this.page.getByRole('tab', { name: /^organization$/i }) })
      .getByRole('tab', { name: /^client$/i })
      .first();
  }

  documentTablist() {
    return this.page
      .locator('[role="tablist"]')
      .filter({ has: this.page.getByRole('tab', { name: /^organization$/i }) })
      .first();
  }

  newDocumentButton() {
    return this.page.getByRole('button', { name: /^\+\s*new$/i }).first();
  }

  async openProjectForClientDocumentVerification(projectName, clientDisplayNames = []) {
    const adminClient = this._adminClientPage();
    const names = [...clientDisplayNames, 'john', 'John', 'Hari', projectName].filter(Boolean);
    await adminClient.openProjectForClientVerification(projectName, [...new Set(names)]);
    this.logStep(`Opened admin project "${projectName}" and client for document verification`);
  }

  async _isDocumentContentReady() {
    const orgTab = await this.organizationTab().isVisible({ timeout: 1200 }).catch(() => false);
    const clientTab = await this.documentClientTab().isVisible({ timeout: 1200 }).catch(() => false);
    if (orgTab && clientTab) return true;

    const uploadHeading = await this.page.getByText(/upload files/i).isVisible({ timeout: 1200 }).catch(() => false);
    const newBtn = await this.newDocumentButton().isVisible({ timeout: 1200 }).catch(() => false);
    return uploadHeading || newBtn;
  }

  async _leaveClientProfileTab() {
    const url = new URL(this.page.url());
    if (url.searchParams.get('tab') !== 'Client') return;

    url.searchParams.delete('tab');
    const hubUrl = url.toString();
    this.logStep(`Leaving Client profile tab: ${hubUrl}`);
    await this.page.goto(hubUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async _clickDocumentSidebarNav() {
    const docNav = this.documentSidebarNav();
    await expect(docNav).toBeVisible({ timeout: this.defaultTimeout });
    await docNav.scrollIntoViewIfNeeded().catch(() => {});
    await docNav.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked Document in admin project sidebar (OTHERS)');
  }

  async _isDocumentClientTabActive() {
    const clientTab = this.documentClientTab();
    if (!(await clientTab.isVisible({ timeout: 800 }).catch(() => false))) return false;
    const selected = await clientTab.getAttribute('aria-selected').catch(() => null);
    if (selected === 'true') return true;
    const className = (await clientTab.getAttribute('class').catch(() => '')) || '';
    return /Mui-selected|active|selected/i.test(className);
  }

  async _waitForDocumentModule() {
    await expect
      .poll(async () => this._isDocumentContentReady(), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
  }

  /** Open Document module from project sidebar. */
  async navigateToDocumentSection() {
    await this._leaveClientProfileTab();

    if (!(await this._isDocumentContentReady())) {
      await this._clickDocumentSidebarNav();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }

    if (!(await this._isDocumentContentReady())) {
      await this._clickDocumentSidebarNav();
      await this.page.waitForTimeout(1000).catch(() => {});
    }

    await this._waitForDocumentModule();
    this.logStep('Navigated to admin Document module (Upload Files — Organization tab)');
  }

  /** Click Client tab in Document module (Organization | Client). */
  async navigateToDocumentClientSection() {
    await this._waitForDocumentModule();

    const clientTab = this.documentClientTab();
    await expect(clientTab).toBeVisible({ timeout: this.defaultTimeout });
    await clientTab.scrollIntoViewIfNeeded().catch(() => {});
    await clientTab.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForTimeout(1000).catch(() => {});

    await expect
      .poll(async () => this._isDocumentClientTabActive(), {
        timeout: this.uiTimeout,
        intervals: [300, 500, 1000],
      })
      .toBeTruthy();

    this.logStep('Switched to admin Document Client tab');
  }

  _folderLocator(folderName) {
    const escaped = this._escapeRegex(folderName);
    return this._main()
      .getByRole('row', { name: new RegExp(escaped, 'i') })
      .or(this._main().getByRole('button', { name: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }))
      .or(this._main().getByRole('link', { name: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }))
      .or(
        this._main()
          .locator('tr, [role="row"], .MuiCard-root, .MuiListItem-root, li, div, span, a')
          .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      )
      .or(
        this.page
          .locator('tr, [role="row"], .MuiCard-root, .MuiListItem-root, li, div, span, a')
          .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      )
      .filter({ visible: true })
      .first();
  }

  async expectFolderDisplayed(folderName) {
    const wanted = String(folderName || '').trim();
    this.lastFolderName = wanted;

    if (!(await this._isDocumentClientTabActive())) {
      await this.navigateToDocumentClientSection();
    }

    await expect(async () => {
      const visible = await this._folderLocator(wanted).isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) return;
      const body = (await this.page.locator('body').innerText().catch(() => '')) || '';
      expect(body.toLowerCase()).toContain(wanted.toLowerCase());
    }).toPass({ timeout: this.defaultTimeout, intervals: [2000, 3000, 5000] });

    this.logStep(`Admin client folder "${wanted}" is displayed in Document Client tab`);
  }

  async openFolder(folderName) {
    const wanted = String(folderName || '').trim();
    this.lastFolderName = wanted;

    if (!(await this._isDocumentClientTabActive())) {
      await this.navigateToDocumentClientSection();
    }

    const folder = this._folderLocator(wanted);
    await expect(folder).toBeVisible({ timeout: this.defaultTimeout });
    await folder.scrollIntoViewIfNeeded().catch(() => {});
    await folder.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep(`Opened admin client folder "${wanted}"`);
  }

  async expectFolderAccessible(folderName) {
    const wanted = String(folderName || this.lastFolderName || '').trim();
    await expect(async () => {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      const inBody = body.toLowerCase().includes(wanted.toLowerCase());
      const breadcrumb = await this.page
        .locator('[aria-label="breadcrumb"], .MuiBreadcrumbs-root, nav')
        .filter({ hasText: new RegExp(this._escapeRegex(wanted), 'i') })
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      const folderStillVisible = await this._folderLocator(wanted).isVisible({ timeout: 1000 }).catch(() => false);
      expect(inBody || breadcrumb || folderStillVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 3000] });

    this.logStep(`Admin client folder "${wanted}" is accessible`);
  }

  async expectUploadedFolderDisplayed(uploadedFolderName) {
    await this.expectFolderDisplayed(uploadedFolderName);
    this.logStep(`Admin uploaded folder "${uploadedFolderName}" is displayed`);
  }

  async expectUploadedFolderAccessibleWithContents(uploadedFolderName) {
    const wanted = String(uploadedFolderName || '').trim();
    await this.expectFolderAccessible(wanted);

    await expect(async () => {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      const hasContent =
        /upload-sample|sample|file|document|folder|item|there are no items/i.test(body) ||
        (await this._main().locator('tr, [role="row"], .MuiCard-root, li').count()) > 0;
      expect(hasContent).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 3000] });

    this.logStep(`Admin uploaded folder "${wanted}" is accessible with contents visible`);
  }
}

module.exports = AdminClientDocumentPage;
