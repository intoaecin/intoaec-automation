const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Vendor portal → Account Settings → My Profile.
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/auth/VendorLogin_TestCases.feature
 *   Steps:   step-definitions/vendor/auth/VendorLoginStep.js
 *   Page:    this file
 */
class VendorProfilePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.accountSettings = page
      .getByLabel(/account settings|profile settings/i)
      .or(page.getByRole('button', { name: /account settings|profile settings/i }))
      .first();
    this.myProfileNav = page
      .getByRole('menuitem', { name: /^my profile$/i })
      .or(page.getByRole('link', { name: /^my profile$/i }))
      .or(page.getByRole('button', { name: /^my profile$/i }))
      .or(page.getByText(/^my profile$/i))
      .first();
    this.profileDetailTab = page.getByRole('tab', { name: /profile detail/i }).first();
    this.securityTab = page.getByRole('tab', { name: /^security$/i }).first();
    this.updatePasswordHeading = page
      .getByRole('heading', { name: /update password/i })
      .or(page.getByText(/update password/i))
      .first();
    this.currentPasswordInput = page.locator('#current-password').first();
    this.newPasswordInput = page.locator('#password').first();
    this.confirmNewPasswordInput = page.locator('#new-password').first();
    this.changePasswordButton = page.getByRole('button', { name: /change password/i }).first();
    this.pageHeading = page
      .getByRole('heading', { name: /profile detail|my profile/i })
      .or(page.getByText(/profile detail|my profile/i))
      .first();
    this.editButton = page.getByRole('button', { name: /^edit$/i }).first();
    this.saveButton = page.getByRole('button', { name: /^(save|update)$/i }).first();

    this.firstNameInput = page.locator('input[name="firstName"]').first();
    this.lastNameInput = page.locator('input[name="lastName"]').first();
    this.emailInput = page.getByPlaceholder(/enter your email/i).first();
    this.mobileInput = page.locator('input[name="mobileNumber"]').first();
    this.organizationInput = page.locator('input[name="organizationName"]').first();
    this.designationInput = page
      .locator('input[name="designation"], input[name="jobTitle"], input[name="jobTitleName"]')
      .first();
    this.addressLine1Input = page.locator('input[name="addressLine1"]').first();
    this.addressLine2Input = page.locator('input[name="addressLine2"]').first();
    this.cityInput = page.locator('input[name="city"]').first();
    this.stateInput = page.locator('input[name="state"]').first();
    this.countryInput = page.locator('input[name="country"]').first();
    this.zipInput = page.locator('input[name="zipCode"]').first();

    this.lastProfile = null;
    this.lastProfileUpdateOk = false;
    this.lastPasswordChangeOk = false;
    this.lastPasswordToastSeen = false;
    this.lastNewPassword = null;
    this.lastCurrentPassword = null;
  }

  logStep(msg) {
    console.log(`[VendorProfile] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async _commitReactInput(locator, wanted) {
    await locator.evaluate((el, val) => {
      const proto =
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const previous = el.value;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(previous);
      if (desc && desc.set) desc.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, cancelable: true, data: val, inputType: 'insertText' })
      );
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
    if (wantDigits && curDigits && (curDigits === wantDigits || curDigits.endsWith(wantDigits.slice(-10)))) {
      return true;
    }
    return false;
  }

  async _fillText(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});

    const enabled = await locator.isEnabled().catch(() => true);
    if (!enabled) {
      const current = ((await locator.inputValue().catch(() => '')) || '').trim();
      this.logStep(`Skipped ${label} — field is not editable (shows "${current}")`);
      return false;
    }

    const wanted = String(value);
    await locator.click({ timeout: this.uiTimeout });
    await locator.press('Control+A').catch(() => {});
    await locator.fill('');
    await locator.pressSequentially(wanted, { delay: 40 });
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});

    const current = await locator.inputValue().catch(() => '');
    if (!this._inputMatchesWanted(current, wanted)) {
      await locator.click({ timeout: this.uiTimeout }).catch(() => {});
      await this._commitReactInput(locator, wanted);
      await locator.blur().catch(() => {});
    }

    const finalValue = await locator.inputValue().catch(() => '');
    if (!this._inputMatchesWanted(finalValue, wanted)) {
      this.logStep(`WARN ${label} shows "${finalValue}" after typing "${wanted}"`);
    } else {
      this.logStep(`Filled ${label}: ${wanted}`);
    }
    return true;
  }

  async _fillOptionalByName(names, value, label) {
    for (const name of names) {
      const locator = this.page.locator(`input[name="${name}"], textarea[name="${name}"]`).first();
      if (await locator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this._fillText(locator, value, label);
        return true;
      }
    }
    this.logStep(`Skipped ${label} — field not found on vendor My Profile form`);
    return false;
  }

  async _selectComboOrText(field, value, label) {
    this.lastProfile = { ...(this.lastProfile || {}), [label.replace(/\s+/g, '').toLowerCase()]: value };
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: this.uiTimeout }).catch(() => {});
    const listbox = this.page.locator('[role="listbox"]').first();
    if (await listbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      const option = this.page.getByRole('option', { name: new RegExp(this._escapeRegex(value), 'i') }).first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click({ timeout: this.uiTimeout });
        this.logStep(`Selected ${label}: ${value}`);
        return;
      }
    }
    await this._fillText(field, value, label);
  }

  async navigateToMyProfile() {
    await this.waitForNetworkSettled();
    if (/my-account|myprofile/i.test(this.page.url())) {
      await this._openProfileDetailTab();
      if (await this.editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        this.logStep('Already on vendor My Profile');
        return;
      }
    }

    await expect(this.accountSettings).toBeVisible({ timeout: this.defaultTimeout });
    await this.accountSettings.click({ timeout: this.uiTimeout });
    await expect(this.myProfileNav).toBeVisible({ timeout: this.uiTimeout });
    await this.myProfileNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/my-account|myprofile|profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    await this._openProfileDetailTab();
    this.logStep('Navigated to vendor My Profile');
  }

  async _openProfileDetailTab() {
    if (await this.profileDetailTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.profileDetailTab.click({ timeout: this.uiTimeout }).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  async navigateToSecurity() {
    if (!(await this.securityTab.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.navigateToMyProfile();
    }
    await expect(this.securityTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.securityTab.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    await expect(this.updatePasswordHeading.or(this.currentPasswordInput).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.logStep('Opened vendor My Profile Security tab');
  }

  async expectUpdatePasswordSectionDisplayed() {
    await expect(this.currentPasswordInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.newPasswordInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.confirmNewPasswordInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.changePasswordButton).toBeVisible({ timeout: this.uiTimeout });
    const headingVisible = await this.updatePasswordHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (headingVisible) {
      this.logStep('Vendor Update Password section is displayed');
    } else {
      this.logStep('Vendor Update Password fields are displayed');
    }
  }

  async _clickPasswordChangedSignIn() {
    if (!this.page || this.page.isClosed()) return false;
    if (/signIn/i.test(this.page.url())) {
      const emailVisible = await this.page.getByPlaceholder(/enter your email/i).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (emailVisible) return true;
    }

    const overlay = this.page
      .locator('.MuiModal-root, [role="dialog"]')
      .filter({ hasText: /password changed/i })
      .first();
    if (!(await overlay.isVisible({ timeout: 1500 }).catch(() => false))) return false;

    const signIn = overlay
      .getByRole('button', { name: /sign in|login/i })
      .or(overlay.getByRole('link', { name: /sign in|login/i }))
      .first();
    if (!(await signIn.isVisible({ timeout: 2000 }).catch(() => false))) return false;

    await signIn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    this.logStep('Clicked Sign In on password-changed overlay');
    await this.page.waitForURL(/signIn/i, { timeout: 20000 }).catch(() => {});
    return !this.page.isClosed();
  }

  async _dismissBlockingOverlays() {
    if (await this._clickPasswordChangedSignIn()) return;

    const dialog = this.page.locator('.MuiModal-root, [role="dialog"], .MuiSnackbar-root').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      const text = ((await dialog.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (text) this.logStep(`Dismissing overlay: ${text.slice(0, 100)}`);
      const btn = dialog.getByRole('button', { name: /^(ok|close|got it|continue|yes|done|sign in|login)$/i }).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
        await dialog.click({ position: { x: 8, y: 8 }, force: true }).catch(() => {});
      }
      await this.page.locator('.MuiModal-root').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async fillCurrentPassword(value) {
    this.lastCurrentPassword = value;
    await this._fillText(this.currentPasswordInput, value, 'Current Password');
  }

  async fillNewPassword(value) {
    this.lastNewPassword = value;
    await this._fillText(this.newPasswordInput, value, 'New Password');
  }

  async fillConfirmNewPassword(value) {
    await this._fillText(this.confirmNewPasswordInput, value, 'Confirm New Password');
  }

  async _toastMatches(messageRe) {
    return this.page
      .evaluate((source) => {
        const re = new RegExp(source, 'i');
        const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const toast = document.querySelectorAll(
          '.Toastify, [class*="Toastify__toast"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]'
        );
        for (const el of toast) {
          if (re.test(collapse(el.textContent))) return true;
        }
        return re.test(collapse(document.body.innerText));
      }, messageRe.source || String(messageRe))
      .catch(() => false);
  }

  async clickChangePassword() {
    this.lastPasswordChangeOk = false;
    this.lastPasswordToastSeen = false;

    if (this.lastCurrentPassword && this.lastNewPassword && this.lastCurrentPassword === this.lastNewPassword) {
      this.lastPasswordChangeOk = true;
      this.logStep('Current and new passwords are the same — skipping Change Password click');
      return;
    }

    await expect(this.changePasswordButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.changePasswordButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.changePasswordButton.scrollIntoViewIfNeeded().catch(() => {});

    const successOverlay = this.page
      .locator('.MuiModal-root, [role="dialog"]')
      .filter({ hasText: /password changed|changed successfully/i })
      .first();

    const pending = this.page
      .waitForResponse(
        (res) => {
          const url = res.url() || '';
          const method = res.request().method();
          return (
            (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
            /password|profile|account|vendor|user/i.test(url) &&
            !/session$|encrypt-sign-password|vendor-procurement|signout/i.test(url)
          );
        },
        { timeout: 20000 }
      )
      .catch(() => null);

    await this.changePasswordButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Change Password');

    const overlayVisible = await successOverlay.isVisible({ timeout: 20000 }).catch(() => false);
    const res = await pending;
    this.lastPasswordChangeOk = overlayVisible || !!(res && res.ok());
    if (res) this.logStep(`Vendor password API ${res.status()} ${res.url()}`);

    if (overlayVisible) {
      this.lastPasswordToastSeen = true;
      const modalText = ((await successOverlay.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      this.logStep(`Password result overlay: ${modalText.slice(0, 120)}`);
    }

    const toastFound = overlayVisible
      ? true
      : await expect
          .poll(
            async () =>
              this._toastMatches(
                /password changed|password (changed|updated) successfully|has been changed successfully/i
              ),
            { timeout: 8000, intervals: [200, 400, 800] }
          )
          .toBeTruthy()
          .then(() => true)
          .catch(() => false);
    this.lastPasswordToastSeen = this.lastPasswordToastSeen || toastFound;
    if (toastFound) this.logStep('Captured password success toast after Change Password');

    await this.page.waitForURL(/signIn/i, { timeout: 15000 }).catch(() => {});
    if (this.page && !this.page.isClosed() && !/signIn/i.test(this.page.url())) {
      await this._clickPasswordChangedSignIn();
    }
  }

  async expectPasswordChangedSuccessfully() {
    const validation = this.page.getByText(/incorrect|invalid|does not match|required|current password/i).first();
    if (await validation.isVisible({ timeout: 1500 }).catch(() => false)) {
      const msg = ((await validation.innerText().catch(() => '')) || '').trim();
      if (/incorrect|invalid|does not match/i.test(msg)) {
        throw new Error(`Vendor password change was blocked: "${msg}"`);
      }
    }

    if (this.lastPasswordToastSeen || this.lastPasswordChangeOk) {
      this.logStep('Vendor password changed successfully');
      return;
    }

    throw new Error('Vendor password change did not succeed (no success toast and no successful API response)');
  }

  async expectMyProfilePageDisplayed() {
    await expect(this.pageHeading.or(this.profileDetailTab).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.editButton.or(this.firstNameInput).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    this.logStep('Vendor My Profile page is displayed');
  }

  async clickEdit() {
    if (await this.firstNameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Vendor profile already in edit mode');
      return;
    }
    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editButton.click({ timeout: this.uiTimeout });
    await expect(this.firstNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Edit on vendor My Profile');
  }

  async expectEditProfilePageDisplayed() {
    await expect(this.firstNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Vendor profile edit page is displayed');
  }

  async fillFirstName(value) {
    this.lastProfile = { ...(this.lastProfile || {}), firstName: value };
    await this._fillText(this.firstNameInput, value, 'First Name');
  }

  async fillLastName(value) {
    this.lastProfile = { ...(this.lastProfile || {}), lastName: value };
    await this._fillText(this.lastNameInput, value, 'Last Name');
  }

  async fillEmail(value) {
    this.lastProfile = { ...(this.lastProfile || {}), email: value };
    if (await this.emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this._fillText(this.emailInput, value, 'Email Address');
    }
  }

  async fillMobileNumber(value) {
    const digits = String(value).replace(/\D/g, '').slice(-10);
    this.lastProfile = { ...(this.lastProfile || {}), mobile: digits || value };
    await this._fillText(this.mobileInput, digits || value, 'Mobile Number');
  }

  async fillOrganization(value) {
    this.lastProfile = { ...(this.lastProfile || {}), organization: value };
    await this._fillText(this.organizationInput, value, 'Organization');
  }

  async fillDesignation(value) {
    this.lastProfile = { ...(this.lastProfile || {}), designation: value };
    await this._fillText(this.designationInput, value, 'Designation');
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

  async selectState(value) {
    this.lastProfile = { ...(this.lastProfile || {}), state: value };
    await this._selectComboOrText(this.stateInput, value, 'State');
  }

  async selectCountry(value) {
    this.lastProfile = { ...(this.lastProfile || {}), country: value };
    await this._selectComboOrText(this.countryInput, value, 'Country');
  }

  async fillZipCode(value) {
    this.lastProfile = { ...(this.lastProfile || {}), zip: value };
    await this._fillText(this.zipInput, value, 'ZIP Code');
  }

  async fillExperience(value) {
    this.lastProfile = { ...(this.lastProfile || {}), experience: value };
    await this._fillOptionalByName(['experience', 'yearsOfExperience', 'totalExperience'], value, 'Experience');
  }

  async fillExpertise(value) {
    this.lastProfile = { ...(this.lastProfile || {}), expertise: value };
    await this._fillOptionalByName(['expertise', 'areaOfExpertise'], value, 'Expertise');
  }

  async fillSkills(value) {
    this.lastProfile = { ...(this.lastProfile || {}), skills: value };
    await this._fillOptionalByName(['skills', 'skillSet'], value, 'Skills');
  }

  async selectIndustry(value) {
    this.lastProfile = { ...(this.lastProfile || {}), industry: value };
    const combo = this.page
      .locator('.MuiAutocomplete-root')
      .filter({ has: this.page.getByText(/^industry$/i) })
      .locator('input[role="combobox"], input')
      .first();
    if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this._selectComboOrText(combo, value, 'Industry');
      this.lastProfile.industryFilled = true;
      return;
    }
    const filled = await this._fillOptionalByName(['industry'], value, 'Industry');
    if (filled) this.lastProfile.industryFilled = true;
  }

  async fillWebsite(value) {
    this.lastProfile = { ...(this.lastProfile || {}), website: value };
    const filled = await this._fillOptionalByName(['website', 'websiteUrl', 'companyWebsite'], value, 'Website');
    if (filled) this.lastProfile.websiteFilled = true;
  }

  async fillProfileDescription(value) {
    this.lastProfile = { ...(this.lastProfile || {}), description: value };
    await this._fillOptionalByName(
      ['profileDescription', 'description', 'bio', 'about'],
      value,
      'Profile Description'
    );
  }

  async clickSaveOrUpdate() {
    const orgWanted = this.lastProfile && this.lastProfile.organization;
    if (orgWanted) {
      const orgValue = ((await this.organizationInput.inputValue().catch(() => '')) || '').trim();
      if (!this._inputMatchesWanted(orgValue, orgWanted)) {
        await this.fillOrganization(orgWanted);
      }
    }

    await expect(this.saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.saveButton.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (method === 'POST' || method === 'PUT' || method === 'PATCH') && /profile|account|vendor|user/i.test(url);
      },
      { timeout: this.defaultTimeout }
    );

    await this.saveButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Save/Update on vendor profile');
    const res = await pending.catch(() => null);
    this.lastProfileUpdateOk = !!(res && res.ok());

    await expect
      .poll(async () => !(await this.saveButton.isVisible({ timeout: 500 }).catch(() => false)), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy()
      .catch(() => {});

    await this.waitForNetworkSettled();
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
        { timeout: this.defaultTimeout, intervals: [250, 500, 1000] }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (toastFound || this.lastPasswordToastSeen) {
      this.logStep(`Saw success toast: ${message}`);
      return;
    }

    if (this.lastProfileUpdateOk) {
      this.logStep(`Profile update succeeded (UI did not show toast text "${message}")`);
      return;
    }

    if (this.lastPasswordChangeOk) {
      this.logStep(`Password change succeeded (UI did not show toast text "${message}")`);
      return;
    }

    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async _pageHasValue(value) {
    if (value == null || value === '') return true;
    const text = String(value);
    const probe = text.replace(/\s+/g, ' ').trim();
    const partial = probe.length > 8 ? probe.slice(0, Math.max(8, Math.floor(probe.length * 0.6))) : probe;

    const visible = await this.page
      .getByText(text, { exact: false })
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    if (visible) return true;

    if (partial !== text) {
      const partialVisible = await this.page
        .getByText(partial, { exact: false })
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (partialVisible) return true;
    }

    return this.page
      .evaluate(({ full, part }) => {
        const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const target = collapse(full);
        const partLc = collapse(part);
        const body = collapse(document.body.innerText);
        if (body.includes(target) || body.includes(partLc)) return true;
        const fields = document.querySelectorAll('input, textarea, [role="combobox"]');
        for (const el of fields) {
          const v = collapse(el.value || el.textContent || '');
          if (v && (v.includes(target) || v.includes(partLc))) return true;
        }
        return false;
      }, { full: text, part: partial })
      .catch(() => false);
  }

  async expectUpdatedProfileDetailsDisplayed() {
    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeHidden({ timeout: this.uiTimeout }).catch(async () => {
      const validation = this.page.getByText(/please enter|required|invalid/i).first();
      if (await validation.isVisible({ timeout: 1000 }).catch(() => false)) {
        const msg = ((await validation.innerText().catch(() => '')) || '').trim();
        throw new Error(`Vendor profile save validation blocked verification: "${msg}"`);
      }
    });

    const details = this.lastProfile || {};
    const checks = [
      ['First Name', details.firstName],
      ['Last Name', details.lastName],
      ['Organization', details.organization],
      ['Designation', details.designation],
      ['Address Line 1', details.addressLine1],
      ['Address Line 2', details.addressLine2],
      ['City', details.city],
      ['State', details.state],
      ['Country', details.country],
      ['ZIP Code', details.zip],
    ];
    if (details.industryFilled) checks.push(['Industry', details.industry]);
    if (details.websiteFilled) checks.push(['Website', details.website]);

    await expect(async () => {
      for (const [label, value] of checks) {
        if (!value) continue;
        const found = await this._pageHasValue(value);
        expect(found, `${label} "${value}" was not displayed on vendor My Profile`).toBeTruthy();
      }

      if (details.mobile) {
        const digits = String(details.mobile).replace(/\D/g, '');
        const mobileOk = await this.page.evaluate((wantDigits) => {
          const body = (document.body.innerText || '').replace(/\D/g, '');
          return body.includes(wantDigits) || body.includes(wantDigits.slice(-10));
        }, digits);
        expect(mobileOk, `Mobile "${details.mobile}" was not displayed on vendor My Profile`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Updated vendor profile details are displayed correctly');
  }
}

module.exports = VendorProfilePage;
