const { expect } = require('@playwright/test');
const WorkOrderActionCreatePage = require('./work-order-action-create.page');

/** Work Order create: scroll to T&C → Choose from template → first radio → Action → Create. */
class WorkOrderTermsTemplatePage extends WorkOrderActionCreatePage {
  termsHeading() {
    return this.page
      .getByText(/terms\s*(and|&)\s*conditions?/i)
      .filter({ visible: true })
      .first();
  }

  woLineItemsTableLocator() {
    return this.page
      .locator('[aria-label="WO line items table"], [aria-label="PO line items table"]')
      .first();
  }

  async scrollWorkOrderPageToRevealTermsSection() {
    const heading = this.termsHeading();

    await this.ensureWoLineItemsTableVisible().catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});

    for (let i = 0; i < 20; i += 1) {
      if (await heading.isVisible({ timeout: 800 }).catch(() => false)) {
        await heading.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }

      await this.page.evaluate(() => {
        window.scrollBy(0, Math.floor(window.innerHeight * 0.5));
      });

      const table = this.woLineItemsTableLocator();
      if (await table.isVisible({ timeout: 400 }).catch(() => false)) {
        await table.evaluate((tableEl) => {
          let node = tableEl.parentElement;
          for (let depth = 0; depth < 14 && node; depth += 1) {
            const style = window.getComputedStyle(node);
            if (
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              node.scrollHeight > node.clientHeight + 16
            ) {
              node.scrollTop = Math.min(
                node.scrollTop + Math.floor(node.clientHeight * 0.6),
                node.scrollHeight
              );
            }
            node = node.parentElement;
          }
        });
      }

      if (!this.woFastMode) {
        await this.page.waitForTimeout(80);
      }
    }

    await this.page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement;
      if (root) {
        root.scrollTop = root.scrollHeight;
      }
    });
    await heading.scrollIntoViewIfNeeded().catch(() => {});
  }

  /** Choose from template → first radio → Add (no manual T&C typing). */
  async addWorkOrderTermsFromFirstTemplate() {
    await expect(this.page).toHaveURL(/work[-_]?order\/(create|edit)/i);

    const heading = this.termsHeading();
    await this.scrollWorkOrderPageToRevealTermsSection();
    await expect(heading).toBeVisible({ timeout: this.woUiTimeout });
    await heading.scrollIntoViewIfNeeded().catch(() => {});

    await this.page.keyboard.press('Escape').catch(() => {});

    const termsBlock = this.page
      .locator('div')
      .filter({
        has: this.page.getByText(/terms\s*(and|&)\s*conditions?/i),
      })
      .filter({
        has: this.page.getByRole('button', { name: /choose from template/i }),
      })
      .first();

    let chooseTemplate = termsBlock
      .getByRole('button', { name: /choose from template/i })
      .first();
    if (!(await chooseTemplate.isVisible({ timeout: 5000 }).catch(() => false))) {
      chooseTemplate = this.page
        .getByRole('button', { name: /choose from template/i })
        .first();
    }

    await expect(chooseTemplate).toBeVisible({ timeout: this.woUiTimeout });
    await chooseTemplate.scrollIntoViewIfNeeded().catch(() => {});
    await chooseTemplate.click({ timeout: 20000, force: true });

    let modal = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (!(await modal.isVisible({ timeout: 5000 }).catch(() => false))) {
      modal = this.page.locator('.MuiModal-root').filter({ visible: true }).last();
    }
    await expect(modal).toBeVisible({ timeout: this.woUiTimeout });

    const skeleton = modal.locator('.MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 2500 }).catch(() => false)) {
      await skeleton.waitFor({
        state: 'hidden',
        timeout: this.woFastMode ? 30000 : 90000,
      });
    }

    const noData = modal.getByText(/no data found|no templates/i);
    if (await noData.isVisible({ timeout: 4000 }).catch(() => false)) {
      throw new Error(
        'WO terms template modal has no rows. Add a terms template in admin templates first.'
      );
    }

    let firstRadio = modal.getByRole('radio').first();
    if (!(await firstRadio.isVisible({ timeout: 5000 }).catch(() => false))) {
      firstRadio = modal.locator('table tbody input[type="radio"]').first();
    }
    await firstRadio.waitFor({ state: 'visible', timeout: this.woUiTimeout });
    await firstRadio.scrollIntoViewIfNeeded();
    try {
      await firstRadio.check({ timeout: 15000 });
    } catch {
      await firstRadio.click({ force: true });
    }
    await expect(firstRadio).toBeChecked({ timeout: 15000 });

    const addBtn = modal.getByRole('button', { name: /^add$/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await expect(modal).toBeHidden({ timeout: this.woUiTimeout }).catch(() => {});
    await this.waitForWoUiSettled();
    // eslint-disable-next-line no-console
    console.log('[WO terms] Added terms from first template.');
  }

  /**
   * Login → WO create → manual line item → vendor → terms template → Action → Create.
   */
  async completeWorkOrderActionCreateWithTermsTemplateJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.addWorkOrderTermsFromFirstTemplate();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → terms template → Action → Create flow finished.');
  }
}

module.exports = WorkOrderTermsTemplatePage;
