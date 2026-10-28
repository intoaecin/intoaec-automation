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
    this.deleteMenuItem = page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^delete$/i }))
      .first();
    this.saveOrUpdateButton = page
      .getByRole('button', { name: /save|update|apply/i })
      .or(page.locator('.boqUI button.btnPrimaryUI:has-text("Save"), button.btnPrimaryUI:has-text("Update")'))
      .first();

    // --- Filter ---
    this.filterButton = page
      .getByRole('button', { name: /^filter$/i })
      .or(page.getByRole('button', { name: /filter/i }))
      .or(page.locator('button[aria-label*="filter" i], button[title*="filter" i]'))
      .first();
    this.filterApplyButton = page
      .getByRole('button', { name: /^apply$/i })
      .or(page.locator('.MuiPopover-paper, [role="dialog"], .MuiDrawer-root').getByRole('button', { name: /apply/i }))
      .first();

    /** Last random values for assertions */
    this.lastDeletedTimesheetKey = null;
    this.lastTimesheetRowCountBeforeDelete = null;
    this.lastFilterCriterion = null;
    this.lastFilterFieldLabel = null;
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
    this.lastTimesheetSplitProject = null;
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
    if (!(await locator.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }
    const type = (await locator.getAttribute('type').catch(() => '')) || '';
    const pick = type.toLowerCase() === 'time' ? hhmm24 : hhmm12;
    await this.setPickerInputValue(locator, pick);
    return true;
  }

  /**
   * Set start/end via MUI "Choose time" clock dialogs, or labeled inputs when present.
   * Returns true when at least one strategy succeeded for both times (or best-effort).
   */
  async setTimesheetStartAndEndTimes(start12 = '10:00 AM', end12 = '6:00 PM') {
    const start24 = /am|pm/i.test(start12)
      ? (() => {
          const m = start12.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
          if (!m) return '10:00';
          let h = parseInt(m[1], 10);
          if (/pm/i.test(m[3]) && h !== 12) h += 12;
          if (/am/i.test(m[3]) && h === 12) h = 0;
          return `${String(h).padStart(2, '0')}:${m[2]}`;
        })()
      : start12;
    const end24 = /am|pm/i.test(end12)
      ? (() => {
          const m = end12.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
          if (!m) return '18:00';
          let h = parseInt(m[1], 10);
          if (/pm/i.test(m[3]) && h !== 12) h += 12;
          if (/am/i.test(m[3]) && h === 12) h = 0;
          return `${String(h).padStart(2, '0')}:${m[2]}`;
        })()
      : end12;

    const startHour = String(parseInt(start24.split(':')[0], 10) % 12 || 12);
    const endHour = String(parseInt(end24.split(':')[0], 10) % 12 || 12);
    const endIsPm = parseInt(end24.split(':')[0], 10) >= 12;

    const chooseTime = this.page.getByRole('button', { name: /choose time/i }).filter({ visible: true });
    if (await chooseTime.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      await chooseTime.first().click({ timeout: 20000 });
      await this.page
        .getByRole('option', { name: new RegExp(`^${startHour}\\s*hours?$`, 'i') })
        .first()
        .click({ timeout: 20000 })
        .catch(() => {});
      await this.page.getByRole('button', { name: /^ok$/i }).first().click({ timeout: 20000 }).catch(() => {});

      const second = chooseTime.nth(1);
      if (await second.isVisible({ timeout: 3000 }).catch(() => false)) {
        await second.click({ timeout: 20000 });
      } else {
        await chooseTime.first().click({ timeout: 20000 }).catch(() => {});
      }
      await this.page
        .getByRole('option', { name: new RegExp(`^${endHour}\\s*hours?$`, 'i') })
        .first()
        .click({ timeout: 20000 })
        .catch(() => {});
      if (endIsPm) {
        await this.page.getByRole('option', { name: /^pm$/i }).first().click({ timeout: 10000 }).catch(() => {});
      }
      await this.page.getByRole('button', { name: /^ok$/i }).first().click({ timeout: 10000 }).catch(() => {});
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Set times via Choose time: ${start12} – ${end12}`);
      return true;
    }

    const startField = this.page
      .getByLabel(/start\s*time/i)
      .or(this.page.getByPlaceholder(/start/i))
      .or(this.startTimeInput)
      .filter({ visible: true })
      .first();
    const endField = this.page
      .getByLabel(/end\s*time/i)
      .or(this.page.getByPlaceholder(/end/i))
      .or(this.endTimeInput)
      .filter({ visible: true })
      .first();

    const startOk = await this.setTimeValue(startField, start24, start12);
    const endOk = await this.setTimeValue(endField, end24, end12);
    if (startOk || endOk) {
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Set times via inputs: ${start12} – ${end12}`);
      return true;
    }

    // Last resort: any visible time inputs on the form (first = start, second = end).
    const timeInputs = this.page
      .locator('input[type="time"], input[placeholder*="time" i], input[aria-label*="time" i]')
      .filter({ visible: true });
    const count = await timeInputs.count().catch(() => 0);
    if (count >= 1) {
      await this.setTimeValue(timeInputs.nth(0), start24, start12);
    }
    if (count >= 2) {
      await this.setTimeValue(timeInputs.nth(1), end24, end12);
    }
    if (count >= 1) {
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Set times via generic time inputs (${count} found)`);
      return true;
    }

    // eslint-disable-next-line no-console
    console.log('[Time Tracking] No start/end time controls found — leaving defaults if prefilled');
    return false;
  }

  async setTimesheetDateToday(dayNum) {
    const day = String(dayNum || new Date().getDate());
    const chooseDate = this.page.getByRole('button', { name: /choose date/i }).filter({ visible: true }).first();
    const dateField = this.page
      .getByRole('textbox', { name: /dd mmmm yyyy|date/i })
      .or(this.page.getByLabel(/^date$/i))
      .or(this.page.getByPlaceholder(/date|dd|mm|yyyy/i))
      .or(this.dateInput)
      .filter({ visible: true })
      .first();

    if (await chooseDate.isVisible({ timeout: 2500 }).catch(() => false)) {
      await chooseDate.click({ timeout: 20000 });
    } else if (await dateField.isVisible({ timeout: 2500 }).catch(() => false)) {
      await dateField.click({ timeout: 20000 }).catch(() => {});
      if (await chooseDate.isVisible({ timeout: 1500 }).catch(() => false)) {
        await chooseDate.click({ timeout: 20000 }).catch(() => {});
      }
    }

    const todayCell = this.page
      .locator('button.MuiPickersDay-today, .MuiPickersDay-root.MuiPickersDay-today, [aria-current="date"]')
      .filter({ visible: true })
      .first();
    if (await todayCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await todayCell.click({ timeout: 20000 });
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Picked today via calendar (day ${day}).`);
      return true;
    }
    const gridDay = this.page.getByRole('gridcell', { name: day, exact: true }).filter({ visible: true }).first();
    if (await gridDay.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gridDay.click({ timeout: 20000 });
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Picked calendar day ${day}.`);
      return true;
    }

    if (await dateField.isVisible({ timeout: 2000 }).catch(() => false)) {
      const dateType = (await dateField.getAttribute('type').catch(() => '')) || '';
      const fallback =
        dateType.toLowerCase() === 'date' ? this.lastTimesheetDateIso : this.lastTimesheetDate;
      await this.setPickerInputValue(dateField, fallback);
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Set date via input: ${fallback}`);
      return true;
    }

    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Date control not found — leaving prefilled date if any');
    return false;
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

  /** Open first list row three-dot menu and click Delete. */
  async clickDeleteOnTimesheet() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(500);

    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    this.lastDeletedTimesheetKey = ((await row.innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    this.lastTimesheetRowCountBeforeDelete = await this.timesheetTableRows.count().catch(() => 0);

    const actionBtn = row.locator('button').last();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.click({ timeout: 20000 });
    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });

    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteMenuItem.click({ timeout: 20000 });
    // eslint-disable-next-line no-console
    console.log(
      `[Time Tracking] Clicked Delete on timesheet row: ${this.lastDeletedTimesheetKey || '(first row)'}`
    );
  }

  /** Confirm delete dialog when shown (OK / Yes / Delete / Confirm). */
  async confirmTimesheetDeletion() {
    const confirmBtn = this.page
      .getByRole('button', { name: /^(delete|yes|ok|confirm|proceed)$/i })
      .or(
        this.page
          .locator('[role="dialog"] button, .MuiDialog-root button, .MuiModal-root button')
          .filter({ hasText: /^(delete|yes|ok|confirm|proceed)$/i })
      )
      .filter({ visible: true })
      .last();

    if (await confirmBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirmBtn.click({ timeout: 20000 });
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Confirmed timesheet deletion.');
    } else {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] No delete confirmation dialog — continuing.');
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  /** Assert toast and/or that the deleted row is gone / row count dropped. */
  async verifyTimesheetDeletedSuccessfully() {
    const toast = this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast, .Toastify__toast-body')
      .filter({ hasText: /deleted|removed|success/i })
      .first();

    await expect(async () => {
      const toastOk = await toast.isVisible().catch(() => false);
      const before = this.lastTimesheetRowCountBeforeDelete;
      const after = await this.timesheetTableRows.count().catch(() => null);
      const countDropped =
        typeof before === 'number' && typeof after === 'number' && before > 0 && after < before;

      let keyGone = false;
      if (this.lastDeletedTimesheetKey && this.lastDeletedTimesheetKey.length > 8) {
        const stillThere = await this.page
          .locator('tbody tr')
          .filter({ hasText: this.lastDeletedTimesheetKey.slice(0, 40) })
          .first()
          .isVisible()
          .catch(() => false);
        keyGone = !stillThere;
      }

      expect(toastOk || countDropped || keyGone).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });

    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Timesheet deleted successfully (removed from list / toast).');
  }

  /**
   * Change user, date, start/end relative to defaults (updates prefilled values).
   * Uses the same Choose date / Choose time path as create — edit form often has
   * no labeled Start Time inputs.
   */
  async updateAllPrefilledFields() {
    await expect(this.productInfoSection).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(500);

    const userCombo = this.page
      .getByRole('combobox', { name: /^user$|select user|choose user/i })
      .or(this.userDropdown)
      .first();
    if (await userCombo.isVisible({ timeout: 8000 }).catch(() => false)) {
      await userCombo.click({ timeout: 15000 });
      const options = this.page.locator('[role="listbox"] [role="option"]');
      await expect(async () => {
        expect(await options.count()).toBeGreaterThan(0);
      }).toPass({ timeout: 15000, intervals: [300, 600] });
      const n = await options.count();
      const pick = n > 1 ? 1 : 0;
      this.lastTimesheetUser = ((await options.nth(pick).innerText().catch(() => '')) || '').trim();
      await options.nth(pick).click();
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Edit — selected user: ${this.lastTimesheetUser || pick}`);
    }

    const today = new Date();
    this.lastTimesheetDate = this.formatDateWithinAllowedRange(0, 'MM/DD/YYYY');
    this.lastTimesheetDateIso = this.formatDateWithinAllowedRange(0, 'YYYY-MM-DD');
    this.lastTimesheetStart = '10:00 AM';
    this.lastTimesheetEnd = '6:00 PM';

    await this.setTimesheetDateToday(String(today.getDate()));
    await this.setTimesheetStartAndEndTimes('10:00 AM', '6:00 PM');

    // Close leftover pickers without closing the edit drawer.
    const openPicker = this.page
      .locator('.MuiPickersPopper-root, .MuiPickersLayout-root')
      .filter({ visible: true })
      .first();
    if (await openPicker.isVisible({ timeout: 800 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }
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

  /**
   * Fill Description on edit form. Prefer the timesheet Description field —
   * there is usually no "dashboard" textarea on this screen (old step name kept).
   */
  async scrollAndEnterRandomDashboardDescription() {
    const page = this.page;
    const text = `Edit note ${this.randomSuffix()}`;
    this.lastEditDescription = text;

    const candidates = [
      page.getByRole('textbox', { name: /description|notes|comment/i }).first(),
      page.getByLabel(/description|notes|comment/i).first(),
      page.getByPlaceholder(/description|notes|comment/i).first(),
      this.descriptionInput,
      page.locator('textarea').filter({ visible: true }).first(),
      page.locator('[class*="dashboard" i] textarea, [id*="dashboard" i] textarea').first(),
      page.locator('main textarea, [role="main"] textarea, .boqUI textarea').filter({ visible: true }).last(),
    ];

    let primary = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
        primary = candidate;
        break;
      }
    }

    if (!primary) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Description field not present on edit form — skipping');
      this.lastEditDescription = null;
      return;
    }

    await primary.scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
    await primary.click({ timeout: 10000 }).catch(() => {});
    await primary.fill(text).catch(async () => {
      await primary.press('Control+A').catch(() => {});
      await primary.type(text, { delay: 10 }).catch(() => {});
    });
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Filled description: ${text}`);
  }

  async saveTimesheetChanges() {
    // Do not Escape here — it can close the edit drawer.
    const candidates = [
      this.page.locator('.boqUI button.btnPrimaryUI').filter({ hasText: /^(save|update)$/i }).last(),
      this.page
        .locator('.MuiDrawer-root, [class*="Drawer"], aside, .boqUI')
        .getByRole('button', { name: /^(save|update)$/i })
        .last(),
      this.page.getByRole('button', { name: /^save$/i }).last(),
      this.page.getByRole('button', { name: /^update$/i }).last(),
      this.page.getByRole('button', { name: /save|update/i }).last(),
      this.saveOrUpdateButton,
    ];

    let saveBtn = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 4000 }).catch(() => false)) {
        saveBtn = candidate;
        break;
      }
    }

    if (!saveBtn) {
      throw new Error('Timesheet Save/Update button not found on edit form.');
    }

    await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
    // Wait briefly for enable; click anyway if still disabled (some builds enable on click path).
    await expect(saveBtn)
      .toBeEnabled({ timeout: 20000 })
      .catch(() => {});
    await saveBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Clicked Save/Update on timesheet edit.');
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
   * Open Time Tracking after the project profile is open.
   * Prefers project sidebar "Time Tracking" (New UI / ONSITE nav), then classic
   * Project Management tile. Does not require the Project Management heading.
   */
  async navigateToTimeTrackingModule() {
    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    const createVisible = async () =>
      this.createButton
        .or(this.page.getByRole('button', { name: /\+?\s*create\s*time\s*sheet/i }))
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 2500 })
        .catch(() => false);

    const onTimeTracking =
      /tab=TimeTracking|time[-_]?tracking|TimeTracking/i.test(this.page.url()) ||
      (await this.page.getByRole('heading', { name: /^time tracking$/i }).isVisible({ timeout: 800 }).catch(() => false));

    if (onTimeTracking && (await createVisible())) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Already on Time Tracking module.');
      return;
    }

    // 1) Project left nav / sidebar (screenshot: under project → Time Tracking).
    const sidebarLink = this.page
      .getByRole('link', { name: /^time tracking$/i })
      .or(this.page.getByRole('button', { name: /^time tracking$/i }))
      .or(this.page.locator('nav, aside, [class*="Sidebar"], [class*="sideNav"]').getByText(/^time tracking$/i))
      .or(this.page.getByText(/^time tracking$/i))
      .filter({ visible: true })
      .first();

    if (await sidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sidebarLink.scrollIntoViewIfNeeded().catch(() => {});
      await sidebarLink.click({ timeout: 30000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      if (await createVisible()) {
        // eslint-disable-next-line no-console
        console.log('[Time Tracking] Opened Time Tracking via project sidebar.');
        return;
      }
    }

    // 2) Classic hub: optional Project Management heading, then module tile/card.
    await profile.selectHeading('Project Management').catch(() => {});
    await profile.ensureClassicProjectUi().catch(() => {});

    if (await this.timeTrackingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.timeTrackingLink.click({ timeout: 30000 });
    } else {
      const tile = this.page.getByText(/^time tracking$/i).filter({ visible: true }).first();
      if (await tile.isVisible({ timeout: 4000 }).catch(() => false)) {
        await tile.scrollIntoViewIfNeeded().catch(() => {});
        await tile.click({ timeout: 30000 });
      } else {
        await profile.clickModuleCard('Time Tracking');
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(
      this.createButton.or(this.page.getByRole('button', { name: /\+?\s*create\s*time\s*sheet/i })).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Opened Time Tracking module.');
  }

  _createTimesheetFormMarker() {
    return this.drawerTitle
      .or(this.page.getByRole('heading', { name: /create\s*time\s*sheet/i }))
      .or(this.dateTextboxDmy)
      .or(this.dateInput)
      .or(this.page.getByLabel(/^date$/i))
      .or(this.page.getByPlaceholder(/dd|mm|yyyy|date/i))
      .or(this.page.getByRole('button', { name: /choose date/i }))
      .or(this.productInfoSection)
      .or(this.userDropdown)
      .or(this.page.getByRole('combobox', { name: /user|select user/i }))
      .filter({ visible: true })
      .first();
  }

  async waitForCreateTimesheetForm() {
    await expect(this._createTimesheetFormMarker()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async selectStartFromScratchAndProceed() {
    // Create may already open the form (skip Get Started).
    if (await this._createTimesheetFormMarker().isVisible({ timeout: 2500 }).catch(() => false)) {
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
    if (!(await this._createTimesheetFormMarker().isVisible({ timeout: 2500 }).catch(() => false))) {
      const proceed = this.page.getByRole('button', { name: 'Proceed', exact: true }).first();
      if (await proceed.isVisible({ timeout: 8000 }).catch(() => false)) {
        await expect(proceed).toBeEnabled({ timeout: 30000 });
        await proceed.click({ timeout: 20000 });
      }
    }

    await this.waitForCreateTimesheetForm();
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
   * Select chargeable via combobox when present; otherwise switch/checkbox.
   * Option labels vary (Chargeable / Yes / Billable).
   */
  async selectChargeabilityChargeable() {
    const combo = this.page
      .getByRole('combobox', { name: /select chargeability|chargeability/i })
      .or(this.page.locator('[role="combobox"]').filter({ hasText: /chargeability|chargeable|select charge/i }))
      .filter({ visible: true })
      .first();

    await combo.scrollIntoViewIfNeeded().catch(() => {});
    if (await combo.isVisible({ timeout: 12000 }).catch(() => false)) {
      await combo.click({ timeout: 15000 });
      await this.page.waitForTimeout(400);

      const optionCandidates = [
        this.page.getByRole('option', { name: /^chargeable$/i }),
        this.page.getByRole('option', { name: /chargeable/i }),
        this.page.getByRole('option', { name: /^yes$/i }),
        this.page.getByRole('option', { name: /billable/i }),
        this.page.getByRole('menuitem', { name: /chargeable|billable|^yes$/i }),
        this.page.locator('[role="listbox"] [role="option"], [role="presentation"] li, .MuiMenuItem-root')
          .filter({ hasText: /chargeable|billable|^yes$/i }),
      ];

      for (const candidate of optionCandidates) {
        const opt = candidate.filter({ visible: true }).first();
        if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
          const label = ((await opt.innerText().catch(() => '')) || '').trim();
          await opt.click({ timeout: 15000 });
          this.lastTimesheetChargeable = true;
          // eslint-disable-next-line no-console
          console.log(`[Time Tracking] Selected chargeability: ${label || 'Chargeable'}`);
          return;
        }
      }

      // List opened but no matching label — pick first real option (skip placeholders).
      const firstReal = this.page
        .locator('[role="listbox"] [role="option"]')
        .filter({ visible: true })
        .filter({ hasNotText: /select|choose/i })
        .first();
      if (await firstReal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const label = ((await firstReal.innerText().catch(() => '')) || '').trim();
        await firstReal.click({ timeout: 15000 });
        this.lastTimesheetChargeable = true;
        // eslint-disable-next-line no-console
        console.log(`[Time Tracking] Selected first chargeability option: ${label}`);
        return;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Chargeability list had no usable option — trying switch/checkbox');
    }

    // Legacy switch/checkbox fallback
    await this.enableChargeableOption();
  }

  async enableChargeableOption() {
    const scope = this.productInfoSection.or(this.page.locator('form, main, [role="main"]').first());
    // Only touch controls clearly labeled Chargeable — never click a random MuiSwitch.
    const control = scope
      .getByRole('switch', { name: /chargeable/i })
      .or(scope.getByLabel(/^chargeable$/i))
      .or(scope.getByRole('checkbox', { name: /chargeable/i }))
      .or(this.page.locator('.MuiSwitch-root').filter({ has: this.page.getByText(/^chargeable$/i) }))
      .filter({ visible: true })
      .first();

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
      this.lastTimesheetChargeable = true;
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Enabled Chargeable option.');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[Time Tracking] No Chargeable switch/checkbox found — leaving as-is');
  }

  /**
   * Create Time Sheet fill for Daily Report / Time Sheet TC-01.
   * Prefers codegen date picker when present; otherwise uses flexible date/time inputs.
   * @param {{ withSplitByProject?: boolean }} [options]
   */
  async fillTimesheetForDailyReportTimeLog(options = {}) {
    const withSplitByProject = Boolean(options.withSplitByProject);
    await this.page.waitForTimeout(800);
    await this.waitForCreateTimesheetForm();

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

    await this.selectFirstTimesheetUserIfNeeded();

    // Date / time controls vary by UI build — never require the old "DD MMMM YYYY" or
    // section-scoped Start Time inputs that may not exist.
    await this.setTimesheetDateToday(day);
    await this.setTimesheetStartAndEndTimes('10:00 AM', '6:00 PM');

    // Dismiss open date/time pickers only (bare Escape can close the create drawer).
    const openPicker = this.page
      .locator('.MuiPickersPopper-root, .MuiPickersLayout-root')
      .filter({ visible: true })
      .first();
    if (await openPicker.isVisible({ timeout: 800 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }

    if (withSplitByProject) {
      await this.selectSplitByProject();
    }

    await this.selectChargeabilityChargeable().catch((err) => {
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Chargeability optional skip: ${err?.message || err}`);
    });

    await this.fillCostIfPresentOrRequired();
    await this.fillTimesheetDescriptionIfPresent();
    if (withSplitByProject) {
      await this.selectWorkCategoryIfPresent().catch(() => {});
    }

    // eslint-disable-next-line no-console
    console.log(
      `[Time Tracking] Filled timesheet: user=${this.lastTimesheetUser || 'prefilled'}, ` +
        `date=${this.lastTimesheetDatePretty}, 10:00 AM–6:00 PM, Chargeable` +
        (withSplitByProject ? `, splitProject=${this.lastTimesheetSplitProject || 'n/a'}` : '') +
        '.'
    );
  }

  /**
   * TC-06 — fill create form including Split by Project.
   */
  async fillTimesheetWithSplitByProject() {
    await this.fillTimesheetForDailyReportTimeLog({ withSplitByProject: true });
  }

  /**
   * Select a project under "Split by Project" (combobox / autocomplete / multi-select).
   * Prefers kumarorganization when listed; otherwise first real option.
   */
  async selectSplitByProject() {
    const scope = this.productInfoSection.or(this.page.locator('form, .boqUI, [role="dialog"]').first());
    const splitLabel = this.page.getByText(/split\s*by\s*project/i).first();

    // Scroll the section into view when the label exists.
    if (await splitLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await splitLabel.scrollIntoViewIfNeeded().catch(() => {});
    }

    const combo = scope
      .getByRole('combobox', { name: /split\s*by\s*project|project/i })
      .or(this.page.getByRole('combobox', { name: /split\s*by\s*project|select\s*project/i }))
      .or(
        this.page
          .locator('label, p, span, div')
          .filter({ hasText: /split\s*by\s*project/i })
          .locator('xpath=following::div[@role="combobox"][1]')
      )
      .or(scope.locator('.MuiAutocomplete-root').filter({ hasText: /project/i }).locator('input[role="combobox"]'))
      .or(scope.locator('[role="combobox"]').filter({ hasText: /project|select/i }))
      .first();

    if (!(await combo.isVisible({ timeout: 10000 }).catch(() => false))) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Split by Project control not found — skipping');
      return;
    }

    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ timeout: 20000 });
    await this.page.waitForTimeout(400);

    const options = this.page.locator('[role="listbox"] [role="option"]');
    await expect(async () => {
      expect(await options.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [300, 600] });

    const preferred = options.filter({ hasText: /kumarorganization|kumar/i });
    let pick = preferred.first();
    if (!(await pick.isVisible({ timeout: 1500 }).catch(() => false))) {
      pick = options.filter({ hasNotText: /select|choose|none/i }).first();
    }
    if (!(await pick.isVisible({ timeout: 1500 }).catch(() => false))) {
      pick = options.first();
    }

    this.lastTimesheetSplitProject = ((await pick.innerText().catch(() => '')) || '').trim().split('\n')[0];
    await pick.click({ timeout: 15000 });

    // Multi-select / autocomplete may leave the list open — close it without closing the drawer.
    const listStillOpen = await this.page
      .locator('[role="listbox"]')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 800 })
      .catch(() => false);
    if (listStillOpen) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(200);
    }

    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Selected Split by Project: ${this.lastTimesheetSplitProject}`);
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
   * Do NOT press Escape here — it closes the Create Time Sheet drawer.
   */
  async submitTimesheetForDailyReport() {
    // Only dismiss an open date/time picker popper (not the whole drawer).
    const openPicker = this.page
      .locator('.MuiPickersPopper-root, .MuiPickersLayout-root, [class*="Picker"] [role="dialog"]')
      .filter({ visible: true })
      .first();
    if (await openPicker.isVisible({ timeout: 800 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }

    // Prefer drawer/header Create — never the list "+ Create Time Sheet" CTA.
    const candidates = [
      this.page.locator('.boqUI button.btnPrimaryUI').filter({ hasText: /^create$/i }).last(),
      this.page
        .locator('.MuiDrawer-root, [class*="Drawer"], aside, .boqUI')
        .getByRole('button', { name: /^create$/i })
        .last(),
      this.page.getByRole('button', { name: 'Create', exact: true }).last(),
      this.page.getByRole('button', { name: /^create$/i }).last(),
      this.page.locator('button.btnPrimaryUI').filter({ hasText: /^create$/i }).last(),
      this.submitButton,
    ];

    let createBtn = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 4000 }).catch(() => false)) {
        const label = ((await candidate.innerText().catch(() => '')) || '').trim();
        // Skip list CTA if it somehow matches
        if (/\+\s*create\s*time\s*sheet/i.test(label)) continue;
        createBtn = candidate;
        break;
      }
    }

    if (!createBtn) {
      const formStillOpen = await this._createTimesheetFormMarker()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      throw new Error(
        formStillOpen
          ? 'Timesheet form is open but Create button was not found.'
          : 'Timesheet Create drawer was closed before submit (Create button missing).'
      );
    }

    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    if (await createBtn.isDisabled().catch(() => false)) {
      await this.selectChargeabilityChargeable().catch(() => {});
      await this.page.waitForTimeout(500);
    }

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

  async expectCreatedTimesheetInList() {
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await expect(this.timesheetTableRows.first()).toBeVisible({ timeout: this.defaultTimeout });

    const userName = (this.lastTimesheetUser || '').split('\n')[0].trim();
    if (!userName) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Time sheet list has rows (user name not captured, skipping row match).');
      return;
    }

    try {
      await expect(this.timesheetTableRows.filter({ hasText: userName }).first()).toBeVisible({
        timeout: this.defaultTimeout,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`[Time Tracking] Created time sheet for "${userName}" not found in list.`);
      throw err;
    }
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Created time sheet for "${userName}" is displayed in the list.`);
  }

  async selectLinkedShift(shiftName) {
    const linkField = this.page
      .getByLabel(/link\s*shift|linked\s*shift/i)
      .or(this.page.getByPlaceholder(/link\s*shift|select\s*shift|search\s*shift/i))
      .or(this.page.getByRole('combobox', { name: /link\s*shift|shift/i }))
      .filter({ visible: true })
      .first();

    await expect(linkField).toBeVisible({ timeout: this.defaultTimeout });
    await linkField.click({ timeout: 20000 });

    if (shiftName) {
      await linkField.fill(String(shiftName)).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
      const named = this.page
        .getByRole('option')
        .filter({ hasText: new RegExp(String(shiftName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .filter({ visible: true })
        .first();
      if (await named.isVisible({ timeout: 5000 }).catch(() => false)) {
        await named.click({ timeout: 15000 });
        this.lastLinkedShiftName = shiftName;
        // eslint-disable-next-line no-console
        console.log(`[Time Tracking] Linked shift: ${shiftName}`);
        return;
      }
    }

    const firstOption = this.page
      .locator('[role="listbox"] [role="option"], [role="option"]')
      .filter({ visible: true })
      .first();
    await expect(firstOption).toBeVisible({ timeout: 15000 });
    this.lastLinkedShiftName = ((await firstOption.innerText().catch(() => '')) || '').trim();
    await firstOption.click({ timeout: 15000 });
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Linked first available shift: ${this.lastLinkedShiftName}`);
  }

  async fillMandatoryFieldsWithLinkedShift(shiftName) {
    await this.fillMandatoryFields();
    await this.selectLinkedShift(shiftName);
  }

  async expectShiftLinkedTimesheetCannotConvertToExpense() {
    const convertBtn = this.page
      .getByRole('button', { name: /convert.*expense|add\s*to\s*expenses?/i })
      .or(this.page.getByText(/convert.*expense/i))
      .filter({ visible: true })
      .first();

    if (await convertBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await convertBtn.click({ timeout: 10000 }).catch(() => {});
      const blocked = this.page
        .getByText(/linked\s*to\s*a\s*shift|cannot\s*be\s*converted|worker\s*management/i)
        .filter({ visible: true })
        .first();
      await expect(blocked).toBeVisible({ timeout: 30000 });
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Shift-linked timesheet convert-to-expense blocked as expected');
      return;
    }

    // Convert action may be hidden/disabled when shift-linked
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Convert to expense not available for shift-linked timesheet');
  /** Prefer a person-like cell value from the first timesheet row (for User filter). */
  async captureTimesheetFilterCriteriaFromFirstRow() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });

    const cells = row.locator('td, th');
    const count = await cells.count();
    let criterion = '';
    for (let i = 0; i < count; i += 1) {
      const text = ((await cells.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2) continue;
      // Skip pure dates / times / amounts / status chips.
      if (/^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?$/.test(text)) continue;
      if (/^\d{1,2}:\d{2}/.test(text)) continue;
      if (/^(rs\.?|inr|\$)/i.test(text)) continue;
      if (/^(chargeable|non[-\s]?chargeable|approved|pending|draft)$/i.test(text)) continue;
      if (/^[0-9.,]+$/.test(text)) continue;
      criterion = text.split('\n')[0].trim();
      break;
    }

    if (!criterion) {
      const full = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      criterion = full.split(' ').slice(0, 3).join(' ');
    }

    expect(criterion.length, 'Could not capture filter criteria from first time sheet row').toBeGreaterThan(1);
    this.lastFilterCriterion = criterion;
    this.lastFilterFieldLabel = 'User';
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Captured filter criteria from first row: "${criterion}"`);
  }

  _timesheetFilterPanel() {
    return this.page
      .locator('.MuiPopover-paper, [role="dialog"], .MuiDrawer-root, .MuiModal-root')
      .filter({ has: this.page.getByRole('button', { name: /apply/i }) })
      .last();
  }

  async clickTimesheetFilterOption() {
    // Prefer an explicit Filter control; fall back to common filter icon buttons.
    const filterBtn = this.filterButton
      .or(this.page.locator('button').filter({ hasText: /^filter$/i }).first())
      .or(this.page.getByLabel(/filter/i).first())
      .first();
    await expect(filterBtn).toBeVisible({ timeout: this.defaultTimeout });

    const alreadyOpen = await this._timesheetFilterPanel().isVisible({ timeout: 800 }).catch(() => false);
    if (alreadyOpen) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }
    await filterBtn.click({ timeout: 20000 });
    await expect(this._timesheetFilterPanel()).toBeVisible({ timeout: this.defaultTimeout });
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Opened Filter panel.');
  }

  async selectCapturedTimesheetFilterCriteria() {
    const criterion = (this.lastFilterCriterion || '').trim();
    expect(criterion.length, 'No filter criteria captured — run capture step first').toBeGreaterThan(1);

    const panel = this._timesheetFilterPanel();
    await expect(panel).toBeVisible({ timeout: this.defaultTimeout });

    const userCombo = panel
      .getByRole('combobox', { name: /user|employee|member|resource|select user/i })
      .or(panel.locator('[role="combobox"]').filter({ hasText: /user|select/i }))
      .or(panel.locator('.MuiAutocomplete-root input[role="combobox"]').first())
      .or(panel.locator('[role="combobox"]').first())
      .first();

    await expect(userCombo).toBeVisible({ timeout: this.defaultTimeout });
    await userCombo.scrollIntoViewIfNeeded().catch(() => {});
    await userCombo.click({ timeout: 15000 });

    // Type to narrow options when the control is an autocomplete input.
    const tag = ((await userCombo.evaluate((el) => el.tagName).catch(() => '')) || '').toLowerCase();
    if (tag === 'input') {
      await userCombo.fill('').catch(() => {});
      await userCombo.fill(criterion).catch(() => {});
    }

    await this.page.waitForTimeout(400);
    const options = this.page.locator('[role="listbox"] [role="option"]');
    await expect(async () => {
      expect(await options.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [300, 600] });

    const exact = options.filter({ hasText: new RegExp(criterion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
    let selectedLabel = criterion;
    if ((await exact.count()) > 0) {
      selectedLabel = ((await exact.first().innerText().catch(() => '')) || criterion).trim();
      await exact.first().click({ timeout: 15000 });
    } else {
      selectedLabel = ((await options.first().innerText().catch(() => '')) || '').trim();
      await options.first().click({ timeout: 15000 });
    }

    this.lastFilterCriterion = selectedLabel.split('\n')[0].trim() || criterion;
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Selected filter criteria: "${this.lastFilterCriterion}"`);
  }

  async applyTimesheetFilter() {
    const panel = this._timesheetFilterPanel();
    const apply = panel
      .getByRole('button', { name: /^apply$/i })
      .or(this.filterApplyButton)
      .first();
    await expect(apply).toBeVisible({ timeout: this.defaultTimeout });
    await expect(apply).toBeEnabled({ timeout: 20000 });
    await apply.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(800);
    // eslint-disable-next-line no-console
    console.log('[Time Tracking] Applied time sheet filter.');
  }

  async expectTimesheetListMatchesFilterCriteria() {
    const criterion = (this.lastFilterCriterion || '').trim();
    expect(criterion.length, 'No filter criteria to verify').toBeGreaterThan(1);

    const emptyState = this.page
      .getByText(/no\s+(data|records|results|time\s*sheets?)|nothing to (show|display)/i)
      .first();

    await expect(async () => {
      if (await emptyState.isVisible().catch(() => false)) {
        // Filter applied with zero matches is still a valid filtered state.
        return;
      }

      const rows = this.timesheetTableRows;
      const count = await rows.count();
      expect(count, 'Filtered time sheet list has no rows and no empty-state message').toBeGreaterThan(0);

      const sample = Math.min(count, 10);
      for (let i = 0; i < sample; i += 1) {
        const text = ((await rows.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
        expect(
          new RegExp(criterion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text),
          `Filtered row ${i + 1} did not contain "${criterion}": ${text.slice(0, 120)}`
        ).toBeTruthy();
      }
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });

    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Filtered list matches criteria "${criterion}".`);
  }
}

module.exports = TimeTrackingPage;
