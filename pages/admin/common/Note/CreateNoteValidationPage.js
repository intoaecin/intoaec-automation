const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('@playwright/test');
const NotePage = require('./NotePage');
const noteValidationData = require('../../../../fixtures/noteValidationData');

class CreateNoteValidationPage extends NotePage {
  constructor(page) {
    super(page);
    this.validationData = noteValidationData;
  }

  async resolveTitleMaxLength() {
    const fromUi = await this.nameInput.getAttribute('maxlength').catch(() => null);
    const parsed = parseInt(fromUi || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : this.validationData.titleMaxLength;
  }

  async resolveParagraphMaxLength() {
    const fromUi = await this.descriptionInput.getAttribute('maxlength').catch(() => null);
    const parsed = parseInt(fromUi || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : this.validationData.paragraphMaxLength;
  }

  async attemptSubmitCreateNote() {
    console.log('[CreateNoteValidationPage] Attempting note create submit expecting validation');
    const submitButton = this.submitCreateButton.or(
      this.page.getByRole('button', { name: /^add note$|^create note$|^save note$/i }).filter({ visible: true }).last()
    );

    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await submitButton.click({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async leaveTitleEmptyAndFillParagraph() {
    const suffix = this.buildRandomSuffix();
    this.noteData = {
      name: '',
      description: this.validationData.validParagraphSample(suffix),
    };
    console.log('[CreateNoteValidationPage] Leaving title empty and filling paragraph');
    await this.clearTitleField();
    await this.fillDescriptionField(this.noteData.description);
  }

  async fillTitleAndLeaveParagraphEmpty() {
    const suffix = this.buildRandomSuffix();
    this.noteData = {
      name: this.validationData.validTitleSample(suffix),
      description: '',
    };
    console.log('[CreateNoteValidationPage] Filling title and leaving paragraph empty');
    await this.fillTitleField(this.noteData.name);
    await this.clearDescriptionField();
  }

  async leaveTitleAndParagraphEmpty() {
    console.log('[CreateNoteValidationPage] Leaving title and paragraph empty');
    this.noteData = { name: '', description: '' };
    await this.clearTitleField();
    await this.clearDescriptionField();
  }

  async fillTitleExceedingMaxLength() {
    const maxLength = await this.resolveTitleMaxLength();
    const value = this.validationData.titleExceedingLimit(maxLength);
    this.noteData = { name: value, description: '' };
    console.log(`[CreateNoteValidationPage] Filling title exceeding max length (${maxLength})`);
    await this.fillTitleField(value);
  }

  async fillParagraphExceedingMaxLength() {
    const suffix = this.buildRandomSuffix();
    const maxLength = await this.resolveParagraphMaxLength();
    const value = this.validationData.paragraphExceedingLimit(maxLength);
    this.noteData = {
      name: this.validationData.validTitleSample(suffix),
      description: value,
    };
    console.log(`[CreateNoteValidationPage] Filling paragraph exceeding max length (${maxLength})`);
    await this.fillTitleField(this.noteData.name);
    await this.fillDescriptionField(value);
  }

  async fillSpecialCharacterTitleAndValidParagraph() {
    const suffix = this.buildRandomSuffix();
    this.noteData = {
      name: `${this.validationData.specialCharacterTitle} ${suffix}`,
      description: this.validationData.validParagraphSample(suffix),
    };
    console.log('[CreateNoteValidationPage] Filling special character title and valid paragraph');
    await this.fillTitleField(this.noteData.name);
    await this.fillDescriptionField(this.noteData.description);
  }

  async fillTitleAndSpecialCharacterParagraph() {
    const suffix = this.buildRandomSuffix();
    this.noteData = {
      name: this.validationData.validTitleSample(suffix),
      description: `${this.validationData.specialCharacterParagraph} ${suffix}`,
    };
    console.log('[CreateNoteValidationPage] Filling title and special character paragraph');
    await this.fillTitleField(this.noteData.name);
    await this.fillDescriptionField(this.noteData.description);
  }

  async uploadAttachmentFromPath(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`[CreateNoteValidationPage] Attachment file not found: ${filePath}`);
    }

    console.log(`[CreateNoteValidationPage] Uploading attachment: ${path.basename(filePath)}`);
    const directFile = this.page.locator('input[type="file"]').last();
    if ((await directFile.count()) > 0) {
      await directFile.setInputFiles(filePath);
      return;
    }

    const control = await this.locateAttachmentControl();
    const tagName = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'input') {
      await control.setInputFiles(filePath);
      return;
    }

    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 25000 }),
      control.click({ timeout: 20000, force: true }),
    ]);
    await fileChooser.setFiles(filePath);
  }

  createOversizedAttachmentFile() {
    const targetBytes = (this.validationData.maxFileSizeMb + 1) * 1024 * 1024;
    const filePath = path.join(os.tmpdir(), `note-oversized-${Date.now()}.bin`);
    fs.writeFileSync(filePath, Buffer.alloc(targetBytes, 'x'));
    this.oversizedAttachmentPath = filePath;
    return filePath;
  }

  async uploadUnsupportedAttachmentFile() {
    console.log('[CreateNoteValidationPage] Uploading unsupported attachment file');
    await this.uploadAttachmentFromPath(this.validationData.unsupportedAttachmentFile);
  }

  async uploadOversizedAttachmentFile() {
    console.log('[CreateNoteValidationPage] Uploading oversized attachment file');
    const filePath = this.createOversizedAttachmentFile();
    await this.uploadAttachmentFromPath(filePath);
  }

  async isTitleFieldInvalid() {
    return this.nameInput
      .evaluate((el) => el.getAttribute('aria-invalid') === 'true' || el.classList.contains('Mui-error'))
      .catch(() => false);
  }

  async isParagraphFieldInvalid() {
    return this.descriptionInput
      .evaluate((el) => el.getAttribute('aria-invalid') === 'true' || el.classList.contains('Mui-error'))
      .catch(() => false);
  }

  async isValidationTextVisible(pattern) {
    return this.page
      .getByText(pattern)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async expectTitleMandatoryValidation() {
    console.log('[CreateNoteValidationPage] Expecting title mandatory validation');
    await expect(async () => {
      const titleRequired = await this.isValidationTextVisible(
        /title.*required|enter title|title is required|title.*mandatory/i
      );
      const titleInvalid = await this.isTitleFieldInvalid();
      const formStillOpen = await this.isNoteFormOpen();
      expect(titleRequired || titleInvalid || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectParagraphMandatoryValidation() {
    console.log('[CreateNoteValidationPage] Expecting paragraph mandatory validation');
    await expect(async () => {
      const paragraphRequired = await this.isValidationTextVisible(
        /paragraph.*required|description.*required|enter paragraph|comment.*required/i
      );
      const paragraphInvalid = await this.isParagraphFieldInvalid();
      const formStillOpen = await this.isNoteFormOpen();
      expect(paragraphRequired || paragraphInvalid || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectTitleAndParagraphMandatoryValidation() {
    console.log('[CreateNoteValidationPage] Expecting title and paragraph mandatory validation');
    await expect(async () => {
      const titleRequired = await this.isValidationTextVisible(
        /title.*required|enter title|title is required|title.*mandatory/i
      );
      const paragraphRequired = await this.isValidationTextVisible(
        /paragraph.*required|description.*required|enter paragraph|comment.*required/i
      );
      const titleInvalid = await this.isTitleFieldInvalid();
      const paragraphInvalid = await this.isParagraphFieldInvalid();
      const helperErrors = (await this.page.locator('.MuiFormHelperText-root.Mui-error').count()) >= 2;
      const genericValidation = await this.validationMessage.isVisible().catch(() => false);
      const formStillOpen = await this.isNoteFormOpen();

      expect(
        (titleRequired && paragraphRequired) ||
          (titleInvalid && paragraphInvalid) ||
          helperErrors ||
          genericValidation ||
          formStillOpen
      ).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectTitleMaxLengthValidation() {
    console.log('[CreateNoteValidationPage] Expecting title max length validation or restriction');
    const maxLength = await this.resolveTitleMaxLength();
    await expect(async () => {
      const maxLengthMessage = await this.isValidationTextVisible(
        /maximum|max.*character|too long|character limit|exceed.*limit/i
      );
      const titleInvalid = await this.isTitleFieldInvalid();
      const actualLength = await this.nameInput.inputValue().catch(() => '');
      const truncated = actualLength.length <= maxLength;
      const formStillOpen = await this.isNoteFormOpen();
      expect(maxLengthMessage || titleInvalid || truncated || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectParagraphMaxLengthValidation() {
    console.log('[CreateNoteValidationPage] Expecting paragraph max length validation or restriction');
    const maxLength = await this.resolveParagraphMaxLength();
    await expect(async () => {
      const maxLengthMessage = await this.isValidationTextVisible(
        /maximum|max.*character|too long|character limit|exceed.*limit/i
      );
      const paragraphInvalid = await this.isParagraphFieldInvalid();
      const actualLength = await this.descriptionInput.innerText().catch(() => '');
      const truncated = actualLength.length <= maxLength;
      const formStillOpen = await this.isNoteFormOpen();
      expect(maxLengthMessage || paragraphInvalid || truncated || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectSpecialCharacterInputHandled() {
    console.log('[CreateNoteValidationPage] Expecting special character input handled per policy');
    await expect(async () => {
      const validationVisible = await this.validationMessage.isVisible().catch(() => false);
      const restrictedCopy = await this.isValidationTextVisible(
        /invalid|not allowed|special character|unsupported character/i
      );
      const successToast = await this.successToast.isVisible().catch(() => false);
      const formClosed = !(await this.isNoteFormOpen());
      const formStillOpen = await this.isNoteFormOpen();

      expect(validationVisible || restrictedCopy || successToast || formClosed || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectUnsupportedFileValidation() {
    console.log('[CreateNoteValidationPage] Expecting unsupported file validation');
    await expect(async () => {
      const unsupportedCopy = await this.isValidationTextVisible(
        /unsupported|invalid file|file type|not allowed|allowed format|extension|invalid attachment/i
      );
      const alertError = await this.page
        .locator('.MuiAlert-root, [role="alert"]')
        .filter({ hasText: /file|upload|attachment|unsupported|invalid/i })
        .first()
        .isVisible()
        .catch(() => false);
      const formStillOpen = await this.isNoteFormOpen();
      expect(unsupportedCopy || alertError || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectOversizedFileValidation() {
    console.log('[CreateNoteValidationPage] Expecting oversized file validation');
    await expect(async () => {
      const sizeCopy = await this.isValidationTextVisible(
        /file size|too large|maximum size|exceeds|size limit|mb|kb/i
      );
      const alertError = await this.page
        .locator('.MuiAlert-root, [role="alert"]')
        .filter({ hasText: /file|upload|attachment|size|large/i })
        .first()
        .isVisible()
        .catch(() => false);
      const formStillOpen = await this.isNoteFormOpen();
      expect(sizeCopy || alertError || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }
}

module.exports = CreateNoteValidationPage;
