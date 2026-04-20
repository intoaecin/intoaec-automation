const { expect } = require('@playwright/test');
const RFQComposePage = require('./rfq-compose.page');

/**
 * RFQ create/view: click Preview icon and validate the preview opens.
 * Kept minimal: only opens preview and asserts it is visible.
 */
class RfqPreviewPage extends RFQComposePage {
  previewOpenTimeout() {
    return Number(process.env.RFQ_PREVIEW_OPEN_TIMEOUT_MS) || 120000;
  }

  /**
   * Some builds open preview in a popup/new tab. When that happens we store the Page here.
   * @type {import('@playwright/test').Page | null}
   */
  previewPopupPage = null;
  /** @type {string | null} */
  previewOpenedFromUrl = null;
  /** @type {string | null} */
  previewOpenedForTitle = null;

  /**
   * Preview can be a full-screen dialog, or a routed page with embedded iframe/canvas.
   * This locator targets the most common procurement preview container shapes.
   */
  rfqPreviewContainer() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).first();
    const dialogWithContent = dialog.filter({
      has: this.page.locator('canvas, iframe').or(this.page.getByText(/rfq|request for quotation|preview/i)),
    });

    const routed = this.page
      .locator('main')
      .filter({ visible: true })
      .filter({
        has: this.page.locator('canvas, iframe').or(this.page.getByText(/rfq|request for quotation|preview/i)),
      })
      .first();

    return dialogWithContent.or(routed);
  }

  /**
   * On the RFQ list, each RFQ card shows an "open/preview" icon just left of the RFQ number
   * (looks like a small square-with-arrow / launch icon). This opens the preview/view.
   */
  rfqListCardForTitle(titleText) {
    const t = String(titleText || '').trim();
    if (!t) {
      return this.page.locator('main').first();
    }
    // RFQ list: nested MuiBox nodes can match the inner title strip first (no Expand inside).
    // Prefer the outer shell that also contains the row expand / collapse control.
    const base = this.page
      .locator('div.MuiBox-root.css-60kw0h, div.bg-white.p-2.MuiBox-root.css-60kw0h')
      .filter({ has: this.page.getByText(t, { exact: false }) })
      .filter({ visible: true });

    const withRowToggle = base.filter({
      has: this.page.getByRole('button', {
        name: /^(expand|collapse)$/i,
      }),
    });

    const withLooseToggle = base.filter({
      has: this.page.getByRole('button', {
        name: /expand|collapse|show more|view details|view more|see more|see details/i,
      }),
    });

    return withRowToggle
      .first()
      .or(withLooseToggle.first())
      .or(base.first());
  }

  /**
   * Visible "Expand" only — never chain with "Collapse" or a broad regex (strict-mode: 2+ matches).
   * @param {import('@playwright/test').Locator} card
   */
  expandOnlyButtonOnRfqCard(card) {
    return card.getByRole('button', { name: /^expand$/i }).filter({ visible: true }).first();
  }

  /**
   * Visible "Collapse" = row is already expanded (MUI text buttons).
   * @param {import('@playwright/test').Locator} card
   */
  collapseButtonOnRfqCard(card) {
    return card.getByRole('button', { name: /^collapse$/i }).filter({ visible: true }).first();
  }

  /**
   * Single click target to expand the RFQ row: text "Expand", else collapsed chevron.
   * @param {import('@playwright/test').Locator} card
   */
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
        has: card.locator(
          'svg[data-testid="ExpandMoreIcon"], svg[data-testid="KeyboardArrowDownIcon"]'
        ),
      })
      .filter({ visible: true })
      .first();
  }

  /**
   * Expands the RFQ list card row if needed. Uses only one button per action (Expand vs Collapse).
   * @param {import('@playwright/test').Locator} card
   */
  async ensureRfqCardRowExpanded(card) {
    const p = this.page;

    if (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 4000 }).catch(() => false)) {
      await p.waitForTimeout(150);
      return;
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 500 }).catch(() => false)) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      const target = await this.resolveRfqRowExpandClickTarget(card);
      // eslint-disable-next-line no-await-in-loop
      if (!(await target.isVisible({ timeout: 4000 }).catch(() => false))) {
        break;
      }

      const useForce = attempt >= 1;
      // eslint-disable-next-line no-await-in-loop
      await target.click({ timeout: 15000, force: useForce }).catch(async () => {
        await target.click({ timeout: 15000, force: true });
      });
      // eslint-disable-next-line no-await-in-loop
      await p.waitForTimeout(450);

      // eslint-disable-next-line no-await-in-loop
      if (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 2000 }).catch(() => false)) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      const box = await target.boundingBox().catch(() => null);
      if (box) {
        await p.mouse.click(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
        await p.waitForTimeout(350);
      }
    }

    await expect
      .poll(
        async () =>
          (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 600 }).catch(() => false)) ||
          !(await this.expandOnlyButtonOnRfqCard(card).isVisible({ timeout: 600 }).catch(() => false)),
        { timeout: 20000, intervals: [200, 400, 700, 1200] }
      )
      .toBe(true);
  }

  locatorOpenPreviewIconWithinCard(card) {
    const launchSvg =
      'svg[data-testid="LaunchIcon"], svg[data-testid*="OpenInNew" i], svg[data-testid*="OpenInNewOutlined" i], svg[data-testid*="NorthEast" i], svg[data-testid*="ArrowOutward" i]';
    const docSvg =
      'svg[data-testid*="Description" i], svg[data-testid*="InsertDriveFile" i], svg[data-testid*="Article" i], svg[data-testid*="TextSnippet" i]';

    // Prefer "launch/open in new" icon (matches your screenshot), fallback to document icon.
    const icon = card.locator(`${launchSvg}, ${docSvg}`).filter({ visible: true }).first();
    return icon.locator('xpath=ancestor::a[1] | xpath=ancestor::button[1]');
  }

  rfqListFirstCard() {
    return this.page
      .locator('div.MuiBox-root.css-60kw0h, div.bg-white.p-2.MuiBox-root.css-60kw0h')
      .filter({ visible: true })
      .first();
  }

  async resolveCreatedRfqCard() {
    const createdTitle = process.env.RFQ_PREVIEW_TITLE || 'RFQ preview flow';
    const byTitle = this.rfqListCardForTitle(createdTitle);
    if (await byTitle.isVisible({ timeout: 4000 }).catch(() => false)) {
      return byTitle;
    }
    return this.rfqListFirstCard();
  }

  async expandRfqCard(card) {
    await this.ensureRfqCardRowExpanded(card);
  }

  /**
   * Kebab on RFQ list cards (MoreVert / MoreHoriz / aria-label variants).
   * @param {import('@playwright/test').Locator} card
   */
  kebabButtonOnRfqCard(card) {
    const vert = card
      .locator('button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"])')
      .filter({ visible: true })
      .first();
    const byRole = card
      .getByRole('button', { name: /more options|open menu|menu|show more/i })
      .filter({ visible: true })
      .first();
    const byAria = card
      .locator('button[aria-label*="more" i], button[title*="more" i]')
      .filter({ visible: true })
      .first();
    return vert.or(byRole).or(byAria);
  }

  /**
   * MUI menus often port to `body`; items may be `li` without passing strict `visible` filters on `menuitem`.
   */
  async isRfqCardOverflowMenuOpen() {
    const p = this.page;

    const menuitemVisible = await p
      .getByRole('menuitem')
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (menuitemVisible) return true;

    const optionVisible = await p
      .getByRole('option')
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (optionVisible) return true;

    let paper = p.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();
    if (!(await paper.isVisible({ timeout: 800 }).catch(() => false))) {
      paper = p.locator('.MuiMenu-paper').filter({ visible: true }).last();
    }
    if (!(await paper.isVisible({ timeout: 600 }).catch(() => false))) {
      return false;
    }

    const listRow = paper.locator('ul[role="menu"] li, ul.MuiList-root li, li[role="menuitem"]').first();
    if (await listRow.isVisible({ timeout: 1200 }).catch(() => false)) {
      return true;
    }

    return paper
      .getByText(/preview|send reminder|send email|compose|edit|delete|download|cancel|duplicate/i)
      .first()
      .isVisible({ timeout: 800 })
      .catch(() => false);
  }

  async openThreeDotMenuInExpandedRfqCard(card) {
    const p = this.page;

    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers();
    await expect(p.locator('.MuiModal-root').filter({ visible: true }))
      .toHaveCount(0, { timeout: 20000 })
      .catch(() => {});

    await card.scrollIntoViewIfNeeded().catch(() => {});

    let kebab = this.kebabButtonOnRfqCard(card);
    if (!(await kebab.isVisible({ timeout: 2500 }).catch(() => false))) {
      await this.expandRfqCard(card);
      await p.waitForTimeout(400);
      kebab = this.kebabButtonOnRfqCard(card);
    }

    await expect(kebab).toBeVisible({ timeout: 45000 });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (attempt > 0) {
        await p.keyboard.press('Escape').catch(() => {});
        await p.waitForTimeout(280);
        await this.dismissOpenMenusAndPopovers();
        await this.dismissVisibleToastNotifications().catch(() => {});
      }

      await kebab.scrollIntoViewIfNeeded().catch(() => {});
      const useForce = attempt >= 1;
      // eslint-disable-next-line no-await-in-loop
      await kebab.click({ timeout: 15000, force: useForce }).catch(async () => {
        await kebab.click({ timeout: 15000, force: true });
      });
      // eslint-disable-next-line no-await-in-loop
      await p.waitForTimeout(useForce ? 450 : 250);

      // eslint-disable-next-line no-await-in-loop
      if (await this.isRfqCardOverflowMenuOpen()) {
        await p.waitForTimeout(120);
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      const box = await kebab.boundingBox();
      if (box) {
        await p.mouse.click(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
        await p.waitForTimeout(400);
        // eslint-disable-next-line no-await-in-loop
        if (await this.isRfqCardOverflowMenuOpen()) {
          await p.waitForTimeout(120);
          return;
        }
      }
    }

    await expect
      .poll(async () => this.isRfqCardOverflowMenuOpen(), {
        timeout: 25000,
        intervals: [100, 200, 350, 500, 800],
      })
      .toBe(true);
    await p.waitForTimeout(120);
  }

  async clickPreviewInThreeDotMenu() {
    const previewItem = this.page
      .getByRole('menuitem', { name: /^preview$/i })
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .getByRole('menuitem')
          .filter({ visible: true })
          .filter({ hasText: /preview/i })
          .first()
      )
      .or(
        this.page
          .getByRole('option', { name: /^preview$/i })
          .filter({ visible: true })
          .first()
      )
      .or(this.page.getByText(/^preview$/i).filter({ visible: true }).first());

    await expect(previewItem).toBeVisible({ timeout: 30000 });
    await previewItem.click({ timeout: 15000, force: true });
  }

  async clickPreviewIconOnRfqPage() {
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    // After compose-send redirect, ensure the RFQ list card is present (sometimes we stay on edit/create briefly).
    const createdTitle = process.env.RFQ_PREVIEW_TITLE || 'RFQ preview flow';
    const listCardQuery = this.page
      .locator('div.MuiBox-root.css-60kw0h, div.bg-white.p-2.MuiBox-root.css-60kw0h')
      .filter({ has: this.page.getByText(createdTitle, { exact: false }) });

    await expect
      .poll(async () => listCardQuery.filter({ visible: true }).count(), {
        timeout: this.previewOpenTimeout(),
        intervals: [150, 250, 400, 700, 1000, 1500],
      })
      .toBeGreaterThan(0);

    // Click the preview icon within the created RFQ card (fallback to first card if title match is flaky).
    const createdCard = await this.resolveCreatedRfqCard();
    await expect(createdCard).toBeVisible({ timeout: 60000 });

    const beforeUrl = this.page.url();
    this.previewOpenedFromUrl = beforeUrl;
    this.previewOpenedForTitle = createdTitle;

    await this.openThreeDotMenuInExpandedRfqCard(createdCard);
    await this.clickPreviewInThreeDotMenu();

    // Preview can open either:
    // - as a full-page route change (URL changes), OR
    // - as an in-page fullscreen dialog (URL stays the same)
    // Treat either as success.
    await expect
      .poll(
        async () => {
          const urlChanged = this.page.url() !== beforeUrl;
          const dialogVisible = await this.rfqPreviewContainer()
            .isVisible({ timeout: 1000 })
            .catch(() => false);
          const downloadVisible = await this.page
            .locator("button[aria-label='Download as PDF']")
            .filter({ visible: true })
            .first()
            .isVisible({ timeout: 1000 })
            .catch(() => false);
          return urlChanged || dialogVisible || downloadVisible;
        },
        { timeout: this.previewOpenTimeout() }
      )
      .toBe(true);
  }

  async expectRfqPreviewLoaded() {
    // Same-page outcomes:
    // 1) full-screen dialog with iframe/canvas/text
    // 2) routed view (URL changes) showing RFQ content
    const root = this.rfqPreviewContainer();
    const rootVisible = await root.isVisible({ timeout: 3000 }).catch(() => false);
    if (rootVisible) {
      await expect(root).toBeVisible({ timeout: this.previewOpenTimeout() });
      await expect(
        root
          .locator('canvas, iframe')
          .first()
          .or(root.getByText(/rfq|request for quotation|preview/i).first())
      ).toBeVisible({ timeout: 60000 });
      return;
    }

    // Fallback: wait for a route change away from the list.
    await expect
      .poll(async () => this.page.url(), { timeout: this.previewOpenTimeout() })
      .not.toMatch(/\/rfq(\?|$)|\/procurement\b/i);

    // And ensure some RFQ-specific content is visible.
    await expect(
      this.page
        .locator('main')
        .filter({ visible: true })
        .getByText(/rfq|request for quotation|RFQ0+/i)
        .first()
    ).toBeVisible({ timeout: 60000 });
  }

  /**
   * After `expectRfqPreviewLoaded()`, use this root for toolbar/line clicks.
   * `rfqPreviewContainer()` can be false when RFQ body lives only inside an iframe
   * (no matching text/canvas in the outer `main` filter), which must not trigger
   * a second "open preview from list" flow while already on the preview route.
   */
  async resolveRfqPreviewInteractionRoot() {
    const boxed = this.rfqPreviewContainer();
    if (await boxed.isVisible({ timeout: 5000 }).catch(() => false)) {
      return boxed;
    }

    const downloadPdf = this.page
      .locator("button[aria-label='Download as PDF']")
      .filter({ visible: true })
      .first();
    if (await downloadPdf.isVisible({ timeout: 4000 }).catch(() => false)) {
      return this.page.locator('body');
    }

    const main = this.page.locator('main').filter({ visible: true }).first();
    if (await main.isVisible({ timeout: 4000 }).catch(() => false)) {
      return main;
    }

    return this.page.locator('body');
  }

  async closeRfqPreview() {
    await this.waitForNetworkSettled();

    const root = this.rfqPreviewContainer();
    const rootVisible = await root.isVisible({ timeout: 3000 }).catch(() => false);
    const currentUrl = this.page.url();
    const fromUrl = this.previewOpenedFromUrl;
    const navigatedAwayFromSource = !!fromUrl && currentUrl !== fromUrl;
    const dialogRootVisible = await this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page
          .locator('canvas, iframe')
          .or(this.page.getByText(/rfq|request for quotation|preview/i)),
      })
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);

    const tryClick = async (loc) => {
      const el = loc.first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.click({ timeout: 15000 }).catch(async () => {
          await el.click({ timeout: 15000, force: true });
        });
        return true;
      }
      return false;
    };

    // If preview changed the route, handle it as a routed page even when main content is visible.
    // Waiting for `main` to hide here causes the long hang you observed.
    if (rootVisible && !navigatedAwayFromSource && dialogRootVisible) {
      const closeCandidates = [
        root.locator('button:has(svg[data-testid="CloseIcon"])'),
        root.locator('button:has(svg[data-testid="ArrowBackIcon"])'),
        root.locator('button:has(svg[data-testid="ChevronLeftIcon"])'),
        root.getByRole('button', { name: /^close$/i }),
        root.getByRole('button', { name: /back/i }),
        root.locator('button[aria-label*="close" i]'),
        root.locator('button[aria-label*="back" i]'),
        root.locator('header button').first(),
      ];

      for (const loc of closeCandidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await tryClick(loc)) {
          break;
        }
      }

      await expect(root).toBeHidden({ timeout: 60000 }).catch(async () => {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(250);
        await expect(root).toBeHidden({ timeout: 30000 });
      });
      return;
    }

    // Routed preview (full page): try a Back control, else browser back.
    const backCandidates = [
      this.page.getByRole('button', { name: /back/i }).filter({ visible: true }),
      this.page.getByRole('link', { name: /back/i }).filter({ visible: true }),
      this.page.locator('button:has(svg[data-testid="ArrowBackIcon"])').filter({ visible: true }),
      this.page.locator('button:has(svg[data-testid="ChevronLeftIcon"])').filter({ visible: true }),
      this.page.locator('a[aria-label*="back" i], button[aria-label*="back" i]').filter({ visible: true }),
    ];
    for (const loc of backCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await tryClick(loc)) {
        // Wait until we are back on the RFQ list (or at least the card list is visible).
        const title = this.previewOpenedForTitle || process.env.RFQ_PREVIEW_TITLE || 'RFQ preview flow';
        const listCardQuery = this.page
          .locator('div.MuiBox-root.css-60kw0h, div.bg-white.p-2.MuiBox-root.css-60kw0h')
          .filter({ has: this.page.getByText(title, { exact: false }) });
        await expect(listCardQuery.first()).toBeVisible({ timeout: 60000 }).catch(() => {});
        return;
      }
    }

    if (fromUrl) {
      await this.page.goBack({ timeout: 60000 }).catch(() => {});
      await expect
        .poll(async () => this.page.url(), { timeout: 60000 })
        .toBe(fromUrl)
        .catch(() => {});
    } else {
      await this.page.goBack({ timeout: 60000 }).catch(() => {});
    }

    // Final guard: ensure RFQ list is visible again.
    const title = this.previewOpenedForTitle || process.env.RFQ_PREVIEW_TITLE || 'RFQ preview flow';
    const listCardQuery = this.page
      .locator('div.MuiBox-root.css-60kw0h, div.bg-white.p-2.MuiBox-root.css-60kw0h')
      .filter({ has: this.page.getByText(title, { exact: false }) });
    await expect(listCardQuery.first()).toBeVisible({ timeout: 60000 });
  }
}

module.exports = RfqPreviewPage;

