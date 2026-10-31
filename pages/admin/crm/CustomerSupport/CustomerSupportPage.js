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

    this.createOffcanvas = page
      .getByRole('dialog')
      .filter({ hasText: /create ticket|edit ticket/i })
      .last();

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
}

module.exports = CustomerSupportPage;
