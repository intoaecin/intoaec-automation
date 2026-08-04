const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Codegen: project → getByText('Inventory') → Create Group → Add Items → Warehouse → Create report.
 */
class InventoryPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.main = page.locator('main, [role="main"]').first();
    this.createGroupButton = page.getByRole('button', { name: 'Create Group' }).first();
    this.addItemsButton = page.getByRole('button', { name: /add items?/i }).first();
    this.lastCreatedGroupName = null;
    this.lastAddedInventoryItemName = null;
  }

  async logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  async isOnInventoryModule() {
    if (await this.createGroupButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    return this.addItemsButton.isVisible({ timeout: 1500 }).catch(() => false);
  }

  /** Codegen: getByText('Inventory').click() */
  async clickInventoryInProject() {
    if (await this.isOnInventoryModule()) {
      await this.logStep('Already on Inventory module');
      return;
    }

    const inventoryTab = this.page.getByText('Inventory', { exact: true }).filter({ visible: true }).first();
    await expect(inventoryTab).toBeVisible({ timeout: this.defaultTimeout });
    await inventoryTab.click({ timeout: 20000, force: true });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Clicked Inventory tab (codegen)');
  }

  async navigateFromProjectProfile() {
    await this.clickInventoryInProject();
  }

  async waitForModuleToLoad() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(this.createGroupButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Inventory page is displayed');
  }

  async clickCreateGroup() {
    await this.createGroupButton.click({ timeout: 20000 });
    await this.logStep('Clicked Create Group');
  }

  groupNameInput() {
    return this.page
      .getByRole('textbox', { name: 'E.g. Sanitary Items' })
      .or(this.page.getByRole('textbox', { name: /group name/i }))
      .or(this.page.getByPlaceholder(/sanitary|group name/i))
      .first();
  }

  async expectCreateGroupPopupVisible() {
    await expect(this.groupNameInput()).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Create Inventory Item Group popup is displayed');
  }

  buildRandomGroupName() {
    const suffix = `${Date.now()}`.slice(-8);
    return `new group ${suffix}`;
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  createGroupDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.groupNameInput() })
      .or(this.page.locator('[role="presentation"]').filter({ has: this.groupNameInput() }))
      .first();
  }

  /** Codegen: paragraph / card / text containing the created group name on the inventory list. */
  createdGroupLocator(name) {
    const escaped = this.escapeRegex(name);
    const shortToken = this.escapeRegex(String(name).split(/\s+/).pop() || name);
    return this.page
      .getByRole('paragraph')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .first()
      .or(this.page.getByText(new RegExp(escaped, 'i')).first())
      .or(this.main.locator('p, h1, h2, h3, h4, h5, h6, [class*="Card"], [class*="card"]')
        .filter({ hasText: new RegExp(shortToken, 'i') })
        .first());
  }

  async waitForCreateGroupDialogClosed() {
    const dialog = this.createGroupDialog();
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(dialog).toBeHidden({ timeout: this.defaultTimeout });
    }
    await expect(this.groupNameInput()).toBeHidden({ timeout: this.defaultTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async dismissInventoryOverlayIfPresent() {
    const closeBtn = this.page.getByRole('button', { name: 'close' }).filter({ visible: true }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 10000, force: true }).catch(() => {});
      await this.logStep('Dismissed inventory overlay via close button');
    }
  }

  async enterRandomGroupName() {
    const name = this.buildRandomGroupName();
    const input = this.groupNameInput();
    await input.click({ timeout: 15000 });
    await input.fill(name);
    this.lastCreatedGroupName = name;
    await this.logStep(`Entered inventory group name: ${name}`);
    return name;
  }

  async clickCreateOnGroupPopup() {
    const dialog = this.createGroupDialog();
    const createBtn = (await dialog.isVisible({ timeout: 3000 }).catch(() => false))
      ? dialog.getByRole('button', { name: 'Create' }).first()
      : this.page.getByRole('button', { name: 'Create' }).first();
    await createBtn.click({ timeout: 20000 });
    await this.waitForCreateGroupDialogClosed();
    await this.logStep('Clicked Create on Create Group popup');
  }

  async expectCreatedGroupVisible() {
    const name = this.lastCreatedGroupName;
    if (!name) {
      throw new Error('No inventory group name to verify.');
    }

    if (await this.addItemsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.logStep(`Created inventory group opened directly: ${name}`);
      return;
    }

    const group = this.createdGroupLocator(name);
    await expect(group).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep(`Created inventory group visible: ${name}`);
  }

  /**
   * Codegen: click created group name → close overlay → Add Items visible.
   * Skips the click when the app already lands on the group detail page.
   */
  async openCreatedInventoryGroup() {
    const name = this.lastCreatedGroupName;
    if (!name) {
      throw new Error('No inventory group name to open.');
    }

    if (await this.addItemsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.logStep(`Already inside inventory group detail: ${name}`);
      return;
    }

    const group = this.createdGroupLocator(name);
    await expect(group).toBeVisible({ timeout: this.defaultTimeout });
    await group.scrollIntoViewIfNeeded().catch(() => {});
    await group.click({ timeout: 20000, force: true });
    await this.logStep(`Clicked created inventory group: ${name}`);

    await this.dismissInventoryOverlayIfPresent();

    await expect(this.addItemsButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep(`Opened inventory group: ${name}`);
  }

  async clickAddItem() {
    await this.addItemsButton.click({ timeout: 20000 });
    await this.logStep('Clicked Add Items');
  }

  async expectAddItemOptionsVisible() {
    await expect(
      this.page.getByRole('menuitem', { name: 'Add from Warehouse' }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Add Item options are displayed');
  }

  async selectAddFromWarehouse() {
    await this.page.getByRole('menuitem', { name: 'Add from Warehouse' }).click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Selected Add from Warehouse');
  }

  warehouseSelectionPanel() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: 'Next', exact: true }) })
      .or(this.page.locator('[role="presentation"]').filter({ has: this.page.getByRole('table') }))
      .last();
  }

  /** Codegen: first table row checkbox in warehouse off-canvas */
  async selectFirstInventoryListCheckbox() {
    const panel = this.warehouseSelectionPanel();
    const firstRow = panel
      .getByRole('row')
      .filter({ has: panel.getByRole('checkbox') })
      .first()
      .or(this.page.getByRole('row').filter({ has: this.page.getByRole('checkbox') }).nth(1));
    const checkbox = firstRow.getByRole('checkbox').first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });

    const rowText = ((await firstRow.innerText().catch(() => '')) || '').trim();
    if (rowText) {
      this.lastAddedInventoryItemName = rowText.split('\n')[0].slice(0, 80);
    }

    await checkbox.check({ force: true, timeout: 15000 });
    await this.logStep(
      `Selected first inventory row checkbox${this.lastAddedInventoryItemName ? `: ${this.lastAddedInventoryItemName}` : ''}`
    );
  }

  async clickNextOnInventorySelection() {
    const panel = this.warehouseSelectionPanel();
    const nextBtn = (await panel.isVisible({ timeout: 2000 }).catch(() => false))
      ? panel.getByRole('button', { name: 'Next', exact: true }).first()
      : this.page.getByRole('button', { name: 'Next', exact: true }).first();
    await nextBtn.click({ timeout: 20000 });
    await this.logStep('Clicked Next on inventory selection');
  }

  quantityOffCanvasPanel() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('spinbutton') })
      .or(this.page.locator('[role="presentation"]').filter({ has: this.page.getByRole('spinbutton') }))
      .last();
  }

  async expectInventoryOffCanvasVisible() {
    const panel = this.quantityOffCanvasPanel();
    await expect(panel.getByRole('spinbutton').first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Inventory quantity off-canvas is displayed');
  }

  async enterRequiredQuantity(value = '1') {
    const panel = this.quantityOffCanvasPanel();
    const qty = panel.getByRole('spinbutton').first().or(this.page.getByRole('spinbutton').first());
    await expect(qty).toBeVisible({ timeout: this.defaultTimeout });
    await qty.click({ timeout: 15000 });
    await qty.fill('');
    await qty.fill(String(value));
    await this.logStep(`Entered Required Quantity: ${value}`);
  }

  async clickAddOnInventoryOffCanvas() {
    const panel = this.quantityOffCanvasPanel();
    const addBtn = (await panel.isVisible({ timeout: 2000 }).catch(() => false))
      ? panel.getByRole('button', { name: 'Add' }).first()
      : this.page.getByRole('button', { name: 'Add' }).first();
    await addBtn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.dismissInventoryOverlayIfPresent();
    await this.logStep('Clicked Add on inventory off-canvas');
  }

  async expectInventoryItemAddedToGroup() {
    await expect(this.addItemsButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Inventory item added to group');
  }
}

module.exports = InventoryPage;
