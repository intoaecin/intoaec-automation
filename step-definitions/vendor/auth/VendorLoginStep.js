const { Before, After, Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const VendorLoginPage = require('../../../pages/vendor/auth/VendorLoginPage');
const VendorProfilePage = require('../../../pages/vendor/profile/VendorProfilePage');
const VendorOrganizationPage = require('../../../pages/vendor/organization/VendorOrganizationPage');
const VendorProductsPage = require('../../../pages/vendor/products/VendorProductsPage');
const VendorServicesPage = require('../../../pages/vendor/services/VendorServicesPage');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const VENDOR_TEST_CASE_LOG = {
  TC01: 'TC-01 — Vendor portal login with valid credentials',
  TC02: 'TC-02 — Edit vendor My Profile with BuildCraft Solutions details',
  TC03: 'TC-03 — Change vendor password from My Profile Security',
  TC04: 'TC-04 — Update vendor My Organization Company Info',
  TC05: 'TC-05 — Update vendor My Organization Business Info',
  TC06: 'TC-06 — Update vendor My Organization Social Media links',
  TC07: 'TC-07 — Draw and update vendor My Organization E-Signature',
  TC08: 'TC-08 — Upload and update vendor My Organization E-Signature',
  TC09: 'TC-09 — Add vendor product Premium Ceramic Floor Tile from scratch',
  TC10: 'TC-10 — Add vendor service Interior Design Consultation',
};

Before({ tags: '@vendor-login' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && VENDOR_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${VENDOR_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getVendorLoginPage(world) {
  if (!world.vendorLoginPage || world.vendorLoginPage.page !== world.page) {
    world.vendorLoginPage = new VendorLoginPage(world.page);
  }
  return world.vendorLoginPage;
}

function getVendorProfilePage(world) {
  if (!world.vendorProfilePage || world.vendorProfilePage.page !== world.page) {
    world.vendorProfilePage = new VendorProfilePage(world.page);
  }
  return world.vendorProfilePage;
}

function getVendorOrganizationPage(world) {
  if (!world.vendorOrganizationPage || world.vendorOrganizationPage.page !== world.page) {
    world.vendorOrganizationPage = new VendorOrganizationPage(world.page);
  }
  return world.vendorOrganizationPage;
}

function getVendorProductsPage(world) {
  if (!world.vendorProductsPage || world.vendorProductsPage.page !== world.page) {
    world.vendorProductsPage = new VendorProductsPage(world.page);
  }
  return world.vendorProductsPage;
}

function getVendorServicesPage(world) {
  if (!world.vendorServicesPage || world.vendorServicesPage.page !== world.page) {
    world.vendorServicesPage = new VendorServicesPage(world.page);
  }
  return world.vendorServicesPage;
}

async function recoverVendorPage(world) {
  if (world.page && !world.page.isClosed()) return;
  console.log('[Vendor] Page was closed — reopening a vendor browser page');
  await world.init();
}

Given('I am logged in to the vendor portal', async function () {
  const vendorLoginPage = getVendorLoginPage(this);
  const testData = require('../../../utils/testData');
  await vendorLoginPage.ensureAuthenticated(
    testData.vendor.validUser.email,
    testData.vendor.validUser.password
  );
});

When('I navigate to the Vendor login page', async function () {
  await recoverVendorPage(this);
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.navigateToLoginPage();
});

Then('the Vendor Login page should be displayed', async function () {
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.expectLoginPageDisplayed();
});

When('I enter the vendor email {string}', async function (email) {
  await recoverVendorPage(this);
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.fillEmail(email);
});

When('I enter the vendor password {string}', async function (password) {
  await recoverVendorPage(this);
  const vendorLoginPage = getVendorLoginPage(this);
  if (!(await vendorLoginPage._isOnLoginPage())) {
    await vendorLoginPage.navigateToLoginPage();
  }
  await vendorLoginPage.fillPassword(password);
});

When('I click the vendor Sign In button', async function () {
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.clickSignIn();
});

Then('I should be logged in to the vendor portal successfully', async function () {
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.expectLoggedInSuccessfully();
});

Then('the Vendor Dashboard should be displayed', async function () {
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.expectDashboardDisplayed();
});

When('I navigate to the vendor My Profile page', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.navigateToMyProfile();
});

Then('the vendor My Profile page should be displayed', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectMyProfilePageDisplayed();
});

When('I click the vendor profile Edit button', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.clickEdit();
});

Then('the vendor profile edit page should be displayed', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectEditProfilePageDisplayed();
});

When('I fill the vendor profile first name with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillFirstName(value);
});

When('I fill the vendor profile last name with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillLastName(value);
});

When('I fill the vendor profile email with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillEmail(value);
});

When('I fill the vendor profile mobile number with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillMobileNumber(value);
});

When('I fill the vendor profile organization with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillOrganization(value);
});

When('I fill the vendor profile designation with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillDesignation(value);
});

When('I fill the vendor profile address line 1 with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillAddressLine1(value);
});

When('I fill the vendor profile address line 2 with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillAddressLine2(value);
});

When('I fill the vendor profile city with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillCity(value);
});

When('I select the vendor profile state {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.selectState(value);
});

When('I select the vendor profile country {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.selectCountry(value);
});

When('I fill the vendor profile zip code with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillZipCode(value);
});

When('I fill the vendor profile experience with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillExperience(value);
});

When('I fill the vendor profile expertise with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillExpertise(value);
});

When('I fill the vendor profile skills with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillSkills(value);
});

When('I select the vendor profile industry {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.selectIndustry(value);
});

When('I fill the vendor profile website with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillWebsite(value);
});

When('I fill the vendor profile description with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillProfileDescription(value);
});

When('I click the vendor profile Save or Update button', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.clickSaveOrUpdate();
});

Then('I should see vendor profile success toast {string}', async function (message) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectSuccessToast(message);
});

Then('the updated vendor profile details should be displayed correctly', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectUpdatedProfileDetailsDisplayed();
});

When('I navigate to the vendor My Profile Security page', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.navigateToSecurity();
});

Then('the vendor Update Password section should be displayed', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectUpdatePasswordSectionDisplayed();
});

When('I fill the vendor current password with {string}', async function (value) {
  const vendorLoginPage = getVendorLoginPage(this);
  const vendorProfilePage = getVendorProfilePage(this);
  const actual = vendorLoginPage.lastPasswordUsed || value;
  if (actual !== value) {
    console.log(`[Vendor] Using last working login password as current (not "${value}")`);
  }
  await vendorProfilePage.fillCurrentPassword(actual);
});

When('I fill the vendor new password with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillNewPassword(value);
});

When('I fill the vendor confirm new password with {string}', async function (value) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.fillConfirmNewPassword(value);
});

When('I click the vendor Change Password button', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.clickChangePassword();
});

Then('the vendor password should be changed successfully', async function () {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectPasswordChangedSuccessfully();
});

Then('I should see vendor password success toast {string}', async function (message) {
  const vendorProfilePage = getVendorProfilePage(this);
  await vendorProfilePage.expectSuccessToast(message);
});

When('I log out of the vendor portal', async function () {
  await recoverVendorPage(this);
  const vendorLoginPage = getVendorLoginPage(this);
  await vendorLoginPage.logout();
});

When('I navigate to the vendor My Organization page', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.navigateToMyOrganization();
});

Then('the vendor My Organization page should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectMyOrganizationPageDisplayed();
});

When('I click the vendor Company Info tab', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickCompanyInfoTab();
});

Then('the vendor Company Info section should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectCompanyInfoSectionDisplayed();
});

Then('the vendor Vendor Type field should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectVendorTypeFieldDisplayed();
});

Then('the vendor Registration Number field should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectRegistrationNumberFieldDisplayed();
});

Then('the vendor Categories field should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectCategoriesFieldDisplayed();
});

When('I fill the vendor registration number with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillRegistrationNumber(value);
});

When('I click vendor Add categories', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickAddCategories();
});

When('I select the vendor organization category {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.selectCategory(value);
});

Then('the vendor category {string} should be added successfully', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectCategoryAdded(value);
});

When('I click the vendor organization Update button', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickUpdate();
});

Then('I should see vendor organization success toast {string}', async function (message) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectSuccessToast(message);
});

Then(
  'the vendor registration number {string} and category {string} should be displayed correctly',
  async function (registrationNumber, category) {
    const vendorOrganizationPage = getVendorOrganizationPage(this);
    await vendorOrganizationPage.expectUpdatedCompanyInfoDisplayed(registrationNumber, category);
  }
);

When('I click the vendor Business Info tab', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickBusinessInfoTab();
});

Then('the vendor Business Info section should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectBusinessInfoSectionDisplayed();
});

When('I fill the vendor organization address line 1 with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillAddressLine1(value);
});

When('I fill the vendor organization address line 2 with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillAddressLine2(value);
});

When('I fill the vendor organization city with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillCity(value);
});

When('I select the vendor organization state {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.selectState(value);
});

When('I select the vendor organization country {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.selectCountry(value);
});

When('I fill the vendor organization zip code with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillZipCode(value);
});

Then(
  'the vendor Business Info should show address {string}, {string}, city {string}, state {string}, country {string} and zip {string}',
  async function (addressLine1, addressLine2, city, state, country, zip) {
    const vendorOrganizationPage = getVendorOrganizationPage(this);
    await vendorOrganizationPage.expectUpdatedBusinessInfoDisplayed({
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zip,
    });
  }
);

When('I click the vendor Social Media tab', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickSocialMediaTab();
});

Then('the vendor Social Media Links section should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectSocialMediaLinksSectionDisplayed();
});

When('I fill the vendor Facebook URL with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillSocialFacebook(value);
});

When('I fill the vendor Twitter URL with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillSocialTwitter(value);
});

When('I fill the vendor LinkedIn URL with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillSocialLinkedIn(value);
});

When('I fill the vendor Instagram URL with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillSocialInstagram(value);
});

When('I fill the vendor Public Profile URL with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillSocialPublicProfile(value);
});

When('I fill the vendor Website or Blog URL with {string}', async function (value) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.fillSocialWebsite(value);
});

Then('the vendor social media links should be saved successfully', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectSocialMediaSaved();
});

When('I refresh the vendor organization page', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.refreshOrganizationPage();
});

Then('the vendor social media URLs should be displayed correctly', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectSocialMediaUrlsDisplayed();
});

When('I click the vendor E-Signature tab', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickESignatureTab();
});

Then('the vendor Admin Digital Signature section should be displayed', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectAdminDigitalSignatureSectionDisplayed();
});

When('I click the vendor E-Signature Draw option', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickESignatureDraw();
});

When('I draw a sample signature in the vendor signature area', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.drawSampleSignature();
});

Then('the vendor drawn signature should be displayed in the signature area', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectDrawnSignatureVisible();
});

When('I click the vendor E-Signature Update button', { timeout: 120000 }, async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickESignatureUpdate();
});

Then('the vendor digital signature should be updated successfully', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectDigitalSignatureUpdated();
});

Then('the vendor updated signature should be displayed under Existing Digital Signature', { timeout: 120000 }, async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectExistingDigitalSignatureDisplayed();
});

When('I click the vendor E-Signature Upload option', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickESignatureUpload();
});

When('I click the vendor signature upload area', async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.clickSignatureUploadArea();
});

When('I upload the vendor signature file {string}', { timeout: 120000 }, async function (fileName) {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.uploadSignatureFile(fileName);
});

Then('the vendor uploaded signature should be displayed in the signature area', { timeout: 120000 }, async function () {
  const vendorOrganizationPage = getVendorOrganizationPage(this);
  await vendorOrganizationPage.expectUploadedSignatureVisible();
});

When('I navigate to the vendor Products page', async function () {
  await recoverVendorPage(this);
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.navigateToProducts();
});

Then('the vendor Products page should be displayed', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectProductsPageDisplayed();
});

When('I click the vendor Add Product button', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.clickAddProduct();
});

Then('the vendor product creation options should be displayed', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectCreationOptionsDisplayed();
});

When('I select vendor Start From Scratch', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.selectStartFromScratch();
});

Then('the vendor Start From Scratch option should be selected', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectStartFromScratchSelected();
});

When('I click the vendor Proceed button', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.clickProceed();
});

Then('the vendor Create New Product page should be displayed', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectCreateNewProductPageDisplayed();
});

Then('the vendor Product Information section should be displayed', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectProductInformationSectionDisplayed();
});

When('I fill the vendor product name with {string}', async function (name) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.fillProductName(name);
});

When('I select the vendor product category {string}', async function (category) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.selectCategory(category);
});

When('I select the vendor product sub category {string}', async function (subCategory) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.selectSubCategory(subCategory);
});

When('I fill the vendor product quantity with {string}', async function (quantity) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.fillQuantity(quantity);
});

When('I fill the vendor product brand with {string}', async function (brand) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.fillBrand(brand);
});

When('I fill the vendor product description with {string}', async function (description) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.fillDescription(description);
});

Then('the vendor entered product information should be displayed correctly', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectEnteredProductInformationDisplayed();
});

When('I click the vendor product Save button', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.clickSave();
});

Then('the vendor product should be created successfully', async function () {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectProductCreated();
});

Then('I should see vendor product success toast {string}', async function (message) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectSuccessToast(message);
});

Then('the vendor product {string} should be displayed in the Product List', async function (name) {
  const vendorProductsPage = getVendorProductsPage(this);
  await vendorProductsPage.expectProductInList(name);
});

When('I navigate to the vendor Services page', async function () {
  await recoverVendorPage(this);
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.navigateToServices();
});

Then('the vendor Services page should be displayed', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.expectServicesPageDisplayed();
});

When('I click the vendor Add Service button', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.clickAddService();
});

Then('the vendor Create New Service page should be displayed', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.expectCreateNewServicePageDisplayed();
});

When('I fill the vendor service name with {string}', async function (name) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.fillServiceName(name);
});

When('I select the vendor service category {string}', async function (category) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.selectServiceCategory(category);
});

When('I select the vendor service type {string}', async function (type) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.selectServiceType(type);
});

When('I fill the vendor service description with {string}', async function (description) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.fillDescription(description);
});

When('I select the vendor service pricing module {string}', async function (moduleName) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.selectPricingModule(moduleName);
});

When('I fill the vendor service price with {string}', async function (price) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.fillPrice(price);
});

When('I enable the vendor service Taxable option', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.enableTaxable();
});

Then('the vendor entered service details should be displayed correctly', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.expectEnteredServiceDetailsDisplayed();
});

When('I click the vendor service Save button', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.clickSave();
});

Then('the vendor service should be created successfully', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.expectServiceCreated();
});

Then('I should see vendor service success toast {string}', async function (message) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.expectSuccessToast(message);
});

When('I navigate back to the vendor Service List', async function () {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.navigateBackToServiceList();
});

Then('the vendor service {string} should be displayed in the Service List', async function (name) {
  const vendorServicesPage = getVendorServicesPage(this);
  await vendorServicesPage.expectServiceInList(name);
});

After({ tags: '@vendor-login and @TC03', timeout: 180000 }, async function () {
  const testData = require('../../../utils/testData');
  const original = testData.vendor.validUser.password;
  try {
    await recoverVendorPage(this);
    const vendorLoginPage = getVendorLoginPage(this);
    const vendorProfilePage = getVendorProfilePage(this);
    await vendorProfilePage._dismissBlockingOverlays();
    await vendorLoginPage.ensureAuthenticated(
      testData.vendor.validUser.email,
      vendorProfilePage.lastNewPassword || original
    );
    await vendorProfilePage._dismissBlockingOverlays();
    await vendorProfilePage.navigateToSecurity();
    const current = vendorLoginPage.lastPasswordUsed || vendorProfilePage.lastNewPassword || original;
    if (current === original) {
      console.log('[Vendor] Original vendor password already in use after TC-03');
      return;
    }
    await vendorProfilePage.fillCurrentPassword(current);
    await vendorProfilePage.fillNewPassword(original);
    await vendorProfilePage.fillConfirmNewPassword(original);
    await vendorProfilePage.clickChangePassword();
    console.log('[Vendor] Restored original vendor password after TC-03');
  } catch (err) {
    console.log(`[Vendor] WARN could not restore original password after TC-03: ${err.message}`);
  }
});
