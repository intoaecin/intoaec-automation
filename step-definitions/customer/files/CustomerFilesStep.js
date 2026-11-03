const { When, Then } = require('@cucumber/cucumber');
const CustomerMyFilesPage = require('../../../pages/customer/files/CustomerMyFilesPage');
const AdminClientDocumentPage = require('../../../pages/admin/client/AdminClientDocumentPage');

function getCustomerMyFilesPage(world) {
  const page = world.customerPortalPage || world.page;
  if (!world.customerMyFilesPage || world.customerMyFilesPage.page !== page) {
    world.customerMyFilesPage = new CustomerMyFilesPage(page);
  }
  return world.customerMyFilesPage;
}

function getAdminClientDocumentPage(world) {
  if (!world.adminClientDocumentPage || world.adminClientDocumentPage.page !== world.page) {
    world.adminClientDocumentPage = new AdminClientDocumentPage(world.page);
  }
  return world.adminClientDocumentPage;
}

function getFolderName(world, fallback = '') {
  return world.customerFolderName || fallback;
}

function getParentFolderName(world, fallback = 'My Folder') {
  return world.customerParentFolderName || fallback;
}

function getUploadedFolderName(world) {
  return (
    world.customerUploadedFolderName ||
    (world.customerMyFilesPage && world.customerMyFilesPage.lastUploadedFolderName) ||
    'Upload Test Folder'
  );
}

When('I navigate to My Files on the customer portal', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.navigateToMyFiles();
});

When('I navigate to the customer Files section', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.navigateToFiles();
});

When('I click My Files on the customer portal', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.clickMyFiles();
});

Then('the customer My Files page should be displayed', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectMyFilesPageDisplayed();
});

When('I click Create Folder on the customer My Files page', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.clickCreateFolder();
});

When('I click Create on the customer My Files page', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.clickCreateFolder();
});

When('I enter a unique customer folder name with base {string}', { timeout: 120000 }, async function (baseName) {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  const folderName = await customerMyFilesPage.enterUniqueFolderName(baseName);
  this.customerFolderName = folderName;
});

When('I enter the customer folder name {string}', { timeout: 120000 }, async function (folderName) {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  const uniqueName = await customerMyFilesPage.enterUniqueFolderName(folderName);
  this.customerFolderName = uniqueName;
});

When('I click Create on the customer folder dialog', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.clickCreateOnFolderDialog();
  this.customerFolderName = customerMyFilesPage.lastFolderName || this.customerFolderName;
});

Then('the customer folder should be created successfully', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectFolderCreatedSuccessfully(getFolderName(this));
});

Then('the customer folder {string} should be created successfully', { timeout: 120000 }, async function (folderName) {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectFolderCreatedSuccessfully(getFolderName(this, folderName));
});

Then('the customer folder should be displayed in the My Files list', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectFolderInList(getFolderName(this));
});

Then('the customer folder {string} should be displayed in the My Files list', { timeout: 120000 }, async function (folderName) {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectFolderInList(getFolderName(this, folderName));
});

When('I open the admin project {string} for client document verification', { timeout: 180000 }, async function (projectName) {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.openProjectForClientDocumentVerification(projectName, [
    projectName,
    'kumarorganization',
    'kumar',
    'Hari',
    'john',
    'John',
    this.adminClientDisplayName,
  ]);
});

When('I navigate to the admin project Document section', { timeout: 180000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.navigateToDocumentSection();
});

When('I navigate to the admin Document Client section', { timeout: 120000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.navigateToDocumentClientSection();
});

Then('the admin client folder should be displayed', { timeout: 180000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.expectFolderDisplayed(getFolderName(this));
});

Then('the admin client folder {string} should be displayed', { timeout: 180000 }, async function (folderName) {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.expectFolderDisplayed(getFolderName(this, folderName));
});

When('I open the admin client folder', { timeout: 120000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.openFolder(getFolderName(this));
});

When('I open the admin client folder {string}', { timeout: 120000 }, async function (folderName) {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.openFolder(getFolderName(this, folderName));
});

Then('the admin client folder should be accessible', { timeout: 120000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.expectFolderAccessible(getFolderName(this));
});

Then('the admin client folder {string} should be accessible', { timeout: 120000 }, async function (folderName) {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.expectFolderAccessible(getFolderName(this, folderName));
});

When('I open the existing customer folder {string}', { timeout: 120000 }, async function (baseName) {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  const parentFolder = await customerMyFilesPage.openExistingFolder(baseName);
  this.customerParentFolderName = parentFolder;
});

When('I click Upload Folder on the customer My Files page', { timeout: 600000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.clickUploadFolder();
});

When('I wait for the customer folder selection window to open', { timeout: 600000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.waitForFolderSelectionWindow();
});

When('I pause for manual customer folder upload', { timeout: 600000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  const uploadedName = await customerMyFilesPage.waitForManualFolderUpload();
  this.customerUploadedFolderName = uploadedName;
});

When('I select the customer upload folder from the system', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  const uploadedName = await customerMyFilesPage.selectUploadFolderFromSystem();
  this.customerUploadedFolderName = uploadedName;
});

Then('the selected customer upload folder should be displayed in the upload section', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectSelectedFolderInUploadSection(getUploadedFolderName(this));
});

When('I click Upload on the customer folder upload dialog', { timeout: 120000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.clickUploadOnFolderDialog();
});

Then('the customer folder upload should complete successfully', { timeout: 180000 }, async function () {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectFolderUploadCompleted();
});

Then('the uploaded customer folder should be displayed inside {string}', { timeout: 120000 }, async function (parentName) {
  const customerMyFilesPage = getCustomerMyFilesPage(this);
  await customerMyFilesPage.expectUploadedFolderInsideParent(
    getParentFolderName(this, parentName),
    getUploadedFolderName(this)
  );
});

When('I open the admin client folder {string} in Document', { timeout: 120000 }, async function (folderName) {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  const parent = getParentFolderName(this, folderName);
  await adminClientDocumentPage.openFolder(parent);
});

Then('the admin uploaded customer folder should be displayed', { timeout: 180000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.expectUploadedFolderDisplayed(getUploadedFolderName(this));
});

When('I open the admin uploaded customer folder', { timeout: 120000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.openFolder(getUploadedFolderName(this));
});

Then('the admin uploaded customer folder should be accessible with contents', { timeout: 180000 }, async function () {
  const adminClientDocumentPage = getAdminClientDocumentPage(this);
  await adminClientDocumentPage.expectUploadedFolderAccessibleWithContents(getUploadedFolderName(this));
});
