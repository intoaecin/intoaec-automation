const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');
const urls = require('../../../../config/urls');

/**
 * CRM → Customer Support (Support Desk / Configuration).
 *
 * UI source: `intoaec-UI/src/features/customerSupport/`
 *
 * Layering per AGENTS.md:
 *   Feature: features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature
 *   Steps:   step-definitions/admin/crm/CustomerSupport/CustomerSupportStep.js
 *   Page:    this file
 */
class CustomerSupportPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.crmNav = page
      .getByRole('button', { name: /^crm$/i })
      .or(page.getByLabel(/^crm$/i))
      .first();
    this.customerSupportNav = page
      .getByRole('button', { name: /customer\s*support/i })
      .or(page.getByRole('link', { name: /customer\s*support/i }))
      .or(page.getByRole('menuitem', { name: /customer\s*support/i }))
      .or(page.getByText(/^customer support$/i))
      .first();

    this.supportDeskTitle = page
      .getByRole('heading', { name: /^support desk$/i })
      .or(page.locator('.MuiTypography-h6, h6').filter({ hasText: /^support desk$/i }))
      .or(page.getByText(/^support desk$/i))
      .first();

    this.featureSidebar = page
      .locator('nav, aside, [class*="FeatureSidebar"], [class*="feature-sidebar"]')
      .filter({ hasText: /support desk|ticket statuses/i })
      .first()
      .or(page.getByText(/^support desk$/i).first());

    this.listViewTab = page.getByRole('tab', { name: /^list$/i }).first();
    this.kanbanViewTab = page.getByRole('tab', { name: /^kanban$/i }).first();

    this.createTicketButton = page.getByRole('button', { name: /create ticket/i }).first();
    this.filterButton = page
      .getByRole('button', { name: /^filter$/i })
      .first();

    // Create / Edit / View (read-only) all reuse the same offcanvas.
    this.createOffcanvas = page
      .getByRole('dialog')
      .filter({ hasText: /create ticket|edit ticket|view ticket/i })
      .last();
    this.linkedSwitch = this.createOffcanvas.getByLabel(/^linked$/i).first();
    this.contactNameField = this.createOffcanvas.getByLabel(/contact name/i).first();
    this.contactPhoneField = this.createOffcanvas.getByLabel(/phone number/i).first();
    this.invalidPhoneMessage = this.createOffcanvas.getByText(/enter a valid phone number/i).first();
    this.offcanvasCreateButton = this.createOffcanvas
      .getByRole('button', { name: /^create ticket$/i })
      .last();
    this.offcanvasUpdateButton = this.createOffcanvas.getByRole('button', { name: /^update$/i }).last();
    this.offcanvasCloseButton = this.createOffcanvas
      .getByRole('button', { name: /^(close|cancel)$/i })
      .last();
    this.assigneeReporterHelpButton = this.createOffcanvas
      .getByRole('button', { name: /how assignees and reporter work/i })
      .first();

    this.searchRegion = page.getByRole('search', { name: /search tickets/i }).first();
    this.searchInput = page.getByRole('textbox', { name: /search tickets/i }).first();
    this.emptyFilteredMessage = page.getByText(/no tickets match your search or filters/i).first();
    this.syncSheetsButton = page.getByRole('button', { name: /sync sheets/i }).first();

    this.ticketTitleField = this.createOffcanvas
      .getByRole('textbox', { name: /title/i })
      .or(this.createOffcanvas.getByPlaceholder(/^title$/i))
      .first();
    this.leadField = this.createOffcanvas
      .getByRole('combobox', { name: /lead|client/i })
      .or(this.createOffcanvas.getByPlaceholder(/search lead or client/i))
      .first();
    // BasicTextEditor is role=textbox with aria-label "Summary" (FormLabel is "Summary *").
    this.summaryField = this.createOffcanvas
      .getByRole('textbox', { name: /summary/i })
      .or(this.createOffcanvas.locator('[contenteditable="true"][data-placeholder*="Summary" i]'))
      .or(this.createOffcanvas.getByText(/summary\s*\*?/i))
      .first();

    this.ticketStatusesNav = page
      .getByRole('button', { name: /^ticket statuses$/i })
      .or(page.getByText(/^ticket statuses$/i))
      .first();

    this.ticketStatusesTitle = page
      .getByRole('heading', { name: /^ticket statuses$/i })
      .or(page.locator('.MuiTypography-h6, h6').filter({ hasText: /^ticket statuses$/i }))
      .or(page.getByText(/^ticket statuses$/i))
      .first();
  }

  logStep(msg) {
    console.log(`[CustomerSupport] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  isOnModule() {
    return urls.isCustomerSupport(this.page.url()) || /customer-support/i.test(this.page.url());
  }

  async waitForModuleToLoad() {
    await expect(async () => {
      expect(this.isOnModule(), 'Expected Customer Support pathname').toBeTruthy();
      const desk = await this.supportDeskTitle.isVisible({ timeout: 1500 }).catch(() => false);
      const sidebar = await this.featureSidebar.isVisible({ timeout: 1500 }).catch(() => false);
      const createBtn = await this.createTicketButton.isVisible({ timeout: 1500 }).catch(() => false);
      const statuses = await this.ticketStatusesTitle.isVisible({ timeout: 1500 }).catch(() => false);
      expect(desk || sidebar || createBtn || statuses).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1500, 3000] });
    await this.waitForNetworkSettled();
    this.logStep('Customer Support module loaded');
  }

  async navigateToCustomerSupport() {
    if (this.isOnModule() && (await this.supportDeskTitle.isVisible({ timeout: 3000 }).catch(() => false))) {
      this.logStep('Already on Customer Support');
      return;
    }

    await this.page
      .goto(urls.customerSupport, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
      .catch(() => {});
    await this.waitForNetworkSettled();

    if (!this.isOnModule() || !(await this.supportDeskTitle.isVisible({ timeout: 5000 }).catch(() => false))) {
      const navVisible = await this.customerSupportNav.isVisible({ timeout: 3000 }).catch(() => false);
      if (!navVisible) {
        if (await this.crmNav.isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.crmNav.click({ timeout: this.uiTimeout });
          await this.waitForNetworkSettled();
        }
      }
      if (await this.customerSupportNav.isVisible({ timeout: 8000 }).catch(() => false)) {
        await this.customerSupportNav.click({ timeout: this.uiTimeout });
        await this.page
          .waitForURL(/customer-support/i, { timeout: this.defaultTimeout })
          .catch(() => {});
        await this.waitForNetworkSettled();
      }
    }

    await this.waitForModuleToLoad();
    this.logStep(`Navigated to Customer Support (${this.page.url()})`);
  }

  async expectSupportDeskLoaded() {
    await expect(this.supportDeskTitle).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Support Desk page title is visible');
  }

  async switchToListView() {
    await expect(this.listViewTab).toBeVisible({ timeout: this.defaultTimeout });
    const selected = (await this.listViewTab.getAttribute('aria-selected').catch(() => '')) === 'true';
    if (!selected) {
      await this.listViewTab.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
    }
    this.logStep('Switched to List view');
  }

  async switchToKanbanView() {
    await expect(this.kanbanViewTab).toBeVisible({ timeout: this.defaultTimeout });
    const selected = (await this.kanbanViewTab.getAttribute('aria-selected').catch(() => '')) === 'true';
    if (!selected) {
      await this.kanbanViewTab.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
    }
    this.logStep('Switched to Kanban view');
  }

  async openCreateOffcanvas() {
    await expect(this.createTicketButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.createTicketButton.click({ timeout: this.uiTimeout });
    await expect(this.createOffcanvas).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Create Ticket offcanvas');
  }

  async expectCreateOffcanvasFields() {
    await expect(this.createOffcanvas).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.ticketTitleField).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.leadField).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.summaryField).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Create Ticket offcanvas shows Title, Lead, and Summary fields');
  }

  async openFilter() {
    await expect(this.filterButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.filterButton.click({ timeout: this.uiTimeout });
    const filterPanel = this.page
      .locator('.MuiPopover-paper, [role="presentation"]')
      .filter({ hasText: /status|priority|apply/i })
      .last();
    await expect(filterPanel).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened Filter menu');
  }

  async openStatusesTab() {
    await expect(this.ticketStatusesNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.ticketStatusesNav.click({ timeout: this.uiTimeout });
    await this.page
      .waitForURL(/tab=statuses/i, { timeout: this.defaultTimeout })
      .catch(() => {});
    await this.waitForNetworkSettled();
    await this.expectTicketStatusesVisible();
    this.logStep('Opened Ticket Statuses customize tab');
  }

  async expectTicketStatusesVisible() {
    await expect(this.ticketStatusesTitle).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Ticket Statuses page is visible');
  }

  // ── Ticket create / contact ───────────────────────────────────────────────

  offcanvas() {
    return this.createOffcanvas;
  }

  async fillTicketTitle(title) {
    await expect(this.ticketTitleField).toBeVisible({ timeout: this.uiTimeout });
    await this.ticketTitleField.fill(title);
    this.logStep(`Filled title "${title}"`);
  }

  async fillTicketSummary(text) {
    const editor = this.createOffcanvas.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: this.uiTimeout });
    await editor.click();
    await this.page.keyboard.type(text);
    this.logStep('Filled summary');
  }

  async setLinked(linked) {
    await expect(this.linkedSwitch).toBeVisible({ timeout: this.uiTimeout });
    const checked = await this.linkedSwitch.isChecked();
    if (checked !== linked) {
      await this.linkedSwitch.click({ timeout: this.uiTimeout });
    }
    await expect(this.linkedSwitch).toBeChecked({ checked: linked, timeout: this.uiTimeout });
    this.logStep(`Linked toggle ${linked ? 'ON' : 'OFF'}`);
  }

  async expectInternalContactFields(visible = true) {
    if (visible) {
      await expect(this.contactNameField).toBeVisible({ timeout: this.uiTimeout });
      await expect(this.contactPhoneField).toBeVisible({ timeout: this.uiTimeout });
      // Lead / Client is the first combobox; when unlinked it is disabled and reads "Internal".
      const leadCombobox = this.createOffcanvas.getByRole('combobox').first();
      await expect(leadCombobox).toHaveValue(/internal/i, { timeout: this.uiTimeout });
      await expect(leadCombobox).toBeDisabled();
    } else {
      await expect(this.contactNameField).toBeHidden({ timeout: this.uiTimeout });
      await expect(this.contactPhoneField).toBeHidden({ timeout: this.uiTimeout });
    }
    this.logStep(`Internal contact fields ${visible ? 'visible' : 'hidden'}`);
  }

  async fillInternalContact(name, phone) {
    await this.contactNameField.fill(name);
    await this.contactPhoneField.fill(phone);
    this.logStep(`Filled contact "${name}" / "${phone}"`);
  }

  /** Waits for the next ticket list request and returns its JSON body. */
  waitForTicketListRequest(predicate = () => true) {
    return this.page
      .waitForRequest(
        (req) => {
          if (req.method() !== 'POST' || !/customer-support-tickets/i.test(req.url())) return false;
          try {
            const body = req.postDataJSON();
            return body?.eventType === 'GET_CUSTOMER_SUPPORT_TICKETS' && predicate(body);
          } catch {
            return false;
          }
        },
        { timeout: this.defaultTimeout },
      )
      .then((req) => req.postDataJSON());
  }

  async submitCreateTicket() {
    const created = this.page.waitForResponse(
      (res) =>
        /customer-support-tickets/i.test(res.url()) &&
        res.request().method() === 'POST' &&
        /CREATE_CUSTOMER_SUPPORT_TICKET/.test(res.request().postData() || ''),
      { timeout: this.defaultTimeout },
    );
    await this.offcanvasCreateButton.click({ timeout: this.uiTimeout });
    const res = await created;
    expect(res.status(), 'create ticket API status').toBe(200);
    await expect(this.createOffcanvas).toBeHidden({ timeout: this.defaultTimeout });
    this.logStep('Ticket created');
    return res.request().postDataJSON();
  }

  async attemptSubmitCreateTicket() {
    await this.offcanvasCreateButton.click({ timeout: this.uiTimeout });
  }

  async expectInvalidPhoneError() {
    await expect(this.invalidPhoneMessage).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.createOffcanvas).toBeVisible();
    this.logStep('Invalid phone validation shown; ticket not submitted');
  }

  async closeOffcanvas() {
    if (await this.createOffcanvas.isVisible().catch(() => false)) {
      await this.offcanvasCloseButton.click({ timeout: this.uiTimeout });
      await expect(this.createOffcanvas).toBeHidden({ timeout: this.uiTimeout });
    }
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  /** Innermost element that holds both the ticket title and its "Created on" line. */
  ticketCard(title) {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(title, { exact: true }) })
      .filter({ hasText: /created on/i })
      .last();
  }

  async expectTicketCard(title) {
    await expect(this.ticketCard(title)).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Ticket card "${title}" visible`);
  }

  async expectTicketCardHidden(title) {
    await expect(this.page.getByText(title, { exact: true })).toHaveCount(0, {
      timeout: this.defaultTimeout,
    });
    this.logStep(`Ticket card "${title}" not shown`);
  }

  async expectInternalCardContact(title, name, phone) {
    const card = this.ticketCard(title);
    await expect(card).toContainText(/internal/i, { timeout: this.uiTimeout });
    await expect(card).toContainText(name);
    await expect(card).toContainText(phone);
    this.logStep('Card shows Internal with contact name and phone');
  }

  async expectCreatedOnLabelOnly(title) {
    const card = this.ticketCard(title);
    await expect(card).toContainText(/created on/i, { timeout: this.uiTimeout });
    await expect(card).not.toContainText(/updated:/i);
    await expect(card).not.toContainText(/raised:/i);
    this.logStep('Card shows "Created on" and no Raised/Updated text');
  }

  async openTicketCard(title) {
    await this.ticketCard(title).getByText(title, { exact: true }).click({ timeout: this.uiTimeout });
    await expect(this.createOffcanvas).toBeVisible({ timeout: this.defaultTimeout });
  }

  async editTicketTitle(oldTitle, newTitle) {
    await this.openTicketCard(oldTitle);
    await this.fillTicketTitle(newTitle);
    const updated = this.page.waitForResponse(
      (res) =>
        /customer-support-tickets/i.test(res.url()) &&
        /UPDATE_CUSTOMER_SUPPORT_TICKET/.test(res.request().postData() || ''),
      { timeout: this.defaultTimeout },
    );
    await this.offcanvasUpdateButton.click({ timeout: this.uiTimeout });
    expect((await updated).status(), 'update ticket API status').toBe(200);
    await expect(this.createOffcanvas).toBeHidden({ timeout: this.defaultTimeout });
    this.logStep(`Renamed ticket to "${newTitle}"`);
  }

  async deleteTicket(title) {
    const card = this.ticketCard(title);
    await card.getByRole('button', { name: /^delete$/i }).click({ timeout: this.uiTimeout });
    const dialog = this.page.getByRole('dialog').filter({ hasText: /delete ticket/i }).last();
    await expect(dialog).toBeVisible({ timeout: this.uiTimeout });
    await dialog.getByRole('button', { name: /^delete$/i }).click({ timeout: this.uiTimeout });
    await expect(this.page.getByText(/ticket deleted successfully/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.logStep(`Deleted ticket "${title}"`);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async searchTickets(term) {
    if (!(await this.searchInput.isVisible().catch(() => false))) {
      await this.searchRegion.getByRole('button').first().click({ timeout: this.uiTimeout });
    }
    await expect(this.searchInput).toBeVisible({ timeout: this.uiTimeout });
    const request = this.waitForTicketListRequest((body) => body.search === term.trim());
    await this.searchInput.fill(term);
    const body = await request;
    await this.waitForNetworkSettled();
    this.logStep(`Searched tickets for "${term}"`);
    return body;
  }

  async clearSearch() {
    if (await this.searchInput.isVisible().catch(() => false)) {
      await this.searchInput.fill('');
      await this.waitForNetworkSettled();
    }
  }

  async expectNoTicketsMatch() {
    await expect(this.emptyFilteredMessage).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Empty filtered state shown');
  }

  // ── Filters: sort + created range ─────────────────────────────────────────

  filterPanel() {
    return this.page
      .locator('.MuiPopover-paper')
      .filter({ hasText: /sort by|status|priority/i })
      .last();
  }

  async applyFilters(predicate) {
    const request = this.waitForTicketListRequest(predicate);
    await this.filterPanel().getByRole('button', { name: /^apply$/i }).click({ timeout: this.uiTimeout });
    const body = await request;
    await this.waitForNetworkSettled();
    return body;
  }

  async selectSortOrder(label) {
    const panel = this.filterPanel();
    await panel.getByRole('combobox', { name: /sort by/i }).first().click({ timeout: this.uiTimeout });
    await this.page.getByRole('option', { name: new RegExp(`^${label}$`, 'i') }).click({
      timeout: this.uiTimeout,
    });
    this.logStep(`Sort by "${label}"`);
  }

  /** Reads the serial numbers of the list cards in on-screen order. */
  async visibleTicketSerials() {
    const serials = await this.page.getByText(/^CS\d+$/).allInnerTexts();
    return serials.map((s) => s.trim());
  }

  /** Picks a whole-day range in the "Created between" picker. `which`: today | past. */
  async selectCreatedRange(which) {
    const panel = this.filterPanel();
    await panel.getByLabel(/created between/i).first().click({ timeout: this.uiTimeout });
    const popover = this.page.locator('#date-range-popover').last();
    await expect(popover).toBeVisible({ timeout: this.uiTimeout });
    const calendar = popover.locator('.MuiDateCalendar-root').first();

    let day;
    if (which === 'today') {
      day = calendar.locator('.MuiPickersDay-today, [aria-current="date"]').first();
    } else {
      // Day 1 of this month, or of last month when today is the 1st.
      const todayText = (await calendar.locator('.MuiPickersDay-today, [aria-current="date"]').first().innerText()).trim();
      if (todayText === '1') {
        await calendar.getByRole('button', { name: /previous month/i }).click();
      }
      day = calendar.getByRole('gridcell', { name: /^1$/ }).first();
    }
    await day.click({ timeout: this.uiTimeout });
    await day.click({ timeout: this.uiTimeout });
    await popover.getByRole('button', { name: /^apply$/i }).click({ timeout: this.uiTimeout });
    await expect(popover).toBeHidden({ timeout: this.uiTimeout }).catch(() => {});
    this.logStep(`Created between: ${which}`);
  }

  async clearAllFilters() {
    if (!(await this.filterPanel().isVisible().catch(() => false))) {
      await this.openFilter();
    }
    await this.filterPanel().getByRole('button', { name: /^clear/i }).first().click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    await this.page.keyboard.press('Escape').catch(() => {});
    this.logStep('Cleared filters');
  }

  // ── Help + permissions ────────────────────────────────────────────────────

  async openAssigneeReporterHelp() {
    await expect(this.assigneeReporterHelpButton).toBeVisible({ timeout: this.uiTimeout });
    await this.assigneeReporterHelpButton.click({ timeout: this.uiTimeout });
    const popover = this.page.locator('.MuiPopover-paper').filter({ hasText: /assignees & reporter/i }).last();
    await expect(popover).toBeVisible({ timeout: this.uiTimeout });
    await expect(popover).toContainText(/reporter/i);
    await expect(popover).toContainText(/automation/i);
    await this.page.keyboard.press('Escape');
    this.logStep('Assignee/reporter help explains both roles');
  }

  async expectViewerRestrictions() {
    await expect(this.createTicketButton).toBeHidden({ timeout: this.uiTimeout });
    await expect(this.syncSheetsButton).toBeHidden({ timeout: this.uiTimeout });
    await expect(this.page.getByRole('button', { name: /^delete$/i })).toHaveCount(0);
    this.logStep('No Create / Sync Sheets / Delete actions');
  }

  async expectCreatorRestrictions() {
    await expect(this.createTicketButton).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.page.getByRole('button', { name: /^delete$/i })).toHaveCount(0);
    this.logStep('Create visible, Delete hidden');
  }

  /** Opens the first ticket card and checks the read-only View Ticket offcanvas. */
  async expectFirstTicketOpensReadOnly() {
    const firstSerial = this.page.getByText(/^CS\d+$/).first();
    await expect(firstSerial).toBeVisible({ timeout: this.defaultTimeout });
    await firstSerial.click({ timeout: this.uiTimeout });
    await expect(this.createOffcanvas).toContainText(/view ticket/i, { timeout: this.uiTimeout });
    await expect(this.ticketTitleField).toBeDisabled();
    await expect(this.offcanvasUpdateButton).toHaveCount(0);
    await expect(this.offcanvasCreateButton).toHaveCount(0);
    await this.closeOffcanvas();
    this.logStep('Existing ticket opens read-only');
  }
}

module.exports = CustomerSupportPage;
