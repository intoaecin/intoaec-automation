const path = require('path');
const fs = require('fs');
const { expect } = require('@playwright/test');
const PurchaseOrderPreviewPoPage = require('./purchase-order-preview-po.page');

/** PO list → Preview → Download from full-screen preview. */
class PurchaseOrderDownloadPoPage extends PurchaseOrderPreviewPoPage {
  purchaseOrderPreviewContainer() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).first();
    const dialogWithContent = dialog.filter({
      has: this.page
        .locator('canvas, iframe')
        .or(this.page.getByText(/purchase order|po no|preview|billed to/i)),
    });

    const routed = this.page
      .locator('main')
      .filter({ visible: true })
      .filter({
        has: this.page
          .locator('canvas, iframe')
          .or(this.page.getByText(/purchase order|po no|preview|billed to/i)),
      })
      .first();

    return dialogWithContent.or(routed);
  }

  /**
   * Click Download in the PO preview and wait for the browser download.
   * @returns {Promise<string>} suggested filename
   */
  async downloadPurchaseOrderFromPreview() {
    await this.waitForNetworkSettled();

    const root = this.purchaseOrderPreviewContainer();
    await expect(root).toBeVisible({ timeout: this.defaultTimeout });

    const iframeVisible = await root
      .locator('iframe')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 1200 })
      .catch(() => false);
    const frame = iframeVisible ? this.page.frameLocator('iframe').first() : null;

    const candidates = [
      root
        .locator("button[aria-label='Download as PDF']")
        .filter({ visible: true })
        .first(),
      root
        .locator("xpath=.//button[@aria-label='Download as PDF']//*[name()='svg']")
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
      this.page
        .locator("button[aria-label='Download as PDF']")
        .filter({ visible: true })
        .first(),
      this.page
        .locator("xpath=//button[@aria-label='Download as PDF']//*[name()='svg']")
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
      frame
        ? frame
            .locator("button[aria-label='Download as PDF']")
            .filter({ visible: true })
            .first()
        : null,
      root.getByRole('button', { name: /^download$/i }).filter({ visible: true }).first(),
      root.locator('button[aria-label*="download" i]').filter({ visible: true }).first(),
      root.locator('button[title*="download" i]').filter({ visible: true }).first(),
      root
        .getByRole('button', { name: /download as pdf/i })
        .filter({ visible: true })
        .first(),
    ].filter(Boolean);

    let downloadControl = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        downloadControl = candidate;
        break;
      }
    }

    if (!downloadControl) {
      throw new Error(
        'PO download: Download control not found in the full-screen preview.'
      );
    }

    await downloadControl.scrollIntoViewIfNeeded().catch(() => {});

    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 120000 }),
      downloadControl.click({ timeout: 20000 }).catch(async () => {
        await downloadControl.click({ timeout: 20000, force: true });
      }),
    ]);

    const suggested = download.suggestedFilename();
    const outDir = process.env.PO_DOWNLOAD_DIR;
    if (outDir && String(outDir).trim()) {
      const dir = String(outDir).trim();
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await download.saveAs(path.join(dir, suggested));
    } else {
      await download.path().catch(() => {});
    }

    return suggested;
  }
}

module.exports = PurchaseOrderDownloadPoPage;
