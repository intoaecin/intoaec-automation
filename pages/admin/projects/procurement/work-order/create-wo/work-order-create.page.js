const { expect } = require('@playwright/test');
const PurchaseOrderCreatePoPage = require('../../purchase-order/create-po/purchase-order-create-po.page');
const ProjectProfilePage = require('../../../ProjectProfilePage');

/**
 * Work Order list → create from scratch → title → manual line items.
 * Mirrors purchase-order-create-po.page.js for the WO module.
 */
class WorkOrderCreatePage extends PurchaseOrderCreatePoPage {
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

    const createBtn = this.page.getByRole('button', { name: /create work order/i });
    const alreadyOnWo =
      /tab=RFQAndPO/i.test(this.page.url()) &&
      (/subTab=WO|subTab=WorkOrder|subTab%3DWO|subTab%3DWorkOrder/i.test(this.page.url()) ||
        (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)));

    if (!alreadyOnWo) {
      await profile.selectHeading('Procurement');
      await this.clickWorkOrderModuleCard();
    } else {
      await this.activateWorkOrderSubTab();
      await this.ensureWorkOrderListReady().catch(() => {});
    }

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

module.exports = WorkOrderCreatePage;
