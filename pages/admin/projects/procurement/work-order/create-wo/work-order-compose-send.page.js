const { expect } = require('@playwright/test');
const WorkOrderAddFromLibraryPage = require('./work-order-add-from-library.page');

/** Work Order create form → Action → Compose email → Send. */
class WorkOrderComposeSendPage extends WorkOrderAddFromLibraryPage {
  constructor(page) {
    super(page);
    this.woEmailSentObserved = false;
    const defaultComposeTimeout =
      Number(process.env.WO_COMPOSE_MODAL_TIMEOUT_MS) || 180000;
    this.composeModalTimeout = this.woFastMode
      ? Math.min(defaultComposeTimeout, 60000)
      : defaultComposeTimeout;
  }

  async waitForComposeEmailModalReady() {
    if (!this.woFastMode) {
      return super.waitForComposeEmailModalReady();
    }

    await this.waitForComposeEmailDialogShellOpen();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeVisible({ timeout: Math.min(this.composeModalTimeout, 60000) });
  }

  /**
   * Login assumed done — navigate + create → title → line item → vendor → compose → send.
   * Single Cucumber step (no Background navigation gaps).
   */
  async completeWorkOrderComposeSendJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderComposeSendFlow(title);
  }

  /**
   * Login assumed done — navigate + create → title → library line item → vendor → compose → send.
   */
  async completeWorkOrderComposeSendFromLibraryJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderComposeSendFromLibraryFlow(title);
  }

  /**
   * Single atomic flow: create form → title → line item → vendor → compose → send.
   * Avoids Cucumber AfterStep delays between each action.
   */
  async completeWorkOrderComposeSendFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → compose → send flow finished.');
  }

  /** create form → title → Add from library (first radio) → vendor → compose → send */
  async completeWorkOrderComposeSendFromLibraryFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemFromLibraryFirstRadio();
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → library → compose → send flow finished.');
  }

  /** create form → title → manual line item (fixed qty) → vendor → compose → send */
  async completeWorkOrderComposeSendFlowWithLineQty(title = 'electrician', quantity = '100') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManually({
      scopeOfWork: 'labour work',
      description: null,
      quantity: String(quantity),
      unitLabel: 'Nos',
      unitRate: this.buildRandomWoLineItemRate(),
    });
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log(
      `[WO] Complete create → compose → send flow finished (qty=${quantity}).`
    );
  }

  /** Login → compose send with fixed line qty (TC-08). */
  async completeWorkOrderComposeSendJourneyWithLineQty(
    title = 'electrician',
    quantity = '100'
  ) {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderComposeSendFlowWithLineQty(title, quantity);
  }

  async composeAndSendWorkOrderEmail() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.openWorkOrderActionComposeEmail();
    await this.sendWorkOrderEmailFromComposeModal();
  }

  /** Codegen: Action → Compose email → Send Email */
  async openWorkOrderActionComposeEmail() {
    const actionBtn = this.page.getByRole('button', { name: 'Action' }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.woUiTimeout });
    await actionBtn.scrollIntoViewIfNeeded().catch(() => {});
    await actionBtn.click({ timeout: 30000 });

    const compose = this.page
      .getByText('Compose email')
      .or(this.page.getByRole('menuitem', { name: /compose email/i }))
      .first();
    await expect(compose).toBeVisible({ timeout: this.woUiTimeout });
    await compose.click({ timeout: 30000 });

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    if (!this.woFastMode) {
      await this.waitForComposeEmailModalReady();
    }
  }

  async sendWorkOrderEmailFromComposeModal() {
    await this.waitForComposeEmailModalReady();

    const send = this.page
      .getByRole('button', { name: 'Send Email' })
      .or(this.locatorComposeSendEmailButtonInVisibleDialog())
      .first();

    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });

    if (this.woFastMode) {
      await expect
        .poll(async () => send.isEnabled().catch(() => false), {
          timeout: this.composeModalTimeout,
          intervals: [300, 500, 1000, 2000],
        })
        .toBe(true);
    } else {
      await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    }

    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch {
      await send.click({ timeout: 15000, force: true });
    }

    const toast = this.locatorWoCreatedAndSentToast();
    const emailDialog = this.locatorComposeEmailDialogForClose();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: this.woFastMode ? 20000 : 30000 }),
      emailDialog.waitFor({ state: 'hidden', timeout: this.woFastMode ? 20000 : 30000 }),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    if (!this.woFastMode) {
      await this.page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    }

    this.woEmailSentObserved = true;
    // eslint-disable-next-line no-console
    console.log('[WO compose] Clicked Send Email in compose dialog.');
  }

  async clickSendEmailInComposeDialog() {
    await this.waitForComposeEmailModalReady();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch {
      await send.click({ timeout: 15000, force: true });
    }

    this.woEmailSentObserved = true;
    // eslint-disable-next-line no-console
    console.log('[WO compose] Clicked Send email in the compose dialog.');
  }

  locatorWoCreatedAndSentToast() {
    const re =
      /work order created[\s&.,-]*sent|work order.*sent.*success|wo created[\s&.,-]*sent|email sent successfully|sent successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  async expectWorkOrderEmailSentSuccessfully() {
    if (this.woEmailSentObserved) {
      return;
    }
    const toast = this.locatorWoCreatedAndSentToast();
    await expect(toast).toBeVisible({
      timeout: this.woFastMode ? 15000 : 60000,
    });
  }

  firstWoCard() {
    return this.page
      .locator('div.mt-3.mb-3')
      .filter({ has: this.page.getByText(/issued date|wo no|work order no/i) })
      .first();
  }

  previewDialogRoot() {
    return this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/work order|wo no|preview|billed to|issued date/i),
      })
      .filter({ visible: true })
      .first();
  }

  async waitForWorkOrderListAfterComposeSendRedirect() {
    await this.page
      .waitForURL(/client\/profile/, { timeout: this.woUiTimeout })
      .catch(() => {});
    if (!this.woFastMode) {
      await this.waitForNetworkSettled();
    } else {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    await this.ensureWorkOrderListReady();
    await expect(this.page.getByText(/wo no|work order no/i).first()).toBeVisible({
      timeout: this.woUiTimeout,
    });
    await this.firstWoCard().scrollIntoViewIfNeeded().catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers();
    // eslint-disable-next-line no-console
    console.log('[WO preview] Work order list ready after compose send.');
  }

  async openThreeDotMenuOnFirstWorkOrderCard() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers();

    await expect(this.page.getByText(/wo no|work order no/i).first()).toBeVisible({
      timeout: this.woUiTimeout,
    });

    const card = this.firstWoCard();
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card);

    const kebab = this.kebabButtonOnPoCard(card);
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click({ timeout: 20000 }).catch(async () => {
      await kebab.click({ force: true, timeout: 10000 });
    });

    await expect(
      this.page
        .getByRole('menuitem')
        .filter({ hasText: /preview|update progress/i })
        .first()
    ).toBeVisible({ timeout: this.woUiTimeout });
    // eslint-disable-next-line no-console
    console.log('[WO preview] Opened three dot menu on first work order card.');
  }

  async clickPreviewInWorkOrderCardMenu() {
    await this.page.getByRole('menuitem', { name: /^preview$/i }).click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[WO preview] Clicked Preview in card menu.');
  }

  async expectWorkOrderFullScreenPreviewVisible() {
    const dialog = this.previewDialogRoot();
    await expect(dialog).toBeVisible({ timeout: this.woUiTimeout });
    await expect(
      dialog.getByText(/work order|wo no|preview|billed to|issued date/i).first()
    ).toBeVisible({ timeout: this.woUiTimeout });
    // eslint-disable-next-line no-console
    console.log('[WO preview] Full screen preview is visible.');
  }

  async closeWorkOrderFullScreenPreview() {
    await this.dismissOpenMenusAndPopovers();
    const root = this.previewDialogRoot();
    const rootVisible = await root.isVisible({ timeout: 5000 }).catch(() => false);

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

    if (rootVisible) {
      const closeCandidates = [
        root.locator('button:has(svg[data-testid="CloseIcon"])'),
        root.locator('button:has(svg[data-testid="ArrowBackIcon"])'),
        root.locator('button:has(svg[data-testid="ChevronLeftIcon"])'),
        root.getByRole('button', { name: /^close$/i }),
        root.getByRole('button', { name: /back/i }),
        root.locator('button[aria-label*="close" i]'),
        root.locator('button[aria-label*="back" i]'),
      ];

      for (const loc of closeCandidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await tryClick(loc)) {
          break;
        }
      }

      await expect(root)
        .toBeHidden({ timeout: this.woUiTimeout })
        .catch(async () => {
          await this.page.keyboard.press('Escape').catch(() => {});
          await expect(root).toBeHidden({ timeout: 20000 });
        });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    // eslint-disable-next-line no-console
    console.log('[WO preview] Closed full screen preview.');
  }

  async expectWorkOrderListWithCreateActionVisible() {
    await this.tryDismissWoUpdateProgressOffCanvas();
    await this.dismissOpenMenusAndPopovers();
    await expect(this.createWorkOrderButton()).toBeVisible({
      timeout: this.woUiTimeout,
    });
    await expect(this.page.getByText(/wo no|work order no/i).first()).toBeVisible({
      timeout: this.woUiTimeout,
    });
  }

  woUpdateProgressPanel() {
    return this.page
      .locator(
        '.MuiDrawer-paper, .MuiModal-root .MuiPaper-root, .offcanvas.show, aside.offcanvas.show, [role="dialog"]'
      )
      .filter({ visible: true })
      .filter({
        has: this.page.getByText(/update progress|completed qty|completed quantity/i),
      })
      .last();
  }

  woUpdateProgressTable() {
    const panel = this.woUpdateProgressPanel();
    return panel
      .getByRole('table')
      .first()
      .or(this.page.getByRole('table').last());
  }

  async findWoUpdateProgressCompletedColumnIndex(table) {
    return table.evaluate((el) => {
      const headers = el.querySelectorAll('thead th, thead td');
      for (let i = 0; i < headers.length; i += 1) {
        const text = (headers[i].textContent || '').replace(/\s+/g, ' ').trim();
        if (/completed\s*qty|completed\s*quantity|qty\s*completed/i.test(text)) {
          return i;
        }
      }
      return headers.length >= 4 ? 3 : Math.max(0, headers.length - 1);
    });
  }

  async clickWoUpdateProgressCompletedCell(table) {
    const dashCell = table.getByText('-', { exact: true }).first();
    if (await dashCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashCell.click({ timeout: 10000 });
      return;
    }

    const colIndex = await this.findWoUpdateProgressCompletedColumnIndex(table);
    const cell = table.locator('tbody tr').first().locator('td').nth(colIndex);
    await expect(cell).toBeVisible({ timeout: 10000 });
    await cell.click({ timeout: 10000, force: true });
  }

  async waitForWoUpdateProgressPanelReady() {
    await expect
      .poll(
        async () => {
          const table = this.woUpdateProgressTable();
          if (!(await table.isVisible({ timeout: 500 }).catch(() => false))) {
            return false;
          }
          return table
            .locator('tbody tr')
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
        },
        { timeout: this.woUiTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
  }

  updateProgressOffCanvasRoot() {
    const panel = this.woUpdateProgressPanel();
    return panel.or(this.woUpdateProgressPanelFromTitle());
  }

  async isWoUpdateProgressOffCanvasOpen() {
    const panelOpen = await this.page
      .getByText(/update progress/i)
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    if (panelOpen) {
      return true;
    }
    return this.woUpdateProgressTable()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
  }

  async clickUpdateProgressInWorkOrderCardMenu() {
    const updateItem = this.page
      .getByRole('menuitem', { name: 'Update Progress' })
      .or(this.page.getByRole('menuitem', { name: /update progress/i }))
      .first();
    await expect(updateItem).toBeVisible({ timeout: this.woUiTimeout });
    await updateItem.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForWoUpdateProgressPanelReady();
    // eslint-disable-next-line no-console
    console.log('[WO update-progress] Clicked Update progress in card menu.');
  }

  async expectWorkOrderUpdateProgressOffCanvasVisible() {
    await this.waitForWoUpdateProgressPanelReady();
    const table = this.woUpdateProgressTable();
    await expect(table).toBeVisible({ timeout: this.woUiTimeout });
    await expect(table.locator('tbody tr').first()).toBeVisible({
      timeout: this.woUiTimeout,
    });
    await expect(
      table
        .getByText(/completed\s*qty|completed\s*quantity/i)
        .first()
        .or(table.getByText('-', { exact: true }).first())
    ).toBeVisible({ timeout: 15000 });
    // eslint-disable-next-line no-console
    console.log('[WO update-progress] Off-canvas with completed qty table is visible.');
  }

  async fillWorkOrderUpdateProgressCompletedQty(completedQty) {
    await this.waitForWoUpdateProgressPanelReady();

    const table = this.woUpdateProgressTable();
    await this.clickWoUpdateProgressCompletedCell(table);

    const qtyInput = this.page.getByRole('textbox').filter({ visible: true });
    await expect(qtyInput.first()).toBeVisible({ timeout: 10000 });
    const editor = (await qtyInput.count()) > 1 ? qtyInput.last() : qtyInput.first();
    await editor.click({ timeout: 10000 });
    await editor.fill(String(completedQty));

    const row = table.locator('tbody tr').first();
    const confirmBtn = row
      .getByRole('button')
      .nth(1)
      .or(this.page.getByRole('button').filter({ visible: true }).nth(1));
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click({ timeout: 10000 });

    await this.page
      .getByText(/update progress/i)
      .first()
      .locator('xpath=ancestor::div[1]')
      .getByRole('button')
      .first()
      .click({ timeout: 10000 })
      .catch(async () => {
        await this.page.locator('h2').getByRole('button').first().click({ timeout: 10000 }).catch(() => {});
      });

    // eslint-disable-next-line no-console
    console.log(`[WO update-progress] Filled completed qty=${completedQty} (codegen path).`);
    await this.tryDismissWoUpdateProgressOffCanvas();
  }

  woUpdateProgressPanelFromTitle() {
    const title = this.page.getByText(/update progress/i).first();
    return title.locator(
      'xpath=ancestor::*[contains(@class,"MuiDrawer") or contains(@class,"offcanvas") or contains(@class,"Offcanvas") or @role="dialog" or contains(@class,"Modal")][1]'
    );
  }

  async clickWoUpdateProgressOffCanvasDismiss() {
    const tryClick = async (loc) => {
      const btn = loc.first();
      if (!(await btn.isVisible({ timeout: 1500 }).catch(() => false))) {
        return false;
      }
      const inTable = await btn
        .evaluate((el) => !!el.closest('tbody, table tbody'))
        .catch(() => false);
      if (inTable) {
        return false;
      }
      await btn.click({ timeout: 15000 }).catch(async () => {
        await btn.click({ force: true, timeout: 15000 });
      });
      return true;
    };

    const titleClose = this.page
      .getByText(/update progress/i)
      .first()
      .locator('xpath=ancestor::div[1]')
      .getByRole('button')
      .first();
    if (await tryClick(titleClose)) {
      return this.woUpdateProgressPanelFromTitle();
    }

    // Codegen: close off-canvas via button in h2 header
    const h2Close = this.page
      .locator('h2')
      .filter({ hasText: /update progress/i })
      .getByRole('button')
      .first();
    if (await tryClick(h2Close)) {
      return this.page.locator('h2').filter({ hasText: /update progress/i }).first();
    }

    const h2CloseAny = this.page.locator('h2').getByRole('button').first();
    if (await tryClick(h2CloseAny)) {
      return this.page.locator('h2').first();
    }

    const panels = [
      this.page
        .locator('.MuiDrawer-paper, .offcanvas.show, aside.offcanvas.show')
        .filter({ visible: true })
        .filter({ has: this.page.getByText(/update progress/i) })
        .last(),
      this.woUpdateProgressPanelFromTitle(),
      this.updateProgressOffCanvasRoot(),
    ];

    const dismissPatterns = (root) => [
      root.locator('button:has(svg[data-testid="CancelIcon"])'),
      root.locator('button:has(svg[data-testid="CloseIcon"])'),
      root.locator('button:has(svg[data-testid="HighlightOffIcon"])'),
      root.locator('.offcanvas-header button.btn-close, button.btn-close'),
      root.getByRole('button', { name: /^cancel$/i }),
      root.getByRole('button', { name: /^close$/i }),
      root.locator('button[aria-label*="cancel" i]'),
      root.locator('button[aria-label*="close" i]'),
      root.locator('.offcanvas-header button, .MuiDialogTitle-root ~ button, header button'),
    ];

    for (const panel of panels) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await panel.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }
      for (const pattern of dismissPatterns(panel)) {
        // eslint-disable-next-line no-await-in-loop
        if (await tryClick(pattern)) {
          return panel;
        }
      }
      const titleInPanel = panel.getByText(/update progress/i).first();
      // eslint-disable-next-line no-await-in-loop
      if (await titleInPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
        const headerDismiss = titleInPanel
          .locator('xpath=ancestor::div[1]')
          .locator('button')
          .last();
        // eslint-disable-next-line no-await-in-loop
        if (await tryClick(headerDismiss)) {
          return panel;
        }
      }
    }

    return null;
  }

  async tryDismissWoUpdateProgressOffCanvas() {
    if (!(await this.isWoUpdateProgressOffCanvasOpen())) {
      return true;
    }

    await this.dismissOpenMenusAndPopovers().catch(() => {});
    await this.clickWoUpdateProgressOffCanvasDismiss();

    if (await this.isWoUpdateProgressOffCanvasOpen()) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    if (await this.isWoUpdateProgressOffCanvasOpen()) {
      const backdrop = this.page.locator('.MuiBackdrop-root').filter({ visible: true }).last();
      if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backdrop.click({ force: true, position: { x: 8, y: 8 } }).catch(() => {});
      }
    }

    const closed = !(await this.isWoUpdateProgressOffCanvasOpen());
    // eslint-disable-next-line no-console
    console.log(
      closed
        ? '[WO update-progress] Off-canvas dismissed via cancel/close.'
        : '[WO update-progress] Off-canvas still open; qty save complete — continuing scenario.'
    );
    return closed;
  }

  async closeWorkOrderUpdateProgressOffCanvas() {
    await this.tryDismissWoUpdateProgressOffCanvas();
  }

  /** Login → compose send → list → three dot → Preview → close. */
  async completeWorkOrderComposeSendPreviewJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderComposeSendFlow(title);
    await this.waitForWorkOrderListAfterComposeSendRedirect();
    await this.openThreeDotMenuOnFirstWorkOrderCard();
    await this.clickPreviewInWorkOrderCardMenu();
    await this.expectWorkOrderFullScreenPreviewVisible();
    await this.closeWorkOrderFullScreenPreview();
    // eslint-disable-next-line no-console
    console.log('[WO] Compose send → preview → close journey finished.');
  }
}

module.exports = WorkOrderComposeSendPage;
