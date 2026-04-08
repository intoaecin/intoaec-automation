const fs = require('fs');
const path = require('path');
const PurchaseOrderCreatePoPage = require('../create-po/purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * List → Create PO → Get Started → Upload PDF → Proceed.
 *
 * Mode: `@po-import-pdf` / `PO_IMPORT_PDF_MANUAL=1` force a headed browser (see hooks.js).
 * Manual: no `waitForEvent('filechooser')` — Playwright only intercepts the picker when a listener exists;
 * without it, Windows Explorer opens. Then wait for Proceed → click.
 * Automated: `waitForEvent` + `setFiles` (no Explorer — fully programmatic).
 * - `PO_IMPORT_PDF_PATH` set and file exists → automated `setFiles` / `setInputFiles`.
 * - `PO_IMPORT_PDF_PATH` set but missing → manual (no crash; warns in console).
 * - No path env → bundled sample PDF if present, else manual.
 */
class PurchaseOrderImportPdfPage extends PurchaseOrderCreatePoPage {
  bundledImportPdfPath() {
    return path.join(
      __dirname,
      '../../../../../../fixtures/sample-po-import.pdf'
    );
  }

  isManualPdfImport() {
    const v = process.env.PO_IMPORT_PDF_MANUAL;
    return v === '1' || /^true$/i.test(String(v || ''));
  }

  /**
   * @returns {{ manual: boolean, automatedPath: string | null }}
   */
  resolveImportModeAndPath() {
    if (this.isManualPdfImport()) {
      return { manual: true, automatedPath: null };
    }

    const raw = process.env.PO_IMPORT_PDF_PATH;
    if (raw && String(raw).trim()) {
      const resolved = path.resolve(String(raw).trim());
      if (fs.existsSync(resolved)) {
        return { manual: false, automatedPath: resolved };
      }
      console.warn(
        `[PO import] PO_IMPORT_PDF_PATH not found (${resolved}). Opening the file dialog — select your PDF, then the test will click Proceed when it is enabled.`
      );
      return { manual: true, automatedPath: null };
    }

    const bundled = this.bundledImportPdfPath();
    if (fs.existsSync(bundled)) {
      return { manual: false, automatedPath: bundled };
    }

    console.warn(
      `[PO import] Bundled sample missing (${bundled}). Opening the file dialog — select your PDF manually.`
    );
    return { manual: true, automatedPath: null };
  }

  /**
   * Clicks the control that opens the native file picker. Prefer the MUI card (app wires onClick → input.click());
   * fall back to the “Upload PDF” label.
   * @param {{ clickTimeout?: number }} [opts] — use a long `clickTimeout` in manual mode (click may block until the dialog closes).
   */
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

  async uploadPdfInGetStartedDialogAndProceed() {
    const { manual, automatedPath } = this.resolveImportModeAndPath();

    const dlg = this.purchaseOrderStartDialog();
    await expect(dlg).toBeVisible({ timeout: 30000 });

    const uploadLabel = dlg.getByText(/^Upload PDF$/i).first();
    await expect(uploadLabel).toBeVisible({ timeout: 15000 });

    const fileInput = dlg.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });

    const proceed = dlg.getByRole('button', { name: /^proceed$/i });

    if (manual) {
      await this.clickUploadPdfToOpenNativeFileDialog(dlg, {
        clickTimeout: 600000,
      });
      await expect(proceed).toBeEnabled({ timeout: 600000 });
    } else {
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
    }

    await proceed.click();

    const uploading = this.page.getByText(/uploading file/i).first();
    if (
      await uploading.isVisible({ timeout: 8000 }).catch(() => false)
    ) {
      await uploading.waitFor({ state: 'hidden', timeout: 180000 });
    }

    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: 180000,
    });
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();

    const titleInput = this.page.locator('input[name="estimation name"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 120000 });
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
