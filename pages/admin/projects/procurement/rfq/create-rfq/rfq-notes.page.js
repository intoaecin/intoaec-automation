const { expect } = require('@playwright/test');
const RFQComposePage = require('./rfq-compose.page');

/**
 * RFQ create: fill Notes (medium random body), then same compose email path as compose-rfq.
 */
class RfqNotesPage extends RFQComposePage {
  /** ~250–450 chars: multi-sentence procurement-style note with unique id. */
  randomMediumRfqNoteContent() {
    const id = `RFQ-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return [
      `Internal RFQ note ${id} for automation traceability.`,
      'Scope: materials, lead times, and delivery coordination with the selected vendor.',
      'Confirm unit pricing matches the line grid; flag any substitutions before award.',
      'Project team will review responses against budget and schedule constraints.',
    ].join(' ');
  }

  async fillRfqNotesFieldWithText(text) {
    const value = String(text || '').trim();
    if (!value) throw new Error('RFQ notes text must be non-empty');

    await expect(this.page).toHaveURL(/rfq\/(create|edit)/i);
    await this.waitForNetworkSettled();
    await this.dismissOpenMenusAndPopovers();

    const notesLabel = this.page
      .getByText(/^notes$/i)
      .or(this.page.getByRole('heading', { name: /notes/i }))
      .first();
    if (await notesLabel.isVisible({ timeout: 4000 }).catch(() => false)) {
      await notesLabel.scrollIntoViewIfNeeded();
    }

    let field = this.page.getByLabel(/notes?/i).first();
    if (!(await field.isVisible({ timeout: 3500 }).catch(() => false))) {
      field = this.page
        .getByPlaceholder(/note|internal|remark|comment|additional/i)
        .first();
    }
    if (!(await field.isVisible({ timeout: 3500 }).catch(() => false))) {
      field = this.page.getByRole('textbox', { name: /notes?/i }).first();
    }
    if (!(await field.isVisible({ timeout: 3500 }).catch(() => false))) {
      const anchor = this.page.getByText(/notes?/i).filter({ visible: true }).first();
      if (await anchor.isVisible({ timeout: 4000 }).catch(() => false)) {
        const ta = anchor.locator('xpath=following::textarea[1]').first();
        if (await ta.isVisible({ timeout: 2000 }).catch(() => false)) {
          field = ta;
        } else {
          field = anchor
            .locator('xpath=following::input[not(@type="hidden")][1]')
            .first();
        }
      }
    }
    if (!(await field.isVisible({ timeout: 2500 }).catch(() => false))) {
      field = this.page
        .locator('textarea[name*="note" i], textarea[aria-label*="note" i]')
        .first();
    }

    await expect(field).toBeVisible({ timeout: 60000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ timeout: 15000 });

    const contentEditable =
      (await field.getAttribute('contenteditable').catch(() => null)) === 'true';
    const tag = String(await field.evaluate((el) => el.tagName).catch(() => '')).toLowerCase();

    if (contentEditable || tag === 'div') {
      await field.evaluate((el) => {
        el.textContent = '';
      });
      await this.page.keyboard.type(value, { delay: 8 });
    } else {
      await field.fill('');
      await field.fill(value);
    }

    await this.waitForNetworkSettled();
  }

  async enterRandomMediumRfqNotes() {
    const body = this.randomMediumRfqNoteContent();
    await this.fillRfqNotesFieldWithText(body);
    return body;
  }
}

module.exports = RfqNotesPage;
