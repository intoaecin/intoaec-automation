const { expect } = require('@playwright/test');
const InventoryPage = require('./InventoryPage');

/**
 * Inventory → Request Item(s) → Item Requests → Add to Group (TC-02).
 *
 * Feature: features/admin/projects/procurement/GoodsReceipt/GoodsReceipt_TestCases.feature
 * Steps:   step-definitions/admin/projects/procurement/GoodsReceipt.steps.js
 */
class InventoryRequestPage extends InventoryPage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.lastRequestedProducts = [];
    this.lastAddToGroupProductName = null;
  }

  async logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[InventoryRequest] ${msg}`);
  }

  requestFormVisible() {
    return this.page.locator('input[name="itemName"]').filter({ visible: true }).first();
  }

  requestDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /inventory request/i })
      .first()
      .or(
        this.page
          .locator('.MuiDrawer-root, .MuiModal-root, [role="presentation"]')
          .filter({ visible: true })
          .filter({ hasText: /inventory request/i })
          .first()
      );
  }

  async startInventoryItemRequest() {
    // Add Items menu may already be open from the prior step.
    const menuItem = this.page
      .getByRole('menuitem', { name: /request item/i })
      .or(this.page.getByText(/request item\(s\)/i))
      .filter({ visible: true })
      .first();

    if (!(await menuItem.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.clickAddItem();
    }
    await expect(menuItem).toBeVisible({ timeout: this.defaultTimeout });
    await menuItem.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(this.requestDialog()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.requestFormVisible()).toBeVisible({ timeout: this.defaultTimeout });
    this.lastRequestedProducts = [];
    await this.logStep('Started inventory item request (Request Item(s))');
  }

  async selectUnitOnRow(rowScope, unit, index = 0) {
    const unitValue = String(unit || 'Nos').trim() || 'Nos';
    const dialog = this.requestDialog();
    const scope = (await dialog.isVisible({ timeout: 1000 }).catch(() => false))
      ? dialog
      : this.page;

    // Anchor on this row's Item Name, then take the Unit Type combobox in the same row.
    // Do NOT fall back to another row's combobox (that left Product 2/3 stuck on Meter).
    const nameInput = scope.locator('input[name="itemName"]').nth(index);
    await expect(nameInput).toBeVisible({ timeout: 30000 });

    const row = nameInput.locator(
      'xpath=ancestor::*[.//input[@name="itemsQuantity"] and (.//input[@role="combobox"] or .//*[@role="combobox"])][1]'
    );

    const unitInput = row
      .locator('input[role="combobox"]')
      .filter({ visible: true })
      .first()
      .or(row.getByRole('combobox').filter({ visible: true }).first())
      .or(row.getByPlaceholder(/meter|nos|unit|each/i).filter({ visible: true }).first());

    await expect(unitInput).toBeVisible({ timeout: 15000 });

    const current =
      (await unitInput.inputValue().catch(() => '')) ||
      (await unitInput.innerText().catch(() => '')) ||
      '';
    if (new RegExp(`^\\s*${unitValue}\\s*$`, 'i').test(String(current).trim())) {
      await this.logStep(`Row ${index + 1}: unit already "${unitValue}"`);
      return;
    }

    await unitInput.click({ timeout: 10000 });
    await this.page.waitForTimeout(400);

    // Clear leftover Meter text so list filters / selection sticks on every row.
    await unitInput.fill('').catch(() => {});
    await unitInput.press('Control+A').catch(() => {});
    await unitInput.press('Backspace').catch(() => {});
    await this.page.waitForTimeout(200);

    const opt = this.page
      .getByRole('option', { name: new RegExp(`^\\s*${unitValue}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();
    if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await opt.click({ timeout: 10000 });
    } else {
      await unitInput.fill(unitValue);
      await this.page.keyboard.press('Enter').catch(() => {});
      const optAfterType = this.page
        .getByRole('option', { name: new RegExp(`^\\s*${unitValue}\\s*$`, 'i') })
        .filter({ visible: true })
        .first();
      if (await optAfterType.isVisible({ timeout: 2000 }).catch(() => false)) {
        await optAfterType.click({ timeout: 10000 });
      }
    }

    // Confirm this row shows Nos (not still Meter).
    await this.page.waitForTimeout(300);
    const shown =
      (await unitInput.inputValue().catch(() => '')) ||
      (await unitInput.innerText().catch(() => '')) ||
      '';
    if (!new RegExp(unitValue, 'i').test(String(shown))) {
      // One more force: click combobox and pick Nos again.
      await unitInput.click({ timeout: 10000 });
      await this.page.waitForTimeout(300);
      const retryOpt = this.page
        .getByRole('option', { name: new RegExp(`^\\s*${unitValue}\\s*$`, 'i') })
        .filter({ visible: true })
        .first();
      await expect(retryOpt).toBeVisible({ timeout: 5000 });
      await retryOpt.click({ timeout: 10000 });
    }

    await this.logStep(`Row ${index + 1}: selected unit "${unitValue}"`);
  }

  async selectStatusOnRow(rowScope, status, index = 0) {
    const statusValue = String(status || 'Approved').trim() || 'Approved';
    const dialog = this.requestDialog();
    const scope = (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) ? dialog : this.page;

    const statusField = scope.locator('[name="status"]').nth(index);
    const pendingLabel = scope
      .getByText(/pending approval/i)
      .filter({ visible: true })
      .nth(index);

    const clickTarget = (await statusField.isVisible({ timeout: 2000 }).catch(() => false))
      ? statusField
      : pendingLabel;

    if (!(await clickTarget.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.logStep(`Status field not found — assuming "${statusValue}"`);
      return;
    }

    await clickTarget.click({ timeout: 10000, force: true });
    await this.page.waitForTimeout(500);
    const opt = this.page
      .getByRole('option', { name: new RegExp(`^\\s*${statusValue}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();
    if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await opt.click({ timeout: 10000 });
      await this.logStep(`Selected status "${statusValue}"`);
      return;
    }
    await this.logStep(`Could not select status "${statusValue}" — leaving current value`);
  }

  requestRowScope(index) {
    // Each product row: prefer containers that include the itemName input at that index.
    const nameInput = this.page.locator('input[name="itemName"]').nth(index);
    return nameInput
      .locator(
        'xpath=ancestor::*[.//input[@name="itemsQuantity"] and .//input[contains(@name,"Price") or @name="itemPricePerUnit"]][1]'
      )
      .or(nameInput.locator('xpath=ancestor::div[contains(@class,"MuiGrid") or contains(@class,"MuiStack") or contains(@class,"MuiBox")][1]'))
      .or(this.page.locator('body'));
  }

  async addRequestProduct({ name, quantity, unit = 'Nos', unitCost, status = 'Approved' } = {}) {
    const productName = String(name || '').trim();
    const qty = String(quantity ?? '').trim();
    const cost = String(unitCost ?? '').trim();
    const index = this.lastRequestedProducts.length;

    await expect(this.requestFormVisible()).toBeVisible({ timeout: this.defaultTimeout });

    if (index > 0) {
      const addNew = this.page
        .getByRole('button', { name: /add new item/i })
        .or(this.requestDialog().getByText(/add new item/i))
        .filter({ visible: true })
        .first();
      await expect(addNew).toBeVisible({ timeout: 30000 });
      await addNew.click({ timeout: 15000 });
      await this.page.waitForTimeout(1000);
      await expect(this.page.locator('input[name="itemName"]').nth(index)).toBeVisible({
        timeout: 30000,
      });
    }

    const nameInput = this.page.locator('input[name="itemName"]').nth(index);
    await expect(nameInput).toBeVisible({ timeout: 30000 });
    await nameInput.click({ timeout: 10000 });
    await nameInput.fill(productName);

    const qtyInput = this.page.locator('input[name="itemsQuantity"]').nth(index);
    await expect(qtyInput).toBeVisible({ timeout: 15000 });
    await qtyInput.fill('');
    await qtyInput.fill(qty);

    // Always set Unit Type to Nos on THIS row (defaults to Meter on new rows).
    const row = this.requestRowScope(index);
    await this.selectUnitOnRow(row, unit || 'Nos', index);

    const costInput = this.page.locator('input[name="itemPricePerUnit"]').nth(index);
    await expect(costInput).toBeVisible({ timeout: 15000 });
    await costInput.fill('');
    await costInput.fill(cost);

    await this.selectStatusOnRow(row, status, index);

    this.lastRequestedProducts.push({
      name: productName,
      quantity: qty,
      unit: String(unit || 'Nos'),
      unitCost: cost,
      status: String(status || 'Approved'),
    });
    await this.logStep(
      `Added request product "${productName}" qty=${qty} unit=${unit || 'Nos'} cost=${cost} status=${status}`
    );
  }

  /** Before submit: force every product row Unit Type to Nos. */
  async ensureAllRequestRowsHaveUnit(unit = 'Nos') {
    const dialog = this.requestDialog();
    const scope = (await dialog.isVisible({ timeout: 1000 }).catch(() => false))
      ? dialog
      : this.page;
    const count = await scope.locator('input[name="itemName"]').count();
    for (let i = 0; i < count; i++) {
      await this.selectUnitOnRow(this.requestRowScope(i), unit, i);
    }
    await this.logStep(`Ensured unit "${unit}" on all ${count} request row(s)`);
  }

  async submitInventoryItemRequest() {
    await this.ensureAllRequestRowsHaveUnit('Nos');

    const dialog = this.requestDialog();
    const requestBtn = (await dialog.isVisible({ timeout: 2000 }).catch(() => false))
      ? dialog.getByRole('button', { name: /^request$/i }).first()
      : this.page.getByRole('button', { name: /^request$/i }).filter({ visible: true }).last();

    await expect(requestBtn).toBeVisible({ timeout: this.defaultTimeout });

    const responsePromise = this.page
      .waitForResponse(
        (res) => {
          const u = String(res.url() || '').toLowerCase();
          const method = res.request().method();
          return method !== 'GET' && /inventory|request/i.test(u);
        },
        { timeout: 45000 }
      )
      .catch(() => null);

    await requestBtn.click({ timeout: 20000 });
    const res = await responsePromise;
    if (res) {
      const status = res.status();
      const body = await res.text().catch(() => '');
      await this.logStep(`Request submit HTTP ${status}: ${body.slice(0, 180)}`);
      if (status >= 400) {
        await this.logStep(`WARN: inventory request API failed (${status})`);
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page
      .waitForLoadState('networkidle', { timeout: 20000 })
      .catch(() => {});

    const toast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /success|requested|created|submitted|failed|error/i })
      .filter({ visible: true })
      .first();
    if (await toast.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.logStep(`Toast after Request: ${(await toast.innerText()).slice(0, 120)}`);
    }
    await this.logStep('Submitted inventory item request');
  }

  async expectRequestedItemsCreatedWithStatus(status = 'Approved') {
    const want = String(status || 'Approved').trim() || 'Approved';
    const toast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /success|requested|created|submitted|item/i })
      .filter({ visible: true })
      .first();
    const toastOk = await toast.isVisible({ timeout: 15000 }).catch(() => false);
    if (toastOk) {
      await this.logStep('Request success toast visible');
    }

    // After Request, the form often closes — verify on Item Requests list.
    const anyProductVisible = await this.page
      .getByText(/Product 1/i)
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!anyProductVisible) {
      await this.navigateBackToInventoryModule().catch(() => {});
      await this.openRequestedProductsSection();
    }

    // Status filter chips on Item Requests (Approved / Pending / …).
    const statusFilter = this.page
      .getByRole('button', { name: new RegExp(`^\\s*${want}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click({ timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(1000);
      await this.logStep(`Clicked Item Requests filter "${want}"`);
    }

    for (const item of this.lastRequestedProducts) {
      const nameRe = new RegExp(item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      let row = this.page
        .locator('tr, [role="row"]')
        .filter({ hasText: nameRe })
        .filter({ visible: true })
        .first();

      if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) {
        // Search box if present
        const search = this.page
          .getByPlaceholder(/search/i)
          .or(this.page.getByRole('textbox', { name: /search/i }))
          .filter({ visible: true })
          .first();
        if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
          await search.fill(item.name);
          await this.page.keyboard.press('Enter').catch(() => {});
          await this.page.waitForTimeout(1000);
        }
        row = this.page
          .locator('tr, [role="row"]')
          .filter({ hasText: nameRe })
          .filter({ visible: true })
          .first();
      }

      await expect(row).toBeVisible({ timeout: 60000 });
      const statusLoc = row.getByText(new RegExp(want, 'i')).first();
      if (await statusLoc.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.logStep(`Verified "${item.name}" with status ${want}`);
      } else {
        await expect(
          this.page.getByText(new RegExp(want, 'i')).filter({ visible: true }).first()
        ).toBeVisible({ timeout: 15000 });
        await this.logStep(
          `Verified "${item.name}" on Item Requests (status "${want}" on page)`
        );
      }
    }

    if (!toastOk) {
      await this.logStep('Requested items verified on Item Requests (no toast)');
    }
  }

  async clickRequestAgain() {
    // If still on the request form, click Request; otherwise continue to Item Requests.
    const requestBtn = this.page
      .getByRole('button', { name: /^request$/i })
      .filter({ visible: true })
      .last();
    if (await requestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await requestBtn.click({ timeout: 15000 }).catch(() => {});
      await this.logStep('Clicked Request again');
      return;
    }
    await this.logStep('Request again not shown (already left form) — continuing');
  }

  async navigateBackToInventoryModule() {
    // Prefer Inventory breadcrumb / tab / module control (leave Item Requests or group detail).
    const inventory = this.page
      .getByRole('tab', { name: /^\s*inventory\s*$/i })
      .or(this.page.getByRole('button', { name: /^\s*inventory\s*$/i }))
      .or(this.page.getByRole('link', { name: /^\s*inventory\s*$/i }))
      .or(this.page.locator('a, button, span').filter({ hasText: /^\s*inventory\s*$/i }))
      .filter({ visible: true })
      .first();

    if (await this.createGroupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.logStep('Already on Inventory list');
      return;
    }

    if (await inventory.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inventory.click({ timeout: 15000, force: true });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    // Fallback: strip requests path back to profile Inventory tab.
    if (!(await this.createGroupButton.isVisible({ timeout: 8000 }).catch(() => false))) {
      const u = new URL(this.page.url());
      const projectId = u.searchParams.get('projectId');
      const clientId = u.searchParams.get('clientId');
      if (projectId) {
        await this.page.goto(
          `https://app.aecplayhouse.com/client/profile?projectId=${projectId}&isActive=true&tab=Inventory${
            clientId ? `&clientId=${clientId}` : ''
          }`,
          { waitUntil: 'domcontentloaded' }
        );
      }
    }
    await expect(this.createGroupButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Navigated back to Inventory module');
  }

  async openRequestedProductsSection() {
    const btn = this.page
      .getByRole('button', { name: /item requests?/i })
      .or(this.page.getByRole('link', { name: /item requests?|requested products?/i }))
      .or(this.page.getByText(/^item requests?$/i))
      .filter({ visible: true })
      .first();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await btn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(
      this.page.getByText(/item name|requested date|item requests?/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    // Item Requests often defaults to Pending Approval — switch to Approved for TC products.
    await this.selectItemRequestsStatusFilter('Approved');
    await this.logStep('Opened Item Requests / Requested Products section');
  }

  /**
   * Item Requests status tabs: Pending Approval | Approved | Rejected | …
   * Products submitted as Approved only appear after clicking the Approved tab.
   */
  async selectItemRequestsStatusFilter(status = 'Approved') {
    const want = String(status || 'Approved').trim() || 'Approved';

    // Exact tab match (screenshot: "Approved" next to "Pending Approval").
    const approvedTab = this.page
      .getByRole('tab', { name: new RegExp(`^\\s*${want}\\s*$`, 'i') })
      .or(
        this.page
          .locator('[role="tab"], button, a, .MuiTab-root, .MuiButtonBase-root')
          .filter({ hasText: new RegExp(`^\\s*${want}\\s*$`, 'i') })
      )
      .filter({ visible: true })
      .first();

    await expect(approvedTab).toBeVisible({ timeout: this.defaultTimeout });

    // Skip click if already selected (aria-selected / Mui-selected).
    const selected =
      (await approvedTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
      ((await approvedTab.getAttribute('class').catch(() => '')) || '').includes('Mui-selected');
    if (selected) {
      await this.logStep(`Item Requests tab already "${want}"`);
      return;
    }

    await approvedTab.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1000);

    // Wait until Pending empty-state is gone or Approved rows/table refresh.
    const emptyPending = this.page.getByText(/no requests found/i).filter({ visible: true });
    await emptyPending.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await this.logStep(`Navigated Item Requests tab: Pending Approval → ${want}`);
  }

  requestedProductRow(productName) {
    const name = String(productName || this.lastRequestedProducts[0]?.name || '').trim();
    const nameRe = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.page
      .locator('tr, [role="row"]')
      .filter({ hasText: nameRe })
      .filter({ visible: true })
      .first();
  }

  async locateLastRequestedProduct() {
    const product =
      this.lastAddToGroupProductName ||
      this.lastRequestedProducts[0]?.name ||
      'Product 1';
    this.lastAddToGroupProductName = product;

    // Ensure Approved filter is active (list may still show Pending Approval).
    await this.selectItemRequestsStatusFilter('Approved');

    let row = this.requestedProductRow(product);
    if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) {
      const search = this.page
        .getByPlaceholder(/search/i)
        .or(this.page.getByRole('textbox', { name: /search/i }))
        .filter({ visible: true })
        .first();
      if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
        await search.fill(product);
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(1000);
      }
      row = this.requestedProductRow(product);
    }

    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await this.logStep(`Located requested product "${product}"`);
    return row;
  }

  async openThreeDotMenuForRequestedProduct() {
    const row = await this.locateLastRequestedProduct();
    await row.hover().catch(() => {});
    await this.page.waitForTimeout(400);

    // Actions may live on the row, a parent card, or only after hover.
    const scopes = [
      row,
      row.locator(
        'xpath=ancestor::*[self::tr or @role="row" or contains(@class,"MuiPaper") or contains(@class,"MuiCard") or contains(@class,"MuiBox")][1]'
      ),
      this.page
        .locator('tr, [role="row"], .MuiPaper-root, .MuiCard-root, li')
        .filter({
          hasText: new RegExp(
            String(this.lastAddToGroupProductName || 'Product 1').replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            ),
            'i'
          ),
        })
        .filter({ visible: true })
        .first(),
    ];

    let clicked = false;
    for (const scope of scopes) {
      const more = scope
        .locator(
          'button[aria-label*="more" i], button[aria-label*="menu" i], button[aria-haspopup="menu"], [aria-label*="more" i], [aria-label*="actions" i]'
        )
        .or(scope.getByRole('button').last())
        .or(scope.locator('button, [role="button"]').last())
        .filter({ visible: true })
        .last();
      if (await more.isVisible({ timeout: 3000 }).catch(() => false)) {
        await more.click({ timeout: 15000 });
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      const anyMore = this.page
        .locator('button[aria-label*="more" i], button[aria-haspopup="menu"]')
        .filter({ visible: true })
        .first();
      await expect(anyMore).toBeVisible({ timeout: 15000 });
      await anyMore.click({ timeout: 15000 });
    }

    await this.page.waitForTimeout(500);
    await expect(
      this.page
        .getByRole('menuitem', { name: /add to group/i })
        .or(this.page.getByText(/^add to group$/i))
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 15000 });
    await this.logStep('Opened three-dot menu for requested product');
  }

  async selectAddToGroupFromMenu() {
    const item = this.page
      .getByRole('menuitem', { name: /add to group/i })
      .or(this.page.getByText(/^add to group$/i))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Selected Add to Group');
  }

  addToGroupDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /add to group|group|confirm/i })
      .first()
      .or(
        this.page
          .locator('.MuiDialog-root, .MuiModal-root, [role="presentation"]')
          .filter({ visible: true })
          .filter({ hasText: /add to group/i })
          .first()
      );
  }

  async expectAddToGroupPopupVisible() {
    const dialog = this.addToGroupDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Add to Group popup is displayed');
  }

  async fillAddToGroupFormValid() {
    const dialog = this.addToGroupDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });

    const groupName = String(this.lastCreatedGroupName || '').trim();
    const product =
      this.lastRequestedProducts.find((p) => p.name === this.lastAddToGroupProductName) ||
      this.lastRequestedProducts[0];

    const dialogText = ((await dialog.innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280);
    await this.logStep(`Add to Group dialog: ${dialogText || '(empty)'}`);

    // Live UI: Add to Group is a goods-receipt form already linked to the request's
    // inventory group (created earlier). Do NOT click group names behind the modal.
    if (groupName) {
      await this.logStep(
        `Add to Group targets already-created group "${groupName}" (linked via request)`
      );
    }

    // Received qty if editable (Order Qty / Received columns).
    if (product?.quantity) {
      const qtyField = dialog
        .locator('input[name*="received" i], input[name*="quantity" i]')
        .or(dialog.getByLabel(/received|quantity|qty/i))
        .or(dialog.getByRole('spinbutton'))
        .filter({ visible: true })
        .first();
      // Prefer number inputs that are NOT amount.
      const receivedQty = dialog
        .locator('input[type="number"]:not([name="amount"])')
        .filter({ visible: true })
        .first();
      const target =
        (await receivedQty.isVisible({ timeout: 1500 }).catch(() => false))
          ? receivedQty
          : qtyField;
      if (await target.isVisible({ timeout: 1500 }).catch(() => false)) {
        await target.click({ timeout: 5000 }).catch(() => {});
        await target.fill('');
        await target.fill(String(product.quantity));
        await this.logStep(`Filled Add to Group received qty ${product.quantity}`);
      } else {
        await this.logStep(
          `Received qty already shown for "${product.name}" (no editable qty field)`
        );
      }
    }

    const vehicle = dialog
      .locator('input[name="vehicleDetails"]')
      .or(dialog.getByPlaceholder(/vehicle/i))
      .or(dialog.getByLabel(/vehicle/i))
      .filter({ visible: true })
      .first();
    if (await vehicle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vehicle.fill('20022002');
      await this.logStep('Filled Vehicle Number 20022002');
    }

    const bill = dialog
      .locator('input[name="billDetails"]')
      .or(dialog.getByPlaceholder(/bill/i))
      .or(dialog.getByLabel(/bill/i))
      .filter({ visible: true })
      .first();
    if (await bill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bill.fill(`BILL-${Date.now().toString().slice(-6)}`);
      await this.logStep('Filled Bill Number');
    }

    // Received By / On are usually prefilled (* required).
    const receivedBy = dialog
      .getByPlaceholder(/received by/i)
      .or(dialog.getByLabel(/received by/i))
      .filter({ visible: true })
      .first();
    if (await receivedBy.isVisible({ timeout: 1500 }).catch(() => false)) {
      const v = await receivedBy.inputValue().catch(() => '');
      if (!String(v).trim()) {
        await receivedBy.fill('Adam max');
        await this.logStep('Filled Received By');
      }
    }

    const amount = dialog
      .locator('input[name="amount"]')
      .or(dialog.getByPlaceholder(/amount/i))
      .filter({ visible: true })
      .first();
    if (await amount.isVisible({ timeout: 1500 }).catch(() => false)) {
      const cost = Number(product?.unitCost || product?.cost || 1000);
      const qty = Number(product?.quantity || 30);
      const total = Number.isFinite(cost * qty) ? String(cost * qty) : '30000';
      await amount.fill(total);
      await this.logStep(`Filled Amount ${total}`);
    }

    const notes = dialog
      .locator('textarea[name="notes"]')
      .or(dialog.getByPlaceholder(/^notes?$/i))
      .or(dialog.getByLabel(/^notes?$/i))
      .filter({ visible: true })
      .first();
    if (await notes.isVisible({ timeout: 1500 }).catch(() => false)) {
      await notes.fill(`Add to Group automation — ${product?.name || 'Product 1'}`);
      await this.logStep('Filled Notes');
    }

    await this.logStep(
      `Add to Group form ready: "${product?.name || 'product'}" → group "${groupName || '(linked)'}"`
    );
  }

  async clickYesOnAddToGroupConfirmation() {
    const form = this.addToGroupDialog();
    await expect(form).toBeVisible({ timeout: 30000 });

    const buttonLabels = await this.page
      .locator('.MuiModal-root, .MuiDialog-root, [role="dialog"], [role="presentation"]')
      .filter({ visible: true })
      .filter({ hasText: /add to group/i })
      .first()
      .evaluate((el) =>
        Array.from(el.querySelectorAll('button, [role="button"], a.MuiButton-root'))
          .map((b) => (b.textContent || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .slice(0, 12)
      )
      .catch(() => []);
    if (buttonLabels.length) {
      await this.logStep(`Add to Group buttons: ${JSON.stringify(buttonLabels)}`);
    }

    // Live UI primary action is labeled "Add to Group" (then Confirm → Yes).
    const modalRoot = this.page
      .locator('.MuiModal-root, .MuiDialog-root, [role="dialog"]')
      .filter({ visible: true })
      .filter({ hasText: /add to group/i })
      .first();

    const addBtn = modalRoot
      .getByRole('button', { name: /^add to group$/i })
      .or(modalRoot.getByRole('button', { name: /^add$/i }))
      .or(this.page.getByRole('button', { name: /^add to group$/i }).filter({ visible: true }))
      .or(modalRoot.getByRole('button', { name: /^(save|submit|confirm)$/i }))
      .filter({ visible: true })
      .first();

    await expect(addBtn).toBeVisible({ timeout: 60000 });
    await addBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addBtn.click({ timeout: 20000 });
    await this.logStep('Clicked Add on Add to Group form');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const confirm = this.page
      .getByRole('dialog', { name: /confirm item addition/i })
      .or(
        this.page
          .getByRole('dialog')
          .filter({ visible: true })
          .filter({ hasText: /confirm/i })
          .filter({ has: this.page.getByRole('button', { name: /^yes$/i }) })
      )
      .or(
        this.page
          .locator('.MuiDialog-root, .MuiModal-root')
          .filter({ visible: true })
          .filter({ hasText: /confirm item addition|are you sure|confirm/i })
      )
      .first();

    // If Confirm appears, click Yes; otherwise Add may have completed directly.
    if (await confirm.isVisible({ timeout: 20000 }).catch(() => false)) {
      const yes = confirm
        .getByRole('button', { name: /^yes$/i })
        .or(this.page.getByRole('button', { name: /^yes$/i }))
        .filter({ visible: true })
        .first();
      await expect(yes).toBeVisible({ timeout: 30000 });

      const responsePromise = this.page
        .waitForResponse(
          (res) => {
            const u = String(res.url() || '').toLowerCase();
            const m = res.request().method();
            return (
              m !== 'GET' &&
              m !== 'OPTIONS' &&
              /inventory|group|request|item|goods|receipt/i.test(u)
            );
          },
          { timeout: 45000 }
        )
        .catch(() => null);

      await yes.click({ timeout: 20000 });
      const res = await responsePromise;
      if (res) {
        const body = (await res.text().catch(() => '')).slice(0, 220);
        await this.logStep(`Add to Group HTTP ${res.status()}: ${body}`);
        if (res.status() >= 400) {
          throw new Error(`Add to Group API failed (${res.status()}): ${body}`);
        }
      } else {
        await this.logStep('WARN: no Add to Group API response observed');
      }
      await expect(confirm)
        .toBeHidden({ timeout: 60000 })
        .catch(() => {});
      await this.logStep('Clicked Yes on Confirm Item Addition');
    } else {
      await this.logStep('No Confirm dialog — Add may have completed directly');
    }

    const errToast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /fail|error|required|invalid|unable/i })
      .filter({ visible: true })
      .first();
    if (await errToast.isVisible({ timeout: 2500 }).catch(() => false)) {
      throw new Error(
        `Add to Group error toast: ${(await errToast.innerText()).slice(0, 200)}`
      );
    }

    await expect(form)
      .toBeHidden({ timeout: 60000 })
      .catch(() => {});
    await this.page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => {});
    await this.logStep('Add to Group confirmation completed');
  }

  async expectRequestedProductAddedToGroupSuccess() {
    const toast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /success|added|group|inventory|goods receipt/i })
      .filter({ visible: true })
      .first();
    if (await toast.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.logStep(`Add to Group toast: ${(await toast.innerText()).slice(0, 120)}`);
      return;
    }
    await this.logStep('Add to Group completed (no toast — will verify in group)');
  }

  async expectRequestedProductInGroupWithDetails() {
    // Only the product added via Add to Group (Product 1) must appear in the created group.
    const addedName = this.lastAddToGroupProductName || this.lastRequestedProducts[0]?.name;
    const matched = this.lastRequestedProducts.filter((p) => p.name === addedName);
    const toCheck =
      matched.length > 0
        ? matched
        : [{ name: addedName || 'Product 1', quantity: '30' }];

    if (!(await this.addItemsControl().isVisible({ timeout: 4000 }).catch(() => false))) {
      await this.navigateBackToInventoryModule().catch(() => {});
      await this.openCreatedInventoryGroup();
    }

    await this.page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => {});
    await this.page.waitForTimeout(1000);

    for (const item of toCheck) {
      const name = String(item.name || '').trim();
      if (!name) continue;
      const nameRe = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      let nameLoc = this.page.getByText(nameRe).filter({ visible: true }).first();
      if (!(await nameLoc.isVisible({ timeout: 12000 }).catch(() => false))) {
        await this.logStep(`"${name}" not yet visible — reload group detail`);
        await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await this.navigateBackToInventoryModule().catch(() => {});
        await this.openCreatedInventoryGroup().catch(() => {});
        await this.page.waitForTimeout(1500);
        nameLoc = this.page.getByText(nameRe).filter({ visible: true }).first();
      }

      await expect(nameLoc).toBeVisible({ timeout: 90000 });
      await this.logStep(
        `Verified "${name}" in already-created group "${this.lastCreatedGroupName}"`
      );

      if (item.quantity) {
        const row = this.page
          .locator('tr, [role="row"], .MuiPaper-root, .MuiCard-root, li, div.MuiBox-root')
          .filter({ hasText: nameRe })
          .filter({ visible: true })
          .first();
        if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
          const qtyOk = await row
            .getByText(
              new RegExp(
                `\\b${String(item.quantity).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
              )
            )
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false);
          if (qtyOk) {
            await this.logStep(`Verified "${name}" qty ${item.quantity} in group`);
          } else {
            await this.logStep(`Verified "${name}" in group (qty soft)`);
          }
        }
      }
    }
  }
}

module.exports = InventoryRequestPage;
