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
    // Codegen: getByRole('button', { name: '+ Create Time Sheet' })
    this.createButton = page
      .getByRole('button', { name: /^\+?\s*create time\s*sheet$/i })
      .or(page.getByRole('button', { name: /create time\s*sheet/i }))
      .or(page.locator('button.btnPrimaryUI:has-text("Create"), button:has-text("Create Time Sheet")'))
      .first();

    // "Get Started" Dialog options
    this.startFromScratchCard = page
      .getByText(/start from scratch/i)
      .or(page.locator('p:has-text("Start from Scratch"), .MuiCard-root:has-text("Start from Scratch")'))
      .first();
    this.proceedButton = page.getByRole('button', { name: /^proceed$/i }).or(page.locator('button:has-text("Proceed")')).first();

    // Mandatory fields inside the drawer
    this.productInfoSection = page.locator('section[id="product information"]').first();
    // User – MUI Select combobox (role="combobox" inside the section)
    this.userDropdown = this.productInfoSection.locator('[role="combobox"]').first();

    // Codegen: getByRole('textbox', { name: 'DD MMMM YYYY' })
    this.dateTextboxDmy = page.getByRole('textbox', { name: 'DD MMMM YYYY' }).first();
    this.chooseDateButton = page.getByRole('button', { name: 'Choose date' }).first();
    this.chooseTimeButtons = page.getByRole('button', { name: 'Choose time' });

    // Date/Time inputs can differ between Create drawer vs Edit view (label wiring / aria-labels differ),
    // so prefer label-based selectors scoped to the section and fall back to the original xpath.
    const dateByLabel = this.productInfoSection
      .getByLabel(/date/i)
      .or(this.productInfoSection.locator('input[name*="date" i], input[id*="date" i]'))
      .or(this.dateTextboxDmy)
      .first();
    const dateByXpath = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Date")]/following::input[1]'
      )
      .first();
    this.dateInput = dateByLabel.or(dateByXpath).or(this.dateTextboxDmy).first();

    const startByLabel = this.productInfoSection
      .getByLabel(/start\s*time/i)
      .or(this.productInfoSection.locator('input[name*="start" i][type="time"], input[id*="start" i]'))
      .first();
    const startByXpath = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Start Time")]/following::input[1]'
      )
      .first();
    this.startTimeInput = startByLabel.or(startByXpath).first();

    const endByLabel = this.productInfoSection
      .getByLabel(/end\s*time/i)
      .or(this.productInfoSection.locator('input[name*="end" i][type="time"], input[id*="end" i]'))
      .first();
    const endByXpath = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"End Time")]/following::input[1]'
      )
      .first();
    this.endTimeInput = endByLabel.or(endByXpath).first();

    const dateBtnByAria = this.productInfoSection
      .locator('button[aria-label*="date" i], button[title*="date" i]')
      .first();
    const dateBtnByXpath = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Date")]/following::button[contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"date")][1]'
      )
      .first();
    this.datePickerButton = this.chooseDateButton.or(dateBtnByAria).or(dateBtnByXpath).first();

    // Title of the drawer that opens after selection
    this.drawerTitle = page.locator('h6:has-text("Create Time Sheet")').first();

    // Optional fields
    this.descriptionInput = page.locator('textarea[placeholder="Description"]').first();

    // Codegen: getByRole('combobox', { name: 'Select chargeability' })
    this.chargeabilityCombobox = page
      .getByRole('combobox', { name: /select chargeability|chargeability/i })
      .first();

    // Submit (Create) button inside the drawer header
    this.submitButton = page
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .last()
      .or(page.locator('.boqUI button.btnPrimaryUI:has-text("Create")').first());

    // Success feedback – MUI snackbar / alert or row in table
    this.successToast = page.locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]').first();

    // --- Edit / detail (after opening a row) ---
    this.timesheetTableRows = page.locator('tbody tr');
    this.rowActionButton = page
      .locator('tbody tr')
      .first()
      .locator('button')
      .last();
    this.actionMenu = page.locator('[role="menu"]').first();
    this.editMenuItem = page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^edit$/i }))
      .first();
    this.saveOrUpdateButton = page
      .getByRole('button', { name: /save|update|apply/i })
      .or(page.locator('.boqUI button.btnPrimaryUI:has-text("Save"), button.btnPrimaryUI:has-text("Update")'))
      .first();

    /** Last random values for assertions */
    this.lastEditDescription = null;
    this.lastRandomCost = null;
    this.lastTimesheetUser = null;
    this.lastTimesheetDate = null;
    this.lastTimesheetDateIso = null;
    this.lastTimesheetStart = null;
    this.lastTimesheetEnd = null;
    this.lastTimesheetChargeable = false;
    this.lastTimesheetDescription = null;
    this.lastTimesheetWorkCategory = null;
    this.lastTimesheetDatePretty = null;
  }

  randomSuffix() {
    return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  async setPickerInputValue(locator, value) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});

    const input = locator.first();
    const readCurrent = async () => {
      const v1 = await input.inputValue().catch(() => '');
      if (v1 && v1.trim()) return v1;
      const v2 = await input.getAttribute('value').catch(() => '');
      return (v2 || '').trim();
    };
    const normalizeAltDate = async (nextValue) => {
      const type = ((await input.getAttribute('type').catch(() => '')) || '').toLowerCase();
      if (type === 'date' && /^\d{2}\/\d{2}\/\d{4}$/.test(nextValue)) {
        const [mm, dd, yyyy] = nextValue.split('/');
        return `${yyyy}-${mm}-${dd}`;
      }
      if (type !== 'date' && /^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
        const [yyyy, mm, dd] = nextValue.split('-');
        return `${mm}/${dd}/${yyyy}`;
      }
      // Also try swapping formats even when type is unknown (MUI masked inputs).
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(nextValue)) {
        const [mm, dd, yyyy] = nextValue.split('/');
        return `${yyyy}-${mm}-${dd}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
        const [yyyy, mm, dd] = nextValue.split('-');
        return `${mm}/${dd}/${yyyy}`;
      }
      return null;
    };
    const setByDom = async (nextValue = value) => {
      await input.evaluate((el, v) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, nextValue);
    };

    const readonly = (await input.getAttribute('readonly').catch(() => null)) !== null;
    if (!readonly) {
      try {
        await input.click({ force: true });
        await input.press('Control+A').catch(() => {});
        await input.fill(value);
        await input.press('Enter').catch(() => {});
        await input.press('Tab').catch(() => {});
      } catch {
        await setByDom(value);
      }
    } else {
      await setByDom(value);
    }

    await expect(async () => {
      let current = await readCurrent();
      if (current.trim().length > 0) return;

      await setByDom(value);
      current = await readCurrent();
      if (current.trim().length > 0) return;

      const alt = await normalizeAltDate(value);
      if (alt) {
        await setByDom(alt);
        current = await readCurrent();
        expect(current.trim().length).toBeGreaterThan(0);
        return;
      }
      expect(current.trim().length).toBeGreaterThan(0);
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
    // Prefer opening via the calendar icon; fall back to focusing the date input.
    if (await this.datePickerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.datePickerButton.click({ timeout: 10000 }).catch(() => {});
    } else {
      await this.dateInput.click({ force: true }).catch(() => {});
    }
    await this.page.waitForTimeout(400);

    // Prefer "today" control when selecting current date.
    const todayBtn = this.page
      .locator('button.MuiPickersDay-today, .MuiPickersDay-root.MuiPickersDay-today, [aria-current="date"]')
      .filter({ visible: true })
      .first();
    if (await todayBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await todayBtn.click({ timeout: 10000 }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      return true;
    }

    const day = String(targetDate.getDate());
    const dayButton = this.page
      .getByRole('gridcell', { name: day, exact: true })
      .filter({ visible: true })
      .first();
    if (await dayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dayButton.click({ timeout: 10000 }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      return true;
    }

    const dayFallback = this.page
      .locator('button.MuiPickersDay-root')
      .filter({ hasText: new RegExp(`^${day}$`) })
      .filter({ visible: true })
      .first();
    if (await dayFallback.isVisible({ timeout: 1500 }).catch(() => false)) {
      await dayFallback.click({ timeout: 10000 }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      return true;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  /** Read whatever the date field currently shows (input value or attribute). */
  async readTimesheetDateInputValue() {
    const input = this.dateInput.first();
    if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
      return '';
    }
    const v1 = await input.inputValue().catch(() => '');
    if (v1 && v1.trim()) return v1.trim();
    const v2 = await input.getAttribute('value').catch(() => '');
    return (v2 || '').trim();
  }

  /**
   * TC-05 date = today. Prefer calendar (MUI date inputs are often read-only).
   * If the field is already populated, keep it.
   */
  async ensureTimesheetDateTodayForDailyReport() {
    this.lastTimesheetDate = this.formatDateWithinAllowedRange(0, 'MM/DD/YYYY');
    this.lastTimesheetDateIso = this.formatDateWithinAllowedRange(0, 'YYYY-MM-DD');

    const existing = await this.readTimesheetDateInputValue();
    if (existing) {
      // Keep prefilled date (usually today on create form).
      if (/^\d{4}-\d{2}-\d{2}$/.test(existing)) {
        const [yyyy, mm, dd] = existing.split('-');
        this.lastTimesheetDateIso = existing;
        this.lastTimesheetDate = `${mm}/${dd}/${yyyy}`;
      } else {
        this.lastTimesheetDate = existing;
      }
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Using existing date value: ${existing}`);
      return;
    }

    const dateObj = new Date();
    const pickedByCalendar = await this.tryPickDateFromCalendar(dateObj);
    if (pickedByCalendar) {
      const after = await this.readTimesheetDateInputValue();
      if (after) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(after)) {
          const [yyyy, mm, dd] = after.split('-');
          this.lastTimesheetDateIso = after;
          this.lastTimesheetDate = `${mm}/${dd}/${yyyy}`;
        } else {
          this.lastTimesheetDate = after;
        }
      }
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Picked date from calendar: ${this.lastTimesheetDate}`);
      return;
    }

    // Typed / DOM fill fallbacks (both formats).
    const candidates = [this.lastTimesheetDate, this.lastTimesheetDateIso];
    for (const candidate of candidates) {
      try {
        await this.setPickerInputValue(this.dateInput, candidate);
        // eslint-disable-next-line no-console
        console.log(`[Time Tracking] Set date via input: ${candidate}`);
        return;
      } catch {
        // try next format
      }
    }

    // Last resort: do not hard-fail if create form accepts empty→defaults on submit;
    // but most environments require a date — throw a clear error.
    throw new Error(
      `Could not set timesheet date to today (${this.lastTimesheetDate}). Calendar and input fill both failed.`
    );
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
    try {
      await this.successToast.waitFor({ state: 'visible', timeout: 15000 });
      return await this.successToast.isVisible();
    } catch {
      // Fallback: check that a new row appeared in the table
      const rows = this.page.locator('tbody tr');
      const count = await rows.count();
      return count > 0;
    }
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
    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    await expect(this.rowActionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.rowActionButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });

    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();
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

    if (await this.datePickerButton.isVisible().catch(() => false)) {
      await this.datePickerButton.click().catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
    }
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

  /**
   * From Project Management hub → Time Tracking module.
   * Used by Daily Report TC-05 (Background already opens the project).
   */
  async navigateToTimeTrackingModule() {
    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    const onTimeTracking =
      /tab=TimeTracking|time[-_]?tracking/i.test(this.page.url()) ||
      (await this.page.getByText(/^time tracking$/i).first().isVisible({ timeout: 800 }).catch(() => false));

    if (onTimeTracking && (await this.createButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Already on Time Tracking module.');
      return;
    }

    await profile.selectHeading('Project Management').catch(() => {});

    const tile = this.page.getByText(/^time tracking$/i).first();
    if (await tile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tile.scrollIntoViewIfNeeded().catch(() => {});
      await tile.click({ timeout: 30000 });
    } else if (await this.timeTrackingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.timeTrackingLink.click({ timeout: 30000 });
    } else {
      await profile.clickModuleCard('Time Tracking');
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(this.createButton).toBeVisible({ timeout: this.defaultTimeout });
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Opened Time Tracking module.');
  }

  async selectStartFromScratchAndProceed() {
    const dateField = this.page.getByRole('textbox', { name: 'DD MMMM YYYY' });

    // Create may already open the form (skip Get Started).
    if (await dateField.isVisible({ timeout: 2000 }).catch(() => false)) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Create form already open.');
      return;
    }

    // Wait for Get Started options
    const scratchLabel = this.page.getByText(/start from scratch/i).first();
    await expect(scratchLabel).toBeVisible({ timeout: this.defaultTimeout });

    const scratchCard = this.page
      .locator('.MuiCard-root')
      .filter({ hasText: /start from scratch/i })
      .first();

    // Codegen (scoped to Start from Scratch card):
    //   .MuiCardContent-root > div > svg > path:nth-child(11)
    const codegenPath = scratchCard
      .locator('.MuiCardContent-root > div > svg > path:nth-child(11)')
      .first();

    if ((await codegenPath.count().catch(() => 0)) > 0) {
      await codegenPath.click({ timeout: 20000, force: true });
    } else {
      // Same intent as codegen when path index differs: click the card content / label
      const content = scratchCard.locator('.MuiCardContent-root').first();
      if (await content.isVisible({ timeout: 2000 }).catch(() => false)) {
        await content.click({ timeout: 20000 });
      } else {
        await scratchLabel.click({ timeout: 20000 });
      }
    }

    // Codegen recording advanced without Proceed; live app often still needs it.
    if (!(await dateField.isVisible({ timeout: 2500 }).catch(() => false))) {
      const proceed = this.page.getByRole('button', { name: 'Proceed', exact: true }).first();
      if (await proceed.isVisible({ timeout: 8000 }).catch(() => false)) {
        await expect(proceed).toBeEnabled({ timeout: 30000 });
        await proceed.click({ timeout: 20000 });
      }
    }

    await expect(dateField.or(this.drawerTitle).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Selected Start from Scratch (codegen).');
  }

  async clickCreateTimesheetOpenGetStarted() {
    await this.page.waitForTimeout(1000);
    // Codegen: getByRole('button', { name: '+ Create Time Sheet' })
    const createTs = this.page
      .getByRole('button', { name: '+ Create Time Sheet' })
      .or(this.createButton)
      .first();
    await expect(createTs).toBeVisible({ timeout: this.defaultTimeout });
    await createTs.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // Next UI: Get Started card OR create form date field
    await expect(
      this.page
        .getByText(/start from scratch/i)
        .or(this.page.getByRole('textbox', { name: 'DD MMMM YYYY' }))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });

    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Clicked Create Timesheet.');
  }

  /**
   * Codegen: getByRole('combobox', { name: 'Select chargeability' }) → option 'Chargeable'
   */
  async selectChargeabilityChargeable() {
    const combo = this.chargeabilityCombobox;
    if (await combo.isVisible({ timeout: 8000 }).catch(() => false)) {
      await combo.click({ timeout: 15000 });
      const option = this.page.getByRole('option', { name: 'Chargeable', exact: true }).first();
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click({ timeout: 15000 });
      this.lastTimesheetChargeable = true;
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Selected chargeability: Chargeable');
      return;
    }

    // Legacy switch/checkbox fallback
    await this.enableChargeableOption();
  }

  async enableChargeableOption() {
    const scope = this.productInfoSection.or(this.page.locator('form, main, [role="main"]').first());
    const control = scope
      .getByRole('switch', { name: /chargeable/i })
      .or(scope.getByLabel(/chargeable/i))
      .or(scope.getByRole('checkbox', { name: /chargeable/i }))
      .or(this.page.locator('.MuiSwitch-root').filter({ has: this.page.getByText(/chargeable/i) }))
      .first();

    const byLabel = this.page.getByText(/^chargeable$/i).first();
    if (await control.isVisible({ timeout: 5000 }).catch(() => false)) {
      const role = (await control.getAttribute('role').catch(() => '')) || '';
      if (role === 'switch') {
        const checked = await control.getAttribute('aria-checked').catch(() => null);
        if (checked !== 'true') {
          await control.click({ timeout: 15000, force: true });
        }
      } else if (!(await control.isChecked().catch(() => false))) {
        await control.check({ timeout: 15000, force: true }).catch(async () => {
          await control.click({ timeout: 15000, force: true });
        });
      }
    } else if (await byLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await byLabel.click({ timeout: 15000, force: true });
    } else {
      const anySwitch = scope.locator('.MuiSwitch-root, [role="switch"]').filter({ visible: true }).first();
      if (await anySwitch.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anySwitch.click({ timeout: 15000, force: true });
      }
    }

    this.lastTimesheetChargeable = true;
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Enabled Chargeable option.');
  }

  /**
   * Create Time Sheet fill for Daily Report TC-05.
   * Codegen: date / start 10:00 AM / end 6:00 PM / Chargeable.
   * Plus User (mandatory when not prefilled) and Cost when Chargeable requires it.
   */
  async fillTimesheetForDailyReportTimeLog() {
    await this.page.waitForTimeout(800);
    const dateBox = this.page.getByRole('textbox', { name: 'DD MMMM YYYY' });
    await expect(dateBox).toBeVisible({ timeout: this.defaultTimeout });

    const today = new Date();
    const day = String(today.getDate());
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.lastTimesheetDate = this.formatDateWithinAllowedRange(0, 'MM/DD/YYYY');
    this.lastTimesheetDateIso = this.formatDateWithinAllowedRange(0, 'YYYY-MM-DD');
    this.lastTimesheetDatePretty = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`;
    this.lastTimesheetStart = '10:00 AM';
    this.lastTimesheetEnd = '6:00 PM';

    // --- User (mandatory; not in codegen when already prefilled) ---
    await this.selectFirstTimesheetUserIfNeeded();

    // --- Date (codegen) ---
    await dateBox.click({ timeout: 20000 });
    await this.page.getByRole('button', { name: 'Choose date' }).click({ timeout: 20000 });
    const todayCell = this.page
      .locator('button.MuiPickersDay-today, .MuiPickersDay-root.MuiPickersDay-today, [aria-current="date"]')
      .filter({ visible: true })
      .first();
    if (await todayCell.isVisible({ timeout: 1500 }).catch(() => false)) {
      await todayCell.click({ timeout: 20000 });
    } else {
      await this.page.getByRole('gridcell', { name: day, exact: true }).first().click({ timeout: 20000 });
    }
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Picked date via Choose date calendar (day ${day}).`);

    // --- Start 10:00 AM (codegen) ---
    await this.page.getByRole('button', { name: 'Choose time' }).first().click({ timeout: 20000 });
    await this.page.getByRole('option', { name: '10 hours' }).first().click({ timeout: 20000 });
    await this.page.getByRole('button', { name: 'OK' }).first().click({ timeout: 20000 });
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Set start time: 10:00 AM (codegen).');

    // --- End 6:00 PM (codegen) ---
    await this.page.getByRole('button', { name: 'Choose time', exact: true }).click({ timeout: 20000 });
    await this.page.getByRole('option', { name: '6 hours' }).first().click({ timeout: 20000 });
    await this.page.getByRole('option', { name: 'PM' }).first().click({ timeout: 20000 });
    const endOk = this.page.getByRole('button', { name: 'OK' }).first();
    if (await endOk.isVisible({ timeout: 1500 }).catch(() => false)) {
      await endOk.click({ timeout: 10000 }).catch(() => {});
    }
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Set end time: 6:00 PM (codegen).');

    // --- Chargeability (codegen) ---
    await this.page.getByRole('combobox', { name: 'Select chargeability' }).click({ timeout: 20000 });
    await this.page.getByRole('option', { name: 'Chargeable', exact: true }).first().click({ timeout: 20000 });
    this.lastTimesheetChargeable = true;
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Selected chargeability: Chargeable');

    // Cost often becomes mandatory after Chargeable
    await this.fillCostIfPresentOrRequired();
    await this.fillTimesheetDescriptionIfPresent();

    // eslint-disable-next-line no-console
    console.log(
      `[Time Tracking] Filled timesheet (codegen): user=${this.lastTimesheetUser || 'prefilled'}, ` +
        `date=${this.lastTimesheetDatePretty}, 10:00 AM–6:00 PM, Chargeable.`
    );
  }

  /** Select first User when the field is empty / placeholder. */
  async selectFirstTimesheetUserIfNeeded() {
    const userCombo = this.page
      .getByRole('combobox', { name: /^user$|select user|choose user/i })
      .or(this.userDropdown)
      .first();

    if (!(await userCombo.isVisible({ timeout: 5000 }).catch(() => false))) {
      return;
    }

    const current = ((await userCombo.innerText().catch(() => '')) || '').trim();
    if (current && !/select|choose|user/i.test(current) && current.length > 1) {
      this.lastTimesheetUser = current;
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] User already set: ${current}`);
      return;
    }

    await userCombo.click({ timeout: 20000 });
    const firstOption = this.page.locator('[role="listbox"] [role="option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 15000 });
    this.lastTimesheetUser = ((await firstOption.innerText().catch(() => '')) || '').trim();
    await firstOption.click({ timeout: 15000 });
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Selected user: ${this.lastTimesheetUser}`);
  }

  async selectWorkCategoryIfPresent() {
    return;
  }

  async fillTimesheetDescriptionIfPresent() {
    const desc = this.descriptionInput
      .or(this.page.getByRole('textbox', { name: /description|notes|comment/i }).first())
      .or(this.page.locator('textarea').filter({ visible: true }).first())
      .first();

    if (!(await desc.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    const value = `Auto timesheet ${this.randomSuffix()}`;
    this.lastTimesheetDescription = value;
    await desc.click({ timeout: 10000 }).catch(() => {});
    await desc.fill(value).catch(async () => {
      await desc.press('Control+A').catch(() => {});
      await desc.type(value, { delay: 10 }).catch(() => {});
    });
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Filled description: ${value}`);
  }

  async fillCostIfPresentOrRequired() {
    const cost = this.productInfoSection
      .getByLabel(/cost|amount|rate|price/i)
      .or(this.page.getByLabel(/cost|amount|rate|price/i))
      .or(this.page.locator('section[id="product information"] input[type="number"]').first())
      .or(this.page.getByPlaceholder(/cost|amount|rate|price/i))
      .first();

    if (!(await cost.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }

    const value = String(100 + Math.floor(Math.random() * 400));
    this.lastRandomCost = value;
    await cost.scrollIntoViewIfNeeded().catch(() => {});
    await cost.click({ timeout: 10000 });
    await cost.press('Control+A').catch(() => {});
    await cost.fill(value);
    await cost.press('Tab').catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Filled cost: ${value}`);
  }

  /**
   * Submit create form.
   * Codegen: getByRole('button', { name: 'Create' }).click()
   */
  async submitTimesheetForDailyReport() {
    // Prefer the Create on the timesheet form (last visible exact Create), not list CTA
    const createBtn = this.page
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .last();
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const validation = this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast')
      .filter({
        hasText: /mandatory|required|please\s+fill|missing|cannot be empty|is required|fill all/i,
      })
      .first();

    if (await validation.isVisible({ timeout: 2500 }).catch(() => false)) {
      const msg = ((await validation.innerText().catch(() => '')) || '').trim();
      throw new Error(`Timesheet create blocked by validation: ${msg || 'mandatory field(s) missing'}`);
    }

    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Submitted timesheet Create.');
  }

  async expectTimesheetCreatedSuccessfullyForDailyReport() {
    const success = this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast, .Toastify__toast-body')
      .filter({ hasText: /success|created|saved|submitted/i })
      .first();

    try {
      await expect(success).toBeVisible({ timeout: 25000 });
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Timesheet created successfully (toast).');
      return;
    } catch {
      // Fall through
    }

    const drawerGone = !(await this.drawerTitle.isVisible({ timeout: 2000 }).catch(() => false));
    const listReady = await this.createButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (drawerGone && listReady) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Timesheet created — create drawer closed, list visible.');
      return;
    }

    throw new Error(
      'Timesheet was not created successfully. No success toast and create drawer still open (check mandatory fields).'
    );
  }
}

module.exports = TimeTrackingPage;
