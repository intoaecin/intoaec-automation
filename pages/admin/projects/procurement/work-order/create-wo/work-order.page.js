const { expect } = require('@playwright/test');
const PurchaseOrderCreatePoPage = require('../../purchase-order/create-po/purchase-order-create-po.page');
const ProjectProfilePage = require('../../../ProjectProfilePage');

/**
 * Work Order list → create from scratch → title → manual line items.
 * Mirrors purchase-order-create-po.page.js for the WO module.
 */
class WorkOrderPage extends PurchaseOrderCreatePoPage {
  constructor(page) {
    super(page);
    this.woFastMode = process.env.WO_SLOW !== 'true';
    this.woUiTimeout = this.woFastMode ? 45000 : this.defaultTimeout;
    this.workOrderTitleXPath =
      'xpath=/html/body/div[1]/div/div[2]/div/div/div/div/div[1]/div/div/div[2]/div/div[1]/div[1]/div/div/div/div/input';
    this.workOrderTitleInputCandidates = [
      page.getByRole('textbox', { name: 'Title' }),
      page.locator('input[name="estimation name"]').first(),
      page.getByPlaceholder('Title', { exact: true }).first(),
      page.locator(this.workOrderTitleXPath),
    ];
  }

  buildRandomWorkOrderTitle() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `WO auto ${new Date().toISOString().slice(0, 10)} ${suffix}`;
  }

  buildRandomWoLineItemRate() {
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  buildRandomWoScopeOfWork() {
    const suffix = Math.random().toString(36).slice(2, 6);
    return `WO scope ${suffix}`;
  }

  buildRandomWoLineItemDescription() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `Auto WO line description ${suffix}`;
  }

  buildRandomWoLineItemQuantity() {
    return String(1 + Math.floor(Math.random() * 50));
  }

  buildRandomWoLineItemUnit() {
    const units = ['Nos', 'Sqft', 'Rft', 'Kg'];
    return units[Math.floor(Math.random() * units.length)];
  }

  async fillWorkOrderTitleWithRandomValue() {
    const title = this.buildRandomWorkOrderTitle();
    await this.fillWorkOrderTitle(title);
    return title;
  }

  async clickWorkOrderModuleCard() {
    const profile = new ProjectProfilePage(this.page);
    await profile.clickModuleCard('Work Order');
  }

  /** Projects → first project → Procurement → Work Order (one call, no Cucumber step gaps). */
  async navigateToWorkOrderModuleForFirstProject() {
    const ProjectNavigationPage = require('../../../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    if (!(await profile.isInsideProjectProfile().catch(() => false))) {
      await nav.navigateToProjects();
      await nav.clickFirstProject();
    }

    await profile.selectHeading('Procurement');
    await this.clickWorkOrderModuleCard();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[WO] Navigated to Work Order module.');
  }

  workOrderTitleInput() {
    return this.page.getByRole('textbox', { name: 'Title' });
  }

  createWorkOrderButton() {
    return this.page.getByRole('button', { name: 'Create Work Order' });
  }

  async resolveCreateWorkOrderButton() {
    const main = this.page.locator('main, [role="main"]').first();
    const scopes = (await main.isVisible({ timeout: 500 }).catch(() => false))
      ? [main, this.page]
      : [this.page];

    const buildCandidates = (scope) => [
      scope.getByRole('button', { name: 'Create Work Order' }),
      scope.getByRole('button', { name: /create work order/i }),
      scope.locator('button, a, [role="button"]').filter({ hasText: /create work order/i }),
    ];

    for (const scope of scopes) {
      for (const candidate of buildCandidates(scope)) {
        const btn = candidate.first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          return btn;
        }
      }
    }

    return this.page.getByRole('button', { name: 'Create Work Order' }).first();
  }

  async waitForWoUiSettled() {
    await this.page
      .waitForLoadState('domcontentloaded', { timeout: 15000 })
      .catch(() => {});
    if (!this.woFastMode) {
      await this.waitForNetworkSettled();
    }
  }

  async ensureWorkOrderListReadyIfNeeded() {
    const createBtn = this.createWorkOrderButton();
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }
    await this.ensureWorkOrderListReady();
  }

  /** Re-stabilize WO list after Cucumber step gaps (headed 2s delay can drop the create button). */
  async prepareWorkOrderListForCreateClick() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    const createBtn = this.createWorkOrderButton();
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      return createBtn;
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.activateWorkOrderSubTab();
    await this.dismissListSkeletons();

    let resolvedBtn = null;
    await expect
      .poll(
        async () => {
          resolvedBtn = await this.resolveCreateWorkOrderButton();
          return resolvedBtn.isVisible({ timeout: 500 }).catch(() => false);
        },
        {
          timeout: this.woFastMode ? 30000 : 60000,
          intervals: this.woFastMode ? [200, 300, 500] : [300, 500, 1000, 2000],
        }
      )
      .toBe(true);

    return resolvedBtn || (await this.resolveCreateWorkOrderButton());
  }

  async isWorkOrderTitleFieldVisible() {
    if (await this.workOrderTitleInput().isVisible({ timeout: 2000 }).catch(() => false)) {
      return true;
    }
    for (const candidate of this.workOrderTitleInputCandidates.slice(1)) {
      if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  /** Get Started dialog appears for some flows; codegen goes straight to Title after Create. */
  async completeWorkOrderCreateEntryIfNeeded() {
    const titleVisible = await this.isWorkOrderTitleFieldVisible();
    if (titleVisible) {
      return;
    }

    const dialog = this.purchaseOrderStartDialog();
    if (await dialog.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.startFromScratchAndProceed();
      return;
    }

    await this.waitForWorkOrderCreateForm();
  }

  async clickCreateWorkOrderButton({ skipListPrep = false } = {}) {
    const createBtn = skipListPrep
      ? await this.resolveCreateWorkOrderButton()
      : await this.prepareWorkOrderListForCreateClick();
    await expect(createBtn).toBeVisible({ timeout: this.woUiTimeout });
    await expect(createBtn).toBeEnabled({ timeout: this.woFastMode ? 15000 : 30000 });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async openCreateWorkOrderStartDialog() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.clickCreateWorkOrderButton();
    await this.completeWorkOrderCreateEntryIfNeeded();
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
    await expect
      .poll(
        async () =>
          /work[-_]?orders?\/create/i.test(this.page.url()) ||
          (await this.isWorkOrderTitleFieldVisible()),
        { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
  }

  /** Codegen path: Create Work Order → Title textbox (Get Started only if shown). */
  async openWorkOrderCreateFormFromScratch() {
    await this.ensureWorkOrderListReadyIfNeeded();
    await this.clickCreateWorkOrderButton();
    await this.completeWorkOrderCreateEntryIfNeeded();
  }

  /** List → create form → fill title in one flow (no Cucumber step gap). */
  async openWorkOrderCreateFormFromScratchAndFillTitle(title) {
    await this.openWorkOrderCreateFormFromScratch();
    await this.fillWorkOrderTitle(title);
  }

  async activateWorkOrderSubTab() {
    const woTab = this.page.getByRole('tab', { name: /work order/i });
    if (!(await woTab.isVisible({ timeout: 15000 }).catch(() => false))) {
      return;
    }

    const selected = await woTab.getAttribute('aria-selected').catch(() => null);
    if (selected === 'true') {
      return;
    }

    await woTab.scrollIntoViewIfNeeded().catch(() => {});
    await woTab.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Same shape as ensurePurchaseOrderListReady — WO tab + Create button, no module-card re-click. */
  async ensureWorkOrderListReady() {
    await this.page
      .waitForURL(
        (url) => {
          const href = typeof url === 'string' ? url : url.href;
          return (
            /tab=RFQAndPO/i.test(href) &&
            (/subTab=WO/i.test(href) || /subTab%3DWO/i.test(href))
          );
        },
        { timeout: this.woFastMode ? 45000 : 90000 }
      )
      .catch(() => {});

    await this.prepareWorkOrderListForCreateClick();
  }

  async openWorkOrderCreateFormFromScratchAndFillRandomTitle() {
    const title = this.buildRandomWorkOrderTitle();
    await this.openWorkOrderCreateFormFromScratchAndFillTitle(title);
    return title;
  }

  async waitForWorkOrderCreateForm() {
    const titleField = this.workOrderTitleInput();
    await expect(titleField).toBeVisible({ timeout: this.woUiTimeout });
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    }).catch(() => {});
    await this.dismissListSkeletons();
    await titleField.scrollIntoViewIfNeeded().catch(() => {});
    return titleField;
  }

  async resolveVisibleWorkOrderTitleInput() {
    for (const candidate of this.workOrderTitleInputCandidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        return candidate;
      }
    }

    const visibleTextInput = this.page
      .locator('input:not([type="hidden"]), textarea')
      .filter({ visible: true })
      .first();

    if (await visibleTextInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      return visibleTextInput;
    }

    throw new Error(
      'WO create: could not find a visible editable title input on the work order create form.'
    );
  }

  /** Codegen: getByRole('textbox', { name: 'Title' }).click().fill(...) */
  async fillWorkOrderTitle(title) {
    const value = String(title || '').trim();
    if (!value) {
      throw new Error('WO create: work order title must be non-empty.');
    }

    const titleField = await this.waitForWorkOrderCreateForm();
    await titleField.click({ timeout: 15000 });
    await titleField.fill('');
    await titleField.fill(value);

    await expect
      .poll(async () => (await titleField.inputValue().catch(() => '')).trim(), {
        timeout: this.woFastMode ? 10000 : 20000,
        intervals: this.woFastMode ? [100, 200, 400] : [200, 400, 800],
      })
      .toBe(value);

    await this.waitForWoUiSettled();
    this.lastWorkOrderTitle = value;
    // eslint-disable-next-line no-console
    console.log(`[WO create] Filled work order title: ${value}`);
  }

  async expectWorkOrderCreateFormDisplayed() {
    await this.waitForWorkOrderCreateForm();
    await expect(this.page).toHaveURL(/work[-_]?order\/create/i);
    if (this.lastWorkOrderTitle) {
      const input = await this.resolveVisibleWorkOrderTitleInput();
      await expect
        .poll(async () => (await input.inputValue().catch(() => '')).trim(), {
          timeout: 15000,
        })
        .toBe(this.lastWorkOrderTitle);
    }
  }

  /** WO create form — same vendor modal flow as PO, without PO-only URL assertion. */
  async addWorkOrderVendorFromModal() {
    const vendorTimeout = this.woFastMode ? 45000 : 90000;
    const addVendorBtn = this.page.getByRole('button', { name: 'Add Vendor Details' });
    await addVendorBtn.waitFor({ state: 'visible', timeout: vendorTimeout });
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
      await skeleton.waitFor({
        state: 'hidden',
        timeout: this.woFastMode ? 30000 : 90000,
      });
    }

    const noData = vendorModal.getByText(/no data found/i);
    if (await noData.isVisible({ timeout: 5000 }).catch(() => false)) {
      throw new Error(
        'WO vendor modal has no organizations. Connect or invite a vendor in User Hub first.'
      );
    }

    const firstCell = vendorModal.getByRole('cell').first();
    if (await firstCell.isVisible({ timeout: 10000 }).catch(() => false)) {
      await firstCell.click({ timeout: 15000 });
    } else {
      const firstRadio = vendorModal.locator('table tbody input[type="radio"]').first();
      await firstRadio.waitFor({
        state: 'visible',
        timeout: this.woFastMode ? 30000 : 60000,
      });
      await firstRadio.check({ timeout: 15000 }).catch(() => firstRadio.click({ force: true }));
    }

    const addBtn = this.page.getByRole('button', { name: 'Add', exact: true });
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForWoUiSettled();

    await expect(
      this.page.getByRole('button', { name: /change vendor|add vendor details/i })
    ).toBeVisible({ timeout: this.woFastMode ? 30000 : 60000 });

    // eslint-disable-next-line no-console
    console.log('[WO create] Added first vendor from vendor modal.');
  }

  async ensureWoLineItemsTableVisible() {
    let table = this.page.locator('[aria-label="WO line items table"]').first();
    if (!(await table.isVisible({ timeout: 3000 }).catch(() => false))) {
      table = this.page.locator('[aria-label="PO line items table"]').first();
    }
    if (!(await table.isVisible({ timeout: 3000 }).catch(() => false))) {
      table = this.page.locator('[aria-label*="line items" i]').first();
    }
    await expect(table).toBeVisible({ timeout: this.defaultTimeout });
    await table.scrollIntoViewIfNeeded();
    return table;
  }

  async clickAddManuallyOnWorkOrderForm() {
    await this.ensureWoLineItemsTableVisible();
    await this.page
      .getByText(/line items/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    const candidates = [
      this.page.getByText('+ Add Manually').first(),
      this.page.getByText(/^\+?\s*Add Manually$/i).first(),
      this.page.getByText(/add manually/i).first(),
      this.page.locator('span.pointer').filter({ hasText: /add manually/i }).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded();
        await candidate.click({ force: true, timeout: 30000 });
        await this.waitForWoUiSettled();
        // eslint-disable-next-line no-console
        console.log('[WO create] Clicked + Add Manually on line items.');
        return;
      }
    }

    throw new Error('WO create: + Add Manually control not found in line items section.');
  }

  async waitForWoServiceNameField() {
    const serviceName = this.page.getByRole('textbox', { name: 'Service Name' });
    await expect(serviceName).toBeVisible({ timeout: 30000 });
    return serviceName;
  }

  /** Codegen: Service Name → qty cell → Nos combobox → weight (rate). */
  async fillWoLineItemCodegenPattern({
    scopeOfWork,
    quantity,
    unitLabel,
    unitRate,
  }) {
    const serviceName = await this.waitForWoServiceNameField();
    await serviceName.click({ timeout: 15000 });
    await serviceName.fill(scopeOfWork);

    const qtyCellInput = this.page.getByRole('cell', { name: '1' }).getByRole('textbox');
    if (await qtyCellInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await qtyCellInput.click({ timeout: 10000 });
      await qtyCellInput.fill(String(quantity));
    } else {
      const table = await this.ensureWoLineItemsTableVisible();
      const dataRow = await this.getLastWoLineItemDataRow(table);
      const qtyInput = await this.resolveWoLineQtyInput(dataRow);
      await qtyInput.click({ timeout: 10000 });
      await qtyInput.fill(String(quantity));
    }

    const combobox = this.page.getByRole('combobox').filter({ visible: true }).last();
    await combobox.click({ timeout: 15000 });
    const unit = unitLabel || 'Nos';
    await this.page.getByRole('option', { name: unit, exact: true }).click({ timeout: 15000 });

    const weightField = this.page.getByRole('textbox', { name: 'weight' });
    await expect(weightField).toBeVisible({ timeout: 20000 });
    await weightField.click({ timeout: 10000 });
    await weightField.fill(String(unitRate));

    await this.waitForWoUiSettled();
  }

  woLineEditableInputLocator(row) {
    return row
      .locator(
        'input[type="text"], input[type="number"], input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])'
      )
      .filter({ visible: true });
  }

  async rowHasEditableWoLineItemField(row) {
    if (
      await this.page
        .getByRole('textbox', { name: 'Service Name' })
        .isVisible({ timeout: 500 })
        .catch(() => false)
    ) {
      return true;
    }

    const scope = row
      .getByPlaceholder(/scope of work|labour|labor|material name/i)
      .first();
    if (await scope.isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
    return this.woLineEditableInputLocator(row)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
  }

  async getLastWoLineItemDataRow(table) {
    let dataRow = null;
    await expect
      .poll(
        async () => {
          const rows = table.locator('tbody tr');
          const count = await rows.count();
          for (let i = count - 1; i >= 0; i -= 1) {
            const row = rows.nth(i);
            // eslint-disable-next-line no-await-in-loop
            if (await this.rowHasEditableWoLineItemField(row)) {
              dataRow = row;
              return true;
            }
          }
          return false;
        },
        { timeout: 30000, intervals: [300, 500, 1000] }
      )
      .toBe(true);

    return dataRow || table.locator('tbody tr').last();
  }

  async resolveWoLineItemScopeField(dataRow) {
    const pageServiceName = this.page.getByRole('textbox', { name: 'Service Name' });
    if (await pageServiceName.isVisible({ timeout: 3000 }).catch(() => false)) {
      return pageServiceName;
    }

    const candidates = [
      dataRow.getByRole('textbox', { name: 'Service Name' }).first(),
      dataRow.getByPlaceholder(/scope of work/i).first(),
      dataRow.getByPlaceholder(/labour|labor|material name/i).first(),
      dataRow.getByRole('textbox').first(),
      this.woLineEditableInputLocator(dataRow).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        return candidate;
      }
    }

    throw new Error('WO line item: could not find scope of work / labour work input.');
  }

  async clickAddDescriptionOnWoLineRow(dataRow) {
    const candidates = [
      dataRow.getByText(/^Add Description$/i).first(),
      dataRow.getByText(/add description/i).first(),
      dataRow.locator('span, a, button').filter({ hasText: /description/i }).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 15000 });
        return;
      }
    }

    throw new Error('WO line item: Add Description control not found on line row.');
  }

  async fillWoLineItemDescriptionDialog(description) {
    const descDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/add description/i) })
      .last();
    await expect(descDialog).toBeVisible({ timeout: 20000 });

    const descField = descDialog
      .locator('textarea')
      .first()
      .or(descDialog.locator('input').first());
    await descField.click({ timeout: 10000 });
    await descField.fill(description);

    await descDialog.getByRole('button', { name: /^Add$/i }).click();
    await expect(descDialog).toBeHidden({ timeout: 20000 });
  }

  async resolveWoLineQtyInput(dataRow) {
    const byPlaceholder = dataRow.getByPlaceholder(/qty|quantity/i).first();
    if (await byPlaceholder.isVisible({ timeout: 3000 }).catch(() => false)) {
      return byPlaceholder;
    }
    return dataRow
      .locator('td')
      .nth(1)
      .locator('input[type="text"], input[type="number"]')
      .filter({ visible: true })
      .first();
  }

  async resolveWoLineRateInput(dataRow) {
    const rowWeight = dataRow
      .locator('input[aria-label="weight"]')
      .or(dataRow.getByRole('textbox', { name: /weight/i }))
      .first();
    if (await rowWeight.isVisible({ timeout: 3000 }).catch(() => false)) {
      return rowWeight;
    }

    const weightField = this.page.getByRole('textbox', { name: 'weight' });
    if (await weightField.isVisible({ timeout: 3000 }).catch(() => false)) {
      return weightField;
    }

    const byPlaceholder = dataRow.getByPlaceholder(/rate|unit rate|amount|weight/i).first();
    if (await byPlaceholder.isVisible({ timeout: 3000 }).catch(() => false)) {
      return byPlaceholder;
    }

    const cellInputs = dataRow
      .locator('td input[type="text"], td input[type="number"]')
      .filter({ visible: true });
    const count = await cellInputs.count();
    if (count >= 2) {
      return cellInputs.nth(count - 1);
    }
    if (count === 1) {
      return cellInputs.first();
    }

    return dataRow
      .locator('td')
      .nth(3)
      .locator('input[type="text"], input[type="number"]')
      .filter({ visible: true })
      .first();
  }

  async fillLastWoLineItemRow({
    scopeOfWork,
    description,
    quantity,
    unitLabel,
    unitRate,
    table: tableOverride,
  }) {
    if (await this.page.getByRole('textbox', { name: 'Service Name' }).isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.fillWoLineItemCodegenPattern({
        scopeOfWork,
        quantity,
        unitLabel,
        unitRate,
      });
      return;
    }

    const table = tableOverride || (await this.ensureWoLineItemsTableVisible());
    const dataRow = await this.getLastWoLineItemDataRow(table);

    const nameField = await this.resolveWoLineItemScopeField(dataRow);
    await nameField.scrollIntoViewIfNeeded().catch(() => {});
    await nameField.click({ timeout: 15000 });
    await nameField.fill(scopeOfWork);

    if (description) {
      const addDescVisible = await dataRow
        .getByText(/add description/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (addDescVisible) {
        await this.clickAddDescriptionOnWoLineRow(dataRow);
        await this.fillWoLineItemDescriptionDialog(description);
      }
    }

    const qtyInput = await this.resolveWoLineQtyInput(dataRow);
    await expect(qtyInput).toBeVisible({ timeout: 20000 });
    await qtyInput.click({ timeout: 10000 });
    await qtyInput.fill(String(quantity));
    await qtyInput.blur();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const unitSelect = await this.getPoLineRowUnitSelectLocator(dataRow);
    if (unitSelect) {
      try {
        if (unitLabel) {
          await this.selectPoLineRowUnit(dataRow, unitLabel);
        } else {
          await this.selectFirstPoLineRowUnit(dataRow);
        }
      } catch {
        await this.selectFirstPoLineRowUnit(dataRow);
      }
    }

    const rateInput = await this.resolveWoLineRateInput(dataRow);
    await expect(rateInput).toBeVisible({ timeout: 20000 });
    await expect
      .poll(async () => rateInput.isEnabled().catch(() => false), {
        timeout: this.woUiTimeout,
        intervals: [200, 500, 1000, 2000],
      })
      .toBe(true);
    await rateInput.click({ timeout: 10000 });
    await rateInput.fill(String(unitRate));
    await rateInput.blur();

    await this.waitForWoUiSettled();
  }

  async addWorkOrderLineItemManually({
    scopeOfWork,
    description,
    quantity,
    unitLabel,
    unitRate,
  }) {
    if (!(await this.isWorkOrderTitleFieldVisible().catch(() => false))) {
      await this.waitForWorkOrderCreateForm();
    }
    const table = await this.ensureWoLineItemsTableVisible();
    await this.clickAddManuallyOnWorkOrderForm();
    await this.fillLastWoLineItemRow({
      scopeOfWork,
      description,
      quantity,
      unitLabel,
      unitRate,
      table,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[WO create] Line item: scope="${scopeOfWork}" qty=${quantity} unit=${unitLabel || 'n/a'} rate=${unitRate}`
    );
  }

  async addWorkOrderLineItemManuallyWithRandomDetails() {
    const scopeOfWork = 'labour work';
    const quantity = this.buildRandomWoLineItemQuantity();
    const unitLabel = 'Nos';
    const unitRate = this.buildRandomWoLineItemRate();

    await this.addWorkOrderLineItemManually({
      scopeOfWork,
      description: null,
      quantity,
      unitLabel,
      unitRate,
    });

    return { scopeOfWork, quantity, unitLabel, unitRate };
  }

  /** Labour work scope + random description/qty/unit/rate (matches manual WO flow). */
  async addWorkOrderLabourLineItemWithRandomDetails() {
    return this.addWorkOrderLineItemManuallyWithRandomDetails();
  }

  async addWorkOrderLineItemManuallyWithRandomRate({
    scopeOfWork,
    description,
    quantity,
    unitLabel,
  }) {
    const unitRate = this.buildRandomWoLineItemRate();
    await this.addWorkOrderLineItemManually({
      scopeOfWork,
      description,
      quantity,
      unitLabel,
      unitRate,
    });
    return unitRate;
  }
}



  // ----- from work-order-add-from-library.page.js -----
const WorkOrderCreatePage = require('./work-order-create.page');

/** Work Order create form — Add from library off-canvas (first checkbox → Add). */

  woLibraryDrawerRoot() {
    return this.page
      .locator(
        '.MuiDrawer-root, .MuiModal-root, .offcanvas.show, aside.offcanvas.show, [role="dialog"]'
      )
      .filter({ visible: true })
      .filter({ has: this.page.locator('table tbody') })
      .filter({ has: this.page.getByRole('button', { name: /^add$/i }) })
      .last();
  }

  locatorAddFromLibraryOnWoForm() {
    const table = this.page
      .locator('[aria-label="WO line items table"], [aria-label="PO line items table"]')
      .first();
    const nearLineItems = table
      .locator('xpath=ancestor::*[.//span[contains(@class,"pointer")]][position()<=6]')
      .last()
      .locator('span.pointer, button, a')
      .filter({ hasText: /add from library/i })
      .filter({ visible: true });

    return nearLineItems
      .first()
      .or(
        this.page
          .locator('span.pointer')
          .filter({ hasText: /add from library/i })
          .filter({ visible: true })
          .first()
      )
      .or(
        this.page.getByText(/add from library/i).filter({ visible: true }).first()
      );
  }

  async scrollWoLineItemsSectionIntoView() {
    const table = await this.ensureWoLineItemsTableVisible();
    await table.scrollIntoViewIfNeeded().catch(() => {});
    await this.page
      .getByText(/line items/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
  }

  async clickAddFromLibraryOnWorkOrderForm() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.scrollWoLineItemsSectionIntoView();

    const link = this.locatorAddFromLibraryOnWoForm();
    await expect(link).toBeVisible({ timeout: this.woUiTimeout });
    await link.scrollIntoViewIfNeeded().catch(() => {});

    const strategies = [
      () => link.click({ timeout: 20000 }),
      () => link.click({ force: true, timeout: 20000 }),
      () => link.evaluate((el) => el.click()),
    ];

    let lastError;
    for (const attempt of strategies) {
      try {
        await attempt();
        break;
      } catch (error) {
        lastError = error;
        await this.scrollWoLineItemsSectionIntoView();
      }
    }

    if (!(await this.woLibraryDrawerRoot().isVisible({ timeout: 3000 }).catch(() => false))) {
      if (lastError) throw lastError;
    }

    await expect(this.woLibraryDrawerRoot()).toBeVisible({
      timeout: this.woFastMode ? 45000 : 90000,
    });
    // eslint-disable-next-line no-console
    console.log('[WO library] Opened add from library off-canvas.');
  }

  async expectWorkOrderLibraryDrawerVisible() {
    const root = this.woLibraryDrawerRoot();
    await expect(root).toBeVisible({ timeout: this.woUiTimeout });
    await expect(root.locator('table')).toBeVisible({ timeout: this.woUiTimeout });
    await root
      .locator('.MuiSkeleton-root')
      .first()
      .waitFor({
        state: 'hidden',
        timeout: this.woFastMode ? 30000 : 90000,
      })
      .catch(() => {});
  }

  async hasSelectableRowInWorkOrderLibraryDrawer(root = this.woLibraryDrawerRoot()) {
    const radio = root.locator('tbody tr input[type="radio"]').first();
    const checkbox = root.locator('tbody tr input[type="checkbox"]').first();
    return (
      (await radio.isVisible({ timeout: 1500 }).catch(() => false)) ||
      (await checkbox.isVisible({ timeout: 1500 }).catch(() => false))
    );
  }

  async switchToMyItemsTabIfPresent(root = this.woLibraryDrawerRoot()) {
    const myTab = root.getByRole('tab', { name: /my items/i });
    if (!(await myTab.isVisible({ timeout: 2000 }).catch(() => false))) {
      return false;
    }
    const selected = await myTab.getAttribute('aria-selected').catch(() => null);
    if (selected !== 'true') {
      await myTab.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await root
        .locator('.MuiSkeleton-root')
        .first()
        .waitFor({
          state: 'hidden',
          timeout: this.woFastMode ? 30000 : 90000,
        })
        .catch(() => {});
    }
    return true;
  }

  async switchToLibraryItemsTabIfPresent(root = this.woLibraryDrawerRoot()) {
    const libTab = root.getByRole('tab', { name: /library items/i });
    if (!(await libTab.isVisible({ timeout: 2000 }).catch(() => false))) {
      return false;
    }
    const selected = await libTab.getAttribute('aria-selected').catch(() => null);
    if (selected === 'true') {
      return true;
    }
    await libTab.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await root
      .locator('.MuiSkeleton-root')
      .first()
      .waitFor({
        state: 'hidden',
        timeout: this.woFastMode ? 30000 : 90000,
      })
      .catch(() => {});
    return true;
  }

  /** True when My Items and Library Items have no selectable grid rows. */
  async isWorkOrderLibraryDrawerEmpty() {
    const root = this.woLibraryDrawerRoot();
    await this.expectWorkOrderLibraryDrawerVisible();

    if (await this.hasSelectableRowInWorkOrderLibraryDrawer(root)) {
      return false;
    }

    await this.switchToLibraryItemsTabIfPresent(root);
    if (await this.hasSelectableRowInWorkOrderLibraryDrawer(root)) {
      return false;
    }

    const noData = root.getByText(/no data found|no items found|no records/i);
    if (await noData.isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }

    return !(await this.hasSelectableRowInWorkOrderLibraryDrawer(root));
  }

  async resolveVisibleFieldInLibraryDrawer(root, candidates) {
    for (const build of candidates) {
      const field = build();
      if (await field.isVisible({ timeout: 2000 }).catch(() => false)) {
        return field;
      }
    }
    return null;
  }

  /**
   * When library grid is empty, fill Title and Description in the off-canvas (or inline row).
   */
  async fillWorkOrderLibraryEmptyStateTitleAndDescription({
    title = 'labour work',
    description,
  } = {}) {
    const root = this.woLibraryDrawerRoot();
    const desc = description || this.buildRandomWoLineItemDescription();

    const titleField = await this.resolveVisibleFieldInLibraryDrawer(root, [
      () => root.getByRole('textbox', { name: /^title$/i }),
      () => root.getByRole('textbox', { name: /service name/i }),
      () => root.getByPlaceholder(/^title$/i),
      () => root.getByPlaceholder(/service name/i),
      () =>
        root
          .locator('tbody tr')
          .first()
          .locator('input[type="text"]')
          .filter({ visible: true })
          .first(),
    ]);

    if (!titleField) {
      return false;
    }

    await titleField.click({ timeout: 10000 });
    await titleField.fill(title);

    const descField = await this.resolveVisibleFieldInLibraryDrawer(root, [
      () => root.getByRole('textbox', { name: /^description$/i }),
      () => root.getByPlaceholder(/description/i),
      () => root.locator('textarea').filter({ visible: true }).first(),
    ]);

    if (descField) {
      await descField.click({ timeout: 10000 }).catch(() => {});
      await descField.fill(desc);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[WO library] Empty library — filled title="${title}" and description in off-canvas.`
    );
    return true;
  }

  async dismissWorkOrderLibraryDrawer() {
    const root = this.woLibraryDrawerRoot();
    const cancelBtn = root.getByRole('button', { name: /cancel|close/i }).first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click({ timeout: 15000 });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await expect(root).toBeHidden({ timeout: 30000 }).catch(() => {});
  }

  /** Library empty: try title/description in drawer; else Add Manually on the WO form. */
  async continueWorkOrderLineItemAfterEmptyLibrary({
    title = 'labour work',
    description,
  } = {}) {
    const desc = description || this.buildRandomWoLineItemDescription();
    const filledInDrawer = await this.fillWorkOrderLibraryEmptyStateTitleAndDescription({
      title,
      description: desc,
    });

    if (filledInDrawer) {
      await this.clickAddInWorkOrderLibraryDrawer();
      await this.ensureAllWoLineItemFieldsAfterLibraryAdd();
      return;
    }

    await this.dismissWorkOrderLibraryDrawer();
    await this.clickAddManuallyOnWorkOrderForm();
    await this.fillLastWoLineItemRow({
      scopeOfWork: title,
      description: desc,
      quantity: this.buildRandomWoLineItemQuantity(),
      unitLabel: 'Nos',
      unitRate: this.buildRandomWoLineItemRate(),
    });
    // eslint-disable-next-line no-console
    console.log(
      '[WO library] Library empty — closed drawer and added line item manually with title and description.'
    );
  }

  async selectFirstRowInWorkOrderLibraryDrawer() {
    const root = this.woLibraryDrawerRoot();
    await this.expectWorkOrderLibraryDrawerVisible();
    await this.switchToMyItemsTabIfPresent(root);

    let checkbox = root.locator('tbody tr input[type="checkbox"]').first();

    if (!(await checkbox.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.switchToLibraryItemsTabIfPresent(root);
      checkbox = root.locator('tbody tr input[type="checkbox"]').first();
    }

    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.scrollIntoViewIfNeeded();
      try {
        await checkbox.check({ timeout: 15000 });
      } catch {
        await checkbox.click({ force: true });
      }
      // eslint-disable-next-line no-console
      console.log('[WO library] Selected first library row via checkbox.');
      return;
    }

    const radio = root.locator('tbody tr input[type="radio"]').first();
    if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await radio.scrollIntoViewIfNeeded();
      try {
        await radio.check({ timeout: 15000 });
      } catch {
        await radio.click({ force: true });
      }
      // eslint-disable-next-line no-console
      console.log('[WO library] Selected first library row via radio.');
      return;
    }

    throw new Error('WO library: no checkbox or radio row found to select.');
  }

  async selectFirstRadioInWorkOrderLibraryDrawer() {
    await this.selectFirstRowInWorkOrderLibraryDrawer();
  }

  async clickAddInWorkOrderLibraryDrawer() {
    const root = this.woLibraryDrawerRoot();
    const addBtn = root.getByRole('button', { name: /^add$/i });
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();
    await expect(root).toBeHidden({
      timeout: this.woFastMode ? 60000 : 120000,
    });
    await this.waitForWoUiSettled();
    // eslint-disable-next-line no-console
    console.log('[WO library] Clicked Add in library off-canvas.');
  }

  async resolveWoLineItemScopeFieldInRow(dataRow) {
    const candidates = [
      dataRow.getByRole('textbox', { name: 'Service Name' }).first(),
      dataRow.getByPlaceholder(/scope of work/i).first(),
      dataRow.getByPlaceholder(/labour|labor|material name/i).first(),
      dataRow.getByRole('textbox').first(),
      this.woLineEditableInputLocator(dataRow).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
        return candidate;
      }
    }

    return null;
  }

  /** Fill random scope of work on every WO line row that is still empty after library add. */
  async ensureAllWoLineItemScopesAfterLibraryAdd() {
    const table = await this.ensureWoLineItemsTableVisible();
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    let filled = 0;

    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await this.rowHasEditableWoLineItemField(row).catch(() => false))) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const scopeField = await this.resolveWoLineItemScopeFieldInRow(row);
      if (!scopeField) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const current = (await scopeField.inputValue().catch(() => '')).trim();
      if (current) {
        continue;
      }

      const value = this.buildRandomWoScopeOfWork();
      // eslint-disable-next-line no-await-in-loop
      await scopeField.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await scopeField.click({ timeout: 10000 });
      // eslint-disable-next-line no-await-in-loop
      await scopeField.fill(value);
      // eslint-disable-next-line no-await-in-loop
      await scopeField.blur().catch(() => {});
      filled += 1;
    }

    if (filled > 0) {
      await this.waitForWoUiSettled();
      // eslint-disable-next-line no-console
      console.log(`[WO library] Filled empty scope of work on ${filled} line item row(s).`);
    }
  }

  async rowNeedsWoLineItemUnit(row) {
    if (await this.poLineRowHasUnitControl(row).catch(() => false)) {
      const text = await this.getPoLineRowUnitDisplayText(row);
      return this.isPoLineUnitPlaceholderText(text);
    }

    const combobox = row.getByRole('combobox').first();
    if (await combobox.isVisible({ timeout: 1000 }).catch(() => false)) {
      const text = (await combobox.innerText().catch(() => ''))
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return this.isPoLineUnitPlaceholderText(text);
    }

    return false;
  }

  /** Fill unit (Nos / first option) on every WO line row with empty or placeholder unit. */
  async ensureAllWoLineItemUnitsAfterLibraryAdd() {
    const table = await this.ensureWoLineItemsTableVisible();
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    let filled = 0;

    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await this.rowHasEditableWoLineItemField(row).catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (!(await this.rowNeedsWoLineItemUnit(row))) {
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        await this.selectFirstPoLineRowUnit(row);
        filled += 1;
      } catch {
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.selectPoLineRowUnit(row, 'Nos');
          filled += 1;
        } catch {
          // skip row without a usable unit control
        }
      }
    }

    if (filled > 0) {
      await this.waitForWoUiSettled();
      // eslint-disable-next-line no-console
      console.log(`[WO library] Filled empty unit on ${filled} line item row(s).`);
    }
  }

  async ensureAllWoLineItemFieldsAfterLibraryAdd() {
    await this.ensureAllWoLineItemScopesAfterLibraryAdd();
    await this.ensureAllWoLineItemUnitsAfterLibraryAdd();
  }

  async ensureWoLineItemScopeAfterLibraryAdd() {
    await this.ensureAllWoLineItemFieldsAfterLibraryAdd();
  }

  async addWorkOrderLineItemFromLibraryFirstRadio() {
    if (!(await this.isWorkOrderTitleFieldVisible().catch(() => false))) {
      await this.waitForWorkOrderCreateForm();
    }
    await this.clickAddFromLibraryOnWorkOrderForm();
    await this.expectWorkOrderLibraryDrawerVisible();

    if (await this.isWorkOrderLibraryDrawerEmpty()) {
      await this.continueWorkOrderLineItemAfterEmptyLibrary();
      return;
    }

    await this.selectFirstRowInWorkOrderLibraryDrawer();
    await this.clickAddInWorkOrderLibraryDrawer();
    await this.ensureAllWoLineItemFieldsAfterLibraryAdd();
  }
}

  // ----- from work-order-compose-send.page.js -----
const WorkOrderAddFromLibraryPage = require('./work-order-add-from-library.page');

/** Work Order create form → Action → Compose email → Send. */

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
      this.page.getByRole('menuitem', { name: /^preview$/i })
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
    await this.dismissOpenMenusAndPopovers();
    await expect(this.createWorkOrderButton()).toBeVisible({
      timeout: this.woUiTimeout,
    });
    await expect(this.page.getByText(/wo no|work order no/i).first()).toBeVisible({
      timeout: this.woUiTimeout,
    });
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

  // ----- from work-order-action-create.page.js -----
const WorkOrderAddFromLibraryPage = require('./work-order-add-from-library.page');

/** Work Order create form: Action → Create (save without compose email). */

  constructor(page) {
    super(page);
    this.woCreateSuccessObserved = false;
  }

  /**
   * Login assumed done — navigate + create → title → line item → vendor → Action → Create.
   */
  async completeWorkOrderActionCreateJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderActionCreateFlow(title);
  }

  /**
   * Login assumed done — navigate + create → title → library line item → vendor → Action → Create.
   */
  async completeWorkOrderActionCreateFromLibraryJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderActionCreateFromLibraryFlow(title);
  }

  /**
   * Single atomic flow: create form → title → line item → vendor → Action → Create.
   */
  async completeWorkOrderActionCreateFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → Action → Create flow finished.');
  }

  /** create form → title → Add from library (first radio) → vendor → Action → Create */
  async completeWorkOrderActionCreateFromLibraryFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemFromLibraryFirstRadio();
    await this.addWorkOrderVendorFromModal();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → library → Action → Create flow finished.');
  }

  /** Codegen: Action button → Create menu item */
  async openActionMenuAndChooseCreate() {
    await this.dismissVisibleToastNotifications().catch(() => {});

    const actionBtn = this.page.getByRole('button', { name: 'Action' }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.woUiTimeout });
    await actionBtn.scrollIntoViewIfNeeded().catch(() => {});
    await actionBtn.click({ timeout: 30000 });

    const createItem = this.page
      .getByText('Create', { exact: true })
      .or(this.page.getByRole('menuitem', { name: /^create$/i }))
      .or(
        this.page
          .getByRole('menuitem')
          .filter({ hasText: /^(create|create\s+wo|create\s+work order)$/i })
      )
      .first();
    await expect(createItem).toBeVisible({ timeout: this.woUiTimeout });
    await createItem.click({ timeout: 30000 });

    const raceTimeout = this.woFastMode ? 25000 : 60000;
    const toast = this.locatorWoCreatedFromActionMenuToast();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: raceTimeout }).then(() => {
        this.woCreateSuccessObserved = true;
      }),
      this.page
        .getByRole('button', { name: /create work order/i })
        .waitFor({ state: 'visible', timeout: raceTimeout })
        .then(() => {
          this.woCreateSuccessObserved = true;
        })
        .catch(() => {}),
      this.page
        .waitForURL(/client\/profile|work[-_]?order(?!\/create)/i, {
          timeout: raceTimeout,
        })
        .then(() => {
          this.woCreateSuccessObserved = true;
        })
        .catch(() => {}),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[WO action create] Clicked Action → Create.');
  }

  locatorWoCreatedFromActionMenuToast() {
    const re =
      /work order created[\s&.,-]*sent|work order created successfully|wo created successfully|work order saved successfully|created successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  async expectWorkOrderCreatedFromActionMenuToast() {
    if (this.woCreateSuccessObserved) {
      return;
    }

    const toast = this.locatorWoCreatedFromActionMenuToast();
    if (await toast.isVisible({ timeout: this.woFastMode ? 8000 : 15000 }).catch(() => false)) {
      return;
    }

    await expect(
      this.page.getByRole('button', { name: /create work order/i })
    ).toBeVisible({ timeout: this.woUiTimeout });
    await expect(this.page.getByText(/wo no|work order no/i).first()).toBeVisible({
      timeout: this.woUiTimeout,
    });
  }
}

  // ----- from work-order-terms-template.page.js -----
const WorkOrderActionCreatePage = require('./work-order-action-create.page');

/** Work Order create: scroll to T&C → Choose from template → first radio → Action → Create. */

  termsHeading() {
    return this.page
      .getByText(/terms\s*(and|&)\s*conditions?/i)
      .filter({ visible: true })
      .first();
  }

  woLineItemsTableLocator() {
    return this.page
      .locator('[aria-label="WO line items table"], [aria-label="PO line items table"]')
      .first();
  }

  async scrollWorkOrderPageToRevealTermsSection() {
    const heading = this.termsHeading();

    await this.ensureWoLineItemsTableVisible().catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});

    for (let i = 0; i < 20; i += 1) {
      if (await heading.isVisible({ timeout: 800 }).catch(() => false)) {
        await heading.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }

      await this.page.evaluate(() => {
        window.scrollBy(0, Math.floor(window.innerHeight * 0.5));
      });

      const table = this.woLineItemsTableLocator();
      if (await table.isVisible({ timeout: 400 }).catch(() => false)) {
        await table.evaluate((tableEl) => {
          let node = tableEl.parentElement;
          for (let depth = 0; depth < 14 && node; depth += 1) {
            const style = window.getComputedStyle(node);
            if (
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              node.scrollHeight > node.clientHeight + 16
            ) {
              node.scrollTop = Math.min(
                node.scrollTop + Math.floor(node.clientHeight * 0.6),
                node.scrollHeight
              );
            }
            node = node.parentElement;
          }
        });
      }

      if (!this.woFastMode) {
        await this.page.waitForTimeout(80);
      }
    }

    await this.page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement;
      if (root) {
        root.scrollTop = root.scrollHeight;
      }
    });
    await heading.scrollIntoViewIfNeeded().catch(() => {});
  }

  /** Choose from template → first radio → Add (no manual T&C typing). */
  async addWorkOrderTermsFromFirstTemplate() {
    await expect(this.page).toHaveURL(/work[-_]?order\/(create|edit)/i);

    const heading = this.termsHeading();
    await this.scrollWorkOrderPageToRevealTermsSection();
    await expect(heading).toBeVisible({ timeout: this.woUiTimeout });
    await heading.scrollIntoViewIfNeeded().catch(() => {});

    await this.page.keyboard.press('Escape').catch(() => {});

    const termsBlock = this.page
      .locator('div')
      .filter({
        has: this.page.getByText(/terms\s*(and|&)\s*conditions?/i),
      })
      .filter({
        has: this.page.getByRole('button', { name: /choose from template/i }),
      })
      .first();

    let chooseTemplate = termsBlock
      .getByRole('button', { name: /choose from template/i })
      .first();
    if (!(await chooseTemplate.isVisible({ timeout: 5000 }).catch(() => false))) {
      chooseTemplate = this.page
        .getByRole('button', { name: /choose from template/i })
        .first();
    }

    await expect(chooseTemplate).toBeVisible({ timeout: this.woUiTimeout });
    await chooseTemplate.scrollIntoViewIfNeeded().catch(() => {});
    await chooseTemplate.click({ timeout: 20000, force: true });

    let modal = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (!(await modal.isVisible({ timeout: 5000 }).catch(() => false))) {
      modal = this.page.locator('.MuiModal-root').filter({ visible: true }).last();
    }
    await expect(modal).toBeVisible({ timeout: this.woUiTimeout });

    const skeleton = modal.locator('.MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 2500 }).catch(() => false)) {
      await skeleton.waitFor({
        state: 'hidden',
        timeout: this.woFastMode ? 30000 : 90000,
      });
    }

    const noData = modal.getByText(/no data found|no templates/i);
    if (await noData.isVisible({ timeout: 4000 }).catch(() => false)) {
      throw new Error(
        'WO terms template modal has no rows. Add a terms template in admin templates first.'
      );
    }

    let firstRadio = modal.getByRole('radio').first();
    if (!(await firstRadio.isVisible({ timeout: 5000 }).catch(() => false))) {
      firstRadio = modal.locator('table tbody input[type="radio"]').first();
    }
    await firstRadio.waitFor({ state: 'visible', timeout: this.woUiTimeout });
    await firstRadio.scrollIntoViewIfNeeded();
    try {
      await firstRadio.check({ timeout: 15000 });
    } catch {
      await firstRadio.click({ force: true });
    }
    await expect(firstRadio).toBeChecked({ timeout: 15000 });

    const addBtn = modal.getByRole('button', { name: /^add$/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await expect(modal).toBeHidden({ timeout: this.woUiTimeout }).catch(() => {});
    await this.waitForWoUiSettled();
    // eslint-disable-next-line no-console
    console.log('[WO terms] Added terms from first template.');
  }

  /**
   * Login → WO create → manual line item → vendor → terms template → Action → Create.
   */
  async completeWorkOrderActionCreateWithTermsTemplateJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.addWorkOrderTermsFromFirstTemplate();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → terms template → Action → Create flow finished.');
  }
}

  // ----- from work-order-ship-to.page.js -----
const WorkOrderActionCreatePage = require('./work-order-action-create.page');

/** Work Order create: check Ship to address, then Action → Create. */

  /**
   * Clicks or checks the Ship to address control (checkbox, label, or link) on the WO form.
   */
  async checkShipToAddressOnWorkOrderForm() {
    await expect(this.page).toHaveURL(/work[-_]?order\/(create|edit)/i);
    await this.waitForWoUiSettled();
    await this.dismissVisibleToastNotifications().catch(() => {});

    let target = this.page
      .getByText(/ship\s*to\s*address/i)
      .filter({ visible: true })
      .first();

    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('button', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('link', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page
        .locator('span.pointer, a, button')
        .filter({ hasText: /ship\s*to/i })
        .first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      const label = this.page.getByText(/^ship\s*to$/i).filter({ visible: true }).first();
      if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
        target = label
          .locator(
            'xpath=ancestor-or-self::*[self::label or self::div or self::span][1]'
          )
          .locator('xpath=.//input[@type="checkbox"][1]')
          .first();
      }
    }
    if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
      const shipText = this.page.getByText(/ship\s*to/i).filter({ visible: true }).first();
      if (await shipText.isVisible({ timeout: 3000 }).catch(() => false)) {
        target = shipText
          .locator('xpath=./following::input[@type="checkbox"][1]')
          .first();
      }
    }
    if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
      target = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();
    }

    await expect(target).toBeVisible({ timeout: this.woUiTimeout });
    await target.scrollIntoViewIfNeeded();

    const tagName = await target.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    const inputType = await target.getAttribute('type').catch(() => null);

    if (tagName === 'input' && inputType === 'checkbox') {
      if (!(await target.isChecked().catch(() => false))) {
        try {
          await target.check({ timeout: 10000 });
        } catch {
          await target.click({ force: true });
        }
      }
    } else {
      await target.click({ timeout: 15000 });
    }

    await this.waitForWoUiSettled();
    // eslint-disable-next-line no-console
    console.log('[WO ship-to] Checked Ship to address on work order form.');
  }

  /**
   * Login → WO create → manual line item → vendor → ship to address → Action → Create.
   */
  async completeWorkOrderActionCreateWithShipToJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.checkShipToAddressOnWorkOrderForm();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → ship to → Action → Create flow finished.');
  }
}

  // ----- from work-order-multi-line-item.page.js -----
const WorkOrderComposeSendPage = require('./work-order-compose-send.page');

/**
 * Fast bulk manual WO rows: minimal waits, last-row fill, Nos unit skip when already set.
 * Set WO_MULTI_LINE_COUNT to override default row count (20).
 */

  constructor(page) {
    super(page);
    this.woMultiLineRowTimeout = this.woFastMode ? 12000 : 30000;
  }

  static defaultLineCount() {
    const n = Number(process.env.WO_MULTI_LINE_COUNT);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
  }

  randomLineItemArgs(lineIndex) {
    return {
      scopeOfWork: `lw${lineIndex}`,
      description: null,
      quantity: String(1 + (lineIndex % 25)),
      unitLabel: 'Nos',
      unitRate: String(1000 + lineIndex * 137),
    };
  }

  async clickAddManuallyOnWorkOrderForm() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.ensureWoLineItemsTableVisible();
    await this.page
      .getByText(/line items/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    const candidates = [
      this.page.getByText('+ Add Manually').first(),
      this.page.getByText(/^\+?\s*Add Manually$/i).first(),
      this.page.getByText(/add manually/i).first(),
      this.page.locator('span.pointer').filter({ hasText: /add manually/i }).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 3000 }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded();
        await candidate.click({ force: true, timeout: 15000 });
        return;
      }
    }

    throw new Error('WO multi-line: + Add Manually control not found.');
  }

  async getLastWoLineItemRowFast(table) {
    const row = table.locator('tbody tr').last();
    await expect(row).toBeVisible({ timeout: this.woMultiLineRowTimeout });
    return row;
  }

  async ensureWoLineRowUnitNos(dataRow) {
    const unitSelect = await this.getPoLineRowUnitSelectLocator(dataRow);
    if (!unitSelect) {
      return;
    }

    const display = await this.getPoLineRowUnitDisplayText(dataRow);
    if (!this.isPoLineUnitPlaceholderText(display)) {
      return;
    }

    await unitSelect.click({ timeout: 8000 }).catch(async () => {
      await unitSelect.click({ force: true, timeout: 5000 });
    });

    const listbox = this.page.getByRole('listbox').last();
    if (await listbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.pickFirstPoLineUnitFromOpenListbox(listbox);
      await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  locatorWoRowWeightInput(dataRow) {
    return dataRow
      .locator('input[aria-label="weight"]')
      .or(dataRow.getByRole('textbox', { name: /weight/i }))
      .or(dataRow.locator('td').nth(3).locator('input[type="number"], input[type="text"]').first())
      .first();
  }

  async fillActiveWoLineItemFast({ scopeOfWork, quantity, unitLabel = 'Nos', unitRate }) {
    const table = await this.ensureWoLineItemsTableVisible();
    const dataRow = await this.getLastWoLineItemRowFast(table);

    const serviceInRow = dataRow.getByRole('textbox', { name: 'Service Name' }).first();
    const serviceOnPage = this.page
      .getByRole('textbox', { name: 'Service Name' })
      .filter({ visible: true })
      .last();

    let scopeField = serviceInRow;
    if (!(await serviceInRow.isVisible({ timeout: 1500 }).catch(() => false))) {
      scopeField = serviceOnPage;
    }

    await expect(scopeField).toBeVisible({ timeout: this.woMultiLineRowTimeout });
    await scopeField.fill(scopeOfWork);

    const qtyInput = await this.resolveWoLineQtyInput(dataRow);
    await qtyInput.fill(String(quantity));

    await this.ensureWoLineRowUnitNos(dataRow);

    const rateInput = this.locatorWoRowWeightInput(dataRow);
    await expect
      .poll(async () => rateInput.isEnabled().catch(() => false), {
        timeout: this.woMultiLineRowTimeout,
        intervals: [80, 120, 200, 400, 800],
      })
      .toBe(true);

    await rateInput.fill(String(unitRate));
  }

  async addWorkOrderLineItemManually({
    scopeOfWork,
    quantity,
    unitLabel,
    unitRate,
  }) {
    if (!(await this.isWorkOrderTitleFieldVisible().catch(() => false))) {
      await this.waitForWorkOrderCreateForm();
    }
    await this.clickAddManuallyOnWorkOrderForm();
    await this.fillActiveWoLineItemFast({
      scopeOfWork,
      quantity,
      unitLabel,
      unitRate,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[WO multi-line] Line item: scope="${scopeOfWork}" qty=${quantity} rate=${unitRate}`
    );
  }

  async addManyManualWorkOrderLineItemsWithRandomDetails(count) {
    const n = Math.max(1, Number(count) || WorkOrderMultiLineItemPage.defaultLineCount());
    const started = Date.now();
    for (let i = 1; i <= n; i += 1) {
      const args = this.randomLineItemArgs(i);
      // eslint-disable-next-line no-await-in-loop
      await this.addWorkOrderLineItemManually(args);
      if (i % 10 === 0 || i === n) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        // eslint-disable-next-line no-console
        console.log(`[WO multi-line] ${i}/${n} rows (${elapsed}s)`);
      }
    }
  }

  async completeWorkOrderComposeSendMultiLineJourney(
    title = 'electrician',
    lineItemCount = WorkOrderMultiLineItemPage.defaultLineCount()
  ) {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addManyManualWorkOrderLineItemsWithRandomDetails(lineItemCount);
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log(
      `[WO] Multi-line (${lineItemCount}) compose → send finished.`
    );
  }
}

}

module.exports = WorkOrderPage;
