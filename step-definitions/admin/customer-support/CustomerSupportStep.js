const { When, Then, After } = require('@cucumber/cucumber');
const CustomerSupportPage = require('../../../pages/admin/customer-support/CustomerSupportPage');
const ProjectNavigationPage = require('../../../pages/admin/projects/ProjectNavigationPage');

/**
 * Admin Customer Support steps.
 * Not automated here: permissions, catalog, Sync Sheets, kanban drag,
 * customer portal, and cross-portal. Those stay manual until a second
 * admin account, Google OAuth, or portal locators are available.
 * Later portal files stay one concern per file.
 */

function getCustomerSupportPage(world) {
  if (!world.customerSupportPage) {
    world.customerSupportPage = new CustomerSupportPage(world.page);
  } else {
    world.customerSupportPage.rebind(world.page);
  }
  return world.customerSupportPage;
}

When('I open Customer Support from the sidebar', { timeout: 180000 }, async function () {
  await getCustomerSupportPage(this).openFromSidebar();
});

Then('the Support Desk should be displayed', async function () {
  await getCustomerSupportPage(this).waitForDesk();
});

Then('the Support Desk should show tickets or the empty state', async function () {
  await getCustomerSupportPage(this).expectDeskChrome();
});

When('I create a linked support ticket', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withAttachment: false });
  await page.submit();
});

When('I create a linked support ticket on a projects client', { timeout: 240000 }, async function () {
  await getCustomerSupportPage(this).createLinkedTicketForActiveClient();
});

When('I create a linked support ticket with an attachment', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withAttachment: true });
  await page.submit();
});

Then('I should see the created support ticket', async function () {
  await getCustomerSupportPage(this).expectTicketListed();
});

Then('the created support ticket title should be on screen', async function () {
  const page = getCustomerSupportPage(this);
  await page.page.getByText(page.lastTitle, { exact: true }).first().waitFor({ timeout: 60000 });
});

Then('the created support ticket should show its serial, summary, tag, and priority', async function () {
  const page = getCustomerSupportPage(this);
  const card = page.ticketCard(page.lastTitle);
  if (page.lastSerial) await card.getByText(page.lastSerial).waitFor();
  await card.getByText(page.lastSummaryToken).waitFor();
  if (page.lastTag) await card.getByText(page.lastTag).waitFor();
  if (page.lastPriority) await card.getByText(page.lastPriority, { exact: true }).waitFor();
});

When('I search support tickets for the created title', async function () {
  const page = getCustomerSupportPage(this);
  await page.search(page.lastTitle);
});

When('I search support tickets for the created serial', async function () {
  const page = getCustomerSupportPage(this);
  if (!page.lastSerial) throw new Error('Created ticket serial was not captured');
  await page.search(page.lastSerial);
});

When('I search support tickets for the created summary token', async function () {
  const page = getCustomerSupportPage(this);
  await page.search(page.lastSummaryToken);
});

When('I search support tickets for {string}', async function (text) {
  await getCustomerSupportPage(this).search(text);
});

When('I search support tickets for the created title with extra spaces', async function () {
  const page = getCustomerSupportPage(this);
  await page.search(`  ${page.lastTitle}  `);
});

When('I search support tickets for one character of the created title', async function () {
  const page = getCustomerSupportPage(this);
  const character = (page.lastTitle.match(/[A-Za-z]/) || ['C'])[0];
  await page.search(character);
});

When('I clear the support ticket search', async function () {
  await getCustomerSupportPage(this).clearSearch();
});

Then('I should not see the created support ticket', async function () {
  await getCustomerSupportPage(this).expectTicketHidden();
});

Then('the support ticket search should show no matches', async function () {
  await getCustomerSupportPage(this).expectEmptyFiltered();
});

Then('the Support Desk should stay usable', async function () {
  await getCustomerSupportPage(this).expectDeskStillUsable();
});

When('I filter support tickets by the created status, priority, and tag', async function () {
  await getCustomerSupportPage(this).filterByCreatedTicket();
});

When('I filter support tickets by a different status', async function () {
  await getCustomerSupportPage(this).filterByDifferentStatus();
});

When('I filter support tickets by Unassigned', async function () {
  await getCustomerSupportPage(this).filterByAssignee('Unassigned');
});

When('I filter support tickets by No reporter', async function () {
  await getCustomerSupportPage(this).filterByReporter('No reporter');
});

When('I filter support tickets created today', { timeout: 120000 }, async function () {
  await getCustomerSupportPage(this).applyCreatedBetweenToday();
});

When('I filter support tickets created in the previous month', { timeout: 120000 }, async function () {
  await getCustomerSupportPage(this).applyCreatedBetweenPreviousMonth();
});

When('I try an inverted support ticket created-between range', async function () {
  await getCustomerSupportPage(this).expectInvertedCreatedRangeNotApplied();
});

When('I clear support ticket filters', async function () {
  await getCustomerSupportPage(this).clearFilters();
});

When('I create two support tickets for sort order', { timeout: 240000 }, async function () {
  await getCustomerSupportPage(this).createPairForSort();
});

When('I sort support tickets newest first', async function () {
  await getCustomerSupportPage(this).setSort('Newest first');
});

When('I sort support tickets oldest first', async function () {
  await getCustomerSupportPage(this).setSort('Oldest first');
});

Then('the older support ticket should appear before the newer one', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectOrder(page.sortOlderTitle, page.sortNewerTitle);
});

Then('the newer support ticket should appear before the older one', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectOrder(page.sortNewerTitle, page.sortOlderTitle);
});

When('I switch the support desk to Kanban', async function () {
  await getCustomerSupportPage(this).showKanban();
});

When('I switch the support desk to List', async function () {
  await getCustomerSupportPage(this).showList();
});

Then('the support ticket list should request 10 rows', async function () {
  await getCustomerSupportPage(this).expectListPageSize();
});

When('I scroll the support ticket list for the next page', { timeout: 600000 }, async function () {
  await getCustomerSupportPage(this).scrollForNextPage();
});

When('the support ticket list request fails', async function () {
  await getCustomerSupportPage(this).expectListRequestFails();
});

Then('the Support Desk should show a load error', async function () {
  const page = getCustomerSupportPage(this);
  await page.page.getByRole('alert').filter({ hasText: /something went wrong/i }).first().waitFor();
});

When('I open the create support ticket panel', async function () {
  await getCustomerSupportPage(this).openCreate();
});

When('I submit an empty support ticket', async function () {
  await getCustomerSupportPage(this).expectRequiredFields();
});

Then('the support ticket form should show required fields', async function () {
  const page = getCustomerSupportPage(this);
  await page.dialog().getByText(/^required field$/i).first().waitFor();
});

When('I enter a 201 character support ticket title', async function () {
  await getCustomerSupportPage(this).expectTitleMaxLength(200);
});

Then('the support ticket title should be limited to 200 characters', async function () {
  const page = getCustomerSupportPage(this);
  await page.dialog().getByPlaceholder(/^title$/i).evaluate((input) => {
    if (input.value.length !== 200) {
      throw new Error(`Expected title length 200, received ${input.value.length}`);
    }
  });
});

When('I finish and save the support ticket', { timeout: 180000 }, async function () {
  await getCustomerSupportPage(this).finishAndSaveOpenTicket();
});

When('I prepare an internal support ticket', async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillInternalTicket({ name: '', phone: '' });
});

When('I enter an invalid support ticket phone {string}', async function (phone) {
  await getCustomerSupportPage(this).expectPhoneRejected(phone);
});

When('I enter a 31 character support ticket phone', async function () {
  await getCustomerSupportPage(this).expectPhoneTruncated('1'.repeat(31), 30);
});

When('I enter a valid support ticket phone and save', { timeout: 180000 }, async function () {
  await getCustomerSupportPage(this).saveOpenInternalContact();
});

Then('the support ticket phone should be limited to 30 characters', async function () {
  const page = getCustomerSupportPage(this);
  const value = await page.dialog().locator('#support-ticket-contact-phone').inputValue();
  if (value.length !== 30) throw new Error(`Expected phone length 30, received ${value.length}`);
});

When('I save an internal support ticket with a contact name and phone', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  page.lastContactName = `Contact ${Date.now().toString(36)}`;
  page.lastPhone = '+1 (555) 010-1234';
  await page.fillInternalTicket({ name: page.lastContactName, phone: page.lastPhone });
  await page.submit();
});

When('I save an internal support ticket with a contact name only', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  page.lastContactName = `NameOnly ${Date.now().toString(36)}`;
  page.lastPhone = '';
  await page.fillInternalTicket({ name: page.lastContactName, phone: '' });
  await page.submit();
});

Then('the created support ticket should show Internal and the contact name', async function () {
  await getCustomerSupportPage(this).expectInternalCard();
});

When('I set the support ticket completion date before the start date', { timeout: 120000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withTag: false, withAttachment: false });
  await page.setCompletionBeforeStart();
});

Then('the support ticket should reject the completion date', async function () {
  await getCustomerSupportPage(this).submitExpectingCompletionBeforeStart();
});

When('I cancel a dirty support ticket', async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.cancelCreate();
});

When('I search support tickets for the cancelled title', async function () {
  const page = getCustomerSupportPage(this);
  await page.search(page.discardedTitle);
});

When('I edit the created support ticket title', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openTicket();
  await page.editTitle(`${page.lastTitle} edited`);
  await page.submit();
});

Then('the support ticket should be updated', async function () {
  const page = getCustomerSupportPage(this);
  await page.expectUpdated();
  await page.expectTicketVisible();
});

When('I change the created support ticket status inline', async function () {
  const page = getCustomerSupportPage(this);
  await page.changeInlineStatus(page.lastTitle);
});

Then('the created support ticket should show the updated status', async function () {
  const page = getCustomerSupportPage(this);
  await page.ticketCard(page.lastTitle).getByRole('button', { name: /^status$/i }).getByText(page.lastStatus).waitFor();
  await page.openTicket();
  await page.dialog().locator(`input[value="${page.lastStatus}"]`).first().waitFor();
});

When('I assign two users on the support ticket', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withTag: false, withAttachment: false, assigneeCount: 2 });
  await page.submit();
});

Then('the created support ticket should not be Unassigned', async function () {
  const page = getCustomerSupportPage(this);
  await page.ticketCard(page.lastTitle).getByText(/^unassigned$/i).waitFor({ state: 'hidden' });
});

When('I remove one support ticket assignee', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openTicket();
  await page.removeOneAssigneeChip();
  await page.submit();
});

When('I select four support ticket tags', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withTag: false, withAttachment: false, tagCount: 4 });
  await page.submit();
});

Then('the created support ticket should show the selected tags', async function () {
  await getCustomerSupportPage(this).expectSelectedTagsOnCard();
});

When('I create a support ticket with no assignee', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withTag: false, withAttachment: false });
  await page.submit();
});

Then('the created support ticket should show Unassigned', async function () {
  await getCustomerSupportPage(this).expectUnassigned();
});

When('I create a support ticket with no reporter', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  await page.openCreate();
  await page.fillLinkedTicket({ withTag: false, withAttachment: false });
  await page.clearReporter();
  await page.submit();
});

When('I delete the created support ticket and cancel', async function () {
  const page = getCustomerSupportPage(this);
  await page.deleteTicket(page.lastTitle, { confirm: false });
});

When('I delete the created support ticket', async function () {
  const page = getCustomerSupportPage(this);
  await page.deleteTicket(page.lastTitle, { confirm: true });
});

Then('the created support ticket should stay in the list', async function () {
  await getCustomerSupportPage(this).expectTicketVisible();
});

Then('the created support ticket should be removed', async function () {
  await getCustomerSupportPage(this).expectTicketHidden();
});

When('I select the client captured from the support ticket', { timeout: 180000 }, async function () {
  const page = getCustomerSupportPage(this);
  const candidates = [
    page.lastProjectSearchName,
    page.lastProjectName,
    page.lastLeadName,
  ].filter((name, index, all) => name && all.indexOf(name) === index);
  if (!candidates.length) throw new Error('No lead/project name was captured from the support ticket');
  const projects = new ProjectNavigationPage(this.page);
  let lastError;
  for (const name of candidates) {
    try {
      await projects.clickProjectByName(name);
      return;
    } catch (error) {
      lastError = error;
      page.logStep(`Project "${name}" not found; trying next captured name`);
    }
  }
  throw lastError;
});

When('I open Support Tickets on the project overview', async function () {
  await getCustomerSupportPage(this).openProjectSupportTickets();
});

When('I open the created ticket from the project support dialog', async function () {
  await getCustomerSupportPage(this).openTicketFromProjectDialog();
});

Then('the support ticket panel should show the created title', async function () {
  const page = getCustomerSupportPage(this);
  await page.dialog().getByPlaceholder(/^title$/i).waitFor();
});

After({ tags: '@customer-support', timeout: 600000 }, async function () {
  if (!this.customerSupportPage || !this.page || this.page.isClosed()) return;
  this.customerSupportPage.rebind(this.page);
  await this.page.keyboard.press('Escape').catch(() => {});
  await this.customerSupportPage.deleteCreatedTickets();
});
