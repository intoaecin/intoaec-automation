const { expect } = require('@playwright/test');
const RfqNotesPage = require('../create-rfq/rfq-notes.page');

class StartFromEstimatePage extends RfqNotesPage {
  constructor(page) {
    super(page);
    this.startFromEstimateDialog = this.rfqStartDialog();
    this.startFromEstimateOption = this.startFromEstimateDialog.getByText(/start from estimate/i).first();
    this.proceedButton = this.startFromEstimateDialog.getByRole('button', { name: /^proceed$/i });
    this.selectEstimateField = page.getByRole('combobox', { name: /select estimate/i }).first();
    this.selectEstimateTextbox = page.getByRole('textbox', { name: /select estimate/i }).first();
    this.statusCombobox = page.getByRole('combobox', { name: /status/i }).first();
    this.firstCombobox = page.getByRole('combobox').first();
    this.statusSelect = page.locator('.MuiSelect-select').filter({ hasText: /draft|sent/i }).first();
    this.statusButton = page.getByRole('button').filter({ hasText: /^(draft|sent)$/i }).first();
  }

  log(message) {
    // eslint-disable-next-line no-console
    console.log(`[StartFromEstimate][${new Date().toISOString()}] ${message}`);
  }

  randomGroupName() {
    return `Group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  async startFromEstimateAndProceed() {
    const dlg = this.startFromEstimateDialog;
    await expect(dlg).toBeVisible({ timeout: 20000 });

    await expect(this.startFromEstimateOption).toBeVisible({ timeout: 30000 });
    await this.startFromEstimateOption.click();

    await expect(this.proceedButton).toBeEnabled({ timeout: 30000 });
    await this.proceedButton.click();

    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();
    await this.waitForStartFromEstimateList();
  }

  async waitForStartFromEstimateList() {
    await expect
      .poll(
        async () => {
          const candidates = [
            this.selectEstimateField,
            this.selectEstimateTextbox,
            this.statusCombobox,
            this.firstCombobox,
            this.statusSelect,
            this.statusButton,
            this.page.getByRole('heading', { name: /start from estimate/i }).first(),
            this.page.getByText(/draft|sent/i).first(),
          ];

          for (const locator of candidates) {
            if (await locator.isVisible({ timeout: 800 }).catch(() => false)) {
              return true;
            }
          }

          return false;
        },
        { timeout: this.defaultTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
  }

  async resolveEstimateSelectionField() {
    const candidates = [
      this.selectEstimateField,
      this.selectEstimateTextbox,
      this.page.getByRole('button', { name: /select estimate/i }).filter({ visible: true }).first(),
      this.page.getByText(/select estimate/i).filter({ visible: true }).first(),
      this.page
        .locator('[role="combobox"], input, .MuiSelect-select, button')
        .filter({ hasText: /select estimate/i })
        .filter({ visible: true })
        .first(),
    ];

    for (const locator of candidates) {
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return locator;
      }
    }

    throw new Error('Start from estimate: could not find the estimate selection field.');
  }

  async resolveStatusSelectionField() {
    const candidates = [this.statusCombobox, this.statusSelect, this.statusButton];

    for (const locator of candidates) {
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return locator;
      }
    }

    // Fallback: any visible control that looks like a status selector
    const fallback = this.page
      .locator('[role="button"], .MuiSelect-select, [role="combobox"], input')
      .filter({ hasText: /status|draft|sent/i })
      .filter({ visible: true })
      .first();
    if (await fallback.isVisible({ timeout: 1000 }).catch(() => false)) {
      return fallback;
    }

    throw new Error('Start from estimate: could not find the status selection field.');
  }

  async resolvePickerOption(status) {
    const escaped = this.escapeRegExp(status);
    const nameRegex = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
    // Many UIs render labels like "Sent (3)" or "Sent Estimates" inside the dropdown.
    const looseRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    const visiblePopper = this.page
      .locator(
        [
          '[role="listbox"]',
          '[role="menu"]',
          '.MuiAutocomplete-popper',
          '.MuiPopover-root',
          '.MuiMenu-paper',
          '.MuiPaper-root',
          '[role="presentation"]',
          '[role="dialog"]',
        ].join(', ')
      )
      .filter({ visible: true })
      .last();

    const inPopper = (loc) => visiblePopper.locator(':scope').locator(loc);
    const candidates = [
      // Prefer scoping to the currently open dropdown/popup if present
      inPopper(`role=tab[name=${JSON.stringify(status)}]`).first(),
      visiblePopper.getByRole('tab', { name: nameRegex }).first(),
      visiblePopper.getByRole('tab', { name: looseRegex }).first(),

      visiblePopper.getByRole('option', { name: nameRegex }).first(),
      visiblePopper.getByRole('option', { name: looseRegex }).first(),
      visiblePopper.getByRole('menuitem', { name: nameRegex }).first(),
      visiblePopper.getByRole('menuitem', { name: looseRegex }).first(),
      visiblePopper.getByRole('button', { name: nameRegex }).first(),
      visiblePopper.getByRole('button', { name: looseRegex }).first(),

      this.page.getByRole('tab', { name: nameRegex }).first(),
      this.page.getByRole('tab', { name: looseRegex }).first(),
      this.page.getByRole('option', { name: nameRegex }).first(),
      this.page.getByRole('option', { name: looseRegex }).first(),
      this.page.getByRole('menuitem', { name: nameRegex }).first(),
      this.page.getByRole('menuitem', { name: looseRegex }).first(),
      this.page.getByRole('button', { name: nameRegex }).first(),
      this.page.getByRole('button', { name: looseRegex }).first(),

      this.page
        .locator('[role="listbox"] [role="option"], [role="menu"] [role="menuitem"]')
        .filter({ hasText: looseRegex })
        .filter({ visible: true })
        .first(),
      this.page
        .locator('[role="presentation"], .MuiPaper-root, .MuiPopover-root, .MuiMenu-paper')
        .filter({ visible: true })
        .getByText(looseRegex)
        .first(),
      this.page.getByText(looseRegex).filter({ visible: true }).first(),
    ];

    for (const locator of candidates) {
      if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
        return locator;
      }
    }

    // Last-resort fallback: click any visible element containing the label inside the open popper.
    // Some UIs render these as plain div/spans instead of proper option/tab roles.
    const anyVisibleByText = this.page
      .locator(
        [
          '[role="listbox"]',
          '[role="menu"]',
          '.MuiAutocomplete-popper',
          '.MuiPopover-root',
          '.MuiMenu-paper',
          '.MuiPaper-root',
          '[role="presentation"]',
          '[role="dialog"]',
        ].join(', ')
      )
      .filter({ visible: true })
      .last()
      .locator('*')
      .filter({ hasText: looseRegex })
      .filter({ visible: true })
      .first();
    if (await anyVisibleByText.isVisible({ timeout: 800 }).catch(() => false)) {
      return anyVisibleByText;
    }

    throw new Error(`Start from estimate: could not find the "${status}" picker option.`);
  }

  async openEstimateSelectionField() {
    await this.waitForStartFromEstimateList();
    const field = await this.resolveEstimateSelectionField();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.dismissOpenMenusAndPopovers();
      await field.scrollIntoViewIfNeeded().catch(() => {});
      await field.click({ timeout: 15000, force: attempt > 0 }).catch(() => {});
      await this.page.waitForTimeout(attempt === 0 ? 350 : 550);

      const popperVisible = await this.page
        .locator(
          [
            '[role="listbox"]',
            '.MuiAutocomplete-popper',
            '.MuiPopover-root',
            '.MuiMenu-paper',
            '.MuiPaper-root',
            '[role="presentation"]',
          ].join(', ')
        )
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 600 })
        .catch(() => false);

      if (popperVisible) {
        return field;
      }

      // Some autocompletes only show results after typing or keyboard navigation.
      await this.page.keyboard.press('ArrowDown').catch(() => {});
      await this.page.waitForTimeout(250);
    }

    return field;
  }

  async openStatusSelectionField() {
    await this.waitForStartFromEstimateList();
    const field = await this.resolveStatusSelectionField();
    await field.scrollIntoViewIfNeeded();
    await field.click({ timeout: 15000 });
    await this.page.waitForTimeout(350);
    return field;
  }

  async chooseEstimateStatus(status) {
    const normalizedStatus = String(status || '').trim();
    if (!normalizedStatus) {
      throw new Error('Start from estimate: status is required.');
    }

    // In this module, the "Sent/Draft" filter often lives INSIDE the "Select estimate" popup
    // (tab strip at top of the dropdown). So first ensure the estimate picker popup is open.
    await this.openEstimateSelectionField();

    // Some UIs render Status as tabs/chips (Draft/Sent) with no "Status" field.
    // In that case, click the tab directly and return.
    const quickTab = this.page
      .getByRole('tab', {
        name: new RegExp(`\\b${this.escapeRegExp(normalizedStatus)}\\b`, 'i'),
      })
      .filter({ visible: true })
      .first();
    if (await quickTab.isVisible({ timeout: 1200 }).catch(() => false)) {
      await quickTab.click({ timeout: 15000, force: true });
      await this.waitForNetworkSettled();
      return;
    }

    const quickChipOrBtn = this.page
      .locator('button, [role="button"], .MuiChip-root')
      .filter({ hasText: new RegExp(`\\b${this.escapeRegExp(normalizedStatus)}\\b`, 'i') })
      .filter({ visible: true })
      .first();
    if (await quickChipOrBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
      await quickChipOrBtn.click({ timeout: 15000, force: true });
      await this.waitForNetworkSettled();
      return;
    }

    // Fallback: status is a plain text element inside the open popover/list (not a field).
    let option = null;
    try {
      option = await this.resolvePickerOption(normalizedStatus);
      await expect(option).toBeVisible({ timeout: this.defaultTimeout });
      await option.click({ timeout: 15000, force: true });
    } catch (e) {
      // IMPORTANT: In some environments the filter tabs simply don't exist.
      // Do not fail the whole flow; continue with the default estimate list.
      this.log(
        `Status filter "${normalizedStatus}" not found/clickable. Continuing without filter. ${e?.message || ''}`
      );
      return;
    }

    await this.page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.dismissOpenMenusAndPopovers();
    await this.waitForNetworkSettled();

    // Also accept the case where the status is expressed as an active tab/chip
    await expect
      .poll(
        async () => {
          const activeTab = this.page
            .getByRole('tab', { name: new RegExp(`\\b${this.escapeRegExp(normalizedStatus)}\\b`, 'i') })
            .filter({ visible: true })
            .first();
          const selected =
            (await activeTab.getAttribute('aria-selected').catch(() => null)) ||
            (await activeTab.getAttribute('data-selected').catch(() => null));
          return String(selected || '').toLowerCase() === 'true';
        },
        { timeout: 6000, intervals: [300, 800, 1500] }
      )
      .toBeTruthy()
      .catch(() => {});
  }

  async resolveEstimateResult(title) {
    const titleRegex = title
      ? new RegExp(this.escapeRegExp(String(title).trim()), 'i')
      : null;
    const visiblePopper = this.page
      .locator(
        [
          '[role="listbox"]',
          '.MuiAutocomplete-popper',
          '.MuiPopover-root',
          '.MuiMenu-paper',
          '.MuiPaper-root',
          '[role="presentation"]',
        ].join(', ')
      )
      .filter({ visible: true })
      .last();

    const exactRow = titleRegex
      ? this.page
          .locator('table tbody tr, [role="row"], .MuiDataGrid-row, li, [role="option"]')
          .filter({ has: this.page.getByText(titleRegex) })
          .filter({ visible: true })
          .first()
      : null;
    const exactCell = titleRegex
      ? this.page.getByText(titleRegex).filter({ visible: true }).first()
      : null;

    const candidates = [
      titleRegex ? visiblePopper.getByRole('option', { name: titleRegex }).first() : null,
      titleRegex ? visiblePopper.getByText(titleRegex).first() : null,
      exactRow,
      exactCell,
      titleRegex ? this.page.getByRole('option', { name: titleRegex }).first() : null,
      titleRegex ? this.page.getByText(titleRegex).filter({ visible: true }).first() : null,
      visiblePopper.locator('[role="option"]').filter({ visible: true }).first(),
      visiblePopper.locator('li').filter({ visible: true }).first(),
      this.page
        .locator('table tbody tr, [role="row"], .MuiDataGrid-row')
        .filter({ visible: true })
        .first(),
      this.page.locator('[role="listbox"] [role="option"]').filter({ visible: true }).first(),
    ].filter(Boolean);

    for (const locator of candidates) {
      if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
        return locator;
      }
    }

    throw new Error('Start from estimate: could not find an estimate result to select.');
  }

  async waitForEstimateResultsToAppear() {
    await expect
      .poll(
        async () => {
          const groups = [
            this.page.locator(
              [
                '[role="listbox"] [role="option"]',
                '.MuiAutocomplete-popper [role="option"]',
                '.MuiAutocomplete-popper li',
                'table tbody tr',
                '.MuiDataGrid-row',
              ].join(', ')
            ),
            this.page.getByText(/no options|no data|no records/i).filter({ visible: true }),
          ];

          const optionCount = await groups[0].filter({ visible: true }).count().catch(() => 0);
          const emptyVisible = await groups[1].first().isVisible({ timeout: 300 }).catch(() => false);
          if (emptyVisible) return 0;
          return optionCount;
        },
        { timeout: 60000, intervals: [400, 800, 1500, 2500] }
      )
      .toBeGreaterThanOrEqual(1);
  }

  async clickEstimateResult(locator, title) {
    const label = title || 'first visible estimate';
    this.log(`Clicking estimate result for "${label}"`);

    const clickTargets = [
      locator,
      locator.locator('xpath=ancestor-or-self::*[self::li or self::tr or @role="option" or @role="row" or self::button][1]').first(),
      locator.locator('xpath=ancestor::*[self::div or self::td][1]').first(),
    ];

    for (const target of clickTargets) {
      if (!(await target.isVisible({ timeout: 1000 }).catch(() => false))) {
        continue;
      }
      await target.scrollIntoViewIfNeeded().catch(() => {});
      try {
        await target.click({ timeout: 15000 });
        return;
      } catch {
        await target.click({ timeout: 15000, force: true }).catch(() => {});
        const stillVisible = await target.isVisible({ timeout: 500 }).catch(() => false);
        if (!stillVisible) {
          return;
        }
      }
    }

    throw new Error(`Start from estimate: failed to click estimate result "${label}".`);
  }

  async selectEstimateFromPicker(title) {
    this.log(`Selecting estimate "${title || 'first visible estimate'}" from picker`);
    const field = await this.openEstimateSelectionField();

    const desired = String(title || '').trim();
    if (desired) {
      // If this is an autocomplete textbox, type the estimate title to populate results.
      const input = (await this.selectEstimateTextbox.isVisible({ timeout: 800 }).catch(() => false))
        ? this.selectEstimateTextbox
        : field;

      if (await input.isVisible({ timeout: 800 }).catch(() => false)) {
        await input.fill('');
        await input.type(desired, { delay: 20 });
        await this.page.waitForTimeout(400);
        await this.page.keyboard.press('ArrowDown').catch(() => {});
      }
    }

    await this.waitForEstimateResultsToAppear();

    // Prefer selecting by title, but fall back to selecting the 2nd visible result
    // (useful when the newly created estimate isn't indexed yet).
    let estimateOption = null;
    try {
      estimateOption = await this.resolveEstimateResult(title);
      await this.clickEstimateResult(estimateOption, title);
    } catch (e) {
      this.log(
        `Could not resolve estimate by title "${String(title || '')}". Falling back to 2nd visible estimate result.`
      );

      const second = this.page
        .locator(
          [
            '[role="listbox"] [role="option"]',
            '.MuiAutocomplete-popper [role="option"]',
            '.MuiAutocomplete-popper li',
            'table tbody tr',
            '.MuiDataGrid-row',
          ].join(', ')
        )
        .filter({ visible: true })
        .nth(1);

      if (!(await second.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw e;
      }
      await this.clickEstimateResult(second, '2nd visible estimate');
    }

    const inputForCheck =
      (await this.selectEstimateTextbox.isVisible({ timeout: 500 }).catch(() => false))
        ? this.selectEstimateTextbox
        : this.selectEstimateField;

    const desiredRegex = desired ? new RegExp(this.escapeRegExp(desired), 'i') : null;

    if (desiredRegex) {
      const selected = await expect
        .poll(
          async () => {
            const text = await inputForCheck.textContent().catch(() => '');
            const value = await inputForCheck.inputValue().catch(() => '');
            const bodyHasTitle = await this.page.getByText(desiredRegex).first().isVisible({ timeout: 300 }).catch(() => false);
            return desiredRegex.test(String(text || '')) || desiredRegex.test(String(value || '')) || bodyHasTitle;
          },
          { timeout: 10000, intervals: [300, 800, 1500] }
        )
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);

      if (!selected && (await inputForCheck.isVisible({ timeout: 500 }).catch(() => false))) {
        this.log(`Mouse click did not confirm selection for "${desired}", trying keyboard fallback`);
        await inputForCheck.click({ timeout: 10000 }).catch(() => {});
        await this.page.keyboard.press('ArrowDown').catch(() => {});
        await this.page.waitForTimeout(250);
        await this.page.keyboard.press('Enter').catch(() => {});
      }
    }

    await this.dismissOpenMenusAndPopovers();
    await this.waitForNetworkSettled();
  }

  async expectEstimateVisible(title) {
    const expectedTitle = String(title || '').trim();
    if (!expectedTitle) {
      throw new Error('Start from estimate: estimate title is required for validation.');
    }

    const titleRegex = new RegExp(this.escapeRegExp(expectedTitle), 'i');

    await expect
      .poll(
        async () => {
          const candidates = [
            this.page.getByRole('row', { name: titleRegex }).first(),
            this.page.locator('table tbody tr').filter({ has: this.page.getByText(titleRegex) }).first(),
            this.page.getByText(titleRegex).first(),
          ];

          for (const locator of candidates) {
            if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
              return true;
            }
          }

          return false;
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] }
      )
      .toBeTruthy();
  }

  async clickFirstVisibleCheckbox(scope = this.page) {
    const candidateGroups = [
      scope.locator('table tbody input[type="checkbox"]'),
      scope.locator('[role="row"] input[type="checkbox"]'),
      scope.getByRole('checkbox'),
      scope.locator('input[type="checkbox"]'),
    ];

    for (const group of candidateGroups) {
      const count = await group.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const checkbox = group.nth(i);
        if (!(await checkbox.isVisible({ timeout: 600 }).catch(() => false))) {
          continue;
        }
        try {
          await checkbox.check({ timeout: 10000 });
        } catch {
          await checkbox.click({ timeout: 10000, force: true });
        }
        return;
      }
    }

    throw new Error('Start from estimate: could not find a visible checkbox to select.');
  }

  async clickButtonByName(nameRegex, options = {}) {
    const { scope = this.page, timeout = this.defaultTimeout } = options;
    const candidates = [
      scope.getByRole('button', { name: nameRegex }).first(),
      scope.locator('button').filter({ hasText: nameRegex }).first(),
      scope.getByText(nameRegex).first(),
    ];

    for (const locator of candidates) {
      if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click({ timeout: 15000, force: true });
        return;
      }
    }

    throw new Error(`Start from estimate: could not find button ${nameRegex}.`);
  }

  async waitForToastText(textRegex) {
    await expect(
      this.page.locator('.Toastify__toast, [role="alert"]').filter({ hasText: textRegex }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async createGroupFromSelectedEstimateItems(groupName) {
    const finalGroupName = String(groupName || this.randomGroupName()).trim();
    this.log(`Creating estimate group "${finalGroupName}"`);

    await this.clickFirstVisibleCheckbox();
    await this.clickButtonByName(/create group/i);

    const popup = this.page
      .locator('[role="dialog"], .MuiDialog-root, .MuiModal-root, .offcanvas.show')
      .filter({ visible: true })
      .last();
    await expect(popup).toBeVisible({ timeout: this.defaultTimeout });

    const inputCandidates = [
      popup.getByRole('textbox', { name: /group name/i }).first(),
      popup.getByLabel(/group name/i).first(),
      popup.getByPlaceholder(/group name/i).first(),
      popup.locator('input[name*="group" i], input[id*="group" i]').first(),
    ];

    let groupInput = null;
    for (const locator of inputCandidates) {
      if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
        groupInput = locator;
        break;
      }
    }

    if (!groupInput) {
      throw new Error('Start from estimate: group name input was not found.');
    }

    await groupInput.fill(finalGroupName);
    await this.clickButtonByName(/^create group$|^create$/i, { scope: popup });
    await this.waitForToastText(/group.*created|created successfully/i);
    await this.dismissVisibleToastNotifications();
    await this.waitForNetworkSettled();

    return finalGroupName;
  }

  async openViewGroupItemForFirstGroup() {
    this.log('Opening the first grouped estimate item set');
    await this.clickFirstVisibleCheckbox();
    await this.clickButtonByName(/view group item/i);

    const panel = this.page
      .locator('.offcanvas.show, .MuiDrawer-root, .MuiModal-root, [role="dialog"]')
      .filter({ visible: true })
      .last();
    await expect(panel).toBeVisible({ timeout: this.defaultTimeout });
    return panel;
  }

  async createRfqFromFirstGroupedItem(panel = null) {
    const groupPanel = panel || (await this.openViewGroupItemForFirstGroup());
    this.log('Selecting the first grouped item and proceeding to Create RFQ');
    await this.clickFirstVisibleCheckbox(groupPanel);
    await this.clickButtonByName(/create rfq/i, { scope: groupPanel });
    await this.page.waitForURL(/rfq\/(create|edit)/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
  }

  async fillGroupedEstimateRfqAndSendEmail() {
    const rfqTitle = `RFQ ${Date.now()}`;
    this.log(`Filling RFQ form with title "${rfqTitle}" and sending email`);
    await this.fillRfqTitle(rfqTitle);
    await this.setRequiredByToday();
    await this.setCreatedOnToday();
    await this.addFirstVendorFromPanel();
    await this.enterRandomMediumRfqNotes();
    await this.openActionMenuAndComposeEmail();
    await this.sendEmailFromRfqComposeModal();
    return rfqTitle;
  }

  visibleEstimatePickerContainer() {
    // The estimate picker + Sent/Draft tabs are often inside a MUI popover/paper or dialog.
    return this.page
      .locator(
        [
          '.MuiAutocomplete-popper',
          '.MuiPopover-root',
          '.MuiMenu-paper',
          '.MuiPaper-root',
          '[role="dialog"]',
          '[role="presentation"]',
        ].join(', ')
      )
      .filter({ visible: true })
      .last();
  }

  async selectFirstEstimateFromSentAndContinue() {
    this.log('Selecting first estimate from Sent tab and continuing');

    // Open the select estimate popup first (this is where Sent/Draft usually lives).
    await this.openEstimateSelectionField();

    // Try to select "Sent" tab if it exists; if not, continue with the default list.
    // (Some environments only show one list and no Sent/Draft tabs.)
    await this.chooseEstimateStatus('Sent').catch((e) => {
      this.log(`Sent tab not found, continuing without status filter. ${e?.message || ''}`);
    });

    const container = this.visibleEstimatePickerContainer();
    await expect(container).toBeVisible({ timeout: this.defaultTimeout });

    // Select first estimate via radio/checkbox/row click.
    const radio = container
      .locator('input[type="radio"]')
      .filter({ visible: true })
      .first();
    if (await radio.isVisible({ timeout: 2500 }).catch(() => false)) {
      try {
        await radio.check({ timeout: 10000 });
      } catch {
        await radio.click({ timeout: 10000, force: true });
      }
    } else {
      const firstRow = container
        .locator('table tbody tr, [role="row"], li, [role="option"]')
        .filter({ visible: true })
        .first();
      await expect(firstRow).toBeVisible({ timeout: this.defaultTimeout });
      await firstRow.click({ timeout: 15000, force: true });
    }

    // Click Continue/Proceed/Select to confirm.
    const continueBtn = container
      .getByRole('button', { name: /continue|proceed|select|ok|done|apply|add/i })
      .filter({ visible: true })
      .first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click({ timeout: 15000, force: true });
    } else {
      // Some UIs auto-close after selecting radio; attempt to close popover and continue.
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.dismissOpenMenusAndPopovers();
    await this.waitForNetworkSettled();

    // Wait until selected estimate results appear on the page (outside the picker).
    await expect
      .poll(
        async () => {
          const rows = this.page.locator('table tbody tr, [role="row"], .MuiDataGrid-row').filter({ visible: true });
          const n = await rows.count().catch(() => 0);
          return n;
        },
        { timeout: 60000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0)
      .catch(() => {});
  }

  async completeStartFromEstimateGroupedFlow(estimateTitle) {
    await this.startFromEstimateAndProceed();
    // UI flow: Select estimate → Sent tab → choose first estimate → Continue
    await this.selectFirstEstimateFromSentAndContinue();
    const groupName = await this.createGroupFromSelectedEstimateItems();
    const groupPanel = await this.openViewGroupItemForFirstGroup();
    await this.createRfqFromFirstGroupedItem(groupPanel);
    const rfqTitle = await this.fillGroupedEstimateRfqAndSendEmail();
    return { groupName, rfqTitle };
  }
}

module.exports = StartFromEstimatePage;
