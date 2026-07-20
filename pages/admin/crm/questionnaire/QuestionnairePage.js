const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');

class QuestionnairePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    this.crmMenuButton = page.locator('button').filter({ hasText: 'CRM' }).first();
    this.leadManagerButton = page.getByLabel('Lead Manager').getByRole('button', { name: 'Lead Manager' });
    this.leadRows = page.locator('tbody tr');
    this.selectFeatureInput = page.getByRole('textbox', { name: /select feature\(s\)/i });
    this.questionnaireFeatureOption = page.getByRole('menuitem').getByText('Questionnaire').first();
    this.clientFeatureMenu = page.locator(
      '[role="menu"], [role="listbox"], .MuiMenu-list, .MuiAutocomplete-listbox, .MuiPopover-root .MuiList-root'
    );
    this.clientMenuPanel = page.locator(
      'nav, aside, .MuiDrawer-root, .MuiTabs-root, [class*="sidebar"], [class*="feature"]'
    );

    this.questionnaireTab = page.getByRole('tab', { name: /^questionnaire$/i });
    this.questionnaireOverviewLink = page
      .locator('[id*="Overview"], .MuiTabPanel-root, div.MuiBox-root')
      .getByText(/^questionnaire$/i)
      .first();
    this.chooseQuestionnaireButton = page.getByRole('button', { name: /^choose questionnaire$/i });
    this.chooseQuestionnaireDialog = page
      .getByRole('dialog')
      .filter({ hasText: /choose questionnaire/i })
      .last();
    this.confirmButton = page.getByRole('button', { name: /^confirm$/i });
    this.sendViaButton = page.getByRole('button', { name: /send via/i });
    this.emailOption = page.getByRole('menuitem', { name: /^email$/i });
    this.composeEmailHeader = page.getByText(/compose email/i).first();
    this.sendEmailButton = page.getByRole('button', { name: /^send email$/i });
    this.successToast = page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({ hasText: /questionnaire sent successfully/i })
      .or(page.getByText(/questionnaire sent successfully/i))
      .first();
    this.sentViaEmailTab = page.getByRole('tab', { name: /^sent via email$/i });
    this.sentViaTab = this.sentViaEmailTab;
    this.sentViaEmailDropdown = page.getByRole('button', { name: /sent via email/i });
    this.emailDetails = page.getByText(/email details|sent via email|to:|subject:|recipient/i).first();
  }

  resolveLeadName() {
    const fromEnv = process.env.LEAD_NAME || process.env.TEST_LEAD_NAME;
    return fromEnv ? String(fromEnv).trim() : '';
  }

  resolveQuestionnaireName() {
    const fromEnv = process.env.QUESTIONNAIRE_TEMPLATE_NAME;
    return fromEnv ? String(fromEnv).trim() : '';
  }

  getChooseQuestionnaireTemplateDropdown() {
    const dialog = this.getChooseQuestionnaireDialog();
    return dialog
      .getByRole('combobox', { name: /choose questionnaire\s*\*?/i })
      .or(dialog.getByRole('combobox').nth(1))
      .first();
  }

  getQuestionnaireCategoryDropdown() {
    const dialog = this.getChooseQuestionnaireDialog();
    return dialog
      .getByRole('combobox', { name: /questionnaire category\s*\*?/i })
      .or(dialog.getByRole('combobox').first())
      .first();
  }

  async selectQuestionnaireCategory(category = 'Default') {
    const dialog = this.getChooseQuestionnaireDialog();
    const categoryDropdown = this.getQuestionnaireCategoryDropdown();

    await expect(categoryDropdown).toBeVisible({ timeout: this.defaultTimeout });
    const selectedCategory = (await categoryDropdown.innerText().catch(() => '')).trim();
    if (selectedCategory.toLowerCase() === category.toLowerCase()) {
      console.log(`[QuestionnairePage] Questionnaire category already selected: ${category}`);
      return;
    }

    console.log(`[QuestionnairePage] Selecting questionnaire category: ${category}`);
    await categoryDropdown.click();

    const categoryOption = this.page.getByRole('option', { name: category, exact: true }).last();
    await expect(categoryOption).toBeVisible({ timeout: this.defaultTimeout });
    await categoryOption.click();
    await expect(dialog.getByText(category, { exact: true }).first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  getVisibleQuestionnaireTemplateOptions() {
    return this.page
      .locator(
        'ul.MuiMenu-list[role="listbox"] > li[role="option"], .MuiPopover-root [role="listbox"] [role="option"]'
      )
      .or(this.page.getByRole('option'))
      .filter({ visible: true });
  }

  async openQuestionnaireTemplateDropdown() {
    const dialog = this.getChooseQuestionnaireDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });

    const templateDropdown = this.getChooseQuestionnaireTemplateDropdown();
    await expect(templateDropdown).toBeVisible({ timeout: this.defaultTimeout });
    await templateDropdown.scrollIntoViewIfNeeded().catch(() => {});
    await templateDropdown.click();

    const options = this.getVisibleQuestionnaireTemplateOptions();
    if ((await options.count()) === 0) {
      await templateDropdown.click({ force: true }).catch(() => {});
      await this.page.keyboard.press('ArrowDown').catch(() => {});
    }

    await expect(async () => {
      const optionCount = await this.getVisibleQuestionnaireTemplateOptions().count();
      expect(optionCount).toBeGreaterThan(0);
    }).toPass({ timeout: 30000, intervals: [250, 500, 1000] });

    console.log('[QuestionnairePage] Questionnaire template dropdown opened');
  }

  async resolveQuestionnaireTemplateOption(questionnaireName = this.resolveQuestionnaireName()) {
    const options = this.getVisibleQuestionnaireTemplateOptions();
    await expect(options.first()).toBeVisible({ timeout: 30000 });

    if (questionnaireName) {
      const exactOption = options.filter({ hasText: new RegExp(`^\\s*${this.escapeRegex(questionnaireName)}\\s*$`, 'i') });
      if ((await exactOption.count()) > 0) {
        const option = exactOption.first();
        return { option, name: (await option.innerText()).trim() };
      }

      const partialOption = options.filter({ hasText: questionnaireName }).first();
      if (await partialOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        const name = (await partialOption.innerText()).trim();
        return { option: partialOption, name };
      }

      console.warn(
        `[QuestionnairePage] Template "${questionnaireName}" not found in dropdown; selecting first available option`
      );
    }

    const firstOption = options.first();
    const name = (await firstOption.innerText()).trim();
    return { option: firstOption, name };
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getLeadCellByName(leadName) {
    return this.page.getByRole('cell', { name: leadName }).first();
  }

  async findFirstAvailableLead() {
    console.log('[QuestionnairePage] Finding first available lead in Lead Manager');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const firstRow = this.leadRows.first();
    await expect(firstRow).toBeVisible({ timeout: this.defaultTimeout });

    const nameCell = firstRow.getByRole('cell').nth(1);
    await expect(nameCell).toBeVisible({ timeout: this.defaultTimeout });

    const name = (await nameCell.innerText()).trim();
    if (!name) {
      throw new Error('[QuestionnairePage] First lead name cell is empty.');
    }

    return { cell: nameCell, name };
  }

  async openFirstAvailableLead() {
    const { cell, name } = await this.findFirstAvailableLead();
    this.selectedLeadName = name;
    console.log(`[QuestionnairePage] Opening first available lead: ${name}`);
    await cell.scrollIntoViewIfNeeded().catch(() => {});
    await cell.click({ timeout: 15000 });
    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async openLeadByName(leadName) {
    console.log(`[QuestionnairePage] Opening lead profile by name: ${leadName}`);
    const leadCell = this.getLeadCellByName(leadName);
    await expect(leadCell).toBeVisible({ timeout: this.defaultTimeout });
    await leadCell.scrollIntoViewIfNeeded().catch(() => {});
    await leadCell.click({ timeout: 15000 });
    this.selectedLeadName = leadName;
    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async openLead() {
    const leadName = this.resolveLeadName();
    if (leadName) {
      await this.openLeadByName(leadName);
      return;
    }
    await this.openFirstAvailableLead();
  }

  async openCrmMenu() {
    console.log('[QuestionnairePage] Opening CRM menu');
    await expect(this.crmMenuButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.crmMenuButton.click();
  }

  async openLeadManager() {
    console.log('[QuestionnairePage] Opening Lead Manager');
    await expect(this.leadManagerButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.leadManagerButton.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForURL(/leadmanager\/master/i, { timeout: this.defaultTimeout }).catch(() => {});
  }

  async navigateToLeadProfileIfNeeded() {
    if (/leadmanager\/profile/i.test(this.page.url())) {
      console.log('[QuestionnairePage] Lead profile already open');
      await this.waitForLeadProfileReady().catch(() => {});
      return;
    }

    console.log('[QuestionnairePage] Navigating to lead profile');
    await this.openCrmMenu();
    await this.openLeadManager();
    await this.openLead();
    await this.waitForLeadProfileReady();
  }

  resolveQuestionnaireFeatureSearchTerm() {
    return process.env.QUESTIONNAIRE_FEATURE_SEARCH || 'ques';
  }

  getQuestionnaireMenuItem() {
    return this.page.getByRole('menuitem').getByText('Questionnaire').first();
  }

  async ensureQuestionnaireModuleLoaded() {
    console.log('[QuestionnairePage] Waiting for Questionnaire module to load');
    await expect(this.chooseQuestionnaireButton.or(this.sendViaButton)).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  getChooseQuestionnaireDialog() {
    return this.chooseQuestionnaireDialog;
  }

  getChooseQuestionnaireDialogConfirmButton() {
    return this.getChooseQuestionnaireDialog()
      .locator('.MuiDialogActions-root')
      .getByRole('button', { name: /^confirm$/i })
      .first();
  }

  getChooseQuestionnaireDialogPreviewButton() {
    return this.getChooseQuestionnaireDialog()
      .locator('.MuiDialogActions-root')
      .getByRole('button', { name: /^preview$/i })
      .first();
  }

  async openChooseQuestionnaireDialog() {
    console.log('[QuestionnairePage] Opening Choose Questionnaire dialog');
    await this.ensureQuestionnaireModuleLoaded();

    if (await this.getChooseQuestionnaireDialog().isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[QuestionnairePage] Choose Questionnaire dialog already open');
      return;
    }

    await expect(this.chooseQuestionnaireButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.chooseQuestionnaireButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.chooseQuestionnaireButton.click({ timeout: 15000 });

    await expect(this.getChooseQuestionnaireDialog()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async selectQuestionnaireTemplateInDialog(questionnaireName = this.resolveQuestionnaireName()) {
    const requestedName = questionnaireName || '(first available)';
    console.log(`[QuestionnairePage] Selecting questionnaire template in dialog: ${requestedName}`);
    await this.selectQuestionnaireCategory('Default');
    await this.openQuestionnaireTemplateDropdown();

    const { option, name } = await this.resolveQuestionnaireTemplateOption(questionnaireName);
    await option.scrollIntoViewIfNeeded().catch(() => {});
    await option.click();

    this.selectedQuestionnaireName = name;
    console.log(`[QuestionnairePage] Selected questionnaire template: ${name}`);

    await expect(this.getChooseQuestionnaireDialogConfirmButton()).toBeEnabled({ timeout: 15000 });
  }

  async confirmChooseQuestionnaireDialog() {
    console.log('[QuestionnairePage] Confirming Choose Questionnaire dialog');
    const confirmButton = this.getChooseQuestionnaireDialogConfirmButton();
    await expect(confirmButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(confirmButton).toBeEnabled({ timeout: this.defaultTimeout });
    await confirmButton.click();

    await expect(this.getChooseQuestionnaireDialog()).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async openQuestionnaireViaFeatureSelector() {
    const searchTerm = this.resolveQuestionnaireFeatureSearchTerm();
    console.log(`[QuestionnairePage] Opening Questionnaire via Select Feature(s) search: ${searchTerm}`);

    const firstFeatureInput = this.selectFeatureInput.first();
    await expect(firstFeatureInput).toBeVisible({ timeout: this.defaultTimeout });
    await firstFeatureInput.click();

    const filterInput = this.selectFeatureInput.nth(1);
    await expect(filterInput).toBeVisible({ timeout: this.defaultTimeout });
    await filterInput.click();
    await filterInput.fill(searchTerm);

    const questionnaireMenuItem = this.getQuestionnaireMenuItem();
    await expect(questionnaireMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await questionnaireMenuItem.scrollIntoViewIfNeeded().catch(() => {});
    await questionnaireMenuItem.click({ timeout: 15000 });

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.ensureQuestionnaireModuleLoaded();
  }

  async waitForLeadProfileReady() {
    console.log('[QuestionnairePage] Waiting for lead profile to be ready');
    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    await expect(async () => {
      const featureInputVisible = await this.selectFeatureInput.first().isVisible().catch(() => false);
      const featureLabelVisible = await this.page.getByText(/select feature\(s\)/i).first().isVisible().catch(() => false);
      const tabVisible = await this.questionnaireTab.isVisible().catch(() => false);
      const chooseVisible = await this.chooseQuestionnaireButton.isVisible().catch(() => false);
      expect(featureInputVisible || featureLabelVisible || tabVisible || chooseVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async isQuestionnairePresentInClientMenu() {
    const menuItemVisible = await this.getQuestionnaireMenuItem().isVisible().catch(() => false);
    const namedMenuItem = await this.page.getByRole('menuitem', { name: /questionnaire/i }).first().isVisible().catch(() => false);
    const textVisible = await this.page.getByText(/^questionnaire$/i).first().isVisible().catch(() => false);
    const tabVisible = await this.questionnaireTab.isVisible().catch(() => false);
    const chooseVisible = await this.chooseQuestionnaireButton.isVisible().catch(() => false);
    return menuItemVisible || namedMenuItem || textVisible || tabVisible || chooseVisible;
  }

  async scrollClientMenuForQuestionnaire() {
    console.log('[QuestionnairePage] Scrolling client menu to find Questionnaire');
    const scrollTargets = [this.clientFeatureMenu.filter({ visible: true }).first(), this.clientMenuPanel.first()];

    for (const target of scrollTargets) {
      if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (await this.isQuestionnairePresentInClientMenu()) {
          return true;
        }

        await target.evaluate((el) => {
          el.scrollBy(0, 350);
        }).catch(() => {});
      }
    }

    return this.isQuestionnairePresentInClientMenu();
  }

  async resolveFeatureSearchInput() {
    const count = await this.selectFeatureInput.count();
    if (count > 1 && (await this.selectFeatureInput.nth(1).isVisible().catch(() => false))) {
      return this.selectFeatureInput.nth(1);
    }
    if (count > 0 && (await this.selectFeatureInput.first().isVisible().catch(() => false))) {
      return this.selectFeatureInput.first();
    }

    return this.page.getByPlaceholder(/select feature|search feature|feature/i).first();
  }

  async searchQuestionnaireInClientMenu() {
    const searchTerm = this.resolveQuestionnaireFeatureSearchTerm();
    console.log(`[QuestionnairePage] Searching client menu for: ${searchTerm}`);

    const firstFeatureInput = this.selectFeatureInput.first();
    if (await firstFeatureInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstFeatureInput.click().catch(() => {});

      const filterInput = this.selectFeatureInput.nth(1);
      if (await filterInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await filterInput.click();
        await filterInput.fill(searchTerm);
        return;
      }
    }

    const searchInput = await this.resolveFeatureSearchInput();
    await expect(searchInput).toBeVisible({ timeout: 30000 });
    await searchInput.scrollIntoViewIfNeeded().catch(() => {});
    await searchInput.click();
    await searchInput.fill(searchTerm);

    await this.scrollClientMenuForQuestionnaire();
  }

  async clickQuestionnaireInClientMenu() {
    const questionnaireEntry = this.getQuestionnaireMenuItem()
      .or(this.page.getByRole('menuitem', { name: /questionnaire/i }))
      .or(this.page.getByText(/^questionnaire$/i))
      .first();

    await expect(async () => {
      const present = await this.isQuestionnairePresentInClientMenu();
      expect(present).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });

    await questionnaireEntry.scrollIntoViewIfNeeded().catch(() => {});
    await questionnaireEntry.click({ timeout: 15000 });
  }

  async openQuestionnaireModuleFromClientMenu() {
    console.log('[QuestionnairePage] Opening Questionnaire from client feature menu');
    await this.waitForLeadProfileReady();

    if (await this.chooseQuestionnaireButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[QuestionnairePage] Questionnaire module already open');
      return;
    }

    if (await this.selectFeatureInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.openQuestionnaireViaFeatureSelector();
      return;
    }

    if (!(await this.isQuestionnairePresentInClientMenu())) {
      await this.searchQuestionnaireInClientMenu();
    } else {
      await this.scrollClientMenuForQuestionnaire();
    }

    if (await this.questionnaireTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.questionnaireTab.click();
    } else {
      await this.clickQuestionnaireInClientMenu();
    }

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.ensureQuestionnaireModuleLoaded();
  }

  async openQuestionnaireTab() {
    console.log('[QuestionnairePage] Opening Questionnaire module');
    await this.navigateToLeadProfileIfNeeded();

    try {
      await this.openQuestionnaireModuleFromClientMenu();
      return;
    } catch (error) {
      console.warn(`[QuestionnairePage] Client menu path failed: ${error.message}`);
    }

    if (await this.questionnaireTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.questionnaireTab.click();
    } else if (await this.questionnaireOverviewLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.questionnaireOverviewLink.click();
    } else {
      throw new Error(
        '[QuestionnairePage] Questionnaire not found in client menu. Verify the lead has Questionnaire enabled.'
      );
    }

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async chooseQuestionnaireAndConfirm(questionnaireName = this.resolveQuestionnaireName()) {
    console.log('[QuestionnairePage] Choosing questionnaire template and confirming');
    await this.openChooseQuestionnaireDialog();
    await this.selectQuestionnaireTemplateInDialog(questionnaireName);
    await this.confirmChooseQuestionnaireDialog();
  }

  async expectSendPreferencePageVisible() {
    console.log('[QuestionnairePage] Expecting send preference page');
    await expect(this.sendViaButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async sendQuestionnaireViaEmail() {
    console.log('[QuestionnairePage] Sending questionnaire via email');
    await expect(this.sendViaButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.sendViaButton.click();

    await expect(this.emailOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.emailOption.click();

    await expect(this.composeEmailHeader).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.sendEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.sendEmailButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectQuestionnaireSentSuccessfully() {
    console.log('[QuestionnairePage] Expecting questionnaire sent successfully');
    await expect(this.successToast).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async getSentViaEmailTabPanel() {
    const tabId = await this.sentViaEmailTab.getAttribute('id').catch(() => null);
    if (tabId) {
      const linkedPanel = this.page.locator(`[role="tabpanel"][aria-labelledby="${tabId}"]`).first();
      if ((await linkedPanel.count()) > 0) {
        return linkedPanel;
      }
    }

    return this.page.locator('[role="tabpanel"]:not([hidden])').last();
  }

  async waitForSentQuestionnaireInSentViaTab(questionnaireName) {
    console.log(
      `[QuestionnairePage] Waiting for sent questionnaire "${questionnaireName}" in Sent via email tab`
    );
    const panel = await this.getSentViaEmailTabPanel();

    await expect(async () => {
      const rowVisible = await panel
        .locator('tr, .MuiCard-root, .MuiPaper-root, li, .MuiAccordion-root, [class*="accordion"]')
        .filter({ hasText: questionnaireName })
        .first()
        .isVisible()
        .catch(() => false);
      const textVisible = await panel
        .getByText(questionnaireName, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      expect(rowVisible || textVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async openSentViaTab() {
    console.log('[QuestionnairePage] Opening Sent via email tab');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await expect(async () => {
      const tabVisible = await this.sentViaEmailTab.isVisible().catch(() => false);
      const dropdownVisible = await this.sentViaEmailDropdown.isVisible().catch(() => false);
      expect(tabVisible || dropdownVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });

    if (await this.sentViaEmailTab.isVisible().catch(() => false)) {
      await this.sentViaEmailTab.scrollIntoViewIfNeeded().catch(() => {});
      await this.sentViaEmailTab.click();
      await expect(this.sentViaEmailTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const name = this.selectedQuestionnaireName || this.resolveQuestionnaireName();
      if (name) {
        await this.waitForSentQuestionnaireInSentViaTab(name);
      } else {
        await expect(await this.getSentViaEmailTabPanel()).toBeVisible({ timeout: 30000 });
      }
      return;
    }

    if (await this.sentViaEmailDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[QuestionnairePage] Falling back to legacy Sent Via Email dropdown');
      await this.sentViaEmailDropdown.click();
      return;
    }

    throw new Error('[QuestionnairePage] Sent via email tab not found after sending questionnaire.');
  }

  async openSentViaEmailDropdown() {
    await this.openSentViaTab();
  }

  getSentQuestionnaireListItem(name) {
    return this.page
      .locator('[role="tabpanel"]:not([hidden])')
      .last()
      .locator('tr, .MuiCard-root, .MuiPaper-root, li, .MuiAccordion-root, [class*="accordion"]')
      .filter({ hasText: name })
      .first();
  }

  async expectSentQuestionnaireVisibleInList() {
    const name = this.selectedQuestionnaireName || this.resolveQuestionnaireName();
    console.log(`[QuestionnairePage] Expecting sent questionnaire visible in Sent via email tab: ${name}`);
    await this.waitForSentQuestionnaireInSentViaTab(name);
  }

  async expandSentQuestionnaireDetails() {
    const name = this.selectedQuestionnaireName || this.resolveQuestionnaireName();
    console.log(`[QuestionnairePage] Expanding sent questionnaire details: ${name}`);

    const listItem = this.getSentQuestionnaireListItem(name);
    await expect(listItem).toBeVisible({ timeout: this.defaultTimeout });
    await listItem.scrollIntoViewIfNeeded().catch(() => {});

    const accordionSummary = listItem
      .locator('.MuiAccordionSummary-root, [role="button"][aria-expanded="false"]')
      .first();
    if (await accordionSummary.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accordionSummary.click();
      return;
    }

    await listItem.click();
  }

  async expectQuestionnaireEmailDetailsVisible() {
    console.log('[QuestionnairePage] Expecting questionnaire email details visible');
    const panel = await this.getSentViaEmailTabPanel();

    await expect(async () => {
      const detailsVisible = await panel
        .getByText(/email details|sent via email|email sent|delivered|to:|subject:|recipient/i)
        .first()
        .isVisible()
        .catch(() => false);
      const statusVisible = await panel
        .getByText(/^sent$|delivered|successfully sent/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(detailsVisible || statusVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }
}

module.exports = QuestionnairePage;
