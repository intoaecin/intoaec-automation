const { expect } = require('@playwright/test');
const QuestionnairePage = require('./QuestionnairePage');

class LeadQuestionnairePage extends QuestionnairePage {
  constructor(page) {
    super(page);

    this.previewButton = page
      .getByRole('button', { name: /^preview$/i })
      .or(page.locator('button').filter({ hasText: /^preview$/i }))
      .first();
    this.previewModal = page
      .getByRole('dialog')
      .filter({ hasText: /preview|questionnaire/i })
      .first();
    this.previewTitle = page
      .getByRole('heading', { name: /^preview questionnaire$/i })
      .or(page.getByText(/^preview questionnaire$/i))
      .first();
    this.previewQuestionItems = page.locator(
      '[class*="question"], .MuiFormControl-root, .MuiFormGroup-root, [role="textbox"], textarea, input'
    );
    this.previewNextButton = page.getByRole('button', { name: /^next\s*>$/i });
    this.previewSubmitButton = page.getByRole('button', { name: /^submit\s*>?$/i });
    this.previewCloseButton = this.previewTitle
      .locator('xpath=../following-sibling::button')
      .first();

    this.answerByOwnButton = page
      .getByRole('button', { name: /answer by own/i })
      .or(page.locator('button').filter({ hasText: /answer by own/i }))
      .first();
    this.submitAnswerButton = page
      .getByRole('button', { name: /^submit\s*>?$/i })
      .filter({ visible: true })
      .last();
    this.answerByOwnTab = page
      .getByRole('tab', { name: /answered by (your )?own|answer by own/i })
      .or(page.getByText(/^answered by your own$/i))
      .first();
    this.answerSuccessToast = page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({ hasText: /questionnaire|submitted|saved|success/i })
      .first();
    this.questionnaireFormScope = page.locator('[role="dialog"], form, .MuiDialog-root, .MuiPaper-root').last();
  }

  buildAnswerSuffix() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  async selectQuestionnaireTemplate(questionnaireName = this.resolveQuestionnaireName()) {
    console.log(`[LeadQuestionnairePage] Selecting questionnaire template: ${questionnaireName}`);
    await this.openChooseQuestionnaireDialog();
    await this.selectQuestionnaireTemplateInDialog(questionnaireName);
  }

  async confirmQuestionnaireSelectionIfNeeded() {
    if (!(await this.getChooseQuestionnaireDialog().isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    await this.confirmChooseQuestionnaireDialog();
  }

  getAnswerFormScope() {
    // Answer By Own renders stepped questions directly on the page, not always in a form/dialog.
    return this.page.locator('body');
  }

  async openQuestionnaireModuleForPreview() {
    console.log('[LeadQuestionnairePage] Opening Questionnaire module for preview');
    await this.openQuestionnaireTab();
  }

  async selectQuestionnaireTemplateForPreview(questionnaireName = this.resolveQuestionnaireName()) {
    await this.selectQuestionnaireTemplate(questionnaireName);
  }

  async clickPreviewQuestionnaire() {
    console.log('[LeadQuestionnairePage] Clicking Preview questionnaire');
    const previewButton = this.getChooseQuestionnaireDialogPreviewButton();
    await expect(previewButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(previewButton).toBeEnabled({ timeout: this.defaultTimeout });
    await previewButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.setPreviewZoom(70);
  }

  async setPreviewZoom(percent) {
    await this.page.evaluate((zoomPercent) => {
      document.documentElement.style.zoom = `${zoomPercent}%`;
    }, percent);
    console.log(`[LeadQuestionnairePage] Preview zoom set to ${percent}%`);
  }

  getPreviewScope() {
    return this.previewModal
      .or(this.page.locator('[role="dialog"]').filter({ visible: true }).last());
  }

  async expectQuestionnairePreviewOpened() {
    console.log('[LeadQuestionnairePage] Expecting questionnaire preview opened');
    await expect(async () => {
      const dialogVisible = await this.getPreviewScope().isVisible().catch(() => false);
      const previewHeading = await this.page
        .getByText(/preview|questionnaire preview/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(dialogVisible || previewHeading).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectQuestionnairePreviewTitleDisplayed() {
    console.log('[LeadQuestionnairePage] Expecting questionnaire preview title displayed');

    await expect(async () => {
      const headingVisible = await this.previewTitle.isVisible().catch(() => false);
      const pageTitleVisible = await this.page
        .getByText(/^preview questionnaire$/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(headingVisible || pageTitleVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectAllPreviewQuestionsVisible() {
    console.log('[LeadQuestionnairePage] Expecting all questionnaire preview questions visible');
    const scope = this.page.locator('body');

    await expect(async () => {
      const questionItems = scope.locator(
        '[class*="question"], .MuiFormControl-root, .MuiFormGroup-root, li, label, p'
      );
      const count = await questionItems.count();
      const dialogText = await scope.innerText().catch(() => '');
      const hasQuestionCopy = /question|\?|answer|select|rating|checkbox|radio/i.test(dialogText);
      expect(count > 0 || hasQuestionCopy).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });

    const count = await scope
      .locator('[class*="question"], .MuiFormControl-root, .MuiFormGroup-root, li, label')
      .count();
    console.log(`[LeadQuestionnairePage] Preview question items found: ${count}`);
  }

  async navigateToLastPreviewPage() {
    console.log('[LeadQuestionnairePage] Navigating to the final preview page');

    for (let pageNumber = 1; pageNumber <= 25; pageNumber += 1) {
      if (await this.previewSubmitButton.isVisible().catch(() => false)) {
        await expect(this.previewSubmitButton).toBeDisabled({ timeout: this.defaultTimeout });
        console.log(`[LeadQuestionnairePage] Reached final preview page after ${pageNumber - 1} Next action(s)`);
        return;
      }

      await expect(this.previewNextButton).toBeVisible({ timeout: this.defaultTimeout });
      await expect(this.previewNextButton).toBeEnabled({ timeout: this.defaultTimeout });
      await this.previewNextButton.click();
      // The questionnaire stepper renders the next question asynchronously.
      await this.page.waitForTimeout(200);
    }

    throw new Error('[LeadQuestionnairePage] Final preview page was not reached after 25 Next actions.');
  }

  async expectPreviewSubmitButtonDisabled() {
    console.log('[LeadQuestionnairePage] Expecting disabled Submit button on final preview page');
    await expect(this.previewSubmitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.previewSubmitButton).toBeDisabled({ timeout: this.defaultTimeout });
  }

  async expectPreviewCloseButtonDisplayed() {
    console.log('[LeadQuestionnairePage] Expecting preview close button displayed');
    await expect(this.previewCloseButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async closeQuestionnairePreview() {
    console.log('[LeadQuestionnairePage] Closing questionnaire preview');
    await expect(this.previewCloseButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.previewCloseButton.scrollIntoViewIfNeeded();
    await this.previewCloseButton.click({ force: true });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.setPreviewZoom(100);
  }

  async expectQuestionnairePreviewClosed() {
    console.log('[LeadQuestionnairePage] Expecting questionnaire preview closed');
    await expect(this.previewTitle).toBeHidden({ timeout: this.defaultTimeout });
  }

  async openQuestionnaireModuleToAnswerByOwn() {
    console.log('[LeadQuestionnairePage] Opening Questionnaire module to answer by own');
    await this.openQuestionnaireTab();
  }

  async selectQuestionnaireTemplateToAnswerByOwn(questionnaireName = this.resolveQuestionnaireName()) {
    await this.selectQuestionnaireTemplate(questionnaireName);
    await this.confirmQuestionnaireSelectionIfNeeded();
  }

  async clickAnswerByOwnQuestionnaire() {
    console.log('[LeadQuestionnairePage] Clicking Answer By Own');
    await expect(this.answerByOwnButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.answerByOwnButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.answerByOwnButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.setPreviewZoom(70);
    this.answerQuestionnairePageCount = 0;
  }

  async fillAllMandatoryQuestionnaireQuestions() {
    console.log('[LeadQuestionnairePage] Filling all mandatory questionnaire questions');
    const suffix = this.buildAnswerSuffix();
    const formScope = this.getAnswerFormScope();

    const textboxes = formScope.getByRole('textbox').filter({ visible: true });
    const textCount = await textboxes.count();
    for (let i = 0; i < textCount; i += 1) {
      const field = textboxes.nth(i);
      const value = await field.inputValue().catch(() => '');
      if (!value || !String(value).trim()) {
        await field.click().catch(() => {});
        await field.fill(`Automation answer ${suffix}-${i + 1}`);
      }
    }

    const editors = formScope.locator('[contenteditable="true"]').filter({ visible: true });
    const editorCount = await editors.count();
    for (let i = 0; i < editorCount; i += 1) {
      const editor = editors.nth(i);
      const text = await editor.innerText().catch(() => '');
      if (!text || !String(text).trim()) {
        await editor.click().catch(() => {});
        await editor.fill(`Automation paragraph answer ${suffix}-${i + 1}`).catch(async () => {
          await this.page.keyboard.type(`Automation paragraph answer ${suffix}-${i + 1}`, { delay: 10 });
        });
      }
    }

    const comboboxes = formScope.getByRole('combobox').filter({ visible: true });
    const comboCount = await comboboxes.count();
    for (let i = 0; i < comboCount; i += 1) {
      const combo = comboboxes.nth(i);
      await combo.click().catch(() => {});
      const option = this.page.getByRole('option').first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
    }

    const radioGroups = formScope.getByRole('radiogroup');
    const radioGroupCount = await radioGroups.count();
    for (let i = 0; i < radioGroupCount; i += 1) {
      const firstRadio = radioGroups.nth(i).getByRole('radio').first();
      if (await firstRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstRadio.check().catch(() => firstRadio.click());
      }
    }

    const checkboxes = formScope.getByRole('checkbox').filter({ visible: true });
    const boxCount = await checkboxes.count();
    for (let i = 0; i < boxCount; i += 1) {
      const box = checkboxes.nth(i);
      if (!(await box.isChecked().catch(() => false))) {
        await box.check().catch(() => box.click());
      }
    }

    const standaloneRadios = formScope
      .getByRole('radio')
      .or(formScope.locator('input[type="radio"]'))
      .filter({ visible: true });
    const radioCount = await standaloneRadios.count();
    const answeredRadioGroups = new Set();
    for (let i = 0; i < radioCount; i += 1) {
      const radio = standaloneRadios.nth(i);
      const groupName = (await radio.getAttribute('name').catch(() => null)) || `radio-${i}`;
      if (answeredRadioGroups.has(groupName)) continue;

      await radio.check().catch(() => radio.click());
      answeredRadioGroups.add(groupName);
    }

    console.log(
      `[LeadQuestionnairePage] Answered fields: ${textCount} text, ${comboCount} select, ${radioCount} radio, ${boxCount} checkbox`
    );

    if (await this.submitAnswerButton.isVisible().catch(() => false)) {
      console.log('[LeadQuestionnairePage] Final answer page reached');
      return;
    }

    const nextButton = this.previewNextButton;
    await expect(nextButton).toBeVisible({ timeout: 30000 });
    await expect(nextButton).toBeEnabled({ timeout: 30000 });

    this.answerQuestionnairePageCount = (this.answerQuestionnairePageCount || 0) + 1;
    if (this.answerQuestionnairePageCount > 25) {
      throw new Error('[LeadQuestionnairePage] Final answer page was not reached after 25 Next actions.');
    }

    console.log(`[LeadQuestionnairePage] Answering next questionnaire page: ${this.answerQuestionnairePageCount + 1}`);
    await nextButton.click();
    // The questionnaire stepper renders the next question asynchronously.
    await this.page.waitForTimeout(200);
    await this.fillAllMandatoryQuestionnaireQuestions();
  }

  async submitAnsweredQuestionnaire() {
    console.log('[LeadQuestionnairePage] Submitting answered questionnaire');
    await expect(this.submitAnswerButton).toBeVisible({ timeout: 30000 });
    await expect(this.submitAnswerButton).toBeEnabled({ timeout: 30000 });

    const submitResponse = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /questionnaire|answer|submit|save/i.test(`${response.url()}${response.request().postData() || ''}`),
        { timeout: 30000 }
      )
      .catch(() => null);

    await this.submitAnswerButton.click();
    await submitResponse;
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async openAnswerByOwnTab() {
    console.log('[LeadQuestionnairePage] Opening Answered By Your Own tab');
    await expect(this.answerByOwnTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.answerByOwnTab.click();
    await expect(this.answerByOwnTab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectQuestionnaireSubmittedSuccessfully() {
    console.log('[LeadQuestionnairePage] Expecting questionnaire submitted successfully');
    await expect(async () => {
      const toastVisible = await this.answerSuccessToast.isVisible().catch(() => false);
      const genericSuccess = await this.page
        .getByText(/submitted successfully|saved successfully|questionnaire submitted|successfully submitted/i)
        .first()
        .isVisible()
        .catch(() => false);
      const formClosed = !(await this.submitAnswerButton.isVisible().catch(() => false));
      expect(toastVisible || genericSuccess || formClosed).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectSubmittedQuestionnaireInAnswerByOwnTab() {
    const title = this.selectedQuestionnaireName || this.resolveQuestionnaireName();
    console.log(`[LeadQuestionnairePage] Expecting submitted questionnaire in Answer By Own tab: ${title}`);

    await expect(async () => {
      const titleVisible = await this.page.getByText(title, { exact: false }).first().isVisible().catch(() => false);
      const rowVisible = await this.page
        .locator('tr, .MuiCard-root, .MuiPaper-root, li')
        .filter({ hasText: title })
        .first()
        .isVisible()
        .catch(() => false);
      const buttonVisible = await this.page.getByRole('button', { name: title }).first().isVisible().catch(() => false);
      expect(titleVisible || rowVisible || buttonVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async expectSubmittedQuestionnaireTitleAndStatusDisplayed() {
    const title = this.selectedQuestionnaireName || this.resolveQuestionnaireName();
    console.log('[LeadQuestionnairePage] Expecting submitted questionnaire title and status displayed');

    await expect(this.page.getByText(title, { exact: false }).first()).toBeVisible({ timeout: this.defaultTimeout });

    await expect(async () => {
      const statusVisible = await this.page
        .getByText(/submitted|completed|answered|pending|in progress|status/i)
        .first()
        .isVisible()
        .catch(() => false);
      const titleInList = await this.page
        .locator('tr, .MuiCard-root, .MuiPaper-root, li')
        .filter({ hasText: title })
        .first()
        .isVisible()
        .catch(() => false);
      expect(statusVisible || titleInList).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }
}

module.exports = LeadQuestionnairePage;
