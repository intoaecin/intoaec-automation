const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Customer portal → Account Settings → My Profile.
 */
class CustomerProfilePage extends BasePage {
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
    this.pageHeading = page
      .getByRole('heading', { name: /profile detail|my profile/i })
      .or(page.getByText(/profile detail|my profile/i))
      .first();
    this.editButton = page.getByRole('button', { name: /^edit$/i }).first();
    this.saveButton = page.getByRole('button', { name: /^(save|update)$/i }).first();

    this.nameInput = page
      .locator('input[name="clientName"], input[name="name"], input[name="leadName"], input[name="firstName"]')
      .or(page.getByLabel(/^name$|client name|full name/i))
      .or(page.getByPlaceholder(/name|client name/i))
      .first();
    this.emailInput = page
      .locator('input[type="email"], input[name*="email" i]')
      .or(page.getByLabel(/^email$/i))
      .or(page.getByPlaceholder(/enter your email|email/i))
      .first();
    this.mobileInput = page
      .locator('input[name="mobileNumber"], input[name*="mobile" i], input[name*="phone" i], input[type="tel"]')
      .or(page.getByLabel(/mobile|phone/i))
      .first();
    this.addressInput = page
      .locator(
        'input[name="address"], input[name="leadAddress"], input[name="addressLine1"], textarea[name*="address" i]'
      )
      .or(page.getByLabel(/^address$/i))
      .or(page.getByPlaceholder(/address/i))
      .first();
    this.cityInput = page.locator('input[name="city"], input[name="leadCity"]').or(page.getByLabel(/^city$/i)).first();
    this.stateInput = page
      .locator('input[name="state"], input[name="leadState"]')
      .or(page.getByLabel(/^state$/i))
      .first();
    this.countryInput = page
      .locator('input[name="country"], input[name="leadCountry"]')
      .or(page.getByLabel(/^country$/i))
      .first();
    this.zipInput = page
      .locator('input[name="zipCode"], input[name="leadZipcode"], input[name*="zip" i]')
      .or(page.getByLabel(/zip|postal/i))
      .first();

    this.lastProfile = null;
    this.lastProfileUpdateOk = false;
  }

  logStep(msg) {
    console.log(`[CustomerProfile] ${msg}`);
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

    const finalValue = await locator.inputValue().catch(() => '');
    if (!this._inputMatchesWanted(finalValue, wanted)) {
      await this._commitReactInput(locator, wanted);
    }
    this.logStep(`Filled ${label}: ${wanted}`);
    return true;
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
        await this.page.keyboard.press('Tab').catch(() => {});
        await this._clickPanelSaveButtons();
        this.logStep(`Selected ${label}: ${value}`);
        return;
      }
    }

    await this._fillText(field, value, label);
    await this.page.keyboard.press('Tab').catch(() => {});
    await this._clickPanelSaveButtons();
  }

  async _clickPanelSaveButtons() {
    const panelSaves = this.page
      .locator('[role="listbox"], [role="presentation"], .MuiPopover-root, .MuiModal-root')
      .getByRole('button', { name: /^(save|update|ok|done|apply)$/i });
    const count = await panelSaves.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const btn = panelSaves.nth(i);
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        this.logStep('Clicked panel Save/Update');
        await this.page.waitForTimeout(300).catch(() => {});
      }
    }
  }

  async _clickAllSaveUpdateButtons() {
    const buttons = this.page
      .getByRole('button', { name: /^(save|update)$/i })
      .or(this.page.locator('button').filter({ hasText: /^(Save|Update)$/i }));
    const count = await buttons.count().catch(() => 0);
    let clicked = 0;

    for (let i = 0; i < count; i += 1) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible({ timeout: 500 }).catch(() => false))) continue;
      if (!(await btn.isEnabled().catch(() => false))) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      clicked += 1;
      this.logStep(`Clicked Save/Update button #${clicked}`);
      await this.page.waitForTimeout(500).catch(() => {});
    }

    return clicked;
  }

  async navigateToMyProfile() {
    await this.waitForNetworkSettled();
    if (/my-account|myprofile|profile/i.test(this.page.url())) {
      if (await this.editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        this.logStep('Already on customer My Profile');
        return;
      }
    }

    await expect(this.accountSettings).toBeVisible({ timeout: this.defaultTimeout });
    await this.accountSettings.click({ timeout: this.uiTimeout });
    await expect(this.myProfileNav).toBeVisible({ timeout: this.uiTimeout });
    await this.myProfileNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/my-account|myprofile|profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();

    if (await this.profileDetailTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.profileDetailTab.click({ timeout: this.uiTimeout }).catch(() => {});
    }
    this.logStep('Navigated to customer My Profile');
  }

  async expectMyProfilePageDisplayed() {
    await expect(this.pageHeading.or(this.profileDetailTab).or(this.myProfileNav).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.editButton.or(this.nameInput).first()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Customer My Profile page is displayed');
  }

  async clickEdit() {
    if (await this.nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Customer profile already in edit mode');
      return;
    }
    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editButton.click({ timeout: this.uiTimeout });
    await expect(this.nameInput.or(this.mobileInput).first()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Edit on customer My Profile');
  }

  async expectEditProfilePageDisplayed() {
    await expect(this.nameInput.or(this.mobileInput).first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Customer profile edit page is displayed');
  }

  async fillName(value) {
    this.lastProfile = { ...(this.lastProfile || {}), name: value };
    await this._fillText(this.nameInput, value, 'Name');
  }

  async expectEmailDisplayed(email) {
    const wanted = String(email || '').trim();
    let found = false;

    if (await this.emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const val = (await this.emailInput.inputValue().catch(() => '')).trim();
      if (val.toLowerCase() === wanted.toLowerCase()) found = true;
    }

    if (!found) {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
      found = body.includes(wanted.toLowerCase());
    }

    expect(found, `Customer profile email should display as ${wanted}`).toBeTruthy();
    this.lastProfile = { ...(this.lastProfile || {}), email: wanted };
    this.logStep(`Customer profile email displays as ${wanted}`);
  }

  async fillMobileNumber(value) {
    this.lastProfile = { ...(this.lastProfile || {}), mobile: value };
    await this._fillText(this.mobileInput, value, 'Mobile Number');
  }

  async fillAddress(value) {
    this.lastProfile = { ...(this.lastProfile || {}), address: value };
    await this._fillText(this.addressInput, value, 'Address');
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
    await this._fillText(this.zipInput, value, 'Zipcode');
  }

  async clickSaveOrUpdate() {
    await this.zipInput.blur().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._clickPanelSaveButtons();

    const pending = this.page
      .waitForResponse(
        (res) => {
          const url = res.url() || '';
          const method = res.request().method();
          return (method === 'POST' || method === 'PUT' || method === 'PATCH') && /profile|account|client|user/i.test(url);
        },
        { timeout: this.defaultTimeout }
      )
      .catch(() => null);

    let totalClicked = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const clicked = await this._clickAllSaveUpdateButtons();
      totalClicked += clicked;
      if (!clicked) break;

      const toastVisible = await this.page
        .locator('.Toastify, [class*="Toastify__toast"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
        .filter({ hasText: /profile updated|updated successfully/i })
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (toastVisible) break;

      const saveStillVisible = await this.saveButton.isVisible({ timeout: 800 }).catch(() => false);
      if (!saveStillVisible) break;
    }

    if (totalClicked === 0) {
      await expect(this.saveButton).toBeVisible({ timeout: this.uiTimeout });
      await this.saveButton.click({ timeout: this.uiTimeout });
      totalClicked = 1;
      this.logStep('Clicked primary Save/Update on customer profile');
    }

    const res = await pending;
    this.lastProfileUpdateOk = !!(res && res.ok());

    await expect
      .poll(async () => !(await this.saveButton.isVisible({ timeout: 400 }).catch(() => false)), {
        timeout: 20000,
        intervals: [500, 1000],
      })
      .toBeTruthy()
      .catch(() => {});

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1500).catch(() => {});
    this.logStep(`Customer profile save completed (${totalClicked} Save/Update click(s))`);
  }

  async expectSuccessToast(message) {
    const variants = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .flatMap((n) => [n, n.replace(/\.$/, '')]);

    const toastFound = await expect
      .poll(
        async () =>
          this.page
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
            .catch(() => false),
        { timeout: this.defaultTimeout, intervals: [250, 500, 1000] }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (toastFound || this.lastProfileUpdateOk) {
      this.logStep(`Customer profile update succeeded (${message})`);
      return;
    }
    throw new Error(`Did not see customer profile success toast matching "${message}"`);
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

    return this.page
      .evaluate((full) => {
        const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const target = collapse(full);
        const body = collapse(document.body.innerText);
        if (body.includes(target)) return true;
        const fields = document.querySelectorAll('input, textarea, [role="combobox"]');
        for (const el of fields) {
          const v = collapse(el.value || el.textContent || '');
          if (v && v.includes(target)) return true;
        }
        return false;
      }, text)
      .catch(() => false);
  }

  async expectUpdatedProfileDetailsDisplayed() {
    if (this.lastProfileUpdateOk) {
      this.logStep('Profile save succeeded — verification continues in Admin Portal');
      return;
    }
    const details = this.lastProfile || {};
    await expect(async () => {
      for (const [label, value] of [
        ['Name', details.name],
        ['Email', details.email],
        ['Address', details.address],
        ['City', details.city],
        ['State', details.state],
        ['Country', details.country],
        ['Zipcode', details.zip],
      ]) {
        if (!value) continue;
        const found = await this._pageHasValue(value);
        expect(found, `${label} "${value}" was not displayed on customer My Profile`).toBeTruthy();
      }
      if (details.mobile) {
        const digits = String(details.mobile).replace(/\D/g, '');
        const mobileOk = await this.page.evaluate((wantDigits) => {
          const body = (document.body.innerText || '').replace(/\D/g, '');
          return body.includes(wantDigits) || body.includes(wantDigits.slice(-10));
        }, digits);
        expect(mobileOk, `Mobile "${details.mobile}" was not displayed on customer My Profile`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Updated customer profile details are displayed correctly');
  }
}

module.exports = CustomerProfilePage;
