const { expect } = require('@playwright/test');
const NotePage = require('./NotePage');

class DeleteNotePage extends NotePage {
  constructor(page) {
    super(page);
  }

  async createNoteForDeletion() {
    console.log('[DeleteNotePage] Creating note ready for deletion');
    await this.navigateToNoteForm();
    await this.fillMandatoryNoteFields();
    await this.submitCreateNote();
    await this.verifyNoteCreatedSuccessfully();
    await this.clearNotesSearch();
  }

  async openDeleteFromRowActionMenu() {
    const title = this.noteData?.name;
    if (!title) {
      throw new Error('[DeleteNotePage] No created note title found. Run createNoteForDeletion first.');
    }

    console.log(`[DeleteNotePage] Opening delete menu for note: ${title}`);
    await this.openRowActionMenuForNote(title);

    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteMenuItem.click();
  }

  async expectDeleteConfirmationPopupVisible() {
    console.log('[DeleteNotePage] Expecting delete confirmation popup');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });

    const dialogTextVisible = await this.confirmDialog
      .getByText(/delete|remove|confirm|are you sure/i)
      .first()
      .isVisible()
      .catch(() => false);
    const yesVisible = await this.confirmDialog
      .getByRole('button', { name: /^yes$/i })
      .or(this.confirmYesButton)
      .first()
      .isVisible()
      .catch(() => false);
    const cancelVisible = await this.confirmDialog
      .getByRole('button', { name: /^cancel$/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(dialogTextVisible || yesVisible || cancelVisible).toBeTruthy();
  }

  async confirmNoteDeletion() {
    console.log('[DeleteNotePage] Confirming note deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });

    const yesButton = this.confirmDialog
      .getByRole('button', { name: /^yes$|^delete$|^confirm$|^ok$/i })
      .or(this.confirmYesButton)
      .first();

    await expect(yesButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(yesButton).toBeEnabled({ timeout: this.defaultTimeout });

    const deleteResponse = this.page
      .waitForResponse(
        (response) => {
          const postData = response.request().postData() || '';
          return (
            response.request().method() === 'POST' &&
            /DELETE_NOTE|REMOVE_NOTE|UPDATE_NOTE|SAVE_NOTE|DELETE|REMOVE/i.test(postData)
          );
        },
        { timeout: 20000 }
      )
      .catch(() => null);

    await yesButton.click();
    await deleteResponse;

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.confirmDialog).toBeHidden({ timeout: 30000 }).catch(() => {});
    await this.clearNotesSearch();
  }

  async cancelNoteDeletion() {
    console.log('[DeleteNotePage] Cancelling note deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });

    const cancelButton = this.confirmDialog
      .getByRole('button', { name: /^cancel$/i })
      .or(this.confirmCancelButton)
      .first();

    await expect(cancelButton).toBeVisible({ timeout: this.defaultTimeout });
    await cancelButton.click();
    await expect(this.confirmDialog).toBeHidden({ timeout: 30000 });
    await this.dismissOpenMenus();
  }

  async verifyNoteDeletedSuccessfully() {
    const title = this.noteData?.name;
    if (!title) {
      throw new Error('[DeleteNotePage] Missing note title data for delete verification');
    }

    console.log(`[DeleteNotePage] Verifying note deleted successfully: ${title}`);
    await this.openNotesModule();
    await this.waitForNotesModuleReady();
    await this.clearNotesSearch();

    await expect(async () => {
      await this.searchForNote(title);

      const cardVisible = await this.getNoteCard(title).isVisible().catch(() => false);
      const textVisible = await this.page.getByText(title, { exact: false }).first().isVisible().catch(() => false);
      const toastVisible = await this.page
        .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
        .filter({ hasText: /delete|deleted|removed|success/i })
        .first()
        .isVisible()
        .catch(() => false);
      const genericDeletedVisible = await this.page
        .getByText(/note\s*deleted|deleted\s*successfully|removed\s*successfully|delete\s*success/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(toastVisible || genericDeletedVisible || (!cardVisible && !textVisible)).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async verifyNoteStillPresentInList() {
    const title = this.noteData?.name;
    const description = this.noteData?.description;

    if (!title) {
      throw new Error('[DeleteNotePage] Missing note title data for presence verification');
    }

    console.log(`[DeleteNotePage] Verifying note still present: ${title}`);
    await this.openNotesModule();
    await this.waitForNotesModuleReady();
    await this.clearNotesSearch();

    await expect(async () => {
      await this.waitForNotesListLoaded().catch(() => {});

      if (await this.isNoteContentVisible(title, description)) {
        return;
      }

      await this.searchForNote(title);
      expect(await this.isNoteContentVisible(title, description)).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = DeleteNotePage;
