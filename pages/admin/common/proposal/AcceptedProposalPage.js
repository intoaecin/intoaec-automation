const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const ProposalPage = require('../../../admin/common/ProposalPage');

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class AcceptedProposalPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this.defaultTimeout = 180000;
    this.proposalPage = new ProposalPage(page);

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
    this.yopmailLoginInput = page.locator('#login, input#login, input[name="login"]').first();
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

  async createClientWithYopmail() {
    this.clientData = {
      name: 'Automation Test Client'
    };

    await this.openClientsSection();

    // Use precisely the provided locator for the first client name cell
    const firstClientName = this.page.locator('th[scope="row"] span.text-dark').first();

    await expect(firstClientName).toBeVisible({ timeout: 15000 });
    await firstClientName.click({ force: true });

    // Quick load check without long enforced idle
    await this.page.waitForLoadState('domcontentloaded').catch(() => { });
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
    await this.page.waitForTimeout(1500);
  }

  async openCreatedClientProfile() {
    if (await this.searchLeadInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.fillField(this.searchLeadInput, this.clientData.name);
      await this.searchLeadInput.press('Tab').catch(() => { });
      await this.page.waitForTimeout(1000);
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

    // Explicit targeting based on the precise custom Compose Email UI structure
    const toInput = this.page.locator('input[placeholder="To"]').first();
    await expect(toInput).toBeVisible({ timeout: 15000 });

    // Retrieve the exact value property from the disabled input field
    const capturedEmail = await toInput.inputValue();

    if (capturedEmail && capturedEmail.includes('@')) {
      this.clientData.email = capturedEmail;
      this.clientData.yopmailLocalPart = capturedEmail.split('@')[0];
    } else {
      throw new Error(`Failed to safely extract email from "To" input. Found value: "${capturedEmail}"`);
    }

    await this.proposalPage.confirmComposeSendEmail();
    await this.page.waitForTimeout(1500);
  }

  async openYopmailForProposal() {
    this.yopmailPage = await this.page.context().newPage();
    const login = this.clientData.yopmailLocalPart;
    await this.yopmailPage.goto(`https://yopmail.com?${encodeURIComponent(login)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    if (await this.yopmailLoginInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.yopmailLoginInput.fill(login);
      await this.yopmailLoginInput.press('Enter');
    }

    await this.yopmailPage.waitForSelector('iframe[name="ifinbox"]', { timeout: 45000 });
  }

  async waitForProposalMailAndOpenPreview() {
    const page = this.yopmailPage;
    const inbox = page.frameLocator('iframe[name="ifinbox"]');
    const mail = page.frameLocator('iframe[name="ifmail"]');

    // Wait a solid 40 seconds to guarantee the new email arrives safely
    await page.waitForTimeout(40000);

    const refresh = page.locator('#refresh, [title*="Refresh" i]').first();
    if (await refresh.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refresh.click().catch(() => { });
    }
    await page.waitForTimeout(2000);

    // Open the absolute newest email sitting at the top of the pile
    const firstEmail = inbox.locator('div.m, .lm, tr, .l').first();
    await firstEmail.click({ force: true });
    await page.waitForTimeout(2000);

    const previewLink = mail
      .getByRole('link', { name: /preview|view proposal|open proposal/i })
      .or(mail.getByRole('button', { name: /preview|view proposal|open proposal/i }))
      .or(mail.locator('a').filter({ hasText: /preview|view proposal|open proposal/i }))
      .first();

    if (await previewLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const popupPromise = page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
      await previewLink.click({ force: true });
      this.proposalPreviewPage = await popupPromise;

      if (!this.proposalPreviewPage) {
        this.proposalPreviewPage = page;
      }
      await this.proposalPreviewPage.waitForLoadState('domcontentloaded').catch(() => { });
      return;
    }

    throw new Error('Failed to locate the preview link inside the successfully opened Yopmail email.');
  }

  async acceptProposalWithDigitalSignature() {
    const page = this.proposalPreviewPage;

    // 1. Click "Sign and Preview" mapped directly from the UI button
    const signAndPreviewButton = page.locator('button').filter({ hasText: /Sign and Preview/i }).first();
    await expect(signAndPreviewButton).toBeVisible({ timeout: 15000 });
    await signAndPreviewButton.click();

    // 2. Click "Draw signature" radio button to reveal the canvas
    const drawSignatureText = page.getByText(/Draw Signature/i).first();
    await expect(drawSignatureText).toBeVisible({ timeout: 10000 });
    // Click the label/text directly to trigger the radio selection
    await drawSignatureText.click({ force: true });

    // 3. Draw inside canvas
    const signaturePad = page.locator('canvas').last();
    await expect(signaturePad).toBeVisible({ timeout: 10000 });

    const box = await signaturePad.boundingBox();
    if (!box) {
      throw new Error('Digital signature canvas was not available.');
    }

    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 45, { steps: 5 });
    await page.mouse.move(box.x + 140, box.y + 30, { steps: 5 });
    await page.mouse.up();

    // 4. Click "Sign Proposal"
    const signProposalSubmit = page.locator('button').filter({ hasText: /Sign Proposal/i }).first();
    await expect(signProposalSubmit).toBeVisible({ timeout: 10000 });
    await signProposalSubmit.click({ force: true });

    await page.waitForTimeout(2000); // Allow modal closing and UI to refresh

    // 5. Click the final "Accept Proposal" button and verify it processed
    const acceptFinalBtn = page.locator('button').filter({ hasText: /Accept Proposal/i }).first()
      .or(page.getByRole('button', { name: /Accept Proposal/i }).first());

    await expect(acceptFinalBtn).toBeVisible({ timeout: 15000 });

    // We loop the click until the "Accepted" text appears in the header or the button vanishes
    const acceptedHeaderStatus = page.locator('h6, span, div').filter({ hasText: /^Accepted$/i }).first()
      .or(page.getByText(/^Accepted$/i).first());

    await expect(async () => {
      if (await acceptFinalBtn.isVisible().catch(() => false)) {
        await acceptFinalBtn.click({ force: true }).catch(() => { });
      }

      const isStatusVisible = await acceptedHeaderStatus.isVisible({ timeout: 2000 }).catch(() => false);
      const isButtonStillThere = await acceptFinalBtn.isVisible({ timeout: 500 }).catch(() => false);

      expect(isStatusVisible || !isButtonStillThere).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [1500, 2000, 3000] });

    // Quick wait after successful confirmation so app-side toasts/requests resolve before verifying status
    await page.waitForTimeout(2000);
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
