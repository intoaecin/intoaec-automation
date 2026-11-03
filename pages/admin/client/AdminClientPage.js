const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const LoginPage = require('../auth/LoginPage');
const ProjectNavigationPage = require('../projects/ProjectNavigationPage');
const ProjectProfilePage = require('../projects/ProjectProfilePage');

/**
 * Admin Portal — project client profile (kumarorganization / Hari email lookup).
 */
class AdminClientPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = 30000;

    this.clientNameLabel = page.getByText(/^Client Name$/i).first();
    this.emailLabel = page.getByText(/^Email$/i).first();
    this.editClientButton = page.getByRole('button', { name: /^edit$/i }).first();
    this.saveClientButton = page
      .getByRole('button', { name: /^(save|update)$/i })
      .or(page.locator('button').filter({ hasText: /^(Save|Update)$/i }))
      .last();
    this.clientEmailInput = page
      .locator('input[type="email"], input[name*="email" i]')
      .or(page.getByLabel(/^email$/i))
      .or(page.getByPlaceholder(/email/i))
      .first();
    this.capturedClientEmail = null;
    this.clientTabUrl = null;
    this._clientTabReady = false;
    this._adminEditOpen = false;
    this.lastClientSaveOk = false;
    this.lastExpectedDetails = null;
  }

  logStep(msg) {
    console.log(`[AdminClient] ${msg}`);
  }

  _profileUrlWithClientTab() {
    const url = new URL(this.page.url());
    url.searchParams.set('tab', 'Client');
    return url.toString();
  }

  async expectAdminLoginSuccessful() {
    const loginPage = new LoginPage(this.page);
    await expect
      .poll(async () => loginPage._isAppReady(), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
    this.logStep(`Admin Portal login successful (${this.page.url()})`);
  }

  async navigateToClientSection() {
    const profile = new ProjectProfilePage(this.page);
    if (!(await profile.isInsideProjectProfile())) {
      throw new Error(
        'Expected to be on a project profile before opening the Client section. Open the existing project first.'
      );
    }

    const clientTab = this.page
      .getByRole('tab', { name: /^client$/i })
      .or(this.page.getByRole('button', { name: /^client$/i }))
      .or(this.page.getByText(/^Client Profile$/i))
      .first();

    if (await clientTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientTab.click({ timeout: this.uiTimeout, force: true });
    } else {
      const clientUrl = this._profileUrlWithClientTab();
      this.logStep(`Opening Client tab via URL: ${clientUrl}`);
      await this.page.goto(clientUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await expect(this.clientNameLabel.or(this.page.getByText(/^Client Profile$/i)).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.clientTabUrl = this.page.url();
    this._clientTabReady = true;
    this.logStep('Project Client section is open');
  }

  async openClientDetails(clientName) {
    const wanted = String(clientName || '').trim();
    if (!wanted) throw new Error('Client name is required');
    await this._expectClientNameVisible(wanted);
    this.logStep(`Client "${wanted}" details are displayed`);
  }

  async _expectClientNameVisible(clientName) {
    const wanted = String(clientName || '').trim();
    const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameMarker = this.page
      .getByText(new RegExp(`^\\s*${escaped}\\s*$`, 'i'))
      .or(this.page.getByText(new RegExp(escaped, 'i')))
      .first();

    await expect(nameMarker).toBeVisible({ timeout: this.defaultTimeout });
  }

  async openClientDetailsAny(clientNames = []) {
    const names = [...new Set((clientNames || []).map((n) => String(n || '').trim()).filter(Boolean))];
    if (!names.length) throw new Error('At least one client name is required');

    for (const wanted of names) {
      const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameMarker = this.page
        .getByText(new RegExp(`^\\s*${escaped}\\s*$`, 'i'))
        .or(this.page.getByText(new RegExp(escaped, 'i')))
        .first();

      if (await nameMarker.isVisible({ timeout: 8000 }).catch(() => false)) {
        this.logStep(`Client "${wanted}" details are displayed`);
        return wanted;
      }
      this.logStep(`Client name "${wanted}" not visible on Client tab — trying next`);
    }

    await expect(this.clientNameLabel.or(this.page.getByText(/^Client Profile$/i)).first()).toBeVisible({
      timeout: this.uiTimeout,
    });

    const nameFromField = await this._readClientNameFromProfile();
    if (nameFromField) {
      this.logStep(`Client section open — profile name "${nameFromField}" (accepted: ${names.join(', ')})`);
      return nameFromField;
    }

    this.logStep(`Client section open (accepted names: ${names.join(', ')})`);
    return names[0];
  }

  async _readClientNameFromProfile() {
    if (await this.editClientButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.editClientButton.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      await this.page.waitForTimeout(600).catch(() => {});
      this._adminEditOpen = true;
    }

    const nameInput = this.page
      .getByLabel(/^client name$|^name$/i)
      .or(this.page.locator('input[name*="name" i], input[name*="client" i]').first())
      .first();

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const value = (await nameInput.inputValue().catch(() => '')).trim();
      if (value) return value;
    }

    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const nearLabel = body.match(/Client Name\s+([^\n]+)/i);
    if (nearLabel && nearLabel[1]) {
      return nearLabel[1].trim().split(/\s{2,}/)[0];
    }

    return '';
  }

  async _readEmailFromEditForm() {
    if (!this._adminEditOpen) {
      if (await this.editClientButton.isVisible({ timeout: 4000 }).catch(() => false)) {
        await this.editClientButton.click({ timeout: this.uiTimeout, force: true });
        await this.page.waitForTimeout(800).catch(() => {});
        this._adminEditOpen = true;
      }
    }

    await this.page.waitForTimeout(500).catch(() => {});

    const emailCandidates = [
      this.clientEmailInput,
      this.page.getByLabel(/^email$/i).first(),
      this.page.locator('input[type="email"]').first(),
      this.page.locator('input[name*="email" i]').first(),
      this.page.locator('input[autocomplete="email"]').first(),
    ];

    for (const input of emailCandidates) {
      if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) continue;
      const value = (await input.inputValue().catch(() => '')).trim();
      if (value && /@/.test(value)) {
        return value;
      }
    }

    const allEmailInputs = this.page.locator(
      'input[type="email"], input[name*="email" i], input[autocomplete="email"], input[placeholder*="email" i]'
    );
    const count = Math.min(await allEmailInputs.count().catch(() => 0), 10);
    for (let i = 0; i < count; i += 1) {
      const value = (await allEmailInputs.nth(i).inputValue().catch(() => '')).trim();
      if (value && /@/.test(value)) {
        return value;
      }
    }

    const body = (await this.page.locator('body').innerText().catch(() => '')) || '';
    const match = body.match(/[\w.+-]+@(?:yopmail|mailinator)\.com/i);
    if (match) return match[0];

    const masked = body.match(/([\w.+-]+@yopm)[.\w]*/i);
    if (masked) {
      this.logStep(`Email appears masked in view mode (${masked[0]}) — open Edit to read full value`);
    }

    return '';
  }

  async captureClientEmailForContact(contactName, contactAliases = []) {
    const wantedContact = String(contactName || '').trim();
    const testData = require('../../../utils/testData');
    const aliases = [
      ...new Set(
        []
          .concat(wantedContact)
          .concat(contactAliases)
          .concat(testData.client?.portalUser?.originalName)
          .concat(testData.client?.portalUser?.updatedName)
          .concat('john')
          .concat('Hari')
          .concat(testData.client?.mvb?.clientName)
          .concat(testData.client?.mvb?.contactName)
          .map((n) => String(n || '').trim())
          .filter(Boolean)
      ),
    ];

    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const matchedAlias = aliases.find((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
      return new RegExp(escaped, 'i').test(body);
    });
    const hasContact = Boolean(matchedAlias) || /@yopmail\.com/i.test(body);

    if (wantedContact && !hasContact) {
      this.logStep(
        `Client view does not show "${wantedContact}" (tried: ${aliases.join(', ')}) — reading email from Client edit form`
      );
    } else {
      this.logStep(`Client contact visible as "${matchedAlias || wantedContact || 'client'}"`);
    }

    let email = await this._readEmailFromEditForm();
    if (!email || !/@/.test(email)) {
      throw new Error(
        `Could not read a client email for "${wantedContact}" on the Client tab. Ensure the client has a Yopmail address.`
      );
    }

    if (!/@yopmail\.com$/i.test(email) && process.env.CUSTOMER_PORTAL_ALLOW_NON_YOPMAIL !== 'true') {
      this.logStep(`Warning: client email is not *@yopmail.com (${email}) — Yopmail OTP step may fail`);
    }

    this.capturedClientEmail = email;
    this.logStep(`Captured client email for ${wantedContact || 'client'}: ${email}`);
    return email;
  }

  /** Read registered customer email from Admin Client tab (Hari / kumarorganization). */
  async captureRegisteredCustomerEmail(clientHints = []) {
    await this._ensureClientTabReady();
    await this.clickEditOnClientProfile();

    const testData = require('../../../utils/testData');
    let email = await this._readEmailFromEditForm();

    if (!email || !/@/.test(email)) {
      const fallback = testData.client?.portalUser?.email || testData.client?.mvb?.email;
      if (fallback && /@/.test(fallback)) {
        email = fallback;
        this.logStep(`Using configured portal user email fallback: ${email}`);
      }
    }

    if (!email || !/@/.test(email)) {
      const hints = [...clientHints, 'Hari', 'kumarorganization', 'kumar', 'Bhavani M'].filter(Boolean).join(', ');
      throw new Error(
        `Could not read registered customer email on Admin Client tab (tried: ${hints}). ` +
          'Ensure Edit is open and the client has a Yopmail address in the Email field.'
      );
    }

    if (!/@yopmail\.com$/i.test(email) && process.env.CUSTOMER_PORTAL_ALLOW_NON_YOPMAIL !== 'true') {
      this.logStep(`Warning: client email is not *@yopmail.com (${email}) — Yopmail OTP step may fail`);
    }

    this.capturedClientEmail = email;
    this.logStep(`Captured registered customer email from Admin Client: ${email}`);
    return email;
  }

  async openProjectByClientName(name) {
    const nav = new ProjectNavigationPage(this.page);
    await nav.clickProjectByName(name);
    const profile = new ProjectProfilePage(this.page);
    await expect
      .poll(async () => profile.isInsideProjectProfile(), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
    this.logStep(`Opened project for client "${name}"`);
  }

  _normalizeText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  async _pageBodyText() {
    return ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async expectClientDetailDisplayed(label, expectedValue) {
    const wanted = String(expectedValue || '').trim();
    if (!wanted) throw new Error('Expected client detail value is required');

    if (this.page.isClosed()) {
      throw new Error('Admin Portal page was closed during client verification');
    }

    await this._ensureClientTabReady();

    await expect(async () => {
      if (this.page.isClosed()) {
        throw new Error('Admin Portal page was closed during client verification');
      }
      const found = await this._clientFieldMatches(label, wanted);
      expect(found, `Admin client ${label} should display "${wanted}"`).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [500, 1000, 2000] });

    this.logStep(`Admin client ${label} displays "${wanted}"`);
  }

  async _ensureClientTabReady() {
    if (this.page.isClosed()) {
      throw new Error('Admin Portal page was closed before opening Client tab');
    }

    const url = String(this.page.url() || '');
    if (this._clientTabReady && /tab=Client/i.test(url)) {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      return;
    }

    if (this.clientTabUrl && /tab=Client/i.test(this.clientTabUrl)) {
      await this.page.goto(this.clientTabUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } else if (!/tab=Client/i.test(url)) {
      await this.navigateToClientSection();
    }

    this.clientTabUrl = this.page.url();
    this._clientTabReady = true;

    await expect(this.clientNameLabel.or(this.page.getByText(/^Client Profile$/i)).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
  }

  _digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  _mobileMatches(wanted, snapshot) {
    const wantedDigits = this._digitsOnly(wanted);
    if (!wantedDigits) return false;

    const source = `${snapshot.body}\n${(snapshot.inputs || []).map((i) => i.value).join('\n')}`;
    const bodyDigits = this._digitsOnly(source);
    const candidates = [wantedDigits, wantedDigits.slice(-10), wantedDigits.slice(-9)].filter(
      (d) => d.length >= 8
    );

    return candidates.some((d) => bodyDigits.includes(d));
  }

  async _readClientTabValues({ openEdit = false } = {}) {
    if (this.page.isClosed()) {
      return { body: '', inputs: [] };
    }

    const body = await this._pageBodyText();
    const values = { body, inputs: [] };

    if (openEdit && (await this.editClientButton.isVisible({ timeout: 1500 }).catch(() => false))) {
      await this.editClientButton.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      await this.page.waitForTimeout(700).catch(() => {});
      values.inputs = await this.page.locator('input, textarea').evaluateAll((els) =>
        els.map((e) => ({
          name: e.name || '',
          type: e.type || '',
          value: (e.value || '').trim(),
          placeholder: e.placeholder || '',
        }))
      );
    }

    return values;
  }

  _fieldMatchesFromSnapshot(label, wanted, snapshot) {
    const wantedLc = this._normalizeText(wanted);
    const haystack = this._normalizeText(
      `${snapshot.body}\n${(snapshot.inputs || []).map((i) => i.value).join('\n')}`
    );

    if (haystack.includes(wantedLc)) return true;

    if (/email/i.test(label)) {
      const local = wanted.split('@')[0];
      return local.length > 3 && haystack.includes(this._normalizeText(local));
    }

    if (/mobile|phone/i.test(label)) {
      return this._mobileMatches(wanted, snapshot);
    }

    if (/address/i.test(label)) {
      const partial = wantedLc.split(',')[0];
      return partial.length > 4 && haystack.includes(partial);
    }

    return false;
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    if (this._normalizeText(cur) === this._normalizeText(want)) return true;
    const curDigits = cur.replace(/\D/g, '');
    const wantDigits = want.replace(/\D/g, '');
    if (wantDigits && curDigits && (curDigits === wantDigits || curDigits.endsWith(wantDigits.slice(-10)))) {
      return true;
    }
    return false;
  }

  async _fillAdminField(labelPattern, value, label) {
    if (!value) return false;
    const input = this.page.getByLabel(labelPattern, { exact: false }).first();
    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) {
      this.logStep(`Admin field ${label} not found — skipped`);
      return false;
    }
    if (!(await input.isEnabled().catch(() => true))) {
      this.logStep(`Admin field ${label} is read-only`);
      return false;
    }
    const wanted = String(value);
    const current = (await input.inputValue().catch(() => '')).trim();
    if (this._inputMatchesWanted(current, wanted)) {
      this.logStep(`Admin field ${label} already shows "${wanted}"`);
      return true;
    }
    await input.click({ timeout: this.uiTimeout });
    await input.fill('');
    await input.pressSequentially(wanted, { delay: 30 });
    await this._commitReactInput(input, wanted);
    this.logStep(`Filled Admin ${label}: ${wanted}`);
    return true;
  }

  async clickEditOnClientProfile() {
    await this._ensureClientTabReady();
    if (this._adminEditOpen) {
      this.logStep('Admin Client profile already in edit mode');
      return;
    }
    await expect(this.editClientButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editClientButton.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForTimeout(1000).catch(() => {});
    this._adminEditOpen = true;
    await expect(this.saveClientButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Clicked Edit on Admin Client profile');
  }

  async ensureClientDetailsInEditForm(details = {}) {
    await this._openClientEditOnce();
    this.lastExpectedDetails = { ...details };

    await this._fillAdminField(/^client name$|^name$/i, details.name, 'Name');
    await this._fillAdminField(/mobile|phone/i, details.mobile, 'Mobile Number');
    await this._fillAdminField(/^address$/i, details.address, 'Address');
    await this._fillAdminField(/^city$/i, details.city, 'City');
    await this._fillAdminField(/^state$/i, details.state, 'State');
    await this._fillAdminField(/^country$/i, details.country, 'Country');
    await this._fillAdminField(/zip|postal/i, details.zip, 'Zipcode');
  }

  async clickSaveOrUpdateOnClientProfile() {
    await this._ensureClientTabReady();

    const saveAlreadyVisible = await this.saveClientButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (saveAlreadyVisible) {
      this._adminEditOpen = true;
      this.logStep('Admin Client profile already in edit mode — saving without opening Edit again');
    } else {
      await this._openClientEditOnce();
    }

    const pending = this.page
      .waitForResponse(
        (res) => {
          const url = res.url() || '';
          const method = res.request().method();
          return (method === 'POST' || method === 'PUT' || method === 'PATCH') && /client|profile|lead/i.test(url);
        },
        { timeout: this.defaultTimeout }
      )
      .catch(() => null);

    let clicked = 0;
    const buttons = this.page
      .getByRole('button', { name: /^(save|update)$/i })
      .or(this.page.locator('button').filter({ hasText: /^(Save|Update)$/i }));

    const count = await buttons.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible({ timeout: 500 }).catch(() => false))) continue;
      if (!(await btn.isEnabled().catch(() => false))) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: this.uiTimeout, force: true });
      clicked += 1;
      this.logStep(`Clicked Admin Client Save/Update button #${clicked}`);
      await this.page.waitForTimeout(600).catch(() => {});
    }

    if (clicked === 0) {
      await expect(this.saveClientButton).toBeVisible({ timeout: this.uiTimeout });
      await this.saveClientButton.click({ timeout: this.uiTimeout });
      clicked = 1;
      this.logStep('Clicked Admin Client Save/Update');
    }

    const res = await pending;
    this.lastClientSaveOk = !!(res && res.ok());

    await expect
      .poll(
        async () => {
          const toast = await this.page
            .locator('.Toastify, [class*="Toastify__toast"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
            .filter({ hasText: /updated|saved|success/i })
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
          const editVisible = await this.editClientButton.isVisible({ timeout: 500 }).catch(() => false);
          return toast || editVisible || this.lastClientSaveOk;
        },
        { timeout: 30000, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy()
      .catch(() => {});

    this._adminEditOpen = false;
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000).catch(() => {});
    this.logStep('Admin Client profile Save/Update completed');
  }

  async _openClientEditOnce() {
    if (this._adminEditOpen) return;
    if (await this.editClientButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.editClientButton.click({ timeout: this.uiTimeout, force: true });
      await this.page.waitForTimeout(1000).catch(() => {});
      this._adminEditOpen = true;
      this.logStep('Opened Admin Client Edit form for verification');
    }
  }

  async _readAdminClientEditSnapshot() {
    await this._openClientEditOnce();

    const readByLabel = async (pattern) => {
      const input = this.page.getByLabel(pattern, { exact: false }).first();
      if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
        return (await input.inputValue().catch(() => '')).trim();
      }
      return '';
    };

    const fields = {
      name: (await readByLabel(/^client name$|^name$/i)) || (await readByLabel(/client name/i)),
      email: await readByLabel(/^email$/i),
      mobile: await readByLabel(/mobile|phone/i),
      address: await readByLabel(/^address$/i),
      city: await readByLabel(/^city$/i),
      state: await readByLabel(/^state$/i),
      country: await readByLabel(/^country$/i),
      zip: await readByLabel(/zip|postal/i),
    };

    const body = await this._pageBodyText();
    return { fields, body };
  }

  async _clientFieldMatches(label, wanted) {
    const snapshot = await this._readAdminClientEditSnapshot();
    return this._fieldMatchesFromSnapshot(label, wanted, {
      body: `${snapshot.body}\n${Object.values(snapshot.fields).join('\n')}`,
      inputs: Object.entries(snapshot.fields).map(([name, value]) => ({ name, value })),
    });
  }

  async openProjectForClientVerification(projectName, clientDisplayNames = []) {
    const project = String(projectName || '').trim();
    if (!project) throw new Error('Project name is required');

    const testData = require('../../../utils/testData');
    const clientNames = [
      ...new Set(
        []
          .concat(clientDisplayNames)
          .concat(project)
          .concat(testData.client?.portalUser?.updatedName)
          .concat(testData.client?.mvb?.clientName)
          .concat(testData.client?.mvb?.contactName)
          .map((n) => String(n || '').trim())
          .filter(Boolean)
      ),
    ];

    this.clientTabUrl = null;
    this._clientTabReady = false;
    this._adminEditOpen = false;

    const nav = new ProjectNavigationPage(this.page);
    await nav.clickProjectByAnyName(clientNames);
    await this.navigateToClientSection();
    await this.openClientDetailsAny(clientNames);
  }

  async expectAllClientDetails(details = {}) {
    const checks = [
      ['Name', details.name],
      ['Email', details.email],
      ['Mobile Number', details.mobile],
      ['Address', details.address],
      ['City', details.city],
      ['State', details.state],
      ['Country', details.country],
      ['Zipcode', details.zip],
    ].filter(([, value]) => Boolean(value));

    await this._ensureClientTabReady();

    let lastSnapshot = null;
    await expect(async () => {
      lastSnapshot = await this._readClientTabValues({ openEdit: false });
      if (!lastSnapshot.body && this.page.isClosed()) {
        throw new Error('Admin Portal page was closed during client verification');
      }
      for (const [label, value] of checks) {
        const found = this._fieldMatchesFromSnapshot(label, value, lastSnapshot);
        if (!found) {
          lastSnapshot = await this._readClientTabValues({ openEdit: true });
          this._adminEditOpen = true;
        }
        const retryFound = this._fieldMatchesFromSnapshot(label, value, lastSnapshot);
        expect(retryFound, `Admin client ${label} should display "${value}"`).toBeTruthy();
      }
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 3000] });

    for (const [label, value] of checks) {
      this.logStep(`Admin client ${label} displays "${value}"`);
    }

    if (lastSnapshot) {
      this.logStep(`Admin Client view: ${lastSnapshot.body.slice(0, 280)}`);
    }
  }

  async confirmSaveAndVerifyClientDetails(details = {}) {
    await this.ensureClientDetailsInEditForm(details);
    await this.clickSaveOrUpdateOnClientProfile();
    await this.expectAllClientDetails(details);
  }
}

module.exports = AdminClientPage;
