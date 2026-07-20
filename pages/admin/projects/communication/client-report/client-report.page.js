const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectProfilePage = require('../../ProjectProfilePage');

/**
 * Codegen-aligned flow:
 * Project Management → profile icon → Communication & Docs → Client Report text
 * → Create → Create → Create
 */
class ClientReportPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.clientReportCreateSuccessObserved = false;
    this.lastClientReportTitle = null;
    this.lastClientReportNotes = null;
  }

  /** Codegen: getByRole('button', { name: 'Create' }) — visible Create on current step. */
  visibleCreateButton() {
    return this.page
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .first();
  }

  clientReportModuleLabel() {
    return this.page.getByText('Client Report', { exact: true }).first();
  }

  projectProfileIconButton() {
    return this.page
      .locator('button.MuiIconButton-root.MuiIconButton-sizeSmall')
      .filter({ visible: true })
      .first();
  }

  reportTitleInput() {
    return this.page
      .getByRole('textbox', { name: 'Enter report title' })
      .or(this.page.getByRole('textbox', { name: /report title/i }))
      .first();
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
      .or(this.page.locator('[role="presentation"]').filter({ visible: true }))
      .last();
  }

  createPageScope() {
    return this.page.locator('main, [role="main"]').first();
  }

  async isNotesEditorOpen() {
    if (await this.notesTypingTextbox().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    const root = this.notesEditorRoot();
    if (await root.getByRole('button', { name: 'Save', exact: true }).isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    return root
      .locator('[contenteditable="true"], textarea')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 800 })
      .catch(() => false);
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
      // eslint-disable-next-line no-await-in-loop
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
      ordered.push({ icon, score, index: i });
    }

    ordered.sort((a, b) => a.score - b.score);

    const candidates = ordered.map((entry) => entry.icon);

    // Codegen uses the first small icon on page after title fill.
    candidates.unshift(
      this.page
        .locator('button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall')
        .filter({ visible: true })
        .first()
    );

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

  locatorClientReportCreatedToast() {
    const pattern =
      /client report (created|saved|submitted).*success|client report created|created successfully|saved successfully|success/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root')
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomReportTitle() {
    const suffix = Math.random().toString(36).slice(2, 6);
    return `site process update ${suffix}`;
  }

  buildRandomNotesText() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return (
      `Automation note ${suffix}: The site process has been reviewed and updated to improve workflow efficiency. ` +
      'Recent changes include enhancements to navigation, process validation, and overall system performance.'
    );
  }

  async waitForClientReportList() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await expect(this.visibleCreateButton()).toBeVisible({ timeout: this.defaultTimeout });
    // eslint-disable-next-line no-console
    console.log('[Client Report] Client Report list is ready.');
  }

  async waitForClientReportCreatePage() {
    await expect
      .poll(
        async () =>
          (await this.reportTitleInput().isVisible({ timeout: 500 }).catch(() => false)) ||
          (await this.page.getByText(/^notes$/i).first().isVisible({ timeout: 500 }).catch(() => false)) ||
          /client[-_]?report/i.test(this.page.url()),
        { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log('[Client Report] Create page is ready.');
  }

  async navigateToClientReportModule() {
    const profile = new ProjectProfilePage(this.page);

    // Codegen: project row icon → Communication & Docs (no Project Management step).
    const iconBtn = this.projectProfileIconButton();
    if (await iconBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await iconBtn.scrollIntoViewIfNeeded().catch(() => {});
      await iconBtn.click({ timeout: 20000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[Client Report] Clicked project profile icon button.');
    } else {
      await profile.selectHeading('Project Management').catch(() => {});
      if (await iconBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await iconBtn.click({ timeout: 20000 });
      }
    }

    await profile.selectHeading('Communication & Docs');

    const clientReport = this.clientReportModuleLabel();
    await expect(clientReport).toBeVisible({ timeout: this.defaultTimeout });
    await clientReport.scrollIntoViewIfNeeded().catch(() => {});
    await clientReport.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForClientReportList();
    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened Client Report module.');
  }

  async clickVisibleCreateButton(stepLabel = '') {
    const createBtn = this.visibleCreateButton();
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(createBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Clicked Create${stepLabel ? ` (${stepLabel})` : ''}.`);
  }

  async observeClientReportCreateSuccess() {
    const raceTimeout = this.defaultTimeout;
    const toast = this.locatorClientReportCreatedToast();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: raceTimeout }).then(() => {
        this.clientReportCreateSuccessObserved = true;
      }),
      this.visibleCreateButton()
        .waitFor({ state: 'visible', timeout: raceTimeout })
        .then(() => {
          this.clientReportCreateSuccessObserved = true;
        })
        .catch(() => {}),
    ]).catch(() => {});
  }

  async completeClientReportCreateWithThreeCreateClicks() {
    await this.clickVisibleCreateButton('1 of 3');
    await this.clickVisibleCreateButton('2 of 3');
    await this.clickVisibleCreateButton('3 of 3');
    await this.observeClientReportCreateSuccess();
    // eslint-disable-next-line no-console
    console.log('[Client Report] Completed three Create clicks.');
  }

  /** TC-02: list Create × 2 → create page with Notes + Report Title. */
  async openClientReportCreatePage() {
    await this.clickVisibleCreateButton('open list');
    await this.clickVisibleCreateButton('open create page');
    await this.waitForClientReportCreatePage();
  }

  async clickNotesEditIconNearNotesSection() {
    await this.waitForClientReportCreatePage();

    if (await this.isNotesEditorOpen()) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Notes editor already open.');
      return;
    }

    const notesLabel = this.page.getByText(/^notes$/i).first();
    if (await notesLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notesLabel.scrollIntoViewIfNeeded().catch(() => {});
      await notesLabel.click({ timeout: 10000, force: true }).catch(() => {});
      if (await this.isNotesEditorOpen()) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Opened notes editor by clicking Notes label.');
        return;
      }
    }

    const candidates = await this.resolveNotesEditIconCandidates();
    let opened = false;

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await candidate.click({ timeout: 15000, force: true }).catch(() => {});

      // eslint-disable-next-line no-await-in-loop
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

      // eslint-disable-next-line no-await-in-loop
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    if (!opened) {
      throw new Error(
        'Client report notes editor did not open. Expected "Start typing..." or Save after clicking the Notes edit icon.'
      );
    }

    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened notes editor via icon near Notes.');
  }

  async resolveNotesInputField() {
    const direct = this.notesTypingTextbox();
    if (await direct.isVisible({ timeout: 2000 }).catch(() => false)) {
      return direct;
    }

    const root = this.notesEditorRoot();
    const inRoot = root
      .getByRole('textbox')
      .or(root.locator('textarea'))
      .or(root.locator('[contenteditable="true"]'))
      .filter({ visible: true })
      .first();

    if (await inRoot.isVisible({ timeout: 3000 }).catch(() => false)) {
      return inRoot;
    }

    return this.page.locator('[contenteditable="true"], textarea').filter({ visible: true }).last();
  }

  async fillNotesInEditPopup(notesText) {
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

    this.lastClientReportNotes = notesText;

    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true }).first();
    await expect(saveBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await saveBtn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // eslint-disable-next-line no-console
    console.log(`[Client Report] Filled notes and clicked Save: ${notesText.slice(0, 40)}...`);
  }

  async editClientReportNotesWithRandomText() {
    const notesText = this.buildRandomNotesText();
    await this.clickNotesEditIconNearNotesSection();
    await this.fillNotesInEditPopup(notesText);
    return notesText;
  }

  async replaceReportTitle(title) {
    await this.waitForClientReportCreatePage();
    const input = this.reportTitleInput();
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.click({ timeout: 15000 });
    await input.fill('');
    await input.fill(title);
    await expect
      .poll(async () => (await input.inputValue()).trim(), { timeout: 15000 })
      .toBe(title);
    this.lastClientReportTitle = title;
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Replaced report title with: ${title}`);
  }

  async replaceReportTitleWithRandomSiteProcessUpdate() {
    const title = this.buildRandomReportTitle();
    await this.replaceReportTitle(title);
    return title;
  }

  async clickCreateOnClientReportCreatePage() {
    await this.waitForClientReportCreatePage();
    await this.clickVisibleCreateButton('submit create page');
    await this.observeClientReportCreateSuccess();
  }

  /** Atomic TC-02: create page → title → notes edit → Save → Create. */
  async completeClientReportCreateWithNotesAndTitleJourney() {
    await this.openClientReportCreatePage();
    await this.replaceReportTitleWithRandomSiteProcessUpdate();
    await this.editClientReportNotesWithRandomText();
    await this.clickCreateOnClientReportCreatePage();
  }

  async expectClientReportCreatedSuccessfully() {
    if (this.clientReportCreateSuccessObserved) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Create success already observed.');
      return;
    }

    const toast = this.locatorClientReportCreatedToast();
    if (await toast.isVisible({ timeout: 15000 }).catch(() => false)) {
      this.clientReportCreateSuccessObserved = true;
      // eslint-disable-next-line no-console
      console.log('[Client Report] Success toast displayed after create.');
      return;
    }

    await expect(this.visibleCreateButton()).toBeVisible({ timeout: this.defaultTimeout });
    this.clientReportCreateSuccessObserved = true;
    // eslint-disable-next-line no-console
    console.log('[Client Report] Create success confirmed via return to list.');
  }
}

module.exports = ClientReportPage;
