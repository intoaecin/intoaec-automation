// step-definitions/admin/projects/ProjectProfile.steps.js
const { When } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../pages/admin/projects/ProjectProfilePage');
const SchedulePage = require('../../../pages/admin/projects/management/Schedule/SchedulePage');

When('I navigate to the Projects page', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  if (await projectProfilePage.isInsideProjectProfile()) {
    console.log('Already on project profile — skipping Projects navigation');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToProjects();
});

When('I navigate to the Admin Active Clients list', { timeout: 120000 }, async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToActiveClientsList();
});

When('I open the project {string} profile directly', { timeout: 120000 }, async function (projectName) {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.openProjectProfileDirect(projectName);
  this.lastAdminProjectName = String(projectName || '').trim();
  this.lastVendorRfqAdminProjectUrl = String(this.page.url() || '');
  try {
    const vendorRfqSession = require('../../../support/vendor-rfq-session');
    vendorRfqSession.saveAdminProject({
      url: this.lastVendorRfqAdminProjectUrl,
      name: this.lastAdminProjectName,
    });
  } catch {
    /* optional for non-Vendor-RFQ flows */
  }
  try {
    const vendorPoSession = require('../../../support/vendor-po-session');
    this.lastVendorPoAdminProjectUrl = this.lastVendorRfqAdminProjectUrl;
    vendorPoSession.saveAdminProject({
      url: this.lastVendorPoAdminProjectUrl,
      name: this.lastAdminProjectName,
    });
  } catch {
    /* optional for non-Purchase-Order flows */
  }
});

When('I open an admin project for Vendor RFQ', { timeout: 180000 }, async function () {
  const testData = require('../../../utils/testData');
  const vendorRfqSession = require('../../../support/vendor-rfq-session');
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  const configured = String(
    testData.vendor?.rfqUser?.adminProject || process.env.VENDOR_RFQ_ADMIN_PROJECT || 'any'
  ).trim();
  const useAny = !configured || /^(any|\*|first)$/i.test(configured);

  /** Admin RFQ must be a kumar Project Name (client may be John, Abu, etc.). */
  const requirePoojaa = /kumar(?!@)/i;
  const isAdityaName = (name) => /aditya[_\s-]*const|adityaconst|\bmalick\b|\bzayan\b/i.test(String(name || ''));
  const isBlockedAdityaUrl = (url) =>
    /projectId=b042a8dd-51b2-4d16-b242-405158add775/i.test(String(url || '')) ||
    /adityaconst/i.test(String(url || ''));

  const skipNames = testData.vendor?.rfqUser?.skipAdminProjects || [
    'Dev-Inprogress',
    'Dev-Inprogress - Dont touch',
    'Dont touch',
    'BBB',
    'AEC_Solutions',
    'AEC Solutions',
    'MVB',
    'Hari',
    'adityaconstructions',
    'adityaconstuctions',
    'Aditya Constructions',
    'aditya constructions',
    'malick',
    'ZAYAN',
  ];
  const preferNames = testData.vendor?.rfqUser?.preferAdminProjects || [
    'kumarorganization',
    'kumar',
  ];

  const isExcludedName = (name) => {
    const n = String(name || '').toLowerCase();
    return !n || isAdityaName(n) || !requirePoojaa.test(n) ||
      /aec[_\s-]*solutions|^bbb$|\bbb\b|mvb|hari|dev[-\s]?in[-\s]?progress|dont\s*touch/i.test(n);
  };

  // Never reuse a saved Aditya / malick project URL.
  const savedUrl = String(vendorRfqSession.getAdminProjectUrl() || '').trim();
  const savedName = String(vendorRfqSession.getAdminProjectName() || '').trim();
  if (savedUrl && (isBlockedAdityaUrl(savedUrl) || isExcludedName(savedName))) {
    console.log(
      `[VendorRFQ] Clearing saved Aditya/non-kumar session "${savedName}" — RFQ must use kumar`
    );
    vendorRfqSession.clearAdminProject();
  } else if (
    useAny &&
    savedUrl &&
    /client\/profile|projectId=/i.test(savedUrl) &&
    !isExcludedName(savedName) &&
    !isBlockedAdityaUrl(savedUrl)
  ) {
    console.log(
      `[VendorRFQ] Reusing last good kumar Admin project "${savedName}" → ${savedUrl}`
    );
    await this.page.goto(savedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const heading = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 500);
    if (isAdityaName(heading) || isBlockedAdityaUrl(this.page.url())) {
      console.log('[VendorRFQ] Saved URL opened Aditya UI — discarding and picking kumar from list');
      vendorRfqSession.clearAdminProject();
    } else {
      this.lastAdminProjectName = savedName || 'kumar project';
      this.lastVendorRfqAdminProjectUrl = String(this.page.url() || savedUrl);
      vendorRfqSession.saveAdminProject({
        url: this.lastVendorRfqAdminProjectUrl,
        name: this.lastAdminProjectName,
      });
      console.log(`[VendorRFQ] Admin project URL saved for reopen: ${this.lastVendorRfqAdminProjectUrl}`);
      return;
    }
  }

  console.log(
    `[VendorRFQ] Admin login user: ${testData.admin?.validUser?.email || 'kumar@diy.in'} — opening kumar project only`
  );

  if (useAny || /dev[-\s]?in[-\s]?progress|dont\s*touch|^bbb$|aec[_\s-]*solutions|aditya|malick/i.test(configured)) {
    let openedName = '';
    try {
      openedName = await projectNavigationPage.clickAvailableProjectSkipping({
        skipNames: useAny ? skipNames : [...skipNames, configured],
        preferNames,
        requireNamePattern: requirePoojaa,
      });
    } catch (err) {
      throw new Error(
        `Vendor RFQ needs a kumar Admin project (logged in as kumar@diy.in). ` +
          `Aditya / malick projects are blocked. ${err.message}`
      );
    }

    // Hard post-check: must have opened a kumar Project Name, never Aditya.
    const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 1200);
    const url = String(this.page.url() || '');
    const openedOk = requirePoojaa.test(String(openedName || '')) || requirePoojaa.test(body);
    if (isAdityaName(openedName) || isBlockedAdityaUrl(url) || (!openedOk && isAdityaName(body))) {
      throw new Error(
        `Opened wrong Admin project "${openedName}" (${url}). ` +
          `RFQ must open a Project Name like kumarorganization_* (client name can be John) — not adityaconstructions.`
      );
    }
    if (!openedOk) {
      console.warn(
        `[VendorRFQ] WARN opened "${openedName}" — expected Project Name matching kumar; URL=${url}`
      );
    }

    this.lastAdminProjectName = openedName || 'kumar project';
    console.log(
      `[VendorRFQ] Opened Admin project "${this.lastAdminProjectName}" (kumar only; Aditya blocked)`
    );
  } else {
    if (isAdityaName(configured) || !requirePoojaa.test(configured)) {
      throw new Error(
        `VENDOR_RFQ_ADMIN_PROJECT="${configured}" is not a kumar project — Aditya is blocked`
      );
    }
    await projectNavigationPage.openProjectProfileDirect(configured);
    this.lastAdminProjectName = configured;
    console.log(`[VendorRFQ] Opened configured Admin project "${configured}"`);
  }
  this.lastVendorRfqAdminProjectUrl = String(this.page.url() || '');
  if (isBlockedAdityaUrl(this.lastVendorRfqAdminProjectUrl)) {
    throw new Error('Blocked saving Aditya Admin project URL for Vendor RFQ');
  }
  vendorRfqSession.saveAdminProject({
    url: this.lastVendorRfqAdminProjectUrl,
    name: this.lastAdminProjectName,
  });
  console.log(`[VendorRFQ] Admin project URL saved for reopen: ${this.lastVendorRfqAdminProjectUrl}`);
});

When('I ensure the classic project profile UI is shown', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.ensureClassicProjectUi();
});

When('I click on the first project in the list', { timeout: 120000 }, async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirstProject();
});

When('I open an admin project for Purchase Order', { timeout: 180000 }, async function () {
  const testData = require('../../../utils/testData');
  const vendorPoSession = require('../../../support/vendor-po-session');
  const projectNavigationPage = new ProjectNavigationPage(this.page);

  /** Same as Vendor RFQ: kumar Project Name only (never Aditya / AEC Solutions). */
  const requirePoojaa = /kumar(?!@)/i;
  const isAdityaName = (name) => /aditya[_\s-]*const|adityaconst|\bmalick\b|\bzayan\b/i.test(String(name || ''));
  const isBlockedAdityaUrl = (url) =>
    /projectId=b042a8dd-51b2-4d16-b242-405158add775/i.test(String(url || '')) ||
    /adityaconst/i.test(String(url || ''));

  const skipNames = testData.vendor?.rfqUser?.skipAdminProjects || [
    'Dev-Inprogress',
    'Dev-Inprogress - Dont touch',
    'Dont touch',
    'BBB',
    'AEC_Solutions',
    'AEC Solutions',
    'MVB',
    'Hari',
    'adityaconstructions',
    'adityaconstuctions',
    'Aditya Constructions',
    'aditya constructions',
    'malick',
    'ZAYAN',
  ];
  const preferNames = testData.vendor?.rfqUser?.preferAdminProjects || [
    'kumarorganization',
    'kumar',
  ];

  const isExcludedName = (name) => {
    const n = String(name || '').toLowerCase();
    return (
      !n ||
      isAdityaName(n) ||
      !requirePoojaa.test(n) ||
      /aec[_\s-]*solutions|^bbb$|\bbb\b|mvb|hari|dev[-\s]?in[-\s]?progress|dont\s*touch/i.test(n)
    );
  };

  const savedUrl = String(vendorPoSession.getAdminProjectUrl() || '').trim();
  const savedName = String(vendorPoSession.getAdminProjectName() || '').trim();

  // Prefer last good RFQ kumar URL (same Admin org as RFQ).
  let rfqUrl = '';
  let rfqName = '';
  try {
    const vendorRfqSession = require('../../../support/vendor-rfq-session');
    rfqUrl = String(vendorRfqSession.getAdminProjectUrl() || '').trim();
    rfqName = String(vendorRfqSession.getAdminProjectName() || '').trim();
  } catch {
    /* optional */
  }

  const tryReuseUrl = async (url, name, source) => {
    if (!url || !/client\/profile|projectId=/i.test(url)) return false;
    if (isBlockedAdityaUrl(url) || isExcludedName(name)) return false;
    console.log(`[PO] Reusing ${source} Admin project "${name || 'kumar'}" → ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const heading = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 500);
    if (isAdityaName(heading) || isBlockedAdityaUrl(this.page.url())) {
      console.log(`[PO] ${source} URL opened Aditya UI — discarding`);
      return false;
    }
    this.lastAdminProjectName = name || 'kumar project';
    this.lastVendorPoAdminProjectUrl = String(this.page.url() || url);
    vendorPoSession.saveAdminProject({
      url: this.lastVendorPoAdminProjectUrl,
      name: this.lastAdminProjectName,
    });
    console.log(`[PO] Admin project URL saved for reopen: ${this.lastVendorPoAdminProjectUrl}`);
    return true;
  };

  if (savedUrl && (isBlockedAdityaUrl(savedUrl) || isExcludedName(savedName))) {
    console.log(
      `[PO] Clearing saved Aditya/non-kumar session "${savedName}" — PO must use kumar`
    );
    vendorPoSession.saveAdminProject({ url: '', name: '' });
  } else if (await tryReuseUrl(savedUrl, savedName, 'PO session')) {
    return;
  } else if (await tryReuseUrl(rfqUrl, rfqName, 'RFQ session')) {
    return;
  }

  console.log(
    `[PO] Admin login user: ${testData.admin?.validUser?.email || 'kumar@diy.in'} — opening kumar project only`
  );
  const openedName = await projectNavigationPage.clickAvailableProjectSkipping({
    skipNames,
    preferNames,
    requireNamePattern: requirePoojaa,
  });
  if (isExcludedName(openedName)) {
    throw new Error(
      `Purchase Order needs a kumar Admin project (got "${openedName}"). Aditya / AEC Solutions are blocked.`
    );
  }
  this.lastAdminProjectName = openedName || 'kumar project';
  this.lastVendorPoAdminProjectUrl = this.page.url();
  vendorPoSession.saveAdminProject({
    url: this.lastVendorPoAdminProjectUrl,
    name: this.lastAdminProjectName,
  });
  console.log(
    `[PO] Opened Admin project "${this.lastAdminProjectName}" (kumar only; Aditya blocked)`
  );
});

When('I click on the project {string} in the list', { timeout: 120000 }, async function (projectName) {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickProjectByName(projectName);
});

When('I select the client {string}', { timeout: 120000 }, async function (clientName) {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickProjectByName(clientName);
});

When('I select the {string} heading', { timeout: 120000 }, async function (headingName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  const schedulePage = new SchedulePage(this.page);
  const projectNavigationPage = new ProjectNavigationPage(this.page);

  // Being inside the project profile does NOT mean this heading is active
  // (e.g. Design & Estimates may still be selected). Always select the requested heading
  // so Schedule / Daily Report / etc. cards come from the correct section.
  if (await schedulePage.isOnScheduleModule()) {
    await projectNavigationPage.returnToProjectProfile();
  } else if (!(await projectProfilePage.isInsideProjectProfile())) {
    await projectNavigationPage.returnToProjectProfile();
  }

  await projectProfilePage.selectHeading(headingName);
  console.log(`Selected "${headingName}" heading`);
});

When('I click the {string} module card', { timeout: 120000 }, async function (moduleName) {
  const schedulePage = new SchedulePage(this.page);
  if ((moduleName || '').trim().toLowerCase() === 'schedule' && (await schedulePage.isOnScheduleModule())) {
    // Only skip when Gantt + List are both present (Budget-only view is not enough).
    const ganttVisible = await schedulePage.ganttTab.isVisible({ timeout: 1500 }).catch(() => false);
    const listVisible = await schedulePage.listTab.isVisible({ timeout: 1500 }).catch(() => false);
    if (ganttVisible && listVisible) {
      console.log('Already on Schedule module — skipping Schedule module card');
      return;
    }
    console.log('Schedule/Budget without both Gantt+List — re-opening Schedule module card');
  }
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.clickModuleCard(moduleName);
});
