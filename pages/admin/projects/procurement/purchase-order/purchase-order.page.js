const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

class PurchaseOrderPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    this.createPurchaseOrderButton = page.getByRole('button', {
      name: /create purchase order/i,
    });
    this.emptyStateMessage = page.getByText(/no purchase order sent/i);
    this.listSkeletons = page.locator('.MuiSkeleton-root');

    this.poStartDialog = page.getByRole('dialog');
    this.startFromScratchCardTitle = page.getByText(/^Start From Scratch$/i);
    this.uploadPdfCardTitle = page.getByText(/^Upload PDF$/i);
    this.dialogProceedButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /^proceed$/i });
    this.dialogCancelButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /^cancel$/i });

    this.poTab = page.getByRole('tab', { name: /purchase order/i });

    this.poTitleLabel = page.getByText(/^Title$/i).first();
    this.businessShippingHeading = page.getByText(/^Business Info$/i).first();

    this.subTotalLabel = page.getByText(/^subtotal$/i);
    this.totalAmountLabel = page.getByText(/^total amount$/i);

    this.termsSection = page.locator('div').filter({
      has: page.getByText(/terms/i),
    });

    this.firstPoCard = page
      .locator('div')
      .filter({ has: page.getByText(/issued date/i) })
      .first();
    this.previewTitleButton = page.getByTitle(/^preview$/i).first();
    this.fullScreenDialog = page.locator('[role="dialog"]').filter({
      has: page.locator('canvas, iframe, .MuiDialog-root').or(
        page.getByText(/purchase order|po no/i)
      ),
    });
    this.closePreviewButton = page
      .getByRole('button', { name: /close|back/i })
      .first();

    this.kebabMenuButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') })
      .first();
    this.markAsApprovedButton = page.getByRole('button', {
      name: /mark as approved/i,
    });
    this.sendButton = page.getByRole('button', { name: /^send$/i }).first();
  }

  getSamplePdfPath() {
    const p = path.join(__dirname, '../../../../../fixtures/sample-po.pdf');
    if (!fs.existsSync(p)) {
      throw new Error(`Missing fixture: ${p}`);
    }
    return p;
  }

  async navigateToClientProfileFromProjects() {
    const ProjectNavigationPage = require('../../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);
    await nav.navigateToProjects();
    await nav.clickFirstProject();
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
  }

  async openProcurementHub() {
    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);
    await profile.selectHeading('Procurement');
  }

  async clickPurchaseOrderModuleCard() {
    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);
    await profile.clickModuleCard('Purchase Order');
    await this.page.waitForLoadState('networkidle', {
      timeout: this.defaultTimeout,
    });
  }

  async ensurePurchaseOrderTabSelected() {
    if (await this.poTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.poTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async waitForPurchaseOrderListLoaded() {
    await expect(this.createPurchaseOrderButton).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.page
      .waitForFunction(
        () =>
          document.querySelectorAll('.MuiSkeleton-root').length === 0 ||
          document.body.innerText.includes('No Purchase Order Sent') ||
          document.body.innerText.includes('PO No'),
        { timeout: this.defaultTimeout }
      )
      .catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async expectCreatePurchaseOrderVisible() {
    await expect(this.createPurchaseOrderButton).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectEmptyPurchaseOrderMessage() {
    await expect(this.emptyStateMessage).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectListNotStuckOnSkeleton() {
    const count = await this.listSkeletons.count();
    if (count > 0) {
      await expect(this.listSkeletons.first()).toBeHidden({
        timeout: this.defaultTimeout,
      });
    }
  }

  async openCreatePurchaseOrderDialog() {
    await this.createPurchaseOrderButton.click();
    await expect(this.poStartDialog).toBeVisible({ timeout: 30000 });
    await expect(
      this.poStartDialog.getByText(/get started/i)
    ).toBeVisible();
  }

  async expectStartDialogOptions() {
    await expect(this.startFromScratchCardTitle).toBeVisible();
    await expect(this.uploadPdfCardTitle).toBeVisible();
  }

  async expectProceedDisabledWhenNothingSelected() {
    const proceed = this.poStartDialog.getByRole('button', {
      name: /^proceed$/i,
    });
    await expect(proceed).toBeDisabled();
  }

  async expectCancelEnabledInStartDialog() {
    await expect(this.dialogCancelButton).toBeEnabled();
  }

  async chooseStartFromScratchInDialog() {
    await this.startFromScratchCardTitle.click();
    await expect(this.dialogProceedButton).toBeEnabled({ timeout: 10000 });
    await this.dialogProceedButton.click();
    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
  }

  async chooseUploadPdfInDialog() {
    await this.uploadPdfCardTitle.click();
  }

  async uploadPdfFileInDialog(filePath) {
    const fileInput = this.poStartDialog.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });
    await fileInput.setInputFiles(filePath);
    await expect(this.dialogProceedButton).toBeEnabled({ timeout: 60000 });
  }

  async clickProceedInStartDialog() {
    await this.dialogProceedButton.click();
  }

  async closeStartDialog() {
    await this.dialogCancelButton.click();
    await expect(this.poStartDialog).toBeHidden({ timeout: 15000 });
  }

  async expectOnPurchaseOrderCreatePage() {
    await expect(this.page).toHaveURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
  }

  async expectPurchaseOrderHeaderVisible() {
    await expect(
      this.page.getByText(/create purchase order|edit purchase order/i)
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectPurchaseOrderTitleSectionVisible() {
    await expect(this.poTitleLabel).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectBusinessAndShippingSectionVisible() {
    await expect(this.businessShippingHeading).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectLineItemsAndGrandTotalVisible() {
    await expect(this.subTotalLabel).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.totalAmountLabel).toBeVisible();
  }

  async expectTermsSectionVisible() {
    await expect(
      this.page.getByText(/terms.*conditions|terms and conditions/i).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectAtLeastOnePurchaseOrderCard() {
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectNoPurchaseOrderCards() {
    await expect(this.page.getByText(/po no/i)).toHaveCount(0);
  }

  async openCreatePageFromScratchViaDialog() {
    await this.openCreatePurchaseOrderDialog();
    await this.chooseStartFromScratchInDialog();
  }

  async openEditFirstPurchaseOrder() {
    await this.expectAtLeastOnePurchaseOrderCard();
    await this.kebabMenuButton.click();
    await this.page.getByRole('menuitem', { name: /^edit$/i }).click();
    await this.page.waitForURL(/purchase-order\/edit/, {
      timeout: this.defaultTimeout,
    });
  }

  async expectHeaderInEditMode() {
    await expect(
      this.page.getByText(/edit purchase order/i)
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async viewFirstCardDetails() {
    await this.expectAtLeastOnePurchaseOrderCard();
  }

  async expectFirstCardShowsTitleVendorAndIdentifiers() {
    await expect(this.page.getByText(/to:/i).first()).toBeVisible();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible();
    await expect(this.page.getByText(/issued date/i).first()).toBeVisible();
  }

  async openPreviewFromFirstCard() {
    await this.expectAtLeastOnePurchaseOrderCard();
    await this.previewTitleButton.click();
    await expect(this.page.locator('[role="dialog"]').first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async closeFullScreenPreview() {
    const dlg = this.page.locator('[role="dialog"]').first();
    await dlg.locator('button').first().click();
    await expect(this.page.locator('[role="dialog"]')).toHaveCount(0, {
      timeout: 20000,
    });
  }

  async openKebabOnFirstCard() {
    await this.expectAtLeastOnePurchaseOrderCard();
    await this.kebabMenuButton.click();
    await expect(
      this.page.getByRole('menuitem', { name: /^preview$/i })
    ).toBeVisible();
  }

  async expectApproverButtonIfPending() {
    await expect(this.markAsApprovedButton).toBeVisible({
      timeout: 60000,
    });
  }

  async openSendMenuOnFirstCard() {
    await this.expectAtLeastOnePurchaseOrderCard();
    await this.sendButton.click();
    await expect(
      this.page.getByRole('menuitem', { name: /send via whatsapp/i })
    ).toBeVisible({ timeout: 15000 });
  }

  async chooseSendEmailFromSendMenu() {
    const item = this.page.getByRole('menuitem', { name: /send email/i });
    await expect(item).toBeVisible({ timeout: 15000 });
    await item.click();
  }

  async chooseSendReminderFromSendMenu() {
    const item = this.page.getByRole('menuitem', { name: /send reminder/i });
    await expect(item).toBeVisible({ timeout: 15000 });
    await item.click();
  }

  async chooseSendWhatsAppFromSendMenu() {
    const item = this.page.getByRole('menuitem', { name: /send via whatsapp/i });
    await item.click();
  }

  async closeComposeEmailModalIfOpen() {
    const close = this.page
      .getByRole('dialog')
      .getByRole('button', { name: /close|cancel/i })
      .first();
    if (await close.isVisible({ timeout: 3000 }).catch(() => false)) {
      await close.click();
    }
  }

  async expectComposeEmailModal() {
    await expect(
      this.page.getByRole('dialog').filter({ hasText: /email|subject|to/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async cancelComposeEmailModal() {
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: /cancel|close/i })
      .first()
      .click()
      .catch(() => {});
  }

  async expectPdfImportProcessedOrError() {
    await this.page.waitForTimeout(2000);
    const onCreate = /purchase-order\/create/;
    const toast = this.page.locator('.Toastify__toast-body, [role="alert"]');
    const hasUrl = onCreate.test(this.page.url());
    const hasToast = await toast
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasUrl || hasToast).toBeTruthy();
  }

  async chooseSendWhatsAppFromKebabMenu() {
    await this.kebabMenuButton.click();
    const item = this.page.getByRole('menuitem', { name: /send via whatsapp/i });
    await expect(item).toBeVisible({ timeout: 10000 });
    await item.click();
  }

  async fillPurchaseOrderTitleOnCreateForm(title) {
    await this.page.getByRole('textbox', { name: /^title$/i }).fill(title);
  }

  async addVendorDetailsSelectRowByName(rowName) {
    await this.page.getByRole('button', { name: /add vendor details/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30000 });
    const escaped = rowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page
      .getByRole('row', { name: new RegExp(escaped, 'i') })
      .getByRole('radio')
      .check();
    await this.page.getByRole('button', { name: /^add$/i }).click();
    await expect(this.page.getByRole('dialog')).toBeHidden({ timeout: 30000 });
  }

  async addManualLineItemWithUnitAndWeight({
    materialName,
    description,
    unit,
    weight,
  }) {
    await this.page.getByText(/^\+\s*Add Manually$/i).click();
    await this.page.getByRole('textbox', { name: /material name/i }).fill(materialName);
    await this.page.getByText(/^Add Description$/i).click();
    await this.page.getByRole('textbox', { name: /enter description/i }).fill(description);
    await this.page.getByRole('button', { name: /^add$/i }).click();
    const escapedMat = materialName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matRe = new RegExp(escapedMat, 'i');
    let row = this.page.getByRole('row').filter({ hasText: matRe }).first();
    if ((await row.count()) === 0) {
      row = this.page.locator('table tbody tr').filter({ hasText: matRe }).first();
    }
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole('combobox').click();
    await this.page.getByRole('option', { name: unit, exact: true }).click();
    await row.getByRole('textbox', { name: /^weight$/i }).fill(String(weight));
  }

  async openComposeEmailFromLineItemActionMenu() {
    await this.page.getByRole('button', { name: /^action$/i }).click();
    await this.page.getByText(/^compose email$/i).click();
  }

  async sendPurchaseOrderEmailFromCompose() {
    await this.page.getByRole('button', { name: /^send email$/i }).click();
  }

  async expectPurchaseOrderEmailSendFlowFinished() {
    await expect(
      this.page.getByRole('button', { name: /^send email$/i })
    ).toBeHidden({ timeout: 120000 });
  }
}

module.exports = PurchaseOrderPage;
