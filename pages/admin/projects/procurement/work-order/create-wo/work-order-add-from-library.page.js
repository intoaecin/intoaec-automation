const { expect } = require('@playwright/test');
const WorkOrderCreatePage = require('./work-order-create.page');

/** Work Order create form — Add from library off-canvas (first checkbox → Add). */
class WorkOrderAddFromLibraryPage extends WorkOrderCreatePage {
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

module.exports = WorkOrderAddFromLibraryPage;
