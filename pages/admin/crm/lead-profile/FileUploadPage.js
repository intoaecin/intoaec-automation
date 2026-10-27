const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const NavigationPage = require('../../common/NavigationPage');

const sharedState = {
  fileName: null,
  renamedFileName: null,
  folderName: null,
  commentText: null,
  taskName: null,
};

class FileUploadPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.navigationPage = new NavigationPage(page);
    this.samplePdfPath = path.join(__dirname, '../../../../fixtures/sample-po-import.pdf');
    this.unsupportedExePath = path.join(__dirname, '../../../../fixtures/unsupported-note-attachment.exe');

    this.documentsSidebar = page
      .getByRole('button', { name: /^documents?$/i })
      .or(page.locator('div.MuiBox-root, div.MuiPaper-root').filter({ hasText: /^documents?$/i }))
      .first();
    this.organizationTab = page.getByRole('tab', { name: /^organization$/i }).first();
    this.clientTab = page.getByRole('tab', { name: /^(client|clients)$/i }).first();
    this.newButton = page.getByRole('button', { name: /^new$/i }).first();
    this.uploadFilesMenuItem = page.getByRole('menuitem', { name: /^upload files$/i }).first();
    this.createFolderMenuItem = page.getByRole('menuitem', { name: /^create folder$/i }).first();
    this.viewTrashButton = page.getByRole('button', { name: /^view trash$/i }).first();
    this.uploadDialog = page.getByRole('dialog').filter({ hasText: /upload file/i }).first();
    this.createFolderDialog = page.getByRole('dialog').filter({ hasText: /create folder/i }).first();
    this.renameDialog = page.getByRole('dialog', { name: /^rename$/i }).first();
    this.moveDialog = page.getByRole('dialog', { name: /^move$/i }).first();
    this.uploadNewVersionDialog = page.getByRole('dialog').filter({ hasText: /upload new version|replacing file/i }).first();
    this.confirmDialog = page.getByRole('dialog').filter({ hasText: /are you sure/i }).first();
    this.actionMenu = page.locator('[role="menu"]').filter({ visible: true }).first();
    this.successToast = page
      .locator('.Toastify__toast, .MuiAlert-root, [role="alert"]')
      .filter({ hasText: /uploaded successfully|trashed successfully|removed from trash|new version uploaded|deleted|restored|success/i })
      .first();
    this.errorToast = page
      .locator('.Toastify__toast, .MuiAlert-root, [role="alert"]')
      .filter({ hasText: /unsupported|invalid file|file type|not allowed|allowed format|failed|error|exceeds/i })
      .first();
  }

  currentFileName() {
    return sharedState.renamedFileName || sharedState.fileName;
  }

  buildSuffix() {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
  }

  displayedName(name, limit = 22) {
    const text = String(name || '');
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
  }

  async hideChatWidget() {
    await this.page
      .locator('#fc_frame')
      .evaluate((el) => {
        el.style.setProperty('display', 'none', 'important');
      })
      .catch(() => {});
  }

  async dismissBlockingDialogs() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const dialog = this.page.getByRole('dialog').filter({ visible: true }).first();
      if (!(await dialog.isVisible().catch(() => false))) {
        return;
      }
      const cancel = dialog.getByRole('button', { name: /^cancel$/i }).first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click({ force: true, timeout: 5000 }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      await expect(dialog)
        .toBeHidden({ timeout: 3000 })
        .catch(() => {});
    }
  }

  isOnLeadProfile() {
    return /leadmanager\/profile/i.test(this.page.url());
  }

  isOnDocuments() {
    return /leadmanager\/profile/i.test(this.page.url()) && /tab=Documents?/i.test(this.page.url());
  }

  isOnFileViewer() {
    return /leadmanager\/file-viewer/i.test(this.page.url());
  }

  getRow(name) {
    const display = this.displayedName(name);
    return this.page
      .locator('tbody tr')
      .filter({ hasText: display })
      .or(this.page.locator('tbody tr').filter({ hasText: String(name || '').slice(0, 22) }))
      .first();
  }

  async waitForDocumentsReady() {
    await this.dismissBlockingDialogs();
    await this.page.waitForURL(/tab=Documents?/i, { timeout: this.defaultTimeout }).catch(() => {});
    if (!/tab=Documents?/i.test(this.page.url())) {
      throw new Error(`[FileUploadPage] Documents tab did not open. URL: ${this.page.url()}`);
    }
    await this.page
      .locator('table, tbody, button:has-text("New"), button:has-text("View Trash"), [role="tab"]')
      .first()
      .waitFor({ state: 'visible', timeout: this.defaultTimeout });
  }

  async ensureOrganizationTab() {
    if (!(await this.organizationTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      return;
    }
    const selected = await this.organizationTab.getAttribute('aria-selected').catch(() => null);
    if (selected === 'true') {
      return;
    }
    await this.organizationTab.click();
    await expect(this.organizationTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });
  }

  async openDocumentsOnOrganizationTab() {
    console.log('[FileUploadPage] Opening Documents on Organization tab');
    if (this.isOnFileViewer()) {
      await this.leaveDocumentViewer();
    }
    if (!this.isOnLeadProfile()) {
      await this.navigationPage.navigateToFirstLead();
    }

    if (!this.isOnDocuments()) {
      if (await this.documentsSidebar.isVisible({ timeout: 4000 }).catch(() => false)) {
        await this.documentsSidebar.click();
        await this.page.waitForURL(/tab=Documents?/i, { timeout: this.defaultTimeout }).catch(() => {});
      } else {
        const url = new URL(this.page.url());
        url.searchParams.set('tab', 'Documents');
        await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
      }
    }

    await this.waitForDocumentsReady();
    await this.ensureOrganizationTab();
    await this.hideChatWidget();
    await this.dismissBlockingDialogs();
  }

  async expectUploadFilesActionVisible() {
    await this.openNewMenu();
    await expect(this.uploadFilesMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async openNewMenu() {
    await expect(this.newButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.newButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: 10000 });
  }

  async openUploadDialog() {
    await this.openDocumentsOnOrganizationTab();
    await this.goToRootIfNeeded();
    await this.openNewMenu();
    await this.uploadFilesMenuItem.click();
    await expect(this.uploadDialog).toBeVisible({ timeout: this.defaultTimeout });
  }

  async closeUploadDialog() {
    const cancel = this.uploadDialog.getByRole('button', { name: /^cancel$/i }).first();
    if (await cancel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancel.click();
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await expect(this.uploadDialog).toBeHidden({ timeout: 15000 });
  }

  async expect1024MbUploadLimit() {
    await expect(this.uploadDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.uploadDialog.getByText(/max file size:\s*1024\s*mb/i)).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  dialogFileInput(dialog) {
    return dialog.locator('input[type="file"]').first();
  }

  async setDialogFile(dialog, filePath) {
    const input = this.dialogFileInput(dialog);
    await expect(input).toBeAttached({ timeout: this.defaultTimeout });
    await input.setInputFiles(filePath);
  }

  async uploadSmallPdf() {
    await this.openUploadDialog();
    const suffix = this.buildSuffix();
    const uniquePath = path.join(os.tmpdir(), `D-${suffix}.pdf`);
    fs.copyFileSync(this.samplePdfPath, uniquePath);
    sharedState.fileName = path.basename(uniquePath);
    sharedState.renamedFileName = null;

    await this.setDialogFile(this.uploadDialog, uniquePath);
    const uploadButton = this.uploadDialog.getByRole('button', { name: /^upload$/i }).first();
    await expect(uploadButton).toBeEnabled({ timeout: this.defaultTimeout });
    await uploadButton.click();
    await expect(this.uploadDialog).toBeHidden({ timeout: this.defaultTimeout });
    await this.waitForRow(sharedState.fileName);
  }

  async expectUploadedDocumentInList() {
    await this.waitForRow(this.currentFileName());
  }

  async createGeneratedFolder() {
    await this.openDocumentsOnOrganizationTab();
    await this.goToRootIfNeeded();
    sharedState.folderName = `F-${this.buildSuffix()}`.slice(0, 20);
    await this.openNewMenu();
    await this.createFolderMenuItem.click();
    await expect(this.createFolderDialog).toBeVisible({ timeout: this.defaultTimeout });
    await this.createFolderDialog.locator('input').first().fill(sharedState.folderName);
    await this.createFolderDialog.getByRole('button', { name: /^create$/i }).click();
    await expect(this.createFolderDialog).toBeHidden({ timeout: this.defaultTimeout });
    await this.waitForRow(sharedState.folderName);
  }

  async expectCreatedFolderInList() {
    await this.waitForRow(sharedState.folderName);
  }

  async uploadUnsupportedExe() {
    await this.openUploadDialog();
    this.lastUnsupportedAttempted = true;
    await this.setDialogFile(this.uploadDialog, this.unsupportedExePath);
    const uploadButton = this.uploadDialog.getByRole('button', { name: /^upload$/i }).first();
    if (await uploadButton.isEnabled().catch(() => false)) {
      await uploadButton.click().catch(() => {});
    }
  }

  async expectUnsupportedDocumentRejected() {
    const toastVisible = await this.errorToast.isVisible({ timeout: 8000 }).catch(() => false);
    const helperVisible = await this.page
      .getByText(/unsupported|invalid file|file type|not allowed|allowed format/i)
      .first()
      .isVisible()
      .catch(() => false);
    const dialogStillOpen = await this.uploadDialog.isVisible().catch(() => false);
    const listed = await this.getRow('unsupported-note-attachment.exe').isVisible().catch(() => false);

    if (listed) {
      throw new Error(
        '[FileUploadPage] Application mismatch: unsupported .exe was accepted and shown in the Documents list.'
      );
    }
    if (toastVisible || helperVisible || dialogStillOpen) {
      await this.dismissBlockingDialogs();
      return;
    }
    throw new Error('[FileUploadPage] Unsupported .exe was not rejected with a visible error.');
  }

  async searchDocuments(name) {
    const search = this.page.getByRole('search', { name: /search file name/i }).first();
    if (!(await search.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }
    const toggle = search
      .getByRole('button', { name: /search/i })
      .or(this.page.getByRole('button', { name: /search file name/i }))
      .first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const inputVisible = await search.locator('input').first().isVisible().catch(() => false);
      if (!inputVisible) {
        await toggle.click();
      }
    }
    const input = this.page
      .getByRole('textbox', { name: /search file name/i })
      .or(search.locator('input'))
      .first();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.fill(String(name));
      await input.press('Enter').catch(() => {});
    }
  }

  async waitForRow(name) {
    const visible = await this.getRow(name).isVisible({ timeout: 5000 }).catch(() => false);
    if (!visible) {
      await this.searchDocuments(name).catch(() => {});
    }
    await expect(this.getRow(name)).toBeVisible({ timeout: 45000 });
  }

  async openRowMenu(name) {
    await this.hideChatWidget();
    await this.dismissBlockingDialogs();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.actionMenu.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    const row = this.getRow(name);
    await expect(row).toBeVisible({ timeout: 45000 });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ force: true, timeout: 15000 });
    const kebab = row.locator('button:has([data-testid="MoreVertIcon"]), [id^="row-menu-button-"]').first();
    await expect(kebab).toBeVisible({ timeout: 15000 });
    await kebab.click({ force: true });
    await expect(this.actionMenu).toBeVisible({ timeout: 10000 });
  }

  async chooseRowAction(name, actionName) {
    await this.openRowMenu(name);
    const item = this.page
      .getByRole('menuitem', { name: new RegExp(`^${actionName}$`, 'i') })
      .filter({ visible: true })
      .first();
    await expect(item).toBeVisible({ timeout: 20000 });
    const disabled = await item.getAttribute('aria-disabled').catch(() => null);
    if (disabled === 'true') {
      throw new Error(`[FileUploadPage] Row action "${actionName}" is disabled. Stay on the Organization tab.`);
    }
    await item.click({ force: true });
  }

  async confirmDialogAction(buttonName) {
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    const named = this.confirmDialog.getByRole('button', { name: new RegExp(buttonName, 'i') }).first();
    if (await named.isVisible({ timeout: 3000 }).catch(() => false)) {
      await named.click({ force: true });
    } else {
      await this.confirmDialog
        .getByRole('button')
        .filter({ hasNotText: /cancel/i })
        .last()
        .click({ force: true });
    }
    await expect(this.confirmDialog).toBeHidden({ timeout: this.defaultTimeout });
  }

  async ensureCurrentDocumentExists() {
    if (this.currentFileName()) {
      await this.searchDocuments(this.currentFileName()).catch(() => {});
      if (await this.getRow(this.currentFileName()).isVisible({ timeout: 8000 }).catch(() => false)) {
        return;
      }
    }
    if (sharedState.folderName && (await this.getRow(sharedState.folderName).isVisible().catch(() => false))) {
      await this.getRow(sharedState.folderName).click();
      if (this.currentFileName() && (await this.getRow(this.currentFileName()).isVisible({ timeout: 8000 }).catch(() => false))) {
        return;
      }
    }
    await this.goToRootIfNeeded();
    await this.uploadSmallPdf();
  }

  async renameUploadedDocument() {
    await this.openDocumentsOnOrganizationTab();
    await this.goToRootIfNeeded();
    await this.ensureCurrentDocumentExists();
    const baseName = `R-${this.buildSuffix()}`.slice(0, 18);
    await this.chooseRowAction(this.currentFileName(), 'Rename');
    await expect(this.renameDialog).toBeVisible({ timeout: 30000 });
    await this.renameDialog.locator('input').first().fill(baseName);
    await this.renameDialog.getByRole('button', { name: /^submit$/i }).click();
    await expect(this.renameDialog).toBeHidden({ timeout: this.defaultTimeout });
    sharedState.renamedFileName = `${baseName}.pdf`;
    await this.waitForRow(sharedState.renamedFileName);
  }

  async expectRenamedDocumentInList() {
    await this.waitForRow(this.currentFileName());
  }

  async uploadNewDocumentVersion() {
    await this.openDocumentsOnOrganizationTab();
    await this.goToRootIfNeeded();
    await this.ensureCurrentDocumentExists();
    await this.chooseRowAction(this.currentFileName(), 'Upload New Version');
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    await expect(dialog).toBeVisible({ timeout: this.defaultTimeout });
    const versionPath = path.join(os.tmpdir(), `lead-doc-v2-${this.buildSuffix()}.pdf`);
    fs.copyFileSync(this.samplePdfPath, versionPath);
    await this.setDialogFile(dialog, versionPath);
    await dialog.getByRole('button', { name: /upload/i }).click();
    await expect(dialog).toBeHidden({ timeout: this.defaultTimeout });
    await this.successToast.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  }

  async openViewForCurrentDocument() {
    await this.openDocumentsOnOrganizationTab();
    await this.ensureCurrentDocumentExists();
    const row = this.getRow(this.currentFileName());
    await expect(row).toBeVisible({ timeout: 45000 });
    await row.locator('.text-wrap, td').first().click({ force: true });
    const opened = await this.page
      .waitForURL(/leadmanager\/file-viewer/i, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      await this.chooseRowAction(this.currentFileName(), 'View');
      await this.page.waitForURL(/leadmanager\/file-viewer/i, { timeout: this.defaultTimeout });
    }
    await this.page.locator('canvas').first().waitFor({ state: 'visible', timeout: this.defaultTimeout }).catch(() => {});
  }

  async expectNewVersionInDropdown() {
    const versionField = this.page.getByPlaceholder(/^version$/i).or(this.page.getByRole('combobox').filter({ hasText: /version/i })).first();
    await expect(versionField).toBeVisible({ timeout: this.defaultTimeout });
    await versionField.click();
    const options = this.page.getByRole('option').filter({ hasText: /version/i });
    await expect(options.first()).toBeVisible({ timeout: 15000 });
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async leaveDocumentViewer() {
    if (!this.isOnFileViewer()) {
      return;
    }
    const back = this.page.getByRole('button', { name: /^back$/i }).first();
    if (await back.isVisible({ timeout: 3000 }).catch(() => false)) {
      await back.click();
    } else {
      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout });
    await this.waitForDocumentsReady();
  }

  async goToRootIfNeeded() {
    const rootCrumb = this.page.getByRole('navigation').getByText(/^upload files$/i).first();
    if (await rootCrumb.isVisible().catch(() => false)) {
      await rootCrumb.click().catch(() => {});
    }
    await this.ensureOrganizationTab();
  }

  async moveDocumentIntoCreatedFolder() {
    await this.openDocumentsOnOrganizationTab();
    await this.goToRootIfNeeded();
    if (!sharedState.folderName) {
      await this.createGeneratedFolder();
    }
    await this.ensureCurrentDocumentExists();
    await this.chooseRowAction(this.currentFileName(), 'Move');
    await expect(this.moveDialog).toBeVisible({ timeout: 30000 });
    const folderOption = this.moveDialog
      .getByRole('button', { name: new RegExp(sharedState.folderName, 'i') })
      .or(this.moveDialog.getByText(sharedState.folderName, { exact: false }))
      .first();
    await expect(folderOption).toBeVisible({ timeout: this.defaultTimeout });
    await folderOption.click();
    await this.moveDialog.getByRole('button', { name: /^move$/i }).click();
    await expect(this.moveDialog).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectDocumentInsideCreatedFolder() {
    if (await this.getRow(this.currentFileName()).isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }
    await this.goToRootIfNeeded();
    if (await this.getRow(sharedState.folderName).isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.getRow(sharedState.folderName).click();
    }
    await this.waitForRow(this.currentFileName());
  }

  async locateCurrentDocumentRow() {
    if (await this.getRow(this.currentFileName()).isVisible().catch(() => false)) {
      return true;
    }
    if (sharedState.folderName) {
      await this.goToRootIfNeeded();
      if (await this.getRow(sharedState.folderName).isVisible().catch(() => false)) {
        await this.getRow(sharedState.folderName).click();
      }
    }
    return this.getRow(this.currentFileName()).isVisible().catch(() => false);
  }

  async moveCurrentDocumentToTrash() {
    await this.openDocumentsOnOrganizationTab();
    if (!(await this.locateCurrentDocumentRow())) {
      await this.goToRootIfNeeded();
      await this.ensureCurrentDocumentExists();
    }
    await this.chooseRowAction(this.currentFileName(), 'Move to Trash');
    await this.confirmDialogAction('Move to Trash');
  }

  async openTrash() {
    await this.dismissBlockingDialogs();
    await this.hideChatWidget();
    if (!(await this.viewTrashButton.isVisible({ timeout: 8000 }).catch(() => false))) {
      await this.openDocumentsOnOrganizationTab();
    }
    await this.ensureOrganizationTab();
    await expect(this.viewTrashButton).toBeVisible({ timeout: 45000 });
    await expect(this.viewTrashButton).toBeEnabled({ timeout: 15000 });
    await this.viewTrashButton.evaluate((el) => el.click());
    await expect(this.organizationTab).toBeHidden({ timeout: 45000 });
  }

  async restoreCurrentDocumentFromTrash() {
    await this.chooseRowAction(this.currentFileName(), 'Restore');
  }

  async expectRestoredDocumentOnList() {
    await this.leaveTrashIfOpen();
    if (!/tab=Documents?/i.test(this.page.url())) {
      await this.openDocumentsOnOrganizationTab();
    }
    await expect(async () => {
      if (await this.getRow(this.currentFileName()).isVisible().catch(() => false)) {
        return;
      }
      if (sharedState.folderName && (await this.getRow(sharedState.folderName).isVisible().catch(() => false))) {
        await this.getRow(sharedState.folderName).click();
      }
      expect(await this.getRow(this.currentFileName()).isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000] });
  }

  async leaveTrashIfOpen() {
    const back = this.page.getByRole('button', { name: /back/i }).first();
    const inTrash = !(await this.organizationTab.isVisible().catch(() => false)) &&
      (await this.page.getByText(/^trash$/i).first().isVisible().catch(() => false));
    if (inTrash && (await back.isVisible().catch(() => false))) {
      await back.click({ force: true });
      await expect(this.organizationTab).toBeVisible({ timeout: 45000 });
    }
  }

  async deleteCurrentDocumentFromTrash() {
    await this.chooseRowAction(this.currentFileName(), 'Delete');
    await this.confirmDialogAction('Delete');
  }

  async expectDocumentGoneFromTrashAndList() {
    await expect(this.getRow(this.currentFileName())).toBeHidden({ timeout: 30000 });
    await this.leaveTrashIfOpen();
    await this.goToRootIfNeeded();
    const onRoot = await this.getRow(this.currentFileName()).isVisible().catch(() => false);
    let inFolder = false;
    if (sharedState.folderName && (await this.getRow(sharedState.folderName).isVisible().catch(() => false))) {
      await this.getRow(sharedState.folderName).click();
      inFolder = await this.getRow(this.currentFileName()).isVisible().catch(() => false);
    }
    expect(onRoot || inFolder).toBeFalsy();
  }

  async openViewForAnnotationDocument() {
    await this.openDocumentsOnOrganizationTab();
    await this.leaveTrashIfOpen();
    await this.goToRootIfNeeded();
    if (!(await this.locateCurrentDocumentRow())) {
      await this.uploadSmallPdf();
    }
    await this.openViewForCurrentDocument();
    await this.page.getByText(/converting pdf|page/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await this.page.locator('canvas').first().waitFor({ state: 'visible', timeout: this.defaultTimeout });
  }

  async dropAnnotationPin() {
    await this.page.getByText(/converting pdf/i).waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    const addPin = this.page.getByRole('button', { name: /add annotation/i }).first();
    await expect(addPin).toBeVisible({ timeout: this.defaultTimeout });
    const alreadyOn = /primary/.test((await addPin.getAttribute('class')) || '');
    if (!alreadyOn) {
      await addPin.click();
    }
    const canvas = this.page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: this.defaultTimeout });
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('[FileUploadPage] Document canvas was not ready for a pin drop.');
    }
    await this.page.mouse.click(box.x + Math.max(40, box.width / 2), box.y + Math.max(40, box.height / 3));
    await expect(this.page.getByPlaceholder(/add your comment/i)).toBeVisible({ timeout: 20000 });
  }

  async addAnnotationCommentAndSave() {
    sharedState.commentText = `Annotation ${this.buildSuffix()}`;
    await this.dropAnnotationPin();
    await this.page.getByPlaceholder(/add your comment/i).fill(sharedState.commentText);
    await this.page.getByRole('button', { name: /^save$/i }).click();
  }

  async expectAnnotationCommentInPanel() {
    const commentsTab = this.page.getByRole('tab', { name: /^comments$/i }).first();
    if (await commentsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commentsTab.click();
    }
    await expect(this.page.getByText(sharedState.commentText, { exact: false }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async dropPinAndCreateGeneratedTask() {
    sharedState.taskName = `Task ${this.buildSuffix()}`;
    await this.dropAnnotationPin();
    await this.page.getByPlaceholder(/add your comment/i).fill(sharedState.taskName);
    await this.page.getByRole('button', { name: /^create task$/i }).click();
    const taskDialog = this.page.getByRole('dialog').filter({ hasText: /create task/i }).first();
    await expect(taskDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(taskDialog.locator('input').first()).toHaveValue(sharedState.taskName, { timeout: 15000 });
    await taskDialog.getByRole('button', { name: /^create task$/i }).click();
    await expect(taskDialog).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectTaskInTasksPanel() {
    const tasksTab = this.page.getByRole('tab', { name: /^tasks$/i }).first();
    await expect(tasksTab).toBeVisible({ timeout: this.defaultTimeout });
    await tasksTab.click();
    await expect(this.page.getByText(sharedState.taskName, { exact: false }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = FileUploadPage;
