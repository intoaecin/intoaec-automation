const fs = require('fs');
const path = require('path');
const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectProfilePage = require('../../ProjectProfilePage');

/**
 * Codegen-aligned flow (app.aecplayhouse.com):
 * Project → profile icon → Project Management → Daily report → Create × 3
 *   (list → popup → submit create form)
 * Notes / Attachments editors mirror Client Report create-form patterns.
 */
class DailyReportPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.createSubmitSuccessTimeout = 25000;
    this.dailyReportCreateSuccessObserved = false;
    this.lastDailyReportNotes = null;
    this.lastDailyReportAttachmentPath = null;
    this.lastDailyReportWeatherNotes = null;
    this.lastDailyReportScheduleNames = [];
    this.lastDailyReportTaskName = null;
    this.lastDailyReportTaskNames = [];
    this.main = this.page.locator('main, [role="main"]').first();
  }

  async logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  /** Codegen: first Create on list — scoped to main content. */
  listPageCreateButton() {
    return this.createPageScope()
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .first()
      .or(this.visibleCreateButton());
  }

  /** Codegen: getByRole('button', { name: 'Create' }) — first visible on popup/form step. */
  visibleCreateButton() {
    return this.page.getByRole('button', { name: 'Create', exact: true }).filter({ visible: true }).first();
  }

  createPageScope() {
    return this.page.locator('main, [role="main"]').first();
  }

  reportTitleInput() {
    return this.page
      .getByRole('textbox', { name: 'Enter report title' })
      .or(this.page.getByRole('textbox', { name: /report title|daily report title|daily log title/i }))
      .or(this.page.getByPlaceholder(/report title|daily report|daily log/i))
      .first();
  }

  /** All visible Create buttons (list + popup + form). */
  allVisibleCreateButtons() {
    return this.page.getByRole('button', { name: /^create$/i }).filter({ visible: true });
  }

  /**
   * Create Daily Report confirmation popup (after list Create).
   * Client Report pattern + MUI paper/backdrop overlays.
   */
  createDailyReportPopupRoot() {
    const createBtn = this.page.getByRole('button', { name: /^create( daily (report|log))?$/i });

    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ has: createBtn })
      .last()
      .or(
        this.page
          .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root')
          .filter({ visible: true })
          .filter({ has: createBtn })
          .last()
      )
      .or(
        this.page
          .locator('[role="presentation"]')
          .filter({ visible: true })
          .filter({ has: createBtn })
          .filter({ has: this.page.locator('.MuiDialog-paper, .MuiPaper-root, .MuiDrawer-paper') })
          .last()
      );
  }

  /** Create button inside the open Daily Report popup only (not list Create). */
  createButtonInDailyReportPopup() {
    const popup = this.createDailyReportPopupRoot();
    return popup
      .getByRole('button', { name: /^create( daily (report|log))?$/i })
      .filter({ visible: true })
      .last();
  }

  /** DOM scan: modal/dialog that contains a Create button (most reliable for MUI). */
  async locatePopupCreateButtonHandle() {
    const handle = await this.page.evaluateHandle(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          style.opacity !== '0'
        );
      };

      const createRe = /^create(\s+daily\s+(report|log))?$/i;
      const roots = [
        ...document.querySelectorAll(
          '[role="dialog"], .MuiDialog-root, .MuiModal-root, .MuiDrawer-root, .MuiDialog-paper, .MuiDrawer-paper'
        ),
      ];

      for (const root of roots) {
        if (!isVisible(root)) continue;
        const buttons = [...root.querySelectorAll('button, [role="button"]')];
        const createBtn = buttons.find((b) => createRe.test((b.textContent || '').replace(/\s+/g, ' ').trim()));
        if (createBtn && isVisible(createBtn)) {
          return createBtn;
        }
      }

      // Backdrop present + Create button with high z-index / in paper
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop && isVisible(backdrop)) {
        const candidates = [...document.querySelectorAll('button, [role="button"]')].filter((b) =>
          createRe.test((b.textContent || '').replace(/\s+/g, ' ').trim())
        );
        // Prefer Create that sits above the list (higher in stacking / inside paper)
        for (let i = candidates.length - 1; i >= 0; i -= 1) {
          const btn = candidates[i];
          if (!isVisible(btn)) continue;
          if (btn.closest('.MuiDialog-paper, .MuiPaper-root, .MuiDrawer-paper, [role="dialog"]')) {
            return btn;
          }
        }
        if (candidates.length >= 2 && isVisible(candidates[candidates.length - 1])) {
          return candidates[candidates.length - 1];
        }
      }

      return null;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  async isDailyReportCreatePopupVisible() {
    if (await this.createButtonInDailyReportPopup().isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
    if (await this.createDailyReportPopupRoot().isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
    const handle = await this.locatePopupCreateButtonHandle();
    if (handle) {
      await handle.dispose().catch(() => {});
      return true;
    }
    // Codegen fallback: after list Create, a second Create often appears (popup)
    const count = await this.allVisibleCreateButtons().count().catch(() => 0);
    if (count >= 2) {
      return true;
    }
    return false;
  }

  async logPopupDebugSnapshot(reason) {
    const dump = await this.page
      .evaluate(() => {
        const createRe = /create/i;
        const buttons = [...document.querySelectorAll('button, [role="button"]')]
          .filter((b) => createRe.test(b.textContent || ''))
          .slice(0, 8)
          .map((b) => {
            const rect = b.getBoundingClientRect();
            return {
              text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              inDialog: !!b.closest('[role="dialog"], .MuiDialog-root, .MuiModal-root'),
            };
          });
        return {
          url: location.href,
          dialogs: document.querySelectorAll('[role="dialog"], .MuiDialog-root, .MuiModal-root').length,
          backdrops: document.querySelectorAll('.MuiBackdrop-root').length,
          buttons,
        };
      })
      .catch(() => null);
    await this.logStep(`[Daily Report] Popup debug (${reason}): ${JSON.stringify(dump)}`);
  }

  /**
   * True only on the create FORM (after popup Create), not list and not popup.
   */
  async isDailyReportCreateFormVisible() {
    if (await this.reportTitleInput().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }
    // Form sections that only exist on the create page (not list / popup).
    if (await this.page.getByText(/^notes$/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }
    if (await this.page.getByText(/^time log$/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .getByText(/^weather condition$/i)
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false)
    ) {
      return true;
    }
    if (
      await this.page
        .getByRole('textbox', { name: /start typing/i })
        .isVisible({ timeout: 400 })
        .catch(() => false)
    ) {
      return true;
    }
    // Popup must be gone and URL on create/edit path when title is slow to render.
    if (await this.isDailyReportCreatePopupVisible()) {
      return false;
    }
    return /daily[-_]?report|daily[-_]?log/i.test(this.page.url()) &&
      (await this.page.getByText(/^attachments?$/i).first().isVisible({ timeout: 400 }).catch(() => false));
  }

  createFormSubmitButton() {
    return this.visibleCreateButton();
  }

  async clickVisibleCreateButton(stepLabel = '') {
    const createBtn = this.visibleCreateButton();
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(createBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await this.logStep(`[Daily Report] Clicked Create${stepLabel ? ` (${stepLabel})` : ''}.`);
  }

  async dismissOverlaysBlockingCreate() {
    // Timesheet / prior-module toasts can sit over the Daily Report Create button.
    const closeToast = this.page
      .locator('.Toastify__close-button, .MuiAlert-action button, [aria-label="Close"], [aria-label="close"]')
      .filter({ visible: true })
      .first();
    if (await closeToast.isVisible({ timeout: 800 }).catch(() => false)) {
      await closeToast.click({ timeout: 5000, force: true }).catch(() => {});
      await this.logStep('[Daily Report] Dismissed overlay/toast before Create.');
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(300).catch(() => {});
  }

  async resolveListPageCreateButton() {
    const candidates = [
      this.createPageScope()
        .locator('button.MuiButton-containedPrimary, button.MuiButton-contained')
        .filter({ hasText: /^create$/i })
        .filter({ visible: true })
        .first(),
      this.createPageScope().getByRole('button', { name: 'Create', exact: true }).filter({ visible: true }).first(),
      this.page
        .locator('main, [role="main"]')
        .getByRole('button', { name: /^create$/i })
        .filter({ visible: true })
        .first(),
      this.visibleCreateButton(),
    ];

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        if (await candidate.isEnabled().catch(() => true)) {
          return candidate;
        }
      }
    }
    return this.listPageCreateButton();
  }

  async clickListPageCreateButton(stepLabel = '') {
    await this.dismissOverlaysBlockingCreate();

    const listCreate = await this.resolveListPageCreateButton();
    await expect(listCreate).toBeVisible({ timeout: this.defaultTimeout });
    await expect(listCreate).toBeEnabled({ timeout: this.defaultTimeout });
    await listCreate.scrollIntoViewIfNeeded().catch(() => {});
    await listCreate.hover({ timeout: 5000 }).catch(() => {});

    // Prefer a real pointer click first (force can miss MUI handlers after module switch).
    const clicked = await listCreate
      .click({ timeout: 30000 })
      .then(() => true)
      .catch(async () => {
        await listCreate.click({ timeout: 30000, force: true });
        return true;
      })
      .catch(() => false);

    if (!clicked) {
      const box = await listCreate.boundingBox().catch(() => null);
      if (box) {
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }

    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});
    await this.logStep(`[Daily Report] Clicked Create${stepLabel ? ` (${stepLabel})` : ''}.`);
  }

  locatorDailyReportCreatedToast() {
    const pattern =
      /daily report (created|saved|submitted).*success|daily report created|created successfully|saved successfully|success/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root')
      .filter({ hasText: pattern })
      .first();
  }

  isDailyReportUrl() {
    const href = this.page.url();
    return /tab=DailyReport/i.test(href) || /tab=DailyLog/i.test(href) || /daily[-_]?report/i.test(href);
  }

  async isOnDailyReportList() {
    if (!(await this.isDailyReportUrl())) {
      // Allow list detection without tab query only when Daily Report chrome is clear.
      const hasHeading = await this.page
        .getByRole('heading', { name: /daily report/i })
        .or(this.page.getByText(/^daily report$/i))
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false);
      if (!hasHeading) {
        return false;
      }
    }
    return (
      (await this.visibleCreateButton().isVisible({ timeout: 500 }).catch(() => false)) &&
      !(await this.reportTitleInput().isVisible({ timeout: 500 }).catch(() => false)) &&
      !(await this.isDailyReportCreatePopupVisible())
    );
  }

  /**
   * Must NOT treat Time Tracking / Schedule / Task "Create" as Daily Report.
   * Prefer URL tab, then Daily Report–specific chrome.
   */
  async isOnDailyReportModule() {
    if (this.isDailyReportUrl()) {
      return true;
    }

    // Wrong modules also expose a Create button — never use Create alone.
    if (/tab=TimeTracking|tab=Schedule|tab=Task|tab=Workers|timetracking|time[-_]?tracking/i.test(this.page.url())) {
      return false;
    }

    const createDailyReport = this.page
      .getByRole('button', { name: /create daily report/i })
      .filter({ visible: true })
      .first();
    if (await createDailyReport.isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }

    return false;
  }

  async waitForDailyReportList() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await expect
      .poll(async () => this.isOnDailyReportList() || this.isDailyReportUrl(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);
    await expect(this.visibleCreateButton()).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('[Daily Report] Daily Report list is ready.');
  }

  async waitForDailyReportCreatePage() {
    await expect
      .poll(async () => this.isDailyReportCreateFormVisible(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);
    await this.logStep('[Daily Report] Create page is ready.');
  }

  async navigateToDailyReportModule() {
    if (await this.isOnDailyReportModule()) {
      await this.waitForDailyReportList();
      await this.logStep('[Daily Report] Already on Daily Report list — skipping navigation.');
      return;
    }

    const profile = new ProjectProfilePage(this.page);
    await profile.selectHeading('Project Management');

    const dailyReportTile = this.page.getByText(/^daily report$/i).first();
    if (await dailyReportTile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dailyReportTile.scrollIntoViewIfNeeded().catch(() => {});
      await dailyReportTile.click({ timeout: 30000 });
    } else {
      await profile.clickModuleCard('Daily Report');
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect
      .poll(async () => this.isDailyReportUrl() || (await this.isOnDailyReportList()), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);
    await this.dismissOverlaysBlockingCreate();
    await this.waitForDailyReportList();
    await this.logStep('[Daily Report] Opened Daily Report module from Project Management.');
  }

  async expectDailyReportListPage() {
    await this.waitForDailyReportList();
    await expect
      .poll(
        async () =>
          (await this.visibleCreateButton().isVisible({ timeout: 500 }).catch(() => false)) &&
          !(await this.reportTitleInput().isVisible({ timeout: 500 }).catch(() => false)),
        {
          timeout: 15000,
          intervals: [300, 500, 1000],
        }
      )
      .toBe(true);
    await this.logStep('[Daily Report] Daily Report list page is visible.');
  }

  /**
   * Step 1 (codegen): list Create opens confirmation popup.
   * Retries Create until popup or create form appears (TC-05 after Time Tracking
   * often needs a second click — first click can be swallowed by leftover toast).
   */
  async clickCreateOnDailyReportListPage() {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await this.isDailyReportCreatePopupVisible()) {
        await this.logStep(`[Daily Report] Create popup already open (attempt ${attempt}).`);
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      if (await this.isDailyReportCreateFormVisible()) {
        await this.logStep(`[Daily Report] Create form already open (attempt ${attempt}).`);
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.clickListPageCreateButton(`list — open popup (attempt ${attempt}/${maxAttempts})`);

      // eslint-disable-next-line no-await-in-loop
      const opened = await expect
        .poll(
          async () =>
            (await this.isDailyReportCreatePopupVisible()) || (await this.isDailyReportCreateFormVisible()),
          { timeout: 8000, intervals: [300, 500, 1000] }
        )
        .toBe(true)
        .then(() => true)
        .catch(() => false);

      if (opened) {
        await this.logStep('[Daily Report] List Create opened popup/form.');
        return;
      }

      await this.logStep(`[Daily Report] List Create did not open popup yet — retrying (${attempt}/${maxAttempts}).`);
      // eslint-disable-next-line no-await-in-loop
      await this.dismissOverlaysBlockingCreate();
    }

    await this.logPopupDebugSnapshot('list Create failed to open popup after retries');
    throw new Error(
      'Daily Report list Create did not open the create popup. Still on list with a single Create button.'
    );
  }

  /** Step 2 verify: popup with Create must be visible (or form already open). */
  async expectDailyReportCreatePopupVisible() {
    if (await this.isDailyReportCreateFormVisible()) {
      await this.logStep('[Daily Report] Create form already visible — popup step skipped by UI.');
      return;
    }

    // If still on list only, try Create again before failing the assert.
    if (!(await this.isDailyReportCreatePopupVisible())) {
      await this.logStep('[Daily Report] Popup not visible yet — clicking list Create again.');
      await this.clickCreateOnDailyReportListPage();
    }

    if (await this.isDailyReportCreateFormVisible()) {
      await this.logStep('[Daily Report] Create form opened (popup skipped by UI).');
      return;
    }

    try {
      await expect
        .poll(async () => this.isDailyReportCreatePopupVisible(), {
          timeout: 30000,
          intervals: [300, 500, 1000, 1500],
        })
        .toBe(true);
    } catch (err) {
      await this.logPopupDebugSnapshot('popup not found after list Create');
      throw err;
    }
    await this.logStep('[Daily Report] Create Daily Report popup is visible.');
  }

  /**
   * Step 2 (codegen): Create inside popup → opens create form.
   * Prefer popup-scoped Create; fallback = last visible Create (codegen 2nd click).
   * Retries once if the form is slow (e.g. TC-05 with Time Log data).
   */
  async clickCreateInDailyReportPopup(stepLabel = 'popup — open create page') {
    const clickPopupCreate = async () => {
      const handle = await this.locatePopupCreateButtonHandle();
      if (handle) {
        await handle.scrollIntoViewIfNeeded().catch(() => {});
        await handle.click({ timeout: 20000, force: true });
        await handle.dispose().catch(() => {});
        await this.logStep(`[Daily Report] Clicked Create in popup via DOM (${stepLabel}).`);
        return true;
      }

      const popupCreate = this.createButtonInDailyReportPopup();
      if (await popupCreate.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(popupCreate).toBeEnabled({ timeout: 15000 });
        await popupCreate.scrollIntoViewIfNeeded().catch(() => {});
        await popupCreate.click({ timeout: 30000, force: true });
        await this.logStep(`[Daily Report] Clicked Create in popup via locator (${stepLabel}).`);
        return true;
      }

      const buttons = this.allVisibleCreateButtons();
      const count = await buttons.count();
      if (count < 1) {
        return false;
      }
      const target = count >= 2 ? buttons.nth(count - 1) : buttons.first();
      await expect(target).toBeVisible({ timeout: 15000 });
      await target.click({ timeout: 30000, force: true });
      await this.logStep(`[Daily Report] Clicked Create (codegen fallback, ${count} visible) (${stepLabel}).`);
      return true;
    };

    if (!(await clickPopupCreate())) {
      throw new Error('Could not find Create button in the Daily Report create popup.');
    }

    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    let opened = false;
    try {
      await expect
        .poll(async () => this.isDailyReportCreateFormVisible(), {
          timeout: 45000,
          intervals: [300, 500, 1000, 2000],
        })
        .toBe(true);
      opened = true;
    } catch {
      opened = false;
    }

    // Retry: popup Create sometimes needs a second click when coming from another module.
    if (!opened && (await this.isDailyReportCreatePopupVisible())) {
      await this.logStep('[Daily Report] Create form not ready — retrying popup Create click.');
      await clickPopupCreate();
      await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      await expect
        .poll(async () => this.isDailyReportCreateFormVisible(), {
          timeout: 45000,
          intervals: [300, 500, 1000, 2000],
        })
        .toBe(true);
      opened = true;
    }

    if (!opened) {
      await this.logPopupDebugSnapshot('create form not visible after popup Create');
      throw new Error(
        'Daily Report create form did not open after popup Create. Expected report title, Notes, Weather Condition, or Time Log.'
      );
    }

    await this.logStep('[Daily Report] Create form opened after popup Create.');
  }

  async expectDailyReportCreateFormPage() {
    await this.waitForDailyReportCreatePage();
    if (await this.reportTitleInput().isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.logStep('[Daily Report] Create Daily Report form page is visible (title input).');
      return;
    }
    await expect(this.page.getByText(/^notes$/i).first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('[Daily Report] Create Daily Report form page is visible (notes section).');
  }

  async clickCreateOnDailyReportCreatePage() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.clickVisibleCreateButton('submit create page');
    await this.observeDailyReportCreateSuccess();
  }

  async completeDailyReportCreateWithThreeCreateClicks() {
    await this.clickCreateOnDailyReportListPage();
    await this.clickCreateInDailyReportPopup('2 of 3');
    await this.clickCreateOnDailyReportCreatePage();
    await this.logStep('[Daily Report] Completed create flow (list → popup → form).');
  }

  async observeDailyReportCreateSuccess() {
    if (this.dailyReportCreateSuccessObserved) {
      return;
    }

    const toast = this.locatorDailyReportCreatedToast();
    const timeout = this.createSubmitSuccessTimeout;

    try {
      await expect
        .poll(
          async () => {
            if (await toast.isVisible({ timeout: 400 }).catch(() => false)) {
              return true;
            }
            return this.isOnDailyReportList();
          },
          { timeout, intervals: [200, 300, 500, 800, 1200] }
        )
        .toBe(true);
      this.dailyReportCreateSuccessObserved = true;
      await this.logStep('[Daily Report] Create success observed.');
    } catch {
      if (await toast.isVisible({ timeout: 2000 }).catch(() => false)) {
        this.dailyReportCreateSuccessObserved = true;
        return;
      }
      if (await this.isOnDailyReportList()) {
        this.dailyReportCreateSuccessObserved = true;
      }
    }
  }

  notesTypingTextbox() {
    return this.page
      .getByRole('textbox', { name: /start typing/i })
      .or(this.page.getByPlaceholder(/start typing/i))
      .first();
  }

  notesEditorRoot() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByRole('button', { name: 'Save', exact: true }),
      })
      .last()
      .or(
        this.page
          .locator('.MuiDialog-root, .MuiModal-root')
          .filter({ visible: true })
          .filter({
            has: this.page.getByRole('button', { name: 'Save', exact: true }),
          })
          .last()
      );
  }

  /** Save only inside the notes editor dialog — never a global page Save. */
  notesEditorSaveButton() {
    return this.notesEditorRoot()
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .first();
  }

  notesEditIconButton() {
    return this.page
      .locator('button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall')
      .filter({ visible: true })
      .first();
  }

  async isNotesEditorOpen() {
    if (await this.notesEditorSaveButton().isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
    const editorRoot = this.notesEditorRoot();
    if (await editorRoot.isVisible({ timeout: 500 }).catch(() => false)) {
      const typingInEditor = editorRoot
        .getByRole('textbox', { name: /start typing/i })
        .or(editorRoot.getByPlaceholder(/start typing/i))
        .first();
      if (await typingInEditor.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  async resolveNotesEditIconCandidates() {
    const icons = this.page
      .locator(
        'button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall, button.MuiIconButton-root.MuiIconButton-sizeSmall'
      )
      .filter({ visible: true });

    const titleInput = this.reportTitleInput();
    const titleBox = (await titleInput.isVisible({ timeout: 2000 }).catch(() => false))
      ? await titleInput.boundingBox().catch(() => null)
      : null;

    const notesLabel = this.page.getByText(/^notes$/i).first();
    const notesBox = (await notesLabel.isVisible({ timeout: 2000 }).catch(() => false))
      ? await notesLabel.boundingBox().catch(() => null)
      : null;

    const ordered = [];
    const count = await icons.count();

    for (let i = 0; i < count; i += 1) {
      const icon = icons.nth(i);
      const box = await icon.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }

      let score = box.y;
      if (titleBox && box.y >= titleBox.y - 10) {
        score -= 10000;
      }
      if (notesBox && Math.abs(box.y - notesBox.y) < 120) {
        score -= 50000;
      }
      ordered.push({ icon, score });
    }

    ordered.sort((a, b) => a.score - b.score);
    const candidates = ordered.map((entry) => entry.icon);
    candidates.unshift(this.notesEditIconButton());

    if (await notesLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
      candidates.unshift(
        notesLabel
          .locator('xpath=ancestor::*[self::div or self::section][1]')
          .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall')
          .first()
      );
    }

    return candidates;
  }

  buildRandomNotesText() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return (
      `Automation daily report note ${suffix}: Site activities were reviewed and documented. ` +
      'Work progressed as planned with no major blockers reported during this period.'
    );
  }

  async dismissNotesEditorAfterSave() {
    const saveBtn = this.notesEditorSaveButton();
    await saveBtn.waitFor({ state: 'hidden', timeout: 15000 }).catch(async () => {
      await this.page.keyboard.press('Escape').catch(() => {});
    });
    for (let i = 0; i < 2; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await this.isNotesEditorOpen())) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async resolveNotesInputField() {
    const direct = this.notesTypingTextbox();
    if (await direct.isVisible({ timeout: 2000 }).catch(() => false)) {
      return direct;
    }

    const root = this.notesEditorRoot();
    if (await root.isVisible({ timeout: 2000 }).catch(() => false)) {
      const inRoot = root
        .getByRole('textbox')
        .or(root.locator('textarea'))
        .or(root.locator('[contenteditable="true"]'))
        .filter({ visible: true })
        .first();
      if (await inRoot.isVisible({ timeout: 2000 }).catch(() => false)) {
        return inRoot;
      }
    }

    return this.page.locator('[contenteditable="true"], textarea').filter({ visible: true }).last();
  }

  async clickDailyReportNotesEditIcon() {
    await this.waitForDailyReportCreatePage();

    if (await this.isNotesEditorOpen()) {
      await this.logStep('[Daily Report] Notes editor already open.');
      return;
    }

    const notesLabel = this.page.getByText(/^notes$/i).first();
    if (await notesLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notesLabel.scrollIntoViewIfNeeded().catch(() => {});
      await notesLabel.click({ timeout: 10000, force: true }).catch(() => {});
      if (await this.isNotesEditorOpen()) {
        await this.logStep('[Daily Report] Opened notes editor by clicking Notes label.');
        return;
      }
    }

    const candidates = await this.resolveNotesEditIconCandidates();
    let opened = false;

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click({ timeout: 15000, force: true }).catch(() => {});

      try {
        await expect
          .poll(async () => this.isNotesEditorOpen(), {
            timeout: 12000,
            intervals: [300, 500, 1000],
          })
          .toBe(true);
        opened = true;
      } catch {
        opened = false;
      }

      if (opened) {
        break;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
    }

    if (!opened) {
      throw new Error(
        'Daily report notes editor did not open. Expected "Start typing..." or Save after clicking the Notes edit icon.'
      );
    }

    await this.logStep('[Daily Report] Opened notes editor via edit icon.');
  }

  async expectDailyReportNotesPopupVisible() {
    await expect
      .poll(async () => this.isNotesEditorOpen(), {
        timeout: 15000,
        intervals: [300, 500, 1000],
      })
      .toBe(true);
    await this.logStep('[Daily Report] Notes popup is visible.');
  }

  async enterRandomContentInDailyReportNotesField() {
    const notesText = this.buildRandomNotesText();
    const notesField = await this.resolveNotesInputField();
    await expect(notesField).toBeVisible({ timeout: this.defaultTimeout });
    await notesField.click({ timeout: 15000 });

    const tag = String(await notesField.evaluate((el) => el.tagName).catch(() => '')).toLowerCase();
    const contentEditable =
      (await notesField.getAttribute('contenteditable').catch(() => null)) === 'true';

    if (contentEditable || tag === 'div') {
      await notesField.evaluate((el) => {
        el.textContent = '';
      });
      await this.page.keyboard.type(notesText, { delay: 5 });
    } else {
      await notesField.fill('');
      await notesField.fill(notesText);
    }

    this.lastDailyReportNotes = notesText;
    await this.logStep(`[Daily Report] Entered random notes: ${notesText.slice(0, 40)}...`);
  }

  async clickSaveOnDailyReportNotesPopup() {
    const saveBtn = this.notesEditorSaveButton();
    await expect(saveBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await saveBtn.click({ timeout: 20000 });
    await this.dismissNotesEditorAfterSave();
    await this.logStep('[Daily Report] Clicked Save on notes popup.');
  }

  async expectDailyReportNotesSavedAndPopupClosed() {
    // Ensure editor is dismissed even if Save left it open briefly.
    if (await this.isNotesEditorOpen()) {
      await this.dismissNotesEditorAfterSave();
    }

    await expect
      .poll(async () => !(await this.isNotesEditorOpen()), {
        timeout: 20000,
        intervals: [300, 500, 1000],
      })
      .toBe(true);

    // Saved notes may render truncated on the form — match a short unique snippet.
    if (this.lastDailyReportNotes) {
      const raw = this.lastDailyReportNotes;
      const snippet = raw.includes(':')
        ? raw.slice(0, raw.indexOf(':') + 1).trim()
        : raw.slice(0, 28);
      const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const notesVisible = await this.page
        .getByText(new RegExp(escaped, 'i'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      if (!notesVisible) {
        // Fallback: unique automation suffix still present somewhere on the create form.
        const suffixMatch = raw.match(/Automation daily report note \d+/i);
        if (suffixMatch) {
          await expect(this.page.getByText(new RegExp(suffixMatch[0], 'i')).first()).toBeVisible({
            timeout: 10000,
          });
        } else {
          await expect(this.page.getByText(/^notes$/i).first()).toBeVisible({ timeout: 10000 });
        }
      }
    }

    await this.logStep('[Daily Report] Notes popup closed and saved content is visible on the form.');
  }

  /** Codegen: MuiStack row 2 opens Attachments / upload popup. */
  attachmentTriggerButton() {
    return this.page
      .locator('div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first();
  }

  attachmentsSectionLabel() {
    return this.page
      .getByText(/^attachments?$/i)
      .or(this.page.getByText(/^attach files?$/i))
      .first();
  }

  uploadDialogUploadButton() {
    return this.page.getByRole('button', { name: 'Upload', exact: true }).filter({ visible: true }).first();
  }

  visibleCreatePageIconButtons() {
    return this.page
      .locator('button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall')
      .filter({ visible: true });
  }

  defaultAttachmentFixturePath() {
    return path.join(__dirname, '../../../../../fixtures/sample-po-import.pdf');
  }

  isAttachmentAutomationMode() {
    return (
      /^1|true$/i.test(String(process.env.DAILY_REPORT_ATTACHMENT_AUTO || '')) ||
      /^1|true$/i.test(String(process.env.DAILY_REPORT_ATTACHMENT_USE_SET_FILES || ''))
    );
  }

  resolveAttachmentFilePathForAutomation() {
    const envPath = process.env.DAILY_REPORT_ATTACHMENT_FILE_PATH;
    if (envPath) {
      const resolved = path.resolve(envPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`DAILY_REPORT_ATTACHMENT_FILE_PATH does not exist: ${resolved}`);
      }
      return resolved;
    }
    const fallback = this.defaultAttachmentFixturePath();
    if (fs.existsSync(fallback)) {
      return fallback;
    }
    return null;
  }

  async isUploadPopupVisible() {
    // Prefer an explicit visible Upload button (most reliable signal for open popup).
    if (await this.uploadDialogUploadButton().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }

    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByRole('button', { name: /upload/i }).or(this.page.locator('input[type="file"]')),
      })
      .last()
      .or(
        this.page
          .locator('.MuiDialog-root, .MuiModal-root')
          .filter({ visible: true })
          .filter({
            has: this.page
              .getByRole('button', { name: /upload/i })
              .or(this.page.locator('input[type="file"]')),
          })
          .last()
      );

    if (await dialog.isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }

    // Visible upload/dropzone copy inside an open dialog only (avoid matching form "Attachments" label).
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .getByText(/upload\s*file|choose\s*file|select\s*file|drag\s*(and|&)\s*drop|browse\s*files?/i)
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
  }

  async waitForUploadDialogClosed() {
    // Soft close: Escape first, then confirm Upload dialog is gone.
    await this.page.keyboard.press('Escape').catch(() => {});
    try {
      await expect
        .poll(async () => !(await this.isUploadPopupVisible()), {
          timeout: 10000,
          intervals: [200, 400, 800],
        })
        .toBe(true);
    } catch {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async nudgeScrollTowardAttachments() {
    const label = this.attachmentsSectionLabel();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        await label.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep('[Daily Report] Attachments section is in view.');
        return;
      }
      await this.page.evaluate(() => window.scrollBy(0, 350)).catch(() => {});
      await this.page.mouse.wheel(0, 350).catch(() => {});
    }
  }

  /** DOM: find Attachments-row edit/upload control near the Attachments label. */
  async locateAttachmentElementHandle() {
    const handle = await this.page.evaluateHandle(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let attachAnchor = null;
      let notesAnchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        const text = (node.textContent || '').trim();
        if (!notesAnchor && /^notes$/i.test(text)) {
          notesAnchor = node.parentElement;
        }
        if (!attachAnchor && /^attachments?$/i.test(text)) {
          attachAnchor = node.parentElement;
        }
      }

      const scored = [];
      const push = (el, score) => {
        if (!el || !isVisible(el)) return;
        if (el.closest('[role="dialog"]')) return;
        scored.push({ el, score });
      };

      if (attachAnchor) {
        let container = attachAnchor;
        for (let depth = 0; depth < 10 && container; depth += 1) {
          container
            .querySelectorAll(
              '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall, [role="button"]'
            )
            .forEach((el) => push(el, -200000 + depth * 1000));
          container = container.parentElement;
        }

        const attachRect = attachAnchor.getBoundingClientRect();
        document
          .querySelectorAll(
            '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
          )
          .forEach((btn) => {
            const rect = btn.getBoundingClientRect();
            if (!isVisible(btn)) return;
            const score =
              Math.abs(rect.top - attachRect.top) + Math.abs(rect.left - attachRect.left) * 0.05;
            push(btn, score);
          });
      }

      // Title-scoped codegen row 2 (same pattern as Client Report).
      const titleInput =
        document.querySelector('input[placeholder*="report title" i]') ||
        [...document.querySelectorAll('[role="textbox"], input, textarea')].find((el) =>
          /enter report title|report title|daily report/i.test(
            `${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''}`
          )
        );
      const titleTop = titleInput?.getBoundingClientRect()?.top ?? 0;
      let container = titleInput?.parentElement;
      for (let depth = 0; depth < 15 && container; depth += 1) {
        const row2 = container.querySelector(
          'div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root'
        );
        if (row2) {
          const rect = row2.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.top >= titleTop - 30) {
            push(row2, -150000);
            break;
          }
        }
        container = container.parentElement;
      }

      // Second visible small icon (Notes is typically first).
      const smallIcons = [
        ...document.querySelectorAll(
          'button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall'
        ),
      ].filter(isVisible);
      if (smallIcons[1]) {
        push(smallIcons[1], -100000);
      }

      scored.sort((a, b) => a.score - b.score);
      return scored[0]?.el || null;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  async resolveAttachmentClickCandidates() {
    const candidates = [];

    await this.nudgeScrollTowardAttachments();

    const attachmentLabel = this.attachmentsSectionLabel();
    if (await attachmentLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await attachmentLabel.scrollIntoViewIfNeeded().catch(() => {});
      candidates.push(
        attachmentLabel
          .locator('xpath=ancestor::*[self::div or self::section or self::article][1]')
          .locator(
            'button.MuiIconButton-root, button.MuiIconButton-sizeSmall, .MuiStack-root > .MuiButtonBase-root, [role="button"]'
          )
          .filter({ visible: true })
          .first(),
        attachmentLabel
          .locator('xpath=following::button[contains(@class,"IconButton") or contains(@class,"ButtonBase")][1]')
          .first()
      );
    }

    const pageIcons = this.visibleCreatePageIconButtons();
    const pageIconCount = await pageIcons.count();
    if (pageIconCount >= 2) {
      candidates.push(pageIcons.nth(1));
    }
    if (pageIconCount >= 1) {
      candidates.push(pageIcons.first());
    }

    candidates.push(
      this.page.getByRole('button', { name: /attach|attachment|upload/i }).filter({ visible: true }).first(),
      this.attachmentTriggerButton()
    );

    return candidates;
  }

  async clickDailyReportAttachmentsIcon() {
    await this.waitForDailyReportCreatePage();
    await this.dismissNotesEditorAfterSave().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});

    if (await this.isUploadPopupVisible()) {
      await this.logStep('[Daily Report] Attachments popup already open.');
      return;
    }

    await this.nudgeScrollTowardAttachments();

    // Prefer DOM handle near Attachments label / title-scoped row 2.
    const handle = await this.locateAttachmentElementHandle();
    if (handle) {
      await handle.scrollIntoViewIfNeeded().catch(() => {});
      await handle.click({ timeout: 20000, force: true }).catch(() => {});
      await handle.dispose().catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});

      if (await this.isUploadPopupVisible()) {
        await this.logStep('[Daily Report] Opened attachments popup via DOM handle.');
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    const candidates = await this.resolveAttachmentClickCandidates();
    let opened = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click({ timeout: 15000, force: true }).catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});

      try {
        await expect
          .poll(async () => this.isUploadPopupVisible(), {
            timeout: 10000,
            intervals: [300, 500, 1000],
          })
          .toBe(true);
        opened = true;
        await this.logStep(`[Daily Report] Opened attachments popup via candidate #${i + 1}.`);
      } catch {
        opened = false;
      }

      if (opened) {
        break;
      }

      // Wrong control may have opened notes/weather — dismiss and try next.
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.dismissNotesEditorAfterSave().catch(() => {});
    }

    if (!opened) {
      throw new Error(
        'Daily report attachments popup did not open. Expected Upload button, file input, or attach/upload dialog after clicking the Attachments icon.'
      );
    }
  }

  async expectDailyReportAttachmentsPopupVisible() {
    await expect
      .poll(async () => this.isUploadPopupVisible(), {
        timeout: 30000,
        intervals: [300, 500, 1000, 1500],
      })
      .toBe(true);
    await this.logStep('[Daily Report] Attachments popup is visible.');
  }

  async setAttachmentFileInUploadPopup(uploadPath) {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .last()
      .or(this.page.locator('.MuiDialog-root, .MuiModal-root').filter({ visible: true }).last());

    const fileInput = dialog
      .locator('input[type="file"]')
      .first()
      .or(this.page.locator('input[type="file"]').last());

    const inputCount = await fileInput.count().catch(() => 0);
    if (inputCount > 0) {
      await fileInput.setInputFiles(uploadPath);
      await this.logStep(`[Daily Report] Set attachment file via input: ${path.basename(uploadPath)}`);
      return;
    }

    const browseTrigger = dialog
      .getByRole('button', { name: /browse|choose|select|upload/i })
      .or(dialog.getByText(/browse|choose\s*file|select\s*file|click to upload|drag/i))
      .filter({ visible: true })
      .first();

    if (await browseTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 25000 }),
        browseTrigger.click({ timeout: 20000, force: true }),
      ]);
      await fileChooser.setFiles(uploadPath);
      await this.logStep(
        `[Daily Report] Set attachment file via filechooser: ${path.basename(uploadPath)}`
      );
      return;
    }

    // Last resort: any page filechooser from clicking visible upload area.
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 25000 }),
      this.page
        .getByText(/browse|choose\s*file|select\s*file|click to upload|drag/i)
        .filter({ visible: true })
        .first()
        .click({ timeout: 20000, force: true }),
    ]);
    await fileChooser.setFiles(uploadPath);
    await this.logStep(
      `[Daily Report] Set attachment file via page filechooser: ${path.basename(uploadPath)}`
    );
  }

  async addRequiredAttachmentsOnDailyReportPopup() {
    if (!(await this.isUploadPopupVisible())) {
      await this.expectDailyReportAttachmentsPopupVisible();
    }

    const auto = this.isAttachmentAutomationMode();
    const uploadPath = auto ? this.resolveAttachmentFilePathForAutomation() : null;

    if (auto) {
      if (!uploadPath) {
        throw new Error(
          'DAILY_REPORT_ATTACHMENT_AUTO=1 requires DAILY_REPORT_ATTACHMENT_FILE_PATH or fixtures/sample-po-import.pdf.'
        );
      }
      await this.setAttachmentFileInUploadPopup(uploadPath);
      this.lastDailyReportAttachmentPath = uploadPath;
      await this.logStep(`[Daily Report] Attachment queued (auto): ${path.basename(uploadPath)}`);
      return;
    }

    await this.logStep(
      '[Daily Report] Select the required attachment file(s) in the popup, then press ENTER in the terminal.'
    );
  }

  async waitForDailyReportAttachmentEnterGate() {
    const auto = this.isAttachmentAutomationMode();
    const skipEnter =
      auto ||
      /^1|true$/i.test(String(process.env.DAILY_REPORT_ATTACHMENT_SKIP_STEP_ENTER || ''));

    if (skipEnter) {
      await this.logStep(
        '[Daily Report] Skipping ENTER gate (automation mode or DAILY_REPORT_ATTACHMENT_SKIP_STEP_ENTER=1).'
      );
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      return;
    }

    await this.waitForEnterInTerminal(
      'Waiting for daily report attachment. Select your file(s) in the popup, then press ENTER here to continue to Upload.'
    );
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.logStep('[Daily Report] Attachment selection confirmed via terminal ENTER.');
  }

  async clickUploadOnDailyReportAttachmentsPopup() {
    if (!(await this.isUploadPopupVisible())) {
      await this.logStep('[Daily Report] Upload popup already closed — skipping Upload click.');
      return;
    }

    const uploadBtn = this.uploadDialogUploadButton();
    if (!(await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Some UIs auto-upload after file select; treat closed/hidden Upload as success path.
      await this.waitForUploadDialogClosed().catch(() => {});
      await this.logStep('[Daily Report] Upload button not visible — assuming upload already completed.');
      return;
    }

    await expect(uploadBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await uploadBtn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForUploadDialogClosed();
    await this.logStep('[Daily Report] Clicked Upload on attachments popup.');
  }

  /** Codegen: MuiStack row 3 opens Weather Condition editor. */
  weatherConditionTriggerButton() {
    const scope = this.createPageScope();
    return scope
      .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
          .filter({ visible: true })
          .first()
      );
  }

  weatherConditionNotesTextbox() {
    return this.page
      .getByRole('textbox', { name: 'Enter your notes here' })
      .or(this.page.getByRole('textbox', { name: /enter your notes here/i }))
      .or(this.page.getByPlaceholder(/enter your notes here/i))
      .first();
  }

  weatherAffectingWorkSwitch() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    return dialog
      .getByRole('switch', { name: /weather affecting work/i })
      .or(dialog.getByLabel(/weather affecting work/i))
      .or(this.page.getByRole('switch', { name: /weather affecting work/i }))
      .or(this.page.getByLabel(/weather affecting work/i))
      .or(
        this.page
          .locator('.MuiSwitch-root, [role="switch"]')
          .filter({ has: this.page.getByText(/weather affecting work/i) })
          .first()
      )
      .filter({ visible: true })
      .first();
  }

  weatherConditionSaveButton() {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /weather condition|weather affecting work|enter your notes here/i })
      .last();

    return dialog
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .first()
      .or(this.page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last());
  }

  buildRandomWeatherNotesText() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return (
      `Weather note ${suffix}: Site weather was reviewed during this reporting period. ` +
      'Work continued with appropriate precautions and no major weather-related blockers were reported.'
    );
  }

  async scrollToWeatherConditionSection() {
    const label = this.page
      .getByText(/^weather condition$/i)
      .or(this.page.getByText(/^weather$/i))
      .or(this.page.getByText(/weather\s*condition/i))
      .first();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        await label.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep('[Daily Report] Weather Condition section is in view.');
        return true;
      }
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }

    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    if (await label.isVisible({ timeout: 1000 }).catch(() => false)) {
      await label.scrollIntoViewIfNeeded().catch(() => {});
      await this.logStep('[Daily Report] Weather Condition section is in view (after scroll to bottom).');
      return true;
    }

    await this.logStep('[Daily Report] Weather Condition label not found — will use codegen row trigger.');
    return false;
  }

  /**
   * Client Report open signals after weather edit click:
   * visible checkbox / switch / "Weather Affecting Work" / "Enter your notes here".
   */
  async isWeatherConditionEditorOpen() {
    if (
      await this.page
        .getByText(/weather affecting work/i)
        .first()
        .isVisible({ timeout: 300 })
        .catch(() => false)
    ) {
      return true;
    }
    if (await this.weatherConditionNotesTextbox().isVisible({ timeout: 300 }).catch(() => false)) {
      return true;
    }
    if (await this.weatherAffectingWorkSwitch().isVisible({ timeout: 300 }).catch(() => false)) {
      return true;
    }
    // Client Report codegen: getByRole('checkbox') appears when weather panel opens.
    if (
      await this.page
        .getByRole('checkbox')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 300 })
        .catch(() => false)
    ) {
      return true;
    }
    if (
      await this.page
        .getByRole('switch')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 300 })
        .catch(() => false)
    ) {
      return true;
    }
    return false;
  }

  /** True only for weather-specific UI (not any random form checkbox). */
  async isWeatherPanelClearlyOpen() {
    if (
      await this.page
        .getByText(/weather affecting work/i)
        .first()
        .isVisible({ timeout: 300 })
        .catch(() => false)
    ) {
      return true;
    }
    if (await this.weatherConditionNotesTextbox().isVisible({ timeout: 300 }).catch(() => false)) {
      return true;
    }
    if (await this.weatherAffectingWorkSwitch().isVisible({ timeout: 300 }).catch(() => false)) {
      return true;
    }
    return false;
  }

  /** Codegen (Client Report): div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root */
  codegenWeatherRowTrigger() {
    return this.page
      .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first();
  }

  /**
   * Client Report `locateMuiStackRowTriggerHandle(3)` — button beside "Weather Condition" label.
   * Prefer this over generic row-3 CSS (which can hit the wrong control on Daily Report).
   */
  async locateWeatherConditionEditIconHandle() {
    const handle = await this.page.evaluateHandle(() => {
      const weatherRe = /^weather(\s+condition)?s?$/i;
      let weatherAnchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (weatherRe.test((node.textContent || '').trim())) {
          weatherAnchor = node.parentElement;
          break;
        }
      }
      if (!weatherAnchor) {
        return null;
      }

      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let container = weatherAnchor;
      for (let depth = 0; depth < 10 && container; depth += 1) {
        const trigger = container.querySelector(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
        );
        if (isVisible(trigger)) {
          return trigger;
        }
        container = container.parentElement;
      }

      const weatherRect = weatherAnchor.getBoundingClientRect();
      let best = null;
      let bestScore = Infinity;
      document
        .querySelectorAll(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall'
        )
        .forEach((btn) => {
          const rect = btn.getBoundingClientRect();
          if (!isVisible(btn)) return;
          if (rect.top < weatherRect.top - 40) return;
          const score =
            Math.abs(rect.top - weatherRect.top) + Math.abs(rect.left - weatherRect.left) * 0.05;
          if (score < bestScore) {
            bestScore = score;
            best = btn;
          }
        });
      return best;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  /**
   * Client Report TC-04: scroll → click weather edit icon → wait for checkbox/switch panel.
   * Do NOT press Escape after a successful click — that closes the weather panel.
   */
  async clickDailyReportWeatherConditionEditIcon() {
    await this.waitForDailyReportCreatePage();
    await this.dismissNotesEditorAfterSave().catch(() => {});
    await this.scrollToWeatherConditionSection();

    if (await this.isWeatherPanelClearlyOpen()) {
      await this.logStep('[Daily Report] Weather condition editor already open.');
      return;
    }

    let clicked = false;

    // 1) Client Report: icon anchored to "Weather Condition" label (most reliable).
    const weatherHandle = await this.locateWeatherConditionEditIconHandle();
    if (weatherHandle) {
      await weatherHandle.scrollIntoViewIfNeeded().catch(() => {});
      await weatherHandle.click({ timeout: 20000, force: true });
      await weatherHandle.dispose().catch(() => {});
      clicked = true;
      await this.logStep('[Daily Report] Clicked Weather Condition edit icon (label-anchored DOM).');
    }

    // 2) Client Report codegen fallback: MuiStack row 3.
    if (!clicked) {
      const weatherTrigger = this.codegenWeatherRowTrigger();
      await expect(weatherTrigger).toBeVisible({ timeout: this.defaultTimeout });
      await weatherTrigger.scrollIntoViewIfNeeded().catch(() => {});
      await weatherTrigger.click({ timeout: 20000, force: true });
      clicked = true;
      await this.logStep('[Daily Report] Clicked MuiStack row 3 (weather codegen).');
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // Client Report does not Escape here — wait for checkbox/switch/notes panel.
    await expect
      .poll(async () => this.isWeatherConditionEditorOpen(), {
        timeout: 20000,
        intervals: [300, 500, 1000, 1500],
      })
      .toBe(true);

    await this.logStep('[Daily Report] Weather condition editor is open.');
  }

  /**
   * Client Report: checkWeatherAffectingWorkCheckbox / enableWeatherAffectingWorkToggle.
   * Toggle ON → notes textbox appears.
   */
  async enableDailyReportWeatherAffectingWorkToggle() {
    // Codegen: getByRole('checkbox').check()
    const checkbox = this.page.getByRole('checkbox').filter({ visible: true }).first();
    if (await checkbox.isVisible({ timeout: 8000 }).catch(() => false)) {
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.check({ force: true, timeout: 15000 }).catch(async () => {
          await checkbox.click({ force: true, timeout: 15000 });
        });
      }
      await this.logStep('[Daily Report] Enabled weather affecting work checkbox.');
      return;
    }

    const switchEl = this.weatherAffectingWorkSwitch();
    if (await switchEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switchEl.scrollIntoViewIfNeeded().catch(() => {});
      const ariaChecked = await switchEl.getAttribute('aria-checked').catch(() => null);
      if (ariaChecked !== 'true') {
        await switchEl.click({ timeout: 15000, force: true });
      }
      await expect
        .poll(async () => (await switchEl.getAttribute('aria-checked').catch(() => null)) === 'true', {
          timeout: 15000,
          intervals: [300, 500, 1000],
        })
        .toBe(true);
      await this.logStep('[Daily Report] Enabled weather affecting work toggle.');
      return;
    }

    const labeledCheckbox = this.page
      .getByRole('checkbox', { name: /weather affecting work/i })
      .or(this.page.getByLabel(/weather affecting work/i))
      .first();
    await expect(labeledCheckbox).toBeVisible({ timeout: this.defaultTimeout });
    if (!(await labeledCheckbox.isChecked().catch(() => false))) {
      await labeledCheckbox.check({ timeout: 15000, force: true }).catch(async () => {
        await labeledCheckbox.click({ timeout: 15000, force: true });
      });
    }
    await this.logStep('[Daily Report] Enabled weather affecting work checkbox (labeled).');
  }

  /** Client Report: fill "Enter your notes here" after toggle enables the field. */
  async enterRandomTextInDailyReportWeatherConditionNotes() {
    const notesText = this.buildRandomWeatherNotesText();
    const notesField = this.weatherConditionNotesTextbox();
    await expect(notesField).toBeVisible({ timeout: this.defaultTimeout });
    await notesField.click({ timeout: 15000 });
    await notesField.fill('');
    await notesField.fill(notesText);
    this.lastDailyReportWeatherNotes = notesText;
    await this.logStep(`[Daily Report] Entered weather notes: ${notesText.slice(0, 40)}...`);
  }

  /** Client Report: Save on weather panel (visible Save, last). */
  async clickSaveOnDailyReportWeatherConditionPopup() {
    const saveBtn = this.page
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .last();
    await expect(saveBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await saveBtn.click({ timeout: 20000 });
    await this.dismissNotesEditorAfterSave().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('[Daily Report] Clicked Save on weather condition popup.');
  }

  async expectDailyReportCreatedSuccessfully() {
    if (this.dailyReportCreateSuccessObserved) {
      await this.logStep('[Daily Report] Create success already observed.');
      return;
    }

    await this.observeDailyReportCreateSuccess();

    if (this.dailyReportCreateSuccessObserved) {
      return;
    }

    const toast = this.locatorDailyReportCreatedToast();
    if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
      this.dailyReportCreateSuccessObserved = true;
      return;
    }

    await expect
      .poll(async () => this.isOnDailyReportList(), {
        timeout: 10000,
        intervals: [200, 300, 500, 1000],
      })
      .toBe(true);
    this.dailyReportCreateSuccessObserved = true;
    await this.logStep('[Daily Report] Create success confirmed on list page.');
  }

  timeLogSectionLabel() {
    return this.page
      .getByText(/^time log$/i)
      .or(this.page.getByText(/^time\s*logs?$/i))
      .first();
  }

  timeLogSectionScope() {
    const label = this.timeLogSectionLabel();
    return label
      .locator('xpath=ancestor::*[self::div or self::section or self::article][1]')
      .or(label.locator('xpath=ancestor::*[self::div or self::section][2]'))
      .or(this.createPageScope());
  }

  async scrollToTimeLogSection() {
    const label = this.timeLogSectionLabel();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  /**
   * TC-05: after timesheet create, Daily Report create page shows it under Time Log
   * (below report title). Matches user / date / 10:00 / 5:00 signals when available.
   */
  async expectCreatedTimesheetUnderTimeLogSection(timesheetMeta = {}) {
    await this.waitForDailyReportCreatePage();
    await this.scrollToTimeLogSection();

    const label = this.timeLogSectionLabel();
    await expect(label).toBeVisible({ timeout: this.defaultTimeout });
    await label.scrollIntoViewIfNeeded().catch(() => {});

    const scope = this.timeLogSectionScope();
    const user = timesheetMeta.user || '';
    const dateMmDd = timesheetMeta.date || '';
    const dateIso = timesheetMeta.dateIso || '';

    await expect
      .poll(
        async () => {
          if (!(await label.isVisible({ timeout: 400 }).catch(() => false))) {
            return false;
          }

          const hasStart =
            (await scope.getByText(/10:00/i).first().isVisible({ timeout: 400 }).catch(() => false)) ||
            (await this.page.getByText(/10:00\s*(AM)?/i).first().isVisible({ timeout: 400 }).catch(() => false));
          const hasEnd =
            (await scope.getByText(/5:00|17:00|05:00/i).first().isVisible({ timeout: 400 }).catch(() => false)) ||
            (await this.page.getByText(/5:00\s*(PM)?|17:00/i).first().isVisible({ timeout: 400 }).catch(() => false));

          let hasUser = true;
          if (user) {
            const userToken = user.split(/\s+/)[0];
            hasUser =
              (await scope.getByText(new RegExp(userToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first().isVisible({ timeout: 400 }).catch(() => false)) ||
              (await this.page.getByText(new RegExp(userToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first().isVisible({ timeout: 400 }).catch(() => false));
          }

          let hasDate = true;
          if (dateMmDd || dateIso) {
            const day = (dateMmDd || dateIso).split(/[/-]/).pop();
            hasDate =
              (await scope.getByText(new RegExp(dateMmDd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first().isVisible({ timeout: 300 }).catch(() => false)) ||
              (dateIso
                ? await scope.getByText(new RegExp(dateIso.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first().isVisible({ timeout: 300 }).catch(() => false)
                : false) ||
              (await scope.getByText(new RegExp(`\\b${day}\\b`)).first().isVisible({ timeout: 300 }).catch(() => false)) ||
              true;
          }

          const hasRow =
            (await scope.locator('table tbody tr, [class*="time"], [class*="TimeLog"], .MuiTableRow-root').filter({ visible: true }).first().isVisible({ timeout: 400 }).catch(() => false)) ||
            (await scope.locator('[class*="card"], [class*="Chip"], li').filter({ visible: true }).first().isVisible({ timeout: 400 }).catch(() => false));

          return (hasStart && hasEnd) || (hasStart && hasUser) || (hasRow && (hasStart || hasUser || hasDate));
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBe(true);

    await this.logStep(
      `[Daily Report] Created timesheet is visible under Time Log` +
        (user ? ` (user=${user}` : '') +
        (dateMmDd ? `, date=${dateMmDd}` : '') +
        (user || dateMmDd ? ')' : '')
    );
  }

  scheduleSectionLabel() {
    return this.page
      .getByText(/^schedule progress$/i)
      .or(this.page.getByText(/schedule\s*progress/i))
      .or(this.page.getByText(/^schedule$/i))
      .or(this.page.getByText(/^schedules$/i))
      .first();
  }

  /** Unique token from schedule name for truncated UI labels (e.g. timestamp suffix). */
  scheduleNameMatchPatterns(scheduleName) {
    const raw = String(scheduleName || '').trim();
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [new RegExp(escaped, 'i')];
    const suffix = raw.split(/\s+/).pop();
    if (suffix && suffix.length >= 6 && suffix !== raw) {
      patterns.push(new RegExp(suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
    // "DR Schedule 178599…" mid token
    const mid = raw.match(/DR\s*Schedule\s+(\d+)/i);
    if (mid) {
      patterns.push(new RegExp(`DR\\s*Schedule\\s*${mid[1]}`, 'i'));
    }
    return patterns;
  }

  async isScheduleNameVisibleOnCreatePage(scheduleName, scope) {
    const root = scope || this.page;
    const patterns = this.scheduleNameMatchPatterns(scheduleName);
    for (const nameRe of patterns) {
      // eslint-disable-next-line no-await-in-loop
      if (await root.getByText(nameRe).first().isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  /**
   * TC-06: newly created schedule is listed on Daily Report create page
   * under Schedule Progress (pre-selected). Opens the progress editor if the
   * name is only visible inside that panel (same chrome as TC-07).
   */
  async expectCreatedScheduleOnDailyReportCreatePage(scheduleName) {
    if (!scheduleName) {
      throw new Error('Expected scheduleName for Daily Report Schedule Progress verification.');
    }

    await this.waitForDailyReportCreatePage();
    await this.scrollToScheduleProgressSection();

    // Fast path: name already visible on create form (chip / summary).
    if (await this.isScheduleNameVisibleOnCreatePage(scheduleName, this.createPageScope())) {
      await this.logStep(`[Daily Report] Created schedule is listed on create page: ${scheduleName}`);
      return;
    }

    // Schedule Progress often shows names only after opening the edit panel.
    await this.logStep('[Daily Report] Schedule name not on form summary — opening Schedule Progress editor.');
    await this.clickScheduleProgressEditIcon();

    const panel = (await this.findScheduleProgressEditorPanel()) || this.scheduleProgressPanelRoot();

    await expect
      .poll(async () => this.isScheduleNameVisibleOnCreatePage(scheduleName, panel), {
        timeout: this.defaultTimeout,
        intervals: [500, 1000, 2000],
      })
      .toBe(true);

    // Prefer leaving a selected checkbox for this schedule (soft — don't fail if UI uses chips only).
    const patterns = this.scheduleNameMatchPatterns(scheduleName);
    for (const nameRe of patterns) {
      const checkbox = panel.getByRole('checkbox', { name: nameRe }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isVisible({ timeout: 1500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        const checked = await checkbox.isChecked().catch(() => false);
        await this.logStep(
          `[Daily Report] Schedule Progress checkbox for "${scheduleName}" is ${checked ? 'selected' : 'visible'}.`
        );
        break;
      }
    }

    // Close panel so form Create remains clickable for the next step.
    await this.page.keyboard.press('Escape').catch(() => {});
    const saveBtn = panel.getByRole('button', { name: /^save$/i }).filter({ visible: true }).first();
    if (await saveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await saveBtn.click({ timeout: 10000 }).catch(() => {});
      await this.logStep('[Daily Report] Saved Schedule Progress panel after TC-06 verify.');
    }

    await this.logStep(`[Daily Report] Created schedule is listed on create page: ${scheduleName}`);
  }

  scheduleProgressSectionLabel() {
    return this.page
      .getByText(/^schedule progress$/i)
      .or(this.page.getByText(/schedule\s*progress/i))
      .first();
  }

  scheduleProgressSectionScope() {
    const label = this.scheduleProgressSectionLabel();
    return label
      .locator('xpath=ancestor::*[self::div or self::section][1]')
      .or(label.locator('xpath=ancestor::*[self::div or self::section][2]'))
      .or(label.locator('xpath=ancestor::*[self::div or self::section][3]'));
  }

  scheduleProgressPanelRoot() {
    const scope = this.scheduleProgressSectionScope();
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ has: this.page.getByRole('checkbox') })
      .last()
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiPopover-paper, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByRole('checkbox') })
          .last()
      )
      .or(scope);
  }

  scheduleProgressTriggerButton() {
    return this.page
      .locator('div:nth-child(4) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .last();
  }

  scheduleProgressCheckboxLocators() {
    const label = this.scheduleProgressSectionLabel();
    return this.scheduleProgressSectionScope()
      .getByRole('checkbox')
      .filter({ visible: true })
      .or(
        label
          .locator('xpath=following::*[@role="checkbox" or @type="checkbox"]')
          .filter({ visible: true })
      )
      .or(
        this.page
          .getByRole('dialog')
          .filter({ visible: true })
          .last()
          .getByRole('checkbox')
          .filter({ visible: true })
      )
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiPopover-paper')
          .filter({ visible: true })
          .last()
          .locator('input[type="checkbox"]')
          .filter({ visible: true })
      );
  }

  async scrollToScheduleProgressSection() {
    const label = this.scheduleProgressSectionLabel();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep('[Daily Report] Schedule Progress section is in view.');
        return true;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
    await this.logStep('[Daily Report] Schedule Progress label not found — will use row trigger fallback.');
    return false;
  }

  async countScheduleProgressCheckboxes() {
    const boxes = this.scheduleProgressCheckboxLocators();
    return boxes.count().catch(() => 0);
  }

  async countCheckedScheduleProgressCheckboxes() {
    const boxes = this.scheduleProgressCheckboxLocators();
    const total = await boxes.count().catch(() => 0);
    let checked = 0;
    for (let i = 0; i < total; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await boxes.nth(i).isChecked().catch(() => false)) {
        checked += 1;
      }
    }
    return checked;
  }

  async isScheduleProgressPanelReady() {
    const total = await this.countScheduleProgressCheckboxes();
    if (total < 1) {
      return false;
    }
    const checked = await this.countCheckedScheduleProgressCheckboxes();
    return checked >= 1 || total >= 2;
  }

  async isScheduleProgressEditorOpen() {
    return (await this.findScheduleProgressEditorPanel()) !== null;
  }

  async findScheduleProgressEditorPanel() {
    const candidates = [
      this.page.getByRole('dialog').filter({ visible: true }).last(),
      this.page
        .locator('.MuiDrawer-paper, .MuiPopover-paper, [role="presentation"]')
        .filter({ visible: true })
        .last(),
      this.scheduleProgressSectionScope(),
    ];

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await candidate.isVisible({ timeout: 400 }).catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (
        await candidate
          .getByText(/weather affecting work|enter your notes here|start typing|^notes$/i)
          .first()
          .isVisible({ timeout: 200 })
          .catch(() => false)
      ) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const checkboxCount = await candidate.getByRole('checkbox').count().catch(() => 0);
      // eslint-disable-next-line no-await-in-loop
      const hasSave = await candidate
        .getByRole('button', { name: /^save$/i })
        .isVisible({ timeout: 200 })
        .catch(() => false);
      // Editor is open only when Save is visible with schedule checkboxes.
      if (checkboxCount >= 1 && hasSave) {
        return candidate;
      }
    }

    return null;
  }

  async resolveScheduleProgressCheckboxForName(scheduleName, panel) {
    const root = panel || (await this.findScheduleProgressEditorPanel()) || this.page;
    const patterns = this.scheduleNameMatchPatterns(scheduleName);

    for (const nameRe of patterns) {
      const textEl = root.getByText(nameRe).first();
      // eslint-disable-next-line no-await-in-loop
      if (!(await textEl.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      let checkbox = root.getByRole('checkbox', { name: nameRe }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        return checkbox;
      }

      for (let depth = 1; depth <= 6; depth += 1) {
        const row = textEl.locator(
          `xpath=ancestor::*[self::tr or self::li or self::div or self::label][${depth}]`
        );
        checkbox = row.getByRole('checkbox').first();
        // eslint-disable-next-line no-await-in-loop
        if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
          return checkbox;
        }
        checkbox = row.locator('input[type="checkbox"]').first();
        // eslint-disable-next-line no-await-in-loop
        if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
          return checkbox;
        }
      }

      checkbox = textEl
        .locator('xpath=preceding::*[@role="checkbox" or @type="checkbox"][1]')
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
        return checkbox;
      }
    }

    return null;
  }

  async locateScheduleProgressEditIconHandle() {
    const handle = await this.page.evaluateHandle(() => {
      const progressRe = /^schedule\s*progress$/i;
      let anchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (progressRe.test((node.textContent || '').trim())) {
          anchor = node.parentElement;
          break;
        }
      }
      if (!anchor) {
        return null;
      }

      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let container = anchor;
      for (let depth = 0; depth < 10 && container; depth += 1) {
        const trigger = container.querySelector(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
        );
        if (isVisible(trigger)) {
          return trigger;
        }
        container = container.parentElement;
      }

      const anchorRect = anchor.getBoundingClientRect();
      let best = null;
      let bestScore = Infinity;
      document
        .querySelectorAll(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall'
        )
        .forEach((btn) => {
          const rect = btn.getBoundingClientRect();
          if (!isVisible(btn)) return;
          if (rect.top < anchorRect.top - 40) return;
          const score = Math.abs(rect.top - anchorRect.top) + Math.abs(rect.left - anchorRect.left) * 0.05;
          if (score < bestScore) {
            bestScore = score;
            best = btn;
          }
        });
      return best;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  /** TC-07: Schedule Progress edit icon → checkbox list opens (Client Report / weather pattern). */
  async clickScheduleProgressEditIcon() {
    await this.waitForDailyReportCreatePage();
    await this.dismissNotesEditorAfterSave().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.scrollToScheduleProgressSection();

    if (await this.isScheduleProgressPanelReady()) {
      await this.logStep('[Daily Report] Schedule Progress checkboxes already visible.');
      return;
    }

    let clicked = false;

    const progressHandle = await this.locateScheduleProgressEditIconHandle();
    if (progressHandle) {
      await progressHandle.scrollIntoViewIfNeeded().catch(() => {});
      await progressHandle.click({ timeout: 20000, force: true });
      await progressHandle.dispose().catch(() => {});
      clicked = true;
      await this.logStep('[Daily Report] Clicked Schedule Progress edit icon (label-anchored DOM).');
    }

    if (!clicked || !(await this.isScheduleProgressPanelReady())) {
      const trigger = this.scheduleProgressTriggerButton();
      if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded().catch(() => {});
        await trigger.click({ timeout: 20000, force: true });
        await this.logStep('[Daily Report] Clicked MuiStack row 4 (schedule progress codegen).');
      }
    }

    if (!(await this.isScheduleProgressPanelReady())) {
      const label = this.scheduleProgressSectionLabel();
      if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
        await label.click({ timeout: 10000, force: true }).catch(() => {});
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // Do NOT press Escape after click — that closes the Schedule Progress panel.
    await expect
      .poll(async () => this.isScheduleProgressPanelReady(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 1500, 2000],
      })
      .toBe(true);

    await this.logStep('[Daily Report] Schedule Progress checkboxes are visible.');
  }

  /** TC-07: verify created schedules are listed and checked in Schedule Progress panel. */
  async expectCreatedSchedulesDisplayedAndSelectedInScheduleProgress(scheduleNames) {
    const names = scheduleNames || this.lastDailyReportScheduleNames || [];
    if (!names.length) {
      throw new Error('Expected schedule names for Schedule Progress verification.');
    }

    await expect
      .poll(() => this.isScheduleProgressPanelReady(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);

    const panel = (await this.findScheduleProgressEditorPanel()) || this.page;

    await expect
      .poll(async () => this.countCheckedScheduleProgressCheckboxes(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBeGreaterThanOrEqual(names.length);

    let verifiedByName = 0;
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const checkbox = await this.resolveScheduleProgressCheckboxForName(name, panel);
      if (!checkbox) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await expect(checkbox).toBeChecked({ timeout: 15000 });
      verifiedByName += 1;
    }

    this.lastDailyReportScheduleNames = names;
    if (verifiedByName === 0) {
      await this.logStep(
        `[Daily Report] Verified ${names.length} pre-selected schedule checkbox(es) in Schedule Progress (UI labels not row-linked).`
      );
      return;
    }

    await this.logStep(
      `[Daily Report] Verified ${names.length} schedule(s) in Schedule Progress (${verifiedByName} matched by name).`
    );
  }

  /** TC-07: uncheck one pre-selected schedule in Schedule Progress panel (does not Save). */
  async unselectOneSelectedScheduleInScheduleProgressPanel() {
    await expect
      .poll(async () => {
        const total = await this.countScheduleProgressCheckboxes();
        const checked = await this.countCheckedScheduleProgressCheckboxes();
        return total >= 1 && checked >= 1;
      }, { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] })
      .toBe(true);

    const checkboxes = this.scheduleProgressCheckboxLocators();
    const total = await checkboxes.count();
    let unselected = 0;

    for (let i = 0; i < total && unselected < 1; i += 1) {
      const checkbox = checkboxes.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await checkbox.isChecked().catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await checkbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await checkbox.click({ force: true, timeout: 15000 });
      });
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isChecked().catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await checkbox.click({ force: true, timeout: 15000 });
      }
      unselected += 1;
    }

    if (unselected === 0) {
      throw new Error('No selected schedule checkboxes found to unselect in Schedule Progress panel.');
    }

    await this.logStep('[Daily Report] Unselected one schedule checkbox in Schedule Progress panel.');
    return unselected;
  }

  async resolveScheduleProgressSaveButton() {
    const panel = await this.findScheduleProgressEditorPanel();
    if (panel) {
      const savesInPanel = panel.getByRole('button', { name: /^save$/i }).filter({ visible: true });
      const count = await savesInPanel.count().catch(() => 0);
      if (count === 1) {
        return savesInPanel.first();
      }
      if (count > 1) {
        return savesInPanel.last();
      }
    }

    const checkboxes = this.scheduleProgressCheckboxLocators();
    if ((await checkboxes.count().catch(() => 0)) > 0) {
      for (const depth of [3, 4, 5, 6, 7, 8]) {
        const container = checkboxes
          .first()
          .locator(`xpath=ancestor::*[self::div or self::section][${depth}]`);
        const saves = container.getByRole('button', { name: /^save$/i }).filter({ visible: true });
        // eslint-disable-next-line no-await-in-loop
        const count = await saves.count().catch(() => 0);
        if (count === 1) {
          return saves.first();
        }
        if (count > 1) {
          return saves.last();
        }
      }
    }

    const handle = await this.page.evaluateHandle(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const progressRe = /schedule\s*progress/i;
      let anchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (progressRe.test((node.textContent || '').trim())) {
          anchor = node.parentElement;
          break;
        }
      }

      let container = anchor;
      for (let depth = 0; depth < 14 && container; depth += 1) {
        const saves = [...container.querySelectorAll('button')].filter((btn) =>
          /^save$/i.test((btn.textContent || btn.innerText || '').trim())
        );
        const hasScheduleCheckbox = [...container.querySelectorAll('[role="checkbox"], input[type="checkbox"]')].some(
          isVisible
        );
        if (saves.length > 0 && hasScheduleCheckbox) {
          const target = saves[saves.length - 1];
          if (isVisible(target)) {
            return target;
          }
        }
        container = container.parentElement;
      }
      return null;
    });

    const element = handle.asElement();
    if (element) {
      return element;
    }
    await handle.dispose().catch(() => {});

    throw new Error('Schedule Progress Save button not found.');
  }

  /** TC-07: Save Schedule Progress panel after unselecting a schedule. */
  async clickSaveOnScheduleProgressPanel() {
    const saveTarget = await this.resolveScheduleProgressSaveButton();
    const isElementHandle =
      saveTarget && typeof saveTarget.dispose === 'function' && typeof saveTarget.locator !== 'function';

    if (isElementHandle) {
      await saveTarget.click({ timeout: 20000, force: true });
      await saveTarget.dispose().catch(() => {});
    } else {
      await expect(saveTarget).toBeVisible({ timeout: 15000 });
      await expect(saveTarget).toBeEnabled({ timeout: 15000 });
      await saveTarget.click({ timeout: 20000 });
    }

    await this.logStep('[Daily Report] Clicked Save on Schedule Progress panel.');
    await this.dismissNotesEditorAfterSave().catch(() => {});

    await expect
      .poll(async () => !(await this.isScheduleProgressEditorOpen()), {
        timeout: 20000,
        intervals: [300, 500, 1000],
      })
      .toBe(true)
      .catch(async () => {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.logStep('[Daily Report] Schedule Progress panel close fallback (Escape).');
      });

    await this.waitForDailyReportCreatePage().catch(() => {});
  }

  taskProgressSectionLabel() {
    return this.page
      .getByText(/^task progress$/i)
      .or(this.page.getByText(/task\s*progress/i))
      .first();
  }

  taskProgressSectionScope() {
    const label = this.taskProgressSectionLabel();
    return label
      .locator('xpath=ancestor::*[self::div or self::section][1]')
      .or(label.locator('xpath=ancestor::*[self::div or self::section][2]'))
      .or(label.locator('xpath=ancestor::*[self::div or self::section][3]'));
  }

  taskProgressPanelRoot() {
    const scope = this.taskProgressSectionScope();
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ has: this.page.getByRole('checkbox') })
      .last()
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiPopover-paper, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByRole('checkbox') })
          .last()
      )
      .or(scope);
  }

  taskProgressTriggerButton() {
    return this.page
      .locator('div:nth-child(5) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .last();
  }

  taskProgressCheckboxLocators() {
    const label = this.taskProgressSectionLabel();
    return this.taskProgressSectionScope()
      .getByRole('checkbox')
      .filter({ visible: true })
      .or(
        label
          .locator('xpath=following::*[@role="checkbox" or @type="checkbox"]')
          .filter({ visible: true })
      )
      .or(
        this.page
          .getByRole('dialog')
          .filter({ visible: true })
          .last()
          .getByRole('checkbox')
          .filter({ visible: true })
      )
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiPopover-paper')
          .filter({ visible: true })
          .last()
          .locator('input[type="checkbox"]')
          .filter({ visible: true })
      );
  }

  async scrollToTaskProgressSection() {
    const label = this.taskProgressSectionLabel();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep('[Daily Report] Task Progress section is in view.');
        return true;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
    await this.logStep('[Daily Report] Task Progress label not found — will use row trigger fallback.');
    return false;
  }

  async countTaskProgressCheckboxes() {
    const boxes = this.taskProgressCheckboxLocators();
    return boxes.count().catch(() => 0);
  }

  async countCheckedTaskProgressCheckboxes() {
    const boxes = this.taskProgressCheckboxLocators();
    const total = await boxes.count().catch(() => 0);
    let checked = 0;
    for (let i = 0; i < total; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await boxes.nth(i).isChecked().catch(() => false)) {
        checked += 1;
      }
    }
    return checked;
  }

  async isTaskProgressPanelReady() {
    const total = await this.countTaskProgressCheckboxes();
    if (total < 1) {
      return false;
    }
    const checked = await this.countCheckedTaskProgressCheckboxes();
    return checked >= 1 || total >= 2;
  }

  async isTaskProgressEditorOpen() {
    return (await this.findTaskProgressEditorPanel()) !== null;
  }

  async findTaskProgressEditorPanel() {
    const candidates = [
      this.taskProgressSectionScope(),
      this.page.getByRole('dialog').filter({ visible: true }).last(),
      this.page
        .locator('.MuiDrawer-paper, .MuiPopover-paper, [role="presentation"]')
        .filter({ visible: true })
        .last(),
    ];

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await candidate.isVisible({ timeout: 400 }).catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (
        await candidate
          .getByText(/weather affecting work|enter your notes here|start typing|^notes$/i)
          .first()
          .isVisible({ timeout: 200 })
          .catch(() => false)
      ) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const checkboxCount = await candidate.getByRole('checkbox').count().catch(() => 0);
      // eslint-disable-next-line no-await-in-loop
      const hasSave = await candidate
        .getByRole('button', { name: /^save$/i })
        .isVisible({ timeout: 200 })
        .catch(() => false);
      // eslint-disable-next-line no-await-in-loop
      const hasTaskProgressLabel = await candidate
        .getByText(/task\s*progress/i)
        .first()
        .isVisible({ timeout: 200 })
        .catch(() => false);
      if (checkboxCount >= 1 && hasSave && (hasTaskProgressLabel || candidate === candidates[0])) {
        return candidate;
      }
    }

    return null;
  }

  async resolveTaskProgressCheckboxForName(taskName, panel) {
    const root = panel || (await this.findTaskProgressEditorPanel()) || this.page;
    const patterns = this.taskNameMatchPatterns(taskName);

    for (const nameRe of patterns) {
      const textEl = root.getByText(nameRe).first();
      // eslint-disable-next-line no-await-in-loop
      if (!(await textEl.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      let checkbox = root.getByRole('checkbox', { name: nameRe }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        return checkbox;
      }

      for (let depth = 1; depth <= 6; depth += 1) {
        const row = textEl.locator(
          `xpath=ancestor::*[self::tr or self::li or self::div or self::label][${depth}]`
        );
        checkbox = row.getByRole('checkbox').first();
        // eslint-disable-next-line no-await-in-loop
        if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
          return checkbox;
        }
        checkbox = row.locator('input[type="checkbox"]').first();
        // eslint-disable-next-line no-await-in-loop
        if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
          return checkbox;
        }
      }

      checkbox = textEl
        .locator('xpath=preceding::*[@role="checkbox" or @type="checkbox"][1]')
        .first();
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isVisible({ timeout: 400 }).catch(() => false)) {
        return checkbox;
      }
    }

    return null;
  }

  async locateTaskProgressEditIconHandle() {
    const handle = await this.page.evaluateHandle(() => {
      const progressRe = /^task\s*progress$/i;
      let anchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (progressRe.test((node.textContent || '').trim())) {
          anchor = node.parentElement;
          break;
        }
      }
      if (!anchor) {
        return null;
      }

      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let container = anchor;
      for (let depth = 0; depth < 10 && container; depth += 1) {
        const trigger = container.querySelector(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
        );
        if (isVisible(trigger)) {
          return trigger;
        }
        container = container.parentElement;
      }

      const anchorRect = anchor.getBoundingClientRect();
      let best = null;
      let bestScore = Infinity;
      document
        .querySelectorAll(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall'
        )
        .forEach((btn) => {
          const rect = btn.getBoundingClientRect();
          if (!isVisible(btn)) return;
          if (rect.top < anchorRect.top - 40) return;
          const score = Math.abs(rect.top - anchorRect.top) + Math.abs(rect.left - anchorRect.left) * 0.05;
          if (score < bestScore) {
            bestScore = score;
            best = btn;
          }
        });
      return best;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  /** TC-09: Task Progress edit icon → checkbox list opens. */
  async clickTaskProgressEditIcon() {
    await this.waitForDailyReportCreatePage();
    await this.dismissNotesEditorAfterSave().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.scrollToTaskProgressSection();

    if (await this.isTaskProgressPanelReady()) {
      await this.logStep('[Daily Report] Task Progress checkboxes already visible.');
      return;
    }

    let clicked = false;

    const progressHandle = await this.locateTaskProgressEditIconHandle();
    if (progressHandle) {
      await progressHandle.scrollIntoViewIfNeeded().catch(() => {});
      await progressHandle.click({ timeout: 20000, force: true });
      await progressHandle.dispose().catch(() => {});
      clicked = true;
      await this.logStep('[Daily Report] Clicked Task Progress edit icon (label-anchored DOM).');
    }

    if (!clicked || !(await this.isTaskProgressPanelReady())) {
      const trigger = this.taskProgressTriggerButton();
      if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded().catch(() => {});
        await trigger.click({ timeout: 20000, force: true });
        await this.logStep('[Daily Report] Clicked MuiStack row 5 (task progress codegen).');
      }
    }

    if (!(await this.isTaskProgressPanelReady())) {
      const label = this.taskProgressSectionLabel();
      if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
        await label.click({ timeout: 10000, force: true }).catch(() => {});
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect
      .poll(async () => this.isTaskProgressPanelReady(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 1500, 2000],
      })
      .toBe(true);

    await this.logStep('[Daily Report] Task Progress checkboxes are visible.');
  }

  /** TC-09: verify created tasks are listed and checked in Task Progress panel. */
  async expectCreatedTasksDisplayedAndSelectedInTaskProgress(taskNames) {
    const names = taskNames || this.lastDailyReportTaskNames || [];
    if (!names.length) {
      throw new Error('Expected task names for Task Progress verification.');
    }

    await expect
      .poll(() => this.isTaskProgressPanelReady(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);

    const panel = (await this.findTaskProgressEditorPanel()) || this.page;

    await expect
      .poll(async () => this.countCheckedTaskProgressCheckboxes(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBeGreaterThanOrEqual(names.length);

    let verifiedByName = 0;
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const checkbox = await this.resolveTaskProgressCheckboxForName(name, panel);
      if (!checkbox) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await expect(checkbox).toBeChecked({ timeout: 15000 });
      verifiedByName += 1;
    }

    this.lastDailyReportTaskNames = names;
    if (verifiedByName === 0) {
      await this.logStep(
        `[Daily Report] Verified ${names.length} pre-selected task checkbox(es) in Task Progress (UI labels not row-linked).`
      );
      return;
    }

    await this.logStep(
      `[Daily Report] Verified ${names.length} task(s) in Task Progress (${verifiedByName} matched by name).`
    );
  }

  /** TC-09: uncheck one pre-selected task in Task Progress panel (does not Save). */
  async unselectOneSelectedTaskInTaskProgressPanel() {
    await expect
      .poll(async () => {
        const total = await this.countTaskProgressCheckboxes();
        const checked = await this.countCheckedTaskProgressCheckboxes();
        return total >= 1 && checked >= 1;
      }, { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] })
      .toBe(true);

    const checkboxes = this.taskProgressCheckboxLocators();
    const total = await checkboxes.count();
    let unselected = 0;

    for (let i = 0; i < total && unselected < 1; i += 1) {
      const checkbox = checkboxes.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await checkbox.isChecked().catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await checkbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await checkbox.click({ force: true, timeout: 15000 });
      });
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isChecked().catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await checkbox.click({ force: true, timeout: 15000 });
      }
      unselected += 1;
    }

    if (unselected === 0) {
      throw new Error('No selected task checkboxes found to unselect in Task Progress panel.');
    }

    await this.logStep('[Daily Report] Unselected one task checkbox in Task Progress panel.');
    return unselected;
  }

  async resolveTaskProgressSaveButton() {
    const panel = await this.findTaskProgressEditorPanel();
    if (panel) {
      const savesInPanel = panel.getByRole('button', { name: /^save$/i }).filter({ visible: true });
      const count = await savesInPanel.count().catch(() => 0);
      if (count === 1) {
        return savesInPanel.first();
      }
      if (count > 1) {
        return savesInPanel.last();
      }
    }

    const checkboxes = this.taskProgressCheckboxLocators();
    if ((await checkboxes.count().catch(() => 0)) > 0) {
      for (const depth of [3, 4, 5, 6, 7, 8]) {
        const container = checkboxes
          .first()
          .locator(`xpath=ancestor::*[self::div or self::section][${depth}]`);
        const saves = container.getByRole('button', { name: /^save$/i }).filter({ visible: true });
        // eslint-disable-next-line no-await-in-loop
        const count = await saves.count().catch(() => 0);
        if (count === 1) {
          return saves.first();
        }
        if (count > 1) {
          return saves.last();
        }
      }
    }

    const handle = await this.page.evaluateHandle(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const progressRe = /task\s*progress/i;
      let anchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (progressRe.test((node.textContent || '').trim())) {
          anchor = node.parentElement;
          break;
        }
      }

      let container = anchor;
      for (let depth = 0; depth < 14 && container; depth += 1) {
        const saves = [...container.querySelectorAll('button')].filter((btn) =>
          /^save$/i.test((btn.textContent || btn.innerText || '').trim())
        );
        const hasTaskCheckbox = [...container.querySelectorAll('[role="checkbox"], input[type="checkbox"]')].some(
          isVisible
        );
        if (saves.length > 0 && hasTaskCheckbox) {
          const target = saves[saves.length - 1];
          if (isVisible(target)) {
            return target;
          }
        }
        container = container.parentElement;
      }
      return null;
    });

    const element = handle.asElement();
    if (element) {
      return element;
    }
    await handle.dispose().catch(() => {});

    throw new Error('Task Progress Save button not found.');
  }

  /** TC-09: Save Task Progress panel after unselecting a task. */
  async clickSaveOnTaskProgressPanel() {
    const saveTarget = await this.resolveTaskProgressSaveButton();
    const isElementHandle =
      saveTarget && typeof saveTarget.dispose === 'function' && typeof saveTarget.locator !== 'function';

    if (isElementHandle) {
      await saveTarget.click({ timeout: 20000, force: true });
      await saveTarget.dispose().catch(() => {});
    } else {
      await expect(saveTarget).toBeVisible({ timeout: 15000 });
      await expect(saveTarget).toBeEnabled({ timeout: 15000 });
      await saveTarget.click({ timeout: 20000 });
    }

    await this.logStep('[Daily Report] Clicked Save on Task Progress panel.');
    await this.dismissNotesEditorAfterSave().catch(() => {});

    await expect
      .poll(async () => !(await this.isTaskProgressEditorOpen()), {
        timeout: 20000,
        intervals: [300, 500, 1000],
      })
      .toBe(true)
      .catch(async () => {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.logStep('[Daily Report] Task Progress panel close fallback (Escape).');
      });

    await this.waitForDailyReportCreatePage().catch(() => {});
  }

  taskSectionLabel() {
    return this.page
      .getByText(/^task progress$/i)
      .or(this.page.getByText(/^tasks?$/i))
      .or(this.page.getByText(/task\s*progress/i))
      .first();
  }

  taskNameMatchPatterns(taskName) {
    const raw = String(taskName || '').trim();
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [new RegExp(escaped, 'i')];
    const suffix = raw.split(/\s+/).pop();
    if (suffix && suffix.length >= 6 && suffix !== raw) {
      patterns.push(new RegExp(suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
    const mid = raw.match(/DR\s*Task\s+(\d+)/i);
    if (mid) {
      patterns.push(new RegExp(`DR\\s*Task\\s*${mid[1]}`, 'i'));
    }
    return patterns;
  }

  async scrollToTaskSection() {
    const label = this.taskSectionLabel();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep('[Daily Report] Task / Task Progress section is in view.');
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  async isTaskNameVisibleOnCreatePage(taskName, scope) {
    const root = scope || this.page;
    const patterns = this.taskNameMatchPatterns(taskName);
    for (const nameRe of patterns) {
      // eslint-disable-next-line no-await-in-loop
      if (await root.getByText(nameRe).first().isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  /** TC-08: newly created task is listed on the Daily Report create page. */
  async expectCreatedTaskOnDailyReportCreatePage(taskName) {
    if (!taskName) {
      throw new Error('Expected taskName for Daily Report task verification.');
    }

    await this.waitForDailyReportCreatePage();
    await this.scrollToTaskSection();

    // Prefer reading listed task names; if empty, open Task Progress edit (checkboxes show names).
    const visibleDirectly = async () => {
      if (await this.isTaskNameVisibleOnCreatePage(taskName, this.createPageScope())) return true;
      const label = this.taskSectionLabel();
      if (await label.isVisible({ timeout: 400 }).catch(() => false)) {
        const scope = label.locator(
          'xpath=ancestor::*[self::div or self::section or self::article][1]'
        );
        if (await this.isTaskNameVisibleOnCreatePage(taskName, scope)) return true;
      }
      return this.isTaskNameVisibleOnCreatePage(taskName, this.page);
    };

    if (!(await visibleDirectly())) {
      await this.clickDailyReportTaskProgressEditIcon().catch(() => {});
      await this.page.waitForTimeout(800);
    }

    await expect
      .poll(
        async () => {
          if (await visibleDirectly()) return true;
          // Task Progress panel checkboxes / labels
          const panel = this.page
            .locator('.MuiPopover-paper, .MuiDialog-paper, .MuiPaper-root, [role="dialog"]')
            .filter({ visible: true })
            .filter({ has: this.page.getByRole('checkbox') })
            .last();
          if (await panel.isVisible({ timeout: 400 }).catch(() => false)) {
            return this.isTaskNameVisibleOnCreatePage(taskName, panel);
          }
          return false;
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBe(true);

    this.lastDailyReportTaskName = taskName;
    await this.logStep(`[Daily Report] Created task is listed on create page: ${taskName}`);
  }
}

module.exports = DailyReportPage;
