const PurchaseOrderDefaultTermsTemplatePoPage = require('./purchase-order-default-terms-template-po.page');
const { expect } = require('@playwright/test');

/** Create PO flow with Terms & Conditions filled before Action → Compose email. */
class PurchaseOrderTermsAndConditionsPoPage extends PurchaseOrderDefaultTermsTemplatePoPage {
  /**
   * Compact PO-specific terms (payment, delivery, line items, acceptance). Unique ref per run.
   * Terms are filled quickly via Playwright fill(). For visible keystrokes: PO_TERMS_SLOW_TYPING=1 (optional).
   */
  randomTermsAndConditionsComment() {
    const ref = `PO-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return [
      `Purchase Order ${ref} — vendor supply terms.`,
      'Payment: net 30 days from invoice.',
      'Delivery to the project site on agreed dates; title and risk pass on delivery with receipt.',
      'Scope matches line items on this PO (qty, unit, rate, description); no substitutions without written approval.',
      'Goods subject to inspection on receipt; non-conforming items may be rejected.',
    ].join(' ');
  }

  termsEditorLocator() {
    const custom = String(process.env.PO_TERMS_SELECTOR || '').trim();
    if (custom) {
      return this.page.locator(custom).first();
    }

    const termsBlock = this.page
      .locator('div')
      .filter({
        has: this.page.getByText(/terms\s*(and|&)\s*conditions?/i),
      })
      .first();

    return termsBlock
      .locator('textarea, [contenteditable="true"], .ql-editor')
      .or(termsBlock.getByRole('textbox'))
      .first();
  }

  async fillTermsEditorField(field, value) {
    const slowTyping =
      process.env.PO_TERMS_SLOW_TYPING === '1' ||
      /^true$/i.test(String(process.env.PO_TERMS_SLOW_TYPING || ''));

    await field.scrollIntoViewIfNeeded();
    await expect(field).toBeVisible({ timeout: 30000 });
    await field.click({ timeout: 10000 }).catch(async () => {
      await field.click({ force: true, timeout: 5000 });
    });

    const tag = await field.evaluate((el) => el.tagName).catch(() => '');
    const contentEditable =
      tag === 'DIV' ||
      (await field.getAttribute('contenteditable').catch(() => null)) === 'true';

    if (contentEditable) {
      await field.evaluate((el, text) => {
        el.focus();
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    } else if (slowTyping) {
      await field.fill('');
      await field.pressSequentially(value, { delay: 25 });
    } else {
      await field.fill(value);
    }

    await field.blur().catch(() => {});
  }

  async fillPurchaseOrderTermsAndConditions(text) {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    const heading = this.termsHeading();
    await this.scrollPurchaseOrderPageToRevealTermsSection(heading);
    await expect(heading).toBeVisible({ timeout: 60000 });
    await heading.scrollIntoViewIfNeeded();

    const value = String(text || '').trim();
    if (!value) {
      throw new Error('Terms and conditions text must be non-empty.');
    }

    const field = this.termsEditorLocator();
    await this.fillTermsEditorField(field, value);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

module.exports = PurchaseOrderTermsAndConditionsPoPage;
