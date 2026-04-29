const { expect } = require('@playwright/test');
const RFQComposePage = require('./rfq-compose.page');

/**
 * RFQ view (after create): Send to vendor → pick vendor → Send ▾ → Email → compose Send email.
 * Reuses {@link RFQComposePage} for the compose modal and success toast.
 */
class RfqSendToVendorPage extends RFQComposePage {
  /**
   * Send-to-vendor picker uses the same MUI stacking pattern as {@link RFQPage.addFirstVendorFromPanel}:
   * `.last()` visible modal — **not** `[role="presentation"]` first (that often hits the wrong portal node).
   */
  async resolveSendToVendorPickerPanel() {
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    const panel = this.page
      .locator('.MuiModal-root, [role="dialog"], .drawer, .MuiDrawer-root')
      .filter({ visible: true })
      .last();

    await expect(panel).toBeVisible({ timeout: 120000 });
    return panel;
  }

  async waitForSendToVendorEntryVisible() {
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    const entry = this.page
      .getByRole('button', { name: /send\s*to\s*vendor/i })
      .or(this.page.getByRole('link', { name: /send\s*to\s*vendor/i }))
      .filter({ visible: true })
      .first();

    await expect(entry).toBeVisible({
      timeout: Number(process.env.RFQ_SEND_TO_VENDOR_ENTRY_TIMEOUT_MS) || 180000,
    });
  }

  async clickSendToVendorOnRfqPage() {
    await this.waitForSendToVendorEntryVisible();
    const btn = this.page
      .getByRole('button', { name: /send\s*to\s*vendor/i })
      .or(this.page.getByRole('link', { name: /send\s*to\s*vendor/i }))
      .filter({ visible: true })
      .first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 30000 });
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(400);
    await this.resolveSendToVendorPickerPanel();
  }

  /**
   * Selects the first vendor in the send-to-vendor picker (same idea as Add vendor: **radio/checkbox** in table).
   */
  async selectFirstVendorInSendToVendorPanel() {
    const panel = await this.resolveSendToVendorPickerPanel();

    const firstRadio = panel
      .locator('table tbody input[type="radio"]')
      .first()
      .or(panel.getByRole('radio').first());

    if (await firstRadio.isVisible({ timeout: 20000 }).catch(() => false)) {
      try {
        await firstRadio.check({ timeout: 20000 });
      } catch {
        await firstRadio.click({ force: true, timeout: 20000 });
      }
      await this.page.waitForTimeout(200);
      return;
    }

    const firstCheckbox = panel.locator('table tbody input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible({ timeout: 12000 }).catch(() => false)) {
      try {
        await firstCheckbox.check({ timeout: 15000 });
      } catch {
        await firstCheckbox.click({ force: true, timeout: 20000 });
      }
      await this.page.waitForTimeout(200);
      return;
    }

    const muiRow = panel.locator('.MuiDataGrid-row').filter({ visible: true }).first();
    if (await muiRow.isVisible({ timeout: 8000 }).catch(() => false)) {
      const rowRadio = muiRow.locator('input[type="radio"]').first();
      if (await rowRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rowRadio.click({ force: true, timeout: 15000 });
        await this.page.waitForTimeout(200);
        return;
      }
      await muiRow.click({ timeout: 20000, force: true });
      await this.page.waitForTimeout(200);
      return;
    }

    const tbodyRow = panel.locator('tbody tr').filter({ visible: true }).first();
    if (await tbodyRow.isVisible({ timeout: 8000 }).catch(() => false)) {
      const rowRadio = tbodyRow.locator('input[type="radio"]').first();
      if (await rowRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rowRadio.click({ force: true, timeout: 15000 });
        await this.page.waitForTimeout(200);
        return;
      }
      await tbodyRow.click({ timeout: 20000, force: true });
      await this.page.waitForTimeout(200);
      return;
    }

    const listItem = panel.getByRole('listitem').filter({ visible: true }).first();
    if (await listItem.isVisible({ timeout: 6000 }).catch(() => false)) {
      await listItem.click({ timeout: 20000, force: true });
      await this.page.waitForTimeout(200);
      return;
    }

    const gridRow = panel.getByRole('row').filter({ visible: true }).nth(1);
    if (await gridRow.isVisible({ timeout: 6000 }).catch(() => false)) {
      await gridRow.click({ timeout: 20000, force: true });
      await this.page.waitForTimeout(200);
      return;
    }

    const row = panel.getByRole('row').filter({ visible: true }).first();
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.click({ timeout: 20000, force: true });
    await this.page.waitForTimeout(200);
  }

  /**
   * Clicks Send (or opens send split menu) and chooses Email so the compose dialog can open.
   */
  async clickSendAndChooseEmailFromDropdown() {
    const scope = await this.resolveSendToVendorPickerPanel();
    await expect(scope).toBeVisible({ timeout: 120000 });

    const finishIfComposeAlreadyOpen = async () => {
      const open = await this.visibleComposeEmailDialog()
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (open) {
        await this.waitForComposeEmailModalReady();
        return true;
      }
      return false;
    };

    const pickEmailFromOpenMenu = async () => {
      const menu = this.page.locator('[role="menu"]').filter({ visible: true }).first();
      await menu.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});

      const emailItem = this.page
        .getByRole('menuitem', { name: /^(send\s+)?(e-?mail|email)$/i })
        .or(this.page.getByRole('option', { name: /^(e-?mail|email)$/i }))
        .filter({ visible: true })
        .first();

      if (await emailItem.isVisible({ timeout: 4000 }).catch(() => false)) {
        await emailItem.click({ timeout: 20000 });
        return true;
      }

      const loose = this.page
        .getByRole('menuitem')
        .filter({ visible: true })
        .filter({ hasText: /^(send\s+)?(e-?mail|email)$/i })
        .first();
      if (await loose.isVisible({ timeout: 3000 }).catch(() => false)) {
        await loose.click({ timeout: 20000 });
        return true;
      }

      const byText = this.page.getByText(/^email$|^e-mail$/i).filter({ visible: true }).first();
      if (await byText.isVisible({ timeout: 2000 }).catch(() => false)) {
        await byText.click({ timeout: 20000, force: true });
        return true;
      }

      return false;
    };

    const sendInScope = scope
      .getByRole('button', { name: /^send$/i })
      .filter({ visible: true });

    if ((await sendInScope.count()) > 0) {
      await sendInScope.first().click({ timeout: 20000 });
      await this.page.waitForTimeout(250);
      if (await pickEmailFromOpenMenu()) {
        await this.page.waitForLoadState('domcontentloaded');
        await this.waitForComposeEmailModalReady();
        return;
      }
      if (await finishIfComposeAlreadyOpen()) {
        return;
      }
    }

    const sendLoose = scope.getByRole('button', { name: /send/i }).filter({ visible: true });
    await expect(sendLoose.first()).toBeVisible({ timeout: 60000 });
    await sendLoose.first().click({ timeout: 20000 });
    await this.page.waitForTimeout(280);

    if (await pickEmailFromOpenMenu()) {
      await this.page.waitForLoadState('domcontentloaded');
      await this.waitForComposeEmailModalReady();
      return;
    }
    if (await finishIfComposeAlreadyOpen()) {
      return;
    }

    const splitArrow = scope
      .getByRole('button', { name: /open|expand|more|choose|menu|dropdown/i })
      .filter({ visible: true })
      .first();
    if (await splitArrow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await splitArrow.click({ timeout: 15000 });
      await this.page.waitForTimeout(200);
      if (await pickEmailFromOpenMenu()) {
        await this.page.waitForLoadState('domcontentloaded');
        await this.waitForComposeEmailModalReady();
        return;
      }
      if (await finishIfComposeAlreadyOpen()) {
        return;
      }
    }

    if (await finishIfComposeAlreadyOpen()) {
      return;
    }

    throw new Error(
      'RFQ send to vendor: could not open Email from Send dropdown (check button labels).'
    );
  }
}

module.exports = RfqSendToVendorPage;
