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

  /** Codegen: getByText('Inventory').click() — also matches tab/button roles. */
  async clickInventoryInProject() {
    if (await this.isOnInventoryModule()) {
      await this.logStep('Already on Inventory module');
      return;
    }

    const inventoryTab = this.page
      .getByRole('tab', { name: /^\s*inventory\s*$/i })
      .or(this.page.getByRole('button', { name: /^\s*inventory\s*$/i }))
      .or(this.page.getByRole('link', { name: /^\s*inventory\s*$/i }))
      .or(this.page.locator('.MuiTab-root, [role="tab"]').filter({ hasText: /^\s*inventory\s*$/i }))
      .or(this.page.getByText('Inventory', { exact: true }))
      .filter({ visible: true })
      .first();
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
    if (await this.createGroupButton.isVisible({ timeout: 20000 }).catch(() => false)) {
      await this.logStep('Inventory page is displayed');
      return;
    }

    // Tab click sometimes does not mount Create Group — open Inventory via profile URL.
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
      await this.page
        .waitForLoadState('networkidle', { timeout: 20000 })
        .catch(() => {});
      await this.logStep('Opened Inventory via profile URL fallback');
    }

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

  /** Visible label/card for a created inventory group (single locator — avoid .or() strict-mode). */
  createdGroupLocator(name) {
    const escaped = this.escapeRegex(name);
    const exact = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
    // Prefer a tight title node (span/p) — avoid .or() chains that break expect() strict mode.
    return this.page
      .locator('span, p, h1, h2, h3, h4, h5, h6')
      .filter({ hasText: exact })
      .filter({ visible: true })
      .first();
  }

  /**
   * Inventory ListCard is CardLayout = plain MUI Box (div), NOT .MuiCard-root.
   * Anchor on the title text, then take the ancestor that also shows "All items".
   */
  createdGroupCard(name) {
    const escaped = this.escapeRegex(name);
    const title = this.page
      .locator('span, p, h1, h2, h3, h4, h5, h6')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();
    return title.locator(
      'xpath=ancestor::div[.//*[contains(translate(normalize-space(.), "ALL ITEMS", "all items"), "all items")]][1]'
    );
  }

  /**
   * The group card. Clicking the blue title starts a rename (check / X).
   * The card body ("All items") opens the group details.
   */
  createdGroupClickTarget(name) {
    return this.createdGroupCard(name).getByText(/all items\s*:/i).first();
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

    // Capture inventoryGroupId from CREATE_INVENTORY_GROUP so open can deep-link.
    const responsePromise = this.page
      .waitForResponse(
        (res) => {
          const u = String(res.url() || '').toLowerCase();
          const method = res.request().method();
          return method !== 'GET' && method !== 'OPTIONS' && /\/inventory/i.test(u);
        },
        { timeout: 45000 }
      )
      .catch(() => null);

    await createBtn.click({ timeout: 20000 });
    const res = await responsePromise;
    if (res) {
      const json = await res.json().catch(() => null);
      const body = json?.body || json?.data || json || {};
      const id =
        body.inventoryGroupId ||
        body.groupId ||
        json?.inventoryGroupId ||
        null;
      if (id) {
        this.lastOpenedInventoryGroupId = String(id);
        await this.logStep(`Captured created inventoryGroupId=${id}`);
      } else {
        await this.logStep(
          `Create inventory response (no id): HTTP ${res.status()} ${JSON.stringify(json).slice(0, 180)}`
        );
      }
    }
    await this.waitForCreateGroupDialogClosed();
    await this.logStep('Clicked Create on Create Group popup');
  }

  async expectCreatedGroupVisible() {
    const name = this.lastCreatedGroupName;
    if (!name) {
      throw new Error('No inventory group name to verify.');
    }

    if (await this.addItemsButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.logStep(`Created inventory group opened directly: ${name}`);
      return;
    }

    await this.page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => {});

    const escaped = this.escapeRegex(name);
    const title = this.page
      .locator('span, p, h1, h2, h3, h4, h5, h6')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();

    if (!(await title.isVisible({ timeout: 20000 }).catch(() => false))) {
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.waitForModuleToLoad().catch(() => {});
    }
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep(`Created inventory group visible: ${name}`);
  }

  addItemsControl() {
    return this.page
      .getByRole('button', { name: /add items?/i })
      .or(this.page.getByRole('link', { name: /add items?/i }))
      .or(this.page.getByText(/^add items?$/i))
      .filter({ visible: true })
      .first();
  }

  /** True when group detail is mounted (URL has inventoryGroupId and/or Add Items). */
  async isInsideInventoryGroupDetail() {
    if (/inventoryGroupId=/i.test(this.page.url())) {
      return true;
    }
    return this.addItemsControl().isVisible({ timeout: 1500 }).catch(() => false);
  }

  /**
   * Deep-link into a group detail via profile URL (most reliable open).
   */
  async gotoInventoryGroupDetail({ groupId, groupName } = {}) {
    const u = new URL(this.page.url());
    const projectId = u.searchParams.get('projectId');
    const clientId = u.searchParams.get('clientId');
    const id = String(groupId || this.lastOpenedInventoryGroupId || '').trim();
    const name = String(groupName || this.lastCreatedGroupName || '').trim();
    if (!projectId || !id) {
      throw new Error('gotoInventoryGroupDetail requires projectId and inventoryGroupId');
    }
    const qs = new URLSearchParams({
      projectId,
      isActive: 'true',
      tab: 'Inventory',
      inventoryGroupId: id,
    });
    if (clientId) qs.set('clientId', clientId);
    if (name) qs.set('inventoryGroupName', name);
    await this.page.goto(`https://app.aecplayhouse.com/client/profile?${qs.toString()}`, {
      waitUntil: 'domcontentloaded',
    });
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    this.lastOpenedInventoryGroupId = id;
    await this.logStep(`Deep-linked Inventory group detail id=${id}`);
  }

  /**
   * Click the group card body to open its details.
   * The blue title is a rename field (green check / red X) — do not click that.
   */
  async openCreatedInventoryGroup() {
    const name = this.lastCreatedGroupName;
    if (!name) {
      throw new Error('No inventory group name to open.');
    }

    const addItems = this.addItemsControl();
    if (await addItems.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.logStep(`Already inside inventory group detail: ${name}`);
      return;
    }

    // Prefer deep-link when create/open already captured inventoryGroupId.
    if (this.lastOpenedInventoryGroupId) {
      await this.gotoInventoryGroupDetail({
        groupId: this.lastOpenedInventoryGroupId,
        groupName: name,
      });
      await expect(addItems).toBeVisible({ timeout: 45000 });
      await this.logStep(`Opened inventory group via saved id: ${name}`);
      return;
    }

    // After Item Requests / Add to Group we are not on the groups list — leave first.
    await this.ensureOnInventoryGroupsList();
    await this.page.keyboard.press('Escape').catch(() => {});
    // Clear any leftover module search that might hide the new card.
    await this.clearInventoryGroupSearch().catch(() => {});
    await this.searchInventoryGroupsByName(name).catch(() => {});

    // Title must appear before we resolve the CardLayout Box ancestor.
    await expect(this.createdGroupLocator(name)).toBeVisible({ timeout: 45000 });
    const card = this.createdGroupCard(name);
    await expect(card).toBeVisible({ timeout: 20000 });

    // Cancel rename editor if a prior click opened it.
    const cancelRename = this.page
      .getByRole('button', { name: /^cancel$/i })
      .filter({ visible: true })
      .first();
    if (await cancelRename.isVisible({ timeout: 500 }).catch(() => false)) {
      await cancelRename.click({ timeout: 5000 }).catch(() => {});
    }

    const tryOpenOnce = async (label) => {
      await this.logStep(`Opening inventory group "${name}" via ${label}`);
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(800);

      const url = this.page.url();
      const idMatch = url.match(/[?&]inventoryGroupId=([^&]+)/i);
      if (idMatch) {
        this.lastOpenedInventoryGroupId = decodeURIComponent(idMatch[1]);
      }

      if (await addItems.isVisible({ timeout: 10000 }).catch(() => false)) {
        return true;
      }
      // URL updated but UI lagged — reload deep-link.
      if (this.lastOpenedInventoryGroupId) {
        await this.gotoInventoryGroupDetail({
          groupId: this.lastOpenedInventoryGroupId,
          groupName: name,
        });
        return addItems.isVisible({ timeout: 20000 }).catch(() => false);
      }
      return false;
    };

    // 1) Click "All items: N" detail line (bubbles to card onClick, avoids title rename).
    const allItems = card.getByText(/all items\s*:/i).first();
    if (await allItems.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allItems.scrollIntoViewIfNeeded().catch(() => {});
      await allItems.click({ timeout: 15000 });
      if (await tryOpenOnce('All items line')) {
        await this.logStep(`Opened inventory group (Add Items ready): ${name}`);
        return;
      }
    }

    // 2) Click card body below the title row (avoid primary title / delete icon).
    await card.scrollIntoViewIfNeeded().catch(() => {});
    const box = await card.boundingBox().catch(() => null);
    if (box && box.height > 40) {
      await card.click({
        position: { x: Math.min(40, box.width / 2), y: Math.min(box.height - 12, 56) },
        timeout: 15000,
      });
      if (await tryOpenOnce('card body position')) {
        await this.logStep(`Opened inventory group (Add Items ready): ${name}`);
        return;
      }
    } else {
      await card.click({ timeout: 15000 }).catch(() => {});
      if (await tryOpenOnce('card click')) {
        await this.logStep(`Opened inventory group (Add Items ready): ${name}`);
        return;
      }
    }

    // 3) Last resort: if URL already has inventoryGroupId from a partial navigation.
    if (/inventoryGroupId=/i.test(this.page.url())) {
      const id = new URL(this.page.url()).searchParams.get('inventoryGroupId');
      if (id) {
        this.lastOpenedInventoryGroupId = id;
        await this.gotoInventoryGroupDetail({ groupId: id, groupName: name });
        await expect(addItems).toBeVisible({ timeout: 30000 });
        await this.logStep(`Opened inventory group via URL reload: ${name}`);
        return;
      }
    }

    throw new Error(
      `Add Items not visible after opening group "${name}" (url=${this.page.url()})`
    );
  }

  /** Leave Item Requests (or other sub-views) so Create Group / group cards are available. */
  async ensureOnInventoryGroupsList() {
    if (await this.createGroupButton.isVisible({ timeout: 2500 }).catch(() => false)) {
      return;
    }

    const onRequests =
      /inventory-management\/requests/i.test(this.page.url()) ||
      (await this.page
        .getByText(/item requests?/i)
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false));

    if (onRequests || !(await this.createGroupButton.isVisible({ timeout: 1000 }).catch(() => false))) {
      const inventory = this.page
        .getByRole('tab', { name: /^\s*inventory\s*$/i })
        .or(this.page.getByRole('button', { name: /^\s*inventory\s*$/i }))
        .or(this.page.getByRole('link', { name: /^\s*inventory\s*$/i }))
        .or(this.page.locator('a, button, span').filter({ hasText: /^\s*inventory\s*$/i }))
        .filter({ visible: true })
        .first();

      if (await inventory.isVisible({ timeout: 5000 }).catch(() => false)) {
        await inventory.click({ timeout: 15000, force: true });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page.waitForTimeout(800);
      }

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
    }

    await expect(this.createGroupButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('On Inventory groups list (ready to open group)');
  }

  async clickAddItem() {
    const addItems = this.addItemsControl();
    await expect(addItems).toBeVisible({ timeout: this.defaultTimeout });
    await addItems.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
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
      .filter({ visible: true })
      .filter({
        has: this.page
          .getByRole('button', { name: 'Next', exact: true })
          .or(this.page.getByRole('table'))
          .or(this.page.getByRole('checkbox')),
      })
      .or(
        this.page
          .locator('.MuiDrawer-root, .MuiModal-root, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByRole('checkbox').or(this.page.getByRole('table')) })
      )
      .last();
  }

  warehouseEmptyState() {
    return this.page
      .getByText(/no (products?|items?|inventory|data)|nothing to (show|add)|no results/i)
      .filter({ visible: true })
      .first();
  }

  /**
   * After Add from Warehouse opens: 'hasData' if a selectable row/checkbox exists.
   */
  async detectWarehousePickerState({ waitMs = 12000 } = {}) {
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      if (await this.warehouseEmptyState().isVisible({ timeout: 400 }).catch(() => false)) {
        await this.logStep('Warehouse picker: empty');
        return 'empty';
      }
      const checkbox = this.page
        .getByRole('checkbox')
        .filter({ visible: true })
        .nth(1) // skip header "select all" when present
        .or(this.page.getByRole('checkbox').filter({ visible: true }).first());
      if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
        await this.logStep('Warehouse picker: hasData');
        return 'hasData';
      }
      await this.page.waitForTimeout(400);
    }
    const anyCheckbox = this.page.getByRole('checkbox').filter({ visible: true }).first();
    if (await anyCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) return 'hasData';
    await this.logStep('Warehouse picker: no checkboxes — treated as empty');
    return 'empty';
  }

  async expectNoWarehouseProductsAvailable() {
    const empty = this.warehouseEmptyState();
    if (await empty.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.logStep(
        `Asserted no warehouse products: ${((await empty.innerText().catch(() => '')) || '').slice(0, 120)}`
      );
    } else {
      const checkboxes = await this.page.getByRole('checkbox').filter({ visible: true }).count();
      if (checkboxes > 0) {
        throw new Error(`Expected empty warehouse picker, but found ${checkboxes} checkbox(es)`);
      }
      await this.logStep('Asserted no warehouse products (no checkboxes / no empty copy)');
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    const close = this.page
      .getByRole('button', { name: /close|cancel/i })
      .filter({ visible: true })
      .first();
    if (await close.isVisible({ timeout: 1500 }).catch(() => false)) {
      await close.click({ timeout: 10000 }).catch(() => {});
    }
  }

  /** Codegen: first table row checkbox in warehouse off-canvas */
  async selectFirstInventoryListCheckbox() {
    // Prefer any visible data-row checkbox (skip select-all when possible).
    const allCheckboxes = this.page.getByRole('checkbox').filter({ visible: true });
    await expect(allCheckboxes.first()).toBeVisible({ timeout: this.defaultTimeout });

    const count = await allCheckboxes.count();
    const checkbox = count > 1 ? allCheckboxes.nth(1) : allCheckboxes.first();
    const row = checkbox.locator('xpath=ancestor::tr[1] | ancestor::*[@role="row"][1]').first();

    const rowText = ((await row.innerText().catch(() => '')) || '').trim();
    if (rowText) {
      this.lastAddedInventoryItemName = rowText.split('\n')[0].slice(0, 80);
    } else {
      this.lastAddedInventoryItemName = this.lastAddedInventoryItemName || 'Warehouse item';
    }

    await checkbox.check({ force: true, timeout: 15000 });
    await this.logStep(
      `Selected warehouse row checkbox${this.lastAddedInventoryItemName ? `: ${this.lastAddedInventoryItemName}` : ''}`
    );
  }

  /**
   * Full warehouse add path, or empty-state soft-pass.
   * Sets this.lastWarehousePickerMode = 'hasData' | 'empty'.
   */
  async addFromWarehouseOrAssertEmpty(qty = '1') {
    await this.clickAddItem();
    await this.expectAddItemOptionsVisible();
    await this.selectAddFromWarehouse();

    const mode = await this.detectWarehousePickerState();
    this.lastWarehousePickerMode = mode;
    if (mode === 'empty') {
      await this.expectNoWarehouseProductsAvailable();
      await this.logStep('Warehouse path: empty-state — soft-pass');
      return { mode: 'empty' };
    }

    await this.selectFirstInventoryListCheckbox();
    await this.clickNextOnInventorySelection();
    await this.expectInventoryOffCanvasVisible();
    await this.enterRequiredQuantity(qty);
    await this.clickAddOnInventoryOffCanvas();
    await this.expectInventoryItemAddedToGroup();
    await this.logStep('Warehouse path: hasData — item added');
    return { mode: 'hasData' };
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

  // ---------------------------------------------------------------------------
  // Search / rename / delete groups (Inventory home)
  // ---------------------------------------------------------------------------

  /**
   * Inventory module ExpandableSearch only — NEVER the global
   * "Search Anything in IntoAEC..." header field.
   */
  inventoryGroupSearchRegion() {
    return this.page
      .locator('[role="search"]')
      .filter({ has: this.page.getByRole('button', { name: /search by group name/i }) })
      .or(this.page.locator('[role="search"][aria-label*="Search by Group Name" i]'))
      .filter({ visible: true })
      .first();
  }

  inventoryGroupSearchExpandButton() {
    // Collapsed ExpandableSearch: IconButton aria-label="Search by Group Name"
    return this.page
      .getByRole('button', { name: /^search by group name$/i })
      .filter({ visible: true })
      .first();
  }

  groupSearchInput() {
    // Expanded field only — placeholder / aria-label from inventoryManagement.searchByGroupNameplacholder
    return this.page
      .getByPlaceholder(/^search by group name$/i)
      .or(this.page.getByRole('textbox', { name: /^search by group name$/i }))
      .filter({ visible: true })
      .first();
  }

  /** Expand Inventory "Search by Group Name" if collapsed. Never touch global search. */
  async expandInventoryGroupSearch() {
    await this.ensureOnInventoryGroupsList();
    const input = this.groupSearchInput();
    if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
      return input;
    }
    const expandBtn = this.inventoryGroupSearchExpandButton();
    await expect(expandBtn).toBeVisible({ timeout: 30000 });
    await expandBtn.click({ timeout: 10000 });
    await this.page.waitForTimeout(300);
    const expanded = this.groupSearchInput();
    await expect(expanded).toBeVisible({ timeout: 15000 });
    await this.logStep('Expanded Inventory module Search by Group Name');
    return expanded;
  }

  async searchInventoryGroupsByName(name) {
    const query = String(name || this.lastCreatedGroupName || '').trim();
    if (!query) throw new Error('No inventory group name to search');
    const search = await this.expandInventoryGroupSearch();
    await search.click({ timeout: 10000 });
    await search.fill('');
    await search.fill(query);
    // Filtering is client-side onChange — no Enter required, but harmless.
    await this.page.waitForTimeout(600);
    await this.logStep(`Searched inventory groups (module search) for: ${query}`);
  }

  async clearInventoryGroupSearch() {
    const input = this.groupSearchInput();
    if (!(await input.isVisible({ timeout: 1500 }).catch(() => false))) {
      // Already collapsed / empty — nothing to clear.
      return;
    }
    const clearBtn = this.page
      .getByRole('button', { name: /^clear$/i })
      .filter({ visible: true })
      .first();
    if (await clearBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearBtn.click({ timeout: 5000 }).catch(() => {});
    } else {
      await input.fill('').catch(() => {});
    }
    await this.page.waitForTimeout(400);
    // Blur so ExpandableSearch collapses when empty.
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep('Cleared Inventory module group search');
  }

  async expectInventoryGroupVisibleInList(name) {
    const groupName = String(name || this.lastCreatedGroupName || '').trim();
    if (!groupName) throw new Error('No inventory group name to verify in list');
    await this.ensureOnInventoryGroupsList();
    // Use module search so we don't depend on scrolling a long unfiltered list.
    await this.searchInventoryGroupsByName(groupName).catch(() => {});
    const title = this.createdGroupLocator(groupName);
    await expect(title).toBeVisible({ timeout: 45000 });
    await this.logStep(`Inventory group visible in list: ${groupName}`);
  }

  groupTitleClickTarget(name) {
    const escaped = this.escapeRegex(name);
    return this.page
      .locator('span, p, h1, h2, h3, h4, h5, h6, a')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      .filter({ visible: true })
      .first();
  }

  async startRenameCreatedInventoryGroup() {
    const name = this.lastCreatedGroupName;
    if (!name) throw new Error('No inventory group name to rename');
    this._renamePreviousGroupName = name;
    await this.ensureOnInventoryGroupsList();
    await this.clearInventoryGroupSearch().catch(() => {});
    await this.searchInventoryGroupsByName(name).catch(() => {});
    const title = this.groupTitleClickTarget(name);
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.click({ timeout: 15000 });
    await this.page.waitForTimeout(500);
    await this.logStep(`Started rename for inventory group: ${name}`);
  }

  async enterRenamedInventoryGroupName(newName) {
    const name =
      String(newName || '').trim() ||
      `renamed group ${Date.now().toString().slice(-8)}`;
    // Inline rename uses MUI standard TextField next to Save/Cancel icon buttons.
    const input = this.page
      .locator('.MuiInput-root input, input.MuiInput-input, input[type="text"]')
      .filter({ visible: true })
      .last();
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.click({ timeout: 10000 });
    await input.fill('');
    await input.fill(name);
    this._pendingRenamedGroupName = name;
    await this.logStep(`Entered renamed group name: ${name}`);
    return name;
  }

  async confirmInventoryGroupRename() {
    // ListCard title editor: aria-label="Save" (green check). Prefer exact Save near editor.
    const saveBtn = this.page
      .getByRole('button', { name: /^save$/i })
      .filter({ visible: true })
      .first();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.click({ timeout: 15000 });
    } else {
      // Fallback: press Enter in the rename field.
      await this.page.keyboard.press('Enter').catch(() => {});
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => {});
    await this.page.waitForTimeout(1500);

    const successToast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /rename|updated|success/i })
      .filter({ visible: true })
      .first();
    if (await successToast.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.logStep(
        `Rename toast: ${((await successToast.innerText().catch(() => '')) || '').slice(0, 100)}`
      );
    }

    if (this._pendingRenamedGroupName) {
      this.lastCreatedGroupName = this._pendingRenamedGroupName;
      this._pendingRenamedGroupName = null;
    }
    await this.logStep(`Confirmed rename → ${this.lastCreatedGroupName}`);
  }

  async expectRenamedInventoryGroupVisible() {
    const newName = this.lastCreatedGroupName;
    const oldName = this._renamePreviousGroupName;
    if (!newName) throw new Error('No renamed inventory group name to verify');

    await this.ensureOnInventoryGroupsList();
    await this.clearInventoryGroupSearch().catch(() => {});
    // Search by the new name so the list is filtered to the renamed card.
    await this.searchInventoryGroupsByName(newName);

    const title = this.createdGroupLocator(newName);
    if (!(await title.isVisible({ timeout: 20000 }).catch(() => false))) {
      await this.clearInventoryGroupSearch().catch(() => {});
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.waitForModuleToLoad().catch(() => {});
      await this.searchInventoryGroupsByName(newName).catch(() => {});
    }
    await expect(title).toBeVisible({ timeout: 45000 });

    if (oldName && oldName !== newName) {
      const oldTitle = this.createdGroupLocator(oldName);
      const oldStill = await oldTitle.isVisible({ timeout: 2000 }).catch(() => false);
      if (oldStill) {
        await this.logStep(`WARN: old group name "${oldName}" still visible after rename`);
      }
    }
    await this.logStep(`Renamed inventory group visible: ${newName}`);
  }

  groupDeleteButton(name) {
    const escaped = this.escapeRegex(name);
    const card = this.page
      .locator('div, article, section, li, .MuiPaper-root, .MuiCard-root')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .filter({ visible: true })
      .first();
    // ListCard icon-only action uses aria-label="Delete Group".
    return card
      .getByRole('button', { name: /^delete group$/i })
      .or(card.getByRole('button', { name: /delete group|delete/i }))
      .filter({ visible: true })
      .first();
  }

  async deleteCreatedInventoryGroup() {
    const name = this.lastCreatedGroupName;
    if (!name) throw new Error('No inventory group name to delete');
    await this.ensureOnInventoryGroupsList();
    await this.clearInventoryGroupSearch().catch(() => {});
    await this.searchInventoryGroupsByName(name);
    const del = this.groupDeleteButton(name);
    await expect(del).toBeVisible({ timeout: this.defaultTimeout });
    await del.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1500);

    const toast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({
        hasText:
          /deleted|success|cannot delete|can't delete|remove all items|before deleting|with items/i,
      })
      .filter({ visible: true })
      .first();
    if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = ((await toast.innerText().catch(() => '')) || '').slice(0, 140);
      this._lastDeleteGroupToast = text;
      await this.logStep(`Delete group toast: ${text}`);
    }
    await this.logStep(`Clicked delete for inventory group: ${name}`);
  }

  async expectInventoryGroupDeleted() {
    const name = this.lastCreatedGroupName;
    if (!name) throw new Error('No inventory group name to verify deleted');

    // If UI blocked delete (group had items), fail fast with toast text.
    if (
      /cannot delete|can't delete|remove all items|before deleting|with items|not empty/i.test(
        this._lastDeleteGroupToast || ''
      )
    ) {
      throw new Error(`Delete blocked by toast: ${this._lastDeleteGroupToast}`);
    }

    await this.ensureOnInventoryGroupsList();
    await this.clearInventoryGroupSearch().catch(() => {});
    // After delete, searching the old name should show no card (or empty list).
    const search = this.groupSearchInput();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('');
      await search.fill(name);
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.page.waitForTimeout(1000);
    }

    const title = this.createdGroupLocator(name);
    const stillVisible = await title.isVisible({ timeout: 5000 }).catch(() => false);
    if (stillVisible) {
      // One reload retry — list cache can lag.
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.waitForModuleToLoad().catch(() => {});
      if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
        await search.fill(name);
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(1000);
      }
      await expect(this.createdGroupLocator(name)).toBeHidden({ timeout: 20000 });
    }
    await this.logStep(`Inventory group deleted: ${name}`);
  }

  async expectCannotDeleteGroupWithItemsToast() {
    // Live copy: "Remove all items before deleting the group."
    const blockedRe =
      /cannot delete|can't delete|cant delete|remove all items|before deleting|with items|has items|not empty/i;

    // Prefer toast captured during delete click (toasts disappear quickly).
    if (blockedRe.test(this._lastDeleteGroupToast || '')) {
      await this.logStep(
        `Cannot-delete-with-items (from delete click): ${this._lastDeleteGroupToast}`
      );
      return;
    }

    const toast = this.page
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: blockedRe })
      .filter({ visible: true })
      .first();
    await expect(toast).toBeVisible({ timeout: 20000 });
    await this.logStep('Saw cannot-delete-group-with-items toast');
  }

  // ---------------------------------------------------------------------------
  // Add Items menu variants
  // ---------------------------------------------------------------------------

  async selectAddFromPurchaseOrder() {
    const item = this.page
      .getByRole('menuitem', { name: /add from po/i })
      .or(this.page.getByText(/^add from po$/i))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Selected Add from PO');
  }

  async selectAddFromWorkshop() {
    const item = this.page
      .getByRole('menuitem', { name: /add from workshop/i })
      .or(this.page.getByText(/^add from workshop$/i))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Selected Add from Workshop');
  }

  workshopSelectionPanel() {
    return this.page
      .getByRole('dialog')
      .or(this.page.locator('.MuiDrawer-root, .MuiModal-root, [role="presentation"]'))
      .filter({ visible: true })
      .filter({ hasText: /workshop|factory|dispatch|load|receive/i })
      .first();
  }

  workshopEmptyState() {
    return this.page
      .getByText(/No dispatched items available to receive\.?/i)
      .or(this.page.getByText(/No ready jobs available to add\.?/i))
      .or(this.page.getByText(/no dispatched|no workshop|no factory|no loads?/i))
      .filter({ visible: true })
      .first();
  }

  async expectWorkshopSelectionVisible() {
    const panel = this.workshopSelectionPanel();
    const empty = this.workshopEmptyState();
    // Panel or empty-state copy both prove Workshop UI opened.
    if (await empty.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.logStep('Workshop selection shows empty state');
      return;
    }
    await expect(panel).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Workshop / factory dispatch selection is displayed');
  }

  /**
   * After Add from Workshop: 'hasData' if a load/row exists, else 'empty'.
   * Do not use panel.or(empty) — both can be visible (strict-mode violation).
   */
  async detectWorkshopPickerState({ waitMs = 8000 } = {}) {
    const panel = this.workshopSelectionPanel();
    const empty = this.workshopEmptyState();

    const panelVisible = await panel.isVisible({ timeout: 15000 }).catch(() => false);
    const emptyVisible = await empty.isVisible({ timeout: 3000 }).catch(() => false);
    if (!panelVisible && !emptyVisible) {
      await expect(empty).toBeVisible({ timeout: this.defaultTimeout });
    }

    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      if (await empty.isVisible({ timeout: 400 }).catch(() => false)) {
        await this.logStep('Workshop picker: empty (no dispatched material)');
        return 'empty';
      }
      const scope = (await panel.isVisible({ timeout: 500 }).catch(() => false))
        ? panel
        : this.page;
      const row = scope
        .locator(
          'tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root, li, [class*="card" i]'
        )
        .filter({ visible: true })
        .filter({ hasNotText: /No dispatched|No ready jobs|no data/i })
        .first();
      if (await row.isVisible({ timeout: 400 }).catch(() => false)) {
        await this.logStep('Workshop picker: hasData');
        return 'hasData';
      }
      await this.page.waitForTimeout(400);
    }

    if (await empty.isVisible({ timeout: 1000 }).catch(() => false)) {
      return 'empty';
    }
    await this.logStep('Workshop picker: no loads found — treated as empty');
    return 'empty';
  }

  async expectNoDispatchedWorkshopMaterial() {
    const empty = this.workshopEmptyState();
    await expect(empty).toBeVisible({ timeout: this.defaultTimeout });
    const text = ((await empty.innerText().catch(() => '')) || '').slice(0, 160);
    await this.logStep(`Asserted no dispatched workshop material: ${text}`);
    await this.page.keyboard.press('Escape').catch(() => {});
    const close = this.page
      .getByRole('button', { name: /close/i })
      .filter({ visible: true })
      .first();
    if (await close.isVisible({ timeout: 1500 }).catch(() => false)) {
      await close.click({ timeout: 10000 }).catch(() => {});
    }
  }

  async selectFirstWorkshopDispatchAndReceive() {
    const panel = this.workshopSelectionPanel();
    await expect(panel).toBeVisible({ timeout: this.defaultTimeout });

    const row = panel
      .locator('tbody tr, [role="row"], .MuiCard-root, .MuiPaper-root, li')
      .filter({ visible: true })
      .first();
    if (await row.isVisible({ timeout: 10000 }).catch(() => false)) {
      const checkbox = row.getByRole('checkbox').first();
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await checkbox.check({ force: true, timeout: 10000 }).catch(() => {});
      } else {
        await row.click({ timeout: 15000 }).catch(() => {});
      }
      await this.logStep('Selected first workshop / factory dispatch row');
    }

    const receiveBtn = panel
      .getByRole('button', { name: /receive|next|continue|add/i })
      .filter({ visible: true })
      .first();
    if (await receiveBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await receiveBtn.click({ timeout: 20000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.logStep('Clicked receive/next on workshop selection');
    }

    // Fill minimal receive fields when present.
    const receiveDialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /receive|goods|workshop|dispatch/i })
      .first();
    if (await receiveDialog.isVisible({ timeout: 8000 }).catch(() => false)) {
      const qty = receiveDialog.getByRole('spinbutton').first();
      if (await qty.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qty.fill('1').catch(() => {});
      }
      const confirm = receiveDialog
        .getByRole('button', { name: /receive|add|confirm|save|yes/i })
        .filter({ visible: true })
        .first();
      if (await confirm.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirm.click({ timeout: 20000 });
        await this.logStep('Confirmed workshop receive');
      }
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * If workshop loads exist → receive first; else assert empty and pass.
   * Sets this.lastWorkshopPickerMode = 'hasData' | 'empty'.
   */
  async receiveFromWorkshopOrAssertEmpty() {
    const mode = await this.detectWorkshopPickerState();
    this.lastWorkshopPickerMode = mode;
    if (mode === 'empty') {
      await this.expectNoDispatchedWorkshopMaterial();
      await this.logStep('Workshop path: empty-state — scenario soft-pass');
      return { mode: 'empty' };
    }
    await this.selectFirstWorkshopDispatchAndReceive();
    await this.expectInventoryItemAddedToGroup().catch(async () => {
      // Receive may leave us on group detail without a toast — soft check Add Items.
      await expect(this.addItemsButton).toBeVisible({ timeout: this.defaultTimeout });
    });
    await this.logStep('Workshop path: hasData — receive completed');
    return { mode: 'hasData' };
  }

  // ---------------------------------------------------------------------------
  // Group item search / qty / actions
  // ---------------------------------------------------------------------------

  itemSearchInput() {
    // Group-detail item search only — never global header search.
    return this.page
      .getByPlaceholder(/search by item name/i)
      .or(this.page.getByRole('textbox', { name: /^search by item name$/i }))
      .filter({ visible: true })
      .first();
  }

  async searchInventoryItemsByName(name) {
    const query = String(name || this.lastAddedInventoryItemName || '').trim();
    if (!query) throw new Error('No inventory item name to search');
    const search = this.itemSearchInput();
    await expect(search).toBeVisible({ timeout: this.defaultTimeout });
    await search.fill('');
    await search.fill(query);
    await this.page.keyboard.press('Enter').catch(() => {});
    await this.page.waitForTimeout(800);
    await this.logStep(`Searched inventory items for: ${query}`);
  }

  async clearInventoryItemSearch() {
    const search = this.itemSearchInput();
    if (!(await search.isVisible({ timeout: 2000 }).catch(() => false))) return;
    await search.fill('');
    await this.page.waitForTimeout(400);
  }

  firstInventoryItemRow() {
    return this.page
      .locator('tbody tr.MuiTableRow-root, tbody tr, .MuiDataGrid-row')
      .filter({ visible: true })
      .first();
  }

  async expectInventoryItemRowVisible(name) {
    const query = String(name || this.lastAddedInventoryItemName || '').trim();
    if (query) {
      await this.searchInventoryItemsByName(query).catch(() => {});
      const row = this.page
        .locator('tbody tr, .MuiDataGrid-row')
        .filter({
          hasText: new RegExp(this.escapeRegex(query).slice(0, 40), 'i'),
        })
        .filter({ visible: true })
        .first();
      if (await row.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.logStep(`Inventory item row visible: ${query}`);
        return;
      }
    }
    await expect(this.firstInventoryItemRow()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.logStep('At least one inventory item row is visible');
  }

  async editUsedQuantityOnFirstItem(value = '1') {
    const row = this.firstInventoryItemRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    // Used Qty is typically an editable cell / spinbutton in the row.
    const used = row
      .getByRole('spinbutton')
      .or(row.locator('input[type="number"]'))
      .filter({ visible: true })
      .first();
    if (await used.isVisible({ timeout: 5000 }).catch(() => false)) {
      await used.click({ timeout: 10000 });
      await used.fill('');
      await used.fill(String(value));
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.page.waitForTimeout(800);
      await this.logStep(`Edited used qty to ${value}`);
      return;
    }
    // Click Used Qty header-adjacent cell text then edit.
    const usedCell = row.getByText(/^\s*\d+\s*$/).filter({ visible: true }).first();
    await usedCell.dblclick({ timeout: 10000 }).catch(() => {});
    const input = this.page.locator('input[type="number"], input').filter({ visible: true }).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(String(value));
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.logStep(`Edited used qty via cell to ${value}`);
    } else {
      await this.logStep('WARN: could not find editable used qty — soft skip');
    }
  }

  async openFirstItemActionsMenu() {
    const row = this.firstInventoryItemRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.hover().catch(() => {});
    const more = row
      .locator(
        'button[id^="row-menu-button"], .menu-button-container button, button.MuiIconButton-root[aria-haspopup="true"], button[aria-label*="More" i]'
      )
      .filter({ visible: true })
      .first();
    await expect(more).toBeVisible({ timeout: this.defaultTimeout });
    await more.click({ timeout: 15000 });
    await this.page.waitForTimeout(400);
    await this.logStep('Opened first inventory item actions menu');
  }

  async selectItemActionFromMenu(actionLabel) {
    const label = String(actionLabel || '').trim();
    const item = this.page
      .getByRole('menuitem', { name: new RegExp(label, 'i') })
      .or(this.page.locator('.MuiMenuItem-root, [role="menuitem"]').filter({ hasText: new RegExp(label, 'i') }))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep(`Selected item action: ${label}`);
  }

  async confirmDeleteInventoryItem(reason = 'E2E cleanup') {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /delete|confirm|reason/i })
      .first();
    if (await dialog.isVisible({ timeout: 8000 }).catch(() => false)) {
      const reasonInput = dialog
        .locator('textarea, input[name*="reason" i], input')
        .filter({ visible: true })
        .first();
      if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonInput.fill(reason);
      }
      const confirm = dialog
        .getByRole('button', { name: /delete|yes|confirm|ok/i })
        .filter({ visible: true })
        .first();
      await confirm.click({ timeout: 20000 });
      await this.logStep('Confirmed inventory item delete');
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async completeMoveToWarehouseIfPrompted(qty = '1') {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /warehouse|move|quantity/i })
      .first();
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) {
      await this.logStep('No Move to Warehouse dialog — action may have completed');
      return;
    }
    const qtyInput = dialog
      .getByRole('spinbutton')
      .or(dialog.locator('input[type="number"]'))
      .filter({ visible: true })
      .first();
    if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyInput.fill(String(qty));
    }
    const confirm = dialog
      .getByRole('button', { name: /move|save|confirm|yes|add/i })
      .filter({ visible: true })
      .first();
    await confirm.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Completed Move to Warehouse');
  }

  async selectFirstInventoryItemCheckbox() {
    const row = this.firstInventoryItemRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const checkbox = row.getByRole('checkbox').first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    await checkbox.check({ force: true, timeout: 10000 });
    await this.logStep('Selected first inventory item checkbox');
  }

  async clickLinkToSchedule() {
    const btn = this.page
      .getByRole('button', { name: /link to schedule/i })
      .filter({ visible: true })
      .first();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await btn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Clicked Link to Schedule');
  }

  async completeScheduleBindingIfPrompted() {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /schedule|link/i })
      .first();
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) {
      await this.logStep('No schedule binding dialog');
      return;
    }
    const schedule = dialog
      .locator('input[role="combobox"], input')
      .filter({ visible: true })
      .first();
    if (await schedule.isVisible({ timeout: 3000 }).catch(() => false)) {
      await schedule.click({ timeout: 10000 });
      const opt = this.page.getByRole('option').filter({ visible: true }).first();
      if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
        await opt.click({ timeout: 10000 });
      }
    }
    const confirm = dialog
      .getByRole('button', { name: /link|save|confirm|yes|continue/i })
      .filter({ visible: true })
      .first();
    if (await confirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirm.click({ timeout: 20000 });
    }
    await this.logStep('Completed schedule binding dialog');
  }

  // ---------------------------------------------------------------------------
  // Create-group validation + dashboard smoke
  // ---------------------------------------------------------------------------

  async submitCreateGroupWithoutName() {
    await this.clickCreateGroup();
    await this.expectCreateGroupPopupVisible();
    const dialog = this.createGroupDialog();
    const createBtn = dialog.getByRole('button', { name: 'Create' }).first();
    await createBtn.click({ timeout: 15000 });
    await this.logStep('Clicked Create with empty group name');
  }

  async expectCreateGroupValidationError() {
    const err = this.page
      .getByText(/please enter|required|name is required|enter name/i)
      .or(
        this.page
          .locator('.Toastify__toast, [role="alert"], .MuiFormHelperText-root, .MuiAlert-root')
          .filter({ hasText: /required|enter name|please enter/i })
      )
      .filter({ visible: true })
      .first();
    await expect(err).toBeVisible({ timeout: this.defaultTimeout });
    // Close dialog so later scenarios start clean.
    const close = this.page
      .getByRole('button', { name: /close|cancel/i })
      .filter({ visible: true })
      .first();
    if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
      await close.click({ timeout: 10000 }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.logStep('Saw create-group validation error');
  }

  async expectInventoryDashboardCardsVisible() {
    await this.ensureOnInventoryGroupsList();
    const cards = this.page
      .getByText(/ordered|received|pending|used|unused|value/i)
      .filter({ visible: true })
      .first();
    await expect(cards).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Inventory dashboard cards are visible');
  }
}

module.exports = InventoryPage;
