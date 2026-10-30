const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');
const FactoryUi = require('./factoryUi');
const { getContext, flag, has, escapeRe } = require('./factoryTestContext');

const PACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

class FactoryWorkshopPage extends BasePage {
  constructor(page) {
    super(page);
    this.ui = new FactoryUi(page, 'FactoryWorkshop');
    this.defaultTimeout = 120000;
    this.ui.defaultTimeout = 120000;
  }

  async openJobs(tabName) {
    await this.ui.gotoFactory('jobs');
    await this.ui.selectWorkshop(getContext().workshopName);
    if (tabName) {
      await this.page.getByRole('tab', { name: new RegExp(`^${escapeRe(tabName)}$`, 'i') }).click({
        timeout: this.ui.uiTimeout,
      });
    }
  }

  async expectJobOnTab(title, tabName) {
    await this.openJobs(tabName);
    await expect(this.ui.jobCard(title)).toBeVisible({ timeout: this.defaultTimeout });
    const text = await this.ui.jobCard(title).innerText();
    const match = text.match(/Job No:\s*(\S+)/i);
    if (match) getContext().jobNo = match[1];
    this.ui.log(`${title} is on ${tabName}${getContext().jobNo ? ` (${getContext().jobNo})` : ''}`);
  }

  async expectJobAbsent(title) {
    for (const tabName of ['Yet to start', 'In Progress', 'Completed']) {
      await this.openJobs(tabName);
      await expect(this.page.getByText(title, { exact: true })).toHaveCount(0, { timeout: this.ui.uiTimeout });
    }
    this.ui.log(`${title} is absent from the job tabs`);
  }

  async acceptJob(title) {
    await this.openJobs('Yet to start');
    const card = this.ui.jobCard(title);
    await card.getByRole('button', { name: /^Accept job$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Job accepted successfully/i);
    this.ui.log(`Accepted ${title}`);
  }

  async addMaterialOnEditPage({ name, source = /Need to buy/i, quantity = '1' } = {}) {
    const ctx = getContext();
    const material = name || ctx.materialName;
    if (!/manufacturing-order\/edit/i.test(this.page.url())) {
      throw new Error('Material rows are edited on the manufacturing order edit page');
    }
    const add = this.page.getByText(/^Add material$/i).first();
    await expect(add).toBeVisible({ timeout: this.defaultTimeout });
    await add.click({ timeout: this.ui.uiTimeout });
    const nameInput = this.page.getByPlaceholder(/^Material name$/i).last();
    await nameInput.click({ timeout: this.ui.uiTimeout });
    await nameInput.fill(material);
    const catalogHit = this.page.getByRole('option', { name: new RegExp(escapeRe(material), 'i') }).first();
    if (await catalogHit.isVisible({ timeout: 2500 }).catch(() => false)) {
      await catalogHit.click({ timeout: this.ui.uiTimeout });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    const qty = this.page.getByRole('spinbutton').last();
    if (await qty.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qty.fill(quantity);
    }
    const unit = this.page.getByPlaceholder(/^Select unit$/i).last();
    if (await unit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unit.click({ timeout: this.ui.uiTimeout });
      const option = this.page.getByRole('option').first();
      await option.click({ timeout: this.ui.uiTimeout });
    }
    const sourceControl = this.page.getByText(/^Need to buy$/i).last();
    if (source.source !== undefined) {
      /* caller passed a string */
    }
    if (String(source).includes('Use stock') || (source.test && source.test('Use stock') && !source.test('Need to buy'))) {
      if (await sourceControl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sourceControl.click({ timeout: this.ui.uiTimeout });
        const useStock = this.page.getByRole('option', { name: /Use stock/i }).or(this.page.getByRole('menuitem', { name: /Use stock/i })).first();
        if (await useStock.isVisible({ timeout: 2000 }).catch(() => false)) {
          await useStock.click({ timeout: this.ui.uiTimeout });
        }
      }
    }
    await this.page.getByRole('button', { name: /^Action$/i }).click({ timeout: this.ui.uiTimeout });
    await this.page.getByRole('menuitem', { name: /^Save$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Materials saved successfully|Job updated successfully/i);
    this.ui.log(`Saved material ${material}`);
  }

  async openAddMaterials(title) {
    await this.openJobs('Yet to start');
    const card = this.ui.jobCard(title);
    const add = card.getByRole('button', { name: /^Add materials$/i });
    if (await add.isVisible({ timeout: 3000 }).catch(() => false)) {
      await add.click({ timeout: this.ui.uiTimeout });
    } else {
      await this.ui.clickJobMenuItem(title, /^Edit$/i);
    }
    await this.page.waitForURL(/manufacturing-order\/edit/i, { timeout: this.defaultTimeout });
  }

  async startJob(title) {
    await this.openJobs('Yet to start');
    const card = this.ui.jobCard(title);
    const start = card.getByRole('button', { name: /^Start job$/i });
    await expect(start).toBeEnabled({ timeout: this.ui.uiTimeout });
    await start.click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Start this job and move it to In Progress/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    const confirm = dialog.getByRole('button', { name: /^Start job$/i });
    await expect(confirm).toBeEnabled({ timeout: this.ui.uiTimeout });
    await confirm.click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Job started successfully/i);
    flag('jobStarted');
    this.ui.log(`Started ${title}`);
  }

  async acceptAddMaterialAndStart() {
    const ctx = getContext();
    if (has('jobStarted')) {
      await this.expectJobOnTab(ctx.jobTitle, 'In Progress');
      return;
    }
    await this.acceptJob(ctx.jobTitle);
    await this.openAddMaterials(ctx.jobTitle);
    await this.addMaterialOnEditPage({ name: ctx.materialName, source: /Need to buy/i });
    await this.startJob(ctx.jobTitle);
    await this.expectJobOnTab(ctx.jobTitle, 'In Progress');
  }

  async declineDifferentJob(title) {
    await this.openJobs('Yet to start');
    await this.ui.clickJobMenuItem(title, /^Decline$/i);
    const dialog = this.ui.formByText(/Decline job/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    await this.ui.clickNamed(/^Decline$/i, dialog);
    await this.ui.expectToast(/Job declined successfully/i);
    await this.expectJobAbsent(title);
  }

  async expectAddMaterialsInsteadOfStart(title) {
    await this.openJobs('Yet to start');
    const card = this.ui.jobCard(title);
    await expect(card.getByRole('button', { name: /^Add materials$/i })).toBeVisible({ timeout: this.defaultTimeout });
    await expect(card.getByRole('button', { name: /^Start job$/i })).toHaveCount(0);
    this.ui.log(`${title} shows Add materials and not Start job`);
  }

  async addStock() {
    const ctx = getContext();
    await this.ui.gotoFactory('stock');
    await this.ui.selectWorkshop(ctx.workshopName);
    await this.ui.clickNamed(/^Add stock$/i);
    const dialog = this.ui.formByText(/Add stock/i);
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    const material = dialog.getByPlaceholder(/Search or select material/i).first();
    await material.click({ timeout: this.ui.uiTimeout });
    await material.fill('a');
    const option = this.page.getByRole('option').first();
    await expect(option).toBeVisible({ timeout: this.ui.uiTimeout });
    ctx.stockMaterialName = ((await option.innerText()) || '').split('\n')[0].trim();
    await option.click({ timeout: this.ui.uiTimeout });
    await this.ui.fillPlaceholder(/Enter quantity to add/i, ctx.stockQty, dialog);
    await this.ui.clickNamed(/^Save$/i, dialog);
    await this.ui.expectToast(/Stock added successfully/i);
    flag('stockAdded');
    this.ui.log(`Added stock ${ctx.stockMaterialName} x ${ctx.stockQty}`);
  }

  async expectStockRow() {
    const ctx = getContext();
    await this.ui.gotoFactory('stock');
    await this.ui.selectWorkshop(ctx.workshopName);
    const row = this.page.getByRole('row', { name: new RegExp(escapeRe(ctx.stockMaterialName), 'i') }).first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await expect(row).toContainText(ctx.stockQty);
    this.ui.log(`Stock row shows received and available quantity for ${ctx.stockMaterialName}`);
  }

  async expectInvalidStock() {
    await this.ui.gotoFactory('stock');
    await this.ui.selectWorkshop(getContext().workshopName);
    await this.ui.clickNamed(/^Add stock$/i);
    const dialog = this.ui.formByText(/Add stock/i);
    await this.ui.clickNamed(/^Save$/i, dialog);
    await expect(dialog.getByText(/Material name is required|Quantity is required|Unit is required/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    const material = dialog.getByPlaceholder(/Search or select material/i).first();
    await material.click({ timeout: this.ui.uiTimeout });
    await material.fill('a');
    const option = this.page.getByRole('option').first();
    if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
      await option.click({ timeout: this.ui.uiTimeout });
    }
    await this.ui.fillPlaceholder(/Enter quantity to add/i, '0', dialog);
    await this.ui.clickNamed(/^Save$/i, dialog);
    await expect(dialog.getByText(/Quantity is required|Enter a valid quantity/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Stock validation messages are shown');
  }

  async openUpdateProduction(title) {
    await this.openJobs('In Progress');
    const onProgress = await this.ui.jobCard(title).isVisible({ timeout: 4000 }).catch(() => false);
    if (!onProgress) {
      await this.openJobs('Completed');
    }
    await this.ui.clickJobMenuItem(title, /Update Production/i);
    const drawer = this.ui.formByText(/Update Production/i);
    await expect(drawer).toBeVisible({ timeout: this.defaultTimeout });
    return drawer;
  }

  async issueQuantity(title, quantity) {
    const ctx = getContext();
    const drawer = await this.openUpdateProduction(title);
    await drawer.getByRole('tab', { name: /^Materials$/i }).click({ timeout: this.ui.uiTimeout });
    const item = ctx.stockMaterialName || ctx.materialName;
    const edit = drawer.getByRole('button', { name: new RegExp(`Edit issued quantity for .*${escapeRe(item.split(' ')[0])}`, 'i') }).first();
    if (await edit.isVisible({ timeout: 4000 }).catch(() => false)) {
      await edit.click({ timeout: this.ui.uiTimeout });
    } else {
      await drawer.getByRole('button', { name: /Edit issued quantity/i }).first().click({ timeout: this.ui.uiTimeout });
    }
    const input = drawer.locator('input[aria-label*="Edit issued quantity"]').last();
    await expect(input).toBeVisible({ timeout: this.ui.uiTimeout });
    await input.fill(String(quantity));
    await input.press('Enter');
    return drawer;
  }

  async issueWithinStock() {
    const ctx = getContext();
    if (!has('stockAdded')) {
      await this.addStock();
    }
    const drawer = await this.openUpdateProduction(ctx.jobTitle);
    await drawer.getByRole('tab', { name: /^Materials$/i }).click({ timeout: this.ui.uiTimeout });
    const stockButton = drawer.getByRole('button', {
      name: new RegExp(`Edit issued quantity for .*${escapeRe((ctx.stockMaterialName || '').split(' ')[0])}`, 'i'),
    }).first();
    if (!(await stockButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.addProgressMaterial(ctx.stockMaterialName, { useStock: true });
    }
    const issued = await this.issueQuantity(ctx.jobTitle, '1');
    await expect(issued.getByText(/Not in stock/i)).toHaveCount(0, { timeout: this.ui.uiTimeout });
    await expect(issued.getByText(/All issued|From the rack|Ready to issue|not in yet/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Issued quantity is within available stock');
  }

  async issueAboveAvailable() {
    const ctx = getContext();
    const drawer = await this.issueQuantity(ctx.jobTitle, '999999');
    await expect(drawer.getByText(/Issued quantity cannot exceed|Enter a valid issued quantity|Add stock for this material/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Issued quantity above available stock is rejected');
  }

  async setStageQuantity(drawer, stageName, quantity) {
    const row = drawer.getByRole('row', { name: new RegExp(escapeRe(stageName), 'i') }).first();
    await expect(row).toBeVisible({ timeout: this.ui.uiTimeout });
    const button = row.getByRole('button', { name: /\d+\s*\/\s*\d+/ }).first();
    await button.click({ timeout: this.ui.uiTimeout });
    const input = row.locator('input').first();
    await expect(input).toBeVisible({ timeout: this.ui.uiTimeout });
    await input.fill(String(quantity));
    await input.press('Enter');
    this.ui.log(`Stage ${stageName} completed quantity ${quantity}`);
  }

  async prepareStages(drawer) {
    const ctx = getContext();
    await drawer.getByRole('tab', { name: /^Stages$/i }).click({ timeout: this.ui.uiTimeout });
    const noTrade = drawer.getByText(/No trade selected yet/i);
    if (await noTrade.isVisible({ timeout: 2000 }).catch(() => false)) {
      const trade = has('tradeRenamed') ? ctx.renamedTradeName : ctx.tradeName;
      const input = drawer.getByPlaceholder(/^Select trade$/i).first();
      await input.click({ timeout: this.ui.uiTimeout });
      await input.fill(trade);
      await this.page.getByRole('option', { name: new RegExp(`^${escapeRe(trade)}$`, 'i') }).first().click({ timeout: this.ui.uiTimeout });
      await drawer.getByRole('button', { name: /^Save trade$/i }).click({ timeout: this.ui.uiTimeout });
      await this.ui.expectToast(/Trade saved for this job/i);
    }
  }

  async markReadyAndComplete() {
    const ctx = getContext();
    const drawer = await this.openUpdateProduction(ctx.jobTitle);
    await expect(drawer.getByRole('tab', { name: /^Materials$/i })).toBeVisible();
    await expect(drawer.getByRole('tab', { name: /^Stages$/i })).toBeVisible();
    await expect(drawer.getByRole('tab', { name: /Check & pack/i })).toBeVisible();
    await expect(drawer.getByRole('tab', { name: /^Activity$/i })).toBeVisible();
    await this.prepareStages(drawer);
    await this.setStageQuantity(drawer, ctx.stageName, ctx.jobQty);
    await drawer.getByRole('tab', { name: /Check & pack/i }).click({ timeout: this.ui.uiTimeout });
    const ready = drawer.locator('input[type="number"]').first();
    await expect(ready).toBeVisible({ timeout: this.ui.uiTimeout });
    await ready.fill('1');
    const file = drawer.locator('input[type="file"]').first();
    if (await file.count()) {
      await file.setInputFiles({ name: 'pack.png', mimeType: 'image/png', buffer: PACK_PNG });
    }
    await drawer.getByRole('button', { name: /Mark ready to leave|Update ready to leave/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Job marked ready to leave/i);
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.openJobs('In Progress');
    const card = this.ui.jobCard(ctx.jobTitle);
    await card.getByRole('button', { name: /Mark as completed/i }).click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Mark Job As Completed/i);
    await this.ui.clickNamed(/Mark as completed/i, dialog);
    await this.ui.expectToast(/Job marked as completed/i);
    flag('jobCompleted');
    await this.expectJobOnTab(ctx.jobTitle, 'Completed');
  }

  async expectProgressValidation() {
    const ctx = getContext();
    const drawer = await this.openUpdateProduction(ctx.dispatchJobTitle || ctx.jobTitle);
    await this.prepareStages(drawer);
    const rows = drawer.getByRole('row');
    const rowCount = await rows.count();
    if (rowCount >= 3) {
      const secondName = ((await rows.nth(2).innerText()) || '').split('\n')[0].trim();
      await this.setStageQuantity(drawer, ctx.stageName, '1');
      if (secondName) {
        await this.setStageQuantity(drawer, secondName, String(Number(ctx.jobQty) + 5));
        await expect(drawer.getByText(/exceeds the previous stage|exceeds the total requested/i).first()).toBeVisible({
          timeout: this.ui.uiTimeout,
        });
      }
    } else {
      await this.setStageQuantity(drawer, ctx.stageName, String(Number(ctx.jobQty) + 5));
      await expect(drawer.getByText(/exceeds the total requested|Enter a valid completed quantity/i).first()).toBeVisible({
        timeout: this.ui.uiTimeout,
      });
    }
    await drawer.getByRole('tab', { name: /Check & pack/i }).click({ timeout: this.ui.uiTimeout });
    const ready = drawer.locator('input[type="number"]').first();
    if (await ready.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ready.fill('999');
      await ready.press('Tab');
      await expect(drawer.getByText(/Ready quantity must be between|Start the job and update progress/i).first()).toBeVisible({
        timeout: this.ui.uiTimeout,
      });
    }
    const returnInput = drawer.getByRole('spinbutton').last();
    if (await returnInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await returnInput.fill('999');
      await returnInput.press('Tab');
      const returnError = drawer.getByText(/Returned quantity cannot exceed issued quantity/i);
      if (await returnError.isVisible({ timeout: 2000 }).catch(() => false)) {
        this.ui.log('Return above issued is rejected');
      }
    }
    this.ui.log('Progress validation messages are shown');
  }

  async createIndentAndReceive() {
    const ctx = getContext();
    const drawer = await this.openUpdateProduction(ctx.jobTitle);
    await drawer.getByRole('tab', { name: /^Materials$/i }).click({ timeout: this.ui.uiTimeout });
    const rowCheckbox = drawer.getByRole('checkbox').last();
    await expect(rowCheckbox).toBeVisible({ timeout: this.ui.uiTimeout });
    await rowCheckbox.check({ timeout: this.ui.uiTimeout }).catch(() => rowCheckbox.click());
    const createIndent = drawer.getByRole('button', { name: /^Create indent$/i }).first();
    await expect(createIndent).toBeEnabled({ timeout: this.ui.uiTimeout });
    await createIndent.click({ timeout: this.ui.uiTimeout });
    const IndentPage = require('../../projects/procurement/indent/create-indent/indent.page');
    const indent = new IndentPage(this.page);
    await indent.waitForIndentCreateForm();
    await indent.fillIndentTitle(ctx.indentTitle);
    await indent.selectFirstIndentApprover().catch(() => {});
    await indent.clickCreateIndentOnForm();
    await indent.expectIndentCreatedSuccessfully();
    flag('indentCreated');

    await this.ui.gotoFactory('requests');
    await this.ui.selectWorkshop(ctx.workshopName);
    const receive = this.page.getByRole('button', { name: /^Receive$/i }).first();
    await expect(receive).toBeVisible({ timeout: this.defaultTimeout });
    await receive.click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Receive Material/i);
    const qty = dialog.locator('input').last();
    await qty.fill('1');
    await this.ui.clickNamed(/^Receive$/i, dialog);
    await this.ui.expectToast(/received successfully/i);
    await this.ui.gotoFactory('goodsReceipt');
    await this.ui.selectWorkshop(ctx.workshopName);
    await expect(this.page.getByText(/Material received|Goods receipt/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.ui.log('Indent received and listed on Goods Receipt');
  }

  async addProgressMaterial(name, { useStock = false } = {}) {
    const drawer = this.ui.formByText(/Update Production/i);
    await drawer.getByText(/^Add material$/i).first().click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/^Add material$/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    const item = dialog.getByPlaceholder(/Item Name/i).first();
    await item.click({ timeout: this.ui.uiTimeout });
    await item.fill(name);
    const custom = this.page.getByRole('option', { name: new RegExp(escapeRe(name), 'i') }).first();
    if (await custom.isVisible({ timeout: 2500 }).catch(() => false)) {
      await custom.click({ timeout: this.ui.uiTimeout });
    }
    await dialog.locator('input[type="number"]').first().fill('1');
    if (useStock) {
      const inputs = dialog.locator('input');
      const inputCount = await inputs.count();
      for (let index = 0; index < inputCount; index += 1) {
        const value = await inputs.nth(index).inputValue().catch(() => '');
        if (/need to buy/i.test(value)) {
          await inputs.nth(index).click({ timeout: this.ui.uiTimeout });
          await this.page.getByRole('option', { name: /^Use stock$/i }).click({ timeout: this.ui.uiTimeout });
          break;
        }
      }
    }
    const unitField = dialog.locator('input, [role="combobox"]').nth(1);
    await unitField.click({ timeout: this.ui.uiTimeout });
    await this.page.getByRole('option').first().click({ timeout: this.ui.uiTimeout });
    await dialog.getByRole('button', { name: /^Save$/i }).click({ timeout: this.ui.uiTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    this.ui.log(`Added progress material ${name}`);
  }

  async bulkReceive() {
    const ctx = getContext();
    await this.ui.gotoFactory('requests');
    await this.ui.selectWorkshop(ctx.workshopName);
    let boxes = this.page.getByRole('checkbox');
    if ((await boxes.count()) < 2) {
      const drawer = await this.openUpdateProduction(ctx.jobTitle);
      await drawer.getByRole('tab', { name: /^Materials$/i }).click({ timeout: this.ui.uiTimeout });
      await this.addProgressMaterial(ctx.materialName);
      await this.addProgressMaterial(ctx.secondMaterialName);
      const checks = drawer.getByRole('checkbox');
      const available = await checks.count();
      const start = Math.max(0, available - 2);
      for (let index = start; index < available; index += 1) {
        await checks.nth(index).check({ timeout: this.ui.uiTimeout }).catch(() => checks.nth(index).click());
      }
      await drawer.getByRole('button', { name: /^Create indent$/i }).click({ timeout: this.ui.uiTimeout });
      const IndentPage = require('../../projects/procurement/indent/create-indent/indent.page');
      const indent = new IndentPage(this.page);
      await indent.waitForIndentCreateForm();
      await indent.fillIndentTitle(ctx.secondIndentTitle);
      await indent.selectFirstIndentApprover().catch(() => {});
      await indent.clickCreateIndentOnForm();
      await indent.expectIndentCreatedSuccessfully();
      await this.ui.gotoFactory('requests');
      await this.ui.selectWorkshop(ctx.workshopName);
      boxes = this.page.getByRole('checkbox');
    }
    if ((await boxes.count()) < 2) {
      throw new Error('Bulk receive needs two pending request cards');
    }
    await boxes.nth(0).check({ timeout: this.ui.uiTimeout }).catch(() => boxes.nth(0).click());
    await boxes.nth(1).check({ timeout: this.ui.uiTimeout }).catch(() => boxes.nth(1).click());
    await this.page.getByRole('button', { name: /Receive \(\d+\)/i }).click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Receive materials/i);
    await this.ui.clickNamed(/^Receive$/i, dialog);
    await this.ui.expectToast(/Materials received successfully/i);
    this.ui.log('Bulk receive completed');
  }

  async expectInvalidReceive() {
    await this.ui.gotoFactory('requests');
    await this.ui.selectWorkshop(getContext().workshopName);
    const receive = this.page.getByRole('button', { name: /^Receive$/i }).first();
    if (!(await receive.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(this.page.getByText(/No factory request items found|Received/i).first()).toBeVisible({
        timeout: this.ui.uiTimeout,
      });
      this.ui.log('No pending Receive action is available for a fully received card');
      return;
    }
    await receive.click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Receive Material/i);
    const qty = dialog.locator('input').last();
    await qty.fill('0');
    await this.ui.clickNamed(/^Receive$/i, dialog);
    await expect(dialog.getByText(/Received quantity is required|cannot exceed pending/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    await qty.fill('999999');
    await this.ui.clickNamed(/^Receive$/i, dialog);
    await expect(this.page.getByText(/cannot exceed pending quantity/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Receive quantity validation is shown');
  }

  async ensurePackedForDispatch() {
    const ctx = getContext();
    if (has('loadCreated')) return;
    const drawer = await this.openUpdateProduction(ctx.jobTitle);
    await this.prepareStages(drawer);
    await this.setStageQuantity(drawer, ctx.stageName, ctx.jobQty);
    await drawer.getByRole('tab', { name: /Check & pack/i }).click({ timeout: this.ui.uiTimeout });
    const ready = drawer.locator('input[type="number"]').first();
    await expect(ready).toBeVisible({ timeout: this.ui.uiTimeout });
    await ready.fill('1');
    const file = drawer.locator('input[type="file"]').first();
    if (await file.count()) {
      await file.setInputFiles({ name: 'pack.png', mimeType: 'image/png', buffer: PACK_PNG });
    }
    const mark = drawer.getByRole('button', { name: /Mark ready to leave|Update ready to leave/i });
    if (await mark.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await mark.click({ timeout: this.ui.uiTimeout });
      await this.ui.expectToast(/Job marked ready to leave|already ready/i);
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    this.ui.log(`Packed ${ctx.jobTitle} for dispatch`);
  }

  async createDispatchLoad() {
    const ctx = getContext();
    await this.ui.gotoFactory('dispatch');
    await this.ui.selectWorkshop(ctx.workshopName);
    await this.page.getByRole('tab', { name: /Ready to go/i }).click({ timeout: this.ui.uiTimeout });
    const readyCard = this.page.getByRole('button', { name: /Add to load/i }).first();
    await expect(readyCard).toBeVisible({ timeout: this.defaultTimeout });
    const newLoad = this.page.getByRole('button', { name: /^New load$/i });
    await expect(newLoad).toBeEnabled({ timeout: this.ui.uiTimeout });
    await newLoad.click({ timeout: this.ui.uiTimeout });
    const form = this.ui.formByText(/Going to|Create load/i);
    await expect(form).toBeVisible({ timeout: this.defaultTimeout });
    const checkbox = form.getByRole('checkbox').first();
    await checkbox.check({ timeout: this.ui.uiTimeout }).catch(() => checkbox.click());
    await this.ui.addCustomAutocomplete(/Select destination/i, ctx.destination, 'Add custom destination', form);
    await this.ui.pickDate(form, /Leaving on/i, ctx.neededOnSite);
    await this.ui.clickNamed(/^Create load$/i, form);
    await this.ui.expectToast(/Load created successfully/i);
    await this.page.getByRole('tab', { name: /Loads going out/i }).click({ timeout: this.ui.uiTimeout });
    await expect(this.page.getByText(ctx.destination, { exact: false }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    flag('loadCreated');
    this.ui.log(`Dispatch load created for ${ctx.destination}`);
  }

  async expectDispatchValidation() {
    await this.ui.gotoFactory('dispatch');
    await this.ui.selectWorkshop(getContext().workshopName);
    await this.page.getByRole('tab', { name: /Ready to go/i }).click({ timeout: this.ui.uiTimeout }).catch(() => {});
    const newLoad = this.page.getByRole('button', { name: /^New load$/i });
    await expect(newLoad).toBeVisible({ timeout: this.defaultTimeout });
    if (await newLoad.isDisabled()) {
      await newLoad.locator('xpath=..').hover({ timeout: this.ui.uiTimeout }).catch(() => {});
      await expect(this.page.getByText(/Nothing is ready to leave yet|Check & pack/i).first()).toBeVisible({
        timeout: this.ui.uiTimeout,
      });
      this.ui.log('New load is disabled until a job is packed');
      return;
    }
    await newLoad.click({ timeout: this.ui.uiTimeout });
    const form = this.ui.formByText(/Create load/i);
    await this.ui.clickNamed(/^Create load$/i, form);
    await expect(form.getByText(/Select at least one job|Leaving date is required|Destination site is required|Enter a valid dispatch quantity/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Create load is blocked without a job, destination, or leaving date');
  }

  async expectActivities() {
    const ctx = getContext();
    await this.ui.gotoFactory('activities');
    await this.ui.selectWorkshop(ctx.workshopName);
    for (const tabName of ['All', 'Job progress', 'Dispatch']) {
      await this.page.getByRole('tab', { name: new RegExp(`^${escapeRe(tabName)}$`, 'i') }).click({
        timeout: this.ui.uiTimeout,
      });
      const empty = this.page.getByText(/No activity logged yet/i);
      if (await empty.isVisible({ timeout: 2500 }).catch(() => false)) {
        this.ui.log(`${tabName} has no activity rows`);
        continue;
      }
      const chip = this.page.getByText(/\d+\s+activities/i).first();
      await expect(chip).toBeVisible({ timeout: this.ui.uiTimeout });
      const count = Number(((await chip.innerText()) || '').match(/\d+/)?.[0] || '0');
      const cards = this.page.getByText(/^By:/);
      const visible = await cards.count();
      expect(visible).toBe(count);
      this.ui.log(`${tabName} activity count ${count} matches the list`);
    }
    if (ctx.jobNo || ctx.jobTitle) {
      const filter = this.page.getByPlaceholder(/Filter by manufacturing order/i).first();
      if (await filter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filter.click({ timeout: this.ui.uiTimeout });
        await filter.fill(ctx.jobNo || ctx.jobTitle);
        const option = this.page.getByRole('option', { name: new RegExp(escapeRe(ctx.jobNo || ctx.jobTitle), 'i') }).first();
        if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
          await option.click({ timeout: this.ui.uiTimeout });
          this.ui.log(`Filtered activities by ${ctx.jobNo || ctx.jobTitle}`);
        }
      }
    }
  }
}

module.exports = FactoryWorkshopPage;
