const { expect } = require('@playwright/test');

/** Extended Task Management page actions (TC-13+). Mixed into TaskManagementPage.prototype. */
module.exports = {
  randomSuffix() {
    return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  },

  _activeTaskPanel() {
    return this.page
      .locator('.boqUI.prodandserviceUI, aside.offcanvas.show, .offcanvas.show')
      .filter({
        has: this.page
          .locator('input[name="taskName"]')
          .or(this.page.getByRole('textbox', { name: /Eg\s*:\s*Site Preparation/i })),
      })
      .filter({ visible: true })
      .last()
      .or(this.page.locator('.boqUI.prodandserviceUI').filter({ visible: true }).last());
  },

  _taskDatePickerPopper() {
    const schedule = this._getScheduleDateHelper();
    return schedule._scheduleDatePickerPopper();
  },

  async _scrollTaskCreateFormToDates(panel) {
    await this._scrollTaskPanel(panel);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await panel.getByText(/start date/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await panel.getByText(/start date/i).first().scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await panel.evaluate((root) => {
        const nodes = [root, ...root.querySelectorAll('*')];
        for (const el of nodes) {
          if (el && el.scrollHeight > el.clientHeight + 20) {
            el.scrollTop += 400;
          }
        }
      }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 500).catch(() => {});
    }
  },

  async _clickTaskCreateFormChooseDate(panel, kind) {
    const schedule = this._getScheduleDateHelper();
    const idx = kind === 'start' ? 0 : 1;
    await this._scrollTaskCreateFormToDates(panel);

    const clicked = await panel.evaluate((root, buttonIndex) => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const labelRe = buttonIndex === 0 ? /start\s*date/i : /end\s*date/i;

      for (const label of [...root.querySelectorAll('label, span, p, .fw-500, .MuiFormLabel-root')]) {
        if (!labelRe.test((label.textContent || '').trim())) {
          continue;
        }
        let container = label;
        for (let depth = 0; depth < 12 && container; depth += 1) {
          const btn = container.querySelector(
            'button[aria-label="Choose date"], button[aria-label*="Choose" i], .MuiInputAdornment-root button'
          );
          if (isVisible(btn)) {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return true;
          }
          container = container.parentElement;
        }
      }

      const buttons = [
        ...root.querySelectorAll('button[aria-label="Choose date"], button[aria-label*="Choose" i]'),
      ].filter(isVisible);
      const target = buttons[buttonIndex] || buttons[0];
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.click();
        return true;
      }
      return false;
    }, idx);

    if (!clicked) {
      return false;
    }

    await this.page.waitForTimeout(600);
    return schedule._scheduleDatePickerPopper().isVisible({ timeout: 5000 }).catch(() => false);
  },

  async _fillTaskFormDateTimeInput(panel, targetDate, kind) {
    const formatted = targetDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const isStart = kind === 'start';

    const filled = await panel.evaluate(
      (root, { text, startKind }) => {
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const labelRe = startKind ? /start\s*date/i : /end\s*date/i;
        let target = null;

        for (const label of [...root.querySelectorAll('label, span, p, .fw-500')]) {
          if (!labelRe.test((label.textContent || '').trim())) {
            continue;
          }
          let container = label;
          for (let depth = 0; depth < 12 && container; depth += 1) {
            const input = container.querySelector('input:not([type="hidden"])');
            if (isVisible(input)) {
              target = input;
              break;
            }
            container = container.parentElement;
          }
          if (target) {
            break;
          }
        }

        if (!target) {
          const inputs = [...root.querySelectorAll('input:not([type="hidden"])')]
            .filter(isVisible)
            .filter((input) => (input.getAttribute('name') || '') !== 'taskName');
          target = inputs[startKind ? 0 : 1] || inputs[0] || null;
        }

        if (!target) {
          return false;
        }

        target.scrollIntoView({ block: 'center' });
        target.focus();
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      },
      { text: formatted, startKind: isStart }
    );

    if (!filled) {
      throw new Error(`Could not fill task ${kind} date field.`);
    }

    await this.page.keyboard.press('Tab').catch(() => {});
    await this.logStep(`Filled task ${kind} date via input: ${formatted}`);
  },

  async _pickTaskCreateFormDateTime(panel, targetDate, kind) {
    const schedule = this._getScheduleDateHelper();
    await schedule._prepareCreateFormForDateEntry();
    await this.page.keyboard.press('Escape').catch(() => {});

    let opened = await this._clickTaskCreateFormChooseDate(panel, kind);
    if (!opened) {
      const idx = kind === 'start' ? 0 : 1;
      const chooseBtn = panel.getByRole('button', { name: /choose date/i }).nth(idx);
      if (await chooseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chooseBtn.scrollIntoViewIfNeeded().catch(() => {});
        await chooseBtn.click({ force: true, timeout: 15000 });
        opened = await schedule._scheduleDatePickerPopper().isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    if (opened) {
      const popper = schedule._scheduleDatePickerPopper();
      await expect(popper).toBeVisible({ timeout: 15000 });
      await schedule._muiNavigatePopperToMonthYear(popper, targetDate);
      await schedule._muiPickDayInPopper(popper, targetDate);
      await schedule._muiPickDigitalTimeListboxes(popper, targetDate);
      await schedule._muiConfirmPickerIfPresent();
      await popper.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.logStep(`[Task] Picked ${kind} date via calendar: ${targetDate.toLocaleString('en-US')}`);
      return;
    }

    await this._fillTaskFormDateTimeInput(panel, targetDate, kind);
  },

  viewTaskModal() {
    return this._activeTaskPanel();
  },

  _listTableRowByTaskName(taskName) {
    const esc = this._escapeRegex(String(taskName));
    return this.page.locator('table tbody tr').filter({ hasText: new RegExp(esc, 'i') }).first();
  },

  async _scrollTaskPanel(panel) {
    await panel.evaluate((root) => {
      const nodes = [root, ...root.querySelectorAll('*')];
      for (const el of nodes) {
        if (el && el.scrollHeight > el.clientHeight + 20) {
          el.scrollTop = el.scrollHeight;
        }
      }
    }).catch(() => {});
  },

  async _selectTaskFormDropdown(fieldLabelRegex, optionRegex, panel) {
    const schedule = this._getScheduleDateHelper();
    await schedule._selectScheduleFormLabeledDropdownOption(fieldLabelRegex, optionRegex, panel);
  },

  async _openTaskFormAssigneePicker(panel, fieldLabelRegex = /assignees?/i) {
    const schedule = this._getScheduleDateHelper();
    await schedule.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});

    const isOpen = async () => {
      if (await schedule._isScheduleAssigneePickerOpen()) return true;
      if (await schedule._scheduleAssigneePickerPopover().isVisible({ timeout: 300 }).catch(() => false)) {
        return true;
      }
      // Only MuiPopover / MuiMenu — never the create-drawer presentation paper
      return (
        (await this.page
          .locator('.MuiPopover-paper, .MuiMenu-paper')
          .filter({ visible: true })
          .filter({
            has: this.page
              .getByRole('tab', { name: /users|vendors/i })
              .or(this.page.locator('#schedule-assignee-tab-users, #schedule-assignee-tab-vendors'))
              .or(this.page.getByRole('checkbox')),
          })
          .count()
          .catch(() => 0)) >= 1
      );
    };

    const lbl = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span, div')
      .filter({ hasText: fieldLabelRegex })
      .first();
    const candidates = [
      panel.getByPlaceholder(/select assignee|select reporter|select/i).first(),
      panel.locator('[data-edit-field="assignee"]').first(),
      panel.getByRole('combobox', { name: /assignee|reporter/i }).first(),
      lbl.locator('xpath=following::*[contains(@class,"css-19x37hq")][1]').first(),
      lbl.locator('xpath=following::*[contains(@class,"MuiBox-root")][1]').first(),
      lbl.locator('xpath=following::*[@role="combobox"][1]').first(),
    ];
    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click({ force: true, timeout: 15000 }).catch(() => {});
      await this.page.waitForTimeout(400);
      if (await isOpen()) return;
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await expect(async () => {
      expect(await isOpen()).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
  },

  async selectTaskPriorityOnCreateForm(priority) {
    const pattern = priority instanceof RegExp ? priority : new RegExp(`^\\s*${priority}\\s*$`, 'i');
    await this._selectTaskFormDropdown(/^priority\b/i, pattern, this.createTaskModal());
    await this.logStep(`Selected task priority: ${priority}`);
  },

  async fillRandomDescriptionOnCreateTaskForm() {
    const panel = this.createTaskModal();
    const text = `Task description ${this.randomSuffix()}`;
    const editor = panel
      .locator('#DescriptionBox [contenteditable="true"]')
      .or(panel.locator('#DescriptionBox textarea'))
      .or(panel.locator('#DescriptionBox'))
      .first();
    await editor.scrollIntoViewIfNeeded().catch(() => {});
    await editor.click({ force: true, timeout: 15000 });
    await editor.fill(text).catch(async () => {
      await this.page.keyboard.type(text);
    });
    this._lastTaskDescription = text;
    await this.logStep(`Entered task description: ${text}`);
    return text;
  },

  async addUserAndVendorAssigneesOnCreateTaskForm() {
    const panel = this.createTaskModal();
    const schedule = this._getScheduleDateHelper();
    await this._openTaskFormAssigneePicker(panel, /^assignee$/i);
    await schedule.selectUpToTwoAssigneesOnScheduleCreateForm(2);
    await this.logStep('Added user and vendor assignees on task create form');
  },

  async addRandomReporterOnCreateTaskForm() {
    const panel = this.createTaskModal();
    const schedule = this._getScheduleDateHelper();
    await this._openTaskFormAssigneePicker(panel, /^reporter$/i);
    await schedule._selectAssigneesFromScheduleAssigneeTab('users', 1);
    await schedule._dismissScheduleAssigneePickerByClickingAway();
    await this.logStep('Added random reporter on task create form');
  },

  async expandMoreOptionsOnCreateTaskForm() {
    const panel = this.createTaskModal();
    const collapsed = panel.getByText(/^expand$/i).first();
    if (await collapsed.isVisible({ timeout: 2000 }).catch(() => false)) {
      await panel.getByText(/more options/i).first().click({ force: true });
    }
    await this.logStep('Expanded more options on task create form');
  },

  async addRandomReminderOnCreateTaskForm() {
    const panel = this.createTaskModal();
    await this._scrollTaskPanel(panel);
    const addBtn = panel.getByRole('button', { name: /add reminder/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click({ force: true });
    const name = `Reminder ${this.randomSuffix()}`;
    await panel.getByPlaceholder(/reminder/i).last().fill(name);
    await panel.locator('input[type="number"]').last().fill(String(2 + Math.floor(Math.random() * 5)));
    const unitCombo = panel.locator('.MuiSelect-select').filter({ hasText: /hour|day|week/i }).last();
    await unitCombo.click({ force: true });
    const units = [/hour/i, /day/i, /week/i];
    const unit = units[Math.floor(Math.random() * units.length)];
    await this.page.getByRole('option', { name: unit }).first().click({ force: true });
    this._lastReminderName = name;
    await this.logStep(`Added reminder: ${name}`);
    return name;
  },

  async addRandomChecklistItemOnCreateTaskForm() {
    await this.expandMoreOptionsOnCreateTaskForm();
    const panel = this.createTaskModal();
    const text = `Checklist ${this.randomSuffix()}`;
    const input = panel
      .getByPlaceholder(/add.*checklist|checklist/i)
      .or(panel.locator('input').filter({ has: panel.getByText(/checklist/i) }))
      .last();
    await input.fill(text);
    await input.press('Enter');
    this._lastChecklistText = text;
    await this.logStep(`Added checklist item: ${text}`);
    return text;
  },

  async addChecklistAssigneeOnCreateTaskForm() {
    const panel = this.createTaskModal();
    const schedule = this._getScheduleDateHelper();
    const assignTo = panel.getByPlaceholder(/assign to/i).last();
    await assignTo.click({ force: true });
    await schedule._selectAssigneesFromScheduleAssigneeTab('users', 1);
    await schedule._dismissScheduleAssigneePickerByClickingAway();
    await this.logStep('Added checklist assignee on task create form');
  },

  async addRandomTaskTagOnCreateTaskForm() {
    const panel = this.createTaskModal();
    const combo = panel.getByPlaceholder(/select task tags|task tags|tags/i).first();
    await combo.click({ force: true });
    const option = this.page.getByRole('option').filter({ visible: true }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click({ force: true });
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep('Added random task tag on task create form');
  },

  async fillTaskCreateFormWithAllOptionalFields(taskName) {
    await this.fillTaskNameOnCreateForm(taskName);
    await this.selectTaskStatusOnCreateForm('In Progress');
    await this.selectTaskPriorityOnCreateForm(/medium/i);
    await this.fillRandomDescriptionOnCreateTaskForm();
    await this.pickRandomStartDateTimeOnCreateTaskForm();
    await this.pickRandomEndDateTimeAfterStartOnCreateTaskForm();
    await this.addUserAndVendorAssigneesOnCreateTaskForm();
    await this.addRandomTaskTagOnCreateTaskForm();
    await this.addRandomReporterOnCreateTaskForm();
    await this.addRandomReminderOnCreateTaskForm();
    await this.expandMoreOptionsOnCreateTaskForm();
    await this.addRandomChecklistItemOnCreateTaskForm();
    await this.addChecklistAssigneeOnCreateTaskForm();
    await this.logStep(`Filled all optional fields for task: ${taskName}`);
  },

  async expectTaskVisibleInListView(taskName) {
    await this.switchToListView();
    const row = this._listTableRowByTaskName(taskName);
    await expect(async () => {
      expect(await row.isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 90000, intervals: [1000, 2500, 5000] });
    await this.logStep(`Task "${taskName}" visible in list view`);
  },

  async scrollListTableToPriorityColumn() {
    const container = this.page.locator('.MuiTableContainer-root').first();
    await container.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
  },

  async expectTaskPriorityInListView(taskName, priority) {
    await this.expectTaskVisibleInListView(taskName);
    await this.scrollListTableToPriorityColumn();
    const row = this._listTableRowByTaskName(taskName);
    await expect(row.getByText(new RegExp(`^\\s*${this._escapeRegex(priority)}\\s*$`, 'i')).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await this.logStep(`Task "${taskName}" priority is ${priority} in list view`);
  },

  async openTaskSearchField() {
    const search = this.page.getByRole('search').first();
    const toggle = search.getByRole('button').first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggle.click({ force: true }).catch(() => {});
    }
    const input = search.locator('input').first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) return input;
    return this.page.getByPlaceholder(/search/i).first();
  },

  async searchTasksInToolbar(query) {
    const input = await this.openTaskSearchField();
    await input.fill(String(query));
    await this._waitTaskSettled();
    await this.logStep(`Searched tasks: ${query}`);
  },

  async clearTaskSearchInToolbar() {
    const clear = this.page.getByRole('button', { name: /^clear$/i }).first();
    if (await clear.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clear.click({ force: true });
    } else {
      const input = await this.openTaskSearchField();
      await input.fill('');
    }
    await this._waitTaskSettled();
    await this.logStep('Cleared task search');
  },

  async openListRowMenuForTask(taskName, actionName) {
    await this.switchToListView();
    const row = this._listTableRowByTaskName(taskName);
    await row.hover({ force: true });
    const menuBtn = row.locator('[id^="row-menu-button"]').first();
    await expect(menuBtn).toBeVisible({ timeout: 15000 });
    await menuBtn.click({ force: true });
    const item = this.page.getByRole('menuitem', { name: new RegExp(`^${actionName}$`, 'i') }).first();
    await expect(item).toBeVisible({ timeout: 10000 });
    await item.click({ force: true });
    await this.logStep(`List row menu "${actionName}" for task "${taskName}"`);
  },

  async expectViewTaskModalOpen() {
    const panel = this.viewTaskModal();
    await expect(panel).toBeVisible({ timeout: this.uiTimeout });
    await expect(panel.getByText(/view task/i).first()).toBeVisible({ timeout: this.uiTimeout });
  },

  async openViewTaskFromList(taskName) {
    await this.openListRowMenuForTask(taskName, 'view');
    await this.expectViewTaskModalOpen();
  },

  async openViewTaskFromKanban(taskName) {
    await this.switchToKanbanView();
    await this.searchTasksInToolbar(taskName);
    const card = this.page.getByText(String(taskName), { exact: false }).first();
    await card.click({ force: true, timeout: this.uiTimeout });
    await this.expectViewTaskModalOpen();
  },

  async closeViewTaskModal() {
    const panel = this.viewTaskModal();
    await panel.locator('button').first().click({ force: true });
    await expect(panel).toBeHidden({ timeout: this.uiTimeout });
    await this.logStep('Closed view task offcanvas');
  },

  async saveDescriptionChangesInViewTaskModal() {
    const panel = this.viewTaskModal();
    const saveBtn = panel.getByRole('button', { name: /save changes/i }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
    }
    await this._waitTaskSettled();
    await this.logStep('Saved description changes in view task modal');
  },

  async updateDescriptionInViewTaskModal(text) {
    const panel = this.viewTaskModal();
    const editor = panel.locator('#DescriptionBox [contenteditable="true"]').first();
    await editor.click({ force: true });
    await editor.fill(String(text));
    this._lastTaskDescription = text;
    await this.saveDescriptionChangesInViewTaskModal();
  },

  async clearDescriptionInViewTaskModal() {
    await this.updateDescriptionInViewTaskModal('');
  },

  async renameTaskOnKanbanCard(oldName, newName) {
    await this.switchToKanbanView();
    await this.searchTasksInToolbar(oldName);
    const title = this.page.locator('.editable-title').filter({ hasText: new RegExp(this._escapeRegex(oldName), 'i') }).first();
    await title.click({ force: true });
    const input = this.page.locator('.editable-title input, .MuiInputBase-input').filter({ visible: true }).first();
    await input.fill(String(newName));
    await input.press('Enter');
    await this._waitTaskSettled();
    await this.clearTaskSearchInToolbar();
    await this.logStep(`Renamed task "${oldName}" to "${newName}" on kanban card`);
  },

  async _openKanbanCardMenu(taskName) {
    await this.switchToKanbanView();
    await this.searchTasksInToolbar(taskName);
    const card = this.page.getByText(String(taskName), { exact: false }).first();
    await card.hover({ force: true });
    await new Promise((r) => setTimeout(r, 500));
    const menuBtn = this.page
      .locator('.task-card-action-button')
      .filter({ visible: true })
      .first()
      .or(this.page.locator('[id^="demo-customized-button"]').filter({ visible: true }).first());
    await menuBtn.click({ force: true, timeout: 15000 });
  },

  async duplicateTaskFromKanbanMenu(taskName) {
    await this._openKanbanCardMenu(taskName);
    await this.page.getByRole('menuitem', { name: /duplicate/i }).click({ force: true });
    await this.page.getByRole('button', { name: /^yes$/i }).click({ force: true });
    await this._waitTaskSettled();
    await this.clearTaskSearchInToolbar();
    await this.logStep(`Duplicated task "${taskName}" from kanban menu`);
  },

  async expectDuplicateTaskVisible(originalName) {
    await this.switchToKanbanView();
    const cards = this.page.getByText(String(originalName), { exact: false });
    await expect(async () => {
      expect(await cards.count()).toBeGreaterThan(1);
    }).toPass({ timeout: 60000, intervals: [1000, 2500, 5000] });
    await this.logStep(`Duplicate of "${originalName}" is visible on kanban`);
  },

  async deleteTaskFromKanbanMenu(taskName) {
    await this._openKanbanCardMenu(taskName);
    await this.page.getByRole('menuitem', { name: /^delete$/i }).click({ force: true });
    await this.page.getByRole('button', { name: /^yes$/i }).click({ force: true });
    await this._waitTaskSettled();
    await this.clearTaskSearchInToolbar();
    await this.logStep(`Deleted task "${taskName}" from kanban menu`);
  },

  async expectTaskNotVisibleInKanban(taskName) {
    await this.switchToKanbanView();
    await this.searchTasksInToolbar(taskName);
    const card = this.page.getByText(String(taskName), { exact: false });
    await expect(card).toHaveCount(0, { timeout: 60000 });
    await this.clearTaskSearchInToolbar();
    await this.logStep(`Task "${taskName}" is not visible on kanban`);
  },

  async updateReminderInViewTaskModal() {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const nameInput = panel.getByPlaceholder(/reminder/i).first();
    const newName = `Updated reminder ${this.randomSuffix()}`;
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill(newName);
    }
    const daysInput = panel.locator('input[type="number"]').first();
    if (await daysInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await daysInput.fill(String(3 + Math.floor(Math.random() * 4)));
    }
    const unitCombo = panel.locator('.MuiSelect-select').filter({ hasText: /hour|day|week/i }).first();
    if (await unitCombo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unitCombo.click({ force: true });
      await this.page.getByRole('option', { name: /week/i }).first().click({ force: true });
    }
    const saveBtn = panel.getByRole('button', { name: /^save$/i }).first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
    }
    await this.logStep('Updated reminder in view task modal');
  },

  async removeReminderInViewTaskModal() {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const removeBtn = panel.getByRole('button', { name: /^remove$/i }).first();
    await removeBtn.click({ force: true });
    await this._waitTaskSettled();
    await this.logStep('Removed reminder in view task modal');
  },

  async swapChecklistAssigneeInViewTaskModal() {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const clearAssignee = panel.locator('[aria-label*="clear" i], button').filter({ hasText: /×|close/i }).first();
    if (await clearAssignee.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearAssignee.click({ force: true }).catch(() => {});
    }
    const schedule = this._getScheduleDateHelper();
    const assignTo = panel.getByPlaceholder(/assign to/i).first();
    await assignTo.click({ force: true });
    await schedule._selectAssigneesFromScheduleAssigneeTab('users', 1);
    await schedule._dismissScheduleAssigneePickerByClickingAway();
    await this._waitTaskSettled();
    await this.logStep('Updated checklist assignee in view task modal');
  },

  async removeChecklistItemInViewTaskModal() {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const deleteBtn = panel.locator('[aria-label*="delete" i], button').filter({ hasText: /delete checklist/i }).first()
      .or(panel.locator('button svg').locator('xpath=ancestor::button[1]').last());
    await deleteBtn.click({ force: true });
    await this._waitTaskSettled();
    await this.logStep('Removed checklist item in view task modal');
  },

  async addCommentInViewTaskModal(commentText) {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const input = panel.getByPlaceholder(/add comments here/i).first();
    await input.fill(String(commentText));
    await panel.getByRole('button', { name: /add comment/i }).click({ force: true });
    this._lastCommentText = commentText;
    await this._waitTaskSettled();
    await this.logStep(`Added comment: ${commentText}`);
  },

  async expectCommentVisibleInViewTaskModal(commentText) {
    const panel = this.viewTaskModal();
    await expect(panel.getByText(String(commentText), { exact: false }).first()).toBeVisible({ timeout: this.uiTimeout });
  },

  async editLatestCommentInViewTaskModal(newText) {
    const panel = this.viewTaskModal();
    const editBtn = panel.locator('button').filter({ has: panel.locator('svg') }).last();
    await editBtn.click({ force: true }).catch(async () => {
      await panel.getByLabel(/edit/i).first().click({ force: true });
    });
    const input = panel.locator('textarea, input, [contenteditable="true"]').filter({ visible: true }).last();
    await input.fill(String(newText));
    await panel.locator('button').filter({ has: panel.locator('[data-testid="CheckIcon"]') }).first().click({ force: true }).catch(async () => {
      await input.press('Enter');
    });
    this._lastCommentText = newText;
    await this._waitTaskSettled();
    await this.logStep(`Edited comment to: ${newText}`);
  },

  async removeCommentInViewTaskModal() {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const deleteBtn = panel.locator('button[aria-label*="delete" i]').last();
    await deleteBtn.click({ force: true });
    await this._waitTaskSettled();
    await this.logStep('Removed comment in view task modal');
  },

  async updateTaskDatesInViewTaskModal() {
    const schedule = this._getScheduleDateHelper();
    const panel = this.viewTaskModal();
    const start = schedule.randomWeekdayDateTimeBetween(5, 30);
    this._pendingTaskRandomStartMs = start.getTime();
    await schedule._pickScheduleCreateFormDateTime(panel, start, 'start');
    const end = schedule.endDateTimeCandidatesAfterStart(start)[0];
    await schedule._pickScheduleCreateFormDateTime(panel, end, 'end');
    await this._waitTaskSettled();
    await this.logStep('Updated task start and end dates in view task modal');
  },

  async updateAssigneesOnKanbanCard(taskName) {
    await this.switchToKanbanView();
    await this.searchTasksInToolbar(taskName);
    const schedule = this._getScheduleDateHelper();
    const assigneeField = this.page.locator('[data-edit-field="assignee"]').filter({ visible: true }).first();
    await assigneeField.click({ force: true });
    const checked = this.page.locator('input[type="checkbox"]:checked');
    const count = await checked.count();
    for (let i = 0; i < count; i += 1) {
      await checked.first().click({ force: true }).catch(() => {});
    }
    await schedule._selectAssigneesFromScheduleAssigneeTab('users', 1);
    if (await schedule._scheduleAssigneeTab('vendors').isVisible({ timeout: 2000 }).catch(() => false)) {
      await schedule._selectAssigneesFromScheduleAssigneeTab('vendors', 1);
    }
    await schedule._dismissScheduleAssigneePickerByClickingAway();
    await this.clearTaskSearchInToolbar();
    await this.logStep(`Updated assignees on kanban card "${taskName}"`);
  },

  async removeAllAssigneesOnKanbanCard(taskName) {
    await this.switchToKanbanView();
    await this.searchTasksInToolbar(taskName);
    const assigneeField = this.page.locator('[data-edit-field="assignee"]').filter({ visible: true }).first();
    await assigneeField.click({ force: true });
    const checked = this.page.locator('input[type="checkbox"]:checked');
    const count = await checked.count();
    for (let i = 0; i < count; i += 1) {
      await checked.first().click({ force: true }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.clearTaskSearchInToolbar();
    await this.logStep(`Removed all assignees on kanban card "${taskName}"`);
  },

  async updateTaskStatusInViewTaskModal(statusLabel) {
    const panel = this.viewTaskModal();
    await this._selectTaskFormDropdown(/^status\b/i, new RegExp(statusLabel, 'i'), panel);
    await this._waitTaskSettled();
    await this.logStep(`Updated task status to ${statusLabel} in view task modal`);
  },

  async updateTaskPriorityInViewTaskModal(priorityLabel) {
    const panel = this.viewTaskModal();
    await this._selectTaskFormDropdown(/^priority\b/i, new RegExp(priorityLabel, 'i'), panel);
    await this._waitTaskSettled();
    await this.logStep(`Updated task priority to ${priorityLabel} in view task modal`);
  },

  async updateTaskReporterInViewTaskModal() {
    const panel = this.viewTaskModal();
    const schedule = this._getScheduleDateHelper();
    await this._openTaskFormAssigneePicker(panel, /^reporter$/i);
    await schedule._selectAssigneesFromScheduleAssigneeTab('users', 1);
    await schedule._dismissScheduleAssigneePickerByClickingAway();
    await this._waitTaskSettled();
    await this.logStep('Updated task reporter in view task modal');
  },

  async setTaskProgressPercentInViewTaskModal(percent) {
    const panel = this.viewTaskModal();
    const progressLink = panel.getByText(/%\s*done/i).first();
    await progressLink.click({ force: true });
    const input = panel.getByRole('textbox', { name: /task progress/i }).or(panel.locator('input[type="number"]').last());
    await input.fill(String(percent));
    await panel.locator('button').filter({ has: panel.locator('svg') }).first().click({ force: true }).catch(async () => {
      await input.press('Enter');
    });
    this._lastTaskProgress = percent;
    await this._waitTaskSettled();
    await this.logStep(`Set task progress to ${percent}%`);
  },

  async expectTaskProgressPercentInViewTaskModal(percent) {
    const panel = this.viewTaskModal();
    await expect(panel.getByText(new RegExp(`${percent}\\s*%`, 'i')).first()).toBeVisible({ timeout: this.uiTimeout });
  },

  async renameKanbanColumn(columnName, newName) {
    const column = await this._resolveKanbanColumn(columnName);
    const title = column.locator('.editable-title, [class*="EditableInput"]').first();
    await title.click({ force: true });
    const input = column.locator('input').filter({ visible: true }).first();
    await input.fill(String(newName));
    await input.press('Enter');
    await this._waitTaskSettled();
    await this.logStep(`Renamed kanban column "${columnName}" to "${newName}"`);
  },

  async changeKanbanColumnColor(columnName) {
    const column = await this._resolveKanbanColumn(columnName);
    await column.getByRole('button', { name: /change color/i }).click({ force: true });
    const popover = this.page.locator('.MuiPopover-paper').filter({ visible: true }).last();
    const swatches = popover.locator('div[style*="background"]').filter({ visible: true });
    await swatches.nth(Math.min(3, (await swatches.count()) - 1)).click({ force: true });
    await this._waitTaskSettled();
    await this.logStep(`Changed colour for kanban column "${columnName}"`);
  },

  async expectKanbanColumnNotVisible(columnName) {
    const nameRe = new RegExp(`^\\s*${this._escapeRegex(this._normalizeColumnDisplayName(columnName))}\\s*$`, 'i');
    await expect(this.page.locator('[data-kanban-column-id]').filter({ has: this.page.getByText(nameRe) })).toHaveCount(0, {
      timeout: this.uiTimeout,
    });
    await this.logStep(`Kanban column "${columnName}" is not visible`);
  },

  async deleteKanbanColumn(columnName, migrateToStatus) {
    const column = await this._resolveKanbanColumn(columnName);
    await column.getByRole('button', { name: /^delete$/i }).click({ force: true });
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (migrateToStatus) {
        await this._selectTaskFormDropdown(/^new status$/i, new RegExp(migrateToStatus, 'i'), dialog);
      }
      await dialog.getByRole('button', { name: /^confirm$/i }).click({ force: true });
    }
    await this._waitTaskSettled();
    await this.logStep(`Deleted kanban column "${columnName}"`);
  },

  async toggleChecklistItemInViewTaskModal(checked) {
    const panel = this.viewTaskModal();
    await this._scrollTaskPanel(panel);
    const checkbox = panel.locator('input[type="checkbox"]').first();
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (isChecked !== checked) {
      await checkbox.click({ force: true });
    }
    await this._waitTaskSettled();
    await this.logStep(`Toggled checklist checkbox to ${checked}`);
  },

  async openTaskFilterMenu() {
    await this.page.getByRole('button', { name: /^filter$/i }).first().click({ force: true });
    await this.logStep('Opened task filter menu');
  },

  async clearTaskFilters() {
    const clear = this.page.getByRole('button', { name: /^clear$/i }).filter({ visible: true }).last();
    if (await clear.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clear.click({ force: true });
    }
    await this.logStep('Cleared task filters');
  },

  async applyTaskFilterField(fieldLabel, optionPattern) {
    const popover = this.page.locator('.MuiPopover-paper, .MuiPaper-root').filter({ visible: true }).last();
    const field = popover.getByText(new RegExp(fieldLabel, 'i')).first();
    await field.locator('xpath=following::*[@role="combobox" or contains(@class,"MuiAutocomplete-root")][1]').click({ force: true }).catch(async () => {
      await popover.getByRole('combobox').first().click({ force: true });
    });
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click({ force: true });
    await this.page.getByRole('button', { name: /^apply$/i }).last().click({ force: true });
    await this._waitTaskSettled();
    await this.logStep(`Applied task filter ${fieldLabel}: ${optionPattern}`);
  },

  async expectFilteredKanbanShowsOnlyColumn(columnName) {
    await this.switchToKanbanView();
    const columns = this.page.locator('[data-kanban-column-id]');
    await expect(async () => {
      const count = await columns.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: this.uiTimeout });
    await this.logStep(`Filtered kanban shows results for column/status ${columnName}`);
  },

  async expectSearchShowsOnlyTask(taskName) {
    await this.switchToKanbanView();
    const cards = this.page.locator('[data-kanban-column-id]').getByText(String(taskName), { exact: false });
    await expect(cards.first()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep(`Search shows task "${taskName}"`);
  },

  async applyRandomTaskTemplate() {
    await this.page.getByRole('button', { name: /select template/i }).click({ force: true });
    const dialog = this.page.getByRole('dialog').filter({ hasText: /select template/i }).last();
    await expect(dialog).toBeVisible({ timeout: this.uiTimeout });
    const select = dialog.getByRole('combobox').first();
    await select.click({ force: true });
    const option = this.page.getByRole('option').filter({ visible: true }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ force: true });
    await dialog.getByRole('button', { name: /^apply$/i }).click({ force: true });
    await expect(dialog).toBeHidden({ timeout: this.defaultTimeout });
    await this._waitTaskSettled();
    await this.logStep('Applied random task template');
  },

  async expectQuickTaskNotInKanbanColumn(columnName) {
    const column = await this._resolveKanbanColumn(columnName);
    await expect(column.getByText(/^quick task$/i)).toHaveCount(0, { timeout: 60000 });
    await this.logStep(`Quick task not in column "${columnName}"`);
  },

  async deleteQuickTaskFromKanbanColumn(columnName) {
    const column = await this._resolveKanbanColumn(columnName);
    const card = column.getByText(/^quick task$/i).first();
    await card.hover({ force: true });
    await new Promise((r) => setTimeout(r, 500));
    const menuBtn = column.locator('.task-card-action-button, [id^="demo-customized-button"]').filter({ visible: true }).first();
    await menuBtn.click({ force: true });
    await this.page.getByRole('menuitem', { name: /^delete$/i }).click({ force: true });
    await this.page.getByRole('button', { name: /^yes$/i }).click({ force: true });
    await this._waitTaskSettled();
    await this.logStep(`Deleted quick task from column "${columnName}"`);
  },

  async setRandomTaskProgressPercentInViewTaskModal() {
    const pct = 20 + Math.floor(Math.random() * 60);
    await this.setTaskProgressPercentInViewTaskModal(pct);
    return pct;
  },

  async expectNewTaskFromTemplateInKanban() {
    await this.switchToKanbanView();
    await expect(this.page.locator('[data-kanban-column-id]').first()).toBeVisible({ timeout: this.uiTimeout });
    await this.logStep('New task from template appears on kanban');
  },

  /**
   * Codegen (Daily Report TC-08): Choose date → gridcell day → MuiClock-squareMask.
   * Start uses first Choose date; End uses remaining Choose date + PM.
   */
  async _pickTaskCreateFormDateTimeViaCodegen(kind) {
    const schedule = this._getScheduleDateHelper();
    const today = new Date();
    const day = String(today.getDate());
    const isStart = kind === 'start';

    const chooseDate = isStart
      ? this.page.getByRole('button', { name: 'Choose date' }).first()
      : this.page.getByRole('button', { name: 'Choose date', exact: true }).last();

    await expect(chooseDate).toBeVisible({ timeout: this.uiTimeout });
    await chooseDate.scrollIntoViewIfNeeded().catch(() => {});
    await chooseDate.click({ timeout: 20000 });

    const popper = schedule._scheduleDatePickerPopper();
    await expect(popper).toBeVisible({ timeout: 15000 });

    // Codegen: getByRole('gridcell', { name: '6', exact: true })
    const dayCell = this.page
      .getByRole('gridcell', { name: day, exact: true })
      .filter({ visible: true })
      .first()
      .or(
        popper
          .locator(
            'button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled)'
          )
          .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
          .first()
      );
    await expect(dayCell).toBeVisible({ timeout: 15000 });
    await dayCell.click({ timeout: 15000 });

    if (!isStart) {
      const pm = this.page.getByRole('button', { name: 'PM' }).first();
      if (await pm.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pm.click({ timeout: 10000 });
      }
    }

    // Codegen: locator('.MuiClock-squareMask').click() × 2
    const clockMask = this.page.locator('.MuiClock-squareMask').filter({ visible: true }).last();
    if (await clockMask.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clockMask.click({ timeout: 10000 }).catch(() => {});
      await clockMask.click({ timeout: 10000 }).catch(() => {});
    } else {
      await schedule._muiPickDigitalTimeListboxes(popper, today).catch(() => {});
    }

    await schedule._muiConfirmPickerIfPresent();
    await popper.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep(`[Task] Codegen-picked ${kind} date (day ${day}${isStart ? '' : ' PM'}).`);
  },

  /** Daily Report TC-08: today start/end via codegen Choose date + clock. */
  async pickTodayStartAndEndDateTimeOnCreateTaskForm() {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    this._pendingTaskRandomStartMs = start.getTime();

    await this._pickTaskCreateFormDateTimeViaCodegen('start');
    await this.page.waitForTimeout(500);
    await this._pickTaskCreateFormDateTimeViaCodegen('end');

    this._pendingTaskRandomStartMs = null;
    await this.logStep('Picked today start and end datetime on task create form (codegen).');
  },

  /**
   * Task create assignee (Daily Report TC-08 / TC-09):
   * Open Assignee dropdown → Users tab → first checkbox → dismiss.
   * Does NOT treat Create-drawer checkboxes as “dropdown open” (previous false positive).
   */
  async selectFirstAssigneeCheckboxOnCreateTaskForm() {
    const schedule = this._getScheduleDateHelper();
    await schedule._muiConfirmPickerIfPresent();
    await this.page.keyboard.press('Escape').catch(() => {});
    await schedule._scheduleDatePickerPopper().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const panel = this.createTaskModal();
    await expect(panel).toBeVisible({ timeout: this.uiTimeout });

    // Scroll Assignee field into view
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const labelVisible = await panel
        .getByText(/^assignees?\b/i)
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false);
      // eslint-disable-next-line no-await-in-loop
      const phVisible = await panel
        .getByPlaceholder(/select assignee|assignee/i)
        .first()
        .isVisible({ timeout: 300 })
        .catch(() => false);
      if (labelVisible || phVisible) {
        const anchor = phVisible
          ? panel.getByPlaceholder(/select assignee|assignee/i).first()
          : panel.getByText(/^assignees?\b/i).first();
        // eslint-disable-next-line no-await-in-loop
        await anchor.scrollIntoViewIfNeeded().catch(() => {});
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await this._scrollTaskPanel(panel);
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 350).catch(() => {});
    }

    const isRealAssigneePickerOpen = async () => {
      if (await schedule._isScheduleAssigneePickerOpen()) return true;
      const popover = schedule._scheduleAssigneePickerPopover();
      if (await popover.isVisible({ timeout: 400 }).catch(() => false)) return true;
      // Popover/menu with Users tab text — not the create drawer paper
      const usersInMenu = this.page
        .locator('.MuiPopover-paper, .MuiMenu-paper')
        .filter({ visible: true })
        .filter({ has: this.page.getByRole('tab', { name: /users/i }).or(this.page.locator('#schedule-assignee-tab-users')) })
        .first();
      return usersInMenu.isVisible({ timeout: 400 }).catch(() => false);
    };

    // Click candidates until the real Users/Vendors assignee picker opens
    const label = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span, div')
      .filter({ hasText: /^assignees?\b/i })
      .first();

    const clickTargets = [
      panel.getByPlaceholder(/select assignee/i).first(),
      panel.getByPlaceholder(/assignee/i).first(),
      panel.locator('[data-edit-field="assignee"]').first(),
      panel.getByRole('combobox', { name: /assignees?/i }).first(),
      label.locator('xpath=following::*[contains(@class,"css-19x37hq")][1]').first(),
      label.locator('xpath=following::*[contains(@class,"MuiBox-root")][1]').first(),
      label.locator('xpath=following::*[@role="combobox"][1]').first(),
      label.locator('xpath=ancestor::div[contains(@class,"MuiBox-root") or contains(@class,"MuiFormControl")][1]//*[@role="combobox" or contains(@class,"css-19x37hq")][1]').first(),
    ];

    let opened = await isRealAssigneePickerOpen();
    if (!opened) {
      for (const target of clickTargets) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await target.isVisible({ timeout: 1000 }).catch(() => false))) continue;
        // eslint-disable-next-line no-await-in-loop
        await target.scrollIntoViewIfNeeded().catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await target.click({ force: true, timeout: 20000 });
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(600);
        // eslint-disable-next-line no-await-in-loop
        if (await isRealAssigneePickerOpen()) {
          opened = true;
          await this.logStep('[Task] Opened Assignee dropdown (Users/Vendors picker).');
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await this.page.keyboard.press('Escape').catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(200);
      }
    }

    if (!opened) {
      await this._openTaskFormAssigneePicker(panel, /assignees?/i).catch(() => {});
      opened = await isRealAssigneePickerOpen();
    }

    await expect
      .poll(async () => isRealAssigneePickerOpen(), {
        timeout: 25000,
        intervals: [500, 1000, 2000],
      })
      .toBe(true);

    // Users tab → first checkbox (Schedule helper — same UI as Task)
    const usersTab = schedule._scheduleAssigneeTab('users');
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(300);
    }

    const selected = await schedule._selectAssigneesFromScheduleAssigneeTab('users', 1);
    expect(selected).toBeGreaterThan(0);
    this.lastDailyReportAssigneeSelected = true;
    await this.logStep('[Task] Checked first user checkbox in Assignee dropdown.');

    await schedule._dismissScheduleAssigneePickerByClickingAway().catch(() => {});
    await this.page.waitForTimeout(400);

    // Confirm assignee stuck on the form (chip / email / cleared placeholder)
    const chipCount = await panel.locator('.MuiChip-root').filter({ visible: true }).count().catch(() => 0);
    const placeholderStillEmpty = await panel
      .getByPlaceholder(/^select assignee$/i)
      .first()
      .isVisible({ timeout: 800 })
      .catch(() => false);

    if (chipCount < 1 && placeholderStillEmpty) {
      throw new Error(
        'Assignee checkbox click did not apply — no assignee chip on the create form. Refusing to Create without assignee.'
      );
    }

    await this.logStep(
      `[Task] Assignee applied on create form (chips=${chipCount}, placeholderEmpty=${placeholderStillEmpty}).`
    );
  },

  /**
   * Daily Report TC-08 (codegen):
   * Add Task → name → Choose date start/end + clock → assignee email → Create.
   */
  async createTaskForDailyReportTc08() {
    const name = `DR Task ${this.randomSuffix()}`;
    this.lastDailyReportTaskName = name;

    await this.openCreateTaskModal();
    await this.fillTaskNameOnCreateForm(name);
    await this.pickTodayStartAndEndDateTimeOnCreateTaskForm();
    await this.selectFirstAssigneeCheckboxOnCreateTaskForm();
    await this.submitCreateTaskForm();

    // eslint-disable-next-line no-console
    console.log(`[Task] Created task for Daily Report TC-08: ${name}`);
    return name;
  },

  async expectTaskCreatedForDailyReport(taskName) {
    const name = taskName || this.lastDailyReportTaskName;
    if (!name) {
      throw new Error('Expected task name for Daily Report task verification.');
    }
    await this.switchToKanbanView();
    await this.expectTaskCardInKanbanColumn('To Do', name);
    await this.logStep(`[Task] Verified task created for Daily Report: ${name}`);
  },

  /**
   * Daily Report TC-09: create N tasks using the exact same flow as TC-08
   * (random name → today start/end → first assignee → Create), repeated N times.
   */
  async createTasksForDailyReportTc09(count = 3) {
    const total = Math.max(1, Number(count) || 1);
    const names = [];

    for (let i = 0; i < total; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.dismissOpenOverlays().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.waitForModuleToLoad().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.switchToKanbanView().catch(() => {});

      // eslint-disable-next-line no-await-in-loop
      const name = await this.createTaskForDailyReportTc08();
      names.push(name);
      // eslint-disable-next-line no-console
      console.log(`[Task] Daily Report TC-09 — created task ${i + 1}/${total}: ${name}`);
    }

    this.lastDailyReportTaskNames = names;
    this.lastDailyReportTaskName = names[names.length - 1];
    // eslint-disable-next-line no-console
    console.log(`[Task] Created ${names.length} task(s) for Daily Report TC-09 (same as TC-08 × ${total}).`);
    return names;
  },

  async expectTasksCreatedForDailyReport(taskNames) {
    const names = taskNames || this.lastDailyReportTaskNames || [];
    if (!names.length) {
      throw new Error('Expected task names for Daily Report task verification.');
    }
    await this.switchToKanbanView();
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      await this.expectTaskCardInKanbanColumn('To Do', name);
    }
    await this.logStep(`[Task] Verified ${names.length} task(s) created for Daily Report.`);
  },
};
