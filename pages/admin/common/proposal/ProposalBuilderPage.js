const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Proposal palette → canvas: synthetic DragEvent + DataTransfer (react-dnd). Exact label match (Table ≠ Pricing Table). */
async function performPaletteDragDrop(
  page,
  { paletteLabelText, canvasLocator, paletteRoot, dropOffset = { x: 80, y: 120 }, timeout = 120000 }
) {
  const root = paletteRoot || page;
  const paletteTiles = root.locator('[draggable="true"]');
  const exactLabel = new RegExp(`^\\s*${escapeRegExp(paletteLabelText)}\\s*$`, 'i');
  const tile = paletteTiles.filter({ hasText: exactLabel }).first();
  await expect(tile).toBeVisible({ timeout });

  const sourceBox = await tile.boundingBox();
  const targetBox = await canvasLocator.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('Unable to locate bounding boxes for drag and drop');
  }

  const dragFrom = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const dropAt = {
    x: targetBox.x + dropOffset.x,
    y: targetBox.y + dropOffset.y,
  };

  await page.evaluate(
    ({ from, to }) => {
      const fromEl = document.elementFromPoint(from.x, from.y);
      const toEl = document.elementFromPoint(to.x, to.y);
      if (!fromEl || !toEl) return;

      const dataTransfer = new DataTransfer();
      fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
      toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer }));
    },
    { from: dragFrom, to: dropAt }
  );

  await page.mouse.click(dropAt.x, dropAt.y);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
}

class ProposalBuilderPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.actionSettleMs = 250;
    this.sampleText = null;
    this.sampleImageUrl = null;
    this.sampleCheckboxLabel = null;
    this.signatureLabel = null;
    this.tableCellValue1 = null;
    this.tableCellValue2 = null;
    this.pricingSamplePrice = null;
    this.pricingSampleQty1 = null;
    this.pricingSampleQty2 = null;

    this.addCoverPageButton = page.getByRole('button', { name: /add cover page/i });
    this.addBlankPageButton = page.getByRole('button', { name: /add blank page/i });
    this.canvas = page.locator('[id^="create-proposal-template-"]').first();
    /** Last page canvas (cover + blank pages) — use for image on final page. */
    this.lastCanvas = page.locator('[id^="create-proposal-template-"]').last();
    this.paletteTiles = page.locator('[draggable="true"]');
    /** Visible tabpanel that lists Editors + palette tiles (avoids ambiguous "Table" vs "Pricing Table"). */
    this.paletteTabPanel = page
      .locator('[role="tabpanel"]:not([hidden])')
      .filter({ has: page.getByText('Editors', { exact: true }) })
      .first();
    this.editorContentEditables = page.locator('[contenteditable="true"]');
    this.toastError = page.locator('.Toastify__toast--error, .toast-error, [data-testid="toast-error"]');
  }

  /** Baseline wait after navigation / heavy UI updates. */
  async waitUiStable() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  }

  /** After clicks, drags, modals — keep canvas reachable for the next action. */
  async afterInteraction() {
    await this.waitUiStable();
    await expect(this.canvas).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);
  }

  async waitForBuilderToLoad() {
    await this.waitUiStable();
    await expect(this.canvas).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);
  }

  randomSuffix() {
    return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /** Scroll the designer so the last proposal page is in view (virtualized / long documents). */
  async scrollToLastProposalPage() {
    await this.waitForBuilderToLoad();
    const pages = this.page.locator('[id^="create-proposal-template-"]');
    await expect(async () => {
      expect(await pages.count()).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [400, 800, 1500] });

    const count = await pages.count();
    const last = pages.nth(count - 1);
    await last.scrollIntoViewIfNeeded();
    await this.page.evaluate(() => {
      const nodes = document.querySelectorAll('[id^="create-proposal-template-"]');
      const el = nodes[nodes.length - 1];
      if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await expect(last).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);
  }

  async resolvePaletteRoot() {
    if (await this.paletteTabPanel.isVisible().catch(() => false)) {
      return this.paletteTabPanel;
    }

    const visibleTabPanel = this.page.locator('[role="tabpanel"]:not([hidden])').first();
    if (await visibleTabPanel.isVisible().catch(() => false)) {
      return visibleTabPanel;
    }

    return this.page;
  }

  async dragPaletteItemToCanvas(paletteLabelText, dropOffset = { x: 80, y: 120 }, canvasLocator = null) {
    const target = canvasLocator || this.canvas;
    const paletteRoot = await this.resolvePaletteRoot();
    await performPaletteDragDrop(this.page, {
      paletteLabelText,
      canvasLocator: target,
      paletteRoot,
      dropOffset,
      timeout: this.defaultTimeout,
    });
    await this.afterInteraction();
  }

  async addCoverPage() {
    await expect(this.addCoverPageButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addCoverPageButton.click();
    await this.afterInteraction();
  }

  async addBlankPage() {
    await expect(this.addBlankPageButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addBlankPageButton.click();
    await this.afterInteraction();
  }

  async typeIntoLastEditor(text) {
    await expect(this.editorContentEditables.first()).toBeVisible({ timeout: this.defaultTimeout });
    const editor = this.editorContentEditables.last();
    await editor.click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(text, { delay: 15 });
    await this.page.waitForTimeout(this.actionSettleMs);
    await editor.press('Escape');
    await this.afterInteraction();
  }

  async addTextElement(text) {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Text');
    this.sampleText = text;
    await this.typeIntoLastEditor(text);
  }

  async addTextElementWithRandomSample() {
    const text = `Proposal text ${this.randomSuffix()}`;
    await this.addTextElement(text);
  }

  async addImageElementByUrl(url) {
    await this.scrollToLastProposalPage();
    const scopedCanvas = this.lastCanvas;
    const existingCanvasImageCount = await scopedCanvas.locator('img').count();
    await this.dragPaletteItemToCanvas('Image', { x: 60, y: 160 }, scopedCanvas);
    this.sampleImageUrl = url;

    const uploadPlaceholder = scopedCanvas
      .locator('div')
      .filter({ hasText: /click here to upload image|upload image|upload photos|drop them here/i })
      .last();
    await expect(uploadPlaceholder).toBeVisible({ timeout: this.defaultTimeout });
    await uploadPlaceholder.dblclick();
    await this.waitUiStable();

    const modal = this.page.locator('[role="dialog"]').filter({ hasText: /select image|image gallery|image url/i }).first();
    await expect(modal).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);

    const imageUrlTab = modal.getByRole('tab', { name: /image url/i }).first();
    if (await imageUrlTab.isVisible().catch(() => false)) {
      await imageUrlTab.click();
      await this.page.waitForTimeout(this.actionSettleMs);
    }

    const urlInput = modal.getByLabel(/enter url/i).or(modal.locator('input').first());
    await expect(urlInput).toBeVisible({ timeout: this.defaultTimeout });
    await urlInput.fill(url);
    await this.page.waitForTimeout(this.actionSettleMs);

    await modal.getByRole('button', { name: /insert/i }).click();
    await this.waitUiStable();

    const uploadButton = modal.getByRole('button', { name: /^upload$/i });
    await expect(uploadButton).toBeEnabled({ timeout: this.defaultTimeout });
    await uploadButton.click();
    await expect(modal).toBeHidden({ timeout: this.defaultTimeout });
    await expect(async () => {
      const nextCount = await scopedCanvas.locator('img').count();
      expect(nextCount).toBeGreaterThan(existingCanvasImageCount);
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    await this.afterInteraction();
  }

  async addTableElementWithSampleRows() {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Table', { x: 40, y: 220 });

    const cellValue1 = `Tbl_${this.randomSuffix()}_A`;
    const cellValue2 = `Tbl_${this.randomSuffix()}_B`;
    this.tableCellValue1 = cellValue1;
    this.tableCellValue2 = cellValue2;

    const tds = this.canvas.locator('td');
    await expect(async () => {
      expect(await tds.count()).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 600, 1200] });

    await tds.nth(0).click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.typeIntoLastEditor(cellValue1);

    await tds.nth(1).click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.typeIntoLastEditor(cellValue2);

    await expect(this.canvas.locator(`text=${cellValue1}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.canvas.locator(`text=${cellValue2}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addDividerElementAndVerify() {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Divider', { x: 120, y: 120 });
    const rotationButton = this.canvas.locator('button').filter({ hasText: /°/ }).first();
    await expect(rotationButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addCheckboxElement(labelText) {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Check Box', { x: 100, y: 190 });

    const checkbox = this.canvas.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    await checkbox.check();
    await this.page.waitForTimeout(this.actionSettleMs);

    const textarea = this.canvas.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: this.defaultTimeout });
    await textarea.click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.page.keyboard.press('Control+A');
    await textarea.type(labelText, { delay: 15 });
    await this.page.waitForTimeout(this.actionSettleMs);
    await textarea.press('Escape');
    this.sampleCheckboxLabel = labelText;
    await this.afterInteraction();
  }

  async addCheckboxWithRandomLabel() {
    const label = `Automation consent ${this.randomSuffix()}`;
    await this.addCheckboxElement(label);
  }

  async addSignatureElementChoosing(type) {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Signature', { x: 160, y: 180 });

    const modal = this.page.locator('[role="dialog"]').filter({ hasText: /choose the signature/i }).first();
    await expect(modal).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);

    const radioLabel = type === 'ADMIN' ? 'Architect Signature' : 'Lead Signature';
    this.signatureLabel = radioLabel;
    const radio = modal.getByRole('radio', { name: radioLabel });
    await expect(radio).toBeVisible({ timeout: this.defaultTimeout });
    await radio.click();
    await this.page.waitForTimeout(this.actionSettleMs);

    await modal.getByRole('button', { name: /^add$/i }).click();
    await expect(modal).toBeHidden({ timeout: this.defaultTimeout });
    await this.waitUiStable();
    await expect(this.page.getByAltText(radioLabel)).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addShapeElementAndApplyRandomColor() {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Shape', { x: 110, y: 90 });

    const shapeSelect = this.page.getByRole('combobox', { name: /^Shape$/ }).first();
    await expect(shapeSelect).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);

    // ShapeEditorToolbar: Background Color = PaintBucket IconButton (templateCenter.proposal.backgroundColor).
    const bgFillButton = this.page.locator('button:has(svg.lucide-paint-bucket)').first();
    if (await bgFillButton.isVisible().catch(() => false)) {
      await bgFillButton.click();
    } else {
      await this.page.getByRole('button', { name: /background color/i }).click().catch(async () => {
        const box = await shapeSelect.boundingBox();
        if (!box) throw new Error('Shape toolbar: no background color control');
        await this.page.mouse.click(box.x + box.width + 40, box.y + box.height / 2);
      });
    }
    await this.page.waitForTimeout(this.actionSettleMs);

    const picker = this.page.locator('.chrome-picker').first();
    await expect(picker).toBeVisible({ timeout: this.defaultTimeout });
    const pickerBox = await picker.boundingBox();
    if (pickerBox) {
      await this.page.mouse.click(
        pickerBox.x + pickerBox.width * 0.72,
        pickerBox.y + pickerBox.height * 0.45
      );
    }
    await this.page.waitForTimeout(400);
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.afterInteraction();
  }

  async addPricingTableElementAndFillSampleValues() {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Pricing Table', { x: 80, y: 320 });

    const priceStr = String(10 + Math.floor(Math.random() * 90));
    const qty1Str = String(1 + Math.floor(Math.random() * 9));
    const qty2Str = String(1 + Math.floor(Math.random() * 9));

    const canvasPricing = this.canvas.locator('table').first();
    const priceArea = canvasPricing.locator('textarea').first();
    await expect(priceArea).toBeVisible({ timeout: this.defaultTimeout });
    await priceArea.click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.page.keyboard.press('Control+A');
    await priceArea.type(priceStr, { delay: 15 });
    await priceArea.press('Escape');
    this.pricingSamplePrice = priceStr;
    await this.page.waitForTimeout(this.actionSettleMs);

    const numberInputs = canvasPricing.locator('input[type="number"]');
    const count = await numberInputs.count();
    if (count > 0) {
      await numberInputs.nth(0).click();
      await this.page.waitForTimeout(this.actionSettleMs);
      await this.page.keyboard.press('Control+A');
      await numberInputs.nth(0).type(qty1Str, { delay: 15 });
      await numberInputs.nth(0).press('Escape');
      this.pricingSampleQty1 = qty1Str;
      await this.page.waitForTimeout(this.actionSettleMs);
    }
    if (count > 1) {
      await numberInputs.nth(1).click();
      await this.page.waitForTimeout(this.actionSettleMs);
      await this.page.keyboard.press('Control+A');
      await numberInputs.nth(1).type(qty2Str, { delay: 15 });
      await numberInputs.nth(1).press('Escape');
      this.pricingSampleQty2 = qty2Str;
      await this.page.waitForTimeout(this.actionSettleMs);
    }

    await expect(this.canvas.locator(`text=${priceStr}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addTermsAndConditionsElement() {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Terms And Conditions', { x: 120, y: 380 });

    const modal = this.page.locator('[role="dialog"]').filter({ hasText: /add terms and conditions/i }).first();
    await expect(modal).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);

    const firstRadio = modal.locator('input[type="radio"]').first();
    await expect(firstRadio).toBeVisible({ timeout: this.defaultTimeout });
    await firstRadio.click();
    await this.page.waitForTimeout(this.actionSettleMs);

    await modal.getByRole('button', { name: /^add$/i }).click();
    await expect(modal).toBeHidden({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addOrganizationLogoElementAndVerify() {
    await this.waitForBuilderToLoad();
    await this.dragPaletteItemToCanvas('Organization Logo', { x: 40, y: 180 });
    await expect(this.page.getByAltText('Organization Logo')).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async assertAllElementsAddedSuccessfully() {
    await this.waitUiStable();
    const errorCount = await this.toastError.count();
    await expect(errorCount).toBe(0);
    await expect(this.page.getByAltText('Organization Logo')).toBeVisible({ timeout: this.defaultTimeout });

    if (this.sampleText) {
      await expect(this.canvas.locator(`text=${this.sampleText}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.tableCellValue1 && this.tableCellValue2) {
      await expect(this.canvas.locator(`text=${this.tableCellValue1}`).first()).toBeVisible({ timeout: this.defaultTimeout });
      await expect(this.canvas.locator(`text=${this.tableCellValue2}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.sampleCheckboxLabel) {
      await expect(this.canvas.locator(`text=${this.sampleCheckboxLabel}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.signatureLabel) {
      await expect(this.page.getByAltText(this.signatureLabel)).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.sampleImageUrl) {
      await expect(async () => {
        const imageCount = await this.canvas.locator('img').count();
        expect(imageCount).toBeGreaterThan(0);
      }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    }
    if (this.pricingSamplePrice) {
      await expect(this.canvas.locator(`text=${this.pricingSamplePrice}`).first()).toBeVisible({
        timeout: this.defaultTimeout,
      });
    }
    await this.afterInteraction();
  }

  async assertNoUiErrors() {
    await this.waitUiStable();
    const errorCount = await this.toastError.count();
    if (errorCount > 0) {
      throw new Error(`UI errors detected: ${errorCount} error toast(s)`);
    }
    await this.page.waitForTimeout(this.actionSettleMs);
  }

  async tryClickEditorPreviewIcon() {
    const previewBtn = this.page.getByRole('button', { name: /preview/i }).first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await this.waitUiStable();
      await this.page.waitForTimeout(this.actionSettleMs);
    }
  }
}

module.exports = ProposalBuilderPage;
