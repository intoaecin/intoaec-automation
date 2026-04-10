const fs = require('fs');
const path = require('path');
const PurchaseOrderCreatePoPage = require('../create-po/purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * List → Create PO → Get Started → Upload PDF → Proceed.
 *
 * **Automated (default when bundled or PO_IMPORT_PDF_PATH exists):** `setInputFiles` — no Explorer.
 *
 * **Explorer (you pick the PDF):** set one of:
 * - `PO_IMPORT_PDF_MANUAL=1`
 * - `PO_IMPORT_USE_EXPLORER=1` / `PO_IMPORT_OPEN_EXPLORER=1`
 * Flow: click **Upload PDF** card (same as UI) → OS picker → wait until file is on the input inside the Get Started
 * dialog (page-level DOM check, avoids stale locators) → wait until **Proceed** is enabled → click Proceed.
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

  isUseExplorerImport() {
    const v =
      process.env.PO_IMPORT_USE_EXPLORER ?? process.env.PO_IMPORT_OPEN_EXPLORER;
    return v === '1' || /^true$/i.test(String(v || ''));
  }

  /**
   * @returns {{ manual: boolean, automatedPath: string | null }}
   */
  resolveImportModeAndPath() {
    if (this.isManualPdfImport() || this.isUseExplorerImport()) {
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
   * True if any dialog that looks like “Get started” has a file on its file input.
   * Uses page.evaluate so we are not tied to a single Playwright locator if React remounts the input.
   */
  async hasPdfFileInGetStartedDialog() {
    return this.page.evaluate(() => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      for (const d of dialogs) {
        const t = (d.textContent || '').toLowerCase();
        if (!t.includes('get started')) continue;
        const inp = d.querySelector('input[type="file"]');
        if (inp && inp.files && inp.files.length > 0) return true;
      }
      return false;
    });
  }

  /**
   * Opens the OS file picker the same way a user does: **Upload PDF** card first (app wires this to the input).
   * Uses a long timeout so the click can complete after you dismiss Explorer (Chromium often blocks until then).
   */
  async clickUploadPdfToOpenNativeFileDialog(dlg, opts = {}) {
    const clickTimeout = opts.clickTimeout ?? 15000;

    const cards = dlg
      .locator('.MuiCard-root')
      .filter({ has: dlg.getByText(/upload pdf/i) });
    if ((await cards.count()) > 0) {
      await cards.first().click({ timeout: clickTimeout });
      return;
    }

    const label = dlg.getByText(/upload pdf/i).first();
    await label.scrollIntoViewIfNeeded();
    await label.click({ timeout: clickTimeout });
  }

  /**
   * After Explorer closes or setInputFiles: wait until a file is present (DOM scan), optional busy copy clears,
   * then **Proceed** is enabled inside the start dialog.
   */
  async waitForPdfStagedAndProceedReady(dlg, timeoutMs) {
    const proceed = dlg.getByRole('button', { name: /proceed/i });
    const pollTimeout = Math.min(timeoutMs, 600000);

    try {
      await expect
        .poll(async () => this.hasPdfFileInGetStartedDialog(), {
          timeout: pollTimeout,
        })
        .toBe(true);
    } catch {
      console.warn(
        '[PO import] File input still empty after wait; will continue when Proceed enables.'
      );
    }

    const busy = dlg.getByText(
      /uploading|processing|parsing|extracting|please wait/i
    ).first();
    try {
      await busy.waitFor({ state: 'visible', timeout: 8000 });
      await busy.waitFor({ state: 'hidden', timeout: Math.min(timeoutMs, 300000) });
    } catch {
      /* no busy copy in dialog */
    }

    await expect(proceed).toBeEnabled({ timeout: timeoutMs });
  }

  async uploadPdfInGetStartedDialogAndProceed() {
    const { manual, automatedPath } = this.resolveImportModeAndPath();

    const dlg = this.purchaseOrderStartDialog();
    await expect(dlg).toBeVisible({ timeout: 30000 });

    const uploadLabel = dlg.getByText(/upload pdf/i).first();
    await expect(uploadLabel).toBeVisible({ timeout: 15000 });

    const fileInput = dlg.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });

    const stagingTimeout = manual ? 600000 : 120000;

    if (manual) {
      console.warn(
        '[PO import] Explorer mode: choose your PDF in the file dialog. Waiting up to ' +
          Math.round(stagingTimeout / 60000) +
          ' min for upload + Proceed to enable, then clicking Proceed.'
      );
      await this.clickUploadPdfToOpenNativeFileDialog(dlg, {
        clickTimeout: stagingTimeout,
      });
    } else {
      await fileInput.setInputFiles(automatedPath);
    }

    await this.waitForPdfStagedAndProceedReady(dlg, stagingTimeout);

    await dlg.getByRole('button', { name: /proceed/i }).click();

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
