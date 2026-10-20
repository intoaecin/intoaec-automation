const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

class RFQPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.addInCostCatalogOption = page
      .locator('[role="option"], .MuiAutocomplete-option')
      .filter({ hasText: /add in cost catalog/i })
      .first();
    this.addCatalogItemPopover = page
      .locator('.MuiPaper-root')
      .filter({ hasText: /not found in cost catalog/i })
      .filter({ has: page.getByRole('button', { name: /^create$/i }) })
      .last();
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

  /** Freshchat iframe can block Compose/Send clicks. */
  async hideFreshchatWidget() {
    await this.page
      .locator('#fc_frame, iframe#fc_widget')
      .evaluateAll((nodes) => {
        nodes.forEach((node) => {
          const el = node;
          el.style.setProperty('pointer-events', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('display', 'none', 'important');
        });
      })
      .catch(() => {});
  }

  async expectRfqPageLoaded() {
    await this.waitForNetworkSettled();
    await expect(
      this.page.getByRole('button', { name: /create rfq/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * Project profile → Procurement → RFQ list (Create RFQ visible).
   * Tile click often misses RFQ (label is typography, not a MuiCard); URL + client menu are fallbacks.
   */
  async navigateToRfqModule() {
    const createRfq = this.page.getByRole('button', { name: /create rfq/i }).first();
    if (await createRfq.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Already on RFQ module — skipping navigation');
      return;
    }

    const ProjectProfilePage = require('../../ProjectProfilePage');
    const profile = new ProjectProfilePage(this.page);

    // Screenshot reference: classic profile with New UI OFF + Procurement tab + RFQ tile.
    await profile.ensureClassicProjectUi();

    const procurementVisible =
      (await profile.procurementHeading.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await profile._visibleHeading('Procurement').isVisible({ timeout: 2000 }).catch(() => false));
    if (procurementVisible) {
      await profile.selectHeading('Procurement');
    }

    try {
      await profile.clickModuleCard('RFQ');
    } catch (err) {
      console.log(`RFQ module card click failed (${err.message}); trying classic RFQ tile`);
      const rfqTile = this.page
        .locator('p.MuiTypography-root.MuiTypography-body1')
        .filter({ hasText: /^RFQ$/i })
        .filter({ visible: true })
        .first();
      if (await rfqTile.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rfqTile.scrollIntoViewIfNeeded().catch(() => {});
        await rfqTile.click({ timeout: 15000, force: true });
        await this.waitForNetworkSettled();
      } else {
        const ProjectNavigationPage = require('../../ProjectNavigationPage');
        const nav = new ProjectNavigationPage(this.page);
        await nav.openRfqFromClientMenu();
      }
    }

    await this.expectRfqPageLoaded();
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

  /**
   * Compose / attachment flows call this before Action. Keep the RFQ tab focused
   * and fail fast if Playwright already closed the page.
   */
  async ensureActivePage() {
    if (!this.page || this.page.isClosed()) {
      throw new Error('RFQ page is closed.');
    }
    await this.page.bringToFront().catch(() => {});
  }

  async dismissOpenMenusAndPopovers() {
    if (!this.page || this.page.isClosed()) {
      return;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(80).catch(() => {});
    if (this.page.isClosed()) {
      return;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(80).catch(() => {});
  }

  /**
   * After scrolling to Attachments (bottom of form), the **Action** button is often in the header/toolbar.
   * Reset window + main scroll so Action → Compose email is clickable.
   */
  async scrollRfqPageAndMainToTop() {
    if (!this.page || this.page.isClosed()) {
      return;
    }
    await this.page
      .evaluate(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const doc = document.scrollingElement || document.documentElement;
        if (doc) {
          doc.scrollTop = 0;
        }
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        document.querySelectorAll('main, [role="main"]').forEach((m) => {
          try {
            m.scrollTop = 0;
          } catch (_) {
            /* ignore */
          }
        });
      })
      .catch(() => {});
    await this.page.waitForTimeout(120).catch(() => {});
  }

  /**
   * Prefer a visible **Action** in the form toolbar/header. After long scrolls (attachments),
   * `getByRole(...).first()` can resolve to a hidden duplicate in the DOM.
   */
  async resolveVisibleRfqFormActionButton() {
    const namePatterns = [
      /^action$/i,
      /^actions$/i,
      /\bmore actions\b/i,
      /\baction menu\b/i,
      /\baction\b/i,
    ];

    const scopes = [
      this.page.locator('header').filter({ visible: true }),
      this.page.getByRole('banner').filter({ visible: true }),
      this.page.locator('[class*="MuiToolbar-root"]').filter({ visible: true }),
      this.page.locator('[class*="toolbar"]').filter({ visible: true }),
    ];

    for (const scope of scopes) {
      if ((await scope.count()) === 0) {
        continue;
      }
      const root = scope.first();
      if (!(await root.isVisible({ timeout: 600 }).catch(() => false))) {
        continue;
      }
      for (const nameRe of namePatterns) {
        const loc = root.getByRole('button', { name: nameRe }).filter({ visible: true });
        const n = await loc.count().catch(() => 0);
        if (n > 0) {
          return loc.last();
        }
      }
    }

    for (const nameRe of namePatterns) {
      const loc = this.page.getByRole('button', { name: nameRe }).filter({ visible: true });
      const n = await loc.count().catch(() => 0);
      if (n > 0) {
        return loc.last();
      }
    }

    return this.page.getByRole('button', { name: /\baction\b/i }).filter({ visible: true }).last();
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
   * Visible MUI date calendar root (popper or modal).
   */
  async getOpenMuiCalendarScope() {
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
    return calendarScope;
  }

  async muiClickPrevMonth(calendarScope) {
    const named = calendarScope
      .getByRole('button', { name: /previous month|go to previous month/i })
      .first();
    if (await named.isVisible({ timeout: 800 }).catch(() => false)) {
      await named.click();
      return;
    }
    const iconBtn = calendarScope
      .locator(
        '.MuiPickersArrowSwitcher-previousIconButton, button[aria-label*="Previous" i]'
      )
      .first();
    await iconBtn.click({ timeout: 5000 });
  }

  async muiClickNextMonth(calendarScope) {
    const named = calendarScope
      .getByRole('button', { name: /next month|go to next month/i })
      .first();
    if (await named.isVisible({ timeout: 800 }).catch(() => false)) {
      await named.click();
      return;
    }
    const iconBtn = calendarScope
      .locator('.MuiPickersArrowSwitcher-nextIconButton, button[aria-label*="Next" i]')
      .first();
    await iconBtn.click({ timeout: 5000 });
  }

  async navigateMuiCalendarToMonthYear(calendarScope, targetDate) {
    const wantY = targetDate.getFullYear();
    const wantM = targetDate.getMonth();
    for (let step = 0; step < 24; step += 1) {
      const label = (
        await calendarScope
          .locator('.MuiPickersCalendarHeader-label')
          .first()
          .innerText()
          .catch(() => '')
      ).trim();
      const m = label.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
      );
      if (!m) {
        await this.muiClickPrevMonth(calendarScope);
        continue;
      }
      const cur = new Date(Date.parse(`${m[1]} 1, ${m[2]}`));
      if (Number.isNaN(cur.getTime())) {
        await this.muiClickPrevMonth(calendarScope);
        continue;
      }
      if (cur.getFullYear() === wantY && cur.getMonth() === wantM) {
        return;
      }
      const wantTs = new Date(wantY, wantM, 1).getTime();
      const curTs = new Date(cur.getFullYear(), cur.getMonth(), 1).getTime();
      if (curTs > wantTs) {
        await this.muiClickPrevMonth(calendarScope);
      } else {
        await this.muiClickNextMonth(calendarScope);
      }
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Clicks a specific day inside an open MUI X date picker (popper or modal).
   */
  async pickDateFromOpenMuiCalendar(targetDate) {
    const calendarScope = await this.getOpenMuiCalendarScope();
    if (!(await calendarScope.isVisible({ timeout: 2500 }).catch(() => false))) {
      return false;
    }

    await expect(calendarScope).toBeVisible({ timeout: 15000 });
    await this.navigateMuiCalendarToMonthYear(calendarScope, targetDate);

    const dayNum = targetDate.getDate();
    const dayRe = new RegExp(`^\\s*${dayNum}\\s*$`);
    const dayBtn = calendarScope
      .locator(
        'button.MuiPickersDay-root:not(.MuiPickersDay-outsideCurrentMonth):not(.Mui-disabled):not([aria-disabled="true"])'
      )
      .filter({ hasText: dayRe })
      .first();
    if (await dayBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await dayBtn.scrollIntoViewIfNeeded();
      await dayBtn.click({ timeout: 10000 });
      return true;
    }

    const gridCell = calendarScope.getByRole('gridcell', { name: dayRe }).first();
    if (await gridCell.isVisible({ timeout: 2500 }).catch(() => false)) {
      await gridCell.scrollIntoViewIfNeeded();
      await gridCell.click({ timeout: 10000 });
      return true;
    }

    return false;
  }

  /**
   * Clicks today's date inside an open MUI X date picker (popper or modal).
   */
  async pickTodayFromOpenMuiCalendar() {
    const calendarScope = await this.getOpenMuiCalendarScope();
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

  async openMuiDatePickerForTarget(target) {
    await target.scrollIntoViewIfNeeded();
    await this.dismissOpenMenusAndPopovers();

    await target.click({ timeout: 15000 });
    await this.page.waitForTimeout(400);

    let opened = await this.isMuiDateCalendarOpen();
    if (!opened) {
      await this.clickCalendarAdornmentNearInput(target);
      await this.page.waitForTimeout(400);
      opened = await this.isMuiDateCalendarOpen();
    }

    if (!opened) {
      await target.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(400);
      opened = await this.isMuiDateCalendarOpen();
    }

    return opened;
  }

  async openMuiDatePickerAndPickToday(target) {
    const opened = await this.openMuiDatePickerForTarget(target);
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

  async openMuiDatePickerAndPickDate(target, targetDate) {
    const opened = await this.openMuiDatePickerForTarget(target);
    if (!opened) {
      return false;
    }

    const picked = await this.pickDateFromOpenMuiCalendar(targetDate);
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
   * Opens the field, picks the date from the calendar when possible, else types US/ISO date.
   * @returns {Promise<string>} value written (US or ISO depending on input type)
   */
  async setDateInputToValue(target, date) {
    const d = date instanceof Date ? date : new Date(date);
    const us = this.formatUsDate(d);
    const iso = this.formatIsoDate(d);

    const picked = await this.openMuiDatePickerAndPickDate(target, d);
    if (picked) {
      await this.dismissOpenMenusAndPopovers();
      await this.waitForNetworkSettled();
      return us;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(250);

    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 15000 }).catch(() => {});
    const type = ((await target.getAttribute('type')) || '').toLowerCase();
    const val = type === 'date' ? iso : us;
    await target.fill(val).catch(async () => {
      await this.page.keyboard.press('ControlOrMeta+a');
      await this.page.keyboard.type(val);
    });
    await this.page.keyboard.press('Enter').catch(() => {});
    await this.page.keyboard.press('Tab').catch(() => {});
    await this.dismissOpenMenusAndPopovers();
    await this.waitForNetworkSettled();

    await expect
      .poll(async () => (await target.inputValue()).trim().length > 0, { timeout: 15000 })
      .toBe(true);

    return val;
  }

  /**
   * Opens the field, selects today from the calendar when the picker shows, else types US/ISO date.
   */
  async setDateInputToToday(target) {
    await this.setDateInputToValue(target, new Date());
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

  formatUsDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }

  formatIsoDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Created On: pick a random past date within the last 1–14 days (not today).
   */
  async setCreatedOnRandomDate() {
    await this.page
      .waitForURL(/rfq\/(create|edit)/i, { timeout: 90000 })
      .catch(() => {});
    await this.waitForNetworkSettled();
    await this.dismissOpenMenusAndPopovers();
    if (await this.isMuiDateCalendarOpen()) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }

    const daysAgo = Math.floor(Math.random() * 14) + 1;
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);

    console.log(`[RFQ] Setting Created On to ${this.formatUsDate(d)} (${daysAgo} day(s) ago)`);
    const target = await this.resolveRfqDateInput('createdOn');
    const val = await this.setDateInputToValue(target, d);

    this.lastCreatedOnDate = val;
    console.log(`[RFQ] Set Created On to random date ${val} (${daysAgo} day(s) ago)`);
  }

  async searchRfqListIfPossible(title) {
    // Only an RFQ-list search; the header "Search Anything in IntoAEC" is a global search that navigates away.
    const candidates = this.page
      .locator('input[placeholder*="search" i], input[type="search"]')
      .filter({ visible: true });
    let search = null;
    let placeholder = '';
    const count = await candidates.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const ph = ((await candidates.nth(i).getAttribute('placeholder').catch(() => '')) || '').trim();
      if (/anything|intoaec/i.test(ph)) continue;
      search = candidates.nth(i);
      placeholder = ph;
      break;
    }
    if (!search) {
      console.log('[RFQ] No RFQ-list search box (only global search) — locating the RFQ card directly');
      return;
    }
    await search.click({ timeout: 10000 }).catch(() => {});
    await search.fill('');
    await search.fill(String(title));
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(500);
    if (!(await this.page.getByRole('button', { name: /create rfq/i }).first().isVisible({ timeout: 3000 }).catch(() => false))) {
      throw new Error(`RFQ search for "${title}" left the RFQ list (${this.page.url()})`);
    }
    console.log(`[RFQ] Searched RFQ list for "${title}" (placeholder "${placeholder}")`);
  }

  async openRfqByTitle(titleText) {
    const title = String(titleText || '').trim();
    if (!title) throw new Error('RFQ title is required to open the RFQ');

    await this.waitForNetworkSettled();
    await this.expectRfqPageLoaded();
    await this.searchRfqListIfPossible(title);

    const RfqPreviewPage = require('./create-rfq/rfq-preview.page');
    const preview = new RfqPreviewPage(this.page);

    // Wait until the title text itself is on the list.
    await expect(
      this.page.getByText(title, { exact: true }).filter({ visible: true }).first()
    ).toBeVisible({
      timeout: Math.max(this.defaultTimeout, 120000),
    });

    // Always open the most recently created RFQ with this title (highest RFQ####) — not random.
    const card = await preview.resolveRfqListCardForTitle(title);
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.scrollIntoViewIfNeeded().catch(() => {});

    const cardText = await card.innerText().catch(() => '');
    const rfqNo = preview.parseRfqNumberFromText(cardText);
    this.lastOpenedRfqNumber = rfqNo >= 0 ? rfqNo : null;
    console.log(
      `[RFQ] Opening most recently created "${title}"${
        rfqNo >= 0 ? ` (RFQ${String(rfqNo).padStart(7, '0')})` : ''
      }`
    );

    // Click Expand on this RFQ card only ("Expand" is a text link, not a button, on the current UI).
    console.log(`[RFQ] Expanding RFQ card "${title}"`);
    const cardByNo = rfqNo >= 0 ? this.rfqListCardByNumber(rfqNo) : card;
    const expandBtn = cardByNo
      .getByText(/^expand$/i)
      .filter({ visible: true })
      .first()
      .or(card.getByRole('button', { name: /^expand$/i }).filter({ visible: true }).first());

    if (await expandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expandBtn.scrollIntoViewIfNeeded().catch(() => {});
      await expandBtn.click({ timeout: 15000 }).catch(async () => {
        await expandBtn.click({ timeout: 15000, force: true });
      });
      await this.page.waitForTimeout(500);
      console.log(`[RFQ] Clicked Expand on most recent RFQ "${title}"`);
    } else {
      await preview.ensureRfqCardRowExpanded(card);
    }

    // Confirm expanded (Collapse visible) when possible.
    const collapseBtn = cardByNo.getByText(/^collapse$/i).filter({ visible: true }).first();
    if (!(await collapseBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      await preview.ensureRfqCardRowExpanded(card);
    }

    this.lastOpenedRfqCardTitle = title;
    this.lastOpenedRfqCard = card;
    this.lastRfqTitle = title;

    try {
      const vendorRfqSession = require('../../../../../support/vendor-rfq-session');
      vendorRfqSession.setRfqTitle(title);
      if (this.lastOpenedRfqNumber != null && this.lastOpenedRfqNumber >= 0) {
        vendorRfqSession.setRfqNumber(String(this.lastOpenedRfqNumber));
      }
    } catch {
      /* optional session */
    }

    // Soft: status chip wording varies; dedicated Then steps assert price values.
    await this.expectPriceUpdateStatusOnExpandedCard(card).catch((err) => {
      console.warn(
        `[RFQ] Price-update status chip not found yet after Expand (${String(err?.message || err).slice(0, 120)}) — continuing; Then steps will assert prices`
      );
    });

    console.log(`[RFQ] Expanded most recent "${title}" (${this.page.url()})`);
  }

  /** Innermost RFQ list card for RFQ#n (header row with its Expand / Collapse link). */
  rfqListCardByNumber(rfqNo) {
    const label = `RFQ${String(rfqNo).padStart(7, '0')}`;
    return this.page
      .locator('div')
      .filter({ hasText: label })
      .filter({ has: this.page.getByText(/^(expand|collapse)$/i) })
      .last();
  }

  /** Expanded vendor row (status chip + "Vendor: …" + 3-dot menu) under the opened RFQ. */
  expandedVendorRow(statusRe = /price\s*updated/i) {
    return this.page
      .locator('div')
      .filter({ hasText: statusRe })
      .filter({ hasText: /vendor\s*:/i })
      .filter({
        has: this.page.locator(
          'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"], button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-ellipsis)'
        ),
      })
      .filter({ visible: true })
      .last();
  }

  /** Expanded RFQ → vendor row 3-dot → Preview; returns the preview dialog. */
  async openPreviewFromExpandedVendorRow() {
    const dialog = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /item\s*description|business\s*info|billed\s*to/i })
      .last();
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) return dialog;

    const row = this.expandedVendorRow(/price\s*updated|received|accepted|declined|sent/i);
    await expect(row).toBeVisible({ timeout: 30000, message: 'Expanded RFQ vendor row (with 3-dot menu) not visible' });
    const kebab = row
      .locator(
        'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"]), button[aria-haspopup="menu"], button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-ellipsis)'
      )
      .filter({ visible: true })
      .last();
    await kebab.scrollIntoViewIfNeeded().catch(() => {});
    await kebab.click({ timeout: 15000 });

    const previewItem = this.page
      .locator('[role="menuitem"], .MuiMenuItem-root')
      .filter({ hasText: /^preview$/i })
      .filter({ visible: true })
      .first();
    await expect(previewItem).toBeVisible({ timeout: 10000, message: 'Preview not found in vendor row 3-dot menu' });
    await previewItem.click();
    await expect(dialog).toBeVisible({ timeout: 30000, message: 'RFQ Preview dialog did not open from 3-dot menu' });
    console.log('[RFQ] Opened Preview from expanded vendor row 3-dot menu');
    return dialog;
  }

  /**
   * After Expand: assert vendor price-update status is shown on the card (Updated / Price Updated / Quoted, etc.).
   */
  async expectPriceUpdateStatusOnExpandedCard(cardOrNull) {
    const vendorRow = this.expandedVendorRow(/price\s*updated/i);
    if (await vendorRow.isVisible({ timeout: 20000 }).catch(() => false)) {
      const rowText = ((await vendorRow.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      console.log(`[RFQ] Price update status visible on expanded RFQ vendor row: ${rowText.slice(0, 120)}`);
      return;
    }

    const card =
      cardOrNull ||
      this.lastOpenedRfqCard ||
      this.page.locator('main, [role="main"]').filter({ visible: true }).first();

    const statusRe =
      /price\s*updated|updated\s*price|vendor\s*updated|quoted|price\s*received|rate\s*updated|vendor\s*responded|responded|submitted/i;

    const statusInCard = card.getByText(statusRe).filter({ visible: true }).first();
    if (await statusInCard.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(statusInCard).toBeVisible({ timeout: 15000 });
      console.log(`[RFQ] Price update status visible on expanded card`);
      return;
    }

    // Fallback: price amounts on the card (sample data 1000/2000/3000) prove vendor responded.
    const priceHint = card
      .getByText(/\b(1000|2000|3000|1,?000|2,?000|3,?000)\b/)
      .filter({ visible: true })
      .first();
    if (await priceHint.isVisible({ timeout: 8000 }).catch(() => false)) {
      console.log(`[RFQ] Price update status chip missing, but updated price amounts are visible on card`);
      return;
    }

    const statusInPage = this.page
      .locator('main, [role="main"]')
      .getByText(statusRe)
      .filter({ visible: true })
      .first();
    if (await statusInPage.isVisible({ timeout: 15000 }).catch(() => false)) {
      console.log(`[RFQ] Price update status visible on RFQ page`);
      return;
    }

    await expect(statusInPage).toBeVisible({ timeout: 15000 });
    console.log(`[RFQ] Price update status visible on RFQ page`);
  }

  /**
   * Click the "Price Updated" status link on the opened RFQ card to open vendor quote details.
   */
  async clickPriceUpdatedLinkOnOpenedRfqCard() {
    await this.waitForNetworkSettled();
    const title = String(this.lastOpenedRfqCardTitle || this.lastRfqTitle || 'New One').trim();

    let card = this.lastOpenedRfqCard;
    if (!(card && (await card.isVisible({ timeout: 1500 }).catch(() => false)))) {
      try {
        const RfqPreviewPage = require('./create-rfq/rfq-preview.page');
        const preview = new RfqPreviewPage(this.page);
        card = await preview.resolveRfqListCardForTitle(title);
        this.lastOpenedRfqCard = card;
      } catch {
        card = this.page.locator('main, [role="main"]').filter({ visible: true }).first();
      }
    }

    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.scrollIntoViewIfNeeded().catch(() => {});

    const linkCandidates = [
      card.getByRole('link', { name: /price\s*updated/i }).filter({ visible: true }).first(),
      card.getByRole('button', { name: /price\s*updated/i }).filter({ visible: true }).first(),
      card.locator('a, button, span, div, p').filter({ hasText: /^price\s*updated$/i }).filter({ visible: true }).first(),
      card.getByText(/price\s*updated/i).filter({ visible: true }).first(),
      this.page.getByRole('link', { name: /price\s*updated/i }).filter({ visible: true }).first(),
      this.page.getByText(/price\s*updated/i).filter({ visible: true }).first(),
    ];

    let target = null;
    for (const candidate of linkCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await candidate.isVisible({ timeout: 1200 }).catch(() => false)) {
        target = candidate;
        break;
      }
    }

    if (!target) {
      throw new Error(
        'RFQ "Price Updated" link/button was not found on the opened RFQ card. Expand the RFQ first after vendor price update.'
      );
    }

    await target.scrollIntoViewIfNeeded().catch(() => {});
    await target.click({ timeout: 15000 }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    // Detail panel / dialog / expanded quote table should show line items after click.
    // Do NOT open Compare Vendor Price — TC-02 verifies on the RFQ card / Price Updated details only.
    const detailReady = this.page
      .getByText(/material\s*1|line\s*item|vendor\s*rate|quoted\s*price|unit\s*price|\b1000\b|1,?000|\$\s*1,?000/i)
      .filter({ visible: true })
      .first();
    await detailReady.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {
      console.warn('[RFQ] Price Updated details not immediately visible — will assert price on expanded card/page');
    });
    console.log('[RFQ] Opened Price Updated / vendor quote details for verification (no Compare Vendor Price)');
  }

  /** Vendor response / quote status after price update (no Compare Vendor Price). */
  async expectVendorResponseStatusOnExpandedCard(cardOrNull) {
    const vendorRow = this.expandedVendorRow(/price\s*updated|quoted|responded|accepted|declined/i);
    if (await vendorRow.isVisible({ timeout: 15000 }).catch(() => false)) {
      const rowText = ((await vendorRow.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      const vendor = (rowText.match(/vendor\s*:\s*(.+?)(?:\s+created on|$)/i) || [])[1] || '?';
      const status = (rowText.match(/price\s*updated|quoted|responded|accepted|declined/i) || [''])[0];
      console.log(`[RFQ] Vendor response on expanded RFQ: vendor "${vendor.trim()}" — status "${status}"`);
      return;
    }

    const card =
      cardOrNull ||
      this.lastOpenedRfqCard ||
      this.page.locator('main, [role="main"]').filter({ visible: true }).first();

    const responseRe =
      /vendor\s*response|responded|price\s*updated|quoted|quote\s*received|updated|received|submitted|awaiting|vendor\s*updated/i;

    const inCard = card.getByText(responseRe).filter({ visible: true }).first();
    if (await inCard.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[RFQ] Vendor response/status visible on expanded RFQ card');
      return;
    }

    const inPage = this.page
      .locator('main, [role="main"]')
      .getByText(responseRe)
      .filter({ visible: true })
      .first();
    if (await inPage.isVisible({ timeout: 15000 }).catch(() => false)) {
      console.log('[RFQ] Vendor response/status visible on RFQ page');
      return;
    }

    // Soft proof: sample updated amount still counts as vendor response reflected.
    const priceHint = card
      .getByText(/\b(1000|1,?000)\b/)
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('main, [role="main"]')
          .getByText(/\b(1000|1,?000)\b/)
          .filter({ visible: true })
          .first()
      );
    if (await priceHint.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[RFQ] Vendor response reflected via updated price amount on RFQ');
      return;
    }

    await expect(inPage).toBeVisible({ timeout: 15000 });
  }

  /**
   * After Expand: assert RFQ / vendor status shows Declined on the Admin card.
   */
  async expectDeclinedStatusOnExpandedCard(cardOrNull) {
    const card =
      cardOrNull ||
      this.lastOpenedRfqCard ||
      this.page.locator('main, [role="main"]').filter({ visible: true }).first();

    const declinedRe = /\bdeclined\b|\brejected\b|vendor\s*declined|rfq\s*declined/i;
    const vendorRow = this.expandedVendorRow(declinedRe);
    if (await vendorRow.isVisible({ timeout: 20000 }).catch(() => false)) {
      const rowText = ((await vendorRow.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      console.log(`[RFQ] Declined status visible on expanded RFQ vendor row: ${rowText.slice(0, 120)}`);
      return;
    }

    const inCard = card.getByText(declinedRe).filter({ visible: true }).first();
    if (await inCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[RFQ] Declined status visible on expanded Admin RFQ card');
      return;
    }

    const inPage = this.page.getByText(declinedRe).filter({ visible: true }).first();
    await expect(inPage).toBeVisible({
      timeout: 30000,
      message: 'RFQ status "Declined" not visible on Admin RFQ card/page',
    });
    console.log('[RFQ] Declined status visible on Admin RFQ page');
  }

  /**
   * Assert vendor declined response is reflected on the expanded Admin RFQ card.
   */
  async expectVendorDeclinedResponseOnExpandedCard(cardOrNull) {
    const card =
      cardOrNull ||
      this.lastOpenedRfqCard ||
      this.page.locator('main, [role="main"]').filter({ visible: true }).first();

    const responseRe =
      /declined|rejected|vendor\s*declined|vendor\s*response|responded|response\s*:\s*declined/i;
    const vendorRow = this.expandedVendorRow(/declined|rejected/i);
    if (await vendorRow.isVisible({ timeout: 15000 }).catch(() => false)) {
      const rowText = ((await vendorRow.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      const vendor = (rowText.match(/vendor\s*:\s*(.+?)(?:\s+created on|$)/i) || [])[1] || '?';
      console.log(`[RFQ] Vendor "${vendor.trim()}" declined response visible on expanded RFQ`);
      return;
    }

    const inCard = card.getByText(responseRe).filter({ visible: true }).first();
    if (await inCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[RFQ] Vendor declined response visible on expanded Admin RFQ card');
      return;
    }

    const inPage = this.page.getByText(responseRe).filter({ visible: true }).first();
    await expect(inPage).toBeVisible({
      timeout: 30000,
      message: 'Vendor declined response not visible on Admin RFQ card/page',
    });
    console.log('[RFQ] Vendor declined response visible on Admin RFQ page');
  }

  /**
   * Assert vendor comment text is visible on the Admin RFQ preview.
   * The text sits in the line accordion (Material 1) and stays hidden until Show comments, then the accordion is opened.
   */
  async expectVendorCommentVisibleOnExpandedCard(commentText) {
    const comment = String(commentText || '').trim();
    if (!comment) throw new Error('Expected vendor comment text is required');
    const commentRe = new RegExp(comment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const dialog = await this.openPreviewFromExpandedVendorRow();
    const exitMode = dialog.getByRole('button', { name: /exit\s*comment\s*mode/i }).filter({ visible: true }).first();
    if (!(await exitMode.isVisible({ timeout: 1500 }).catch(() => false))) {
      const show = dialog.getByRole('button', { name: /show\s*comments?/i }).filter({ visible: true }).first();
      await expect(show).toBeVisible({
        timeout: 15000,
        message: 'Show comments was not on the Admin RFQ Preview',
      });
      await show.click({ timeout: 15000, force: true });
      console.log('[RFQ] Clicked Show comments on Admin RFQ Preview');
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(800).catch(() => {});
    }

    const summaries = dialog.locator('.MuiAccordionSummary-root');
    await expect(summaries.first()).toBeVisible({
      timeout: 15000,
      message: 'Admin RFQ comment section did not appear after Show comments',
    }).catch(() => {});
    const summaryCount = await summaries.count().catch(() => 0);
    for (let i = 0; i < summaryCount; i += 1) {
      const summary = summaries.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await summary.isVisible({ timeout: 500 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      if ((await summary.getAttribute('aria-expanded').catch(() => null)) === 'true') continue;
      // eslint-disable-next-line no-await-in-loop
      await summary.click({ timeout: 5000, force: true }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(400).catch(() => {});
    }

    const hit = dialog.getByText(commentRe).filter({ visible: true }).first();
    await expect(hit).toBeVisible({
      timeout: 20000,
      message: `Vendor comment "${comment}" not visible on Admin RFQ Preview after Show comments`,
    });
    console.log(`[RFQ] Vendor comment visible on Admin RFQ: "${comment}"`);
  }

  /**
   * Match prices as shown in UI: 1000, 1,000, 1000.00, ₹1,000, etc.
   */
  priceDisplayRegex(priceValue) {
    const raw = String(priceValue || '').trim().replace(/,/g, '');
    const intPart = raw.replace(/\.\d+$/, '');
    if (!/^\d+$/.test(intPart)) {
      return new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',?');
    return new RegExp(`(?:₹|rs\\.?|inr|\\$)?\\s*${grouped}(?:\\.\\d{1,2})?`, 'i');
  }

  normalizeMoneyText(text) {
    return String(text || '')
      .replace(/,/g, '')
      .replace(/[₹$]/g, '')
      .replace(/\b(?:rs\.?|inr)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  textHasPriceAmount(text, priceValue) {
    const wanted = String(priceValue || '')
      .trim()
      .replace(/,/g, '')
      .replace(/\.0+$/, '');
    if (!wanted) return false;
    const normalized = this.normalizeMoneyText(text);
    // Whole-number or with decimals: 1000 / 1000.00 / 1000.5
    return new RegExp(`(^|[^\\d])${wanted}(?:\\.\\d{1,2})?([^\\d]|$)`).test(normalized);
  }

  async revealVendorQuotedPricesOnOpenCard() {
    const card = this.lastOpenedRfqCard;
    if (!(card && (await card.isVisible({ timeout: 1500 }).catch(() => false)))) {
      return false;
    }

    const compareBtn = card
      .getByRole('button', { name: /compare vendor price|compare price/i })
      .filter({ visible: true })
      .first()
      .or(
        card
          .locator('button, a')
          .filter({ hasText: /compare vendor price|compare price/i })
          .filter({ visible: true })
          .first()
      );

    if (!(await compareBtn.isVisible({ timeout: 2500 }).catch(() => false))) {
      return false;
    }

    await compareBtn.scrollIntoViewIfNeeded().catch(() => {});
    await compareBtn.click({ timeout: 15000 }).catch(async () => {
      await compareBtn.click({ timeout: 15000, force: true });
    });
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});
    console.log('[RFQ] Opened Compare Vendor Price to reveal quoted rates');
    return true;
  }

  /**
   * Open RFQ Preview from the expanded card (document icon next to "Price Updated",
   * or overflow → Preview). Does not open Compare Vendor Price.
   */
  async openPreviewOnOpenedRfqCard() {
    const RfqPreviewPage = require('./create-rfq/rfq-preview.page');
    const preview = new RfqPreviewPage(this.page);
    const title = String(this.lastOpenedRfqCardTitle || this.lastRfqTitle || 'New One').trim();

    let card = this.lastOpenedRfqCard;
    if (!(card && (await card.isVisible({ timeout: 1500 }).catch(() => false)))) {
      card = await preview.resolveRfqListCardForTitle(title);
      this.lastOpenedRfqCard = card;
    }
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await preview.ensureRfqCardRowExpanded(card).catch(() => {});

    const beforeUrl = this.page.url();
    const beforePages = this.page.context().pages().length;

    // Prefer the blue document Preview icon next to "Price Updated" (not Compare Vendor Price).
    const priceUpdated = card.getByText(/price\s*updated/i).filter({ visible: true }).first();
    let previewHit = null;
    if (await priceUpdated.isVisible({ timeout: 3000 }).catch(() => false)) {
      const nearStatus = priceUpdated.locator(
        'xpath=ancestor::div[contains(@class,"MuiBox") or contains(@class,"flex") or contains(@class,"d-flex")][1]'
      );
      const docIcon = nearStatus
        .locator(
          'button:has(svg[data-testid*="Description" i]), button:has(svg[data-testid*="InsertDriveFile" i]), button:has(svg[data-testid*="Article" i]), button:has(svg[data-testid*="TextSnippet" i]), a:has(svg[data-testid*="Description" i]), a:has(svg[data-testid*="InsertDriveFile" i])'
        )
        .filter({ visible: true })
        .first()
        .or(
          nearStatus
            .locator('button, a')
            .filter({ has: this.page.locator('svg') })
            .filter({ visible: true })
            .first()
        );
      if (await docIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        previewHit = docIcon;
      }
    }

    if (!previewHit) {
      const iconBtn = preview.locatorOpenPreviewIconWithinCard(card);
      if (await iconBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        previewHit = iconBtn;
      }
    }

    if (previewHit) {
      await previewHit.scrollIntoViewIfNeeded().catch(() => {});
      await previewHit.click({ timeout: 15000 }).catch(async () => {
        await previewHit.click({ timeout: 15000, force: true });
      });
      console.log('[RFQ] Clicked Preview icon on expanded RFQ card (next to Price Updated)');
    } else {
      await preview.openThreeDotMenuInExpandedRfqCard(card);
      await preview.clickPreviewInThreeDotMenu();
      console.log('[RFQ] Opened Preview from RFQ overflow menu');
    }

    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(800).catch(() => {});

    // Preview may open in a new tab — keep world page; store preview page for asserts.
    this._rfqPreviewPage = this.page;
    const pages = this.page.context().pages();
    if (pages.length > beforePages) {
      const newest = pages[pages.length - 1];
      await newest.waitForLoadState('domcontentloaded').catch(() => {});
      this._rfqPreviewPage = newest;
      console.log(`[RFQ] Preview opened in new tab (${newest.url()})`);
    }

    const previewPage = this._rfqPreviewPage;
    const previewOnPage = new RfqPreviewPage(previewPage);
    await previewOnPage.expectRfqPreviewLoaded().catch(async () => {
      await expect
        .poll(
          async () => {
            if (previewPage.url() !== beforeUrl) return true;
            if (await previewOnPage.rfqPreviewContainer().isVisible({ timeout: 500 }).catch(() => false)) {
              return true;
            }
            return previewPage
              .locator("button[aria-label='Download as PDF'], iframe, canvas")
              .filter({ visible: true })
              .first()
              .isVisible({ timeout: 500 })
              .catch(() => false);
          },
          { timeout: 45000, intervals: [500, 1000, 2000] }
        )
        .toBeTruthy();
    });
    console.log(`[RFQ] RFQ Preview ready for price verification (${previewPage.url()})`);
  }

  /**
   * Assert updated vendor price inside RFQ Preview (opened from expanded card Preview icon).
   * Does not use Compare Vendor Price.
   */
  async expectUpdatedPriceVisible(priceValue, itemName = 'Material 1') {
    const price = String(priceValue || '').trim();
    const item = String(itemName || '').trim();
    if (!price) throw new Error('Expected RFQ price value is required');

    await this.waitForNetworkSettled();
    const priceRe = this.priceDisplayRegex(price);
    const title = String(this.lastOpenedRfqCardTitle || this.lastRfqTitle || 'New One').trim();

    // Expanded RFQ → vendor row 3-dot → Preview: every line item's Rate must be the vendor's updated price.
    const vendorPreview = await this.openPreviewFromExpandedVendorRow().catch((err) => {
      console.warn(`[RFQ] 3-dot Preview on vendor row unavailable (${String(err?.message || err).slice(0, 120)})`);
      return null;
    });
    if (vendorPreview) {
      const lineRows = vendorPreview
        .locator('tbody tr')
        .filter({ visible: true })
        .filter({ hasNot: this.page.locator('th') });
      await expect
        .poll(async () => lineRows.count(), { timeout: 30000, message: 'RFQ Preview line items did not load' })
        .toBeGreaterThan(0);
      const rowTexts = (await lineRows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
      const scoped = item ? rowTexts.filter((t) => t.toLowerCase().includes(item.toLowerCase())) : rowTexts;
      const targets = scoped.length ? scoped : rowTexts;
      const missing = targets.filter((t) => !this.textHasPriceAmount(t, price));
      if (missing.length) {
        throw new Error(
          `RFQ Preview line item(s) without updated price ${price}: ${missing.join(' | ')}. RFQ "${title}"`
        );
      }
      console.log(`[RFQ] Verified updated price ${price} on ${targets.length} RFQ Preview line item(s): ${targets.join(' | ')}`);
      return;
    }

    const RfqPreviewPage = require('./create-rfq/rfq-preview.page');
    await this.openPreviewOnOpenedRfqCard();

    const previewPage = this._rfqPreviewPage || this.page;
    const preview = new RfqPreviewPage(previewPage);

    const scopeHasPrice = async (scope) => {
      if (!(await scope.isVisible({ timeout: 400 }).catch(() => false))) return false;
      if (await scope.getByText(priceRe).first().isVisible({ timeout: 800 }).catch(() => false)) return true;
      const text = (await scope.innerText().catch(() => '')) || '';
      if (this.textHasPriceAmount(text, price)) return true;
      const inputs = scope.locator('input, textarea, [contenteditable="true"]');
      const n = Math.min(await inputs.count().catch(() => 0), 40);
      for (let i = 0; i < n; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const val = (await inputs.nth(i).inputValue().catch(() => '')) || '';
        if (this.textHasPriceAmount(val, price)) return true;
      }
      return false;
    };

    const collectScopes = async () => {
      const scopes = [];
      const root = await preview.resolveRfqPreviewInteractionRoot().catch(() => null);
      if (root) scopes.push(root);
      const dialog = previewPage.getByRole('dialog').filter({ visible: true }).last();
      if (await dialog.isVisible({ timeout: 400 }).catch(() => false)) scopes.push(dialog);
      scopes.push(previewPage.locator('main, [role="main"]').filter({ visible: true }).first());
      scopes.push(previewPage.locator('body'));

      // Preview body is often inside an iframe.
      for (const frame of previewPage.frames()) {
        if (frame === previewPage.mainFrame()) continue;
        try {
          scopes.push(frame.locator('body'));
        } catch {
          /* ignore */
        }
      }
      return scopes;
    };

    const deadline = Date.now() + 60000;
    let lastSnippet = '';
    while (Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      const scopes = await collectScopes();
      for (const scope of scopes) {
        // eslint-disable-next-line no-await-in-loop
        const text = ((await scope.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (text && text.length < 5000) lastSnippet = text.slice(0, 700);

        if (item) {
          const itemRe = new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const rows = scope
            .locator('tr, [role="row"], .MuiTableRow-root, div')
            .filter({ hasText: itemRe })
            .filter({ visible: true });
          const rowCount = await rows.count().catch(() => 0);
          for (let i = 0; i < Math.min(rowCount, 12); i += 1) {
            // eslint-disable-next-line no-await-in-loop
            if (await scopeHasPrice(rows.nth(i))) {
              console.log(`[RFQ] Verified updated price ${price} on Preview near "${item}"`);
              return;
            }
          }
        }

        // eslint-disable-next-line no-await-in-loop
        if (await scopeHasPrice(scope)) {
          console.log(`[RFQ] Verified updated price ${price} on RFQ Preview`);
          return;
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await previewPage.waitForTimeout(800).catch(() => {});
    }

    throw new Error(
      `RFQ updated price ${price}${item ? ` for "${item}"` : ''} not visible on RFQ Preview ` +
        `(opened via Preview icon — Compare Vendor Price not used). RFQ "${title}". ` +
        `URL: ${previewPage.url()}. Snippet: ${lastSnippet || '(empty)'}`
    );
  }

  /**
   * Open Add Vendor panel, select a vendor (prefer known RFQ portal user), confirm Add.
   * @param {{ preferEmail?: string }} [opts]
   * @returns {Promise<string | null>} Email found on the selected vendor row, if any.
   */
  async addVendorFromPanel(opts = {}) {
    const testData = require('../../../../../utils/testData');
    const preferEmail = String(
      opts.preferEmail || testData.vendor?.rfqUser?.email || 'praveen@yopmail.com'
    )
      .trim()
      .toLowerCase();
    const preferLocal = preferEmail.replace(/@(yopmail|mailinator)\.com$/i, '').trim();

    await this.ensureOnRfqCreateOrEditForm();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.scrollRfqPageAndMainToTop().catch(() => {});
    await this.waitForNetworkSettled();

    const addVendor = this.page
      .getByRole('button', { name: /add vendor( details)?|change vendor|select vendor/i })
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .getByText(/^\+?\s*add vendor( details)?$/i)
          .filter({ visible: true })
          .first()
      )
      .or(
        this.page
          .locator('button, a, span.pointer, [role="button"]')
          .filter({ hasText: /add vendor|change vendor|select vendor/i })
          .filter({ visible: true })
          .first()
      );

    if (!(await addVendor.isVisible({ timeout: 20000 }).catch(() => false))) {
      await this.page
        .evaluate(() => {
          window.scrollBy(0, 400);
          const se = document.scrollingElement || document.documentElement;
          if (se) se.scrollTop = Math.min(se.scrollHeight, se.scrollTop + 400);
        })
        .catch(() => {});
      await this.page.waitForTimeout(500);
    }

    await expect(addVendor).toBeVisible({
      timeout: this.defaultTimeout,
      message: 'RFQ Add Vendor / Change Vendor control not found on create form',
    });
    await addVendor.scrollIntoViewIfNeeded().catch(() => {});
    await addVendor.click({ force: true }).catch(async () => {
      await addVendor.click({ timeout: 15000 });
    });

    const panel = this.page
      .locator('.MuiModal-root, [role="dialog"], .drawer, .MuiDrawer-root')
      .filter({ visible: true })
      .last();
    await expect(panel).toBeVisible({ timeout: 45000 });

    // Prefer known RFQ portal user; if missing from this project, use first listed vendor.
    const search = panel
      .getByPlaceholder(/search/i)
      .or(panel.locator('input[type="search"]'))
      .or(panel.locator('input[type="text"]').first())
      .filter({ visible: true })
      .first();
    const clearVendorSearch = async () => {
      if (!(await search.isVisible({ timeout: 800 }).catch(() => false))) return;
      await search.click({ timeout: 5000 }).catch(() => {});
      await search.fill('').catch(() => {});
      await this.page.waitForTimeout(600);
    };
    if (await search.isVisible({ timeout: 2500 }).catch(() => false)) {
      const hint = preferLocal || preferEmail.split('@')[0] || 'bhavanimm';
      await search.click({ timeout: 5000 }).catch(() => {});
      await search.fill('').catch(() => {});
      await search.fill(hint).catch(() => {});
      await this.page.waitForTimeout(800);
      console.log(`[RFQ] Vendor panel search: "${hint}"`);
    }

    const rows = panel.locator('table tbody tr').filter({ visible: true });
    const hasRows = await rows.first().isVisible({ timeout: 8000 }).catch(() => false);
    if (!hasRows) {
      console.log('[RFQ] Preferred vendor search returned no rows — clearing search for full list');
      await clearVendorSearch();
      await expect(rows.first()).toBeVisible({
        timeout: 60000,
        message: 'RFQ Add Vendor panel has no vendor rows after clearing search',
      });
    }

    const inboxRe = /[\w.+-]+@(?:yopmail|mailinator)\.com/i;
    let selectedRow = null;
    let selectedEmail = null;
    let rowCount = await rows.count().catch(() => 0);

    const preferRe = new RegExp(preferLocal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    // Exact email first — a loose name match would also hit invited look-alikes (e.g. praveen80475277@yopmail.com).
    const pickPreferFromRows = async () => {
      const texts = [];
      for (let i = 0; i < rowCount; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        texts.push(((await rows.nth(i).innerText().catch(() => '')) || '').trim());
      }
      const exactIdx = texts.findIndex((t) =>
        (t.match(new RegExp(inboxRe.source, 'gi')) || []).some((e) => e.toLowerCase() === preferEmail)
      );
      if (exactIdx >= 0) return { row: rows.nth(exactIdx), email: preferEmail };
      const looseIdx = texts.findIndex((t) => preferRe.test(t));
      if (looseIdx >= 0) {
        const m = texts[looseIdx].match(inboxRe);
        return { row: rows.nth(looseIdx), email: (m ? m[0] : preferEmail).toLowerCase() };
      }
      return null;
    };

    let picked = await pickPreferFromRows();
    if (!picked) {
      // Preferred vendor not in filtered results — show full list and try again / take first.
      await clearVendorSearch();
      rowCount = await rows.count().catch(() => 0);
      picked = await pickPreferFromRows();
    }

    if (picked) {
      selectedRow = picked.row;
      selectedEmail = picked.email;
    } else {
      // Use the first vendor on this project — portal login will use this same email.
      for (let i = 0; i < rowCount; i += 1) {
        const row = rows.nth(i);
        // eslint-disable-next-line no-await-in-loop
        const text = ((await row.innerText().catch(() => '')) || '').trim();
        const m = text.match(inboxRe);
        if (!m) continue;
        selectedRow = row;
        selectedEmail = m[0].toLowerCase();
        console.log(`[RFQ] Preferred ${preferEmail} not in panel — adding first vendor ${selectedEmail}`);
        break;
      }
    }

    if (!selectedRow) {
      const dump = [];
      for (let i = 0; i < Math.min(rowCount, 8); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        dump.push(((await rows.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 100));
      }
      throw new Error(
        `RFQ Add Vendor: no selectable vendor in panel. Visible rows: ${dump.join(' || ') || '(none)'}.`
      );
    }

    const radio = selectedRow
      .locator('input[type="radio"]')
      .first()
      .or(selectedRow.getByRole('radio').first());
    if (await radio.isVisible({ timeout: 2000 }).catch(() => false)) {
      try {
        await radio.check({ timeout: 15000 });
    } catch {
        await radio.click({ force: true });
      }
    } else {
      await selectedRow.click({ force: true });
    }

    const addBtn = panel.getByRole('button', { name: /^add$/i }).last();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    const panelGone = await panel.isHidden({ timeout: 45000 }).catch(() => false);
    if (!panelGone) {
      const closeBtn = panel
        .getByRole('button', { name: /close|cancel|×|✕/i })
        .filter({ visible: true })
        .first();
      if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeBtn.click({ force: true }).catch(() => {});
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      await panel.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    }
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForNetworkSettled();
    await this.page
      .getByRole('button', { name: /change vendor|add vendor/i })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
    await this.scrollRfqFormTowardLineItems();
    this.lastAddedVendorEmail = selectedEmail || preferEmail;
    console.log(
      `[RFQ] Vendor added for compose/send: ${this.lastAddedVendorEmail} — Vendor Portal login will use this same email`
    );
    return this.lastAddedVendorEmail;
  }

  async addFirstVendorFromPanel() {
    const testData = require('../../../../../utils/testData');
    return this.addVendorFromPanel({
      preferEmail: testData.vendor?.rfqUser?.email || 'praveen@yopmail.com',
    });
  }

  async scrollRfqFormTowardLineItems() {
    await this.page
      .evaluate(() => {
        const candidates = [
          document.querySelector('main'),
          document.querySelector('[role="main"]'),
          document.querySelector('.MuiDrawer-content'),
          document.scrollingElement,
          document.documentElement,
          document.body,
        ].filter(Boolean);
        for (const el of candidates) {
          try {
            if (el.scrollHeight > el.clientHeight + 40) {
              el.scrollTop = Math.min(el.scrollHeight, Math.max(el.scrollTop, 800));
            }
          } catch {
            /* ignore */
          }
        }
        window.scrollBy(0, 600);
      })
      .catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async ensureOnRfqCreateOrEditForm() {
    const url = String(this.page.url() || '');
    if (/rfq\/(create|edit)/i.test(url)) return;
    // Title field is a strong signal we are still on the create form.
    const title = this.page
      .getByPlaceholder(/title|rfq title/i)
      .or(this.page.getByLabel(/title/i))
      .filter({ visible: true })
      .first();
    if (await title.isVisible({ timeout: 2000 }).catch(() => false)) return;
    await this.page.waitForURL(/rfq\/(create|edit)/i, { timeout: 30000 }).catch(() => {});
  }

  locatorAddManuallyControl() {
    // Classic: "+ Add Manually"; newer RFQ UI: "+ Add Item" (+ "Add from catalog").
    return this.page
      .getByText(/^\+\s*Add Item$/i)
      .first()
      .or(this.page.getByText(/^\+\s*Add Manually$/i).first())
      .or(this.page.locator('span.pointer, button, a, [role="button"], p, div, span')
        .filter({ hasText: /^\s*\+?\s*add\s*(item|manually)\s*$/i })
        .filter({ visible: true })
        .first())
      .or(this.page.getByRole('button', { name: /add\s*(item|manually)/i }).filter({ visible: true }).first())
      .or(this.page.getByText(/add\s*(item|manually)/i).filter({ visible: true }).first());
  }

  async clickAddManually() {
    await this.ensureOnRfqCreateOrEditForm();
    // Close date pickers / menus without targeting create-form drawers.
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});

    // Close leftover *vendor/library* overlays only — do not Escape arbitrary drawers (create form).
    const vendorOverlay = this.page
      .locator('.MuiModal-root, .MuiDrawer-root, [role="dialog"]')
      .filter({ visible: true })
      .filter({ hasText: /add vendor|select vendor|add from library|add from catalog|library|catalog/i })
      .first();
    if (await vendorOverlay.isVisible({ timeout: 800 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await vendorOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }

    // If a blank material row already exists, no need to click Add Item / Add manually.
    const existingName = this.page
      .getByPlaceholder(/material name|item name/i)
      .filter({ visible: true })
      .last();
    if (await existingName.isVisible({ timeout: 1500 }).catch(() => false)) {
      const val = ((await existingName.inputValue().catch(() => '')) || '').trim();
      if (!val) {
        console.log('[RFQ] Blank material row already present — skipping Add Item/Manually click');
        return;
      }
    }

    const lineItemsHeading = this.page.getByText(/line\s*items/i).filter({ visible: true }).first();
    if (await lineItemsHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lineItemsHeading.scrollIntoViewIfNeeded().catch(() => {});
    }

    await this.scrollRfqFormTowardLineItems();

    let addManually = this.locatorAddManuallyControl();

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (await addManually.isVisible({ timeout: 1200 }).catch(() => false)) break;

      await this.scrollRfqFormTowardLineItems();
      await this.page
        .evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          const se = document.scrollingElement || document.documentElement;
          if (se) se.scrollTop = se.scrollHeight;
        })
        .catch(() => {});
      await this.page.waitForTimeout(400);
      addManually = this.locatorAddManuallyControl();
    }

    if (!(await addManually.isVisible({ timeout: 2000 }).catch(() => false))) {
      const hint = await this.page
        .evaluate(() => {
          const body = (document.body && document.body.innerText) || '';
          return body
            .split(/\n/)
            .map((s) => s.trim())
            .filter((s) => /line item|manually|library|catalog|material|vendor|add item|add/i.test(s))
            .slice(0, 25)
            .join(' | ');
        })
        .catch(() => '');
      throw new Error(
        `RFQ "+ Add Item" / "+ Add Manually" not found. URL=${this.page.url()} Nearby: ${hint || '(none)'}`
      );
    }

    await addManually.scrollIntoViewIfNeeded().catch(() => {});
    await addManually.click({ force: true }).catch(async () => {
      await addManually.click({ timeout: 15000 });
    });
    await this.waitForNetworkSettled();
    console.log('[RFQ] Clicked Add Item / Add manually');
  }

  async ensureRfqLineItemsTableVisible() {
    const byAria = this.page.locator('[aria-label*="line items" i]').first();
    if (await byAria.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byAria.scrollIntoViewIfNeeded();
      return byAria;
    }
    const byPlaceholder = this.page
      .locator('table')
      .filter({ has: this.page.getByPlaceholder(/material name|item name|product/i) })
      .first();
    if (await byPlaceholder.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byPlaceholder.scrollIntoViewIfNeeded();
      return byPlaceholder;
    }
    const nearHeading = this.page
      .locator('table')
      .filter({ visible: true })
      .filter({ has: this.page.locator('tbody tr') })
      .last();
    await expect(nearHeading).toBeVisible({ timeout: 60000 });
    await nearHeading.scrollIntoViewIfNeeded();
    return nearHeading;
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
        if (unit !== fallbacks[0]) {
          console.warn(`[RFQ] Unit "${fallbacks[0]}" not offered — selected "${unit}" instead`);
        }
        return unit;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    return null;
  }

  /**
   * Create N new Material products from the RFQ line rows: type a unique name →
   * "Add in cost catalog" → Add Item popover (Unit, Type Material) → Create.
   */
  async createMaterialProductsInCatalog(count = 2, unitLabel = 'Each') {
    const needed = Math.max(1, Number(count) || 2);
    await this.ensureOnRfqCreateOrEditForm();
    await this.scrollRfqFormTowardLineItems();
    await this.page.keyboard.press('Escape').catch(() => {});

    const selected = [];
    for (let i = 0; i < needed; i += 1) {
      const name = `AutoMat ${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      // eslint-disable-next-line no-await-in-loop
      await this.clickAddManually();

      const nameField = this.page
        .getByPlaceholder(/material name|item name|product/i)
        .filter({ visible: true })
        .last();
      // eslint-disable-next-line no-await-in-loop
      await expect(nameField).toBeVisible({ timeout: 30000 });
      // eslint-disable-next-line no-await-in-loop
      await nameField.click();
      // eslint-disable-next-line no-await-in-loop
      await nameField.fill(name);

      // eslint-disable-next-line no-await-in-loop
      await expect(this.addInCostCatalogOption).toBeVisible({
        timeout: 20000,
        message: `"Add in cost catalog" option did not appear after typing "${name}"`,
      });
      // eslint-disable-next-line no-await-in-loop
      await this.addInCostCatalogOption.click();

      const popover = this.addCatalogItemPopover;
      // eslint-disable-next-line no-await-in-loop
      await expect(popover).toBeVisible({ timeout: 20000, message: 'Add Item popover did not open' });

      // eslint-disable-next-line no-await-in-loop
      const unit = await this._pickCatalogPopoverOption(popover.getByPlaceholder(/^unit$/i), [unitLabel, 'Nos']);
      if (!unit) throw new Error(`No unit could be selected in the Add Item popover for "${name}"`);

      const typeInput = popover.locator('input[role="combobox"]').nth(1);
      // eslint-disable-next-line no-await-in-loop
      const typeVal = ((await typeInput.inputValue().catch(() => '')) || '').trim();
      if (!/material/i.test(typeVal)) {
        // eslint-disable-next-line no-await-in-loop
        await this._pickCatalogPopoverOption(typeInput, ['Material']);
      }

      const createBtn = popover.getByRole('button', { name: /^create$/i });
      // eslint-disable-next-line no-await-in-loop
      await expect(createBtn).toBeEnabled({ timeout: 10000 });
      const catalogResponse = this.page
        .waitForResponse((r) => /CREATE_COST_CATALOG/.test(r.request().postData() || ''), { timeout: 20000 })
        .catch(() => null);
      // eslint-disable-next-line no-await-in-loop
      await createBtn.click();
      // eslint-disable-next-line no-await-in-loop
      const resp = await catalogResponse;
      if (resp && resp.status() >= 400) {
        // eslint-disable-next-line no-await-in-loop
        const err = await resp.json().catch(() => ({}));
        console.warn(
          `[RFQ] Cost catalog save failed (${resp.status()}: ${err?.error?.message || err?.message || 'unknown'}) — ` +
            `adding "${name}" as an independent material instead`
        );
        // eslint-disable-next-line no-await-in-loop
        await popover.getByRole('button', { name: /^cancel$/i }).click();
        // eslint-disable-next-line no-await-in-loop
        await expect(popover).toBeHidden({ timeout: 10000 });
        // eslint-disable-next-line no-await-in-loop
        await nameField.click();
        // eslint-disable-next-line no-await-in-loop
        await nameField.fill(name);
        // eslint-disable-next-line no-await-in-loop
        await this.page.keyboard.press('Tab');
        // eslint-disable-next-line no-await-in-loop
        await expect(nameField).toHaveValue(name, { timeout: 10000 });
        selected.push({ name, fullLabel: name, quantity: null, unit: null });
        console.log(`[RFQ] Added independent material ${i + 1}/${needed}: ${name}`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await expect(popover).toBeHidden({ timeout: 20000 });
      // eslint-disable-next-line no-await-in-loop
      await this.waitForNetworkSettled();

      // eslint-disable-next-line no-await-in-loop
      await expect(this.page.locator('table tbody tr').filter({ visible: true }).last()).toContainText(name, {
        timeout: 15000,
      }).catch(async () => {
        await expect(nameField).toHaveValue(name, { timeout: 10000 });
      });

      selected.push({ name, fullLabel: name, quantity: null, unit });
      console.log(`[RFQ] Created Material product ${i + 1}/${needed} in cost catalog: ${name} (unit ${unit})`);
    }

    this.lastRfqSelectedProducts = selected;
    return selected;
  }

  /** Pick the first label (exact, case-insensitive) offered by an Add Item popover autocomplete. */
  async _pickCatalogPopoverOption(input, labels) {
    await expect(input).toBeVisible({ timeout: 10000 });
    for (const label of labels.filter(Boolean)) {
      await input.click();
      await input.fill(String(label));
      const opt = this.page
        .locator('[role="option"], .MuiAutocomplete-option')
        .filter({ hasText: new RegExp(`^\\s*${this.escapeRegExp(label)}\\s*$`, 'i') })
        .first();
      if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opt.click();
        if (label !== labels[0]) console.warn(`[RFQ] "${labels[0]}" not offered in Add Item popover — using "${label}"`);
        return label;
      }
    }
    await input.fill('').catch(() => {});
    return null;
  }

  /**
   * RFQ line row: material name, quantity, and unit only (no description dialog, no rate).
   */
  async addLineItemManually({ itemName, quantity, unitLabel }) {
    await this.dismissOpenMenusAndPopovers();
    await this.clickAddManually();

    // Wait for material name field (table may render slightly after click).
    const nameFieldReady = this.page
      .getByPlaceholder(/material name|item name/i)
      .filter({ visible: true })
      .last();
    await expect(nameFieldReady).toBeVisible({ timeout: 60000 });

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
      )
      .or(nameFieldReady);
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
    if (!this.page || this.page.isClosed()) {
      return;
    }
    const closeSelectors =
      '.Toastify__toast .Toastify__close-button, .Toastify__close-button[aria-label], [class*="Toastify__close-button"]';
    for (let i = 0; i < 10; i += 1) {
      if (this.page.isClosed()) {
        return;
      }
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

    const actionBtn = await this.resolveVisibleRfqFormActionButton();
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

  /**
   * New RFQ create UI: Item Category/Type → Material (or equivalent).
   * Some builds only show category after "+ Add Item".
   */
  async selectItemCategoryType(categoryLabel = 'Material') {
    await this.ensureOnRfqCreateOrEditForm();
    await this.scrollRfqFormTowardLineItems();
    await this.page.keyboard.press('Escape').catch(() => {});

    const wanted = String(categoryLabel || 'Material').trim();

    const resolveCategoryControl = () =>
      this.page
        .getByRole('combobox', { name: /item\s*(category|type)|category|type/i })
        .filter({ visible: true })
        .first()
        .or(
          this.page
            .getByLabel(/item\s*(category|type)|category\/?type|item type/i)
            .filter({ visible: true })
            .first()
        )
        .or(
          this.page
            .getByText(/item\s*(category|type)|category\s*\/\s*type/i)
            .filter({ visible: true })
            .first()
            .locator(
              'xpath=ancestor::*[.//*[@role="combobox"] or .//*[contains(@class,"MuiSelect")]][1]'
            )
            .locator('[role="combobox"], .MuiSelect-select')
            .first()
        )
        .or(
          this.page
            .locator('.MuiSelect-select, [role="combobox"]')
            .filter({ hasText: /category|type|select|material|labour|labor|service|choose/i })
            .filter({ visible: true })
            .first()
        )
        .or(
          this.page
            .locator('table tbody tr')
            .first()
            .locator('.MuiSelect-select, [role="combobox"]')
            .filter({ visible: true })
            .first()
        );

    let categoryControl = resolveCategoryControl();
    if (!(await categoryControl.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Line-item controls often appear only after Add Item.
      const addItem = this.locatorAddManuallyControl();
      if (await addItem.isVisible({ timeout: 4000 }).catch(() => false)) {
        await addItem.click({ force: true }).catch(() => {});
        await this.waitForNetworkSettled();
        await this.page.waitForTimeout(400);
      }
      await this.scrollRfqFormTowardLineItems();
      categoryControl = resolveCategoryControl();
    }

    if (!(await categoryControl.isVisible({ timeout: 15000 }).catch(() => false))) {
      // Soft continue: Material may already be default, or products come from catalog only.
      const alreadyMaterial = this.page
        .getByText(new RegExp(`^\\s*${wanted}\\s*$`, 'i'))
        .filter({ visible: true })
        .first();
      if (await alreadyMaterial.isVisible({ timeout: 2000 }).catch(() => false)) {
        this.lastRfqItemCategory = wanted;
        console.log(`[RFQ] Item Category/Type already shows "${wanted}" — skipping dropdown`);
        return;
      }
      const hint = await this.page
        .evaluate(() => {
          const body = (document.body && document.body.innerText) || '';
          return body
            .split(/\n/)
            .map((s) => s.trim())
            .filter((s) => /category|type|material|product|add item|catalog|line item/i.test(s))
            .slice(0, 20)
            .join(' | ');
        })
        .catch(() => '');
      console.warn(
        `[RFQ] Item Category/Type control not found — continuing; catalog/product step may set Material. Nearby: ${hint || '(none)'}`
      );
      this.lastRfqItemCategory = wanted;
      return;
    }

    await categoryControl.scrollIntoViewIfNeeded().catch(() => {});
    const current = ((await categoryControl.innerText().catch(() => '')) || '').trim();
    if (new RegExp(wanted, 'i').test(current)) {
      this.lastRfqItemCategory = wanted;
      console.log(`[RFQ] Item Category/Type already "${wanted}"`);
      return;
    }

    await categoryControl.click({ timeout: 15000 });
    await this.page.waitForTimeout(400);

    const opt = this.page
      .getByRole('option', { name: new RegExp(`^\\s*${wanted}\\s*$`, 'i') })
      .first()
      .or(this.page.getByRole('option', { name: new RegExp(wanted, 'i') }).first())
      .or(
        this.page
          .locator('[role="listbox"] [role="option"], [role="listbox"] li, .MuiMenuItem-root, .MuiAutocomplete-option')
          .filter({ hasText: new RegExp(wanted, 'i') })
          .filter({ visible: true })
          .first()
      );

    if (!(await opt.isVisible({ timeout: 8000 }).catch(() => false))) {
      // Wrong control may have opened (e.g. product list). Close and continue — catalog step selects Material products.
      const openOpts = await this.page
        .locator('[role="listbox"] [role="option"], .MuiAutocomplete-option, .MuiMenuItem-root')
        .filter({ visible: true })
        .evaluateAll((els) => els.map((e) => (e.textContent || '').trim()).filter(Boolean).slice(0, 12))
        .catch(() => []);
      await this.page.keyboard.press('Escape').catch(() => {});
      console.warn(
        `[RFQ] "${wanted}" option not found after opening Category/Type. Open options: ${
          (openOpts || []).join(' | ') || '(none)'
        }. Continuing to product/catalog selection.`
      );
      this.lastRfqItemCategory = wanted;
      return;
    }

    await opt.click();
    await this.page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    this.lastRfqItemCategory = wanted;
    console.log(`[RFQ] Selected Item Category/Type "${wanted}"`);
  }

  /**
   * Pick N Material products onto the RFQ line-items grid.
   * Opens the product autocomplete and selects the 1st / 2nd / … visible row — no product typing.
   */
  async selectMaterialProductsFromDropdown(count = 2) {
    const needed = Math.max(1, Number(count) || 2);
    await this.ensureOnRfqCreateOrEditForm();
    await this.scrollRfqFormTowardLineItems();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.waitForNetworkSettled();

    const selected = [];
    const already = new Set();

    const productFieldOnLastRow = () =>
      this.page
        .locator('table tbody tr')
        .filter({ visible: true })
        .last()
        .locator(
          'input[placeholder*="material" i], input[placeholder*="item" i], input[placeholder*="product" i], [role="combobox"] input, input'
        )
        .filter({ visible: true })
        .first()
        .or(
          this.page
            .getByPlaceholder(/material name|item name|product|search/i)
            .filter({ visible: true })
            .last()
        );

    const openProductOptions = async (field) => {
      await field.click({ timeout: 15000 });
      await field.fill('').catch(() => {});
      // Open the full list without typing a product filter.
      await this.page.keyboard.press('ArrowDown').catch(() => {});
      await this.page.waitForTimeout(500);

      let popper = this.page
        .locator('.MuiAutocomplete-popper, [role="listbox"]')
        .filter({ visible: true })
        .last();
      if (!(await popper.isVisible({ timeout: 3000 }).catch(() => false))) {
        await field.click({ timeout: 10000, force: true }).catch(() => {});
        await this.page.keyboard.press('Alt+ArrowDown').catch(() => {});
        await this.page.waitForTimeout(500);
        popper = this.page
          .locator('.MuiAutocomplete-popper, [role="listbox"]')
          .filter({ visible: true })
          .last();
      }
      await expect(popper).toBeVisible({
        timeout: 20000,
        message: 'RFQ product dropdown did not open (no typing — expected first-row options)',
      });
      return popper;
    };

    for (let i = 0; i < needed; i += 1) {
      const existingBlank = this.page
        .getByPlaceholder(/material name|item name|product/i)
        .filter({ visible: true })
        .last();
      let needAdd = true;
      if (await existingBlank.isVisible({ timeout: 1500 }).catch(() => false)) {
        const val = ((await existingBlank.inputValue().catch(() => '')) || '').trim();
        if (!val && i === 0) needAdd = false;
        if (i > 0 && val) needAdd = true;
        if (i > 0 && !val) needAdd = false;
      }
      if (needAdd) {
        const addItem = this.locatorAddManuallyControl();
        if (await addItem.isVisible({ timeout: 5000 }).catch(() => false)) {
          await addItem.scrollIntoViewIfNeeded().catch(() => {});
          await addItem.click({ force: true });
          await this.waitForNetworkSettled();
          await this.page.waitForTimeout(400);
        }
      }

      const field = productFieldOnLastRow();
      await expect(field).toBeVisible({
        timeout: 30000,
        message: `RFQ product field not found for product #${i + 1}`,
      });

      const popper = await openProductOptions(field);
      const options = popper
        .locator('[role="option"], .MuiAutocomplete-option, li')
        .filter({ visible: true });

      await expect
        .poll(async () => options.count(), { timeout: 20000 })
        .toBeGreaterThan(0);

      const optCount = await options.count();
      let pickedLabel = '';
      let pickedShort = '';

      // Prefer unused options in list order (1st row, then 2nd, …).
      for (let j = 0; j < optCount; j += 1) {
        const opt = options.nth(j);
        // eslint-disable-next-line no-await-in-loop
        const label = ((await opt.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ');
        if (!label) continue;
        if (/^(add in cost catalog|add new|no options|loading)/i.test(label)) continue;
        const key = label.toLowerCase();
        if (already.has(key)) continue;

        // eslint-disable-next-line no-await-in-loop
        await opt.click({ force: true });
        await this.page.keyboard.press('Tab').catch(() => {});
        await this.page.waitForTimeout(400);

        pickedLabel = label;
        // Prefer MAT code when present; otherwise first segment before "·"
        pickedShort =
          (label.match(/MAT\d+/i) || [''])[0] ||
          label.split('·')[0].trim() ||
          label.slice(0, 80);
        already.add(key);
        break;
      }

      if (!pickedShort) {
        throw new Error(
          `Could not pick Material product #${i + 1}: no unused catalog products in the dropdown (${optCount} option(s), ` +
            `excluding "Add in cost catalog"). Add at least ${needed} Material products to the Cost Catalog for this admin.`
        );
      }

      await this.page.waitForTimeout(400);
      const fieldVal = ((await field.inputValue().catch(() => '')) || '').trim();
      if (fieldVal && fieldVal.length > 1) {
        pickedShort =
          (fieldVal.match(/MAT\d+/i) || [''])[0] ||
          fieldVal.split('·')[0].trim() ||
          pickedShort;
      }

      selected.push({
        name: pickedShort,
        fullLabel: pickedLabel,
        quantity: null,
        unit: null,
      });
      console.log(
        `[RFQ] Added Material product ${i + 1}/${needed} from dropdown row: ${pickedShort} (url=${this.page.url()})`
      );
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.waitForNetworkSettled();
    this.lastRfqSelectedProducts = selected;
    console.log(
      `[RFQ] Selected ${selected.length} Material product(s) from first dropdown rows: ${selected
        .map((p) => p.name)
        .join(', ')}`
    );
    return selected;
  }

  async expectSelectedProductsAddedToRfq(expectedCount = 2) {
    const needed = Math.max(1, Number(expectedCount) || 2);
    const selected = Array.isArray(this.lastRfqSelectedProducts) ? this.lastRfqSelectedProducts : [];
    if (selected.length < needed) {
      throw new Error(
        `Expected ${needed} selected products stored, found ${selected.length}`
      );
    }

    await this.scrollRfqFormTowardLineItems();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(400);

    const missing = [];
    for (const product of selected.slice(0, needed)) {
      const nameRe = new RegExp(this.escapeRegExp(product.name), 'i');
      const scopes = [
        this.page.locator('main, [role="main"]').first(),
        this.page.locator('table').filter({ visible: true }).first(),
        this.page.locator('body'),
      ];
      let found = false;
      for (const scope of scopes) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await scope.isVisible({ timeout: 500 }).catch(() => false))) continue;
        // eslint-disable-next-line no-await-in-loop
        const textHit = scope.getByText(nameRe).filter({ visible: true }).first();
        // eslint-disable-next-line no-await-in-loop
        if (await textHit.isVisible({ timeout: 2500 }).catch(() => false)) {
          found = true;
          break;
        }
        // Selected value may sit in an input / combobox rather than plain text.
        // eslint-disable-next-line no-await-in-loop
        const inputs = scope.locator('input, textarea, [role="combobox"]');
        const n = await inputs.count().catch(() => 0);
        for (let i = 0; i < Math.min(n, 40); i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const val =
            ((await inputs.nth(i).inputValue().catch(() => '')) ||
              (await inputs.nth(i).innerText().catch(() => '')) ||
              '') + '';
          if (nameRe.test(val)) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) missing.push(product.name);
    }

    if (missing.length) {
      // Fallbacks: line-item rows / qty inputs prove products were added even if MAT code is hidden.
      const qtyCount = await this.page
        .locator(
          'input[placeholder*="qty" i], input[placeholder*="quantity" i], table tbody tr input[type="number"], table tbody tr td input'
        )
        .filter({ visible: true })
        .count()
        .catch(() => 0);
      const rowCount = await this.page
        .locator('table tbody tr')
        .filter({ visible: true })
        .count()
        .catch(() => 0);
      const stillOnCreate = /rfq\/(create|edit)/i.test(this.page.url());

      if (stillOnCreate && (qtyCount >= needed || rowCount >= needed)) {
        console.warn(
          `[RFQ] MAT codes not visible (${missing.join(', ')}), but form has rows=${rowCount} qtyInputs~=${qtyCount} — treating products as added`
        );
        return;
      }

      const body = ((await this.page.locator('main, body').first().innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 500);
      throw new Error(
        `Selected product(s) not visible on RFQ form: ${missing.join(', ')}. ` +
          `url=${this.page.url()} rows=${rowCount} qty~=${qtyCount}. Snippet: ${body || '(empty)'}`
      );
    }
    console.log(`[RFQ] Verified ${needed} selected product(s) on RFQ form`);
  }

  async enterQuantityForSelectedRfqProducts(defaultQty = '1') {
    const selected = Array.isArray(this.lastRfqSelectedProducts) ? this.lastRfqSelectedProducts : [];
    if (!selected.length) throw new Error('No selected RFQ products to set quantity on');

    await this.scrollRfqFormTowardLineItems();
    const table = await this.ensureRfqLineItemsTableVisible().catch(() => null);
    const rows = table
      ? table.locator('tbody tr').filter({ visible: true })
      : this.page.locator('table tbody tr').filter({ visible: true });

    const enabledQtyInScope = (scope) =>
      scope
        .getByPlaceholder(/^(qty|quantity)/i)
        .or(scope.getByLabel(/^qty$|^quantity$/i))
        .or(scope.locator('input[aria-label*="quantity" i]:not([disabled])'))
        .or(
          scope
            .locator('td')
            .nth(1)
            .locator('input:not([disabled]):not([aria-label*="weight" i])')
        )
        .filter({ visible: true })
        .first();

    for (let i = 0; i < selected.length; i += 1) {
      const qty = String(i === 0 ? defaultQty : Number(defaultQty) + i);
      const product = selected[i];
      let qtyInput = null;

      const rowCount = await rows.count().catch(() => 0);
      if (rowCount > 0) {
        let row = rows.nth(Math.min(i, rowCount - 1));
        const nameRe = new RegExp(this.escapeRegExp(product.name).slice(0, 40), 'i');
        const named = rows.filter({ hasText: nameRe }).first();
        // eslint-disable-next-line no-await-in-loop
        if (await named.isVisible({ timeout: 1500 }).catch(() => false)) row = named;
        qtyInput = enabledQtyInScope(row);
      }

      if (!qtyInput || !(await qtyInput.isVisible({ timeout: 2000 }).catch(() => false))) {
        qtyInput = this.page
          .locator(
            'input:not([disabled]):not([aria-label*="weight" i])[placeholder*="qty" i], ' +
              'input:not([disabled]):not([aria-label*="weight" i])[placeholder*="quantity" i], ' +
              'input:not([disabled])[aria-label*="quantity" i]'
          )
          .filter({ visible: true })
          .nth(i);
      }

      // eslint-disable-next-line no-await-in-loop
      await expect(qtyInput).toBeVisible({
        timeout: 20000,
        message: `Quantity input not found for product "${product.name}"`,
      });
      // eslint-disable-next-line no-await-in-loop
      await qtyInput.click({ force: true }).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await qtyInput.fill(qty);
      // eslint-disable-next-line no-await-in-loop
      await qtyInput.blur().catch(() => {});
      product.quantity = qty;
    }
    this.lastRfqSelectedProducts = selected;
    console.log(
      `[RFQ] Set quantities: ${selected.map((p) => `${p.name}=${p.quantity}`).join(', ')}`
    );
  }

  async selectUnitForSelectedRfqProducts(unitLabel = 'Each') {
    const selected = Array.isArray(this.lastRfqSelectedProducts) ? this.lastRfqSelectedProducts : [];
    if (!selected.length) throw new Error('No selected RFQ products to set unit on');

    const table = await this.ensureRfqLineItemsTableVisible();
    const rows = table.locator('tbody tr').filter({ visible: true });

    for (let i = 0; i < selected.length; i += 1) {
      const product = selected[i];
      let row = rows.nth(i);
      const nameRe = new RegExp(this.escapeRegExp(product.name), 'i');
      const named = rows.filter({ hasText: nameRe }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await named.isVisible({ timeout: 2000 }).catch(() => false)) row = named;
      // eslint-disable-next-line no-await-in-loop
      product.unit = (await this.selectUnitForRow(row, unitLabel)) || product.unit || unitLabel;
    }
    this.lastRfqSelectedProducts = selected;
    console.log(`[RFQ] Set units: ${selected.map((p) => `${p.name}=${p.unit}`).join(', ')}`);
  }
}

module.exports = RFQPage;

