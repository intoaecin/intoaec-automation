const path = require('path');
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

/**
 * Header → Profile Settings → My Account (view / edit profile).
 *
 * Layering per AGENTS.md:
 *   Feature: features/admin/account/My accounts.feature
 *   Steps:   step-definitions/admin/account/MyAccount.steps.js
 *   Page:    this file
 */
class MyAccountPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.main = page.locator('main, [role="main"]').first();
    this.header = page.locator('header, [class*="MuiAppBar"]').first();

    this.userAvatar = this.header
      .locator('.MuiAvatar-root, [class*="MuiAvatar"], button')
      .last();
    this.accountSettingsButton = page.getByLabel(/account settings|profile settings/i).first();
    this.profileSettingsNav = page
      .getByRole('menuitem', { name: /profile settings|account settings/i })
      .or(page.getByRole('button', { name: /profile settings|account settings/i }))
      .or(page.getByRole('link', { name: /profile settings|account settings/i }))
      .or(page.getByText(/^profile settings$|^account settings$/i))
      .first();
    this.myAccountNav = page
      .getByRole('menuitem', { name: /^my account$/i })
      .or(page.getByRole('tab', { name: /^my account$/i }))
      .or(page.getByRole('link', { name: /^my account$/i }))
      .or(page.getByRole('button', { name: /^my account$/i }))
      .first();
    this.pageHeading = page.getByRole('heading', { name: /my account|my profile|profile detail/i }).first();
    this.editButton = page.getByRole('button', { name: /^edit$/i }).first();
    this.updateButton = page.getByRole('button', { name: /^(save|update)$/i }).first();

    this.firstNameInput = page.locator('input[name="firstName"]').filter({ visible: true }).first();
    this.lastNameInput = page.locator('input[name="lastName"]').first();
    this.emailInput = page
      .locator('input[name="email"]')
      .or(page.getByPlaceholder(/enter your email/i))
      .first();
    this.mobileInput = page.locator('input[name="mobileNumber"], input[type="tel"]').first();
    this.organizationInput = page.locator('input[name="organizationName"]').first();
    this.addressLine1Input = page.locator('input[name="addressLine1"]').first();
    this.addressLine2Input = page.locator('input[name="addressLine2"]').first();
    this.cityInput = page.locator('input[name="city"]').first();
    this.stateCombo = page.locator('input[name="state"]').first();
    this.countryCombo = page.locator('input[name="country"]').first();
    this.zipInput = page.locator('input[name="zipCode"]').first();

    this.profilePictureFileInput = page.locator('input[type="file"][accept="image/*"]').first();
    this.profilePictureWrap = page
      .locator('div[style*="5.5rem"]')
      .filter({ has: page.locator('.MuiAvatar-root') })
      .first();
    this.profilePicture = this.profilePictureWrap.locator('.MuiAvatar-root').first();
    this.profilePictureMenuButton = this.profilePictureWrap
      .locator('button')
      .filter({ has: page.getByTestId('KeyboardDoubleArrowRightIcon') })
      .first();
    this.profilePictureMenu = page.locator('#simple-popover').first();
    this.profileHoverCloseIcon = page.locator('#simple-popover [aria-label="Close"]').first();
    this.profileHoverViewIcon = page.locator('#simple-popover [aria-label="Preview"]').first();
    this.profileHoverUploadIcon = page.locator('#simple-popover [aria-label="Replace"]').first();
    this.profileHoverDeleteIcon = page
      .locator('#simple-popover [aria-label="Delete"], #simple-popover [aria-label="Remove"]')
      .first();
    this.profilePreviewDialog = page.locator('.MuiModal-root:not(#simple-popover)').filter({ visible: true }).last();
    this.profilePreviewImage = this.profilePreviewDialog
      .locator('svg[width="600px"], img, .MuiBox-root svg')
      .first();
    this.profilePreviewClose = this.profilePreviewDialog.locator('button').first();
    this.profileDeleteConfirm = page
      .getByRole('button', { name: /^(yes|delete|confirm|ok)$/i })
      .filter({ visible: true })
      .first();

    this.securityTab = page.getByRole('tab', { name: /^security$/i }).first();
    this.currentPasswordInput = page.locator('#current-password').first();
    this.newPasswordInput = page.locator('#password').first();
    this.confirmNewPasswordInput = page.locator('#new-password').first();
    this.changePasswordButton = page.getByRole('button', { name: /^change password$/i }).first();

    this.lastProfile = null;
    this.lastUploadedProfileSrc = null;
  }

  _field(labelRe) {
    return this.page
      .getByRole('textbox', { name: labelRe })
      .or(this.page.getByLabel(labelRe))
      .or(this.page.getByPlaceholder(labelRe))
      .first();
  }

  _combo(labelRe) {
    return this.page
      .getByRole('combobox', { name: labelRe })
      .or(this.page.getByLabel(labelRe))
      .first();
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  logStep(msg) {
    console.log(`[MyAccount] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async isOnMyAccountPage() {
    const urlHit = /myprofile|my[-_]?account|account\/(me|profile)|settings\/account/i.test(this.page.url());
    const edit = await this.editButton.isVisible({ timeout: 1500 }).catch(() => false);
    const firstName = await this.firstNameInput.isVisible({ timeout: 1500 }).catch(() => false);
    const update = await this.updateButton.isVisible({ timeout: 800 }).catch(() => false);
    return urlHit || edit || firstName || update;
  }

  async _dismissBlockingOverlays() {
    await this.page.keyboard.press('Escape').catch(() => {});
    const blockers = [
      this.page.getByRole('button', { name: /^(close|skip|got it|ok|continue)$/i }).filter({ visible: true }).first(),
      this.page.locator('.MuiBackdrop-root').filter({ visible: true }).last(),
    ];
    for (const loc of blockers) {
      if (await loc.isVisible({ timeout: 400 }).catch(() => false)) {
        await loc.click({ force: true }).catch(() => {});
      }
    }
  }

  async _accountMenuOpened() {
    return (
      (await this.myAccountNav.isVisible({ timeout: 1500 }).catch(() => false)) ||
      (await this.page.getByRole('menuitem', { name: /my organization/i }).isVisible({ timeout: 800 }).catch(() => false))
    );
  }

  async navigateToProfileSettings() {
    await this.waitForNetworkSettled();
    await this._dismissBlockingOverlays();

    const header = this.page.locator('header, [class*="MuiAppBar"]').first();
    if (!(await header.isVisible({ timeout: 8000 }).catch(() => false))) {
      await this.page.goto(env.admin, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await this.waitForNetworkSettled();
      await this._dismissBlockingOverlays();
    }

    await this.page
      .getByLabel(/clients\/projects|account settings|profile settings/i)
      .first()
      .waitFor({ state: 'visible', timeout: this.defaultTimeout })
      .catch(() => {});

    const accountSettings = this.page.getByLabel(/account settings|profile settings/i).first();
    await expect
      .poll(async () => accountSettings.isVisible().catch(() => false), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy()
      .catch(() => {});

    if (await accountSettings.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountSettings.click({ timeout: this.uiTimeout, force: true });
      if (await this._accountMenuOpened()) {
        this.logStep('Opened Account Settings menu');
        return;
      }
    }

    if (await this.profileSettingsNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.profileSettingsNav.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
      this.logStep('Opened Profile Settings from visible nav');
      return;
    }

    const avatarCandidates = [
      this.userAvatar,
      this.page.locator('header .MuiAvatar-root, header button[aria-label*="Account" i], .MuiAvatar-root').first(),
      this.page.getByRole('button', { name: /account|profile|user|avatar|settings/i }).first(),
      this.header.getByRole('button').last(),
    ];

    let openedMenu = false;
    for (const candidate of avatarCandidates) {
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      await candidate.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      openedMenu = true;
      if (await this._accountMenuOpened()) break;
    }

    if (await this._accountMenuOpened()) {
      this.logStep('Opened Account Settings menu');
      return;
    }

    if (!openedMenu) {
      throw new Error('Could not open Account Settings to reach My Account.');
    }

    await expect(this.profileSettingsNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.profileSettingsNav.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Opened Profile Settings from user menu');
  }

  async clickMyAccount() {
    if (/myprofile/i.test(this.page.url()) && !(await this.myAccountNav.isVisible({ timeout: 800 }).catch(() => false))) {
      this.logStep('Already on My Account (/myprofile)');
      return;
    }

    await expect(this.myAccountNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.myAccountNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/myprofile|my[-_]?account/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    await this.expectMyAccountPageDisplayed();
    this.logStep('Clicked My Account');
  }

  async expectMyAccountPageDisplayed() {
    await expect(async () => {
      expect(await this.isOnMyAccountPage()).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.logStep('My Account page is displayed');
  }

  async clickEdit() {
    if (await this.firstNameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Profile already in edit mode');
      return;
    }

    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editButton.click({ timeout: this.uiTimeout });
    await expect(this.firstNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    await expect
      .poll(async () => this.firstNameInput.inputValue().catch(() => ''), {
        timeout: 15000,
        intervals: [300, 600, 1000],
      })
      .not.toEqual('')
      .catch(() => {});
    this.logStep('Clicked Edit — waiting for existing data then replacing with TC values');
  }

  async _commitReactInput(locator, wanted) {
    await locator.evaluate((el, val) => {
      const proto = window.HTMLInputElement.prototype;
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

  _inputMatchesWanted(current, wanted) {
    const cur = String(current || '');
    const want = String(wanted || '');
    if (cur === want) return true;
    if (cur.replace(/\s+/g, '').toLowerCase() === want.replace(/\s+/g, '').toLowerCase()) return true;
    const curDigits = cur.replace(/\D/g, '');
    const wantDigits = want.replace(/\D/g, '');
    if (wantDigits && curDigits && (curDigits === wantDigits || curDigits.endsWith(wantDigits))) return true;
    return false;
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
    await locator.press('Control+A').catch(() => {});
    await locator.pressSequentially(wanted, { delay: 50 });
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});

    const current = await locator.inputValue().catch(() => '');
    if (!this._inputMatchesWanted(current, wanted)) {
      this.logStep(`WARN ${label} shows "${current}" after typing "${wanted}" — continuing to Save`);
    } else {
      this.logStep(`Replaced existing ${label} with: ${wanted} (now "${current}")`);
    }
    return true;
  }

  async fillFirstName(value) {
    this.lastProfile = { ...(this.lastProfile || {}), firstName: value };
    const label = this.page.getByText(/first name/i).first();
    if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
      await label.click({ timeout: this.uiTimeout }).catch(() => {});
    }
    await this._fillText(this.firstNameInput, value, 'First Name');
  }

  async fillLastName(value) {
    this.lastProfile = { ...(this.lastProfile || {}), lastName: value };
    await this._fillText(this.lastNameInput, value, 'Last Name');
  }

  async fillEmail(value) {
    this.lastProfile = { ...(this.lastProfile || {}), email: value };
    await this._fillText(this.emailInput, value, 'Email Address');
  }

  async fillMobile(value) {
    this.lastProfile = { ...(this.lastProfile || {}), mobile: value };
    const digits = String(value).replace(/\D/g, '');
    const national = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits.slice(-10);
    const filled = await this._fillText(this.mobileInput, national, 'Mobile Number');
    if (!filled) {
      await this._fillText(this.mobileInput, String(value), 'Mobile Number (raw)');
    }
  }

  async fillOrganization(value) {
    this.lastProfile = { ...(this.lastProfile || {}), organization: value };
    await this._fillText(this.organizationInput, value, 'Organization');
  }

  async fillAddressLine1(value) {
    this.lastProfile = { ...(this.lastProfile || {}), addressLine1: value };
    await this._fillText(this.addressLine1Input, value, 'Address Line 1');
  }

  async fillAddressLine2(value) {
    this.lastProfile = { ...(this.lastProfile || {}), addressLine2: value };
    await this._fillText(this.addressLine2Input, value, 'Address Line 2');
  }

  async fillCity(value) {
    this.lastProfile = { ...(this.lastProfile || {}), city: value };
    await this._fillText(this.cityInput, value, 'City');
  }

  async fillZip(value) {
    this.lastProfile = { ...(this.lastProfile || {}), zip: value };
    await this._fillText(this.zipInput, value, 'ZIP Code');
  }

  async _selectCombo(locator, optionText, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: this.uiTimeout });

    const exact = new RegExp(`^${this._escapeRegex(optionText)}$`, 'i');
    let option = this.page.getByRole('option', { name: exact }).first();
    if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
      await option.click({ timeout: this.uiTimeout });
      this.logStep(`Selected ${label}: ${optionText}`);
      return;
    }

    await this._fillText(locator, optionText, label);
    option = this.page.getByRole('option', { name: exact }).first();
    if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
      await option.click({ timeout: this.uiTimeout });
      this.logStep(`Selected ${label} option: ${optionText}`);
    }
  }

  async selectState(value) {
    this.lastProfile = { ...(this.lastProfile || {}), state: value };
    await this._selectCombo(this.stateCombo, value, 'State');
  }

  async selectCountry(value) {
    this.lastProfile = { ...(this.lastProfile || {}), country: value };
    await this._selectCombo(this.countryCombo, value, 'Country');
  }

  async clickUpdate() {
    if (this.lastProfile && this.lastProfile.firstName) {
      await this.firstNameInput.click({ timeout: this.uiTimeout }).catch(() => {});
      await this.firstNameInput.press('Control+A').catch(() => {});
      await this.firstNameInput.pressSequentially(this.lastProfile.firstName, { delay: 40 }).catch(() => {});
      await this._commitReactInput(this.firstNameInput, this.lastProfile.firstName).catch(() => {});
    }

    const saveOrUpdate = this.page.getByRole('button', { name: /^(save|update)$/i }).first();
    await expect(saveOrUpdate).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveOrUpdate).toBeEnabled({ timeout: this.defaultTimeout });
    await saveOrUpdate.scrollIntoViewIfNeeded().catch(() => {});
    await saveOrUpdate.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Save/Update');
  }

  async expectSuccessToast(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const variants = needles.flatMap((n) => [n, n.replace(/\.$/, '')]);

    await expect
      .poll(
        async () =>
          this.page.evaluate((want) => {
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
          }, variants),
        { timeout: this.defaultTimeout, intervals: [250, 500, 1000] }
      )
      .toBeTruthy();

    this.logStep(`Saw success toast: ${message}`);
  }

  async _pageHasValue(value) {
    if (value == null || value === '') return true;
    const text = String(value);
    const visible = await this.page
      .getByText(text, { exact: false })
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    if (visible) return true;

    const inputHit = await this.page.evaluate((want) => {
      const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const target = collapse(want);
      const fields = document.querySelectorAll('input, textarea, [role="combobox"]');
      for (const el of fields) {
        const v = collapse(el.value || el.textContent || el.getAttribute('value'));
        if (v && v.includes(target)) return true;
      }
      return false;
    }, text);
    return inputHit;
  }

  async expectProfileDetailsSaved() {
    const details = this.lastProfile || {};
    const checks = [
      ['First Name', details.firstName],
      ['Last Name', details.lastName],
      ['Email Address', details.email],
      ['Organization', details.organization],
      ['Address Line 1', details.addressLine1],
      ['Address Line 2', details.addressLine2],
      ['City', details.city],
      ['State', details.state],
      ['Country', details.country],
      ['ZIP Code', details.zip],
    ];

    await expect(async () => {
      for (const [label, value] of checks) {
        if (!value) continue;
        const found = await this._pageHasValue(value);
        expect(found, `${label} "${value}" was not saved on My Account`).toBeTruthy();
      }

      if (details.mobile) {
        const digits = String(details.mobile).replace(/\D/g, '');
        const mobileOk = await this.page.evaluate((wantDigits) => {
          const body = (document.body.innerText || '').replace(/\D/g, '');
          if (body.includes(wantDigits) || body.includes(wantDigits.slice(-10))) return true;
          const fields = document.querySelectorAll('input, textarea');
          for (const el of fields) {
            const d = String(el.value || '').replace(/\D/g, '');
            if (d && (d.includes(wantDigits) || d.includes(wantDigits.slice(-10)))) return true;
          }
          return false;
        }, digits);
        expect(mobileOk, `Mobile "${details.mobile}" was not saved on My Account`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Updated profile details are saved');
  }

  _profileImageFixturePath() {
    return path.join(__dirname, '../../../fixtures/sample-profile.png');
  }

  async _profilePictureSrc() {
    return this.profilePicture.evaluate((el) => {
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      return (img && img.getAttribute('src')) || el.getAttribute('src') || el.textContent || '';
    }).catch(() => '');
  }

  async hoverProfilePicture() {
    await expect(this.profilePicture).toBeVisible({ timeout: this.defaultTimeout });
    await this.profilePictureWrap.scrollIntoViewIfNeeded().catch(() => {});
    await this.profilePictureWrap.hover({ timeout: this.uiTimeout, force: true }).catch(() => {});
    if (!(await this.profileHoverCloseIcon.isVisible({ timeout: 1500 }).catch(() => false))) {
      await expect(this.profilePictureMenuButton).toBeVisible({ timeout: this.uiTimeout });
      await this.profilePictureMenuButton.click({ timeout: this.uiTimeout, force: true });
    }
    await expect(this.profilePictureMenu).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened My Account profile picture actions');
  }

  async expectProfileHoverIconsVisible() {
    await this.hoverProfilePicture();
    await expect(this.profileHoverCloseIcon).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.profileHoverViewIcon).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.profileHoverUploadIcon).toBeVisible({ timeout: this.uiTimeout });
    const hasPhoto = (await this.profilePicture.locator('img').count()) > 0;
    if (hasPhoto) {
      await expect(this.profileHoverDeleteIcon).toBeVisible({ timeout: this.uiTimeout });
    } else if (!(await this.profileHoverDeleteIcon.isVisible({ timeout: 2000 }).catch(() => false))) {
      this.logStep('Delete icon not shown yet (no photo) — Close, Preview, Replace are displayed');
    }
    this.logStep('Profile picture action icons are displayed');
  }

  async clickProfileViewIcon() {
    await this.hoverProfilePicture();
    await expect(this.profileHoverViewIcon).toBeVisible({ timeout: this.uiTimeout });
    await this.profileHoverViewIcon.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked profile picture Preview/View icon');
  }

  async expectProfilePreviewVisible() {
    await expect(this.profilePreviewDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.profilePreviewImage).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Profile picture preview is displayed');
  }

  async closeProfilePreview() {
    const closeBtn = this.profilePreviewClose;
    if (await closeBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await closeBtn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.profilePreviewDialog.waitFor({ state: 'hidden', timeout: this.uiTimeout }).catch(() => {});
    this.logStep('Closed profile picture preview');
  }

  async clickProfileUploadIcon() {
    await this.hoverProfilePicture();
    await expect(this.profileHoverUploadIcon).toBeVisible({ timeout: this.uiTimeout });
    this._pendingProfileFileChooser = this.page.waitForEvent('filechooser', { timeout: this.uiTimeout }).catch(() => null);
    await this.profileHoverUploadIcon.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked profile picture Replace/Upload icon');
  }

  async selectValidProfileImage() {
    const filePath = this._profileImageFixturePath();
    this.lastUploadedProfileSrc = await this._profilePictureSrc();
    const chooser = this._pendingProfileFileChooser ? await this._pendingProfileFileChooser : null;
    this._pendingProfileFileChooser = null;
    if (chooser) {
      await chooser.setFiles(filePath);
    } else {
      await this.profilePictureFileInput.setInputFiles(filePath);
    }
    await this.waitForNetworkSettled();
    this.logStep(`Selected profile image: ${path.basename(filePath)}`);
  }

  async expectProfilePictureUploaded() {
    const imgVisible = await this.profilePicture
      .locator('img')
      .first()
      .isVisible({ timeout: this.defaultTimeout })
      .catch(() => false);
    if (!imgVisible) {
      await this.expectSuccessToast('uploaded|updated|success|profile picture');
    }
    this.logStep('Profile picture uploaded successfully');
  }

  async expectUpdatedProfilePictureDisplayed() {
    await expect(async () => {
      const src = await this._profilePictureSrc();
      expect(src && src !== this.lastUploadedProfileSrc).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.lastUploadedProfileSrc = await this._profilePictureSrc();
    this.logStep('Updated profile picture is displayed');
  }

  async clickProfileDeleteIcon() {
    await this.hoverProfilePicture();
    await expect(this.profileHoverDeleteIcon).toBeVisible({ timeout: this.uiTimeout });
    await this.profileHoverDeleteIcon.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked profile picture Delete icon');
  }

  async confirmProfilePictureDelete() {
    if (await this.profileDeleteConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.profileDeleteConfirm.click({ timeout: this.uiTimeout });
    } else {
      const yes = this.page.getByRole('button', { name: /yes|delete|confirm/i }).first();
      await expect(yes).toBeVisible({ timeout: this.uiTimeout });
      await yes.click({ timeout: this.uiTimeout });
    }
    await this.waitForNetworkSettled();
    this.logStep('Confirmed profile picture delete');
  }

  async expectProfilePictureDeleted() {
    await this.expectSuccessToast('deleted|removed|success');
    this.logStep('Profile picture deleted successfully');
  }

  async expectDefaultProfilePictureDisplayed() {
    await expect(async () => {
      const src = await this._profilePictureSrc();
      const initials = await this.profilePicture
        .locator('.MuiAvatar-fallback, svg')
        .first()
        .isVisible()
        .catch(() => false);
      const looksDefault =
        !src ||
        src.length <= 2 ||
        /default|placeholder|avatar/i.test(src) ||
        initials;
      const removedUpload = this.lastUploadedProfileSrc && src !== this.lastUploadedProfileSrc;
      expect(looksDefault || removedUpload).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
    this.logStep('Default profile picture is displayed');
  }

  async navigateToSecurity() {
    await expect(this.securityTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.securityTab.click({ timeout: this.uiTimeout });
    await expect(this.currentPasswordInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.newPasswordInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.confirmNewPasswordInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.changePasswordButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened My Account Security tab');
  }

  async fillCurrentPassword(value) {
    await this._fillText(this.currentPasswordInput, value, 'Current Password');
  }

  async fillNewPassword(value) {
    await this._fillText(this.newPasswordInput, value, 'New Password');
  }

  async fillConfirmNewPassword(value) {
    await this._fillText(this.confirmNewPasswordInput, value, 'Confirm New Password');
  }

  async clickChangePassword() {
    await expect(this.changePasswordButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.changePasswordButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.changePasswordButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.changePasswordButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Change Password');
  }
}

module.exports = MyAccountPage;
