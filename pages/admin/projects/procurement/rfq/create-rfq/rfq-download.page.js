const { expect } = require('@playwright/test');
const RfqPreviewPage = require('./rfq-preview.page');

/**
 * RFQ: open preview and download from preview.
 * Reuses RFQ preview navigation (Expand → 3-dot → Preview).
 */
class RfqDownloadPage extends RfqPreviewPage {
  async clickRfqDownloadIconOnly() {
    await this.waitForNetworkSettled();

    // Prefer the stable aria-label if present.
    const candidates = [
      this.page.locator("button[aria-label='Download as PDF']").filter({ visible: true }).first(),
      this.page
        .locator(
          "xpath=//button[@aria-label='Download as PDF']//*[name()='svg']"
        )
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
      // Absolute XPath provided
      this.page
        .locator(
          "xpath=/html[1]/body[1]/div[4]/div[3]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/button[1]/*[name()='svg'][1]"
        )
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
    ];

    let target = null;
    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await c.isVisible({ timeout: 2000 }).catch(() => false)) {
        target = c;
        break;
      }
    }
    if (!target) {
      throw new Error('RFQ download: could not find Download as PDF icon/button.');
    }

    await target.scrollIntoViewIfNeeded().catch(() => {});
    await target.click({ timeout: 15000 }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });
  }

  /**
   * Click download and wait until browser download starts.
   * @returns {Promise<string>} suggested filename
   */
  async clickRfqDownloadIconAndWaitForDownload() {
    // Arm download listener BEFORE clicking.
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
    await this.clickRfqDownloadIconOnly();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();

    // Persist download if dir is configured.
    const outDir = process.env.RFQ_DOWNLOAD_DIR;
    if (outDir && String(outDir).trim()) {
      const path = require('path');
      const fs = require('fs');
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

  /**
   * Click Download in the preview and wait for the file.
   * @returns {Promise<string>} suggested filename
   */
  async downloadRfqFromPreview() {
    await this.waitForNetworkSettled();

    const root = this.rfqPreviewContainer();
    await expect(root).toBeVisible({ timeout: this.previewOpenTimeout() });

    // PO reference approach: pick ONE visible download control and click it while waiting for the download event.
    const iframeVisible = await root
      .locator('iframe')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 1200 })
      .catch(() => false);
    const frame = iframeVisible ? this.page.frameLocator('iframe').first() : null;

    const candidates = [
      // Absolute XPath provided for the download button (top-right toolbar)
      this.page
        .locator(
          "xpath=/html[1]/body[1]/div[4]/div[3]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/button[1]/*[name()='svg'][1]"
        )
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
      // Your exact control (top-right)
      root.locator("button[aria-label='Download as PDF']").filter({ visible: true }).first(),
      root
        .locator("xpath=.//button[@aria-label='Download as PDF']//*[name()='svg']")
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
      // Sometimes the toolbar is portaled outside `root`
      this.page.locator("button[aria-label='Download as PDF']").filter({ visible: true }).first(),
      this.page
        .locator("xpath=//button[@aria-label='Download as PDF']//*[name()='svg']")
        .filter({ visible: true })
        .first()
        .locator('xpath=ancestor::button[1]')
        .first(),
      // If inside iframe (PDF viewer)
      frame ? frame.locator("button[aria-label='Download as PDF']").filter({ visible: true }).first() : null,
      // Generic fallbacks
      root.getByRole('button', { name: /^download$/i }).filter({ visible: true }).first(),
      root.locator('button[aria-label*="download" i]').filter({ visible: true }).first(),
      root.locator('button[title*="download" i]').filter({ visible: true }).first(),
    ].filter(Boolean);

    let downloadControl = null;
    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
        downloadControl = c;
        break;
      }
    }
    if (!downloadControl) {
      throw new Error('RFQ download: Download control not found in preview.');
    }

    await downloadControl.scrollIntoViewIfNeeded().catch(() => {});

    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 120000 }),
      downloadControl.click({ timeout: 20000 }).catch(async () => {
        await downloadControl.click({ timeout: 20000, force: true });
      }),
    ]);

    const suggested = download.suggestedFilename();

    // Save to a stable place if configured; otherwise just ensure it completed.
    const outDir = process.env.RFQ_DOWNLOAD_DIR;
    if (outDir && String(outDir).trim()) {
      const path = require('path');
      const fs = require('fs');
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

module.exports = RfqDownloadPage;

