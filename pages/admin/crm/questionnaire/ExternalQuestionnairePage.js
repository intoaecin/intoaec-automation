// pages/admin/crm/questionnaire/ExternalQuestionnairePage.js
const { expect } = require('@playwright/test');
const LeadQuestionnairePage = require('./LeadQuestionnairePage');

function yopmailLocalPart(email) {
  const match = String(email || '').trim().match(/^([^@]+)@yopmail\.com$/i);
  return match ? match[1] : null;
}

/**
 * Client side of an emailed questionnaire: the lead's yopmail inbox and the public
 * /leadQuestionnaireCapture/{id} page. Runs in its own tab so the CRM tab keeps its state.
 */
class ExternalQuestionnairePage extends LeadQuestionnairePage {
  constructor(page) {
    super(page);
    this.mailTimeoutMs = parseInt(process.env.QUESTIONNAIRE_MAIL_TIMEOUT_MS || '240000', 10);
    this.humanCheckTimeoutMs = parseInt(process.env.YOPMAIL_HUMAN_CHECK_TIMEOUT_MS || '180000', 10);

    this.inboxFrame = page.frameLocator('iframe[name="ifinbox"]');
    this.mailFrame = page.frameLocator('iframe[name="ifmail"]');
    this.inboxRows = this.inboxFrame.locator('div.m');
    this.humanCheck = page
      .getByText(/confirm you.re human|verify you are human/i)
      .or(page.locator('iframe[src*="challenges.cloudflare.com"]'))
      .or(page.locator('#r_parent.r_popup'))
      .filter({ visible: true })
      .first();

    this.linkExpiredHeading = page.getByRole('heading', { name: /^questionnaire link expired$/i });
    this.submittedHeading = page.getByRole('heading', { name: /^questionnaire submitted$/i });
    this.submittedMessage = page.getByText(/your response has been submitted successfully/i);

    this.answerSuffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    this.checkedMailIds = new Set();
    this.questionnaireLink = null;
    this.submittedTextAnswers = [];
  }

  buildAnswerSuffix() {
    return this.answerSuffix;
  }

  async openInbox(login) {
    await this.page.bringToFront();
    await this.page.goto(`https://yopmail.com/en/?login=${encodeURIComponent(login)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await this.page.waitForSelector('iframe[name="ifinbox"]', { timeout: 60000 });
  }

  /** Yopmail can show a Cloudflare human check; it must be completed by a person in the headed browser. */
  async waitForHumanCheckToClear() {
    if (!(await this.humanCheck.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    console.log(
      `[ExternalQuestionnairePage] Yopmail is showing a Cloudflare human check. Waiting up to ${Math.round(
        this.humanCheckTimeoutMs / 1000
      )}s for it to be completed in the browser window.`
    );
    try {
      await expect(this.humanCheck).toBeHidden({ timeout: this.humanCheckTimeoutMs });
    } catch {
      throw new Error(
        '[ExternalQuestionnairePage] Mailbox blocked: yopmail kept showing the Cloudflare human check, so the questionnaire email could not be read.'
      );
    }
  }

  async refreshInbox() {
    const refreshButton = this.page.locator('#refresh').first();
    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();
    } else {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  async readOpenMailLinks() {
    await expect
      .poll(() => this.mailFrame.locator('a[href]').count(), { timeout: 20000, intervals: [500, 1000] })
      .toBeGreaterThan(0);
    return this.mailFrame
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors.map((a) => a.href).filter((href) => /^https?:/i.test(href) && !/yopmail\./i.test(href))
      );
  }

  /** Links can be wrapped by click tracking, so non-direct links are resolved to their final URL. */
  async resolveQuestionnaireLink(hrefs, questionnaireId) {
    const direct = hrefs.find((href) => href.includes(questionnaireId));
    if (direct) {
      return direct;
    }
    for (const href of hrefs.slice(0, 8)) {
      const response = await this.page.request.get(href, { maxRedirects: 10 }).catch(() => null);
      if (response && response.url().includes(questionnaireId)) {
        return response.url();
      }
    }
    return null;
  }

  async findQuestionnaireLinkInInbox(questionnaireId) {
    const rowCount = Math.min(await this.inboxRows.count(), 6);
    for (let index = 0; index < rowCount; index += 1) {
      const row = this.inboxRows.nth(index);
      const mailId = (await row.getAttribute('id').catch(() => null)) || `row-${index}`;
      if (this.checkedMailIds.has(mailId)) {
        continue;
      }

      await row.click();
      const hrefs = await this.readOpenMailLinks().catch(() => []);
      const link = await this.resolveQuestionnaireLink(hrefs, questionnaireId);
      if (link) {
        return link;
      }
      this.checkedMailIds.add(mailId);
    }
    return null;
  }

  async openQuestionnaireLinkFromMailbox(email, questionnaireId) {
    const login = yopmailLocalPart(email);
    if (!login) {
      throw new Error(`[ExternalQuestionnairePage] Lead email "${email}" is not a yopmail address, so its mailbox cannot be read.`);
    }
    if (!questionnaireId) {
      throw new Error('[ExternalQuestionnairePage] No questionnaireId recorded for the sent questionnaire.');
    }

    console.log(`[ExternalQuestionnairePage] Waiting for questionnaire ${questionnaireId} email in ${email}`);
    await this.openInbox(login);

    const deadline = Date.now() + this.mailTimeoutMs;
    let link = null;
    while (!link && Date.now() < deadline) {
      await this.waitForHumanCheckToClear();
      link = await this.findQuestionnaireLinkInInbox(questionnaireId);
      if (!link) {
        await this.page.waitForTimeout(5000);
        await this.waitForHumanCheckToClear();
        await this.refreshInbox();
      }
    }
    if (!link) {
      throw new Error(
        `[ExternalQuestionnairePage] Questionnaire email for ${questionnaireId} did not arrive in ${email} within ${Math.round(
          this.mailTimeoutMs / 1000
        )}s.`
      );
    }

    console.log(`[ExternalQuestionnairePage] Opening questionnaire link: ${link}`);
    await this.page.goto(link, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await expect(this.page).toHaveURL(new RegExp(`leadQuestionnaireCapture/${questionnaireId}`), {
      timeout: this.defaultTimeout,
    });
    this.questionnaireLink = this.page.url();
  }

  async reopenQuestionnaireLink() {
    if (!this.questionnaireLink) {
      throw new Error('[ExternalQuestionnairePage] The questionnaire link has not been opened yet.');
    }
    console.log('[ExternalQuestionnairePage] Opening the questionnaire link again');
    await this.page.bringToFront();
    await this.page.goto(this.questionnaireLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  }

  async expectLinkExpiredPage() {
    console.log('[ExternalQuestionnairePage] Expecting the Questionnaire Link Expired page');
    await expect(this.linkExpiredHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.previewNextButton.or(this.submitAnswerButton)).toHaveCount(0);
  }

  async answerAllMandatoryQuestions() {
    console.log('[ExternalQuestionnairePage] Answering the questionnaire as the client');
    await expect(this.previewNextButton.or(this.submitAnswerButton).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.answerQuestionnairePageCount = 0;
    await this.fillAllMandatoryQuestionnaireQuestions();
  }

  async submitClientQuestionnaire() {
    console.log('[ExternalQuestionnairePage] Submitting the client questionnaire');
    await expect(this.submitAnswerButton).toBeEnabled({ timeout: this.defaultTimeout });

    const isAnswerRequest = (request) =>
      request.method() === 'POST' && /"eventType"\s*:\s*"ANSWER_QUESTIONNAIRE"/.test(request.postData() || '');
    const answerRequest = this.page.waitForRequest(isAnswerRequest, { timeout: this.defaultTimeout });
    const answerResponse = this.page.waitForResponse((response) => isAnswerRequest(response.request()), {
      timeout: this.defaultTimeout,
    });

    await this.submitAnswerButton.click();

    const postData = (await answerRequest).postData() || '';
    const result = await (await answerResponse).json().catch(() => ({}));
    expect(result.code, `Questionnaire submit failed: ${result.message || JSON.stringify(result)}`).toBe(
      'ANSWER_QUESTIONNAIRE_SUCCESSFUL'
    );

    const answerPattern = new RegExp(`Automation (?:paragraph )?answer ${this.answerSuffix}-\\d+`, 'g');
    this.submittedTextAnswers = [...new Set(postData.match(answerPattern) || [])];
    console.log(`[ExternalQuestionnairePage] Submitted text answers: ${JSON.stringify(this.submittedTextAnswers)}`);
  }

  async expectSubmittedPage() {
    console.log('[ExternalQuestionnairePage] Expecting the questionnaire submitted page');
    await expect(this.submittedHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.submittedMessage).toBeVisible();
  }
}

module.exports = ExternalQuestionnairePage;
