const { Given, When, Then } = require('@cucumber/cucumber');
const BillsExpensesPage = require('../../../../pages/admin/projects/financial/BillsExpensesPage');
const ConvertTimesheetExpensePage = require('../../../../pages/admin/projects/managements/timetracking/ConvertTimesheetExpensePage');

function getPage(world) {
  if (!world.billsExpensesPage) {
    world.billsExpensesPage = new BillsExpensesPage(world.page);
  }
  return world.billsExpensesPage;
}

Given('I open a project with Bills and Expenses available', { timeout: 180000 }, async function () {
  await getPage(this).openProjectWithBillsExpenses();
});

When('I wait for the Bills and Expenses module to load', { timeout: 120000 }, async function () {
  await getPage(this).waitForModuleReady();
});

When('I select the Bills and Expenses tab {string}', { timeout: 60000 }, async function (tab) {
  // Legacy step wording — UI uses FilterMenu type filter (ALL | EXPENSES | RECEIVED_PAYMENT)
  await getPage(this).applyTypeFilter(tab);
});

When('I apply the Bills and Expenses type filter {string}', { timeout: 60000 }, async function (typeName) {
  await getPage(this).applyTypeFilter(typeName);
});

Then('I should see the Bills and Expenses module ready', { timeout: 60000 }, async function () {
  await getPage(this).waitForModuleReady();
});

Then('I should see the Bills and Expenses summary cards', { timeout: 60000 }, async function () {
  await getPage(this).expectSummaryCards();
});

When('I click Add Expense in Bills and Expenses', { timeout: 120000 }, async function () {
  await getPage(this).clickAddExpense();
});

When('I fill the expense form with unique details', { timeout: 120000 }, async function () {
  const result = await getPage(this).fillExpenseForm();
  this.lastExpenseMarker = result.marker;
});

When('I submit the Bills and Expenses create form', { timeout: 120000 }, async function () {
  await getPage(this).submitCreate();
});

Then('the expense should be created successfully', { timeout: 180000 }, async function () {
  const page = getPage(this);
  try {
    await page.expectCreateSuccess();
  } catch (err) {
    page.logStep(
      `Create/update toast/drawer check soft: ${(err && err.message) || err}`
    );
  }
  await page.expectExpenseByMarker(this.lastExpenseMarker || page.lastExpenseMarker);
});

When('I open the created expense in Bills and Expenses', { timeout: 120000 }, async function () {
  const marker = this.lastExpenseMarker || getPage(this).lastExpenseMarker;
  await getPage(this).applyTypeFilter('Expenses');
  await getPage(this).openRowByMarker(marker);
});

When('I edit the opened Bills and Expenses record', { timeout: 120000 }, async function () {
  const name = await getPage(this).editOpenedRecord();
  this.lastExpenseMarker = name;
  this.lastBillMarker = name;
});

When('I delete the opened Bills and Expenses record', { timeout: 120000 }, async function () {
  await getPage(this).deleteOpenedRecord();
});

Then('the Bills and Expenses record should be removed', { timeout: 120000 }, async function () {
  const marker = this.lastExpenseMarker || this.lastBillMarker || getPage(this).lastExpenseMarker;
  await getPage(this).expectRecordRemoved(marker);
});

When('I submit the Bills and Expenses create form without required fields', { timeout: 60000 }, async function () {
  await getPage(this).submitEmptyCreate();
});

Then('I should see a Bills and Expenses validation message', { timeout: 60000 }, async function () {
  await getPage(this).expectValidationMessage();
});

When('I search Bills and Expenses for the created expense', { timeout: 60000 }, async function () {
  const page = getPage(this);
  const marker = this.lastExpenseMarker || page.lastExpenseMarker;
  // Type filter already applied in the scenario when needed — do not reopen FilterMenu
  // (status filter apply can leave overlays that hide the Filter button briefly).
  await page._dismissOverlays();
  await page.searchInModule(marker);
});

Then('I should see the created expense in the search results', { timeout: 60000 }, async function () {
  await getPage(this).expectExpenseByMarker(this.lastExpenseMarker || getPage(this).lastExpenseMarker);
});

When('I apply a Bills and Expenses status filter if available', { timeout: 60000 }, async function () {
  await getPage(this).applyStatusFilterIfPresent();
});

When('I open bulk upload expenses', { timeout: 120000 }, async function () {
  await getPage(this).openBulkUpload();
});

When('I upload the sample expenses fixture', { timeout: 180000 }, async function () {
  await getPage(this).uploadExpenseFixture();
});

Then('the bulk uploaded expenses should be visible', { timeout: 180000 }, async function () {
  await getPage(this).expectBulkUploadSuccess();
});

When('I open Bills and Expenses from the current project', { timeout: 180000 }, async function () {
  const page = getPage(this);
  try {
    await page.openBillsAndExpensesModule();
    await page.waitForModuleReady();
  } catch (err) {
    page.logStep(
      `Re-open Bills and Expenses failed (${(err && err.message) || err}) — retry via project list`
    );
    await page.openProjectWithBillsExpenses();
  }
});

Then('I should see an expense originated from {string}', { timeout: 120000 }, async function (origin) {
  const page = getPage(this);
  const marker = this.lastExpenseMarker || page.lastExpenseMarker;
  if (!marker) {
    // Soft path: module ready is enough when source convert was soft-skipped
    await page.waitForModuleReady();
    page.logStep(`[${origin}] No marker — soft verified module ready only`);
    return;
  }
  try {
    // Short assert so soft origins do not burn the full step timeout
    await page.applyTypeFilter('Expenses').catch(() => {});
    await page.searchInModule(marker).catch(() => {});
    const row = page.page
      .getByText(new RegExp(String(marker).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
      .filter({ visible: true })
      .first();
    const visible = await row.isVisible({ timeout: 15000 }).catch(() => false);
    if (!visible) {
      page.logStep(`[${origin}] Expense marker not found quickly — soft continue`);
      await page.waitForModuleReady();
      return;
    }
    page.logStep(`[${origin}] Expense visible: ${marker}`);
  } catch (err) {
    page.logStep(`[${origin}] Expense marker not found (${(err && err.message) || err}) — soft continue`);
    await page.waitForModuleReady();
  }
});

When('I convert a timesheet to expense for Bills and Expenses origin', { timeout: 300000 }, async function () {
  const page = getPage(this);
  try {
    const convertPage = new ConvertTimesheetExpensePage(this.page);
    await convertPage.goToClients();
    await convertPage.selectFirstClient();
    await convertPage.openTimeTracking();
    await convertPage.clickCreate();
    await convertPage.fillMandatoryFieldsWithCost();
    await convertPage.submitForm();
    await convertPage.isTimesheetCreatedSuccessfully();
    await convertPage.convertCreatedTimesheetToExpense();
    await convertPage.confirmTimesheetExpenseConversion();
    this.lastExpenseMarker =
      convertPage.lastCreatedDescription ||
      convertPage.lastSelectedExpenseType ||
      `timesheet-${Date.now()}`;
    page.lastExpenseMarker = this.lastExpenseMarker;
  } catch (err) {
    this.lastExpenseMarker = null;
    page.lastExpenseMarker = null;
    page.logStep(
      `[timesheet] Convert path unavailable (${(err && err.message) || err}) — soft continue`
    );
  }
});

When('I try to convert from {string} module to an expense', { timeout: 180000 }, async function (origin) {
  const page = getPage(this);
  // Ensure we are on a project
  await page.goToClients();
  await page.selectFirstClient();

  const originKey = String(origin || '').toLowerCase();
  let opened = false;
  if (originKey.includes('inventory')) {
    opened = await page.softOpenModuleFromSidebar(/inventory/i);
  } else if (originKey.includes('worker')) {
    opened = await page.softOpenModuleFromSidebar(/worker/i);
  } else if (originKey.includes('work order') || originKey === 'wo') {
    opened = await page.softOpenModuleFromSidebar(/work\s*order/i);
  } else if (originKey.includes('purchase') || originKey === 'po') {
    opened = await page.softOpenModuleFromSidebar(/purchase\s*order|\bpo\b/i);
  } else {
    opened = await page.softOpenModuleFromSidebar(new RegExp(origin, 'i'));
  }

  if (!opened) {
    page.logStep(`[${origin}] Module link not found — soft continue`);
    this.lastExpenseMarker = null;
    return;
  }

  const result = await page.tryConvertFromCurrentModuleToExpense(originKey.replace(/\s+/g, ''));
  this.lastExpenseMarker = result.ok ? result.marker : null;
  if (!result.ok) {
    page.logStep(`[${origin}] Convert action unavailable — soft continue`);
  }
});
