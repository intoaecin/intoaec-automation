const { Given, When, Then } = require('@cucumber/cucumber');
const FileUploadPage = require('../../../../pages/admin/crm/lead-profile/FileUploadPage');

function getFileUploadPage(world) {
  if (!world.fileUploadPage) {
    world.fileUploadPage = new FileUploadPage(world.page);
  }
  return world.fileUploadPage;
}

Given('I open lead Documents on the Organization tab', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).openDocumentsOnOrganizationTab();
});

Then('I should see the Documents Upload Files action', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectUploadFilesActionVisible();
});

When('I upload a small PDF to Documents', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).uploadSmallPdf();
});

Then('I should see the uploaded document in the list', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectUploadedDocumentInList();
});

When('I create a Documents folder with a generated name', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).createGeneratedFolder();
});

Then('I should see the created folder in the list', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectCreatedFolderInList();
});

When('I upload an unsupported exe to Documents', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).uploadUnsupportedExe();
});

Then('I should see the unsupported document rejected', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectUnsupportedDocumentRejected();
});

When('I open the Documents upload dialog', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).openUploadDialog();
});

Then('I should see the Documents 1024 MB upload limit', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expect1024MbUploadLimit();
});

When('I close the Documents upload dialog', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).closeUploadDialog();
});

When('I rename the uploaded document', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).renameUploadedDocument();
});

Then('I should see the renamed document in the list', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectRenamedDocumentInList();
});

When('I upload a new version of the document', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).uploadNewDocumentVersion();
});

When('I open View for the document', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).openViewForCurrentDocument();
});

Then('I should see the new version in the Version dropdown', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectNewVersionInDropdown();
});

When('I leave the document viewer', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).leaveDocumentViewer();
});

When('I move the document into the created folder', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).moveDocumentIntoCreatedFolder();
});

Then('I should see the document inside the created folder', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectDocumentInsideCreatedFolder();
});

When('I move the document to Trash', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).moveCurrentDocumentToTrash();
});

When('I open Documents Trash', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).openTrash();
});

When('I restore the document from Trash', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).restoreCurrentDocumentFromTrash();
});

Then('I should see the restored document on the Documents list', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectRestoredDocumentOnList();
});

When('I delete the document from Trash', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).deleteCurrentDocumentFromTrash();
});

Then('I should not see the document in Trash or the Documents list', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectDocumentGoneFromTrashAndList();
});

When('I open View for a document ready for annotation', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).openViewForAnnotationDocument();
});

When('I add an annotation pin with a comment and save it', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).addAnnotationCommentAndSave();
});

Then('I should see the annotation comment in the comments panel', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectAnnotationCommentInPanel();
});

When('I drop an annotation pin and create a task with a generated name', { timeout: 180000 }, async function () {
  await getFileUploadPage(this).dropPinAndCreateGeneratedTask();
});

Then('I should see the task in the tasks panel', { timeout: 120000 }, async function () {
  await getFileUploadPage(this).expectTaskInTasksPanel();
});
