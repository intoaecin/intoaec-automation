const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const ProposalPage = require('../../../admin/common/ProposalPage');
const NavigationPage = require('../../common/NavigationPage');

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSendProposalRequest(response) {
  const request = response.request();
  if (request.method() !== 'POST') return false;
  return /"eventType"\s*:\s*"(SEND_PROPOSAL|RESEND_PROPOSAL)"/.test(request.postData() || '');
}

/**
 * Proposal sent by email to the first lead, opened from the lead's Yopmail inbox.
 * Base class for the accepted, declined, lead comment, AEC reply and revision flows.
 */
class AcceptedProposalPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this.defaultTimeout = 180000;
    this.proposalPage = new ProposalPage(page);
    this.navigationPage = new NavigationPage(page);
    this.mailTimeoutMs = parseInt(process.env.PROPOSAL_MAIL_TIMEOUT_MS || '240000', 10);
    this.humanCheckTimeoutMs = parseInt(process.env.YOPMAIL_HUMAN_CHECK_TIMEOUT_MS || '180000', 10);

    this.clientData = null;
    this.sentProposal = null;
    this.yopmailPage = null;
    this.proposalPreviewPage = null;
    this.proposalMailId = null;
    this.checkedMailIds = new Set();

    this.clientsTab = page.getByLabel('Clients/Projects').first();
    this.projectsHeading = page
      .getByRole('heading', { name: /all projects|all clients/i })
      .or(page.getByText(/all projects|all clients/i))
      .first();
    this.addClientButton = page
      .getByRole('button', { name: /^add client$/i })
      .or(page.locator('button').filter({ hasText: /^add client$/i }))
      .first();

    this.addClientLandingHeading = page
      .getByRole('heading', { name: /^add client$/i })
      .or(page.getByText(/^add client$/i))
      .first();
    this.addNewClientButton = page
      .getByRole('button', { name: /^add new$/i })
      .or(page.locator('button').filter({ hasText: /^add new$/i }))
      .first();

    this.clientNameInput = page
      .locator('#free-solo-demo, input[name*="clientName" i], input[name*="leadName" i]')
      .or(page.getByLabel(/client name|lead name|full name/i))
      .or(page.getByPlaceholder(/client name|lead name|full name/i))
      .first();
    this.clientNameAddNewOption = page
      .locator('[role="option"], li, div, button')
      .filter({ hasText: /^Add New\s+/i })
      .first();
    this.clientEmailInput = page
      .locator('input[type="email"], input[name*="email" i]')
      .or(page.getByLabel(/email/i))
      .or(page.getByPlaceholder(/email/i))
      .first();
    this.clientPhoneInput = page
      .locator('input[type="tel"], input[name*="phone" i], input[name*="mobile" i], input[name*="contact" i]')
      .or(page.getByLabel(/mobile|phone|contact/i))
      .or(page.getByPlaceholder(/mobile|phone|contact/i))
      .first();
    this.clientAddressInput = page
      .locator('input[name="leadAddress"], input[name*="address" i], textarea[name*="address" i]')
      .or(page.getByLabel(/address/i))
      .or(page.getByPlaceholder(/address/i))
      .first();
    this.clientCityInput = page
      .locator('input[name="leadCity"], input[name*="city" i]')
      .or(page.getByLabel(/city/i))
      .or(page.getByPlaceholder(/city/i))
      .first();
    this.clientStateInput = page
      .locator('input[name="leadState"], input[name*="state" i]')
      .or(page.getByLabel(/state/i))
      .or(page.getByPlaceholder(/state/i))
      .first();
    this.clientCountryInput = page
      .locator('input[name="leadCountry"], input[name*="country" i]')
      .or(page.getByLabel(/country/i))
      .or(page.getByPlaceholder(/country/i))
      .first();
    this.clientZipcodeInput = page
      .locator('input[name="leadZipcode"], input[name*="zip" i], input[name*="postal" i]')
      .or(page.getByLabel(/zip|postal/i))
      .or(page.getByPlaceholder(/zip|postal/i))
      .first();
    this.nextButton = page
      .getByRole('button', { name: /^next$/i })
      .or(page.locator('button').filter({ hasText: /^next$/i }))
      .first();

    this.projectTypeHeading = page
      .getByRole('heading', { name: /project type/i })
      .or(page.getByText(/project type/i))
      .first();
    this.projectTypeCards = page
      .locator('[role="radio"], [role="option"], [role="button"], label, .MuiCard-root, .MuiPaper-root')
      .filter({ hasText: /residential|commercial|industrial|interior|architecture|construction|project/i });
    this.createClientButton = page
      .getByRole('button', { name: /create client|create lead|create$/i })
      .or(page.locator('button').filter({ hasText: /create client|create lead|create$/i }))
      .last();

    this.searchLeadInput = page
      .getByPlaceholder(/search client name or project name|search/i)
      .or(page.getByLabel(/search/i))
      .first();
    this.sentProposalStatusText = page.getByText(/accepted/i).first();
    this.composeToInput = page.locator('input[placeholder="To"]').first();
  }

  buildRandomClientData() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return {
      name: `Proposal Client ${suffix}`,
      yopmailLocalPart: `proposalclient${suffix}`,
      email: `proposalclient${suffix}@yopmail.com`,
      phone: `98${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      address: `Chennai ${Math.floor(Math.random() * 99) + 1}`,
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      zipcode: String(600000 + Math.floor(Math.random() * 999)),
    };
  }

  /**
   * Opens the first lead (CRM → Lead Manager → first lead) and makes sure its email is a real yopmail inbox.
   * The recipient address is read again from the compose email "To" field when sending.
   */
  async createClientWithYopmail() {
    const onLeadProfile = /leadmanager\/profile/i.test(this.page.url());
    if (onLeadProfile && !(await this.navigationPage.overviewSidebarItem.isVisible({ timeout: 5000 }).catch(() => false))) {
      // The shared tab can be left inside a full-screen proposal or questionnaire view by a previous scenario.
      console.log('[Proposal] Lead profile sidebar not visible; returning to Lead Manager');
      await this.page.goto(new URL('/leadmanager/master', this.page.url()).toString(), { waitUntil: 'domcontentloaded' });
    }
    await this.navigationPage.navigateToFirstLead();
    const leadEmail = await this.navigationPage.ensureLeadEmailIsNotDummy();
    this.clientData = { email: leadEmail, yopmailLocalPart: leadEmail.split('@')[0] };
  }

  async waitForPageReady() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => { });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
  }

  async clickElement(locator) {
    await locator.scrollIntoViewIfNeeded().catch(() => { });
    await locator.click({ timeout: 5000 }).catch(async () => {
      await locator.click({ force: true, timeout: 5000 });
    });
  }

  async fillField(locator, value) {
    if (!(await locator.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }
    await locator.scrollIntoViewIfNeeded().catch(() => { });
    await locator.click({ force: true }).catch(() => { });
    await locator.fill(String(value)).catch(async () => {
      await locator.press('Control+A').catch(() => { });
      await locator.type(String(value), { delay: 20 });
    });
    return true;
  }

  async openClientsSection() {
    await expect(this.clientsTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.clickElement(this.clientsTab);
    await this.waitForPageReady();
    await expect(async () => {
      const headingVisible = await this.projectsHeading.isVisible().catch(() => false);
      const addClientVisible = await this.addClientButton.isVisible().catch(() => false);
      expect(headingVisible || addClientVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
  }

  async openCreateClientFlow() {
    await expect(this.addClientButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.clickElement(this.addClientButton);
    await this.waitForPageReady();

    await expect(this.addClientLandingHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.addNewClientButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.clickElement(this.addNewClientButton);

    await expect(async () => {
      const nameVisible = await this.clientNameInput.isVisible().catch(() => false);
      const phoneVisible = await this.clientPhoneInput.isVisible().catch(() => false);
      expect(nameVisible || phoneVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
  }

  async confirmTypedClientName() {
    const exactOption = this.page.locator('[role="option"], li, div, button').filter({
      hasText: new RegExp(`^\\s*Add New\\s+${escapeRegExp(this.clientData.name)}\\s*$`, 'i'),
    }).first();

    if (await exactOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.clickElement(exactOption);
      return;
    }

    if (await this.clientNameAddNewOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.clickElement(this.clientNameAddNewOption);
      return;
    }

    await this.clientNameInput.press('Enter').catch(() => { });
  }

  async fillClientBasicsAndContinue() {
    await expect(this.clientNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.fillField(this.clientNameInput, this.clientData.name);
    await this.confirmTypedClientName();

    await this.fillField(this.clientPhoneInput, this.clientData.phone);
    await this.fillField(this.clientEmailInput, this.clientData.email);
    await this.fillField(this.clientAddressInput, this.clientData.address);
    await this.fillField(this.clientCityInput, this.clientData.city);
    await this.fillField(this.clientStateInput, this.clientData.state);
    await this.fillField(this.clientCountryInput, this.clientData.country);
    await this.fillField(this.clientZipcodeInput, this.clientData.zipcode);

    await expect(this.clientNameInput).toHaveValue(this.clientData.name, { timeout: 10000 });
    await expect(async () => {
      const emailValue = await this.clientEmailInput.inputValue().catch(() => '');
      const phoneValue = await this.clientPhoneInput.inputValue().catch(() => '');
      expect(emailValue.toLowerCase()).toContain('@yopmail.com');
      expect(phoneValue.trim().length).toBeGreaterThan(5);
    }).toPass({ timeout: 10000, intervals: [500, 1000] });

    await expect(this.nextButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.nextButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.clickElement(this.nextButton);
  }

  async selectProjectTypeAndContinue() {
    await expect(async () => {
      const headingVisible = await this.projectTypeHeading.isVisible().catch(() => false);
      const optionCount = await this.projectTypeCards.count().catch(() => 0);
      expect(headingVisible || optionCount > 0).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    const count = await this.projectTypeCards.count().catch(() => 0);
    if (count > 0) {
      await this.clickElement(this.projectTypeCards.first());
    } else {
      const choice = this.page.locator('input[type="radio"], input[type="checkbox"]').first();
      await expect(choice).toBeVisible({ timeout: this.defaultTimeout });
      await choice.check().catch(async () => {
        await choice.click({ force: true });
      });
    }

    await expect(this.nextButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.nextButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.clickElement(this.nextButton);
  }

  async finishClientCreation() {
    await expect(this.createClientButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createClientButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.clickElement(this.createClientButton);
    await this.waitForPageReady();
  }

  async openCreatedClientProfile() {
    if (await this.searchLeadInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.fillField(this.searchLeadInput, this.clientData.name);
      await this.searchLeadInput.press('Tab').catch(() => { });
    }

    const createdRow = this.page
      .locator('tr, [role="row"], .MuiDataGrid-row')
      .filter({ hasText: this.clientData.name })
      .first();
    await expect(createdRow).toBeVisible({ timeout: this.defaultTimeout });
    await this.clickElement(createdRow);
    await this.waitForPageReady();
  }

  async openProposalForCreatedClient() {
    await this.proposalPage.openProposalTab();
    await this.proposalPage.verifyProposalTabLoaded();
  }

  async chooseDefaultProposalTemplate() {
    await this.proposalPage.openChooseProposalModal();
    await this.proposalPage.chooseDefaultProposal();
    await expect(this.page).toHaveURL(/proposal\/edit/i, { timeout: this.defaultTimeout });
  }

  async sendProposalViaEmail() {
    await this.proposalPage.clickNextOnProposalEditor();
    await this.proposalPage.clickSkipInTemplateChangeDialog();
    await this.proposalPage.assertProposalPreviewInSendFlow();
    await this.proposalPage.openSendMenu();
    await this.proposalPage.selectEmailFromSendMenu();

    await expect(this.composeToInput).toBeVisible({ timeout: 30000 });
    const capturedEmail = (await this.composeToInput.inputValue()).trim();
    if (!capturedEmail.includes('@')) {
      throw new Error(`Failed to safely extract email from "To" input. Found value: "${capturedEmail}"`);
    }
    this.clientData = {
      ...(this.clientData || {}),
      email: capturedEmail,
      yopmailLocalPart: capturedEmail.split('@')[0],
    };

    // Settled immediately so a page closed mid-step cannot surface as an unhandled rejection.
    const sendResponse = this.page
      .waitForResponse(isSendProposalRequest, { timeout: this.defaultTimeout })
      .then(
        (response) => ({ response }),
        (error) => ({ error })
      );
    await this.proposalPage.confirmComposeSendEmail();

    const { response, error } = await sendResponse;
    if (error) throw error;
    const payload = await response.json();
    expect(payload?.code, `Send proposal API returned ${JSON.stringify(payload?.code)}`).toBe('PROPOSAL_SENT_SUCCESSFULLY');
    this.sentProposal = {
      leadProposalId: payload?.body?.leadProposalId,
      proposalRevision: payload?.body?.proposalRevision,
    };
    expect(this.sentProposal.leadProposalId, 'Send proposal API returned no leadProposalId').toBeTruthy();
    console.log(`[Proposal] Sent to ${capturedEmail}: ${JSON.stringify(this.sentProposal)}`);

    await this.proposalPage.verifyProposalSent();
  }

  requireSentProposal() {
    if (!this.sentProposal?.leadProposalId) {
      throw new Error('[Proposal] No sent proposal recorded. Send the proposal via email first.');
    }
    return this.sentProposal;
  }

  getYopmailHumanCheck() {
    const page = this.yopmailPage;
    return page
      .getByText(/confirm you.re human|verify you are human/i)
      .or(page.locator('iframe[src*="challenges.cloudflare.com"]'))
      .or(page.locator('#r_parent.r_popup'))
      .filter({ visible: true })
      .first();
  }

  /** Yopmail can show a Cloudflare human check; it must be completed by a person in the headed browser. */
  async waitForYopmailHumanCheckToClear() {
    const humanCheck = this.getYopmailHumanCheck();
    if (!(await humanCheck.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    console.log(
      `[Proposal] Yopmail is showing a Cloudflare human check. Waiting up to ${Math.round(
        this.humanCheckTimeoutMs / 1000
      )}s for it to be completed in the browser window.`
    );
    try {
      await expect(humanCheck).toBeHidden({ timeout: this.humanCheckTimeoutMs });
    } catch {
      throw new Error(
        '[Proposal] Mailbox blocked: yopmail kept showing the Cloudflare human check, so the proposal email could not be read.'
      );
    }
  }

  async openYopmailForProposal() {
    const login = this.clientData?.yopmailLocalPart;
    if (!login || !/@yopmail\.com$/i.test(this.clientData.email || '')) {
      throw new Error(`[Proposal] Client email "${this.clientData?.email}" is not a yopmail address, so its mailbox cannot be read.`);
    }
    if (!this.yopmailPage || this.yopmailPage.isClosed()) {
      this.yopmailPage = await this.page.context().newPage();
    }
    await this.yopmailPage.bringToFront();
    await this.yopmailPage.goto(`https://yopmail.com/en/?login=${encodeURIComponent(login)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await this.yopmailPage.waitForSelector('iframe[name="ifinbox"]', { timeout: 60000 });
  }

  async refreshYopmailInbox() {
    const refreshButton = this.yopmailPage.locator('#refresh').first();
    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();
    } else {
      await this.yopmailPage.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  async readOpenMailLinks() {
    const mailFrame = this.yopmailPage.frameLocator('iframe[name="ifmail"]');
    await expect
      .poll(() => mailFrame.locator('a[href]').count(), { timeout: 20000, intervals: [500, 1000] })
      .toBeGreaterThan(0);
    return mailFrame
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors
          .map((anchor, index) => ({ index, href: anchor.href }))
          .filter(({ href }) => /^https?:/i.test(href) && !/yopmail\./i.test(href))
      );
  }

  /** Links can be wrapped by click tracking, so non-direct links are resolved to their final URL. */
  async findProposalLink(links, leadProposalId) {
    const direct = links.find(({ href }) => href.includes(leadProposalId));
    if (direct) return direct;
    for (const link of links.slice(0, 8)) {
      const response = await this.yopmailPage.request.get(link.href, { maxRedirects: 10 }).catch(() => null);
      if (response && response.url().includes(leadProposalId)) {
        return { ...link, href: response.url() };
      }
    }
    return null;
  }

  /** Polls the inbox until a mail (other than `excludeMailIds`) links to the sent proposal; leaves that mail open. */
  async waitForMailLinkingToProposal({ excludeMailIds = [], description = 'proposal email' } = {}) {
    const { leadProposalId } = this.requireSentProposal();
    const inboxRows = this.yopmailPage.frameLocator('iframe[name="ifinbox"]').locator('div.m');
    const skipped = new Set(excludeMailIds);
    console.log(`[Proposal] Waiting for the ${description} for proposal ${leadProposalId} in ${this.clientData.email}`);

    const deadline = Date.now() + this.mailTimeoutMs;
    while (Date.now() < deadline) {
      await this.waitForYopmailHumanCheckToClear();
      const rowCount = Math.min(await inboxRows.count(), 6);
      for (let index = 0; index < rowCount; index += 1) {
        const row = inboxRows.nth(index);
        const mailId = (await row.getAttribute('id').catch(() => null)) || `row-${index}`;
        if (skipped.has(mailId) || this.checkedMailIds.has(mailId)) continue;

        await row.click();
        const links = await this.readOpenMailLinks().catch(() => []);
        const link = await this.findProposalLink(links, leadProposalId);
        if (link) {
          console.log(`[Proposal] Found the ${description}: ${link.href}`);
          return { mailId, link };
        }
        this.checkedMailIds.add(mailId);
      }
      await this.yopmailPage.waitForTimeout(5000);
      await this.waitForYopmailHumanCheckToClear();
      await this.refreshYopmailInbox();
    }
    throw new Error(
      `[Proposal] The ${description} for proposal ${leadProposalId} did not arrive in ${this.clientData.email} within ${Math.round(
        this.mailTimeoutMs / 1000
      )}s.`
    );
  }

  /** Clicks the matched link in the open mail; the proposal opens in a new tab. */
  async openProposalLinkFromOpenMail(link) {
    const { leadProposalId } = this.requireSentProposal();
    const mailLink = this.yopmailPage.frameLocator('iframe[name="ifmail"]').locator('a[href]').nth(link.index);
    const popupPromise = this.yopmailPage.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await mailLink.click();
    let previewPage = await popupPromise;
    if (!previewPage) {
      previewPage = await this.yopmailPage.context().newPage();
      await previewPage.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    }
    await previewPage.waitForLoadState('domcontentloaded').catch(() => { });
    await expect(previewPage).toHaveURL(new RegExp(escapeRegExp(leadProposalId)), { timeout: 60000 });
    await previewPage.bringToFront();
    return previewPage;
  }

  async waitForProposalMailAndOpenPreview() {
    const { mailId, link } = await this.waitForMailLinkingToProposal({ description: 'proposal email' });
    this.proposalMailId = mailId;
    this.proposalPreviewPage = await this.openProposalLinkFromOpenMail(link);
  }

  /** Closes the Yopmail and client preview tabs so later scenarios start with only the app tab. */
  async closeExternalTabs() {
    for (const tab of [this.proposalPreviewPage, this.yopmailPage]) {
      if (tab && tab !== this.page && !tab.isClosed()) {
        await tab.close().catch(() => { });
      }
    }
    this.proposalPreviewPage = null;
    this.yopmailPage = null;
  }

  async acceptProposalWithDigitalSignature() {
    const page = this.proposalPreviewPage;

    const signaturePopup = () =>
      page
        .locator('[role="dialog"], .MuiDialog-root, .MuiModal-root, .MuiPaper-root')
        .filter({ has: page.locator('input[type="radio"][value="draw"], canvas, button:has-text("Sign and Accept")') })
        .first();

    const openSignaturePopup = async () => {
      if (await signaturePopup().isVisible({ timeout: 1500 }).catch(() => false)) {
        return;
      }

      const opener = page
        .locator('button')
        .filter({ hasText: /^Sign and Accept$/i })
        .first()
        .or(page.getByRole('button', { name: /^Sign and Accept$/i }).first());
      await expect(opener).toBeVisible({ timeout: 30000 });
      await opener.click({ force: true });

      await expect(async () => {
        expect(await signaturePopup().isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
      }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
    };

    const drawSignature = async () => {
      const popup = signaturePopup();
      const drawSignatureRadio = popup
        .locator('input[type="radio"][value="draw"]')
        .first()
        .or(page.locator('input[type="radio"][value="draw"]').first());
      await expect(drawSignatureRadio).toBeVisible({ timeout: 30000 });
      await drawSignatureRadio.check({ force: true }).catch(async () => {
        await drawSignatureRadio.click({ force: true });
      });
      await expect(drawSignatureRadio).toBeChecked({ timeout: 15000 });

      const signaturePad = popup.locator('canvas').last().or(page.locator('canvas').last());
      await expect(signaturePad).toBeVisible({ timeout: 15000 });

      const box = await signaturePad.boundingBox();
      if (!box) {
        throw new Error('Digital signature canvas was not available.');
      }

      await signaturePad.click({ position: { x: box.width / 2, y: box.height / 2 }, force: true }).catch(() => {});
      await page.mouse.move(box.x + 25, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 95, box.y + box.height / 2 - 25, { steps: 5 });
      await page.mouse.move(box.x + 165, box.y + box.height / 2 + 20, { steps: 5 });
      await page.mouse.move(box.x + 240, box.y + box.height / 2 - 10, { steps: 5 });
      await page.mouse.up();
    };

    await openSignaturePopup();
    await drawSignature();

    if (!(await signaturePopup().isVisible({ timeout: 1500 }).catch(() => false))) {
      await openSignaturePopup();
      await drawSignature();
    }

    const signAndAcceptSubmit = signaturePopup()
      .locator('button')
      .filter({ hasText: /^Sign and Accept$/i })
      .last()
      .or(page.getByRole('button', { name: /^Sign and Accept$/i }).last());
    await expect(signAndAcceptSubmit).toBeVisible({ timeout: 15000 });
    await expect(signAndAcceptSubmit).toBeEnabled({ timeout: 15000 });
    await signAndAcceptSubmit.click({ force: true });

    // Some preview pages close or stay on a thank-you state after accepting.
    // App-side status is verified after switching back to the application tab.
    if (page.isClosed()) return;
    await expect(signaturePopup()).toBeHidden({ timeout: 30000 }).catch(() => {});

    const acceptedHeaderStatus = page.locator('h6, span, div').filter({ hasText: /^Accepted$/i }).first()
      .or(page.getByText(/^Accepted$/i).first());

    await expect(async () => {
      const isStatusVisible = await acceptedHeaderStatus.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isStatusVisible).toBeTruthy();
    }).toPass({ timeout: 5000, intervals: [1000, 1500] }).catch(() => {});
  }

  async verifyProposalAcceptedStatusInApp() {
    await this.page.bringToFront();
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
    await this.proposalPage.verifyProposalTabLoaded();
    await expect(this.sentProposalStatusText).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = AcceptedProposalPage;
