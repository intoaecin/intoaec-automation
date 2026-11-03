// pages/admin/crm/questionnaire/CRMResponsePage.js
const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const QuestionnairePage = require('./QuestionnairePage');

/** CRM side of a sent questionnaire: Sent via email card status, Resend and View Response. */
class CRMResponsePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.questionnairePage = new QuestionnairePage(page);

    this.responseDialog = page.getByRole('dialog').filter({ hasText: /lead answered response/i }).last();
    this.resendMenu = page.locator('#send-menu').getByRole('menu');

    this.latestSentQuestionnaire = null;
  }

  isSentQuestionnaireListResponse(response) {
    const request = response.request();
    if (request.method() !== 'POST' || !/\/fetch(\?|$)/.test(response.url())) {
      return false;
    }
    const body = request.postData() || '';
    return body.includes('GET_ANSWER_QUESTIONNAIRE') && /"isSent"\s*:\s*true/.test(body);
  }

  /**
   * Reloads the lead profile, opens Questionnaire → Sent via email and records the newest sent
   * questionnaire from the list API (sorted by updatedAt DESC, same order as the cards).
   */
  async reloadSentViaEmailList(questionnaireName) {
    console.log('[CRMResponsePage] Reloading the lead Sent via email list');
    await this.page.bringToFront();

    // Settled immediately so a page closed mid-step cannot surface as an unhandled rejection.
    const listResponse = this.page
      .waitForResponse((response) => this.isSentQuestionnaireListResponse(response), {
        timeout: this.defaultTimeout,
      })
      .then(
        (response) => ({ response }),
        (error) => ({ error })
      );

    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.questionnairePage.openQuestionnaireModuleFromClientMenu();
    this.questionnairePage.selectedQuestionnaireName = questionnaireName;
    await this.questionnairePage.openSentViaTab();

    const { response, error } = await listResponse;
    if (error) throw error;
    const payload = await response.json();
    const items = payload?.body?.result ?? [];
    expect(items.length, 'Sent via email list API returned no questionnaires').toBeGreaterThan(0);

    const latest = items[0];
    this.latestSentQuestionnaire = {
      questionnaireId: latest.questionnaireId,
      title: latest.title,
      expiry: latest.expiry ? Number(latest.expiry) : null,
      isSubmitted: Boolean(latest.isSubmitted),
    };
    console.log(`[CRMResponsePage] Latest sent questionnaire: ${JSON.stringify(this.latestSentQuestionnaire)}`);
    return this.latestSentQuestionnaire;
  }

  async recordLatestSentQuestionnaire(questionnaireName) {
    const latest = await this.reloadSentViaEmailList(questionnaireName);
    expect(latest.questionnaireId, 'Latest sent questionnaire has no questionnaireId').toBeTruthy();
    expect(latest.isSubmitted, 'A freshly sent questionnaire should not be submitted yet').toBe(false);
    return latest;
  }

  expectManualExpiryWithin(minutes, sentAt) {
    const latest = this.requireLatestSentQuestionnaire();
    expect(latest.expiry, 'Sent questionnaire has no expiry timestamp').toBeTruthy();

    const expectedMs = minutes * 60 * 1000;
    const toleranceMs = 90 * 1000;
    const delta = latest.expiry - sentAt;
    console.log(`[CRMResponsePage] Expiry is ${Math.round(delta / 1000)}s after the send`);
    expect(delta).toBeGreaterThan(0);
    expect(Math.abs(delta - expectedMs)).toBeLessThanOrEqual(toleranceMs);
  }

  requireLatestSentQuestionnaire() {
    if (!this.latestSentQuestionnaire) {
      throw new Error('[CRMResponsePage] No sent questionnaire recorded. Reload the Sent via email list first.');
    }
    return this.latestSentQuestionnaire;
  }

  async waitUntilLatestSentQuestionnaireExpires() {
    const { expiry } = this.requireLatestSentQuestionnaire();
    expect(expiry, 'Sent questionnaire has no expiry timestamp').toBeTruthy();
    const waitMs = Math.max(0, expiry - Date.now()) + 5000;
    console.log(`[CRMResponsePage] Waiting ${Math.round(waitMs / 1000)}s for the questionnaire link to expire`);
    await expect
      .poll(() => Date.now() > expiry, { timeout: waitMs + 10000, intervals: [5000] })
      .toBeTruthy();
  }

  async getLatestSentCard() {
    const panel = await this.questionnairePage.getSentViaEmailTabPanel();
    const card = panel.locator('.MuiAccordion-root').first();
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    return card;
  }

  async expectLatestCardStatus(status, questionnaireName) {
    console.log(`[CRMResponsePage] Expecting the latest Sent via email card to show "${status}"`);
    const card = await this.getLatestSentCard();
    const summary = card.locator('.MuiAccordionSummary-root').first();
    await expect(summary).toContainText(questionnaireName, { timeout: this.defaultTimeout });
    await expect(summary.getByText(new RegExp(`^\\s*${status}\\s*$`, 'i'))).toBeVisible({
      timeout: this.defaultTimeout,
    });

    const latest = this.requireLatestSentQuestionnaire();
    if (/^responded$/i.test(status)) {
      expect(latest.isSubmitted, 'List API does not report the questionnaire as submitted').toBe(true);
    }
    if (/^expired$/i.test(status)) {
      expect(latest.isSubmitted).toBe(false);
      expect(latest.expiry).toBeLessThan(Date.now());
    }
  }

  async expectResendAvailableOnLatestCard() {
    console.log('[CRMResponsePage] Expecting Resend to be available on the expired questionnaire');
    const card = await this.getLatestSentCard();
    const resendButton = card.getByRole('button', { name: /^resend$/i });
    await expect(resendButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(resendButton).toBeEnabled();

    await this.questionnairePage.hideFreshchatWidget();
    await resendButton.click();
    await expect(this.resendMenu).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.resendMenu.getByRole('menuitem', { name: /^email$/i })).toBeVisible();

    await this.page.keyboard.press('Escape');
    await expect(this.resendMenu).toBeHidden({ timeout: this.defaultTimeout });
  }

  async openViewResponseOnLatestCard() {
    console.log('[CRMResponsePage] Opening View Response on the latest Sent via email card');
    const card = await this.getLatestSentCard();
    const viewResponseButton = card.getByRole('button', { name: /^view response$/i });

    if (!(await viewResponseButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      await card.locator('.MuiAccordionSummary-root').first().click();
    }
    await expect(viewResponseButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.questionnairePage.hideFreshchatWidget();
    await viewResponseButton.click();
    await expect(this.responseDialog).toBeVisible({ timeout: this.defaultTimeout });
  }

  /** The preview renders every questionnaire page at once, so all answers are in the dialog DOM. */
  async expectResponseShowsAnswers(expectedTextAnswers) {
    console.log(`[CRMResponsePage] Expecting View Response to show ${expectedTextAnswers.length} text answer(s)`);
    await expect(this.responseDialog).toBeVisible({ timeout: this.defaultTimeout });

    await expect(async () => {
      const fieldValues = await this.responseDialog
        .locator('input, textarea')
        .evaluateAll((nodes) => nodes.map((node) => node.value || ''));
      const dialogText = await this.responseDialog.innerText();
      const shown = [...fieldValues, dialogText].join('\n');

      for (const answer of expectedTextAnswers) {
        expect(shown, `Submitted answer "${answer}" is not shown in View Response`).toContain(answer);
      }
      if (expectedTextAnswers.length === 0) {
        const answeredControls = await this.responseDialog.locator('input:checked').count();
        expect(answeredControls, 'View Response shows no answered choices').toBeGreaterThan(0);
      }
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = CRMResponsePage;
