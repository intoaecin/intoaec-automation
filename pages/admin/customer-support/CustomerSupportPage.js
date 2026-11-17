const path = require('path');
const { expect } = require('@playwright/test');
const BasePage = require('../../BasePage');
const urls = require('../../../config/urls');

const PDF_FIXTURE = path.join(__dirname, '../../../fixtures/sample-po-import.pdf');
const LIST_ID = '#customer-support-tickets-list-scroll';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class CustomerSupportPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.createdTitles = [];
    this.lastTitle = '';
    this.lastSummary = '';
    this.lastSummaryToken = '';
    this.lastSerial = '';
    this.lastLeadName = '';
    this.lastProjectName = '';
    this.lastProjectSearchName = '';
    this.lastStatus = '';
    this.lastPriority = '';
    this.lastTag = '';
    this.lastContactName = '';
    this.lastPhone = '';
    this.lastListTotal = 0;
    this.sortPrefix = '';
    this.sortOlderTitle = '';
    this.sortNewerTitle = '';
  }

  rebind(page) {
    this.page = page;
  }

  logStep(message) {
    console.log(`[Customer Support] ${message}`);
  }

  dialog() {
    return this.page.getByRole('dialog').filter({ hasText: /create ticket|edit ticket|view ticket/i }).last();
  }

  list() {
    return this.page.locator(LIST_ID);
  }

  filterPopover() {
    return this.page.locator('.MuiPopover-paper').filter({ hasText: /sort by/i }).last();
  }

  ticketCard(title) {
    const exact = escapeRegExp(title);
    return this.list()
      .locator('div')
      .filter({ hasText: new RegExp(exact) })
      .filter({ has: this.page.getByRole('button', { name: /^status$/i }) })
      .last();
  }

  _isGetTickets(request) {
    const post = request.postData() || '';
    return post.includes('GET_CUSTOMER_SUPPORT_TICKETS');
  }

  async _waitForTicketList(predicate, timeout = 30000) {
    return this.page.waitForResponse((response) => {
      const request = response.request();
      if (!this._isGetTickets(request)) return false;
      if (typeof predicate === 'function') return predicate(request.postData() || '');
      return true;
    }, { timeout });
  }

  async openFromSidebar() {
    this.logStep('Opening Customer Support from the sidebar');
    const listed = this._waitForTicketList(null, 45000);
    const link = this.page
      .getByRole('link', { name: /customer\s*support/i })
      .or(this.page.getByRole('button', { name: /customer\s*support/i }))
      .first();
    if (await link.isVisible({ timeout: 8000 }).catch(() => false)) {
      await link.click();
    } else {
      this.logStep(`Sidebar link not visible — opening ${urls.customerSupport}`);
      await this.page.goto(urls.customerSupport);
    }
    await this.page.waitForURL(/\/customer-support\/?(\?|$)/i, { timeout: this.defaultTimeout });
    await this.waitForDesk(listed);
  }

  async waitForDesk(pendingResponse) {
    await expect(
      this.page.getByRole('heading', { name: /support desk/i })
        .or(this.page.getByText(/^support desk$/i))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    const response = await Promise.resolve(pendingResponse).catch(() => null);
    if (response) {
      const json = await response.json().catch(() => null);
      this.lastListTotal = Number(json?.body?.total) || 0;
      this.logStep(`Desk loaded (total ${this.lastListTotal})`);
    }
    await expect(
      this.page.getByRole('button', { name: /^create ticket$/i }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectDeskChrome() {
    await expect(this.page).toHaveURL(/\/customer-support/i);
    await expect(this.page.getByRole('button', { name: /^filter$/i }).first()).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: /search tickets|^search$/i }).first()
    ).toBeVisible();
    const cards = await this.page.getByRole('button', { name: /^status$/i }).count();
    if (cards === 0) {
      await expect(this.page.getByText(/no tickets found/i).first()).toBeVisible();
      await expect(this.page.getByText(/create a ticket to start tracking/i).first()).toBeVisible();
      this.logStep('Empty desk state is shown');
      return;
    }
    const serial = this.list().getByText(/CS\d{3,}/i).first();
    await expect(serial).toBeVisible();
    this.logStep('Ticket list is shown');
  }

  async _openSearch() {
    const input = this.page.getByRole('textbox', { name: /search tickets/i });
    if (await input.isVisible({ timeout: 1500 }).catch(() => false)) return input;
    await this.page.getByRole('button', { name: /search tickets/i }).first().click();
    await expect(input).toBeVisible({ timeout: 10000 });
    return input;
  }

  async search(text) {
    this.logStep(`Searching tickets for "${text}"`);
    const input = await this._openSearch();
    const pending = this._waitForTicketList(
      (post) => post.includes(String(text).trim()),
      20000
    );
    await input.fill(String(text));
    await pending.catch(() => this.page.waitForTimeout(800));
  }

  async clearSearch() {
    this.logStep('Clearing ticket search');
    const input = await this._openSearch();
    const clear = this.page.getByRole('search', { name: /search tickets/i }).getByRole('button', { name: /^clear$/i });
    if (await clear.isVisible({ timeout: 1000 }).catch(() => false)) {
      const pending = this._waitForTicketList(null, 20000);
      await clear.click();
      await pending.catch(() => {});
      return;
    }
    const pending = this._waitForTicketList(null, 20000);
    await input.fill('');
    await pending.catch(() => {});
  }

  async expectTicketVisible(title = this.lastTitle) {
    await expect(this.ticketCard(title)).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectTicketHidden(title = this.lastTitle) {
    await expect(this.ticketCard(title)).toHaveCount(0, { timeout: this.defaultTimeout });
  }

  async expectEmptyFiltered() {
    await expect(this.page.getByText(/no tickets match your search or filters/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.page.getByRole('button', { name: /^create ticket$/i }).first()).toBeVisible();
  }

  async expectDeskStillUsable() {
    await expect(this.page.getByText(/^support desk$/i).first()).toBeVisible();
    await expect(this.page.getByRole('alert').filter({ hasText: /something went wrong/i })).toHaveCount(0);
  }

  uniqueTitle(prefix = 'CS') {
    const token = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    return `${prefix} ${token}`;
  }

  async openCreate() {
    this.logStep('Opening create ticket');
    const button = this.page.getByRole('button', { name: /^create ticket$/i }).first();
    await expect(button).toBeVisible({ timeout: this.defaultTimeout });
    await button.click();
    await expect(this.dialog()).toBeVisible({ timeout: this.defaultTimeout });
  }

  _rememberLeadChoice(optionText) {
    const lines = String(optionText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    this.lastLeadName = lines[0] || '';
    const extras = lines
      .slice(1)
      .filter((line) => !/^(lead|client)$/i.test(line) && !line.includes('@'));
    // Navigate Clients by the selected option name — short search hints like "kumar"
    // resolve to a hard-coded org that may not own this ticket.
    this.lastProjectName = extras[0] || this.lastLeadName;
    this.lastProjectSearchName = this.lastLeadName;
  }

  async _selectFirstLead({ preferClient = true, projectNav = false } = {}) {
    const lead = this.dialog().getByPlaceholder(/search lead or client/i);
    await lead.click();

    // Prefer names that usually exist on Admin Clients (needed for overview CS-ADM-31).
    // Avoid short aliases like "kumar" — ProjectNavigationPage maps those to a hard-coded org.
    const searchHints = projectNav
      ? ['Bhavani', 'kumarorganization', 'MVB', 'Hari', 'Pooja']
      : [];
    for (const hint of searchHints) {
      await lead.fill(hint);
      await this.page.waitForTimeout(900);
      const matched = this.page
        .getByRole('option')
        .filter({ hasNotText: /add new|^internal$/i })
        .filter({ hasText: new RegExp(escapeRegExp(hint), 'i') });
      if (!(await matched.first().isVisible({ timeout: 2500 }).catch(() => false))) continue;
      const chosen = matched.first();
      this._rememberLeadChoice(await chosen.innerText());
      this.logStep(
        `Selecting lead "${this.lastLeadName}" via search "${hint}" (project "${this.lastProjectName}")`
      );
      await chosen.click();
      return;
    }

    if (searchHints.length) await lead.fill('');
    const options = this.page.getByRole('option').filter({ hasNotText: /add new|^internal$/i });
    await expect(options.first()).toBeVisible({ timeout: this.defaultTimeout });
    const count = await options.count();
    let chosen = options.first();
    if (preferClient) {
      for (let i = 0; i < count; i += 1) {
        const text = ((await options.nth(i).innerText()) || '').trim();
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.some((line) => /^client$/i.test(line))) {
          chosen = options.nth(i);
          break;
        }
      }
    }
    this._rememberLeadChoice(await chosen.innerText());
    this.logStep(
      `Selecting lead "${this.lastLeadName}" (project "${this.lastProjectName}")`
    );
    await chosen.click();
  }

  async _selectFirstTag() {
    const tags = this.dialog().getByPlaceholder(/select tags/i);
    await tags.click();
    const option = this.page.getByRole('option').filter({ hasNotText: /add new/i }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    this.lastTag = ((await option.innerText()) || '').split('\n')[0].trim();
    this.logStep(`Selecting tag "${this.lastTag}"`);
    await option.click();
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async _selectTags(count) {
    const tags = this.dialog().getByPlaceholder(/select tags/i);
    await tags.click();
    const options = this.page.getByRole('option').filter({ hasNotText: /add new/i });
    const available = await options.count();
    const take = Math.min(count, available);
    if (take < 1) throw new Error('No support tags are available to select');
    const names = [];
    for (let i = 0; i < take; i += 1) {
      const option = options.nth(i);
      names.push(((await option.innerText()) || '').split('\n')[0].trim());
      await option.click();
    }
    this.lastTag = names[0];
    this.selectedTags = names;
    await this.page.keyboard.press('Escape').catch(() => {});
    this.logStep(`Selected tags: ${names.join(', ')}`);
    return names;
  }

  async _fillSummary(text) {
    const editor = this.dialog().locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 15000 });
    await editor.click();
    await editor.fill(text);
  }

  async _attachPdf() {
    const input = this.dialog().locator('input[type="file"]').first();
    await input.setInputFiles(PDF_FIXTURE);
    await expect(this.dialog().getByText(/sample-po-import\.pdf/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async _readActiveClientProjectNames(limit = 8) {
    const env = require('../../../config/env');
    const adminBase = String(env.admin || '').replace(/\/$/, '');
    const listUrl = `${adminBase}/client?isActive=true`;
    this.logStep(`Reading Active Clients projects from ${listUrl}`);
    await this.page.goto(listUrl);
    await this.page.waitForURL(/\/client/i, { timeout: this.defaultTimeout });
    const rows = this.page.locator('th[scope="row"] span.text-dark').filter({ visible: true });
    await expect(rows.first()).toBeVisible({ timeout: 30000 });
    const count = Math.min(await rows.count(), limit);
    const names = [];
    for (let i = 0; i < count; i += 1) {
      const name = ((await rows.nth(i).innerText()) || '').split('\n')[0].trim();
      if (name && !names.includes(name)) names.push(name);
    }
    if (!names.length) {
      throw new Error('No Active Clients project name was available for overview support tickets');
    }
    this.logStep(`Captured Active Clients projects: ${names.join(', ')}`);
    return names;
  }

  async _selectLeadBySearch(query) {
    const lead = this.dialog().getByPlaceholder(/search lead or client/i);
    await lead.click();
    await lead.fill(String(query));
    await this.page.waitForTimeout(1200);
    const option = this.page
      .getByRole('option')
      .filter({ hasNotText: /add new|^internal$/i })
      .filter({ hasText: new RegExp(escapeRegExp(query), 'i') })
      .first();
    await expect(option).toBeVisible({ timeout: 20000 });
    this._rememberLeadChoice(await option.innerText());
    // Keep the Active Clients list name for navigation so overview leadId matches.
    this.lastProjectSearchName = String(query);
    this.lastLeadName = String(query);
    this.lastProjectName = String(query);
    this.logStep(`Selecting lead/client match for "${query}"`);
    await option.click();
  }

  /** Create a linked ticket for a client that exists on Active Clients (overview CS-ADM-31). */
  async createLinkedTicketForActiveClient() {
    const projectNames = await this._readActiveClientProjectNames(8);
    const pending = this._waitForTicketList(null, 45000);
    await this.page.goto(urls.customerSupport);
    await this.page.waitForURL(/\/customer-support/i, { timeout: this.defaultTimeout });
    await this.waitForDesk(pending);
    await this.openCreate();
    const title = this.uniqueTitle('CS linked');
    const summaryToken = `sum${Date.now().toString(36)}`;
    this.lastTitle = title;
    this.lastSummaryToken = summaryToken;
    this.lastSummary = `Support summary ${summaryToken}`;
    if (!this.createdTitles.includes(title)) this.createdTitles.push(title);
    this.logStep(`Filling linked ticket "${title}" for an Active Clients project`);
    await this.dialog().getByPlaceholder(/^title$/i).fill(title);
    let selected = false;
    let lastError;
    for (const projectName of projectNames) {
      try {
        await this._selectLeadBySearch(projectName);
        selected = true;
        break;
      } catch (error) {
        lastError = error;
        this.logStep(`Lead search missed "${projectName}"; trying next Active Client`);
      }
    }
    if (!selected) {
      throw lastError || new Error('No Active Clients project matched the support ticket lead search');
    }
    await this._fillSummary(this.lastSummary);
    await this._selectFirstTag().catch(() => {});
    await this.submit();
  }

  async fillLinkedTicket(options = {}) {
    const title = options.title || this.uniqueTitle('CS linked');
    const summaryToken = options.summaryToken || `sum${Date.now().toString(36)}`;
    const summary = options.summary || `Support summary ${summaryToken}`;
    this.lastTitle = title;
    this.lastSummary = summary;
    this.lastSummaryToken = summaryToken;
    if (!this.createdTitles.includes(title)) this.createdTitles.push(title);
    this.logStep(`Filling linked ticket "${title}"`);
    await this.dialog().getByPlaceholder(/^title$/i).fill(title);
    if (options.leadSearch) {
      await this._selectLeadBySearch(options.leadSearch);
    } else {
      await this._selectFirstLead({ projectNav: Boolean(options.projectNav) });
    }
    await this._fillSummary(summary);
    if (options.tagCount) {
      await this._selectTags(options.tagCount);
    } else if (options.withTag !== false) {
      await this._selectFirstTag();
    }
    if (options.withAttachment) {
      await this._attachPdf();
    }
    if (options.assigneeCount) {
      await this._pickAssignees(options.assigneeCount);
    }
    return title;
  }

  async setLinked(linked) {
    const toggle = this.dialog()
      .getByRole('checkbox', { name: /^linked$/i })
      .or(this.dialog().getByRole('switch', { name: /^linked$/i }))
      .first();
    await expect(toggle).toBeVisible();
    const checked = await toggle.isChecked();
    if (checked !== linked) await toggle.click();
  }

  async fillInternalTicket({ name, phone, title } = {}) {
    const ticketTitle = title || this.uniqueTitle('CS internal');
    this.lastTitle = ticketTitle;
    if (!this.createdTitles.includes(ticketTitle)) this.createdTitles.push(ticketTitle);
    this.lastContactName = name || '';
    this.lastPhone = phone || '';
    this.lastSummary = `Internal summary ${ticketTitle}`;
    this.logStep(`Filling internal ticket "${ticketTitle}"`);
    await this.dialog().getByPlaceholder(/^title$/i).fill(ticketTitle);
    await this.setLinked(false);
    // "Internal" is the Autocomplete input value, not plain text. Contact fields prove Linked is off.
    const contactName = this.dialog().locator('#support-ticket-contact-name');
    await expect(contactName).toBeVisible({ timeout: 15000 });
    const linked = this.dialog()
      .getByRole('checkbox', { name: /^linked$/i })
      .or(this.dialog().getByRole('switch', { name: /^linked$/i }))
      .first();
    await expect(linked).not.toBeChecked();
    if (name) {
      await contactName.fill(name);
    }
    if (phone !== undefined) {
      await this.dialog().locator('#support-ticket-contact-phone').fill(phone);
    }
    await this._fillSummary(this.lastSummary);
  }

  async submit() {
    // Catch immediately. A click timeout must not leave this waiter as an unhandled rejection.
    const pending = this.page.waitForResponse(
      (response) => {
        const post = response.request().postData() || '';
        return post.includes('CREATE_CUSTOMER_SUPPORT_TICKET') || post.includes('UPDATE_CUSTOMER_SUPPORT_TICKET');
      },
      { timeout: this.defaultTimeout }
    ).catch(() => null);
    await this.dialog().getByRole('button', { name: /^(create ticket|update)$/i }).click();
    await pending;
  }

  async _captureCardMeta() {
    const card = this.ticketCard(this.lastTitle);
    const cardText = await card.innerText();
    const serial = cardText.match(/CS\d{3,}/i);
    if (serial) this.lastSerial = serial[0];
    const statusButton = card.getByRole('button', { name: /^status$/i });
    this.lastStatus = ((await statusButton.innerText()) || '').split('\n')[0].trim();
    const priorityMatch = cardText.match(/\b(Critical|High|Medium|Low)\b/);
    if (priorityMatch) this.lastPriority = priorityMatch[1];
  }

  /** Right after submit: the toast is optional because it disappears before later checks. */
  async expectCreated() {
    const toast = this.page.getByText(/ticket created successfully/i).first();
    const toastVisible = await toast.isVisible().catch(() => false);
    if (!toastVisible) {
      await toast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {
        this.logStep('Create toast already gone; checking the ticket card');
      });
    }
    await this.expectTicketListed();
    this.logStep(`Created ${this.lastSerial || this.lastTitle} status=${this.lastStatus} priority=${this.lastPriority}`);
  }

  /** Ticket is on the desk. Safe to call after search, when the create toast is gone. */
  async expectTicketListed() {
    if (this.lastTitle && !this.createdTitles.includes(this.lastTitle)) {
      this.createdTitles.push(this.lastTitle);
    }
    await expect(this.dialog()).toBeHidden({ timeout: 15000 }).catch(() => {});
    await this.expectTicketVisible(this.lastTitle);
    if (!this.lastSerial) await this._captureCardMeta();
  }

  async expectUpdated() {
    await expect(this.page.getByText(/ticket updated successfully/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.dialog()).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectRequiredFields() {
    await this.dialog().getByRole('button', { name: /^create ticket$/i }).click();
    const required = this.dialog().getByText(/^required field$/i);
    await expect(required.first()).toBeVisible();
    expect(await required.count()).toBeGreaterThanOrEqual(3);
    await expect(this.dialog()).toBeVisible();
  }

  async fillTitle(value) {
    const input = this.dialog().getByPlaceholder(/^title$/i);
    await input.fill(value);
    return input;
  }

  async expectTitleMaxLength(expected = 200) {
    const input = this.dialog().getByPlaceholder(/^title$/i);
    const value = 'A'.repeat(expected);
    await input.fill(value);
    await input.press('End');
    await input.press('B');
    await expect(input).toHaveValue(value);
    this.lastTitle = value;
  }

  async cancelCreate() {
    const title = this.uniqueTitle('CS cancel');
    this.discardedTitle = title;
    await this.dialog().getByPlaceholder(/^title$/i).fill(title);
    await this.dialog().getByRole('button', { name: /^cancel$/i }).click();
    await expect(this.dialog()).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectPhoneRejected(value) {
    const phone = this.dialog().locator('#support-ticket-contact-phone');
    await phone.fill(value);
    await this.dialog().getByRole('button', { name: /^create ticket$/i }).click();
    await expect(this.dialog().getByText(/enter a valid phone number/i)).toBeVisible();
    await expect(this.dialog()).toBeVisible();
  }

  async expectPhoneTruncated(value, max = 30) {
    const phone = this.dialog().locator('#support-ticket-contact-phone');
    await phone.fill(value);
    const stored = await phone.inputValue();
    expect(stored.length).toBeLessThanOrEqual(max);
    expect(stored.length).toBe(Math.min(value.length, max));
  }

  async _ticketDateField(label) {
    const candidates = this.dialog()
      .locator('div')
      .filter({ has: this.page.getByText(new RegExp(`^${escapeRegExp(label)}$`, 'i')) })
      .filter({ has: this.page.getByRole('button', { name: /choose date/i }) });
    const count = await candidates.count();
    // Prefer the innermost block that has exactly one date button (not the Start+Completion row).
    for (let i = count - 1; i >= 0; i -= 1) {
      const candidate = candidates.nth(i);
      if ((await candidate.getByRole('button', { name: /choose date/i }).count()) === 1) {
        return candidate;
      }
    }
    return candidates.last();
  }

  async _setTicketDate(label, dayNumber) {
    const field = await this._ticketDateField(label);
    await expect(field).toBeVisible({ timeout: 10000 });
    await field.getByRole('button', { name: /choose date/i }).click();
    const calendar = this.page.locator('.MuiDateCalendar-root').last();
    await expect(calendar).toBeVisible({ timeout: 10000 });
    const day = calendar
      .locator('.MuiPickersDay-root:not(.Mui-disabled)')
      .filter({ hasText: new RegExp(`^${dayNumber}$`) })
      .first();
    await expect(day).toBeVisible({ timeout: 10000 });
    await day.click();
    await expect(calendar).toBeHidden({ timeout: 5000 }).catch(() => {});
    const value = await field.locator('input').first().inputValue();
    if (!String(value || '').trim()) {
      throw new Error(`Support ticket ${label} did not accept day ${dayNumber}`);
    }
    this.logStep(`Set ${label} to ${value}`);
    return value;
  }

  async _setTicketDateByIndex(index, dayNumber) {
    const openers = this.dialog().getByRole('button', { name: /choose date/i });
    await expect(openers.nth(index)).toBeVisible({ timeout: 10000 });
    await openers.nth(index).click();
    const calendar = this.page.locator('.MuiDateCalendar-root').last();
    await expect(calendar).toBeVisible({ timeout: 10000 });
    const day = calendar
      .locator('.MuiPickersDay-root:not(.Mui-disabled)')
      .filter({ hasText: new RegExp(`^${dayNumber}$`) })
      .first();
    await expect(day).toBeVisible({ timeout: 10000 });
    await day.click();
    await expect(calendar).toBeHidden({ timeout: 5000 }).catch(() => {});
    const input = openers.nth(index).locator('xpath=ancestor::*[.//input][1]').locator('input').first();
    const value = await input.inputValue().catch(() => '');
    this.logStep(`Set ticket date #${index} to day ${dayNumber}${value ? ` (${value})` : ''}`);
    return value;
  }

  async setCompletionBeforeStart() {
    this.logStep('Setting completion date before start date');
    // Index 0 = Start Date, 1 = Completion Date. Set completion first so minDate
    // cannot block the earlier day, then move start later.
    await this._setTicketDateByIndex(1, 1);
    await this._setTicketDateByIndex(0, 20);
  }

  async finishAndSaveOpenTicket() {
    await this._selectFirstLead();
    this.lastSummaryToken = `sum${Date.now().toString(36)}`;
    this.lastSummary = `Support summary ${this.lastSummaryToken}`;
    await this._fillSummary(this.lastSummary);
    if (this.lastTitle && !this.createdTitles.includes(this.lastTitle)) {
      this.createdTitles.push(this.lastTitle);
    }
    await this.submit();
  }

  async saveOpenInternalContact() {
    this.lastContactName = `Contact ${Date.now().toString(36)}`;
    this.lastPhone = '+1 (555) 010-1234';
    await this.dialog().locator('#support-ticket-contact-name').fill(this.lastContactName);
    await this.dialog().locator('#support-ticket-contact-phone').fill(this.lastPhone);
    await this.submit();
  }

  async submitExpectingCompletionBeforeStart() {
    const toast = this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: /completion date cannot be before the start date/i });
    // Listen for the toast before clicking. Client-side validation never fires CREATE,
    // and a long waitForResponse would outlive the toast auto-close.
    await Promise.all([
      expect(toast.first()).toBeVisible({ timeout: 15000 }),
      this.dialog().getByRole('button', { name: /^(create ticket|update)$/i }).click(),
    ]);
    await expect(this.dialog()).toBeVisible();
    await expect(this.page.getByText(/ticket created successfully/i)).toHaveCount(0);
  }

  async expectCompletionBeforeStart() {
    await this.submitExpectingCompletionBeforeStart();
  }

  async openTicket(title = this.lastTitle) {
    this.logStep(`Opening ticket "${title}"`);
    await this.ticketCard(title).click();
    await expect(this.dialog()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.dialog().getByPlaceholder(/^title$/i)).toHaveValue(title);
  }

  async editTitle(nextTitle) {
    const previous = this.lastTitle;
    await this.dialog().getByPlaceholder(/^title$/i).fill(nextTitle);
    this.lastTitle = nextTitle;
    this.createdTitles = this.createdTitles.filter((item) => item !== previous);
    if (!this.createdTitles.includes(nextTitle)) this.createdTitles.push(nextTitle);
  }

  async changeInlineStatus(title, statusName) {
    const card = this.ticketCard(title);
    await card.getByRole('button', { name: /^status$/i }).click();
    const menuItem = statusName
      ? this.page.getByRole('menuitem', { name: new RegExp(`^${escapeRegExp(statusName)}$`, 'i') }).first()
      : this.page.getByRole('menuitem').filter({ hasNotText: new RegExp(escapeRegExp(this.lastStatus), 'i') }).first();
    const chosen = ((await menuItem.innerText()) || '').trim();
    this.logStep(`Changing status to "${chosen}"`);
    await menuItem.click();
    await expect(card.getByRole('button', { name: /^status$/i })).toContainText(chosen, {
      timeout: this.defaultTimeout,
    });
    this.lastStatus = chosen;
  }

  async _pickAssignees(count) {
    const field = this.dialog().getByText(/^select assignee$/i).first();
    await field.click();
    const panel = this.page.locator('[id^="schedule-assignee-tabpanel"]').last();
    await expect(panel).toBeVisible({ timeout: 15000 });
    // Rows are clickable divs with a checkbox, not buttons or list items.
    const checks = panel.getByRole('checkbox');
    await expect(checks.first()).toBeVisible({ timeout: 15000 });
    const available = await checks.count();
    const take = Math.min(count, available);
    if (take < 1) throw new Error('No assignee users are available');
    this.selectedAssignees = [];
    for (let i = 0; i < take; i += 1) {
      const check = checks.nth(i);
      const row = check.locator('xpath=ancestor::div[.//p][1]');
      const lines = ((await row.innerText().catch(() => '')) || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 1);
      this.selectedAssignees.push(lines[0] || `user ${i + 1}`);
      await row.click();
    }
    // Escape closes the ticket dialog. Click the title so only the assignee popper closes.
    await this.dialog().getByText(/^(create ticket|edit ticket|view ticket)$/i).first().click();
    await expect(panel).toBeHidden({ timeout: 5000 });
    this.logStep(`Selected assignees: ${this.selectedAssignees.join(', ')}`);
  }

  async clearReporter() {
    const block = this.dialog().locator('div').filter({ has: this.page.getByText(/^reporter$/i) }).last();
    const remove = block.locator('.MuiChip-deleteIcon').first();
    await expect(remove).toBeVisible({ timeout: 10000 });
    await remove.click();
  }

  async openFilter() {
    await this.page.getByRole('button', { name: /^filter$/i }).first().click();
    await expect(this.filterPopover()).toBeVisible({ timeout: 10000 });
  }

  async _dismissListbox() {
    const listbox = this.page.getByRole('listbox');
    if (!(await listbox.isVisible().catch(() => false))) return;
    await this.page.keyboard.press('Escape').catch(() => {});
    if (!(await this.filterPopover().isVisible({ timeout: 1000 }).catch(() => false))) {
      await this.openFilter();
    }
  }

  async _chooseFilter(label, optionName) {
    const pop = this.filterPopover();
    await pop.getByLabel(new RegExp(`^${escapeRegExp(label)}$`, 'i')).click();
    const option = this.page.getByRole('option', { name: new RegExp(escapeRegExp(optionName), 'i') }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    // Close the option list so it cannot sit on top of Apply. Draft state stays in the page.
    await this._dismissListbox();
  }

  async applyFilter() {
    await this._dismissListbox();
    const apply = this.filterPopover().getByRole('button', { name: /^apply$/i });
    await expect(apply).toBeVisible({ timeout: 10000 });
    // Attach catch immediately so a missing refetch cannot reject while click() is still running.
    const pending = this._waitForTicketList(null, 20000).catch(() => null);
    await apply.click();
    await pending;
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async clearFilters() {
    if (!(await this.filterPopover().isVisible().catch(() => false))) {
      await this.openFilter();
    }
    const clear = this.filterPopover().getByRole('button', { name: /^clear$/i });
    await expect(clear).toBeVisible({ timeout: 10000 });
    const pending = this._waitForTicketList(null, 20000).catch(() => null);
    await clear.click();
    await pending;
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async filterByCreatedTicket() {
    await this.openFilter();
    if (this.lastStatus) await this._chooseFilter('Status', this.lastStatus);
    if (this.lastPriority) await this._chooseFilter('Priority', this.lastPriority);
    if (this.lastTag) await this._chooseFilter('Tags', this.lastTag);
    await this.applyFilter();
  }

  async filterByStatus(statusName) {
    await this.openFilter();
    await this._chooseFilter('Status', statusName);
    await this.applyFilter();
  }

  async filterByAssignee(name) {
    await this.openFilter();
    await this._chooseFilter('Assignee', name);
    await this.applyFilter();
  }

  async filterByReporter(name) {
    await this.openFilter();
    await this._chooseFilter('Reporter', name);
    await this.applyFilter();
  }

  async setSort(label) {
    await this.openFilter();
    await this._chooseFilter('Sort by', label);
    await expect(this.filterPopover().getByLabel(/^sort by$/i)).toHaveValue(new RegExp(escapeRegExp(label), 'i'));
    await this.applyFilter();
  }

  async _openCreatedBetween() {
    await this.openFilter();
    await this.filterPopover().getByLabel(/created between/i).click();
    await expect(this.page.locator('.MuiDateCalendar-root').first()).toBeVisible({ timeout: 10000 });
  }

  async applyCreatedBetweenToday() {
    this.logStep('Filtering created between today');
    await this._openCreatedBetween();
    const today = this.page.locator('.MuiPickersDay-today').first();
    await today.click();
    await today.click();
    const calendar = this.page.locator('.MuiPopover-paper').filter({ has: this.page.locator('.MuiDateCalendar-root') }).last();
    await calendar.getByRole('button', { name: /^apply$/i }).click();
    await this.applyFilter();
  }

  async applyCreatedBetweenPreviousMonth() {
    this.logStep('Filtering created between a previous-month day');
    await this._openCreatedBetween();
    await this.page.getByRole('button', { name: /previous month/i }).first().click();
    const day = this.page.locator('.MuiPickersDay-root').filter({ hasText: /^1$/ }).first();
    await day.click();
    await day.click();
    const calendar = this.page.locator('.MuiPopover-paper').filter({ has: this.page.locator('.MuiDateCalendar-root') }).last();
    await calendar.getByRole('button', { name: /^apply$/i }).click();
    await this.applyFilter();
  }

  async expectInvertedCreatedRangeNotApplied() {
    this.logStep('Checking an inverted created-between range is not committed');
    await this._openCreatedBetween();
    const later = this.page.locator('.MuiPickersDay-root').filter({ hasText: /^20$/ }).first();
    const earlier = this.page.locator('.MuiPickersDay-root').filter({ hasText: /^5$/ }).first();
    await later.click();
    await earlier.click();
    const value = await this.filterPopover().getByLabel(/created between/i).inputValue();
    if (value && value.includes('-')) {
      const [startText, endText] = value.split('-').map((part) => part.trim());
      const start = Date.parse(startText);
      const end = Date.parse(endText);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        expect(start).toBeLessThanOrEqual(end);
      }
    } else {
      expect(value || '').not.toMatch(/20.*5|5.*20/);
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async expectOrder(firstTitle, secondTitle) {
    await expect.poll(async () => {
      const text = await this.list().innerText();
      const firstAt = text.indexOf(firstTitle);
      const secondAt = text.indexOf(secondTitle);
      return firstAt >= 0 && secondAt > firstAt;
    }, { timeout: this.defaultTimeout }).toBe(true);
  }

  async showKanban() {
    const pending = this._waitForTicketList((post) => /"rowsPerPage"\s*:\s*200/.test(post), 30000);
    await this.page.getByRole('tab', { name: /^kanban$/i }).click();
    const response = await pending;
    const post = response.request().postData() || '';
    expect(post).toMatch(/"rowsPerPage"\s*:\s*200/);
    await expect(this.page.getByRole('tab', { name: /^kanban$/i })).toHaveAttribute('aria-selected', 'true');
    await expect(this.page.locator('[data-kanban-column-id]').first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async showList() {
    const pending = this._waitForTicketList((post) => /"rowsPerPage"\s*:\s*10/.test(post), 30000);
    await this.page.getByRole('tab', { name: /^list$/i }).click();
    await pending.catch(() => {});
    await expect(this.list()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectListPageSize() {
    this.logStep('Reloading the desk to confirm the list page size is 10');
    const pending = this._waitForTicketList((post) => /"rowsPerPage"\s*:\s*10/.test(post), 30000);
    await this.page.reload();
    const response = await pending;
    expect(response.request().postData() || '').toMatch(/"rowsPerPage"\s*:\s*10/);
  }

  async ensureMoreThanOnePage() {
    if (this.lastListTotal > 10) {
      this.logStep(`List already has ${this.lastListTotal} tickets`);
      return;
    }
    const missing = Math.max(1, 11 - this.lastListTotal);
    this.logStep(`Creating ${missing} tickets so the list can paginate`);
    for (let i = 0; i < missing; i += 1) {
      await this.openCreate();
      await this.fillLinkedTicket({ withTag: false, withAttachment: false });
      await this.submit();
      await this.expectCreated();
    }
  }

  async scrollForNextPage() {
    await this.ensureMoreThanOnePage();
    const title = this.lastTitle;
    const before = await this.page.getByRole('button', { name: /^status$/i }).count();
    const pending = this._waitForTicketList((post) => /"page"\s*:\s*2/.test(post), 30000);
    const scroller = this.list();
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await pending;
    await expect.poll(async () => this.page.getByRole('button', { name: /^status$/i }).count(), {
      timeout: this.defaultTimeout,
    }).toBeGreaterThan(before);
    if (title) {
      await expect(this.list().getByText(title, { exact: true })).toHaveCount(1);
    }
    this.logStep('Next ticket page loaded without duplicating the created title');
  }

  async expectListRequestFails() {
    await this.page.route('**/*', async (route) => {
      const post = route.request().postData() || '';
      if (post.includes('GET_CUSTOMER_SUPPORT_TICKETS')) {
        await route.abort();
        return;
      }
      await route.continue();
    });
    try {
      await this.page.reload();
      await expect(this.page.getByRole('alert').filter({ hasText: /something went wrong/i }).first()).toBeVisible({
        timeout: this.defaultTimeout,
      });
    } finally {
      await this.page.unroute('**/*').catch(() => {});
    }
  }

  async filterByDifferentStatus() {
    await this.clearFilters();
    await this.openFilter();
    await this.filterPopover().getByLabel(/^status$/i).click();
    const options = this.page.getByRole('option');
    const count = await options.count();
    let chosen = '';
    for (let i = 0; i < count; i += 1) {
      const text = ((await options.nth(i).innerText()) || '').split('\n')[0].trim();
      if (text && !/add new/i.test(text) && text.toLowerCase() !== this.lastStatus.toLowerCase()) {
        chosen = text;
        await options.nth(i).click();
        break;
      }
    }
    if (!chosen) throw new Error('No alternate ticket status is available to filter');
    await this.page.keyboard.press('Escape').catch(() => {});
    if (!(await this.filterPopover().isVisible({ timeout: 1000 }).catch(() => false))) {
      await this.openFilter();
    }
    await this.applyFilter();
    this.logStep(`Filtered by alternate status "${chosen}"`);
  }

  async createPairForSort() {
    this.sortPrefix = `cssort${Date.now().toString(36)}`;
    this.sortOlderTitle = `${this.sortPrefix} older`;
    this.sortNewerTitle = `${this.sortPrefix} newer`;
    for (const title of [this.sortOlderTitle, this.sortNewerTitle]) {
      await this.openCreate();
      await this.fillLinkedTicket({ title, withTag: false, withAttachment: false });
      await this.submit();
      await this.expectCreated();
    }
    await this.search(this.sortPrefix);
  }

  async expectSelectedTagsOnCard() {
    const card = this.ticketCard(this.lastTitle);
    const names = this.selectedTags || [];
    for (const name of names.slice(0, 3)) {
      await expect(card).toContainText(name);
    }
    if (names.length > 3) {
      await expect(card).toContainText(`+${names.length - 3}`);
    }
  }

  async expectInternalCard() {
    const card = this.ticketCard(this.lastTitle);
    await expect(card).toContainText(/internal/i);
    if (this.lastContactName) await expect(card).toContainText(this.lastContactName);
    if (this.lastPhone) await expect(card).toContainText(this.lastPhone);
  }

  async expectUnassigned() {
    await expect(this.ticketCard(this.lastTitle)).toContainText(/unassigned/i);
  }

  async removeOneAssigneeChip() {
    const block = this.dialog().locator('div').filter({ has: this.page.getByText(/^assignee$/i) }).last();
    await block.locator('.MuiChip-deleteIcon').first().click();
  }

  async deleteTicket(title, { confirm = true, timeout = this.defaultTimeout } = {}) {
    const card = this.ticketCard(title);
    await card.getByRole('button', { name: /^delete$/i }).click();
    const confirmDialog = this.page.getByRole('dialog').filter({ hasText: /delete ticket/i }).last();
    await expect(confirmDialog).toBeVisible({ timeout });
    await expect(confirmDialog).toContainText(title);
    if (!confirm) {
      await confirmDialog.getByRole('button', { name: /^cancel$/i }).click();
      await expect(confirmDialog).toBeHidden();
      await expect(card).toBeVisible();
      return;
    }
    await confirmDialog.getByRole('button', { name: /^delete$/i }).click();
    await expect(this.page.getByText(/ticket deleted successfully/i).first()).toBeVisible({
      timeout,
    });
    await expect(card).toHaveCount(0);
    this.createdTitles = this.createdTitles.filter((item) => item !== title);
  }

  async openProjectSupportTickets() {
    const button = this.page.getByRole('button', { name: /^support tickets$/i }).first();
    await expect(button).toBeVisible({ timeout: this.defaultTimeout });
    await button.click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: /support tickets/i }).last();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(dialog.locator('.MuiCircularProgress-root')).toHaveCount(0, {
      timeout: this.defaultTimeout,
    }).catch(() => {});
    await expect(dialog.getByText(this.lastTitle, { exact: true })).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async openTicketFromProjectDialog() {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /support tickets/i }).last();
    await dialog.getByText(this.lastTitle, { exact: true }).click();
    await expect(this.dialog().getByPlaceholder(/^title$/i)).toHaveValue(this.lastTitle);
  }

  async deleteCreatedTickets() {
    if (!this.createdTitles.length) return;
    this.logStep(`Cleaning up ${this.createdTitles.length} ticket(s)`);
    const titles = [...this.createdTitles];
    for (const title of titles) {
      try {
        if (!/\/customer-support/i.test(this.page.url() || '')) {
          await this.page.goto(urls.customerSupport);
          await this.page.waitForURL(/\/customer-support/i, { timeout: this.defaultTimeout });
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        const alreadyVisible = await this.ticketCard(title).isVisible({ timeout: 1500 }).catch(() => false);
        if (!alreadyVisible) await this.search(title);
        if (await this.ticketCard(title).isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.deleteTicket(title, { timeout: 15000 });
        }
      } catch (error) {
        this.logStep(`Cleanup skipped for "${title}": ${error.message}`);
      }
    }
  }
}

module.exports = CustomerSupportPage;
