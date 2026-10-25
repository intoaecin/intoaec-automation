const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { resolvePathForWorld } = require('./googleIntegrationStorage');

function isHeadlessRun() {
  return (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  );
}

/** Keep browser open after the run only when KEEP_BROWSER=true (explicit). Default: close and exit — no ENTER wait. */
function shouldKeepBrowserOpen() {
  return process.env.KEEP_BROWSER === 'true';
}

let sharedSession = null;
let signalHandlersRegistered = false;

function isSessionAlive(session) {
  if (!session) return false;
  const { browser, context, page } = session;
  if (!browser?.isConnected()) return false;
  if (page && !page.isClosed()) return true;
  if (!context) return false;
  try {
    return context.pages().some((p) => p && !p.isClosed());
  } catch {
    return false;
  }
}

function pickLivePage(session) {
  const { browser, context, page } = session;
  if (page && !page.isClosed()) return page;
  const live = (context?.pages() || []).find((p) => p && !p.isClosed());
  return live || null;
}

async function closeSharedSession() {
  if (!sharedSession) return;
  const { browser } = sharedSession;
  sharedSession = null;
  await browser.close().catch(() => {});
}

async function resetSharedSession() {
  await closeSharedSession();
}

/** Always close automation browser on Ctrl+C / kill — prevents orphaned cucumber+Chrome "loop". */
function registerShutdownHandlers() {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  const shutdown = async (signal) => {
    console.log(`\n[World] ${signal} received — closing automation browser and exiting`);
    await closeSharedSession().catch(() => {});
    process.exit(130);
  };

  process.once('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(130));
  });
  process.once('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(143));
  });
  process.once('SIGHUP', () => {
    shutdown('SIGHUP').catch(() => process.exit(129));
  });
}

registerShutdownHandlers();

async function ensureSharedSession() {
  if (sharedSession && isSessionAlive(sharedSession)) {
    const livePage = pickLivePage(sharedSession);
    if (livePage) {
      sharedSession = { ...sharedSession, page: livePage };
      return sharedSession;
    }
  }

  if (sharedSession) {
    await sharedSession.browser?.close().catch(() => {});
    sharedSession = null;
  }

  const headless = isHeadlessRun();
  // Always let Node handle Ctrl+C so orphaned Chrome/cucumber cannot keep running.
  const launchOptions = {
    headless,
    args: headless ? [] : ['--start-maximized'],
    handleSIGINT: true,
    handleSIGTERM: true,
    handleSIGHUP: true,
  };
  if (!headless && process.platform === 'win32') {
    launchOptions.channel = 'chrome';
  }

  const browser = await chromium.launch(launchOptions);

  const contextOptions = {
    viewport: headless ? { width: 1280, height: 720 } : null,
  };

  // Do not load PLAYWRIGHT_STORAGE_STATE for normal Admin runs (can revive aadhi session).
  // Only Google Integration flows should set GOOGLE_INTEGRATION_STORAGE_STATE.
  if (process.env.GOOGLE_INTEGRATION_STORAGE_STATE) {
    const storageStatePath = resolvePathForWorld();
    if (storageStatePath) {
      console.log(`[World] Loading Google storage state from ${storageStatePath}`);
      contextOptions.storageState = storageStatePath;
    }
  }

  const context = await browser.newContext(contextOptions);

  const page = await context.newPage();
  sharedSession = { browser, context, page };
  return sharedSession;
}

class CustomWorld {
  async ensureLivePage() {
    if (this.page && !this.page.isClosed()) return;

    if (sharedSession && isSessionAlive(sharedSession)) {
      const livePage = pickLivePage(sharedSession);
      if (livePage) {
        this.browser = sharedSession.browser;
        this.context = sharedSession.context;
        this.page = livePage;
        sharedSession.page = livePage;
        return;
      }
    }

    await resetSharedSession();
    await this.init();
  }

  async init() {
    if (this.page?.isClosed() && sharedSession) {
      const livePage = pickLivePage(sharedSession);
      if (livePage) {
        sharedSession.page = livePage;
      } else {
        await resetSharedSession();
      }
    }

    const session = await ensureSharedSession();
    this.browser = session.browser;
    this.context = session.context;
    const sharedPageRecreated = !this.page || this.page !== session.page;
    this.page = session.page;
    // Drop stale page objects if the shared page was recreated.
    if (sharedPageRecreated) {
      this.questionnairePage = null;
      this.previewQuestionnairePage = null;
      this.answerQuestionnairePage = null;
      this.proposalPage = null;
      this.builderPage = null;
      this.acceptedProposalPage = null;
      this.declinedProposalPage = null;
      this.commentByLeadPage = null;
      this.commentByAecPage = null;
      this.editProposalPage = null;
      this.proposalSendFlowPage = null;
      this.proposalFlowPage = null;
      this.callLogPage = null;
      this.editCallLogPage = null;
      this.deleteCallLogPage = null;
      this.callLogValidationPage = null;
      this.eventPage = null;
      this.editMeetingPage = null;
      this.deleteMeetingPage = null;
      this.repeatMeetingPage = null;
      this.meetingUIPage = null;
      this.meetingValidationPage = null;
      this.googleIntegrationPage = null;
      this.notePage = null;
      this.editNotePage = null;
      this.deleteNotePage = null;
      this.createNoteValidationPage = null;
      this.fileUploadPage = null;
    }
    this.myOrganizationPage = null;
    this.myAccountPage = null;
    this.warehousePage = null;
    this.servicesPage = null;
    this.vendorLoginPage = null;
    this.vendorProfilePage = null;
    this.vendorOrganizationPage = null;
    this.vendorProductsPage = null;
    this.vendorServicesPage = null;
    this.inviteVendorPage = null;
    this.vendorRfqPage = null;
    this.userHubPage = null;
    this.userHubAdminPage = null;
    this.yopmailPage = null;
    this.userInvitationPage = null;
    this.userRegistrationPage = null;
    this.invitedUserEmail = null;
    this.invitedUserMobile = null;
    this.invitedUserPage = null;
    this.invitedUserContext = null;
  }

  async cleanup() {
    if (!this.page || this.page.isClosed()) return;
    if (!/schedule/i.test(this.page.url())) return;

    try {
      const SchedulePage = require('../pages/admin/projects/management/Schedule/SchedulePage');
      const schedulePage = this.schedulePage || new SchedulePage(this.page);
      if (await schedulePage.isOnScheduleModule()) {
        await schedulePage.dismissOpenOverlays();
      }
    } catch {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }
}

setWorldConstructor(CustomWorld);

module.exports = { closeSharedSession, resetSharedSession, shouldKeepBrowserOpen };
