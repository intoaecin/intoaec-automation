const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Project → Schedule (Gantt / list / milestones).
 *
 * Layers per repo `AGENTS.md`: locators and interactions live here only; steps call these methods.
 * `defaultTimeout` is 120s (above the 60s baseline in AGENTS.md) because schedule/Gantt/list loads
 * and sync are often slow — condition-based waits are still preferred (`expect().toPass`, visibility).
 *
 * Locators use shared app patterns (MUI, btnPrimaryUI, offcanvas). Tune with Playwright codegen if a build differs.
 */
class SchedulePage extends BasePage {
  constructor(page) {
    super(page);
    /** @see AGENTS.md — timeouts: slow/heavy module (login/navigation only) */
    this.defaultTimeout = 120000;
    /** Schedule UI actions — avoid 120s waits that feel “stuck” on each step */
    this.uiTimeout = 45000;
    this.quickTimeout = 10000;

    this.main = page.locator('main, [role="main"]').first();
    // Scope to main / schedule tablist so we never click a duplicate "Gantt"/"List" elsewhere (nav, other modules).
    const scheduleTablist = page
      .getByRole('tablist')
      .filter({ has: page.getByRole('tab', { name: /^gantt$/i }) })
      .filter({ has: page.getByRole('tab', { name: /^list$/i }) })
      .first();
    this.ganttTab = scheduleTablist
      .getByRole('tab', { name: /^gantt$/i })
      .or(this.page.getByRole('tab', { name: /^gantt$/i }))
      .or(this.main.getByRole('tab', { name: /^gantt$/i }))
      .or(this.main.getByRole('button', { name: /^gantt$/i }))
      .first();
    this.listTab = scheduleTablist
      .getByRole('tab', { name: /^list$/i })
      .or(this.page.getByRole('tab', { name: /^list$/i }))
      .or(this.main.getByRole('tab', { name: /^list$/i }))
      .or(this.main.getByRole('button', { name: /^list$/i }))
      .first();

    this.createToolbarButton = page
      .locator('button.btnPrimaryUI:has-text("Create"), button:has-text("Create")')
      .first();
    this.ganttSidebarSearchInput = page
      .getByPlaceholder(/search/i)
      .or(page.getByRole('searchbox'))
      .or(page.getByRole('textbox', { name: /search/i }))
      .first();

    this.todayButton = page.getByRole('button', { name: /today/i }).first();

    this.dayViewBtn = page.getByRole('button', { name: /^day$/i }).first();
    this.weekViewBtn = page.getByRole('button', { name: /^week$/i }).first();
    this.monthViewBtn = page.getByRole('button', { name: /^month$/i }).first();

    this.filterButton = page.getByRole('button', { name: /filter/i }).first();
    this.applyFilterButton = page.getByRole('button', { name: /^apply$/i }).first();
    this.clearFilterButton = page.getByRole('button', { name: /clear/i }).first();

    this.criticalPathToggle = page.getByRole('checkbox', { name: /critical path/i }).or(page.getByLabel(/critical path/i)).first();

    this.downloadButton = page.getByRole('button', { name: /download/i }).first();

    this.successToast = page.locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .toast-message').first();
  }

  /**
   * Nearest drawer/offcanvas/modal ancestor of a panel title.
   * The title can be visible while `shell.filter({ has: ... })` fails (portal markup, custom classes, or `has` scoping).
   */
  _formSurfaceFromTitle(titleLocator) {
    return titleLocator.locator(
      "xpath=(ancestor::*[contains(@class,'offcanvas') or contains(@class,'Offcanvas') or @role='dialog' or contains(@class,'MuiDrawer-paper') or contains(@class,'MuiDialog-paper') or contains(@class,'MuiModal-root')])[1]"
    );
  }

  /**
   * Schedule/Milestone form surface: Bootstrap offcanvas, MUI drawer, or dialog.
   * Prefer resolving from the visible title (ancestor walk), then shell+title, then legacy `.show`.
   */
  formPanel() {
    const fromSchedule = this._formSurfaceFromTitle(this.addSchedulePanelHeading());
    const fromEditSchedule = this._formSurfaceFromTitle(this.editSchedulePanelHeading());
    const fromMilestone = this._formSurfaceFromTitle(this.addMilestonePanelHeading());
    const fromEditMilestone = this._formSurfaceFromTitle(this.editMilestonePanelHeading());
    const shell = this.page.locator(
      '.offcanvas, aside.offcanvas, aside[class*="offcanvas"], [role="dialog"], .MuiDrawer-modal .MuiPaper-root, .MuiPaper-root.MuiDrawer-paper, .MuiDialog-root .MuiDialog-paper'
    );
    const scheduleTitle = this.page
      .getByRole('heading', { name: /^add schedule$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^add schedule$/i }));
    const milestoneTitle = this.page
      .getByRole('heading', { name: /^add milestone$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^add milestone$/i }));
    const editScheduleTitle = this.page
      .getByRole('heading', { name: /^(edit|update) schedule$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^(edit|update) schedule$/i }));
    const editMilestoneTitle = this.page
      .getByRole('heading', { name: /^(edit|update) milestone$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^(edit|update) milestone$/i }));
    const addSchedule = shell.filter({ has: scheduleTitle }).first();
    const editSchedule = shell.filter({ has: editScheduleTitle }).first();
    const addMilestone = shell.filter({ has: milestoneTitle }).first();
    const editMilestone = shell.filter({ has: editMilestoneTitle }).first();
    const legacy = this.page
      .locator('.offcanvas.show, .MuiDialog-root .MuiDialog-paper:visible, [role="dialog"] .MuiPaper-root')
      .first();
    return fromEditSchedule
      .or(fromEditMilestone)
      .or(fromSchedule)
      .or(fromMilestone)
      .or(editSchedule)
      .or(editMilestone)
      .or(addSchedule)
      .or(addMilestone)
      .or(legacy);
  }

  /** Prefer the drawer whose title is currently visible (avoids `.or()` formPanel scoping issues). */
  async activeFormPanel() {
    if (await this.addMilestonePanelHeading().isVisible({ timeout: 800 }).catch(() => false)) {
      return this._formSurfaceFromTitle(this.addMilestonePanelHeading());
    }
    if (await this.addSchedulePanelHeading().isVisible({ timeout: 800 }).catch(() => false)) {
      return this._formSurfaceFromTitle(this.addSchedulePanelHeading());
    }
    if (await this.editSchedulePanelHeading().isVisible({ timeout: 800 }).catch(() => false)) {
      return this._formSurfaceFromTitle(this.editSchedulePanelHeading());
    }
    if (await this.editMilestonePanelHeading().isVisible({ timeout: 800 }).catch(() => false)) {
      return this._formSurfaceFromTitle(this.editMilestonePanelHeading());
    }
    return this.formPanel();
  }

  /** Heading used to confirm Add Schedule offcanvas/drawer is open (source of truth for TC-02+). */
  addSchedulePanelHeading() {
    return this.page
      .getByRole('heading', { name: /^add schedule$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^add schedule$/i }));
  }

  addMilestonePanelHeading() {
    return this.page
      .getByRole('heading', { name: /^add milestone$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^add milestone$/i }));
  }

  editSchedulePanelHeading() {
    return this.page
      .getByRole('heading', { name: /^(edit|update) schedule$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^(edit|update) schedule$/i }));
  }

  editMilestonePanelHeading() {
    return this.page
      .getByRole('heading', { name: /^(edit|update) milestone$/i })
      .or(this.page.locator('.offcanvas-title, .MuiDialogTitle-root').filter({ hasText: /^(edit|update) milestone$/i }));
  }

  async expectEditScheduleOffCanvasOpen() {
    await expect(this.editSchedulePanelHeading().or(this.editMilestonePanelHeading()).or(this.formPanel()).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
  }

  randomSuffix() {
    return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /** True when Schedule Gantt/List toolbar is already visible (reuse same tab across TCs). */
  async isOnScheduleModule() {
    const gantt = await this.ganttTab.isVisible({ timeout: 1500 }).catch(() => false);
    const list = await this.listTab.isVisible({ timeout: 1500 }).catch(() => false);
    if (gantt && list) {
      const create = await this.createToolbarButton.isVisible({ timeout: 1500 }).catch(() => false);
      const heading = await this.main.getByText(/schedule/i).first().isVisible({ timeout: 1500 }).catch(() => false);
      if (create || heading) return true;
    }
    const sidebar = await this.ganttSidebar().isVisible({ timeout: 1500 }).catch(() => false);
    const timeline = await this.ganttTimelineHost().isVisible({ timeout: 1500 }).catch(() => false);
    return sidebar || timeline;
  }

  /** Light settle — avoid `networkidle` (SPA polling never idles and hangs). */
  async _waitScheduleSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /** Close open schedule panels / pickers between TCs without leaving the module. */
  async dismissOpenOverlays() {
    await this.hideFreshchatWidget();
    for (let i = 0; i < 3; i += 1) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this._dismissOpenMenusIfAny();

    const popper = this._scheduleDatePickerPopper();
    if (await popper.isVisible({ timeout: 300 }).catch(() => false)) {
      await this._muiConfirmPickerIfPresent();
      await this.page.keyboard.press('Escape').catch(() => {});
      await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    const panelOpen =
      (await this.addSchedulePanelHeading().isVisible({ timeout: 400 }).catch(() => false)) ||
      (await this.editSchedulePanelHeading().isVisible({ timeout: 400 }).catch(() => false)) ||
      (await this.formPanel().isVisible({ timeout: 400 }).catch(() => false));
    if (panelOpen) {
      const closed = await this.closeScheduleFormPanelWithHeaderIcon().catch(() => false);
      if (!closed) {
        await this.closePanelWithoutSaving().catch(async () => {
          await this.page.keyboard.press('Escape').catch(() => {});
        });
      }
      await expect(this.formPanel()).toBeHidden({ timeout: 15000 }).catch(() => {});
    }

    if (await this.isOnScheduleModule()) {
      await this._dismissBlockingModals();
    }
    await this._dismissOpenMenusIfAny();
  }

  /** Loading/confirm dialogs that sit over the Create toolbar between TCs. */
  async _dismissBlockingModals() {
    const modals = this.page.locator('.MuiModal-root[role="presentation"]');
    const count = await modals.count().catch(() => 0);
    for (let i = count - 1; i >= 0; i -= 1) {
      const modal = modals.nth(i);
      if (!(await modal.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const cancel = modal
        .getByRole('button', { name: /cancel|close|discard|no|dismiss/i })
        .first();
      if (await cancel.isVisible({ timeout: 600 }).catch(() => false)) {
        await cancel.click({ force: true, timeout: 5000 }).catch(() => {});
        continue;
      }
      const backdrop = modal.locator('.MuiBackdrop-root').first();
      if (await backdrop.isVisible({ timeout: 400 }).catch(() => false)) {
        await backdrop.click({ force: true, position: { x: 8, y: 8 }, timeout: 5000 }).catch(() => {});
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  async _dismissOpenMenusIfAny() {
    const lb = this.page.getByRole('listbox').last();
    if (await lb.isVisible({ timeout: 200 }).catch(() => false)) {
      await lb.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }
    const menu = this.page.getByRole('menu').last();
    if (await menu.isVisible({ timeout: 200 }).catch(() => false)) {
      await menu.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }
    const popper = this.page.locator('.MuiPickersPopper-root:visible, .chrome-picker:visible').last();
    if (await popper.isVisible({ timeout: 200 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  /** Freshchat iframe can block off-canvas clicks during back-to-back TC runs. */
  async hideFreshchatWidget() {
    await this.page
      .locator('#fc_frame, iframe#fc_widget')
      .evaluateAll((nodes) => {
        nodes.forEach((node) => {
          const el = node;
          el.style.setProperty('pointer-events', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
        });
      })
      .catch(() => {});
  }

  async waitForModuleToLoad() {
    if (await this.isOnScheduleModule()) {
      await this.hideFreshchatWidget();
      const tabsReady =
        (await this.ganttTab.isVisible({ timeout: 2000 }).catch(() => false)) &&
        (await this.listTab.isVisible({ timeout: 2000 }).catch(() => false));
      if (tabsReady) return;
    }
    await this.page.waitForLoadState('domcontentloaded');
    await expect(async () => {
      const createVisible = await this.createToolbarButton.isVisible().catch(() => false);
      const tabVisible =
        (await this.ganttTab.isVisible().catch(() => false)) || (await this.listTab.isVisible().catch(() => false));
      const heading = await this.main.getByText(/schedule/i).first().isVisible().catch(() => false);
      expect(createVisible || tabVisible || heading).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1500, 3000] });
    await this._waitScheduleSettled();
  }

  async switchToGanttView() {
    await this.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._dismissOpenMenusIfAny();
    if (await this.addSchedulePanelHeading().isVisible({ timeout: 400 }).catch(() => false)) {
      await this.closePanelWithoutSaving().catch(() => {});
    }
    const alreadyGantt =
      (await this.ganttTab.getAttribute('aria-selected').catch(() => '')) === 'true' ||
      (await this.page.locator('[data-pdf-export-scroll-root="true"]').first().isVisible({ timeout: 800 }).catch(() => false));
    if (alreadyGantt) return;

    await expect(this.ganttTab).toBeVisible({ timeout: this.uiTimeout });
    await this.ganttTab.scrollIntoViewIfNeeded();
    await this.ganttTab.click({ timeout: this.quickTimeout });
    const selected = async () =>
      (await this.ganttTab.getAttribute('aria-selected').catch(() => '')) === 'true' ||
      (await this.page.locator('[data-pdf-export-scroll-root="true"]').first().isVisible().catch(() => false)) ||
      (await this.ganttSidebar().isVisible().catch(() => false));
    if (!(await selected())) {
      await this.ganttTab.click({ force: true, timeout: this.quickTimeout }).catch(() => {});
    }
    await expect(async () => {
      expect(await selected()).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [300, 800, 1500] });
    await this._waitScheduleSettled();
  }

  async _isScheduleListGridVisible() {
    const grids = this.page
      .locator('.MuiDataGrid-root:visible, table:visible')
      .filter({ hasText: /schedule\s*name|start\s*date|end\s*date|duration/i });
    const count = await grids.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const grid = grids.nth(i);
      const isGanttSidebar = await grid
        .locator('xpath=ancestor-or-self::*[@data-pdf-export-schedule-list="true"]')
        .count()
        .then((n) => n > 0)
        .catch(() => false);
      if (isGanttSidebar) continue;
      if (await grid.isVisible({ timeout: 300 }).catch(() => false)) return true;
    }
    return false;
  }

  async switchToListView() {
    await this.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._dismissOpenMenusIfAny();
    if (await this.addSchedulePanelHeading().isVisible({ timeout: 400 }).catch(() => false)) {
      await this.closePanelWithoutSaving().catch(() => {});
    }
    const alreadyList =
      (await this.listTab.getAttribute('aria-selected').catch(() => '')) === 'true' &&
      (await this._isScheduleListGridVisible());
    if (alreadyList) return;

    await expect(async () => {
      expect(await this.listTab.isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1500, 3000] });
    await this.listTab.scrollIntoViewIfNeeded();
    await this.listTab.click({ timeout: this.quickTimeout });
    const selected = async () => {
      const aria = await this.listTab.getAttribute('aria-selected').catch(() => null);
      const listGridVisible = await this._isScheduleListGridVisible();
      if (aria !== null) return aria === 'true' && listGridVisible;
      return listGridVisible;
    };
    if (!(await selected())) {
      await this.listTab.click({ force: true, timeout: this.quickTimeout }).catch(() => {});
    }
    await expect(async () => {
      expect(await selected()).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [300, 800, 1500] });
    await this._waitScheduleSettled();
  }

  async openCreateMenuIfNeeded() {
    await this.dismissOpenOverlays();
    await expect(this.createToolbarButton).toBeVisible({ timeout: this.uiTimeout });
    await this.createToolbarButton.click({ force: true, timeout: this.quickTimeout });
  }

  async pickCreateMenuItem(nameRegex) {
    const item = this.page.getByRole('menuitem', { name: nameRegex }).first();
    if (await item.isVisible({ timeout: 4000 }).catch(() => false)) {
      await item.click();
      return true;
    }
    const alt = this.page.locator('[role="menu"] button, [role="menu"] a').filter({ hasText: nameRegex }).first();
    if (await alt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await alt.click();
      return true;
    }
    return false;
  }

  async openCreateSchedulePanel() {
    await this.hideFreshchatWidget();
    const listAria = await this.listTab.getAttribute('aria-selected').catch(() => null);
    if (listAria === 'true') {
      await expect(async () => {
        expect(await this._isScheduleListGridVisible()).toBeTruthy();
      }).toPass({ timeout: 15000, intervals: [300, 800, 1500] });
    }
    await this.openCreateMenuIfNeeded();
    const picked =
      (await this.pickCreateMenuItem(/^schedule$/i)) ||
      (await this.pickCreateMenuItem(/new schedule|add schedule/i));
    if (!picked) {
      await this.page.getByRole('button', { name: /add schedule|new schedule/i }).first().click({ timeout: 5000 }).catch(() => {});
    }
    await expect(this.addSchedulePanelHeading()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.formPanel()).toBeVisible({ timeout: this.uiTimeout });
  }

  async openCreateMilestonePanel() {
    await this.openCreateMenuIfNeeded();
    const picked =
      (await this.pickCreateMenuItem(/^milestone$/i)) ||
      (await this.pickCreateMenuItem(/new milestone|add milestone/i));
    if (!picked) {
      await this.page.getByRole('button', { name: /milestone/i }).first().click({ timeout: 5000 }).catch(() => {});
    }
    await expect(this.addMilestonePanelHeading()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.formPanel()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async fillScheduleOrMilestoneName(name) {
    const panel = this.formPanel();
    const byLabel = panel.getByLabel(/schedule name|milestone name|name|title/i).first();
    if (await byLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await byLabel.fill(name);
      return;
    }
    const textbox = panel.getByRole('textbox').first();
    await expect(textbox).toBeVisible({ timeout: 15000 });
    await textbox.fill(name);
  }

  async fillScheduleNameInOpenPanel(newName, oldName) {
    const panel = this.formPanel();
    await expect(panel).toBeVisible({ timeout: this.uiTimeout });

    if (oldName) {
      const fields = panel.locator('input, textarea');
      const count = await fields.count();
      for (let i = 0; i < count; i += 1) {
        const field = fields.nth(i);
        if (!(await field.isVisible({ timeout: 400 }).catch(() => false))) continue;
        const value = ((await field.inputValue().catch(() => '')) || '').trim();
        if (value !== oldName) continue;
        await field.scrollIntoViewIfNeeded().catch(() => {});
        await field.click({ force: true, timeout: this.quickTimeout });
        await field.fill('');
        await field.fill(newName);
        await field.press('Tab').catch(() => {});
        await expect(field).toHaveValue(newName, { timeout: 10000 });
        return;
      }
    }

    const nameField = panel
      .getByLabel(/^schedule\s*name$/i)
      .or(panel.getByPlaceholder(/^schedule\s*name$/i))
      .or(panel.locator('input[name*="schedule"][name*="name" i], input[id*="schedule"][id*="name" i]'))
      .or(panel.getByLabel(/^name$/i))
      .or(panel.getByRole('textbox').first())
      .first();
    await expect(nameField).toBeVisible({ timeout: 20000 });
    await nameField.scrollIntoViewIfNeeded().catch(() => {});
    await nameField.click({ force: true, timeout: this.quickTimeout });
    await nameField.fill('');
    await nameField.fill(newName);
    await nameField.press('Tab').catch(() => {});
    await expect(nameField).toHaveValue(newName, { timeout: 10000 });
  }

  async fillOptionalDescription(text) {
    const panel = this.formPanel();
    const ta = panel.locator('textarea').first();
    const desc = panel.getByLabel(/description/i).or(panel.locator('textarea[placeholder*="Description" i]')).first();
    const target = (await desc.isVisible({ timeout: 2000 }).catch(() => false)) ? desc : ta;
    await expect(target).toBeVisible({ timeout: 10000 });
    await target.fill(text);
  }

  async fillDateLikeFields() {
    const panel = this.formPanel();
    const start = panel
      .getByLabel(/start/i)
      .or(panel.locator('input[placeholder*="Start" i]'))
      .first();
    const end = panel
      .getByLabel(/end|finish|due/i)
      .or(panel.locator('input[placeholder*="End" i]'))
      .first();

    const fmt = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };
    const s = new Date();
    s.setDate(s.getDate() + 1);
    const e = new Date();
    e.setDate(e.getDate() + 7);
    const sv = fmt(s);
    const ev = fmt(e);

    if (await start.isVisible({ timeout: 5000 }).catch(() => false)) {
      await start.fill(sv);
    }
    if (await end.isVisible({ timeout: 3000 }).catch(() => false)) {
      await end.fill(ev);
    }
  }

  async selectFirstComboboxInPanel(labelRegex) {
    const panel = this.formPanel();
    const combo = panel.getByLabel(labelRegex).or(panel.locator('[role="combobox"]').first()).first();
    if (!(await combo.isVisible({ timeout: 2000 }).catch(() => false))) return;
    await combo.click();
    const opt = this.page.locator('[role="listbox"] [role="option"]').first();
    await expect(opt).toBeVisible({ timeout: 10000 });
    await opt.click();
  }

  async selectFirstAssignee() {
    await this.openScheduleCreateFormAssigneesDropdown();
    await this.selectUpToTwoAssigneesOnScheduleCreateForm(1);
  }

  async selectFirstStatus() {
    await this.selectFirstComboboxInPanel(/status/i);
  }

  async setCompletionPercent(value) {
    const panel = this.formPanel();
    const input = panel.getByLabel(/completion|percent|%/i).or(panel.locator('input[type="number"]').first()).first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(String(value));
    }
  }

  async pickFirstColorSwatch() {
    const panel = this.formPanel();
    const sw = panel.locator('button[aria-label*="color" i], .MuiColorInput-Button, input[type="color"]').first();
    if (await sw.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sw.click().catch(() => {});
    }
  }

  async addPhaseNamed(phaseName) {
    const panel = this.formPanel();
    const addPhase = panel.getByRole('button', { name: /add phase|phase/i }).first();
    if (await addPhase.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addPhase.click();
    }
    const ph = panel.getByLabel(/phase/i).or(panel.getByRole('textbox').nth(1)).first();
    if (await ph.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ph.fill(phaseName);
    }
  }

  async addNewTaskNamed(taskName) {
    const panel = this.formPanel();
    const addTask = panel.getByRole('button', { name: /add task|new task/i }).first();
    if (await addTask.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTask.click();
    }
    const taskInput = panel.getByLabel(/task/i).or(panel.getByPlaceholder(/task/i)).first();
    if (await taskInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await taskInput.fill(taskName);
    }
  }

  async addExistingTaskFromLibraryFirst() {
    const panel = this.formPanel();
    const lib = panel.getByRole('button', { name: /library|existing|choose task/i }).first();
    if (await lib.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lib.click();
      const row = this.page.locator('[role="dialog"] tbody tr, .offcanvas.show tbody tr').first();
      if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        await row.click();
        const add = this.page.getByRole('button', { name: /^add$/i }).first();
        if (await add.isVisible({ timeout: 2000 }).catch(() => false)) await add.click();
      }
    }
  }

  async addReminderIfPresent() {
    const panel = this.formPanel();
    const rem = panel.getByRole('button', { name: /reminder/i }).first();
    if (await rem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rem.click();
      const saveInner = this.page.getByRole('button', { name: /^save$/i }).nth(1);
      if (await saveInner.isVisible({ timeout: 2000 }).catch(() => false)) await saveInner.click();
    }
  }

  async submitPanelPrimary() {
    const panel = this.formPanel();
    const btn = panel
      .getByRole('button', { name: /update|save|create|submit|add schedule|add milestone/i })
      .first();
    await expect(btn).toBeVisible({ timeout: 20000 });
    await btn.click();
    await this._waitScheduleSettled();
    await expect(this.formPanel()).toBeHidden({ timeout: this.uiTimeout }).catch(() => {});
  }

  _scheduleFormPanelCloseIconButton() {
    const panel = this.formPanel();
    return panel
      .locator('button.MuiButton-text, button.MuiButton-root.MuiButton-text')
      .filter({ has: panel.locator('svg[viewBox="0 0 19 18"]') })
      .first()
      .or(panel.locator('button').filter({ has: panel.locator('svg') }).first())
      .or(panel.locator('button[aria-label="Close"], button[aria-label*="close" i], .btn-close').first())
      .or(panel.getByRole('button', { name: /^close$/i }).first());
  }

  async _confirmDiscardSchedulePanelCloseIfPresent() {
    const discard = this.page
      .getByRole('button', { name: /discard|yes|confirm|ok|close/i })
      .first();
    if (await discard.isVisible({ timeout: 2500 }).catch(() => false)) {
      await discard.click({ force: true, timeout: 5000 }).catch(() => {});
    }
  }

  /** MUI header close icon (svg X) on Add/Edit Schedule off-canvas. */
  async closeScheduleFormPanelWithHeaderIcon() {
    const panel = this.formPanel();
    if (!(await panel.isVisible({ timeout: 1500 }).catch(() => false))) return false;

    await this.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._dismissOpenMenusIfAny();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const closeBtn = this._scheduleFormPanelCloseIconButton();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.scrollIntoViewIfNeeded().catch(() => {});
        await closeBtn.click({ force: true, timeout: 10000 }).catch(() => {});
        await this._confirmDiscardSchedulePanelCloseIfPresent();
        if (await this.formPanel().isHidden({ timeout: 5000 }).catch(() => false)) {
          await this.logStep('Closed schedule off-canvas with header close icon');
          return true;
        }
      }
      await this.page.keyboard.press('Escape').catch(() => {});
      await this._confirmDiscardSchedulePanelCloseIfPresent();
    }
    return false;
  }

  async closePanelWithoutSaving() {
    if (await this.closeScheduleFormPanelWithHeaderIcon().catch(() => false)) {
      return;
    }

    const panel = this.formPanel();
    const cancel = panel.getByRole('button', { name: /cancel|close/i }).first();
    const closeIcon = panel.locator('button[aria-label="Close"], .btn-close').first();
    if (await cancel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancel.click();
    } else if (await closeIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeIcon.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this._confirmDiscardSchedulePanelCloseIfPresent();
    await expect(this.formPanel()).toBeHidden({ timeout: 30000 }).catch(() => {});
  }

  async createScheduleMandatory(name, { useListView } = { useListView: true }) {
    if (useListView) await this.switchToListView();
    else await this.switchToGanttView();
    await this.openCreateSchedulePanel();
    await this.fillScheduleOrMilestoneName(name);
    await this.fillDateLikeFields();
    await this.submitPanelPrimary();
  }

  async createMilestoneMandatory(name, { useListView } = { useListView: true }) {
    if (useListView) await this.switchToListView();
    else await this.switchToGanttView();
    await this.openCreateMilestonePanel();
    await this.fillScheduleOrMilestoneName(name);
    await this.fillDateLikeFields();
    await this.submitPanelPrimary();
  }

  async createScheduleWithAllCommonOptionals(name) {
    await this.switchToGanttView();
    await this.openCreateSchedulePanel();
    await this.fillScheduleOrMilestoneName(name);
    await this.fillDateLikeFields();
    await this.selectFirstAssignee();
    await this.selectFirstStatus();
    await this.setCompletionPercent(25);
    await this.pickFirstColorSwatch();
    await this.fillOptionalDescription(`Desc ${this.randomSuffix()}`);
    await this.addPhaseNamed(`Phase-${this.randomSuffix()}`);
    await this.addNewTaskNamed(`Task-${this.randomSuffix()}`);
    await this.addExistingTaskFromLibraryFirst();
    await this.addReminderIfPresent();
    await this.submitPanelPrimary();
  }

  async expectRowOrToastContains(text) {
    const inGrid = this.page.getByText(text, { exact: false }).first();
    if (await inGrid.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(inGrid).toBeVisible({ timeout: 60000 });
      return;
    }

    const row = await this.findListTabRowByScrolling(text);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
  }

  async openEditForNamedItem(name) {
    const row = this.page.locator(`tr:has-text("${name}")`).first();
    await expect(row).toBeVisible({ timeout: 60000 });
    const menuBtn = row.locator('button').last();
    await menuBtn.click();
    const edit = this.page.getByRole('menuitem', { name: /^edit$/i }).first();
    await expect(edit).toBeVisible({ timeout: 15000 });
    await edit.click();
    await expect(this.formPanel()).toBeVisible({ timeout: 30000 });
  }

  async searchListTabScheduleIfAvailable(name) {
    await this.switchToListView();
    const grid = this.page.locator('.MuiDataGrid-root, table').filter({ visible: true }).first();
    const search = this.main
      .getByPlaceholder(/search/i)
      .or(this.main.getByRole('searchbox'))
      .or(this.main.getByRole('textbox', { name: /search/i }))
      .or(grid.getByPlaceholder(/search/i))
      .first();

    if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
      await search.fill(name);
      await search.press('Enter').catch(() => {});
      await this._waitScheduleSettled();
    }
  }

  listTabScrollContainers() {
    return this.page
      .locator(
        [
          '.MuiDataGrid-root:visible .MuiDataGrid-virtualScroller',
          '.MuiDataGrid-root:visible [class*="virtualScroller"]',
          '.MuiDataGrid-root:visible [role="presentation"]',
          '.MuiDataGrid-root:visible',
          'table:visible',
        ].join(', ')
      )
      .filter({ hasNot: this.page.locator('[data-pdf-export-schedule-list="true"]') });
  }

  async scrollListTabToRatio(ratio) {
    const value = Math.max(0, Math.min(1, Number(ratio) || 0));
    const containers = this.listTabScrollContainers();
    const count = await containers.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      await containers
        .nth(i)
        .evaluate((node, scrollRatio) => {
          const scrollables = [node, ...node.querySelectorAll('*')].filter(
            (el) => el.scrollHeight > el.clientHeight + 8 || el.scrollWidth > el.clientWidth + 8
          );
          const target = scrollables.find((el) => el.scrollHeight > el.clientHeight + 8) || scrollables[0];
          if (target) {
            target.scrollTop = Math.round((target.scrollHeight - target.clientHeight) * scrollRatio);
            target.dispatchEvent(new Event('scroll', { bubbles: true }));
          }
        }, value)
        .catch(() => {});
    }
    await this.page
      .evaluate((scrollRatio) => {
        const doc = document.scrollingElement || document.documentElement || document.body;
        if (doc && doc.scrollHeight > doc.clientHeight + 8) {
          doc.scrollTop = Math.round((doc.scrollHeight - doc.clientHeight) * scrollRatio);
          doc.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
      }, value)
      .catch(() => {});
    await this._waitScheduleSettled();
  }

  async setListRowsPerPageTo100IfAvailable() {
    await this.switchToListView();
    await this.page
      .evaluate(() => {
        const doc = document.scrollingElement || document.documentElement || document.body;
        if (doc) doc.scrollTop = doc.scrollHeight;
      })
      .catch(() => {});

    const combo = await this._listRowsPerPageCombobox();

    if (!(await combo.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.logStep('Schedule list pagination rows dropdown not visible');
      return false;
    }

    const currentValue = await combo.locator('xpath=following-sibling::input[1]').getAttribute('value').catch(() => null);
    const currentText = ((await combo.innerText().catch(() => '')) || '').trim();
    if (currentValue === '100' || /100\s*row/i.test(currentText)) {
      return true;
    }

    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: this.quickTimeout });

    const option100 = this.page
      .getByRole('option', { name: /100\s*row\(s\)/i })
      .or(this.page.locator('li[data-value="100"], [role="option"][data-value="100"]'))
      .last();
    if (!(await option100.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    }

    await option100.scrollIntoViewIfNeeded().catch(() => {});
    await option100.click({ force: true, timeout: this.quickTimeout });
    await this._waitScheduleSettled();
    await expect(async () => {
      const value = await combo.locator('xpath=following-sibling::input[1]').getAttribute('value').catch(() => null);
      const text = ((await combo.innerText().catch(() => '')) || '').trim();
      expect(value === '100' || /100\s*row/i.test(text)).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    await this.logStep('Changed schedule list pagination to 100 row(s)');
    return true;
  }

  async _listRowsPerPageCombobox() {
    const candidates = this.page
      .locator('.MuiSelect-select[role="combobox"], [role="combobox"]')
      .filter({ hasNot: this.page.locator('[data-pdf-export-schedule-list="true"]') });
    const count = await candidates.count().catch(() => 0);
    let best = null;
    let bestBottom = -1;

    for (let i = 0; i < count; i += 1) {
      const combo = candidates.nth(i);
      if (!(await combo.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const hiddenInputValue = await combo.locator('xpath=following-sibling::input[1]').getAttribute('value').catch(() => null);
      const text = ((await combo.innerText().catch(() => '')) || '').trim();
      const aria = ((await combo.getAttribute('aria-labelledby').catch(() => '')) || '').trim();
      const looksLikeRowsSelect =
        /^(10|25|50|100)$/.test(hiddenInputValue || '') ||
        /\b(10|25|50|100)\s*row/i.test(text) ||
        /rows?\s*per\s*page|show/i.test(aria);
      if (!looksLikeRowsSelect) continue;

      const box = await combo.boundingBox().catch(() => null);
      const bottom = box ? box.y + box.height : i;
      if (bottom > bestBottom) {
        best = combo;
        bestBottom = bottom;
      }
    }

    return best || this.page.locator('.MuiSelect-select[role="combobox"]').filter({ visible: true }).last();
  }

  async _findVisibleListTabRowByScrolling(name) {
    const row = this.listTabExactRow(name);
    const ratios = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];

    for (const ratio of ratios) {
      await this.scrollListTabToRatio(ratio);
      if (await row.isVisible({ timeout: 1500 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep(`Found schedule in list view after scrolling: ${name}`);
        return row;
      }
      const markedRow = await this.markVisibleListTabRowByRenderedText(name);
      if (markedRow) {
        await this.logStep(`Found schedule in list view by rendered row text: ${name}`);
        return markedRow;
      }
    }

    const grid = this.page.locator('.MuiDataGrid-root:visible, table:visible').first();
    await grid.click({ force: true, timeout: 1000 }).catch(() => {});
    for (const key of ['Home', 'PageDown', 'PageDown', 'PageDown', 'PageDown', 'End']) {
      await this.page.keyboard.press(key).catch(() => {});
      await this._waitScheduleSettled();
      if (await row.isVisible({ timeout: 1500 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep(`Found schedule in list view with keyboard scroll: ${name}`);
        return row;
      }
      const markedRow = await this.markVisibleListTabRowByRenderedText(name);
      if (markedRow) return markedRow;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await grid.hover({ force: true, timeout: 1000 }).catch(() => {});
      await this.page.mouse.wheel(0, 650).catch(() => {});
      await this._waitScheduleSettled();
      if (await row.isVisible({ timeout: 1500 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep(`Found schedule in list view with wheel scroll: ${name}`);
        return row;
      }
      const markedRow = await this.markVisibleListTabRowByRenderedText(name);
      if (markedRow) return markedRow;
    }

    return null;
  }

  async findListTabRowByScrolling(name) {
    await this.searchListTabScheduleIfAvailable(name);
    const firstPassRow = await this._findVisibleListTabRowByScrolling(name);
    if (firstPassRow) return firstPassRow;

    await this.clearListTabSearchIfAvailable();
    const visibleWithoutSearchRow = await this._findVisibleListTabRowByScrolling(name);
    if (visibleWithoutSearchRow) return visibleWithoutSearchRow;

    const paginationChanged = await this.setListRowsPerPageTo100IfAvailable();
    if (paginationChanged) {
      await this.searchListTabScheduleIfAvailable(name);
      const rowAfterPagination = await this._findVisibleListTabRowByScrolling(name);
      if (rowAfterPagination) return rowAfterPagination;

      await this.clearListTabSearchIfAvailable();
      const rowAfterPaginationWithoutSearch = await this._findVisibleListTabRowByScrolling(name);
      if (rowAfterPaginationWithoutSearch) return rowAfterPaginationWithoutSearch;
    }

    throw new Error(`Could not find schedule "${name}" in list view after search and scrolling`);
  }

  async clearListTabSearchIfAvailable() {
    await this.switchToListView();
    const grid = this.page.locator('.MuiDataGrid-root, table').filter({ visible: true }).first();
    const search = this.main
      .getByPlaceholder(/search/i)
      .or(this.main.getByRole('searchbox'))
      .or(this.main.getByRole('textbox', { name: /search/i }))
      .or(grid.getByPlaceholder(/search/i))
      .first();

    if (await search.isVisible({ timeout: 1500 }).catch(() => false)) {
      await search.fill('');
      await search.press('Escape').catch(() => {});
      await this._waitScheduleSettled();
    }
  }

  async _openEditFromListRow(row) {
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});

    const menuButton = row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button[aria-haspopup="menu"], button[aria-label*="more" i], button[aria-label*="action" i]'))
      .or(row.locator('[data-testid*="More" i], svg[data-testid*="More" i]').locator('xpath=ancestor::button[1]'))
      .or(row.locator('button').last())
      .first();

    const cells = row.locator('td, [role="gridcell"]');
    const cellCount = await cells.count().catch(() => 0);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
      if (cellCount > 0) {
        await cells.nth(cellCount - 1).hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
      }
      if (await menuButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await menuButton.click({ force: true, timeout: this.quickTimeout });
        break;
      }
      if (attempt === 3) {
        await expect(menuButton).toBeVisible({ timeout: this.uiTimeout });
        await menuButton.click({ force: true, timeout: this.quickTimeout });
      }
    }

    const edit = this.page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(this.page.getByRole('button', { name: /^edit$/i }))
      .or(this.page.locator('[role="menu"] *').filter({ hasText: /^edit$/i }))
      .first();
    await expect(edit).toBeVisible({ timeout: this.uiTimeout });
    await edit.click({ force: true, timeout: this.quickTimeout });
    await expect(this.editSchedulePanelHeading().or(this.formPanel()).first()).toBeVisible({ timeout: this.uiTimeout });
  }

  async openEditForListSchedule(name) {
    try {
      const row = await this.findListTabRowByScrolling(name);
      await this._openEditFromListRow(row);
    } catch (error) {
      await this.logStep(`List row not found for "${name}" — opening exact row from Gantt sidebar fallback`);
      await this.openEditForGanttSidebarSchedule(name);
    }
  }

  async openEditForFirstVisibleListScheduleName(names) {
    for (const name of names) {
      await this.searchListTabScheduleIfAvailable(name);
      const row = this.listTabRow(name);
      if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this._openEditFromListRow(row);
        return name;
      }
    }

    throw new Error(`Could not find any schedule in list view: ${names.join(', ')}`);
  }

  _listScheduleRowCandidates() {
    return [
      this.page
        .locator('.MuiDataGrid-root:visible [role="row"][data-rowindex]')
        .filter({ hasNotText: /schedule\s*name|start\s*date|end\s*date|duration|created\s*on/i }),
      this.page
        .locator('.MuiDataGrid-root:visible [role="row"]')
        .filter({ has: this.page.locator('[role="gridcell"]') })
        .filter({ hasNotText: /schedule\s*name|start\s*date|end\s*date|duration|created\s*on/i }),
      this.page
        .locator('table:visible tbody tr')
        .filter({ hasNotText: /schedule\s*name|start\s*date|end\s*date|duration|created\s*on/i }),
    ];
  }

  async _findVisibleEditableListScheduleRow() {
    const visibleRows = [];
    for (const rows of this._listScheduleRowCandidates()) {
      const count = await rows.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const row = rows.nth(i);
        if (!(await row.isVisible({ timeout: 300 }).catch(() => false))) continue;
        const cells = row.locator('td, [role="gridcell"]');
        const cellCount = await cells.count().catch(() => 0);
        if (cellCount === 0) continue;

        let text = ((await row.innerText().catch(() => '')) || '').trim();
        if (!text) {
          const cellTexts = [];
          for (let cellIndex = 0; cellIndex < Math.min(cellCount, 4); cellIndex += 1) {
            const cellText = ((await cells.nth(cellIndex).innerText().catch(() => '')) || '').trim();
            if (cellText) cellTexts.push(cellText);
          }
          text = cellTexts.join(' ').trim();
        }
        if (!text || /no rows|no data|loading/i.test(text)) continue;
        visibleRows.push({ row, label: text.split(/\r?\n/)[0].trim() });
      }
    }
    if (visibleRows.length === 0) return null;
    return visibleRows[Math.floor(Math.random() * visibleRows.length)];
  }

  async openEditForRandomListSchedule() {
    await this.switchToListView();
    await this.clearListTabSearchIfAvailable();
    let picked = await this._findVisibleEditableListScheduleRow();
    if (!picked) {
      await expect(async () => {
        picked = await this._findVisibleEditableListScheduleRow();
        expect(Boolean(picked)).toBeTruthy();
      }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    }
    await this._openEditFromListRow(picked.row);
    return picked.label;
  }

  async updateNameInOpenPanel(newName, oldName) {
    await this.fillScheduleNameInOpenPanel(newName, oldName);
    await this.submitPanelPrimary();
  }

  async updateSchedulePhaseFromListRowMenu(name) {
    await this.openEditForListSchedule(name);
    await this.selectRandomPhaseOnScheduleCreateForm();
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async updateScheduleAssigneeFromListRowMenu(name) {
    await this.openEditForListSchedule(name);
    await this.hideFreshchatWidget();

    const region = await this._scheduleCreateFormLabeledFieldContainer(/^assignees?\b/i);
    if ((await region.locator('.MuiChip-root').count().catch(() => 0)) > 0) {
      await this.removeAssigneeInEdit();
    }

    await this.openScheduleCreateFormAssigneesDropdown();
    await this.expectScheduleCreateFormAssigneesListVisible();
    await this.selectUpToTwoAssigneesOnScheduleCreateForm(1);
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async updateSchedulePriorityFromListRowMenu(name, priorityRegex) {
    await this.openEditForListSchedule(name);
    await this.selectScheduleFormPriority(priorityRegex);
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async updateScheduleStatusFromListRowMenu(name, statusRegex) {
    await this.openEditForListSchedule(name);
    await this.selectScheduleFormStatus(statusRegex);
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async updateScheduleCompletionFromListRowMenu(name, min, max) {
    await this.openEditForListSchedule(name);
    await this.fillRandomCompletionPercentOnScheduleCreateForm(min, max);
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async updateRandomScheduleStartDateFromListRowMenu() {
    const rowLabel = await this.openEditForRandomListSchedule();
    await this.pickRandomStartDateTimeOnScheduleCreateForm();
    await this.pickRandomEndDateTimeAfterStartOnScheduleCreateForm();
    await this.waitForScheduleCreateFormDurationNotZero(20000);
    await this.submitPanelPrimary();
    this._scheduleCreateFormRequiresNonZeroDuration = false;
    await this.logStep(`Updated random schedule start date: ${rowLabel || 'visible row'}`);
  }

  randomDurationText() {
    const days = 1 + Math.floor(Math.random() * 5);
    const hours = 1 + Math.floor(Math.random() * 7);
    const minutes = 1 + Math.floor(Math.random() * 58);
    return `${days}d ${hours}h ${minutes}m`;
  }

  async fillRandomDurationOnScheduleForm() {
    const duration = this.randomDurationText();
    const field = this._scheduleCreateFormDurationField();
    await expect(field).toBeVisible({ timeout: 20000 });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ force: true, timeout: 15000 });
    await field.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
    await field.fill(duration);
    await field.press('Tab').catch(() => {});
    await expect(async () => {
      const value = ((await field.inputValue().catch(() => '')) || '').trim();
      expect(this._hasNonZeroDuration(value), `duration should be non-zero after entering "${duration}", got "${value}"`).toBeTruthy();
    }).toPass({ timeout: 10000, intervals: [300, 700, 1200] });
    const actualDuration = ((await field.inputValue().catch(() => '')) || duration).trim();
    await this.logStep(`Entered duration: ${duration}${actualDuration !== duration ? ` (UI kept ${actualDuration})` : ''}`);
    return actualDuration;
  }

  async updateRandomScheduleDurationFromListRowMenu() {
    const rowLabel = await this.openEditForRandomListSchedule();
    await this.fillRandomDurationOnScheduleForm();
    await this.submitPanelPrimary();
    await this.logStep(`Updated random schedule duration: ${rowLabel || 'visible row'}`);
  }

  async updateRandomScheduleDescriptionFromListRowMenu() {
    const rowLabel = await this.openEditForRandomListSchedule();
    await this.fillRandomDescriptionOnScheduleCreateForm();
    await this.submitPanelPrimary();
    await this.logStep(`Updated random schedule description: ${rowLabel || 'visible row'}`);
  }

  async updateRandomScheduleTaskFromListRowMenu() {
    const rowLabel = await this.openEditForRandomListSchedule();
    const taskName = `TC-27 task ${this.randomSuffix()}`;
    await this.expandScheduleCreateFormAdditionalDetails();
    await this.addNewTaskOnScheduleCreateFormNamed(taskName);
    await this.selectOneAssigneeOnScheduleCreateFormTask();
    await this.pickRandomEndDateTimeOnScheduleCreateFormTask();
    await this.submitPanelPrimary();
    await this.logStep(`Updated random schedule task: ${rowLabel || 'visible row'} -> ${taskName}`);
  }

  async updateRandomScheduleReminderFromListRowMenu() {
    const rowLabel = await this.openEditForRandomListSchedule();
    await this.expandScheduleCreateFormAdditionalDetails();
    await this.addRandomReminderOnScheduleCreateForm();
    await this.submitPanelPrimary();
    await this.logStep(`Updated random schedule reminder: ${rowLabel || 'visible row'}`);
  }

  async updateScheduleAllFieldsFromListRowMenu(oldName, newName) {
    const openedName = await this.openEditForFirstVisibleListScheduleName([oldName, newName]);

    await this.fillScheduleNameInOpenPanel(newName, openedName);
    await this.selectRandomPhaseOnScheduleCreateForm();
    await this.selectScheduleFormPriority(/^low$/i);
    await this.openScheduleCreateFormAssigneesDropdown();
    await this.selectUpToTwoAssigneesOnScheduleCreateForm(2);
    await this.selectScheduleFormStatus(/^completed$/i);
    await this.fillRandomCompletionPercentOnScheduleCreateForm(0, 100);
    await this.fillRandomHexColorCodeOnScheduleCreateForm();
    await this.pickRandomStartDateTimeOnScheduleCreateForm();
    await this.fillRandomDurationOnScheduleForm();
    await this.fillRandomDescriptionOnScheduleCreateForm();

    await this.expandScheduleCreateFormAdditionalDetails();
    await this.selectRandomExistingTaskOnScheduleCreateForm();

    const secondTaskName = `2nd ${this.randomSuffix()}`;
    await this.addNewTaskOnScheduleCreateFormNamed(secondTaskName);
    await this.setScheduleCreateFormTaskStatus(/completed/i);
    await this.selectOneAssigneeOnScheduleCreateFormTask();
    await this.pickRandomEndDateTimeOnScheduleCreateFormTask();

    await this.addRandomReminderOnScheduleCreateForm();
    await this.setScheduleCreateFormReminderUnitToWeeks();
    await this.submitPanelPrimary();
    await this.logStep(`Updated all schedule fields: ${oldName} -> ${newName}`);
  }

  async searchGanttSidebarScheduleIfAvailable(name) {
    const side = this.ganttSidebar();
    const scopedSearch = side
      .getByPlaceholder(/search/i)
      .or(side.getByRole('searchbox'))
      .or(side.getByRole('textbox', { name: /search/i }))
      .first();
    const search = (await scopedSearch.isVisible({ timeout: 1500 }).catch(() => false))
      ? scopedSearch
      : this.ganttSidebarSearchInput;

    if (await search.isVisible({ timeout: 1500 }).catch(() => false)) {
      await search.fill(name);
      await this._waitScheduleSettled();
    }
  }

  async openEditForGanttSidebarSchedule(name) {
    await this.switchToGanttView();
    await this.searchGanttSidebarScheduleIfAvailable(name);
    await this.expectScheduleInGanttSidebarList(name);

    const row = await this.findGanttSidebarRowByExactName(name);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});

    const menuButton = row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button[aria-haspopup="menu"], button[aria-label*="more" i], button[aria-label*="action" i]'))
      .or(row.locator('button').last())
      .first();
    await expect(menuButton).toBeVisible({ timeout: this.uiTimeout });
    await menuButton.click({ force: true, timeout: this.quickTimeout });

    const edit = this.page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(this.page.getByRole('button', { name: /^edit$/i }))
      .or(this.page.locator('[role="menu"] *').filter({ hasText: /^edit$/i }))
      .first();
    await expect(edit).toBeVisible({ timeout: this.uiTimeout });
    await edit.click({ force: true, timeout: this.quickTimeout });

    await expect(this.editSchedulePanelHeading().or(this.formPanel()).first()).toBeVisible({ timeout: this.uiTimeout });
  }

  async updateScheduleNameFromGanttSidebar(oldName, newName) {
    await this.openEditForGanttSidebarSchedule(oldName);
    await this.updateNameInOpenPanel(newName, oldName);
    await this.searchGanttSidebarScheduleIfAvailable(newName);
    await this.expectScheduleInGanttSidebarList(newName);
  }

  async deleteNamedItemViaRowMenu(name) {
    const row = await this.findListTabRowByScrolling(name);
    await this._openListRowActionsMenu(row);
    await this._clickDeleteInOpenActionsMenu();
    await this._confirmDeleteSchedulePopup();
    await expect(row).toBeHidden({ timeout: 60000 }).catch(() => {});
    await this.logStep(`Deleted from list row menu: ${name}`);
  }

  async _openListRowActionsMenu(row) {
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});

    const menuButton = row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button[aria-haspopup="menu"], button[aria-label*="more" i], button[aria-label*="action" i]'))
      .or(row.locator('[data-testid*="More" i], svg[data-testid*="More" i]').locator('xpath=ancestor::button[1]'))
      .or(row.locator('button').last())
      .first();

    const cells = row.locator('td, [role="gridcell"]');
    const cellCount = await cells.count().catch(() => 0);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
      if (cellCount > 0) {
        await cells.nth(cellCount - 1).hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
      }
      if (await menuButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await menuButton.click({ force: true, timeout: this.quickTimeout });
        return;
      }
      if (attempt === 3) {
        await expect(menuButton).toBeVisible({ timeout: this.uiTimeout });
        await menuButton.click({ force: true, timeout: this.quickTimeout });
      }
    }
  }

  async _openGanttSidebarRowActionsMenu(row) {
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});

    const menuButton = row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button[aria-haspopup="menu"], button[aria-label*="more" i], button[aria-label*="action" i]'))
      .or(row.locator('[data-testid*="More" i], svg[data-testid*="More" i]').locator('xpath=ancestor::button[1]'))
      .or(
        row
          .locator('svg.lucide-ellipsis, svg.lucide-more-vertical, svg.lucide-more-horizontal, svg.lucide-menu')
          .locator('xpath=ancestor::button[1]')
      )
      .or(row.locator('button').last())
      .first();

    const cells = row.locator('td, [role="cell"], [role="gridcell"]');
    const cellCount = await cells.count().catch(() => 0);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
      if (cellCount > 0) {
        await cells.nth(cellCount - 1).hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
      }
      if (await menuButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await menuButton.click({ force: true, timeout: this.quickTimeout });
        return;
      }
      if (attempt === 3) {
        await expect(menuButton).toBeVisible({ timeout: this.uiTimeout });
        await menuButton.click({ force: true, timeout: this.quickTimeout });
      }
    }
  }

  async _expectDeleteMenuItemVisible() {
    const deleteItem = this.page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(this.page.getByRole('button', { name: /^delete$/i }))
      .or(this.page.getByRole('menu').getByText(/^delete$/i))
      .or(this.page.locator('[role="menu"] *').filter({ hasText: /^delete$/i }))
      .first();
    await expect(deleteItem).toBeVisible({ timeout: this.uiTimeout });
    return deleteItem;
  }

  async _clickDeleteInOpenActionsMenu() {
    const del = await this._expectDeleteMenuItemVisible();
    await del.click({ force: true, timeout: this.quickTimeout });
  }

  async _confirmDeleteSchedulePopup() {
    const dialog = this.page
      .locator('[role="dialog"], .MuiDialog-root .MuiDialog-paper')
      .filter({ visible: true })
      .last();
    const confirm = dialog
      .getByRole('button', { name: /^yes$|^confirm$|^ok$|^delete$/i })
      .or(dialog.getByRole('button', { name: /yes.*delete|confirm.*delete|delete.*confirm/i }))
      .or(this.page.getByRole('button', { name: /^yes$|^confirm$|^ok$/i }))
      .first();
    await expect(confirm).toBeVisible({ timeout: 15000 });
    await confirm.click({ force: true, timeout: this.quickTimeout });
    await this._waitScheduleSettled();
  }

  _ganttSidebarScheduleRowCandidates() {
    const side = this.ganttSidebar();
    return [
      side.locator('table.MuiTable-root tbody tr'),
      side.locator('table tbody tr'),
      side.locator('tbody tr').filter({ has: side.locator('td, [role="cell"]') }),
      side.locator('tr').filter({ has: side.locator('td, [role="cell"], [role="gridcell"]') }),
    ];
  }

  async _collectVisibleGanttSidebarScheduleRows() {
    const visibleRows = [];
    for (const rows of this._ganttSidebarScheduleRowCandidates()) {
      const count = await rows.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const row = rows.nth(i);
        if (!(await row.isVisible({ timeout: 300 }).catch(() => false))) continue;
        const cells = row.locator('td, [role="cell"], [role="gridcell"]');
        const cellCount = await cells.count().catch(() => 0);
        if (cellCount === 0) continue;

        const firstCellText = ((await cells.first().innerText().catch(() => '')) || '').trim();
        if (/^schedule\s*name$|^start\s*date$|^end\s*date$|^duration$|^created\s*on$/i.test(firstCellText)) {
          continue;
        }

        let text = ((await row.innerText().catch(() => '')) || '').trim();
        if (!text) {
          const cellTexts = [];
          for (let cellIndex = 0; cellIndex < Math.min(cellCount, 4); cellIndex += 1) {
            const cellText = ((await cells.nth(cellIndex).innerText().catch(() => '')) || '').trim();
            if (cellText) cellTexts.push(cellText);
          }
          text = cellTexts.join(' ').trim();
        }
        if (!text || /no rows|no data|loading|add schedule/i.test(text)) continue;
        visibleRows.push({ row, label: text.split(/\r?\n/)[0].trim() });
      }
      if (visibleRows.length > 0) break;
    }
    return visibleRows;
  }

  async _findVisibleDeletableGanttSidebarScheduleRow() {
    await this.switchToGanttView();
    const side = this.ganttSidebar();
    await expect(side).toBeVisible({ timeout: this.uiTimeout });

    for (const ratio of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      await this.scrollGanttSidebarListToRatio(ratio);
      const visibleRows = await this._collectVisibleGanttSidebarScheduleRows();
      if (visibleRows.length > 0) {
        const picked = visibleRows[Math.floor(Math.random() * visibleRows.length)];
        await picked.row.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep(`Found gantt sidebar schedule row: ${picked.label}`);
        return picked;
      }
    }
    return null;
  }

  async _scrollGanttTimelineToRatio(ratio) {
    const tl = this.ganttTimelineHost();
    await tl
      .evaluate((root, value) => {
        const candidates = [root, ...root.querySelectorAll('*')];
        const scrollables = candidates.filter(
          (el) => el.scrollHeight > el.clientHeight + 8 || el.scrollWidth > el.clientWidth + 8
        );
        for (const el of scrollables) {
          el.scrollLeft = Math.round((el.scrollWidth - el.clientWidth) * value);
          el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * value);
        }
      }, ratio)
      .catch(() => {});
    await this._waitScheduleSettled();
  }

  async _findGanttChartMilestoneMarkerBySidebarRow(row, name) {
    const tl = this.ganttTimelineHost();
    await expect(tl).toBeVisible({ timeout: this.uiTimeout });
    const rowBox = row ? await row.boundingBox() : null;
    const rowCenterY = rowBox ? rowBox.y + rowBox.height / 2 : null;

    const label = tl.getByText(name, { exact: true }).first();
    if (await label.isVisible({ timeout: 1500 }).catch(() => false)) {
      const rowContainer = label.locator('xpath=ancestor::div[1]');
      const diamondInRow = rowContainer.locator('div.MuiBox-root[aria-hidden="true"]').first();
      if (await diamondInRow.isVisible({ timeout: 500 }).catch(() => false)) {
        return diamondInRow;
      }

      const precedingDiamond = label.locator(
        'xpath=preceding-sibling::div[contains(@class,"MuiBox-root")][@aria-hidden="true"][1]'
      );
      if (await precedingDiamond.isVisible({ timeout: 500 }).catch(() => false)) {
        return precedingDiamond;
      }

      return label;
    }

    if (rowCenterY == null) return null;

    const markers = tl.locator('div.MuiBox-root[aria-hidden="true"]');
    const count = await markers.count().catch(() => 0);
    let best = null;
    let bestDelta = Infinity;
    for (let i = 0; i < count; i += 1) {
      const marker = markers.nth(i);
      if (!(await marker.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const box = await marker.boundingBox();
      if (!box || box.width < 4 || box.height < 4) continue;
      const centerY = box.y + box.height / 2;
      const delta = Math.abs(centerY - rowCenterY);
      if (delta < bestDelta && delta <= 25) {
        bestDelta = delta;
        best = marker;
      }
    }
    return best;
  }

  async _findGanttChartBarBySidebarRow(row, name) {
    const tl = this.ganttTimelineHost();
    await expect(tl).toBeVisible({ timeout: this.uiTimeout });
    const rowBox = await row.boundingBox();
    if (!rowBox) return null;

    const rowCenterY = rowBox.y + rowBox.height / 2;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(`^${escaped}$`, 'i');

    if (this._looksLikeMilestoneName(name)) {
      const milestoneMarker = await this._findGanttChartMilestoneMarkerBySidebarRow(row, name);
      if (milestoneMarker) return milestoneMarker;
    }

    const textTarget = tl.getByText(name, { exact: true }).first();
    if (await textTarget.isVisible({ timeout: 1500 }).catch(() => false)) {
      return textTarget;
    }

    const labeled = tl
      .locator(`[title="${name}"], [aria-label="${name}"], [aria-label*="${name}"]`)
      .or(tl.locator('div, span, foreignObject, text, tspan').filter({ hasText: nameRe }))
      .first();
    if (await labeled.isVisible({ timeout: 1500 }).catch(() => false)) {
      return labeled;
    }

    const barCandidates = tl.locator(
      'div[style*="background"], div[class*="bar"], div[class*="task"], div[class*="event"], rect, path, svg'
    );
    const count = await barCandidates.count().catch(() => 0);
    let best = null;
    let bestDelta = Infinity;
    for (let i = 0; i < count; i += 1) {
      const bar = barCandidates.nth(i);
      if (!(await bar.isVisible({ timeout: 200 }).catch(() => false))) continue;
      const box = await bar.boundingBox();
      if (!box || box.width < 12 || box.height < 6) continue;
      const centerY = box.y + box.height / 2;
      const delta = Math.abs(centerY - rowCenterY);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = bar;
      }
    }
    if (best && bestDelta <= 40) return best;
    return null;
  }

  async _findGanttChartBarForSchedule(name) {
    const tl = this.ganttTimelineHost();
    await expect(tl).toBeVisible({ timeout: this.uiTimeout });
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(`^${escaped}$`, 'i');

    const pickVisible = async (candidates) => {
      for (const pick of candidates) {
        const loc = pick();
        if (await loc.isVisible({ timeout: 1200 }).catch(() => false)) {
          return loc;
        }
      }
      return null;
    };

    for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
      await this._scrollGanttTimelineToRatio(ratio);
      if (this._looksLikeMilestoneName(name)) {
        const milestoneMarker = await this._findGanttChartMilestoneMarkerBySidebarRow(null, name);
        if (milestoneMarker) return milestoneMarker;
      }
      const target = await pickVisible([
        () => tl.getByText(name, { exact: true }).first(),
        () => tl.locator('*').filter({ hasText: nameRe }).first(),
        () => tl.locator(`[title="${name}"], [aria-label="${name}"], [aria-label*="${name}"]`).first(),
        () =>
          tl
            .locator('div, span, foreignObject, text, tspan')
            .filter({ hasText: nameRe })
            .first(),
      ]);
      if (target) return target;
    }

    return null;
  }

  async _selectGanttSidebarScheduleRow(row) {
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.click({ force: true, timeout: this.quickTimeout });
    await this._waitScheduleSettled();
  }

  async _openGanttChartContextMenuAtSidebarRowY(row) {
    const rowBox = await row.boundingBox();
    const tl = this.ganttTimelineHost();
    const tlBox = await tl.boundingBox();
    if (!rowBox || !tlBox) {
      throw new Error('Could not resolve gantt sidebar row or timeline bounds for context menu');
    }

    const clickX = tlBox.x + Math.min(Math.max(tlBox.width * 0.35, 120), tlBox.width - 40);
    const clickY = rowBox.y + rowBox.height / 2;

    await tl.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});
    await this.page.mouse.move(clickX, clickY);
    await this.page.mouse.click(clickX, clickY, { button: 'right' });
  }

  async _openGanttChartContextMenuForSchedule(name, sidebarRow = null) {
    if (sidebarRow) {
      if (this._looksLikeMilestoneName(name)) {
        const milestoneMarker = await this._findGanttChartMilestoneMarkerBySidebarRow(sidebarRow, name);
        if (milestoneMarker) {
          let opened = false;
          await expect(async () => {
            await this._openContextMenuOnScheduleTarget(milestoneMarker);
            opened = true;
          })
            .toPass({ timeout: 15000, intervals: [500, 1000] })
            .catch(() => {});
          if (opened) return;
        }
      }

      let opened = false;
      await expect(async () => {
        await this._openGanttChartContextMenuAtSidebarRowY(sidebarRow);
        await this._expectDeleteMenuItemVisible();
        opened = true;
      }).toPass({ timeout: 15000, intervals: [500, 1000] }).catch(() => {});

      if (!opened) {
        const target = await this._findGanttChartBarBySidebarRow(sidebarRow, name);
        if (!target) {
          throw new Error(`Could not open gantt chart context menu for schedule "${name}"`);
        }
        await this._openContextMenuOnScheduleTarget(target);
      }
      return;
    }

    const target = await this._findGanttChartBarForSchedule(name);
    if (!target) {
      throw new Error(`Could not find gantt chart bar for schedule "${name}"`);
    }
    await this._openContextMenuOnScheduleTarget(target);
  }

  async _openContextMenuOnScheduleTarget(target) {
    await expect(target).toBeVisible({ timeout: this.uiTimeout });
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await target.hover({ force: true, timeout: this.quickTimeout }).catch(() => {});

    await target.click({ button: 'right', force: true, timeout: this.quickTimeout });
    if (!(await this._expectDeleteMenuItemVisible().then(() => true).catch(() => false))) {
      const box = await target.boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
      }
      await this._expectDeleteMenuItemVisible();
    }
  }

  async expectScheduleNotVisibleInUi(name) {
    await this.switchToGanttView();
    if (await this.ganttSidebarRow(name).isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(this.ganttSidebarRow(name)).toBeHidden({ timeout: this.uiTimeout });
      return;
    }
    await this.switchToListView();
    await this.searchListTabScheduleIfAvailable(name);
    await expect(this.listTabRow(name)).toBeHidden({ timeout: this.uiTimeout });
  }

  async deleteRandomScheduleFromGanttSidebarListMenu() {
    let picked = await this._findVisibleDeletableGanttSidebarScheduleRow();
    if (!picked) {
      await expect(async () => {
        picked = await this._findVisibleDeletableGanttSidebarScheduleRow();
        expect(Boolean(picked)).toBeTruthy();
      }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    }
    const { row, label } = picked;
    await this._openGanttSidebarRowActionsMenu(row);
    await this._clickDeleteInOpenActionsMenu();
    await this._confirmDeleteSchedulePopup();
    await this.logStep(`Deleted schedule from gantt sidebar list menu: ${label}`);
    return label;
  }

  async deleteRandomScheduleFromGanttChartContextMenu() {
    let picked = await this._findVisibleDeletableGanttSidebarScheduleRow();
    if (!picked) {
      await expect(async () => {
        picked = await this._findVisibleDeletableGanttSidebarScheduleRow();
        expect(Boolean(picked)).toBeTruthy();
      }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    }
    const { row, label: name } = picked;
    await this._selectGanttSidebarScheduleRow(row);
    await this._openGanttChartContextMenuForSchedule(name, row);
    await this._clickDeleteInOpenActionsMenu();
    await this._confirmDeleteSchedulePopup();
    await this.logStep(`Deleted schedule from gantt chart context menu: ${name}`);
    return name;
  }

  async deleteNamedItemFromGanttChartContextMenu(name) {
    await this.switchToGanttView();
    await this.searchGanttSidebarScheduleIfAvailable(name);
    const row = await this.findGanttSidebarRowByExactName(name);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await this._selectGanttSidebarScheduleRow(row);

    if (this._looksLikeMilestoneName(name)) {
      const marker = await this._findGanttChartMilestoneMarkerBySidebarRow(row, name);
      await expect(marker).toBeVisible({ timeout: this.uiTimeout });
      await this.logStep(`Milestone "${name}" visible on gantt chart`);
    }

    await this._openGanttChartContextMenuForSchedule(name, row);
    await this._clickDeleteInOpenActionsMenu();
    await this._confirmDeleteSchedulePopup();
    await this.logStep(`Deleted from gantt chart context menu: ${name}`);
  }

  async deleteRandomScheduleFromListRowMenu() {
    await this.switchToListView();
    await this.clearListTabSearchIfAvailable();
    let picked = await this._findVisibleEditableListScheduleRow();
    if (!picked) {
      await expect(async () => {
        picked = await this._findVisibleEditableListScheduleRow();
        expect(Boolean(picked)).toBeTruthy();
      }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });
    }
    const { row, label } = picked;
    await this._openListRowActionsMenu(row);
    await this._clickDeleteInOpenActionsMenu();
    await this._confirmDeleteSchedulePopup();
    await this.logStep(`Deleted schedule from list row menu: ${label}`);
    return label;
  }

  async clickScheduleToday() {
    await expect(this.todayButton).toBeVisible({ timeout: 30000 });
    await this.todayButton.click();
  }

  async setTimelineView(mode) {
    const m = (mode || '').toLowerCase();
    if (m === 'day') await this.dayViewBtn.click();
    else if (m === 'week') await this.weekViewBtn.click();
    else if (m === 'month') await this.monthViewBtn.click();
    else throw new Error(`Unknown gantt view mode: ${mode}`);
    await this.page.waitForTimeout(400);
  }

  async downloadCurrentGanttView() {
    if (await this.downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.downloadButton.click();
    }
  }

  async toggleCriticalPath(enable) {
    if (!(await this.criticalPathToggle.isVisible({ timeout: 5000 }).catch(() => false))) return;
    const checked = await this.criticalPathToggle.isChecked().catch(() => false);
    if (enable && !checked) await this.criticalPathToggle.check();
    if (!enable && checked) await this.criticalPathToggle.uncheck();
  }

  async applyFilterByTypeAndClear(typeLabel) {
    if (await this.filterButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.filterButton.click();
    }
    const typeCombo = this.page.getByLabel(/type/i).or(this.page.locator('[role="dialog"] [role="combobox"]').first()).first();
    if (await typeCombo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeCombo.click();
      await this.page.getByRole('option', { name: new RegExp(typeLabel, 'i') }).first().click();
    }
    if (await this.applyFilterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.applyFilterButton.click();
    }
    await this.page.waitForTimeout(500);
    if (await this.clearFilterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.clearFilterButton.click();
    }
  }

  async openContextMenuOnNamedItem(name) {
    const cell = this.page.getByText(name, { exact: false }).first();
    await expect(cell).toBeVisible({ timeout: 60000 });
    await cell.click({ button: 'right' });
  }

  async clickGanttMenuItem(nameRegex) {
    const item = this.page.getByRole('menuitem', { name: nameRegex }).first();
    await expect(item).toBeVisible({ timeout: 15000 });
    await item.click();
  }

  async addChildScheduleMandatory(parentName, childName) {
    await this.switchToGanttView();
    await this.openContextMenuOnNamedItem(parentName);
    await this.clickGanttMenuItem(/add child/i);
    await expect(this.formPanel()).toBeVisible({ timeout: 30000 });
    await this.fillScheduleOrMilestoneName(childName);
    await this.fillDateLikeFields();
    await this.submitPanelPrimary();
  }

  async setPausedFromGanttMenu(name, paused) {
    await this.openContextMenuOnNamedItem(name);
    await this.clickGanttMenuItem(paused ? /pause/i : /resume/i);
  }

  async setCompletedFromGanttMenu(name, completed) {
    await this.openContextMenuOnNamedItem(name);
    await this.clickGanttMenuItem(completed ? /completed/i : /incomplete/i);
  }

  async addBaselineNamed(name) {
    const baselineBtn = this.page.getByRole('button', { name: /baseline/i }).first();
    if (await baselineBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await baselineBtn.click();
    }
    const tick = this.page.locator('.offcanvas.show [type="checkbox"], [role="dialog"] [type="checkbox"]').first();
    if (await tick.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tick.check().catch(() => tick.click());
    }
    const nameInput = this.page.getByLabel(/baseline|name/i).first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(name);
    }
    await this.page.getByRole('button', { name: /save|add|create/i }).first().click();
  }

  async openDependencyUiForNamed(name) {
    await this.openEditForNamedItem(name);
    const dep = this.formPanel().getByRole('tab', { name: /depend/i }).or(this.formPanel().getByText(/depend/i)).first();
    if (await dep.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dep.click();
    }
  }

  async addDependencyType(depType) {
    const panel = this.formPanel();
    const add = panel.getByRole('button', { name: /add dependency|add link|dependency/i }).first();
    if (await add.isVisible({ timeout: 3000 }).catch(() => false)) await add.click();
    const typeSelect = panel.getByLabel(/type|relation|link/i).or(panel.locator('[role="combobox"]').first()).first();
    if (await typeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeSelect.click();
      await this.page.getByRole('option', { name: new RegExp(`^${depType}$`, 'i') }).first().click();
    }
    await this.submitPanelPrimary();
  }

  async _scheduleCreateFormLabeledFieldContainer(labelRegex) {
    const panel = this.formPanel();
    const lbl = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span')
      .filter({ hasText: labelRegex })
      .first();
    await expect(lbl).toBeVisible({ timeout: 20000 });
    const column = lbl
      .locator('xpath=ancestor::div[contains(@class,"column")][1]')
      .or(lbl.locator('xpath=ancestor::div[contains(@class,"MuiGrid-item")][1]'))
      .first();
    if (await column.isVisible({ timeout: 1500 }).catch(() => false)) return column;
    return lbl.locator('xpath=ancestor::div[1]').first();
  }

  async _countRemoveButtonsBefore(endLocator, afterLocator = null) {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const endBox = await endLocator.boundingBox();
    if (!endBox) return 0;
    const afterBox = afterLocator ? await afterLocator.boundingBox() : null;
    const removes = region.getByRole('button', { name: /^remove$/i });
    const count = await removes.count();
    let matched = 0;
    for (let i = 0; i < count; i += 1) {
      const box = await removes.nth(i).boundingBox();
      if (!box || box.y >= endBox.y) continue;
      if (afterBox && box.y <= afterBox.y) continue;
      matched += 1;
    }
    return matched;
  }

  async _countRemoveButtonsAfter(startLocator, endLocator = null) {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const startBox = await startLocator.boundingBox();
    if (!startBox) return 0;
    const endBox = endLocator ? await endLocator.boundingBox() : null;
    const startBottom = startBox.y + startBox.height;
    const removes = region.getByRole('button', { name: /^remove$/i });
    const count = await removes.count();
    let matched = 0;
    for (let i = 0; i < count; i += 1) {
      const box = await removes.nth(i).boundingBox();
      if (!box || box.y + box.height <= startBottom - 4) continue;
      if (endBox && box.y >= endBox.y) continue;
      matched += 1;
    }
    return matched;
  }

  async _clickFirstRemoveButtonBefore(endLocator, afterLocator = null) {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const endBox = await endLocator.boundingBox();
    const afterBox = afterLocator ? await afterLocator.boundingBox() : null;
    const removes = region.getByRole('button', { name: /^remove$/i });
    const count = await removes.count();
    for (let i = 0; i < count; i += 1) {
      const btn = removes.nth(i);
      const box = await btn.boundingBox();
      if (!box || !endBox || box.y >= endBox.y) continue;
      if (afterBox && box.y <= afterBox.y) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ force: true, timeout: 15000 });
      return;
    }
    throw new Error('No Remove button found in the expected form section');
  }

  async _clickFirstRemoveButtonAfter(startLocator, endLocator = null) {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const startBox = await startLocator.boundingBox();
    const endBox = endLocator ? await endLocator.boundingBox() : null;
    const startBottom = startBox ? startBox.y + startBox.height : 0;
    const removes = region.getByRole('button', { name: /^remove$/i });
    const count = await removes.count();
    for (let i = 0; i < count; i += 1) {
      const btn = removes.nth(i);
      const box = await btn.boundingBox();
      if (!box || !startBox || box.y + box.height <= startBottom - 4) continue;
      if (endBox && box.y >= endBox.y) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ force: true, timeout: 15000 });
      return;
    }
    throw new Error('No Remove button found below the task section anchor');
  }

  async _resolveScheduleCreateFormTaskRemoveLayout(addTask) {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const addReminder = region.getByRole('button', { name: /add reminder/i }).first();
    const hasReminder = await addReminder.isVisible({ timeout: 1000 }).catch(() => false);

    let count = await this._countRemoveButtonsBefore(addTask);
    if (count > 0) {
      return { mode: 'before', addTask, end: null, after: null, count };
    }

    if (hasReminder) {
      count = await this._countRemoveButtonsBefore(addReminder, addTask);
      if (count > 0) {
        return { mode: 'between', addTask, end: addReminder, after: addTask, count };
      }
    }

    count = await this._countRemoveButtonsAfter(addTask, hasReminder ? addReminder : null);
    if (count > 0) {
      return { mode: 'after', addTask, end: hasReminder ? addReminder : null, after: addTask, count };
    }

    return { mode: 'none', addTask, end: hasReminder ? addReminder : null, after: addTask, count: 0 };
  }

  async _countTaskRemoveButtonsUsingLayout(layout) {
    if (layout.mode === 'before') return this._countRemoveButtonsBefore(layout.addTask);
    if (layout.mode === 'between') return this._countRemoveButtonsBefore(layout.end, layout.after);
    if (layout.mode === 'after') return this._countRemoveButtonsAfter(layout.after, layout.end);
    return 0;
  }

  async _clickFirstTaskRemoveButtonUsingLayout(layout) {
    if (layout.mode === 'before') {
      await this._clickFirstRemoveButtonBefore(layout.addTask);
      return;
    }
    if (layout.mode === 'between') {
      await this._clickFirstRemoveButtonBefore(layout.end, layout.after);
      return;
    }
    if (layout.mode === 'after') {
      await this._clickFirstRemoveButtonAfter(layout.after, layout.end);
      return;
    }
    throw new Error('No Remove button found for schedule task section');
  }

  _scheduleCreateFormAssigneeChipDeleteIcon(chip) {
    return chip
      .locator('[class*="MuiChip-deleteIcon"], svg.lucide-x')
      .first();
  }

  async removeAssigneeInEdit() {
    await this.hideFreshchatWidget();
    const region = await this._scheduleCreateFormLabeledFieldContainer(/^assignees?\b/i);
    await region.scrollIntoViewIfNeeded().catch(() => {});

    await expect(async () => {
      const chips = region.locator('.MuiChip-root');
      const count = await chips.count();
      if (count === 0) return;

      const chip = chips.first();
      const deleteIcon = this._scheduleCreateFormAssigneeChipDeleteIcon(chip);
      await expect(deleteIcon).toBeVisible({ timeout: 3000 });
      await chip.scrollIntoViewIfNeeded().catch(() => {});
      await deleteIcon.click({ force: true, timeout: 10000 });
      await expect(chips).toHaveCount(count - 1, { timeout: 5000 });
      expect(await chips.count()).toBe(0);
    }).toPass({ timeout: 60000, intervals: [300, 500, 1000] });

    const clear = region.locator('[aria-label*="Clear" i]').first();
    if (await clear.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clear.click({ force: true, timeout: 10000 });
    }
    await this.logStep('Removed assignee(s) on edit form');
  }

  async expectAssigneesEmptyInEdit() {
    const region = await this._scheduleCreateFormLabeledFieldContainer(/^assignees?\b/i);
    await expect(region.locator('.MuiChip-root')).toHaveCount(0, { timeout: 10000 });
    const placeholder = region
      .getByPlaceholder(/select assignee|select assignees?|select/i)
      .first();
    if (await placeholder.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(placeholder).toBeVisible();
    }
    await this.logStep('Assignees field is empty');
  }

  async clearDescriptionInEdit() {
    await this.hideFreshchatWidget();
    const field = await this._scheduleCreateFormDescriptionField();
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ force: true, timeout: 15000 });
    await field.fill('');
    await expect(field).toHaveValue('', { timeout: 10000 });
    await this.logStep('Cleared description on edit form');
  }

  async expectDescriptionEmptyInEdit() {
    const field = await this._scheduleCreateFormDescriptionField();
    await expect(field).toHaveValue('', { timeout: 10000 });
    await this.logStep('Description field is empty');
  }

  async clearPhaseInEdit() {
    await this.hideFreshchatWidget();
    const region = await this._scheduleCreateFormLabeledFieldContainer(/^phase\b/i);
    const clear = region.locator('[aria-label*="Clear" i], button[title="Clear"]').first();
    if (await clear.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clear.click({ force: true, timeout: 10000 });
    } else {
      const combo = region.getByRole('combobox').first();
      await combo.click({ force: true, timeout: 10000 });
      await combo.fill('');
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.logStep('Cleared phase on edit form');
  }

  async expectPhaseEmptyInEdit() {
    const region = await this._scheduleCreateFormLabeledFieldContainer(/^phase\b/i);
    const combo = region.getByRole('combobox').first();
    await expect(combo).toBeVisible({ timeout: 10000 });
    const value = ((await combo.inputValue().catch(() => '')) || '').trim();
    expect(value).toBe('');
    await this.logStep('Phase field is empty');
  }

  async removeFirstTaskInEdit() {
    await this.hideFreshchatWidget();
    await this.expandScheduleCreateFormAdditionalDetails();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(12);

    const addTask = await this._findScheduleCreateFormAddTaskButton();
    await addTask.scrollIntoViewIfNeeded().catch(() => {});
    await expect(addTask).toBeVisible({ timeout: 15000 });

    this._taskRemoveLayout = await this._resolveScheduleCreateFormTaskRemoveLayout(addTask);
    this._taskRemoveCountBefore = this._taskRemoveLayout.count;
    expect(this._taskRemoveCountBefore).toBeGreaterThan(0);
    await this._clickFirstTaskRemoveButtonUsingLayout(this._taskRemoveLayout);
    await this.logStep(`Removed first task on edit form (${this._taskRemoveLayout.mode})`);
  }

  async expectTaskRemovedInEdit() {
    const layout = this._taskRemoveLayout || (await this._resolveScheduleCreateFormTaskRemoveLayout(
      await this._findScheduleCreateFormAddTaskButton()
    ));
    const after = await this._countTaskRemoveButtonsUsingLayout(layout);
    expect(after).toBe(this._taskRemoveCountBefore - 1);
    await this.logStep('Task removed from edit form');
  }

  async _resolveScheduleCreateFormReminderRemoveLayout() {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const addTask = await this._findScheduleCreateFormAddTaskButton();
    const addReminder = region.getByRole('button', { name: /add reminder/i }).first();
    const hasReminder = await addReminder.isVisible({ timeout: 1000 }).catch(() => false);
    if (!hasReminder) {
      return { addTask, addReminder: null, count: 0 };
    }
    const count = await this._countRemoveButtonsBefore(addReminder, addTask);
    return { addTask, addReminder, count };
  }

  async removeAllTasksInEdit() {
    await this.hideFreshchatWidget();
    await this.expandScheduleCreateFormAdditionalDetails();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(12);

    await expect(async () => {
      const addTask = await this._findScheduleCreateFormAddTaskButton();
      await addTask.scrollIntoViewIfNeeded().catch(() => {});
      const layout = await this._resolveScheduleCreateFormTaskRemoveLayout(addTask);
      if (layout.count === 0) return;

      await this._clickFirstTaskRemoveButtonUsingLayout(layout);
      await expect(async () => {
        const remaining = (await this._resolveScheduleCreateFormTaskRemoveLayout(addTask)).count;
        expect(remaining).toBe(layout.count - 1);
      }).toPass({ timeout: 5000 });
      expect((await this._resolveScheduleCreateFormTaskRemoveLayout(addTask)).count).toBe(0);
    }).toPass({ timeout: 90000, intervals: [300, 500, 1000] });

    await this.logStep('Removed all tasks on edit form');
  }

  async expectAllTasksRemovedInEdit() {
    const addTask = await this._findScheduleCreateFormAddTaskButton();
    const layout = await this._resolveScheduleCreateFormTaskRemoveLayout(addTask);
    expect(layout.count).toBe(0);
    await this.logStep('All tasks removed from edit form');
  }

  async removeAllRemindersInEdit() {
    await this.hideFreshchatWidget();
    await this.expandScheduleCreateFormAdditionalDetails();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(12);

    await expect(async () => {
      const layout = await this._resolveScheduleCreateFormReminderRemoveLayout();
      if (layout.count === 0) return;

      await this._clickFirstRemoveButtonBefore(layout.addReminder, layout.addTask);
      await expect(async () => {
        const remaining = (await this._resolveScheduleCreateFormReminderRemoveLayout()).count;
        expect(remaining).toBe(layout.count - 1);
      }).toPass({ timeout: 5000 });
      expect((await this._resolveScheduleCreateFormReminderRemoveLayout()).count).toBe(0);
    }).toPass({ timeout: 90000, intervals: [300, 500, 1000] });

    await this.logStep('Removed all reminders on edit form');
  }

  async expectAllRemindersRemovedInEdit() {
    const layout = await this._resolveScheduleCreateFormReminderRemoveLayout();
    expect(layout.count).toBe(0);
    await this.logStep('All reminders removed from edit form');
  }

  async removeFirstReminderInEdit() {
    await this.expandScheduleCreateFormAdditionalDetails();
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const addTask = region.getByRole('button', { name: /^add task$/i }).first();
    const addReminder = region.getByRole('button', { name: /add reminder/i }).first();
    await expect(addReminder).toBeVisible({ timeout: 15000 });
    this._reminderRemoveCountBefore = await this._countRemoveButtonsBefore(addReminder, addTask);
    expect(this._reminderRemoveCountBefore).toBeGreaterThan(0);
    await this._clickFirstRemoveButtonBefore(addReminder, addTask);
    await this.logStep('Removed first reminder on edit form');
  }

  async expectReminderRemovedInEdit() {
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const addTask = region.getByRole('button', { name: /^add task$/i }).first();
    const addReminder = region.getByRole('button', { name: /add reminder/i }).first();
    const after = await this._countRemoveButtonsBefore(addReminder, addTask);
    expect(after).toBe(this._reminderRemoveCountBefore - 1);
    await this.logStep('Reminder removed from edit form');
  }

  async logStep(msg) {
    console.log(msg);
  }

  /** Milestones (TS-06+) use names like "milestone 1" / "MILESTONE UPDATE" — no end date, duration 0m. */
  _looksLikeMilestoneName(name) {
    return /\bmilestone\b/i.test(String(name || ''));
  }

  /** Left panel table in Gantt (scroll list + quick add footer). */
  ganttSidebar() {
    return this.page.locator('[data-pdf-export-schedule-list="true"]').first();
  }

  extractCalendarFragment(text) {
    const s = String(text || '').trim();
    if (!s || /^[-–—]$/.test(s)) return '';
    // "12 May 2026 10:00 AM" / localized month-day strings — compare date only, not time-of-day.
    const dmy = s.match(/(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
    if (dmy) return dmy[1].trim();
    const mdy = s.match(/([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/);
    if (mdy) return mdy[1].trim();
    const numeric = s.match(/\d{1,4}[\/.-]\d{1,2}[\/.-]\d{2,4}/);
    return numeric ? numeric[0] : s;
  }

  async _columnIndexByHeader(container, headerRe) {
    const th = container.locator('thead th, thead tr th, [role="columnheader"]');
    const n = await th.count();
    for (let i = 0; i < n; i += 1) {
      const text = ((await th.nth(i).innerText().catch(() => '')) || '').trim();
      if (headerRe.test(text)) return i;
    }
    return -1;
  }

  async _ganttSidebarStartEndKeys(name) {
    const row = this.ganttSidebarRow(name);
    const side = this.ganttSidebar();
    const cells = row.locator('td');
    let startIdx = await this._columnIndexByHeader(side, /start\s*date/i);
    if (startIdx < 0) startIdx = await this._columnIndexByHeader(side, /^start$/i);
    let endIdx = await this._columnIndexByHeader(side, /end\s*date/i);
    if (endIdx < 0) endIdx = await this._columnIndexByHeader(side, /^end$/i);
    const startText =
      startIdx >= 0
        ? await cells.nth(startIdx).innerText()
        : await cells.nth(1).innerText();
    const endText =
      endIdx >= 0 ? await cells.nth(endIdx).innerText() : await cells.nth(2).innerText();
    return {
      startKey: this.extractCalendarFragment(startText),
      endKey: this.extractCalendarFragment(endText),
    };
  }

  ganttSidebarRow(scheduleName) {
    const side = this.ganttSidebar();
    return side
      .locator('table.MuiTable-root tbody tr, table tbody tr, tbody tr, tr.schedule-list-row, tr')
      .filter({ hasText: scheduleName })
      .or(side.getByRole('row').filter({ hasText: scheduleName }))
      .last();
  }

  exactTextRegex(text) {
    const escaped = String(text || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`^\\s*${escaped}\\s*$`, 'i');
  }

  ganttSidebarExactRow(scheduleName) {
    const side = this.ganttSidebar();
    const exact = side.getByText(this.exactTextRegex(scheduleName)).first();
    return exact.locator('xpath=ancestor::tr[1]');
  }

  async findGanttSidebarRowByExactName(name) {
    await this.searchGanttSidebarScheduleIfAvailable(name);
    const exactRow = this.ganttSidebarExactRow(name);
    if (await exactRow.isVisible({ timeout: 1500 }).catch(() => false)) {
      return exactRow;
    }

    for (const ratio of [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]) {
      await this.scrollGanttSidebarListToRatio(ratio);
      if (await exactRow.isVisible({ timeout: 1500 }).catch(() => false)) {
        await exactRow.scrollIntoViewIfNeeded().catch(() => {});
        await this.logStep(`Found exact schedule in Gantt sidebar: ${name}`);
        return exactRow;
      }
    }

    throw new Error(`Could not find exact schedule "${name}" in the Gantt sidebar list`);
  }

  async scrollGanttSidebarListToBottom() {
    const side = this.ganttSidebar();
    await expect(side).toBeVisible({ timeout: this.defaultTimeout });
    await side.evaluate((root) => {
      const candidates = [root, ...root.querySelectorAll('*')];
      const scrollable = candidates.find((el) => el.scrollHeight > el.clientHeight + 5);
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await this.page.mouse.wheel(0, 1200).catch(() => {});
  }

  async scrollGanttSidebarListToRatio(ratio) {
    const side = this.ganttSidebar();
    await expect(side).toBeVisible({ timeout: this.defaultTimeout });
    await side.evaluate((root, value) => {
      const candidates = [root, ...root.querySelectorAll('*')];
      const scrollable = candidates.find((el) => el.scrollHeight > el.clientHeight + 5);
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight * value;
    }, ratio);
  }

  async isScheduleVisibleInGanttSidebarList(name) {
    if (await this.ganttSidebarRow(name).isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }

    for (const ratio of [1, 0.85, 0.7, 0.5, 0.3, 0.15, 0]) {
      await this.scrollGanttSidebarListToRatio(ratio);
      if (await this.ganttSidebarRow(name).isVisible({ timeout: 1500 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  ganttTimelineHost() {
    return this.page.locator('[data-pdf-export-scroll-root="true"]').first();
  }

  /** Row in List tab only — excludes Gantt left sidebar (`data-pdf-export-schedule-list`), which also shows schedule names. */
  listTabRow(scheduleName) {
    return this.page
      .locator('tbody tr, [role="row"]')
      .filter({ hasText: scheduleName })
      .filter({ hasNot: this.page.locator('[data-pdf-export-schedule-list="true"]') })
      .last();
  }

  listTabExactRow(scheduleName) {
    const exactText = this.page.getByText(this.exactTextRegex(scheduleName));
    return this.page
      .locator('tbody tr, [role="row"], .MuiDataGrid-row, .MuiTableRow-root, [class*="DataGrid-row"]')
      .filter({ has: exactText })
      .filter({ hasNot: this.page.locator('[data-pdf-export-schedule-list="true"]') })
      .first();
  }

  async markVisibleListTabRowByRenderedText(scheduleName) {
    const marker = `codex-list-row-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const found = await this.page
      .evaluate(
        ({ name, attr }) => {
          const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const target = normalize(name);
          const isTargetMatch = (text) => {
            if (text === target) return true;
            if (!target.includes(' ')) return false;
            return text.startsWith(`${target} `);
          };
          document.querySelectorAll('[data-codex-list-row-match]').forEach((el) => {
            el.removeAttribute('data-codex-list-row-match');
          });

          const rows = [
            ...document.querySelectorAll(
              'tbody tr, [role="row"], .MuiDataGrid-row, .MuiTableRow-root, [class*="DataGrid-row"]'
            ),
          ].filter((row) => {
            if (row.closest('[data-pdf-export-schedule-list="true"]')) return false;
            const box = row.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0;
          });

          for (const row of rows) {
            const cells = [...row.querySelectorAll('td, [role="gridcell"], [role="cell"]')];
            const texts = (cells.length ? cells : [row])
              .map((el) => normalize(el.innerText || el.textContent))
              .filter(Boolean);
            const firstLine = normalize((row.innerText || row.textContent || '').split(/\r?\n/)[0]);
            if (texts.some((text) => isTargetMatch(text)) || isTargetMatch(firstLine)) {
              row.setAttribute('data-codex-list-row-match', attr);
              return true;
            }
          }
          return false;
        },
        { name: scheduleName, attr: marker }
      )
      .catch(() => false);

    if (!found) return null;
    const row = this.page.locator(`[data-codex-list-row-match="${marker}"]`).first();
    await row.scrollIntoViewIfNeeded().catch(() => {});
    return row;
  }

  async clickGanttSidebarAddSchedule() {
    const panel = this.ganttSidebar();
    await expect(panel.getByRole('button', { name: /add schedule/i })).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await panel.getByRole('button', { name: /add schedule/i }).click();
  }

  async expectQuickAddScheduleFieldVisible() {
    const panel = this.ganttSidebar();
    await expect(panel.getByPlaceholder(/enter schedule name/i)).toBeVisible({ timeout: 20000 });
  }

  async fillGanttSidebarQuickAddName(name) {
    const panel = this.ganttSidebar();
    await expect(panel.getByPlaceholder(/enter schedule name/i)).toBeVisible({ timeout: 20000 });
    await panel.getByPlaceholder(/enter schedule name/i).fill(name);
  }

  async confirmGanttSidebarQuickAddWithTick() {
    const input = this.page.locator('input[placeholder*="Enter schedule name" i]').first();
    await expect(input).toBeVisible({ timeout: 20000 });
    const quickRowTable = this.page.locator('table').filter({ has: input });
    await expect(quickRowTable).toHaveCount(1);
    await quickRowTable.locator('.MuiIconButton-root').first().click();
    await expect(input).toBeHidden({ timeout: 60000 }).catch(async () => {
      await input.waitFor({ state: 'detached', timeout: 60000 });
    });
  }

  async expectScheduleInGanttSidebarList(name) {
    await expect(async () => {
      await this.scrollGanttSidebarListToBottom();
      let visible = await this.isScheduleVisibleInGanttSidebarList(name);
      if (!visible) {
        const side = this.ganttSidebar();
        const expandBtns = side.locator(
          'button[aria-label*="expand" i], .MuiIconButton-root, [data-testid*="expand"], td svg, button svg'
        );
        const count = await expandBtns.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
          const btn = expandBtns.nth(i);
          if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
            await btn.click({ force: true, timeout: 3000 }).catch(() => {});
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        await this.scrollGanttSidebarListToBottom();
        visible = await this.isScheduleVisibleInGanttSidebarList(name);
      }
      expect(visible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2500, 5000] });
  }

  /** Same calendar fragment for start/end (time may differ; org date format may vary). */
  async expectGanttSidebarScheduleStartSameEndCalendar(name) {
    const row = this.ganttSidebarRow(name);
    await expect(row).toBeVisible({ timeout: 30000 });
    await expect(async () => {
      const { startKey, endKey } = await this._ganttSidebarStartEndKeys(name);
      if (this._looksLikeMilestoneName(name)) {
        expect(startKey).toBeTruthy();
        if (endKey) expect(startKey).toStrictEqual(endKey);
        return;
      }
      expect(startKey).toStrictEqual(endKey);
    }).toPass({ timeout: 30000, intervals: [800, 2000, 4000] });
  }

  async expectGanttSidebarScheduleCompletionPercent(name, expectedPct) {
    const row = this.ganttSidebarRow(name);
    const pctCell = row.locator('td').nth(3);
    await expect(pctCell.getByText(new RegExp(`^${Number(expectedPct)}\\s*%$`))).toBeVisible({
      timeout: 60000,
    });
  }

  async expectScheduleNameVisibleInGanttTimeline(name) {
    const tl = this.ganttTimelineHost();
    await expect(tl.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 60000 });
  }

  async expectListTabScheduleStartEndCreatedOnSameCalendar(name) {
    const row = this.listTabRow(name);
    await expect(row).toBeVisible({ timeout: 60000 });
    const cells = row.locator('td, [role="gridcell"]');
    const startText = await cells.nth(2).innerText();
    const endText = await cells.nth(4).innerText();
    const createdText = await cells.nth(9).innerText();
    const startKey = this.extractCalendarFragment(startText);
    const endKey = this.extractCalendarFragment(endText);
    const createdKey = this.extractCalendarFragment(createdText);

    if (this._looksLikeMilestoneName(name)) {
      expect(startKey).toBeTruthy();
      expect(startKey).toStrictEqual(createdKey);
      if (endKey) expect(startKey).toStrictEqual(endKey);
      await this.logStep(`Milestone list dates aligned (${name}): start=${startKey}, end=${endKey || 'empty'}`);
      return;
    }

    expect(startKey).toStrictEqual(endKey);
    expect(startKey).toStrictEqual(createdKey);
  }

  /** Schedules: “1d”. Milestones: always “0m” (no end date). */
  async expectListTabScheduleDurationIndicatesOneWorkingDay(name) {
    const row = this.listTabRow(name);
    const dur = ((await row.locator('td, [role="gridcell"]').nth(3).innerText()) || '').trim();
    if (this._looksLikeMilestoneName(name)) {
      expect(dur).toMatch(/\b0\s*m\b/i);
      await this.logStep(`Milestone duration is 0m (${name})`);
      return;
    }
    expect(dur).toMatch(/\b1\s*d\b/i);
    await this.logStep(`Schedule duration is 1d (${name})`);
  }

  async expectListTabScheduleCompletionShows(name, expectedPct) {
    const row = this.listTabRow(name);
    const cell = row.locator('td, [role="gridcell"]').nth(5);
    await expect(cell.getByText(new RegExp(`${Number(expectedPct)}%`))).toBeVisible({
      timeout: 60000,
    });
  }

  async expectListTabAssignToShowsUnassigned(name) {
    const row = this.listTabRow(name);
    const assignCell = row.locator('td, [role="gridcell"]').nth(6);
    await expect(assignCell.getByText(/unassigned/i)).toBeVisible({ timeout: 60000 });
  }

  /**
   * Add Schedule drawer from Create toolbar: confirm by heading (offcanvas may not use `.show` in time).
   */
  async expectAddScheduleOffCanvasOpen() {
    const heading = this.addSchedulePanelHeading();
    const panel = this.formPanel();
    await expect(async () => {
      const hv = await heading.isVisible({ timeout: 3000 }).catch(() => false);
      const pv = await panel.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hv || pv).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1500, 3000] });
  }

  /** Strings suitable for typing into MUI localized DateTime text fields (en-US style). */
  formatUsTypedDateTime(d) {
    return d
      .toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(/\u202f/g, ' ')
      .replace(/,/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * @param {number} daysMin earliest offset from today (inclusive)
   * @param {number} daysMax latest offset from today (inclusive)
   */
  randomWeekdayDateTimeBetween(daysMin, daysMax) {
    const d = new Date();
    const span = Math.max(1, daysMax - daysMin + 1);
    d.setDate(d.getDate() + daysMin + Math.floor(Math.random() * span));
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    const h = 9 + Math.floor(Math.random() * 8); // 9 … 16
    const mins = [0, 15, 30, 45];
    const m = mins[Math.floor(Math.random() * mins.length)];
    d.setHours(h, m, 0, 0);
    return d;
  }

  /** End on the same calendar day as start, later time (keeps picker day enabled in current month). */
  randomEndWeekdayAfterStart(start) {
    const end = new Date(start);
    const h = Math.min(16, start.getHours() + 1 + Math.floor(Math.random() * 3));
    const mins = [0, 15, 30, 45].filter((m) => m > start.getMinutes() || h > start.getHours());
    const m = mins.length ? mins[Math.floor(Math.random() * mins.length)] : 45;
    end.setHours(h, m, 0, 0);
    if (end.getTime() <= start.getTime()) {
      end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);
    }
    if (end.getTime() <= start.getTime()) {
      end.setHours(17, 0, 0, 0);
    }
    while (end.getDay() === 0 || end.getDay() === 6) {
      end.setDate(end.getDate() + 1);
    }
    return end;
  }

  nextWeekdayMorningAfter(start) {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    while (end.getDay() === 0 || end.getDay() === 6) {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(10, 0, 0, 0);
    return end;
  }

  weekdayDateAfter(start, daysToAdd, hour, minute = 0) {
    const end = new Date(start);
    end.setDate(end.getDate() + daysToAdd);
    while (end.getDay() === 0 || end.getDay() === 6) {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(hour, minute, 0, 0);
    return end;
  }

  endDateTimeCandidatesAfterStart(start) {
    const sameDayLate = new Date(start);
    sameDayLate.setHours(Math.min(17, start.getHours() + 4), start.getMinutes(), 0, 0);

    return [
      this.randomEndWeekdayAfterStart(start),
      sameDayLate,
      this.weekdayDateAfter(start, 1, 10),
      this.weekdayDateAfter(start, 1, 15),
      this.weekdayDateAfter(start, 2, 10),
      this.weekdayDateAfter(start, 3, 15),
      this.weekdayDateAfter(start, 5, 10),
    ].filter((candidate) => candidate.getTime() > start.getTime());
  }

  async selectScheduleFormPriority(highMediumOrLowRegex) {
    await this._selectScheduleFormLabeledDropdownOption(/^priority\b/i, highMediumOrLowRegex);
  }

  async selectScheduleFormStatus(statusRegex) {
    await this._selectScheduleFormLabeledDropdownOption(/^status\b/i, statusRegex);
  }

  /** Completion % textbox on Add Schedule form (placeholder accessible name "Ex: 25"). */
  _scheduleCreateFormCompletionInput() {
    const panel = this.formPanel();
    return panel
      .getByRole('textbox', { name: /ex:\s*25/i })
      .or(panel.getByLabel(/completion|percent|%/i))
      .or(panel.locator('input[type="number"]'))
      .first();
  }

  async expectScheduleCreateFormCompletionPercent(expectedPct) {
    const pctStr = String(Number(expectedPct));
    const completionInput = this._scheduleCreateFormCompletionInput();
    await expect(completionInput).toBeVisible({ timeout: 20000 });
    await expect(completionInput).toHaveValue(pctStr, { timeout: 20000 });
  }

  _scheduleCreateFormDurationField() {
    const panel = this.formPanel();
    return panel
      .getByLabel(/^duration\b/i)
      .or(panel.getByPlaceholder(/duration/i))
      .or(panel.locator('input[name*="duration" i], textarea[name*="duration" i]'))
      .or(
        panel.locator(
          'xpath=.//*[self::label or self::p or self::span][contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "duration")]/following::*[self::input or self::textarea][1]'
        )
      )
      .first();
  }

  async _scheduleCreateFormDurationText() {
    const panel = this.formPanel();
    const field = this._scheduleCreateFormDurationField();
    if (await field.isVisible({ timeout: 1500 }).catch(() => false)) {
      const value = await field.inputValue().catch(() => '');
      if (value.trim()) return value.trim();
      const text = await field.innerText().catch(() => '');
      if (text.trim()) return text.trim();
    }

    const valueText = panel
      .locator(
        'xpath=.//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "duration")]/following::*[contains(normalize-space(.), "m") or contains(normalize-space(.), "h") or contains(normalize-space(.), "d")][1]'
      )
      .first();
    return ((await valueText.innerText({ timeout: 1500 }).catch(() => '')) || '').trim();
  }

  _hasNonZeroDuration(durationText) {
    const text = String(durationText || '').trim();
    if (!text) return false;
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');

    if (/^0+$/.test(normalized)) return false;
    if (/^0\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes)$/.test(normalized)) {
      return false;
    }

    const unitValues = [
      ...normalized.matchAll(/(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/g),
    ];
    if (unitValues.length > 0) {
      return unitValues.some((match) => Number(match[1]) > 0);
    }

    const numbers = normalized.match(/\d+/g);
    if (numbers) return numbers.some((value) => Number(value) > 0);
    return !/\bzero\b/.test(normalized);
  }

  async waitForScheduleCreateFormDurationNotZero(timeout = 20000) {
    await expect(async () => {
      const durationText = await this._scheduleCreateFormDurationText();
      expect(durationText, 'schedule create form duration should be visible').not.toEqual('');
      expect(this._hasNonZeroDuration(durationText), `schedule create form duration stayed at "${durationText}"`).toBeTruthy();
    }).toPass({ timeout, intervals: [500, 1000, 2000] });
  }

  /**
   * Click Completion % and enter a random value in range (inclusive). Logs the value for headed runs.
   * @returns {number} entered percent
   */
  async fillRandomCompletionPercentOnScheduleCreateForm(min = 0, max = 100) {
    const lo = Math.min(Number(min), Number(max));
    const hi = Math.max(Number(min), Number(max));
    const pct = lo + Math.floor(Math.random() * (hi - lo + 1));
    const input = this._scheduleCreateFormCompletionInput();
    await expect(input).toBeVisible({ timeout: 20000 });
    await this.hideFreshchatWidget();
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ force: true, timeout: 15000 });
    await input.fill(String(pct));
    await expect(input).toHaveValue(String(pct), { timeout: 10000 });
    await this.logStep(`Entered Completion %: ${pct}`);
    return pct;
  }

  async _scheduleCreateFormScheduleColorTrigger() {
    const panel = this.formPanel();
    let trigger = panel.getByLabel(/schedule color|color swatch/i).first();
    if (await trigger.isVisible({ timeout: 2500 }).catch(() => false)) return trigger;

    const lbl = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span')
      .filter({ hasText: /^schedule color\b/i })
      .first();
    if (await lbl.isVisible({ timeout: 5000 }).catch(() => false)) {
      const row = lbl.locator('xpath=ancestor::*[contains(@class,"row") or contains(@class,"Row")][1]');
      trigger = row
        .locator('button, input[type="color"], .MuiColorInput-Button, [class*="ColorInput"]')
        .first();
      if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) return trigger;
      trigger = lbl.locator('xpath=following::button[1] | following::input[@type="color"][1]').first();
      if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) return trigger;
    }

    trigger = panel
      .locator('button[aria-label*="color" i], .MuiColorInput-Button, input[type="color"]')
      .first();
    await expect(trigger).toBeVisible({ timeout: 20000 });
    return trigger;
  }

  async _scrollScheduleColorSectionIntoView() {
    const panel = this.formPanel();
    const lbl = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span')
      .filter({ hasText: /schedule\s*color|hex\s*color/i })
      .first();
    if (await lbl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lbl.scrollIntoViewIfNeeded().catch(() => {});
    }
  }

  /** Set a random schedule colour via the Hex Color Code field (same control as TC-08). */
  async pickRandomScheduleColorOnScheduleCreateForm() {
    await this._dismissOpenMenusIfAny();
    const hex = await this.fillRandomHexColorCodeOnScheduleCreateForm();
    await this.logStep(`Selected Schedule Color: ${hex}`);
  }

  _randomHexColorCode() {
    const byte = () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    return `#${byte()}${byte()}${byte()}`;
  }

  async _scheduleCreateFormHexColorInput({ openPicker = false } = {}) {
    const panel = this.formPanel();
    const findVisible = async (locator) => {
      if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) return locator;
      return null;
    };

    const candidates = [
      panel.getByLabel(/hex\s*color\s*code/i).first(),
      panel.getByRole('textbox', { name: /hex\s*color\s*code/i }).first(),
      panel.getByPlaceholder(/hex\s*color\s*code|enter\s*hex|^#/i).first(),
      panel.locator('input[name*="hex" i], input[id*="hex" i]').first(),
      panel.locator('.MuiColorInput-Input, input.MuiColorInput-Input').first(),
      panel.locator('[class*="ColorInput"] input[type="text"]').first(),
      panel
        .locator('label, .fw-500, .MuiFormLabel-root, p, span')
        .filter({ hasText: /hex\s*color\s*code/i })
        .first()
        .locator('xpath=following::input[1]'),
      this.page.getByLabel(/hex\s*color\s*code/i).first(),
      this.page.getByPlaceholder(/hex\s*color\s*code|enter\s*hex|^#/i).first(),
    ];

    for (const loc of candidates) {
      const hit = await findVisible(loc);
      if (hit) return hit;
    }

    if (openPicker) {
      const trigger = await this._scheduleCreateFormScheduleColorTrigger();
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await trigger.click({ force: true, timeout: 15000 });

      let opened = null;
      await expect(async () => {
        for (const loc of candidates) {
          const hit = await findVisible(loc);
          if (hit) {
            opened = hit;
            return;
          }
        }
        const chrome = this.page.locator('.chrome-picker, [class*="chrome-picker"]').filter({ visible: true }).last();
        if (await chrome.isVisible({ timeout: 800 }).catch(() => false)) {
          opened = chrome.locator('input').first();
          return;
        }
        expect(opened).toBeTruthy();
      }).toPass({ timeout: 10000, intervals: [300, 800, 1500] });
      if (opened) return opened;
    }

    throw new Error('Could not find Hex Color Code input on the schedule create form.');
  }

  /**
   * Focus Schedule Color area and type a random hex code into the Hex Color Code input.
   * @returns {string} entered hex value
   */
  async fillRandomHexColorCodeOnScheduleCreateForm() {
    await this.hideFreshchatWidget();
    await this._dismissOpenMenusIfAny();
    await this._scrollScheduleColorSectionIntoView();
    const hex = this._randomHexColorCode();
    const hexInput = await this._scheduleCreateFormHexColorInput({ openPicker: true });
    await expect(hexInput).toBeVisible({ timeout: 20000 });
    await hexInput.scrollIntoViewIfNeeded().catch(() => {});
    await hexInput.click({ force: true, timeout: 15000 });
    await hexInput.fill('');
    await hexInput.fill(hex);
    await hexInput.press('Enter').catch(() => {});

    await expect(async () => {
      const val = ((await hexInput.inputValue().catch(() => '')) || '').trim().toUpperCase();
      const normalized = val.startsWith('#') ? val : `#${val}`;
      expect(normalized.replace(/[^#0-9A-F]/gi, '')).toBe(hex);
    })
      .toPass({ timeout: 8000, intervals: [200, 500, 1000] })
      .catch(async () => {
        await hexInput.fill(hex.replace(/^#/, ''));
        await hexInput.press('Enter').catch(() => {});
      });

    await this.logStep(`Entered Hex Color Code: ${hex}`);
    await this.page.keyboard.press('Escape').catch(() => {});
    return hex;
  }

  async _scheduleCreateFormDescriptionField() {
    const panel = this.formPanel();
    const label = panel
      .locator('label, .MuiFormLabel-root, p, span')
      .filter({ hasText: /^description\b/i })
      .first();
    if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
      await label.scrollIntoViewIfNeeded().catch(() => {});
    } else {
      await this._scrollScheduleCreateFormToBottom().catch(() => {});
    }

    let field = panel
      .getByLabel(/description/i)
      .or(panel.getByRole('textbox', { name: /description/i }))
      .or(panel.locator('textarea[placeholder*="Description" i]'))
      .or(panel.locator('textarea[name*="description" i], textarea[id*="description" i]'))
      .or(
        panel.locator(
          'xpath=.//*[self::label or self::p or self::span][contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "description")]/following::*[self::textarea or self::input][1]'
        )
      )
      .first();

    if (!(await field.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this._scrollScheduleCreateFormToBottom().catch(() => {});
      field = panel
        .locator('textarea[placeholder*="Description" i], textarea[name*="description" i], textarea[id*="description" i], textarea')
        .last();
    }

    await expect(field).toBeVisible({ timeout: 20000 });
    return field;
  }

  /** Enter a random description on the Add Schedule form and log it for headed runs. */
  async fillRandomDescriptionOnScheduleCreateForm() {
    const text = `Schedule description ${this.randomSuffix()}`;
    await this.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._dismissOpenMenusIfAny();
    const field = await this._scheduleCreateFormDescriptionField();
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ force: true, timeout: 15000 }).catch(async () => {
      await this._scrollScheduleCreateFormToBottom().catch(() => {});
      await field.click({ force: true, timeout: 15000 });
    });
    await field.fill('').catch(() => {});
    await field.fill(text).catch(async () => {
      await field.evaluate((node, value) => {
        node.focus();
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }, text);
    });
    await expect(field).toHaveValue(text, { timeout: 10000 });
    await this.logStep(`Entered Description: ${text}`);
    return text;
  }

  /** Close assignee/status/priority menus so date pickers can open on the off-canvas. */
  async _prepareCreateFormForDateEntry() {
    await this.hideFreshchatWidget();
    await this._dismissOpenMenusIfAny();
  }

  async _selectScheduleFormLabeledDropdownOption(fieldLabelRegex, optionRegex, scope) {
    const panel = scope || this.formPanel();
    const useLast = Boolean(scope);
    const nameRe = optionRegex instanceof RegExp ? optionRegex : new RegExp(String(optionRegex), 'i');
    let src = nameRe.source;
    if (src.startsWith('^')) src = src.slice(1);
    if (src.endsWith('$')) src = src.slice(0, -1);
    const looseRe = new RegExp(src, nameRe.ignoreCase ? 'i' : '');

    const radio = panel.getByRole('radio', { name: looseRe });
    if (await radio.first().isVisible({ timeout: 2500 }).catch(() => false)) {
      await radio.first().click();
      return;
    }

    const labeledSelect = useLast
      ? panel.getByLabel(fieldLabelRegex).last()
      : panel.getByLabel(fieldLabelRegex).first();
    if (await labeledSelect.isVisible({ timeout: 1500 }).catch(() => false)) {
      const isSelect = await labeledSelect.evaluate((el) => el.tagName === 'SELECT').catch(() => false);
      if (isSelect) {
        await labeledSelect.selectOption({ label: looseRe });
        return;
      }
    }

    let combo = useLast
      ? panel.getByRole('combobox', { name: fieldLabelRegex }).last()
      : panel.getByRole('combobox', { name: fieldLabelRegex }).first();
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = useLast
        ? panel.getByLabel(fieldLabelRegex).last()
        : panel.getByLabel(fieldLabelRegex).first();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      const lblBase = panel
        .locator('label, .fw-500, .MuiFormLabel-root, p, span')
        .filter({ hasText: fieldLabelRegex });
      const lbl = useLast ? lblBase.last() : lblBase.first();
      await expect(lbl).toBeVisible({ timeout: 15000 });
      const fromLabel = lbl.locator('xpath=following::*[@role="combobox"][1]');
      if (await fromLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        combo = fromLabel;
      } else {
        const legacyCombo = lbl.locator('..').locator('[role="combobox"]').first();
        await expect(legacyCombo).toBeVisible({ timeout: 10000 });
        combo = legacyCombo;
      }
    }

    await expect(combo).toBeVisible({ timeout: 20000 });
    await this.hideFreshchatWidget();
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: 30000 });
    const listbox = this.page.getByRole('listbox').last();
    const menu = this.page.getByRole('menu').last();
    await listbox.waitFor({ state: 'visible', timeout: 8000 }).catch(async () => {
      await menu.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    });
    const portal = this.page.locator('.MuiPopover-root:visible, .MuiModal-root:visible').last();

    let option = listbox
      .locator('[role="option"], .MuiMenuItem-root, li')
      .filter({ hasText: looseRe })
      .first();
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      option = menu
        .getByRole('menuitem', { name: looseRe })
        .or(menu.locator('.MuiMenuItem-root, [role="menuitem"]').filter({ hasText: looseRe }))
        .first();
    }
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = portal
        .locator('[role="option"], .MuiMenuItem-root')
        .filter({ hasText: looseRe })
        .first();
    }
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = this.page
        .getByRole('option', { name: nameRe })
        .or(this.page.getByRole('option', { name: looseRe }))
        .or(this.page.getByRole('menuitem', { name: looseRe }))
        .or(this.page.locator('[role="option"], .MuiMenuItem-root').filter({ hasText: looseRe }))
        .first();
    }

    await expect(option).toBeVisible({ timeout: 20000 });
    await option.click();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.getByRole('listbox').last().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.getByRole('menu').last().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /** MUI X DateTimePicker popper / layout (portal). */
  _scheduleDatePickerPopper() {
    return this.page
      .locator('.MuiPickersPopper-root, .MuiPickersLayout-root')
      .filter({ visible: true })
      .last();
  }

  /**
   * Opens MUI DateTimePicker for Start or End on Add Schedule form (input is often disabled; use "Choose date").
   * Matches Playwright codegen: span near "Start Date" + getByLabel('Choose date'), or ordinal Choose date buttons.
   */
  async _openCreateFormDateTimePicker(panel, kind) {
    await this._prepareCreateFormForDateEntry();
    const isStart = kind === 'start';
    if (isStart) {
      const spanChoose = panel
        .locator('span')
        .filter({ hasText: /start date/i })
        .getByLabel('Choose date')
        .first();
      if (await spanChoose.isVisible({ timeout: 3000 }).catch(() => false)) {
        await spanChoose.click({ force: true, timeout: 15000 });
        await expect(this._scheduleDatePickerPopper()).toBeVisible({ timeout: 15000 });
        return;
      }
    }
    const startInput = panel.getByLabel(/start date/i);
    const endInput = panel.getByLabel(/end date/i);
    const input = isStart ? startInput : endInput;
    await expect(input).toBeVisible({ timeout: 15000 });
    const formControl = input.locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]').first();
    const adornment = formControl
      .getByLabel('Choose date', { exact: true })
      .or(formControl.locator('button[aria-label*="Choose" i]'))
      .or(formControl.locator('.MuiInputAdornment-root button').first())
      .first();
    if (await adornment.isVisible({ timeout: 4000 }).catch(() => false)) {
      await adornment.click({ force: true, timeout: 15000 });
      await expect(this._scheduleDatePickerPopper()).toBeVisible({ timeout: 15000 });
      return;
    }
    const idx = isStart ? 0 : 1;
    const byOrder = panel.getByRole('button', { name: 'Choose date', exact: true }).nth(idx);
    await expect(byOrder).toBeVisible({ timeout: 15000 });
    await byOrder.click({ force: true, timeout: 15000 });
    await expect(this._scheduleDatePickerPopper()).toBeVisible({ timeout: 15000 });
  }

  async _muiClickNextMonth(popper) {
    const named = popper.getByRole('button', { name: /next month|go to next month/i }).first();
    if (await named.isVisible({ timeout: 800 }).catch(() => false)) {
      await named.click();
      return;
    }
    const iconBtn = popper
      .locator('.MuiPickersArrowSwitcher-nextIconButton, button[aria-label*="Next" i]')
      .first();
    await iconBtn.click({ timeout: 5000 });
  }

  async _muiClickPrevMonth(popper) {
    const named = popper.getByRole('button', { name: /previous month|go to previous month/i }).first();
    if (await named.isVisible({ timeout: 800 }).catch(() => false)) {
      await named.click();
      return;
    }
    const iconBtn = popper
      .locator('.MuiPickersArrowSwitcher-previousIconButton, button[aria-label*="Previous" i]')
      .first();
    await iconBtn.click({ timeout: 5000 });
  }

  async _muiNavigatePopperToMonthYear(popper, targetDate) {
    const wantY = targetDate.getFullYear();
    const wantM = targetDate.getMonth();
    for (let step = 0; step < 28; step += 1) {
      const label = (await popper.locator('.MuiPickersCalendarHeader-label').first().innerText().catch(() => '')).trim();
      const m = label.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
      );
      if (!m) {
        await this._muiClickNextMonth(popper);
        continue;
      }
      const cur = new Date(Date.parse(`${m[1]} 1, ${m[2]}`));
      if (Number.isNaN(cur.getTime())) {
        await this._muiClickNextMonth(popper);
        continue;
      }
      if (cur.getFullYear() === wantY && cur.getMonth() === wantM) return;
      const wantTs = new Date(wantY, wantM, 1).getTime();
      const curTs = new Date(cur.getFullYear(), cur.getMonth(), 1).getTime();
      if (curTs < wantTs) await this._muiClickNextMonth(popper);
      else await this._muiClickPrevMonth(popper);
    }
  }

  async _muiPickDayInPopper(popper, targetDate) {
    const dayNum = targetDate.getDate();
    const dayRe = new RegExp(`^\\s*${dayNum}\\s*$`);
    const inMonth = popper
      .locator(
        'button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled):not([aria-disabled="true"])'
      )
      .filter({ hasText: dayRe })
      .first();
    if (await inMonth.isVisible({ timeout: 6000 }).catch(() => false)) {
      await inMonth.scrollIntoViewIfNeeded();
      await inMonth.click();
      return;
    }
    throw new Error(
      `Could not pick enabled day ${dayNum} in calendar for ${targetDate.toDateString()}`
    );
  }

  /** Pick target day when enabled; otherwise next enabled weekday in the popper. */
  async _muiPickDayInPopperWithFallback(popper, targetDate) {
    const candidates = [new Date(targetDate)];
    let cursor = new Date(targetDate);
    for (let i = 0; i < 12; i += 1) {
      cursor.setDate(cursor.getDate() + 1);
      while (cursor.getDay() === 0 || cursor.getDay() === 6) {
        cursor.setDate(cursor.getDate() + 1);
      }
      candidates.push(new Date(cursor));
    }

    for (const dt of candidates) {
      await this._muiNavigatePopperToMonthYear(popper, dt);
      const dayNum = dt.getDate();
      const dayRe = new RegExp(`^\\s*${dayNum}\\s*$`);
      const inMonth = popper
        .locator(
          'button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled):not([aria-disabled="true"])'
        )
        .filter({ hasText: dayRe })
        .first();
      if (await inMonth.isVisible({ timeout: 2000 }).catch(() => false)) {
        const clicked = await inMonth
          .click({ force: true, timeout: 8000 })
          .then(() => true)
          .catch(async () => {
            const freshDay = this
              ._scheduleDatePickerPopper()
              .locator(
                'button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled):not([aria-disabled="true"])'
              )
              .filter({ hasText: dayRe })
              .first();
            if (!(await freshDay.isVisible({ timeout: 3000 }).catch(() => false))) return false;
            await freshDay.click({ force: true, timeout: 8000 });
            return true;
          });
        if (clicked) return dt;
      }
    }

    const anyEnabled = popper
      .locator(
        'button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled):not([aria-disabled="true"])'
      )
      .first();
    await expect(anyEnabled).toBeVisible({ timeout: 6000 });
    await anyEnabled.click();
    return targetDate;
  }

  /**
   * MUI MultiSectionDigitalClock: options are `li[role="option"]` inside `ul[role="listbox"]`.
   * Some values are disabled until meridiem is set — pick meridiem → hours → minutes.
   * Scroll the list when the preferred value is off-screen or disabled.
   */
  async _scrollWithinDigitalClockListbox(listbox, deltaY) {
    const inner = listbox.locator('.MuiMultiSectionDigitalClock-root, .MuiList-root').first();
    const target = (await inner.isVisible().catch(() => false)) ? inner : listbox;
    await target.hover({ timeout: 4000 }).catch(() => {});
    await this.page.mouse.wheel(0, deltaY);
  }

  async _pickDigitalClockSection(popper, listboxName, preferredValue, kind) {
    const lb = popper.getByRole('listbox', { name: listboxName });
    if (!(await lb.isVisible({ timeout: 5000 }).catch(() => false))) return;

    await lb.click({ timeout: 5000 }).catch(() => {});
    const preferredStr = String(preferredValue);

    const matches = (text, aria) => {
      const a = aria || '';
      const t = text || '';
      if (kind === 'mer') {
        return new RegExp(`^\\s*${preferredStr}\\s*$`, 'i').test(t) || new RegExp(`\\b${preferredStr}\\b`, 'i').test(a);
      }
      if (kind === 'hour') {
        return (
          new RegExp(`^\\s*${preferredStr}\\s*$`).test(t) ||
          new RegExp(`^${preferredStr}\\s+hours?`, 'i').test(a) ||
          new RegExp(`^${preferredStr}\\b`, 'i').test(a)
        );
      }
      const mn = parseInt(preferredStr, 10);
      return (
        new RegExp(`^\\s*${preferredStr}\\s*$`).test(t) ||
        new RegExp(`^\\s*${mn}\\s*$`).test(t) ||
        new RegExp(`${preferredStr}`, 'i').test(a)
      );
    };

    for (let scroll = 0; scroll < 12; scroll += 1) {
      const enabled = lb.locator('[role="option"]:not(.Mui-disabled):not([aria-disabled="true"])');
      const count = await enabled.count();
      for (let i = 0; i < count; i += 1) {
        const o = enabled.nth(i);
        const text = ((await o.innerText()) || '').trim();
        const aria = (await o.getAttribute('aria-label')) || '';
        if (matches(text, aria)) {
          await o.scrollIntoViewIfNeeded();
          await o.click({ timeout: 10000, force: true });
          return;
        }
      }
      await this._scrollWithinDigitalClockListbox(lb, scroll % 3 === 0 ? 180 : scroll % 3 === 1 ? -180 : 220);
      await new Promise((r) => {
        setTimeout(r, 50);
      });
    }

    const enabled = lb.locator('[role="option"]:not(.Mui-disabled):not([aria-disabled="true"])');
    if (kind === 'hour') {
      let best = null;
      let bestDist = 24;
      const n = await enabled.count();
      for (let i = 0; i < n; i += 1) {
        const o = enabled.nth(i);
        const t = parseInt(((await o.innerText()) || '').trim(), 10);
        if (Number.isNaN(t) || t < 1 || t > 12) continue;
        const d = Math.abs(t - Number(preferredStr));
        if (d < bestDist) {
          bestDist = d;
          best = o;
        }
      }
      if (best) {
        await best.scrollIntoViewIfNeeded();
        await best.click({ timeout: 10000, force: true });
        return;
      }
    }

    if (kind === 'minute') {
      const want = parseInt(preferredStr, 10);
      let best = null;
      let bestDist = 99;
      const n = await enabled.count();
      for (let i = 0; i < n; i += 1) {
        const o = enabled.nth(i);
        const t = parseInt(((await o.innerText()) || '').trim(), 10);
        if (Number.isNaN(t) || t < 0 || t > 59) continue;
        const d = Math.abs(t - want);
        if (d < bestDist) {
          bestDist = d;
          best = o;
        }
      }
      if (best) {
        await best.scrollIntoViewIfNeeded();
        await best.click({ timeout: 10000, force: true });
        return;
      }
    }

    const fallback = enabled.first();
    await expect(async () => {
      expect(await fallback.isVisible({ timeout: 500 }).catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 12000, intervals: [300, 800, 1500] });
    await fallback.scrollIntoViewIfNeeded();
    await fallback.click({ timeout: 10000, force: true });
  }

  async _muiPickDigitalTimeListboxes(popper, targetDate) {
    let h24 = targetDate.getHours();
    const mer = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const minStr = String(targetDate.getMinutes()).padStart(2, '0');

    await this._pickDigitalClockSection(popper, 'Select meridiem', mer, 'mer');
    await new Promise((r) => {
      setTimeout(r, 350);
    });
    const activePopper = this._scheduleDatePickerPopper();
    await this._pickDigitalClockSection(activePopper, 'Select hours', h12, 'hour');
    await this._pickDigitalClockSection(this._scheduleDatePickerPopper(), 'Select minutes', minStr, 'minute');
  }

  async _muiConfirmPickerIfPresent() {
    const popper = this._scheduleDatePickerPopper();
    const ok = popper.getByRole('button', { name: /^OK$|^Set$|^Done$/i }).first();
    if (await ok.isVisible({ timeout: 2500 }).catch(() => false)) {
      await ok.click({ force: true, timeout: 10000 }).catch(async () => {
        await this.page.keyboard.press('Escape').catch(() => {});
      });
    }
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async _pickScheduleCreateFormDateTime(panel, targetDate, kind) {
    await this._openCreateFormDateTimePicker(panel, kind);
    const popper = this._scheduleDatePickerPopper();
    await expect(popper).toBeVisible({ timeout: 15000 });
    await this._muiNavigatePopperToMonthYear(popper, targetDate);
    await this._muiPickDayInPopper(popper, targetDate);
    await this._muiPickDigitalTimeListboxes(popper, targetDate);
    await this._muiConfirmPickerIfPresent();
    await popper.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  /** True when Add Milestone off-canvas/drawer is open (no end date on form). */
  async _isMilestoneCreateFormOpen() {
    return this.addMilestonePanelHeading().isVisible({ timeout: 1500 }).catch(() => false);
  }

  /** Milestone create/edit forms have start date only — no enabled end date field. */
  async _isMilestoneScheduleFormWithoutEndDate() {
    if (await this._isMilestoneCreateFormOpen()) return true;
    const panel = await this.activeFormPanel();
    const endInput = panel.getByLabel(/end date/i).first();
    if (!(await endInput.isVisible({ timeout: 1500 }).catch(() => false))) return true;
    return !(await endInput.isEnabled({ timeout: 1500 }).catch(() => false));
  }

  async pickRandomStartDateTimeOnScheduleCreateForm() {
    const panel = await this.activeFormPanel();
    await this._prepareCreateFormForDateEntry();
    const start = this.randomWeekdayDateTimeBetween(3, 25);
    this._pendingScheduleRandomStartMs = start.getTime();
    this._scheduleCreateFormStartMs = start.getTime();
    this._scheduleCreateFormRequiresNonZeroDuration = false;
    await this._pickScheduleCreateFormDateTime(panel, start, 'start');

    if (await this._isMilestoneScheduleFormWithoutEndDate()) {
      await this._muiConfirmPickerIfPresent();
      await this.page.keyboard.press('Escape').catch(() => {});
      await this._scheduleDatePickerPopper().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      await this.logStep('Picked milestone start datetime (no end date on form)');
      return;
    }

    const endInput = panel.getByLabel(/end date/i);
    await expect(async () => {
      expect(await endInput.isEnabled().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 25000, intervals: [400, 1000, 2000] });
  }

  async pickRandomEndDateTimeAfterStartOnScheduleCreateForm() {
    const panel = this.formPanel();
    await this._prepareCreateFormForDateEntry();
    const stalePopper = this._scheduleDatePickerPopper();
    if (await stalePopper.isVisible({ timeout: 800 }).catch(() => false)) {
      await this._muiConfirmPickerIfPresent();
      await this.page.keyboard.press('Escape').catch(() => {});
      await stalePopper.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    }
    const raw = this._pendingScheduleRandomStartMs;
    const base = typeof raw === 'number' ? new Date(raw) : new Date();
    let lastError;

    for (const [index, end] of this.endDateTimeCandidatesAfterStart(base).entries()) {
      await this._pickScheduleCreateFormDateTime(panel, end, 'end');
      try {
        await this.waitForScheduleCreateFormDurationNotZero(index === 0 ? 10000 : 8000);
        this._pendingScheduleRandomStartMs = null;
        this._scheduleCreateFormRequiresNonZeroDuration = true;
        return;
      } catch (error) {
        lastError = error;
        const durationText = await this._scheduleCreateFormDurationText().catch(() => '');
        console.log(
          `Schedule duration is still "${durationText || 'empty'}" after end datetime attempt ${index + 1}; retrying.`
        );
      }
    }

    throw lastError || new Error('Schedule duration remained 0m after multiple end datetime attempts.');
  }

  _scheduleCreateFormDrawerSurface() {
    return this.page
      .locator('.MuiDrawer-paper:visible, .offcanvas.show, aside.offcanvas.show, [role="dialog"] .MuiDialog-paper:visible')
      .last();
  }

  async _resolveScheduleCreateFormCreateButton() {
    await this.hideFreshchatWidget();
    const panel = await this.activeFormPanel();
    await panel
      .evaluate((root) => {
        const nodes = [root, ...root.querySelectorAll('*')];
        for (const el of nodes) {
          if (!el || typeof el.scrollTop !== 'number') continue;
          if (el.scrollTop > 0) el.scrollTop = 0;
        }
      })
      .catch(() => {});

    const drawer = this._scheduleCreateFormDrawerSurface();
    const primary = drawer.locator('button.btnPrimaryUI').filter({ hasText: /^create$/i }).first();
    if (await primary.isVisible({ timeout: 3000 }).catch(() => false)) {
      return primary;
    }

    const creates = drawer.getByRole('button', { name: /^create$/i });
    const count = await creates.count();
    for (let i = count - 1; i >= 0; i -= 1) {
      const btn = creates.nth(i);
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        return btn;
      }
    }

    return this.page.getByRole('button', { name: /^create$/i }).filter({ visible: true }).last();
  }

  async _expectScheduleCreateFormClosed() {
    await expect(this.addSchedulePanelHeading()).toBeHidden({ timeout: this.uiTimeout });
    await expect(this.addMilestonePanelHeading()).toBeHidden({ timeout: 5000 }).catch(() => {});
  }

  /** Primary Create button in Add Schedule / Add Milestone off-canvas header. */
  async submitScheduleCreateForm() {
    await this.hideFreshchatWidget();

    if (this._scheduleCreateFormRequiresNonZeroDuration) {
      await this.waitForScheduleCreateFormDurationNotZero(20000);
    }

    await this._muiConfirmPickerIfPresent();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._scheduleDatePickerPopper().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this._dismissOpenMenusIfAny();

    const assigneePop = this._scheduleAssigneePickerPopover();
    if (await assigneePop.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.page.getByRole('listbox').last().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    const btn = await this._resolveScheduleCreateFormCreateButton();
    await expect(btn).toBeVisible({ timeout: 20000 });
    await expect(btn).toBeEnabled({ timeout: 15000 });

    await expect(async () => {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ force: true, timeout: 15000 });
      await this._waitScheduleSettled();
      const scheduleOpen = await this.addSchedulePanelHeading().isVisible({ timeout: 1500 }).catch(() => false);
      const milestoneOpen = await this.addMilestonePanelHeading().isVisible({ timeout: 500 }).catch(() => false);
      expect(scheduleOpen || milestoneOpen).toBeFalsy();
    }).toPass({ timeout: this.uiTimeout, intervals: [500, 1000, 2000] });

    this._scheduleCreateFormRequiresNonZeroDuration = false;
    await this.logStep('Submitted schedule/milestone create form');
  }

  /** Schedule assignee picker popover (Users / Vendors tabs). */
  _scheduleAssigneePickerPopover() {
    return this.page
      .locator('.MuiPopover-root:visible, .MuiModal-root:visible, .MuiPaper-root:visible')
      .filter({
        has: this.page.locator(
          '#schedule-assignee-tab-users, #schedule-assignee-tab-vendors, [id*="schedule-assignee-tab"]'
        ),
      })
      .last();
  }

  _scheduleAssigneeTab(tab) {
    const popover = this._scheduleAssigneePickerPopover();
    if (tab === 'users') {
      return popover
        .locator('#schedule-assignee-tab-users')
        .or(popover.getByRole('tab', { name: /users/i }))
        .first();
    }
    return popover
      .locator('#schedule-assignee-tab-vendors')
      .or(popover.getByRole('tab', { name: /vendors/i }))
      .first();
  }

  _scheduleAssigneeTabPanel(tab) {
    const panelId = tab === 'users' ? 'schedule-assignee-tabpanel-users' : 'schedule-assignee-tabpanel-vendors';
    return this.page.locator(`#${panelId}`).last();
  }

  async _scheduleCreateFormAssigneeTrigger() {
    const panel = this.formPanel();
    const lbl = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span')
      .filter({ hasText: /^assignees?\b/i })
      .first();

    if (await lbl.isVisible({ timeout: 5000 }).catch(() => false)) {
      const boxTrigger = lbl
        .locator('xpath=following::div[contains(@class,"MuiBox-root")][1]')
        .or(lbl.locator('..').locator('.MuiBox-root').first())
        .or(lbl.locator('xpath=ancestor::div[1]//div[contains(@class,"MuiBox-root")]').first());
      if (await boxTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        return boxTrigger;
      }
    }

    let combo = panel.getByRole('combobox', { name: /assignees?/i }).first();
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.getByLabel(/assignees?/i).first();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.getByPlaceholder(/assignees?|select assignees?/i).first();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.locator('[role="combobox"]').filter({ hasText: /assign/i }).first();
    }
    await expect(combo).toBeVisible({ timeout: 20000 });
    return combo;
  }

  async _scheduleCreateFormAssigneePickerSurface() {
    const popover = this._scheduleAssigneePickerPopover();
    if (await popover.isVisible({ timeout: 3000 }).catch(() => false)) return popover;
    const listbox = this.page
      .getByRole('listbox')
      .filter({ has: this.page.locator('[role="option"], .MuiMenuItem-root, li, input[type="checkbox"]') })
      .last();
    if (await listbox.isVisible({ timeout: 3000 }).catch(() => false)) return listbox;
    const menu = this.page
      .getByRole('menu')
      .filter({ has: this.page.locator('[role="option"], .MuiMenuItem-root, li, input[type="checkbox"]') })
      .last();
    if (await menu.isVisible({ timeout: 2000 }).catch(() => false)) return menu;
    return this.page
      .locator('.MuiPopover-root:visible, .MuiModal-root:visible, .MuiPaper-root:visible')
      .filter({
        has: this.page.locator(
          '[role="tab"], [role="option"], .MuiMenuItem-root, li, input[type="checkbox"], [id*="schedule-assignee"]'
        ),
      })
      .last();
  }

  async _isScheduleAssigneePickerOpen() {
    if (await this._scheduleAssigneeTab('users').isVisible({ timeout: 500 }).catch(() => false)) return true;
    if (await this._scheduleAssigneeTab('vendors').isVisible({ timeout: 500 }).catch(() => false)) return true;
    const listbox = this.page.getByRole('listbox').last();
    if (await listbox.isVisible({ timeout: 500 }).catch(() => false)) return true;
    const surface = this.page
      .locator('.MuiPopover-root:visible, .MuiModal-root:visible, .MuiPaper-root:visible')
      .filter({ hasText: /users|vendors|assignees?|select/i })
      .last();
    return surface.isVisible({ timeout: 500 }).catch(() => false);
  }

  async _clickScheduleAssigneeTab(tab) {
    const tabBtn = this._scheduleAssigneeTab(tab);
    await expect(tabBtn).toBeVisible({ timeout: 15000 });
    await tabBtn.click({ force: true, timeout: 15000 });
    const panel = this._scheduleAssigneeTabPanel(tab);
    await expect(panel).toBeVisible({ timeout: 10000 });
    return panel;
  }

  async _selectAssigneesFromScheduleAssigneeTab(tab, count = 1) {
    const panel = await this._clickScheduleAssigneeTab(tab);
    const rows = panel.locator(':scope > .MuiBox-root').filter({ visible: true });
    await expect(async () => {
      expect(await rows.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    const total = await rows.count();
    const toSelect = Math.min(count, total);
    let selected = 0;
    for (let i = 0; i < total && selected < toSelect; i += 1) {
      const row = rows.nth(i);
      await row.scrollIntoViewIfNeeded().catch(() => {});
      const checkbox = row.getByRole('checkbox').first();
      if (await checkbox.isVisible({ timeout: 800 }).catch(() => false)) {
        if (!(await checkbox.isChecked().catch(() => false))) {
          await checkbox.click({ force: true, timeout: 10000 });
          selected += 1;
        }
        continue;
      }
      await row.click({ force: true, timeout: 10000 });
      selected += 1;
    }
    expect(selected).toBeGreaterThan(0);
    return selected;
  }

  async _selectRandomAssigneeCheckboxFromScheduleAssigneeTabs() {
    const tabs = ['users', 'vendors'].sort(() => Math.random() - 0.5);
    let lastError = null;

    for (const tab of tabs) {
      const tabBtn = this._scheduleAssigneeTab(tab);
      if (!(await tabBtn.isVisible({ timeout: 2500 }).catch(() => false))) continue;

      const panel = await this._clickScheduleAssigneeTab(tab);
      await expect(panel).toBeVisible({ timeout: 10000 });

      try {
        let pickedName = '';
        await expect(async () => {
          const popover = this._scheduleAssigneePickerPopover();
          const result = await popover.evaluate((root) => {
            const visible = (el) => {
              if (!el || el.disabled) return false;
              const box = el.getBoundingClientRect();
              return box.width >= 0 && box.height >= 0 && box.bottom > 0 && box.right > 0;
            };
            const textFor = (input) => {
              const row =
                input.closest('.MuiBox-root') ||
                input.closest('[role="row"]') ||
                input.closest('label') ||
                input.parentElement;
              return (row?.textContent || input.getAttribute('aria-label') || '').trim();
            };
            const inputs = [...root.querySelectorAll('input[type="checkbox"]')].filter(visible);
            if (inputs.length === 0) {
              const scrollable = [root, ...root.querySelectorAll('*')].find(
                (el) => el.scrollHeight > el.clientHeight + 8
              );
              if (scrollable) scrollable.scrollTop += Math.max(120, scrollable.clientHeight * 0.75);
              return { checked: false, missing: true, name: '' };
            }

            const input = inputs[Math.floor(Math.random() * inputs.length)];
            const name = textFor(input);
            if (!input.checked) {
              const clickTarget =
                input.closest('label') ||
                input.closest('.MuiCheckbox-root') ||
                input.parentElement?.querySelector('.MuiCheckbox-root') ||
                input;
              clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              clickTarget.click();
            }
            if (!input.checked) {
              input.checked = true;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return { checked: Boolean(input.checked), missing: false, name };
          }).catch(() => ({ checked: false, missing: true, name: '' }));

          if (result.missing) {
            await this.page.mouse.wheel(0, 500).catch(() => {});
            expect(false).toBeTruthy();
            return;
          }
          pickedName = result.name;
          expect(result.checked).toBeTruthy();
        }).toPass({ timeout: 15000, intervals: [400, 800, 1200] });

        return pickedName || `${tab} assignee`;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No selectable assignee checkbox found in Users/Vendors popup.');
  }

  async _dismissScheduleAssigneePickerByClickingAway() {
    const popover = this._scheduleAssigneePickerPopover();
    const legacySurface = await this._scheduleCreateFormAssigneePickerSurface();
    const pickerOpen =
      (await popover.isVisible({ timeout: 800 }).catch(() => false)) ||
      (await legacySurface.isVisible({ timeout: 800 }).catch(() => false));
    if (!pickerOpen) return;

    const panel = this.formPanel();
    const safeTargets = [
      panel.getByLabel(/schedule name|milestone name|name|title/i).first(),
      panel.getByRole('heading').first(),
      panel.locator('label, .MuiFormLabel-root').filter({ hasText: /priority|status|phase/i }).first(),
      this._scheduleCreateFormDrawer(),
      this.page.locator('main, [role="main"]').first(),
    ];

    for (const target of safeTargets) {
      if (!(await target.isVisible({ timeout: 500 }).catch(() => false))) continue;
      const box = await target.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) {
        const x = box.x + 8 + Math.floor(Math.random() * Math.max(1, Math.min(box.width - 16, 40)));
        const y = box.y + 8 + Math.floor(Math.random() * Math.max(1, Math.min(box.height - 16, 20)));
        await this.page.mouse.click(x, y);
      } else {
        await target.click({ force: true, timeout: 5000 }).catch(() => {});
      }
      break;
    }

    await popover.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
  }

  async openScheduleCreateFormAssigneesDropdown() {
    await this.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    const panel = await this.activeFormPanel();
    const label = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span')
      .filter({ hasText: /^assignees?\b/i })
      .first();
    const trigger = await this._scheduleCreateFormAssigneeTrigger();
    const candidates = [
      trigger,
      label.locator('xpath=following::*[@role="combobox"][1]').first(),
      label.locator('xpath=following::input[1]').first(),
      label.locator('xpath=following::*[contains(@class,"MuiInputBase-root")][1]').first(),
      label.locator('xpath=following::button[1]').first(),
      panel.getByRole('combobox', { name: /assignees?/i }).first(),
      panel.getByLabel(/assignees?/i).first(),
      panel.getByPlaceholder(/assignees?|select assignees?/i).first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 1000 }).catch(() => false))) continue;
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click({ force: true, timeout: 15000 }).catch(() => {});
      if (await this._isScheduleAssigneePickerOpen()) break;
    }

    const usersTab = this._scheduleAssigneeTab('users');
    if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this._clickScheduleAssigneeTab('users');
      return;
    }

    const surface = await this._scheduleCreateFormAssigneePickerSurface();
    await expect(async () => {
      expect(await this._isScheduleAssigneePickerOpen()).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
    if (await surface.isVisible({ timeout: 1000 }).catch(() => false)) return;
  }

  async expectScheduleCreateFormAssigneesListVisible() {
    const pickerReady = async () => {
      const usersTab = this._scheduleAssigneeTab('users');
      if (await usersTab.isVisible({ timeout: 800 }).catch(() => false)) {
        await this._clickScheduleAssigneeTab('users');
        const panel = this._scheduleAssigneeTabPanel('users');
        const tabRows = panel.locator(':scope > .MuiBox-root, label, [role="row"], input[type="checkbox"]');
        if (await tabRows.first().isVisible({ timeout: 1500 }).catch(() => false)) return true;
      }

      const surface = await this._scheduleCreateFormAssigneePickerSurface();
      if (!(await surface.isVisible({ timeout: 800 }).catch(() => false))) return false;
      const visibleChoices = surface
        .locator('[role="option"], .MuiMenuItem-root, li, label, [role="row"], input[type="checkbox"]')
        .filter({ hasNotText: /^assignees?\b/i });
      return visibleChoices.first().isVisible({ timeout: 1500 }).catch(() => false);
    };

    if (!(await pickerReady())) {
      await this.openScheduleCreateFormAssigneesDropdown();
    }

    await expect(async () => {
      expect(await pickerReady()).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
    await this.logStep('Assignees picker list is visible');
  }

  async expectScheduleCreateFormAssigneesListVisibleLegacy() {
    const usersTab = this._scheduleAssigneeTab('users');
    if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this._clickScheduleAssigneeTab('users');
      const rows = this._scheduleAssigneeTabPanel('users').locator(':scope > .MuiBox-root');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
      return;
    }

    const surface = await this._scheduleCreateFormAssigneePickerSurface();
    await expect(surface).toBeVisible({ timeout: 15000 });
    const rows = surface
      .locator('[role="option"], .MuiMenuItem-root, li')
      .filter({ hasNotText: /^assignees?\b/i });
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  }

  async selectUpToTwoAssigneesOnScheduleCreateForm(maxCount = 2) {
    const usersTab = this._scheduleAssigneeTab('users');
    if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (!(await this._scheduleAssigneeTabPanel('users').isVisible({ timeout: 1500 }).catch(() => false))) {
        await this.openScheduleCreateFormAssigneesDropdown();
      }

      let selected = 0;
      const userCount = maxCount >= 2 ? 1 : maxCount;
      if (userCount > 0) {
        selected += await this._selectAssigneesFromScheduleAssigneeTab('users', userCount);
      }
      if (maxCount - selected > 0) {
        const vendorsTab = this._scheduleAssigneeTab('vendors');
        if (await vendorsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          selected += await this._selectAssigneesFromScheduleAssigneeTab(
            'vendors',
            maxCount - selected
          );
        }
      }
      await this._dismissScheduleAssigneePickerByClickingAway();
      await this.logStep(`Selected ${selected} assignee(s) from Users/Vendors tabs`);
      return selected;
    }

    const surface = await this._scheduleCreateFormAssigneePickerSurface();
    await expect(surface).toBeVisible({ timeout: 15000 });

    const checkboxes = surface.getByRole('checkbox');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 0) {
      const toSelect = Math.min(maxCount, checkboxCount);
      for (let i = 0; i < toSelect; i += 1) {
        const cb = checkboxes.nth(i);
        if (!(await cb.isChecked().catch(() => false))) {
          await cb.click({ force: true, timeout: 10000 });
        }
      }
      await this._dismissScheduleAssigneePickerByClickingAway();
      return toSelect;
    }

    const options = surface.locator('[role="option"], .MuiMenuItem-root, li').filter({ visible: true });
    let optionCount = await options.count();
    if (optionCount === 0) {
      if (await this._scheduleAssigneeTab('users').isVisible({ timeout: 2000 }).catch(() => false)) {
        const selected = await this._selectAssigneesFromScheduleAssigneeTab('users', maxCount);
        await this._dismissScheduleAssigneePickerByClickingAway();
        await this.logStep(`Selected ${selected} assignee(s) from Users tab`);
        return selected;
      }
      await this._selectRandomAssigneeCheckboxFromScheduleAssigneeTabs();
      await this._dismissScheduleAssigneePickerByClickingAway();
      await this.logStep('Selected assignee from Users/Vendors tabs');
      return Math.min(maxCount, 1);
    }
    expect(optionCount).toBeGreaterThan(0);
    const toSelect = Math.min(maxCount, optionCount);
    for (let i = 0; i < toSelect; i += 1) {
      await options.nth(i).click({ force: true, timeout: 10000 });
    }
    await this._dismissScheduleAssigneePickerByClickingAway();
    return toSelect;
  }

  /** Visible Add Schedule drawer/offcanvas surface for scrolling. */
  _scheduleCreateFormDrawer() {
    return this.page
      .locator('aside.offcanvas.show, .offcanvas.show')
      .last()
      .or(this.page.locator('.MuiDrawer-paper:visible').last());
  }

  async _findScheduleCreateFormAddTaskButton() {
    const panel = this.formPanel();
    const drawer = this._scheduleCreateFormDrawer();
    const details = panel.locator('.MuiAccordionDetails-root, .MuiCollapse-entered').last();
    const picks = [
      () => details.getByRole('button', { name: /add task|new task/i }).first(),
      () => details.locator('button').filter({ hasText: /add\s*task|new\s*task/i }).first(),
      () => panel.getByRole('button', { name: /add task|new task/i }).first(),
      () => panel.locator('button').filter({ hasText: /add\s*task|new\s*task/i }).first(),
      () => drawer.getByRole('button', { name: /add task|new task/i }).first(),
      () => drawer.locator('button').filter({ hasText: /add\s*task|new\s*task/i }).first(),
      () => this.page.getByRole('button', { name: /add task|new task/i }).filter({ visible: true }).last(),
      () => panel.getByText(/^add\s*task$/i).locator('xpath=ancestor-or-self::button[1]').first(),
    ];
    let btn = null;
    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      for (const pick of picks) {
        const loc = pick();
        if (await loc.isVisible({ timeout: 500 }).catch(() => false)) {
          btn = loc;
          return;
        }
      }
      expect(btn).toBeTruthy();
    }).toPass({ timeout: 45000, intervals: [500, 1500, 3000] });
    return btn;
  }

  /** Mouse-wheel scroll inside the open schedule drawer (works when scrollTop on container fails). */
  async _wheelScrollScheduleDrawer(steps = 10) {
    const panel = this.formPanel();
    if (!(await panel.isVisible({ timeout: 2000 }).catch(() => false))) {
      const drawer = this._scheduleCreateFormDrawer();
      if (!(await drawer.isVisible({ timeout: 2000 }).catch(() => false))) return;
      await drawer.hover({ timeout: 5000 }).catch(() => {});
    } else {
      const hoverPoint = await panel
        .evaluate((node) => {
          const candidates = [node, ...node.querySelectorAll('*')];
          const scrollable = candidates
            .filter((el) => el.scrollHeight > el.clientHeight + 8)
            .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
          const target = scrollable || node;
          target.scrollIntoView({ block: 'center' });
          const rect = target.getBoundingClientRect();
          return {
            x: rect.x + rect.width / 2,
            y: rect.y + Math.min(rect.height / 2, Math.max(rect.height - 20, 20)),
          };
        })
        .catch(() => null);
      if (hoverPoint) {
        await this.page.mouse.move(hoverPoint.x, hoverPoint.y);
      } else {
        await panel.hover({ timeout: 5000 }).catch(() => {});
      }
    }

    for (let i = 0; i < steps; i += 1) {
      await this.page.mouse.wheel(0, 400);
      await new Promise((r) => {
        setTimeout(r, 60);
      });
    }
  }

  /** Scroll nested containers inside the schedule form so tasks/reminders are reachable. */
  async _scrollScheduleCreateFormToBottom() {
    await this.hideFreshchatWidget();
    const scrollRoots = [
      this.formPanel(),
      this.page.locator('.MuiDrawer-paper:visible').last(),
      this.page.locator('aside.offcanvas.show, .offcanvas.show').last(),
      this.page.locator('[role="dialog"] .MuiDialog-paper:visible').last(),
    ];

    for (const root of scrollRoots) {
      if (!(await root.isVisible({ timeout: 800 }).catch(() => false))) continue;
      await root
        .evaluate((node) => {
          const candidates = [node, ...node.querySelectorAll('*')];
          const scrollables = candidates
            .filter((el) => el.scrollHeight > el.clientHeight + 8)
            .sort((a, b) => b.scrollHeight - a.scrollHeight);
          for (const el of scrollables) {
            el.scrollTop = el.scrollHeight;
          }
        })
        .catch(() => {});
    }
  }

  _scheduleCreateFormAdditionalDetailsRegion() {
    const panel = this.formPanel();
    const drawer = this._scheduleCreateFormDrawer();
    const root = panel.or(drawer);
    const accordionDetails = root
      .locator('.MuiAccordion-root')
      .filter({ has: root.getByText(/additional\s*details/i) })
      .first()
      .locator('.MuiAccordionDetails-root')
      .first();
    const expanded = root
      .locator(
        '.MuiCollapse-entered, .MuiAccordionDetails-root, .collapse.show, [class*="Collapse"][class*="entered"]'
      )
      .filter({ has: root.getByRole('button', { name: /add task|new task/i }) })
      .last();
    return accordionDetails.or(expanded).or(panel);
  }

  async _scheduleCreateFormNewTaskNameInput() {
    const drawer = this._scheduleCreateFormDrawer();
    const panel = this.formPanel();
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const taskRow = region
      .locator('motion.section, section, fieldset, div')
      .filter({
        has: region
          .locator('label, .MuiFormLabel-root, .fw-500, p, span')
          .filter({ hasText: /task\s*name|^task$/i }),
      })
      .last();
    const candidates = [
      () =>
        panel
          .getByLabel(/task\s*name|task\s*title|^task$/i)
          .or(panel.getByPlaceholder(/task\s*name|enter\s*task/i))
          .or(panel.getByLabel(/^task$/i))
          .first(),
      () => drawer.getByLabel(/task\s*name|task\s*title|^task$/i).or(drawer.getByLabel(/^task$/i)).first(),
      () => taskRow.getByLabel(/task\s*name|task\s*title|^task$/i).first(),
      () => taskRow.getByPlaceholder(/task\s*name|enter\s*task/i).first(),
      () => taskRow.getByRole('textbox').first(),
      () => taskRow.locator('input[type="text"], textarea').first(),
      () => region.getByRole('combobox', { name: /task/i }).last(),
      () => panel.getByRole('combobox', { name: /task/i }).last(),
      () => region.getByLabel(/task\s*name|task\s*title|^task$/i).last(),
      () => region.getByPlaceholder(/task\s*name|enter\s*task/i).last(),
      () =>
        region
          .locator('label, .MuiFormLabel-root, .fw-500')
          .filter({ hasText: /^task\s*name$/i })
          .first()
          .locator('xpath=following::input[1] | following::textarea[1]'),
      () =>
        panel
          .getByLabel(/task\s*name|task\s*title|^task$/i)
          .or(panel.getByPlaceholder(/task\s*name|enter\s*task/i))
          .last(),
      () => this.page.getByRole('textbox', { name: /task\s*name/i }).filter({ visible: true }).last(),
    ];

    let resolved = null;
    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(8);
      await drawer.getByText(/additional details|tasks?/i).last().scrollIntoViewIfNeeded().catch(() => {});
      for (const pick of candidates) {
        const loc = pick();
        if (await loc.isVisible({ timeout: 600 }).catch(() => false)) {
          resolved = loc;
          return;
        }
      }
      const inputs = region.locator('input:visible, textarea:visible');
      const n = await inputs.count();
      for (let i = 0; i < n; i += 1) {
        const inp = inputs.nth(i);
        const val = ((await inp.inputValue().catch(() => '')) || '').trim();
        const ph = ((await inp.getAttribute('placeholder')) || '').toLowerCase();
        if (!val && /task|name/.test(ph)) {
          resolved = inp;
          return;
        }
      }
      expect(resolved).toBeTruthy();
    }).toPass({ timeout: 45000, intervals: [500, 1500, 2500] });
    return resolved;
  }

  async expandScheduleCreateFormAdditionalDetails() {
    const drawer = this._scheduleCreateFormDrawer();
    const panel = this.formPanel();
    await this.hideFreshchatWidget();
    await this._scrollScheduleCreateFormToBottom();

    const accordion = panel
      .locator('.MuiAccordionSummary-root')
      .filter({ hasText: /additional\s*details/i })
      .first();
    if (await accordion.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accordion.scrollIntoViewIfNeeded().catch(() => {});
      if ((await accordion.getAttribute('aria-expanded').catch(() => '')) !== 'true') {
        await accordion.click({ force: true, timeout: 10000 });
      }
    } else {
      const additionalLbl = drawer
        .getByText(/additional\s*details/i)
        .or(panel.getByText(/additional\s*details/i))
        .first();
      if (await additionalLbl.isVisible({ timeout: 10000 }).catch(() => false)) {
        await additionalLbl.scrollIntoViewIfNeeded().catch(() => {});
        await additionalLbl.click({ force: true, timeout: 10000 }).catch(() => {});

        const expandIcon = panel
          .getByRole('button', { name: /expand|additional\s*details/i })
          .first();
        if (await expandIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
          if ((await expandIcon.getAttribute('aria-expanded').catch(() => '')) !== 'true') {
            await expandIcon.click({ force: true, timeout: 10000 }).catch(() => {});
          }
        }
      }
    }

    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(6);
    await this.logStep('Expanded Additional Details');
  }

  async scrollScheduleCreateFormDown() {
    await this.hideFreshchatWidget();
    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(12);
      const panel = this.formPanel();
      const taskSection = panel
        .getByRole('button', { name: /add task|new task/i })
        .or(panel.getByRole('button', { name: /^remove$/i }))
        .first();
      await expect(taskSection).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 45000, intervals: [500, 1500, 3000] });
    await this.logStep('Scrolled down on schedule create form');
  }

  /** True when the inline new-task row is active (task assignee / status fields visible). */
  async _isScheduleCreateFormNewTaskRowActive() {
    const panel = this.formPanel();
    const taskAssignee = panel
      .getByRole('combobox', { name: /select assignee/i })
      .or(panel.getByLabel(/select assignee/i))
      .first();
    if (await taskAssignee.isVisible({ timeout: 400 }).catch(() => false)) return true;

    const endDates = panel.getByLabel(/end date/i);
    if ((await endDates.count()) >= 2) return true;

    return panel
      .getByRole('combobox', { name: /^to do$/i })
      .last()
      .isVisible({ timeout: 400 })
      .catch(() => false);
  }

  /** Confirm inline new-task row after filling task name (button label varies by build). */
  async _commitScheduleCreateFormNewTaskRow(taskInput) {
    const panel = this.formPanel();
    const drawer = this._scheduleCreateFormDrawer();
    const region = this._scheduleCreateFormAdditionalDetailsRegion();

    if (await this._isScheduleCreateFormNewTaskRowActive()) return;

    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(6);

    const confirmPatterns = [/add new item/i, /add item/i, /^add$/i, /confirm/i, /save task/i];
    for (const re of confirmPatterns) {
      const btn = region
        .getByRole('button', { name: re })
        .or(drawer.getByRole('button', { name: re }))
        .or(panel.getByRole('button', { name: re }))
        .first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click({ force: true, timeout: 10000 }).catch(() => {});
        if (await this._isScheduleCreateFormNewTaskRowActive()) return;
      }
    }

    const rowButtons = region.locator('button');
    const btnCount = await rowButtons.count().catch(() => 0);
    for (let i = btnCount - 1; i >= 0; i -= 1) {
      const btn = rowButtons.nth(i);
      const text = ((await btn.innerText().catch(() => '')) || '').trim();
      if (/add\s*new\s*item|add\s*item|^add$/i.test(text)) {
        await btn.click({ force: true, timeout: 10000 }).catch(() => {});
        if (await this._isScheduleCreateFormNewTaskRowActive()) return;
      }
    }

    await taskInput.press('Enter').catch(() => {});
    if (await this._isScheduleCreateFormNewTaskRowActive()) return;

    await taskInput.press('Tab').catch(() => {});
    await this._wheelScrollScheduleDrawer(4);

    const addNewItem = drawer
      .getByRole('button', { name: /add new item/i })
      .or(drawer.locator('button').filter({ hasText: /add\s*new\s*item/i }))
      .first();
    if (await addNewItem.isVisible({ timeout: 1500 }).catch(() => false)) {
      await addNewItem.click({ force: true, timeout: 10000 }).catch(() => {});
      return;
    }

    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(6);
      const buttons = drawer.locator('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i += 1) {
        const text = ((await buttons.nth(i).innerText().catch(() => '')) || '').trim().toLowerCase();
        if (text.includes('add new item') || text === 'add item') {
          await buttons.nth(i).click({ force: true, timeout: 10000 });
          return;
        }
      }
      const val = ((await taskInput.inputValue().catch(() => '')) || '').trim();
      if (val) return;
      expect(false).toBeTruthy();
    }).toPass({ timeout: 15000, intervals: [500, 1500] }).catch(() => {});
  }

  async _scheduleCreateFormTaskAssigneeTrigger() {
    const panel = this.formPanel();
    const drawer = this._scheduleCreateFormDrawer();
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    const picks = [
      () => drawer.getByRole('combobox').last(),
      () => drawer.getByRole('button', { name: /select assignee/i }).last(),
      () => drawer.getByRole('combobox', { name: /^select assignee$/i }).last(),
      () => drawer.getByLabel(/^select assignee$/i).last(),
      () => region.getByRole('combobox', { name: /^select assignee$/i }).last(),
      () => region.getByLabel(/^select assignee$/i).last(),
      () => region.getByRole('combobox', { name: /assignee/i }).last(),
      () => region.getByLabel(/assignee/i).last(),
      () => {
        const lbl = region
          .locator('label, .fw-500, .MuiFormLabel-root, p, span')
          .filter({ hasText: /^assignee$/i })
          .last();
        return lbl.locator('xpath=following::*[@role="combobox"][1]');
      },
      () => panel.getByRole('combobox', { name: /select assignee/i }).last(),
      () => panel.getByLabel(/select assignee/i).last(),
      () => panel.getByRole('combobox', { name: /assignee/i }).last(),
      () => panel.getByLabel(/assignee/i).last(),
    ];

    let combo = null;
    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(6);

      const taskLabel = drawer
        .locator('label, .MuiFormLabel-root, .fw-500, p, span')
        .filter({ hasText: /task\s*name/i })
        .last();
      if (await taskLabel.isVisible({ timeout: 800 }).catch(() => false)) {
        const section = taskLabel
          .locator(
            'xpath=ancestor::motion.section[1] | ancestor::motion.div[1] | ancestor::div[contains(@class,"MuiAccordionDetails")][1]'
          )
          .first();
        const inSection = section.getByRole('combobox', { name: /assignee/i });
        if ((await inSection.count()) > 0 && (await inSection.first().isVisible().catch(() => false))) {
          combo = inSection.first();
          return;
        }
        const following = taskLabel.locator('xpath=following::*[@role="combobox"][1]').first();
        if (await following.isVisible({ timeout: 500 }).catch(() => false)) {
          combo = following;
          return;
        }
      }

      const regionCombos = region.getByRole('combobox');
      const regionCount = await regionCombos.count();
      for (let i = regionCount - 1; i >= 0; i -= 1) {
        const c = regionCombos.nth(i);
        if (await c.isVisible({ timeout: 500 }).catch(() => false)) {
          combo = c;
          return;
        }
      }

      const combos = drawer.getByRole('combobox');
      const n = await combos.count();
      if (n >= 2) {
        const last = combos.nth(n - 1);
        if (await last.isVisible({ timeout: 500 }).catch(() => false)) {
          combo = last;
          return;
        }
      }

      for (const pick of picks) {
        const loc = pick();
        if (await loc.isVisible({ timeout: 600 }).catch(() => false)) {
          combo = loc;
          return;
        }
      }
      expect(combo).toBeTruthy();
    }).toPass({ timeout: 45000, intervals: [500, 1500, 2500] });
    return combo;
  }

  async _ensureScheduleCreateFormTaskRowExpanded() {
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(8);
    const drawer = this._scheduleCreateFormDrawer();
    const addNew = drawer
      .getByRole('button', { name: /add new item/i })
      .or(drawer.locator('button').filter({ hasText: /add\s*new\s*item/i }))
      .first();
    if (await addNew.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addNew.click({ force: true, timeout: 10000 }).catch(() => {});
      await this._wheelScrollScheduleDrawer(4);
    }
  }

  async _scanTaskStatusCombobox() {
    const drawer = this._scheduleCreateFormDrawer();
    const region = this._scheduleCreateFormAdditionalDetailsRegion();
    let combo = null;
    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(6);
      for (const scope of [region, drawer]) {
        const combos = scope.getByRole('combobox');
        const n = await combos.count();
        for (let i = n - 1; i >= 0; i -= 1) {
          const c = combos.nth(i);
          if (!(await c.isVisible({ timeout: 400 }).catch(() => false))) continue;
          const aria = ((await c.getAttribute('aria-label').catch(() => '')) || '').trim();
          const text = ((await c.innerText().catch(() => '')) || '').trim();
          const hay = `${aria} ${text}`;
          if (/assignee|priority|phase|reminder|completion|hex|color|days?\b/i.test(hay)) continue;
          if (/to\s*do|status|in\s*progress|completed|todo/i.test(hay)) {
            combo = c;
            return;
          }
        }
        if (scope === region && n > 0) {
          for (let i = 0; i < n; i += 1) {
            const c = combos.nth(i);
            if (!(await c.isVisible({ timeout: 400 }).catch(() => false))) continue;
            const hay = `${await c.getAttribute('aria-label').catch(() => '')} ${await c.innerText().catch(() => '')}`;
            if (!/assignee|priority|phase/i.test(hay)) {
              combo = c;
              return;
            }
          }
        }
      }
      expect(combo).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1500, 2500] });
    return combo;
  }

  _scheduleCreateFormTaskStatusLabel(statusRegex) {
    const re = statusRegex instanceof RegExp ? statusRegex : new RegExp(String(statusRegex), 'i');
    if (re.test('In Progress')) return 'In Progress';
    if (re.test('Completed')) return 'Completed';
    if (re.test('To do')) return 'To Do';
    throw new Error(`Unknown schedule create form task status: ${statusRegex}`);
  }

  /** Task-row assignee MUI Autocomplete trigger (codegen: grid sm-5). */
  _scheduleCreateFormTaskAssigneeAutocomplete() {
    const panel = this.formPanel();
    return panel
      .locator(
        '.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-sm-5 .MuiAutocomplete-root .MuiInputBase-root'
      )
      .last()
      .or(panel.locator('.MuiGrid-item.MuiGrid-grid-sm-5 .MuiAutocomplete-root .MuiInputBase-root').last());
  }

  async _pickScheduleCreateFormAddNewItemOption(taskName, taskCombo) {
    const escaped = taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let attempt = 0;
    await expect(async () => {
      attempt += 1;
      if (attempt > 1) {
        await taskCombo.click({ force: true, timeout: 5000 }).catch(() => {});
        await taskCombo.fill('');
        await taskCombo.pressSequentially(taskName, { delay: 30 });
        await new Promise((r) => setTimeout(r, 500));
      }
      const allOptions = this.page.getByRole('option');
      const count = await allOptions.count();
      for (let i = 0; i < count; i += 1) {
        const opt = allOptions.nth(i);
        const text = ((await opt.innerText().catch(() => '')) || '').trim();
        if (/add new item/i.test(text) && new RegExp(escaped, 'i').test(text)) {
          await opt.click({ force: true, timeout: 10000 });
          return;
        }
      }
      const named = this.page.getByRole('option', { name: `Add new item "${taskName}"`, exact: true });
      if (await named.isVisible({ timeout: 800 }).catch(() => false)) {
        await named.click({ force: true, timeout: 10000 });
        return;
      }
      expect(false).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });
  }

  async addNewTaskOnScheduleCreateFormNamed(taskName) {
    await this.hideFreshchatWidget();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(10);

    const addTaskBtn = await this._findScheduleCreateFormAddTaskButton();
    await addTaskBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addTaskBtn.click({ force: true, timeout: 15000 });
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(12);

    const directTaskCombo = this.page.getByRole('combobox', { name: 'Task' }).last();
    if (await directTaskCombo.isVisible({ timeout: 8000 }).catch(() => false)) {
      await directTaskCombo.click({ force: true, timeout: 15000 });
      await directTaskCombo.fill(taskName);
      const directAddOption = this.page.getByRole('option', { name: `Add new item "${taskName}"` }).first();
      await expect(directAddOption).toBeVisible({ timeout: 15000 });
      await directAddOption.click({ force: true, timeout: 15000 });
      this._lastScheduleCreateFormTaskName = taskName;
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(4);
      await this.logStep(`Added new task: ${taskName}`);
      return;
    }

    let taskCombo = this.page.getByRole('combobox', { name: /^task$/i }).last();
    if (!(await taskCombo.isVisible({ timeout: 5000 }).catch(() => false))) {
      taskCombo = await this._scheduleCreateFormNewTaskNameInput();
    }
    await taskCombo.click({ force: true, timeout: 15000 });
    await taskCombo.fill('');
    await taskCombo.pressSequentially(taskName, { delay: 40 });
    await new Promise((r) => setTimeout(r, 1000));

    const listbox = this.page.getByRole('listbox').last();
    if (!(await listbox.isVisible({ timeout: 3000 }).catch(() => false))) {
      await taskCombo.click({ force: true }).catch(() => {});
      await taskCombo.fill('');
      await taskCombo.pressSequentially(taskName, { delay: 50 });
      await new Promise((r) => setTimeout(r, 1000));
    }

    await this._pickScheduleCreateFormAddNewItemOption(taskName, taskCombo);
    this._lastScheduleCreateFormTaskName = taskName;

    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(4);
    await this.logStep(`Added new task: ${taskName}`);
  }

  async _clickLastFormDropdownOption(optionRegex) {
    const nameRe = optionRegex instanceof RegExp ? optionRegex : new RegExp(String(optionRegex), 'i');
    let src = nameRe.source;
    if (src.startsWith('^')) src = src.slice(1);
    if (src.endsWith('$')) src = src.slice(0, -1);
    const looseRe = new RegExp(src, nameRe.ignoreCase ? 'i' : '');

    const listbox = this.page.getByRole('listbox').last();
    const menu = this.page.getByRole('menu').last();
    await listbox.waitFor({ state: 'visible', timeout: 8000 }).catch(async () => {
      await menu.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    });

    let option = listbox.locator('[role="option"], .MuiMenuItem-root, li').filter({ hasText: looseRe }).first();
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = menu.getByRole('menuitem', { name: looseRe }).first();
    }
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = this.page.getByRole('option', { name: looseRe }).first();
    }
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = await this._findScrollableListboxOption(listbox, looseRe);
    }
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click({ force: true });
  }

  async _findScrollableListboxOption(listbox, looseRe) {
    const itemSel = '[role="option"], .MuiMenuItem-root, li';
    for (let scroll = 0; scroll < 20; scroll += 1) {
      const items = listbox.locator(itemSel);
      const count = await items.count();
      for (let i = 0; i < count; i += 1) {
        const item = items.nth(i);
        const text = ((await item.innerText().catch(() => '')) || '').trim();
        if (looseRe.test(text)) {
          await item.scrollIntoViewIfNeeded().catch(() => {});
          return item;
        }
      }
      await listbox.evaluate((el) => {
        el.scrollTop += Math.max(120, Math.floor(el.clientHeight * 0.8));
      }).catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
    }
    return listbox.locator(itemSel).filter({ hasText: looseRe }).first();
  }

  /** MUI task-status option values on the Add Schedule inline task row (stable across sessions). */
  _scheduleCreateFormTaskStatusDataValue(statusRegex) {
    const re = statusRegex instanceof RegExp ? statusRegex : new RegExp(String(statusRegex), 'i');
    if (re.test('In Progress')) return 'IN PROGRESS';
    if (re.test('Completed')) return 'COMPLETED';
    if (re.test('To do')) return 'TO DO';
    throw new Error(`Unknown schedule create form task status: ${statusRegex}`);
  }

  _taskStatusDataValueVariants(dataValue) {
    const compact = dataValue.replace(/ /g, '');
    const snake = dataValue.replace(/ /g, '_');
    return [...new Set([
      dataValue,
      dataValue.toUpperCase(),
      dataValue.toLowerCase(),
      snake,
      snake.toUpperCase(),
      snake.toLowerCase(),
      compact,
      compact.toUpperCase(),
      compact.toLowerCase(),
    ])];
  }

  _scheduleCreateFormTaskStatusOption(dataValue) {
    const variants = this._taskStatusDataValueVariants(dataValue);
    const parts = variants.map((v) => {
      const escaped = v.replace(/"/g, '\\"');
      return `li[data-value="${escaped}"], [role="option"][data-value="${escaped}"]`;
    });
    return this.page.locator(parts.join(', ')).first();
  }

  /** Click task status list option by MUI data-value (e.g. IN PROGRESS). */
  async _clickScheduleCreateFormTaskStatusOption(dataValue) {
    const variants = this._taskStatusDataValueVariants(dataValue);
    for (const val of variants) {
      const clicked = await this.page.evaluate((v) => {
        const opt = document.querySelector(`[data-value="${v}"]`);
        if (opt) {
          opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          opt.click();
          return true;
        }
        return false;
      }, val);
      if (clicked) return true;
    }
    const option = this._scheduleCreateFormTaskStatusOption(dataValue);
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click({ force: true, timeout: 15000 });
      return true;
    }
    return false;
  }

  /**
   * User-confirmed flow: click MUI Select trigger (id like `:r4pb:` showing "To do"),
   * then pick `[data-value="IN PROGRESS"]` (or Completed / To do).
   */
  async _openScheduleCreateFormTaskStatusAndPick(dataValue) {
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(10);

    return this.page.evaluate((val) => {
      const surfaces = [
        ...document.querySelectorAll('.MuiDrawer-paper'),
        ...document.querySelectorAll('.offcanvas.show, aside.offcanvas.show'),
      ].filter((el) => el.getBoundingClientRect().height > 0);
      const root = surfaces[surfaces.length - 1] || document.body;

      const pickOption = () => {
        const variants = [val, val.toUpperCase(), val.toLowerCase(), val.replace(/ /g, '_'), val.replace(/ /g, '')];
        for (const v of variants) {
          const opt = document.querySelector(`[data-value="${v}"]`);
          if (opt && opt.getBoundingClientRect().height > 0) {
            opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            opt.click();
            return true;
          }
        }
        return false;
      };

      const dismissMenu = () => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      };

      const clickTargetFor = (el) => {
        if (el.classList?.contains('MuiSelect-select')) return el;
        const display = el.closest('.MuiInputBase-root, .MuiSelect-root')?.querySelector('.MuiSelect-select');
        if (display) return display;
        if (el.getAttribute('role') === 'combobox') return el;
        return el;
      };

      const tryClick = (el) => {
        const target = clickTargetFor(el);
        target.scrollIntoView({ block: 'center', inline: 'nearest' });
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.click();
        return pickOption();
      };

      const muiIdNodes = [...root.querySelectorAll('[id^=":r"]')];
      for (let i = muiIdNodes.length - 1; i >= 0; i -= 1) {
        if (tryClick(muiIdNodes[i])) return true;
        dismissMenu();
      }

      const toDoSelects = [...root.querySelectorAll('.MuiSelect-select')].filter((el) =>
        /to\s*do/i.test((el.textContent || '').trim())
      );
      for (let i = toDoSelects.length - 1; i >= 0; i -= 1) {
        if (tryClick(toDoSelects[i])) return true;
        dismissMenu();
      }

      return false;
    }, dataValue);
  }

  /** Open task "To do" MUI select (id like `:r4pb:`) and pick option by data-value. */
  async _selectScheduleCreateFormTaskStatusByDataValue(statusRegex, { commitRow = false } = {}) {
    const dataValue = this._scheduleCreateFormTaskStatusDataValue(statusRegex);
    const panel = this.formPanel();
    const drawer = this._scheduleCreateFormDrawer();

    if (commitRow) {
      try {
        const taskInput = await this._scheduleCreateFormNewTaskNameInput();
        await this._commitScheduleCreateFormNewTaskRow(taskInput);
        await this._wheelScrollScheduleDrawer(6);
      } catch {
        /* row may already be expanded */
      }
    }

    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(10);

    try {
      const taskInput = await this._scheduleCreateFormNewTaskNameInput();
      await taskInput.press('Tab').catch(() => {});
    } catch {
      /* task row may already be committed */
    }

    const option = this.page.locator(`li[data-value="${dataValue}"], [data-value="${dataValue}"]`).first();

    const openAndPick = async (trigger) => {
      if (!(await trigger.isVisible({ timeout: 800 }).catch(() => false))) return false;
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await trigger.click({ force: true, timeout: 15000 });
      if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
        await option.click({ force: true, timeout: 15000 });
        return true;
      }
      if (await this._clickScheduleCreateFormTaskStatusOption(dataValue)) return true;
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    };

    const triggers = [
      panel.locator('xpath=.//*[starts-with(@id,":r")]').filter({ hasText: /to\s*do/i }).last(),
      drawer.locator('xpath=.//*[starts-with(@id,":r")]').filter({ hasText: /to\s*do/i }).last(),
      panel.locator('xpath=.//*[starts-with(@id,":r") and contains(@class,"MuiSelect-select")]').last(),
      drawer.locator('xpath=.//*[starts-with(@id,":r") and contains(@class,"MuiSelect-select")]').last(),
      panel.locator('.MuiSelect-select').filter({ hasText: /to\s*do/i }).last(),
      drawer.locator('.MuiSelect-select').filter({ hasText: /to\s*do/i }).last(),
    ];

    try {
      const taskInput = await this._scheduleCreateFormNewTaskNameInput();
      const rowSelect = taskInput
        .locator(
          'xpath=ancestor::motion.section[1]//motion.div[contains(@class,"MuiSelect-select")] | ancestor::motion.section[1]//*[starts-with(@id,":r") and contains(@class,"MuiSelect-select")] | ancestor::section[1]//motion.div[contains(@class,"MuiSelect-select")]'
        )
        .first();
      if (await rowSelect.isVisible({ timeout: 1500 }).catch(() => false)) {
        triggers.unshift(rowSelect);
      }
    } catch {
      /* optional task row scope */
    }

    for (const trigger of triggers) {
      if (await openAndPick(trigger)) return;
    }

    await expect(async () => {
      const scopes = [panel, drawer];
      for (const scope of scopes) {
        const muiNodes = scope.locator('xpath=.//*[starts-with(@id,":r")]');
        const n = await muiNodes.count();
        for (let i = n - 1; i >= 0; i -= 1) {
          const node = muiNodes.nth(i);
          if (!(await node.isVisible({ timeout: 300 }).catch(() => false))) continue;
          const text = ((await node.innerText().catch(() => '')) || '').trim();
          if (/assignee|priority|phase|reminder|completion|hex|high|medium|low/i.test(text)) continue;
          if (await openAndPick(node)) return;
        }
      }
      if (await this._openScheduleCreateFormTaskStatusAndPick(dataValue)) return;
      expect(false).toBeTruthy();
    }).toPass({ timeout: 45000, intervals: [500, 1500, 2500] });
  }

  async _setScheduleCreateFormTaskStatusByDataValueInPanel(dataValue) {
    const panel = this.formPanel();
    const panelHandle = await panel.elementHandle({ timeout: 15000 });
    if (!panelHandle) return false;

    const ok = await panelHandle.evaluate(async (root, values) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const pickOption = () => {
        for (const val of values) {
          const opt = document.querySelector(`li[data-value="${val}"], [data-value="${val}"]`);
          if (opt && opt.getBoundingClientRect().height > 0) {
            opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            opt.click();
            return true;
          }
        }
        return false;
      };
      const dismiss = async () => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await sleep(200);
      };
      const nodes = [...root.querySelectorAll('[id^=":r"], .MuiSelect-select')].reverse();
      for (const el of nodes) {
        const text = (el.textContent || '').trim();
        if (/assignee|priority|phase|reminder|completion|hex|high|medium|low/i.test(text)) continue;
        const target =
          el.classList?.contains('MuiSelect-select') ?
            el
          : el.closest('.MuiInputBase-root')?.querySelector('.MuiSelect-select') || el;
        target.scrollIntoView({ block: 'center' });
        target.click();
        await sleep(400);
        if (pickOption()) return true;
        await dismiss();
      }
      return false;
    }, this._taskStatusDataValueVariants(dataValue));
    await panelHandle.dispose().catch(() => {});
    return ok;
  }

  async setScheduleCreateFormTaskStatus(statusRegex) {
    await this.hideFreshchatWidget();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(6);
    await this.page.keyboard.press('Escape').catch(() => {});

    const statusLabel = this._scheduleCreateFormTaskStatusLabel(statusRegex);
    const dataValue = this._scheduleCreateFormTaskStatusDataValue(statusRegex);

    try {
      await this._selectScheduleCreateFormTaskStatusByDataValue(statusRegex);
    } catch (firstError) {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(8);
      await this.page.keyboard.press('Escape').catch(() => {});

      let opened = false;
      const directCombos = [
        this.page.getByRole('combobox', { name: /^to\s*do$/i }).last(),
        this.page.getByRole('combobox', { name: /^(to\s*do|status)$/i }).last(),
        await this._scanTaskStatusCombobox().catch(() => null),
      ].filter(Boolean);

      for (const combo of directCombos) {
        if (!(await combo.isVisible({ timeout: 1200 }).catch(() => false))) continue;
        await combo.scrollIntoViewIfNeeded().catch(() => {});
        await combo.click({ force: true, timeout: 15000 }).catch(() => {});
        if (await this._clickScheduleCreateFormTaskStatusOption(dataValue)) {
          opened = true;
          break;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
      }

      if (!opened && !(await this._setScheduleCreateFormTaskStatusByDataValueInPanel(dataValue))) {
        await this.page.keyboard.press('Escape').catch(() => {});
        if (!(await this._openScheduleCreateFormTaskStatusAndPick(dataValue))) {
          throw firstError;
        }
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await expect(this.formPanel().getByText(statusLabel, { exact: true }).last()).toBeVisible({ timeout: 10000 });
    await this.logStep(`Selected task status: ${statusLabel}`);
  }

  async selectOneAssigneeOnScheduleCreateFormTask() {
    await this.hideFreshchatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(8);
    await this.page.keyboard.press('Escape').catch(() => {});

    let listbox = this.page.getByRole('listbox').last();
    const hasRealAssigneeOption = async () => {
      if (!(await listbox.isVisible({ timeout: 800 }).catch(() => false))) return false;
      const options = listbox.getByRole('option');
      const count = await options.count();
      for (let i = 0; i < count; i += 1) {
        const text = ((await options.nth(i).innerText().catch(() => '')) || '').trim();
        if (!text) continue;
        if (/^(to\s*do|in\s*progress|completed)$/i.test(text)) continue;
        if (/add new item|no options|task/i.test(text)) continue;
        return true;
      }
      return false;
    };

    const openTaskAssigneeDropdown = async () => {
      const clickTrigger = async (trigger) => {
        if (!(await trigger.isVisible({ timeout: 800 }).catch(() => false))) return false;
        await trigger.scrollIntoViewIfNeeded().catch(() => {});
        const input = trigger.locator('input').first();
        if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
          await input.click({ force: true, timeout: 10000 });
          await input.press('ArrowDown').catch(() => {});
        } else {
          await trigger.click({ force: true, timeout: 10000 });
        }
        if (await this._scheduleAssigneeTab('users').isVisible({ timeout: 1200 }).catch(() => false)) return true;
        listbox = this.page.getByRole('listbox').last();
        if (await hasRealAssigneeOption()) return true;
        await this.page.keyboard.press('Escape').catch(() => {});
        return false;
      };

      const triggerCandidates = [
        await this._scheduleCreateFormTaskAssigneeTrigger().catch(() => null),
        this._scheduleCreateFormTaskAssigneeAutocomplete(),
      ].filter(Boolean);
      for (const trigger of triggerCandidates) {
        if (await clickTrigger(trigger)) return true;
      }

      const exactRoots = this.page.locator(
        '.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-sm-5 > .d-flex > .MuiAutocomplete-root > .MuiBox-root > .MuiFormControl-root > .MuiInputBase-root'
      );
      const fallbackRoots = this.page.locator('.MuiGrid-item.MuiGrid-grid-sm-5 .MuiAutocomplete-root .MuiInputBase-root');

      for (const roots of [exactRoots, fallbackRoots]) {
        const count = await roots.count();
        for (let i = count - 1; i >= 0; i -= 1) {
          const root = roots.nth(i);
          if (!(await root.isVisible({ timeout: 500 }).catch(() => false))) continue;
          await root.scrollIntoViewIfNeeded().catch(() => {});
          const input = root.locator('input').first();
          if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
            await input.click({ force: true, timeout: 10000 });
          } else {
            await root.click({ force: true, timeout: 10000 });
          }
          if (await this._scheduleAssigneeTab('users').isVisible({ timeout: 1200 }).catch(() => false)) return true;
          listbox = this.page.getByRole('listbox').last();
          if (await hasRealAssigneeOption()) return true;
          await this.page.keyboard.press('Escape').catch(() => {});
        }
      }

      const clickedByDom = await this.formPanel()
        .evaluate((root) => {
          const visible = (el) => {
            if (!el) return false;
            const box = el.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
          };
          const textNear = (el) => {
            const ancestors = [];
            let node = el;
            for (let i = 0; node && i < 5; i += 1) {
              ancestors.push(node);
              node = node.parentElement;
            }
            return ancestors.map((n) => n.textContent || '').join(' ');
          };
          const inputs = [...root.querySelectorAll('.MuiAutocomplete-root input, input[role="combobox"]')].filter(visible);
          const assigneeInputs = inputs.filter((input) => {
            const text = `${input.getAttribute('aria-label') || ''} ${input.getAttribute('placeholder') || ''} ${textNear(input)}`;
            if (/task\s*name|task$|priority|phase|status|to\s*do|completion|reminder|date|duration/i.test(text)) return false;
            return /assignee|select/i.test(text);
          });
          const target = assigneeInputs[assigneeInputs.length - 1] || inputs[inputs.length - 1];
          if (!target) return false;
          target.scrollIntoView({ block: 'center', inline: 'nearest' });
          target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          target.click();
          target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          return true;
        })
        .catch(() => false);
      if (clickedByDom) {
        if (await this._scheduleAssigneeTab('users').isVisible({ timeout: 1200 }).catch(() => false)) return true;
        listbox = this.page.getByRole('listbox').last();
        if (await hasRealAssigneeOption()) return true;
        await this.page.keyboard.press('ArrowDown').catch(() => {});
        if (await hasRealAssigneeOption()) return true;
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      return false;
    };

    await expect(async () => {
      expect(await openTaskAssigneeDropdown()).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });

    if (await this._scheduleAssigneeTab('users').isVisible({ timeout: 2500 }).catch(() => false)) {
      const assigneeName = await this._selectRandomAssigneeCheckboxFromScheduleAssigneeTabs();
      await this._dismissScheduleAssigneePickerByClickingAway();
      await this.logStep(`Selected task assignee: ${assigneeName || '1 assignee'}`);
      return;
    }

    let option = null;
    await expect(async () => {
      const options = listbox.getByRole('option');
      const count = await options.count();
      for (let i = 0; i < count; i += 1) {
        const candidate = options.nth(i);
        const text = ((await candidate.innerText().catch(() => '')) || '').trim();
        if (!text) continue;
        if (/^(to\s*do|in\s*progress|completed)$/i.test(text)) continue;
        if (/add new item|no options|task/i.test(text)) continue;
        if (!(await candidate.isVisible({ timeout: 300 }).catch(() => false))) continue;
        option = candidate;
        return;
      }
      expect(option).toBeTruthy();
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    const assigneeName = ((await option.innerText().catch(() => '')) || '').trim();
    await option.click({ force: true, timeout: 15000 });

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep(`Selected task assignee: ${assigneeName || '1 assignee'}`);
  }

  async _openScheduleCreateFormTaskEndDatePicker() {
    const panel = this.formPanel();

    await expect(async () => {
      await this._scrollScheduleCreateFormToBottom();
      await this._wheelScrollScheduleDrawer(4);
      const endInputs = panel.getByLabel(/end date/i);
      const count = await endInputs.count();
      expect(count).toBeGreaterThanOrEqual(1);

      for (let i = count - 1; i >= 0; i -= 1) {
        const endInput = endInputs.nth(i);
        if (!(await endInput.isVisible({ timeout: 400 }).catch(() => false))) continue;
        await endInput.scrollIntoViewIfNeeded().catch(() => {});
        const formControl = endInput
          .locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]')
          .first();
        const adornment = formControl
          .getByLabel('Choose date', { exact: true })
          .or(formControl.locator('button[aria-label*="Choose" i]'))
          .or(formControl.locator('.MuiInputAdornment-root button').first())
          .first();
        if (!(await adornment.isVisible({ timeout: 700 }).catch(() => false))) continue;
        await adornment.click({ force: true, timeout: 10000 });
        if (await this._scheduleDatePickerPopper().isVisible({ timeout: 3000 }).catch(() => false)) return;
      }
      expect(false).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async pickRandomEndDateTimeOnScheduleCreateFormTask() {
    const panel = this.formPanel();
    await this._prepareCreateFormForDateEntry();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(6);
    const raw = this._pendingScheduleRandomStartMs ?? this._scheduleCreateFormStartMs;
    const base = typeof raw === 'number' ? new Date(raw) : new Date();
    const end = this.randomEndWeekdayAfterStart(base);

    await this._openScheduleCreateFormTaskEndDatePicker();
    let popper = this._scheduleDatePickerPopper();
    await expect(popper).toBeVisible({ timeout: 15000 });

    let picked = end;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        popper = this._scheduleDatePickerPopper();
        picked = await this._muiPickDayInPopperWithFallback(popper, picked);
        await this._muiPickDigitalTimeListboxes(this._scheduleDatePickerPopper(), picked);
        await this._muiConfirmPickerIfPresent();
        break;
      } catch (error) {
        console.log(`Task end date pick attempt ${attempt + 1} failed: ${error.message}`);
        await this.page.keyboard.press('Escape').catch(() => {});
        picked = this.weekdayDateAfter(base, attempt + 1, 15);
        await this._openScheduleCreateFormTaskEndDatePicker();
      }
    }

    await expect(this._scheduleDatePickerPopper()).toBeHidden({ timeout: 10000 }).catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.logStep('Picked random end date time on task');
  }

  async _resolveScheduleCreateFormPhaseCombobox() {
    const panel = await this.activeFormPanel();
    await this.hideFreshchatWidget();

    let combo = panel.getByRole('combobox', { name: /^phase$/i }).first();
    if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) return combo;

    combo = panel.getByLabel(/^phase$/i).first();
    if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) return combo;

    const lbl = panel
      .locator('label, .fw-500, .MuiFormLabel-root, p, span')
      .filter({ hasText: /^phase\b/i })
      .first();
    if (await lbl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fromLabel = lbl.locator('xpath=following::*[@role="combobox"][1]').first();
      if (await fromLabel.isVisible({ timeout: 2000 }).catch(() => false)) return fromLabel;
      const input = lbl.locator('xpath=following::input[1]').first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) return input;
      const muiInput = lbl
        .locator('xpath=following::*[contains(@class,"MuiInputBase-root")][1]')
        .first();
      if (await muiInput.isVisible({ timeout: 2000 }).catch(() => false)) return muiInput;
    }

    try {
      const region = await this._scheduleCreateFormLabeledFieldContainer(/^phase\b/i);
      combo = region.getByRole('combobox').first();
      if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) return combo;
      const muiSelect = region.locator('.MuiSelect-select, .MuiAutocomplete-input').first();
      if (await muiSelect.isVisible({ timeout: 1500 }).catch(() => false)) return muiSelect;
    } catch {
      // Phase label not in this form variant — fall through to default locator.
    }

    return panel.getByLabel(/^phase$/i).first();
  }

  async selectRandomPhaseOnScheduleCreateForm() {
    const combo = await this._resolveScheduleCreateFormPhaseCombobox();
    await expect(combo).toBeVisible({ timeout: 20000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: 15000 });

    const surface = this.page.getByRole('listbox').last();
    await expect(surface).toBeVisible({ timeout: 15000 });
    const options = surface.locator('[role="option"], .MuiMenuItem-root, li').filter({ visible: true });
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
    const idx = Math.floor(Math.random() * count);
    const picked = options.nth(idx);
    const name = ((await picked.innerText()) || '').trim();
    await picked.click({ force: true });
    await this.logStep(`Selected phase: ${name}`);
    await new Promise((r) => setTimeout(r, 500));
    const listboxStillOpen = await this.page.getByRole('listbox').last().isVisible({ timeout: 1000 }).catch(() => false);
    if (listboxStillOpen) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    return name;
  }

  async selectRandomExistingTaskOnScheduleCreateForm() {
    const panel = this.formPanel();
    await this.hideFreshchatWidget();
    await this.expandScheduleCreateFormAdditionalDetails();
    const addTaskBtn = await this._findScheduleCreateFormAddTaskButton();
    await addTaskBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addTaskBtn.click({ force: true, timeout: 15000 });
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(8);

    let combo = panel.getByRole('combobox', { name: /task|select task|existing/i }).last();
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.getByLabel(/^task$/i).last();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      const taskLabel = panel
        .locator('label, .MuiFormLabel-root, p, span')
        .filter({ hasText: /^task\b|select\s*task|existing\s*task/i })
        .last();
      if (await taskLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskLabel.scrollIntoViewIfNeeded().catch(() => {});
        combo = taskLabel
          .locator('xpath=following::*[@role="combobox" or self::input][1]')
          .first();
      }
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel
        .locator('.MuiAccordionDetails-root, .MuiCollapse-entered')
        .last()
        .locator('[role="combobox"], input[placeholder*="task" i], input')
        .last();
    }
    await expect(combo).toBeVisible({ timeout: 20000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: 15000 });

    const surface = this.page.getByRole('listbox').last();
    await expect(surface).toBeVisible({ timeout: 15000 });
    const options = surface.locator('[role="option"], .MuiMenuItem-root, li').filter({ visible: true });
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
    const idx = Math.floor(Math.random() * count);
    const picked = options.nth(idx);
    const name = ((await picked.innerText()) || '').trim();
    await picked.click({ force: true });
    this.lastSelectedExistingTaskName = name;
    await this.logStep(`Selected existing task: ${name}`);
    await new Promise((r) => setTimeout(r, 500));
    const listboxStillOpen = await this.page.getByRole('listbox').last().isVisible({ timeout: 1000 }).catch(() => false);
    if (listboxStillOpen) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    return name;
  }

  async addRandomReminderOnScheduleCreateForm(min = 1, max = 30) {
    await this.hideFreshchatWidget();
    await this._scrollScheduleCreateFormToBottom();
    await this._wheelScrollScheduleDrawer(8);

    const panel = this.formPanel();
    let addBtn = panel.getByRole('button', { name: /add reminder/i }).first();
    if (!(await addBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      addBtn = panel.locator('button').filter({ hasText: /reminder/i }).first()
        .or(this.page.getByRole('button', { name: /add reminder/i }).first());
    }
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addBtn.click({ force: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const n = min + Math.floor(Math.random() * (max - min + 1));
    let input = panel.getByPlaceholder(/^time$/i).last();
    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) {
      input = panel.getByLabel(/reminder/i).last();
    }
    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) {
      input = panel.locator('input[type="number"]').last();
    }
    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) {
      input = this.page.getByPlaceholder(/^time$/i).last();
    }
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(String(n));
    await this.logStep(`Entered reminder: ${n}`);
    return n;
  }

  async setScheduleCreateFormReminderUnitToWeeks() {
    const panel = this.formPanel();
    await this.hideFreshchatWidget();

    let combo = panel.getByRole('combobox', { name: /^days?$/i }).last();
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.getByLabel(/^days?$/i).last();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.locator('.MuiSelect-select').filter({ hasText: /day/i }).last();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.locator('.MuiSelect-select').last();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.getByText(/^days?$/i).last();
    }
    await expect(combo).toBeVisible({ timeout: 15000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: 15000 });
    await this._clickLastFormDropdownOption(/week/i);
    await this.logStep('Selected reminder unit: Week(s)');
  }

  async clickGanttSidebarAddMilestone() {
    const panel = this.ganttSidebar();
    await expect(panel.getByRole('button', { name: /add milestone/i })).toBeVisible({
      timeout: this.uiTimeout,
    });
    await panel.getByRole('button', { name: /add milestone/i }).click();
  }

  async expectQuickAddMilestoneFieldVisible() {
    const panel = this.ganttSidebar();
    await expect(
      panel.getByPlaceholder(/add milestone|milestone/i).or(panel.locator('input:visible').last())
    ).toBeVisible({ timeout: 20000 });
  }

  async fillGanttSidebarQuickAddMilestoneName(name) {
    const panel = this.ganttSidebar();
    const input = panel
      .getByPlaceholder(/add milestone|milestone/i)
      .or(panel.locator('input:visible').last())
      .first();
    await expect(input).toBeVisible({ timeout: 20000 });
    await input.fill(name);
  }

  async confirmGanttSidebarQuickAddMilestoneWithTick() {
    const input = this.page
      .locator('input[placeholder*="Milestone" i], input[placeholder*="milestone" i]')
      .first();
    await expect(input).toBeVisible({ timeout: 20000 });
    const quickRowTable = this.page.locator('table').filter({ has: input });
    await expect(quickRowTable).toHaveCount(1);
    await quickRowTable.locator('.MuiIconButton-root').first().click();
    await expect(input).toBeHidden({ timeout: 60000 }).catch(async () => {
      await input.waitFor({ state: 'detached', timeout: 60000 });
    });
  }

  async expectAddMilestoneOffCanvasOpen() {
    await expect(this.addMilestonePanelHeading().or(this.formPanel()).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
  }

  async selectPhaseNamedOnScheduleCreateForm(phaseName) {
    const combo = await this._resolveScheduleCreateFormPhaseCombobox();
    await expect(combo).toBeVisible({ timeout: 20000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: 15000 });

    const looseRe = new RegExp(
      phaseName.replace(/\s+/g, '\\s*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    const listbox = this.page.getByRole('listbox').last();
    await listbox.waitFor({ state: 'visible', timeout: 15000 }).catch(async () => {
      await combo.click({ force: true, timeout: 10000 }).catch(() => {});
      await expect(listbox).toBeVisible({ timeout: 10000 });
    });

    const normalizedTarget = phaseName.trim().toLowerCase();
    const pickNamedPhase = async () => {
      const tryClick = async (option) => {
        if (!(await option.isVisible({ timeout: 1500 }).catch(() => false))) return false;
        await option.scrollIntoViewIfNeeded().catch(() => {});
        await option.click({ force: true });
        return true;
      };

      if (await tryClick(listbox.getByRole('option', { name: looseRe }).first())) return;
      if (await tryClick(this.page.getByRole('option', { name: looseRe }).first())) return;

      const items = listbox.locator('[role="option"], .MuiMenuItem-root, li');
      const count = await items.count();
      for (let i = 0; i < count; i += 1) {
        const item = items.nth(i);
        const text = ((await item.innerText().catch(() => '')) || '').trim();
        if (text.toLowerCase() === normalizedTarget || looseRe.test(text)) {
          await item.click({ force: true });
          return;
        }
      }

      const scrolled = await this._findScrollableListboxOption(listbox, looseRe);
      if (await tryClick(scrolled)) return;

      const optionTexts = await items.allInnerTexts().catch(() => []);
      throw new Error(
        `Phase "${phaseName}" not found. Visible options: ${optionTexts.filter(Boolean).slice(0, 25).join(' | ') || '(none)'}`
      );
    };

    try {
      await pickNamedPhase();
    } catch (firstErr) {
      const typeTarget = combo.locator('input, textarea').first();
      if (await typeTarget.isVisible({ timeout: 1500 }).catch(() => false)) {
        await typeTarget.fill('');
        await typeTarget.pressSequentially(phaseName, { delay: 40 });
        await new Promise((r) => setTimeout(r, 1000));
        await pickNamedPhase();
      } else {
        throw firstErr;
      }
    }

    await this.logStep(`Selected phase: ${phaseName}`);
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async updateSchedulePhaseToNamedFromListRowMenu(scheduleName, phaseName) {
    await this.openEditForListSchedule(scheduleName);
    await this.selectPhaseNamedOnScheduleCreateForm(phaseName);
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(scheduleName);
  }

  async updateNamedScheduleStartDateFromListRowMenu(name) {
    await this.openEditForListSchedule(name);
    await this.pickRandomStartDateTimeOnScheduleCreateForm();
    const isMilestone =
      this._looksLikeMilestoneName(name) || (await this._isMilestoneScheduleFormWithoutEndDate());
    if (!isMilestone) {
      await this.pickRandomEndDateTimeAfterStartOnScheduleCreateForm();
    }
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async updateNamedScheduleDescriptionFromListRowMenu(name) {
    await this.openEditForListSchedule(name);
    await this.fillRandomDescriptionOnScheduleCreateForm();
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async addExistingTaskToNamedScheduleFromListRowMenu(name) {
    await this.openEditForListSchedule(name);
    await this.expandScheduleCreateFormAdditionalDetails();
    await this.selectRandomExistingTaskOnScheduleCreateForm();
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async addReminderToNamedScheduleFromListRowMenu(name) {
    await this.openEditForListSchedule(name);
    await this.expandScheduleCreateFormAdditionalDetails();
    await this.addRandomReminderOnScheduleCreateForm();
    await this.submitPanelPrimary();
    await this.searchListTabScheduleIfAvailable(name);
  }

  async deleteNamedItemFromGanttSidebarMenu(name) {
    await this.switchToGanttView();
    await this.searchGanttSidebarScheduleIfAvailable(name);
    const row = this.ganttSidebarRow(name);
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await this._openGanttSidebarRowActionsMenu(row);
    await this._clickDeleteInOpenActionsMenu();
    await this._confirmDeleteSchedulePopup();
    await this.logStep(`Deleted from gantt sidebar menu: ${name}`);
  }

  async enableScheduleLiveModeToggle() {
    await this.switchToGanttView();
    const switchRoot = this.page.locator('.MuiSwitch-root').first();
    const switchInput = switchRoot.locator('input[type="checkbox"]').first();
    const checked = await switchInput.isChecked().catch(() => false);
    if (!checked) {
      await switchRoot.click({ force: true, timeout: this.quickTimeout });
      const yes = this.page.getByRole('button', { name: /^yes$/i }).first();
      if (await yes.isVisible({ timeout: 5000 }).catch(() => false)) {
        await yes.click({ force: true });
      }
    }
    await this.logStep('Enabled schedule live mode toggle');
  }

  async openActivityTrackerFromSidebar() {
    const link = this.page
      .getByRole('link', { name: /activity tracker/i })
      .or(this.page.locator('a, [role="button"]').filter({ hasText: /^activity tracker$/i }))
      .first();
    await expect(link).toBeVisible({ timeout: 30000 });
    await link.click({ force: true, timeout: this.quickTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Opened Activity Tracker from sidebar');
  }

  async expectActivityLogContains(text) {
    const needle = String(text || '').trim();
    await expect(this.page.getByText(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first()).toBeVisible({
      timeout: 60000,
    });
    await this.logStep(`Activity log contains: ${needle}`);
  }

  async openWorkingCalendarDialog() {
    await this.switchToGanttView();
    const btn = this.page
      .getByRole('button', { name: /working calendar/i })
      .or(this.page.locator('button[aria-label*="Working Calendar" i]'))
      .first();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await btn.click({ force: true, timeout: this.quickTimeout });
    const dialog = this.page.getByRole('dialog').filter({ hasText: /working calendar/i }).last();
    await expect(dialog).toBeVisible({ timeout: 15000 });
  }

  _workingCalendarDialog() {
    return this.page.getByRole('dialog').filter({ hasText: /working calendar/i }).last();
  }

  async toggleWorkingCalendarDays(dayNames) {
    const dialog = this._workingCalendarDialog();
    for (const day of dayNames) {
      const tile = dialog.getByText(new RegExp(`^${day}$`, 'i')).first();
      await tile.scrollIntoViewIfNeeded().catch(() => {});
      await tile.click({ force: true, timeout: this.quickTimeout });
    }
    await this.logStep(`Toggled working calendar days: ${dayNames.join(', ')}`);
  }

  async saveWorkingCalendarDialog() {
    const dialog = this._workingCalendarDialog();
    await dialog.getByRole('button', { name: /^save$/i }).click({ force: true, timeout: this.quickTimeout });
    await this._waitScheduleSettled();
  }

  async expectWorkingCalendarUpdatedToast() {
    await expect(
      this.page.getByText(/working calendar updated successfully/i).first()
    ).toBeVisible({ timeout: 20000 });
  }

  async expectWorkingCalendarDaySelected(dayName, selected) {
    const dialog = this._workingCalendarDialog();
    const tile = dialog.getByText(new RegExp(`^${dayName}$`, 'i')).first();
    const box = tile.locator('xpath=ancestor::div[contains(@class,"MuiBox-root")][1]').first();
    const bg = ((await box.evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '')) || '').trim();
    if (selected) {
      expect(bg).not.toBe('');
    }
  }

  async addWorkingCalendarPublicHoliday(holidayName) {
    const dialog = this._workingCalendarDialog();
    const nameField = dialog.getByPlaceholder(/holiday name/i).or(dialog.locator('input').first());
    await nameField.fill(holidayName);
    const dateField = dialog.locator('input[placeholder*="date" i], input[placeholder*="Select" i]').last();
    if (await dateField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateField.click({ force: true });
      const todayCell = this.page.locator('.MuiPickersDay-root:not(.Mui-disabled)').first();
      if (await todayCell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await todayCell.click({ force: true });
      }
    }
    await dialog.getByRole('button', { name: /^add$/i }).click({ force: true });
    await expect(dialog.getByText(holidayName).first()).toBeVisible({ timeout: 10000 });
    await this.logStep(`Added working calendar holiday: ${holidayName}`);
  }

  async removeFirstWorkingCalendarPublicHoliday() {
    const dialog = this._workingCalendarDialog();
    const deleteBtn = dialog.getByRole('button', { name: /delete/i }).first();
    await deleteBtn.click({ force: true, timeout: this.quickTimeout });
  }

  async setWorkingCalendarStartTimeToAm() {
    const dialog = this._workingCalendarDialog();
    const startPicker = dialog.locator('.MuiInputBase-root input').first();
    await startPicker.click({ force: true });
    await startPicker.fill('09:00 AM');
    await startPicker.press('Enter').catch(() => {});
  }

  async setWorkingCalendarEndTimeToPm() {
    const dialog = this._workingCalendarDialog();
    const endPicker = dialog.locator('.MuiInputBase-root input').nth(1);
    await endPicker.click({ force: true });
    await endPicker.fill('06:00 PM');
    await endPicker.press('Enter').catch(() => {});
  }

  async expectTodayIndicatorVisibleInGanttChart() {
    const tl = this.ganttTimelineHost();
    await expect(tl.getByText(/^today$/i).first()).toBeVisible({ timeout: 30000 });
    await this.logStep('Today indicator visible in gantt chart');
  }

  async clickBackFromProjectModule() {
    await this.dismissOpenOverlays();
    this._wasOnScheduleModule = true;
    await this.logStep('Clicked Back');
  }

  async openTaskModuleFromProjectManagement() {
    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    const currentUrl = this.page.url();
    const projectBaseMatch = currentUrl.match(/(.*\/project\/[^/]+)/);
    if (projectBaseMatch) {
      await this.page.goto(projectBaseMatch[1], { waitUntil: 'domcontentloaded' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 3000));
    }

    const pmBtn = profile.projectManagementHeading;
    if (!(await pmBtn.isVisible({ timeout: 10000 }).catch(() => false))) {
      const ProjectNavigationPage = require('../../ProjectNavigationPage');
      const nav = new ProjectNavigationPage(this.page);
      const sidebarLink = nav.projectsLink;
      if (await sidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await sidebarLink.click({ force: true });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));
      }
      const projectRow = nav.firstProject;
      if (await projectRow.isVisible({ timeout: 10000 }).catch(() => false)) {
        await projectRow.click({ timeout: 15000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (await pmBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await pmBtn.click({ force: true, timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1000));
    }

    await profile.clickModuleCard('Task');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.logStep('Opened Task module');
  }
}

module.exports = SchedulePage;
