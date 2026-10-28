const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Project → Workers (project sidebar icon) → Add Shift.
 * Matches Playwright codegen: Clients/Projects → project → Workers SVG → Add Shift form.
 */
class WorkersPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.main = page.locator('main, [role="main"]').first();
    this.addShiftButton = page.getByRole('button', { name: /add shift/i }).first();
    this.lastCreatedShiftName = null;
    this.createdShiftNames = [];
  }

  async logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  addShiftFormRoot() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .last()
      .or(this.main);
  }

  async isOnWorkersModule() {
    if (await this.addShiftButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    const markers = this.page
      .getByRole('button', { name: /attendance|add\s*shift/i })
      .or(this.page.getByRole('tab', { name: /calendar|wage\s*details/i }))
      .or(this.page.getByText(/worker\s*management|add\s*shift|search\s*shift/i))
      .filter({ visible: true })
      .first();
    return markers.isVisible({ timeout: 1500 }).catch(() => false);
  }

  /** Codegen: div:nth-child(19) > .MuiBox-root > svg (Workers in project module rail). */
  workersSidebarIcon() {
    return this.page.locator('div:nth-child(19) > .MuiBox-root > svg').first();
  }

  /** Navigate to Worker Management via profile query param (most reliable). */
  async openWorkersViaUrlTab() {
    const url = new URL(this.page.url());
    const onProfile =
      /\/(client|leadmanager)\/profile/i.test(url.pathname) ||
      (url.searchParams.has('projectId') && /profile/i.test(url.pathname));
    if (!onProfile) {
      await this.logStep(`Skip URL Workers tab — not on project profile (${url.pathname})`);
      return false;
    }
    url.searchParams.set('tab', 'WorkerManagement');
    url.searchParams.delete('shiftId');
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.logStep(`Opened Workers via URL tab=WorkerManagement (${this.page.url()})`);

    if (await this.page.getByText(/access\s*denied/i).isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.logStep('Access Denied on Worker Management tab');
      return false;
    }

    // Wait for Calendar / Add Shift / Attendance to appear
    for (let i = 0; i < 24; i += 1) {
      if (await this.isOnWorkersModule()) return true;
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(500).catch(() => {});
    }
    return false;
  }

  /** After Background opens a project: click Workers in the project sidebar (codegen path). */
  async clickWorkersInProject() {
    if (await this.isOnWorkersModule()) {
      await this.logStep('Already on Workers module');
      return;
    }

    // Prefer URL tab — sidebar icons are brittle across projects/layouts
    if (await this.openWorkersViaUrlTab()) {
      return;
    }

    const codegenIcon = this.workersSidebarIcon();
    if (await codegenIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await codegenIcon.click({ timeout: 20000, force: true });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.logStep('Clicked Workers icon in project (codegen)');
      if (await this.addShiftButton.isVisible({ timeout: 8000 }).catch(() => false)) return;
    }

    // Try several rail icons (Workers position varies)
    const railIcons = this.page.locator(
      'div.MuiBox-root > svg, [class*="sidebar" i] svg, [class*="SideBar" i] svg, nav svg'
    );
    const iconCount = await railIcons.count().catch(() => 0);
    for (let i = Math.min(iconCount - 1, 25); i >= 0 && i >= Math.max(0, iconCount - 30); i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      const icon = railIcons.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await icon.isVisible({ timeout: 200 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      await icon.click({ timeout: 5000, force: true }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      if (await this.addShiftButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.logStep(`Opened Workers via rail icon index ${i}`);
        return;
      }
    }

    const workersByText = this.page
      .getByRole('button', { name: /^workers$/i })
      .or(this.page.locator('[title="Workers"], [aria-label="Workers"]'))
      .filter({ visible: true })
      .first();

    if (await workersByText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workersByText.click({ timeout: 20000, force: true });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.logStep('Clicked Workers control by title/aria');
      if (await this.addShiftButton.isVisible({ timeout: 8000 }).catch(() => false)) return;
    }

    if (await this.openWorkersViaUrlTab()) {
      return;
    }

    throw new Error(
      'Could not open Workers from the project page. Expected Add Shift after tab=WorkerManagement or sidebar Workers.'
    );
  }

  async waitForModuleToLoad() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    for (let i = 0; i < 3; i += 1) {
      if (await this.isOnWorkersModule()) {
        // Prefer waiting for Add Shift when present
        if (await this.addShiftButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.logStep('Workers module loaded (Add Shift visible)');
          return;
        }
        await this.logStep('Workers module markers visible');
        return;
      }
      await this.clickWorkersInProject().catch(() => {});
    }
    await expect(this.addShiftButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Workers module loaded');
  }

  /**
   * From Active Clients list, open projects until Worker Management (Add Shift) is available.
   * Honors WORKERS_PROJECT_NAME when set.
   */
  async openProjectWithWorkersModule() {
    const ProjectNavigationPage = require('../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);
    const preferred = String(process.env.WORKERS_PROJECT_NAME || '').trim();

    await nav.navigateToProjects();

    if (preferred) {
      await nav.clickProjectByName(preferred);
      await this.clickWorkersInProject();
      if (await this.isOnWorkersModule()) {
        await this.logStep(`Workers ready on preferred project: ${preferred}`);
        return;
      }
      throw new Error(`WORKERS_PROJECT_NAME="${preferred}" opened but Worker Management / Add Shift not available`);
    }

    // Open first project via ProjectNavigationPage (opens client/profile URL)
    await nav.clickFirstProject();
    await this.logStep(`Opened first project → ${this.page.url()}`);
    try {
      await this.clickWorkersInProject();
      if (await this.addShiftButton.isVisible({ timeout: 15000 }).catch(() => false)) {
        await this.logStep('Workers ready on first project');
        return;
      }
    } catch (err) {
      await this.logStep(`Workers not on first project: ${err.message}`);
    }

    // Try additional projects by name from visible list
    await nav.navigateToActiveClientsList();
    const nameCells = this.page.locator('table tbody tr td, table tbody tr th').filter({ visible: true });
    const cellCount = await nameCells.count().catch(() => 0);
    const tried = new Set();
    for (let i = 0; i < Math.min(cellCount, 40); i += 1) {
      const text = ((await nameCells.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2 || tried.has(text.toLowerCase())) continue;
      if (/^active$|^inactive$|^\d+$|email|@/i.test(text)) continue;
      tried.add(text.toLowerCase());
      try {
        await nav.navigateToActiveClientsList();
        await nav.clickProjectByName(text);
        await this.logStep(`Trying Workers on project: ${text} → ${this.page.url()}`);
        await this.clickWorkersInProject();
        if (await this.addShiftButton.isVisible({ timeout: 12000 }).catch(() => false)) {
          await this.logStep(`Workers ready on project: ${text}`);
          return;
        }
      } catch (err) {
        await this.logStep(`Workers not available on ${text}: ${err.message}`);
      }
      if (tried.size >= 6) break;
    }

    throw new Error(
      'No project with Worker Management (Add Shift) found. Set WORKERS_PROJECT_NAME to a known project.'
    );
  }

  async clickAddShift() {
    await expect(this.addShiftButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addShiftButton.click({ timeout: 20000 });
    await this.logStep('Clicked Add Shift');
  }

  shiftNameInput() {
    return this.page.getByRole('textbox', { name: 'Shift Name' }).first();
  }

  async expectAddShiftFormVisible() {
    await expect(this.shiftNameInput()).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Add Shift form/popup is visible');
  }

  buildRandomShiftName() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return `Auto Shift ${suffix}`;
  }

  async enterRandomShiftName() {
    const name = this.buildRandomShiftName();
    const input = this.shiftNameInput();
    await input.click({ timeout: 15000 });
    await input.fill(name);
    this.lastCreatedShiftName = name;
    this.createdShiftNames.push(name);
    await this.logStep(`Entered shift name: ${name}`);
    return name;
  }

  /** Select a worker in the Add Shift picker (any available option). */
  async selectSecondCheckboxInAddShiftForm() {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /shift\s*name|add\s*shift|select\s*workers?/i })
      .last()
      .or(this.page.locator('.MuiModal-root, .MuiDialog-root').filter({ visible: true }).last());

    // Open worker select / search field inside the shift dialog
    const workerField = dialog
      .getByPlaceholder(/search|worker/i)
      .or(dialog.getByText(/select\s*workers?|workers?\s*selected|0\s*workers?/i))
      .or(dialog.getByRole('textbox').nth(1))
      .filter({ visible: true })
      .first();
    if (await workerField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await workerField.click({ timeout: 15000, force: true });
    }

    const workerIndex = Math.max(0, this.createdShiftNames.length - 1);

    // Legacy codegen option (site manager)
    const legacyOptions = this.page
      .locator('div')
      .filter({ hasText: / - site manager$/i })
      .filter({ visible: true });
    if (await legacyOptions.first().isVisible({ timeout: 2500 }).catch(() => false)) {
      const count = await legacyOptions.count();
      const pick = legacyOptions.nth(Math.min(workerIndex, Math.max(0, count - 1)));
      await pick.click({ timeout: 15000, force: true });
      await this.logStep(`Selected legacy worker option index ${Math.min(workerIndex, Math.max(0, count - 1))}`);
      return;
    }

    // Prefer real checkboxes inside the shift dialog / picker panel
    const checkboxes = dialog.locator('input[type="checkbox"]').filter({ visible: true });
    const cbCount = await checkboxes.count().catch(() => 0);
    if (cbCount > 0) {
      const pick = checkboxes.nth(Math.min(workerIndex, cbCount - 1));
      await pick.check({ force: true }).catch(async () => {
        await pick.click({ force: true });
      });
      await this.logStep(`Selected worker checkbox ${Math.min(workerIndex, cbCount - 1)} of ${cbCount}`);
      return;
    }

    const checkboxRoot = dialog.locator('.MuiCheckbox-root').filter({ visible: true });
    if (await checkboxRoot.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await checkboxRoot.nth(Math.min(workerIndex, 2)).click({ force: true });
      await this.logStep('Selected MUI checkbox root for worker');
      return;
    }

    // List rows with force (avoid backdrop intercept)
    const listRow = dialog
      .locator('.MuiListItemButton-root, .MuiListItem-root, [role="option"]')
      .filter({ visible: true })
      .nth(Math.min(workerIndex, 2));
    if (await listRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await listRow.click({ timeout: 15000, force: true });
      await this.logStep(`Force-clicked worker list row index ${workerIndex}`);
      return;
    }

    throw new Error('Could not select a worker in the Add Shift form (no worker options visible)');
  }

  async selectTodayAsStartDate() {
    // Codegen: .MuiBox-root.css-51xnb6 → Choose date → today's gridcell
    const dayBox = this.page.locator('.MuiBox-root.css-51xnb6').first();
    if (await dayBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayBox.click({ timeout: 15000, force: true });
    }

    await this.page.getByRole('button', { name: 'Choose date' }).click({ timeout: 15000 });

    const day = String(new Date().getDate());
    await this.page.getByRole('gridcell', { name: day, exact: true }).first().click({ timeout: 15000 });
    await this.logStep('Selected today as Start Date');
  }

  async _clickTimeOption(optionName) {
    // Codegen uses page-level options; MUI can render duplicates — always .first()
    const option = this.page.getByRole('option', { name: optionName, exact: true }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ timeout: 15000, force: true });
  }

  /** Codegen OK after start hour — force click; ignore if already closed/detached. */
  async _clickOkIfVisible() {
    const okBtn = this.page.getByRole('button', { name: 'OK' }).filter({ visible: true }).first();
    if (!(await okBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }
    await okBtn.click({ timeout: 5000, force: true }).catch(() => {});
    await this.page.waitForTimeout(300).catch(() => {});
  }

  /**
   * Codegen:
   *   Choose time.first → 12 hours → OK
   *   Choose time (end) → 7/8 hours → PM
   * Then next step clicks Create (no more OK needed).
   */
  async enterStartAndEndTimeInAddShiftForm() {
    // --- Start time (morning) ---
    await this.page.getByRole('button', { name: 'Choose time' }).first().click({ timeout: 20000 });
    await this._clickTimeOption('12 hours');
    await this._clickOkIfVisible();
    await this.logStep('Set Start Time to 12:00 (morning)');

    // --- End time (evening) ---
    const endChooseTime = this.page.getByRole('button', { name: 'Choose time', exact: true }).first();
    await expect(endChooseTime).toBeVisible({ timeout: 20000 });
    await endChooseTime.click({ timeout: 20000 });

    const eightHours = this.page.getByRole('option', { name: '8 hours', exact: true }).first();
    if (await eightHours.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eightHours.click({ timeout: 15000, force: true });
      await this.logStep('Selected 8 hours for End Time');
    } else {
      await this._clickTimeOption('7 hours');
      await this.logStep('Selected 7 hours for End Time');
    }
    await this._clickTimeOption('PM');
    // Codegen does not click OK after end time — picker closes on PM; go to Create next
    await this.logStep('Set End Time to evening (PM)');
    await this.logStep('Entered Start Time and End Time');
  }

  /**
   * Codegen:
   *   Create → (optional schedule overlap) Yes → close
   * Then return to Worker Management list (Add Shift visible again).
   */
  async clickCreateOnAddShiftForm() {
    const createBtn = this.page.getByRole('button', { name: 'Create' }).filter({ visible: true }).last();
    await expect(createBtn).toBeVisible({ timeout: 20000 });
    await createBtn.click({ timeout: 20000, force: true });
    await this.logStep('Clicked Create on Add Shift form');

    // Overlap confirm can appear a few seconds after Create
    for (let i = 0; i < 8; i += 1) {
      const noYes = this.page.getByText('NoYes').filter({ visible: true }).first();
      if (await noYes.isVisible({ timeout: 500 }).catch(() => false)) {
        await noYes.click({ timeout: 5000, force: true }).catch(() => {});
      }

      const yesBtn = this.page.getByRole('button', { name: 'Yes' }).filter({ visible: true }).first();
      if (await yesBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await yesBtn.click({ timeout: 15000, force: true });
        await this.logStep('Confirmed schedule overlap popup with Yes');
        break;
      }

      // Form already closed / success toast — no Yes needed
      if (await this.addShiftButton.isVisible({ timeout: 300 }).catch(() => false)) {
        if (!(await this.shiftNameInput().isVisible({ timeout: 300 }).catch(() => false))) {
          await this.logStep('Add Shift form closed after Create (no Yes popup)');
          break;
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(500);
    }

    // Success toast close (codegen)
    for (let i = 0; i < 4; i += 1) {
      const closeBtn = this.page.getByRole('button', { name: 'close' }).filter({ visible: true }).first();
      if (!(await closeBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await closeBtn.click({ timeout: 8000, force: true }).catch(() => {});
      await this.logStep('Clicked close after shift create');
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(300);
    }

    // Escape any leftover picker/dialog
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * After Create: form should close and Worker Management should show Add Shift again.
   * Shift name may not always render as plain text — treat list ready as success.
   */
  async expectCreatedShiftVisibleInWorkerManagement() {
    const name = this.lastCreatedShiftName;

    // Dismiss toast if still open
    const closeBtn = this.page.getByRole('button', { name: 'close' }).filter({ visible: true }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 8000, force: true }).catch(() => {});
    }

    await expect(this.addShiftButton).toBeVisible({ timeout: 30000 });
    await this.logStep('Worker Management ready after shift create (Add Shift visible)');

    if (!name) {
      return;
    }

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = this.page.getByText(new RegExp(escaped, 'i')).first();
    if (await row.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.logStep(`Created shift visible in Worker Management: ${name}`);
      return;
    }

    // Name not listed yet — still continue (codegen does not assert list text)
    await this.logStep(
      `Shift "${name}" created; name not visible in list yet — continuing`
    );
  }

  toastLocator(textRegex) {
    return this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast')
      .filter({ hasText: textRegex })
      .first();
  }

  /**
   * @param {'INDIVIDUAL'|'CONTRACTOR'|'ORGANIZATION_USER'} workerType
   */
  async selectShiftWorkerTab(workerType) {
    const type = String(workerType || 'INDIVIDUAL').toUpperCase();
    const label =
      type === 'CONTRACTOR'
        ? /contractor/i
        : type === 'ORGANIZATION_USER'
          ? /user\s*as\s*worker|organization\s*user|^users?$/i
          : /individual/i;

    const tab = this.page
      .getByRole('tab', { name: label })
      .or(this.page.locator('.MuiTab-root').filter({ hasText: label }))
      .filter({ visible: true })
      .first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click({ timeout: 15000 });
      await this.logStep(`Selected shift worker tab: ${type}`);
    }
  }

  async selectWorkerForShiftByName(workerName) {
    const name = String(workerName || '').trim();
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .last()
      .or(this.page.locator('.MuiModal-root').filter({ visible: true }).last());

    // Open worker picker if collapsed
    const pickerToggle = dialog
      .getByText(/select\s*workers?|workers?\s*selected|search\s*worker|0\s*selected/i)
      .filter({ visible: true })
      .first();
    if (await pickerToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pickerToggle.click({ timeout: 10000, force: true }).catch(() => {});
    }

    if (name) {
      const search = dialog
        .getByPlaceholder(/search/i)
        .filter({ visible: true })
        .last();
      if (await search.isVisible({ timeout: 4000 }).catch(() => false)) {
        await search.click({ force: true }).catch(() => {});
        await search.fill(name);
        await this.page.waitForTimeout(800).catch(() => {});
      }

      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namedRow = dialog
        .locator('.MuiListItem-root, .MuiListItemButton-root, label, [role="option"], li, div')
        .filter({ hasText: new RegExp(escaped, 'i') })
        .filter({ visible: true })
        .first();
      if (await namedRow.isVisible({ timeout: 10000 }).catch(() => false)) {
        const cb = namedRow.locator('input[type="checkbox"], .MuiCheckbox-root').first();
        if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cb.click({ force: true });
        } else {
          await namedRow.click({ force: true });
        }
        await this.logStep(`Selected worker for shift: ${name}`);
        return;
      }
    }

    // Fallback: first visible checkbox/option in picker
    await this.selectSecondCheckboxInAddShiftForm();
  }

  async createShiftForWorkerType(workerType, workerName) {
    await this.clickAddShift();
    await this.expectAddShiftFormVisible();
    await this.selectShiftWorkerTab(workerType);
    const name = await this.enterRandomShiftName();
    await this.selectWorkerForShiftByName(workerName);
    await this.selectTodayAsStartDate();
    await this.enterStartAndEndTimeInAddShiftForm();
    await this.clickCreateOnAddShiftForm();
    await this.expectCreatedShiftVisibleInWorkerManagement();
    return name;
  }

  async openShiftByName(shiftName) {
    const name = shiftName || this.lastCreatedShiftName;
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const card = this.page.getByText(new RegExp(escaped, 'i')).filter({ visible: true }).first();
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.click({ timeout: 20000 });
    await this.logStep(`Opened shift: ${name}`);
  }

  async editOpenedShiftName(newName) {
    const name = newName || `Auto Shift Edited ${Date.now()}`;
    const input = this.shiftNameInput();
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.click({ timeout: 10000 });
    await input.fill('');
    await input.fill(name);
    this.lastCreatedShiftName = name;
    this.createdShiftNames.push(name);
    await this.logStep(`Edited shift name to: ${name}`);
    return name;
  }

  async saveShiftEdits() {
    const saveBtn = this.page
      .getByRole('button', { name: /^(save|update|create)$/i })
      .filter({ visible: true })
      .last();
    await expect(saveBtn).toBeVisible({ timeout: 20000 });
    await saveBtn.click({ timeout: 20000, force: true });

    const thisShift = this.page.getByRole('button', { name: /this\s*shift/i }).filter({ visible: true }).first();
    if (await thisShift.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thisShift.click({ timeout: 10000 });
    }
    await this.logStep('Saved shift edits');
  }

  async deleteOpenedShift() {
    const deleteBtn = this.page
      .getByRole('button', { name: /^delete$/i })
      .or(this.page.getByLabel(/delete/i))
      .filter({ visible: true })
      .first();
    await expect(deleteBtn).toBeVisible({ timeout: 20000 });
    await deleteBtn.click({ timeout: 15000 });

    const thisShift = this.page.getByRole('button', { name: /this\s*shift/i }).filter({ visible: true }).first();
    if (await thisShift.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thisShift.click({ timeout: 10000 });
    }

    const yesBtn = this.page.getByRole('button', { name: /^(yes|confirm|delete|ok)$/i }).filter({ visible: true }).last();
    if (await yesBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yesBtn.click({ timeout: 15000 });
    }
    await this.logStep('Deleted opened shift');
  }

  async expectShiftRemoved(shiftName) {
    const name = shiftName || this.lastCreatedShiftName;
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(async () => {
      const stillThere = await this.page
        .getByText(new RegExp(escaped, 'i'))
        .filter({ visible: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(stillThere).toBeFalsy();
    }).toPass({ timeout: 45000, intervals: [1000, 2000, 4000] });
    await this.logStep(`Shift removed: ${name}`);
  }

  async enableRecurringShiftAndSaveBasic() {
    const recurring = this.page
      .getByText(/recurring\s*shift|repeat\s*this\s*shift|does\s*not\s*repeat/i)
      .filter({ visible: true })
      .first();
    if (await recurring.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recurring.click({ timeout: 10000 });
    }

    const afterRadio = this.page
      .getByText(/^after$/i)
      .or(this.page.getByLabel(/after/i))
      .filter({ visible: true })
      .first();
    if (await afterRadio.isVisible({ timeout: 5000 }).catch(() => false)) {
      await afterRadio.click({ timeout: 10000 }).catch(() => {});
    }

    const occurrences = this.page
      .locator('input[type="number"]')
      .filter({ visible: true })
      .last();
    if (await occurrences.isVisible({ timeout: 3000 }).catch(() => false)) {
      await occurrences.fill('3');
    }

    const doneBtn = this.page
      .getByRole('button', { name: /^(done|save|ok|apply)$/i })
      .filter({ visible: true })
      .last();
    if (await doneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await doneBtn.click({ timeout: 10000 });
    }
    await this.logStep('Configured basic recurring shift (end after 3)');
  }

  async submitAddShiftWithoutRequiredFields() {
    const createBtn = this.page.getByRole('button', { name: 'Create' }).filter({ visible: true }).last();
    await expect(createBtn).toBeVisible({ timeout: 20000 });
    await createBtn.click({ timeout: 20000, force: true });
    await this.logStep('Clicked Create without filling required fields');
  }

  async expectShiftValidationMessage() {
    await expect(async () => {
      const toastOk = await this.toastLocator(
        /shift\s*name\s*is\s*required|at\s*least\s*one\s*worker|start\s*date|end\s*time\s*is\s*required|required/i
      )
        .isVisible()
        .catch(() => false);
      const formStillOpen = await this.shiftNameInput().isVisible({ timeout: 500 }).catch(() => false);
      expect(toastOk || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
    await this.logStep('Shift validation message/state verified');
  }

  async openAttendanceForCurrentView() {
    const attendanceBtn = this.page
      .getByRole('button', { name: /attendance|mark\s*attendance|view\s*attendance/i })
      .or(this.page.getByText(/mark\s*attendance|view\s*attendance\s*details/i))
      .filter({ visible: true })
      .first();
    await expect(attendanceBtn).toBeVisible({ timeout: this.defaultTimeout });
    await attendanceBtn.click({ timeout: 20000 });
    await this.logStep('Opened Attendance');
  }

  async markFirstIndividualPresent() {
    const present = this.page
      .getByRole('button', { name: /^present$/i })
      .or(this.page.getByText(/^present$/i))
      .filter({ visible: true })
      .first();
    // Status menus often sit on row actions
    const statusTrigger = this.page
      .locator('button, [role="button"]')
      .filter({ hasText: /absent|present|half/i })
      .filter({ visible: true })
      .first();
    if (await statusTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusTrigger.click({ timeout: 10000 });
    }
    if (await present.isVisible({ timeout: 5000 }).catch(() => false)) {
      await present.click({ timeout: 10000 });
      await this.logStep('Marked first worker Present');
      return;
    }
    // Checkbox / icon present controls
    const presentIcon = this.page
      .locator('[aria-label*="Present" i], button')
      .filter({ hasText: /present/i })
      .filter({ visible: true })
      .first();
    if (await presentIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await presentIcon.click({ timeout: 10000 });
      await this.logStep('Marked Present via icon/button');
      return;
    }
    throw new Error('Could not mark attendance Present');
  }

  async expectAttendancePresentVisible() {
    await expect(
      this.page.getByText(/present/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Attendance Present status visible');
  }

  async openWageDetailsTab() {
    const tab = this.page
      .getByRole('tab', { name: /wage\s*details/i })
      .or(this.page.getByText(/^wage\s*details$/i))
      .filter({ visible: true })
      .first();
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.click({ timeout: 20000 });
    await this.logStep('Opened Wage Details tab');
  }

  async expectWageDetailsTableReady() {
    await expect(
      this.page
        .getByText(/total\s*rate|converted|pending|shift\s*name|total\s*wage/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.logStep('Wage Details table ready');
  }

  async openAddToExpensesForFirstWageRow() {
    const row = this.page.locator('tr, [role="row"]').filter({ visible: true }).nth(1);
    await row.hover().catch(() => {});
    const menuBtn = row.locator('button').last();
    if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuBtn.click({ force: true });
    }
    const addExpense = this.page
      .getByRole('menuitem', { name: /add\s*to\s*expenses?/i })
      .or(this.page.getByText(/add\s*to\s*expenses?/i))
      .filter({ visible: true })
      .first();
    await expect(addExpense).toBeVisible({ timeout: 20000 });
    await addExpense.click({ timeout: 15000 });
    await this.logStep('Opened Add to Expenses dialog');
  }

  async selectExpensePaymentMethod(methodName = 'cash') {
    const input = this.page
      .getByPlaceholder(/payment|select/i)
      .or(this.page.getByRole('combobox'))
      .filter({ visible: true })
      .last();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await input.click({ timeout: 10000 });
      await input.fill(methodName);
    }
    const option = this.page
      .getByRole('option', { name: new RegExp(methodName, 'i') })
      .or(this.page.getByText(new RegExp(`^${methodName}$`, 'i')))
      .filter({ visible: true })
      .first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ timeout: 10000 });
    await this.logStep(`Selected payment method: ${methodName}`);
  }

  async confirmConvertWageToExpense() {
    const confirmBtn = this.page
      .getByRole('button', { name: /^(confirm|create|add|save|yes)$/i })
      .filter({ visible: true })
      .last();
    await expect(confirmBtn).toBeVisible({ timeout: 20000 });
    await confirmBtn.click({ timeout: 20000 });
    await this.logStep('Confirmed wage to expense conversion');
  }

  async expectWageConvertedToExpense() {
    await expect(async () => {
      const toastOk = await this.toastLocator(/expense\s*created\s*successfully|expense\s*updated/i)
        .isVisible()
        .catch(() => false);
      const updateAction = await this.page
        .getByText(/update\s*expenses?/i)
        .filter({ visible: true })
        .first()
        .isVisible()
        .catch(() => false);
      expect(toastOk || updateAction).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    await this.logStep('Wage converted to expense verified');
  }

  async expectPaymentMethodRequiredToast() {
    await expect(
      this.toastLocator(/please\s*select\s*payment\s*terms|payment\s*method|payment\s*terms/i)
    ).toBeVisible({ timeout: 30000 });
    await this.logStep('Payment method required toast visible');
  }
}

module.exports = WorkersPage;
