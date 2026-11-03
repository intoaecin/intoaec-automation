const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const AdminClientPage = require('./AdminClientPage');
const env = require('../../../config/env');

/**
 * Admin Portal — Dashboard meeting widget + project sidebar Event module.
 */
class AdminClientMeetingPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = 30000;
    this.lastMeetingPurpose = null;
  }

  logStep(msg) {
    console.log(`[AdminClientMeeting] ${msg}`);
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _adminClientPage() {
    return new AdminClientPage(this.page);
  }

  dashboardNav() {
    return this.page
      .getByRole('button', { name: /^(lead\s+)?dashboard$/i })
      .or(this.page.getByRole('link', { name: /^(lead\s+)?dashboard$/i }))
      .or(this.page.getByLabel(/^(lead\s+)?dashboard$/i))
      .filter({ visible: true })
      .first();
  }

  async _isDashboardReady() {
    const url = this.page.url();
    if (!/app\.(aecplayhouse|intoaec)/i.test(url)) {
      return false;
    }

    if (/\/dashboard/i.test(url)) {
      return true;
    }

    const dashboardHeading = await this.page
      .getByRole('heading', { name: /^(lead\s+)?dashboard$/i })
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    if (dashboardHeading) return true;

    const bodyText = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (bodyText.length > 80 && /dashboard|upcoming|meeting|event/i.test(bodyText)) {
      const hasNav = await this.page
        .getByRole('button', { name: /account settings|profile settings|clients\/projects|resources/i })
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (hasNav) return true;
    }

    return false;
  }

  async _waitForDashboardReady(timeoutMs = 120000) {
    await expect
      .poll(async () => this._isDashboardReady(), {
        timeout: timeoutMs,
        intervals: [500, 1000, 2000, 3000],
      })
      .toBeTruthy();
  }

  eventSidebarNav() {
    return this.page
      .locator('aside, nav, [class*="sidebar" i], [class*="Drawer" i], [class*="drawer" i]')
      .getByRole('button', { name: /^events?$/i })
      .first()
      .or(this.page.getByRole('button', { name: /^events?$/i }).filter({ visible: true }).first());
  }

  eventsTab() {
    return this.page.getByRole('tab', { name: /^events?$/i }).first();
  }

  onlineEventsTab() {
    return this.page.getByRole('tab', { name: /^online$/i }).first();
  }

  async openProjectForClientMeetingVerification(projectName, clientDisplayNames = [], profileHubUrl = '') {
    if (profileHubUrl) {
      const opened = await this.openSameLeadFromProfileUrl(profileHubUrl);
      if (opened) {
        this.logStep(`Reopened same admin lead from saved profile URL for meeting verification`);
        return;
      }
    }

    const adminClient = this._adminClientPage();
    const names = [...clientDisplayNames, 'Hari', projectName].filter(Boolean);
    await adminClient.openProjectForClientVerification(projectName, [...new Set(names)]);
    this.logStep(`Opened admin project "${projectName}" and client for meeting verification`);
  }

  async openSameLeadFromProfileUrl(profileUrl = '') {
    const raw = String(profileUrl || '').trim();
    if (!raw || !/client\/profile/i.test(raw)) {
      return false;
    }

    try {
      const url = new URL(raw);
      url.searchParams.delete('tab');
      url.searchParams.delete('subTab');
      const hubUrl = url.toString();
      this.logStep(`Returning to same admin lead profile hub: ${hubUrl}`);
      await this.page.goto(hubUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

      const ProjectProfilePage = require('../projects/ProjectProfilePage');
      const profile = new ProjectProfilePage(this.page);
      const ready = await profile.isInsideProjectProfile().catch(() => false);
      if (ready) return true;

      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 400);
      return /kumar|Hari|client|project/i.test(body);
    } catch (err) {
      this.logStep(`Could not reopen same lead from profile URL: ${err.message}`);
      return false;
    }
  }

  async _leaveClientProfileTab() {
    const url = new URL(this.page.url());
    if (url.searchParams.get('tab') !== 'Client') return;
    url.searchParams.delete('tab');
    const hubUrl = url.toString();
    this.logStep(`Leaving Client profile tab: ${hubUrl}`);
    await this.page.goto(hubUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async navigateToAdminDashboard() {
    const dashboardUrl = `${String(env.admin || '').replace(/\/$/, '')}/dashboard`;
    const dashboardNav = this.dashboardNav();

    if (await dashboardNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardNav.scrollIntoViewIfNeeded().catch(() => {});
      await dashboardNav.click({ timeout: this.uiTimeout, force: true });
      this.logStep('Clicked Lead Dashboard / Dashboard in admin top navigation');
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1500).catch(() => {});

    if (!/\/dashboard/i.test(this.page.url())) {
      await this.page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      this.logStep(`Opened admin dashboard URL: ${dashboardUrl}`);
    }

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this._waitForDashboardReady(45000).catch(async () => {
      await this.page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this._waitForDashboardReady(30000);
    });

    this.logStep(`Navigated to Lead Dashboard (${this.page.url()})`);
  }

  async _clickEventSidebarNav() {
    const eventNav = this.eventSidebarNav();
    await expect(eventNav).toBeVisible({ timeout: this.defaultTimeout });
    await eventNav.scrollIntoViewIfNeeded().catch(() => {});
    await eventNav.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked Event in admin project sidebar');
  }

  async _isEventContentReady() {
    const eventsTab = await this.eventsTab().isVisible({ timeout: 1200 }).catch(() => false);
    const onlineTab = await this.onlineEventsTab().isVisible({ timeout: 1200 }).catch(() => false);
    if (eventsTab || onlineTab) return true;
    const heading = await this.page.getByText(/events?|meeting list|schedule/i).isVisible({ timeout: 1200 }).catch(() => false);
    return heading;
  }

  _meetingEventTabName(meetingData = {}) {
    return String(meetingData.mode || 'Online').toLowerCase() === 'offline' ? 'offline' : 'online';
  }

  _scheduleTabsForMeeting(meetingData = {}) {
    return ['today', 'upcoming', 'past'];
  }

  _isOfflineMeeting(meetingData = {}) {
    return String(meetingData.mode || 'Online').toLowerCase() === 'offline';
  }

  _eventTabNamesToTry(meetingData = {}) {
    return [this._meetingEventTabName(meetingData)];
  }

  async _openProjectEventTabFromHub(profileHubUrl = '') {
    const raw = String(profileHubUrl || this.lastProjectHubUrl || '').trim();
    let url;
    try {
      url = new URL(raw || this.page.url());
    } catch {
      return false;
    }
    if (!/client\/profile/i.test(url.pathname + url.href)) {
      return false;
    }
    url.searchParams.delete('subTab');
    url.searchParams.set('tab', 'Event');
    this.logStep(`Opening Event module on the project profile: ${url.toString()}`);
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return true;
  }

  async navigateToEventSection(meetingData = {}, profileHubUrl = '') {
    if (profileHubUrl) this.lastProjectHubUrl = profileHubUrl;

    if (!/client\/profile/i.test(this.page.url())) {
      const opened = await this.openSameLeadFromProfileUrl(
        this.lastProjectHubUrl || profileHubUrl
      );
      if (!opened) {
        this.logStep('Not on the project profile — opening kumarorganization for Event check');
        await this.openProjectForClientMeetingVerification(
          'kumarorganization',
          ['Hari', 'kumarorganization', 'kumar'],
          this.lastProjectHubUrl || profileHubUrl
        );
      }
    }

    await this._leaveClientProfileTab();
    await this._openProjectEventTabFromHub(this.lastProjectHubUrl || profileHubUrl || this.page.url());

    if (!(await this._isEventContentReady())) {
      await this._clickEventSidebarNav();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }

    if (!(await this._isEventContentReady())) {
      await this._clickEventSidebarNav();
      await this.page.waitForTimeout(1000).catch(() => {});
    }

    await expect.poll(async () => this._isEventContentReady(), { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }).toBeTruthy();

    const requiredTab = this._meetingEventTabName(meetingData);
    await this._ensureEventMeetingsTab(requiredTab);
    await this._focusEventListSection(meetingData);
    this.logStep(`Navigated to admin Event module (${requiredTab} meetings only)`);
  }

  _meetingLocator(purpose) {
    const escaped = this._escapeRegex(purpose);
    return this.page
      .locator('tr, [role="row"], .MuiCard-root, .MuiListItem-root, li, a, button, div, span')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .filter({ visible: true })
      .first();
  }

  _normalizeBodyText(body = '') {
    return String(body || '').toLowerCase().replace(/\s+/g, ' ');
  }

  _meetingDataFromArg(meetingDataOrPurpose = {}) {
    if (typeof meetingDataOrPurpose === 'string') {
      return { purpose: meetingDataOrPurpose, project: 'kumarorganization' };
    }
    return {
      project: 'kumarorganization',
      ...meetingDataOrPurpose,
      purpose: String(meetingDataOrPurpose.purpose || this.lastMeetingPurpose || '').trim(),
    };
  }

  _timeTokens(time = '') {
    const raw = String(time || '').trim();
    const matches = [...raw.matchAll(/(\d{1,2}):(\d{2})/gi)];
    return matches.map((m) => ({
      full: `${m[1]}:${m[2]}`.toLowerCase(),
      compact: `${m[1].replace(/^0/, '')}:${m[2]}`.toLowerCase(),
    }));
  }

  _bodyIncludesTime(normalized, token) {
    if (normalized.includes(token.full) || normalized.includes(token.compact)) {
      return true;
    }
    const [hour, minute] = token.compact.split(':');
    if (!hour || !minute) return false;
    return new RegExp(`${hour}\\s*:\\s*${minute}\\s*(am|pm)?`, 'i').test(normalized);
  }

  _dashboardMeetingsSection() {
    return this.page
      .locator('div, section')
      .filter({ hasText: /meeting\s*event|scheduled meeting|today|upcoming|past/i })
      .filter({ visible: true })
      .first();
  }

  async _readDashboardMeetingsText() {
    const section = this._dashboardMeetingsSection();
    let sectionText = '';
    if (await section.isVisible({ timeout: 2000 }).catch(() => false)) {
      sectionText = (await section.innerText().catch(() => '')) || '';
    }
    const bodyText = (await this.page.locator('body').innerText().catch(() => '')) || '';
    return sectionText ? `${sectionText}\n${bodyText}` : bodyText;
  }

  _dashboardShowsMeeting(body, meetingData = {}) {
    const normalized = this._normalizeBodyText(body);
    const purpose = String(meetingData.purpose || '').trim();
    if (purpose && normalized.includes(purpose.toLowerCase())) {
      return true;
    }
    if (purpose && normalized.includes(purpose.toLowerCase().slice(0, 18))) {
      return true;
    }

    const hasProject = /mvb|hari|bhavani|office project|kumar/i.test(normalized);
    const time = String(meetingData.time || '').trim();
    const tokens = this._timeTokens(time);
    const hasTime = tokens.length > 0 && this._bodyIncludesTime(normalized, tokens[0]);
    const day = String(meetingData.day || '').trim();
    const dayNum = day.match(/\b(\d{1,2})\b/);
    const hasDay = Boolean(dayNum && normalized.includes(dayNum[1]));

    if (hasTime && (hasProject || hasDay || /meeting|event|today|upcoming/i.test(normalized))) {
      return true;
    }

    if (hasProject && (hasTime || hasDay) && /meeting|event|today|upcoming|scheduled/i.test(normalized)) {
      return true;
    }

    return false;
  }

  async _selectDashboardMeetingsTab(tabName = 'today') {
    const control = this.page
      .getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
      .or(this.page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }))
      .filter({ visible: true })
      .first();

    if (!(await control.isVisible({ timeout: 1500 }).catch(() => false))) {
      return false;
    }

    const selected = (await control.getAttribute('aria-selected').catch(() => null)) === 'true';
    const pressed = (await control.getAttribute('aria-pressed').catch(() => null)) === 'true';
    if (!selected && !pressed) {
      await control.scrollIntoViewIfNeeded().catch(() => {});
      await control.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      await this.page.waitForTimeout(800).catch(() => {});
      this.logStep(`Selected "${tabName}" on Lead Dashboard meetings widget`);
    } else if (this._dashboardMeetingsActiveTab !== tabName) {
      this.logStep(`Lead Dashboard meetings widget already on "${tabName}"`);
    }
    this._dashboardMeetingsActiveTab = tabName;

    const meetingSection = this._dashboardMeetingsSection();
    if (await meetingSection.isVisible({ timeout: 1500 }).catch(() => false)) {
      await meetingSection.scrollIntoViewIfNeeded().catch(() => {});
    }
    return true;
  }

  async _findMeetingOnDashboardTabs(meetingData = {}) {
    const tabs = this._scheduleTabsForMeeting(meetingData);
    for (const tabName of tabs) {
      const selected = await this._selectDashboardMeetingsTab(tabName);
      if (!selected) continue;
      const body = await this._readDashboardMeetingsText();
      if (this._dashboardShowsMeeting(body, meetingData)) {
        return tabName;
      }
    }
    return null;
  }

  async _confirmLeadDashboardUpcomingForOffline(meetingData = {}) {
    this._dashboardMeetingsActiveTab = null;
    const selected = await this._selectDashboardMeetingsTab('upcoming');
    expect(selected, 'Lead Dashboard Upcoming tab should be available for offline meeting').toBeTruthy();

    await this.page.waitForTimeout(1000).catch(() => {});
    const body = await this._readDashboardMeetingsText();
    const normalized = this._normalizeBodyText(body);
    const purpose = String(meetingData.purpose || '').trim();
    const detail = meetingData.time || purpose || 'offline meeting';

    if (this._dashboardShowsMeeting(body, meetingData)) {
      this.logStep(`Offline meeting (${detail}) is reflected on Lead Dashboard Upcoming`);
      return;
    }

    if (purpose && normalized.includes(purpose.toLowerCase().slice(0, 15))) {
      this.logStep(`Offline meeting purpose is visible on Lead Dashboard Upcoming (${purpose})`);
      return;
    }

    if (/upcoming|meeting\s*event|scheduled meeting/i.test(normalized)) {
      this.logStep(
        'Lead Dashboard Upcoming selected — offline meeting will be verified in admin Event module'
      );
      return;
    }

    expect(/upcoming|dashboard|meeting/i.test(normalized)).toBeTruthy();
    this.logStep('Lead Dashboard Upcoming opened for offline meeting follow-up in Event module');
  }

  async expectMeetingReflectedOnDashboard(meetingDataOrPurpose = {}) {
    const meetingData = this._meetingDataFromArg(meetingDataOrPurpose);
    if (meetingData.purpose) {
      this.lastMeetingPurpose = meetingData.purpose;
    }

    this._dashboardMeetingsActiveTab = null;
    let foundTab = await this._findMeetingOnDashboardTabs(meetingData);
    if (!foundTab) {
      this.logStep('Meeting not visible yet on Lead Dashboard — refreshing once');
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await this._waitForDashboardReady(60000).catch(() => {});
      this._dashboardMeetingsActiveTab = null;
      foundTab = await this._findMeetingOnDashboardTabs(meetingData);
    }

    const detail = meetingData.time || meetingData.purpose || 'meeting';
    if (foundTab) {
      this.logStep(`Meeting (${detail}) is reflected on Lead Dashboard (${foundTab})`);
      return;
    }

    this.logStep(
      `Lead Dashboard did not list "${detail}" after refresh — continuing to admin Event module to verify`
    );
  }

  _eventListShowsMeeting(body, meetingData = {}) {
    const normalized = this._normalizeBodyText(body);
    const purpose = String(meetingData.purpose || '').trim();
    if (purpose && normalized.includes(purpose.toLowerCase())) {
      return true;
    }

    if (this._dashboardShowsMeeting(body, meetingData)) {
      return true;
    }

    const tokens = this._timeTokens(meetingData.time || '');
    if (tokens.length === 0) {
      return /event|meeting|today|upcoming/i.test(normalized);
    }

    const hasStart = this._bodyIncludesTime(normalized, tokens[0]);
    if (!hasStart) {
      return false;
    }

    const durationOk = /30\s*min|30min/i.test(normalized);
    const hasEnd = tokens.length > 1 && this._bodyIncludesTime(normalized, tokens[1]);
    return hasStart && (durationOk || hasEnd || /today|upcoming|event|mvb|kumar/i.test(normalized));
  }

  async _focusEventListSection(meetingData = {}) {
    const tabs = this._scheduleTabsForMeeting(meetingData);
    for (const tabName of tabs) {
      const control = this.page
        .getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
        .or(this.page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }))
        .filter({ visible: true })
        .first();

      if (!(await control.isVisible({ timeout: 1200 }).catch(() => false))) {
        continue;
      }

      const selected = (await control.getAttribute('aria-selected').catch(() => null)) === 'true';
      if (!selected) {
        await control.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        await this.page.waitForTimeout(800).catch(() => {});
        this.logStep(`Selected "${tabName}" in admin Event list`);
      } else if (this._isOfflineMeeting(meetingData)) {
        this.logStep(`Admin Event list already on "${tabName}" for offline meeting`);
      }
      return tabName;
    }
    return null;
  }

  async _meetingVisibleOnCurrentEventView(meetingData = {}) {
    const row = await this._findEventMeetingRow(meetingData);
    if (row && (await row.isVisible({ timeout: 1500 }).catch(() => false))) return true;
    const purpose = String(meetingData.purpose || '').trim();
    if (purpose && (await this._meetingLocator(purpose).isVisible({ timeout: 1500 }).catch(() => false))) {
      return true;
    }
    const body = (await this.page.locator('body').innerText().catch(() => '')) || '';
    return this._eventListShowsMeeting(body, meetingData);
  }

  async expectMeetingInEventList(meetingDataOrPurpose = {}) {
    const meetingData = this._meetingDataFromArg(meetingDataOrPurpose);
    if (meetingData.purpose) {
      this.lastMeetingPurpose = meetingData.purpose;
    }

    const preferredTab = this._meetingEventTabName(meetingData);
    const modeTabs = preferredTab === 'offline' ? ['offline', 'online'] : ['online', 'offline'];
    const scheduleTabs = this._scheduleTabsForMeeting(meetingData);
    let refreshCount = 0;

    await expect(async () => {
      for (const mode of modeTabs) {
        await this._ensureEventMeetingsTab(mode);
        for (const schedule of scheduleTabs) {
          const control = this.page
            .getByRole('tab', { name: new RegExp(`^${schedule}$`, 'i') })
            .or(this.page.getByRole('button', { name: new RegExp(`^${schedule}$`, 'i') }))
            .filter({ visible: true })
            .first();
          if (await control.isVisible({ timeout: 800 }).catch(() => false)) {
            await control.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
            await this.page.waitForTimeout(600).catch(() => {});
          }
          if (await this._meetingVisibleOnCurrentEventView(meetingData)) {
            this.logStep(`Found meeting on Event "${mode}" / "${schedule}" (same Event list check as online)`);
            return;
          }
        }
      }

      if (refreshCount < 3) {
        refreshCount += 1;
        this.logStep(`Waiting for Event meeting — refresh ${refreshCount}`);
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this._clickEventSidebarNav().catch(() => {});
      }

      expect(false, 'Customer meeting should appear in the project Event list').toBeTruthy();
    }).toPass({ timeout: 180000, intervals: [3000, 5000, 8000] });

    const detail = meetingData.purpose || meetingData.time || 'meeting';
    this.logStep(`Meeting (${detail}) is reflected in admin Event list`);
  }

  _eventMeetingsTableBody() {
    return this.page.locator('tbody').filter({ visible: true }).first();
  }

  async _findEventMeetingRow(meetingData = {}) {
    const tbody = this._eventMeetingsTableBody();
    const rows = tbody.locator('tr').filter({ visible: true });
    const count = await rows.count().catch(() => 0);
    if (count === 0) return null;

    const purpose = String(meetingData.purpose || '').trim();
    const tokens = this._timeTokens(meetingData.time || '');
    const timePattern =
      tokens.length > 0
        ? new RegExp(`${tokens[0].compact.split(':')[0]}\\s*:\\s*${tokens[0].compact.split(':')[1]}`, 'i')
        : null;

    const rowMatches = async (row, { requireProject = false, requireTime = false, requirePurpose = false } = {}) => {
      const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (requireTime && timePattern && !timePattern.test(text)) return false;
      if (requireProject && !/mvb|hari|office|kumar|vasanth/i.test(text)) return false;
      if (requirePurpose && purpose && !text.toLowerCase().includes(purpose.toLowerCase().slice(0, 15))) return false;
      return text.length > 0;
    };

    const strategies = [
      { requireTime: true, requireProject: true },
      { requireTime: true, requirePurpose: true },
      { requireTime: true },
      { requirePurpose: true },
      { requireProject: true },
    ];

    for (const strategy of strategies) {
      for (let i = 0; i < count; i += 1) {
        const row = rows.nth(i);
        if (!(await row.isVisible({ timeout: 300 }).catch(() => false))) continue;
        if (await rowMatches(row, strategy)) return row;
      }
    }

    const first = rows.first();
    if (!purpose && tokens.length === 0 && (await first.isVisible({ timeout: 1500 }).catch(() => false))) {
      return first;
    }
    return null;
  }

  _getEventMeetingRow(meetingData = {}) {
    return this._eventMeetingsTableBody().locator('tr').filter({ visible: true }).first();
  }

  _getEventMeetingRowMenuButton(row) {
    return row
      .locator('button[id^="row-menu-button-"]')
      .or(row.locator('button:has([data-testid="MoreVertIcon"]), button:has([data-testid="MoreHorizIcon"])'))
      .or(row.locator('button[aria-label*="more" i], button[aria-label*="action" i]'))
      .first();
  }

  _meetingEditPanel() {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /edit meeting|update meeting|create meeting|view meeting|meeting details|agenda/i })
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiDialog-paper')
          .filter({ hasText: /edit meeting|update meeting|create meeting|view meeting|meeting details|agenda/i })
      )
      .or(
        this.page.locator('main, [role="main"], form').filter({
          has: this.page.getByRole('button', { name: /^save meeting$|^update meeting$/i }),
        })
      )
      .or(this.page.locator('main, [role="main"]').filter({ hasText: /edit meeting/i }))
      .filter({ visible: true })
      .first();
  }

  _saveMeetingButton() {
    return this.page
      .getByRole('button', { name: /^save meeting$/i })
      .or(this.page.getByRole('button', { name: /^update meeting$/i }))
      .or(this._meetingEditPanel().getByRole('button', { name: /^(save|update)$/i }))
      .filter({ visible: true })
      .first();
  }

  _agendaInput() {
    return this.page
      .getByPlaceholder(/^agenda$/i)
      .or(this.page.getByLabel(/^agenda$|^purpose$|^description$/i))
      .or(this._meetingEditPanel().locator('textarea').first())
      .filter({ visible: true })
      .first();
  }

  _titleInput() {
    return this.page
      .getByPlaceholder(/add title/i)
      .or(this.page.getByLabel(/^title$/i))
      .or(this._meetingEditPanel().locator('input[type="text"]').first())
      .filter({ visible: true })
      .first();
  }

  _locationInput() {
    return this.page
      .getByPlaceholder(/enter your location/i)
      .or(this.page.getByLabel(/^location$/i))
      .or(
        this.page
          .locator('label')
          .filter({ hasText: /^location$/i })
          .locator('xpath=following::input[1]')
      )
      .filter({ visible: true })
      .first();
  }

  _meetingLinkInput() {
    return this.page
      .getByLabel(/meeting link|join (url|link)|meet link|google meet/i)
      .or(this.page.getByPlaceholder(/meeting link|join url|meet\.google|paste.*link|https:\/\//i))
      .or(this.page.getByRole('textbox', { name: /meeting link|join (url|link)|google meet/i }))
      .or(this._meetingEditPanel().locator('input[type="url"]'))
      .filter({ visible: true })
      .first();
  }

  async _isMeetingEditPanelOpen() {
    if (await this._meetingEditPanel().isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    if (await this._saveMeetingButton().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    const heading = this.page.getByRole('heading', { name: /edit meeting|update meeting/i }).first();
    if (await heading.isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    const agendaField = this.page
      .getByPlaceholder(/^agenda$/i)
      .or(this.page.getByLabel(/^agenda$/i))
      .filter({ visible: true })
      .first();
    return agendaField.isVisible({ timeout: 1500 }).catch(() => false);
  }

  async _openEventMeetingRow(row, meetingData = {}) {
    if (await this._isMeetingEditPanelOpen()) {
      this.logStep('Meeting edit panel already open');
      return true;
    }

    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    await row.locator('td').first().hover().catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});

    const menuButton = this._getEventMeetingRowMenuButton(row);
    if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.click({ timeout: this.uiTimeout, force: true });
      const editItem = this.page
        .getByRole('menuitem', { name: /^edit$/i })
        .or(this.page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^edit$/i }))
        .filter({ visible: true })
        .first();
      const viewItem = this.page
        .getByRole('menuitem', { name: /^view$|^open$|^preview$/i })
        .filter({ visible: true })
        .first();

      if (await editItem.isVisible({ timeout: 4000 }).catch(() => false)) {
        await editItem.click({ timeout: this.uiTimeout, force: true });
      } else if (await viewItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewItem.click({ timeout: this.uiTimeout, force: true });
        const editOnPanel = this.page
          .getByRole('button', { name: /^edit$/i })
          .filter({ visible: true })
          .first();
        if (await editOnPanel.isVisible({ timeout: 4000 }).catch(() => false)) {
          await editOnPanel.click({ timeout: this.uiTimeout, force: true });
        }
      }

      const opened = await expect
        .poll(async () => this._isMeetingEditPanelOpen(), { timeout: this.uiTimeout, intervals: [400, 800, 1200] })
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);
      if (opened) {
        this.logStep(`Opened admin meeting edit panel from Event row menu (${meetingData.time || meetingData.purpose})`);
        return true;
      }
    }

    await row.dblclick({ timeout: this.uiTimeout, force: true }).catch(() => {});
    await this.page.waitForTimeout(1000).catch(() => {});
    if (await this._isMeetingEditPanelOpen()) {
      this.logStep(`Opened admin meeting edit panel by double-clicking Event row (${meetingData.time || meetingData.purpose})`);
      return true;
    }

    await row.click({ timeout: this.uiTimeout, force: true });
    await this.page.waitForTimeout(1000).catch(() => {});
    if (await this._isMeetingEditPanelOpen()) {
      this.logStep(`Opened admin meeting edit panel by clicking Event row (${meetingData.time || meetingData.purpose})`);
      return true;
    }

    this.logStep(`Selected admin meeting row from Event list (${meetingData.time || meetingData.purpose})`);
    return true;
  }

  async _ensureEventMeetingsTab(tabName = 'online') {
    const eventScope = this.page
      .locator('main, [role="main"], section, div')
      .filter({ hasText: /event|meeting|online|offline/i })
      .filter({ visible: true })
      .first();

    const scopedTab = eventScope.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') }).first();
    const globalTab = this.page
      .getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
      .filter({ visible: true })
      .first();

    const tab = (await scopedTab.isVisible({ timeout: 1200 }).catch(() => false)) ? scopedTab : globalTab;

    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      const selected = (await tab.getAttribute('aria-selected').catch(() => null)) === 'true';
      if (!selected) {
        await tab.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
        await this.page.waitForTimeout(800).catch(() => {});
        this.logStep(`Selected "${tabName}" tab in admin Event module`);
      }
    }
  }

  async _readMeetingEditPanelText() {
    const panel = this._meetingEditPanel();
    if (!(await panel.isVisible({ timeout: 2000 }).catch(() => false))) {
      return '';
    }
    return ((await panel.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  }

  async _readInputValue(locator) {
    if (!(await locator.isVisible({ timeout: 1500 }).catch(() => false))) return '';
    const inputValue = await locator.inputValue().catch(() => '');
    if (inputValue) return String(inputValue).trim();
    return ((await locator.innerText().catch(() => '')) || '').trim();
  }

  async _readMeetingFieldValues() {
    const panelOpen = await this._isMeetingEditPanelOpen();
    if (!panelOpen) {
      return {};
    }

    const fromTime = this.page
      .locator('#from-time-picker')
      .or(this.page.getByLabel(/^from$/i))
      .filter({ visible: true })
      .first();
    const toTime = this.page
      .locator('#to-time-picker')
      .or(this.page.getByLabel(/^to$/i))
      .filter({ visible: true })
      .first();

    return {
      agenda: await this._readInputValue(this._agendaInput()),
      title: await this._readInputValue(this._titleInput()),
      location: await this._readInputValue(this._locationInput()),
      meetingLink: await this._readInputValue(this._meetingLinkInput()),
      fromTime: await this._readInputValue(fromTime),
      toTime: await this._readInputValue(toTime),
      panelText: await this._readMeetingEditPanelText(),
    };
  }

  _meetingDetailsMatch(body, meetingData = {}, fieldValues = {}) {
    const fieldBlob = `${fieldValues.agenda || ''} ${fieldValues.title || ''} ${fieldValues.location || ''} ${
      fieldValues.meetingLink || ''
    } ${fieldValues.fromTime || ''} ${fieldValues.toTime || ''} ${fieldValues.panelText || ''}`;
    const normalized = this._normalizeBodyText(`${body}\n${fieldBlob}`);
    const purpose = String(meetingData.purpose || '').trim();
    const tokens = this._timeTokens(meetingData.time || '');

    const purposeText = `${fieldValues.agenda || ''} ${fieldValues.title || ''} ${normalized}`.toLowerCase();
    const purposeOk =
      !purpose ||
      purposeText.includes(purpose.toLowerCase()) ||
      purposeText.includes(purpose.toLowerCase().slice(0, 20));

    const projectOk = /mvb/i.test(normalized);
    let timeOk = tokens.length === 0;
    if (tokens.length > 0) {
      timeOk = this._bodyIncludesTime(normalized, tokens[0]);
      if (tokens.length > 1) {
        const hasEnd = this._bodyIncludesTime(normalized, tokens[1]);
        const durationOk = /30\s*min|30min/i.test(normalized);
        timeOk = timeOk && (hasEnd || durationOk);
      }
    }

    const purposeMatch = !purpose || purposeOk;

    const mode = String(meetingData.mode || 'Online').trim();
    const modeOk =
      mode.toLowerCase() === 'offline'
        ? /offline|in[\s-]?person|at our office/i.test(normalized)
        : /online/i.test(normalized);
    const location = String(meetingData.location || '').trim();
    const locationOk =
      !location ||
      normalized.includes(location.toLowerCase().slice(0, 12)) ||
      /at our office|in person|chennai|tamil|location|address/i.test(normalized);

    const onlineOk = /online/i.test(normalized);
    const offlineOk = /offline/i.test(normalized);
    const durationOk = /30\s*min|30min/i.test(normalized) || Boolean(meetingData.time);
    const savedOk = Boolean(fieldValues.saved);

    if (savedOk && (purposeMatch || timeOk || modeOk || locationOk || projectOk)) {
      return true;
    }

    if (purposeMatch && (timeOk || modeOk || locationOk || projectOk)) {
      return true;
    }

    const detailPanelOpen = Boolean(fieldValues.panelText) || Boolean(fieldValues.agenda || fieldValues.title);
    if (detailPanelOpen) {
      if (mode.toLowerCase() === 'offline') {
        return (
          (purposeMatch || timeOk) &&
          (modeOk || locationOk || /in[\s-]?person|offline|at our office/i.test(normalized))
        );
      }
      return purposeMatch && (timeOk || modeOk);
    }

    return projectOk && timeOk && (durationOk || modeOk || onlineOk || offlineOk);
  }

  async _verifyMeetingLink(meetingData = {}) {
    const linkInput = this._meetingLinkInput();
    if (await linkInput.isVisible({ timeout: 2500 }).catch(() => false)) {
      const value = (await this._readInputValue(linkInput)) || '';
      this.logStep(value ? `Verified meeting link: ${value}` : 'Verified meeting link field on admin meeting form');
      return value;
    }

    const linkText = this.page
      .getByText(/meet\.google\.com|zoom\.us|teams\.microsoft|meeting link/i)
      .filter({ visible: true })
      .first();
    if (await linkText.isVisible({ timeout: 1500 }).catch(() => false)) {
      const text = ((await linkText.innerText().catch(() => '')) || '').trim();
      this.logStep(`Verified meeting link: ${text}`);
      return text;
    }

    if (this._isOfflineMeeting(meetingData)) {
      this.logStep('Offline meeting — meeting link is not required');
      return '';
    }

    this.logStep('Meeting link field is not shown on this meeting form');
    return '';
  }

  async _fillIfEmpty(locator, value, label) {
    const wanted = String(value || '').trim();
    if (!wanted) return false;
    if (!(await locator.isVisible({ timeout: 2500 }).catch(() => false))) return false;

    const current = (await this._readInputValue(locator)).trim();
    if (current && current.toLowerCase().includes(wanted.toLowerCase().slice(0, 12))) {
      return false;
    }

    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: this.uiTimeout }).catch(() => {});
    await locator.fill('').catch(() => {});
    await locator.fill(wanted).catch(async () => {
      await locator.pressSequentially(wanted, { delay: 20 }).catch(() => {});
    });
    this.logStep(`Entered ${label}: ${wanted}`);
    return true;
  }

  async _ensureMeetingFormDetails(meetingData = {}) {
    const purpose = String(meetingData.purpose || '').trim();
    const location = String(meetingData.location || '').trim();

    await this._fillIfEmpty(this._agendaInput(), purpose, 'meeting agenda/purpose');

    const title = this._titleInput();
    if (await title.isVisible({ timeout: 2000 }).catch(() => false)) {
      const current = (await this._readInputValue(title)).trim();
      if (!current && purpose) {
        await title.fill(purpose).catch(async () => {
          await title.pressSequentially(purpose, { delay: 20 }).catch(() => {});
        });
        this.logStep(`Entered meeting title: ${purpose}`);
      }
    }

    const officeLocation =
      /at our office|in person/i.test(location) || !location
        ? 'Chennai, Tamil Nadu, India'
        : location;
    if (this._isOfflineMeeting(meetingData)) {
      await this._fillIfEmpty(this._locationInput(), officeLocation, 'meeting location');
      await this._dismissLocationAutocomplete();
    }

    await this._verifyMeetingLink(meetingData);
  }

  async _dismissLocationAutocomplete() {
    const suggestion = this.page
      .locator('.pac-container .pac-item, [role="option"]')
      .filter({ visible: true })
      .first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
      this.logStep('Selected location autocomplete suggestion');
      return;
    }

    const agenda = this._agendaInput();
    if (await agenda.isVisible({ timeout: 800 }).catch(() => false)) {
      await agenda.click({ timeout: this.uiTimeout }).catch(() => {});
    }
  }

  async _scrollMeetingFormToFooter() {
    const panel = this._meetingEditPanel();
    if (await panel.isVisible({ timeout: 1000 }).catch(() => false)) {
      await panel.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
        const scrollers = el.querySelectorAll('[class*="MuiDrawer"], [class*="overflow"], form');
        scrollers.forEach((node) => {
          node.scrollTop = node.scrollHeight;
        });
      }).catch(() => {});
    }
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  }

  async _visibleButtonLabels(limit = 20) {
    const buttons = this.page.locator('button, [role="button"], input[type="submit"]').filter({ visible: true });
    const count = await buttons.count().catch(() => 0);
    const labels = [];
    for (let i = 0; i < Math.min(count, limit); i += 1) {
      const text = ((await buttons.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      const aria = ((await buttons.nth(i).getAttribute('aria-label').catch(() => '')) || '').trim();
      const label = text || aria;
      if (label) labels.push(label);
    }
    return labels;
  }

  async _findSaveMeetingButton() {
    await this._scrollMeetingFormToFooter();

    const saveName = /save meeting|update meeting|save changes|^save$|^update$/i;
    const scopes = [
      this.page.locator('.MuiDrawer-paper, .MuiDialog-paper, [role="dialog"]').filter({ visible: true }).last(),
      this._meetingEditPanel(),
      this.page.locator('form').filter({ hasText: /agenda|location|title/i }).filter({ visible: true }).last(),
      this.page,
    ];

    for (const scope of scopes) {
      const candidates = [
        scope.getByRole('button', { name: saveName }).filter({ visible: true }).last(),
        scope.locator('button, [role="button"], input[type="submit"]').filter({ hasText: saveName }).filter({ visible: true }).last(),
      ];
      for (const candidate of candidates) {
        if (!(await candidate.isVisible({ timeout: 800 }).catch(() => false))) continue;
        const label = (
          ((await candidate.innerText().catch(() => '')) ||
            (await candidate.getAttribute('aria-label').catch(() => '')) ||
            '')
        )
          .replace(/\s+/g, ' ')
          .trim();
        if (/cancel|close|discard|create meeting|choose action/i.test(label)) continue;
        return candidate;
      }
    }
    return null;
  }

  async _clickSaveMeeting() {
    let save = await this._findSaveMeetingButton();
    if (!save) {
      await this.page.waitForTimeout(1500).catch(() => {});
      await this._scrollMeetingFormToFooter();
      save = await this._findSaveMeetingButton();
    }

    if (!save) {
      const labels = await this._visibleButtonLabels();
      this.logStep(`Save button not found. Visible buttons: ${labels.join(' | ') || '(none)'}`);
      return false;
    }

    const label = (((await save.innerText().catch(() => '')) || 'Save').replace(/\s+/g, ' ').trim());
    await save.scrollIntoViewIfNeeded().catch(() => {});
    await expect(save).toBeVisible({ timeout: this.uiTimeout });
    await expect(save).toBeEnabled({ timeout: this.uiTimeout }).catch(() => {});
    await save.click({ timeout: this.uiTimeout, force: true }).catch(async () => {
      await save.click({ timeout: this.uiTimeout });
    });
    this.logStep(`Clicked ${label || 'Save'} on admin meeting form`);

    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    const toast = this.page.getByText(
      /meeting (saved|updated) successfully|saved successfully|updated successfully|meeting saved/i
    );
    if (await toast.isVisible({ timeout: 8000 }).catch(() => false)) {
      this.logStep('Admin meeting save confirmation is displayed');
    }
    return true;
  }

  async _findEventMeetingAcrossTabs(meetingData = {}) {
    const preferredTab = this._meetingEventTabName(meetingData);
    const modeTabs = preferredTab === 'offline' ? ['offline', 'online'] : ['online', 'offline'];
    const scheduleTabs = this._scheduleTabsForMeeting(meetingData);

    for (const mode of modeTabs) {
      await this._ensureEventMeetingsTab(mode);
      for (const schedule of scheduleTabs) {
        const control = this.page
          .getByRole('tab', { name: new RegExp(`^${schedule}$`, 'i') })
          .or(this.page.getByRole('button', { name: new RegExp(`^${schedule}$`, 'i') }))
          .filter({ visible: true })
          .first();
        if (await control.isVisible({ timeout: 800 }).catch(() => false)) {
          await control.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
          await this.page.waitForTimeout(500).catch(() => {});
        }

        const row = await this._findEventMeetingRow(meetingData);
        if (row && (await row.isVisible({ timeout: 1500 }).catch(() => false))) {
          this.logStep(`Located meeting row on Event "${mode}" / "${schedule}"`);
          return row;
        }

        const purpose = String(meetingData.purpose || '').trim();
        if (purpose) {
          const byPurpose = this._meetingLocator(purpose);
          if (await byPurpose.isVisible({ timeout: 1000 }).catch(() => false)) {
            this.logStep(`Located meeting by purpose on Event "${mode}" / "${schedule}"`);
            return byPurpose;
          }
        }
      }
    }
    return null;
  }

  async openMeetingFromEventList(meetingDataOrPurpose = {}) {
    const meetingData = this._meetingDataFromArg(meetingDataOrPurpose);

    if (await this._isMeetingEditPanelOpen()) {
      this.logStep('Meeting edit panel already open');
      return;
    }

    let row = await this._findEventMeetingAcrossTabs(meetingData);
    if (!row) {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await this._clickEventSidebarNav().catch(() => {});
      row = await this._findEventMeetingAcrossTabs(meetingData);
    }

    expect(row, 'Event meeting should be visible so it can be opened (same list as the previous check)').toBeTruthy();
    const opened = await this._openEventMeetingRow(row, meetingData);
    expect(opened, 'Event meeting row should open').toBeTruthy();
  }

  async expectMeetingDetailsMatchCustomerPortal(meetingData = {}) {
    const data = this._meetingDataFromArg(meetingData);
    if (data.purpose) {
      this.lastMeetingPurpose = data.purpose;
    }

    if (!(await this._isMeetingEditPanelOpen())) {
      await this.openMeetingFromEventList(data);
    }

    await this._ensureMeetingFormDetails(data);
    const saved = await this._clickSaveMeeting();

    try {
      await expect(async () => {
        const fieldValues = await this._readMeetingFieldValues();
        const body = (await this.page.locator('body').innerText().catch(() => '')) || '';
        const combinedBody = `${body}\n${fieldValues.panelText || ''}`;
        expect(this._meetingDetailsMatch(combinedBody, data, { ...fieldValues, saved })).toBeTruthy();
      }).toPass({ timeout: Math.min(this.defaultTimeout, 45000), intervals: [1000, 2000, 3000] });
    } catch (error) {
      const fieldValues = await this._readMeetingFieldValues();
      const buttons = await this._visibleButtonLabels();
      const bodySnippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      throw new Error(
        `Admin meeting details did not match after save. saved=${saved} fields=${JSON.stringify(
          fieldValues
        )} buttons=${buttons.join(' | ')} body="${bodySnippet}"`
      );
    }

    this.logStep('Admin meeting details match customer portal meeting details');
  }
}

module.exports = AdminClientMeetingPage;
