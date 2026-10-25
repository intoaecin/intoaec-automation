const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Customer portal → Meeting Schedule → Create Meeting → Online Meeting → Confirm Booking/Slot.
 */
class CustomerScheduleMeetingPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;
    this.meetingData = {
      mode: 'Online',
      frequency: 'Monthly',
      purpose: '',
      location: '',
      day: null,
      time: null,
    };

    this.meetingScheduleNav = page
      .getByRole('link', { name: /meeting\s*schedule|schedule\s*meeting/i })
      .or(page.getByRole('button', { name: /meeting\s*schedule|schedule\s*meeting/i }))
      .or(page.getByRole('menuitem', { name: /meeting\s*schedule|schedule\s*meeting/i }))
      .or(
        page
          .locator('.MuiDrawer-root, aside, nav, [role="navigation"], [class*="sidebar" i], [class*="drawer" i]')
          .getByText(/meeting\s*schedule|schedule\s*meeting/i)
      )
      .first();
  }

  logStep(msg) {
    console.log(`[CustomerMeeting] ${msg}`);
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _main() {
    return this.page.locator('main, [role="main"]').first();
  }

  _navPanelScopes() {
    return [
      this.page.locator('.MuiDrawer-root').first(),
      this.page.locator('[class*="sidebar" i], [class*="Sidebar" i]').first(),
      this.page.locator('[class*="drawer" i], [class*="Drawer" i]').first(),
      this.page.locator('aside').first(),
      this.page.locator('nav').first(),
      this.page.locator('[role="navigation"]').first(),
      this.page.locator('body'),
    ];
  }

  _scheduleNavPatterns() {
    return [
      { re: /meeting\s*schedule/i, name: 'Meeting Schedule' },
      { re: /schedule\s*meeting/i, name: 'Schedule Meeting' },
      { re: /^meetings$/i, name: 'Meetings' },
    ];
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async _assertPortalPageHealthy() {
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
    if (body.includes('multisite support not enabled')) {
      throw new Error(
        'Customer portal returned "Multisite support not enabled". Use sidebar navigation (Meeting Schedule) only.'
      );
    }
  }

  async waitForPortalHome() {
    await this.waitForNetworkSettled();
    await this._assertPortalPageHealthy();
    const homeMarker = this.page
      .getByRole('button', { name: /account settings|profile settings|logout/i })
      .or(this.page.getByText(/pick up where you left off|my projects|project dashboard|welcome/i))
      .first();
    await expect(homeMarker).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Customer portal home is ready (${this.page.url()})`);
  }

  _meetingContent() {
    return this.page.locator('main, [role="main"]').filter({ visible: true }).first();
  }

  createButton() {
    const content = this._meetingContent();
    return content
      .locator('button:not([disabled]):not(.Mui-disabled), a[role="button"], a')
      .filter({ hasText: /^\s*\+?\s*create(\s*meeting)?\s*$/i })
      .filter({ visible: true })
      .first()
      .or(
        content
          .getByRole('button', { name: /create\s*meeting|^\+\s*create$|^create$/i })
          .filter({ visible: true })
          .first()
      )
      .or(
        this.page
          .getByRole('button', { name: /create\s*meeting|^\+\s*create$|^create$/i })
          .filter({ visible: true })
          .first()
      )
      .or(
        this.page
          .getByRole('link', { name: /create\s*meeting/i })
          .filter({ visible: true })
          .first()
      );
  }

  meetingSectionMarker() {
    return this.page
      .getByRole('tab', { name: /upcoming events|past events|online|offline/i })
      .or(this.page.getByText(/upcoming events|past events|meeting schedule/i))
      .filter({ visible: true })
      .first();
  }

  async _openNavDrawerIfNeeded() {
    const menuToggle = this.page
      .getByRole('button', { name: /menu|open drawer|navigation|sidebar/i })
      .or(this.page.locator('button').filter({ has: this.page.locator('[data-testid="MenuIcon"], svg') }))
      .first();
    if (await menuToggle.isVisible({ timeout: 1500 }).catch(() => false)) {
      const drawerOpen = await this.page
        .locator('.MuiDrawer-root .MuiDrawer-paper')
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (!drawerOpen) {
        await menuToggle.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        await this.page.waitForTimeout(600).catch(() => {});
        this.logStep('Opened customer portal navigation drawer');
      }
    }
  }

  _textMatchesLabel(text, labelRe) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (labelRe.test(normalized)) return true;
    const firstLine = normalized.split(/\n/)[0]?.trim() || '';
    return labelRe.test(firstLine);
  }

  async _clickNavByRole(labelRe, labelName) {
    const roles = ['link', 'button', 'menuitem'];
    for (const role of roles) {
      const el = this.page.getByRole(role, { name: labelRe }).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ timeout: this.uiTimeout, force: true });
        this.logStep(`Clicked "${labelName}" via role=${role}`);
        return true;
      }
    }
    return false;
  }

  async _clickNavLabel(labelRe, labelName) {
    for (const scope of this._navPanelScopes()) {
      if (!(await scope.isVisible({ timeout: 300 }).catch(() => false))) continue;

      const clickables = scope.locator(
        'a, button, [role="link"], [role="button"], [role="menuitem"], li, div[class*="ListItem"], span'
      );
      const count = Math.min(await clickables.count().catch(() => 0), 120);

      for (let i = 0; i < count; i += 1) {
        const item = clickables.nth(i);
        if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;

        const text = (await item.innerText().catch(() => '')) || '';
        const aria = (await item.getAttribute('aria-label').catch(() => '')) || '';
        if (!this._textMatchesLabel(text, labelRe) && !labelRe.test(aria)) continue;

        await item.scrollIntoViewIfNeeded().catch(() => {});
        const inner = item.locator('a, button, [role="link"], [role="button"]').first();
        if (await inner.isVisible({ timeout: 400 }).catch(() => false)) {
          await inner.click({ timeout: this.uiTimeout, force: true });
        } else {
          await item.click({ timeout: this.uiTimeout, force: true });
        }
        this.logStep(`Clicked "${labelName}" in nav panel`);
        return true;
      }
    }
    return false;
  }

  async _clickScheduleNav() {
    await this._openNavDrawerIfNeeded();

    const sidebarScopes = [
      this.page.locator('.MuiDrawer-root .MuiDrawer-paper').first(),
      this.page.locator('.MuiDrawer-root').first(),
      this.page.locator('[class*="sidebar" i], [class*="Sidebar" i]').first(),
      this.page.locator('aside').first(),
      this.page.locator('nav').first(),
    ];

    for (const { re, name } of this._scheduleNavPatterns()) {
      for (const scope of sidebarScopes) {
        if (!(await scope.isVisible({ timeout: 300 }).catch(() => false))) continue;
        const item = scope
          .locator('a, button, [role="link"], [role="button"], [role="menuitem"], li, span')
          .filter({ hasText: re })
          .first();
        if (await item.isVisible({ timeout: 800 }).catch(() => false)) {
          await item.scrollIntoViewIfNeeded().catch(() => {});
          await item.click({ timeout: this.uiTimeout, force: true });
          this.logStep(`Clicked "${name}" in sidebar`);
          return true;
        }
      }
    }

    for (const { re, name } of this._scheduleNavPatterns()) {
      if (await this._clickNavByRole(re, name)) return true;
      if (await this._clickNavLabel(re, name)) return true;
    }

    if (await this.meetingScheduleNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.meetingScheduleNav.scrollIntoViewIfNeeded().catch(() => {});
      await this.meetingScheduleNav.click({ timeout: this.uiTimeout, force: true });
      this.logStep('Clicked Meeting Schedule via meetingScheduleNav locator');
      return true;
    }

    return false;
  }

  meetingPanel() {
    return this.page
      .locator('[role="dialog"], .MuiDialog-root, .MuiModal-root, .MuiDrawer-paper, main')
      .filter({ visible: true })
      .first();
  }

  _createDialogScope() {
    return this.page
      .locator('[role="dialog"], .MuiDialog-root, .MuiModal-root, .MuiDrawer-paper')
      .filter({ visible: true })
      .first();
  }

  _meetingModePatterns(mode = 'online', { createFlow = false } = {}) {
    const normalized = String(mode || 'online').toLowerCase();
    if (normalized === 'offline') {
      if (createFlow) {
        return [/offline\s*meeting/i, /in[\s-]?person(?:\s*meeting)?/i, /at our office/i];
      }
      return [/offline\s*meeting/i, /off[\s-]?line/i, /in[\s-]?person(?:\s*meeting)?/i, /at our office/i];
    }
    return [/online\s*meeting/i, /^online$/i, /video\s*(call|meeting|conference)?/i, /virtual/i, /google\s*meet|zoom/i];
  }

  _meetingModeOption(mode = 'online', { scope = null } = {}) {
    const patterns = this._meetingModePatterns(mode, { createFlow: Boolean(scope) });
    const root = scope || this.page;
    let locator = root.locator('_nonexistent_');

    for (const pattern of patterns) {
      locator = locator
        .or(root.getByRole('button', { name: pattern }))
        .or(root.getByRole('menuitem', { name: pattern }))
        .or(root.getByRole('option', { name: pattern }))
        .or(root.getByRole('radio', { name: pattern }))
        .or(root.locator('button, a, li, [role="menuitem"], [role="option"], label, .MuiCard-root').filter({ hasText: pattern }));
    }

    return locator.filter({ visible: true }).first();
  }

  onlineMeetingOption() {
    return this._meetingModeOption('online');
  }

  offlineMeetingOption() {
    return this._meetingModeOption('offline');
  }

  offlineModeTab() {
    return this._bookingFormScope().getByRole('tab', { name: /^offline$/i }).filter({ visible: true }).first();
  }

  preferredModeCombobox() {
    const scope = this._bookingFormScope();
    const nearLabel = scope
      .getByText(/preferred mode of contact|preferred mode|mode of contact/i)
      .locator('xpath=following::*[self::button or self::select or @role="combobox" or @role="button"][1]');
    return scope
      .getByRole('combobox', { name: /preferred mode|mode of contact|contact mode|in person|online|offline|office/i })
      .or(scope.getByLabel(/preferred mode|mode of contact|contact mode/i))
      .or(
        scope
          .locator('label, p, span, div, h2, h3, h4')
          .filter({ hasText: /preferred mode|mode of contact/i })
          .locator('..')
          .getByRole('combobox')
      )
      .or(scope.getByRole('combobox').filter({ hasText: /in person|online|offline|office|video/i }))
      .or(scope.locator('select').filter({ hasText: /in person|online|offline|office/i }))
      .or(nearLabel)
      .or(this.page.getByRole('combobox', { name: /preferred mode|mode of contact|in person|online/i }))
      .filter({ visible: true })
      .first();
  }

  async _clickMeetingModeFromList(mode = 'online') {
    const wanted = String(mode || 'online').toLowerCase();
    const dialog = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root, .MuiDrawer-paper').filter({ visible: true });
    const scopes = [
      dialog.first(),
      this._bookingFormScope(),
      this._meetingContent(),
    ];

    for (const scope of scopes) {
      if (!(await scope.isVisible({ timeout: 800 }).catch(() => false))) continue;

      const clickables = scope.locator(
        'button:not([disabled]), a, [role="button"], [role="option"], [role="tab"], [role="radio"], li, .MuiCard-root, .MuiChip-root, div[class*="card" i]'
      );
      const count = Math.min(await clickables.count().catch(() => 0), 120);
      for (let i = 0; i < count; i += 1) {
        const item = clickables.nth(i);
        if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;
        const text = ((await item.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        const isOfflineMatch =
          wanted === 'offline' &&
          (/offline\s*meeting/i.test(text) || /in[\s-]?person/i.test(text) || /at our office/i.test(text)) &&
          !/online|video|virtual/i.test(text);
        const isOnlineMatch =
          wanted === 'online' &&
          (/online(\s*meeting)?/i.test(text) || /video\s*(call|meeting)?/i.test(text) || /virtual/i.test(text)) &&
          !/offline|in[\s-]?person|at our office/i.test(text);
        if (!isOfflineMatch && !isOnlineMatch) continue;

        await item.scrollIntoViewIfNeeded().catch(() => {});
        await item.click({ timeout: this.uiTimeout, force: true });
        this.logStep(`Selected ${wanted} meeting via clickable: "${text.slice(0, 60)}"`);
        return true;
      }
    }

    return false;
  }

  _preferredModeOptionPattern(mode = 'online') {
    const wanted = String(mode || 'online').toLowerCase();
    if (wanted === 'offline') {
      return /offline|in[\s-]?person|at our office|office visit/i;
    }
    return /online|video(\s*(call|meeting|conference))?|virtual|google\s*meet|zoom|remote/i;
  }

  async _selectPreferredModeFromControl(mode = 'offline') {
    const wanted = String(mode || 'offline').toLowerCase();
    const optionRe = this._preferredModeOptionPattern(wanted);

    let combo = this.preferredModeCombobox();
    if (!(await combo.isVisible({ timeout: 3000 }).catch(() => false))) {
      combo = this.page
        .getByText(/in person at our office|preferred mode of contact/i)
        .filter({ visible: true })
        .last();
    }
    if (!(await combo.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }

    const current = ((await combo.innerText().catch(() => '')) || (await combo.inputValue().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (current && optionRe.test(current) && (wanted !== 'online' || !/in[\s-]?person|office/i.test(current))) {
      this.logStep(`Preferred Mode of Contact already ${wanted}: "${current}"`);
      return true;
    }

    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForTimeout(500).catch(() => {});

    const option = this.page
      .getByRole('option', { name: optionRe })
      .filter({ visible: true })
      .first();
    if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
      const label = ((await option.innerText().catch(() => '')) || wanted).trim();
      if (!(wanted === 'online' && /in[\s-]?person|at our office/i.test(label))) {
        await option.click({ timeout: this.uiTimeout, force: true });
        this.logStep(`Selected Preferred Mode of Contact: ${label}`);
        return true;
      }
    }

    const listItems = this.page
      .locator('[role="listbox"] [role="option"], [role="option"], li, .MuiMenuItem-root, button, div')
      .filter({ visible: true });
    const count = Math.min(await listItems.count().catch(() => 0), 30);
    for (let i = 0; i < count; i += 1) {
      const item = listItems.nth(i);
      const text = ((await item.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 40 || !optionRe.test(text)) continue;
      if (wanted === 'online' && /in[\s-]?person|at our office|offline/i.test(text)) continue;
      if (wanted === 'offline' && /online|video|virtual/i.test(text)) continue;
      await item.click({ timeout: this.uiTimeout, force: true });
      this.logStep(`Selected Preferred Mode of Contact from list: ${text}`);
      return true;
    }

    const nativeSelect = this._bookingFormScope().locator('select').filter({ visible: true }).first();
    if (await nativeSelect.isVisible({ timeout: 800 }).catch(() => false)) {
      const values = await nativeSelect.locator('option').allTextContents().catch(() => []);
      const match = values.find((v) => optionRe.test(v) && (wanted !== 'online' || !/in[\s-]?person|office/i.test(v)));
      if (match) {
        await nativeSelect.selectOption({ label: match }).catch(async () => {
          await nativeSelect.selectOption({ value: match });
        });
        this.logStep(`Selected Preferred Mode of Contact from select: ${match}`);
        return true;
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  async _selectMeetingMode(mode = 'online') {
    const wanted = String(mode || 'online').toLowerCase();
    await this.page.waitForTimeout(1000).catch(() => {});

    const dialog = this._createDialogScope();

    await expect
      .poll(
        async () => {
          if (await this._meetingModeOption('online', { scope: dialog }).isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (await this._meetingModeOption('offline', { scope: dialog }).isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (await this.preferredModeCombobox().isVisible({ timeout: 400 }).catch(() => false)) return true;
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
          return /preferred mode|online meeting|offline meeting|meeting purpose|location|confirm booking/i.test(body);
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();

    const dialogOption = this._meetingModeOption(wanted, { scope: dialog });
    if (await dialogOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogOption.scrollIntoViewIfNeeded().catch(() => {});
      await dialogOption.click({ timeout: this.uiTimeout, force: true });
      this.logStep(`Selected ${wanted} meeting card in create dialog`);
      await this.page.waitForTimeout(1000).catch(() => {});
      return;
    }

    if (await this._clickMeetingModeFromList(wanted)) {
      await this.page.waitForTimeout(1000).catch(() => {});
      return;
    }

    if (await this._selectPreferredModeFromControl(wanted)) {
      await this.page.waitForTimeout(800).catch(() => {});
      return;
    }

    const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .slice(0, 500);
    throw new Error(`Could not find ${wanted} meeting option on customer portal. Page snippet: ${snippet}`);
  }

  preferredModeField() {
    return this.page
      .getByLabel(/preferred mode of contact/i)
      .or(this.page.getByText(/preferred mode of contact/i).locator('xpath=following::*[1]'))
      .first();
  }

  frequencyControl() {
    return this.page
      .getByLabel(/frequency|meeting frequency|repeat/i)
      .or(this.page.getByRole('combobox', { name: /frequency|repeat/i }))
      .or(this.page.locator('label').filter({ hasText: /frequency|repeat/i }).locator('..').getByRole('combobox'))
      .first();
  }

  purposeInput() {
    const scope = this._bookingFormScope();
    return scope
      .getByLabel(/^meeting purpose$/i)
      .or(scope.locator('label').filter({ hasText: /meeting purpose/i }).locator('..').locator('input, textarea'))
      .or(scope.getByPlaceholder(/meeting purpose|purpose|discussion/i))
      .or(
        scope
          .locator('textarea, input[type="text"]:not([readonly])')
          .filter({ visible: true })
          .last()
      )
      .or(this.page.getByLabel(/^meeting purpose$/i))
      .first();
  }

  nameInput() {
    const scope = this._bookingFormScope();
    return scope
      .getByLabel(/^name$/i)
      .or(scope.locator('label').filter({ hasText: /^name\*?$/i }).locator('..').locator('input, textarea'))
      .or(scope.getByPlaceholder(/^name$/i))
      .first();
  }

  locationInput() {
    const scope = this._bookingFormScope();
    return scope
      .getByLabel(/^location$/i)
      .or(scope.locator('label').filter({ hasText: /^location\*?$/i }).locator('..').locator('input, textarea'))
      .or(scope.getByPlaceholder(/enter.*location|meeting location|^location$/i))
      .or(scope.locator('input.pac-target-input'))
      .first();
  }

  async _readInputFieldLabel(input, scope) {
    const id = await input.getAttribute('id').catch(() => null);
    if (id) {
      const label = scope.locator(`label[for="${id}"]`).first();
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        return ((await label.innerText().catch(() => '')) || '').trim();
      }
    }
    const aria = (await input.getAttribute('aria-label').catch(() => '')) || '';
    if (aria.trim()) return aria.trim();
    return ((await input.getAttribute('placeholder').catch(() => '')) || '').trim();
  }

  _isExcludedFormFieldLabel(labelText = '') {
    return /^name$|email|purpose|meeting purpose/i.test(String(labelText || '').trim());
  }

  async _findLocationInput() {
    const scope = this._bookingFormScope();
    const candidates = [
      () => scope.getByLabel(/^location$/i),
      () => scope.getByRole('textbox', { name: /^location$/i }),
      () => scope.locator('label').filter({ hasText: /^location\*?$/i }).locator('..').locator('input, textarea'),
      () => scope.getByPlaceholder(/enter.*location|meeting location|^location$/i),
      () => scope.locator('input.pac-target-input').filter({ visible: true }),
    ];

    for (const getLocator of candidates) {
      const input = getLocator().first();
      if (!(await input.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      const labelText = await this._readInputFieldLabel(input, scope);
      if (this._isExcludedFormFieldLabel(labelText)) continue;
      const placeholder = (await input.getAttribute('placeholder').catch(() => '')) || '';
      if (this._isExcludedFormFieldLabel(placeholder)) continue;
      return input;
    }

    return null;
  }

  confirmBookingButton() {
    return this.page
      .getByRole('button', { name: /^confirm\s*booking$/i })
      .or(this.page.getByRole('button', { name: /confirm\s*slot/i }))
      .or(this.page.locator('button').filter({ hasText: /^confirm\s*booking$/i }))
      .filter({ visible: true })
      .first();
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

  async _hasCreateAction() {
    if (await this.createButton().isVisible({ timeout: 2000 }).catch(() => false)) return true;

    const content = this._meetingContent();
    const clickables = content.locator('button:not([disabled]), a, [role="button"]');
    const count = Math.min(await clickables.count().catch(() => 0), 40);
    for (let i = 0; i < count; i += 1) {
      const item = clickables.nth(i);
      if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const text = ((await item.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (/^\s*\+?\s*create(\s*meeting)?\s*$/i.test(text) || /^create\s*meeting$/i.test(text)) {
        return true;
      }
    }
    return false;
  }

  async _findCreateAction() {
    const primary = this.createButton();
    if (await primary.isVisible({ timeout: 1500 }).catch(() => false)) return primary;

    const content = this._meetingContent();
    const clickables = content.locator('button:not([disabled]), a, [role="button"]');
    const count = Math.min(await clickables.count().catch(() => 0), 40);
    for (let i = 0; i < count; i += 1) {
      const item = clickables.nth(i);
      if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const text = ((await item.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (/^\s*\+?\s*create(\s*meeting)?\s*$/i.test(text) || /^create\s*meeting$/i.test(text)) {
        return item;
      }
    }

    return this.page.getByText(/create\s*meeting/i).filter({ visible: true }).first();
  }

  async _isMeetingScheduleSectionVisible() {
    if (await this._hasCreateAction()) return true;

    const content = this._meetingContent();
    const text = ((await content.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    return /upcoming events|past events|join meeting|scheduled meetings|no meetings|create meeting/i.test(text);
  }

  async _isMeetingSchedulePageReady() {
    return this._hasCreateAction();
  }

  async navigateToScheduleMeeting() {
    await this.waitForPortalHome();

    if (await this._hasCreateAction()) {
      this.logStep('Already on customer Meeting Schedule page (+ Create visible)');
      return;
    }

    const clicked = await this._clickScheduleNav();
    if (!clicked) {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      throw new Error(
        `Could not navigate to Meeting Schedule — link/button not found in customer portal. Visible snippet: ${snippet}`
      );
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(1000).catch(() => {});
    await expect
      .poll(async () => this._isMeetingScheduleSectionVisible(), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
    this.logStep('Customer Meeting Schedule section is open');
  }

  async _selectScheduleModeTab(mode = 'online') {
    const wanted = String(mode || 'online').toLowerCase();
    const pattern = wanted === 'offline' ? /^(offline|in[\s-]?person)$/i : /^online$/i;
    const scope = this._meetingContent().or(this.page.locator('body'));

    const candidates = [
      this.page.getByRole('tab', { name: pattern }).filter({ visible: true }).first(),
      this.page.getByRole('button', { name: pattern }).filter({ visible: true }).first(),
      this.page.getByRole('link', { name: pattern }).filter({ visible: true }).first(),
      scope
        .locator('button, a, [role="tab"], [role="button"], [role="link"]')
        .filter({ hasText: pattern })
        .filter({ visible: true })
        .first(),
    ];

    for (const el of candidates) {
      if (!(await el.isVisible({ timeout: 2500 }).catch(() => false))) continue;
      const text = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (text && text.length > 24) continue;
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click({ timeout: this.uiTimeout, force: true });
      this.meetingData.mode = wanted === 'offline' ? 'Offline' : 'Online';
      await this.page.waitForTimeout(800).catch(() => {});
      this.logStep(`Clicked ${this.meetingData.mode} on Meeting Schedule`);
      return true;
    }

    const clickables = scope.locator(
      'button:not([disabled]), a, [role="tab"], [role="button"], [role="link"], .MuiChip-root, .MuiTab-root'
    );
    const count = Math.min(await clickables.count().catch(() => 0), 80);
    for (let i = 0; i < count; i += 1) {
      const item = clickables.nth(i);
      if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const text = ((await item.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!pattern.test(text)) continue;
      if (wanted === 'online' && /offline|in[\s-]?person/i.test(text)) continue;
      if (wanted === 'offline' && /online/i.test(text)) continue;
      await item.scrollIntoViewIfNeeded().catch(() => {});
      await item.click({ timeout: this.uiTimeout, force: true });
      this.meetingData.mode = wanted === 'offline' ? 'Offline' : 'Online';
      await this.page.waitForTimeout(800).catch(() => {});
      this.logStep(`Clicked ${this.meetingData.mode} tab/control: "${text}"`);
      return true;
    }

    this.logStep(
      `${wanted === 'offline' ? 'Offline' : 'Online'} control not shown — continuing to Create Meeting, then date/time and Confirm Booking`
    );
    this.meetingData.mode = wanted === 'offline' ? 'Offline' : 'Online';
    return false;
  }

  async clickCreate() {
    if (!(await this._isMeetingScheduleSectionVisible())) {
      await this.navigateToScheduleMeeting();
    }

    const btn = await this._findCreateAction();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: this.uiTimeout, force: true });
    await this.waitForNetworkSettled();
    await this._waitForBookingForm().catch(() => {});
    this.logStep('Clicked Create Meeting on Meeting Schedule page');
  }

  async selectOfflineMeeting() {
    await this._selectScheduleModeTab('offline');
    this.logStep('Selected Offline on Meeting Schedule');
  }

  async expectPreferredModeOffline() {
    await expect
      .poll(
        async () => {
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
          const modeField = this.preferredModeField();
          let shown = '';
          if (await modeField.isVisible({ timeout: 1500 }).catch(() => false)) {
            shown = ((await modeField.inputValue().catch(() => '')) || (await modeField.innerText().catch(() => ''))).trim();
          }
          const combined = `${shown} ${body}`.toLowerCase();
          return /offline|in[\s-]?person|at our office/i.test(combined);
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();

    this.meetingData.mode = 'Offline';
    this.meetingData.requiresTimeSlots = await this._hasDaySlotPicker();
    this.logStep('Preferred Mode of Contact is Offline');
  }

  async selectOnlineMeeting() {
    await this._waitForBookingForm().catch(() => {});
    const selected = await this._selectPreferredModeFromControl('online');
    if (!selected) {
      throw new Error(
        'Could not set Preferred Mode of Contact to Online. The booking form still shows In Person / Offline.'
      );
    }
    this.meetingData.mode = 'Online';
    this.logStep('Selected Online as Preferred Mode of Contact');
  }

  async expectPreferredModeOnline() {
    await this._waitForBookingForm().catch(() => {});
    await expect
      .poll(
        async () => {
          const current = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
          const combo = this.preferredModeCombobox();
          let shown = '';
          if (await combo.isVisible({ timeout: 800 }).catch(() => false)) {
            shown = ((await combo.innerText().catch(() => '')) || (await combo.inputValue().catch(() => ''))).trim();
          }
          const combined = `${shown} ${current}`.toLowerCase();
          return (
            /mode\s*online|preferred mode of contact\s*online/i.test(combined) ||
            (/online/i.test(shown) && !/in[\s-]?person|office/i.test(shown))
          );
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();

    this.meetingData.mode = 'Online';
    this.logStep('Preferred Mode of Contact is Online');
  }

  _bookingFormScope() {
    return this.page
      .locator('[role="dialog"], .MuiDialog-root, .MuiModal-root, .MuiDrawer-paper')
      .filter({ visible: true })
      .first()
      .or(this._meetingContent());
  }

  async _waitForBookingForm() {
    await this.page.waitForTimeout(1200).catch(() => {});
    await expect
      .poll(
        async () => {
          const scope = this._bookingFormScope();
          const text = ((await scope.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
          return /preferred mode|select\s*date|choose\s*date|available|time slot|meeting purpose|frequency|location|confirm/i.test(
            text
          );
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1200] }
      )
      .toBeTruthy();
  }

  async _hasDaySlotPicker() {
    const scope = this._bookingFormScope();
    const dateInput = scope
      .getByLabel(/date/i)
      .or(scope.getByPlaceholder(/date|select date|choose date/i))
      .or(scope.locator('input[type="date"]'))
      .first();
    if (await dateInput.isVisible({ timeout: 1500 }).catch(() => false)) return true;

    const slot = scope
      .locator('button:not([disabled]), [role="button"], [role="option"], .MuiChip-root')
      .filter({ hasText: /\d{1,2}|mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i });
    return (await slot.count().catch(() => 0)) > 0;
  }

  async _hasTimeSlotPicker() {
    const scope = this._bookingFormScope();
    const combo = scope.getByRole('combobox').filter({ hasText: /:\d{2}|am|pm/i }).first();
    if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) return true;

    const slot = scope
      .locator('button:not([disabled]), [role="button"], [role="option"]')
      .filter({ hasText: /\d{1,2}:\d{2}|am|pm/i });
    return (await slot.count().catch(() => 0)) > 0;
  }

  _dayNumberFromText(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    const firstToken = normalized.split(' ')[0] || '';
    if (/^\d{1,2}$/.test(firstToken)) return firstToken;
    const match = normalized.match(/\b(\d{1,2})\b/);
    return match ? match[1] : '';
  }

  _looksLikeDateSlot(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 40) return false;
    if (/^\d{1,2}$/.test(t)) return true;
    if (
      /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
        t
      ) &&
      /\d/.test(t)
    ) {
      return true;
    }
    if (/\b\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(t)) return true;
    if (/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/.test(t)) return true;
    return false;
  }

  _looksLikeTimeSlot(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 48) return false;
    if (/^available\s*time$/i.test(t)) return false;
    return /\d{1,2}:\d{2}/i.test(t) || /\d{1,2}\s*(am|pm)/i.test(t);
  }

  async _enumerateDateSlotCandidates(scope) {
    const clickables = scope.locator(
      'button:not([disabled]):not(.Mui-disabled), [role="button"]:not([disabled]), [role="option"], li, .MuiChip-root, .MuiCard-root, div[class*="slot" i], div[class*="date" i]'
    );
    const count = Math.min(await clickables.count().catch(() => 0), 80);
    const candidates = [];
    const seen = new Set();

    for (let i = 0; i < count; i += 1) {
      const item = clickables.nth(i);
      if (!(await item.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const text = ((await item.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!this._looksLikeDateSlot(text) || this._looksLikeTimeSlot(text)) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      candidates.push({ item, text });
    }

    return candidates;
  }

  async _clickDateSlotCandidate(candidate) {
    await candidate.item.scrollIntoViewIfNeeded().catch(() => {});
    await candidate.item.click({ timeout: this.uiTimeout, force: true });
    this.meetingData.day = candidate.text;
    await this.page.waitForTimeout(1200).catch(() => {});
    this.logStep(`Selected available day slot: ${candidate.text}`);
  }

  async _clickNextDateRange(scope) {
    const nextBtn = scope
      .getByRole('button', { name: /^>$/ })
      .or(scope.locator('button:not([disabled])').filter({ hasText: /^>$/ }))
      .first();
    if (!(await nextBtn.isVisible({ timeout: 1500 }).catch(() => false))) {
      return false;
    }
    await nextBtn.scrollIntoViewIfNeeded().catch(() => {});
    await nextBtn.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForTimeout(1200).catch(() => {});
    this.logStep('Advanced to next date range on customer meeting form');
    return true;
  }

  async _countVisibleTimeSlots(scope) {
    const slots = scope
      .locator('button:not([disabled]):not(.Mui-disabled), [role="button"]:not([disabled]), [role="option"], li, .MuiChip-root')
      .filter({ hasText: /\d{1,2}:\d{2}|am|pm/i });
    return slots.count().catch(() => 0);
  }

  async _waitForTimeSlotsAfterDayPick(scope, timeoutMs = 10000) {
    await expect
      .poll(
        async () => {
          const count = await this._countVisibleTimeSlots(scope);
          if (count > 0) return true;
          const body = ((await scope.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
          return !/choose a date to see available times|select a date/i.test(body) && /\d{1,2}:\d{2}/i.test(body);
        },
        { timeout: timeoutMs, intervals: [400, 800, 1200] }
      )
      .toBeTruthy()
      .catch(() => false);
  }

  async _openDatePickerIfNeeded(scope) {
    const dateInput = scope
      .getByLabel(/date/i)
      .or(scope.getByPlaceholder(/date|select date|choose date/i))
      .or(scope.locator('input[type="date"], input[placeholder*="date" i]'))
      .first();
    if (await dateInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await dateInput.click({ timeout: this.uiTimeout }).catch(() => {});
      const calendarBtn = scope
        .getByRole('button', { name: /choose date|open calendar|calendar/i })
        .or(dateInput.locator('xpath=following-sibling::button').first())
        .or(dateInput.locator('xpath=..').locator('button').first())
        .first();
      if (await calendarBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await calendarBtn.click({ timeout: this.uiTimeout }).catch(() => {});
      }
      await this.page.waitForTimeout(600).catch(() => {});
      return true;
    }
    return false;
  }

  async _pickMuiCalendarDay(scope) {
    const popper = this.page.locator('.MuiPickersPopper-root, .MuiPopover-root').filter({ visible: true }).last();
    const calendarRoot = (await popper.isVisible({ timeout: 1000 }).catch(() => false))
      ? popper
      : scope;

    const selectors = [
      'button.MuiPickersDay-root:not(.Mui-disabled):not([aria-disabled="true"]):not(.MuiPickersDay-outsideCurrentMonth)',
      'button[role="gridcell"].MuiPickersDay-root:not(.Mui-disabled):not([aria-disabled="true"])',
      '[role="gridcell"]:not([aria-disabled="true"])',
    ];

    for (const selector of selectors) {
      const days = calendarRoot.locator(selector);
      const count = Math.min(await days.count().catch(() => 0), 45);
      for (let i = 0; i < count; i += 1) {
        const day = days.nth(i);
        if (!(await day.isVisible({ timeout: 200 }).catch(() => false))) continue;
        const label = this._dayNumberFromText(await day.innerText().catch(() => ''));
        if (!label) continue;
        await day.scrollIntoViewIfNeeded().catch(() => {});
        await day.click({ timeout: this.uiTimeout, force: true });
        this.meetingData.day = label;
        this.logStep(`Selected available day from calendar: ${label}`);
        return label;
      }
    }
    return null;
  }

  async _pickDateSlotFromList(scope, skipTexts = []) {
    const skip = new Set((skipTexts || []).map((t) => String(t || '').trim()).filter(Boolean));
    const candidates = await this._enumerateDateSlotCandidates(scope);
    for (const candidate of candidates) {
      if (skip.has(candidate.text)) continue;
      await this._clickDateSlotCandidate(candidate);
      return candidate.text;
    }
    return null;
  }

  async selectAvailableDay() {
    await this._waitForBookingForm();
    if (String(this.meetingData.mode || '').toLowerCase() === 'offline' && !(await this._hasDaySlotPicker())) {
      this.meetingData.requiresTimeSlots = false;
      this.logStep('Offline meeting form has no day availability picker — skipping day selection');
      return null;
    }

    const scope = this._bookingFormScope();
    await scope.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});

    await this._openDatePickerIfNeeded(scope);
    const fromCalendar = await this._pickMuiCalendarDay(scope);
    if (fromCalendar) return fromCalendar;

    const fromSlots = await this._pickDateSlotFromList(scope);
    if (fromSlots) return fromSlots;

    const dayButtons = scope
      .locator(
        'button:not([disabled]):not(.Mui-disabled), [role="button"]:not([disabled]), .MuiPickersDay-root:not(.Mui-disabled), td:not(.Mui-disabled) button'
      )
      .filter({ hasText: /\d{1,2}/ });
    const count = await dayButtons.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 40); i += 1) {
      const day = dayButtons.nth(i);
      if (!(await day.isVisible({ timeout: 300 }).catch(() => false))) continue;
      const label = this._dayNumberFromText(await day.innerText().catch(() => ''));
      if (!label) continue;
      await day.click({ timeout: this.uiTimeout, force: true });
      this.meetingData.day = label;
      this.logStep(`Selected available day: ${label}`);
      return label;
    }

    const snippet = ((await scope.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 350);
    throw new Error(`No available meeting day found on customer portal. Form snippet: ${snippet}`);
  }

  async _pickTimeSlotFromList(scope) {
    const clickables = scope.locator(
      'button:not([disabled]):not(.Mui-disabled), [role="button"]:not([disabled]), [role="option"], [role="menuitem"], li, .MuiChip-root'
    );
    const count = Math.min(await clickables.count().catch(() => 0), 80);
    for (let i = 0; i < count; i += 1) {
      const slot = clickables.nth(i);
      if (!(await slot.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const label = ((await slot.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().split('\n')[0];
      if (!this._looksLikeTimeSlot(label)) continue;
      await slot.scrollIntoViewIfNeeded().catch(() => {});
      await slot.click({ timeout: this.uiTimeout, force: true });
      this.meetingData.time = label;
      this.logStep(`Selected available time slot: ${label}`);
      return label;
    }
    return null;
  }

  async _trySelectTime(scope) {
    const fromSlots = await this._pickTimeSlotFromList(scope);
    if (fromSlots) return fromSlots;

    const timeSlots = scope
      .locator('button:not([disabled]):not(.Mui-disabled), [role="option"], [role="menuitem"], li')
      .filter({ hasText: /\d{1,2}:\d{2}|am|pm/i });
    const count = await timeSlots.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 50); i += 1) {
      const slot = timeSlots.nth(i);
      if (!(await slot.isVisible({ timeout: 300 }).catch(() => false))) continue;
      const label = ((await slot.innerText().catch(() => '')) || '').trim().split('\n')[0];
      if (!label || !/\d/.test(label) || !this._looksLikeTimeSlot(label)) continue;
      await slot.click({ timeout: this.uiTimeout, force: true });
      this.meetingData.time = label;
      this.logStep(`Selected available time: ${label}`);
      return label;
    }

    const combo = scope.getByRole('combobox').filter({ visible: true }).first();
    if (await combo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await combo.click({ timeout: this.uiTimeout });
      const option = this.page.getByRole('option').filter({ visible: true }).first();
      if (await option.isVisible({ timeout: this.uiTimeout }).catch(() => false)) {
        const label = ((await option.innerText().catch(() => '')) || '').trim();
        await option.click({ timeout: this.uiTimeout });
        this.meetingData.time = label;
        this.logStep(`Selected available time from combobox: ${label}`);
        return label;
      }
    }

    return null;
  }

  async _selectTimeWithDayFallback(scope) {
    const triedDays = new Set();
    if (this.meetingData.day) {
      triedDays.add(String(this.meetingData.day).trim());
    }

    await this._waitForTimeSlotsAfterDayPick(scope, 6000);
    let time = await this._trySelectTime(scope);
    if (time) return time;

    const maxWeeks = 3;
    for (let week = 0; week < maxWeeks; week += 1) {
      let candidates = await this._enumerateDateSlotCandidates(scope);
      if (candidates.length === 0 && week === 0) {
        await this._openDatePickerIfNeeded(scope);
        candidates = await this._enumerateDateSlotCandidates(scope);
      }

      for (const candidate of candidates) {
        if (triedDays.has(candidate.text)) continue;
        triedDays.add(candidate.text);
        this.logStep(`No time slots on "${this.meetingData.day || 'selected day'}" — trying ${candidate.text}`);
        await this._clickDateSlotCandidate(candidate);
        await this._waitForTimeSlotsAfterDayPick(scope, 8000);
        time = await this._trySelectTime(scope);
        if (time) return time;
      }

      const advanced = await this._clickNextDateRange(scope);
      if (!advanced) break;
    }

    return null;
  }

  async selectAvailableTime() {
    await this.page.waitForTimeout(1000).catch(() => {});
    const scope = this._bookingFormScope();

    const time = await this._selectTimeWithDayFallback(scope);
    if (time) return time;

    if (String(this.meetingData.mode || '').toLowerCase() === 'offline' && !(await this._hasDaySlotPicker())) {
      this.meetingData.requiresTimeSlots = false;
      this.logStep('Offline meeting form has no time availability picker — skipping time selection');
      return null;
    }

    const snippet = ((await scope.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 350);
    throw new Error(`No available meeting time slot found on customer portal. Form snippet: ${snippet}`);
  }

  async selectMeetingFrequency(frequency) {
    const wanted = String(frequency || 'Monthly').trim();
    this.meetingData.frequency = wanted;

    const combo = this.frequencyControl();
    if (await combo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await combo.click({ timeout: this.uiTimeout });
      const option = this.page.getByRole('option', { name: new RegExp(wanted, 'i') }).first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click({ timeout: this.uiTimeout });
        this.logStep(`Selected meeting frequency: ${wanted}`);
        return;
      }
    }

    const direct = this.page
      .locator('button, label, li, [role="radio"], [role="option"]')
      .filter({ hasText: new RegExp(wanted, 'i') })
      .first();
    await expect(direct).toBeVisible({ timeout: this.uiTimeout });
    await direct.click({ timeout: this.uiTimeout });
    this.logStep(`Selected meeting frequency: ${wanted}`);
  }

  async enterMeetingPurpose(purpose) {
    const wanted = String(purpose || '').trim();
    this.meetingData.purpose = wanted;

    const input = this.purposeInput();
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ timeout: this.uiTimeout });
    await input.fill('');
    await input.pressSequentially(wanted, { delay: 25 }).catch(() => {});
    await this._commitReactInput(input, wanted);
    await input.press('Tab').catch(() => {});

    const value = (await input.inputValue().catch(() => '')) || (await input.innerText().catch(() => ''));
    if (!String(value).toLowerCase().includes(wanted.toLowerCase().slice(0, 12))) {
      await input.fill(wanted);
      await this._commitReactInput(input, wanted);
    }

    this.logStep(`Entered meeting purpose: ${wanted}`);
  }

  async enterMeetingLocation(location) {
    const wanted = String(location || 'Chennai, Tamil Nadu, India').trim();

    await this._waitForBookingForm();
    const input = await this._findLocationInput();
    if (!input) {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (/in[\s-]?person|at our office|offline/i.test(body)) {
        this.meetingData.mode = 'Offline';
        this.meetingData.location = /at our office/i.test(body) ? 'At Our Office' : 'In Person';
        this.logStep(`In Person meeting uses office location — no location text field to fill (${this.meetingData.location})`);
        return;
      }
      throw new Error('Location field not found on customer meeting form');
    }

    this.meetingData.location = wanted;
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ timeout: this.uiTimeout });
    await input.fill('');
    await input.pressSequentially(wanted, { delay: 25 }).catch(() => {});
    await this._commitReactInput(input, wanted);
    await this.page.waitForTimeout(1200).catch(() => {});

    const suggestion = this.page
      .locator('.pac-container .pac-item, [role="option"], li')
      .filter({ visible: true })
      .first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      const picked = ((await suggestion.innerText().catch(() => '')) || wanted).trim();
      if (picked) {
        this.meetingData.location = picked.split('\n')[0].trim();
      }
    }

    const nameField = this.nameInput();
    if (await nameField.isVisible({ timeout: 1500 }).catch(() => false)) {
      const nameValue = ((await nameField.inputValue().catch(() => '')) || '').trim();
      if (nameValue && nameValue.toLowerCase().includes(wanted.toLowerCase().slice(0, 12))) {
        throw new Error(`Location data was entered into the Name field instead of Location: "${nameValue}"`);
      }
    }

    this.logStep(`Entered meeting location: ${this.meetingData.location}`);
  }

  async expectEnteredMeetingDetailsDisplayed() {
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const input = this.purposeInput();
    let purposeOk = body.toLowerCase().includes(String(this.meetingData.purpose || '').toLowerCase());
    if (!purposeOk && (await input.isVisible({ timeout: 2000 }).catch(() => false))) {
      const value = ((await input.inputValue().catch(() => '')) || (await input.innerText().catch(() => ''))).trim();
      purposeOk = value.toLowerCase().includes(String(this.meetingData.purpose || '').toLowerCase().slice(0, 12));
    }

    expect(purposeOk, 'Meeting purpose should be entered in the form').toBeTruthy();

    if (/mode\s*in person|in person at our office|offline/i.test(body) && !/mode\s*online/i.test(body)) {
      this.meetingData.mode = 'Offline';
    }

    const mode = String(this.meetingData.mode || 'Online').toLowerCase();
    if (mode === 'offline') {
      const offlineOk = /offline|in[\s-]?person|at our office/i.test(body);
      expect(offlineOk, 'Offline meeting form should show In Person / Offline mode').toBeTruthy();
      const location = String(this.meetingData.location || '').trim();
      if (location) {
        const locationOk =
          body.toLowerCase().includes(location.toLowerCase().slice(0, 12)) ||
          /at our office|in person|mode:\s*in person/i.test(body);
        expect(locationOk, 'Meeting location or In Person office mode should be shown').toBeTruthy();
      }

      const nameField = this.nameInput();
      if (await nameField.isVisible({ timeout: 1500 }).catch(() => false)) {
        const nameValue = ((await nameField.inputValue().catch(() => '')) || '').trim();
        const polluted = /chennai,\s*tamil nadu|tamil nadu,\s*india/i.test(nameValue);
        expect(polluted, `Name field should not contain address data (found: "${nameValue}")`).toBeFalsy();
      }
    } else {
      expect(/online/i.test(body)).toBeTruthy();
    }

    expect(/booking summary|confirm booking/i.test(body)).toBeTruthy();
    this.logStep('All entered customer meeting details are displayed');
  }

  async clickConfirmBooking() {
    const btn = this.confirmBookingButton();
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(btn).toBeEnabled({ timeout: this.uiTimeout });
    await btn.click({ timeout: this.uiTimeout, force: true });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Confirm Booking');
  }

  async expectMeetingCreatedSuccessfully() {
    await expect
      .poll(
        async () => {
          const toast = await this.page
            .locator('.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
            .filter({ hasText: /success|created|booked|scheduled|meeting|thank you/i })
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
          return (
            toast ||
            /meeting.*success|booked|scheduled successfully|thank you|confirmation|successfully scheduled/i.test(body)
          );
        },
        { timeout: 60000, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();
    this.logStep('Customer meeting created successfully');
  }

  async expectSuccessToast() {
    const toast = this.page
      .locator('.Toastify, [class*="Toastify"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({ hasText: /success|created|booked|scheduled|meeting|thank you/i })
      .first();
    const toastVisible = await toast.isVisible({ timeout: 8000 }).catch(() => false);
    if (toastVisible) {
      this.logStep('Customer meeting success toast is displayed');
      return;
    }
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
    expect(/thank you|success|scheduled|booked/i.test(body)).toBeTruthy();
    this.logStep('Customer meeting success acknowledgment is displayed');
  }

  getMeetingData() {
    return { ...this.meetingData };
  }
}

module.exports = CustomerScheduleMeetingPage;
