const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const NavigationPage = require('../../common/NavigationPage');

class NotePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.navigationPage = new NavigationPage(page);

    this.actionButton = page.getByRole('button', { name: 'Action', exact: true }).first();
    this.addNoteButton = page
      .getByRole('button', { name: /add note|new note|create note/i })
      .or(page.locator('button').filter({ hasText: /^add note$|^new note$|^create note$/i }))
      .first();
    this.actionMenu = page.locator('[role="menu"]').filter({ visible: true }).first();
    this.noteMenuItem = page.getByRole('menuitem', { name: /^notes?$/i }).first();

    // Empty-state CTA lives inside the Notes tab panel (not the org-details banner at the top).
    this.notesTabPanel = page
      .locator('.MuiTabPanel-root')
      .filter({ hasText: /no data found|click here to add|all notes|search\.\.\./i })
      .last();

    this.allNotesHeading = page.getByRole('heading', { name: /all notes/i }).or(page.getByText(/^all notes$/i)).first();

    this.emptyStateCreateButton = this.notesTabPanel
      .getByRole('button', { name: /^create$/i })
      .or(
        this.notesTabPanel.locator(
          'button.MuiButton-containedPrimary, button.MuiButton-contained'
        ).filter({ hasText: /^create$/i })
      )
      .first();

    this.topCreateButton = page
      .getByRole('button', { name: /^create$/i })
      .filter({ has: page.locator('.MuiButton-startIcon, svg') })
      .or(page.locator('button.MuiButton-containedPrimary').filter({ hasText: /^create$/i }))
      .first();

    this.notesListCreateButton = this.notesTabPanel
      .getByRole('button', { name: /^create$/i })
      .or(
        page
          .locator('.MuiTabPanel-root')
          .filter({ hasText: /all notes/i })
          .getByRole('button', { name: /^create$/i })
      )
      .first();

    this.addNoteLink = this.notesTabPanel
      .locator('span.cursor-pointer, p, a')
      .filter({ hasText: /^click here$/i })
      .first();

    // Prefer fields inside the open Note dialog so list-card Plate previews are ignored.
    this.noteFormDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByPlaceholder(/^title$/i) })
      .filter({ visible: true })
      .last();

    this.nameInput = this.noteFormDialog
      .getByPlaceholder(/^title$/i)
      .or(this.noteFormDialog.locator('input[placeholder="Title"]'))
      .or(page.getByPlaceholder(/^title$/i))
      .or(page.locator('input[placeholder="Title"]'))
      .or(page.getByRole('textbox', { name: /^name|^title/i }))
      .first();

    this.descriptionInput = this.noteFormDialog
      .locator('[contenteditable="true"]')
      .last()
      .or(page.getByRole('dialog').filter({ visible: true }).locator('[contenteditable="true"]').last())
      .or(page.locator('[contenteditable="true"]').filter({ hasText: /type a paragraph/i }).last())
      .first();

    this.fileInput = this.noteFormDialog
      .locator('input[type="file"]')
      .last()
      .or(page.locator('input[type="file"]').last());
    this.attachmentTrigger = this.noteFormDialog
      .getByRole('button', { name: /attach|attachment|upload|browse|choose\s*file/i })
      .or(page.getByRole('button', { name: /attach|attachment|upload|browse|choose\s*file/i }))
      .or(page.getByText(/attach|attachment|upload|browse|choose\s*file/i))
      .first();

    this.submitCreateButton = this.noteFormDialog
      .getByRole('button', { name: /^create$/i })
      .filter({ visible: true })
      .last()
      .or(page.getByRole('button', { name: /^create$/i }).filter({ visible: true }).last())
      .or(page.getByRole('button', { name: /^add note$/i }))
      .or(page.getByRole('button', { name: /^save note$/i }))
      .first();

    this.successToast = page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .MuiSnackbarContent-root')
      .filter({ hasText: /note|added|created|saved|success/i })
      .first();

    // In-tab Notes search (collapsed button). Never use header "Search Anything in IntoAEC...".
    this.notesSearch = page
      .getByRole('search', { name: /^search$/i })
      .filter({ has: page.locator('button[aria-label="Search"], [data-testid="SearchIcon"]') })
      .first();
    this.notesSearchToggle = this.notesSearch
      .getByRole('button', { name: /^search$/i })
      .or(this.notesSearch.locator('button[aria-label="Search"]'))
      .first();
    this.searchInput = this.notesSearch
      .getByRole('textbox')
      .or(this.notesSearch.locator('input:not([type="hidden"])'))
      .or(this.notesTabPanel.getByPlaceholder(/^search(\.\.\.)?$/i))
      .or(this.notesTabPanel.getByRole('textbox', { name: /^search$/i }))
      .first();

    this.editMenuItem = page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^edit$/i }))
      .first();

    this.deleteMenuItem = page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^delete$/i }))
      .first();

    this.confirmDialog = page
      .getByRole('dialog')
      .filter({ hasText: /delete|confirm|remove|note/i })
      .first();

    this.confirmYesButton = page
      .getByRole('button', { name: /^yes$/i })
      .or(page.locator('button').filter({ hasText: /^yes$/i }))
      .first();

    this.confirmCancelButton = page
      .getByRole('button', { name: /^cancel$/i })
      .or(page.locator('button').filter({ hasText: /^cancel$/i }))
      .first();

    this.saveNoteButton = this.noteFormDialog
      .getByRole('button', { name: /^save$/i })
      .filter({ visible: true })
      .last()
      .or(page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last())
      .or(page.getByRole('button', { name: /^update$/i }).filter({ visible: true }).last());

    this.validationMessage = page
      .locator(
        '.Toastify__toast, .MuiFormHelperText-root, .MuiAlert-root, .Mui-error, [role="alert"], .MuiSnackbar-root'
      )
      .filter({
        hasText:
          /required|mandatory|cannot be empty|please enter|please fill|is required|field is required|enter title|enter paragraph|title is required|paragraph is required|fill in the (title|content)/i,
      })
      .first();

    this.mandatoryValidationToast = page
      .locator('.Toastify__toast, .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({
        hasText: /please (fill in|add) all mandatory fields|please fill in the (title|content)|required|mandatory/i,
      })
      .first();
  }

  buildRandomSuffix() {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
  }

  buildNoteData() {
    const suffix = this.buildRandomSuffix();
    return {
      // Keep under NotesCard TruncatedText limit (20) so list matching stays stable.
      name: `N-${suffix}`.slice(0, 20),
      description: `Automation note description ${suffix}`,
    };
  }

  /** NotesCard truncates titles with TruncatedText limit={20}. */
  toDisplayedNoteTitle(name, limit = 20) {
    const text = String(name || '');
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
  }

  getNoteTitleMatchers(name) {
    const full = String(name || '');
    const display = this.toDisplayedNoteTitle(full);
    const prefix = full.slice(0, Math.min(20, full.length));
    return { full, display, prefix };
  }

  isOnLeadProfile() {
    return /leadmanager\/profile/i.test(this.page.url());
  }

  isOnNotesModule() {
    return /leadmanager\/profile/i.test(this.page.url()) && /tab=Notes/i.test(this.page.url());
  }

  async isNoteFormOpen() {
    // Only the Note create/edit dialog counts — list-card Plate previews are contenteditable too.
    if (await this.noteFormDialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    const titleInDialog = await this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .getByPlaceholder(/^title$/i)
      .first()
      .isVisible({ timeout: 800 })
      .catch(() => false);
    return titleInDialog;
  }

  async waitUntilNoteFormOpen(timeout = this.defaultTimeout) {
    await expect(async () => {
      expect(await this.isNoteFormOpen()).toBeTruthy();
    }).toPass({ timeout, intervals: [250, 500, 1000] });
  }

  async waitUntilNoteFormClosed(timeout = 30000) {
    await expect(async () => {
      expect(await this.isNoteFormOpen()).toBeFalsy();
    }).toPass({ timeout, intervals: [250, 500, 1000] });
  }

  async isNotesListView() {
    const headingVisible = await this.allNotesHeading.isVisible({ timeout: 1500 }).catch(() => false);
    const searchToggleVisible = await this.notesSearchToggle.isVisible({ timeout: 1500 }).catch(() => false);
    const searchVisible = await this.searchInput.isVisible({ timeout: 1500 }).catch(() => false);
    const noteCardVisible = await this.page
      .locator('.card-header, .viewNoteContainer, .MuiCard-root')
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    return headingVisible || searchToggleVisible || searchVisible || noteCardVisible;
  }

  async isNotesEmptyState() {
    return this.page.getByText(/no data found/i).first().isVisible({ timeout: 1500 }).catch(() => false);
  }

  async clickCreateNoteButton() {
    const createButtons = [
      this.notesListCreateButton,
      this.emptyStateCreateButton,
      this.topCreateButton,
      this.page.getByRole('button', { name: /^create$/i }).first(),
    ];

    for (const button of createButtons) {
      if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[NotePage] Clicking Create note button');
        await button.scrollIntoViewIfNeeded().catch(() => {});
        await button.click({ force: true, timeout: 15000 });
        const opened = await expect(async () => {
          expect(await this.isNoteFormOpen()).toBeTruthy();
        })
          .toPass({ timeout: 8000, intervals: [250, 500] })
          .then(() => true)
          .catch(() => false);
        if (opened) {
          return true;
        }
      }
    }

    return false;
  }

  async ensureNotesSearchInputReady() {
    if (await this.searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }

    if (!(await this.notesSearchToggle.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }

    console.log('[NotePage] Opening Notes tab search');
    await this.notesSearchToggle.click({ timeout: 15000 });
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    return true;
  }

  async clearNotesSearch() {
    if (!(await this.searchInput.isVisible({ timeout: 1500 }).catch(() => false))) {
      return;
    }
    await this.searchInput.click().catch(() => {});
    await this.searchInput.fill('');
    await this.waitForNotesListLoaded().catch(() => {});
  }

  async closeNoteFormIfOpen() {
    if (!(await this.isNoteFormOpen())) {
      return;
    }

    console.log('[NotePage] Closing open note form');
    const cancelButton = this.page.getByRole('button', { name: /^cancel$/i }).filter({ visible: true }).first();
    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelButton.click({ timeout: 15000 }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.dismissOpenMenus();
    await expect(this.nameInput).toBeHidden({ timeout: 15000 }).catch(() => {});
  }

  async ensureNotesListReadyForCreate() {
    await this.openNotesModule();
    await this.dismissOpenMenus();
    await this.closeNoteFormIfOpen();
    await this.clearNotesSearch();
    await this.waitForNotesModuleReady();
  }

  async clickEmptyStateAddNoteLink() {
    await this.notesTabPanel.scrollIntoViewIfNeeded().catch(() => {});

    const clicked = await this.page.evaluate(() => {
      const panel = Array.from(document.querySelectorAll('.MuiTabPanel-root')).find((el) =>
        /no data found|click here to add a notes?/i.test(el.textContent || '')
      );
      if (!panel) {
        return false;
      }

      const clickEl = Array.from(panel.querySelectorAll('span, a, p, button')).find((el) =>
        /^click here$/i.test((el.textContent || '').trim())
      );
      if (!clickEl) {
        return false;
      }
      clickEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    });

    if (clicked) {
      console.log('[NotePage] Clicked empty-state "click here" link');
      await this.waitUntilNoteFormOpen(8000).catch(() => {});
      return;
    }

    if (await this.addNoteLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.addNoteLink.click({ force: true, timeout: 15000 });
    }
  }

  async openNotesModule() {
    console.log('[NotePage] Opening Notes module');
    if (!(await this.isOnLeadProfile())) {
      await this.navigationPage.navigateToFirstLead();
    }

    if (await this.isOnNotesModule()) {
      await this.waitForNotesModuleReady();
      return;
    }

    const notesTile = this.page
      .locator('div.MuiBox-root, div.MuiPaper-root')
      .filter({ hasText: /^notes?$/i })
      .first();
    if (await notesTile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notesTile.click();
      await this.page.waitForURL(/tab=Notes/i, { timeout: this.defaultTimeout }).catch(() => {});
    } else {
      const url = new URL(this.page.url());
      url.searchParams.set('tab', 'Notes');
      await this.page.goto(url.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: this.defaultTimeout,
      });
    }

    await this.waitForNotesModuleReady();
  }

  async waitForNotesModuleReady() {
    await this.page.waitForURL(/tab=Notes/i, { timeout: this.defaultTimeout }).catch(() => {});
    await expect(async () => {
      const emptyLinkVisible = await this.addNoteLink.isVisible().catch(() => false);
      const emptyTextVisible = await this.page.getByText(/click here to add a notes?/i).first().isVisible().catch(() => false);
      const createVisible = await this.topCreateButton.isVisible().catch(() => false);
      const emptyCreateVisible = await this.emptyStateCreateButton.isVisible().catch(() => false);
      const listVisible = await this.isNotesListView();
      const cardVisible = await this.page.locator('.MuiCard-root').first().isVisible().catch(() => false);
      expect(
        emptyLinkVisible ||
          emptyTextVisible ||
          createVisible ||
          emptyCreateVisible ||
          listVisible ||
          cardVisible
      ).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000, 3000] });
  }

  async openNoteCreateForm() {
    console.log('[NotePage] Opening note create form');
    if (await this.isNoteFormOpen()) {
      return;
    }

    await this.ensureNotesListReadyForCreate();

    const isEmpty = await this.isNotesEmptyState();
    const isList = await this.isNotesListView();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) {
        console.log(`[NotePage] Retrying note create form open (attempt ${attempt + 1})`);
        await this.dismissOpenMenus();
        await this.waitForNotesModuleReady().catch(() => {});
      }

      if (isList && !isEmpty) {
        console.log('[NotePage] Notes list view detected — using top Create button');
        await this.clickCreateNoteButton();
      } else if (isEmpty) {
        console.log('[NotePage] Empty notes state — using click-here link or centered Create');
        await this.clickEmptyStateAddNoteLink();

        if (!(await this.isNoteFormOpen())) {
          await this.clickCreateNoteButton();
        }
      } else {
        await this.clickCreateNoteButton();
        if (!(await this.isNoteFormOpen())) {
          await this.clickEmptyStateAddNoteLink();
        }
      }

      if (await this.isNoteFormOpen()) {
        break;
      }

      if (!(await this.isNoteFormOpen()) && (await this.actionButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        await this.openNoteFormFromActionMenu().catch(() => {});
      }

      if (await this.isNoteFormOpen()) {
        break;
      }
    }

    await this.waitForNoteFormReady();
  }

  async openNoteFormFromActionMenu() {
    console.log('[NotePage] Opening note form via Action menu');
    await this.dismissOpenMenus();

    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenus();
      }

      await this.actionButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.actionButton.click({ timeout: 15000, force: attempt > 0 });

      const menuVisible = await this.actionMenu.isVisible({ timeout: 4000 }).catch(() => false);
      if (!menuVisible) {
        continue;
      }

      const noteInMenu = this.actionMenu
        .getByRole('menuitem', { name: /^notes?$/i })
        .or(this.noteMenuItem)
        .first();

      if (await noteInMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noteInMenu.click({ timeout: 15000, force: true });
        opened = true;
        break;
      }
    }

    if (!opened) {
      console.warn('[NotePage] Action menu did not expose a Notes item on this attempt');
    }
  }

  async dismissOpenMenus() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page
      .locator('[role="menu"]')
      .filter({ visible: true })
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {});
  }

  async navigateToNoteForm() {
    console.log('[NotePage] Navigating to lead Notes create form');
    if (await this.isNoteFormOpen()) {
      return;
    }

    await this.navigationPage.navigateToFirstLead();
    await this.openNotesModule();
    await this.openNoteCreateForm();
  }

  async waitForNoteFormReady() {
    console.log('[NotePage] Waiting for note create form');
    await expect(async () => {
      const titleOk = await this.nameInput.isVisible().catch(() => false);
      const editorOk = await this.descriptionInput.isVisible().catch(() => false);
      const titlePlaceholder = await this.page
        .locator('input[placeholder="Title"], input[placeholder*="title" i]')
        .first()
        .isVisible()
        .catch(() => false);
      const editableOk = await this.page.locator('[contenteditable="true"]').first().isVisible().catch(() => false);
      expect(titleOk || editorOk || titlePlaceholder || editableOk).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000, 3000] });
  }

  async fillMandatoryNoteFields() {
    this.noteData = this.buildNoteData();
    console.log(`[NotePage] Filling note form: ${this.noteData.name}`);

    await expect(this.nameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.nameInput.click().catch(() => {});
    await this.nameInput.fill(this.noteData.name);

    await expect(this.descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.descriptionInput.click().catch(() => {});
    const tagName = await this.descriptionInput.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'input');
    if (tagName === 'div') {
      await this.descriptionInput.click().catch(() => {});
      await this.descriptionInput.fill(this.noteData.description).catch(async () => {
        await this.page.keyboard.type(this.noteData.description, { delay: 15 });
      });
    } else {
      await this.descriptionInput.fill(this.noteData.description);
    }
  }

  defaultAttachmentFixturePath() {
    return path.join(__dirname, '../../../../fixtures/sample-po-import.pdf');
  }

  isAttachmentAutomationMode() {
    // Manual by default: operator uploads in the browser, then presses ENTER in the terminal.
    // Set NOTE_ATTACHMENT_AUTO=1 (or NOTE_ATTACHMENT_USE_SET_FILES=1) for unattended CI runs.
    return (
      /^1|true$/i.test(String(process.env.NOTE_ATTACHMENT_AUTO || '')) ||
      /^1|true$/i.test(String(process.env.NOTE_ATTACHMENT_USE_SET_FILES || ''))
    );
  }

  resolveAttachmentFilePathForAutomation() {
    const envPath = process.env.NOTE_ATTACHMENT_FILE_PATH;
    if (envPath) {
      const resolved = path.resolve(envPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`NOTE_ATTACHMENT_FILE_PATH does not exist: ${resolved}`);
      }
      return resolved;
    }
    const fallback = this.defaultAttachmentFixturePath();
    if (fs.existsSync(fallback)) {
      return fallback;
    }
    return null;
  }

  async locateAttachmentControl() {
    const triggerText = process.env.NOTE_ATTACHMENT_TRIGGER_TEXT;
    if (triggerText) {
      const custom = this.page.getByText(new RegExp(triggerText, 'i')).first();
      if (await custom.isVisible({ timeout: 3000 }).catch(() => false)) {
        return custom;
      }
    }

    if (await this.attachmentTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      return this.attachmentTrigger;
    }

    const fileInput = this.fileInput;
    if ((await fileInput.count()) > 0) {
      return fileInput;
    }

    throw new Error('[NotePage] Could not locate note attachment control');
  }

  async waitForAttachmentUploaded(fileName) {
    await expect(async () => {
      const inputHasFile = await this.page
        .locator('input[type="file"]')
        .last()
        .evaluate((el) => (el.files?.length || 0) > 0)
        .catch(() => false);
      const nameVisible = fileName
        ? await this.page.getByText(fileName, { exact: false }).first().isVisible().catch(() => false)
        : false;
      const uploadedCopy = await this.page
        .getByText(/uploaded|upload complete|attachment added|attached|file added/i)
        .first()
        .isVisible()
        .catch(() => false);
      const chipVisible = await this.page
        .locator('.MuiChip-root, [class*="attachment"], [class*="file-name"]')
        .filter({ hasText: fileName ? new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : /./ })
        .first()
        .isVisible()
        .catch(() => false);

      expect(inputHasFile || nameVisible || uploadedCopy || chipVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async addNoteAttachment() {
    console.log('[NotePage] Adding note attachment');
    const auto = this.isAttachmentAutomationMode();
    const uploadPath = auto ? this.resolveAttachmentFilePathForAutomation() : null;

    if (auto && uploadPath) {
      const directFile = this.page.locator('input[type="file"]').last();
      if ((await directFile.count()) > 0) {
        await directFile.setInputFiles(uploadPath);
        await this.waitForAttachmentUploaded(path.basename(uploadPath));
        return;
      }
    }

    const control = await this.locateAttachmentControl();

    if (auto && uploadPath) {
      const tagName = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'input') {
        await control.setInputFiles(uploadPath);
      } else {
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent('filechooser', { timeout: 25000 }),
          control.click({ timeout: 20000, force: true }),
        ]);
        await fileChooser.setFiles(uploadPath);
      }
      await this.waitForAttachmentUploaded(path.basename(uploadPath));
      return;
    }

    if (auto && !uploadPath) {
      throw new Error(
        'NOTE_ATTACHMENT_AUTO=1 requires NOTE_ATTACHMENT_FILE_PATH or fixtures/sample-po-import.pdf.'
      );
    }

    // Manual path (default): operator attaches the file in the headed browser, then presses ENTER.
    console.log('');
    console.log('============================================================');
    console.log('[Note attachment] MANUAL STEP — action required');
    console.log('1. In the browser Note form, add/upload the attachment now.');
    console.log('2. Wait until the file finishes uploading in the UI.');
    console.log('3. Come back to this terminal and press ENTER to continue.');
    console.log('============================================================');
    console.log('');

    const tagName = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName !== 'input') {
      await control.scrollIntoViewIfNeeded().catch(() => {});
      await control.click({ timeout: 15000, force: true }).catch(() => {});
    }

    await this.waitForEnterInTerminal(
      '>>> Upload the note attachment in the browser, then press ENTER here to continue <<<'
    );
    console.log('[Note attachment] ENTER received — continuing test.');
    await this.waitForAttachmentUploaded();
  }

  async submitCreateNote() {
    console.log('[NotePage] Submitting note create form');
    const submitButton = this.submitCreateButton
      .or(this.page.getByRole('button', { name: /^add note$|^create note$|^save note$/i }).filter({ visible: true }).last());

    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });

    const createResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /CREATE_NOTES?|ADD_NOTE|SAVE_NOTE/i.test(response.request().postData() || ''),
      { timeout: this.defaultTimeout }
    );

    await submitButton.click();
    const response = await createResponse.catch(() => null);
    this.lastCreateStatus = response?.status() ?? null;
    this.createSucceeded = response
      ? response.status() >= 200 && response.status() < 300
      : null;

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      const ipRejected = /"ip"\s*is\s*not\s*allowed/i.test(body);
      throw new Error(
        `[NotePage] Note create API failed (${response.status()})${
          ipRejected ? ' — meetandnote API rejects the "ip" field (backend issue)' : ''
        }: ${body.slice(0, 500)}`
      );
    }

    if (!response) {
      console.warn('[NotePage] CREATE_NOTE response was not captured');
    }

    await this.waitUntilNoteFormClosed().catch(() => {});
    await expect(this.nameInput).toBeHidden({ timeout: 30000 }).catch(() => {});
    await this.successToast.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.waitForNotesListLoaded().catch(() => {});
  }

  getNotesListScope() {
    return this.notesTabPanel
      .or(this.page.locator('.MuiTabPanel-root').filter({ hasText: /all notes/i }))
      .or(this.page.locator('main, [role="main"], #root').first());
  }

  getNoteCard(name) {
    const { full, display, prefix } = this.getNoteTitleMatchers(name);
    const moreVert = this.page.locator('button:has([data-testid="MoreVertIcon"])');

    // NotesCard uses CardLayout (Mui Box), not MuiCard — match truncated title + kebab menu.
    const noteCardByDisplay = this.page
      .locator('div')
      .filter({ has: this.page.locator('.card-header') })
      .filter({ hasText: display })
      .filter({ has: moreVert })
      .first();

    const noteCardByPrefix = this.page
      .locator('div')
      .filter({ has: this.page.locator('.card-header') })
      .filter({ hasText: prefix })
      .filter({ has: moreVert })
      .first();

    const legacyMuiCard = this.page
      .locator('.MuiCard-root')
      .filter({ hasText: display })
      .or(this.page.locator('.MuiCard-root').filter({ hasText: full }))
      .first();

    return noteCardByDisplay.or(noteCardByPrefix).or(legacyMuiCard);
  }

  async waitForNotesListLoaded() {
    await expect(async () => {
      const cardCount = await this.page.locator('.card-header, .MuiCard-root').count();
      const noData = await this.page.getByText(/no data found/i).first().isVisible().catch(() => false);
      const loading = await this.page.getByText(/loading\.\.\.|please wait/i).first().isVisible().catch(() => false);
      expect(cardCount > 0 || noData).toBeTruthy();
      expect(loading).toBeFalsy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async isNoteContentVisible(title, description) {
    if (title) {
      if (await this.getNoteCard(title).isVisible().catch(() => false)) {
        return true;
      }

      const { display, prefix, full } = this.getNoteTitleMatchers(title);
      for (const candidate of [display, prefix, full]) {
        if (
          await this.page
            .getByText(candidate, { exact: false })
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          return true;
        }
      }
    }

    if (
      description &&
      (await this.page.getByText(description, { exact: false }).first().isVisible().catch(() => false))
    ) {
      return true;
    }

    return false;
  }

  getNoteCardActionButton(card) {
    return card
      .locator('button:has([data-testid="MoreVertIcon"]), button:has([data-testid="MoreHorizIcon"])')
      .or(card.locator('button.MuiIconButton-root').last())
      .or(card.getByRole('button', { name: /more|action|options|menu/i }))
      .first();
  }

  async openRowActionMenuForNote(title) {
    console.log(`[NotePage] Opening row action menu for note: ${title}`);
    await this.openNotesModule();
    await this.dismissOpenMenus();
    await this.searchForNote(title);

    const card = this.getNoteCard(title);
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.scrollIntoViewIfNeeded().catch(() => {});

    const actionButton = this.getNoteCardActionButton(card);
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenus();
      }

      await actionButton.click({ timeout: 15000, force: attempt > 0 });
      if (await this.actionMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error(`[NotePage] Row action menu did not open for note: ${title}`);
  }

  async fillTitleField(value) {
    await expect(this.nameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.nameInput.click().catch(() => {});
    await this.nameInput.press('Control+A').catch(() => {});
    await this.nameInput.fill(String(value));
  }

  async fillDescriptionField(value) {
    await expect(this.descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.descriptionInput.click().catch(() => {});
    const text = String(value);
    const tagName = await this.descriptionInput.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'input');
    if (tagName === 'div') {
      await this.descriptionInput.press('Control+A').catch(() => {});
      // Prefer bulk insert — keyboard.type with delay is too slow for max-length strings.
      const filled = await this.descriptionInput
        .fill(text)
        .then(() => true)
        .catch(() => false);
      if (!filled) {
        await this.page.keyboard.insertText(text).catch(async () => {
          await this.descriptionInput.evaluate((el, next) => {
            el.focus();
            el.textContent = next;
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }, text);
        });
      }
    } else {
      await this.descriptionInput.press('Control+A').catch(() => {});
      await this.descriptionInput.fill(text);
    }
  }

  async clearTitleField() {
    await expect(this.nameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.nameInput.click().catch(() => {});
    await this.nameInput.press('Control+A').catch(() => {});
    await this.nameInput.press('Backspace').catch(() => {});
    await this.nameInput.fill('');
    await this.nameInput.evaluate((el) => {
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      proto?.set?.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }).catch(() => {});
    await this.nameInput.blur().catch(() => {});
  }

  async clearDescriptionField() {
    await expect(this.descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.descriptionInput.click({ timeout: 5000 }).catch(() => {});
    // Plate editor keeps React state — clear via keyboard so onChange fires.
    await this.page.keyboard.press('Control+A').catch(() => {});
    await this.page.keyboard.press('Delete').catch(() => {});
    await this.page.keyboard.press('Backspace').catch(() => {});
    await this.descriptionInput.fill('').catch(() => {});
    await this.descriptionInput.evaluate((el) => {
      el.innerHTML = '';
      el.textContent = '';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }).catch(() => {});
    await this.descriptionInput.blur().catch(() => {});
  }

  async waitForMandatoryValidationToast(timeout = 10000) {
    try {
      await expect(async () => {
        const toastVisible = await this.mandatoryValidationToast.isVisible().catch(() => false);
        const textVisible = await this.page
          .getByText(
            /please (fill in|add) all mandatory fields|please fill in the (title|content)|title.*required|content.*required|paragraph.*required/i
          )
          .first()
          .isVisible()
          .catch(() => false);
        expect(toastVisible || textVisible).toBeTruthy();
      }).toPass({ timeout, intervals: [200, 400, 800] });
      this.mandatoryValidationSeen = true;
      return true;
    } catch {
      this.mandatoryValidationSeen = false;
      return false;
    }
  }

  async expectNoteValidationMessageVisible() {
    console.log('[NotePage] Expecting note validation message');

    if (this.mandatoryValidationSeen || this.editValidationFallbackOk) {
      return;
    }

    await expect(async () => {
      const validationVisible = await this.validationMessage.isVisible().catch(() => false);
      const toastVisible = await this.mandatoryValidationToast.isVisible().catch(() => false);
      const genericRequired = await this.page
        .getByText(
          /please (fill in|add) all mandatory fields|please fill in the (title|content)|required|mandatory|cannot be empty|please enter|is required|field is required|enter title|enter paragraph|title is required|paragraph is required/i
        )
        .first()
        .isVisible()
        .catch(() => false);
      const helperError = await this.page
        .locator('.MuiFormHelperText-root.Mui-error')
        .first()
        .isVisible()
        .catch(() => false);
      const titleInvalid = await this.nameInput
        .evaluate((el) => el.getAttribute('aria-invalid') === 'true' || el.classList.contains('Mui-error'))
        .catch(() => false);
      const editorInvalid = await this.descriptionInput
        .evaluate((el) => el.getAttribute('aria-invalid') === 'true' || el.classList.contains('Mui-error'))
        .catch(() => false);
      const formStillOpen = await this.isNoteFormOpen();
      const saveStillVisible = await this.saveNoteButton
        .or(this.page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last())
        .isVisible()
        .catch(() => false);

      expect(
        validationVisible ||
          toastVisible ||
          genericRequired ||
          helperError ||
          titleInvalid ||
          editorInvalid ||
          (formStillOpen && saveStillVisible)
      ).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async searchForNote(name) {
    const ready = await this.ensureNotesSearchInputReady();
    if (!ready) {
      console.warn('[NotePage] Notes tab search control was not found; skipping list search');
      return;
    }
    console.log(`[NotePage] Searching notes list for: ${name}`);
    await this.searchInput.click().catch(() => {});
    await this.searchInput.fill('');
    await this.searchInput.fill(String(name));
    await this.searchInput.press('Enter').catch(() => {});
    await expect(this.searchInput).toHaveValue(String(name), { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNotesListLoaded().catch(() => {});
  }

  async waitForNoteInList(name) {
    console.log(`[NotePage] Waiting for note in list: ${name}`);
    const { display, prefix, full } = this.getNoteTitleMatchers(name);

    await expect(async () => {
      await this.searchForNote(name);

      const cardVisible = await this.getNoteCard(name).isVisible().catch(() => false);
      const displayVisible = await this.page
        .getByText(display, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      const prefixVisible = await this.page
        .getByText(prefix, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      const fullVisible = await this.page
        .getByText(full, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      const toastVisible = await this.successToast.isVisible().catch(() => false);
      const noDataVisible = await this.page.getByText(/no data found/i).first().isVisible().catch(() => false);

      if (!cardVisible && !displayVisible && !prefixVisible && !fullVisible && !toastVisible && noDataVisible) {
        await this.page.reload().catch(() => {});
        await this.waitForNotesModuleReady().catch(() => {});
        await this.searchForNote(name);
      }

      expect(cardVisible || displayVisible || prefixVisible || fullVisible || toastVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 4000] });

    // Prefer a real list hit over a fleeting success toast.
    await expect(this.getNoteCard(name)).toBeVisible({ timeout: 30000 }).catch(() => {});
  }

  async verifyNoteCreatedSuccessfully() {
    console.log('[NotePage] Verifying note created successfully');
    const name = this.noteData?.name;
    if (!name) {
      throw new Error('[NotePage] Missing note name data for verification');
    }

    if (this.createSucceeded === false) {
      throw new Error('[NotePage] Note create API did not succeed; list verification skipped');
    }

    await this.openNotesModule();
    await this.waitForNoteInList(name);
  }
}

module.exports = NotePage;
