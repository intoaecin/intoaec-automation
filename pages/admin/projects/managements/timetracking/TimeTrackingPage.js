// pages/admin/projects/managements/timetracking/TimeTrackingPage.js
const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

class TimeTrackingPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    // --- Navigation ---
    // Sidebar nav item for Clients/Projects
    this.clientsTab = page.getByLabel('Clients/Projects').first();
    // First client name cell in the table
    this.firstClientRow = page.locator('th[scope="row"] span.text-dark').first();
    // Time Tracking menu card – a <p> tag inside a MuiBox card tile
    this.timeTrackingLink = page.locator('p.MuiTypography-body1:has-text("Time Tracking")').first();

    // --- Create Timesheet Drawer ---
    // The "Create" button that opens the drawer (top-right in the list view)
    this.createButton = page.locator('button.btnPrimaryUI:has-text("Create"), button:has-text("Create Time Sheet"), button:has-text("Create")').first();

    // "Get Started" Dialog options
    this.startFromScratchCard = page.locator('p:has-text("Start from Scratch"), .MuiCard-root:has-text("Start from Scratch")').first();
    this.proceedButton = page.locator('button:has-text("Proceed")').first();

    // Mandatory fields inside the drawer
    this.productInfoSection = page.locator('section[id="product information"]').first();
    // User – MUI Select combobox (role="combobox" inside the drawer)
    this.userDropdown = this.productInfoSection.locator('[role="combobox"]').first();
    this.dateInput = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Date")]/following::input[1]'
      )
      .first();
    this.startTimeInput = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Start Time")]/following::input[1]'
      )
      .first();
    this.endTimeInput = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"End Time")]/following::input[1]'
      )
      .first();
    this.datePickerButton = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Date")]/following::button[@aria-label="Choose date"][1]'
      )
      .first();

    // Title of the drawer that opens after selection
    this.drawerTitle = page.locator('h6:has-text("Create Time Sheet")').first();

    // Optional fields
    this.descriptionInput = page.locator('textarea[placeholder="Description"]').first();

    // Submit (Create) button inside the drawer header
    this.submitButton = page.locator('.boqUI button.btnPrimaryUI:has-text("Create")').first();

    // Success feedback – MUI snackbar / alert or row in table
    this.successToast = page.locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]').first();

    // --- Edit / detail (after opening a row) ---
    this.timesheetTableRows = page.locator('tbody tr');
    this.actionMenu = page.locator('[role="menu"]').first();
    this.saveOrUpdateButton = page
      .getByRole('button', { name: /save|update|apply/i })
      .or(page.locator('.boqUI button.btnPrimaryUI:has-text("Save"), button.btnPrimaryUI:has-text("Update")'))
      .first();

    /** Last random values for assertions */
    this.lastEditDescription = null;
    this.lastRandomCost = null;
  }

  randomSuffix() {
    return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  async setPickerInputValue(locator, value) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});

    const input = locator.first();
    const setByDom = async () => {
      await input.evaluate((el, nextValue) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(el, nextValue);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: nextValue }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, value);
    };

    try {
      await input.click({ force: true });
      await input.press('Control+A').catch(() => {});
      await input.fill(value);
      await input.press('Tab').catch(() => {});
    } catch {
      await setByDom();
    }

    let current = await input.inputValue().catch(() => '');
    let domVal = await input.evaluate((el) => (el && 'value' in el ? el.value : '') || '').catch(() => '');
    if (current.trim().length === 0 && String(domVal).trim().length === 0) {
      await setByDom();
      current = await input.inputValue().catch(() => '');
      domVal = await input.evaluate((el) => (el && 'value' in el ? el.value : '') || '').catch(() => '');
    }

    await expect(async () => {
      const c = await input.inputValue().catch(() => '');
      const d = await input.evaluate((el) => (el && 'value' in el ? el.value : '') || '').catch(() => '');
      expect(c.trim().length > 0 || String(d).trim().length > 0).toBeTruthy();
    }).toPass({ timeout: 10000, intervals: [300, 700, 1200] });
  }

  formatDateWithinAllowedRange(offsetDays = 0, output = 'MM/DD/YYYY') {
    const target = new Date();
    target.setDate(target.getDate() + Math.min(0, offsetDays));
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const yyyy = target.getFullYear();
    if (output === 'YYYY-MM-DD') {
      return `${yyyy}-${mm}-${dd}`;
    }
    return `${mm}/${dd}/${yyyy}`;
  }

  buildDefaultTimes() {
    return {
      start24: '09:00',
      end24: '17:00',
      start12: '09:00 AM',
      end12: '05:00 PM',
    };
  }

  async setTimeValue(locator, hhmm24, hhmm12) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    const type = (await locator.getAttribute('type').catch(() => '')) || '';
    const pick = type.toLowerCase() === 'time' ? hhmm24 : hhmm12;
    await this.setPickerInputValue(locator, pick);
  }

  async tryPickDateFromCalendar(targetDate) {
    const openCalendar = async () => {
      if (await this.datePickerButton.isVisible().catch(() => false)) {
        await this.datePickerButton.click().catch(() => {});
        return true;
      }
      if (await this.dateInput.isVisible().catch(() => false)) {
        await this.dateInput.click().catch(() => {});
        return true;
      }
      return false;
    };

    if (!(await openCalendar())) {
      return false;
    }
    await this.page.waitForTimeout(400);
    await this.page
      .locator('.MuiPickersPopper-root, .MuiPopover-root [role="dialog"], [role="dialog"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});

    const day = String(targetDate.getDate());
    const dayButton = this.page.getByRole('gridcell', { name: day, exact: true }).first();
    if (await dayButton.isVisible().catch(() => false)) {
      await dayButton.click().catch(() => {});
      await this.page.waitForTimeout(400);
      return true;
    }
    const dayFallback = this.page.getByRole('button', { name: new RegExp(`^${day}$`) }).first();
    if (await dayFallback.isVisible().catch(() => false)) {
      await dayFallback.click().catch(() => {});
      await this.page.waitForTimeout(400);
      return true;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  async goToClients() {
    await expect(this.clientsTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.clientsTab.click();
  }

  async selectFirstClient() {
    await expect(this.firstClientRow).toBeVisible({ timeout: this.defaultTimeout });
    await this.firstClientRow.click();
  }

  async openTimeTracking() {
    await expect(this.timeTrackingLink).toBeVisible({ timeout: this.defaultTimeout });
    await this.timeTrackingLink.click();
  }

  async clickCreate() {
    // Small wait for UI stability as requested
    await this.page.waitForTimeout(2000);

    // 1. Click the main "Create" button if visible
    if (await this.createButton.isVisible()) {
      await this.createButton.click();
    }

    // 2. If the "Get Started" dialog appears, select "Start from Scratch"
    await this.page.waitForTimeout(1000);
    if (await this.startFromScratchCard.isVisible()) {
      await this.startFromScratchCard.click();
      
      // 3. Click the "Proceed" button (usually enabled after selection)
      await expect(this.proceedButton).toBeVisible({ timeout: 5000 });
      await this.proceedButton.click();
    }

    // 4. Ensure the drawer actually opened (verify "Create Time Sheet" header)
    await expect(this.drawerTitle).toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * Fill mandatory fields in the Create Time Sheet drawer.
   * @param {string} date      - e.g. '06 April 2026'
   * @param {string} startTime - e.g. '09:00 AM'
   * @param {string} endTime   - e.g. '05:00 PM'
   */
  async fillMandatoryFields(date, startTime, endTime, pastDays = 0) {
    // Stabilization wait for the drawer/form to be fully interactive
    await this.page.waitForTimeout(3000);
    await expect(this.productInfoSection).toBeVisible({ timeout: this.defaultTimeout });

    // User – select the first option from the dropdown
    await expect(this.userDropdown).toBeVisible({ timeout: this.defaultTimeout });
    await this.userDropdown.click();
    // Pick first item in the listbox that opens
    const firstOption = this.page.locator('[role="listbox"] [role="option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    await firstOption.click();

    // Date / time pickers are MUI inputs; set the text value directly to avoid picker popups stealing scroll.
    await this.page.waitForTimeout(1000);
    if (await this.datePickerButton.isVisible().catch(() => false)) {
      await this.datePickerButton.click().catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + Math.min(0, Number(pastDays) || 0));
    const desiredDate = date || this.formatDateWithinAllowedRange(pastDays, 'MM/DD/YYYY');

    const pickedByCalendar = await this.tryPickDateFromCalendar(dateObj);
    if (!pickedByCalendar) {
      const dateType = (await this.dateInput.getAttribute('type').catch(() => '')) || '';
      const fallbackDate =
        dateType.toLowerCase() === 'date'
          ? this.formatDateWithinAllowedRange(pastDays, 'YYYY-MM-DD')
          : desiredDate;
      await this.setPickerInputValue(this.dateInput, fallbackDate);
    }

    const defaults = this.buildDefaultTimes();
    const start24 = (startTime && /am|pm/i.test(startTime)) ? defaults.start24 : (startTime || defaults.start24);
    const end24 = (endTime && /am|pm/i.test(endTime)) ? defaults.end24 : (endTime || defaults.end24);
    const start12 = (startTime && /am|pm/i.test(startTime)) ? startTime : defaults.start12;
    const end12 = (endTime && /am|pm/i.test(endTime)) ? endTime : defaults.end12;

    await this.setTimeValue(this.startTimeInput, start24, start12);
    await this.setTimeValue(this.endTimeInput, end24, end12);
  }

  async submitForm() {
    await expect(this.submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.submitButton.click();
  }

  async isTimesheetCreatedSuccessfully() {
    await expect(this.drawerTitle).toBeHidden({ timeout: 60000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(500);

    try {
      await this.successToast.waitFor({ state: 'visible', timeout: 20000 });
      return await this.successToast.isVisible();
    } catch {
      const rows = this.page.locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 30000 });
      return (await rows.count()) > 0;
    }
  }

  /**
   * Clicks the row overflow control (MUI three-dots / "more" menu) on the given table row.
   * @returns {Promise<boolean>} true if the menu opened
   */
  async tryClickRowOverflowMenu(row) {
    const candidates = [
      row.getByRole('button', { name: /more|open menu|actions|options|menu/i }),
      row.locator('button[aria-haspopup="true"]'),
      row.locator('button[aria-label*="more" i]'),
      row.locator('button').filter({ has: row.locator('svg[data-testid="MoreVertIcon"]') }),
      row.locator('button').last(),
    ];

    for (const loc of candidates) {
      const btn = loc.first();
      if (!(await btn.isVisible().catch(() => false))) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(300);
      if (await this.actionMenu.isVisible().catch(() => false)) {
        return true;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    return false;
  }

  /** Open the most recently created row (first row in list; list is usually newest-first). */
  async openCreatedTimesheet() {
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(800);
    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    const link = row.getByRole('link').first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
    } else {
      await row.click();
    }
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  async clickEditOnTimesheet() {
    await expect(this.drawerTitle).toBeHidden({ timeout: 5000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    const opened = await this.tryClickRowOverflowMenu(row);
    if (!opened) {
      throw new Error(
        'Could not open the row action menu (three dots). Ensure the timesheet list is visible and you did not navigate to a detail page before this step.'
      );
    }

    const editItem = this.page
      .getByRole('menuitem', { name: /edit/i })
      .or(this.page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /edit/i }))
      .first();
    await expect(editItem).toBeVisible({ timeout: this.defaultTimeout });
    await editItem.click();
    await this.page.waitForTimeout(800);
    await expect(this.productInfoSection).toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * Change user, date, start/end relative to defaults (updates prefilled values).
   */
  async updateAllPrefilledFields() {
    await expect(this.productInfoSection).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(500);

    await expect(this.userDropdown).toBeVisible({ timeout: this.defaultTimeout });
    await this.userDropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]');
    await expect(async () => {
      expect(await options.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [300, 600] });
    const n = await options.count();
    const pick = n > 1 ? 1 : 0;
    await options.nth(pick).click();

    const pastDays = Number(process.env.TIMESHEET_EDIT_PAST_DAYS ?? 1);
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + Math.min(0, pastDays));

    // Do not open+Escape the date picker here — that closes the calendar before tryPickDateFromCalendar runs.
    const picked = await this.tryPickDateFromCalendar(dateObj);
    if (!picked) {
      const dateType = (await this.dateInput.getAttribute('type').catch(() => '')) || '';
      const val =
        dateType.toLowerCase() === 'date'
          ? this.formatDateWithinAllowedRange(pastDays, 'YYYY-MM-DD')
          : this.formatDateWithinAllowedRange(pastDays, 'MM/DD/YYYY');
      await this.setPickerInputValue(this.dateInput, val);
    }

    await this.setTimeValue(this.startTimeInput, '10:00', '10:00 AM');
    await this.setTimeValue(this.endTimeInput, '18:00', '06:00 PM');
  }

  /** Break time — common label patterns in timesheet forms. */
  async addBreakTimeStartAndEnd() {
    const scope = this.productInfoSection.or(this.page.locator('form').first());
    const bs = scope.getByLabel(/break\s*start|start\s*break|break\s*from/i).first();
    const be = scope.getByLabel(/break\s*end|end\s*break|break\s*to/i).first();

    if (await bs.isVisible().catch(() => false)) {
      await this.setTimeValue(bs, '12:00', '12:00 PM');
    }
    if (await be.isVisible().catch(() => false)) {
      await this.setTimeValue(be, '12:30', '12:30 PM');
    }
  }

  async selectRandomAecWorkCategory() {
    const page = this.page;
    const combo = this.productInfoSection
      .getByRole('combobox', { name: /aec|work\s*category|category|type/i })
      .or(page.getByRole('combobox', { name: /aec|work\s*category|category/i }))
      .first();

    if (!(await combo.isVisible().catch(() => false))) {
      const anyCombo = this.productInfoSection.locator('[role="combobox"]').last();
      await expect(anyCombo).toBeVisible({ timeout: 15000 });
      await anyCombo.click();
    } else {
      await combo.click();
    }

    await page.waitForTimeout(300);
    const opts = page.locator('[role="listbox"] [role="option"]');
    await expect(async () => {
      expect(await opts.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [300, 600] });

    const aec = opts.filter({ hasText: /aec/i });
    const countAec = await aec.count();
    const pool = countAec > 0 ? aec : opts;
    const n = await pool.count();
    const idx = Math.floor(Math.random() * n);
    await pool.nth(idx).click();
  }

  async updateCostWithRandomValue() {
    const cost = this.productInfoSection
      .getByLabel(/cost|amount|rate|price/i)
      .or(this.page.locator('section[id="product information"] input[type="number"]').first())
      .first();
    await expect(cost).toBeVisible({ timeout: this.defaultTimeout });
    const value = String(50 + Math.floor(Math.random() * 950));
    this.lastRandomCost = value;
    await cost.click();
    await cost.press('Control+A').catch(() => {});
    await cost.fill(value);
    await cost.press('Tab').catch(() => {});
  }

  async scrollAndEnterRandomDashboardDescription() {
    const page = this.page;
    const text = `Dashboard note ${this.randomSuffix()}`;
    this.lastEditDescription = text;

    const dashboardTa = page
      .locator('[class*="dashboard" i] textarea, [id*="dashboard" i] textarea')
      .first();
    let primary = dashboardTa;
    if (!(await dashboardTa.isVisible().catch(() => false))) {
      primary = page.locator('main textarea, [role="main"] textarea').last();
    }
    if (!(await primary.isVisible().catch(() => false))) {
      primary = this.descriptionInput;
    }

    await expect(primary).toBeVisible({ timeout: this.defaultTimeout });
    await primary.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
    await primary.click();
    await primary.fill(text);
  }

  async saveTimesheetChanges() {
    await expect(this.saveOrUpdateButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveOrUpdateButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.saveOrUpdateButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  async verifyTimesheetUpdatedSuccessfully() {
    await expect(async () => {
      const toastOk = await this.successToast.isVisible().catch(() => false);
      const textOk = this.lastEditDescription
        ? await this.page.getByText(this.lastEditDescription, { exact: false }).first().isVisible().catch(() => false)
        : false;
      const updatedCopy = await this.page
        .getByText(/updated|saved|successfully/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(toastOk || textOk || updatedCopy).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = TimeTrackingPage;
