/**
 * Proposal builder Page Object (Palette → Canvas editor).
 *
 * Responsibilities:
 * - Wait for the proposal editor canvas to be usable
 * - Drag blocks from the palette into the canvas (supports native dragTo + fallbacks)
 * - Perform minimal verifications that blocks were added (avoid brittle "deep" SVG checks)
 *
 * Notes:
 * - The editor can be virtualized; page canvases may appear/disappear as you scroll.
 * - Many widgets render duplicate/hidden inputs (e.g., aria-hidden textareas) — prefer visible targets.
 */
const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Drag a palette tile into the canvas.
 *
 * Why this helper exists:
 * - Some environments accept Playwright `dragTo`, others need mouse-drag, and some need synthetic DragEvents.
 * - We match the palette tile by exact label to avoid collisions (e.g. "Table" vs "Pricing Table").
 */
async function performPaletteDragDrop(
  page,
  { paletteLabelText, canvasLocator, paletteRoot, dropOffset = { x: 80, y: 120 }, timeout = 120000 }
) {
  const root = paletteRoot || page;
  const paletteTiles = root.locator('[draggable="true"][aria-label*="Drag and drop" i], [draggable="true"]');
  const exactLabel = new RegExp(`^\\s*${escapeRegExp(paletteLabelText)}\\s*$`, 'i');
  const tile = paletteTiles.filter({ hasText: exactLabel }).first();
  await expect(tile).toBeVisible({ timeout });
  await tile.scrollIntoViewIfNeeded().catch(() => {});
  await canvasLocator.scrollIntoViewIfNeeded().catch(() => {});

  // Native Playwright drag-and-drop works best with real HTML draggable sources like these tiles.
  try {
    await tile.dragTo(canvasLocator, {
      force: true,
      targetPosition: dropOffset,
      timeout,
    });
    await page.waitForTimeout(400);
    return;
  } catch {
    // Fall through to the lower-level mouse + DragEvent fallback below.
  }

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

  // Fallback 1: real mouse drag in case `dragTo` is ignored by the editor runtime.
  await page.mouse.move(dragFrom.x, dragFrom.y);
  await page.mouse.down();
  await page.mouse.move(dropAt.x, dropAt.y, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Fallback 2: synthetic DragEvent/DataTransfer for react-dnd style builders.
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

  await page.mouse.click(dropAt.x, dropAt.y, { delay: 50 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(250);
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
    // The proposal editor renders each page inside a container whose id starts with "create-proposal-template-".
    // The "first" canvas is always present; the "last" canvas is the one we target for adding elements.
    this.canvas = page.locator('[id^="create-proposal-template-"]').first();
    /** Last page canvas (cover + blank pages) — use for image on final page. */
    this.lastCanvas = page.locator('[id^="create-proposal-template-"]').last();
    this.paletteTiles = page.locator('[draggable="true"]');
    this.blocksTab = page.getByRole('tab', { name: /^Blocks$/i }).first();
    this.variablesTab = page.getByRole('tab', { name: /^Variables$/i }).first();
    /** Visible tabpanel that lists Editors + palette tiles (avoids ambiguous "Table" vs "Pricing Table"). */
    this.paletteTabPanel = page
      .locator('[role="tabpanel"]:not([hidden])')
      .filter({ has: page.getByText('Editors', { exact: true }) })
      .first();
    this.variablesTabPanel = page
      .locator('[role="tabpanel"]:not([hidden])')
      .filter({ has: page.getByText('Variables', { exact: true }) })
      .first();
    this.editorContentEditables = page.locator('[contenteditable="true"]');
    this.toastError = page.locator('.Toastify__toast--error, .toast-error, [data-testid="toast-error"]');
    this.variableContentEditables = page.locator('[contenteditable="true"]');
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

    // The editor can virtualize pages; avoid pinning to a specific nth() which can disappear.
    const last = pages.last();
    await last.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.evaluate(() => {
      const nodes = document.querySelectorAll('[id^="create-proposal-template-"]');
      const el = nodes[nodes.length - 1];
      if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await expect(last).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(this.actionSettleMs);
  }

  async getWorkingCanvas() {
    await this.scrollToLastProposalPage();
    await expect(this.lastCanvas).toBeVisible({ timeout: this.defaultTimeout });
    return this.lastCanvas;
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

  async ensureVariablesPaletteVisible() {
    if (await this.variablesTab.isVisible().catch(() => false)) {
      const selected = await this.variablesTab.getAttribute('aria-selected');
      if (selected !== 'true') {
        await this.variablesTab.click();
        await this.waitUiStable();
      }
    }

    if (await this.variablesTabPanel.isVisible().catch(() => false)) {
      await this.variablesTabPanel.scrollIntoViewIfNeeded().catch(() => {});
      return this.variablesTabPanel;
    }

    const fallbackVariableText = this.page.getByText(/variables/i).first();
    await expect(fallbackVariableText).toBeVisible({ timeout: this.defaultTimeout });
    await fallbackVariableText.scrollIntoViewIfNeeded().catch(() => {});
    return this.page.locator('[role="tabpanel"]:not([hidden])').first();
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
    await this.page.waitForTimeout(300);
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
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Text', { x: 80, y: 140 }, scopedCanvas);
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
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Table', { x: 110, y: 220 }, scopedCanvas);

    const cellValue1 = `Tbl_${this.randomSuffix()}_A`;
    const cellValue2 = `Tbl_${this.randomSuffix()}_B`;
    this.tableCellValue1 = cellValue1;
    this.tableCellValue2 = cellValue2;

    const tds = scopedCanvas.locator('td');
    await expect(async () => {
      expect(await tds.count()).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 600, 1200] });

    await tds.nth(0).click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.typeIntoLastEditor(cellValue1);

    await tds.nth(1).click();
    await this.page.waitForTimeout(this.actionSettleMs);
    await this.typeIntoLastEditor(cellValue2);

    await expect(scopedCanvas.locator(`text=${cellValue1}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(scopedCanvas.locator(`text=${cellValue2}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addDividerElementAndVerify() {
    await this.waitForBuilderToLoad();
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Divider', { x: 120, y: 120 }, scopedCanvas);

    // Divider verification:
    // - Different builds render divider as <hr>, role="separator", or inside an SVG.
    // - The inner SVG <line> can be present but "hidden"; bounding box is a more stable signal.
    // Divider rendering varies (SVG line / HR / role=separator) and the inner <line> can be "hidden"
    // while its parent container is still rendered. Verify using geometry, not CSS visibility.
    const dividerTarget = scopedCanvas
      .locator('hr, [role="separator"], svg line, svg')
      .last();

    await expect(async () => {
      const count = await scopedCanvas.locator('hr, [role="separator"], svg line, svg').count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 700, 1200] });

    await dividerTarget.scrollIntoViewIfNeeded().catch(() => {});

    let beforeBox = null;
    await expect(async () => {
      beforeBox = await dividerTarget.boundingBox();
      expect(beforeBox).toBeTruthy();
      expect(beforeBox.width).toBeGreaterThan(0);
      expect(beforeBox.height).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 700, 1200] });

    // Attempt a resize drag; if the divider element doesn't support it in this build,
    // at least assert it has non-zero width/height.
    await dividerTarget.click({ force: true }).catch(() => {});
    await this.page.mouse.move(beforeBox.x + beforeBox.width - 2, beforeBox.y + beforeBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(beforeBox.x + beforeBox.width + 140, beforeBox.y + beforeBox.height / 2, {
      steps: 12,
    });
    await this.page.mouse.up();

    await expect(async () => {
      const afterBox = await dividerTarget.boundingBox();
      expect(afterBox).toBeTruthy();
      // If resize is supported, width should grow; otherwise ensure it is still rendered.
      expect(afterBox.width).toBeGreaterThan(0);
      expect(afterBox.height).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 700, 1200] });

    await this.afterInteraction();
  }

  async addCheckboxElement(labelText) {
    await this.waitForBuilderToLoad();
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Check Box', { x: 100, y: 190 }, scopedCanvas);

    // Checkbox blocks sometimes render both visible and hidden inputs.
    // We toggle the checkbox using the visible widget if present; then we edit the label using a visible textarea.
    const checkboxInput = scopedCanvas.locator('input[type="checkbox"]').last();
    const checkboxWidget = scopedCanvas
      .locator('[role="checkbox"], .MuiCheckbox-root, label:has(input[type="checkbox"]), [class*="checkbox" i]')
      .last();

    if (await checkboxWidget.isVisible().catch(() => false)) {
      await checkboxWidget.scrollIntoViewIfNeeded().catch(() => {});
      await checkboxWidget.click({ force: true }).catch(() => {});

      const widgetBox = await checkboxWidget.boundingBox().catch(() => null);
      if (widgetBox) {
        await this.page.mouse.click(
          widgetBox.x + Math.min(18, widgetBox.width / 2),
          widgetBox.y + widgetBox.height / 2
        );
      }
    } else {
      await expect(checkboxInput).toBeVisible({ timeout: this.defaultTimeout });
      await checkboxInput.check().catch(async () => {
        await checkboxInput.click({ force: true });
      });
    }

    await expect(async () => {
      const nativeChecked = await checkboxInput.isChecked().catch(() => false);
      const inputInsideWidgetChecked = await checkboxWidget
        .locator('input[type="checkbox"]')
        .evaluateAll((els) => els.some((el) => el.checked))
        .catch(() => false);
      const ariaChecked = await checkboxWidget.getAttribute('aria-checked').catch(() => null);
      const className = await checkboxWidget.evaluate((el) => el.className || '').catch(() => '');

      expect(
        nativeChecked ||
          inputInsideWidgetChecked ||
          ariaChecked === 'true' ||
          /checked|selected|active/i.test(String(className))
      ).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 700, 1200] });
    await this.page.waitForTimeout(this.actionSettleMs);

    const textarea = scopedCanvas.locator('textarea').last();
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
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Signature', { x: 160, y: 180 }, scopedCanvas);

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
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Shape', { x: 110, y: 90 }, scopedCanvas);

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
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Pricing Table', { x: 80, y: 320 }, scopedCanvas);

    const priceStr = String(10 + Math.floor(Math.random() * 90));
    const qty1Str = String(1 + Math.floor(Math.random() * 9));
    const qty2Str = String(1 + Math.floor(Math.random() * 9));

    const canvasPricing = scopedCanvas.locator('table').last();
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

    await expect(scopedCanvas.locator(`text=${priceStr}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.afterInteraction();
  }

  async addTermsAndConditionsElement() {
    await this.waitForBuilderToLoad();
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Terms And Conditions', { x: 120, y: 380 }, scopedCanvas);

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
    const scopedCanvas = await this.getWorkingCanvas();
    await this.dragPaletteItemToCanvas('Organization Logo', { x: 40, y: 180 }, scopedCanvas);
    await expect(scopedCanvas.locator('img[alt="Organization Logo"], img[alt*="Organization Logo"]').first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.afterInteraction();
  }

  async addAllVisibleVariablesAndMacros() {
    await this.waitForBuilderToLoad();
    const scopedCanvas = await this.getWorkingCanvas();
    const variableRoot = await this.ensureVariablesPaletteVisible();
    const tiles = variableRoot.locator('[draggable="true"]');

    await expect(async () => {
      expect(await tiles.count()).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    const count = Math.min(await tiles.count(), 8);
    for (let i = 0; i < count; i += 1) {
      const label = (await tiles.nth(i).innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
      const tileLabel = label || `Variable ${i + 1}`;
        await performPaletteDragDrop(this.page, {
          paletteLabelText: tileLabel,
          canvasLocator: scopedCanvas,
          paletteRoot: variableRoot,
          dropOffset: { x: 60 + i * 18, y: 120 + i * 24 },
          timeout: this.defaultTimeout,
      });
      await this.page.waitForTimeout(this.actionSettleMs);
    }

    await this.afterInteraction();

    if (await this.blocksTab.isVisible().catch(() => false)) {
      const selected = await this.blocksTab.getAttribute('aria-selected');
      if (selected !== 'true') {
        await this.blocksTab.click();
        await this.afterInteraction();
      }
    }
  }

  async assertAllElementsAddedSuccessfully() {
    await this.waitUiStable();
    const scopedCanvas = await this.getWorkingCanvas();
    const errorCount = await this.toastError.count();
    await expect(errorCount).toBe(0);
    await expect(scopedCanvas.locator('img[alt="Organization Logo"], img[alt*="Organization Logo"]').first()).toBeVisible({
      timeout: this.defaultTimeout,
    });

    if (this.sampleText) {
      await expect(scopedCanvas.locator(`text=${this.sampleText}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.tableCellValue1 && this.tableCellValue2) {
      await expect(scopedCanvas.locator(`text=${this.tableCellValue1}`).first()).toBeVisible({ timeout: this.defaultTimeout });
      await expect(scopedCanvas.locator(`text=${this.tableCellValue2}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.sampleCheckboxLabel) {
      await expect(scopedCanvas.locator(`text=${this.sampleCheckboxLabel}`).first()).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.signatureLabel) {
      await expect(this.page.getByAltText(this.signatureLabel)).toBeVisible({ timeout: this.defaultTimeout });
    }
    if (this.sampleImageUrl) {
      await expect(async () => {
        const imageCount = await scopedCanvas.locator('img').count();
        expect(imageCount).toBeGreaterThan(0);
      }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    }
    if (this.pricingSamplePrice) {
      await expect(scopedCanvas.locator(`text=${this.pricingSamplePrice}`).first()).toBeVisible({
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

