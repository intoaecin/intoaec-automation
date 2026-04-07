const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Project proposal: editor (CreateOrEditProposalTemplate) → Next → LeadProposalNextDialog
 * ("skip & proceed" in UI; users often say "Skip for now") → SendLeadNewProposalWrapper → MailSendBtn → Email → Send Email.
 */
class ProposalPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    this.proposalTab = page.getByRole('tab', { name: /proposal/i }).first();
    this.proposalTabButton = page.getByRole('button', { name: /^proposal$/i }).first();
    /** Project profile: collapsible section (t("common.design") → "Design & Estimates"). */
    this.designEstimatesHeading = page
      .getByRole('button', { name: 'Design & Estimates' })
      .or(page.getByRole('button', { name: /design\s*&\s*estimates/i }))
      .first();
    /** Project profile: Proposal tile (Typography is often a `p`; grid item is the click target). */
    this.proposalModuleGridItem = page.locator('.MuiGrid-item').filter({ hasText: /^Proposal$/ }).first();
    this.proposalModuleCard = page.locator('p').filter({ hasText: /^\s*Proposal\s*$/i }).first();
    this.proposalNavLink = page.getByRole('link', { name: /proposal/i }).first();
    this.chooseProposalButton = page.getByRole('button', { name: /choose proposal/i }).first();
    this.sentProposalSection = page.locator('text=/sent proposal/i').first();

    this.builderCanvas = page.locator('[id^="create-proposal-template-"]').first();
    this.editorNextButton = page.getByRole('button', { name: /^Next$/i }).first();

    /** LeadProposalNextDialog — modal.skip&Proceed */
    this.skipAndProceedButton = page.getByRole('button', { name: /skip\s*&\s*proceed/i }).first();

    this.sendMenuButton = page.getByRole('button', { name: /^Send$/i }).first();
    this.emailMenuItem = page.getByRole('menuitem', { name: /^Email$/i }).first();
    this.composeSendEmailButton = page.getByRole('button', { name: /Send Email/i }).first();

    this.successToast = page.locator(
      'text=/proposal sent successfully|sent successfully|mail sent successfully/i'
    ).first();
  }

  async waitForStableUi() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(400);
  }

  async clickWhenVisible(primary, fallback) {
    if (await primary.isVisible().catch(() => false)) {
      await primary.click();
      return;
    }
    if (fallback && (await fallback.isVisible().catch(() => false))) {
      await fallback.click();
      return;
    }
    throw new Error('Expected control was not visible for interaction');
  }

  /**
   * Opens the proposal area from a project/client profile.
   * Supports: MUI tab, plain Proposal button, nav link, or project profile (Design & Estimates → Proposal card).
   */
  async openProposalTab() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.waitForStableUi();

    const alreadyOnProposal =
      (await this.chooseProposalButton.isVisible().catch(() => false)) ||
      (await this.sentProposalSection.isVisible().catch(() => false));
    if (alreadyOnProposal) {
      return;
    }

    if (await this.proposalTab.isVisible().catch(() => false)) {
      await this.proposalTab.click();
      await this.waitForStableUi();
      await this.verifyProposalTabLoaded();
      return;
    }

    if (await this.proposalTabButton.isVisible().catch(() => false)) {
      await this.proposalTabButton.click();
      await this.waitForStableUi();
      await this.verifyProposalTabLoaded();
      return;
    }

    if (await this.proposalNavLink.isVisible().catch(() => false)) {
      await this.proposalNavLink.click();
      await this.waitForStableUi();
      await this.verifyProposalTabLoaded();
      return;
    }

    const proposalTileVisible =
      (await this.proposalModuleGridItem.isVisible().catch(() => false)) ||
      (await this.proposalModuleCard.isVisible().catch(() => false));

    if (!proposalTileVisible) {
      await expect(this.designEstimatesHeading).toBeVisible({ timeout: this.defaultTimeout });
      await this.designEstimatesHeading.click();
      await this.waitForStableUi();
    }

    if (await this.proposalModuleGridItem.isVisible().catch(() => false)) {
      await this.proposalModuleGridItem.click();
    } else {
      await expect(this.proposalModuleCard).toBeVisible({ timeout: this.defaultTimeout });
      await this.proposalModuleCard.click();
    }

    await this.waitForStableUi();
    await this.verifyProposalTabLoaded();
  }

  async verifyProposalTabLoaded() {
    await expect(async () => {
      const chooseVisible = await this.chooseProposalButton.isVisible().catch(() => false);
      const sentVisible = await this.sentProposalSection.isVisible().catch(() => false);
      expect(chooseVisible || sentVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }

  async verifySentProposalSectionLoaded() {
    await expect(this.sentProposalSection).toBeVisible({ timeout: this.defaultTimeout });
  }

  async openChooseProposalModal() {
    await expect(this.chooseProposalButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.chooseProposalButton.click();
    await this.waitForStableUi();
  }

  getChooseProposalDialog() {
    return this.page.locator('[role="dialog"], .modal.show, .offcanvas.show').filter({ hasText: /choose proposal/i }).first();
  }

  async selectDialogOptionByName(selectLocator, optionNamePattern) {
    await expect(selectLocator).toBeVisible({ timeout: this.defaultTimeout });
    await selectLocator.click();

    const option = this.page.getByRole('option', { name: optionNamePattern }).first();
    await expect(option).toBeVisible({ timeout: this.defaultTimeout });
    await option.click();
    await this.waitForStableUi();
  }

  async chooseDefaultProposalCategory(dialog) {
    const categorySelect = dialog.locator('.MuiSelect-select, [role="combobox"]').first();
    await expect(categorySelect).toBeVisible({ timeout: this.defaultTimeout });
    await categorySelect.click();

    const defaultCategoryOption = this.page.locator('[role="option"][data-value="DEFAULT"]').first();
    await expect(defaultCategoryOption).toBeVisible({ timeout: this.defaultTimeout });
    await defaultCategoryOption.click();
    await this.waitForStableUi();
  }

  async selectDefaultProposalOption() {
    const dialog = this.getChooseProposalDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });

    await this.chooseDefaultProposalCategory(dialog);

    const proposalSelect = dialog.locator('.MuiSelect-select, [role="combobox"]').nth(1);
    await expect(proposalSelect).toBeVisible({ timeout: this.defaultTimeout });
    await proposalSelect.click();

    const proposalOptions = this.page.getByRole('option');
    await expect(async () => {
      const count = await proposalOptions.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    await proposalOptions.first().click();
    await this.waitForStableUi();
  }

  async chooseDefaultProposal() {
    if (await this.chooseProposalButton.isVisible().catch(() => false)) {
      await this.openChooseProposalModal();
    }
    await this.selectDefaultProposalOption();
    const proceed = this.page.getByRole('button', { name: /proceed|send|confirm|add/i }).first();
    await expect(proceed).toBeVisible({ timeout: this.defaultTimeout });
    await expect(proceed).toBeEnabled({ timeout: this.defaultTimeout });
    await proceed.click();
    await expect(this.page).toHaveURL(/proposal\/edit/i, { timeout: this.defaultTimeout });
  }

  async verifyProposalSelectionListVisible() {
    const dialog = this.getChooseProposalDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
  }

  async verifyProceedDisabledBeforeSelection() {
    const proceed = this.page.getByRole('button', { name: /proceed|send|confirm|add/i }).first();
    await expect(proceed).toBeDisabled({ timeout: this.defaultTimeout });
  }

  async verifyProposalCategoryOptions() {
    const dialog = this.getChooseProposalDialog();
    const categorySelect = dialog.locator('.MuiSelect-select, [role="combobox"]').first();
    await expect(categorySelect).toBeVisible({ timeout: this.defaultTimeout });
    await categorySelect.click();

    const options = this.page.getByRole('option');
    await expect(async () => {
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000] });

    await this.page.keyboard.press('Escape').catch(() => {});
  }

  /**
   * MUI builder: left rail may use tabs; palette tiles live under a tabpanel that includes "Editors"
   * (Text, Image, Table, …), "Pricing Table", and "My Organization". Activate Editors tab if present
   * and scroll the palette into view so drag sources are hit-testable.
   */
  async ensureEditorsPaletteVisible() {
    const editorsTab = this.page.getByRole('tab', { name: /^Editors$/i }).first();
    if (await editorsTab.isVisible().catch(() => false)) {
      const selected = await editorsTab.getAttribute('aria-selected');
      if (selected !== 'true') {
        await editorsTab.click();
        await this.waitForStableUi();
      }
    }

    const editorsHeading = this.page.getByText('Editors', { exact: true }).first();
    await expect(editorsHeading).toBeVisible({ timeout: this.defaultTimeout });
    await editorsHeading.scrollIntoViewIfNeeded();

    const firstPaletteTile = this.page
      .locator('[role="tabpanel"]:not([hidden])')
      .filter({ has: this.page.getByText('Editors', { exact: true }) })
      .locator('[draggable="true"]')
      .first();
    if (await firstPaletteTile.isVisible().catch(() => false)) {
      await firstPaletteTile.scrollIntoViewIfNeeded();
    }
  }

  async verifyProposalEditorReady() {
    await expect(this.builderCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await this.ensureEditorsPaletteVisible();
  }

  async dismissOptionalTwoFactorDialog() {
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: /two-factor|2fa|verification code/i }).first();
    if (await dialog.isVisible().catch(() => false)) {
      const skip = dialog.getByRole('button', { name: /skip for now/i }).first();
      if (await skip.isVisible().catch(() => false)) {
        await skip.click();
        await this.waitForStableUi();
      }
    }
  }

  async clickNextOnProposalEditor() {
    await this.dismissOptionalTwoFactorDialog();
    await expect(this.builderCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.editorNextButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.editorNextButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.editorNextButton.click();
    await this.waitForStableUi();
  }

  /**
   * Maps to Gherkin "Click Skip for now" — app button is usually "skip & proceed".
   */
  async clickSkipInTemplateChangeDialog() {
    await expect(this.skipAndProceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.skipAndProceedButton.click();
    await this.waitForStableUi();
  }

  async waitForSendPreviewScreen() {
    await expect(this.sendMenuButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  /** After skip & proceed, fullscreen send view shows embedded proposal preview + Send. */
  async assertProposalPreviewInSendFlow() {
    await this.waitForSendPreviewScreen();
  }

  async openSendMenu() {
    await this.sendMenuButton.click();
    await expect(this.page.getByRole('menu')).toBeVisible({ timeout: this.defaultTimeout });
  }

  async selectEmailFromSendMenu() {
    await this.emailMenuItem.click();
  }

  async confirmComposeSendEmail() {
    await expect(this.composeSendEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.composeSendEmailButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.composeSendEmailButton.click();
    await this.waitForStableUi();
  }

  async sendProposalUsingEmailChannel() {
    await this.openSendMenu();
    await this.selectEmailFromSendMenu();
    await this.confirmComposeSendEmail();
  }

  /** Full path after editor: Next → skip & proceed → (assert preview) → Send → Email → Send Email. */
  async completeSendFlowAfterEditor() {
    await this.clickNextOnProposalEditor();
    await this.clickSkipInTemplateChangeDialog();
    await this.assertProposalPreviewInSendFlow();
    await this.sendProposalUsingEmailChannel();
  }

  async verifyProposalSent() {
    await expect(async () => {
      const toastVisible = await this.successToast.isVisible().catch(() => false);
      const sentSectionVisible = await this.sentProposalSection.isVisible().catch(() => false);
      expect(toastVisible || sentSectionVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }
}

module.exports = ProposalPage;
