const LeadQuestionnairePage = require('./LeadQuestionnairePage');

class AnswerQuestionnairePage extends LeadQuestionnairePage {
  constructor(page) {
    super(page);
  }

  async expectQuestionnaireAnswerSuccessMessageIfDisplayed() {
    console.log('[AnswerQuestionnairePage] Checking questionnaire answer success message');
    const toastVisible = await this.answerSuccessToast.isVisible({ timeout: 5000 }).catch(() => false);
    const genericSuccess = await this.page
      .getByText(/submitted successfully|saved successfully|questionnaire submitted|successfully submitted/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (toastVisible || genericSuccess) {
      await this.expectQuestionnaireSubmittedSuccessfully();
    } else {
      console.log('[AnswerQuestionnairePage] No success toast displayed — submission verified via list');
    }
  }

  async expectSubmittedQuestionnaireTitleAndDetailsDisplayed() {
    const title = this.selectedQuestionnaireName || this.resolveQuestionnaireName();
    console.log('[AnswerQuestionnairePage] Verifying submitted questionnaire title and details');

    await this.expectSubmittedQuestionnaireTitleAndStatusDisplayed();

    const detailsVisible = await this.page
      .locator('tr, .MuiCard-root, .MuiPaper-root, li')
      .filter({ hasText: title })
      .first()
      .isVisible()
      .catch(() => false);

    if (!detailsVisible) {
      await this.expectSubmittedQuestionnaireInAnswerByOwnTab();
    }
  }
}

module.exports = AnswerQuestionnairePage;
