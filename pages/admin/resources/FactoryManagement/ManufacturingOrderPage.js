const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');
const FactoryUi = require('./factoryUi');
const { getContext, flag, has, escapeRe } = require('./factoryTestContext');

class ManufacturingOrderPage extends BasePage {
  constructor(page) {
    super(page);
    this.ui = new FactoryUi(page, 'ManufacturingOrder');
    this.defaultTimeout = 120000;
    this.ui.defaultTimeout = 120000;
  }

  createForm() {
    return this.ui.formByText(/Manufacturing Item|New manufacturing order|Edit manufacturing order/i);
  }

  async openProject() {
    const ctx = getContext();
    const ProjectNavigationPage = require('../../projects/ProjectNavigationPage');
    const ProjectProfilePage = require('../../projects/ProjectProfilePage');
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    if (ctx.projectUrl && /client\/profile|projectId=/i.test(ctx.projectUrl)) {
      await this.page.goto(ctx.projectUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
      this.ui.log(`Reopened project ${ctx.projectName || ctx.projectUrl}`);
    } else {
      const openedName = await nav.clickAvailableProjectSkipping({
        skipNames: [
          'Dev-Inprogress',
          'Dev-Inprogress - Dont touch',
          'Dont touch',
          'BBB',
          'AEC_Solutions',
          'AEC Solutions',
          'MVB',
          'Hari',
          'Aditya Constructions',
          'adityaconstructions',
        ],
        preferNames: ['kumarorganization', 'kumar'],
        requireNamePattern: /kumar(?!@)/i,
      });
      ctx.projectName = openedName || 'kumar project';
      ctx.projectUrl = this.page.url();
      this.ui.log(`Opened project ${ctx.projectName}`);
    }

    await profile.ensureClassicProjectUi();
    await profile.clickModuleCard('Manufacturing Order');
    await expect(this.page.getByText(/^Manufacturing Order$/).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.ui.log('Manufacturing Order tab is open');
  }

  async chooseUnit(form) {
    const ctx = getContext();
    const input = form.getByPlaceholder(/^Select unit$/i).first();
    await input.click({ timeout: this.ui.uiTimeout });
    const preferred = this.page.getByRole('option', { name: /^(Each|Nos|Number)$/i }).first();
    if (await preferred.isVisible({ timeout: 3000 }).catch(() => false)) {
      ctx.unit = ((await preferred.innerText()) || '').trim();
      await preferred.click({ timeout: this.ui.uiTimeout });
    } else {
      ctx.unit = await this.ui.firstRealOption(/add /i);
    }
    this.ui.log(`Unit: ${ctx.unit}`);
  }

  async chooseWorkshop(form, name) {
    const input = form.getByPlaceholder(/^Select workshop$/i).first();
    await expect(input).toBeVisible({ timeout: this.ui.uiTimeout });
    await input.click({ timeout: this.ui.uiTimeout });
    await input.fill(name);
    const option = this.page.getByRole('option', { name: new RegExp(escapeRe(name), 'i') }).first();
    await expect(option).toBeVisible({ timeout: this.ui.uiTimeout });
    await option.click({ timeout: this.ui.uiTimeout });
    this.ui.log(`Workshop on the order: ${name}`);
  }

  async fillNewOrder({ title, quantity } = {}) {
    const ctx = getContext();
    const form = this.createForm();
    await expect(form).toBeVisible({ timeout: this.defaultTimeout });
    await this.ui.fillPlaceholder(/Steel Staircase|Window Frames|Precast Columns/i, title || ctx.jobTitle, form);
    await this.ui.fillPlaceholder(/total to manufacture/i, quantity || ctx.jobQty, form);
    await this.chooseUnit(form);
    await this.chooseWorkshop(form, ctx.workshopName);
    await this.ui.pickDate(form, /Needed on site by/i, ctx.neededOnSite);
  }

  async raiseOrder(title = getContext().jobTitle) {
    await this.openProject();
    const create = this.page.getByRole('button', { name: /^Create$/i }).first();
    await expect(create).toBeVisible({ timeout: this.defaultTimeout });
    await create.click({ timeout: this.ui.uiTimeout });
    await this.fillNewOrder({ title });
    await this.ui.clickNamed(/^Create$/i, this.createForm());
    await this.ui.expectToast(/Job created successfully/i);
    await expect(this.page.getByText(title, { exact: true }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.ui.log(`Raised manufacturing order ${title}`);
    return title;
  }

  async ensureMainJob() {
    if (has('jobRaised')) return getContext().jobTitle;
    const title = await this.raiseOrder(getContext().jobTitle);
    flag('jobRaised');
    return title;
  }

  async openCreateNewWorkshop() {
    await this.openProject();
    await this.page.getByRole('button', { name: /^Create$/i }).first().click({ timeout: this.ui.uiTimeout });
    const form = this.createForm();
    await expect(form).toBeVisible({ timeout: this.defaultTimeout });
    const input = form.getByPlaceholder(/^Select workshop$/i).first();
    await input.click({ timeout: this.ui.uiTimeout });
    const add = this.page.getByRole('option', { name: /Create New Workshop/i }).first();
    await expect(add).toBeVisible({ timeout: this.ui.uiTimeout });
    await add.click({ timeout: this.ui.uiTimeout });
  }

  async expectAddLocationShortcut() {
    await this.page.waitForURL(/tab=location/i, { timeout: this.defaultTimeout });
    expect(this.page.url()).toMatch(/createLocation=1/);
    await expect(this.page.getByText(/^Add Location$/).first()).toBeVisible({ timeout: this.defaultTimeout });
    this.ui.log('Create New Workshop opened Add Location');
  }

  async editRaisedJobNotes() {
    const ctx = getContext();
    await this.ensureMainJob();
    await this.openProject();
    await this.ui.clickJobMenuItem(ctx.jobTitle, /^Edit$/i);
    const form = this.ui.formByText(/Edit manufacturing order/i);
    await expect(form).toBeVisible({ timeout: this.defaultTimeout });
    const notes = form.locator('[contenteditable="true"], textarea').first();
    await expect(notes).toBeVisible({ timeout: this.ui.uiTimeout });
    await notes.click({ timeout: this.ui.uiTimeout });
    await notes.fill(ctx.jobNotes);
    await this.ui.clickNamed(/^Save$/i, form);
    await this.ui.expectToast(/Job updated successfully/i);
    this.ui.log(`Saved notes on ${ctx.jobTitle}`);
  }

  async deleteRaisedJob() {
    const ctx = getContext();
    await this.openProject();
    const existing = this.page.getByText(ctx.deleteJobTitle, { exact: true }).first();
    if (!(await existing.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.raiseOrder(ctx.deleteJobTitle);
    }
    await this.ui.clickJobMenuItem(ctx.deleteJobTitle, /^Delete$/i);
    const dialog = this.ui.formByText(/Delete job/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    await this.ui.clickNamed(/^Delete$/i, dialog);
    await this.ui.expectToast(/Job deleted successfully/i);
    await expect(this.page.getByText(ctx.deleteJobTitle, { exact: true })).toHaveCount(0, {
      timeout: this.defaultTimeout,
    });
    this.ui.log(`Deleted ${ctx.deleteJobTitle}`);
  }

  async expectInvalidOrderValidation() {
    await this.openProject();
    await this.page.getByRole('button', { name: /^Create$/i }).first().click({ timeout: this.ui.uiTimeout });
    const form = this.createForm();
    await this.ui.clickNamed(/^Create$/i, form);
    await expect(form.getByText(/Title is required/i)).toBeVisible({ timeout: this.ui.uiTimeout });
    await this.ui.fillPlaceholder(/Steel Staircase|Window Frames|Precast Columns/i, 'Invalid qty job', form);
    await this.ui.fillPlaceholder(/total to manufacture/i, '0', form);
    await this.ui.clickNamed(/^Create$/i, form);
    await expect(form.getByText(/Enter a valid quantity|Unit is required|Workshop is required|Expected delivery date is required/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Manufacturing order required-field messages are shown');
  }

  async proposeDateOnFactoryEdit(title, date) {
    await this.ui.gotoFactory('jobs');
    await this.ui.selectWorkshop(getContext().workshopName);
    await this.page.getByRole('tab', { name: /^Yet to start$/i }).click({ timeout: this.ui.uiTimeout });
    await this.ui.clickJobMenuItem(title, /^Edit$/i);
    await this.page.waitForURL(/manufacturing-order\/edit/i, { timeout: this.defaultTimeout });
    await this.page.getByRole('button', { name: /^Action$/i }).click({ timeout: this.ui.uiTimeout });
    await this.page.getByRole('menuitem', { name: /Propose date/i }).click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Propose date/i);
    await expect(dialog).toBeVisible({ timeout: this.ui.uiTimeout });
    await this.ui.pickDate(dialog, /Proposed date/i, date);
    await this.ui.clickNamed(/^Propose date$/i, dialog);
  }

  async acceptOrDeclineProposedDate(title, actionName) {
    await this.openProject();
    const card = this.ui.jobCard(title);
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.getByRole('button', { name: actionName }).click({ timeout: this.ui.uiTimeout });
    const confirm = this.page.getByRole('button', { name: actionName }).last();
    if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      const dialog = this.ui.formByText(/Decline proposed date|Accept/i);
      if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
        await dialog.getByRole('button', { name: actionName }).click({ timeout: this.ui.uiTimeout });
      }
    }
  }

  async proposeAndAcceptDate() {
    const ctx = getContext();
    if (!has('dateAcceptRaised')) {
      await this.raiseOrder(ctx.dateAcceptJobTitle);
      flag('dateAcceptRaised');
    }
    await this.proposeDateOnFactoryEdit(ctx.dateAcceptJobTitle, ctx.proposedDate);
    await this.ui.expectToast(/Proposed date sent successfully/i);
    await this.acceptOrDeclineProposedDate(ctx.dateAcceptJobTitle, /^Accept date$/i);
    await this.ui.expectToast(/Proposed date accepted/i);
    this.ui.log(`Accepted proposed date for ${ctx.dateAcceptJobTitle}`);
  }

  async expectDateNoLongerWaiting() {
    const ctx = getContext();
    await this.ui.gotoFactory('jobs');
    await this.ui.selectWorkshop(ctx.workshopName);
    const card = this.ui.jobCard(ctx.dateAcceptJobTitle);
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await expect(card.getByRole('button', { name: /Awaiting date confirmation/i })).toHaveCount(0);
    this.ui.log(`${ctx.dateAcceptJobTitle} is no longer waiting on a proposed date`);
  }

  async proposeAndDeclineDate() {
    const ctx = getContext();
    if (!has('dateDeclineRaised')) {
      await this.raiseOrder(ctx.dateDeclineJobTitle);
      flag('dateDeclineRaised');
    }
    await this.proposeDateOnFactoryEdit(ctx.dateDeclineJobTitle, ctx.proposedDate);
    await this.ui.expectToast(/Proposed date sent successfully/i);
    await this.acceptOrDeclineProposedDate(ctx.dateDeclineJobTitle, /^Decline date$/i);
    await this.ui.expectToast(/Proposed date declined/i);
    this.ui.log(`Declined proposed date for ${ctx.dateDeclineJobTitle}`);
  }

  async expectInvalidDates() {
    const ctx = getContext();
    if (!has('invalidDateRaised')) {
      await this.raiseOrder(ctx.invalidDateJobTitle);
      flag('invalidDateRaised');
    }
    await this.ui.gotoFactory('jobs');
    await this.ui.selectWorkshop(ctx.workshopName);
    await this.page.getByRole('tab', { name: /^Yet to start$/i }).click({ timeout: this.ui.uiTimeout }).catch(() => {});
    await this.ui.clickJobMenuItem(ctx.invalidDateJobTitle, /^Edit$/i);
    await this.page.waitForURL(/manufacturing-order\/edit/i, { timeout: this.defaultTimeout });
    await this.ui.pickDate(this.page, /^Ready to leave$/i, ctx.neededOnSite);
    await expect(this.page.getByText(/Ready to leave must be before Needed on site by/i)).toBeVisible({
      timeout: this.ui.uiTimeout,
    });

    await this.page.getByRole('button', { name: /^Action$/i }).click({ timeout: this.ui.uiTimeout });
    await this.page.getByRole('menuitem', { name: /Propose date/i }).click({ timeout: this.ui.uiTimeout });
    const dialog = this.ui.formByText(/Propose date/i);
    await this.ui.pickDate(dialog, /Proposed date/i, ctx.earlyProposedDate);
    await this.ui.clickNamed(/^Propose date$/i, dialog);
    await expect(this.page.getByText(/Proposed date must be on or after the needed on site date/i).first()).toBeVisible({
      timeout: this.ui.uiTimeout,
    });
    this.ui.log('Ready-to-leave and proposed-date validation messages are shown');
  }
}

module.exports = ManufacturingOrderPage;
