const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

class RFQPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  /**
   * DOM ready, then optional `networkidle`. Procurement UIs often keep requests open, so a long
   * networkidle wait feels like a hang. Cap is short by default; set RFQ_NETWORK_IDLE_TIMEOUT_MS=0 to skip.
   */
  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    const raw = process.env.RFQ_NETWORK_IDLE_TIMEOUT_MS;
    const idleMs =
      raw !== undefined && String(raw).trim() !== ''
        ? Number(raw)
        : 6000;
    if (!Number.isFinite(idleMs) || idleMs <= 0) {
      return;
    }
    await this.page
      .waitForLoadState('networkidle', { timeout: idleMs })
      .catch(() => {});
  }

  async expectRfqPageLoaded() {
    await this.waitForNetworkSettled();
    await expect(
      this.page.getByRole('button', { name: /create rfq/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  rfqStartDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/get started/i) });
  }

  async clickCreateRfq() {
    const btn = this.page.getByRole('button', { name: /create rfq/i }).first();
    await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
    await btn.click();
    const dlg = this.rfqStartDialog();
    await expect(dlg).toBeVisible({ timeout: 30000 });
  }

  async startFromScratchAndProceed() {
    const dlg = this.rfqStartDialog();
    await expect(dlg).toBeVisible({ timeout: 20000 });
    const scratch = dlg.getByText(/start from scratch/i).first();
    await expect(scratch).toBeVisible({ timeout: 30000 });
    await scratch.click();

    const proceed = dlg.getByRole('button', { name: /^proceed$/i });
    await expect(proceed).toBeEnabled({ timeout: 30000 });
    await proceed.click();
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();
  }

  async fillRfqTitle(title) {
    const value = String(title || '').trim();
    if (!value) throw new Error('RFQ title must be non-empty');

    await this.page
      .waitForURL(/rfq\/(create|edit)/i, { timeout: 90000 })
      .catch(() => {});

    await this.waitForNetworkSettled();

    /** Same shared procurement form as PO often uses `estimation name` for the title field. */
    const estimationName = this.page.locator('input[name="estimation name"]').first();
    const byRoleLoose = this.page.getByRole('textbox', { name: /title|rfq/i }).first();
    const byLabel = this.page.getByLabel(/rfq.*title|title|quotation.*title/i).first();
    const byName = this.page
      .locator('input[name="title"], input[name*="title" i]')
      .first();
    const byPlaceholder = this.page
      .getByPlaceholder(/title|rfq|quotation|enter.*name/i)
      .first();

    const tryVisible = async (loc, ms) =>
      loc.isVisible({ timeout: ms }).catch(() => false);

    let input = null;
    if (await tryVisible(estimationName, 5000)) {
      input = estimationName;
    } else if (await tryVisible(byLabel, 4000)) {
      input = byLabel;
    } else if (await tryVisible(byRoleLoose, 4000)) {
      input = byRoleLoose;
    } else if (await tryVisible(byName, 4000)) {
      input = byName;
    } else if (await tryVisible(byPlaceholder, 4000)) {
      input = byPlaceholder;
    } else {
      input = estimationName;
    }

    await expect(input).toBeVisible({ timeout: 90000 });
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15000 });
    await input.fill('');
    await input.fill(value);

    await expect
      .poll(async () => (await input.inputValue()).trim(), { timeout: 20000 })
      .toBe(value);

    await this.waitForNetworkSettled();
  }

  formatTodayUs() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }

  formatTodayIso() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${yyyy}-${mm}-${dd}`;
  }

  async dismissOpenMenusAndPopovers() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }

  async scrollRfqCreateFormForDateFields() {
    const main = this.page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 }).catch(() => false)) {
      await main
        .evaluate((el) => {
          el.scrollTop = Math.min(900, Math.max(0, el.scrollHeight - el.clientHeight));
        })
        .catch(() => {});
    }
    await this.page.waitForTimeout(400);
  }

  /**
   * Tries one label regex (visible copy, aria-label, MUI form control, etc.).
   * @returns {import('@playwright/test').Locator | null}
   */
  async tryResolveDateInputWithTextPattern(labelRe) {
    const strategies = [
      () => this.page.getByLabel(labelRe).first(),
      () => this.page.getByRole('textbox', { name: labelRe }).first(),
      () =>
        this.page
          .locator('.MuiFormControl-root')
          .filter({ has: this.page.getByText(labelRe) })
          .locator('input')
          .first(),
      () =>
        this.page
          .locator('[class*="MuiGrid"]')
          .filter({ has: this.page.getByText(labelRe) })
          .locator('input')
          .first(),
      () =>
        this.page
          .locator('label')
          .filter({ hasText: labelRe })
          .first()
          .locator('xpath=following::input[not(@type="hidden")][1]'),
    ];

    for (const getLoc of strategies) {
      const loc = getLoc();
      if (await loc.isVisible({ timeout: 2200 }).catch(() => false)) {
        return loc;
      }
    }

    const label = this.page.getByText(labelRe).filter({ visible: true }).first();
    if (await label.isVisible({ timeout: 2500 }).catch(() => false)) {
      const near = label
        .locator('xpath=following::input[not(@type="hidden")][1]')
        .first();
      if (await near.isVisible({ timeout: 2500 }).catch(() => false)) {
        return near;
      }
      const inScope = this.page
        .locator('div')
        .filter({ has: label })
        .locator('input')
        .first();
      if (await inScope.isVisible({ timeout: 2500 }).catch(() => false)) {
        return inScope;
      }
    }

    return null;
  }

  /**
   * RFQ create screen often uses wording other than "Required by" / "Created on", or labels not wired to inputs.
   */
  async resolveRfqDateInput(kind) {
    await this.scrollRfqCreateFormForDateFields();
    if (kind === 'createdOn') {
      await this.page
        .locator('main')
        .first()
        .evaluate((el) => {
          el.scrollTop += 240;
        })
        .catch(() => {});
      await this.page.waitForTimeout(300);
    }

    const spec =
      kind === 'requiredBy'
        ? {
            textRes: [
              /required\s*by/i,
              /required\s*by\s*date/i,
              /req\.?\s*by/i,
              /due\s*date/i,
              /due\s*by/i,
              /needed\s*by/i,
              /submission\s*deadline/i,
              /bid\s*due/i,
            ],
            nameHints: [
              'requiredBy',
              'required_by',
              'requiredby',
              'dueDate',
              'due_date',
              'bidDue',
              'bid_due',
            ],
            ordinal: 0,
          }
        : {
            textRes: [
              /created\s*on/i,
              /created\s*date/i,
              /creation\s*date/i,
              /date\s*created/i,
              /create\s*date/i,
            ],
            nameHints: [
              'createdOn',
              'created_on',
              'createdon',
              'dateCreated',
              'date_created',
              'creationDate',
            ],
            ordinal: 1,
          };

    for (const re of spec.textRes) {
      const found = await this.tryResolveDateInputWithTextPattern(re);
      if (found) {
        return found;
      }
    }

    for (const n of spec.nameHints) {
      const byAttr = this.page
        .locator(
          `input[name="${n}"], input[id="${n}"], input[name*="${n}" i], input[id*="${n}" i]`
        )
        .first();
      if (await byAttr.isVisible({ timeout: 1500 }).catch(() => false)) {
        return byAttr;
      }
    }

    const root =
      (await this.page.locator('main').first().isVisible({ timeout: 2000 }).catch(() => false))
        ? this.page.locator('main')
        : this.page;

    const pickerInputs = root
      .locator('.MuiFormControl-root')
      .filter({
        has: this.page
          .locator('button.MuiIconButton-root')
          .or(this.page.locator('.MuiInputAdornment-root button')),
      })
      .locator('input.MuiInputBase-input:not([type="hidden"])');

    const nth = pickerInputs.nth(spec.ordinal);
    if (await nth.isVisible({ timeout: 12000 }).catch(() => false)) {
      return nth;
    }

    const loosePickers = root.locator(
      '.MuiFormControl-root input.MuiInputBase-input:not([type="hidden"])'
    );
    const looseNth = loosePickers.nth(spec.ordinal);
    if (await looseNth.isVisible({ timeout: 8000 }).catch(() => false)) {
      return looseNth;
    }

    throw new Error(
      `RFQ: could not find ${kind} date field (tried label variants, name/id hints, and picker order ${spec.ordinal}).`
    );
  }

  /**
   * True when MUI date calendar / popper is visible (portal-mounted).
   */
  async isMuiDateCalendarOpen() {
    const roots = this.page.locator(
      [
        '.MuiPickersPopper-root',
        '.MuiDateCalendar-root',
        '[class*="MuiDayCalendar"]',
        '.MuiPickersLayout-root',
      ].join(', ')
    );
    const vis = roots.filter({ visible: true }).first();
    return vis.isVisible({ timeout: 800 }).catch(() => false);
  }

  /**
   * Clicks today's date inside an open MUI X date picker (popper or modal).
   */
  async pickTodayFromOpenMuiCalendar() {
    let calendarScope = this.page
      .locator('.MuiPickersPopper-root')
      .filter({ visible: true })
      .first();
    if (!(await calendarScope.isVisible({ timeout: 2500 }).catch(() => false))) {
      calendarScope = this.page
        .locator('.MuiModal-root, .MuiDialog-root')
        .filter({ visible: true })
        .filter({
          has: this.page.locator(
            '.MuiDateCalendar-root, .MuiDayCalendar-root, [class*="DayCalendar"]'
          ),
        })
        .first();
    }

    await expect(calendarScope).toBeVisible({ timeout: 15000 });

    let todayBtn = calendarScope.getByRole('button', { name: /^today$/i }).first();
    if (!(await todayBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      todayBtn = this.page
        .getByRole('button', { name: /^today$/i })
        .filter({ visible: true })
        .first();
    }
    if (await todayBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await todayBtn.click();
      return true;
    }

    const todayByMarker = calendarScope
      .locator(
        [
          'button.MuiPickersDay-today:not(.Mui-disabled)',
          'button[aria-current="date"]:not(.Mui-disabled)',
          '[role="gridcell"][aria-current="date"]',
        ].join(', ')
      )
      .first();
    if (await todayByMarker.isVisible({ timeout: 3000 }).catch(() => false)) {
      await todayByMarker.scrollIntoViewIfNeeded();
      await todayByMarker.click({ timeout: 10000 });
      return true;
    }

    const todayInPopper = this.page
      .locator('.MuiPickersPopper-root')
      .filter({ visible: true })
      .locator('button.MuiPickersDay-today, button[aria-current="date"]')
      .first();
    if (await todayInPopper.isVisible({ timeout: 2000 }).catch(() => false)) {
      await todayInPopper.scrollIntoViewIfNeeded();
      await todayInPopper.click({ timeout: 10000 });
      return true;
    }

    const dayNum = String(new Date().getDate());
    const dayBtn = calendarScope
      .locator(
        `button.MuiPickersDay-root:not(.Mui-disabled):not([aria-disabled="true"])`
      )
      .filter({ hasText: new RegExp(`^\\s*${dayNum}\\s*$`) })
      .first();
    if (await dayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayBtn.scrollIntoViewIfNeeded();
      await dayBtn.click({ timeout: 10000 });
      return true;
    }

    const dayInPopper = this.page
      .locator('.MuiPickersPopper-root')
      .filter({ visible: true })
      .locator('button.MuiPickersDay-root:not(.Mui-disabled)')
      .filter({ hasText: new RegExp(`^\\s*${dayNum}\\s*$`) })
      .first();
    if (await dayInPopper.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dayInPopper.scrollIntoViewIfNeeded();
      await dayInPopper.click({ timeout: 10000 });
      return true;
    }

    const gridCell = calendarScope
      .getByRole('gridcell', { name: new RegExp(`^\\s*${dayNum}\\s*$`) })
      .first();
    if (await gridCell.isVisible({ timeout: 2500 }).catch(() => false)) {
      await gridCell.scrollIntoViewIfNeeded();
      await gridCell.click({ timeout: 10000 });
      return true;
    }

    return false;
  }

  /**
   * Clicks the MUI calendar icon button next to the date field when the input alone does not open the popper.
   */
  async clickCalendarAdornmentNearInput(target) {
    const formControl = target
      .locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]')
      .first();
    if (!(await formControl.isVisible({ timeout: 2500 }).catch(() => false))) {
      return;
    }
    const adornmentBtn = formControl
      .locator(
        'button[aria-label*="Choose" i], button[aria-label*="choose date" i], button[aria-label*="date" i]'
      )
      .or(formControl.locator('.MuiInputAdornment-root button').first())
      .first();
    if (await adornmentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adornmentBtn.click({ timeout: 10000 });
    }
  }

  async openMuiDatePickerAndPickToday(target) {
    await target.scrollIntoViewIfNeeded();

    await target.click({ timeout: 15000 });
    await this.page.waitForTimeout(500);

    let opened = await this.isMuiDateCalendarOpen();
    if (!opened) {
      await this.clickCalendarAdornmentNearInput(target);
      await this.page.waitForTimeout(500);
      opened = await this.isMuiDateCalendarOpen();
    }

    if (!opened) {
      await target.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(500);
      opened = await this.isMuiDateCalendarOpen();
    }

    if (!opened) {
      return false;
    }

    const picked = await this.pickTodayFromOpenMuiCalendar();
    await this.page.waitForTimeout(300);
    if (await this.isMuiDateCalendarOpen()) {
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.dismissOpenMenusAndPopovers();
    }
    await this.waitForNetworkSettled();
    if (!picked) {
      await this.dismissOpenMenusAndPopovers();
    }
    return picked;
  }

  /**
   * Opens the field, selects today from the calendar when the picker shows, else types US/ISO date.
   */
  async setDateInputToToday(target) {
    const todayUs = this.formatTodayUs();
    const todayIso = this.formatTodayIso();

    const picked = await this.openMuiDatePickerAndPickToday(target);
    if (picked) {
      await this.dismissOpenMenusAndPopovers();
      await this.waitForNetworkSettled();
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(250);

    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 15000 }).catch(() => {});
    const type = ((await target.getAttribute('type')) || '').toLowerCase();
    const val = type === 'date' ? todayIso : todayUs;
    await target.fill(val).catch(async () => {
      await this.page.keyboard.press('ControlOrMeta+a');
      await this.page.keyboard.type(val);
    });
    await this.page.keyboard.press('Enter').catch(() => {});
    await this.page.keyboard.press('Tab').catch(() => {});
    await this.dismissOpenMenusAndPopovers();
    await this.waitForNetworkSettled();

    await expect
      .poll(
        async () => (await target.inputValue()).trim().length > 0,
        { timeout: 15000 }
      )
      .toBe(true);
  }

  async setRfqDateFieldToToday(kind) {
    await this.page
      .waitForURL(/rfq\/(create|edit)/i, { timeout: 90000 })
      .catch(() => {});
    await this.waitForNetworkSettled();
    await this.dismissOpenMenusAndPopovers();

    const target = await this.resolveRfqDateInput(kind);
    await this.setDateInputToToday(target);
  }

  async setRequiredByToday() {
    await this.setRfqDateFieldToToday('requiredBy');
  }

  async setCreatedOnToday() {
    await this.setRfqDateFieldToToday('createdOn');
  }

  async addFirstVendorFromPanel() {
    const addVendor = this.page.getByRole('button', { name: /add vendor/i }).first().or(
      this.page.getByRole('button', { name: /add vendor details/i }).first()
    );
    await expect(addVendor).toBeVisible({ timeout: this.defaultTimeout });
    await addVendor.click();

    // Off-canvas / modal container
    const panel = this.page.locator('.MuiModal-root, [role="dialog"], .drawer, .MuiDrawer-root').filter({ visible: true }).last();
    await expect(panel).toBeVisible({ timeout: 45000 });

    const firstRadio = panel.locator('table tbody input[type="radio"]').first().or(
      panel.getByRole('radio').first()
    );
    await expect(firstRadio).toBeVisible({ timeout: 60000 });
    try {
      await firstRadio.check({ timeout: 15000 });
    } catch {
      await firstRadio.click({ force: true });
    }

    const addBtn = panel.getByRole('button', { name: /^add$/i }).last();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();
  }

  async clickAddManually() {
    await this.dismissOpenMenusAndPopovers();
    const addManually = this.page.getByText(/^\+\s*add manually$/i).first().or(
      this.page.locator('span.pointer').filter({ hasText: /add manually/i }).first()
    );
    await expect(addManually).toBeVisible({ timeout: 60000 });
    await addManually.scrollIntoViewIfNeeded();
    await addManually.click({ force: true });
    await this.waitForNetworkSettled();
  }

  async ensureRfqLineItemsTableVisible() {
    const byAria = this.page.locator('[aria-label*="line items" i]').first();
    if (await byAria.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byAria.scrollIntoViewIfNeeded();
      return byAria;
    }
    const table = this.page
      .locator('table')
      .filter({ has: this.page.getByPlaceholder(/material name/i) })
      .first();
    await expect(table).toBeVisible({ timeout: 60000 });
    await table.scrollIntoViewIfNeeded();
    return table;
  }

  escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async selectUnitForRow(dataRow, unitLabel) {
    const unitCell = dataRow.locator('td').nth(2);
    const unitSelect = unitCell
      .locator('.MuiSelect-select')
      .first()
      .or(unitCell.getByRole('combobox').first());
    if (!(await unitSelect.isVisible({ timeout: 4000 }).catch(() => false))) {
      return;
    }

    const fallbacks = [
      String(unitLabel).trim(),
      'Nos',
      'Each',
      'No',
      'PCS',
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    for (const unit of fallbacks) {
      await unitSelect.click({ timeout: 15000 }).catch(() => {});
      const re = new RegExp(this.escapeRegExp(unit), 'i');
      const opt = this.page.getByRole('option', { name: re }).first();
      if (await opt.isVisible({ timeout: 2500 }).catch(() => false)) {
        await opt.click();
        await this.page
          .locator('[role="listbox"]')
          .waitFor({ state: 'hidden', timeout: 20000 })
          .catch(() => {});
        await this.dismissOpenMenusAndPopovers();
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  /**
   * RFQ line row: material name, quantity, and unit only (no description dialog, no rate).
   */
  async addLineItemManually({ itemName, quantity, unitLabel }) {
    await this.dismissOpenMenusAndPopovers();
    await this.clickAddManually();

    const table = await this.ensureRfqLineItemsTableVisible();
    const dataRow = table.locator('tbody tr').last();
    await expect(dataRow).toBeVisible({ timeout: 30000 });

    const nameField = dataRow
      .getByPlaceholder(/material name|item name/i)
      .first()
      .or(
        dataRow
          .getByRole('textbox', { name: /material name|item name/i })
          .first()
      );
    await expect(nameField).toBeVisible({ timeout: 60000 });
    await nameField.click();
    await nameField.fill(String(itemName));

    const qtyInput = dataRow.locator('td').nth(1).locator('input').first();
    await expect(qtyInput).toBeVisible({ timeout: 20000 });
    await qtyInput.fill(String(quantity));
    await qtyInput.blur();

    await dataRow.scrollIntoViewIfNeeded();
    await this.selectUnitForRow(dataRow, unitLabel);

    await this.waitForNetworkSettled();
    await this.dismissOpenMenusAndPopovers();
  }

  /** Toasts can sit above the header and intercept Action clicks (same as PO). */
  async dismissVisibleToastNotifications() {
    const closeSelectors =
      '.Toastify__toast .Toastify__close-button, .Toastify__close-button[aria-label], [class*="Toastify__close-button"]';
    for (let i = 0; i < 10; i += 1) {
      const btn = this.page.locator(closeSelectors).first();
      if (!(await btn.isVisible({ timeout: 400 }).catch(() => false))) {
        break;
      }
      await btn.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(120);
    }
  }

  async openActionMenuAndChooseCreate() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await this.waitForNetworkSettled();

    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.scrollIntoViewIfNeeded();

    const clickCreateFromOpenMenu = async () => {
      const visibleMenu = this.page.locator('[role="menu"]').filter({ visible: true }).first();
      await visibleMenu
        .waitFor({ state: 'visible', timeout: 12000 })
        .catch(() => {});

      const inMenu = visibleMenu
        .getByRole('menuitem')
        .filter({ hasText: /create/i })
        .first();
      if (await inMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
        await inMenu.click({ timeout: 15000 });
        return true;
      }

      const anyCreate = this.page
        .getByRole('menuitem')
        .filter({ visible: true })
        .filter({
          hasText: /^(create|create\s+rfq|create\s+request|save\s+rfq)$/i,
        })
        .first();
      if (await anyCreate.isVisible({ timeout: 4000 }).catch(() => false)) {
        await anyCreate.click({ timeout: 15000 });
        return true;
      }

      const loose = this.page
        .getByRole('menuitem')
        .filter({ visible: true })
        .filter({ hasText: /create/i })
        .first();
      if (await loose.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loose.click({ timeout: 15000 });
        return true;
      }

      return false;
    };

    let clicked = false;
    for (let attempt = 0; attempt < 3 && !clicked; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenusAndPopovers();
        await this.dismissVisibleToastNotifications();
      }
      await actionBtn.click({ timeout: 15000 });
      await this.page.waitForTimeout(250);
      clicked = await clickCreateFromOpenMenu();
    }

    if (!clicked) {
      throw new Error(
        'RFQ: Action menu did not expose a Create option (check label: Create / Create RFQ / Save RFQ).'
      );
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();
  }

  locatorRfqCreatedToast() {
    const re =
      /rfq created successfully|rfq saved successfully|created successfully|request for quotation created/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  async expectRfqCreatedToast() {
    await expect(this.locatorRfqCreatedToast()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = RFQPage;

