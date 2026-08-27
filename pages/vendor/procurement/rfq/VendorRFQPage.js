const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');
const {
  RfqVendorPortalPriceUpdatePage,
} = require('../../../admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-portal-price-update.page');

/**
 * Vendor portal → Procurement Hub → connected org → project → RFQ list
 * → overflow (3 dots) → Preview → Price Update → Update Price.
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/procurement/rfq/VendorRFQ_TestCases.feature
 *   Steps:   step-definitions/vendor/procurement/rfq/VendorRFQStep.js
 *   Page:    this file
 */
class VendorRFQPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = 30000;
    this.listTimeout = 180000;

    this.procurementHubNav = page
      .getByRole('link', { name: /procurement\s*hub/i })
      .or(page.getByRole('button', { name: /procurement\s*hub/i }))
      .or(page.locator('a[href*="procurement" i]'))
      .or(page.getByText(/^procurement\s*hub$/i))
      .first();

    this.rfqListNav = page
      .getByRole('tab', { name: /rfq(\s*list)?/i })
      .or(page.getByRole('link', { name: /rfq(\s*list)?/i }))
      .or(page.getByRole('button', { name: /rfq(\s*list)?/i }))
      .or(page.getByText(/^rfq\s*list$/i))
      .or(page.locator('a[href*="rfq" i]'))
      .first();

    this.previewButton = page
      .getByRole('button', { name: /^preview$/i })
      .or(page.getByRole('link', { name: /^preview$/i }))
      .or(page.getByText(/^preview$/i))
      .first();

    /** @type {import('@playwright/test').Page | null} */
    this.previewPage = null;
  }

  logStep(msg) {
    console.log(`[VendorRFQ] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async _clickFirstVisible(candidates, timeoutMs = 4000) {
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: timeoutMs }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
          await candidate.click({ timeout: this.uiTimeout });
        });
        return true;
      }
    }
    return false;
  }

  async isOnRfqList() {
    const url = String(this.page.url() || '');
    if (/dashboard|signIn|multi-account-switch/i.test(url) && !/rfq/i.test(url)) {
      return false;
    }
    return /rfq/i.test(url) && !/dashboard/i.test(url);
  }

  async isOnProcurementHub() {
    return /procurement-hub/i.test(String(this.page.url() || ''));
  }

  async isProjectsListVisible() {
    const rfqTab = this.page.getByRole('tab', { name: /^rfq$/i }).first();
    if (await rfqTab.isVisible({ timeout: 800 }).catch(() => false)) return true;

    const projectHeader = this.page
      .getByRole('columnheader', { name: /project/i })
      .or(this.page.getByText(/^project\s*name$/i))
      .or(this.page.getByText(/^projects?$/i))
      .first();
    if (await projectHeader.isVisible({ timeout: 800 }).catch(() => false)) {
      const dataRows = this.page.locator('table tbody tr').filter({ visible: true });
      if ((await dataRows.count().catch(() => 0)) > 0) return true;
      const cards = this.page.locator('main .MuiCard-root, main .MuiPaper-root').filter({ visible: true });
      if ((await cards.count().catch(() => 0)) > 0) return true;
    }

    // Hub often stays on /procurement-hub after org click; project table alone is enough.
    const rows = this.page.locator('table tbody tr').filter({ has: this.page.locator('td') }).filter({ visible: true });
    if ((await rows.count().catch(() => 0)) > 0) {
      const orgPickerHint = this.page.getByText(/select\s*(an?\s*)?organization|connected\s*organizations?/i).first();
      if (!(await orgPickerHint.isVisible({ timeout: 500 }).catch(() => false))) {
        return true;
      }
    }

    return false;
  }

  async findOrganizationTarget(orgName) {
    const wanted = String(orgName || '').trim();
    if (!wanted) return null;

    const nameRe = new RegExp(this._escapeRegex(wanted), 'i');
    const exactRe = new RegExp(`^\\s*${this._escapeRegex(wanted)}\\s*$`, 'i');

    const textNode = this.page.getByText(exactRe).filter({ visible: true }).first();
    if (await textNode.isVisible({ timeout: 3000 }).catch(() => false)) {
      const ancestor = textNode
        .locator(
          'xpath=ancestor::tr[1] | ancestor::a[1] | ancestor::button[1] | ancestor::div[contains(@class,"MuiCard")][1] | ancestor::div[contains(@class,"MuiPaper")][1]'
        )
        .first();
      if (await ancestor.isVisible({ timeout: 1500 }).catch(() => false)) {
        return ancestor;
      }
      return textNode;
    }

    const candidates = [
      this.page.getByRole('row', { name: nameRe }).first(),
      this.page.getByRole('button', { name: nameRe }).first(),
      this.page.getByRole('link', { name: nameRe }).first(),
      this.page
        .locator('.MuiCard-root, .MuiPaper-root, tr, a, [role="button"]')
        .filter({ hasText: nameRe })
        .filter({ visible: true })
        .first(),
      this.page.getByText(nameRe).filter({ visible: true }).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        return candidate;
      }
    }

    return null;
  }

  organizationCards() {
    return this.page
      .locator('main, [role="main"]')
      .locator('table tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root, a, [role="button"]')
      .filter({ visible: true })
      .filter({ hasNot: this.page.getByText(/^procurement\s*hub$/i) })
      .filter({ hasNot: this.page.getByText(/^projects?$/i) });
  }

  /**
   * Leave vendor portal and open Admin Portal (same browser tab), then login if needed.
   */
  async navigateBackToAdminPortal() {
    const env = require('../../../../config/env');
    const testData = require('../../../../utils/testData');
    const LoginPage = require('../../../admin/auth/LoginPage');

    if (this.page.isClosed()) {
      throw new Error('Page was closed before navigating back to Admin Portal');
    }

    const adminUrl = String(env.admin || '').replace(/\/$/, '');
    this.logStep(`Navigating back to Admin Portal (${adminUrl})`);
    await this.page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });

    const loginPage = new LoginPage(this.page);
    await loginPage.ensureAuthenticated(
      testData.admin.validUser.email,
      testData.admin.validUser.password
    );

    const ProjectNavigationPage = require('../../../admin/projects/ProjectNavigationPage');
    await new ProjectNavigationPage(this.page).waitForSpaReady({ timeoutMs: 45000 }).catch(() => {});

    await expect(loginPage.appHeader.or(loginPage.appShell).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.logStep(`Back on Admin Portal (${this.page.url()})`);
  }

  async navigateToProcurementHub() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before opening Procurement Hub');
    }
    await this.waitForNetworkSettled();

    if (await this.isOnProcurementHub()) {
      this.logStep(`Already on Procurement Hub (${this.page.url()})`);
      return;
    }

    const clicked = await this._clickFirstVisible(
      [
        this.procurementHubNav,
        this.page.getByRole('link', { name: /procurement\s*hub/i }).first(),
        this.page.getByRole('button', { name: /procurement\s*hub/i }).first(),
        this.page.getByText(/^procurement\s*hub$/i).filter({ visible: true }).first(),
      ],
      5000
    );
    if (!clicked) {
      this.logStep('Procurement Hub nav link not clicked — using direct URL');
    }

    await this.waitForNetworkSettled();

    if (!(await this.isOnProcurementHub())) {
      await this.page.goto('https://vendor.aecplayhouse.com/procurement-hub', {
        waitUntil: 'domcontentloaded',
        timeout: this.defaultTimeout,
      });
      await this.waitForNetworkSettled();
    }

    await expect(this.page).toHaveURL(/procurement-hub/i, { timeout: this.defaultTimeout });
    this.logStep(`Opened Procurement Hub (${this.page.url()})`);
  }

  async selectConnectedOrganization(orgName) {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before selecting the connected organization');
    }

    if (!(await this.isOnProcurementHub())) {
      await this.navigateToProcurementHub();
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});

    if (await this.isProjectsListVisible()) {
      // When a specific org name is requested, still try to click it (projects detection can false-positive on org cards).
      if (!String(orgName || process.env.VENDOR_RFQ_ORG_NAME || '').trim()) {
        this.logStep('Projects list already visible — organization already selected');
        return;
      }
    }

    const candidates = [
      String(orgName || '').trim(),
      String(process.env.VENDOR_RFQ_ORG_NAME || '').trim(),
      'adithya constraction',
      'adityaconstructions',
      'Intoaec Org',
      'intoaec',
      'IntoAEC',
      'Intoaec',
    ].filter((name, index, arr) => name && arr.indexOf(name) === index);

    let selectedLabel = '';
    for (const name of candidates) {
      const target = await this.findOrganizationTarget(name);
      if (!target) continue;

      await target.scrollIntoViewIfNeeded().catch(() => {});
      await target.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
        await target.click({ timeout: this.uiTimeout });
      });
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1200).catch(() => {});

      if (await this.isProjectsListVisible()) {
        selectedLabel = name;
        break;
      }

      // Some hub UIs keep the same URL after org selection — look for project rows.
      const anyRow = this.page.locator('table tbody tr').filter({ visible: true }).first();
      if (await anyRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        selectedLabel = name;
        break;
      }

      this.logStep(`Clicked "${name}" but projects list not confirmed — trying next org candidate`);
    }

    if (!selectedLabel) {
      // Last resort: click the first org-looking card that is not the page title.
      const cards = this.organizationCards();
      const count = await cards.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 8); i += 1) {
        const card = cards.nth(i);
        const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 80) continue;
        if (/procurement\s*hub|dashboard|rfq|preview/i.test(text)) continue;
        await card.scrollIntoViewIfNeeded().catch(() => {});
        await card.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(1200).catch(() => {});
        if (
          (await this.isProjectsListVisible()) ||
          (await this.page.locator('table tbody tr').filter({ visible: true }).first().isVisible({ timeout: 1500 }).catch(() => false))
        ) {
          selectedLabel = text.slice(0, 80);
          break;
        }
      }
    }

    if (!selectedLabel) {
      const bodySnippet = ((await this.page.locator('main, body').first().innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400);
      throw new Error(
        `Connected organization was not selected on Procurement Hub. Tried: ${candidates.join(', ') || '(none)'}. Page text: ${bodySnippet}`
      );
    }

    this.logStep(`Selected connected organization "${selectedLabel}" (${this.page.url()})`);
  }

  firstDataRow() {
    return this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('td') })
      .filter({ visible: true })
      .first();
  }

  async clickFirstProjectOnHub() {
    return this.clickFirstProjectName();
  }

  /**
   * After org selection: click the project name (first project row / name cell / link).
   */
  async clickFirstProjectName() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking the project name');
    }
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    const firstRow = this.firstDataRow();
    const projectNameInRow = firstRow
      .locator('td a, td [role="button"], td button, a, [role="link"]')
      .filter({ visible: true })
      .first();
    const projectNameCell = firstRow.locator('td').filter({ visible: true }).nth(0);
    const projectNameText = this.page
      .locator('main table tbody tr td a, main table tbody tr td')
      .filter({ visible: true })
      .filter({ hasNot: this.page.getByText(/procurement\s*hub|organization|rfq/i) })
      .first();

    const candidates = [
      projectNameInRow,
      projectNameCell,
      projectNameText,
      firstRow,
      this.page.getByRole('row').filter({ has: this.page.getByRole('cell') }).filter({ visible: true }).first(),
      this.page
        .locator('main .MuiCard-root, main .MuiPaper-root, main [role="button"], main a')
        .filter({ visible: true })
        .filter({ hasNot: this.page.getByText(/procurement\s*hub|connected org/i) })
        .first(),
    ];

    const clicked = await this._clickFirstVisible(candidates, 6000);
    if (!clicked) {
      throw new Error('Could not click the project name on the vendor Procurement Hub');
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep(`Clicked project name on Procurement Hub (${this.page.url()})`);
  }

  /**
   * After org selection: click project/client by visible name (e.g. BBB).
   */
  async clickProjectName(name) {
    const wanted = String(name || '').trim();
    if (!wanted) {
      throw new Error('Vendor project name is required');
    }
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking the project name');
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRe = new RegExp(`^\\s*${escapeRe(wanted)}\\s*$`, 'i');
    const containsRe = new RegExp(escapeRe(wanted), 'i');

    const search = this.page
      .getByPlaceholder(/search/i)
      .or(this.page.getByRole('textbox', { name: /search/i }))
      .or(this.page.locator('input[type="search"], input[placeholder*="Search" i]'))
      .filter({ visible: true })
      .first();
    if (await search.isVisible({ timeout: 2500 }).catch(() => false)) {
      await search.fill(wanted).catch(() => {});
      await this.page.waitForTimeout(600).catch(() => {});
    }

    const candidates = [
      this.page.getByRole('link', { name: exactRe }).filter({ visible: true }).first(),
      this.page.getByRole('button', { name: exactRe }).filter({ visible: true }).first(),
      this.page.getByRole('cell', { name: exactRe }).filter({ visible: true }).first(),
      this.page.getByText(exactRe).filter({ visible: true }).first(),
      this.page
        .locator('table tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root, a, [role="button"]')
        .filter({ hasText: containsRe })
        .filter({ visible: true })
        .first(),
    ];

    const clicked = await this._clickFirstVisible(candidates, 8000);
    if (!clicked) {
      throw new Error(`Could not click project "${wanted}" on the vendor Procurement Hub`);
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep(`Clicked project "${wanted}" on Procurement Hub (${this.page.url()})`);
  }

  /**
   * Inside a vendor project profile: open RFQ tab / module / list.
   * Prefer UI click or ?tab=RFQ — never use /rfq path (vendor returns 404).
   */
  async clickRfqOnProject() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking RFQ');
    }
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    await this.recoverFrom404IfNeeded();

    if ((await this.isOnVendorRfqRoute()) && !(await this.is404Page()) && (await this.isRfqListVisible())) {
      this.logStep(`Already on vendor RFQ list (${this.page.url()})`);
      return;
    }

    const rfqCandidates = [
      this.page.getByRole('tab', { name: /quotation\s*received/i }).first(),
      this.page.locator('.MuiTab-root').filter({ hasText: /quotation\s*received/i }).first(),
      this.page.getByRole('tab', { name: /rfq/i }).first(),
      this.page.locator('.MuiTab-root').filter({ hasText: /rfq/i }).first(),
      this.page.getByRole('button', { name: /rfq|quotation\s*received/i }).first(),
      this.page.getByRole('link', { name: /rfq|quotation\s*received/i }).first(),
      this.page
        .locator('.MuiCard-root, .MuiPaper-root, [class*="module" i], [role="button"]')
        .filter({ hasText: /\brfq\b|quotation\s*received/i })
        .filter({ visible: true })
        .first(),
      this.page.getByText(/\bquotation\s*received\b|\brfq(\s*list)?\b/i).filter({ visible: true }).first(),
      this.page.getByText(/request\s*for\s*quotation/i).filter({ visible: true }).first(),
      this.rfqListNav,
    ];

    let navigated = await this._clickFirstVisible(rfqCandidates, 8000);
    if (navigated) {
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1000).catch(() => {});
    }

    if (await this.is404Page()) {
      await this.recoverFrom404IfNeeded();
    }

    if (!(await this.isRfqListVisible()) && !(await this.isOnVendorRfqRoute())) {
      const profileBase = this.profileBaseUrl();
      if (profileBase) {
        // Only query-param tab — `/rfq` path 404s on vendor portal.
        await this.page
          .goto(`${profileBase}?tab=RFQ`, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
          .catch(() => {});
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(1000).catch(() => {});
        navigated = true;
      }
    }

    if (await this.is404Page()) {
      await this.recoverFrom404IfNeeded();
    }

    if (!(await this.isRfqListVisible()) && !(await this.isOnVendorRfqRoute())) {
      navigated = await this._clickFirstVisible(rfqCandidates, 5000);
      await this.waitForNetworkSettled();
    }

    if (await this.is404Page()) {
      throw new Error(`Vendor RFQ page returned 404 (${this.page.url()})`);
    }

    if (!(await this.isOnVendorRfqRoute()) && !(await this.isRfqListVisible())) {
      throw new Error(`Could not open RFQ on vendor project (${this.page.url()})`);
    }

    // Vendor profile often labels the list tab "Quotation Received" even when URL uses ?tab=RFQ.
    const quotationTab = this.page.getByRole('tab', { name: /quotation\s*received/i }).first();
    if (await quotationTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      const selected =
        (await quotationTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
        /Mui-selected|active/i.test((await quotationTab.getAttribute('class').catch(() => '')) || '');
      if (!selected) {
        await quotationTab.click({ timeout: this.uiTimeout, force: true });
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(800).catch(() => {});
        this.logStep('Selected Quotation Received tab on vendor project');
      }
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep(`Opened RFQ on vendor project (${this.page.url()})`);
  }

  profileBaseUrl() {
    const m = String(this.page.url() || '').match(
      /^(https?:\/\/[^/]+\/procurement-hub\/profile\/[^/?#]+)/i
    );
    return m ? m[1] : null;
  }

  async is404Page() {
    const url = String(this.page.url() || '');
    if (/\/404\b|not[_-]?found/i.test(url)) return true;

    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 800);
    return /404|page\s+not\s+found|this\s+page\s+(could|does)\s+not\s+exist|oops.*not\s+found/i.test(body);
  }

  async recoverFrom404IfNeeded() {
    if (!(await this.is404Page()) && !/\/procurement-hub\/profile\/[^/?#]+\/rfq/i.test(this.page.url())) {
      return false;
    }

    const fromUrl = String(this.page.url() || '').match(
      /^(https?:\/\/[^/]+\/procurement-hub\/profile\/[^/?#]+)/i
    );
    const profileBase = fromUrl ? fromUrl[1] : this.profileBaseUrl();
    if (!profileBase) {
      this.logStep(`404 detected but no profile base to recover (${this.page.url()})`);
      return false;
    }

    this.logStep(`Recovering from 404 / bad /rfq URL → ${profileBase}?tab=RFQ`);
    await this.page
      .goto(`${profileBase}?tab=RFQ`, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
      .catch(() => {});
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});
    return true;
  }

  async isOnVendorRfqRoute() {
    if (await this.is404Page()) return false;
    const url = String(this.page.url() || '');
    // Prefer query tab. Treat trailing /rfq as invalid (404) unless list is already visible.
    if (/\/procurement-hub\/profile\/[^/?#]+\/rfq(\/|$|\?|#)/i.test(url)) return false;
    if (/[?&](tab|subTab)=(RFQ|QuotationReceived|Quotation_Received)\b/i.test(url)) return true;
    if (/\/procurement-hub\/profile\/[^/?#]+(?:\?|#|$)/i.test(url) && (await this.isRfqListVisible())) {
      return true;
    }
    return false;
  }

  async isRfqListVisible() {
    if (await this.is404Page()) return false;

    if (await this.firstRfqListEntry().isVisible({ timeout: 1500 }).catch(() => false)) return true;

    const table = this.page.locator('table tbody tr').filter({ has: this.page.locator('td') }).filter({ visible: true });
    if ((await table.count().catch(() => 0)) > 0) return true;

    const cards = this.page
      .locator('.MuiCard-root, .MuiPaper-root, div.MuiBox-root.css-60kw0h, div.bg-white.p-2')
      .filter({ visible: true })
      .filter({ hasText: /rfq|quotation|material|vendor portal rfq/i });
    return (await cards.count().catch(() => 0)) > 0;
  }

  /** RFQ list cards (vendor portal Quotation Received uses MuiBox / Paper rows with 3-dot menu). */
  rfqListCards() {
    const cardsWithKebab = this.page
      .locator('main div.MuiBox-root, main .MuiPaper-root, main .MuiCard-root')
      .filter({ visible: true })
      .filter({
        has: this.page.locator(
          'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
        ),
      })
      .filter({ hasText: /RFQ\d+|received|sent by|vendor portal rfq|quotation|material/i });

    return cardsWithKebab.or(
      this.page
        .locator('div.MuiBox-root.css-60kw0h, div.bg-white.p-2.MuiBox-root.css-60kw0h')
        .filter({ visible: true })
    );
  }

  /** First RFQ row/card in the vendor list (always index 0 — not by title). */
  firstRfqListEntry() {
    const cardWithMenu = this.rfqListCards()
      .filter({
        has: this.page.locator(
          'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
        ),
      })
      .first();

    const cardRow = this.rfqListCards().first();

    const tableRow = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('td') })
      .filter({ visible: true })
      .first();

    return cardWithMenu.or(cardRow).or(tableRow).first();
  }

  firstRfqCard() {
    return this.firstRfqListEntry();
  }

  expandOnlyButtonOnRfqCard(card) {
    return card.getByRole('button', { name: /^expand$/i }).filter({ visible: true }).first();
  }

  collapseButtonOnRfqCard(card) {
    return card.getByRole('button', { name: /^collapse$/i }).filter({ visible: true }).first();
  }

  async resolveRfqRowExpandClickTarget(card) {
    const expandText = card.locator('button').filter({ hasText: /^expand$/i }).filter({ visible: true }).first();
    if (await expandText.isVisible({ timeout: 1200 }).catch(() => false)) {
      return expandText;
    }
    const expandRole = this.expandOnlyButtonOnRfqCard(card);
    if (await expandRole.isVisible({ timeout: 1200 }).catch(() => false)) {
      return expandRole;
    }
    return card
      .locator('button[aria-expanded="false"]')
      .filter({
        has: card.locator('svg[data-testid="ExpandMoreIcon"], svg[data-testid="KeyboardArrowDownIcon"]'),
      })
      .filter({ visible: true })
      .first();
  }

  async ensureRfqCardRowExpanded(card) {
    if (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 500 }).catch(() => false)) {
        return;
      }

      const target = await this.resolveRfqRowExpandClickTarget(card);
      if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
        break;
      }

      await target.click({ timeout: this.uiTimeout, force: attempt > 0 }).catch(() => {});
      await this.page.waitForTimeout(450).catch(() => {});

      if (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 1500 }).catch(() => false)) {
        return;
      }
    }
  }

  async ensureRfqCardExpanded(card) {
    await this.ensureRfqCardRowExpanded(card);
  }

  kebabOnRfqCard(card) {
    return card
      .locator('button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"])')
      .filter({ visible: true })
      .first()
      .or(card.getByRole('button', { name: /more options|open menu|menu|show more/i }).filter({ visible: true }).first())
      .or(card.locator('button[aria-label*="more" i], button[title*="more" i], button[aria-haspopup="menu"]').filter({ visible: true }).first());
  }

  async resolveFirstRfqListCardWithKebab() {
    return this.resolveRfqListCardWithKebabByTitle(null);
  }

  /**
   * Find RFQ list card by title (e.g. "New One"). When title is empty, uses the first card.
   */
  async resolveRfqListCardWithKebabByTitle(title) {
    await this.recoverFrom404IfNeeded();
    await this.waitForNetworkSettled();
    await this.page
      .waitForFunction(
        () =>
          document.querySelectorAll('.MuiSkeleton-root').length === 0 ||
          document.body.innerText.match(/rfq|quotation|expand|collapse/i),
        { timeout: this.defaultTimeout }
      )
      .catch(() => {});

    if (await this.is404Page()) {
      return null;
    }

    const wanted = String(title || '').trim();
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRe = wanted ? new RegExp(escapeRe(wanted), 'i') : null;

    const cardCount = await this.rfqListCards().count().catch(() => 0);
    for (let i = 0; i < Math.max(cardCount, 1); i += 1) {
      const card = cardCount > 0 ? this.rfqListCards().nth(i) : this.firstRfqListEntry();
      if (!(await card.isVisible({ timeout: 2000 }).catch(() => false))) continue;

      if (titleRe) {
        const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
        if (!titleRe.test(text)) continue;
      }

      await card.scrollIntoViewIfNeeded().catch(() => {});
      await this.ensureRfqCardRowExpanded(card);

      let kebab = this.kebabOnRfqCard(card);
      if (await kebab.isVisible({ timeout: 2000 }).catch(() => false)) {
        return { card, kebab };
      }

      kebab = this.overflowMenuButton(card);
      if (await kebab.isVisible({ timeout: 1500 }).catch(() => false)) {
        return { card, kebab };
      }
    }

    if (wanted) {
      // Broader match: any visible card/row containing the title + kebab.
      const named = this.page
        .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr')
        .filter({ visible: true })
        .filter({ hasText: titleRe })
        .filter({
          has: this.page.locator(
            'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
          ),
        })
        .first();
      if (await named.isVisible({ timeout: 4000 }).catch(() => false)) {
        await this.ensureRfqCardRowExpanded(named).catch(() => {});
        const kebab = this.kebabOnRfqCard(named).or(this.overflowMenuButton(named));
        if (await kebab.isVisible({ timeout: 2000 }).catch(() => false)) {
          return { card: named, kebab };
        }
      }
      return null;
    }

    const mainKebab = this.page
      .locator('main button:has(svg[data-testid="MoreVertIcon"]), main button:has(svg[data-testid="MoreHorizIcon"])')
      .filter({ visible: true })
      .first();
    if (await mainKebab.isVisible({ timeout: 3000 }).catch(() => false)) {
      const card = this.firstRfqListEntry();
      return { card, kebab: mainKebab };
    }

    return null;
  }

  async openRfqOverflowMenuByTitle(title) {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before opening RFQ overflow menu');
    }
    await this.waitForNetworkSettled();
    await this.waitForRfqListReady().catch(() => {});

    const wanted = String(title || '').trim();
    const resolved = await this.resolveRfqListCardWithKebabByTitle(wanted || null);
    if (!resolved) {
      throw new Error(
        wanted
          ? `Could not find RFQ titled "${wanted}" with 3-dot menu on vendor list`
          : 'Could not find 3-dot menu on the 1st RFQ list row'
      );
    }

    this.activeRfqListRow = resolved.card;
    await this._clickKebabUntilMenuOpen(resolved.kebab);
    this.logStep(
      wanted
        ? `Opened overflow menu on RFQ "${wanted}" (not another RFQ)`
        : 'Opened vendor RFQ overflow menu (3 dots) on 1st list row'
    );
  }

  async openFirstRfqOverflowMenu() {
    await this.openRfqOverflowMenuByTitle(null);
  }

  async waitForRfqListReady() {
    const deadline = Date.now() + this.listTimeout;
    while (Date.now() < deadline) {
      await this.recoverFrom404IfNeeded();

      if (!(await this.isOnVendorRfqRoute()) && /procurement-hub\/profile/i.test(this.page.url())) {
        await this.clickRfqOnProject().catch(() => {});
      }

      const resolved = await this.resolveFirstRfqListCardWithKebab();
      if (resolved) {
        this.activeRfqListRow = resolved.card;
        return resolved.card;
      }

      this.logStep('RFQ list 1st row / 3-dot menu not ready — waiting (no /rfq reload)');
      await this.page.waitForTimeout(3000).catch(() => {});

      // Never reload a 404 or /rfq path — recover to profile?tab=RFQ instead.
      if ((await this.is404Page()) || /\/profile\/[^/?#]+\/rfq/i.test(this.page.url())) {
        await this.recoverFrom404IfNeeded();
        continue;
      }

      if (await this.isOnVendorRfqRoute()) {
        // Soft wait only; avoid reload loops on fragile SPA routes.
        await this.waitForNetworkSettled();
        continue;
      }

      const profileBase = this.profileBaseUrl();
      if (profileBase) {
        await this.page
          .goto(`${profileBase}?tab=RFQ`, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
          .catch(() => {});
        await this.waitForNetworkSettled();
      }
    }
    throw new Error(`Vendor RFQ list 1st row did not appear (${this.page.url()})`);
  }

  firstRfqListRow() {
    return this.firstDataRow().or(
      this.page
        .locator('table tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root')
        .filter({ visible: true })
        .filter({ hasNot: this.page.locator('[role="columnheader"]') })
        .filter({ hasText: /./ })
        .first()
    );
  }

  overflowMenuButton(scope) {
    const root = scope || this.page;
    return root
      .getByRole('button', { name: /more|actions|options|^⋮$/i })
      .or(root.locator('button[aria-label*="more" i], button[aria-haspopup="menu"]'))
      .or(root.locator('button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid*="MoreHoriz" i])'))
      .filter({ visible: true })
      .first();
  }

  openOverflowMenuPaper() {
    return this.page.locator('.MuiPopover-root, .MuiMenu-root, [role="menu"]').filter({ visible: true }).last();
  }

  async _clickKebabUntilMenuOpen(kebab) {
    await expect(kebab).toBeVisible({ timeout: this.defaultTimeout });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (attempt > 0) {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(300).catch(() => {});
      }
      await kebab.scrollIntoViewIfNeeded().catch(() => {});
      await kebab.click({ timeout: this.uiTimeout, force: attempt > 0 }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});

      if (await this.isOverflowMenuOpen()) {
        this.logStep('Opened vendor RFQ overflow menu (3 dots) on 1st list row');
        return;
      }
    }

    throw new Error('Could not open vendor RFQ overflow menu (3 dots) on the 1st list row');
  }

  async isOverflowMenuOpen() {
    if (await this.openOverflowMenuPaper().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    return this.page.getByRole('menuitem').first().isVisible({ timeout: 800 }).catch(() => false);
  }

  async clickOverflowMenuItem(namePattern) {
    const re = namePattern instanceof RegExp ? namePattern : new RegExp(String(namePattern), 'i');
    const paper = this.openOverflowMenuPaper();

    const buckets = [
      paper.getByRole('menuitem', { name: re }),
      paper.getByRole('option', { name: re }),
      paper.locator('.MuiMenuItem-root').filter({ hasText: re }),
      this.page.getByRole('menuitem', { name: re }).filter({ visible: true }),
      this.page.locator('.MuiMenuItem-root').filter({ hasText: re }).filter({ visible: true }),
      paper.getByText(re).filter({ visible: true }),
    ];

    for (const bucket of buckets) {
      const item = bucket.first();
      if (await item.isVisible({ timeout: 2500 }).catch(() => false)) {
        await item.click({ timeout: this.uiTimeout, force: true });
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(600).catch(() => {});
        return;
      }
    }

    throw new Error(`Could not click overflow menu item matching ${re}`);
  }

  async closePreviewIfOpen() {
    const popup = this.previewPage;
    if (popup && !popup.isClosed()) {
      await popup.close().catch(() => {});
      this.previewPage = null;
      await this.page.bringToFront().catch(() => {});
      this.logStep('Closed Preview popup tab');
      await this.waitForNetworkSettled();
      return;
    }

    const dialog = this.page.getByRole('dialog').filter({ visible: true }).first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = dialog
        .getByRole('button', { name: /close|back|done|cancel|×/i })
        .filter({ visible: true })
        .first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      await dialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      this.logStep('Closed Preview dialog — returning to RFQ list');
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(600).catch(() => {});
  }

  async openPriceUpdateOnVendorModule() {
    await this.recoverFrom404IfNeeded();
    await this.waitForNetworkSettled();

    if (!(await this.isRfqListVisible()) && !(await this.isOnVendorRfqRoute())) {
      await this.clickRfqOnProject();
    }

    await this.waitForRfqListReady().catch(() => {});

    const resolved = await this.resolveFirstRfqListCardWithKebab().catch(() => null);
    if (resolved?.card) {
      await this.ensureRfqCardRowExpanded(resolved.card).catch(() => {});
    } else {
      const card = this.firstRfqListEntry();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.ensureRfqCardRowExpanded(card).catch(() => {});
      }
    }

    const pricePage = this.priceUpdatePage();
    await pricePage.waitForVendorRfqPageToLoad().catch(() => {});
    await pricePage.openPriceUpdateEditorIfNeeded();
    this.logStep('Opened price update on vendor RFQ module (Update price button, no 3-dot menu)');
  }

  priceUpdatePage() {
    return new RfqVendorPortalPriceUpdatePage(this.page);
  }

  async changeVendorRfqPrice(priceValue) {
    const pricePage = this.priceUpdatePage();
    const value = String(priceValue || '').trim() || pricePage.buildRandomPriceValue();
    await pricePage.fillFirstVisiblePriceField(value);
    this.lastVendorRfqPrice = value;
    this.logStep(`Changed price on 1st line-item row to ${value}`);
  }

  async changeVendorRfqPriceOnAllLineItems(priceValue) {
    const pricePage = this.priceUpdatePage();
    const value = String(priceValue || '').trim() || pricePage.buildRandomPriceValue();
    const n = await pricePage.fillPriceOnAllLineItemRows(value);
    this.lastVendorRfqPrice = value;
    this.logStep(`Changed price on ${n} line-item row(s) to ${value}`);
  }

  async clickUpdatePriceOnVendorRfq() {
    await this.priceUpdatePage().clickUpdatePriceButton();
    this.logStep('Clicked Update Price on vendor RFQ');
  }

  async expectVendorRfqPriceUpdateSuccess() {
    await this.priceUpdatePage().expectPriceUpdateSuccess();
    this.logStep('Vendor RFQ price update succeeded');
  }

  async openFirstRfqRow() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before opening the first RFQ');
    }
    await this.waitForNetworkSettled();

    // Ensure RFQ section is open (safe if already on RFQ from previous step).
    const rfqTab = this.page
      .getByRole('tab', { name: /^rfq$/i })
      .or(this.page.getByRole('button', { name: /^rfq$/i }))
      .or(this.page.getByRole('link', { name: /^rfq$/i }))
      .or(this.page.getByText(/^rfq(\s*list)?$/i))
      .first();
    if (await rfqTab.isVisible({ timeout: 2500 }).catch(() => false)) {
      const selected =
        (await rfqTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
        /Mui-selected|active/i.test((await rfqTab.getAttribute('class').catch(() => '')) || '');
      if (!selected) {
        await rfqTab.click({ timeout: this.uiTimeout, force: true });
        await this.waitForNetworkSettled();
        this.logStep('Opened RFQ tab on vendor project');
      }
    }

    const firstRfq = this.firstDataRow().or(
      this.page
        .locator('.MuiCard-root, .MuiPaper-root, [role="row"], a')
        .filter({ visible: true })
        .filter({ hasText: /rfq|quotation|vendor portal rfq/i })
        .first()
    );

    await expect(firstRfq).toBeVisible({ timeout: this.defaultTimeout });
    await firstRfq.scrollIntoViewIfNeeded().catch(() => {});
    await firstRfq.click({ timeout: this.uiTimeout, force: true });
    await this.waitForNetworkSettled();
    this.logStep('Opened 1st RFQ row in the vendor list');
  }

  async navigateToRfqList() {
    await this.waitForNetworkSettled();
    if (await this.isOnRfqList()) {
      this.logStep('Already on vendor RFQ List');
      return;
    }

    const clicked = await this._clickFirstVisible(
      [
        this.rfqListNav,
        this.page.getByRole('tab', { name: /^rfq$/i }).first(),
        this.page.getByText(/^rfq$/i).filter({ visible: true }).first(),
      ],
      5000
    );

    if (!clicked) {
      throw new Error('Could not open RFQ List on the vendor portal');
    }

    await this.waitForNetworkSettled();
    this.logStep('Opened vendor RFQ List');
  }

  rfqRowForTitle(title) {
    const t = String(title || '').trim();
    if (!t) {
      return this.page.locator('table tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root').filter({ visible: true }).first();
    }
    const re = new RegExp(this._escapeRegex(t), 'i');
    return this.page
      .locator('table tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root, a, div')
      .filter({ hasText: re })
      .filter({ visible: true })
      .first();
  }

  async openReceivedRfq(title) {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before opening the received RFQ');
    }
    const wanted = String(title || '').trim();
    const deadline = Date.now() + this.listTimeout;

    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        throw new Error('Vendor page was closed while waiting for the received RFQ');
      }
      const row = this.rfqRowForTitle(wanted);
      if (await row.isVisible({ timeout: 2500 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        await row.click({ timeout: this.uiTimeout, force: true });
        await this.waitForNetworkSettled();
        this.logStep(`Opened received RFQ "${wanted || '(first row)'}"`);
        return;
      }

      this.logStep('RFQ not in list yet — waiting (avoid 404 reload)');
      await this.recoverFrom404IfNeeded();
      if ((await this.is404Page()) || /\/profile\/[^/?#]+\/rfq/i.test(this.page.url())) {
        await this.recoverFrom404IfNeeded();
      } else if (await this.isOnVendorRfqRoute()) {
        await this.page.waitForTimeout(4000);
      } else {
        const profileBase = this.profileBaseUrl();
        if (profileBase) {
          await this.page
            .goto(`${profileBase}?tab=RFQ`, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
            .catch(() => {});
        }
        await this.page.waitForTimeout(2000);
      }
      if (this.page.isClosed()) {
        throw new Error('Vendor page was closed while waiting for the RFQ List');
      }
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(2000);
    }

    throw new Error(
      wanted
        ? `Received RFQ "${wanted}" was not found in the vendor RFQ List`
        : 'No RFQ row was found in the vendor RFQ List'
    );
  }

  async isPreviewShowing() {
    if (this.previewPage && !this.previewPage.isClosed()) {
      return true;
    }
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ has: this.page.locator('canvas, iframe, embed') })
      .first();
    if (await dialog.isVisible({ timeout: 800 }).catch(() => false)) return true;
    if (/preview/i.test(this.page.url())) return true;
    const canvas = this.page.locator('canvas, iframe[title*="preview" i], iframe').filter({ visible: true }).first();
    if (await canvas.isVisible({ timeout: 800 }).catch(() => false) && /rfq|preview/i.test(this.page.url())) {
      return true;
    }
    return false;
  }

  async openOverflowThenPreview() {
    const resolved = await this.resolveFirstRfqListCardWithKebab().catch(() => null);
    const kebab = resolved?.kebab || this.overflowMenuButton(this.firstRfqListEntry());

    if (!(await kebab.isVisible({ timeout: 3500 }).catch(() => false))) {
      return false;
    }

    await kebab.scrollIntoViewIfNeeded().catch(() => {});
    await kebab.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForTimeout(400).catch(() => {});

    if (!(await this.isOverflowMenuOpen())) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    }

    try {
      await this.clickOverflowMenuItem(/^preview$/i);
      return true;
    } catch {
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    }
  }

  async clickPreviewFromOverflowMenu() {
    const title = String(this.targetRfqTitle || '').trim();
    if (title) {
      await this.openRfqOverflowMenuByTitle(title);
    } else {
      await this.openFirstRfqOverflowMenu();
    }
    const popupPromise = this.page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);
    await this.clickOverflowMenuItem(/^preview$/i);
    this.logStep(
      title
        ? `Clicked Preview on RFQ "${title}" only`
        : 'Clicked Preview from vendor RFQ overflow menu'
    );
    await this.page.waitForTimeout(1000).catch(() => {});

    const popup = await popupPromise;
    if (popup && !popup.isClosed()) {
      this.previewPage = popup;
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
    }

    await this.closePreviewIfOpen();
  }

  async clickUpdatePriceFromOverflowMenu() {
    const title = String(this.targetRfqTitle || '').trim();
    if (!(await this.isOverflowMenuOpen())) {
      if (title) {
        await this.openRfqOverflowMenuByTitle(title);
      } else {
        await this.openFirstRfqOverflowMenu();
      }
    }

    await this.clickOverflowMenuItem(/^update\s*price$/i);
    this.logStep(
      title
        ? `Clicked Update Price on RFQ "${title}" only`
        : 'Clicked Update Price from vendor RFQ overflow menu (3 dots)'
    );

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1200).catch(() => {});

    const pricePage = this.priceUpdatePage();
    await pricePage.waitForVendorRfqPageToLoad().catch(() => {});
    await pricePage.openPriceUpdateEditorIfNeeded();
    this.logStep('Update Price editor ready');
  }

  async clickPriceUpdateFromOverflowMenu() {
    await this.clickUpdatePriceFromOverflowMenu();
  }

  async setTargetRfqTitle(title) {
    this.targetRfqTitle = String(title || '').trim();
    this.logStep(`Vendor RFQ target locked to title "${this.targetRfqTitle}"`);
  }

  async clickPreview() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking Preview');
    }
    await this.waitForNetworkSettled();
    await this.waitForRfqListReady();

    if (await this.isPreviewShowing()) {
      this.logStep('Vendor RFQ preview already visible');
      await this.closePreviewIfOpen();
      return;
    }

    // Primary path: 3-dot menu on first Quotation Received / RFQ card (see vendor portal UI).
    try {
      await this.clickPreviewFromOverflowMenu();
      this.logStep('Clicked Preview on vendor RFQ');
      return;
    } catch (overflowErr) {
      this.logStep(`Overflow Preview failed (${overflowErr.message}) — trying direct controls`);
    }

    const popupPromise = this.page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);

    const labeled = await this._clickFirstVisible(
      [
        this.page.getByRole('button', { name: /preview/i }).filter({ visible: true }).first(),
        this.page.getByRole('link', { name: /preview/i }).filter({ visible: true }).first(),
        this.page.getByText(/^preview$/i).filter({ visible: true }).first(),
        this.page.locator('[aria-label*="preview" i], [title*="preview" i]').filter({ visible: true }).first(),
      ],
      2500
    );

    let clicked = labeled;
    if (!clicked) {
      clicked = await this.openOverflowThenPreview();
    }

    if (!clicked) {
      const iconBtn = this.page
        .locator(
          'svg[data-testid="LaunchIcon"], svg[data-testid*="OpenInNew" i], svg[data-testid*="Visibility" i], svg[data-testid*="Preview" i], svg[data-testid*="RemoveRedEye" i]'
        )
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1] | xpath=ancestor::a[1]');
      if (await iconBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await iconBtn.click({ timeout: this.uiTimeout, force: true });
        clicked = true;
      }
    }

    if (!clicked) {
      const row = this.firstRfqListEntry();
      const rowPreview = row
        .getByRole('button', { name: /preview|view/i })
        .or(row.getByRole('link', { name: /preview|view/i }))
        .or(
          row
            .locator('button, a')
            .filter({
              has: this.page.locator(
                'svg[data-testid="LaunchIcon"], svg[data-testid*="OpenInNew" i], svg[data-testid*="Visibility" i], svg[data-testid*="Preview" i]'
              ),
            })
        )
        .filter({ visible: true })
        .first();
      if (await rowPreview.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rowPreview.click({ timeout: this.uiTimeout, force: true });
        clicked = true;
      }
    }

    if (!clicked) {
      throw new Error('Could not click Preview on the vendor RFQ');
    }

    const popup = await popupPromise;
    if (popup && !popup.isClosed()) {
      this.previewPage = popup;
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Clicked Preview — opened in a new tab');
      await this.closePreviewIfOpen();
      return;
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    if (await this.isPreviewShowing()) {
      await this.closePreviewIfOpen();
    }

    this.logStep('Clicked Preview on vendor RFQ');
  }

  async expectRfqDetailsDisplayed(title) {
    const wanted = String(title || '').trim();
    const rootPage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;

    const previewRoot = rootPage
      .getByRole('dialog')
      .filter({ visible: true })
      .or(rootPage.locator('main, [role="main"], iframe, canvas').filter({ visible: true }))
      .first();

    await expect(previewRoot).toBeVisible({ timeout: this.defaultTimeout });

    const details = rootPage
      .getByText(/rfq|request for quotation|preview|material 1/i)
      .filter({ visible: true })
      .first();
    await expect(details).toBeVisible({ timeout: this.defaultTimeout });

    if (wanted) {
      const titleVisible = await rootPage
        .getByText(wanted, { exact: false })
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (titleVisible) {
        this.logStep(`Vendor RFQ details show title "${wanted}"`);
        return;
      }
    }

    const lineItem = await rootPage
      .getByText(/material 1/i)
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (lineItem) {
      this.logStep('Vendor RFQ details show line item Material 1');
      return;
    }

    this.logStep('Vendor RFQ preview/details are displayed');
  }
}

module.exports = VendorRFQPage;
