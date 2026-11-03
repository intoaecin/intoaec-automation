const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');
const FactoryUi = require('./factoryUi');
const { getContext, flag, has, escapeRe } = require('./factoryTestContext');

const MENU_ITEMS = [
  ['Jobs', 'Jobs'],
  ['Requests', 'Requests'],
  ['Stock', 'Stock'],
  ['Dispatch', 'Dispatch'],
  ['Goods Receipt', 'Goods Receipt'],
  ['Activities', 'Activities'],
  ['Location', 'Location'],
  ['Stages', 'Stages'],
];

class FactoryManagementPage extends BasePage {
  constructor(page) {
    super(page);
    this.ui = new FactoryUi(page, 'FactoryManagement');
    this.defaultTimeout = this.ui.defaultTimeout;
  }

  async openModule() {
    await this.ui.gotoFactory();
    await this.ui.expectPageTitle('Jobs');
  }

  async expectJobsLanding() {
    await this.ui.gotoFactory('jobs');
    await this.ui.expectPageTitle('Jobs');
    await expect(this.page.getByRole('tab', { name: /^Yet to start$/i })).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.page.getByRole('tab', { name: /^In Progress$/i })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: /^Completed$/i })).toBeVisible();
    await expect(this.page.getByText(/Workshop Location/i).first()).toBeVisible();
    this.ui.log('Jobs landing shows status tabs and Workshop Location');
  }

  async expectEveryMenuTitle() {
    for (const [menu, title] of MENU_ITEMS) {
      await this.ui.openMenu(menu);
      await this.ui.expectPageTitle(title);
    }
  }

  async openIncomingAlias() {
    await this.ui.gotoFactory('incoming');
  }

  async expectRequestsPage() {
    await this.ui.expectPageTitle('Requests');
    await expect(this.page.getByRole('tab', { name: /^Overdue$/i })).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.page.getByRole('tab', { name: /^Due today$/i })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: /^Upcoming$/i })).toBeVisible();
    this.ui.log('Requests page is open');
  }

  locationForm() {
    return this.ui.formByText(/Workshop name/i);
  }

  async openAddLocation() {
    await this.ui.gotoFactory('location');
    await this.ui.expectPageTitle('Location');
    await this.ui.clickNamed(/^Add Location$/i);
    await expect(this.locationForm()).toBeVisible({ timeout: this.defaultTimeout });
    this.ui.log('Add Location form is open');
  }

  async chooseLocationTrade() {
    const ctx = getContext();
    const form = this.locationForm();
    const input = form.getByPlaceholder(/^Select trade$/i).first();
    await input.click({ timeout: this.ui.uiTimeout });
    const options = this.page.getByRole('option');
    const hasOption = await options.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasOption) {
      await this.ui.addCustomAutocomplete(/^Select trade$/i, ctx.tradeName, 'Add custom trade', form);
      ctx.pickedTradeName = ctx.tradeName;
      flag('tradeCreated');
      return ctx.tradeName;
    }
    const count = await options.count();
    const real = [];
    for (let index = 0; index < count; index += 1) {
      const text = ((await options.nth(index).innerText()) || '').replace(/\s+/g, ' ').trim();
      if (!text || /add custom trade/i.test(text)) continue;
      real.push({ index, text });
    }
    if (real.length === 0) {
      await this.ui.addCustomAutocomplete(/^Select trade$/i, ctx.tradeName, 'Add custom trade', form);
      ctx.pickedTradeName = ctx.tradeName;
      flag('tradeCreated');
      return ctx.tradeName;
    }
    const preferred = real.find((option) => option.text === ctx.tradeName) || real[0];
    await options.nth(preferred.index).click({ timeout: this.ui.uiTimeout });
    ctx.pickedTradeName = preferred.text;
    this.ui.log(`Location trade: ${preferred.text}`);
    return preferred.text;
  }

  async assignFactoryMember() {
    const form = this.locationForm();
    const input = form.getByPlaceholder(/Select factory members/i).first();
    await expect(input).toBeVisible({ timeout: this.ui.uiTimeout });
    await input.click({ timeout: this.ui.uiTimeout });
    await input.fill('thara');
    const thara = this.page.getByRole('option', { name: /thara/i }).first();
    if (await thara.isVisible({ timeout: 4000 }).catch(() => false)) {
      await thara.click({ timeout: this.ui.uiTimeout });
      this.ui.log('Assigned factory member matching thara');
    } else {
      await input.fill('');
      const first = this.page.getByRole('option').first();
      await expect(first).toBeVisible({ timeout: this.ui.uiTimeout });
      const label = ((await first.innerText()) || '').trim();
      await first.click({ timeout: this.ui.uiTimeout });
      this.ui.log(`Assigned first factory member "${label}" because no thara option was listed`);
    }
    await form.getByText(/Add Location|Edit Location/).first().click({ timeout: this.ui.uiTimeout }).catch(() => {});
  }

  async fillLocationFields({ name, zip } = {}) {
    const ctx = getContext();
    const form = this.locationForm();
    await this.ui.fillPlaceholder(/Enter workshop name/i, name || ctx.workshopName, form);
    await this.chooseLocationTrade();
    const address = form.getByPlaceholder(/Enter address/i).first();
    await address.click({ timeout: this.ui.uiTimeout });
    await address.fill(ctx.address);
    await form.getByText(/Add Location|Edit Location/).first().click({ timeout: this.ui.uiTimeout }).catch(() => {});
    await this.ui.fillPlaceholder(/Enter country/i, ctx.country, form);
    await this.ui.fillPlaceholder(/Enter state/i, ctx.state, form);
    await this.ui.fillPlaceholder(/Enter city/i, ctx.city, form);
    await this.ui.fillPlaceholder(/Enter zip code/i, zip || ctx.zip, form);
  }

  async createLocation() {
    if (has('workshopCreated')) {
      this.ui.log(`Reusing workshop ${getContext().workshopName}`);
      return getContext();
    }
    const ctx = getContext();
    await this.openAddLocation();
    await this.fillLocationFields();
    await this.assignFactoryMember();
    await this.ui.clickNamed(/^Create$/i, this.locationForm());
    await this.ui.expectToast(/Location created successfully/i);
    await expect(this.page.getByText(ctx.workshopName, { exact: true }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    flag('workshopCreated');
    this.ui.log(`Created workshop ${ctx.workshopName}`);
    return ctx;
  }

  async expectLocationRow() {
    const ctx = getContext();
    await this.ui.gotoFactory('location');
    const row = this.locationRow(ctx.workshopName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const trade = ctx.pickedTradeName || ctx.tradeName;
    await expect(row).toContainText(ctx.workshopName);
    await expect(row).toContainText(trade.slice(0, Math.min(trade.length, 18)));
    await expect(row).toContainText(ctx.address.slice(0, Math.min(ctx.address.length, 16)));
    this.ui.log(`Location row shows ${ctx.workshopName}`);
  }

  async editLocationZip() {
    await this.createLocation();
    const ctx = getContext();
    await this.ui.gotoFactory('location');
    await this.page.getByText(ctx.workshopName, { exact: true }).first().click({ timeout: this.ui.uiTimeout });
    const form = this.ui.formByText(/Edit Location/i);
    await expect(form).toBeVisible({ timeout: this.defaultTimeout });
    await this.ui.fillPlaceholder(/Enter zip code/i, ctx.editedZip, form);
    await this.ui.clickNamed(/^Save$/i, form);
    await this.ui.expectToast(/Locations updated successfully/i);
    flag('locationEdited');
    this.ui.log(`Updated zip to ${ctx.editedZip}`);
  }

  async expectEditedZip() {
    const ctx = getContext();
    await this.ui.gotoFactory('location');
    await expect(this.page.getByText(ctx.editedZip, { exact: true }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  locationRow(name) {
    return this.page.locator('div').filter({ hasText: name }).filter({ has: this.page.getByRole('button', { name: /deactivate|activate/i }) }).last();
  }

  async deactivateAndActivate() {
    await this.createLocation();
    const ctx = getContext();
    await this.ui.gotoFactory('location');
    const row = this.locationRow(ctx.workshopName);
    await row.getByRole('button', { name: /^Deactivate$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Location deactivated successfully/i);
    await row.getByRole('button', { name: /^Activate$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Location activated successfully/i);
    this.ui.log(`Deactivated and activated ${ctx.workshopName}`);
  }

  async expectBlankLocationValidation() {
    await this.ui.gotoFactory('location');
    await this.ui.clickNamed(/^Add Location$/i);
    const form = this.locationForm();
    await expect(form).toBeVisible({ timeout: this.defaultTimeout });
    await this.ui.clickNamed(/^Create$/i, form);
    await expect(form.getByText(/Workshop name is required/i)).toBeVisible({ timeout: this.ui.uiTimeout });
    await expect(form.getByText(/Trade is required/i)).toBeVisible();
    await expect(form.getByText(/Address is required/i)).toBeVisible();
    await expect(form.getByText(/Country is required/i)).toBeVisible();
    await expect(form.getByText(/State is required/i)).toBeVisible();
    await expect(form.getByText(/City is required/i)).toBeVisible();
    await this.page.keyboard.press('Escape').catch(() => {});
    this.ui.log('Blank location validation is shown');
  }

  async expectDuplicateLocation() {
    await this.createLocation();
    const ctx = getContext();
    await this.openAddLocation();
    await this.fillLocationFields({ name: ctx.workshopName, zip: '600002' });
    await this.ui.clickNamed(/^Create$/i, this.locationForm());
    await expect(this.page.getByText(/This location name already exists/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    await this.locationForm().getByRole('button', { name: /^Cancel$|^Close$/i }).first().click({ timeout: this.ui.uiTimeout }).catch(() => {});
    this.ui.log('Duplicate workshop name is rejected');
  }

  async openStages() {
    await this.ui.gotoFactory('stages');
    await this.ui.expectPageTitle('Stages');
  }

  tradeInput() {
    return this.page.getByPlaceholder(/^Select trade$/i).first();
  }

  async readSelectedTrade() {
    const byPlaceholder = this.tradeInput();
    if (await byPlaceholder.isVisible({ timeout: 1500 }).catch(() => false)) {
      return ((await byPlaceholder.inputValue()) || '').trim();
    }
    const combo = this.page.getByRole('combobox').first();
    return ((await combo.inputValue().catch(() => '')) || '').trim();
  }

  async selectTradeByName(name) {
    const input = this.tradeInput();
    await expect(input).toBeVisible({ timeout: this.ui.uiTimeout });
    await input.click({ timeout: this.ui.uiTimeout });
    await input.fill(name);
    const exact = this.page.getByRole('option', { name: new RegExp(`^${escapeRe(name)}$`, 'i') }).first();
    await expect(exact).toBeVisible({ timeout: this.ui.uiTimeout });
    await exact.click({ timeout: this.ui.uiTimeout });
    this.ui.log(`Selected trade ${name}`);
  }

  async addCustomTrade(name) {
    await this.openStages();
    await this.ui.addCustomAutocomplete(/^Select trade$/i, name, 'Add custom trade');
    await this.ui.expectToast(/Trade created successfully|Trade and stages created successfully/i).catch(async () => {
      await this.ui.expectText(name);
    });
    this.ui.log(`Custom trade ${name}`);
  }

  stageEditor() {
    return this.page.locator('div').filter({ has: this.page.getByPlaceholder(/Enter stage name/i) }).last();
  }

  async addStage(name) {
    await this.page.getByRole('button', { name: /^Add Stage$/i }).click({ timeout: this.ui.uiTimeout });
    const editor = this.stageEditor();
    await expect(editor.getByText(/^Add Stage$/i).first()).toBeVisible({ timeout: this.ui.uiTimeout });
    await this.ui.fillPlaceholder(/Enter stage name/i, name, editor);
    await expect(editor.getByText(/^Color$/i).first()).toBeVisible();
    await this.ui.clickNamed(/^Save$/i, editor);
    await this.ui.expectToast(/Stage created successfully/i);
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: this.defaultTimeout });
    this.ui.log(`Added stage ${name}`);
  }

  async addTradeAndStage() {
    const ctx = getContext();
    await this.openStages();
    if (!ctx.originalPrimaryTrade) {
      ctx.originalPrimaryTrade = await this.readSelectedTrade();
      this.ui.log(`Original primary trade: ${ctx.originalPrimaryTrade || '(none yet)'}`);
    }
    if (!has('tradeCreated')) {
      await this.addCustomTrade(ctx.tradeName);
      flag('tradeCreated');
    } else {
      await this.selectTradeByName(ctx.tradeName);
    }
    if (!has('stageCreated')) {
      await this.addStage(ctx.stageName);
      flag('stageCreated');
    }
    await expect(this.page.getByText(ctx.stageName, { exact: true }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectStageUnderTrade() {
    const ctx = getContext();
    await this.openStages();
    await this.selectTradeByName(ctx.renamedTradeName && has('tradeRenamed') ? ctx.renamedTradeName : ctx.tradeName);
    await expect(this.page.getByText(ctx.stageName, { exact: true }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectStageSaveDisabledUntilChange() {
    const ctx = getContext();
    await this.addTradeAndStage();
    await this.page.getByText(ctx.stageName, { exact: true }).first().click({ timeout: this.ui.uiTimeout });
    const editor = this.stageEditor();
    const save = editor.getByRole('button', { name: /^Save$/i });
    await expect(save).toBeDisabled({ timeout: this.ui.uiTimeout });
    await this.ui.fillPlaceholder(/Enter stage name/i, ctx.editedStageName, editor);
    await expect(save).toBeEnabled({ timeout: this.ui.uiTimeout });
    this.ui.log('Stage Save stays disabled until the name changes');
  }

  async saveEditedStage() {
    const ctx = getContext();
    const editor = this.stageEditor();
    const current = await editor.getByPlaceholder(/Enter stage name/i).inputValue().catch(() => '');
    if (current.trim() !== ctx.editedStageName) {
      await this.expectStageSaveDisabledUntilChange();
    }
    await this.ui.clickNamed(/^Save$/i, editor);
    await this.ui.expectToast(/Stages updated successfully/i);
    ctx.stageName = ctx.editedStageName;
    flag('stageEdited');
    this.ui.log(`Stage renamed to ${ctx.stageName}`);
  }

  async expectEditedStageVisible() {
    await expect(this.page.getByText(getContext().stageName, { exact: true }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async renameTrade() {
    const ctx = getContext();
    await this.addTradeAndStage();
    const currentName = has('tradeRenamed') ? ctx.renamedTradeName : ctx.tradeName;
    await this.selectTradeByName(currentName);
    await this.page.getByRole('button', { name: /^Rename trade$/i }).click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Rename trade/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    await this.ui.fillPlaceholder(/Enter trade name/i, ctx.renamedTradeName, dialog);
    await this.ui.clickNamed(/^Save$/i, dialog);
    await this.ui.expectToast(/Trade renamed successfully/i);
    flag('tradeRenamed');
    this.ui.log(`Trade renamed to ${ctx.renamedTradeName}`);
  }

  async expectRenamedTrade() {
    const name = getContext().renamedTradeName;
    await expect(this.page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  currentTradeName() {
    const ctx = getContext();
    return has('tradeRenamed') ? ctx.renamedTradeName : ctx.tradeName;
  }

  async changePrimaryAndRestore() {
    const ctx = getContext();
    await this.addTradeAndStage();
    await this.openStages();
    if (!ctx.originalPrimaryTrade) {
      ctx.originalPrimaryTrade = await this.readSelectedTrade();
    }
    if (!has('secondTradeCreated')) {
      await this.addCustomTrade(ctx.secondTradeName);
      flag('secondTradeCreated');
    }
    const original = ctx.originalPrimaryTrade;
    if (original) {
      await this.selectTradeByName(original);
    }
    const checkbox = this.page.getByRole('checkbox', { name: /Primary trade/i });
    await expect(checkbox).toBeVisible({ timeout: this.ui.uiTimeout });
    if (!(await checkbox.isChecked())) {
      await checkbox.check({ timeout: this.ui.uiTimeout });
      await this.ui.expectToast(/Primary trade updated successfully/i);
    }
    const selectedBeforeChange = (await this.readSelectedTrade()) || original || this.currentTradeName();
    await checkbox.uncheck({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Change primary trade/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    const save = dialog.getByRole('button', { name: /^Save$/i });
    await expect(save).toBeDisabled({ timeout: this.ui.uiTimeout });
    const replacement = selectedBeforeChange === ctx.secondTradeName ? this.currentTradeName() : ctx.secondTradeName;
    await this.ui.selectAutocomplete(/Select primary trade/i, replacement, dialog);
    await expect(save).toBeEnabled({ timeout: this.ui.uiTimeout });
    await save.click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Primary trade updated successfully/i);
    if (original) {
      await this.selectTradeByName(original);
      const restored = this.page.getByRole('checkbox', { name: /Primary trade/i });
      if (!(await restored.isChecked())) {
        await restored.check({ timeout: this.ui.uiTimeout });
        await this.ui.expectToast(/Primary trade updated successfully/i);
      }
    }
    flag('primaryRestored');
    this.ui.log(`Primary trade restored to ${original || ctx.secondTradeName}`);
  }

  async expectOriginalPrimary() {
    const original = getContext().originalPrimaryTrade;
    if (!original) {
      await expect(this.page.getByRole('checkbox', { name: /Primary trade/i })).toBeChecked({
        timeout: this.ui.uiTimeout,
      });
      return;
    }
    await this.selectTradeByName(original);
    await expect(this.page.getByRole('checkbox', { name: /Primary trade/i })).toBeChecked({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log(`${original} is primary again`);
  }

  async deleteUnusedStage() {
    const ctx = getContext();
    await this.addTradeAndStage();
    await this.selectTradeByName(this.currentTradeName());
    await this.addStage(ctx.unusedStageName);
    await this.page.getByText(ctx.unusedStageName, { exact: true }).first().click({ timeout: this.ui.uiTimeout });
    const editor = this.stageEditor();
    await editor.getByRole('button', { name: /^Delete$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/Stage deleted successfully/i);
    await expect(this.page.getByText(ctx.unusedStageName, { exact: true })).toHaveCount(0, {
      timeout: this.defaultTimeout,
    });
    this.ui.log(`Deleted unused stage ${ctx.unusedStageName}`);
  }

  async expectTradeAndStageValidation() {
    const ctx = getContext();
    await this.addTradeAndStage();
    await this.openStages();
    await this.ui.addCustomAutocomplete(/^Select trade$/i, this.currentTradeName(), 'Add custom trade');
    await this.ui.expectToast(/This trade already exists|Trade name is required/i);

    await this.selectTradeByName(this.currentTradeName());
    await this.page.getByRole('button', { name: /^Rename trade$/i }).click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Rename trade/i);
    await this.ui.fillPlaceholder(/Enter trade name/i, ' ', dialog);
    await expect(dialog.getByRole('button', { name: /^Save$/i })).toBeDisabled({ timeout: this.ui.uiTimeout });
    await dialog.getByRole('button', { name: /^Cancel$/i }).click({ timeout: this.ui.uiTimeout });

    await this.selectTradeByName(this.currentTradeName());
    await this.page.getByRole('button', { name: /^Add Stage$/i }).click({ timeout: this.ui.uiTimeout });
    const editor = this.stageEditor();
    await this.ui.fillPlaceholder(/Enter stage name/i, ctx.stageName, editor);
    await this.ui.clickNamed(/^Save$/i, editor);
    await this.ui.expectToast(/This stage already exists/i);
    this.ui.log('Trade and stage validation messages are shown');
  }

  async deleteInUseStage() {
    const ctx = getContext();
    await this.openStages();
    await this.selectTradeByName(this.currentTradeName());
    await this.page.getByText(ctx.stageName, { exact: true }).first().click({ timeout: this.ui.uiTimeout });
    const editor = this.stageEditor();
    await editor.getByRole('button', { name: /^Delete$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.expectToast(/This stage is in use and cannot be deleted/i);
    await expect(this.page.getByText(ctx.stageName, { exact: true }).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log(`In-use stage ${ctx.stageName} cannot be deleted`);
  }
}

module.exports = FactoryManagementPage;
