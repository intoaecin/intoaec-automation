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

  termsSectionLocator() {
    return this.page
      .locator('section, div')
      .filter({
        has: this.page.getByText(/terms\s*(and|&)\s*conditions?/i),
      })
      .filter({
        has: this.page.getByRole('button', { name: /choose from template/i }),
      })
      .last();
  }

  termsEditorLocator() {
    const custom = String(process.env.PO_TERMS_SELECTOR || '').trim();
    if (custom) {
      return this.page.locator(custom).first();
    }

    const heading = this.termsHeading();
    const section = this.termsSectionLocator();

    return heading
      .locator(
        'xpath=following::*[self::textarea or @contenteditable="true" or contains(@class,"ql-editor")][1]'
      )
      .or(section.locator('.ql-editor'))
      .or(section.locator('[contenteditable="true"]'))
      .or(section.locator('textarea'))
      .or(section.getByRole('textbox'))
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
        el.innerHTML = '';
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
    await heading.click({ timeout: 5000 }).catch(() => {});

    const value = String(text || '').trim();
    if (!value) {
      throw new Error('Terms and conditions text must be non-empty.');
    }

    const field = this.termsEditorLocator();
    await expect(field).toBeVisible({ timeout: 45000 });
    await this.fillTermsEditorField(field, value);

    const snippet = value.slice(0, 40);
    await expect
      .poll(
        async () => {
          const typed =
            (await field.inputValue().catch(() => '')) ||
            (await field.innerText().catch(() => '')) ||
            '';
          return typed.replace(/\s+/g, ' ');
        },
        { timeout: 15000, intervals: [200, 400, 800] }
      )
      .toContain(snippet.slice(0, 24));

    // eslint-disable-next-line no-console
    console.log(`[PO terms] Entered terms and conditions (${value.length} chars).`);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

module.exports = PurchaseOrderTermsAndConditionsPoPage;
