const { expect } = require('@playwright/test');
const NotePage = require('./NotePage');

class EditNotePage extends NotePage {
  constructor(page) {
    super(page);
  }

  buildEditedNoteData() {
    const suffix = this.buildRandomSuffix();
    return {
      name: `Edited Note ${suffix}`,
      description: `Edited note paragraph ${suffix}`,
    };
  }

  async createNoteForEditing() {
    console.log('[EditNotePage] Creating note ready for editing');
    await this.navigateToNoteForm();
    await this.fillMandatoryNoteFields();
    await this.submitCreateNote();
    await this.verifyNoteCreatedSuccessfully();
    await this.clearNotesSearch();
  }

  async openEditForCreatedNote() {
    const title = this.noteData?.name;
    if (!title) {
      throw new Error('[EditNotePage] No created note title found. Run createNoteForEditing first.');
    }

    console.log(`[EditNotePage] Opening edit for note: ${title}`);
    await this.openRowActionMenuForNote(title);

    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();

    await this.waitForNoteFormReady();
  }

  async editNoteTitleAndParagraph() {
    this.editedNoteData = this.buildEditedNoteData();
    console.log(`[EditNotePage] Editing note to: ${this.editedNoteData.name}`);

    await this.fillTitleField(this.editedNoteData.name);
    await this.fillDescriptionField(this.editedNoteData.description);
  }

  async submitNoteUpdate() {
    console.log('[EditNotePage] Saving note update');
    const saveButton = this.saveNoteButton.or(
      this.page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last()
    );

    await expect(saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveButton).toBeEnabled({ timeout: this.defaultTimeout });

    const updateResponse = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /UPDATE_NOTE|EDIT_NOTE|SAVE_NOTE|CREATE_NOTE/i.test(response.request().postData() || ''),
        { timeout: this.defaultTimeout }
      )
      .catch(() => null);

    await saveButton.click();
    const response = await updateResponse;

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      throw new Error(`[EditNotePage] Note update failed (${response.status()}): ${body.slice(0, 500)}`);
    }

    this.updateSucceeded = response
      ? response.status() >= 200 && response.status() < 300
      : null;

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.nameInput).toBeHidden({ timeout: 30000 });
    await this.clearNotesSearch();
    await this.waitForEditedNoteInList({ timeout: 45000 });
  }

  async waitForEditedNoteInList({ timeout = 60000 } = {}) {
    const editedTitle = this.editedNoteData?.name;
    const editedDescription = this.editedNoteData?.description;
    const originalTitle = this.noteData?.name;

    if (!editedTitle && !editedDescription) {
      throw new Error('[EditNotePage] Missing edited note data for list verification');
    }

    await this.openNotesModule();
    await this.waitForNotesModuleReady();

    await expect(async () => {
      await this.clearNotesSearch();
      await this.waitForNotesListLoaded().catch(() => {});

      if (await this.isNoteContentVisible(editedTitle, editedDescription)) {
        return;
      }

      if (editedTitle) {
        await this.searchForNote(editedTitle);
        if (await this.isNoteContentVisible(editedTitle, editedDescription)) {
          return;
        }
      }

      if (originalTitle) {
        await this.clearNotesSearch();
        await this.searchForNote(originalTitle);
        if (await this.isNoteContentVisible(editedTitle, editedDescription)) {
          return;
        }
      }

      if (editedDescription) {
        await this.clearNotesSearch();
        const snippet = editedDescription.slice(0, 24);
        await this.searchForNote(snippet);
        if (await this.isNoteContentVisible(editedTitle, editedDescription)) {
          return;
        }
      }

      expect(false).toBeTruthy();
    }).toPass({ timeout, intervals: [1000, 2000, 4000] });
  }

  async verifyNoteUpdatedSuccessfully() {
    console.log('[EditNotePage] Verifying note updated successfully');
    await this.waitForEditedNoteInList({ timeout: 60000 });
  }

  async refreshNotesPage() {
    console.log('[EditNotePage] Refreshing notes page');
    let targetUrl = this.page.url();

    if (/leadmanager\/profile/i.test(targetUrl) && !/tab=Notes/i.test(targetUrl)) {
      const url = new URL(targetUrl);
      url.searchParams.set('tab', 'Notes');
      targetUrl = url.toString();
    }

    const notesApiPromise = this.page
      .waitForResponse(
        (response) => {
          const postData = response.request().postData() || '';
          const url = response.url();
          return (
            /meetandnote|\/note/i.test(url) &&
            /GET|LIST|FETCH|SELECT|CREATE_NOTE|UPDATE_NOTE|SAVE_NOTE/i.test(`${url}${postData}`)
          );
        },
        { timeout: 45000 }
      )
      .catch(() => null);

    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await notesApiPromise;
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await this.waitForNotesModuleReady();
    await this.waitForNotesListLoaded();
    await this.clearNotesSearch();
  }

  async verifyEditedNotePersistsAfterRefresh() {
    console.log('[EditNotePage] Verifying edited note persists after refresh');
    await this.waitForEditedNoteInList({ timeout: 90000 });
  }

  async clearNoteTitleAndAttemptSave() {
    console.log('[EditNotePage] Clearing note title and attempting save');
    await this.clearTitleField();
    await this.submitNoteUpdateExpectingValidation();
  }

  async clearNoteParagraphAndAttemptSave() {
    console.log('[EditNotePage] Clearing note paragraph and attempting save');
    await this.clearDescriptionField();
    await this.submitNoteUpdateExpectingValidation();
  }

  async submitNoteUpdateExpectingValidation() {
    const saveButton = this.saveNoteButton.or(
      this.page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last()
    );

    await expect(saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await saveButton.click({ timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }
}

module.exports = EditNotePage;
