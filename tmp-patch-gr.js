const fs = require('fs');
const path = require('path');

const p = path.join(
  __dirname,
  'pages/admin/projects/procurement/GoodsReceiptPage.js'
);
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('  goodsReceiptPanel()');
const end = s.indexOf('  async enterReceivedQuantities');
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}

const insert = `  goodsReceiptPanel() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByText(/goods receipt|add from po|purchase order|vehicle|received/i),
      })
      .or(
        this.page
          .locator('.MuiDrawer-root, .MuiModal-root, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByText(/vehicle|received qty|add from po|purchase order/i) })
      )
      .last();
  }

  /** Modal that lists POs after Add from PO (search + cards + blue arrow). */
  purchaseOrderPickerDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page
          .getByPlaceholder(/search purchase order/i)
          .or(this.page.getByText(/^purchase order$/i)),
      })
      .first();
  }

  async selectAddFromPo() {
    const item = this.page
      .getByRole('menuitem', { name: /add from po|add from purchase order/i })
      .or(this.page.getByText(/^add from po$/i))
      .or(this.page.getByText(/add from po/i))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Selected Add from PO');
  }

  /**
   * Add from PO → click PO (blue arrow) → update received items → vehicle → notes → Add → Yes
   */
  async completeGoodsReceiptFromAcceptedPoFlow({
    poTitle,
    lineItems = [],
    vehicleNumber = '20022002',
    notes = '',
    preferredVendorName = 'Mailinator',
    openGroupAndAddItems = false,
  } = {}) {
    const title = String(poTitle || '').trim();
    const items =
      Array.isArray(lineItems) && lineItems.length
        ? lineItems
        : [
            { name: 'Wires', quantity: '10' },
            { name: 'Lubbers', quantity: '15' },
            { name: 'Motors', quantity: '3' },
          ];
    const vehicle = String(vehicleNumber || '20022002').trim() || '20022002';
    const noteText =
      String(notes || '').trim() || \`GR auto notes \${String(Date.now()).slice(-6)}\`;

    if (openGroupAndAddItems) {
      await this.openCreatedInventoryGroup();
      await this.clickAddItem();
    }
    await this.selectAddFromPo();
    await this.selectVendorForGoodsReceipt(preferredVendorName).catch((err) => {
      this.logStep(\`Vendor step soft-skip: \${err.message}\`);
    });
    await this.selectAcceptedPurchaseOrder(title);
    await this.enterReceivedQuantities(items);
    await this.enterVehicleNumber(vehicle);
    await this.enterNotes(noteText);
    await this.clickAddOnGoodsReceiptForm();
    await this.expectGoodsReceiptAddedSuccess();
    await this.clickYesOnConfirmationPopup();
    await this.expectConfirmationCompleted();
    await this.expectGoodsReceiptUnderGroup(this.lastCreatedGroupName);
    await this.logStep(
      \`Completed goods receipt from PO "\${title}" under group "\${this.lastCreatedGroupName || ''}"\`
    );
  }

  async selectVendorForGoodsReceipt(preferredVendorName = '') {
    const preferred = String(preferredVendorName || 'Mailinator').trim();
    const dialog = this.purchaseOrderPickerDialog();
    const scope = (await dialog.isVisible({ timeout: 6000 }).catch(() => false))
      ? dialog
      : this.page;

    const vendorFilter = scope
      .getByRole('combobox')
      .or(scope.getByLabel(/vendor organization|vendor/i))
      .or(
        scope
          .locator('.MuiSelect-select, [role="button"]')
          .filter({ hasText: /vendor organization/i })
      )
      .filter({ visible: true })
      .first();

    if (await vendorFilter.isVisible({ timeout: 4000 }).catch(() => false)) {
      await vendorFilter.click({ timeout: 10000 }).catch(() => {});
      const opt = this.page
        .getByRole('option', {
          name: new RegExp(preferred.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'i'),
        })
        .filter({ visible: true })
        .first();
      if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opt.click({ timeout: 10000 });
      }
      const apply = scope
        .getByRole('button', { name: /^apply$/i })
        .filter({ visible: true })
        .first();
      if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
        await apply.click({ timeout: 10000 });
        await this.page.waitForTimeout(800);
      }
      await this.logStep(\`Applied vendor filter "\${preferred}" on PO picker\`);
      return;
    }

    if (await this.purchaseOrderPickerDialog().isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.logStep('PO picker already open — no separate vendor selector');
      return;
    }

    throw new Error('Goods receipt: could not find vendor selector after Add from PO');
  }

  /** Search PO title → click blue arrow on that card → open received-item form. */
  async selectAcceptedPurchaseOrder(poTitle) {
    const title = String(poTitle || '').trim();
    const dialog = this.purchaseOrderPickerDialog();
    const scope = (await dialog.isVisible({ timeout: 10000 }).catch(() => false))
      ? dialog
      : this.page;

    await expect(
      scope
        .getByPlaceholder(/search purchase order/i)
        .or(scope.getByText(/purchase order/i))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });

    const search = scope
      .getByPlaceholder(/search purchase order/i)
      .or(scope.getByRole('textbox', { name: /search/i }))
      .filter({ visible: true })
      .first();

    if (title && (await search.isVisible({ timeout: 5000 }).catch(() => false))) {
      await search.click({ timeout: 10000 });
      await search.fill('');
      await search.fill(title);
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.page.waitForTimeout(1000);
      await this.logStep(\`Searched PO picker for "\${title}"\`);
    }

    const titleRe = title
      ? new RegExp(title.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'i')
      : /new po for goods receipt/i;

    const card = scope
      .locator(
        '.MuiCard-root, .MuiPaper-root, [class*="Card"], [class*="card"], div.MuiBox-root, li'
      )
      .filter({ hasText: titleRe })
      .filter({ visible: true })
      .first();

    await expect(card).toBeVisible({ timeout: this.defaultTimeout });

    const arrow = card.locator('button, [role="button"]').filter({ visible: true }).last();
    if (await arrow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await arrow.click({ timeout: 20000 });
      await this.logStep(\`Clicked PO arrow for "\${title || '(matched)'}"\`);
    } else {
      await card.click({ timeout: 20000 });
      await this.logStep(\`Clicked PO card "\${title || '(matched)'}"\`);
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1200);

    const formHint = this.page
      .getByText(/received|vehicle|goods receipt|quantity/i)
      .filter({ visible: true })
      .first();
    await expect(formHint).toBeVisible({ timeout: 60000 }).catch(() => {});
  }

`;

// Fix accidental double-escaping from template authoring above
const fixed = insert
  .replace(/\\\\\`/g, '`')
  .replace(/\\\\\${/g, '${')
  .replace(/\\\\\$&/g, '$&')
  .replace(/\[\*\\\.\\+\\\?\\\^\\\$\\{\\}\\(\\)\\|\\[\\\\\\]\\\\]/g, '[.*+?^${}()|[\\]\\\\]');

// The replace for regex escape is messy — write insert carefully without over-escaping
const insertClean = String.raw`  goodsReceiptPanel() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByText(/goods receipt|add from po|purchase order|vehicle|received/i),
      })
      .or(
        this.page
          .locator('.MuiDrawer-root, .MuiModal-root, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByText(/vehicle|received qty|add from po|purchase order/i) })
      )
      .last();
  }

  /** Modal that lists POs after Add from PO (search + cards + blue arrow). */
  purchaseOrderPickerDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page
          .getByPlaceholder(/search purchase order/i)
          .or(this.page.getByText(/^purchase order$/i)),
      })
      .first();
  }

  async selectAddFromPo() {
    const item = this.page
      .getByRole('menuitem', { name: /add from po|add from purchase order/i })
      .or(this.page.getByText(/^add from po$/i))
      .or(this.page.getByText(/add from po/i))
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Selected Add from PO');
  }

  /**
   * Add from PO → click PO (blue arrow) → update received items → vehicle → notes → Add → Yes
   */
  async completeGoodsReceiptFromAcceptedPoFlow({
    poTitle,
    lineItems = [],
    vehicleNumber = '20022002',
    notes = '',
    preferredVendorName = 'Mailinator',
    openGroupAndAddItems = false,
  } = {}) {
    const title = String(poTitle || '').trim();
    const items =
      Array.isArray(lineItems) && lineItems.length
        ? lineItems
        : [
            { name: 'Wires', quantity: '10' },
            { name: 'Lubbers', quantity: '15' },
            { name: 'Motors', quantity: '3' },
          ];
    const vehicle = String(vehicleNumber || '20022002').trim() || '20022002';
    const noteText =
      String(notes || '').trim() || `GR auto notes ${String(Date.now()).slice(-6)}`;

    if (openGroupAndAddItems) {
      await this.openCreatedInventoryGroup();
      await this.clickAddItem();
    }
    await this.selectAddFromPo();
    await this.selectVendorForGoodsReceipt(preferredVendorName).catch((err) => {
      this.logStep(`Vendor step soft-skip: ${err.message}`);
    });
    await this.selectAcceptedPurchaseOrder(title);
    await this.enterReceivedQuantities(items);
    await this.enterVehicleNumber(vehicle);
    await this.enterNotes(noteText);
    await this.clickAddOnGoodsReceiptForm();
    await this.expectGoodsReceiptAddedSuccess();
    await this.clickYesOnConfirmationPopup();
    await this.expectConfirmationCompleted();
    await this.expectGoodsReceiptUnderGroup(this.lastCreatedGroupName);
    await this.logStep(
      `Completed goods receipt from PO "${title}" under group "${this.lastCreatedGroupName || ''}"`
    );
  }

  async selectVendorForGoodsReceipt(preferredVendorName = '') {
    const preferred = String(preferredVendorName || 'Mailinator').trim();
    const dialog = this.purchaseOrderPickerDialog();
    const scope = (await dialog.isVisible({ timeout: 6000 }).catch(() => false))
      ? dialog
      : this.page;

    const vendorFilter = scope
      .getByRole('combobox')
      .or(scope.getByLabel(/vendor organization|vendor/i))
      .or(
        scope
          .locator('.MuiSelect-select, [role="button"]')
          .filter({ hasText: /vendor organization/i })
      )
      .filter({ visible: true })
      .first();

    if (await vendorFilter.isVisible({ timeout: 4000 }).catch(() => false)) {
      await vendorFilter.click({ timeout: 10000 }).catch(() => {});
      const opt = this.page
        .getByRole('option', {
          name: new RegExp(preferred.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        })
        .filter({ visible: true })
        .first();
      if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opt.click({ timeout: 10000 });
      }
      const apply = scope
        .getByRole('button', { name: /^apply$/i })
        .filter({ visible: true })
        .first();
      if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
        await apply.click({ timeout: 10000 });
        await this.page.waitForTimeout(800);
      }
      await this.logStep(`Applied vendor filter "${preferred}" on PO picker`);
      return;
    }

    if (await this.purchaseOrderPickerDialog().isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.logStep('PO picker already open — no separate vendor selector');
      return;
    }

    throw new Error('Goods receipt: could not find vendor selector after Add from PO');
  }

  /** Search PO title → click blue arrow on that card → open received-item form. */
  async selectAcceptedPurchaseOrder(poTitle) {
    const title = String(poTitle || '').trim();
    const dialog = this.purchaseOrderPickerDialog();
    const scope = (await dialog.isVisible({ timeout: 10000 }).catch(() => false))
      ? dialog
      : this.page;

    await expect(
      scope
        .getByPlaceholder(/search purchase order/i)
        .or(scope.getByText(/purchase order/i))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });

    const search = scope
      .getByPlaceholder(/search purchase order/i)
      .or(scope.getByRole('textbox', { name: /search/i }))
      .filter({ visible: true })
      .first();

    if (title && (await search.isVisible({ timeout: 5000 }).catch(() => false))) {
      await search.click({ timeout: 10000 });
      await search.fill('');
      await search.fill(title);
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.page.waitForTimeout(1000);
      await this.logStep(`Searched PO picker for "${title}"`);
    }

    const titleRe = title
      ? new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : /new po for goods receipt/i;

    const card = scope
      .locator(
        '.MuiCard-root, .MuiPaper-root, [class*="Card"], [class*="card"], div.MuiBox-root, li'
      )
      .filter({ hasText: titleRe })
      .filter({ visible: true })
      .first();

    await expect(card).toBeVisible({ timeout: this.defaultTimeout });

    const arrow = card.locator('button, [role="button"]').filter({ visible: true }).last();
    if (await arrow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await arrow.click({ timeout: 20000 });
      await this.logStep(`Clicked PO arrow for "${title || '(matched)'}"`);
    } else {
      await card.click({ timeout: 20000 });
      await this.logStep(`Clicked PO card "${title || '(matched)'}"`);
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1200);

    const formHint = this.page
      .getByText(/received|vehicle|goods receipt|quantity/i)
      .filter({ visible: true })
      .first();
    await expect(formHint).toBeVisible({ timeout: 60000 }).catch(() => {});
  }

`;

const out = s.slice(0, start) + insertClean + s.slice(end);
fs.writeFileSync(p, out);
console.log('patched ok', { start, end, newLen: out.length });
