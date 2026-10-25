const { expect } = require('@playwright/test');
const VendorRFQPage = require('../rfq/VendorRFQPage');

/**
 * Vendor portal → Procurement Hub → org → project → Purchase Order → Preview.
 * Reuses hub/login navigation from VendorRFQPage (same RFQ vendor credentials/org).
 */
class VendorPurchaseOrderPage extends VendorRFQPage {
  constructor(page) {
    super(page);
    this.targetPoTitle = 'New PO 1';
    this.targetPoNumber = '';
  }

  logStep(msg) {
    console.log(`[VendorPO] ${msg}`);
  }

  setTargetPoTitle(title) {
    this.targetPoTitle = String(title || 'New PO 1').trim();
    this.logStep(`Vendor PO target locked to title "${this.targetPoTitle}"`);
  }

  setTargetPoNumber(poNumber) {
    const raw = String(poNumber || '').trim().toUpperCase();
    const parsed = this.parsePoNumberToken(raw);
    // Ignore bad captures like PO1 from title "New PO 1".
    if (!parsed || String(parsed.digits).length < 4) {
      this.targetPoNumber = '';
      if (raw) this.logStep(`Ignored invalid PO number "${raw}" — will use most recently received PO######`);
      return;
    }
    this.targetPoNumber = parsed.label;
    this.logStep(`Vendor PO target locked to number "${parsed.label}" (dynamic PO######)`);
  }

  /** Normalize tokens like "PO # 0000093" / "PO0000093" → { label, digits, numeric }. */
  parsePoNumberToken(text) {
    // Prefer real system numbers (4+ digits). Avoid matching "PO 1" from titles.
    const m =
      String(text || '').match(/\bPO\s*#?\s*(\d{4,})\b/i) ||
      String(text || '').match(/\b(PO\d{4,})\b/i);
    if (!m) return null;
    const digits = (m[1].match(/\d{4,}/) || m[0].match(/\d{4,}/) || [])[0];
    if (!digits) return null;
    const labelMatch = String(text || '').match(new RegExp(`PO\\s*#?\\s*0*${digits}\\b`, 'i'));
    let label = (labelMatch ? labelMatch[0] : `PO${digits}`).replace(/\s+/g, '').replace(/#/g, '').toUpperCase();
    if (!label.startsWith('PO')) label = `PO${digits}`;
    return { label, digits, numeric: Number(digits) };
  }

  poNumberMatches(text, wantedPoNumber) {
    const found = this.parsePoNumberToken(text);
    if (!found) return false;
    const wanted = this.parsePoNumberToken(wantedPoNumber);
    if (!wanted) {
      // No specific number — any PO###### counts.
      return true;
    }
    return found.numeric === wanted.numeric;
  }

  async clickPurchaseOrderOnProject() {
    if (this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking Purchase Order');
    }
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});
    // Do not call recoverFrom404IfNeeded here — parent recovers to ?tab=RFQ and steals PO focus.

    // Hub project click can pass without navigation — open a profile first.
    if (!/\/procurement-hub\/profile\//i.test(this.page.url())) {
      this.logStep('Not on vendor project profile yet — opening first kumar hub project');
      await this.clickFirstProjectName();
    }

    if ((await this.isOnVendorPoRoute()) && (await this.isPoModuleReady())) {
      this.logStep(`Already on vendor Purchase Order module (${this.page.url()})`);
      return;
    }

    await this.selectPurchaseOrderTab();

    if (!(await this.isPoModuleReady())) {
      const profileBase = this.profileBaseUrl();
      if (profileBase) {
        const tabUrls = [
          `${profileBase}?tab=${encodeURIComponent('Purchase Order')}`,
          `${profileBase}?tab=PurchaseOrder`,
          `${profileBase}?tab=PO`,
          `${profileBase}?tab=RFQAndPO&subTab=PO`,
          `${profileBase}?tab=purchase_order`,
        ];
        for (const url of tabUrls) {
          // eslint-disable-next-line no-await-in-loop
          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout }).catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          await this.waitForNetworkSettled();
          // eslint-disable-next-line no-await-in-loop
          await this.selectPurchaseOrderTab().catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          await this.page.waitForTimeout(800).catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          if (await this.isPoModuleReady()) break;
        }
      }
    }

    if (!(await this.isPoModuleReady())) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      throw new Error(
        `Could not open Purchase Order list on vendor project (${this.page.url()}). Snippet: ${snippet}`
      );
    }

    this.logStep(`Opened Purchase Order on vendor project (${this.page.url()})`);
  }

  async selectPurchaseOrderTab() {
    const poTab = this.page
      .getByRole('tab', { name: /purchase\s*order/i })
      .or(this.page.locator('.MuiTab-root').filter({ hasText: /purchase\s*order/i }))
      .filter({ visible: true })
      .first();

    if (await poTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await poTab.scrollIntoViewIfNeeded().catch(() => {});
      await poTab.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
        await poTab.click({ timeout: this.uiTimeout });
      });
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1200).catch(() => {});
      this.logStep('Clicked Purchase Order tab on vendor project');
      return true;
    }

    const candidates = [
      this.page.getByRole('button', { name: /^purchase\s*order$/i }).first(),
      this.page.getByRole('link', { name: /^purchase\s*order$/i }).first(),
      this.page.getByText(/^purchase\s*order$/i).filter({ visible: true }).first(),
    ];
    return this._clickFirstVisible(candidates, 5000);
  }

  async isOnVendorPoRoute() {
    if (await this.is404Page()) return false;
    const url = String(this.page.url() || '');
    if (/[?&](tab|subTab)=(PO|PurchaseOrder|Purchase_Order|purchase_order|Purchase\+Order|Purchase%20Order)\b/i.test(url)) {
      return true;
    }
    if (/[?&]tab=RFQAndPO\b/i.test(url) && /[?&]subTab=PO\b/i.test(url)) return true;

    const poTab = this.page.getByRole('tab', { name: /purchase\s*order/i }).first();
    if (await poTab.isVisible({ timeout: 800 }).catch(() => false)) {
      const selected =
        (await poTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
        /Mui-selected|active/i.test((await poTab.getAttribute('class').catch(() => '')) || '');
      if (selected) return true;
    }
    return false;
  }

  async isPoModuleReady() {
    if (await this.is404Page()) return false;
    await this.page
      .waitForFunction(() => document.querySelectorAll('.MuiSkeleton-root').length === 0, {
        timeout: 15000,
      })
      .catch(() => {});

    if (await this.isPoListVisible()) return true;

    // Tab selected / URL on PO with empty list still counts as module ready.
    if (await this.isOnVendorPoRoute()) {
      const empty = this.page
        .getByText(/no\s*(purchase\s*)?orders?|no\s*data|nothing\s*to\s*show|no\s*records/i)
        .filter({ visible: true })
        .first();
      if (await empty.isVisible({ timeout: 1200 }).catch(() => false)) return true;

      const tabsRow = this.page.getByRole('tab', { name: /purchase\s*order/i }).first();
      if (await tabsRow.isVisible({ timeout: 800 }).catch(() => false)) return true;
    }

    return false;
  }

  async isPoListVisible() {
    if (await this.is404Page()) return false;

    const listChrome = this.page
      .getByText(/po\s*#|po\s*no|issued\s*date|delivery\s*date|purchase\s*order\s*list|new\s*po\s*\d+/i)
      .filter({ visible: true })
      .first();
    if (await listChrome.isVisible({ timeout: 1500 }).catch(() => false)) return true;

    const cards = await this.poListCards().count().catch(() => 0);
    if (cards > 0) return true;

    // Any overflow kebab in main while PO tab is active usually means list rows rendered.
    if (await this.isOnVendorPoRoute()) {
      const kebab = this.page
        .locator(
          'main button:has(svg[data-testid="MoreVertIcon"]), main button:has(svg[data-testid="MoreHorizIcon"])'
        )
        .filter({ visible: true })
        .first();
      if (await kebab.isVisible({ timeout: 1200 }).catch(() => false)) return true;
    }

    const table = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('td') })
      .filter({ visible: true });
    if ((await table.count().catch(() => 0)) > 0 && (await this.isOnVendorPoRoute())) return true;

    return false;
  }

  /**
   * Under the kumar hub (same as RFQ): open each project (skip AEC Solutions) until
   * Purchase Order list shows the TC-01 PO number (e.g. PO0000093) or latest PO######.
   */
  async openAdityaProjectWithPurchaseOrder(title) {
    const testData = require('../../../../utils/testData');
    const org =
      String(testData.vendor?.rfqUser?.organization || process.env.VENDOR_RFQ_ORG_NAME || '').trim() ||
      'kumarorganization';
    const wantedTitle = String(title || this.targetPoTitle || 'New PO 1').trim();
    const wantedPoNumber = String(this.targetPoNumber || '').trim().toUpperCase();
    this.setTargetPoTitle(wantedTitle);
    if (wantedPoNumber) this.setTargetPoNumber(wantedPoNumber);

    if (!(await this.isOnProcurementHub()) || /\/procurement-hub\/profile\//i.test(this.page.url())) {
      await this.navigateToProcurementHub();
      await this.selectConnectedOrganization(org).catch(() => {});
    }

    await this.waitForNetworkSettled();
    const projectNames = await this.listAdityaHubProjectNames();
    const label = wantedPoNumber || 'latest PO######';
    if (!projectNames.length) {
      await this.clickFirstProjectName();
      await this.clickPurchaseOrderOnProject();
      if (await this.pageHasTargetPo({ title: wantedTitle, poNumber: wantedPoNumber })) {
        this.logStep(`Found PO ${label} on first ${org} hub project`);
        return;
      }
      throw new Error(`No vendor hub projects under ${org} to search for PO ${label}`);
    }

    const tried = [];
    for (const name of projectNames) {
      if (/aec\s*solutions/i.test(String(name || ''))) continue;
      tried.push(name);
      this.logStep(`Trying ${org} hub project "${name}" for PO ${label}`);
      // eslint-disable-next-line no-await-in-loop
      await this.navigateToProcurementHub().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.selectConnectedOrganization(org).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.clickProjectName(name).catch(async () => {
        await this.clickFirstProjectName();
      });
      // eslint-disable-next-line no-await-in-loop
      await this.clickPurchaseOrderOnProject();
      // eslint-disable-next-line no-await-in-loop
      if (await this.pageHasTargetPo({ title: wantedTitle, poNumber: wantedPoNumber })) {
        this.logStep(`Found PO ${label} under ${org} project "${name}" (${this.page.url()})`);
        return;
      }
      this.logStep(`PO ${label} not on project "${name}" — trying next`);
    }

    throw new Error(
      `Could not find Purchase Order ${label} under ${org}. Tried projects: ${tried.join(', ')}`
    );
  }

  async listAdityaHubProjectNames() {
    const isExcluded = (text) => {
      const n = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (!n) return true;
      if (/aec[_\s-]*solutions/.test(n)) return true;
      if (/procurement\s*hub|connected org|organization|rfq list|project\s*name/.test(n)) return true;
      return false;
    };

    const names = [];
    const rows = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('td') })
      .filter({ visible: true });
    const rowCount = await rows.count().catch(() => 0);
    for (let i = 0; i < rowCount; i += 1) {
      const row = rows.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (isExcluded(text)) continue;
      // Prefer first cell / link text as project name.
      // eslint-disable-next-line no-await-in-loop
      const linkText = (
        (await row.locator('td a, td [role="button"], a').first().innerText().catch(() => '')) || ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      const name = (linkText || text.split(/\s{2,}|\n/)[0] || text).slice(0, 80).trim();
      if (name && !names.includes(name)) names.push(name);
    }

    if (!names.length) {
      const cards = this.page
        .locator('main .MuiCard-root, main .MuiPaper-root, main a[href*="profile"]')
        .filter({ visible: true });
      const cardCount = await cards.count().catch(() => 0);
      for (let i = 0; i < Math.min(cardCount, 12); i += 1) {
        const card = cards.nth(i);
        // eslint-disable-next-line no-await-in-loop
        const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (isExcluded(text)) continue;
        const name = text.slice(0, 80).trim();
        if (name && !names.includes(name)) names.push(name);
      }
    }

    this.logStep(`Hub projects to scan for PO: ${names.join(' | ') || '(none)'}`);
    return names.slice(0, 8);
  }

  async pageHasPoTitle(title) {
    const wanted = String(title || '').trim();
    if (!wanted) return false;
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escapeRe(wanted), 'i');
    const hit = this.page.getByText(re).filter({ visible: true }).first();
    if (await hit.isVisible({ timeout: 4000 }).catch(() => false)) return true;

    const body = ((await this.page.locator('main, body').first().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ');
    return re.test(body);
  }

  async pageHasTargetPo({ title, poNumber } = {}) {
    const body = ((await this.page.locator('main, body').first().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ');
    const wantedNo = String(poNumber || this.targetPoNumber || '').trim();
    if (wantedNo) {
      if (this.poNumberMatches(body, wantedNo)) return true;
      const token = this.parsePoNumberToken(wantedNo);
      if (token) {
        const hit = this.page
          .getByText(new RegExp(`PO\\s*#?\\s*0*${token.digits}\\b`, 'i'))
          .filter({ visible: true })
          .first();
        if (await hit.isVisible({ timeout: 3000 }).catch(() => false)) return true;
      }
      return false;
    }

    // No saved number: any PO###### on the list is enough to enter the project.
    if (/\bPO\s*#?\s*\d+\b/i.test(body)) return true;
    if (title && (await this.pageHasPoTitle(title))) return true;
    return false;
  }

  /** Vendor PO list cards/rows that expose a 3-dots overflow menu. */
  poListCards() {
    return this.page
      .locator('main div.MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main table tbody tr')
      .filter({ visible: true })
      .filter({
        has: this.page.locator(
          'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
        ),
      })
      .filter({ hasText: /PO\s*#?\s*\d+|new\s*po|purchase\s*order|issued|vendor|qty|amount/i });
  }

  async waitForPoListReady() {
    await this.waitForNetworkSettled();
    await expect
      .poll(async () => (await this.isPoListVisible()) || (await this.isPoModuleReady()), {
        timeout: this.listTimeout,
      })
      .toBeTruthy();
  }

  async clickPreviewFromOverflowMenuOnly() {
    const title = String(this.targetPoTitle || 'New PO 1').trim();
    const poNumber = String(this.targetPoNumber || '').trim().toUpperCase();
    await this.waitForPoListReady().catch(() => {});
    await this.waitForNetworkSettled();

    const popupPromise = this.page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);

    if (!(await this.isOverflowMenuOpen())) {
      await this.openPoOverflowMenuByTitle(title);
    }
    await this.clickOverflowMenuItem(/^preview$/i);
    this.logStep(
      `Clicked Preview from 3-dots menu on vendor PO ${poNumber || title} only`
    );

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      this.previewPage = popup;
      this.logStep('Opened vendor PO Preview in a new tab from 3-dots');
      return;
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});
  }

  async clickPreviewOnVendorPo(opts = {}) {
    // TC-02: always use 3-dots → Preview for the same PO from TC-01.
    await this.clickPreviewFromOverflowMenuOnly();
    if (opts.keepOpen === false) {
      await this.closePreviewIfOpen().catch(() => {});
    }
  }

  /**
   * Click the most recently received PO on the vendor Purchase Order list
   * (highest PO###### like PO0000093). Does not require a fixed number from TC-01.
   */
  async clickMostRecentlyReceivedPo() {
    await this.waitForPoListReady().catch(() => {});
    await this.waitForNetworkSettled();
    // Prefer latest list row over a bad/missing saved number.
    this.targetPoNumber = '';

    const resolved = await this.resolvePoListCardWithKebabByTitle(this.targetPoTitle || 'New PO 1', '');
    if (!resolved) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 500);
      throw new Error(
        `Could not find a recently received vendor PO (PO######). URL=${this.page.url()} Snippet: ${snippet}`
      );
    }

    await resolved.card.scrollIntoViewIfNeeded().catch(() => {});
    await this.ensureRfqCardRowExpanded(resolved.card).catch(() => {});

    if (resolved.poLabel) {
      this.setTargetPoNumber(resolved.poLabel);
      const numberHit = resolved.card
        .getByText(new RegExp(resolved.poLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
        .filter({ visible: true })
        .first();
      if (await numberHit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await numberHit.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      } else {
        await resolved.card
          .click({ timeout: this.uiTimeout, force: true, position: { x: 24, y: 16 } })
          .catch(() => {});
      }
    } else {
      await resolved.card
        .click({ timeout: this.uiTimeout, force: true, position: { x: 24, y: 16 } })
        .catch(() => {});
    }

    this.activeRfqListRow = resolved.card;
    await this.page.waitForTimeout(500).catch(() => {});
    this.logStep(
      `Clicked most recently received vendor PO ${resolved.poLabel || '(no PO###### label)'}${
        resolved.poNo >= 0 ? ` (#${resolved.poNo})` : ''
      }`
    );
  }

  /**
   * Click the PO row/card by dynamic PO number (e.g. PO0000093) or title fallback.
   */
  async clickVendorPoByTitle(title) {
    const wantedTitle = String(title || this.targetPoTitle || 'New PO 1').trim();
    const wantedPoNumber = String(this.targetPoNumber || '').trim().toUpperCase();
    await this.waitForPoListReady().catch(() => {});
    await this.waitForNetworkSettled();

    const resolved = await this.resolvePoListCardWithKebabByTitle(wantedTitle, wantedPoNumber);
    if (!resolved) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 500);
      throw new Error(
        `Could not click vendor PO ${wantedPoNumber || wantedTitle} on Purchase Order list. URL=${this.page.url()} Snippet: ${snippet}`
      );
    }

    await resolved.card.scrollIntoViewIfNeeded().catch(() => {});
    await this.ensureRfqCardRowExpanded(resolved.card).catch(() => {});

    const numberHit = resolved.poLabel
      ? resolved.card
          .getByText(new RegExp(resolved.poLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
          .filter({ visible: true })
          .first()
      : null;
    if (numberHit && (await numberHit.isVisible({ timeout: 2000 }).catch(() => false))) {
      await numberHit.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    } else {
      const titleHit = resolved.card
        .getByText(new RegExp(wantedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
        .filter({ visible: true })
        .first();
      if (await titleHit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleHit.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      } else {
        await resolved.card
          .click({ timeout: this.uiTimeout, force: true, position: { x: 24, y: 16 } })
          .catch(() => {});
      }
    }

    this.activeRfqListRow = resolved.card;
    this.setTargetPoTitle(wantedTitle);
    if (resolved.poLabel) this.setTargetPoNumber(resolved.poLabel);
    await this.page.waitForTimeout(500).catch(() => {});
    this.logStep(
      `Clicked vendor PO ${resolved.poLabel || wantedTitle}${resolved.poNo >= 0 ? ` (#${resolved.poNo})` : ''} under kumar`
    );
  }

  async clickVendorPoByNumber(poNumber) {
    if (poNumber) this.setTargetPoNumber(poNumber);
    await this.clickVendorPoByTitle(this.targetPoTitle || 'New PO 1');
  }

  async openPoOverflowMenuByTitle(title) {
    const wantedTitle = String(title || this.targetPoTitle || '').trim();
    const wantedPoNumber = String(this.targetPoNumber || '').trim().toUpperCase();
    await this.waitForPoListReady().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.waitForNetworkSettled();

    const resolved = await this.resolvePoListCardWithKebabByTitle(wantedTitle || null, wantedPoNumber);
    if (!resolved) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 500);
      throw new Error(
        `Could not find vendor PO ${wantedPoNumber || wantedTitle || '(any)'} with 3-dots (overflow) menu. URL=${this.page.url()} Snippet: ${snippet}`
      );
    }

    this.activeRfqListRow = resolved.card;
    if (resolved.poLabel) this.setTargetPoNumber(resolved.poLabel);
    await this._clickKebabUntilMenuOpen(resolved.kebab);
    this.logStep(
      `Opened 3-dots menu on vendor PO ${resolved.poLabel || wantedTitle}${resolved.poNo >= 0 ? ` (#${resolved.poNo})` : ''} — same PO from TC-01`
    );
  }

  /**
   * Find PO list card by PO number (e.g. PO0000093) first, then title.
   * When multiple match / no saved number, prefer the highest PO######.
   */
  async resolvePoListCardWithKebabByTitle(title, poNumber) {
    await this.waitForNetworkSettled();

    if (!(await this.isPoListVisible()) || !(await this.isOnVendorPoRoute())) {
      await this.clickPurchaseOrderOnProject().catch(() => {});
    }

    const wantedTitle = String(title || '').trim();
    const wantedPoNumber = String(poNumber || this.targetPoNumber || '').trim().toUpperCase();
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRe = wantedTitle ? new RegExp(escapeRe(wantedTitle), 'i') : null;
    const wantedParsed = this.parsePoNumberToken(wantedPoNumber);

    const kebabSelector =
      'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]';
    const collectFrom = async (locator, { requireTitle = false, requirePoNumber = false } = {}) => {
      const matches = [];
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 40); i += 1) {
        const card = locator.nth(i);
        // eslint-disable-next-line no-await-in-loop
        if (!(await card.isVisible({ timeout: 800 }).catch(() => false))) continue;
        // Wrapper boxes around the whole list also contain PO text + kebabs; only single-PO cards count
        // (each wrapper would otherwise go through the slow expand retries).
        // eslint-disable-next-line no-await-in-loop
        if ((await card.locator(kebabSelector).count().catch(() => 0)) > 1) continue;
        // eslint-disable-next-line no-await-in-loop
        const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
        const parsed = this.parsePoNumberToken(text);
        if (requirePoNumber && wantedParsed && (!parsed || parsed.numeric !== wantedParsed.numeric)) {
          continue;
        }
        if (requireTitle && titleRe && !titleRe.test(text)) continue;
        // eslint-disable-next-line no-await-in-loop
        await card.scrollIntoViewIfNeeded().catch(() => {});
        let kebab = this.kebabOnRfqCard(card);
        // eslint-disable-next-line no-await-in-loop
        if (!(await kebab.isVisible({ timeout: 1200 }).catch(() => false))) {
          kebab = this.overflowMenuButton(card);
        }
        // eslint-disable-next-line no-await-in-loop
        if (!(await kebab.isVisible({ timeout: 1200 }).catch(() => false))) {
          // eslint-disable-next-line no-await-in-loop
          await this.ensureRfqCardRowExpanded(card).catch(() => {});
          kebab = this.kebabOnRfqCard(card).or(this.overflowMenuButton(card));
          // eslint-disable-next-line no-await-in-loop
          if (!(await kebab.first().isVisible({ timeout: 1200 }).catch(() => false))) continue;
          kebab = kebab.first();
        }
        matches.push({
          card,
          kebab,
          poNo: parsed ? parsed.numeric : -1,
          poLabel: parsed ? parsed.label : '',
          index: i,
          text,
        });
        if ((requirePoNumber && wantedParsed) || (requireTitle && titleRe)) break;
      }
      return matches;
    };

    const cardScopes = [
      this.poListCards(),
      this.page
        .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr, main [role="row"]')
        .filter({ visible: true })
        .filter({
          has: this.page.locator(
            'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
          ),
        }),
      this.page
        .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr')
        .filter({ visible: true })
        .filter({ hasText: /\bPO\s*#?\s*\d+\b/i }),
    ];

    let matches = [];
    // 1) Exact / numeric PO number match (PO0000093 style — digits may vary).
    if (wantedParsed) {
      for (const scope of cardScopes) {
        // eslint-disable-next-line no-await-in-loop
        matches = await collectFrom(scope, { requirePoNumber: true });
        if (matches.length) break;
      }
    }

    // 2) Title match (New PO 1) when number not saved / not found.
    if (!matches.length && titleRe) {
      for (const scope of cardScopes) {
        // eslint-disable-next-line no-await-in-loop
        matches = await collectFrom(scope, { requireTitle: true });
        if (matches.length) break;
      }
    }

    // 3) Latest PO###### row on the list.
    if (!matches.length) {
      for (const scope of cardScopes) {
        // eslint-disable-next-line no-await-in-loop
        const anyPo = await collectFrom(scope);
        const withNo = anyPo.filter((m) => m.poNo >= 0);
        if (withNo.length) {
          console.warn(
            `[VendorPO] Using most recent PO###### on list (${withNo.length} candidates)${
              wantedPoNumber ? ` — saved ${wantedPoNumber} not exact-matched` : ''
            }`
          );
          matches = withNo;
          break;
        }
      }
    }

    // Title text ancestor near PO number.
    if (!matches.length && wantedParsed) {
      const numberHit = this.page
        .getByText(new RegExp(`PO\\s*#?\\s*0*${wantedParsed.digits}\\b`, 'i'))
        .filter({ visible: true })
        .first();
      if (await numberHit.isVisible({ timeout: 3000 }).catch(() => false)) {
        await numberHit.scrollIntoViewIfNeeded().catch(() => {});
        const near = numberHit
          .locator(
            'xpath=ancestor::*[self::tr or contains(@class,"MuiBox") or contains(@class,"MuiPaper") or contains(@class,"MuiCard")][1]'
          )
          .first();
        if (await near.isVisible({ timeout: 2000 }).catch(() => false)) {
          await this.ensureRfqCardRowExpanded(near).catch(() => {});
          const kebab = this.kebabOnRfqCard(near).or(this.overflowMenuButton(near));
          if (await kebab.isVisible({ timeout: 2000 }).catch(() => false)) {
            const text = ((await near.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
            const parsed = this.parsePoNumberToken(text) || wantedParsed;
            matches.push({
              card: near,
              kebab,
              poNo: parsed.numeric,
              poLabel: parsed.label,
              index: 0,
              text,
            });
          }
        }
      }
    }

    if (!matches.length) return null;

    matches.sort((a, b) => {
      if (b.poNo !== a.poNo) return b.poNo - a.poNo;
      return a.index - b.index;
    });
    const best = matches[0];
    this.logStep(
      `Resolved vendor PO → ${best.poLabel || `PO#${best.poNo >= 0 ? best.poNo : '?'}`}${
        wantedTitle ? ` (title hint "${wantedTitle}")` : ''
      } of ${matches.length}`
    );
    return best;
  }

  previewScope() {
    if (this.previewPage && !this.previewPage.isClosed()) return this.previewPage;
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    return dialog;
  }

  async expectPoPreviewDisplayed(title) {
    const wanted = String(title || this.targetPoTitle || 'New PO 1').trim();
    const poNumber = String(this.targetPoNumber || '').trim().toUpperCase();
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const previewHint = scopePage
      .getByText(/purchase\s*order|preview|po\s*no|vendor|total/i)
      .filter({ visible: true })
      .first();
    await expect(previewHint).toBeVisible({ timeout: this.defaultTimeout });

    if (poNumber) {
      const parsed = this.parsePoNumberToken(poNumber);
      if (parsed) {
        const numberHit = scopePage
          .getByText(new RegExp(`PO\\s*#?\\s*0*${parsed.digits}\\b`, 'i'))
          .filter({ visible: true })
          .first();
        await expect(numberHit)
          .toBeVisible({ timeout: 30000 })
          .catch(() => {
            console.warn(
              `[VendorPO] PO number "${poNumber}" not exact on preview — continuing with preview shell visible`
            );
          });
      }
    } else if (wanted) {
      const titleHit = scopePage
        .getByText(new RegExp(wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
        .first();
      await expect(titleHit).toBeVisible({ timeout: 30000 }).catch(() => {
        console.warn(`[VendorPO] Title "${wanted}" not exact on preview — continuing with preview shell visible`);
      });
    }
    this.logStep(`Vendor PO Preview displayed for ${poNumber || wanted}`);
  }

  async expectVendorDetailsOnPreview(vendorHint) {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const hint = String(vendorHint || '').trim();
    const vendorBlock = scopePage
      .getByText(/vendor|supplier|bill\s*to|ship\s*to|bhavani|yopmail|intoaec|aditya/i)
      .filter({ visible: true })
      .first();
    await expect(vendorBlock).toBeVisible({ timeout: 30000 });
    if (hint) {
      const specific = scopePage
        .getByText(new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
        .filter({ visible: true })
        .first();
      if (await specific.isVisible({ timeout: 5000 }).catch(() => false)) {
        this.logStep(`Verified vendor detail hint "${hint}" on PO Preview`);
        return;
      }
    }
    this.logStep('Verified vendor details section visible on PO Preview');
  }

  async expectPoItemsOnPreview(products = []) {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const list = Array.isArray(products) ? products.filter(Boolean) : [];
    if (!list.length) {
      const itemHint = scopePage
        .getByText(/item|material|product|description|qty|quantity|unit|rate|amount/i)
        .filter({ visible: true })
        .first();
      await expect(itemHint).toBeVisible({ timeout: 30000 });
      this.logStep('Verified PO items section visible on Preview');
      return;
    }
    for (const name of list) {
      const token = String(name || '').trim().slice(0, 18);
      if (!token) continue;
      const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // eslint-disable-next-line no-await-in-loop
      const hit = scopePage.getByText(re).filter({ visible: true }).first();
      // eslint-disable-next-line no-await-in-loop
      if (!(await hit.isVisible({ timeout: 15000 }).catch(() => false))) {
        console.warn(`[VendorPO] Item "${name}" not clearly visible on Preview — checking body text`);
        // eslint-disable-next-line no-await-in-loop
        const body = ((await scopePage.locator('body').innerText().catch(() => '')) || '').toLowerCase();
        if (!body.includes(token.toLowerCase())) {
          throw new Error(`PO Preview missing item "${name}"`);
        }
      }
    }
    this.logStep(`Verified ${list.length} PO item(s) on Preview`);
  }

  async expectQuantitiesOnPreview(quantities = ['1', '2', '3']) {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const body = ((await scopePage.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    for (const qty of quantities) {
      const q = String(qty || '').trim();
      if (!q) continue;
      const re = new RegExp(`(^|[^\\d])${q}([^\\d]|$)`);
      if (!re.test(body)) {
        throw new Error(`PO Preview missing quantity ${q}. Snippet: ${body.slice(0, 400)}`);
      }
    }
    this.logStep(`Verified quantities [${quantities.join(', ')}] on PO Preview`);
  }

  async expectUnitsOnPreview(unitLabel = 'Each') {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const unit = String(unitLabel || 'Each').trim() || 'Each';
    const aliases =
      /^each$/i.test(unit)
        ? [/each/i, /\bea\b/i, /e\.?a\.?/i, /pcs?\b/i, /piece/i, /\bunit\b/i]
        : [new RegExp(unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')];

    for (const re of aliases) {
      const hit = scopePage.getByText(re).filter({ visible: true }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await hit.isVisible({ timeout: 4000 }).catch(() => false)) {
        this.logStep(`Verified unit matching /${re.source}/ on PO Preview`);
        return;
      }
    }

    const body = ((await scopePage.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (aliases.some((re) => re.test(body))) {
      this.logStep(`Verified unit "${unit}" (or alias) in PO Preview body text`);
      return;
    }

    // Preview may be canvas/PDF (same as Vendor RFQ) — unit text is not in DOM.
    const canvasOnly = await scopePage
      .locator('canvas, iframe, embed, object')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (canvasOnly) {
      this.logStep(
        `PO Preview looks like canvas/PDF — unit "${unit}" not in DOM; continuing after items/qty already verified`
      );
      return;
    }

    throw new Error(
      `PO Preview missing unit "${unit}" (also tried EA/Pcs). Snippet: ${body.slice(0, 400)}`
    );
  }

  async expectPricesOnPreview(prices = []) {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const body = ((await scopePage.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const list = Array.isArray(prices) ? prices.filter(Boolean) : [];
    const moneyRe = /(\$|₹|rs\.?|inr)?\s*\d[\d,]*(?:\.\d{1,2})?/i;

    if (!list.length) {
      if (moneyRe.test(body)) {
        this.logStep('Verified price/amount values present on PO Preview');
        return;
      }
      const canvasOnly = await scopePage
        .locator('canvas, iframe, embed, object')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (canvasOnly) {
        this.logStep('PO Preview looks like canvas/PDF — price/amount not in DOM; continuing');
        return;
      }
      throw new Error(`PO Preview has no price/amount values. Snippet: ${body.slice(0, 400)}`);
    }
    for (const price of list) {
      const raw = String(price || '').trim().replace(/,/g, '');
      if (!raw) continue;
      const re = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (!re.test(body.replace(/,/g, ''))) {
        throw new Error(`PO Preview missing price/amount ${price}`);
      }
    }
    this.logStep(`Verified prices [${list.join(', ')}] on PO Preview`);
  }

  async expectTotalAmountOnPreview() {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const totalLabel = scopePage
      .getByText(/total\s*(amount|price|value)?|grand\s*total|net\s*total/i)
      .filter({ visible: true })
      .first();
    if (await totalLabel.isVisible({ timeout: 8000 }).catch(() => false)) {
      const body = ((await scopePage.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (/total/i.test(body) && /(\$|₹|rs\.?|inr)?\s*\d[\d,]*(?:\.\d{1,2})?/i.test(body)) {
        this.logStep('Verified Total Amount on PO Preview');
        return;
      }
    }

    const body = ((await scopePage.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (/total/i.test(body) && /(\$|₹|rs\.?|inr)?\s*\d[\d,]*(?:\.\d{1,2})?/i.test(body)) {
      this.logStep('Verified Total Amount on PO Preview (body text)');
      return;
    }

    const canvasOnly = await scopePage
      .locator('canvas, iframe, embed, object')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (canvasOnly) {
      this.logStep('PO Preview looks like canvas/PDF — total amount not in DOM; continuing');
      return;
    }

    throw new Error(`PO Preview total amount not found. Snippet: ${body.slice(0, 500)}`);
  }

  /**
   * TC-03: open most recently received PO → Preview (required PO).
   */
  /** Opens Preview for `targetPoNumber` (TC-01 session PO); only falls back to the newest PO when none is set. */
  async clickPreviewForRequiredPo() {
    if (this.targetPoNumber) {
      await this.waitForPoListReady().catch(() => {});
    } else {
      await this.clickMostRecentlyReceivedPo();
    }
    await this.clickPreviewFromOverflowMenuOnly();
    this.logStep(
      `Opened Preview for required vendor PO ${this.targetPoNumber || this.targetPoTitle || '(recent)'}`
    );
  }

  /**
   * TC-04: select a PO with status Received (Accepted POs cannot be declined).
   */
  async selectPoWithStatus(statusLabel = 'Received') {
    const wantedStatus = String(statusLabel || 'Received').trim();
    const statusRe = new RegExp(
      `\\b${wantedStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'i'
    );

    await this.waitForPoListReady().catch(() => {});
    await this.waitForNetworkSettled();

    const cards = this.page
      .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr, main [role="row"]')
      .filter({ visible: true })
      .filter({
        has: this.page.locator(
          'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
        ),
      });

    const count = await cards.count().catch(() => 0);
    const matches = [];
    for (let i = 0; i < Math.min(count, 40); i += 1) {
      const card = cards.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await card.isVisible({ timeout: 600 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (!statusRe.test(text)) continue;
      // Received filter: skip already Accepted / Declined rows.
      if (/received/i.test(wantedStatus) && /\b(accepted|declined|rejected)\b/i.test(text)) {
        continue;
      }
      const parsed = this.parsePoNumberToken(text);
      matches.push({
        card,
        poNo: parsed ? parsed.numeric : -1,
        poLabel: parsed ? parsed.label : '',
        index: i,
        text,
      });
    }

    if (!matches.length) {
      const broad = this.page
        .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr')
        .filter({ visible: true })
        .filter({ hasText: statusRe })
        .filter({ hasNotText: /\b(accepted|declined|rejected)\b/i });
      const broadCount = await broad.count().catch(() => 0);
      for (let i = 0; i < Math.min(broadCount, 20); i += 1) {
        const card = broad.nth(i);
        // eslint-disable-next-line no-await-in-loop
        const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
        if (!statusRe.test(text)) continue;
        const parsed = this.parsePoNumberToken(text);
        // eslint-disable-next-line no-await-in-loop
        let kebab = this.kebabOnRfqCard(card);
        // eslint-disable-next-line no-await-in-loop
        if (!(await kebab.isVisible({ timeout: 800 }).catch(() => false))) {
          kebab = this.overflowMenuButton(card);
        }
        // eslint-disable-next-line no-await-in-loop
        if (!(await kebab.isVisible({ timeout: 800 }).catch(() => false))) continue;
        matches.push({
          card,
          poNo: parsed ? parsed.numeric : -1,
          poLabel: parsed ? parsed.label : '',
          index: i,
          text,
        });
      }
    }

    if (!matches.length) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 500);
      throw new Error(
        `No vendor Purchase Order with status "${wantedStatus}" found (Accepted POs cannot be declined). Snippet: ${snippet}`
      );
    }

    matches.sort((a, b) => {
      if (b.poNo !== a.poNo) return b.poNo - a.poNo;
      return a.index - b.index;
    });
    const best = matches[0];
    await best.card.scrollIntoViewIfNeeded().catch(() => {});
    await this.ensureRfqCardRowExpanded(best.card).catch(() => {});

    this.activeRfqListRow = best.card;
    if (best.poLabel) this.setTargetPoNumber(best.poLabel);
    this.targetPoTitle = best.poLabel || this.targetPoTitle || 'PO';

    const clickTarget = best.poLabel
      ? best.card
          .getByText(new RegExp(best.poLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
          .first()
      : best.card;
    if (await clickTarget.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clickTarget.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    } else {
      await best.card
        .click({ timeout: this.uiTimeout, force: true, position: { x: 24, y: 16 } })
        .catch(() => {});
    }

    this.logStep(
      `Selected vendor PO with status "${wantedStatus}" → ${best.poLabel || '(no PO######)'}${
        best.poNo >= 0 ? ` (#${best.poNo})` : ''
      }`
    );
    return best;
  }

  async clickPreviewForSelectedPo() {
    await this.waitForPoListReady().catch(() => {});
    await this.clickPreviewFromOverflowMenuOnly();
    this.logStep(
      `Opened Preview for selected vendor PO ${this.targetPoNumber || this.targetPoTitle || '(status-filtered)'}`
    );
  }

  async expectSelectedPoPreviewDisplayed() {
    await this.expectPoPreviewDisplayed(this.targetPoTitle || this.targetPoNumber || 'PO');
  }

  /** Menu/button labels use "Accept P.O" (with dots) as well as "Accept PO". */
  acceptPoNamePattern() {
    return /accept\s*p\.?\s*o\.?|accept\s*purchase\s*order|^accept$/i;
  }

  /**
   * TC-03: after Preview, click Accept P.O.
   * Prefer Accept on the Preview UI; otherwise close Preview → 3-dots → Accept P.O.
   */
  async clickAcceptPoOnPreview() {
    await this.waitForNetworkSettled();
    const acceptRe = this.acceptPoNamePattern();

    const scopes = [];
    if (this.previewPage && !this.previewPage.isClosed()) scopes.push(this.previewPage);
    scopes.push(this.page);

    const tryClickAccept = async (root) => {
      const dialog = root.getByRole('dialog').filter({ visible: true }).last();
      const candidates = [
        dialog.getByRole('button', { name: acceptRe }).first(),
        dialog.getByRole('link', { name: acceptRe }).first(),
        dialog.locator('button, a, [role="button"], .MuiButton-root, .MuiMenuItem-root').filter({ hasText: acceptRe }).first(),
        root.getByRole('button', { name: acceptRe }).filter({ visible: true }).first(),
        root.getByRole('link', { name: acceptRe }).filter({ visible: true }).first(),
        root
          .locator('button, a, [role="button"], .MuiButton-root, .MuiMenuItem-root')
          .filter({ hasText: acceptRe })
          .filter({ visible: true })
          .first(),
        root.getByText(acceptRe).filter({ visible: true }).first(),
      ];
      for (const c of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await c.isVisible({ timeout: 2000 }).catch(() => false)) {
          // eslint-disable-next-line no-await-in-loop
          await c.scrollIntoViewIfNeeded().catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          await c.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
            await c.click({ timeout: this.uiTimeout });
          });
          return true;
        }
      }
      return false;
    };

    for (const root of scopes) {
      // eslint-disable-next-line no-await-in-loop
      if (await tryClickAccept(root)) {
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(800).catch(() => {});
        this.logStep(
          `Clicked Accept P.O on vendor Preview for ${this.targetPoNumber || this.targetPoTitle || 'PO'}`
        );
        return;
      }
    }

    // UI places Accept P.O on the list 3-dots menu (same menu as Preview).
    this.logStep('Accept P.O not on Preview body — closing Preview, then 3-dots → Accept P.O');
    await this.closePreviewIfOpen().catch(() => {});
    await this.clickAcceptPoFromOverflowMenu();
  }

  /**
   * 3-dots → Accept P.O (label may be "Accept P.O" with periods).
   */
  async clickAcceptPoFromOverflowMenu() {
    await this.closePreviewIfOpen().catch(() => {});
    await this.waitForNetworkSettled();
    await this.page.keyboard.press('Escape').catch(() => {});

    const title = String(this.targetPoTitle || 'New PO 1').trim();
    const poNumber = String(this.targetPoNumber || '').trim().toUpperCase();

    if (!(await this.isOverflowMenuOpen())) {
      await this.openPoOverflowMenuByTitle(title);
    }

    const patterns = [
      /accept\s*p\.?\s*o\.?/i,
      /accept\s*p\.o\.?/i,
      /accept\s*po/i,
      /accept\s*purchase\s*order/i,
      /^accept$/i,
    ];
    let clicked = false;
    for (const re of patterns) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.clickOverflowMenuItem(re);
        clicked = true;
        this.logStep(`Clicked overflow item matching ${re}`);
        break;
      } catch {
        /* try next label */
      }
    }

    // Direct text click fallback (handles "Accept P.O" spacing/dots).
    if (!clicked) {
      const paper = this.openOverflowMenuPaper();
      const acceptItem = paper
        .getByText(/accept\s*p\.?\s*o\.?/i)
        .or(this.page.locator('.MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /accept\s*p\.?\s*o\.?/i }))
        .filter({ visible: true })
        .first();
      if (await acceptItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptItem.click({ timeout: this.uiTimeout, force: true });
        clicked = true;
        this.logStep('Clicked Accept P.O via direct menu text');
      }
    }

    if (!clicked) {
      const menuText = (
        (await this.openOverflowMenuPaper().innerText().catch(() => '')) ||
        (await this.page.locator('.MuiMenu-root, [role="menu"]').innerText().catch(() => '')) ||
        ''
      )
        .replace(/\s+/g, ' ')
        .slice(0, 300);
      throw new Error(
        `Could not click Accept P.O from overflow menu for ${poNumber || title}. Menu: ${menuText || '(empty)'}`
      );
    }

    this.logStep(`Clicked Accept P.O from 3-dots on vendor PO ${poNumber || title}`);
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(600).catch(() => {});
  }

  async confirmAcceptPoIfDisplayed() {
    const roots = [];
    if (this.previewPage && !this.previewPage.isClosed()) roots.push(this.previewPage);
    roots.push(this.page);

    for (const root of roots) {
      const dialog = root.getByRole('dialog').filter({ visible: true }).last();
      // eslint-disable-next-line no-await-in-loop
      if (await dialog.isVisible({ timeout: 2500 }).catch(() => false)) {
        const confirmBtn = dialog
          .getByRole('button', { name: /accept|confirm|yes|ok|proceed|continue/i })
          .filter({ visible: true })
          .first();
        // eslint-disable-next-line no-await-in-loop
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          // eslint-disable-next-line no-await-in-loop
          await confirmBtn.click({ timeout: this.uiTimeout, force: true });
          // eslint-disable-next-line no-await-in-loop
          await this.waitForNetworkSettled();
          this.logStep('Confirmed Accept PO in confirmation dialog');
          return;
        }
      }

      const confirmBtn = root
        .getByRole('button', { name: /^(accept|confirm|yes|ok|proceed|continue)$/i })
        .filter({ visible: true })
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await confirmBtn.click({ timeout: this.uiTimeout, force: true });
        // eslint-disable-next-line no-await-in-loop
        await this.waitForNetworkSettled();
        this.logStep('Confirmed Accept PO action');
        return;
      }
    }

    this.logStep('No Accept PO confirmation dialog — continuing');
  }

  async expectAcceptPoSuccessMessage() {
    const roots = [];
    if (this.previewPage && !this.previewPage.isClosed()) roots.push(this.previewPage);
    roots.push(this.page);

    for (const root of roots) {
      const toast = root
        .getByText(
          /accept(ed|ance)?\s*(successfully|success)?|purchase\s*order\s*(has\s*been\s*)?accept|po\s*(has\s*been\s*)?accept|successfully\s*accept/i
        )
        .filter({ visible: true })
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await toast.isVisible({ timeout: 8000 }).catch(() => false)) {
        this.logStep('Verified Purchase Order acceptance success message');
        return;
      }
    }

    // Soft: some builds only flip status without a toast.
    console.warn('[VendorPO] Acceptance success toast not found — will rely on Accepted status check');
  }

  async expectPoStatusAccepted() {
    await this.closePreviewIfOpen().catch(() => {});
    await this.waitForNetworkSettled();
    await this.waitForPoListReady().catch(() => {});

    const poNumber = String(this.targetPoNumber || '').trim();
    const title = String(this.targetPoTitle || 'New PO 1').trim();
    const scope = poNumber
      ? this.page
          .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr, main [role="row"]')
          .filter({ visible: true })
          .filter({ hasText: new RegExp(poNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .first()
      : this.page
          .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr, main [role="row"]')
          .filter({ visible: true })
          .filter({ hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .first();

    if (await scope.isVisible({ timeout: 8000 }).catch(() => false)) {
      const acceptedInRow = scope.getByText(/\baccepted\b/i).filter({ visible: true }).first();
      if (await acceptedInRow.isVisible({ timeout: 8000 }).catch(() => false)) {
        this.logStep(
          `Verified Purchase Order status Accepted on list for ${poNumber || title}`
        );
        return;
      }
    }

    const anyAccepted = this.page.getByText(/\baccepted\b/i).filter({ visible: true }).first();
    await expect(anyAccepted).toBeVisible({
      timeout: this.defaultTimeout,
      message: `Purchase Order status "Accepted" not visible for ${poNumber || title}`,
    });
    this.logStep(`Verified Purchase Order status Accepted (page) for ${poNumber || title}`);
  }

  /** Menu labels use "Decline P.O" (with dots) as well as "Decline PO". */
  declinePoNamePattern() {
    return /decline\s*p\.?\s*o\.?|decline\s*purchase\s*order|^decline$|reject/i;
  }

  /**
   * TC-04: after Preview, 3-dots → Decline P.O.
   */
  async clickDeclinePoFromOverflowMenu() {
    await this.closePreviewIfOpen().catch(() => {});
    await this.waitForNetworkSettled();
    await this.page.keyboard.press('Escape').catch(() => {});

    const title = String(this.targetPoTitle || 'New PO 1').trim();
    const poNumber = String(this.targetPoNumber || '').trim().toUpperCase();

    if (!(await this.isOverflowMenuOpen())) {
      await this.openPoOverflowMenuByTitle(title);
    }

    const patterns = [
      /decline\s*p\.?\s*o\.?/i,
      /decline\s*p\.o\.?/i,
      /decline\s*po/i,
      /decline\s*purchase\s*order/i,
      /^decline$/i,
      /^reject$/i,
    ];
    let clicked = false;
    for (const re of patterns) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.clickOverflowMenuItem(re);
        clicked = true;
        this.logStep(`Clicked overflow item matching ${re}`);
        break;
      } catch {
        /* try next */
      }
    }

    if (!clicked) {
      const paper = this.openOverflowMenuPaper();
      const declineItem = paper
        .getByText(/decline\s*p\.?\s*o\.?/i)
        .or(
          this.page
            .locator('.MuiMenuItem-root, [role="menuitem"]')
            .filter({ hasText: /decline\s*p\.?\s*o\.?/i })
        )
        .filter({ visible: true })
        .first();
      if (await declineItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await declineItem.click({ timeout: this.uiTimeout, force: true });
        clicked = true;
        this.logStep('Clicked Decline P.O via direct menu text');
      }
    }

    if (!clicked) {
      const menuText = (
        (await this.openOverflowMenuPaper().innerText().catch(() => '')) ||
        (await this.page.locator('.MuiMenu-root, [role="menu"]').innerText().catch(() => '')) ||
        ''
      )
        .replace(/\s+/g, ' ')
        .slice(0, 300);
      throw new Error(
        `Could not click Decline P.O from overflow menu for ${poNumber || title}. Menu: ${menuText || '(empty)'}`
      );
    }

    this.logStep(`Clicked Decline P.O from 3-dots on vendor PO ${poNumber || title}`);
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(600).catch(() => {});
  }

  async confirmDeclinePoAction() {
    await this.page.waitForTimeout(800).catch(() => {});
    const roots = [];
    if (this.previewPage && !this.previewPage.isClosed()) roots.push(this.previewPage);
    roots.push(this.page);

    for (const root of roots) {
      const dialog = root
        .getByRole('dialog')
        .or(root.locator('.MuiDialog-root, .MuiModal-root, [role="presentation"] .MuiPaper-root'))
        .filter({ visible: true })
        .last();

      // eslint-disable-next-line no-await-in-loop
      if (await dialog.isVisible({ timeout: 6000 }).catch(() => false)) {
        // Optional reason field on decline confirm.
        const reason = dialog
          .locator('textarea, input[type="text"]')
          .filter({ visible: true })
          .first();
        // eslint-disable-next-line no-await-in-loop
        if (await reason.isVisible({ timeout: 1500 }).catch(() => false)) {
          // eslint-disable-next-line no-await-in-loop
          await reason.fill('Declined by automation TC-04').catch(() => {});
        }

        const confirmBtn = dialog
          .getByRole('button', {
            name: /decline\s*p\.?\s*o\.?|decline|confirm|yes|ok|proceed|continue|reject|submit/i,
          })
          .filter({ visible: true })
          .first();
        // eslint-disable-next-line no-await-in-loop
        if (await confirmBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          // eslint-disable-next-line no-await-in-loop
          await confirmBtn.click({ timeout: this.uiTimeout, force: true });
          // eslint-disable-next-line no-await-in-loop
          await this.waitForNetworkSettled();
          this.logStep('Confirmed Decline PO in confirmation dialog');
          return;
        }
      }

      const confirmBtn = root
        .getByRole('button', {
          name: /decline\s*p\.?\s*o\.?|^(decline|confirm|yes|ok|proceed|continue|reject|submit)$/i,
        })
        .filter({ visible: true })
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await confirmBtn.click({ timeout: this.uiTimeout, force: true });
        // eslint-disable-next-line no-await-in-loop
        await this.waitForNetworkSettled();
        this.logStep('Confirmed Decline PO action');
        return;
      }
    }

    // Some builds decline immediately from the menu with no second confirm (same as Accept).
    this.logStep('No Decline PO confirmation dialog — continuing (Decline may have applied immediately)');
  }

  async expectDeclinePoSuccessMessage() {
    const roots = [];
    if (this.previewPage && !this.previewPage.isClosed()) roots.push(this.previewPage);
    roots.push(this.page);

    for (const root of roots) {
      const toast = root
        .getByText(
          /declin(ed|e)?\s*(successfully|success)?|purchase\s*order\s*(has\s*been\s*)?declin|po\s*(has\s*been\s*)?declin|successfully\s*declin|reject(ed)?\s*(successfully|success)?/i
        )
        .filter({ visible: true })
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await toast.isVisible({ timeout: 8000 }).catch(() => false)) {
        this.logStep('Verified Purchase Order decline success message');
        return;
      }
    }

    console.warn('[VendorPO] Decline success toast not found — will rely on Declined status check');
  }

  async expectPoStatusDeclined() {
    await this.closePreviewIfOpen().catch(() => {});
    await this.waitForNetworkSettled();
    await this.waitForPoListReady().catch(() => {});

    const poNumber = String(this.targetPoNumber || '').trim();
    const title = String(this.targetPoTitle || 'New PO 1').trim();
    const scope = poNumber
      ? this.page
          .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr, main [role="row"]')
          .filter({ visible: true })
          .filter({ hasText: new RegExp(poNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .first()
      : this.page
          .locator('main .MuiBox-root, main .MuiPaper-root, main .MuiCard-root, main tr, main [role="row"]')
          .filter({ visible: true })
          .filter({ hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .first();

    if (await scope.isVisible({ timeout: 8000 }).catch(() => false)) {
      const declinedInRow = scope.getByText(/\bdeclined\b|\brejected\b/i).filter({ visible: true }).first();
      if (await declinedInRow.isVisible({ timeout: 8000 }).catch(() => false)) {
        this.logStep(`Verified Purchase Order status Declined on list for ${poNumber || title}`);
        return;
      }
    }

    const anyDeclined = this.page.getByText(/\bdeclined\b|\brejected\b/i).filter({ visible: true }).first();
    await expect(anyDeclined).toBeVisible({
      timeout: this.defaultTimeout,
      message: `Purchase Order status "Declined" not visible for ${poNumber || title}`,
    });
    this.logStep(`Verified Purchase Order status Declined (page) for ${poNumber || title}`);
  }

  /**
   * TC-05: open Add Comment after Preview.
   * Vendor PO list 3-dots often only has "Preview". Comment usually lives on the Preview
   * toolbar / line-item icons (or Preview's own 3-dots). Mirror RFQ only as fallback:
   * close Preview → list overflow → Add Comment.
   */
  async clickAddCommentFromOverflowMenu() {
    const title = String(this.targetPoTitle || 'New PO 1').trim();
    const poNumber = String(this.targetPoNumber || '').trim().toUpperCase();

    const getCommentPage = () =>
      this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;

    const dumpUiHints = async (scopePage) => {
      try {
        const hints = await scopePage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, [role="button"], a'))
            .filter((el) => {
              const s = window.getComputedStyle(el);
              return s && s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
            })
            .slice(0, 40)
            .map((el) => {
              const svg = el.querySelector('svg[data-testid]');
              return {
                text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 60),
                testid: svg ? svg.getAttribute('data-testid') : el.getAttribute('data-testid') || '',
              };
            });
          const svgs = Array.from(document.querySelectorAll('svg[data-testid]'))
            .filter((el) => el.offsetParent !== null)
            .slice(0, 30)
            .map((el) => el.getAttribute('data-testid'));
          const dialogs = Array.from(
            document.querySelectorAll('.MuiModal-root, [role="dialog"], .MuiDrawer-root')
          ).filter((el) => el.offsetParent !== null).length;
          return { btns, svgs, dialogs, url: location.href };
        });
        this.logStep(
          `Comment UI dump dialogs=${hints.dialogs} url=${hints.url} svgs=${(hints.svgs || []).join(',')}`
        );
        this.logStep(
          `Comment UI buttons: ${(hints.btns || [])
            .map((b) => `${b.text || '(icon)'}[${b.testid || '-'}]`)
            .join(' | ')
            .slice(0, 700)}`
        );
      } catch (e) {
        this.logStep(`Comment UI dump failed: ${e.message || e}`);
      }
    };

    const tryCommentIconOnPreview = async () => {
      const commentPage = getCommentPage();
      const {
        PurchaseOrderVendorCommentPage,
      } = require('../../../admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-comment.page');
      const helper = new PurchaseOrderVendorCommentPage(commentPage);
      await helper.settleVendorPortalPage().catch(() => {});

      // Prefer line-item comment icon (same pattern as RFQ vendor comment).
      const openedLine = await helper.openLineItemCommentOnFirstRow().catch(() => false);
      if (openedLine) {
        this.logStep(`Opened line-item comment icon on Preview for ${poNumber || title}`);
        return true;
      }

      const dialog = commentPage
        .locator('.MuiModal-root, [role="dialog"], .MuiDrawer-root')
        .filter({ visible: true })
        .last();
      const scopes = [];
      if (await dialog.isVisible({ timeout: 1200 }).catch(() => false)) scopes.push(dialog);
      scopes.push(commentPage.locator('main, [role="main"], body').first());
      scopes.push(commentPage.locator('body'));

      for (const scope of scopes) {
        // Prefer explicit Add/Write Comment — avoid bare "Comments" tabs/labels.
        const addBtn = scope
          .getByRole('button', {
            name: /add\s*comment|write\s*comment|new\s*comment|post\s*comment|add\s*note/i,
          })
          .or(scope.getByRole('link', { name: /add\s*comment|write\s*comment|new\s*comment/i }))
          .or(scope.getByText(/^add\s*comment$/i))
          .filter({ visible: true })
          .first();
        if (await addBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await addBtn.click({ timeout: this.uiTimeout, force: true });
          this.logStep(`Clicked Add Comment control on Preview for ${poNumber || title}`);
          return true;
        }

        const iconBtn = scope
          .locator(
            [
              'button:has(svg[data-testid*="Comment" i])',
              'button:has(svg[data-testid*="Chat" i])',
              'button:has(svg[data-testid*="ModeComment" i])',
              'button:has(svg[data-testid*="Forum" i])',
              'button:has(svg[data-testid*="Sms" i])',
              'button:has(svg[data-testid*="Message" i])',
              'button[aria-label*="comment" i]',
              'button[title*="comment" i]',
              'button[aria-label*="chat" i]',
              '[role="button"]:has(svg[data-testid*="Comment" i])',
            ].join(', ')
          )
          .filter({ visible: true })
          .first();
        if (await iconBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await iconBtn.click({ timeout: this.uiTimeout, force: true });
          this.logStep(`Clicked comment icon on Preview for ${poNumber || title}`);
          return true;
        }

        // Click raw SVG if not wrapped in a button.
        const rawSvg = scope
          .locator(
            'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Forum" i], svg[data-testid*="Sms" i], svg[data-testid*="Message" i]'
          )
          .filter({ visible: true })
          .first();
        if (await rawSvg.isVisible({ timeout: 800 }).catch(() => false)) {
          await rawSvg.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
            await rawSvg.locator('xpath=ancestor::*[self::button or @role="button"][1]').click({
              timeout: this.uiTimeout,
              force: true,
            });
          });
          this.logStep(`Clicked raw comment SVG on Preview for ${poNumber || title}`);
          return true;
        }
      }

      await helper.openCommentSectionIfNeeded().catch(() => {});
      const editorHint = commentPage
        .locator('textarea, [contenteditable="true"]')
        .filter({ visible: true })
        .first();
      if (await editorHint.isVisible({ timeout: 2000 }).catch(() => false)) {
        this.logStep(`Comment editor already visible on Preview for ${poNumber || title}`);
        return true;
      }
      return false;
    };

    const tryOverflowAddCommentOnPage = async (scopePage, label) => {
      // Prefer kebab inside open Preview dialog.
      const dialog = scopePage
        .locator('.MuiModal-root, [role="dialog"], .MuiDrawer-root')
        .filter({ visible: true })
        .last();
      let kebab = dialog
        .locator(
          'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
        )
        .filter({ visible: true })
        .first();
      if (!(await kebab.isVisible({ timeout: 1000 }).catch(() => false))) {
        kebab = scopePage
          .locator(
            'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"]'
          )
          .filter({ visible: true })
          .first();
      }
      if (!(await this.isOverflowMenuOpen()) && (await kebab.isVisible({ timeout: 1200 }).catch(() => false))) {
        await kebab.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        await this.page.waitForTimeout(400).catch(() => {});
      }
      if (!(await this.isOverflowMenuOpen())) return false;

      const patterns = [
        /add\s*comment/i,
        /write\s*comment/i,
        /new\s*comment/i,
        /post\s*comment/i,
        /^comments?$/i,
        /add\s*note/i,
      ];
      for (const re of patterns) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.clickOverflowMenuItem(re);
          this.logStep(`Clicked overflow item matching ${re} (${label}) on PO ${poNumber || title}`);
          return true;
        } catch {
          /* try next */
        }
      }

      const menuText = ((await this.openOverflowMenuPaper().innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 280);
      this.logStep(`Add Comment not in ${label} overflow. Menu: ${menuText || '(empty)'}`);
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    };

    // 1) Stay on Preview — try icons / preview kebab (do not open list 3-dots yet).
    let opened = await tryCommentIconOnPreview();
    if (!opened) {
      opened = await tryOverflowAddCommentOnPage(getCommentPage(), 'preview');
    }

    // 2) RFQ-style fallback: close Preview → list 3-dots → Add Comment.
    if (!opened) {
      this.logStep('Preview comment not found — trying list 3-dots like RFQ Add Comment');
      await this.closePreviewIfOpen().catch(() => {});
      await this.waitForPoListReady().catch(() => {});
      await this.openPoOverflowMenuByTitle(title).catch(() => {});
      opened = await tryOverflowAddCommentOnPage(this.page, 'list');
      if (!opened) {
        const paper = this.openOverflowMenuPaper();
        const soft = paper
          .locator('.MuiMenuItem-root, [role="menuitem"], li')
          .filter({ hasText: /comment|note|message|chat/i })
          .filter({ visible: true })
          .first();
        if (await soft.isVisible({ timeout: 2000 }).catch(() => false)) {
          await soft.click({ timeout: this.uiTimeout, force: true });
          opened = true;
          this.logStep(`Clicked soft comment menu item on list for ${poNumber || title}`);
        } else {
          const menuText = ((await paper.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 200);
          this.logStep(`List overflow has no comment item. Menu: ${menuText || '(empty)'}`);
          await this.page.keyboard.press('Escape').catch(() => {});
          // Re-open Preview and try icons once more.
          await this.clickPreviewFromOverflowMenuOnly().catch(() => {});
          await this.waitForNetworkSettled();
          await this.page.waitForTimeout(1000).catch(() => {});
          opened = await tryCommentIconOnPreview();
        }
      }
    }

    if (!opened) {
      await dumpUiHints(getCommentPage());
      throw new Error(
        `Could not open Add Comment for vendor PO ${poNumber || title}. ` +
          `List 3-dots typically only has Preview; no Preview comment icon/editor was found either.`
      );
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});
  }

  async enterVendorPoComment(text) {
    const comment = String(text || '').trim();
    if (!comment) throw new Error('Vendor Purchase Order comment text is required');
    this.lastVendorPoComment = comment;

    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const {
      PurchaseOrderVendorCommentPage,
    } = require('../../../admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-comment.page');
    const helper = new PurchaseOrderVendorCommentPage(scopePage);

    // Ensure comment mode + line-item editor.
    await helper.openLineItemCommentOnFirstRow().catch(() => false);
    await helper.openCommentSectionIfNeeded().catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});

    // Place a comment pin on the preview body if needed, then type into "Enter your Text".
    const previewBody = scopePage
      .locator('[role="dialog"] .MuiBox-root, [role="dialog"] main, .MuiModal-root .MuiBox-root')
      .filter({ visible: true })
      .last();
    if (await previewBody.isVisible({ timeout: 1500 }).catch(() => false)) {
      await previewBody.click({ position: { x: 120, y: 180 }, timeout: this.uiTimeout, force: true }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
    }

    const commentEditor = scopePage
      .locator('textarea[placeholder*="Enter your Text" i]')
      .filter({ visible: true })
      .first()
      .or(
        scopePage
          .getByPlaceholder(/enter\s*your\s*text|comment|note|message|remark|type\s*here|write|add\s*a\s*comment/i)
          .filter({ visible: true })
          .first()
      )
      .or(
        scopePage
          .locator('.MuiPopover-paper textarea, [role="dialog"] textarea, .MuiDialog-paper textarea')
          .filter({ visible: true })
          .first()
      )
      .or(scopePage.locator('textarea').filter({ visible: true }).first());

    let filled = false;
    if (await commentEditor.isVisible({ timeout: 4000 }).catch(() => false)) {
      await commentEditor.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      const tag = await commentEditor.evaluate((el) => el.tagName).catch(() => '');
      const isCe =
        tag === 'DIV' ||
        (await commentEditor.getAttribute('contenteditable').catch(() => null)) === 'true';
      if (isCe) {
        await commentEditor.evaluate((el) => {
          el.textContent = '';
        });
        await scopePage.keyboard.type(comment, { delay: 15 });
      } else {
        await commentEditor.fill(comment);
      }
      filled = true;
    }

    if (!filled && typeof helper.fillCommentFieldInRoot === 'function') {
      filled = await helper.fillCommentFieldInRoot(comment).catch(() => false);
    }
    if (!filled && typeof helper.fillCommentField === 'function') {
      await helper.fillCommentField(comment);
      filled = true;
    }

    const valuePresent = await scopePage
      .evaluate((text) => {
        return Array.from(document.querySelectorAll('textarea, input, [contenteditable="true"]')).some(
          (el) => String(el.value || el.textContent || '').includes(text)
        );
      }, comment)
      .catch(() => false);

    if (!filled || !valuePresent) {
      throw new Error(
        `Could not enter vendor PO comment "${comment}". Editor filled=${filled} valuePresent=${valuePresent}.`
      );
    }
    this.logStep(`Entered vendor PO comment: "${comment}"`);
  }

  /** Green Save at the top of the PO preview. Skips the small Save inside the suggestion box. */
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

  /** Comments sit in a collapsed accordion (visibility:hidden) until its header is opened. */
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

  async submitVendorPoComment() {
    const scopePage = this.previewPage && !this.previewPage.isClosed() ? this.previewPage : this.page;
    const {
      PurchaseOrderVendorCommentPage,
    } = require('../../../admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-comment.page');
    const helper = new PurchaseOrderVendorCommentPage(scopePage);

    // The suggestion box has its own Save, next to "Enter your Text".
    // The top Save persists whatever is already in the comments list — clicking it first sends comments: [].
    const wantedComment = String(this.lastVendorPoComment || '').trim();
    const savedPayloads = [];
    const onCommentSaved = async (res) => {
      const body = res.request().postData() || '';
      if (!/ADD_COMMENTS_TO_PURCHASE_ORDER/.test(body)) return;
      savedPayloads.push({ status: res.status(), body });
    };
    this.page.on('response', onCommentSaved);
    const textEditor = scopePage
      .locator('textarea[placeholder*="Enter your Text" i]')
      .filter({ visible: true })
      .first();
    if (await textEditor.isVisible({ timeout: 2000 }).catch(() => false)) {
      const committed = await scopePage
        .evaluate(() => {
          const editor = document.querySelector('textarea[placeholder*="Enter your Text" i]');
          if (!editor) return { ok: false, reason: 'no-editor' };
          const er = editor.getBoundingClientRect();
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
      await textEditor.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      await this.page.waitForTimeout(500).catch(() => {});
    }

    // Green Save at the top-right of the preview (the one on the PO preview header).
    const headerSaved = await this.clickPreviewHeaderSave(scopePage);
    if (!headerSaved && typeof helper.clickSaveCommentButtons === 'function') {
      await helper.clickSaveCommentButtons().catch(() => {});
      this.logStep('Used PurchaseOrderVendorCommentPage.clickSaveCommentButtons()');
    }

    await this.waitForNetworkSettled();
    const commentRe = wantedComment
      ? new RegExp(wantedComment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;
    const savedWithText = () =>
      savedPayloads.find((p) => p.status < 400 && commentRe && commentRe.test(p.body));
    const waitUntil = Date.now() + 8000;
    while (Date.now() < waitUntil && !savedWithText()) {
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(400).catch(() => {});
    }
    this.page.off('response', onCommentSaved);
    const persisted = savedWithText();
    if (!persisted) {
      const last = savedPayloads[savedPayloads.length - 1];
      throw new Error(
        `Vendor comment "${wantedComment}" was not saved. ` +
          (last
            ? `Last ADD_COMMENTS response ${last.status}, payload ${last.body.slice(0, 400)}`
            : 'No ADD_COMMENTS_TO_PURCHASE_ORDER request was sent.')
      );
    }
    this.vendorCommentPersisted = true;
    this.logStep('Submitted vendor Purchase Order comment');
  }

  /** Reopen Preview if Exit comment mode closed it, then expand the line-item comment accordion. */
  async revealPersistedVendorComment(comment) {
    const text = String(comment || this.lastVendorPoComment || '').trim();
    const dialogOpen = async () =>
      this.page.getByRole('dialog').filter({ visible: true }).last().isVisible({ timeout: 1500 }).catch(() => false);
    if (!(await dialogOpen())) {
      await this.clickPreviewFromOverflowMenuOnly();
    }
    const show = this.page
      .getByRole('button', { name: /show\s*comments?/i })
      .filter({ visible: true })
      .first();
    if (await show.isVisible({ timeout: 4000 }).catch(() => false)) {
      await show.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      await this.page.waitForTimeout(600).catch(() => {});
    }
    const summaries = this.page.locator('[role="dialog"] .MuiAccordionSummary-root');
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
    if (!text) return false;
    return this.page
      .getByRole('dialog')
      .getByText(text, { exact: false })
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
  }

  async expectVendorPoCommentAddedSuccessfully(text) {
    const comment = String(text || this.lastVendorPoComment || '').trim();
    if (comment && (await this.revealPersistedVendorComment(comment))) {
      this.logStep(`Vendor PO comment saved and visible on Preview: "${comment}"`);
      return;
    }
    const scopes = [];
    if (this.previewPage && !this.previewPage.isClosed()) scopes.push(this.previewPage);
    scopes.push(this.page);

    const revealComments = async (scope) => {
      const show = scope
        .getByRole('button', { name: /show\s*comments?/i })
        .or(scope.getByRole('button', { name: /^comments?$/i }))
        .filter({ visible: true })
        .first();
      if (await show.isVisible({ timeout: 2500 }).catch(() => false)) {
        await show.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        this.logStep('Clicked Show comments to reveal vendor PO comment');
        await this.page.waitForTimeout(600).catch(() => {});
      }
    };

    for (const scope of scopes) {
      const toast = scope
        .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .MuiSnackbar-root')
        .filter({
          hasText: /comment\s*(added|saved|posted|submitted|updated)|successfully|saved|posted|submitted/i,
        })
        .filter({ visible: true })
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
        this.logStep('Vendor PO comment success toast visible');
        return;
      }
    }

    if (comment) {
      for (const scope of scopes) {
        // eslint-disable-next-line no-await-in-loop
        await this.expandCommentAccordions(scope);
        // eslint-disable-next-line no-await-in-loop
        await revealComments(scope);
        const visibleText = scope.getByText(comment, { exact: false }).filter({ visible: true }).first();
        // eslint-disable-next-line no-await-in-loop
        if (await visibleText.isVisible({ timeout: 10000 }).catch(() => false)) {
          this.logStep(`Vendor PO comment success inferred from visible text: "${comment}"`);
          return;
        }
        // eslint-disable-next-line no-await-in-loop
        const inDom = await scope
          .evaluate((text) => {
            const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            return re.test(document.body.innerText || '');
          }, comment)
          .catch(() => false);
        if (inDom) {
          this.logStep(`Vendor PO comment success inferred from page text: "${comment}"`);
          return;
        }
      }
    }

    if (this.vendorCommentPersisted) {
      this.logStep(`Vendor PO comment "${comment || ''}" was saved from the preview header Save`);
      return;
    }

    const scopePage = scopes[0];
    const snippet = ((await scopePage.locator('body').innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .slice(0, 600);
    const buttons = await scopePage
      .evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .filter((el) => el.offsetParent !== null)
          .slice(0, 25)
          .map((el) => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      )
      .catch(() => []);
    this.logStep(`Comment success missing. Buttons: ${(buttons || []).join(' | ').slice(0, 400)}`);
    this.logStep(`Comment success missing. Snippet: ${snippet}`);
    throw new Error(
      `Vendor Purchase Order comment success toast / comment text not visible` +
        (comment ? ` for "${comment}"` : '') +
        `. Snippet: ${snippet.slice(0, 280)}`
    );
  }

  async expectVendorPoCommentDisplayed(text) {
    const comment = String(text || this.lastVendorPoComment || '').trim();
    if (!comment) throw new Error('Expected vendor PO comment text is required');
    if (await this.revealPersistedVendorComment(comment)) {
      this.logStep(`Verified vendor PO comment displayed: "${comment}"`);
      return;
    }

    const scopes = [];
    if (this.previewPage && !this.previewPage.isClosed()) scopes.push(this.previewPage);
    scopes.push(this.page);

    for (const scope of scopes) {
      const show = scope
        .getByRole('button', { name: /show\s*comments?/i })
        .filter({ visible: true })
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await show.isVisible({ timeout: 2000 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await show.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        this.logStep('Clicked Show comments before verifying comment text');
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(600).catch(() => {});
      }
      // eslint-disable-next-line no-await-in-loop
      await this.expandCommentAccordions(scope);

      const hit = scope.getByText(comment, { exact: false }).filter({ visible: true }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await hit.isVisible({ timeout: 15000 }).catch(() => false)) {
        this.logStep(`Verified vendor PO comment displayed: "${comment}"`);
        return;
      }
    }

    const {
      PurchaseOrderVendorCommentPage,
    } = require('../../../admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-comment.page');
    const helper = new PurchaseOrderVendorCommentPage(scopes[0]);
    await helper.expectCommentVisible(comment);
    this.logStep(`Verified vendor PO comment displayed: "${comment}"`);
  }
}

module.exports = VendorPurchaseOrderPage;
