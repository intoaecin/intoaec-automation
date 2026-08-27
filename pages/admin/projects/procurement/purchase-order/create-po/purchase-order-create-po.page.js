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
    await expect(createBtn).toBeEnabled({ timeout: 30000 });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await createBtn.click(
        attempt === 0 ? { timeout: 30000 } : { timeout: 30000, force: true }
      );
      const dialog = this.purchaseOrderStartDialog();
      if (await dialog.isVisible({ timeout: 7000 }).catch(() => false)) {
        break;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }

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
    return this.tryReadYopmailFromVendorModal(vendorModal);
  }

  /**
   * Prefer a vendor inbox email that is not the logged-in admin account.
   * Supports *@yopmail.com and *@mailinator.com.
   * @param {import('@playwright/test').Locator} vendorModal
   * @param {{ preferEmail?: string, excludeEmails?: string[] }} [opts]
   */
  async tryReadYopmailFromVendorModal(vendorModal, opts = {}) {
    const inboxRe = /[\w.+-]+@(?:yopmail|mailinator)\.com/gi;
    const prefer = String(opts.preferEmail || '').trim().toLowerCase();
    const exclude = new Set(
      (opts.excludeEmails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
    );

    const blob = ((await vendorModal.innerText().catch(() => '')) || '').toLowerCase();
    const all = [...new Set((blob.match(inboxRe) || []).map((e) => e.toLowerCase()))];
    if (prefer && all.includes(prefer)) return prefer;
    const notExcluded = all.find((e) => !exclude.has(e));
    if (notExcluded) return notExcluded;

    const row = vendorModal.locator('table tbody tr').first();
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = ((await row.innerText().catch(() => '')) || '').toLowerCase();
      const m = text.match(/[\w.+-]+@(?:yopmail|mailinator)\.com/i);
      if (m && !exclude.has(m[0].toLowerCase())) return m[0].toLowerCase();
    }
    return null;
  }

  /**
   * @param {{ preferEmail?: string, searchHint?: string }} [opts]
   * @returns {Promise<string | null>} Vendor inbox email seen on the selected row, if any.
   */
  async addVendorDetailsWithFirstVendorRadio(opts = {}) {
    const addVendorBtn = this.page.getByRole('button', {
      name: /add vendor details/i,
    });
    await addVendorBtn.waitFor({ state: 'visible', timeout: 90000 });
    await addVendorBtn.scrollIntoViewIfNeeded();
    await expect(addVendorBtn).toBeEnabled({ timeout: 15000 });
    await addVendorBtn.click();

    const resolveVendorModal = () =>
      this.page
        .locator('.MuiModal-root, [role="dialog"], .MuiDrawer-root')
        .filter({
          has: this.page.getByText(/add vendor|select vendor|change vendor/i),
        })
        .filter({ visible: true })
        .last()
        .or(this.page.locator('.MuiModal-root').last());

    let vendorModal = resolveVendorModal();
    const panelHeading = vendorModal.getByText(
      /add vendor|select vendor|change vendor/i
    );
    await expect(panelHeading).toBeVisible({ timeout: 45000 });

    const trySelectVendorInModal = async (modal) => {
      if (
        await modal
          .getByText(/no data found/i)
          .isVisible({ timeout: 600 })
          .catch(() => false)
      ) {
        throw new Error(
          'Vendor modal has no organizations. Connect or invite a vendor in User Hub first.'
        );
      }

      const preferredVendorMail =
        opts.preferEmail ||
        process.env.PO_VENDOR_YOPMAIL_ID ||
        process.env.PO_VENDOR_YOPMAIL_LOGIN ||
        'bhavanimmm12345@yopmail.com';
      const preferredLocal = String(preferredVendorMail)
        .replace(/@(yopmail|mailinator)\.com$/i, '')
        .trim();
      const preferMailinator = /@mailinator\.com$/i.test(String(preferredVendorMail));

      // Prefer known vendor inbox / org used by RFQ + PO accept flows.
      const preferred = modal
        .getByText(new RegExp(preferredLocal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
        .or(
          preferMailinator
            ? modal.getByText(/mailinator|bhavani\s*mailinator/i)
            : modal.getByText(/AEC Solutions/i)
        )
        .filter({ visible: true })
        .first();
      if (await preferred.isVisible({ timeout: 800 }).catch(() => false)) {
        const row = modal
          .locator('table tbody tr')
          .filter({ hasText: new RegExp(preferredLocal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .or(
            modal
              .locator('table tbody tr')
              .filter({
                hasText: preferMailinator
                  ? /mailinator|bhavani\s*mailinator/i
                  : /AEC Solutions/i,
              })
          )
          .first();
        if (await row.isVisible({ timeout: 1000 }).catch(() => false)) {
          const radio = row.locator('input[type="radio"]').first().or(row.getByRole('radio').first());
          if (await radio.isVisible({ timeout: 500 }).catch(() => false)) {
            await radio.check({ force: true }).catch(() => radio.click({ force: true }));
          } else {
            await row.click({ force: true });
          }
        } else {
          await preferred.click({ force: true });
        }
        return true;
      }

      const firstRadio = modal
        .locator('table tbody input[type="radio"]')
        .first()
        .or(modal.getByRole('radio').first());
      if (await firstRadio.isVisible({ timeout: 800 }).catch(() => false)) {
        await firstRadio.scrollIntoViewIfNeeded().catch(() => {});
        try {
          await firstRadio.check({ timeout: 10000 });
        } catch {
          await firstRadio.click({ force: true });
        }
        return true;
      }

      // WO-style: click first real data cell (skip skeleton-only empty cells).
      const cells = modal.locator('table tbody td');
      const cellCount = await cells.count().catch(() => 0);
      for (let i = 0; i < Math.min(cellCount, 12); i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible({ timeout: 200 }).catch(() => false))) {
          continue;
        }
        const hasSkeleton =
          (await cell.locator('.MuiSkeleton-root').count().catch(() => 0)) > 0;
        if (hasSkeleton) continue;
        const text = ((await cell.innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length < 2) continue;
        await cell.click({ force: true });
        return true;
      }

      const firstCell = modal.getByRole('cell').first();
      if (await firstCell.isVisible({ timeout: 500 }).catch(() => false)) {
        const hasSkeleton =
          (await firstCell.locator('.MuiSkeleton-root').count().catch(() => 0)) >
          0;
        if (!hasSkeleton) {
          await firstCell.click({ force: true });
          return true;
        }
      }
      return false;
    };

    let selected = false;
    let reopenAttempted = false;
    const deadline = Date.now() + 120000;

    // Fire-and-forget: allow list API to settle while we poll the UI.
    const vendorListSettled = this.page
      .waitForResponse(
        (res) => res.ok() && /vendor|organiz|connected/i.test(res.url()),
        { timeout: 60000 }
      )
      .then(() => true)
      .catch(() => false);

    while (Date.now() < deadline && !selected) {
      vendorModal = resolveVendorModal();

      // Optional search box — narrow to preferred vendor (Mailinator / AEC).
      const search = vendorModal
        .getByPlaceholder(/search/i)
        .or(vendorModal.locator('input[type="search"]'))
        .first();
      if (await search.isVisible({ timeout: 400 }).catch(() => false)) {
        const hint =
          String(opts.searchHint || '').trim() ||
          (/mailinator/i.test(String(opts.preferEmail || ''))
            ? 'Mailinator'
            : 'AEC');
        const current = await search.inputValue().catch(() => '');
        if (!new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(current || '')) {
          await search.fill(hint).catch(() => {});
          await this.page.waitForTimeout(800);
        }
      }

      selected = await trySelectVendorInModal(vendorModal);
      if (selected) break;

      await Promise.race([
        vendorListSettled,
        this.page.waitForTimeout(750),
      ]);

      const skeletonStuck = await vendorModal
        .locator('.MuiSkeleton-root')
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false);

      const elapsedMs = 120000 - Math.max(0, deadline - Date.now());
      // After ~12s of skeletons, try selecting the first row anyway (API may have data under pulse).
      if (skeletonStuck && elapsedMs > 12000) {
        const firstRow = vendorModal.locator('table tbody tr').first();
        if (await firstRow.isVisible({ timeout: 500 }).catch(() => false)) {
          await firstRow.click({ force: true }).catch(() => {});
          const addBtn = vendorModal
            .getByRole('button', { name: /^Add$/i })
            .last();
          if (await addBtn.isEnabled({ timeout: 1500 }).catch(() => false)) {
            selected = true;
            break;
          }
          const anyRadio = vendorModal
            .locator('input[type="radio"], [role="radio"]')
            .first();
          if ((await anyRadio.count().catch(() => 0)) > 0) {
            await anyRadio.click({ force: true }).catch(() => {});
            if (await addBtn.isEnabled({ timeout: 1500 }).catch(() => false)) {
              selected = true;
              break;
            }
          }
        }
      }

      if (skeletonStuck && !reopenAttempted && Date.now() + 20000 < deadline) {
        reopenAttempted = true;
        console.log(
          '[PO] Vendor modal still skeleton — closing and reopening once'
        );
        const cancel = vendorModal
          .getByRole('button', { name: /cancel|close/i })
          .first();
        if (await cancel.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancel.click({ force: true }).catch(() => {});
        } else {
          await this.page.keyboard.press('Escape').catch(() => {});
        }
        await vendorModal
          .waitFor({ state: 'hidden', timeout: 8000 })
          .catch(() => {});
        await this.page.waitForTimeout(600);

        const stillOpen = await resolveVendorModal()
          .getByText(/add vendor|select vendor|change vendor/i)
          .isVisible({ timeout: 1500 })
          .catch(() => false);
        if (!stillOpen) {
          await addVendorBtn.click({ timeout: 30000 }).catch((err) => {
            console.log(
              `[PO] Reopen Add Vendor Details failed: ${err.message}`
            );
          });
          await expect(
            resolveVendorModal().getByText(
              /add vendor|select vendor|change vendor/i
            )
          )
            .toBeVisible({ timeout: 30000 })
            .catch(() => {});
        }
        continue;
      }
    }

    if (!selected) {
      const diag = await resolveVendorModal()
        .evaluate((el) => ({
          skeletons: el.querySelectorAll('.MuiSkeleton-root').length,
          radios: el.querySelectorAll('input[type="radio"], [role="radio"]')
            .length,
          rows: el.querySelectorAll('table tbody tr').length,
          text: (el.innerText || '').slice(0, 400),
        }))
        .catch(() => ({}));
      throw new Error(
        `PO vendor modal: could not select a vendor (list never became interactive). diag=${JSON.stringify(diag)}`
      );
    }

    vendorModal = resolveVendorModal();
    const yopmailFromRow = await this.tryReadYopmailFromVendorModal(vendorModal, {
      preferEmail:
        opts.preferEmail ||
        process.env.PO_VENDOR_YOPMAIL_ID ||
        process.env.PO_VENDOR_YOPMAIL_LOGIN ||
        'bhavanimmm12345@yopmail.com',
      excludeEmails: [
        process.env.ADMIN_EMAIL,
        'aadhi@yopmail.com',
        'testintoaec@gmail.com',
      ],
    });

    const addBtn = vendorModal
      .getByRole('button', { name: /^Add$/i })
      .last()
      .or(this.page.getByRole('button', { name: /^Add$/i }).last());
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.page
      .waitForLoadState('networkidle', { timeout: 20000 })
      .catch(() => {});

    await expect(this.page).toHaveURL(/purchase-order\/create/);

    await expect(
      this.page.getByRole('button', { name: /change vendor/i })
    ).toBeVisible({ timeout: 60000 });

    // Only dismiss if the vendor picker is still covering the form — do not Escape blindly
    // (Escape can close the PO create panel and remove the line-items table).
    const leftoverPicker = this.page
      .locator('.MuiModal-root, [role="dialog"]')
      .filter({
        has: this.page.getByText(/add vendor|select vendor/i),
      })
      .filter({ visible: true })
      .first();
    if (await leftoverPicker.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await leftoverPicker
        .waitFor({ state: 'hidden', timeout: 8000 })
        .catch(() => {});
    }
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    console.log('[PO] Added first vendor from vendor modal');
    return yopmailFromRow;
  }

  async ensurePoLineItemsTableVisible() {
    let table = this.page.locator('[aria-label="PO line items table"]').first();
    if (!(await table.isVisible({ timeout: 3000 }).catch(() => false))) {
      table = this.page.locator('[aria-label*="line items" i]').first();
    }
    if (!(await table.isVisible({ timeout: 3000 }).catch(() => false))) {
      table = this.page
        .locator('table')
        .filter({ has: this.page.getByPlaceholder(/material name/i) })
        .first();
    }
    if (!(await table.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.scrollPoFormTowardLineItems();
      table = this.page
        .locator(
          '[aria-label="PO line items table"], [aria-label*="line items" i]'
        )
        .first()
        .or(
          this.page
            .locator('table')
            .filter({ has: this.page.getByPlaceholder(/material name/i) })
            .first()
        );
    }
    if (!(await table.isVisible({ timeout: 8000 }).catch(() => false))) {
      // Some PO create builds only render the table after "+ Add Manually".
      return null;
    }
    await table.scrollIntoViewIfNeeded().catch(() => {});
    return table;
  }

  async scrollPoFormTowardLineItems() {
    await this.page
      .evaluate(() => {
        const candidates = [
          document.querySelector('main'),
          document.querySelector('[role="main"]'),
          document.querySelector('.MuiDrawer-content'),
          document.scrollingElement,
          document.documentElement,
          document.body,
        ].filter(Boolean);
        for (const el of candidates) {
          try {
            if (el.scrollHeight > el.clientHeight + 40) {
              el.scrollTop = Math.min(
                el.scrollHeight,
                Math.max(el.scrollTop, 800)
              );
            }
          } catch {
            /* ignore */
          }
        }
        window.scrollBy(0, 600);
      })
      .catch(() => {});
    await this.page.waitForTimeout(250);
  }

  async clickAddManuallyOnPurchaseOrderForm() {
    await this.dismissOpenMenusAndPopovers().catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.scrollPoFormTowardLineItems();

    // Confirm still on create form (vendor add can leave Change Vendor without a table yet).
    await expect(
      this.page.getByRole('button', { name: /change vendor|add vendor details/i })
    ).toBeVisible({ timeout: 30000 });

    let table = await this.ensurePoLineItemsTableVisible();
    const rowCountBefore = table
      ? await table.locator('tbody tr').count().catch(() => 0)
      : 0;

    const addManually = this.page
      .getByText(/^\+\s*Add Manually$/i)
      .first()
      .or(this.page.locator('span.pointer').filter({ hasText: /add\s*manually/i }).first())
      .or(this.page.getByText(/add\s*manually/i).filter({ visible: true }).first())
      .or(this.page.getByRole('button', { name: /add\s*manually/i }).first());

    if (!(await addManually.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.scrollPoFormTowardLineItems();
      await this.page
        .evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          const se = document.scrollingElement || document.documentElement;
          if (se) se.scrollTop = se.scrollHeight;
        })
        .catch(() => {});
      await this.page.waitForTimeout(300);
    }

    if (!(await addManually.isVisible({ timeout: 8000 }).catch(() => false))) {
      const hint = await this.page
        .evaluate(() => {
          const body = (document.body && document.body.innerText) || '';
          return body
            .split(/\n/)
            .map((s) => s.trim())
            .filter((s) => /line item|manually|library|material|vendor/i.test(s))
            .slice(0, 20)
            .join(' | ');
        })
        .catch(() => '');
      throw new Error(
        `PO: "+ Add Manually" not found after vendor. URL=${this.page.url()} Nearby: ${hint || '(none)'}`
      );
    }

    await expect(addManually).toBeVisible({ timeout: 60000 });
    await addManually.scrollIntoViewIfNeeded().catch(() => {});
    await addManually.click({ force: true });

    // Table / material row may appear only after the click.
    table = await this.ensurePoLineItemsTableVisible();
    await expect(
      this.page.getByPlaceholder(/material name/i).last()
    ).toBeVisible({ timeout: 30000 });

    if (table && rowCountBefore === 0) {
      await expect
        .poll(async () => table.locator('tbody tr').count(), {
          timeout: 15000,
          message: 'PO: Add Manually did not add a line item row',
        })
        .toBeGreaterThan(0)
        .catch(() => {});
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    console.log('[PO] Clicked Add Manually');
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
   * Click the first visible unit option (fast; avoids scanning huge virtualized lists).
   * @param {import('@playwright/test').Locator} listbox
   */
  async pickFirstPoLineUnitFromOpenListbox(listbox) {
    const firstOption = listbox.getByRole('option').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.click();
  }

  /**
   * @param {import('@playwright/test').Locator} listbox
   * @deprecated Prefer pickFirstPoLineUnitFromOpenListbox — random scan hangs on large lists.
   */
  async pickRandomPoLineUnitFromOpenListbox(listbox) {
    await this.pickFirstPoLineUnitFromOpenListbox(listbox);
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
   * Select unit on a PO line row: partial name match, then first real option fallback.
   * @param {import('@playwright/test').Locator} row
   * @param {string} [unitLabel]
   */
  async selectPoLineRowUnit(row, unitLabel = 'Nos') {
    await row.scrollIntoViewIfNeeded();
    const unitSelect = await this.getPoLineRowUnitSelectLocator(row);
    if (!unitSelect) {
      throw new Error(
        'PO line item: unit control not found (expected MUI select or combobox).'
      );
    }

    const existing = await this.getPoLineRowUnitDisplayText(row);
    if (!this.isPoLineUnitPlaceholderText(existing)) {
      return;
    }

    await unitSelect.click({ timeout: 20000 }).catch(async () => {
      await unitSelect.click({ force: true, timeout: 10000 });
    });

    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox).toBeVisible({ timeout: 20000 });

    const label = String(unitLabel || 'Nos').trim();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(escaped, 'i');

    const optionCandidates = [
      listbox.getByRole('option', { name: nameRe }).first(),
      listbox.getByRole('option').filter({ hasText: nameRe }).first(),
      this.page.getByRole('option', { name: nameRe }).first(),
      this.page.getByRole('option').filter({ hasText: nameRe }).first(),
    ];

    let picked = false;
    for (const option of optionCandidates) {
      if (await option.isVisible({ timeout: 2500 }).catch(() => false)) {
        await option.click();
        picked = true;
        break;
      }
    }

    if (!picked) {
      await this.pickFirstPoLineUnitFromOpenListbox(listbox);
    }

    await listbox.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await expect(unitSelect)
      .toHaveAttribute('aria-expanded', 'false', { timeout: 15000 })
      .catch(() => {});
    await this.dismissOpenMenusAndPopovers();
  }

  /** Open unit dropdown on a line row and pick the first option. */
  async selectFirstPoLineRowUnit(row) {
    await row.scrollIntoViewIfNeeded();
    const unitSelect = await this.getPoLineRowUnitSelectLocator(row);
    if (!unitSelect) {
      throw new Error(
        'PO line item: unit control not found (expected MUI select or combobox).'
      );
    }

    const existing = await this.getPoLineRowUnitDisplayText(row);
    if (!this.isPoLineUnitPlaceholderText(existing)) {
      return;
    }

    await unitSelect.click({ timeout: 20000 }).catch(async () => {
      await unitSelect.click({ force: true, timeout: 10000 });
    });

    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox).toBeVisible({ timeout: 20000 });
    await this.pickFirstPoLineUnitFromOpenListbox(listbox);

    await listbox.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await expect(unitSelect)
      .toHaveAttribute('aria-expanded', 'false', { timeout: 15000 })
      .catch(() => {});
    await this.dismissOpenMenusAndPopovers();
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
        await this.pickFirstPoLineUnitFromOpenListbox(listbox);
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
   * - Default: `page.pause()` — use Playwright Inspector ▶ to resume after units are set (headed).
   * - `PO_IMPORT_MANUAL_UNITS_STDIN=1`: press ENTER in the terminal instead of Inspector.
   * After resume, asserts every line row with a unit control has a real unit selected.
   */
  async waitForManualPoLineUnitCompletionBeforeCompose() {
    await this.ensurePoLineItemsTableVisible();
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();

    const useStdin =
      process.env.PO_IMPORT_MANUAL_UNITS_STDIN === '1' ||
      /^true$/i.test(String(process.env.PO_IMPORT_MANUAL_UNITS_STDIN || ''));

    // eslint-disable-next-line no-console
    console.log(
      '\n[PO import] Fill any missing line-item units in the browser, then continue the test.\n' +
        (useStdin
          ? '            → Press ENTER in this terminal when done.\n'
          : '            → Resume in the Playwright Inspector (▶) when done.\n')
    );

    if (useStdin) {
      await this.waitForEnterInTerminal(
        'Press ENTER here after all units are filled (then Action → Compose email → Send).'
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
   * Import flow before compose: auto-fills units after vendor, unless `PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE=1`.
   */
  async preparePoLineUnitsBeforeComposeEmailImportFlow() {
    const manual =
      process.env.PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE === '1' ||
      /^true$/i.test(String(process.env.PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE || ''));
    if (manual) {
      await this.waitForManualPoLineUnitCompletionBeforeCompose();
    } else {
      await this.ensureAllPoLineItemUnitsFilled({ settleFirst: true });
    }
  }

  async fillLastPoLineItemRow({
    itemName,
    description,
    quantity,
    unitLabel,
    rate,
    lightNetworkWaits = false,
    skipUnit = false,
    useFirstUnitOption = false,
  }) {
    let table = await this.ensurePoLineItemsTableVisible();
    if (!table) {
      await expect(
        this.page.getByPlaceholder(/material name/i).last()
      ).toBeVisible({ timeout: 30000 });
      table = this.page
        .locator('table')
        .filter({ has: this.page.getByPlaceholder(/material name/i) })
        .last();
    }
    await expect(table).toBeVisible({ timeout: 30000 });
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
    if (lightNetworkWaits) {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    } else {
      await this.waitForNetworkSettled();
    }

    if (!skipUnit) {
      if (useFirstUnitOption) {
        await this.selectFirstPoLineRowUnit(dataRow);
      } else {
        await this.selectPoLineRowUnit(dataRow, unitLabel);
      }
    }

    const rateInput = dataRow.locator('td').nth(3).locator('input').first();
    await expect(rateInput).toBeVisible({ timeout: 20000 });
    await rateInput.click();
    await rateInput.fill(String(rate));
    await rateInput.blur();

    if (lightNetworkWaits) {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    } else {
      await this.waitForNetworkSettled();
    }
  }

  async addLineItemManually(args) {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.clickAddManuallyOnPurchaseOrderForm();
    await this.fillLastPoLineItemRow({
      ...args,
      lightNetworkWaits: true,
      useFirstUnitOption: args.useFirstUnitOption ?? true,
    });
  }

  /**
   * Reads *@yopmail.com or *@mailinator.com addresses from the visible compose dialog.
   * Skips excluded addresses (e.g. admin login) and prefers an expected vendor inbox.
   * @param {{ preferEmail?: string, excludeEmails?: string[] }} [opts]
   */
  async readYopmailAddressFromComposeDialog(opts = {}) {
    const inboxRe = /[\w.+-]+@(?:yopmail|mailinator)\.com/gi;
    const prefer = String(opts.preferEmail || '').trim().toLowerCase();
    const exclude = new Set(
      (opts.excludeEmails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
    );
    const deadline = Date.now() + this.composeModalTimeout;

    const collectFromDialog = async (emailDialog) => {
      const found = new Set();
      const blob = (await emailDialog.textContent().catch(() => '')) || '';
      for (const m of blob.match(inboxRe) || []) found.add(m.toLowerCase());

      const inputs = emailDialog.locator('input');
      const n = await inputs.count().catch(() => 0);
      for (let i = 0; i < n; i++) {
        const v = await inputs.nth(i).inputValue().catch(() => '');
        for (const m of v.match(inboxRe) || []) found.add(m.toLowerCase());
      }

      const chips = emailDialog.locator('[class*="chip" i], [class*="Chip" i], span, div');
      const chipCount = Math.min(await chips.count().catch(() => 0), 40);
      for (let i = 0; i < chipCount; i++) {
        const t = (await chips.nth(i).innerText().catch(() => '')) || '';
        for (const m of t.match(inboxRe) || []) found.add(m.toLowerCase());
      }
      return [...found];
    };

    const pick = (list) => {
      if (prefer && list.includes(prefer) && !exclude.has(prefer)) return prefer;
      const notExcluded = list.find((e) => !exclude.has(e));
      return notExcluded || null;
    };

    while (Date.now() < deadline) {
      const anyVisible = this.page.getByRole('dialog').filter({ visible: true });
      const count = await anyVisible.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const dlg = anyVisible.nth(i);
        const all = await collectFromDialog(dlg);
        const chosen = pick(all);
        if (chosen) return chosen;
      }
      await this.page.waitForTimeout(450);
    }

    throw new Error(
      'Could not find a vendor *@yopmail.com / *@mailinator.com address in the compose To field (admin inbox addresses are ignored).'
    );
  }

  /**
   * Ensure compose To includes the given email.
   * If the vendor already locked To to that address (disabled input), treat as done.
   */
  async ensureComposeRecipientEmail(email) {
    const target = String(email || '').trim().toLowerCase();
    if (!target) throw new Error('ensureComposeRecipientEmail: email is empty');

    await this.waitForComposeEmailDialogShellOpen();
    const dialog = this.visibleComposeEmailDialog().first();
    await expect(dialog).toBeVisible({ timeout: 30000 });

    const targetRe = new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const toInput = dialog
      .getByPlaceholder(/^to$/i)
      .or(dialog.getByRole('combobox', { name: /^to$/i }))
      .or(dialog.getByLabel(/^to$/i))
      .or(dialog.getByPlaceholder(/to|email|recipient/i))
      .or(dialog.locator('input[placeholder="To"], input[type="email"], input[role="combobox"]').first())
      .first();

    // Vendor-locked To often shows as a disabled input with the address already filled.
    if (await toInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const value = String((await toInput.inputValue().catch(() => '')) || '')
        .trim()
        .toLowerCase();
      if (value.includes(target) || targetRe.test(value)) {
        console.log(`[PO compose] To already set (may be locked): ${value || target}`);
        return target;
      }
      const enabled = await toInput.isEnabled().catch(() => false);
      if (!enabled) {
        const blob = ((await dialog.innerText().catch(() => '')) || '').toLowerCase();
        if (blob.includes(target)) {
          console.log(`[PO compose] To locked but dialog shows ${target}`);
          return target;
        }
        console.log(
          `[PO compose] To input disabled without ${target} — continuing with vendor default`
        );
        return target;
      }
      await toInput.click({ timeout: 10000 });
      await this.page.keyboard.type(target, { delay: 20 });
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);
      console.log(`[PO compose] Ensured To recipient: ${target}`);
      return target;
    }

    if (await dialog.getByText(targetRe).first().isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`[PO compose] To already includes ${target}`);
      return target;
    }

    console.log(
      `[PO compose] Warning: could not find editable To for ${target} (continuing)`
    );
    return target;
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
    await this.waitForComposeEmailModalReady();
  }

  /** Topmost visible “Send email” in a portal stack (compose opens before inner tree finishes). */
  locatorVisibleComposeSendEmailButton() {
    return this.page
      .getByRole('button', { name: /send email/i })
      .filter({ visible: true })
      .last();
  }

  locatorComposeSendEmailButtonInVisibleDialog() {
    return this.visibleComposeEmailDialog()
      .first()
      .getByRole('button', { name: /send email/i });
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
    await this.ensureAllPoLineItemUnitsFilled({ settleFirst: true });

    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.click();
    const updateItem = this.page.getByRole('menuitem', { name: /^update$/i });
    await expect(updateItem).toBeVisible({ timeout: this.defaultTimeout });
    await updateItem.click();

    await Promise.race([
      this.locatorPoUpdatedSuccessToast().waitFor({
        state: 'visible',
        timeout: 90000,
      }),
      this.page.waitForURL(
        (url) =>
          /client\/profile/i.test(url.href) &&
          !/purchase-order\/edit/i.test(url.href),
        { timeout: 90000 }
      ),
      this.page
        .getByText(/po no/i)
        .first()
        .waitFor({ state: 'visible', timeout: 90000 }),
    ]).catch(() => {});

    await this.waitForNetworkSettled();
  }

  locatorPoUpdatedSuccessToast() {
    const re =
      /purchase order updated|po updated|updated successfully|update successful|saved successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  async expectPurchaseOrderUpdatedSuccessToast() {
    const toast = this.locatorPoUpdatedSuccessToast();
    if (await toast.isVisible({ timeout: 20000 }).catch(() => false)) {
      return;
    }

    if (this.page.url().includes('purchase-order/edit')) {
      await this.ensureAllPoLineItemUnitsFilled({ settleFirst: true });
    }

    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  /**
   * React-Toastify: `role="alert"` is on `.Toastify__toast`, not `.Toastify__toast-body`.
   * `hasText` on `.Toastify__toast` still matches body copy (subtree).
   */
  locatorEmailSentSuccessToast() {
    const re =
      /email sent successfully|correo enviado|mail sent|reminder sent|sent successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  locatorPoCreatedAndSentToast() {
    const re =
      /PO created[\s&.,-]*sent[\s\w&.,-]*successfully|PO created[\s&.,-]*sent[\s\w&.,-]*for approval|purchase order created[\s&.,-]*sent|purchase order.*sent.*successfully|po.*sent.*successfully|email sent successfully|sent successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  /**
   * @param {{ prioritizeEmailSentToast?: boolean }} [options] - Reminder/list compose: assert toast before long networkidle so auto-dismiss cannot hide it.
   */
  async sendEmailFromComposeModal(options = {}) {
    const prioritizeEmailSentToast = !!options.prioritizeEmailSentToast;
    await this.waitForComposeEmailModalReady();

    const emailDialog = this.locatorComposeEmailDialogForClose();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();

    const emailSentToast = this.locatorEmailSentSuccessToast();
    const poCreatedSentToast = this.locatorPoCreatedAndSentToast();
    this.poCreatedAndSentSuccessObserved = false;

    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
      // eslint-disable-next-line no-console
      console.log('[PO compose] Clicked Send email in the compose dialog.');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(
        `[PO compose] Normal Send email click failed; retrying with force. ${error.message}`
      );
      await this.dismissOpenMenusAndPopovers();
      await expect(send).toBeVisible({ timeout: 15000 });
      await expect(send).toBeEnabled({ timeout: 15000 });
      await send.click({ timeout: 15000, force: true });
    }

    const observeSuccessToast = Promise.race([
      emailSentToast.waitFor({ state: 'visible', timeout: 90000 }),
      poCreatedSentToast.waitFor({ state: 'visible', timeout: 90000 }),
    ]).then(() => {
      this.poCreatedAndSentSuccessObserved = true;
    });

    if (prioritizeEmailSentToast) {
      await observeSuccessToast;
      await this.page.waitForLoadState('domcontentloaded');
      await this.page
        .waitForLoadState('networkidle', { timeout: 25000 })
        .catch(() => {});
      await emailDialog.waitFor({ state: 'hidden', timeout: 90000 }).catch(() => {});
    } else {
      await Promise.race([
        emailDialog.waitFor({ state: 'hidden', timeout: 90000 }),
        observeSuccessToast,
      ]);
      await this.waitForNetworkSettled();
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
  expandOnlyButtonOnPoCard(card) {
    return card.getByRole('button', { name: /^expand$/i }).filter({ visible: true }).first();
  }

  collapseButtonOnPoCard(card) {
    return card.getByRole('button', { name: /^collapse$/i }).filter({ visible: true }).first();
  }

  async resolvePoRowExpandClickTarget(card) {
    const expandText = card
      .locator('button')
      .filter({ hasText: /^expand$/i })
      .filter({ visible: true })
      .first();
    if (await expandText.isVisible({ timeout: 1200 }).catch(() => false)) {
      return expandText;
    }
    const expandRole = this.expandOnlyButtonOnPoCard(card);
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

  /** Expand PO list card row so kebab menu shows full actions (Cancel, etc.). */
  async ensurePoCardRowExpanded(card) {
    if (await this.collapseButtonOnPoCard(card).isVisible({ timeout: 4000 }).catch(() => false)) {
      return;
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await this.collapseButtonOnPoCard(card).isVisible({ timeout: 500 }).catch(() => false)) {
        return;
      }

      const target = await this.resolvePoRowExpandClickTarget(card);
      if (!(await target.isVisible({ timeout: 4000 }).catch(() => false))) {
        break;
      }

      const useForce = attempt >= 1;
      await target.click({ timeout: 15000, force: useForce }).catch(async () => {
        await target.click({ timeout: 15000, force: true });
      });
      await this.page.waitForTimeout(450);

      if (await this.collapseButtonOnPoCard(card).isVisible({ timeout: 2000 }).catch(() => false)) {
        return;
      }
    }
  }

  kebabButtonOnPoCard(card) {
    const vert = card
      .locator(
        'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"])'
      )
      .filter({ visible: true })
      .first();
    const byAria = card
      .locator('button[aria-label*="more" i], button[title*="more" i]')
      .filter({ visible: true })
      .first();
    return vert.or(byAria);
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
    if (this.poCreatedAndSentSuccessObserved) return;

    const toast = this.locatorPoCreatedAndSentToast();
    if (await toast.isVisible({ timeout: 15000 }).catch(() => false)) {
      return;
    }

    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
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
