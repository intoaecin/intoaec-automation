// pages/admin/crm/lead-profile/QuestionnairePage.js
const BasePage = require('../../../BasePage');

class QuestionnairePage extends BasePage {
  constructor(page) {
    super(page);
    this.questionnaireTab = page.getByRole('tab', { name: 'Questionnaire' });
    this.chooseQuestionnaireButton = page.getByRole('button', { name: 'Choose Questionnaire' });
    this.chooseQuestionnaireDropdown = page.getByRole('combobox', { name: 'Choose Questionnaire *' });
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });
    this.sendViaButton = page.getByRole('button', { name: 'Send Via Send the' });
    this.emailOption = page.getByRole('menuitem', { name: 'Email' });
    this.sendEmailButton = page.getByRole('button', { name: 'Send Email' });
    this.successToast = page.getByText('Questionnaire sent successfully');
    this.sentViaEmailDropdown = page.getByRole('button', { name: 'Sent via email' });
  }

  async clickQuestionnaireTab() {
    await this.questionnaireTab.click();
  }

  async clickChooseQuestionnaireButton() {
    await this.chooseQuestionnaireButton.click();
  }

  async selectQuestionnaire(questionnaireName) {
    // 1. Click to open the dropdown
    await this.chooseQuestionnaireDropdown.click();
    
    // 2. Define the exact option we want to click
    const optionToSelect = this.page.getByRole('option', { name: questionnaireName });
    
    // 3. WAIT for the dropdown to actually open and the option to be visible before clicking!
    await optionToSelect.waitFor({ state: 'visible', timeout: 5000 });
    await optionToSelect.click();
  }

  async clickConfirmButton() {
    await this.confirmButton.click();
  }

  async clickSendViaButton() {
    await this.sendViaButton.click();
  }

  async clickEmailOption() {
    await this.emailOption.click();
  }

  async clickSendEmailButton() {
    await this.sendEmailButton.click();
  }

  async isSuccessToastVisible() {
    await this.successToast.waitFor({ state: 'visible', timeout: 10000 });
    return await this.successToast.isVisible();
  }

  async clickSentViaEmailDropdown() {
    await this.sentViaEmailDropdown.click();
  }

  async isQuestionnaireVisibleInSentDropdown(questionnaireName) {
    const questionnaire = this.page.getByRole('button', { name: questionnaireName });
    await questionnaire.waitFor({ state: 'visible', timeout: 5000 });
    return await questionnaire.isVisible();
  }

  async expandSentQuestionnaireDetails(questionnaireName) {
    await this.page.getByRole('button', { name: questionnaireName }).click();
  }
  
  async areEmailDetailsVisible() {
    const emailDetails = this.page.locator('text=Email details');
    await emailDetails.waitFor({ state: 'visible', timeout: 5000 });
    return await emailDetails.isVisible();
  }
}

module.exports = QuestionnairePage;