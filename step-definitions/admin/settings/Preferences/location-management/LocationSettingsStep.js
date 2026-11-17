const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const LocationSettingsPage = require('../../../../../pages/admin/settings/Preferences/location-management/LocationSettingsPage');

setDefaultTimeout(60000);

const CASE_LOG = {
  'TS01|TC01': 'TC-01 — Open Location Management; default Pool; Add visible',
  'TS01|TC02': 'TC-02 — Toggle List view ↔ Kanban view',
  'TS01|TC03': 'TC-03 — Sidebar Stages ↔ Pool and invalid-tab fallback',
  'TS02|TC01': 'TC-01 — Empty Add Location validation',
  'TS02|TC02': 'TC-02 — Invalid email/size validation',
  'TS02|TC03': 'TC-03 — Create pool location defaults to New',
  'TS02|TC04': 'TC-04 — Cancel Add leaves list unchanged',
  'TS03|TC01': 'TC-01 — Edit pool location',
  'TS03|TC02': 'TC-02 — Change stage to Approved',
  'TS03|TC03': 'TC-03 — Kanban view smoke (optional)',
  'TS04|TC01': 'TC-01 — Delete non-allocated pool location',
  'TS04|TC02': 'TC-02 — Cancel delete keeps row',
  'TS04|TC03': 'TC-03 — Allocated row edit/delete blocked',
  'TS05|TC01': 'TC-01 — Open Stages tab',
  'TS05|TC02': 'TC-02 — Default stages present / load defaults',
  'TS05|TC03': 'TC-03 — Add custom stage',
  'TS05|TC04': 'TC-04 — Edit custom stage',
  'TS05|TC05': 'TC-05 — Duplicate and max-length validation',
  'TS05|TC06': 'TC-06 — Delete unused custom stage',
  'TS05|TC07': 'TC-07 — In-use stage reassignment smoke',
  'TS05|TC08': 'TC-08 — Default stages protected',
  'TS05|TC09': 'TC-09 — Reorder optional (skipped unless stable)',
};

Before({ tags: '@location-settings or @location-pool or @location-stages' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const ts = tags.find((t) => /^TS\d+$/i.test(t));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (ts && tc) {
    const key = `${ts.toUpperCase()}|${tc.toUpperCase()}`;
    if (CASE_LOG[key]) console.log(`\n>>> ${CASE_LOG[key]}\n`);
  }
});

function getPage(world) {
  if (!world.locationSettingsPage || world.locationSettingsPage.page !== world.page) {
    const previous = world.locationSettingsPage;
    world.locationSettingsPage = new LocationSettingsPage(world.page);
    if (previous?.lastCreatedLocation?.name) {
      world.locationSettingsPage.lastCreatedLocation = { ...previous.lastCreatedLocation };
    }
    if (previous?.lastCreatedStage?.name) {
      world.locationSettingsPage.lastCreatedStage = { ...previous.lastCreatedStage };
    }
  }
  return world.locationSettingsPage;
}

When('I select Location Management', { timeout: 120000 }, async function () {
  await getPage(this).selectLocationManagement();
});

When('I open the Location Pool sidebar tab', { timeout: 120000 }, async function () {
  await getPage(this).openSidebarTab('pool');
});

When('I open the Location Stages sidebar tab', { timeout: 120000 }, async function () {
  await getPage(this).openSidebarTab('stages');
});

When('I open an invalid Location Management tab', { timeout: 120000 }, async function () {
  await getPage(this).openInvalidTabFallback();
});

When('I switch Location Pool to {string} view', { timeout: 120000 }, async function (view) {
  await getPage(this).switchPoolView(view);
});

When('I open the Add Location panel', { timeout: 120000 }, async function () {
  await getPage(this).clickAddLocation();
});

When('I submit the Add Location form empty', { timeout: 120000 }, async function () {
  await getPage(this).submitEmptyLocationForm();
});

When('I submit the Add Location form with invalid email and size', { timeout: 120000 }, async function () {
  await getPage(this).fillInvalidContactAndSize();
});

When('I create a Location Pool location', { timeout: 180000 }, async function () {
  await getPage(this).createPoolLocation('Auto Loc');
});

When('I cancel adding a Location Pool location without saving', { timeout: 120000 }, async function () {
  await getPage(this).cancelAddLocationWithoutSaving();
});

When('I edit the created Location Pool location', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.editPoolLocation(page.lastCreatedLocation.name, 'Auto Loc Edited');
});

When('I change the created Location Pool stage to Approved', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.changeLocationStage(page.lastCreatedLocation.name, 'Approved');
});

When('I reload Location Management and verify the created location', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.reloadAndExpectLocation(page.lastCreatedLocation.name);
});

When('I open delete for the created Location Pool location', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.openDeleteForLocation(page.lastCreatedLocation.name);
});

When('I confirm delete for the Location Pool location', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.confirmDeleteLocation();
  await page.expectLocationNotInList(page.lastCreatedLocation.name);
});

When('I cancel delete for the Location Pool location', { timeout: 120000 }, async function () {
  await getPage(this).cancelDeleteLocation();
});

When('I delete the created Location Pool location', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.deletePoolLocation(page.lastCreatedLocation.name);
});

When('I ensure Location default stages are present', { timeout: 180000 }, async function () {
  await getPage(this).ensureDefaultStagesPresent();
});

When('I add a custom Location stage', { timeout: 180000 }, async function () {
  await getPage(this).addCustomStage('Auto Stage');
});

When('I edit the created Location stage', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.editCustomStage(page.lastCreatedStage.name, 'Auto Stage Edited');
});

When('I validate duplicate and max-length Location stage rules', { timeout: 180000 }, async function () {
  const page = getPage(this);
  const name = page.lastCreatedStage.name || (await page.addCustomStage('Auto Stage'));
  await page.expectDuplicateStageValidation(name);
  await page.expectMaxLengthStageValidation();
});

When('I delete the created Location stage', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.deleteCustomStage(page.lastCreatedStage.name);
});

When('I verify the default Location stage New is protected', { timeout: 120000 }, async function () {
  await getPage(this).expectDefaultStageProtected('New');
});

Then('I should be on the Location Pool tab', { timeout: 120000 }, async function () {
  await getPage(this).expectOnLocationPool();
});

Then('the Location Pool Add button should be visible', { timeout: 60000 }, async function () {
  await expectVisibleAdd(getPage(this));
});

Then('the created Location Pool location should be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.expectLocationInList(page.lastCreatedLocation.name);
});

Then('the created Location Pool location should still be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.expectLocationInList(page.lastCreatedLocation.name);
});

Then('the created Location Pool location should not be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.expectLocationNotInList(page.lastCreatedLocation.name);
});

Then('the created Location Pool location should show Approved stage', { timeout: 120000 }, async function () {
  const page = getPage(this);
  const row = page.locationRow(page.lastCreatedLocation.name);
  await row.getByText(/approved/i).first().waitFor({ state: 'visible', timeout: 60000 });
});

Then('an allocated Location Pool row should block edit and delete', { timeout: 120000 }, async function () {
  const page = getPage(this);
  const allocated = this.page
    .locator('tr')
    .filter({ hasText: /allocated/i })
    .first();
  if (!(await allocated.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log('[LocationSettings] No allocated row in env — skipping lock assertion');
    return;
  }
  const name = String((await allocated.locator('td').first().innerText().catch(() => '')) || '')
    .split('\n')[0]
    .trim();
  if (name) await page.expectAllocatedRowLocked(name);
});

Then('the Location Stages defaults should be visible', { timeout: 120000 }, async function () {
  await getPage(this).ensureDefaultStagesPresent();
});

Then('the created Location stage should be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await this.page.getByText(page.lastCreatedStage.name).first().waitFor({
    state: 'visible',
    timeout: 60000,
  });
});

Then('the created Location stage should not be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  const count = await this.page
    .getByText(new RegExp(`^${page._escapeRegex(page.lastCreatedStage.name)}$`, 'i'))
    .count();
  if (count > 0) {
    throw new Error(`Stage still listed: ${page.lastCreatedStage.name}`);
  }
});

async function expectVisibleAdd(page) {
  const { expect } = require('@playwright/test');
  await expect(page.addButton).toBeVisible({ timeout: page.defaultTimeout });
}
