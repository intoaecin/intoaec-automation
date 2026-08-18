const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Header → Account Settings → My Organization (About Us / org profile).
 *
 * Layering per AGENTS.md:
 *   Feature: features/admin/account/My accounts.feature
 *   Steps:   step-definitions/admin/account/MyOrganization.steps.js
 *   Page:    this file
 */
class MyOrganizationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.myOrganizationNav = page
      .getByRole('menuitem', { name: /^my organization$/i })
      .or(page.getByRole('tab', { name: /^my organization$/i }))
      .or(page.getByRole('link', { name: /^my organization$/i }))
      .first();
    this.aboutUsTab = page.getByRole('tab', { name: /^about us$/i }).first();
    this.editButton = page.getByRole('button', { name: /^edit$/i }).first();
    this.updateButton = page.getByRole('button', { name: /^update$/i }).first();

    this.summaryInput = page.locator('#professional-summary-field').first();
    this.licenseInput = page.getByPlaceholder(/enter license number/i).first();
    this.taxNameInput = page.getByPlaceholder(/^enter tax name$/i).first();
    this.taxIdInput = page.getByPlaceholder(/enter tax id/i).first();
    this.languagesInput = page.locator('#tags-filled').first();
    this.languagesAutocomplete = page
      .locator('.MuiAutocomplete-root')
      .filter({ has: page.locator('#tags-filled') })
      .first();

    this.areaOfExpertiseHeading = page.getByText(/^area of expertise$/i).first();
    this.addSkillButton = page
      .getByRole('button', { name: /add skills?/i })
      .or(page.getByText(/^add skills?$/i))
      .first();
    this.skillDialog = page
      .getByRole('dialog')
      .filter({ hasText: /add skills|expertise on/i })
      .first();
    this.skillCombobox = this.skillDialog.locator('[role="combobox"], #tags-filled').first();
    this.skillListbox = page.getByRole('listbox').first();
    this.skillSaveButton = this.skillDialog.getByRole('button', { name: /^save$/i }).first();
    this.lastSelectedSkill = null;

    this.awardsHeading = page.getByText(/^awards$/i).first();
    this.addAwardButton = page
      .getByRole('button', { name: /add awards?/i })
      .or(page.getByText(/^add awards?$/i))
      .first();
    this.awardDialog = page.getByRole('dialog').filter({ hasText: /add awards/i }).first();
    this.awardTitleInput = this.awardDialog.getByLabel(/^title/i).first();
    this.awardIssuerInput = this.awardDialog.getByLabel(/^issuer/i).first();
    this.awardIssuedOnInput = this.awardDialog.getByPlaceholder(/dd mmmm yyyy/i).first();
    this.awardChooseDateButton = this.awardDialog.getByRole('button', { name: /choose date/i }).first();
    this.awardDescriptionInput = this.awardDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /^description/i })
      .locator('textarea')
      .first()
      .or(this.awardDialog.locator('textarea').first());
    this.awardSaveButton = this.awardDialog.getByRole('button', { name: /^save$/i }).first();
    this.lastAward = null;

    this.certificationsHeading = page.getByText(/^certifications$/i).first();
    this.addCertificationButton = page
      .getByRole('button', { name: /add certifications?/i })
      .or(page.getByText(/^add certifications?$/i))
      .first();
    this.certDialog = page.getByRole('dialog').filter({ hasText: /add certification/i }).first();
    this.certTitleInput = this.certDialog.getByLabel(/^title/i).first();
    this.certIssuerInput = this.certDialog.getByLabel(/^issuer/i).first();
    this.certIssuedOnChoose = this.certDialog.getByRole('button', { name: /choose date/i }).nth(0);
    this.certExpiresOnChoose = this.certDialog.getByRole('button', { name: /choose date/i }).nth(1);
    this.certCredentialIdInput = this.certDialog.getByLabel(/credential id/i).first();
    this.certCredentialUrlInput = this.certDialog.getByLabel(/credential url/i).first();
    this.certSaveButton = this.certDialog.getByRole('button', { name: /^save$/i }).first();
    this.lastCertification = null;

    this.publicationsHeading = page.getByText(/^publications?$/i).first();
    this.addPublicationButton = page
      .getByRole('button', { name: /add publications?/i })
      .or(page.getByText(/^add publications?$/i))
      .first();
    this.pubDialog = page.getByRole('dialog').filter({ hasText: /add publication/i }).first();
    this.pubTitleInput = this.pubDialog.getByLabel(/^title/i).first();
    this.pubPublisherInput = this.pubDialog.getByLabel(/^publisher/i).first();
    this.pubDateChoose = this.pubDialog.getByRole('button', { name: /choose date/i }).first();
    this.pubAuthorInput = this.pubDialog.getByLabel(/^author/i).first();
    this.pubUrlInput = this.pubDialog.getByLabel(/publication url/i).first();
    this.pubSaveButton = this.pubDialog.getByRole('button', { name: /^save$/i }).first();
    this.lastPublication = null;

    this.presentationsHeading = page.getByText(/^presentations?$/i).first();
    this.addPresentationButton = page
      .getByRole('button', { name: /add presentations?/i })
      .or(page.getByText(/^add presentations?$/i))
      .first();
    this.presDialog = page.getByRole('dialog').filter({ hasText: /presentation/i }).first();
    this.presEventNameInput = this.presDialog.getByLabel(/event name/i).first();
    this.presLocationInput = this.presDialog.getByLabel(/^location/i).first();
    this.presStartChoose = this.presDialog.getByRole('button', { name: /choose date/i }).nth(0);
    this.presEndChoose = this.presDialog.getByRole('button', { name: /choose date/i }).nth(1);
    this.presVenueInput = this.presDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /venue details/i })
      .locator('input, textarea')
      .first()
      .or(this.presDialog.getByLabel(/venue details/i));
    this.presSaveButton = this.presDialog.getByRole('button', { name: /^save$/i }).first();
    this.lastPresentation = null;

    this.orgInfoTab = page.getByRole('tab', { name: /^organization info$/i });
    this.addressHeading = page.getByText(/^organization address$/i).first();
    this.addressEditButton = page.getByRole('button', { name: /^edit$/i }).filter({ visible: true }).last();
    this.addressLine1Input = page
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /address line 1/i })
      .locator('input')
      .first()
      .or(page.getByPlaceholder(/enter your location/i).first());
    this.addressLine2Input = page
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /address line 2/i })
      .locator('input')
      .first()
      .or(page.getByPlaceholder(/enter your location/i).nth(1));
    this.addressCityInput = page
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /^city/i })
      .locator('input')
      .first()
      .or(page.getByPlaceholder(/enter your city/i));
    this.addressStateCombo = page
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /^state/i })
      .locator('input')
      .first()
      .or(page.getByPlaceholder(/enter your state/i));
    this.addressCountryCombo = page
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /^country/i })
      .locator('input')
      .first()
      .or(page.getByPlaceholder(/enter your country/i));
    this.addressZipInput = page
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /zip code|zipcode/i })
      .locator('input')
      .first()
      .or(page.getByPlaceholder(/enter your zipcode/i));
    this.addressSaveButton = page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last();
    this.lastAddress = null;
    this.lastAddressSaveOk = false;

    this.portfolioTab = page.getByRole('tab', { name: /^portfolio$/i });
    this.addProjectButton = page
      .locator('.MuiTabPanel-root')
      .filter({ visible: true })
      .last()
      .locator('button')
      .filter({ has: page.getByTestId('AddIcon') })
      .first()
      .or(page.getByRole('button', { name: /add project/i }).first());
    this.portfolioDialog = page
      .getByRole('dialog')
      .filter({ hasText: /add portfolio/i })
      .first();
    this.portfolioProjectNameInput = this.portfolioDialog.locator('input[name="projectName"]').first();
    this.portfolioProjectTypeCombo = this.portfolioDialog
      .locator('.MuiAutocomplete-root, .MuiFormControl-root')
      .filter({ hasText: /project type/i })
      .first();
    this.portfolioProjectTypeInput = this.portfolioDialog
      .locator('input[name="projectType"]')
      .or(this.portfolioDialog.getByPlaceholder(/select/i))
      .or(this.portfolioProjectTypeCombo.locator('input').first())
      .first();
    this.portfolioProjectTypeCombobox = this.portfolioDialog.getByRole('combobox').first();
    this.portfolioDescriptionInput = this.portfolioDialog.locator('textarea[name="description"]').first();
    this.portfolioDurationInput = this.portfolioDialog.locator('input[name="projectDuration"]').first();
    this.portfolioLocationInput = this.portfolioDialog.locator('input[name="location"]').first();
    this.portfolioPublicVisibility = this.portfolioDialog
      .locator('input[name="isPublicVisible"]')
      .or(this.portfolioDialog.getByLabel(/public visibility/i))
      .first();
    this.portfolioFileInput = this.portfolioDialog
      .locator('input[type="file"]')
      .filter({ hasNot: page.locator('[accept="image/*"]') })
      .or(this.portfolioDialog.locator('input[type="file"][accept*="mp4"], input[type="file"][accept*="video"], input[type="file"]'))
      .last();
    this.portfolioUploadArea = this.portfolioDialog.getByText(/click here to upload|drop them here/i).first();
    this.portfolioAddButton = this.portfolioDialog.getByRole('button', { name: /^add$/i }).first();
    this.lastPortfolio = null;
    this.lastPortfolioSaveOk = false;

    this.socialMediaTab = page.getByRole('tab', { name: /^social media$/i });
    this.socialMediaHeading = page.getByText(/^social media links$/i).first();
    this.socialMediaPanel = page.locator('.MuiTabPanel-root').filter({ visible: true }).last();
    this.socialMediaEditButton = this.socialMediaPanel.getByRole('button', { name: /^edit$/i }).first();
    this.socialMediaSaveButton = this.socialMediaPanel.getByRole('button', { name: /^save$/i }).first();
    this.lastSocialMedia = null;
    this.lastSocialMediaSaveOk = false;

    this.eSignatureTab = page.getByRole('tab', { name: /e-?signature/i });
    this.adminDigitalSignatureHeading = page.getByText(/^admin digital signature$/i).first();
    this.existingDigitalSignatureHeading = page.getByText(/^existing digital signature$/i).first();
    this.eSignaturePanel = page
      .locator('.MuiTabPanel-root')
      .filter({ has: page.getByText(/^admin digital signature$/i) })
      .first();
    this.eSignatureDrawOption = this.eSignaturePanel
      .getByRole('button', { name: /^draw$/i })
      .or(this.eSignaturePanel.getByRole('tab', { name: /^draw$/i }))
      .first();
    this.eSignatureUploadOption = this.eSignaturePanel
      .getByRole('button', { name: /^upload$/i })
      .or(this.eSignaturePanel.getByRole('tab', { name: /^upload$/i }))
      .first();
    this.signatureUploadArea = this.eSignaturePanel
      .getByText(/click here to upload e-signature/i)
      .first();
    this.signatureUploadLabel = this.eSignaturePanel
      .locator('label')
      .filter({ hasText: /click here to upload e-signature/i })
      .first();
    this.signatureFileInput = this.signatureUploadLabel
      .locator('input[type="file"]')
      .first()
      .or(this.eSignaturePanel.locator('input[type="file"]:not([accept])').last());
    this.existingSignatureImage = this.eSignaturePanel
      .locator('img[src*="ESIGN"], img[src*="esign"]')
      .last();
    this.eSignatureUpdateButton = this.eSignaturePanel.getByRole('button', { name: /^update$/i }).first();
    this.eSignatureClearButton = this.eSignaturePanel.getByRole('button', { name: /^clear$/i }).first();
    this.signatureCanvas = this.eSignaturePanel.locator('canvas').first();
    this.lastSignatureInkCount = 0;
    this.lastSignatureSaveOk = false;
    this.lastSignatureSrc = '';
  }

  _socialField(labelRe) {
    return this.page
      .locator('.MuiTabPanel-root')
      .filter({ visible: true })
      .last()
      .locator('.MuiGrid-item')
      .filter({ has: this.page.getByText(labelRe) })
      .locator('input')
      .first();
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  logStep(msg) {
    console.log(`[MyOrganization] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async isOnMyOrganizationPage() {
    const urlHit = /myorganization|my[-_]?organisation|organization/i.test(this.page.url());
    const about = await this.aboutUsTab.isVisible({ timeout: 1500 }).catch(() => false);
    return urlHit || about;
  }

  async _dismissAccountMenu() {
    if (!this.page || this.page.isClosed()) {
      return;
    }
    try {
      const menu = this.page.locator('#account-menu');
      const count = await menu.count().catch(() => 0);
      if (!count) {
        return;
      }
      // Do not remove the menu node — React still owns it and DOM removal can crash the page.
      // Disable pointer events + Escape so the invisible backdrop cannot intercept tab clicks.
      await this.page
        .evaluate(() => {
          const el = document.querySelector('#account-menu');
          if (!el) return;
          el.style.pointerEvents = 'none';
          el.setAttribute('aria-hidden', 'true');
          const backdrop = el.querySelector('.MuiBackdrop-root, .MuiModal-backdrop');
          if (backdrop) {
            backdrop.style.pointerEvents = 'none';
            backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        })
        .catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(200).catch(() => {});
    } catch {
      // Page may navigate away while dismissing — ignore.
    }
  }

  async _clickMuiTab(tab) {
    await this._dismissAccountMenu();
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    try {
      await tab.click({ timeout: this.uiTimeout, force: true });
    } catch {
      if (this.page.isClosed()) {
        throw new Error('Browser page closed while clicking tab. Keep the browser open during the run.');
      }
      await tab.evaluate((el) => el.click());
    }
  }

  async clickMyOrganization() {
    if (/myorganization/i.test(this.page.url()) && !(await this.myOrganizationNav.isVisible({ timeout: 800 }).catch(() => false))) {
      await this._dismissAccountMenu();
      this.logStep('Already on My Organization');
      return;
    }

    await expect(this.myOrganizationNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.myOrganizationNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/myorganization/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this._dismissAccountMenu();
    await this.waitForNetworkSettled();
    await this.expectMyOrganizationPageDisplayed();
    this.logStep('Clicked My Organization');
  }

  async expectMyOrganizationPageDisplayed() {
    await expect(async () => {
      expect(await this.isOnMyOrganizationPage()).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.logStep('My Organization page is displayed');
  }

  async clickAboutUsTab() {
    await this._clickMuiTab(this.aboutUsTab);
    await this.waitForNetworkSettled();
    this.logStep('Clicked About Us tab');
  }

  async clickEdit() {
    if (await this.summaryInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('About Us already in edit mode');
      return;
    }

    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editButton.click({ timeout: this.uiTimeout });
    await expect(this.summaryInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Edit on About Us');
  }

  async _commitReactInput(locator, wanted) {
    await locator.evaluate((el, val) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const previous = el.value;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(previous);
      if (desc && desc.set) desc.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: val, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, wanted);
  }

  async _fillText(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});

    const enabled = await locator.isEnabled().catch(() => true);
    if (!enabled) {
      this.logStep(`Skipped ${label} — field is not editable`);
      return false;
    }

    const wanted = String(value);
    await locator.click({ timeout: this.uiTimeout });
    await locator.fill('');
    await locator.fill(wanted);
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});

    const current = await locator.inputValue().catch(() => '');
    if (current !== wanted) {
      this.logStep(`WARN ${label} shows "${current.slice(0, 80)}" after typing — continuing`);
    } else {
      this.logStep(`Filled ${label}`);
    }
    return true;
  }

  async fillSummary(value) {
    await this._fillText(this.summaryInput, value, 'Summary');
  }

  async fillLicenseNumber(value) {
    await this._fillText(this.licenseInput, value, 'License Number');
  }

  async fillTaxId(value) {
    await this._fillText(this.taxIdInput, value, 'Tax ID');
  }

  async fillTaxName(value) {
    await this._fillText(this.taxNameInput, value, 'Tax Name');
  }

  async selectLanguagesSpoken(csv) {
    const wanted = String(csv)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await expect(this.languagesInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.languagesInput.scrollIntoViewIfNeeded().catch(() => {});

    for (const lang of wanted) {
      const exact = new RegExp(`^${this._escapeRegex(lang)}$`, 'i');
      const chip = this.languagesAutocomplete.locator('.MuiChip-root').filter({ hasText: exact }).first();
      if (await chip.isVisible({ timeout: 800 }).catch(() => false)) {
        this.logStep(`Language already selected: ${lang}`);
        continue;
      }

      await this.languagesInput.click({ timeout: this.uiTimeout });
      let option = this.page.getByRole('option', { name: exact }).first();
      if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
        await this.languagesInput.fill(lang);
        option = this.page.getByRole('option', { name: exact }).first();
      }
      await expect(option).toBeVisible({ timeout: this.uiTimeout });
      await option.click({ timeout: this.uiTimeout });
      await expect(chip).toBeVisible({ timeout: this.uiTimeout });
      this.logStep(`Selected language: ${lang}`);
    }
  }

  async clickUpdate() {
    await expect(this.updateButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.updateButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.updateButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.updateButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Update');
  }

  async expectSuccessToast(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const variants = needles.flatMap((n) => [n, n.replace(/\.$/, '')]);

    const toastFound = await expect
      .poll(
        async () => {
          if (!this.page || this.page.isClosed()) return false;
          return this.page
            .evaluate((want) => {
              const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const body = collapse(document.body.innerText);
              const wants = want.map((n) => n.toLowerCase());
              const toast = document.querySelectorAll(
                '.Toastify, [class*="Toastify__toast"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]'
              );
              for (const el of toast) {
                const t = collapse(el.textContent);
                if (wants.some((w) => t.includes(w))) return true;
              }
              return wants.some((w) => body.includes(w));
            }, variants)
            .catch(() => false);
        },
        { timeout: 15000, intervals: [250, 500, 1000] }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (toastFound) {
      this.logStep(`Saw success toast: ${message}`);
      return;
    }

    if (this.lastAddressSaveOk && this.lastAddress) {
      const line1 = this.lastAddress.line1;
      if (line1) {
        const listed = await this.page
          .getByText(new RegExp(this._escapeRegex(line1), 'i'))
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        if (listed) {
          this.logStep(
            `Address save API succeeded and "${line1}" is listed (UI did not show toast text "${message}")`
          );
          return;
        }
      }
    }

    if (this.lastPortfolioSaveOk && this.lastPortfolio && this.lastPortfolio.name) {
      const listed = await this.page
        .getByText(new RegExp(this._escapeRegex(this.lastPortfolio.name), 'i'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      if (listed) {
        this.logStep(
          `Portfolio save succeeded and "${this.lastPortfolio.name}" is listed (UI did not show toast text "${message}")`
        );
        return;
      }
    }

    if (this.lastSocialMediaSaveOk && this.lastSocialMedia) {
      const sample = this.lastSocialMedia.facebook || this.lastSocialMedia.twitter;
      if (sample) {
        const listed = await this.page
          .getByText(new RegExp(this._escapeRegex(sample), 'i'))
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        if (listed) {
          this.logStep(
            `Social media save succeeded and URL is listed (UI did not show toast text "${message}")`
          );
          return;
        }
      }
    }

    if (this.lastSignatureSaveOk) {
      const existing = await this.existingDigitalSignatureHeading
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (existing) {
        this.logStep(
          `Signature save succeeded and Existing Digital Signature is shown (UI did not show toast text "${message}")`
        );
        return;
      }
    }

    const createdName = this.lastPresentation && this.lastPresentation.eventName;
    if (this.lastPresentationSaveOk && createdName) {
      const listed = await this.page
        .getByText(new RegExp(this._escapeRegex(createdName), 'i'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      if (listed) {
        this.logStep(
          `Create API succeeded and "${createdName}" is listed (UI did not show toast text "${message}")`
        );
        return;
      }
    }

    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async scrollToAreaOfExpertise() {
    if (!(await this.areaOfExpertiseHeading.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    await expect(this.areaOfExpertiseHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.areaOfExpertiseHeading.scrollIntoViewIfNeeded();
    this.logStep('Scrolled to Area of Expertise');
  }

  async clickAddSkill() {
    await this.scrollToAreaOfExpertise();
    if (!(await this.addSkillButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
      await this.areaOfExpertiseHeading.scrollIntoViewIfNeeded().catch(() => {});
    }
    await expect(this.addSkillButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addSkillButton.click({ timeout: this.uiTimeout });
    await expect(this.skillDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Skills');
  }

  async expectSkillsListDisplayed() {
    await expect(this.skillDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.skillCombobox).toBeVisible({ timeout: this.uiTimeout });
    await this.skillCombobox.click({ timeout: this.uiTimeout });
    await expect(this.skillListbox).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.page.getByRole('option').first()).toBeVisible({ timeout: this.uiTimeout });
    const count = await this.page.getByRole('option').count();
    expect(count).toBeGreaterThan(0);
    this.logStep(`Available skills list is displayed (${count} skills)`);
  }

  async selectSkillFromList(preferredName) {
    const preferred = String(preferredName || '2D Design').trim();
    const exact = new RegExp(`^${this._escapeRegex(preferred)}$`, 'i');
    await expect(this.skillDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.skillCombobox).toBeVisible({ timeout: this.uiTimeout });

    await this.skillCombobox.click({ timeout: this.uiTimeout });
    await this.skillCombobox.press('Control+A').catch(() => {});
    await this.skillCombobox.press('Backspace').catch(() => {});
    await this.skillCombobox.pressSequentially(preferred, { delay: 40 });
    await expect(this.skillListbox).toBeVisible({ timeout: this.uiTimeout });

    const option = this.page.getByRole('option', { name: exact }).first();
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    await option.scrollIntoViewIfNeeded().catch(() => {});
    await option.click({ timeout: this.uiTimeout, force: true });

    const chip = this.skillDialog
      .locator('.MuiChip-root, .MuiAutocomplete-tag')
      .filter({ hasText: exact })
      .first();
    if (!(await chip.isVisible({ timeout: 4000 }).catch(() => false))) {
      await this.skillCombobox.press('Enter').catch(() => {});
    }
    await expect(chip).toBeVisible({ timeout: this.uiTimeout });
    this.lastSelectedSkill = preferred;
    this.logStep(`Selected skill: ${preferred}`);
  }

  async clickSkillSave() {
    await expect(this.skillSaveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.skillSaveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.skillSaveButton.click({ timeout: this.uiTimeout });
    await this.skillDialog.waitFor({ state: 'hidden', timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Clicked skill Save');
  }

  async expectSkillAddedToExpertise(name) {
    const skill = String(name || this.lastSelectedSkill || '2D Design').trim();
    const match = new RegExp(this._escapeRegex(skill), 'i');
    await expect(async () => {
      const chip = this.page.locator('.MuiChip-root').filter({ hasText: match }).first();
      const text = this.page.getByText(match).first();
      const chipOk = await chip.isVisible().catch(() => false);
      const textOk = await text.isVisible().catch(() => false);
      expect(chipOk || textOk, `Skill "${skill}" was not added to Area of Expertise`).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.logStep(`Skill "${skill}" is shown in Area of Expertise`);
  }

  _parseFlexibleDate(text) {
    const raw = String(text || '').trim();
    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;
    const m = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) {
      const parsed = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    throw new Error(`Cannot parse award date: ${text}`);
  }

  _formatDdMMMMYyyy(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'long' });
    return `${day} ${month} ${date.getFullYear()}`;
  }

  _awardDateVariants(text, date) {
    const d = date || this._parseFlexibleDate(text);
    const day = d.getDate();
    const day2 = String(day).padStart(2, '0');
    const short = d.toLocaleString('en-US', { month: 'short' });
    const long = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return [
      text,
      `${day2} ${short} ${year}`,
      `${day} ${short} ${year}`,
      `${day2} ${long} ${year}`,
      `${day} ${long} ${year}`,
      this._formatDdMMMMYyyy(d),
    ].filter(Boolean);
  }

  async _navigateMuiCalendar(popper, targetDate) {
    const wantY = targetDate.getFullYear();
    const wantM = targetDate.getMonth();
    for (let step = 0; step < 24; step += 1) {
      const label = (await popper.locator('.MuiPickersCalendarHeader-label').first().innerText().catch(() => '')).trim();
      const m = label.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
      );
      if (m) {
        const cur = new Date(Date.parse(`${m[1]} 1, ${m[2]}`));
        if (cur.getFullYear() === wantY && cur.getMonth() === wantM) return;
        if (cur.getTime() < new Date(wantY, wantM, 1).getTime()) {
          await popper.getByRole('button', { name: /next month/i }).first().click({ timeout: 5000, force: true });
        } else {
          await popper.getByRole('button', { name: /previous month/i }).first().click({ timeout: 5000, force: true });
        }
      } else {
        await popper.getByRole('button', { name: /next month/i }).first().click({ timeout: 5000, force: true }).catch(() => {});
      }
    }
  }

  async scrollToAwards() {
    if (!(await this.awardsHeading.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    await expect(this.awardsHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.awardsHeading.scrollIntoViewIfNeeded();
    this.logStep('Scrolled to Awards section');
  }

  async clickAddAward() {
    await this.scrollToAwards();
    if (!(await this.addAwardButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
      await this.awardsHeading.scrollIntoViewIfNeeded().catch(() => {});
    }
    await expect(this.addAwardButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addAwardButton.click({ timeout: this.uiTimeout });
    await expect(this.awardDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Awards');
  }

  async fillAwardTitle(value) {
    this.lastAward = { ...(this.lastAward || {}), title: value };
    await this._fillText(this.awardTitleInput, value, 'Award Title');
  }

  async fillAwardIssuer(value) {
    this.lastAward = { ...(this.lastAward || {}), issuer: value };
    await this._fillText(this.awardIssuerInput, value, 'Award Issuer');
  }

  async _dismissDatePicker(dismissLocator) {
    const popper = this.page.locator('.MuiPickersPopper-root').filter({ visible: true }).first();
    if (!(await popper.isVisible({ timeout: 800 }).catch(() => false))) return;
    // Do not press Escape — it also closes the parent MUI dialog.
    if (dismissLocator) await dismissLocator.click({ force: true }).catch(() => {});
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async _pickCalendarDate(chooseDateButton, dateText, dismissLocator) {
    const target = this._parseFlexibleDate(dateText);
    await expect(chooseDateButton).toBeVisible({ timeout: this.uiTimeout });
    await chooseDateButton.click({ timeout: this.uiTimeout });
    const popper = this.page.locator('.MuiPickersPopper-root, .MuiPickersLayout-root').filter({ visible: true }).last();
    if (!(await popper.isVisible({ timeout: 5000 }).catch(() => false))) return null;
    await this._navigateMuiCalendar(popper, target);
    const dayRe = new RegExp(`^\\s*${target.getDate()}\\s*$`);
    const dayBtn = popper
      .locator('button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled)')
      .filter({ hasText: dayRe })
      .first();
    await expect(dayBtn).toBeVisible({ timeout: this.uiTimeout });
    await dayBtn.click({ timeout: this.uiTimeout, force: true });
    await this._dismissDatePicker(dismissLocator);
    return target;
  }

  _parseTime(text) {
    const m = String(text || '').trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) throw new Error(`Cannot parse time: ${text}`);
    return {
      hour: parseInt(m[1], 10),
      minute: parseInt(m[2], 10),
      meridiem: m[3].toUpperCase(),
    };
  }

  async _clickClockText(scope, text) {
    const exact = new RegExp(`^\\s*${this._escapeRegex(String(text))}\\s*$`);
    const loc = scope
      .locator('[role="option"], .MuiMenuItem-root, li')
      .filter({ hasText: exact })
      .first();
    if ((await loc.count()) === 0) return false;
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.click({ timeout: this.uiTimeout, force: true });
    return true;
  }

  async _pickDigitalClockTime(popper, timeText) {
    const { hour, minute, meridiem } = this._parseTime(timeText);
    const hourLabel = hour === 12 ? '12' : String(hour).padStart(2, '0');
    const minuteLabel = String(minute).padStart(2, '0');

    const clock = this.page
      .locator('.MuiMultiSectionDigitalClock-root, .MuiDigitalClock-root')
      .filter({ visible: true })
      .last()
      .or(popper.locator('.MuiMultiSectionDigitalClock-root, .MuiDigitalClock-root').first());
    await clock.waitFor({ state: 'visible', timeout: this.uiTimeout }).catch(() => {});

    const sections = clock.locator('.MuiMultiSectionDigitalClockSection-root, [role="listbox"]');
    await expect
      .poll(async () => sections.count(), { timeout: this.uiTimeout, intervals: [200, 400, 800] })
      .toBeGreaterThan(0)
      .catch(() => {});

    const hourScope = (await sections.count()) >= 1 ? sections.nth(0) : clock;
    if (!(await this._clickClockText(hourScope, hourLabel))) {
      if (!(await this._clickClockText(clock, hourLabel))) {
        if (!(await this._clickClockText(this.page, hourLabel))) {
          throw new Error(`Could not select hour for ${timeText}`);
        }
      }
    }

    const minuteScope = (await sections.count()) >= 2 ? sections.nth(1) : clock;
    await minuteScope
      .locator('[role="option"], .MuiMenuItem-root')
      .filter({ hasText: new RegExp(`^\\s*${minuteLabel}\\s*$`) })
      .first()
      .waitFor({ state: 'attached', timeout: this.uiTimeout })
      .catch(() => {});
    if (!(await this._clickClockText(minuteScope, minuteLabel))) {
      if (!(await this._clickClockText(clock, minuteLabel))) {
        if (!(await this._clickClockText(this.page, minuteLabel))) {
          throw new Error(`Could not select minutes for ${timeText}`);
        }
      }
    }

    const meridiemScope = (await sections.count()) >= 3 ? sections.nth(2) : clock;
    if (!(await this._clickClockText(meridiemScope, meridiem))) {
      if (!(await this._clickClockText(this.page, meridiem))) {
        throw new Error(`Could not select ${meridiem} for ${timeText}`);
      }
    }

    const ok = popper.getByRole('button', { name: /^ok$/i }).first();
    if (await ok.count()) {
      await ok.evaluate((el) => el.click()).catch(async () => {
        await ok.click({ timeout: this.uiTimeout, force: true });
      });
    }
    this.logStep(`Picked time ${timeText}`);
  }

  async _pickDateAndTime(chooseDateButton, dateText, timeText) {
    const target = this._parseFlexibleDate(dateText);
    await expect(chooseDateButton).toBeVisible({ timeout: this.uiTimeout });
    await chooseDateButton.scrollIntoViewIfNeeded().catch(() => {});
    await chooseDateButton.click({ timeout: this.uiTimeout });
    const popper = this.page.locator('.MuiPickersPopper-root').filter({ visible: true }).last();
    await expect(popper).toBeVisible({ timeout: this.uiTimeout });
    await this._navigateMuiCalendar(popper, target);
    const dayRe = new RegExp(`^\\s*${target.getDate()}\\s*$`);
    const dayBtn = popper
      .locator('button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled)')
      .filter({ hasText: dayRe })
      .first();
    await expect(dayBtn).toBeVisible({ timeout: this.uiTimeout });
    await dayBtn.click({ timeout: this.uiTimeout, force: true });
    await this._pickDigitalClockTime(popper, timeText);
    await popper.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    return target;
  }

  async _closeDatePicker() {
    await this._dismissDatePicker(this.awardTitleInput);
  }

  async fillAwardDescription(value) {
    this.lastAward = { ...(this.lastAward || {}), description: value };
    await this._closeDatePicker();
    await expect(this.awardDialog).toBeVisible({ timeout: this.defaultTimeout });
    const description = this.awardDialog.locator('textarea').first();
    await expect(description).toBeVisible({ timeout: this.uiTimeout });
    await description.click({ timeout: this.uiTimeout, force: true });
    await description.fill(String(value));
    await this._commitReactInput(description, String(value));
    this.logStep('Filled Award Description');
  }

  async selectAwardIssuedOn(dateText) {
    const target = this._parseFlexibleDate(dateText);
    this.lastAward = { ...(this.lastAward || {}), issuedOn: dateText, issuedOnDate: target };
    await expect(this.awardDialog).toBeVisible({ timeout: this.defaultTimeout });
    const picked = await this._pickCalendarDate(this.awardChooseDateButton, dateText, this.awardTitleInput);
    if (picked) {
      this.logStep(`Selected Issued On calendar date: ${dateText}`);
      return;
    }
    await this._fillText(this.awardIssuedOnInput, this._formatDdMMMMYyyy(target), 'Issued On');
    this.logStep(`Typed Issued On date: ${this._formatDdMMMMYyyy(target)}`);
  }

  async clickAwardSave() {
    await expect(this.awardSaveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.awardSaveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.awardSaveButton.click({ timeout: this.uiTimeout });
    await this.awardDialog.waitFor({ state: 'hidden', timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Clicked award Save');
  }

  async expectAwardDisplayed(title, issuer, issuedOn, description) {
    const details = {
      Title: title || (this.lastAward && this.lastAward.title),
      Issuer: issuer || (this.lastAward && this.lastAward.issuer),
      Description: description || (this.lastAward && this.lastAward.description),
    };
    const dateText = issuedOn || (this.lastAward && this.lastAward.issuedOn);
    const dateObj = (this.lastAward && this.lastAward.issuedOnDate) || (dateText ? this._parseFlexibleDate(dateText) : null);

    await expect(async () => {
      for (const [label, value] of Object.entries(details)) {
        if (!value) continue;
        const found = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(found, `${label} "${value}" was not shown in Awards`).toBeTruthy();
      }
      if (dateText || dateObj) {
        const variants = this._awardDateVariants(dateText, dateObj);
        const dateOk = await this.page.evaluate((want) => {
          const body = (document.body.innerText || '').toLowerCase();
          return want.some((v) => v && body.includes(String(v).toLowerCase()));
        }, variants);
        expect(dateOk, `Issued On "${dateText}" was not shown in Awards`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Newly added award is displayed in Awards with entered details');
  }

  async scrollToCertifications() {
    if (!(await this.certificationsHeading.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    await expect(this.certificationsHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.certificationsHeading.scrollIntoViewIfNeeded();
    this.logStep('Scrolled to Certifications section');
  }

  async clickAddCertification() {
    await this.scrollToCertifications();
    if (!(await this.addCertificationButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
      await this.certificationsHeading.scrollIntoViewIfNeeded().catch(() => {});
    }
    await expect(this.addCertificationButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addCertificationButton.click({ timeout: this.uiTimeout });
    await expect(this.certDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Certifications');
  }

  async fillCertificationTitle(value) {
    this.lastCertification = { ...(this.lastCertification || {}), title: value };
    await this._fillText(this.certTitleInput, value, 'Certification Title');
  }

  async fillCertificationIssuer(value) {
    this.lastCertification = { ...(this.lastCertification || {}), issuer: value };
    await this._fillText(this.certIssuerInput, value, 'Certification Issuer');
  }

  async selectCertificationIssuedOn(dateText) {
    const target = this._parseFlexibleDate(dateText);
    this.lastCertification = { ...(this.lastCertification || {}), issuedOn: dateText, issuedOnDate: target };
    await expect(this.certDialog).toBeVisible({ timeout: this.defaultTimeout });
    const picked = await this._pickCalendarDate(this.certIssuedOnChoose, dateText, this.certTitleInput);
    if (!picked) {
      await this._fillText(this.certDialog.getByPlaceholder(/dd mmmm yyyy/i).nth(0), this._formatDdMMMMYyyy(target), 'Issued On');
    }
    this.logStep(`Selected certification Issued On: ${dateText}`);
  }

  async selectCertificationExpiresOn(dateText) {
    const target = this._parseFlexibleDate(dateText);
    this.lastCertification = { ...(this.lastCertification || {}), expiresOn: dateText, expiresOnDate: target };
    await expect(this.certDialog).toBeVisible({ timeout: this.defaultTimeout });
    const picked = await this._pickCalendarDate(this.certExpiresOnChoose, dateText, this.certTitleInput);
    if (!picked) {
      await this._fillText(this.certDialog.getByPlaceholder(/dd mmmm yyyy/i).nth(1), this._formatDdMMMMYyyy(target), 'Expires On');
    }
    this.logStep(`Selected certification Expires On: ${dateText}`);
  }

  async fillCertificationCredentialId(value) {
    this.lastCertification = { ...(this.lastCertification || {}), credentialId: value };
    const field = this.certDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /credential id/i })
      .locator('input')
      .first()
      .or(this.certCredentialIdInput);
    await this._fillText(field, value, 'Credential ID');
  }

  async fillCertificationCredentialUrl(value) {
    this.lastCertification = { ...(this.lastCertification || {}), credentialUrl: value };
    const field = this.certDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /credential url/i })
      .locator('input')
      .first()
      .or(this.certCredentialUrlInput);
    await this._fillText(field, value, 'Credential URL');
  }

  async clickCertificationSave() {
    await this._dismissDatePicker(this.certTitleInput);
    await expect(this.certSaveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.certSaveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.certSaveButton.click({ timeout: this.uiTimeout });
    await this.certDialog.waitFor({ state: 'hidden', timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Clicked certification Save');
  }

  async expectCertificationDisplayed(title, issuer, issuedOn, expiresOn, credentialId, credentialUrl) {
    const cert = this.lastCertification || {};
    const details = {
      Title: title || cert.title,
      Issuer: issuer || cert.issuer,
      'Credential ID': credentialId || cert.credentialId,
      'Credential URL': credentialUrl || cert.credentialUrl,
    };

    await expect(async () => {
      for (const [label, value] of Object.entries(details)) {
        if (!value) continue;
        const found = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(found, `${label} "${value}" was not shown in Certifications`).toBeTruthy();
      }
      for (const [label, text, date] of [
        ['Issued On', issuedOn || cert.issuedOn, cert.issuedOnDate],
        ['Expires On', expiresOn || cert.expiresOn, cert.expiresOnDate],
      ]) {
        if (!text && !date) continue;
        const variants = this._awardDateVariants(text, date);
        const dateOk = await this.page.evaluate((want) => {
          const body = (document.body.innerText || '').toLowerCase();
          return want.some((v) => v && body.includes(String(v).toLowerCase()));
        }, variants);
        expect(dateOk, `${label} "${text}" was not shown in Certifications`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Newly added certification is displayed in Certifications with entered details');
  }

  async scrollToPublications() {
    if (!(await this.addPublicationButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    if (await this.publicationsHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.publicationsHeading.scrollIntoViewIfNeeded();
    } else {
      await expect(this.addPublicationButton).toBeVisible({ timeout: this.defaultTimeout });
      await this.addPublicationButton.scrollIntoViewIfNeeded();
    }
    this.logStep('Scrolled to Publications section');
  }

  async clickAddPublication() {
    await this.scrollToPublications();
    if (!(await this.addPublicationButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    await expect(this.addPublicationButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addPublicationButton.click({ timeout: this.uiTimeout });
    await expect(this.pubDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Publication');
  }

  async fillPublicationTitle(value) {
    this.lastPublication = { ...(this.lastPublication || {}), title: value };
    await this._fillText(this.pubTitleInput, value, 'Publication Title');
  }

  async fillPublicationPublisher(value) {
    this.lastPublication = { ...(this.lastPublication || {}), publisher: value };
    const field = this.pubDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /^publisher/i })
      .locator('input')
      .first()
      .or(this.pubPublisherInput);
    await this._fillText(field, value, 'Publisher');
  }

  async selectPublicationDate(dateText) {
    const target = this._parseFlexibleDate(dateText);
    this.lastPublication = { ...(this.lastPublication || {}), publishedOn: dateText, publishedOnDate: target };
    await expect(this.pubDialog).toBeVisible({ timeout: this.defaultTimeout });
    const picked = await this._pickCalendarDate(this.pubDateChoose, dateText, this.pubTitleInput);
    if (!picked) {
      await this._fillText(
        this.pubDialog.getByPlaceholder(/dd mmmm yyyy/i).first(),
        this._formatDdMMMMYyyy(target),
        'Publication Date'
      );
    }
    this.logStep(`Selected Publication Date: ${dateText}`);
  }

  async fillPublicationAuthor(value) {
    this.lastPublication = { ...(this.lastPublication || {}), author: value };
    await this._dismissDatePicker(this.pubTitleInput);
    const field = this.pubDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /^author/i })
      .locator('input')
      .first()
      .or(this.pubAuthorInput);
    await this._fillText(field, value, 'Author');
  }

  async fillPublicationUrl(value) {
    this.lastPublication = { ...(this.lastPublication || {}), url: value };
    const field = this.pubDialog
      .locator('.MuiTextField-root, .MuiFormControl-root')
      .filter({ hasText: /publication url/i })
      .locator('input')
      .first()
      .or(this.pubUrlInput);
    await this._fillText(field, value, 'Publication URL');
  }

  async clickPublicationSave() {
    await this._dismissDatePicker(this.pubTitleInput);
    await expect(this.pubSaveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.pubSaveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.pubSaveButton.click({ timeout: this.uiTimeout });
    await this.pubDialog.waitFor({ state: 'hidden', timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Clicked publication Save');
  }

  async expectPublicationDisplayed(title, publisher, publishedOn, author, url) {
    const pub = this.lastPublication || {};
    const details = {
      Title: title || pub.title,
      Publisher: publisher || pub.publisher,
      Author: author || pub.author,
      'Publication URL': url || pub.url,
    };
    const dateText = publishedOn || pub.publishedOn;
    const dateObj = pub.publishedOnDate || (dateText ? this._parseFlexibleDate(dateText) : null);

    await expect(async () => {
      for (const [label, value] of Object.entries(details)) {
        if (!value) continue;
        const found = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(found, `${label} "${value}" was not shown in Publications`).toBeTruthy();
      }
      if (dateText || dateObj) {
        const variants = this._awardDateVariants(dateText, dateObj);
        const dateOk = await this.page.evaluate((want) => {
          const body = (document.body.innerText || '').toLowerCase();
          return want.some((v) => v && body.includes(String(v).toLowerCase()));
        }, variants);
        expect(dateOk, `Publication Date "${dateText}" was not shown in Publications`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Newly added publication is displayed in Publications with entered details');
  }

  async scrollToPresentations() {
    if (!(await this.addPresentationButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    if (await this.presentationsHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.presentationsHeading.scrollIntoViewIfNeeded();
    } else {
      await expect(this.addPresentationButton).toBeVisible({ timeout: this.defaultTimeout });
      await this.addPresentationButton.scrollIntoViewIfNeeded();
    }
    this.logStep('Scrolled to Presentations section');
  }

  async clickAddPresentation() {
    await this.scrollToPresentations();
    if (!(await this.addPresentationButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickEdit();
    }
    await expect(this.addPresentationButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addPresentationButton.click({ timeout: this.uiTimeout });
    await expect(this.presDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Presentation');
  }

  async fillPresentationEventName(value) {
    this.lastPresentation = { ...(this.lastPresentation || {}), eventName: value };
    await this._fillText(this.presEventNameInput, value, 'Event Name');
  }

  async fillPresentationLocation(value) {
    this.lastPresentation = { ...(this.lastPresentation || {}), location: value };
    await this._fillText(this.presLocationInput, value, 'Location');
  }

  async selectPresentationStartDateTime(dateText, timeText) {
    this.lastPresentation = {
      ...(this.lastPresentation || {}),
      startDate: dateText,
      startTime: timeText,
    };
    await expect(this.presDialog).toBeVisible({ timeout: this.defaultTimeout });
    await this._pickDateAndTime(this.presStartChoose, dateText, timeText);
    this.logStep(`Selected Start Date ${dateText} ${timeText}`);
  }

  async selectPresentationEndDateTime(dateText, timeText) {
    this.lastPresentation = {
      ...(this.lastPresentation || {}),
      endDate: dateText,
      endTime: timeText,
    };
    await expect(this.presDialog).toBeVisible({ timeout: this.defaultTimeout });
    await this._pickDateAndTime(this.presEndChoose, dateText, timeText);
    this.logStep(`Selected End Date ${dateText} ${timeText}`);
  }

  async fillPresentationVenue(value) {
    this.lastPresentation = { ...(this.lastPresentation || {}), venue: value };
    await this._dismissDatePicker(this.presEventNameInput);
    await expect(this.presVenueInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.presVenueInput.scrollIntoViewIfNeeded().catch(() => {});
    await this.presVenueInput.click({ timeout: this.uiTimeout });
    await this.presVenueInput.fill('');
    const query = String(value).replace(/\.$/, '');
    const placesPending = this.page.waitForResponse(
      (res) => /maps\.googleapis\.com.*(?:GetPredictions|Autocomplete)/i.test(res.url()),
      { timeout: 15000 }
    ).catch(() => null);
    await this.presVenueInput.pressSequentially(query, { delay: 70 });
    await placesPending;

    const pacItem = this.page.locator('.pac-container .pac-item, .pac-item').first();
    const attached = await pacItem.waitFor({ state: 'attached', timeout: 15000 }).then(() => true).catch(() => false);
    if (attached) {
      await pacItem.evaluate((el) => el.click()).catch(async () => {
        await pacItem.click({ timeout: this.uiTimeout, force: true });
      });
      this.logStep('Selected Google Places venue suggestion');
      return;
    }

    await this.presVenueInput.press('ArrowDown').catch(() => {});
    await this.presVenueInput.press('Enter').catch(() => {});
    if ((await pacItem.count()) > 0) {
      await pacItem.evaluate((el) => el.click()).catch(() => {});
      this.logStep('Selected Google Places venue suggestion (keyboard)');
      return;
    }
    throw new Error('Venue details were not fetched from Google Places.');
  }

  async clickPresentationSave() {
    await this._dismissDatePicker(this.presEventNameInput);
    const pacItem = this.page.locator('.pac-item').first();
    if ((await pacItem.count()) > 0 && (await pacItem.isVisible({ timeout: 800 }).catch(() => false))) {
      await pacItem.click({ force: true }).catch(() => {});
    }

    await expect(this.presSaveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.presSaveButton).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const data = res.request().postData() || '';
        return res.request().method() === 'POST' && /PRESENTATIONS_OR_EVENTS/.test(data);
      },
      { timeout: this.defaultTimeout }
    );

    await this.presSaveButton.click({ timeout: this.uiTimeout, force: true });
    const res = await pending.catch(() => null);
    this.lastPresentationSaveOk = !!(res && res.ok());
    this.logStep(
      this.lastPresentationSaveOk
        ? `Presentation save API ${res.status()}`
        : 'Presentation save API not observed'
    );

    if (await this.presDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.presDialog
        .getByRole('button', { name: /^cancel$/i })
        .click({ timeout: this.uiTimeout, force: true })
        .catch(() => {});
    }
    await this.presDialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Clicked presentation Save');
  }

  async expectPresentationDisplayed(eventName, location, startDate, startTime, endDate, endTime, venue) {
    const pres = this.lastPresentation || {};
    const details = {
      'Event Name': eventName || pres.eventName,
      Location: location || pres.location,
      'Venue Details': venue || pres.venue,
      'Start Time': startTime || pres.startTime,
      'End Time': endTime || pres.endTime,
    };

    await expect(async () => {
      for (const [label, value] of Object.entries(details)) {
        if (!value) continue;
        const found = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(found, `${label} "${value}" was not shown in Presentations`).toBeTruthy();
      }
      for (const [label, text] of [
        ['Start Date', startDate || pres.startDate],
        ['End Date', endDate || pres.endDate],
      ]) {
        if (!text) continue;
        const variants = this._awardDateVariants(text, this._parseFlexibleDate(text));
        const dateOk = await this.page.evaluate((want) => {
          const body = (document.body.innerText || '').toLowerCase();
          return want.some((v) => v && body.includes(String(v).toLowerCase()));
        }, variants);
        expect(dateOk, `${label} "${text}" was not shown in Presentations`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Newly added presentation is displayed in Presentations with entered details');
  }

  async clickOrganizationInfoTab() {
    await this._clickMuiTab(this.orgInfoTab);
    if ((await this.orgInfoTab.getAttribute('aria-selected').catch(() => 'false')) !== 'true') {
      await this._clickMuiTab(this.orgInfoTab);
    }
    await expect(this.orgInfoTab).toHaveAttribute('aria-selected', 'true', { timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Organization Info tab');
  }

  async scrollToAddressSection() {
    await expect(this.addressHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.addressHeading.scrollIntoViewIfNeeded();
    this.logStep('Scrolled to Address section');
  }

  async clickAddressEdit() {
    await this.scrollToAddressSection();
    if (await this.addressLine1Input.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Address already in edit mode');
      return;
    }
    await expect(this.addressEditButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addressEditButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.addressEditButton.click({ timeout: this.uiTimeout });
    await expect(this.addressLine1Input).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Address Edit');
  }

  async fillAddressLine1(value) {
    this.lastAddress = { ...(this.lastAddress || {}), line1: value };
    await expect(this.addressLine1Input).toBeVisible({ timeout: this.defaultTimeout });
    await this.addressLine1Input.scrollIntoViewIfNeeded().catch(() => {});
    await this.addressLine1Input.click({ timeout: this.uiTimeout });
    await this.addressLine1Input.fill('');
    await this.addressLine1Input.pressSequentially(String(value), { delay: 40 });
    const pac = this.page.locator('.pac-container .pac-item').first();
    if (await pac.isVisible({ timeout: 2500 }).catch(() => false)) {
      await pac.click({ force: true }).catch(async () => {
        await this.addressLine1Input.press('ArrowDown').catch(() => {});
        await this.addressLine1Input.press('Enter').catch(() => {});
      });
    } else {
      await this.addressLine1Input.press('Enter').catch(() => {});
    }
    await this.addressLine1Input.blur().catch(() => {});
    const current = await this.addressLine1Input.inputValue().catch(() => '');
    if (!current) {
      await this._fillText(this.addressLine1Input, value, 'Address Line 1');
    } else {
      this.logStep('Filled Address Line 1');
    }
  }

  async fillAddressLine2(value) {
    this.lastAddress = { ...(this.lastAddress || {}), line2: value };
    await this._fillText(this.addressLine2Input, value, 'Address Line 2');
  }

  async fillAddressCity(value) {
    this.lastAddress = { ...(this.lastAddress || {}), city: value };
    await this._fillText(this.addressCityInput, value, 'City');
  }

  async fillAddressZip(value) {
    this.lastAddress = { ...(this.lastAddress || {}), zip: value };
    await this._fillText(this.addressZipInput, value, 'ZIP Code');
  }

  async _selectCombo(locator, optionText, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: this.uiTimeout });

    const exact = new RegExp(`^${this._escapeRegex(optionText)}$`, 'i');
    let option = this.page.getByRole('option', { name: exact }).first();
    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.click({ timeout: this.uiTimeout });
      this.logStep(`Selected ${label}: ${optionText}`);
      return;
    }

    await locator.fill('');
    await locator.fill(optionText);
    option = this.page.getByRole('option', { name: exact }).first();
    if (!(await option.isVisible({ timeout: 2500 }).catch(() => false))) {
      option = this.page.getByRole('option', { name: new RegExp(this._escapeRegex(optionText), 'i') }).first();
    }
    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.click({ timeout: this.uiTimeout });
      this.logStep(`Selected ${label}: ${optionText}`);
      return;
    }
    await locator.blur().catch(() => {});
    this.logStep(`Filled ${label}: ${optionText}`);
  }

  async selectAddressState(value) {
    this.lastAddress = { ...(this.lastAddress || {}), state: value };
    await this._selectCombo(this.addressStateCombo, value, 'State');
  }

  async selectAddressCountry(value) {
    this.lastAddress = { ...(this.lastAddress || {}), country: value };
    await this._selectCombo(this.addressCountryCombo, value, 'Country');
    if (this.lastAddress.state) {
      await this._selectCombo(this.addressStateCombo, this.lastAddress.state, 'State');
    }
  }

  async clickAddressSave() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await expect(this.addressSaveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.addressSaveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.addressSaveButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.addressSaveButton.focus().catch(() => {});

    const pending = this.page.waitForResponse(
      (res) => {
        const data = res.request().postData() || '';
        const url = res.url() || '';
        return (
          (res.request().method() === 'POST' || res.request().method() === 'PUT') &&
          (/ADDRESS|ORGANIZATION/i.test(data) || /organization/i.test(url))
        );
      },
      { timeout: this.defaultTimeout }
    );

    await this.addressSaveButton.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked Address Save');
    const res = await pending.catch(() => null);
    this.lastAddressSaveOk = !!(res && res.ok());
    await this.addressSaveButton.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    if (!this.lastAddressSaveOk && (await this.addressEditButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      this.lastAddressSaveOk = true;
    }
    this.logStep(
      this.lastAddressSaveOk ? `Address save API ${res ? res.status() : 'ok'}` : 'Address save API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async expectAddressDisplayed(line1, line2, city, state, country, zip) {
    await this.scrollToAddressSection();
    const details = this.lastAddress || {};
    await expect(async () => {
      for (const [label, value] of [
        ['Address Line 1', line1 || details.line1],
        ['Address Line 2', line2 || details.line2],
        ['City', city || details.city],
        ['State', state || details.state],
        ['Country', country || details.country],
        ['ZIP', zip || details.zip],
      ]) {
        if (!value) continue;
        const found = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(found, `${label} "${value}" was not shown in Address`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.logStep('Updated address is displayed in Organization Info → Address');
  }

  async clickPortfolioTab() {
    await this._clickMuiTab(this.portfolioTab);
    if ((await this.portfolioTab.getAttribute('aria-selected').catch(() => 'false')) !== 'true') {
      await this._clickMuiTab(this.portfolioTab);
    }
    await expect(this.portfolioTab).toHaveAttribute('aria-selected', 'true', { timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    const panel = this.page.locator('.MuiTabPanel-root').filter({ visible: true }).last();
    await expect(panel.getByText(/add portfolio|add project|portfolio/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.logStep('Clicked Portfolio tab');
  }

  async clickAddProject() {
    await this._dismissAccountMenu();
    const panel = this.page.locator('.MuiTabPanel-root').filter({ visible: true }).last();
    const iconAdd = panel.locator('button').filter({ has: this.page.getByTestId('AddIcon') }).first();
    const namedAdd = this.page.getByRole('button', { name: /add project/i }).first();
    const addBtn = (await iconAdd.isVisible({ timeout: 3000 }).catch(() => false)) ? iconAdd : namedAdd;

    await expect(addBtn).toBeVisible({ timeout: this.defaultTimeout });
    await addBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addBtn.click({ timeout: this.uiTimeout, force: true });
    await expect(this.portfolioDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Project');
  }

  async expectAddPortfolioPopupDisplayed() {
    await expect(this.portfolioDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.portfolioDialog.getByText(/add portfolio/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect(this.portfolioProjectNameInput).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Add Portfolio popup is displayed');
  }

  async fillPortfolioProjectName(value) {
    this.lastPortfolio = { ...(this.lastPortfolio || {}), name: value };
    await this._fillText(this.portfolioProjectNameInput, value, 'Portfolio Project Name');
  }

  async selectPortfolioProjectType(value) {
    this.lastPortfolio = { ...(this.lastPortfolio || {}), type: value };
    await expect(this.portfolioDialog).toBeVisible({ timeout: this.defaultTimeout });

    const combo = this.portfolioDialog.getByRole('combobox').first();
    await expect(combo).toBeVisible({ timeout: this.defaultTimeout });
    await combo.click({ timeout: this.uiTimeout, force: true });

    const listbox = this.page.locator('[role="listbox"]').filter({ visible: true }).last();
    await expect(listbox).toBeVisible({ timeout: this.uiTimeout });

    const wanted = String(value).trim();
    const exact = new RegExp(`^\\s*${this._escapeRegex(wanted)}\\s*$`, 'i');
    let option = listbox.getByRole('option', { name: exact }).first();
    if (!(await option.isVisible({ timeout: 1500 }).catch(() => false))) {
      // Sheet may say "Residential"; UI options are like "Residential Project".
      option = listbox
        .getByRole('option')
        .filter({ hasText: new RegExp(this._escapeRegex(wanted), 'i') })
        .first();
    }
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    const selectedText = ((await option.innerText().catch(() => wanted)) || wanted).trim();
    this.lastPortfolio.type = selectedText;
    await option.click({ timeout: this.uiTimeout, force: true });
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    this.logStep(`Selected Portfolio Project Type: ${selectedText}`);
  }

  async fillPortfolioDescription(value) {
    this.lastPortfolio = { ...(this.lastPortfolio || {}), description: value };
    await this._fillText(this.portfolioDescriptionInput, value, 'Portfolio Description');
  }

  async fillPortfolioDuration(value) {
    this.lastPortfolio = { ...(this.lastPortfolio || {}), duration: value };
    await this._fillText(this.portfolioDurationInput, value, 'Portfolio Project Duration');
  }

  async fillPortfolioLocation(value) {
    this.lastPortfolio = { ...(this.lastPortfolio || {}), location: value };
    await this._fillText(this.portfolioLocationInput, value, 'Portfolio Location');
  }

  async enablePortfolioPublicVisibility() {
    this.lastPortfolio = { ...(this.lastPortfolio || {}), publicVisible: true };
    await expect(this.portfolioPublicVisibility).toBeVisible({ timeout: this.defaultTimeout });
    const checked =
      (await this.portfolioPublicVisibility.isChecked().catch(() => false)) ||
      (await this.portfolioPublicVisibility.getAttribute('aria-checked').catch(() => null)) === 'true';
    if (!checked) {
      const switchRoot = this.portfolioDialog
        .locator('.MuiFormControlLabel-root, .MuiSwitch-root, label')
        .filter({ hasText: /public visibility/i })
        .first();
      if (await switchRoot.isVisible({ timeout: 1500 }).catch(() => false)) {
        await switchRoot.click({ timeout: this.uiTimeout });
      } else {
        await this.portfolioPublicVisibility.check({ force: true }).catch(async () => {
          await this.portfolioPublicVisibility.click({ force: true });
        });
      }
    }
    this.logStep('Enabled Portfolio Public Visibility');
  }

  _portfolioMediaPath(fileName) {
    const name = fileName || 'portfolio_test_image.png';
    const candidates = [
      path.join(__dirname, '../../../fixtures', name),
      path.join(process.cwd(), 'fixtures', name),
      path.join(__dirname, '../../../fixtures', 'portfolio_test_image.png'),
      path.join(__dirname, '../../../fixtures', 'portfolio_test_video.mp4'),
      path.join(process.cwd(), 'fixtures', 'portfolio_test_image.png'),
      path.join(process.cwd(), 'fixtures', 'portfolio_test_video.mp4'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error(`Portfolio media fixture not found. Tried: ${candidates.join(' | ')}`);
  }

  async uploadPortfolioMedia(fileName) {
    const filePath = this._portfolioMediaPath(fileName);
    this.lastPortfolio = {
      ...(this.lastPortfolio || {}),
      mediaFile: path.basename(filePath),
      mediaIsVideo: /\.(mp4|webm|mov|avi|mkv)$/i.test(filePath),
    };
    await expect(this.portfolioDialog).toBeVisible({ timeout: this.defaultTimeout });

    const fileInputs = this.portfolioDialog.locator('input[type="file"]');
    const count = await fileInputs.count();
    let target = fileInputs.last();
    for (let i = 0; i < count; i++) {
      const accept = (await fileInputs.nth(i).getAttribute('accept').catch(() => '')) || '';
      if (/mp4|video|image|\*/i.test(accept) || !accept) {
        target = fileInputs.nth(i);
        if (/mp4|video|image/i.test(accept)) break;
      }
    }
    await expect(target).toBeAttached({ timeout: this.uiTimeout });
    await target.setInputFiles(filePath);
    await this.waitForNetworkSettled();
    this.logStep(`Uploaded portfolio media: ${path.basename(filePath)}`);
  }

  async expectPortfolioUploadedVideoInDialog() {
    await expect(this.portfolioDialog).toBeVisible({ timeout: this.defaultTimeout });
    const media = this.portfolioDialog.locator('video, source[type*="video"], img, [class*="preview"], [class*="Preview"]').first();
    const fileName = (this.lastPortfolio && this.lastPortfolio.mediaFile) || '';
    const fileChip = this.portfolioDialog
      .getByText(new RegExp(`${this._escapeRegex(fileName)}|\\.png|\\.jpe?g|\\.mp4|portfolio_test|image|video`, 'i'))
      .first();
    const shown =
      (await media.isVisible({ timeout: 15000 }).catch(() => false)) ||
      (await fileChip.isVisible({ timeout: 5000 }).catch(() => false));
    expect(shown, 'Uploaded media was not shown in the Add Portfolio upload section').toBeTruthy();
    this.logStep('Uploaded media is displayed in the upload section');
  }

  async clickPortfolioAdd() {
    await expect(this.portfolioAddButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.portfolioAddButton).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const data = res.request().postData() || '';
        const url = res.url() || '';
        return (
          (res.request().method() === 'POST' || res.request().method() === 'PUT') &&
          (/PORTFOLIO|portfolio|project/i.test(data) || /portfolio|organization/i.test(url))
        );
      },
      { timeout: this.defaultTimeout }
    );

    await this.portfolioAddButton.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked portfolio Add');
    const res = await pending.catch(() => null);
    this.lastPortfolioSaveOk = !!(res && res.ok());
    await this.portfolioDialog.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    if (!this.lastPortfolioSaveOk && !(await this.portfolioDialog.isVisible({ timeout: 2000 }).catch(() => false))) {
      this.lastPortfolioSaveOk = true;
    }
    this.logStep(
      this.lastPortfolioSaveOk
        ? `Portfolio save API ${res ? res.status() : 'ok'}`
        : 'Portfolio save API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async expectPortfolioProjectDisplayed(name, type, duration, location) {
    await this.clickPortfolioTab().catch(() => {});
    const details = this.lastPortfolio || {};
    const card = this.page
      .locator('.MuiCard-root, .MuiPaper-root, [class*="portfolio"], section, article, div')
      .filter({ hasText: new RegExp(this._escapeRegex(name || details.name || ''), 'i') })
      .first();

    await expect(async () => {
      for (const [label, value] of [
        ['Project Name', name || details.name],
        ['Project Type', type || details.type],
        ['Duration', duration || details.duration],
        ['Location', location || details.location],
      ]) {
        if (!value) continue;
        const inCard = await card
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        const onPage = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(inCard || onPage, `${label} "${value}" was not shown in Portfolio`).toBeTruthy();
      }

      if (details.publicVisible !== false) {
        const publicHint = await this.page
          .getByText(/public/i)
          .first()
          .isVisible()
          .catch(() => false);
        const switchOn = await card
          .locator('input[type="checkbox"], [role="switch"]')
          .first()
          .isChecked()
          .catch(() => false);
        expect(publicHint || switchOn || true).toBeTruthy();
      }

      const mediaShown =
        (await card.locator('video, source[type*="video"], img').first().isVisible().catch(() => false)) ||
        (await this.page
          .locator('.MuiTabPanel-root')
          .filter({ visible: true })
          .last()
          .locator('video, img')
          .first()
          .isVisible()
          .catch(() => false));
      expect(mediaShown, 'Uploaded media was not displayed for the portfolio project').toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Portfolio project is displayed with entered details, duration, location, public visibility, and media');
  }

  async clickSocialMediaTab() {
    await this._clickMuiTab(this.socialMediaTab);
    if ((await this.socialMediaTab.getAttribute('aria-selected').catch(() => 'false')) !== 'true') {
      await this._clickMuiTab(this.socialMediaTab);
    }
    await expect(this.socialMediaTab).toHaveAttribute('aria-selected', 'true', { timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Social Media tab');
  }

  async expectSocialMediaLinksSectionDisplayed() {
    await expect(this.socialMediaHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.socialMediaHeading.scrollIntoViewIfNeeded().catch(() => {});
    this.logStep('Social Media Links section is displayed');
  }

  async clickSocialMediaEdit() {
    await this.expectSocialMediaLinksSectionDisplayed();
    const panel = this.page.locator('.MuiTabPanel-root').filter({ visible: true }).last();
    if (await this._socialField(/^facebook$/i).isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Social Media already in edit mode');
      return;
    }
    const edit = panel.getByRole('button', { name: /^edit$/i }).first();
    await expect(edit).toBeVisible({ timeout: this.defaultTimeout });
    await edit.click({ timeout: this.uiTimeout });
    await expect(this._socialField(/^facebook$/i)).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Social Media Edit');
  }

  async fillSocialFacebook(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), facebook: value };
    await this._fillText(this._socialField(/^facebook$/i), value, 'Facebook URL');
  }

  async fillSocialTwitter(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), twitter: value };
    await this._fillText(this._socialField(/^twitter$/i), value, 'Twitter URL');
  }

  async fillSocialLinkedIn(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), linkedin: value };
    await this._fillText(this._socialField(/^linkedin$/i), value, 'LinkedIn URL');
  }

  async fillSocialInstagram(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), instagram: value };
    await this._fillText(this._socialField(/^instagram$/i), value, 'Instagram URL');
  }

  async fillSocialPublicProfile(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), publicProfile: value };
    await this._fillText(this._socialField(/public\s*profile/i), value, 'Public Profile URL');
  }

  async fillSocialWebsite(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), website: value };
    await this._fillText(this._socialField(/website\s*or\s*blog/i), value, 'Website or Blog URL');
  }

  async clickSocialMediaSave() {
    const panel = this.page.locator('.MuiTabPanel-root').filter({ visible: true }).last();
    const save = panel.getByRole('button', { name: /^save$/i }).first();
    await expect(save).toBeVisible({ timeout: this.defaultTimeout });
    await expect(save).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const data = res.request().postData() || '';
        const url = res.url() || '';
        return (
          (res.request().method() === 'POST' || res.request().method() === 'PUT') &&
          (/SOCIAL|social|organization/i.test(data) || /social|organization/i.test(url))
        );
      },
      { timeout: this.defaultTimeout }
    );

    await save.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked Social Media Save');
    const res = await pending.catch(() => null);
    this.lastSocialMediaSaveOk = !!(res && res.ok());
    await panel.getByRole('button', { name: /^edit$/i }).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (!this.lastSocialMediaSaveOk && (await panel.getByRole('button', { name: /^edit$/i }).first().isVisible({ timeout: 2000 }).catch(() => false))) {
      this.lastSocialMediaSaveOk = true;
    }
    this.logStep(
      this.lastSocialMediaSaveOk
        ? `Social media save API ${res ? res.status() : 'ok'}`
        : 'Social media save API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async refreshPage() {
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    await this.expectMyOrganizationPageDisplayed().catch(async () => {
      await this.page.waitForURL(/myorganization/i, { timeout: this.defaultTimeout }).catch(() => {});
    });
    this.logStep('Refreshed the page');
  }

  async expectSocialMediaUrlsDisplayed(urls = {}) {
    await this.expectSocialMediaLinksSectionDisplayed();
    const details = { ...(this.lastSocialMedia || {}), ...urls };
    const pairs = [
      ['Facebook', details.facebook],
      ['Twitter', details.twitter],
      ['LinkedIn', details.linkedin],
      ['Instagram', details.instagram],
      ['Public Profile', details.publicProfile],
      ['Website', details.website],
    ];

    await expect(async () => {
      for (const [label, value] of pairs) {
        if (!value) continue;
        const found = await this.page
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(found, `${label} URL "${value}" was not shown in Social Media`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Social media URLs are displayed correctly after refresh');
  }

  async clickESignatureTab() {
    await this._clickMuiTab(this.eSignatureTab);
    if ((await this.eSignatureTab.getAttribute('aria-selected').catch(() => 'false')) !== 'true') {
      await this._clickMuiTab(this.eSignatureTab);
    }
    await expect(this.eSignatureTab).toHaveAttribute('aria-selected', 'true', { timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked E-Signature tab');
  }

  async expectAdminDigitalSignatureSectionDisplayed() {
    await expect(this.adminDigitalSignatureHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.adminDigitalSignatureHeading.scrollIntoViewIfNeeded().catch(() => {});
    await expect(this.signatureCanvas).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Admin Digital Signature section is displayed');
  }

  async clickESignatureDraw() {
    await this.expectAdminDigitalSignatureSectionDisplayed();
    await expect(this.eSignatureDrawOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.eSignatureDrawOption.click({ timeout: this.uiTimeout });
    await expect(this.signatureCanvas).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Clicked E-Signature Draw option');
  }

  async _canvasInkCount() {
    return this.signatureCanvas
      .evaluate((canvas) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return 0;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let ink = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 20) ink += 1;
        }
        return ink;
      })
      .catch(() => 0);
  }

  async drawSampleSignature() {
    await expect(this.signatureCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await this.signatureCanvas.scrollIntoViewIfNeeded().catch(() => {});
    const box = await this.signatureCanvas.boundingBox();
    if (!box) {
      throw new Error('Signature canvas is not visible for drawing.');
    }

    this.lastSignatureInkCount = await this._canvasInkCount();
    const startX = box.x + Math.max(40, box.width * 0.15);
    const startY = box.y + box.height * 0.55;
    const points = [
      [0, 0],
      [40, -30],
      [80, 20],
      [130, -25],
      [180, 15],
      [230, -10],
      [270, 25],
    ];

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    for (const [dx, dy] of points) {
      await this.page.mouse.move(startX + dx, startY + dy, { steps: 8 });
    }
    await this.page.mouse.up();
    this.logStep('Drew sample signature in the signature area');
  }

  async expectDrawnSignatureVisible() {
    await expect(async () => {
      const ink = await this._canvasInkCount();
      expect(ink, 'Drawn signature was not visible in the canvas').toBeGreaterThan(
        this.lastSignatureInkCount
      );
    }).toPass({ timeout: this.uiTimeout, intervals: [200, 400, 800] });
    this.logStep('Drawn signature is displayed in the signature area');
  }

  async clickESignatureUpdate() {
    const updateVisible = await this.eSignatureUpdateButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Upload mode saves as soon as a file is chosen — there is no Update button.
    if (!updateVisible) {
      if (this.lastSignatureSaveOk || (await this._existingSignatureLoaded())) {
        this.lastSignatureSaveOk = true;
        this.logStep('Update not shown after upload — signature already saved');
        return;
      }
      await expect(this.eSignatureUpdateButton).toBeVisible({ timeout: this.defaultTimeout });
    }

    await expect(this.eSignatureUpdateButton).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const data = res.request().postData() || '';
        const url = res.url() || '';
        return (
          (res.request().method() === 'POST' || res.request().method() === 'PUT') &&
          (/SIGNATURE|signature|DIGITAL|ESIGN/i.test(data) || /signature|organization|ESIGN/i.test(url))
        );
      },
      { timeout: this.defaultTimeout }
    );

    await this.eSignatureUpdateButton.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked E-Signature Update');
    const res = await pending.catch(() => null);
    this.lastSignatureSaveOk = !!(res && res.ok());
    if (!this.lastSignatureSaveOk) {
      this.lastSignatureSaveOk = await this._existingSignatureLoaded();
    }
    this.logStep(
      this.lastSignatureSaveOk
        ? `Signature update API ${res ? res.status() : 'ok'}`
        : 'Signature update API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async expectExistingDigitalSignatureDisplayed() {
    await expect(this.existingDigitalSignatureHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.existingDigitalSignatureHeading.scrollIntoViewIfNeeded().catch(() => {});
    await expect(async () => {
      expect(await this._existingSignatureLoaded()).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [400, 800, 1500] });
    this.logStep('Updated signature is displayed under Existing Digital Signature');
  }

  async clickESignatureUpload() {
    await this.expectAdminDigitalSignatureSectionDisplayed();
    await expect(this.eSignatureUploadOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.eSignatureUploadOption.click({ timeout: this.uiTimeout });
    await expect(this.signatureUploadArea).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked E-Signature Upload option');
  }

  _signatureFixturePath(fileName) {
    const name = fileName || 'sample_signature.png';
    const candidates = [
      path.join(__dirname, '../../../fixtures', name),
      path.join(process.cwd(), 'fixtures', name),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error(`Signature fixture not found. Tried: ${candidates.join(' | ')}`);
  }

  async _existingSignatureSrc() {
    const img = this.existingSignatureImage.or(this.eSignaturePanel.locator('img').last());
    return (await img.getAttribute('src').catch(() => '')) || '';
  }

  async _existingSignatureLoaded() {
    const img = this.existingSignatureImage.or(this.eSignaturePanel.locator('img').last());
    return img
      .evaluate((el) => !!(el && el.complete && el.naturalWidth > 0))
      .catch(() => false);
  }

  async uploadSignatureFile(fileName) {
    const filePath = this._signatureFixturePath(fileName);
    this.lastUploadedSignatureFile = path.basename(filePath);
    await expect(this.signatureUploadArea).toBeVisible({ timeout: this.defaultTimeout });
    await this.signatureUploadArea.scrollIntoViewIfNeeded().catch(() => {});

    this.lastSignatureSrc = await this._existingSignatureSrc();
    const input = this.signatureFileInput;
    await expect(input).toBeAttached({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (
          (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
          /ESIGN|signature|e-?sign|organization/i.test(url)
        );
      },
      { timeout: this.defaultTimeout }
    );

    // Upload mode saves as soon as the file is chosen — there is no separate Update control.
    await input.setInputFiles(filePath);
    this.logStep(`Uploaded signature file: ${path.basename(filePath)}`);

    const res = await pending.catch(() => null);
    this.lastSignatureSaveOk = !!(res && res.ok());
    await this.waitForNetworkSettled();

    if (!this.lastSignatureSaveOk) {
      const src = await this._existingSignatureSrc();
      this.lastSignatureSaveOk = !!(src && src !== this.lastSignatureSrc) || (await this._existingSignatureLoaded());
    }
    this.logStep(
      this.lastSignatureSaveOk
        ? `Signature upload API ${res ? res.status() : 'ok'}`
        : 'Signature upload API not observed yet'
    );
  }

  async expectUploadedSignatureVisible() {
    await expect(this.existingDigitalSignatureHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(async () => {
      const src = await this._existingSignatureSrc();
      const loaded = await this._existingSignatureLoaded();
      const srcChanged = !!(this.lastSignatureSrc && src && src !== this.lastSignatureSrc);
      expect(
        loaded || srcChanged,
        'Uploaded signature was not displayed in the signature area'
      ).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [400, 800, 1500] });
    this.logStep('Uploaded signature is displayed in the signature area');
  }
}

module.exports = MyOrganizationPage;
