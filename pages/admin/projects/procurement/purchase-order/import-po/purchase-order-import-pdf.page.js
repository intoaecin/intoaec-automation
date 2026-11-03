const fs = require('fs');
const path = require('path');
const PurchaseOrderCreatePoPage = require('../create-po/purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * List → Create PO → Get Started → Upload PDF → Proceed.
 *
 * Default (TC-16 headed): wait for the Get Started popup, upload PDF manually in the
 * browser, press ENTER in the terminal, then the test clicks Proceed and continues.
 *
 * Automated (CI): set `PO_IMPORT_PDF_AUTO=1` and optionally `PO_IMPORT_PDF_PATH`.
 */
class PurchaseOrderImportPdfPage extends PurchaseOrderCreatePoPage {
  bundledImportPdfPath() {
    return path.join(
      __dirname,
      '../../../../../../fixtures/sample-po-import.pdf'
    );
  }

  isAutomatedPdfImport() {
    const v = process.env.PO_IMPORT_PDF_AUTO;
    return v === '1' || /^true$/i.test(String(v || ''));
  }

  resolveAutomatedPdfPath() {
    const raw = process.env.PO_IMPORT_PDF_PATH;
    if (raw && String(raw).trim()) {
      const resolved = path.resolve(String(raw).trim());
      if (fs.existsSync(resolved)) {
        return resolved;
      }
      console.warn(
        `[PO import] PO_IMPORT_PDF_PATH not found (${resolved}). Falling back to manual upload.`
      );
      return null;
    }

    const bundled = this.bundledImportPdfPath();
    if (fs.existsSync(bundled)) {
      return bundled;
    }

    console.warn(
      `[PO import] Bundled sample missing (${bundled}). Falling back to manual upload.`
    );
    return null;
  }

  async clickUploadPdfToOpenNativeFileDialog(dlg, opts = {}) {
    const clickTimeout = opts.clickTimeout ?? 15000;
    const label = dlg.getByText(/^Upload PDF$/i).first();
    await label.scrollIntoViewIfNeeded();

    const cards = dlg
      .locator('.MuiCard-root')
      .filter({ has: dlg.getByText(/^Upload PDF$/i) });
    if ((await cards.count()) > 0) {
      await cards.first().click({ timeout: clickTimeout });
      return;
    }
    await label.click({ timeout: clickTimeout });
  }

  async _clickProceedInGetStartedDialog(dlg) {
    const proceed = dlg.getByRole('button', { name: /^proceed$/i });
    await expect(proceed).toBeVisible({ timeout: 30000 });
    await expect(proceed).toBeEnabled({ timeout: 600000 });
    await proceed.click();

    const uploading = this.page.getByText(/uploading file/i).first();
    if (await uploading.isVisible({ timeout: 8000 }).catch(() => false)) {
      await uploading.waitFor({ state: 'hidden', timeout: 180000 });
    }
  }

  async _waitForPurchaseOrderCreateFormAfterImport() {
    await expect
      .poll(
        async () => {
          if (/purchase-order\/create/i.test(this.page.url())) {
            return true;
          }
          return this.page
            .locator('input[name="estimation name"]')
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
        },
        { timeout: 120000, intervals: [500, 1000, 2000, 3000] }
      )
      .toBe(true);

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForNetworkSettled();

    const titleInput = this.page.locator('input[name="estimation name"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 120000 });
  }

  async waitForManualPdfUploadInGetStartedDialog() {
    const dlg = this.purchaseOrderStartDialog();
    await expect(dlg).toBeVisible({ timeout: 30000 });
    await expect(dlg.getByText(/^Upload PDF$/i).first()).toBeVisible({
      timeout: 15000,
    });

    // eslint-disable-next-line no-console
    console.log(
      '\n[PO import] Create PO popup is open.\n' +
        '            → Upload your PDF in the browser.\n' +
        '            → Press ENTER in this terminal when the PDF is selected (test will click Proceed).\n'
    );

    await this.waitForEnterInTerminal(
      'Press ENTER after PDF upload — the test will click Proceed for you.'
    );

    // eslint-disable-next-line no-console
    console.log('[PO import] Clicking Proceed…');
    await this._clickProceedInGetStartedDialog(dlg);
    await this._waitForPurchaseOrderCreateFormAfterImport();
  }

  async uploadPdfAutomatedInGetStartedDialog(automatedPath) {
    const dlg = this.purchaseOrderStartDialog();
    await expect(dlg).toBeVisible({ timeout: 30000 });

    const uploadLabel = dlg.getByText(/^Upload PDF$/i).first();
    await expect(uploadLabel).toBeVisible({ timeout: 15000 });

    const fileInput = dlg.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });

    const proceed = dlg.getByRole('button', { name: /^proceed$/i });

    try {
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 25000 }),
        this.clickUploadPdfToOpenNativeFileDialog(dlg),
      ]);
      await fileChooser.setFiles(automatedPath);
    } catch {
      await fileInput.setInputFiles(automatedPath);
    }

    await expect(proceed).toBeEnabled({ timeout: 60000 });
    await this._clickProceedInGetStartedDialog(dlg);
    await this._waitForPurchaseOrderCreateFormAfterImport();
  }

  async uploadPdfInGetStartedDialogAndProceed() {
    const automatedPath = this.isAutomatedPdfImport()
      ? this.resolveAutomatedPdfPath()
      : null;

    if (automatedPath) {
      await this.uploadPdfAutomatedInGetStartedDialog(automatedPath);
      return;
    }

    await this.waitForManualPdfUploadInGetStartedDialog();
  }

  async expectPurchaseOrderCreateFormAfterPdfImport() {
    await expect(this.page).toHaveURL(/purchase-order\/create/);
    await expect(
      this.page.locator('input[name="estimation name"]').first()
    ).toBeVisible({ timeout: 90000 });
    await expect(
      this.page.locator('[aria-label="PO line items table"]')
    ).toBeVisible({ timeout: 90000 });
  }

  async fillPurchaseOrderTitleWithRandomValue() {
    const title = `PO - PDF import (Materials) - ${Date.now()}`;
    await this.fillPurchaseOrderTitle(title);
    return title;
  }

  async expectVendorAddedAfterImportFlow() {
    await expect(
      this.page.getByRole('button', { name: /change vendor/i })
    ).toBeVisible({ timeout: 90000 });
  }
}

module.exports = PurchaseOrderImportPdfPage;
