const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectNavigationPage = require('../../../ProjectNavigationPage');
const ProjectProfilePage = require('../../../ProjectProfilePage');

/** Shared PO list + create/edit form flows (vendor, line items, compose, Action menu). */
class PurchaseOrderCreatePoPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    /** Compose modal often waits on APIs before To/subject render and Send enables. */
    this.composeModalTimeout = Number(process.env.PO_COMPOSE_MODAL_TIMEOUT_MS) || 180000;
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.page
      .waitForLoadState('networkidle', { timeout: 20000 })
      .catch(() => {});
  }

  async navigateToFirstProjectPurchaseOrderList() {
    const nav = new ProjectNavigationPage(this.page);
    await nav.navigateToProjects();
    await nav.clickFirstProject();
    await this.waitForNetworkSettled();

    const profile = new ProjectProfilePage(this.page);
    await profile.selectHeading('Procurement');
    await profile.clickModuleCard('Purchase Order');
    await this.waitForNetworkSettled();
    await this.ensurePurchaseOrderListReady();
  }

  async ensurePurchaseOrderListReady() {
    await this.page
      .waitForURL(
        (url) => {
          const href = typeof url === 'string' ? url : url.href;
          return (
            /tab=RFQAndPO/i.test(href) &&
            (/subTab=PO/i.test(href) || /subTab%3DPO/i.test(href))
          );
        },
        { timeout: 90000 }
      )
      .catch(() => {});

    await this.page.waitForLoadState('domcontentloaded');

    const poTab = this.page.getByRole('tab', { name: /purchase order/i });
    if (await poTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      await poTab.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(400);
    }

    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.dismissListSkeletons();
  }

  async dismissListSkeletons() {
    await this.page
      .waitForFunction(
        () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
        { timeout: 20000 }
      )
      .catch(() => {});
  }

  purchaseOrderStartDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/get started/i) });
  }

  async openCreatePurchaseOrderStartDialog() {
    const createBtn = this.page.getByRole('button', {
      name: /create purchase order/i,
    });
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await createBtn.click();
    const dialog = this.purchaseOrderStartDialog();
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await expect(dialog.getByText(/get started/i)).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async startFromScratchAndProceed() {
    const dialog = this.purchaseOrderStartDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    const startOption = dialog.getByText(/start from scratch/i).first();
    await expect(startOption).toBeVisible({ timeout: 30000 });
    await startOption.click();
    const proceed = dialog.getByRole('button', { name: /^proceed$/i });
    await expect(proceed).toBeEnabled({ timeout: 30000 });
    await proceed.click();
    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
  }

  async waitForPurchaseOrderCreateForm() {
    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    const titleInput = this.page.locator('input[name="estimation name"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 90000 });
  }

  async fillPurchaseOrderTitle(title) {
    await this.waitForPurchaseOrderCreateForm();
    const input = this.page.locator('input[name="estimation name"]').first();
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.fill('');
    await input.fill(title);
    await expect
      .poll(async () => (await input.inputValue()).trim(), { timeout: 15000 })
      .toBe(title);
    await this.waitForNetworkSettled();
  }

  /**
   * @returns {string | null} *@yopmail.com from the first vendor row if present (avoids reading compose To later).
   */
  async tryReadYopmailFromVendorModalFirstRow(vendorModal) {
    const yopRe = /[\w.+-]+@yopmail\.com/i;
    const row = vendorModal.locator('table tbody tr').first();
    if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) {
      return null;
    }
    const text = (await row.innerText().catch(() => '')) || '';
    const m = text.match(yopRe);
    return m ? m[0].toLowerCase() : null;
  }

  /**
   * @returns {Promise<string | null>} Yopmail seen on the selected vendor row, if any.
   */
  async addVendorDetailsWithFirstVendorRadio() {
    const addVendorBtn = this.page.getByRole('button', {
      name: /add vendor details/i,
    });
    await addVendorBtn.waitFor({ state: 'visible', timeout: 90000 });
    await addVendorBtn.scrollIntoViewIfNeeded();
    await expect(addVendorBtn).toBeEnabled({ timeout: 15000 });
    await addVendorBtn.click();

    const vendorModal = this.page.locator('.MuiModal-root').last();
    const panelHeading = vendorModal.getByText(
      /add vendor|select vendor|change vendor/i
    );
    await expect(panelHeading).toBeVisible({ timeout: 45000 });

    const skeleton = vendorModal.locator('.MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skeleton.waitFor({ state: 'hidden', timeout: 90000 });
    }

    const noData = vendorModal.getByText(/no data found/i);
    if (await noData.isVisible({ timeout: 5000 }).catch(() => false)) {
      throw new Error(
        'Vendor modal has no organizations. Connect or invite a vendor in User Hub first.'
      );
    }

    const firstRadio = vendorModal.locator('table tbody input[type="radio"]').first();
    await firstRadio.waitFor({ state: 'visible', timeout: 60000 });
    await firstRadio.scrollIntoViewIfNeeded();

    try {
      await firstRadio.check({ timeout: 15000 });
    } catch {
      await firstRadio.click({ force: true });
    }
    await expect(firstRadio).toBeChecked({ timeout: 15000 });

    const yopmailFromRow = await this.tryReadYopmailFromVendorModalFirstRow(
      vendorModal
    );

    const addBtn = vendorModal.getByRole('button', { name: /^Add$/i }).last();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.page
      .waitForLoadState('networkidle', { timeout: 45000 })
      .catch(() => {});

    await expect(this.page).toHaveURL(/purchase-order\/create/);

    await expect(
      this.page.getByRole('button', { name: /change vendor/i })
    ).toBeVisible({ timeout: 60000 });

    try {
      await expect(panelHeading).toBeHidden({ timeout: 30000 });
    } catch {
      /* Slide/off-canvas may still leave nodes in DOM; vendor add is confirmed by Change Vendor */
    }

    return yopmailFromRow;
  }

  async ensurePoLineItemsTableVisible() {
    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: this.defaultTimeout });
    await table.scrollIntoViewIfNeeded();
    return table;
  }

  async clickAddManuallyOnPurchaseOrderForm() {
    await this.ensurePoLineItemsTableVisible();
    const addManually = this.page
      .locator('span.pointer')
      .filter({ hasText: /add manually/i })
      .first();
    await addManually.waitFor({ state: 'visible', timeout: 90000 });
    await addManually.scrollIntoViewIfNeeded();
    await addManually.click({ force: true });
    await this.waitForNetworkSettled();
  }

  isPoLineUnitPlaceholderText(text) {
    const t = String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!t) return true;
    return /^(select(\s+unit)?|choose(\s+unit)?|unit|uom|—|-|–|\.\.\.)$/i.test(
      t
    );
  }

  poLineItemRowUnitControl(row) {
    const unitCell = row.locator('td').nth(2);
    const mui = unitCell.locator('.MuiSelect-select').first();
    return { unitCell, mui, combobox: unitCell.getByRole('combobox').first() };
  }

  /** True when this `tr` looks like a PO line data row (has a unit dropdown in column 3). */
  async poLineRowHasUnitControl(row) {
    if ((await row.locator('td').count()) < 3) {
      return false;
    }
    const { mui, combobox } = this.poLineItemRowUnitControl(row);
    return (
      (await mui.count()) > 0 ||
      (await combobox.count()) > 0
    );
  }

  async getPoLineRowUnitSelectLocator(row) {
    const { mui, combobox } = this.poLineItemRowUnitControl(row);
    if ((await mui.count()) > 0) {
      return mui;
    }
    if ((await combobox.count()) > 0) {
      return combobox;
    }
    return null;
  }

  async getPoLineRowUnitDisplayText(row) {
    const sel = await this.getPoLineRowUnitSelectLocator(row);
    if (!sel) {
      return null;
    }
    return (await sel.innerText())
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * @param {import('@playwright/test').Locator} listbox
   */
  async pickRandomPoLineUnitFromOpenListbox(listbox) {
    const opts = listbox.getByRole('option');
    await expect(opts.first()).toBeVisible({ timeout: 8000 });
    const oc = await opts.count();
    const candidates = [];
    for (let j = 0; j < oc; j++) {
      const o = opts.nth(j);
      const ot = (await o.innerText())
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!ot || this.isPoLineUnitPlaceholderText(ot)) {
        continue;
      }
      candidates.push(o);
    }
    if (candidates.length === 0) {
      throw new Error(
        'No selectable unit options in the dropdown (only placeholders or empty).'
      );
    }
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    await choice.click();
  }

  async countPoLineRowsWithMissingUnit(table) {
    const rows = table.locator('tbody tr');
    const n = await rows.count();
    let missing = 0;
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await this.poLineRowHasUnitControl(row))) {
        continue;
      }
      const text = await this.getPoLineRowUnitDisplayText(row);
      if (this.isPoLineUnitPlaceholderText(text)) {
        missing += 1;
      }
    }
    return missing;
  }

  /**
   * One full scan: fill every line row whose unit is still placeholder/empty (random real option).
   * @returns {number} how many rows were updated this pass
   */
  async fillMissingPoLineItemUnitsOnePass(table) {
    const rows = table.locator('tbody tr');
    const n = await rows.count();
    let filledCount = 0;

    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await this.poLineRowHasUnitControl(row))) {
        continue;
      }
      await row.scrollIntoViewIfNeeded();

      const unitSelect = await this.getPoLineRowUnitSelectLocator(row);
      if (!unitSelect) {
        continue;
      }

      const displayText = await this.getPoLineRowUnitDisplayText(row);
      if (!this.isPoLineUnitPlaceholderText(displayText)) {
        continue;
      }

      await unitSelect.click({ timeout: 10000 }).catch(async () => {
        await unitSelect.click({ force: true, timeout: 5000 });
      });

      const listbox = this.page.getByRole('listbox').last();
      await expect(listbox).toBeVisible({ timeout: 10000 });

      try {
        await this.pickRandomPoLineUnitFromOpenListbox(listbox);
        filledCount += 1;
      } catch (e) {
        await this.page.keyboard.press('Escape');
        throw e;
      }

      await listbox.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      await this.waitForNetworkSettled();
    }

    return filledCount;
  }

  async assertEveryPoLineItemUnitFilled(table) {
    const rows = table.locator('tbody tr');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await this.poLineRowHasUnitControl(row))) {
        continue;
      }
      await row.scrollIntoViewIfNeeded();
      const text = await this.getPoLineRowUnitDisplayText(row);
      if (this.isPoLineUnitPlaceholderText(text)) {
        throw new Error(
          `PO line item row ${i + 1} still has an empty or placeholder unit (Compose email must not run until all units are set).`
        );
      }
    }
  }

  /**
   * Ensures every PO line row with a unit control shows a real unit. Call after vendor if the table re-renders.
   * @param {{ settleFirst?: boolean }} [options] — wait for network after vendor / navigation before scanning.
   */
  async ensureAllPoLineItemUnitsFilled(options = {}) {
    if (options.settleFirst) {
      await this.page.waitForLoadState('domcontentloaded');
      await this.waitForNetworkSettled();
    }

    const maxRounds = 12;
    for (let round = 0; round < maxRounds; round++) {
      const table = await this.ensurePoLineItemsTableVisible();
      await table.scrollIntoViewIfNeeded();

      const missingBefore = await this.countPoLineRowsWithMissingUnit(table);
      if (missingBefore === 0) {
        await this.assertEveryPoLineItemUnitFilled(table);
        return;
      }

      await this.fillMissingPoLineItemUnitsOnePass(table);
      await this.waitForNetworkSettled();

      const tableAfter = await this.ensurePoLineItemsTableVisible();
      const missingAfter = await this.countPoLineRowsWithMissingUnit(tableAfter);
      if (missingAfter === 0) {
        await this.assertEveryPoLineItemUnitFilled(tableAfter);
        return;
      }

      if (round === maxRounds - 1) {
        await this.assertEveryPoLineItemUnitFilled(tableAfter);
      }
    }

    throw new Error(
      'ensureAllPoLineItemUnitsFilled: exceeded retry rounds without clearing all unit placeholders.'
    );
  }

  /**
   * Waits for you to finish units in the browser, then continues to Action → Compose email.
   * - Default: **Press ENTER in this terminal** when `stdin` is a TTY (typical PowerShell/cmd run).
   * - `PO_IMPORT_MANUAL_UNITS_INSPECTOR=1`: use Playwright Inspector ▶ instead of ENTER.
   * - `PO_IMPORT_MANUAL_UNITS_STDIN=1` / `=0`: force ENTER / force Inspector regardless of TTY.
   * After resume, asserts every line row with a unit control has a real unit selected.
   * @param {string} [userHint] — extra line(s) printed before ENTER / Inspector instructions.
   */
  async waitForManualPoLineUnitCompletionBeforeCompose(userHint) {
    await this.ensurePoLineItemsTableVisible();
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();

    const forceInspector =
      process.env.PO_IMPORT_MANUAL_UNITS_INSPECTOR === '1' ||
      /^true$/i.test(String(process.env.PO_IMPORT_MANUAL_UNITS_INSPECTOR || ''));
    const stdinRaw = process.env.PO_IMPORT_MANUAL_UNITS_STDIN;
    const forceStdin =
      stdinRaw === '1' || /^true$/i.test(String(stdinRaw || ''));
    const forceNoStdin =
      stdinRaw === '0' || /^false$/i.test(String(stdinRaw || ''));

    const useStdin =
      forceStdin || (!forceInspector && !forceNoStdin && process.stdin.isTTY);

    // eslint-disable-next-line no-console
    console.log(
      '\n[PO import] Do not click **Action** yet — the test opens it after you continue.\n' +
        (userHint ? `            ${userHint}\n` : '') +
        '            Fix any empty or placeholder **Unit** cells on imported line items in the browser.\n' +
        (useStdin
          ? '            → Press ENTER in this terminal when units are correct.\n'
          : '            → Resume in the Playwright Inspector (▶), or set PO_IMPORT_MANUAL_UNITS_STDIN=1 from a real terminal.\n')
    );

    if (useStdin) {
      await this.waitForEnterInTerminal(
        'Press ENTER after units are set (next: Action → Compose email → Send).'
      );
    } else {
      await this.page.pause();
    }

    const table = await this.ensurePoLineItemsTableVisible();
    await this.assertEveryPoLineItemUnitFilled(table);
  }

  async waitForEnterInTerminal(promptText) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    await new Promise((resolve) => {
      rl.question(`${promptText}\n`, () => {
        rl.close();
        resolve(undefined);
      });
    });
  }

  /**
   * Import flow before **Action → Compose**:
   * - Optionally auto-fills placeholder units (skipped if `PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE=1`).
   * - **By default** always stops for you to review/fix units, then ENTER (TTY) or Inspector — so we never
   *   hit Action while units are still wrong (automation often misses real UI state after PDF import).
   * - `PO_IMPORT_SKIP_UNITS_MANUAL_GATE=1`: skip that pause; only assert all units filled (CI / fully trusted PDFs).
   */
  async preparePoLineUnitsBeforeComposeEmailImportFlow() {
    const skipAutoFill =
      process.env.PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE === '1' ||
      /^true$/i.test(String(process.env.PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE || ''));

    const skipManualGate =
      process.env.PO_IMPORT_SKIP_UNITS_MANUAL_GATE === '1' ||
      /^true$/i.test(String(process.env.PO_IMPORT_SKIP_UNITS_MANUAL_GATE || ''));

    await this.ensurePoLineItemsTableVisible();
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();

    if (!skipAutoFill) {
      try {
        await this.ensureAllPoLineItemUnitsFilled({ settleFirst: false });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          '[PO import] Automatic unit fill did not complete:',
          e && e.message ? e.message : e
        );
      }
    }

    const table = await this.ensurePoLineItemsTableVisible();

    if (skipManualGate) {
      await this.assertEveryPoLineItemUnitFilled(table);
      return;
    }

    const missing = await this.countPoLineRowsWithMissingUnit(table);
    if (missing > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[PO import] Detected ${missing} row(s) with placeholder/empty unit — set real units in the UI.`
      );
    }

    await this.waitForManualPoLineUnitCompletionBeforeCompose(
      '(Automation may have pre-filled some units — verify every line before continuing.)'
    );
  }

  async fillLastPoLineItemRow({
    itemName,
    description,
    quantity,
    unitLabel,
    rate,
  }) {
    const table = await this.ensurePoLineItemsTableVisible();
    const dataRow = table.locator('tbody tr').last();
    await expect(dataRow).toBeVisible({ timeout: 30000 });

    const nameField = dataRow.getByPlaceholder(/material name/i).first();
    await expect(nameField).toBeVisible({ timeout: this.defaultTimeout });
    await nameField.click();
    await nameField.fill(itemName);

    await dataRow.getByText(/^Add Description$/i).click();

    const descDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/add description/i) })
      .last();
    await expect(descDialog).toBeVisible({ timeout: 20000 });
    const descField = descDialog.locator('textarea').first().or(
      descDialog.locator('input').first()
    );
    await descField.fill(description);
    await descDialog.getByRole('button', { name: /^Add$/i }).click();
    await expect(descDialog).toBeHidden({ timeout: 20000 });

    const qtyInput = dataRow.locator('td').nth(1).locator('input').first();
    await qtyInput.fill(String(quantity));
    await qtyInput.blur();

    const unitSelect = dataRow.locator('td').nth(2).locator('.MuiSelect-select').first();
    await unitSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(`^${unitLabel}`, 'i') })
      .first()
      .click();

    const rateInput = dataRow.locator('td').nth(3).locator('input').first();
    await rateInput.fill(String(rate));
    await rateInput.blur();

    await this.waitForNetworkSettled();
  }

  async addLineItemManually(args) {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.clickAddManuallyOnPurchaseOrderForm();
    await this.fillLastPoLineItemRow(args);
  }

  /**
   * Reads the first *@yopmail.com address from the visible compose dialog (text, chips, or inputs).
   * Polls while APIs populate the To field (same budget as PO_COMPOSE_MODAL_TIMEOUT_MS).
   */
  async readYopmailAddressFromComposeDialog() {
    const yopRe = /[\w.+-]+@yopmail\.com/i;
    const deadline = Date.now() + this.composeModalTimeout;

    const tryExtract = async (emailDialog) => {
      const blob = (await emailDialog.textContent()) || '';
      let m = blob.match(yopRe);
      if (m) return m[0].toLowerCase();

      const inputs = emailDialog.locator('input');
      const n = await inputs.count();
      for (let i = 0; i < n; i++) {
        const v = await inputs.nth(i).inputValue().catch(() => '');
        m = v.match(yopRe);
        if (m) return m[0].toLowerCase();
      }

      const combobox = emailDialog.getByRole('combobox').first();
      if (await combobox.isVisible({ timeout: 400 }).catch(() => false)) {
        const v = await combobox.inputValue().catch(() => '');
        m = v.match(yopRe);
        if (m) return m[0].toLowerCase();
      }
      return null;
    };

    while (Date.now() < deadline) {
      const anyVisible = this.page.getByRole('dialog').filter({ visible: true });
      const count = await anyVisible.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const dlg = anyVisible.nth(i);
        const found = await tryExtract(dlg);
        if (found) return found;
      }
      await this.page.waitForTimeout(450);
    }

    throw new Error(
      'Could not find a *@yopmail.com address in the compose email To field after waiting. Ensure the first vendor uses Yopmail.'
    );
  }

  /**
   * Waits until the compose modal is open (Send control present). Does not wait for Send to enable —
   * use click({ timeout }) on Send so Playwright waits until the button is actionable.
   */
  async waitForComposeEmailDialogShellOpen() {
    await expect
      .poll(
        async () => await this.visibleComposeEmailDialog().count(),
        {
          message:
            'Compose email dialog did not open (no visible dialog with Send email control)',
          timeout: this.composeModalTimeout,
          intervals: [400, 800, 1200, 2000],
        }
      )
      .toBeGreaterThan(0);

    await expect(this.visibleComposeEmailDialog().first()).toBeVisible({
      timeout: 20000,
    });
  }

  /**
   * Dialog visible + Send visible (may still be disabled while loading).
   * Override wait with PO_COMPOSE_MODAL_TIMEOUT_MS (ms) on slow environments.
   */
  async waitForComposeEmailModalReady() {
    await this.waitForComposeEmailDialogShellOpen();
    const send = this.visibleComposeEmailDialog()
      .first()
      .getByRole('button', { name: /send email/i });
    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
  }

  /**
   * Action → Compose email only. Does not wait for the modal (Send click uses a long actionability timeout).
   */
  async openActionMenuAndComposeEmail() {
    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.scrollIntoViewIfNeeded();
    await actionBtn.click();

    const compose = this.page.getByRole('menuitem', { name: /compose email/i });
    await expect(compose).toBeVisible({ timeout: this.defaultTimeout });
    await compose.click();

    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Topmost visible “Send email” in a portal stack (compose opens before inner tree finishes). */
  locatorVisibleComposeSendEmailButton() {
    return this.page
      .getByRole('button', { name: /send email/i })
      .filter({ visible: true })
      .last();
  }

  /** Dialog that hosts the compose Send control (for close / toast race after send). */
  locatorComposeEmailDialogForClose() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .last();
  }

  async expectPurchaseOrderComposeEmailDialogFromActionMenu() {
    await this.waitForComposeEmailModalReady();
  }

  async getPoLineItemsTableRowCount() {
    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: 60000 });
    return await table.locator('tbody tr').count();
  }

  async expectPoLineItemsRowCountGreaterThan(baseline) {
    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: 60000 });
    await expect
      .poll(async () => table.locator('tbody tr').count(), {
        timeout: 120000,
      })
      .toBeGreaterThan(baseline);
  }

  async openActionMenuAndChooseUpdate() {
    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.click();
    const updateItem = this.page.getByRole('menuitem', { name: /^update$/i });
    await expect(updateItem).toBeVisible({ timeout: this.defaultTimeout });
    await updateItem.click();
    await this.waitForNetworkSettled();
  }

  async expectPurchaseOrderUpdatedSuccessToast() {
    const messageRe =
      /purchase order updated successfully|po updated successfully/i;
    const toastBody = this.page
      .locator('.Toastify__toast')
      .filter({ hasText: messageRe })
      .first();
    await expect(toastBody).toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * React-Toastify: `role="alert"` is on `.Toastify__toast`, not `.Toastify__toast-body`.
   * `hasText` on `.Toastify__toast` still matches body copy (subtree).
   */
  locatorEmailSentSuccessToast() {
    const re =
      /email sent successfully|correo enviado|mail sent|reminder sent|sent successfully/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  locatorPoCreatedAndSentToast() {
    const re =
      /PO created[\s&.,-]*sent[\s\w&.,-]*successfully|PO created[\s&.,-]*sent[\s\w&.,-]*for approval/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  /**
   * @param {{ prioritizeEmailSentToast?: boolean }} [options] - Reminder/list compose: assert toast before long networkidle so auto-dismiss cannot hide it.
   */
  async sendEmailFromComposeModal(options = {}) {
    const prioritizeEmailSentToast = !!options.prioritizeEmailSentToast;
    const emailDialog = this.locatorComposeEmailDialogForClose();
    const send = this.locatorVisibleComposeSendEmailButton();
    await send.click({ timeout: this.composeModalTimeout });

    const emailSentToast = this.locatorEmailSentSuccessToast();
    const poCreatedSentToast = this.locatorPoCreatedAndSentToast();

    if (prioritizeEmailSentToast) {
      await expect(emailSentToast).toBeVisible({ timeout: 60000 });
      await this.page.waitForLoadState('domcontentloaded');
      await this.page
        .waitForLoadState('networkidle', { timeout: 25000 })
        .catch(() => {});
      await emailDialog.waitFor({ state: 'hidden', timeout: 90000 }).catch(() => {});
    } else {
      await this.waitForNetworkSettled();
      await Promise.race([
        emailDialog.waitFor({ state: 'hidden', timeout: 90000 }),
        emailSentToast.waitFor({ state: 'visible', timeout: 90000 }),
        poCreatedSentToast.waitFor({ state: 'visible', timeout: 90000 }),
      ]);
    }

    await this.dismissOpenMenusAndPopovers();

    const stillOpen = await this.visibleComposeEmailDialog()
      .first()
      .isVisible()
      .catch(() => false);
    if (stillOpen) {
      await emailDialog
        .waitFor({ state: 'hidden', timeout: 20000 })
        .catch(async () => {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        });
    }
  }

  async dismissOpenMenusAndPopovers() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }

  /** Toast containers often sit above the list and steal clicks from the ⋮ button. */
  async dismissVisibleToastNotifications() {
    const closeSelectors =
      '.Toastify__toast .Toastify__close-button, .Toastify__close-button[aria-label], [class*="Toastify__close-button"]';
    for (let i = 0; i < 10; i++) {
      const btn = this.page.locator(closeSelectors).first();
      if (!(await btn.isVisible({ timeout: 400 }).catch(() => false))) {
        break;
      }
      await btn.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(120);
    }
  }

  /** Visible compose-email dialog (MUI may keep hidden nodes in DOM). */
  visibleComposeEmailDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .filter({ visible: true });
  }

  async waitForPurchaseOrderListReadyAfterComposeEmailSent() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    await expect(
      this.page.locator('.MuiModal-root').filter({ visible: true })
    )
      .toHaveCount(0, { timeout: 20000 })
      .catch(() => {});

    await this.page
      .locator('.MuiBackdrop-root')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 25000 })
      .catch(() => {});

    for (let i = 0; i < 15; i++) {
      const count = await this.visibleComposeEmailDialog().count().catch(() => 0);
      if (count === 0) break;
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(220);
      if (i % 3 === 2) {
        await this.dismissOpenMenusAndPopovers();
      }
    }

    await expect(this.visibleComposeEmailDialog())
      .toHaveCount(0, { timeout: 20000 })
      .catch(() => {});

    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.firstPoCard().scrollIntoViewIfNeeded();
    await this.dismissVisibleToastNotifications();
    await this.dismissListSkeletons();
  }

  /**
   * ⋮ on a PO card — scoped to the card (`page.locator` in `has` is a common pitfall).
   */
  kebabButtonOnPoCard(card) {
    return card
      .locator('button:has(svg[data-testid="MoreVertIcon"])')
      .or(card.locator('button[aria-label*="more" i]'))
      .first();
  }

  async waitForPurchaseOrderListAfterCreateRedirect() {
    await this.page.waitForURL(/client\/profile/, {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();
    await this.ensurePurchaseOrderListReady();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: 90000,
    });
  }

  /** After Action → Update, app returns to client profile PO list (same URL pattern as create+send). */
  async waitForPurchaseOrderListAfterUpdateRedirect() {
    await this.waitForPurchaseOrderListAfterCreateRedirect();
  }

  async expectPoCreatedAndSentToast() {
    await expect(this.locatorPoCreatedAndSentToast()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  firstPoCard() {
    return this.page
      .locator('div.mt-3.mb-3')
      .filter({ has: this.page.getByText(/issued date|po no/i) })
      .first();
  }

  async clickKebabOnFirstPurchaseOrderCard() {
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    const card = this.firstPoCard();
    const kebab = this.kebabButtonOnPoCard(card);
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click();
  }
}

module.exports = PurchaseOrderCreatePoPage;
