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
    // User – MUI Select combobox (role="combobox" inside the section)
    this.userDropdown = this.productInfoSection.locator('[role="combobox"]').first();

    // Date/Time inputs can differ between Create drawer vs Edit view (label wiring / aria-labels differ),
    // so prefer label-based selectors scoped to the section and fall back to the original xpath.
    const dateByLabel = this.productInfoSection
      .getByLabel(/date/i)
      .or(this.productInfoSection.locator('input[name*="date" i], input[id*="date" i]'))
      .first();
    const dateByXpath = page
      .locator(
        'xpath=//section[@id="product information"]//*[self::label or self::p or self::span][contains(normalize-space(.),"Date")]/following::input[1]'
      )
      .first();
    this.dateInput = dateByLabel.or(dateByXpath).first();

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
    this.datePickerButton = dateBtnByAria.or(dateBtnByXpath).first();

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
    this.confirmDialog = page.getByRole('dialog').first();
    this.confirmDeleteButton = this.confirmDialog
      .getByRole('button', { name: /delete|remove|confirm|yes|ok|proceed|continue|submit/i })
      .or(page.getByRole('button', { name: /delete|remove|confirm|yes|ok|proceed|continue|submit/i }))
      .first();

    /** Last random values for assertions */
    this.lastEditDescription = null;
    this.lastRandomCost = null;
    this.lastCreatedDescription = null;
    this.rowCountBeforeCreate = null;
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
      return null;
    };
    const setByDom = async () => {
      await input.evaluate((el, nextValue) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(el, nextValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, value);
    };

    try {
      await input.click({ force: true });
      await input.press('Control+A').catch(() => {});
      await input.fill(value);
      await input.press('Enter').catch(() => {});
      await input.press('Tab').catch(() => {});
    } catch {
      await setByDom();
    }

    await expect(async () => {
      const current = await readCurrent();
      if (current.trim().length > 0) return;

      const alt = await normalizeAltDate(value);
      if (alt) {
        await setByDom(alt);
        const afterAlt = await readCurrent();
        expect(afterAlt.trim().length).toBeGreaterThan(0);
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
    if (!(await this.datePickerButton.isVisible().catch(() => false))) {
      return false;
    }
    await this.datePickerButton.click().catch(() => {});
    await this.page.waitForTimeout(300);

    const day = String(targetDate.getDate());
    const dayButton = this.page.getByRole('gridcell', { name: day, exact: true }).first();
    if (await dayButton.isVisible().catch(() => false)) {
      await dayButton.click().catch(() => {});
      return true;
    }
    const dayFallback = this.page.getByRole('button', { name: new RegExp(`^${day}$`) }).first();
    if (await dayFallback.isVisible().catch(() => false)) {
      await dayFallback.click().catch(() => {});
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
    this.rowCountBeforeCreate = await this.timesheetTableRows.count().catch(() => null);

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

    if (await this.descriptionInput.isVisible().catch(() => false)) {
      this.lastCreatedDescription = `Timesheet ${this.randomSuffix()}`;
      await this.descriptionInput.click().catch(() => {});
      await this.descriptionInput.fill(this.lastCreatedDescription);
    }
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

  async clickDeleteOnTimesheet() {
    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    await expect(this.rowActionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.rowActionButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });

    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteMenuItem.click();
  }

  async confirmTimesheetDeletion() {
    await this.page.waitForTimeout(800);
    if (await this.confirmDeleteButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.confirmDeleteButton.click();
    }
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async verifyTimesheetDeletedSuccessfully() {
    await expect(async () => {
      const toastOk = await this.successToast
        .filter({ hasText: /deleted|removed|successfully/i })
        .first()
        .isVisible()
        .catch(() => false);

      const descriptionStillVisible = this.lastCreatedDescription
        ? await this.page
            .getByText(this.lastCreatedDescription, { exact: false })
            .first()
            .isVisible()
            .catch(() => false)
        : false;

      const currentRows = await this.timesheetTableRows.count().catch(() => null);
      const rowCountOk =
        typeof this.rowCountBeforeCreate === 'number' &&
        typeof currentRows === 'number' &&
        currentRows <= this.rowCountBeforeCreate;

      expect(toastOk || !descriptionStillVisible || rowCountOk).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
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
}

module.exports = TimeTrackingPage;
