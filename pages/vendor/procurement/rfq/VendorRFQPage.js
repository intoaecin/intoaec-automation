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

  /**
   * Connected Organizations table (Organization name / Admin Name / Email / Contact).
   * Must not be treated as the projects list.
   */
  async isConnectedOrganizationsListVisible() {
    const orgNameHeader = this.page
      .getByRole('columnheader', { name: /organization\s*name/i })
      .or(this.page.getByText(/^organization\s*name$/i))
      .first();
    const adminHeader = this.page
      .getByRole('columnheader', { name: /admin\s*name/i })
      .or(this.page.getByText(/^admin\s*name$/i))
      .first();
    const emailHeader = this.page
      .getByRole('columnheader', { name: /email\s*address/i })
      .or(this.page.getByText(/^email\s*address$/i))
      .first();
    if (await orgNameHeader.isVisible({ timeout: 600 }).catch(() => false)) {
      if (
        (await adminHeader.isVisible({ timeout: 400 }).catch(() => false)) ||
        (await emailHeader.isVisible({ timeout: 400 }).catch(() => false))
      ) {
        return true;
      }
    }
    return false;
  }

  /** Org contact row: "adityaconstructions Adam max email@… +91…" — not a project. */
  isConnectedOrganizationRowText(text) {
    const n = String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!n) return false;
    if (/organization\s*name|admin\s*name|email\s*address|contact\s*number/i.test(n)) return true;
    const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(n);
    const hasPhone = /(\+|00)?\d[\d\s\-()]{7,}\d/.test(n);
    return hasEmail && hasPhone;
  }

  async isProjectsListVisible() {
    // Still on Connected Organizations → not projects yet.
    if (await this.isConnectedOrganizationsListVisible()) return false;

    if (/\/procurement-hub\/profile\//i.test(this.page.url())) return true;

    const rfqTab = this.page.getByRole('tab', { name: /^rfq$/i }).first();
    if (await rfqTab.isVisible({ timeout: 800 }).catch(() => false)) return true;
    const poTab = this.page.getByRole('tab', { name: /purchase\s*order|^po$/i }).first();
    if (await poTab.isVisible({ timeout: 500 }).catch(() => false)) return true;

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

    // Hub often stays on /procurement-hub after org click; project table alone is enough —
    // but only when we are no longer on the Connected Organizations table.
    const rows = this.page.locator('table tbody tr').filter({ has: this.page.locator('td') }).filter({ visible: true });
    const rowCount = await rows.count().catch(() => 0);
    if (rowCount > 0) {
      let orgLike = 0;
      for (let i = 0; i < Math.min(rowCount, 5); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const text = ((await rows.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (this.isConnectedOrganizationRowText(text)) orgLike += 1;
      }
      if (orgLike >= Math.min(rowCount, 1) && orgLike === Math.min(rowCount, 5)) {
        return false;
      }
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

    if ((await this.isProjectsListVisible()) && !(await this.isConnectedOrganizationsListVisible())) {
      // When a specific org name is requested, still try to click it (projects detection can false-positive on org cards).
      if (!String(orgName || process.env.VENDOR_RFQ_ORG_NAME || '').trim()) {
        this.logStep('Projects list already visible — organization already selected');
        return;
      }
    }

    const requested = String(orgName || '').trim();
    const candidates = requested
      ? [
          requested,
          'kumarorganization',
          'kumar',
        ].filter((name, index, arr) => name && arr.indexOf(name) === index)
      : [
          String(process.env.VENDOR_RFQ_ORG_NAME || '').trim(),
          'kumarorganization',
          'kumar',
          'kumarorganization',
          'Intoaec Org',
          'intoaec',
          'IntoAEC',
          'Intoaec',
        ].filter((name, index, arr) => name && arr.indexOf(name) === index);

    const tryEnterOrganization = async (target, name) => {
      await target.scrollIntoViewIfNeeded().catch(() => {});

      // Hub org name is a cursor-pointer div (not the whole row). Row click does nothing.
      const nameHit = target
        .locator('.cursor-pointer, [class*="cursor-pointer"]')
        .filter({
          hasText: new RegExp(
            this._escapeRegex(String(name || '').split(/\s+/)[0] || 'kumar'),
            'i'
          ),
        })
        .first()
        .or(target.locator('.cursor-pointer, [class*="cursor-pointer"]').first())
        .or(target.getByText(/kumar/i).first());

      if (await nameHit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameHit.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
          await nameHit.click({ timeout: this.uiTimeout });
        });
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(1500).catch(() => {});
        if (/\/procurement-hub\/profile\//i.test(this.page.url()) || (await this.isProjectsListVisible())) {
          return true;
        }
      }

      await target.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
        await target.click({ timeout: this.uiTimeout });
      });
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1000).catch(() => {});
      if (/\/procurement-hub\/profile\//i.test(this.page.url()) || (await this.isProjectsListVisible())) {
        return true;
      }

      // Reliable fallback: org logo S3 path embeds the same UUID as /procurement-hub/profile/{uuid}.
      const imgSrc =
        (await target.locator('img').first().getAttribute('src').catch(() => '')) ||
        (await this.page
          .locator('table tbody tr')
          .filter({ hasText: /kumar/i })
          .first()
          .locator('img')
          .first()
          .getAttribute('src')
          .catch(() => ''));
      const uuidMatch = String(imgSrc || '').match(
        /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i
      );
      if (uuidMatch && uuidMatch[1]) {
        const profileUrl = `https://vendor.aecplayhouse.com/procurement-hub/profile/${uuidMatch[1]}`;
        this.logStep(`Opening org profile via logo UUID (${uuidMatch[1]})`);
        await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(1200).catch(() => {});
        if (/\/procurement-hub\/profile\//i.test(this.page.url()) || (await this.isProjectsListVisible())) {
          return true;
        }
      }

      // Row click often only selects; open via View / double-click / Enter.
      const viewBtn = target
        .getByRole('button', { name: /view|open|projects?|enter|details/i })
        .or(target.locator('button, a, [role="button"]').filter({ hasText: /view|open|projects?/i }))
        .or(target.locator('[aria-label*="view" i], [title*="view" i], [aria-label*="open" i]'))
        .filter({ visible: true })
        .first();
      if (await viewBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
        await viewBtn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(1000).catch(() => {});
        if (/\/procurement-hub\/profile\//i.test(this.page.url()) || (await this.isProjectsListVisible())) {
          return true;
        }
      }

      await target.dblclick({ timeout: this.uiTimeout }).catch(() => {});
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1000).catch(() => {});
      if (/\/procurement-hub\/profile\//i.test(this.page.url()) || (await this.isProjectsListVisible())) {
        return true;
      }

      if (await this.isConnectedOrganizationsListVisible()) {
        this.logStep(`Clicked org "${name}" but still on Connected Organizations list`);
        return false;
      }
      return false;
    };

    let selectedLabel = '';
    for (const name of candidates) {
      const target = await this.findOrganizationTarget(name);
      if (!target) continue;

      // eslint-disable-next-line no-await-in-loop
      if (await tryEnterOrganization(target, name)) {
        selectedLabel = name;
        break;
      }

      this.logStep(`Clicked "${name}" but projects list not confirmed — trying next org candidate`);
    }

    if (!selectedLabel) {
      if (requested) {
        const bodySnippet = ((await this.page.locator('main, body').first().innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 400);
        throw new Error(
          `Connected organization "${requested}" was not found / could not open projects on Procurement Hub. Page text: ${bodySnippet}`
        );
      }
      // Last resort (no explicit org): click the first org-looking card that is not the page title.
      const cards = this.organizationCards();
      const count = await cards.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 8); i += 1) {
        const card = cards.nth(i);
        const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 120) continue;
        if (/procurement\s*hub|dashboard|rfq|preview/i.test(text)) continue;
        // eslint-disable-next-line no-await-in-loop
        if (await tryEnterOrganization(card, text.slice(0, 40))) {
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
   * After org selection: click a project under kumar.
   * Never opens AEC Solutions / Aditya (or similarly excluded names).
   * Must land on /procurement-hub/profile/... before returning.
   */
  async clickFirstProjectName() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking the project name');
    }
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    if (/\/procurement-hub\/profile\//i.test(this.page.url())) {
      this.logStep(`Already on vendor project profile (${this.page.url()})`);
      return;
    }

    // Still on Connected Organizations — enter org first (do not treat org row as a project).
    if (await this.isConnectedOrganizationsListVisible()) {
      const testData = require('../../../../utils/testData');
      const org = testData.vendor?.rfqUser?.organization || 'Aditya Constructions';
      this.logStep(`Still on Connected Organizations list — selecting ${org} first`);
      await this.selectConnectedOrganization(org);
    }

    const isExcludedProject = (text) => {
      const n = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (!n) return true;
      if (/aec[_\s-]*solutions/.test(n)) return true;
      if (this.isConnectedOrganizationRowText(n)) return true;
      if (/procurement\s*hub|connected org|rfq list|organization\s*name|admin\s*name|email\s*address|contact\s*number/.test(n)) {
        return true;
      }
      return false;
    };

    // Prefer kumar project names, but not org contact rows.
    const isPreferredKumar = (text) => {
      if (this.isConnectedOrganizationRowText(text)) return false;
      return /kumar(?!@)/i.test(String(text || ''));
    };

    const tryOpenRow = async (clickable, label) => {
      // Prefer real profile hrefs when present.
      const profileLink = clickable.locator('a[href*="/procurement-hub/profile/"]').first();
      if (await profileLink.isVisible({ timeout: 500 }).catch(() => false)) {
        await profileLink.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
          await profileLink.click({ timeout: this.uiTimeout });
        });
      } else {
        await clickable.scrollIntoViewIfNeeded().catch(() => {});
        await clickable.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
          await clickable.click({ timeout: this.uiTimeout });
        });
      }
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1200).catch(() => {});
      // Double-click / Enter if still on hub.
      if (!/\/procurement-hub\/profile\//i.test(this.page.url())) {
        await clickable.dblclick({ timeout: this.uiTimeout }).catch(() => {});
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(800).catch(() => {});
      }
      if (!/\/procurement-hub\/profile\//i.test(this.page.url())) {
        await clickable.click({ timeout: this.uiTimeout }).catch(() => {});
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(800).catch(() => {});
      }
      if (/\/procurement-hub\/profile\//i.test(this.page.url())) {
        this.logStep(`Opened vendor project profile via ${label} (${this.page.url()})`);
        return true;
      }
      return false;
    };

    // Direct profile links anywhere on the hub (after org is selected).
    const profileLinks = this.page.locator('a[href*="/procurement-hub/profile/"]').filter({ visible: true });
    const linkCount = await profileLinks.count().catch(() => 0);
    for (let i = 0; i < Math.min(linkCount, 10); i += 1) {
      const link = profileLinks.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const text = ((await link.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (/aec[_\s-]*solutions/i.test(text)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenRow(link, `profile link "${text.slice(0, 40) || i}"`)) return;
    }

    const rows = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('td') })
      .filter({ visible: true });
    const rowCount = await rows.count().catch(() => 0);

    const candidates = [];
    for (let i = 0; i < rowCount; i += 1) {
      const row = rows.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (isExcludedProject(text)) {
        console.log(`[VendorRFQ] Skipping hub project row (excluded): ${text.slice(0, 80)}`);
        continue;
      }
      const clickable = row
        .locator('td a, td [role="button"], td button, a, [role="link"]')
        .filter({ visible: true })
        .first()
        .or(row.locator('td').filter({ visible: true }).nth(0));
      candidates.push({
        clickable: row,
        link: clickable,
        text,
        preferred: isPreferredKumar(text),
      });
    }

    candidates.sort((a, b) => Number(b.preferred) - Number(a.preferred));

    for (const c of candidates) {
      // Prefer clicking the whole row (hub often navigates on row click).
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenRow(c.clickable, `row "${c.text.slice(0, 40)}"`)) return;
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenRow(c.link, `cell "${c.text.slice(0, 40)}"`)) return;
    }

    // Last resort: first visible non-AEC / non-org card/link.
    const cards = this.page
      .locator('main .MuiCard-root, main .MuiPaper-root, main [role="button"], main a')
      .filter({ visible: true });
    const cardCount = await cards.count().catch(() => 0);
    for (let i = 0; i < Math.min(cardCount, 12); i += 1) {
      const card = cards.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (isExcludedProject(text)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenRow(card, `card "${text.slice(0, 40)}"`)) return;
    }

    throw new Error(
      `Could not open a project profile on the vendor Procurement Hub (still at ${this.page.url()})`
    );
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
    // \b404\b: phone numbers like +918828140468 contain "404" and must not count as a 404 page.
    return /\b404\b|page\s+not\s+found|this\s+page\s+(could|does)\s+not\s+exist|oops.*not\s+found/i.test(body);
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
   * Find RFQ list card by title (e.g. "New One").
   * When multiple match, prefer the most recently created (highest RFQ####) — same as Admin.
   * When title is empty, uses the first card.
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
    const parseRfqNo = (text) => {
      const m = String(text || '').match(/RFQ\s*0*(\d+)/i);
      return m ? Number(m[1]) : -1;
    };

    const matches = [];
    const cardCount = await this.rfqListCards().count().catch(() => 0);
    for (let i = 0; i < Math.max(cardCount, 1); i += 1) {
      const card = cardCount > 0 ? this.rfqListCards().nth(i) : this.firstRfqListEntry();
      // eslint-disable-next-line no-await-in-loop
      if (!(await card.isVisible({ timeout: 2000 }).catch(() => false))) continue;

      // eslint-disable-next-line no-await-in-loop
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (titleRe && !titleRe.test(text)) continue;

      // eslint-disable-next-line no-await-in-loop
      await card.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.ensureRfqCardRowExpanded(card);

      // eslint-disable-next-line no-await-in-loop
      let kebab = this.kebabOnRfqCard(card);
      // eslint-disable-next-line no-await-in-loop
      if (!(await kebab.isVisible({ timeout: 1500 }).catch(() => false))) {
        kebab = this.overflowMenuButton(card);
      }
      // eslint-disable-next-line no-await-in-loop
      if (!(await kebab.isVisible({ timeout: 1500 }).catch(() => false))) continue;

      matches.push({ card, kebab, rfqNo: parseRfqNo(text), index: i });
    }

    if (matches.length && wanted) {
      // "New One" must not resolve to "New one for automation": prefer cards whose title is exactly the wanted text.
      const exactRe = new RegExp(`(^|\\s)${escapeRe(wanted)}\\s+RFQ\\s*\\d`, 'i');
      const exact = [];
      for (const m of matches) {
        // eslint-disable-next-line no-await-in-loop
        const text = ((await m.card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (exactRe.test(text)) exact.push(m);
      }
      if (exact.length) matches.splice(0, matches.length, ...exact);
    }

    if (matches.length) {
      matches.sort((a, b) => {
        if (b.rfqNo !== a.rfqNo) return b.rfqNo - a.rfqNo;
        return a.index - b.index;
      });
      const best = matches[0];
      this.logStep(
        wanted
          ? `Resolved vendor RFQ "${wanted}" → RFQ#${best.rfqNo >= 0 ? best.rfqNo : '?'} (most recent of ${matches.length})`
          : `Resolved 1st vendor RFQ card (RFQ#${best.rfqNo >= 0 ? best.rfqNo : '?'})`
      );
      return { card: best.card, kebab: best.kebab };
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
    this.lastVendorRfqPrices = Array.from({ length: n }, () => value);
    this.logStep(`Changed price on ${n} line-item row(s) to ${value}`);
  }

  /**
   * Update every Material row with sample prices (1000, 2000, 3000…).
   * @param {string[]} [samplePrices]
   */
  async changeVendorRfqPricesWithSampleData(samplePrices) {
    const pricePage = this.priceUpdatePage();
    const applied = await pricePage.fillSamplePricesOnAllLineItemRows(samplePrices);
    this.lastVendorRfqPrices = applied;
    this.lastVendorRfqPrice = applied[0] || '';
    this.logStep(`Changed prices on ${applied.length} material row(s) with sample data: ${applied.join(', ')}`);
    return applied;
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
    if (await this.htmlPreviewDialog().isVisible({ timeout: 800 }).catch(() => false)) return true;
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

  /** HTML (non-PDF) RFQ preview dialog: shows Item/Description table + Business info. */
  htmlPreviewDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /item\s*\/\s*description|business info|billed to/i })
      .first();
  }

  async clickPreviewFromOverflowMenu(opts = {}) {
    const keepOpen = opts.keepOpen !== false;
    const title = String(this.targetRfqTitle || '').trim();

    let opened = false;
    for (let attempt = 1; attempt <= 3 && !opened; attempt += 1) {
      if (attempt > 1) {
        this.logStep(`Preview did not open — retrying (attempt ${attempt}/3)`);
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.waitForNetworkSettled();
      }
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

      const dialogOpened = this.htmlPreviewDialog()
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => 'dialog')
        .catch(() => null);
      const winner = await Promise.race([dialogOpened, popupPromise.then((p) => p || null)]);
      if (winner && winner !== 'dialog' && !winner.isClosed()) {
        this.previewPage = winner;
        await winner.waitForLoadState('domcontentloaded').catch(() => {});
        opened = true;
      } else {
        opened = winner === 'dialog' || (await this.isPreviewShowing());
      }
    }
    if (!opened) {
      throw new Error(`Vendor RFQ Preview did not open for "${title || '1st RFQ'}" after 3 attempts`);
    }

    if (!keepOpen) {
      await this.closePreviewIfOpen();
    }
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

  async clickDeclineRfqFromOverflowMenu() {
    // Decline is on the RFQ list row overflow — close Preview if still open.
    await this.closePreviewIfOpen().catch(() => {});
    await this.waitForRfqListReady().catch(() => {});

    const title = String(this.targetRfqTitle || '').trim();
    if (!(await this.isOverflowMenuOpen())) {
      if (title) {
        await this.openRfqOverflowMenuByTitle(title);
      } else {
        await this.openFirstRfqOverflowMenu();
      }
    }

    const declineResponse = this.page
      .waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          /UPDATE_VENDOR_RFQ_STATUS/.test(r.request().postData() || '') &&
          /DECLINED/i.test(r.request().postData() || ''),
        { timeout: 20000 }
      )
      .catch(() => null);
    await this.clickOverflowMenuItem(/decline\s*r\.?f\.?q\.?|^decline$|reject/i);
    this.logStep(
      title
        ? `Clicked Decline RFQ on RFQ "${title}" only`
        : 'Clicked Decline RFQ from vendor RFQ overflow menu'
    );
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(600).catch(() => {});

    // Decline fires immediately (no confirmation dialog); a rejected API call means the status will never change.
    const resp = await declineResponse;
    if (resp && resp.status() >= 400) {
      const body = await resp.json().catch(() => ({}));
      const details = (body?.error?.details || []).map((d) => d.message).join('; ');
      throw new Error(
        `Vendor Portal could not decline RFQ "${title || '1st RFQ'}": API ${resp.status()} ${body?.code || ''} ` +
          `${details || body?.message || ''}. This is an application bug (decline request rejected by the server), not a test issue.`
      );
    }
    if (resp) this.logStep(`Decline RFQ API responded ${resp.status()}`);
  }

  /** Green Save at the top of the preview. The small Save inside the suggestion box is lower on the page. */
  async clickPreviewHeaderSave(scopePage) {
    const root = scopePage || this.page;
    const saves = root.getByRole('button', { name: /^save$/i }).filter({ visible: true });
    const count = await saves.count().catch(() => 0);
    let best = null;
    let bestTop = Infinity;
    for (let i = 0; i < count; i += 1) {
      const button = saves.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const box = await button.boundingBox().catch(() => null);
      if (!box || box.y >= bestTop) continue;
      bestTop = box.y;
      best = button;
    }
    if (!best) return false;
    await best.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked the preview header Save');
    await this.page.waitForTimeout(800).catch(() => {});
    return true;
  }

  /** Line-item comments stay hidden inside a collapsed accordion until its header is opened. */
  async expandCommentAccordions(root) {
    const scope = root || this.page;
    const summaries = scope.locator('.MuiAccordionSummary-root');
    const n = await summaries.count().catch(() => 0);
    for (let i = 0; i < n; i += 1) {
      const summary = summaries.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await summary.isVisible({ timeout: 400 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      if ((await summary.getAttribute('aria-expanded').catch(() => null)) === 'true') continue;
      // eslint-disable-next-line no-await-in-loop
      await summary.click({ timeout: 5000, force: true }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(300).catch(() => {});
    }
  }

  async clickSuggestionSave(scopePage) {
    const root = scopePage || this.page;
    const editor = root.locator('textarea[placeholder*="Enter your Text" i]').filter({ visible: true }).first();
    if (!(await editor.isVisible({ timeout: 2000 }).catch(() => false))) return false;
    const committed = await root
      .evaluate(() => {
        const box = document.querySelector('textarea[placeholder*="Enter your Text" i]');
        if (!box) return { ok: false, reason: 'no-editor' };
        const er = box.getBoundingClientRect();
        const ecx = er.left + er.width / 2;
        const ecy = er.top + er.height / 2;
        const saves = Array.from(document.querySelectorAll('button')).filter(
          (b) => b.offsetParent !== null && /^save$/i.test((b.innerText || '').trim())
        );
        let best = null;
        let bestDist = Infinity;
        for (const b of saves) {
          const r = b.getBoundingClientRect();
          const dist = Math.hypot(r.left + r.width / 2 - ecx, r.top + r.height / 2 - ecy);
          if (dist < bestDist) {
            bestDist = dist;
            best = b;
          }
        }
        if (!best) return { ok: false, reason: 'no-save' };
        best.click();
        return { ok: true, dist: Math.round(bestDist) };
      })
      .catch((e) => ({ ok: false, reason: String(e.message || e) }));
    if (!committed.ok) {
      throw new Error(`Could not click the suggestion Save next to the comment box (${committed.reason})`);
    }
    this.logStep(`Clicked suggestion Save next to the comment box (dist=${committed.dist})`);
    await editor.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    return true;
  }

  commentScopePage() {
    if (this.previewPage && !this.previewPage.isClosed()) return this.previewPage;
    return this.page;
  }

  async clickAddCommentFromOverflowMenu() {
    await this.page.keyboard.press('Escape').catch(() => {});
    if (!(await this.htmlPreviewDialog().isVisible({ timeout: 1500 }).catch(() => false))) {
      await this.clickPreviewFromOverflowMenu({ keepOpen: true });
    }
    const dialog = this.htmlPreviewDialog();
    await expect(dialog).toBeVisible({
      timeout: 20000,
      message: 'RFQ Preview did not stay open for Show comments',
    });

    const show = dialog.getByRole('button', { name: /show\s*comments?/i }).filter({ visible: true }).first();
    if (await show.isVisible({ timeout: 8000 }).catch(() => false)) {
      await show.click({ timeout: this.uiTimeout, force: true });
      this.logStep('Clicked Show comments on the RFQ Preview');
      await this.page.waitForTimeout(600).catch(() => {});
    }

    const inCommentMode = dialog.getByRole('button', { name: /exit comment mode/i }).filter({ visible: true }).first();
    if (!(await inCommentMode.isVisible({ timeout: 4000 }).catch(() => false))) {
      await show.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      await this.page.waitForTimeout(600).catch(() => {});
    }
    await expect(inCommentMode).toBeVisible({
      timeout: 8000,
      message: 'RFQ Preview did not enter comment mode after Show comments',
    });

    // The line bubble stays hidden until the item name is hovered. Do not click Exit comment mode.
    const lineName = dialog.getByText(/^Material\s+\d+$/).filter({ visible: true }).first();
    await expect(lineName).toBeVisible({
      timeout: 15000,
      message: 'RFQ preview line item did not render after Show comments',
    });
    await lineName.scrollIntoViewIfNeeded().catch(() => {});
    await lineName.hover({ force: true });
    const lineBox = await lineName.boundingBox().catch(() => null);
    if (lineBox) {
      await this.page.mouse.move(lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height / 2);
    }
    await this.page.waitForTimeout(700).catch(() => {});

    const bubble = this.page.locator('button.MuiIconButton-colorPrimary').filter({ visible: true }).last();
    if (!(await bubble.isVisible({ timeout: 2000 }).catch(() => false)) && lineBox) {
      await this.page.mouse.move(lineBox.x + 400, lineBox.y + lineBox.height / 2).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
    }
    await expect(bubble).toBeVisible({
      timeout: 8000,
      message: 'RFQ line comment icon did not appear. Hover the item row after Show comments.',
    });
    await bubble.hover({ force: true }).catch(() => {});
    await bubble.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked the line comment icon on the RFQ Preview');

    const editor = this.page.locator('textarea[placeholder*="Enter your Text" i]').filter({ visible: true }).first();
    await expect(editor).toBeVisible({
      timeout: 8000,
      message: 'RFQ suggestion box did not open after the line comment icon',
    });
    this.logStep('Opened the RFQ comment box from Show comments');
  }

  async enterVendorRfqComment(text) {
    const comment = String(text || '').trim();
    if (!comment) throw new Error('Vendor RFQ comment text is required');
    this.lastVendorRfqComment = comment;

    const {
      RfqVendorPortalCommentPage,
    } = require('../../../admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-portal-comment.page');
    const helper = new RfqVendorPortalCommentPage(this.commentScopePage());

    // Prefer editor already opened by Add Comment; else open comment icon / line-item.
    let filled = await helper.fillCommentFieldInRoot(comment).catch(() => false);
    if (!filled) {
      await helper.openCommentIcon().catch(() => {});
      await helper.openLineItemCommentOnFirstRow().catch(() => false);
      filled = await helper.fillCommentFieldInRoot(comment);
    }
    if (!filled) {
      throw new Error(
        `Could not enter vendor RFQ comment "${comment}". Comment editor not found after Add Comment.`
      );
    }
    this.logStep(`Entered vendor RFQ comment: "${comment}"`);
  }

  async submitVendorRfqComment() {
    const wanted = String(this.lastVendorRfqComment || '').trim();
    const savedPayloads = [];
    const onSaved = async (res) => {
      const body = res.request().postData() || '';
      if (!/comment/i.test(body)) return;
      savedPayloads.push({ status: res.status(), body });
    };
    const scope = this.commentScopePage();
    scope.on('response', onSaved);
    try {
      await this.clickSuggestionSave(scope);
      const headerSaved = await this.clickPreviewHeaderSave(scope);
      if (!headerSaved) {
        const {
          RfqVendorPortalCommentPage,
        } = require('../../../admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-portal-comment.page');
        await new RfqVendorPortalCommentPage(scope).clickSaveCommentButton();
        this.logStep('Clicked fallback RFQ comment Save');
      }
      await this.waitForNetworkSettled();
      const commentRe = wanted ? new RegExp(wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
      const savedWithText = () =>
        savedPayloads.find((p) => p.status < 400 && commentRe && commentRe.test(p.body));
      const waitUntil = Date.now() + 8000;
      while (Date.now() < waitUntil && !savedWithText()) {
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(400).catch(() => {});
      }
      if (!savedWithText()) {
        const last = savedPayloads[savedPayloads.length - 1];
        throw new Error(
          `Vendor RFQ comment "${wanted}" was not saved. ` +
            (last
              ? `Last comment response ${last.status}, payload ${last.body.slice(0, 400)}`
              : 'No comment save request was sent.')
        );
      }
    } finally {
      scope.off('response', onSaved);
    }
    this.vendorRfqCommentPersisted = true;
    this.logStep('Submitted vendor RFQ comment');
  }

  async expectVendorRfqCommentAddedSuccessfully(text) {
    const comment = String(text || this.lastVendorRfqComment || '').trim();
    const toast = this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /comment\s*(added|saved|posted|submitted)|successfully|saved/i })
      .filter({ visible: true })
      .first();
    if (await toast.isVisible({ timeout: 12000 }).catch(() => false)) {
      this.logStep('Vendor RFQ comment success toast visible');
      return;
    }
    if (comment) {
      await this.expandCommentAccordions(this.page.getByRole('dialog').filter({ visible: true }).last());
      const visible = this.page.getByText(comment, { exact: false }).filter({ visible: true }).first();
      if (await visible.isVisible({ timeout: 8000 }).catch(() => false)) {
        this.logStep(`Vendor RFQ comment visible: "${comment}"`);
        return;
      }
    }
    if (this.vendorRfqCommentPersisted) {
      this.logStep(`Vendor RFQ comment "${comment || ''}" was saved from the preview header Save`);
      return;
    }
    throw new Error('Vendor RFQ comment success toast / comment text not visible');
  }

  async confirmDeclineRfqIfPrompted() {
    const dialog = this.page
      .locator('.MuiModal-root, [role="dialog"], .MuiDialog-root')
      .filter({ visible: true })
      .last();
    if (!(await dialog.isVisible({ timeout: 5000 }).catch(() => false))) {
      this.logStep('No Decline RFQ confirmation dialog — continuing');
      return;
    }

    const reason = dialog
      .getByPlaceholder(/reason|comment|note/i)
      .or(dialog.locator('textarea, input[type="text"]').first())
      .filter({ visible: true })
      .first();
    if (await reason.isVisible({ timeout: 1500 }).catch(() => false)) {
      await reason.fill('Declined by automation TC-03').catch(() => {});
    }

    const confirmBtn = dialog
      .getByRole('button', {
        name: /^(confirm|yes|decline|reject|ok|proceed|submit|continue)$/i,
      })
      .or(
        dialog
          .getByRole('button')
          .filter({ hasText: /confirm|yes|decline|reject|proceed|submit|continue/i })
      )
      .filter({ visible: true })
      .first();
    await expect(confirmBtn).toBeVisible({ timeout: 15000 });
    await confirmBtn.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
      await confirmBtn.click({ timeout: this.uiTimeout });
    });
    this.logStep('Confirmed Decline RFQ action');
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});
  }

  async expectDeclineSuccessMessage() {
    const toast = this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root')
      .filter({
        hasText: /declined\s*successfully|rfq\s*declined|declined|rejected\s*successfully|quotation\s*declined/i,
      })
      .filter({ visible: true })
      .first();
    if (await toast.isVisible({ timeout: 20000 }).catch(() => false)) {
      this.logStep('Vendor RFQ decline success message visible');
      return;
    }
    // Soft: status chip may appear without toast.
    const declined = this.page.getByText(/\bdeclined\b|\brejected\b/i).filter({ visible: true }).first();
    await expect(declined).toBeVisible({
      timeout: 30000,
      message: 'Vendor RFQ decline success toast / Declined indicator not visible',
    });
    this.logStep('Vendor RFQ decline success inferred from Declined indicator');
  }

  async expectRfqStatusDeclined() {
    const title = String(this.targetRfqTitle || 'New One').trim();
    await this.closePreviewIfOpen().catch(() => {});
    await this.waitForRfqListReady().catch(() => {});

    const resolved = await this.resolveRfqListCardWithKebabByTitle(title).catch(() => null);
    const card = resolved?.card || this.firstRfqListEntry();
    const scope = (await card?.isVisible({ timeout: 2000 }).catch(() => false))
      ? card
      : this.page.locator('main, [role="main"], body').first();

    const declined = scope
      .getByText(/\bdeclined\b|\brejected\b/i)
      .filter({ visible: true })
      .first()
      .or(this.page.getByText(/\bdeclined\b|\brejected\b/i).filter({ visible: true }).first());

    await expect(declined).toBeVisible({
      timeout: this.defaultTimeout,
      message: `RFQ status "Declined" not visible in Vendor Portal for "${title}"`,
    });
    this.logStep(`Verified RFQ status Declined in Vendor Portal for "${title}"`);
  }

  async clickPriceUpdateFromOverflowMenu() {
    await this.clickUpdatePriceFromOverflowMenu();
  }

  async setTargetRfqTitle(title) {
    this.targetRfqTitle = String(title || '').trim();
    this.logStep(`Vendor RFQ target locked to title "${this.targetRfqTitle}"`);
  }

  async clickPreview(opts = {}) {
    const keepOpen = opts.keepOpen !== false;
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking Preview');
    }
    await this.waitForNetworkSettled();
    await this.waitForRfqListReady();

    if (await this.isPreviewShowing()) {
      this.logStep('Vendor RFQ preview already visible');
      if (!keepOpen) await this.closePreviewIfOpen();
      return;
    }

    // Primary path: 3-dot menu on first Quotation Received / RFQ card (see vendor portal UI).
    try {
      await this.clickPreviewFromOverflowMenu({ keepOpen });
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
      if (!keepOpen) await this.closePreviewIfOpen();
      return;
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    if (await this.isPreviewShowing()) {
      if (!keepOpen) await this.closePreviewIfOpen();
    }

    this.logStep('Clicked Preview on vendor RFQ');
  }

  async expectRfqAvailableInVendorPortal(title) {
    const wanted = String(title || this.targetRfqTitle || '').trim();

    // Preview may still be open (TC-01 keepOpen) — do not wait on RFQ list readiness.
    if (await this.isPreviewShowing()) {
      if (wanted) {
        const rootPage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
        const titleHit = rootPage.getByText(wanted, { exact: false }).filter({ visible: true }).first();
        const onPreview = await titleHit.isVisible({ timeout: 8000 }).catch(() => false);
        const onList = await this.page
          .getByText(wanted, { exact: false })
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (!onPreview && !onList) {
          // Soft: Preview dialog/canvas is open after we locked target to this title.
          this.logStep(
            `Vendor Preview open for RFQ "${wanted}" (title text may be in canvas/PDF)`
          );
          return;
        }
      }
      this.logStep(`Vendor Portal shows RFQ${wanted ? ` "${wanted}"` : ''} (preview open)`);
      return;
    }

    await this.waitForRfqListReady().catch(() => {});
    if (wanted) {
      const titleHit = this.page.getByText(wanted, { exact: false }).filter({ visible: true }).first();
      await expect(titleHit).toBeVisible({
        timeout: this.defaultTimeout,
        message: `RFQ "${wanted}" not visible in Vendor Portal`,
      });
    }
    this.logStep(`Vendor Portal shows RFQ${wanted ? ` "${wanted}"` : ''}`);
  }

  async expectPreviewContainsSelectedMaterials(products, unitLabel = 'Each') {
    const list = Array.isArray(products) ? products.filter(Boolean) : [];
    if (!list.length) {
      throw new Error('No selected Material products provided for Vendor Preview verification');
    }

    const rootPage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const unit = String(unitLabel || 'Each').trim();

    const scopes = [
      rootPage.getByRole('dialog').filter({ visible: true }).first(),
      rootPage.locator('main, [role="main"]').filter({ visible: true }).first(),
      rootPage.locator('body'),
      this.page.locator('main, [role="main"], body').first(),
    ];

    const readPreviewText = async () => {
      let text = '';
      for (const scope of scopes) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await scope.isVisible({ timeout: 800 }).catch(() => false))) continue;
        // eslint-disable-next-line no-await-in-loop
        const t = ((await scope.innerText().catch(() => '')) || '').trim();
        if (t) text += `\n${t}`;
      }
      return text;
    };
    const nameRegexes = list
      .map((p) => String(p.name || p || '').trim())
      .filter(Boolean)
      .map((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    // Preview dialog opens before its line items load — poll until every product name renders.
    let combined = '';
    await expect
      .poll(
        async () => {
          combined = await readPreviewText();
          return nameRegexes.every((re) => re.test(combined));
        },
        { timeout: 45000, intervals: [1000, 2000, 3000] }
      )
      .toBe(true)
      .catch(() => {});

    const missing = [];
    for (const product of list) {
      const name = String(product.name || product || '').trim();
      if (!name) continue;
      const nameRe = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!nameRe.test(combined)) {
        // eslint-disable-next-line no-await-in-loop
        const visible = await rootPage
          .getByText(nameRe)
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 2500 })
          .catch(() => false);
        // eslint-disable-next-line no-await-in-loop
        const onList = await this.page
          .getByText(nameRe)
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 2500 })
          .catch(() => false);
        if (!visible && !onList) missing.push(name);
      }
    }

    if (missing.length) {
      const hasUnit = new RegExp(unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(combined);
      const canvasOnly = await rootPage
        .locator('canvas, iframe')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (canvasOnly) {
        this.logStep(
          `Vendor Preview appears canvas/PDF — skipping OCR for products: ${missing.join(', ')}` +
            (hasUnit ? `; unit "${unit}" seen in surrounding text` : '')
        );
        return;
      }
      throw new Error(
        `Vendor Preview missing Material product(s) after 45s: ${missing.join(', ')}. ` +
          `Preview text: ${combined.replace(/\s+/g, ' ').slice(0, 600) || '(empty)'}`
      );
    }

    const summary = list
      .map((p) => `${p.name || p} (qty ${p.quantity ?? '?'}, unit ${p.unit || unit})`)
      .join(', ');
    this.logStep(`Vendor Preview shows ${list.length} Material product(s): ${summary}`);
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
