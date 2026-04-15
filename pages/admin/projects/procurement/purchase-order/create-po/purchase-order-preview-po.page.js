const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list card → kebab → Preview full-screen dialog. */
class PurchaseOrderPreviewPoPage extends PurchaseOrderCreatePoPage {
  fullScreenPoPreviewDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByText(/purchase order|po no|preview|billed to/i),
      })
      .first();
  }

  async openThreeDotMenuOnFirstPurchaseOrderCard() {
    await this.clickKebabOnFirstPurchaseOrderCard();
    await expect(
      this.page.getByRole('menuitem', { name: /^preview$/i })
    ).toBeVisible({ timeout: 30000 });
  }

  async clickPreviewInPurchaseOrderCardMenu() {
    await this.page.getByRole('menuitem', { name: /^preview$/i }).click();
  }

  async expectPurchaseOrderFullScreenPreviewVisible() {
    const dialog = this.fullScreenPoPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      dialog.getByText(/purchase order|po no|preview|billed to/i).first()
    ).toBeVisible({ timeout: 60000 });
  }

  async closePurchaseOrderFullScreenPreview() {
    const dialog = this.fullScreenPoPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const tryClick = async (loc) => {
      const el = loc.first();
      if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
        await el.click({ timeout: 10000 });
        return true;
      }
      return false;
    };

    const closeCandidates = [
      dialog.locator('button:has(svg[data-testid="CloseIcon"])'),
      dialog.locator('button:has(svg[data-testid="ArrowBackIcon"])'),
      dialog.getByRole('button', { name: /^close$/i }),
      dialog.locator('button[aria-label*="close" i]'),
      dialog.getByRole('button', { name: /back/i }),
      dialog.locator('.MuiDialogTitle-root button').first(),
      dialog.locator('header button').first(),
    ];

    for (const loc of closeCandidates) {
      if (await tryClick(loc)) {
        break;
      }
    }

    await expect(dialog).toBeHidden({ timeout: 45000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(400);
      await expect(dialog).toBeHidden({ timeout: 20000 });
    });
  }

  /**
   * In full-screen preview dialog: click Download and wait for the file to download.
   * @returns {Promise<string>} downloaded suggested filename
   */
  async downloadPurchaseOrderFromPreview() {
    const dialog = this.fullScreenPoPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });

    // Common candidates: text button, icon button, aria-label/title.
    const downloadCandidates = [
      dialog.getByRole('button', { name: /^download$/i }),
      dialog.getByRole('button', { name: /download/i }),
      dialog.locator('button[aria-label*="download" i]'),
      dialog.locator('button[title*="download" i]'),
      dialog.locator('a[download]'),
      dialog.locator('button:has(svg[data-testid*="Download" i])'),
    ];

    let downloadControl = null;
    for (const loc of downloadCandidates) {
      const el = loc.first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        downloadControl = el;
        break;
      }
    }
    if (!downloadControl) {
      throw new Error('Download control not found in PO preview dialog.');
    }

    await downloadControl.scrollIntoViewIfNeeded();

    const downloadPromise = this.page.waitForEvent('download', {
      timeout: 120000,
    });
    await downloadControl.click({ timeout: 20000 }).catch(async () => {
      await downloadControl.click({ timeout: 20000, force: true });
    });

    const download = await downloadPromise;
    const suggested = download.suggestedFilename();

    // Save to a stable place if possible; if not, just ensure it completes.
    const outDir = process.env.PO_DOWNLOAD_DIR;
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

  async expectPurchaseOrderListWithCreateActionVisible() {
    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = PurchaseOrderPreviewPoPage;
