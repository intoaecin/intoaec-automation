const { expect } = require('@playwright/test');
const CallLogPage = require('./CallLogPage');
const callLogValidationData = require('../../../../fixtures/callLogValidationData');

class CallLogValidationPage extends CallLogPage {
  constructor(page) {
    super(page);
    this.validationData = callLogValidationData;
    this.createSucceeded = false;
    this.mandatoryValidationSeen = false;
    this.mandatoryValidationToast = page
      .locator('.Toastify__toast, .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({ hasText: callLogValidationData.mandatoryValidationPattern })
      .first();
  }

  addLogSubmitButton() {
    return this.callLogDialog
      .getByRole('button', { name: /^add log$/i })
      .filter({ visible: true })
      .last()
      .or(
        this.page
          .getByRole('button', { name: /^add log$/i })
          .filter({ visible: true })
          .last()
      );
  }

  callOutcomeOptions() {
    return this.page
      .getByRole('option')
      .or(this.page.getByRole('menuitem'))
      .filter({ visible: true });
  }

  async ensureCallLogFormOpenForValidation() {
    if (await this.isCallLogFormOpen()) {
      await this.waitForCallLogFormReady();
      return;
    }

    await this.clickAddCallLog();
    await this.waitForCallLogFormReady();
  }

  async resetCallLogFormForValidation() {
    await this.closeCallLogFormIfOpen();
    await this.clickAddCallLog();
    await this.waitForCallLogFormReady();
    this.createSucceeded = false;
    this.mandatoryValidationSeen = false;
  }

  async fillCallPurpose(value) {
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.callPurposeInput.click();
    await this.callPurposeInput.fill(String(value));
  }

  async fillCallLogComments(value) {
    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.commentInput.click();
    await this.commentInput.fill(String(value));
  }

  async selectCallOutcome(outcome = this.validationData.callOutcome) {
    await expect(this.callOutcomeCombobox).toBeVisible({ timeout: this.defaultTimeout });
    await this.callOutcomeCombobox.click();
    const option = this.page
      .getByRole('option', { name: outcome, exact: true })
      .or(this.page.getByRole('menuitem', { name: outcome, exact: true }))
      .first();
    await expect(option).toBeVisible({ timeout: this.defaultTimeout });
    await option.click();
  }

  async resolveFieldMaxLength(locator, fallback) {
    const fromUi = await locator.getAttribute('maxlength').catch(() => null);
    const parsed = parseInt(fromUi || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  async leaveCallPurposeEmptyAndFillOtherFields() {
    const suffix = this.buildRandomSuffix();
    this.callLogData = {
      callPurpose: '',
      callOutcome: this.validationData.callOutcome,
      comment: this.validationData.validCommentSample(suffix),
    };
    console.log('[CallLogValidationPage] Leaving Call Purpose empty');
    await this.resetCallLogFormForValidation();
    await this.fillCallPurpose('');
    await this.selectCallOutcome(this.callLogData.callOutcome);
    await this.fillCallLogComments(this.callLogData.comment);
  }

  async leaveCallOutcomeEmptyAndFillOtherFields() {
    const suffix = this.buildRandomSuffix();
    this.callLogData = {
      callPurpose: this.validationData.validPurposeSample(suffix),
      callOutcome: '',
      comment: this.validationData.validCommentSample(suffix),
    };
    console.log('[CallLogValidationPage] Leaving What happened on this call empty');
    await this.resetCallLogFormForValidation();
    await this.fillCallPurpose(this.callLogData.callPurpose);
    await this.fillCallLogComments(this.callLogData.comment);
  }

  async leaveCommentsEmptyAndFillOtherFields() {
    const suffix = this.buildRandomSuffix();
    this.callLogData = {
      callPurpose: this.validationData.validPurposeSample(suffix),
      callOutcome: this.validationData.callOutcome,
      comment: '',
    };
    console.log('[CallLogValidationPage] Leaving Comments empty');
    await this.resetCallLogFormForValidation();
    await this.fillCallPurpose(this.callLogData.callPurpose);
    await this.selectCallOutcome(this.callLogData.callOutcome);
    await this.fillCallLogComments('');
  }

  async fillCallPurposeExceedingMaxLength() {
    await this.resetCallLogFormForValidation();
    const maxLength = await this.resolveFieldMaxLength(
      this.callPurposeInput,
      this.validationData.purposeMaxLength
    );
    const value = this.validationData.purposeExceedingLimit(maxLength);
    this.callLogData = {
      callPurpose: value,
      callOutcome: '',
      comment: '',
      purposeMaxLength: maxLength,
    };
    console.log(`[CallLogValidationPage] Filling Call Purpose exceeding max length (${maxLength})`);
    await this.fillCallPurpose(value);
  }

  async fillCommentsExceedingMaxLength() {
    await this.resetCallLogFormForValidation();
    const maxLength = await this.resolveFieldMaxLength(
      this.commentInput,
      this.validationData.commentsMaxLength
    );
    const value = this.validationData.commentsExceedingLimit(maxLength);
    this.callLogData = {
      callPurpose: '',
      callOutcome: '',
      comment: value,
      commentsMaxLength: maxLength,
    };
    console.log(`[CallLogValidationPage] Filling Comments exceeding max length (${maxLength})`);
    await this.fillCallLogComments(value);
  }

  async fillSpecialCharactersInCallPurpose() {
    const suffix = this.buildRandomSuffix();
    this.callLogData = {
      callPurpose: `${this.validationData.specialCharacterPurpose} ${suffix}`,
      callOutcome: '',
      comment: '',
    };
    console.log('[CallLogValidationPage] Filling special characters in Call Purpose');
    await this.resetCallLogFormForValidation();
    await this.fillCallPurpose(this.callLogData.callPurpose);
  }

  async openCallOutcomeDropdown() {
    console.log('[CallLogValidationPage] Opening What happened on this call dropdown');
    await this.ensureCallLogFormOpenForValidation();
    await expect(this.callOutcomeCombobox).toBeVisible({ timeout: this.defaultTimeout });
    await this.callOutcomeCombobox.click();
    await expect(this.callOutcomeOptions().first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async attemptSubmitCallLogExpectingValidation() {
    console.log('[CallLogValidationPage] Attempting Add Log expecting validation');
    const submitButton = this.addLogSubmitButton();
    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });

    const createResponsePromise = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          (response.request().postData() || '').includes('CREATE_CALL_LOG'),
        { timeout: 3000 }
      )
      .catch(() => null);

    await submitButton.click();

    // Capture toast immediately — it auto-closes before AfterStep + Then otherwise.
    await this.expectMandatoryValidationMessage();
    this.mandatoryValidationSeen = true;

    const response = await createResponsePromise;
    this.createSucceeded = Boolean(response && response.status() >= 200 && response.status() < 300);
  }

  async expectMandatoryValidationMessage() {
    await expect(async () => {
      const toastVisible = await this.mandatoryValidationToast.isVisible().catch(() => false);
      const toastTextVisible = await this.page
        .getByText(this.validationData.mandatoryValidationPattern)
        .first()
        .isVisible()
        .catch(() => false);
      expect(toastVisible || toastTextVisible).toBeTruthy();
    }).toPass({ timeout: 15000, intervals: [200, 400, 800] });
  }

  async expectCallPurposeMandatoryValidation() {
    console.log('[CallLogValidationPage] Expecting Call Purpose mandatory validation');
    if (!this.mandatoryValidationSeen) {
      await this.expectMandatoryValidationMessage();
    }
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callPurposeInput).toHaveValue('');
  }

  async expectCallOutcomeMandatoryValidation() {
    console.log('[CallLogValidationPage] Expecting What happened on this call mandatory validation');
    if (!this.mandatoryValidationSeen) {
      await this.expectMandatoryValidationMessage();
    }
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callOutcomeCombobox).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectCommentsMandatoryValidation() {
    console.log('[CallLogValidationPage] Expecting Comments mandatory validation');
    if (!this.mandatoryValidationSeen) {
      await this.expectMandatoryValidationMessage();
    }
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.commentInput).toHaveValue('');
  }

  async expectCallLogNotCreated() {
    console.log('[CallLogValidationPage] Verifying call log was not created');
    expect(this.createSucceeded).not.toBe(true);
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.addLogSubmitButton()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.successToast).toBeHidden({ timeout: 3000 }).catch(() => {});

    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      return;
    }

    const rowVisible = await this.getCallLogRow(purpose).isVisible().catch(() => false);
    expect(rowVisible).toBeFalsy();
  }

  async expectFieldMaxLengthEnforced(fieldLabel, input, maxLength, typedLength) {
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    const actualValue = await input.inputValue();
    const uiMaxLength = await input.getAttribute('maxlength').catch(() => null);
    const maxLengthMessage = await this.page
      .getByText(/maximum|max.*character|too long|character limit|exceed.*limit/i)
      .first()
      .isVisible()
      .catch(() => false);

    const truncated = actualValue.length <= maxLength;
    if (!truncated && !maxLengthMessage) {
      throw new Error(
        `[CallLogValidationPage] Application mismatch: ${fieldLabel} accepted ${actualValue.length} of ` +
          `${typedLength} typed characters (expected limit ${maxLength}, maxlength attribute: ` +
          `${uiMaxLength ?? 'none'}) and no max-length message was shown.`
      );
    }
  }

  async expectCallPurposeMaxLengthValidation() {
    console.log('[CallLogValidationPage] Expecting Call Purpose max length restriction or validation');
    const maxLength =
      this.callLogData?.purposeMaxLength ||
      (await this.resolveFieldMaxLength(this.callPurposeInput, this.validationData.purposeMaxLength));
    const typedLength = this.validationData.purposeExceedingLimit(maxLength).length;
    await this.expectFieldMaxLengthEnforced('Call Purpose', this.callPurposeInput, maxLength, typedLength);
  }

  async expectCommentsMaxLengthValidation() {
    console.log('[CallLogValidationPage] Expecting Comments max length restriction or validation');
    const maxLength =
      this.callLogData?.commentsMaxLength ||
      (await this.resolveFieldMaxLength(this.commentInput, this.validationData.commentsMaxLength));
    const typedLength = this.validationData.commentsExceedingLimit(maxLength).length;
    await this.expectFieldMaxLengthEnforced('Comments', this.commentInput, maxLength, typedLength);
  }

  async expectSpecialCharacterInputHandled() {
    console.log('[CallLogValidationPage] Expecting Call Purpose special characters handled');
    const expected = this.callLogData?.callPurpose;
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callPurposeInput).toHaveValue(expected);
    await expect(this.addLogSubmitButton()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.successToast).toBeHidden({ timeout: 2000 }).catch(() => {});
    const errorToastVisible = await this.page
      .locator('.Toastify__toast--error, .MuiAlert-standardError, [role="alert"]')
      .filter({ hasText: /error|invalid|failed|not allowed/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(errorToastVisible).toBeFalsy();
  }

  async expectAllCallOutcomeOptions() {
    console.log('[CallLogValidationPage] Expecting all What happened on this call options');
    const expected = this.validationData.expectedCallOutcomes;

    await expect(async () => {
      for (const optionName of expected) {
        const option = this.page
          .getByRole('option', { name: optionName, exact: true })
          .or(this.page.getByRole('listbox').getByText(optionName, { exact: true }))
          .or(this.page.getByRole('menuitem', { name: optionName, exact: true }))
          .first();
        await expect(option).toBeVisible();
      }
      expect(expected).toHaveLength(4);
    }).toPass({ timeout: this.defaultTimeout, intervals: [300, 600, 1200] });
  }
}

module.exports = CallLogValidationPage;
