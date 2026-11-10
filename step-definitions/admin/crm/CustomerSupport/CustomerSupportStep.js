const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const CustomerSupportPage = require('../../../../pages/admin/crm/CustomerSupport/CustomerSupportPage');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const CUSTOMER_SUPPORT_TEST_CASE_LOG = {
  TC01: 'TC-01 — Support Desk loads / page title visible',
  TC02: 'TC-02 — Switch list and kanban views',
  TC03: 'TC-03 — Open create ticket offcanvas and see title/lead/summary fields',
  TC04: 'TC-04 — Open filter menu',
  TC05: 'TC-05 — Navigate to Ticket Statuses customize tab via feature sidebar',
};

Before({ tags: '@customer-support' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && CUSTOMER_SUPPORT_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${CUSTOMER_SUPPORT_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getCustomerSupportPage(world) {
  if (!world.customerSupportPage || world.customerSupportPage.page !== world.page) {
    world.customerSupportPage = new CustomerSupportPage(world.page);
  }
  return world.customerSupportPage;
}

When('I navigate to Customer Support', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.navigateToCustomerSupport();
});

When('I wait for the customer support module to load', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.waitForModuleToLoad();
});

Then('the Support Desk page title should be visible', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.expectSupportDeskLoaded();
});

When('I switch customer support to list view', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.switchToListView();
});

When('I switch customer support to kanban view', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.switchToKanbanView();
});

When('I open the customer support create ticket offcanvas', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.openCreateOffcanvas();
});

Then('the customer support create ticket offcanvas should show title lead and summary fields', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.expectCreateOffcanvasFields();
});

When('I open the customer support filter menu', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.openFilter();
});

When('I open the customer support Ticket Statuses tab', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.openStatusesTab();
});

Then('the customer support Ticket Statuses page should be visible', async function () {
  const customerSupportPage = getCustomerSupportPage(this);
  await customerSupportPage.expectTicketStatusesVisible();
});

// ── Contact, search, sort/date filters, created-on label, permissions ───────
const { After } = require('@cucumber/cucumber');
const MyAccountPage = require('../../../../pages/admin/account/MyAccountPage');

Object.assign(CUSTOMER_SUPPORT_TEST_CASE_LOG, {
  TC06: 'TC-06 — Create Internal ticket with contact name and phone',
  TC07: 'TC-07 — Search tickets by phone (full, last digits, formatted)',
  TC08: 'TC-08 — Phone search with no match shows empty state',
  TC09: 'TC-09 — Linked ticket found by lead mobile',
  TC10: 'TC-10 — Newest first by default, Oldest first reverses order',
  TC11: 'TC-11 — Created date range filter',
  TC12: 'TC-12 — Card shows "Created on" and no Updated date',
  TC13: 'TC-13 — Internal contact fields follow the Linked toggle',
  TC14: 'TC-14 — Invalid contact phone is rejected',
  TC15: 'TC-15 — Edit ticket title updates the card',
  TC16: 'TC-16 — Delete ticket removes the card',
  TC17: 'TC-17 — Viewer: no create/delete, ticket opens read-only',
  TC18: 'TC-18 — Creator: can create, cannot edit or delete',
});

function randomDigits(count) {
  let out = '';
  for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

/** Fresh Internal-ticket data per scenario (unique title + 10-digit mobile). */
function newInternalTicketData() {
  const stamp = Date.now();
  const mobile = `9${randomDigits(9)}`;
  return {
    title: `AUTO CS ${stamp}`,
    summary: `Automation support ticket ${stamp}`,
    contactName: `Auto Contact ${randomDigits(4)}`,
    mobile,
    // Same number written the way customers type it.
    formattedMobile: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`,
  };
}

async function createInternalTicket(world) {
  const page = getCustomerSupportPage(world);
  const data = newInternalTicketData();
  await page.openCreateOffcanvas();
  await page.fillTicketTitle(data.title);
  await page.setLinked(false);
  await page.fillInternalContact(data.contactName, data.formattedMobile);
  await page.fillTicketSummary(data.summary);
  const body = await page.submitCreateTicket();
  world.customerSupportTicket = data;
  return body;
}

When('I create an Internal support ticket with a contact name and phone', async function () {
  const body = await createInternalTicket(this);
  if (body.isLinked !== false || body.leadId !== null || !body.contactMobile) {
    throw new Error(`Create payload is not an Internal ticket with contact: ${JSON.stringify(body)}`);
  }
});

Then('the new ticket card should show Internal with the contact name and phone', async function () {
  const { title, contactName, formattedMobile } = this.customerSupportTicket;
  await getCustomerSupportPage(this).expectInternalCardContact(title, contactName, formattedMobile);
});

When('I search support tickets for the {string} of the new ticket phone', async function (variant) {
  const { mobile, formattedMobile } = this.customerSupportTicket;
  const terms = {
    'full number': mobile,
    'last 5 digits': mobile.slice(-5),
    'formatted number': formattedMobile,
    // QA bug: typing with the + country code must filter as you type.
    'country code prefix': `+91 ${mobile.slice(0, 5)}`,
    'country code without spaces': `+91${mobile}`,
  };
  const term = terms[variant];
  if (!term) throw new Error(`Unknown phone search variant "${variant}"`);
  await getCustomerSupportPage(this).searchTickets(term);
});

Then('the new ticket card should be listed', async function () {
  await getCustomerSupportPage(this).expectTicketCard(this.customerSupportTicket.title);
});

When('I search support tickets for a phone number that does not exist', async function () {
  await getCustomerSupportPage(this).searchTickets(`0000${randomDigits(6)}`);
});

Then('the customer support empty search state should be shown', async function () {
  await getCustomerSupportPage(this).expectNoTicketsMatch();
});

When('I search support tickets by the configured lead mobile', async function () {
  const mobile = String(process.env.CS_LEAD_MOBILE || '').trim();
  if (!mobile) {
    console.log('[CustomerSupport] CS_LEAD_MOBILE not set — skipping linked-lead phone search');
    return 'skipped';
  }
  await getCustomerSupportPage(this).searchTickets(mobile);
  return undefined;
});

Then('at least one support ticket should be listed', async function () {
  const serials = await getCustomerSupportPage(this).visibleTicketSerials();
  if (!serials.length) throw new Error('Expected at least one ticket for the lead mobile');
});

Then('the default ticket list request should sort newest first', async function () {
  const page = getCustomerSupportPage(this);
  const request = page.waitForTicketListRequest();
  await this.page.reload({ waitUntil: 'domcontentloaded' });
  const body = await request;
  if (body.sortOrder && body.sortOrder !== 'DESC') {
    throw new Error(`Default sortOrder should be DESC (or omitted), got ${body.sortOrder}`);
  }
  await page.waitForModuleToLoad();
  this.customerSupportNewestSerials = await page.visibleTicketSerials();
});

When('I apply the customer support sort {string}', async function (label) {
  const page = getCustomerSupportPage(this);
  await page.openFilter();
  await page.selectSortOrder(label);
  this.customerSupportLastRequest = await page.applyFilters(() => true);
});

Then('the ticket list request should use sort order {string}', async function (sortOrder) {
  const body = this.customerSupportLastRequest;
  if (body?.sortOrder !== sortOrder) {
    throw new Error(`Expected sortOrder ${sortOrder}, got ${JSON.stringify(body)}`);
  }
});

Then('the ticket order should differ from newest first', async function () {
  const oldest = await getCustomerSupportPage(this).visibleTicketSerials();
  const newest = this.customerSupportNewestSerials || [];
  if (newest.length > 1 && oldest.length > 1 && oldest[0] === newest[0]) {
    throw new Error(`Oldest-first list starts with the same ticket as newest-first (${oldest[0]})`);
  }
});

When('I filter support tickets created {string}', async function (which) {
  const page = getCustomerSupportPage(this);
  await page.openFilter();
  await page.selectCreatedRange(which === 'today' ? 'today' : 'past');
  const body = await page.applyFilters(
    (req) => typeof req.createdFrom === 'number' && typeof req.createdTo === 'number',
  );
  if (!(body.createdTo > body.createdFrom)) {
    throw new Error(`createdTo must be after createdFrom: ${body.createdFrom} → ${body.createdTo}`);
  }
  this.customerSupportLastRequest = body;
});

Then('the new ticket card should not be listed', async function () {
  await getCustomerSupportPage(this).expectTicketCardHidden(this.customerSupportTicket.title);
});

When('I clear the customer support filters and search', async function () {
  const page = getCustomerSupportPage(this);
  await page.clearSearch();
  await page.clearAllFilters();
});

Then('the new ticket card should show only the created date', async function () {
  await getCustomerSupportPage(this).expectCreatedOnLabelOnly(this.customerSupportTicket.title);
});

When('I turn the ticket Linked toggle off', async function () {
  await getCustomerSupportPage(this).setLinked(false);
});

Then('the Internal contact name and phone fields should be shown', async function () {
  await getCustomerSupportPage(this).expectInternalContactFields(true);
});

When('I turn the ticket Linked toggle on', async function () {
  await getCustomerSupportPage(this).setLinked(true);
});

Then('the Internal contact name and phone fields should be hidden', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectInternalContactFields(false);
  await page.closeOffcanvas();
});

When('I try to create an Internal ticket with phone {string}', async function (phone) {
  const page = getCustomerSupportPage(this);
  await page.fillTicketTitle(`AUTO CS invalid ${Date.now()}`);
  await page.setLinked(false);
  await page.fillInternalContact('Invalid Phone', phone);
  await page.fillTicketSummary('Invalid phone check');
  await page.attemptSubmitCreateTicket();
});

Then('the contact phone validation error should be shown', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectInvalidPhoneError();
  await page.closeOffcanvas();
});

When('I rename the new ticket', async function () {
  const renamed = `${this.customerSupportTicket.title} edited`;
  await getCustomerSupportPage(this).editTicketTitle(this.customerSupportTicket.title, renamed);
  this.customerSupportTicket.title = renamed;
});

When('I delete the new ticket', async function () {
  await getCustomerSupportPage(this).deleteTicket(this.customerSupportTicket.title);
});

// Permission scenarios need extra users whose Customer Support permission is set
// in User Hub. Without credentials the scenario is skipped (not failed).
const ROLE_ENV = {
  viewer: ['CS_VIEWER_EMAIL', 'CS_VIEWER_PASSWORD'],
  creator: ['CS_CREATOR_EMAIL', 'CS_CREATOR_PASSWORD'],
};

When('I sign in as the Customer Support {string} test user', { timeout: 240000 }, async function (role) {
  const [emailKey, passwordKey] = ROLE_ENV[role] || [];
  const email = String(process.env[emailKey] || '').trim();
  const password = String(process.env[passwordKey] || '').trim();
  if (!email || !password) {
    console.log(`[CustomerSupport] ${emailKey}/${passwordKey} not set — skipping ${role} permission scenario`);
    return 'skipped';
  }
  const account = new MyAccountPage(this.page);
  await account.logout();
  await account.loginWithCredentials(email, password);
  this.customerSupportSwitchedUser = true;
  await getCustomerSupportPage(this).navigateToCustomerSupport();
  return undefined;
});

Then('Customer Support should be view-only for this user', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectViewerRestrictions();
  await page.expectFirstTicketOpensReadOnly();
});

Then('Customer Support should allow create but not edit or delete for this user', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectCreatorRestrictions();
  await page.expectFirstTicketOpensReadOnly();
});

// Hand the shared browser back logged out, so the next Background logs in as admin.
After({ tags: '@cs-permission', timeout: 120000 }, async function () {
  if (!this.customerSupportSwitchedUser) return;
  await new MyAccountPage(this.page).logout().catch(() => {});
  this.customerSupportSwitchedUser = false;
});
