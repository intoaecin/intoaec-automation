const { Before, Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const LocationManagementPage = require('../../../../pages/admin/projects/location-management/LocationManagementPage');
const LocationSettingsPage = require('../../../../pages/admin/settings/Preferences/location-management/LocationSettingsPage');
const PreferencesPage = require('../../../../pages/admin/settings/Preferences/PreferencesPage');
const testData = require('../../../../utils/testData');
const {
  getLocationMgmtSession,
  hasReusableLocationProject,
  setLocationMgmtSession,
  markLocationMgmtAddLocked,
  clearLocationMgmtSession,
} = require('../../../../support/location-mgmt-session');

setDefaultTimeout(60000);

Before({ tags: '@project-location or @location-bridge' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const ts = tags.find((t) => /^TS\d+$/i.test(t));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (ts && tc) {
    console.log(`\n>>> Project Location ${ts.toUpperCase()} ${tc.toUpperCase()} — ${pickle.name}\n`);
  }
});

function getPage(world) {
  if (!world.locationManagementPage || world.locationManagementPage.page !== world.page) {
    const previous = world.locationManagementPage;
    world.locationManagementPage = new LocationManagementPage(world.page);
    if (previous?.lastAddedLocationName) {
      world.locationManagementPage.lastAddedLocationName = previous.lastAddedLocationName;
    }
    if (previous?.selectedProjectName) {
      world.locationManagementPage.selectedProjectName = previous.selectedProjectName;
    }
    if (previous?.selectedClientName) {
      world.locationManagementPage.selectedClientName = previous.selectedClientName;
    }
    if (previous?.preferredProjectName) {
      world.locationManagementPage.preferredProjectName = previous.preferredProjectName;
    }
  }

  // Hydrate from suite session (World is new each scenario).
  const session = getLocationMgmtSession();
  if (!world.locationManagementPage.selectedProjectName && session.projectName) {
    world.locationManagementPage.selectedProjectName = session.projectName;
  }
  if (!world.locationManagementPage.selectedClientName && session.clientName) {
    world.locationManagementPage.selectedClientName = session.clientName;
  }
  return world.locationManagementPage;
}

function persistLocationFixture(page) {
  setLocationMgmtSession({
    projectName: page.selectedProjectName || '',
    clientName: page.selectedClientName || '',
    addLocked: false,
  });
}

function getSettingsPage(world) {
  if (!world.locationSettingsPage || world.locationSettingsPage.page !== world.page) {
    const previous = world.locationSettingsPage;
    world.locationSettingsPage = new LocationSettingsPage(world.page);
    if (previous?.lastCreatedLocation?.name) {
      world.locationSettingsPage.lastCreatedLocation = { ...previous.lastCreatedLocation };
    }
  }
  return world.locationSettingsPage;
}

When('I open the Location Management fixture project', { timeout: 300000 }, async function () {
  const page = getPage(this);

  // Suite-level reuse: one disposable client across scenarios while Add stays enabled.
  if (hasReusableLocationProject()) {
    const session = getLocationMgmtSession();
    const hints = [session.projectName, session.clientName].filter(
      (v, i, arr) => v && arr.indexOf(v) === i
    );
    for (const hint of hints) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const reopened = await page.reopenLocationProject(hint, { requireAddEnabled: true });
        if (reopened?.projectName) {
          if (session.clientName) page.selectedClientName = session.clientName;
          persistLocationFixture(page);
          this.lastAdminProjectName = reopened.projectName;
          console.log(`[ProjectLocation] Reused suite fixture project: ${reopened.projectName}`);
          return;
        }
        console.log(
          `[ProjectLocation] Suite fixture "${hint}" not reusable (missing or Add disabled)`
        );
      } catch (error) {
        console.log(`[ProjectLocation] Suite reuse failed for "${hint}": ${error.message || error}`);
      }
    }
    clearLocationMgmtSession();
    page.selectedProjectName = '';
    page.selectedClientName = '';
  }

  const projectName = await page.openProjectWithAddableLocation();
  persistLocationFixture(page);
  this.lastAdminProjectName = projectName;
  console.log(
    `[ProjectLocation] Created disposable Location project: ${projectName}` +
      (page.selectedClientName ? ` (client: ${page.selectedClientName})` : '')
  );
});

When('I create a disposable Location Management client', { timeout: 300000 }, async function () {
  const page = getPage(this);
  clearLocationMgmtSession();
  const projectName = await page.openProjectWithAddableLocation();
  persistLocationFixture(page);
  this.lastAdminProjectName = projectName;
  console.log(`[ProjectLocation] Created disposable Location project: ${projectName}`);
});

When('I open the project Location module', { timeout: 180000 }, async function () {
  await getPage(this).openLocationModule();
});

When('I wait for Location Management to load', { timeout: 120000 }, async function () {
  await getPage(this).waitForModuleToLoad();
});

Then('Location Management should be loaded', { timeout: 120000 }, async function () {
  await getPage(this).expectModuleLoaded();
});

Then('the Location Management Add control should be visible', { timeout: 60000 }, async function () {
  await getPage(this).expectAddVisibleOrDisabled();
});

Then('the Location Management table or empty state should be visible', { timeout: 60000 }, async function () {
  await getPage(this).expectTableOrEmptyState();
});

Then('the Location Management search control should be available', { timeout: 60000 }, async function () {
  await getPage(this).expectSearchAvailable();
});

When('I open the project Add Location dialog', { timeout: 120000 }, async function () {
  await getPage(this).clickAdd();
});

Then('the project Add Location dialog should be ready', { timeout: 60000 }, async function () {
  await getPage(this).expectAddDialogReady();
});

When('I add the first available Approved location to the project', { timeout: 180000 }, async function () {
  await getPage(this).addFirstAvailableLocation();
});

When('I cancel the project Add Location dialog', { timeout: 120000 }, async function () {
  const page = getPage(this);
  if (!(await page.addDialog.isVisible({ timeout: 2000 }).catch(() => false))) {
    await page.clickAdd();
  }
  await page.cancelAdd();
});

Then('the added project location should be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.expectRowVisible(page.lastAddedLocationName);
});

When('I search Location Management for the added location', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.search(page.lastAddedLocationName);
});

When('I search Location Management for {string}', { timeout: 120000 }, async function (text) {
  await getPage(this).search(text);
});

Then('the added project location should remain visible', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.expectRowVisible(page.lastAddedLocationName);
});

Then('Location Management should show no matching locations', { timeout: 120000 }, async function () {
  await getPage(this).expectNoMatchingLocations();
});

When('I clear the Location Management search', { timeout: 60000 }, async function () {
  await getPage(this).clearSearch();
});

When('I filter Location Management allocation by {string}', { timeout: 120000 }, async function (value) {
  await getPage(this).applyAllocationFilter(value);
});

When('I clear Location Management filters', { timeout: 120000 }, async function () {
  await getPage(this).clearFilters();
});

When('I allocate the added project location', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.allocateLocation(page.lastAddedLocationName);
  // Allocated lock disables Add — next scenario needing Add must create a new client.
  markLocationMgmtAddLocked();
  console.log('[ProjectLocation] Suite fixture marked Add-locked after allocate');
});

When('I open allocate for the added project location and cancel', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.clickAllocate(page.lastAddedLocationName);
  await page.cancelPendingAction();
});

When('I remove the added project location', { timeout: 180000 }, async function () {
  const page = getPage(this);
  await page.removeLocation(page.lastAddedLocationName);
});

When('I open remove for the added project location and cancel', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.clickRemove(page.lastAddedLocationName);
  await page.cancelPendingAction();
});

Then('the added project location should not be listed', { timeout: 120000 }, async function () {
  const page = getPage(this);
  await page.expectRowNotVisible(page.lastAddedLocationName);
});

Then('the added project location should show Allocated', { timeout: 120000 }, async function () {
  const page = getPage(this);
  const row = page.locationRow(page.lastAddedLocationName);
  await row.getByText(/allocated/i).first().waitFor({ state: 'visible', timeout: 60000 });
});

Then('the project Location Add button should be disabled', { timeout: 60000 }, async function () {
  await getPage(this).expectAddDisabled();
  markLocationMgmtAddLocked();
});

Then('Location Management guardrails should be satisfied', { timeout: 60000 }, async function () {
  await getPage(this).expectAllocatedOrBookedGuards();
});

// --- Bridge helpers ---

When('I prepare an Approved Location Pool entry for the project bridge', { timeout: 240000 }, async function () {
  const preferences = new PreferencesPage(this.page);
  const settings = getSettingsPage(this);
  await preferences.navigateToSettings();
  await preferences.selectPreferences();
  await settings.selectLocationManagement();
  const name = await settings.createPoolLocation('Bridge Loc');
  await settings.changeLocationStage(name, 'Approved');
  this.bridgeLocationName = name;
  settings.lastCreatedLocation = { name, previousName: '' };
  console.log(`[LocationBridge] Prepared Approved pool location: ${name}`);
});

When('I add the bridge Location Pool entry to the project', { timeout: 180000 }, async function () {
  const page = getPage(this);
  const name = this.bridgeLocationName || getSettingsPage(this).lastCreatedLocation.name;
  await page.clickAdd();
  await page.selectPoolLocationByName(name);
  await page.confirmAdd();
  page.lastAddedLocationName = name;
});

Given('the Location Management project fixture is {string}', async function (name) {
  // Optional preferred hint only — open step still requires Location Add enabled.
  getPage(this).preferredProjectName = String(name || testData.locationManagement?.project || '').trim();
});
