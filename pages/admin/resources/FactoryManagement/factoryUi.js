const { expect } = require('@playwright/test');
const urls = require('../../../../config/urls');
const { escapeRe } = require('./factoryTestContext');

class FactoryUi {
  constructor(page, logPrefix) {
    this.page = page;
    this.logPrefix = logPrefix;
    this.defaultTimeout = 90000;
    this.uiTimeout = 20000;
  }

  log(message) {
    console.log(`[${this.logPrefix}] ${message}`);
  }

  async gotoFactory(tab) {
    const target = tab
      ? `${urls.factoryManagement}?tab=${encodeURIComponent(tab)}`
      : urls.factoryManagement;
    if (this.page.isClosed()) {
      throw new Error('Page was closed before opening Factory Management');
    }
    const current = this.page.url();
    const alreadyThere =
      urls.isFactoryManagement(current) &&
      (!tab || new URL(current).searchParams.get('tab') === tab || (tab === 'jobs' && !new URL(current).searchParams.get('tab')));
    if (!alreadyThere) {
      await this.page.goto(target, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    this.log(`Opened Factory Management ${tab || 'jobs'} (${this.page.url()})`);
  }

  async openMenu(label) {
    const item = this.page.getByRole('button', { name: new RegExp(`^${escapeRe(label)}$`, 'i') }).first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: this.uiTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    this.log(`Opened factory menu ${label}`);
  }

  async expectPageTitle(label) {
    const title = this.page
      .locator('.MuiTypography-h6, h6')
      .filter({ hasText: new RegExp(`^${escapeRe(label)}$`, 'i') })
      .first();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    this.log(`Page title is ${label}`);
  }

  async expectText(text, timeout = this.defaultTimeout) {
    const pattern = text instanceof RegExp ? text : new RegExp(escapeRe(text), 'i');
    const node = this.page.getByText(pattern).first();
    await expect(node).toBeVisible({ timeout });
    return node;
  }

  async expectToast(message) {
    const toast = this.page.locator('.Toastify__toast').filter({ hasText: message }).last();
    await expect(toast).toBeVisible({ timeout: this.uiTimeout });
    this.log(`Toast: ${message}`);
  }

  formByText(text) {
    return this.page
      .locator('.MuiModal-root, .MuiDrawer-root, [role="dialog"]')
      .filter({ hasText: text })
      .last();
  }

  async fillPlaceholder(placeholder, value, scope = this.page) {
    const input = scope.getByPlaceholder(placeholder).first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: this.uiTimeout });
    await input.fill('');
    await input.fill(String(value));
    this.log(`Filled ${placeholder} with ${value}`);
    return input;
  }

  async clickNamed(name, scope = this.page) {
    const button = scope.getByRole('button', { name }).first();
    await expect(button).toBeVisible({ timeout: this.uiTimeout });
    await button.click({ timeout: this.uiTimeout });
    this.log(`Clicked ${name}`);
    return button;
  }

  async chooseOption(query, optionName) {
    const option = this.page
      .getByRole('option', {
        name: optionName instanceof RegExp ? optionName : new RegExp(`^${escapeRe(optionName)}$`, 'i'),
      })
      .first();
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    await option.click({ timeout: this.uiTimeout });
    this.log(`Chose option ${optionName} for ${query || 'list'}`);
  }

  async selectAutocomplete(placeholder, optionName, scope = this.page) {
    const input = scope.getByPlaceholder(placeholder).first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: this.uiTimeout });
    if (optionName) {
      await input.fill('');
      await input.fill(String(optionName));
    }
    await this.chooseOption(placeholder, optionName);
  }

  async addCustomAutocomplete(placeholder, text, addLabel, scope = this.page) {
    const input = scope.getByPlaceholder(placeholder).first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: this.uiTimeout });
    await input.fill('');
    await input.fill(String(text));
    const option = this.page
      .getByRole('option', { name: new RegExp(escapeRe(addLabel), 'i') })
      .first();
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    await option.click({ timeout: this.uiTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    this.log(`Added custom ${addLabel}: ${text}`);
  }

  async firstRealOption(skipPattern) {
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: this.uiTimeout });
    const count = await options.count();
    for (let index = 0; index < count; index += 1) {
      const option = options.nth(index);
      const text = ((await option.innerText()) || '').trim();
      if (!text || (skipPattern && skipPattern.test(text))) continue;
      await option.click({ timeout: this.uiTimeout });
      return text;
    }
    throw new Error('No selectable autocomplete option was found');
  }

  async pickDate(scope, labelPattern, date) {
    const label = scope.getByText(labelPattern).first();
    await expect(label).toBeVisible({ timeout: this.uiTimeout });
    const block = label.locator('xpath=..');
    const opener = block.getByRole('button', { name: /choose date/i }).first();
    if (await opener.isVisible({ timeout: 2000 }).catch(() => false)) {
      await opener.click({ timeout: this.uiTimeout });
    } else {
      await block.locator('input').first().click({ timeout: this.uiTimeout });
    }
    await this.chooseCalendarDay(date);
    this.log(`Picked date ${date.toDateString()} for ${labelPattern}`);
  }

  async chooseCalendarDay(date) {
    const popper = this.page
      .locator('.MuiPickersPopper-root, .MuiDateCalendar-root, [role="dialog"]')
      .filter({ visible: true })
      .last();
    await expect(popper).toBeVisible({ timeout: this.uiTimeout });

    const monthName = date.toLocaleString('en-US', { month: 'long' });
    const year = String(date.getFullYear());
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const header = ((await popper.locator('.MuiPickersCalendarHeader-label').first().innerText().catch(() => '')) || '').trim();
      if (header.includes(monthName) && header.includes(year)) break;
      const next = popper.getByRole('button', { name: /next month/i }).first();
      await next.click({ timeout: this.uiTimeout });
    }

    const full = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const day = String(date.getDate());
    const cell = popper
      .getByRole('gridcell', { name: new RegExp(escapeRe(full).replace(',', ',?'), 'i') })
      .or(popper.getByRole('gridcell', { name: new RegExp(`\\b${day}\\b`) }))
      .first();
    await expect(cell).toBeVisible({ timeout: this.uiTimeout });
    await cell.click({ timeout: this.uiTimeout });
  }

  jobCard(title) {
    const titleNode = this.page.getByText(new RegExp(`^${escapeRe(title)}$`)).first();
    return titleNode.locator('xpath=ancestor::div[.//*[@data-testid="MoreVertIcon"]][1]');
  }

  async openJobMenu(title) {
    const card = this.jobCard(title);
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.locator('[data-testid="MoreVertIcon"]').first().click({ timeout: this.uiTimeout });
    this.log(`Opened job menu for ${title}`);
  }

  async clickJobMenuItem(title, itemName) {
    await this.openJobMenu(title);
    const item = this.page.getByRole('menuitem', { name: itemName }).first();
    await expect(item).toBeVisible({ timeout: this.uiTimeout });
    await item.click({ timeout: this.uiTimeout });
    this.log(`Chose ${itemName} for ${title}`);
  }

  async selectWorkshop(name) {
    if (!name) return;
    const inputs = this.page.locator('input');
    const inputCount = await inputs.count();
    for (let index = 0; index < Math.min(inputCount, 30); index += 1) {
      const value = await inputs.nth(index).inputValue().catch(() => '');
      if (value.trim() === name) {
        this.log(`Workshop already selected: ${name}`);
        return;
      }
    }
    const input = this.page.getByPlaceholder(/workshop location|select workshop/i).first();
    if (!(await input.isVisible({ timeout: 4000 }).catch(() => false))) {
      this.log('Workshop picker is not on this screen');
      return;
    }
    await input.click({ timeout: this.uiTimeout });
    await input.fill(name);
    await this.chooseOption('workshop', name);
    this.log(`Selected workshop ${name}`);
  }
}

module.exports = FactoryUi;
