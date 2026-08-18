const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const WarehousePage = require('../../../../pages/admin/resources/ManageWarehouse/WarehousePage');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const WAREHOUSE_TEST_CASE_LOG = {
  TC01: 'TC-01 — Add warehouse product Cement from scratch',
  TC02: 'TC-02 — Update warehouse product category to Construction Materials / Cement',
  TC03: 'TC-03 — Edit warehouse product details to Premium Cement',
  TC04: 'TC-04 — Delete first warehouse product from Product List',
  TC05: 'TC-05 — Filter warehouse products by first row Category and Subcategory',
};

Before({ tags: '@warehouse' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && WAREHOUSE_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${WAREHOUSE_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getWarehousePage(world) {
  if (!world.warehousePage || world.warehousePage.page !== world.page) {
    world.warehousePage = new WarehousePage(world.page);
  }
  return world.warehousePage;
}

When('I navigate to Manage Warehouse', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.navigateToManageWarehouse();
});

When('I navigate to the warehouse Products section', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.navigateToProductsSection();
});

When('I click the warehouse Add Product button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickAddProduct();
});

Then('the warehouse product creation options should be displayed', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectCreationOptionsDisplayed();
});

When('I select warehouse Start from Scratch', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectStartFromScratch();
});

When('I click the warehouse Proceed button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickProceed();
});

Then('the warehouse Add Product form should be displayed', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectAddProductFormDisplayed();
});

When('I fill the warehouse product name with {string}', async function (name) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.fillProductName(name);
});

When('I fill the warehouse product required fields with valid data', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.fillRequiredFields();
});

When('I click the warehouse Save button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickSave();
});

Then('I should see warehouse success toast {string}', async function (message) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectSuccessToast(message);
});

When('I refresh the warehouse product list', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.refreshProductList();
});

Then('the warehouse product {string} should be displayed in the Product List', async function (name) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectProductInList(name);
});

Then('the warehouse product details should be displayed correctly in the Product List', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectProductDetailsInList();
});

Then('the warehouse Product List should be displayed', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectProductListDisplayed();
});

When('I select the first row in the warehouse Product List', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectFirstProductRow();
});

Then('the warehouse selected product details should be displayed', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectSelectedProductDetailsDisplayed();
});

When('I click the warehouse Update Categories option', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickUpdateCategories();
});

Then('the warehouse Update Categories popup should be displayed', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectUpdateCategoriesPopupDisplayed();
});

When('I select the warehouse category {string}', async function (category) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectCategory(category);
});

When('I select the warehouse subcategory {string}', async function (subcategory) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectSubcategory(subcategory);
});

Then(
  'the warehouse selected category should be {string} and subcategory {string}',
  async function (category, subcategory) {
    const warehousePage = getWarehousePage(this);
    await warehousePage.expectSelectedCategoryAndSubcategory(category, subcategory);
  }
);

When('I click the warehouse Update Categories Update button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickUpdateCategoriesUpdate();
});

When('I select the updated warehouse product', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectUpdatedProduct();
});

Then('the warehouse product category should be {string}', async function (category) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectProductCategoryInList(category);
});

Then('the warehouse product subcategory should be {string}', async function (subcategory) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectProductSubcategoryInList(subcategory);
});

When('I click the warehouse Edit option', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickEditOption();
});

Then('the warehouse Edit Product form should be displayed with existing details', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectEditProductFormDisplayed();
});

When('I update the warehouse product name to {string}', async function (name) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductName(name);
});

When('I update the warehouse product type to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductType(value);
});

When('I update the warehouse product color to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductColor(value);
});

When('I update the warehouse product finish to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductFinish(value);
});

When('I update the warehouse product material to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductMaterial(value);
});

When('I update the warehouse product manufacturer to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductManufacturer(value);
});

When('I update the warehouse product tag to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductTag(value);
});

When('I update the warehouse product price to {string}', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.updateProductPrice(value);
});

Then('the warehouse Edit Product form should show the updated details', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectEditFormUpdatedDetails();
});

When('I click the warehouse Update button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickUpdateProduct();
});

Then('the warehouse first product row should show the updated details', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectFirstRowUpdatedDetails();
});

When('I capture the first warehouse product for deletion', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.captureFirstProductForDeletion();
});

When('I click the warehouse Delete button for the first product row', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickDeleteForFirstProductRow();
});

Then('the warehouse Delete Product confirmation popup should be displayed', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectDeleteProductPopupDisplayed();
});

When('I enter the warehouse product deletion reason {string}', async function (reason) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.fillProductDeletionReason(reason);
});

When('I enter {string} in the warehouse product deletion confirmation field', async function (value) {
  const warehousePage = getWarehousePage(this);
  await warehousePage.fillProductDeletionConfirmation(value);
});

When('I click the warehouse Delete Product confirm button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickDeleteProductConfirm();
});

Then('the deleted warehouse product should not be displayed in the Product List', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectDeletedProductNotInList();
});

When('I capture the first warehouse product category and subcategory for filter', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.captureFirstProductFilterCriteria();
});

When('I click the warehouse Filter option', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickFilterOption();
});

When('I select the warehouse filter category for the first product', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectFilterCategoryForFirstProduct();
});

When('I select the warehouse filter subcategory for the first product', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.selectFilterSubcategoryForFirstProduct();
});

When('I click the warehouse Apply filter button', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.clickApplyFilter();
});

Then('the warehouse first product row should match the selected filter category and subcategory', async function () {
  const warehousePage = getWarehousePage(this);
  await warehousePage.expectFirstRowMatchesFilterCategoryAndSubcategory();
});
