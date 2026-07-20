const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Project → Task Management (Kanban / List).
 *
 * UI source: `intoaec-UI/src/features/TaskManagement/` (`TaskManagementHome.tsx`, kanban board, create modal).
 *
 * Layering per `AGENTS.md`:
 *   - Feature: `features/admin/projects/managements/taskmanagement/Task_TestCases.feature`
 *   - Steps:   `step-definitions/admin/projects/management/TaskManagement/TaskStep.js`
 *   - Page:    this file
 *
 * Schedule cross-checks (kanban card / linked schedule) stay in `../TaskPage.js` — do not move or break those flows.
 */
class TaskManagementPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = 45000;
    this.quickTimeout = 10000;

    this.main = page.locator('main, [role="main"]').first();
    this.taskTablist = page
      .getByRole('tablist')
      .filter({ has: page.getByRole('tab', { name: /^kanban$/i }) })
      .filter({ has: page.getByRole('tab', { name: /^list$/i }) })
      .first();
    this.kanbanTab = this.taskTablist.getByRole('tab', { name: /^kanban$/i }).first();
    this.listTab = this.taskTablist.getByRole('tab', { name: /^list$/i }).first();
    this.addTaskButton = page.getByRole('button', { name: /^add task$/i }).first();
    this.moduleTitle = page
      .getByRole('heading', { name: /task management/i })
      .or(page.getByText(/^task management$/i))
      .first();
    this._pendingTaskRandomStartMs = null;
  }

  async logStep(msg) {
    console.log(msg);
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _getScheduleDateHelper() {
    if (!this._scheduleDateHelper) {
      const SchedulePage = require('../Schedule/SchedulePage');
      this._scheduleDateHelper = new SchedulePage(this.page);
    }
    return this._scheduleDateHelper;
  }

  _normalizeColumnDisplayName(columnName) {
    const key = String(columnName || '').trim().toLowerCase();
    const map = {
      todo: 'To Do',
      'to do': 'To Do',
      'in progress': 'In Progress',
      inprogress: 'In Progress',
      completed: 'Completed',
    };
    return map[key] || String(columnName).trim();
  }

  /** True when Task Management toolbar/tabs are visible (reuse same tab across TCs). */
  async isOnTaskModule() {
    const kanban = await this.kanbanTab.isVisible({ timeout: 1500 }).catch(() => false);
    const list = await this.listTab.isVisible({ timeout: 1500 }).catch(() => false);
    if (kanban && list) return true;

    const addTask = await this.addTaskButton.isVisible({ timeout: 1500 }).catch(() => false);
    const title = await this.moduleTitle.isVisible({ timeout: 1500 }).catch(() => false);
    const todoCol = await this.page.getByText(/^to do$/i).first().isVisible({ timeout: 1500 }).catch(() => false);
    return addTask || title || todoCol;
  }

  async _waitTaskSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await new Promise((r) => setTimeout(r, 800));
  }

  createTaskModal() {
    return this.page.locator('.boqUI.prodandserviceUI').filter({ visible: true }).last();
  }

  _addColumnDialog() {
    return this.page.getByRole('dialog').filter({ hasText: /add column/i }).filter({ visible: true }).last();
  }

  async dismissOpenOverlays() {
    await this.hideFreshchatWidget();
    for (let i = 0; i < 3; i += 1) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    const addCol = this._addColumnDialog();
    if (await addCol.isVisible({ timeout: 500 }).catch(() => false)) {
      const cancel = addCol.getByRole('button', { name: /cancel/i }).first();
      if (await cancel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancel.click({ force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
    }

    const taskPanel = this.createTaskModal();
    if (await taskPanel.isVisible({ timeout: 500 }).catch(() => false)) {
      const close = taskPanel.locator('button').first();
      if (await close.isVisible({ timeout: 1000 }).catch(() => false)) {
        await close.click({ force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
    }

    const dialog = this.page.locator('[role="dialog"]:visible, .MuiDrawer-paper:visible').last();
    if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
      const close = dialog
        .getByRole('button', { name: /close|cancel/i })
        .or(dialog.locator('button[aria-label="Close"]'))
        .first();
      if (await close.isVisible({ timeout: 1000 }).catch(() => false)) {
        await close.click({ force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
    }
  }

  async waitForModuleToLoad() {
    if (await this.isOnTaskModule()) {
      await this.logStep('Task Management module already loaded');
      return;
    }
    await expect(async () => {
      expect(await this.isOnTaskModule()).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1500, 3000] });
    await this._waitTaskSettled();
    await this.logStep('Task Management module loaded');
  }

  /**
   * Open Task module from project management (works when coming from Schedule or project profile).
   * Does not modify Schedule page objects or Schedule feature flows.
   */
  async navigateToTaskModule() {
    if (await this.isOnTaskModule()) {
      await this.logStep('Already on Task Management — skipping navigation');
      return;
    }

    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    const currentUrl = this.page.url();
    const projectBaseMatch = currentUrl.match(/(.*\/project\/[^/]+)/);
    if (projectBaseMatch) {
      await this.page.goto(projectBaseMatch[1], { waitUntil: 'domcontentloaded' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    }

    const pmBtn = profile.projectManagementHeading;
    if (!(await pmBtn.isVisible({ timeout: 8000 }).catch(() => false))) {
      const ProjectNavigationPage = require('../../ProjectNavigationPage');
      const nav = new ProjectNavigationPage(this.page);
      if (await nav.projectsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nav.projectsLink.click({ force: true });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (await nav.firstProject.isVisible({ timeout: 8000 }).catch(() => false)) {
        await nav.firstProject.click({ timeout: 15000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (await pmBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await pmBtn.click({ force: true, timeout: 15000 });
      await new Promise((r) => setTimeout(r, 800));
    }

    await profile.clickModuleCard('Task');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForModuleToLoad();
  }

  async switchToKanbanView() {
    await this.hideFreshchatWidget();
    if (await this.kanbanTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      const selected = (await this.kanbanTab.getAttribute('aria-selected').catch(() => '')) === 'true';
      if (!selected) await this.kanbanTab.click({ force: true, timeout: this.quickTimeout });
    }
    await expect(this.page.getByText(/^to do$/i).first()).toBeVisible({ timeout: this.uiTimeout }).catch(() => {});
    await this.logStep('Switched to Kanban view');
  }

  async switchToListView() {
    await this.hideFreshchatWidget();
    if (await this.listTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      const selected = (await this.listTab.getAttribute('aria-selected').catch(() => '')) === 'true';
      if (!selected) await this.listTab.click({ force: true, timeout: this.quickTimeout });
    }
    await this._waitTaskSettled();
    await this.logStep('Switched to List view');
  }

  async openCreateTaskModal() {
    await this.switchToKanbanView();
    await this.hideFreshchatWidget();
    await this.addTaskButton.click({ force: true, timeout: this.uiTimeout });
    await this.expectCreateTaskModalOpen();
    await this.logStep('Opened Add Task offcanvas');
  }

  async expectCreateTaskModalOpen() {
    const modal = this.createTaskModal();
    await expect(modal).toBeVisible({ timeout: this.uiTimeout });
    await expect(modal.getByRole('button', { name: /^create$/i })).toBeVisible({ timeout: this.uiTimeout });
    await expect(modal.locator('input[name="taskName"]')).toBeVisible({ timeout: this.uiTimeout });
  }

  async fillTaskNameOnCreateForm(taskName) {
    const modal = this.createTaskModal();
    const input = modal.locator('input[name="taskName"]');
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(String(taskName));
    await this.logStep(`Filled task name: ${taskName}`);
  }

  async selectTaskStatusOnCreateForm(statusLabel) {
    const modal = this.createTaskModal();
    const key = String(statusLabel || '').trim().toLowerCase();
    const patterns = {
      'to do': /to do/i,
      todo: /to do/i,
      'in progress': /in progress/i,
      inprogress: /in progress/i,
      completed: /completed/i,
    };
    const optionPattern = patterns[key] || new RegExp(`^\\s*${this._escapeRegex(statusLabel)}\\s*$`, 'i');

    const statusCombobox = modal.getByRole('combobox').first();
    await expect(statusCombobox).toBeVisible({ timeout: this.uiTimeout });
    await statusCombobox.click({ force: true, timeout: this.uiTimeout });

    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ force: true, timeout: this.uiTimeout });
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep(`Selected task status: ${statusLabel}`);
  }

  async pickRandomStartDateTimeOnCreateTaskForm() {
    const schedule = this._getScheduleDateHelper();
    const modal = this.createTaskModal();
    await schedule._prepareCreateFormForDateEntry();
    const start = schedule.randomWeekdayDateTimeBetween(3, 25);
    this._pendingTaskRandomStartMs = start.getTime();
    await schedule._pickScheduleCreateFormDateTime(modal, start, 'start');

    const endInput = modal.getByLabel(/end date/i);
    await expect(async () => {
      expect(await endInput.isEnabled().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 25000, intervals: [400, 1000, 2000] });
    await this.logStep('Picked random start datetime on task create form');
  }

  async pickRandomEndDateTimeAfterStartOnCreateTaskForm() {
    const schedule = this._getScheduleDateHelper();
    const modal = this.createTaskModal();
    await schedule._prepareCreateFormForDateEntry();

    const stalePopper = schedule._scheduleDatePickerPopper();
    if (await stalePopper.isVisible({ timeout: 800 }).catch(() => false)) {
      await schedule._muiConfirmPickerIfPresent();
      await this.page.keyboard.press('Escape').catch(() => {});
      await stalePopper.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    }

    const base = new Date(this._pendingTaskRandomStartMs || Date.now());
    const end = schedule.endDateTimeCandidatesAfterStart(base)[0];
    await schedule._pickScheduleCreateFormDateTime(modal, end, 'end');
    this._pendingTaskRandomStartMs = null;
    await this.logStep('Picked random end datetime after start on task create form');
  }

  async submitCreateTaskForm() {
    const modal = this.createTaskModal();
    const schedule = this._getScheduleDateHelper();
    await schedule._muiConfirmPickerIfPresent();
    await this.page.keyboard.press('Escape').catch(() => {});
    await schedule._scheduleDatePickerPopper().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const createBtn = modal.getByRole('button', { name: /^create$/i }).first();
    await expect(createBtn).toBeVisible({ timeout: this.uiTimeout });
    await createBtn.click({ force: true, timeout: this.uiTimeout });

    await expect(modal).toBeHidden({ timeout: this.defaultTimeout });
    await this._waitTaskSettled();
    await this.logStep('Submitted task create form');
  }

  async scrollKanbanHorizontallyToEnd() {
    await this.switchToKanbanView();
    await this.page.evaluate(() => {
      const columns = document.querySelectorAll('[data-kanban-column-id]');
      if (!columns.length) return;
      let node = columns[columns.length - 1].parentElement;
      while (node) {
        if (node.scrollWidth > node.clientWidth + 8) {
          node.scrollLeft = node.scrollWidth;
          return;
        }
        node = node.parentElement;
      }
    });
    await new Promise((r) => setTimeout(r, 500));
    await this.logStep('Scrolled kanban board horizontally to the end');
  }

  async scrollKanbanUntilColumnVisible(columnName) {
    const displayName = this._normalizeColumnDisplayName(columnName);
    const nameRe = new RegExp(`^\\s*${this._escapeRegex(displayName)}\\s*$`, 'i');

    await expect(async () => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const col = this.page.locator('[data-kanban-column-id]').filter({
          has: this.page.getByText(nameRe),
        });
        if (await col.first().isVisible({ timeout: 800 }).catch(() => false)) {
          await col.first().scrollIntoViewIfNeeded().catch(() => {});
          return;
        }
        await this.page.evaluate((step) => {
          const columns = document.querySelectorAll('[data-kanban-column-id]');
          if (!columns.length) return;
          let node = columns[0].parentElement;
          while (node) {
            if (node.scrollWidth > node.clientWidth + 8) {
              node.scrollLeft += Math.max(280, node.clientWidth * 0.6) * step;
              return;
            }
            node = node.parentElement;
          }
        }, attempt === 0 ? 1 : 1);
        await new Promise((r) => setTimeout(r, 400));
      }
      const visible = await this.page
        .locator('[data-kanban-column-id]')
        .filter({ has: this.page.getByText(nameRe) })
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      expect(visible).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
  }

  async _resolveKanbanColumn(columnName) {
    const displayName = this._normalizeColumnDisplayName(columnName);
    await this.scrollKanbanUntilColumnVisible(displayName);
    const nameRe = new RegExp(`^\\s*${this._escapeRegex(displayName)}\\s*$`, 'i');
    const column = this.page.locator('[data-kanban-column-id]').filter({
      has: this.page.getByText(nameRe),
    }).first();
    await expect(column).toBeVisible({ timeout: this.uiTimeout });
    return column;
  }

  async expectKanbanColumnVisible(columnName) {
    await this._resolveKanbanColumn(columnName);
    await this.logStep(`Kanban column visible: ${columnName}`);
  }

  async expectTaskCardInKanbanColumn(columnName, taskName) {
    await this.switchToKanbanView();
    const column = await this._resolveKanbanColumn(columnName);
    const card = column.getByText(String(taskName), { exact: false }).first();
    await expect(async () => {
      expect(await card.isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 90000, intervals: [1000, 2500, 5000] });
    await this.logStep(`Task "${taskName}" visible in column "${columnName}"`);
  }

  async openAddColumnDialog() {
    await this.scrollKanbanHorizontallyToEnd();
    const addColumnBtn = this.page.getByRole('button', { name: /add column/i }).first();
    await expect(addColumnBtn).toBeVisible({ timeout: this.uiTimeout });
    await addColumnBtn.click({ force: true, timeout: this.uiTimeout });
    const dialog = this._addColumnDialog();
    await expect(dialog).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep('Opened Add Column dialog');
  }

  async setAddColumnName(columnName) {
    const dialog = this._addColumnDialog();
    const input = dialog.locator('input').first();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill('');
    await input.fill(String(columnName));
    await this.logStep(`Set add column name: ${columnName}`);
  }

  async pickRandomColorInAddColumnDialog() {
    const dialog = this._addColumnDialog();
    const colorTrigger = dialog
      .locator('[aria-label*="select color" i], [aria-label*="color" i]')
      .or(dialog.locator('div').filter({ has: dialog.locator('[style*="background"]') }).first())
      .first();
    await colorTrigger.click({ force: true, timeout: this.uiTimeout }).catch(async () => {
      const colorLabel = dialog.getByText(/^color$/i).first();
      await colorLabel.locator('xpath=following::*[1]').click({ force: true, timeout: this.uiTimeout });
    });

    const popover = this.page.locator('.MuiPopover-paper').filter({ visible: true }).last();
    await expect(popover).toBeVisible({ timeout: 10000 });
    const swatches = popover.locator('div[style*="background"]').filter({ visible: true });
    const count = await swatches.count();
    const idx = count > 1 ? Math.floor(Math.random() * Math.min(count, 10)) : 0;
    await swatches.nth(idx).click({ force: true, timeout: this.uiTimeout });
    await this.logStep('Picked random column color');
  }

  async confirmAddKanbanColumn() {
    const dialog = this._addColumnDialog();
    const addBtn = dialog.getByRole('button', { name: /^add$/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: this.uiTimeout });
    await addBtn.click({ force: true, timeout: this.uiTimeout });
    await expect(dialog).toBeHidden({ timeout: this.defaultTimeout });
    await this._waitTaskSettled();
    await this.logStep('Confirmed add kanban column');
  }

  async addQuickTaskInColumn(columnName) {
    const column = await this._resolveKanbanColumn(columnName);
    const quickBtn = column.getByRole('button', { name: /add quick task/i }).first();
    await expect(quickBtn).toBeVisible({ timeout: this.uiTimeout });
    await quickBtn.click({ force: true, timeout: this.uiTimeout });
    await this._waitTaskSettled();
    await this.logStep(`Added quick task in column "${columnName}"`);
  }

  async expectQuickTaskCardInKanbanColumn(columnName) {
    await this.expectTaskCardInKanbanColumn(columnName, 'Quick Task');
  }
}

Object.assign(TaskManagementPage.prototype, require('./TaskManagementPageMethods'));

module.exports = TaskManagementPage;
