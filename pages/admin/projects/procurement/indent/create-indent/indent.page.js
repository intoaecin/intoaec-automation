const { expect } = require('@playwright/test');
const PurchaseOrderCreatePoPage = require('../../purchase-order/create-po/purchase-order-create-po.page');
const ProjectProfilePage = require('../../../ProjectProfilePage');

/** Indent list → Create Indent → Material Indent → title → line item → Create. */
class IndentPage extends PurchaseOrderCreatePoPage {
  constructor(page) {
    super(page);
    this.indentFastMode = process.env.INDENT_SLOW !== 'true';
    this.indentUiTimeout = this.indentFastMode ? 45000 : this.defaultTimeout;
    this.indentCreateSuccessObserved = false;
    this.lastIndentTitle = null;
  }

  firstIndentCard(title) {
    const matchTitle = title || this.lastIndentTitle;
    const cards = this.page.locator('div.mt-3.mb-3').filter({
      has: this.page.locator(
        'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg[data-testid="MoreHorizIcon"])'
      ),
    });
    if (matchTitle) {
      return cards.filter({ hasText: matchTitle }).first();
    }
    return cards
      .filter({
        has: this.page.getByText(/indent|issued date|material|work/i),
      })
      .first()
      .or(cards.first());
  }

  indentPreviewRoot() {
    return this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/indent|preview|indent no|issued date/i),
      })
      .filter({ visible: true })
      .first();
  }

  createIndentListButton() {
    return this.page.getByRole('button', { name: /create indent/i });
  }

  indentTitleInput() {
    return this.page
      .getByRole('textbox', { name: 'Indent Title' })
      .or(this.page.getByRole('textbox', { name: /indent title/i }))
      .or(this.page.getByLabel(/indent title/i))
      .first();
  }

  indentTypeDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/select indent type/i) })
      .last();
  }

  locatorIndentCreatedToast() {
    const pattern =
      /indent (created|saved|submitted|updated).*success|indent (created|updated)|created successfully|saved successfully|updated successfully|success/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar')
      .filter({ hasText: pattern })
      .first();
  }

  async isIndentListReadyAfterCreate() {
    const createBtn = this.createIndentListButton();
    if (await createBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    const href = this.page.url();
    return (
      /tab=RFQAndPO/i.test(href) &&
      (/subTab=Indent/i.test(href) || /subTab%3DIndent/i.test(href)) &&
      !/indent\/create/i.test(href)
    );
  }

  async clickIndentModuleCard() {
    const profile = new ProjectProfilePage(this.page);
    await profile.clickModuleCard('Indent');
  }

  /** Client → first project → Procurement → Indent tab. */
  async navigateToIndentModuleForFirstProject() {
    const ProjectNavigationPage = require('../../../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    if (!(await profile.isInsideProjectProfile().catch(() => false))) {
      await nav.navigateToProjects();
      await nav.clickFirstProject();
    }

    const createBtn = this.createIndentListButton();
    const alreadyOnIndent =
      /tab=RFQAndPO/i.test(this.page.url()) &&
      (/subTab=Indent/i.test(this.page.url()) ||
        /subTab%3DIndent/i.test(this.page.url()) ||
        (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)));

    if (!alreadyOnIndent) {
      await profile.selectHeading('Procurement');
      await this.clickIndentModuleCard();
    } else {
      await this.activateIndentSubTab();
      await this.ensureIndentListReady().catch(() => {});
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Indent] Navigated to Indent module.');
  }

  async activateIndentSubTab() {
    const indentTab = this.page.getByRole('tab', { name: /^indent$/i }).first();
    if (!(await indentTab.isVisible({ timeout: 10000 }).catch(() => false))) {
      return;
    }
    if ((await indentTab.getAttribute('aria-selected').catch(() => null)) === 'true') {
      return;
    }
    await indentTab.click({ timeout: 15000, force: true }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async ensureIndentListReady() {
    await this.page
      .waitForURL(
        (url) => {
          const href = typeof url === 'string' ? url : url.href;
          return (
            /tab=RFQAndPO/i.test(href) &&
            (/subTab=Indent/i.test(href) || /subTab%3DIndent/i.test(href))
          );
        },
        { timeout: this.indentUiTimeout }
      )
      .catch(() => {});

    await this.activateIndentSubTab();
    await this.dismissListSkeletons();
    await expect(this.createIndentListButton()).toBeVisible({
      timeout: this.indentUiTimeout,
    });
  }

  async clickCreateIndentListButton() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.ensureIndentListReady();
    const createBtn = this.createIndentListButton();
    await expect(createBtn).toBeVisible({ timeout: this.indentUiTimeout });
    await expect(createBtn).toBeEnabled({ timeout: 15000 });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Indent] Clicked Create Indent on list.');
  }

  async expectSelectIndentTypeDialogVisible() {
    const dialog = this.indentTypeDialog();
    await expect(dialog).toBeVisible({ timeout: this.indentUiTimeout });
    await expect(dialog.getByText(/select indent type/i).first()).toBeVisible({
      timeout: this.indentUiTimeout,
    });
    // eslint-disable-next-line no-console
    console.log('[Indent] Select Indent Type popup is visible.');
  }

  async selectMaterialIndentAndProceed() {
    await this.selectIndentTypeAndProceed('Material Indent');
  }

  async selectWorkIndentAndProceed() {
    await this.selectIndentTypeAndProceed('Work Indent');
  }

  async selectIndentTypeAndProceed(indentTypeLabel) {
    const dialog = this.indentTypeDialog();
    await expect(dialog).toBeVisible({ timeout: this.indentUiTimeout });

    const typePattern = new RegExp(
      `^${indentTypeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i'
    );
    const typeOption = dialog
      .getByText(typePattern)
      .or(dialog.getByRole('radio', { name: typePattern }))
      .or(dialog.locator('label, div, span').filter({ hasText: typePattern }))
      .first();
    await expect(typeOption).toBeVisible({ timeout: 30000 });
    await typeOption.click({ timeout: 20000 });

    const proceed = dialog.getByRole('button', { name: /^proceed$/i });
    await expect(proceed).toBeEnabled({ timeout: 30000 });
    await proceed.click({ timeout: 20000 });
    await this.waitForIndentCreateForm();
    // eslint-disable-next-line no-console
    console.log(`[Indent] Selected ${indentTypeLabel} and clicked Proceed.`);
  }

  async waitForIndentCreateForm() {
    await expect
      .poll(
        async () =>
          /indent\/create/i.test(this.page.url()) ||
          (await this.indentTitleInput().isVisible({ timeout: 500 }).catch(() => false)),
        { timeout: this.indentUiTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
    await expect(this.indentTitleInput()).toBeVisible({ timeout: this.indentUiTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async expectIndentCreateFormDisplayed() {
    await this.waitForIndentCreateForm();
    await expect(this.page.getByText(/line items/i).first()).toBeVisible({
      timeout: this.indentUiTimeout,
    });
    // eslint-disable-next-line no-console
    console.log('[Indent] Create Indent form is displayed.');
  }

  async fillIndentTitle(title) {
    await this.waitForIndentCreateForm();
    const input = this.indentTitleInput();
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ timeout: 15000 });
    await input.fill('');
    await input.fill(title);
    await expect
      .poll(async () => (await input.inputValue()).trim(), { timeout: 15000 })
      .toBe(title);
    this.lastIndentTitle = title;
    // eslint-disable-next-line no-console
    console.log(`[Indent] Filled indent title: ${title}`);
  }

  /**
   * Codegen: getByRole('textbox', { name: 'Select Users' }) → first radio.
   * Use click (not check): MUI often selects + closes the list, so Playwright never
   * sees a stable checked state and check() times out even though the UI is correct.
   */
  async selectFirstIndentApprover() {
    await this.page.keyboard.press('Escape').catch(() => {});

    const selectUsers = this.page.getByRole('textbox', { name: 'Select Users' });
    await expect(selectUsers).toBeVisible({ timeout: this.indentUiTimeout });
    await selectUsers.scrollIntoViewIfNeeded().catch(() => {});
    await selectUsers.click({ timeout: 15000 });

    const firstRadio = this.page.locator('input[type="radio"]').first();
    await expect(firstRadio).toBeVisible({ timeout: this.indentUiTimeout });
    await firstRadio.click({ timeout: 15000, force: true });

    // Close any leftover popover so Item Name stays clickable.
    await this.page.keyboard.press('Escape').catch(() => {});
    await expect(this.page.getByRole('textbox', { name: 'Item Name' })).toBeVisible({
      timeout: this.indentUiTimeout,
    });

    // eslint-disable-next-line no-console
    console.log('[Indent] Selected first approver via Select Users radio click.');
  }

  async ensureIndentLineItemsTableVisible() {
    const table = this.page.locator('table').filter({ has: this.page.locator('tbody tr') }).last();
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      return table;
    }
    return null;
  }

  /**
   * Codegen: Item Name textbox → qty → combobox Nos.
   * When multiple rows exist (edit + Add Manually), fill the last row.
   */
  async addIndentLineItemManually({ lineItem, quantity, preferLastRow = false }) {
    const itemNames = this.page.getByRole('textbox', { name: 'Item Name' });
    await expect(itemNames.first()).toBeVisible({ timeout: this.indentUiTimeout });
    const count = await itemNames.count();
    const useLast = preferLastRow || count > 1;
    const itemName = useLast ? itemNames.last() : itemNames.first();
    await itemName.click({ timeout: 10000 });
    await itemName.fill(lineItem);

    const row = itemName.locator('xpath=ancestor::tr[1]');
    const qtyCandidates = [
      row.getByRole('textbox', { name: /qty|quantity/i }).first(),
      row.getByPlaceholder(/qty|quantity/i).first(),
      row.locator('input[type="number"]').first(),
      row.locator('td').nth(1).locator('input').first(),
      this.page.getByRole('textbox', { name: /qty|quantity/i }).last(),
      this.page.getByPlaceholder(/qty|quantity/i).last(),
      this.page.locator('input[type="number"]').last(),
    ];

    let qtyFilled = false;
    for (const qtyInput of qtyCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await qtyInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await qtyInput.click({ timeout: 10000 });
        // eslint-disable-next-line no-await-in-loop
        await qtyInput.fill(String(quantity));
        qtyFilled = true;
        break;
      }
    }
    if (!qtyFilled) {
      throw new Error('Indent line item: quantity field not found.');
    }

    // eslint-disable-next-line no-console
    console.log(
      `[Indent] Filled Item Name="${lineItem}" qty=${quantity}${useLast ? ' (last row)' : ''}`
    );
  }

  async selectFirstIndentLineItemUnit({ preferLast = false } = {}) {
    const comboboxes = this.page.getByRole('combobox');
    await expect(comboboxes.first()).toBeVisible({ timeout: this.indentUiTimeout });
    const count = await comboboxes.count();
    const combobox =
      preferLast || count > 1 ? comboboxes.last() : comboboxes.first();
    await combobox.click({ timeout: 15000 });

    const nos = this.page.getByRole('option', { name: 'Nos', exact: true });
    if (await nos.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nos.click({ timeout: 15000 });
      // eslint-disable-next-line no-console
      console.log('[Indent] Selected unit: Nos');
      return;
    }

    const firstOption = this.page.getByRole('option').first();
    await expect(firstOption).toBeVisible({ timeout: 15000 });
    await firstOption.click({ timeout: 15000 });
    // eslint-disable-next-line no-console
    console.log('[Indent] Selected first unit option.');
  }

  async clickAddManuallyOnIndentForm() {
    await this.page.keyboard.press('Escape').catch(() => {});
    const addManually = this.page
      .getByText(/^\+?\s*Add Manually$/i)
      .or(this.page.locator('span.pointer').filter({ hasText: /add manually/i }))
      .or(this.page.getByRole('button', { name: /add manually/i }))
      .first();
    await expect(addManually).toBeVisible({ timeout: this.indentUiTimeout });
    await addManually.scrollIntoViewIfNeeded().catch(() => {});
    await addManually.click({ timeout: 15000, force: true });
    await expect(this.page.getByRole('textbox', { name: 'Item Name' }).last()).toBeVisible({
      timeout: this.indentUiTimeout,
    });
    // eslint-disable-next-line no-console
    console.log('[Indent] Clicked + Add Manually.');
  }

  async clickCreateIndentOnForm() {
    const createBtn = this.page
      .getByRole('button', { name: /^(create|update|save)$/i })
      .filter({ visible: true })
      .last();
    await expect(createBtn).toBeVisible({ timeout: this.indentUiTimeout });
    await expect(createBtn).toBeEnabled({ timeout: 15000 });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });

    this.indentCreateSuccessObserved = false;
    const raceTimeout = this.indentFastMode ? 25000 : 60000;
    const toast = this.locatorIndentCreatedToast();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: raceTimeout }).then(() => {
        this.indentCreateSuccessObserved = true;
      }),
      this.createIndentListButton()
        .waitFor({ state: 'visible', timeout: raceTimeout })
        .then(() => {
          this.indentCreateSuccessObserved = true;
        })
        .catch(() => {}),
      this.page
        .waitForURL(
          (url) => {
            const href = typeof url === 'string' ? url : url.href;
            return (
              /tab=RFQAndPO/i.test(href) &&
              (/subTab=Indent/i.test(href) || /subTab%3DIndent/i.test(href)) &&
              !/indent\/(create|edit|update)/i.test(href)
            );
          },
          { timeout: raceTimeout }
        )
        .then(() => {
          this.indentCreateSuccessObserved = true;
        })
        .catch(() => {}),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Indent] Clicked Create/Update on indent form.');
  }

  async expectIndentCreatedSuccessfully() {
    if (this.indentCreateSuccessObserved) {
      // eslint-disable-next-line no-console
      console.log('[Indent] Create success already observed after Create click.');
      return;
    }

    const toast = this.locatorIndentCreatedToast();
    if (await toast.isVisible({ timeout: this.indentFastMode ? 8000 : 15000 }).catch(() => false)) {
      this.indentCreateSuccessObserved = true;
      // eslint-disable-next-line no-console
      console.log('[Indent] Success toast displayed after create.');
      return;
    }

    // Toast often disappears quickly — list redirect is a valid success signal.
    await expect(this.createIndentListButton()).toBeVisible({
      timeout: this.indentUiTimeout,
    });
    await expect
      .poll(async () => this.isIndentListReadyAfterCreate(), {
        timeout: this.indentUiTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);
    this.indentCreateSuccessObserved = true;
    // eslint-disable-next-line no-console
    console.log('[Indent] Create success confirmed via return to indent list.');
  }

  /**
   * Atomic TC-01 flow: navigate → Create Indent → Material Indent → title → line → unit → Create.
   */
  async completeMaterialIndentCreateJourney({
    title = 'Electricians',
    lineItem = 'Labour 1',
    quantity = '20',
  } = {}) {
    await this.completeIndentCreateJourney({
      indentType: 'Material Indent',
      title,
      lineItem,
      quantity,
    });
  }

  /**
   * Atomic TC-02 flow: navigate → Create Indent → Work Indent → title → line → unit → Create.
   */
  async completeWorkIndentCreateJourney({
    title = 'Electricians',
    lineItem = 'Labour 1',
    quantity = '20',
  } = {}) {
    await this.completeIndentCreateJourney({
      indentType: 'Work Indent',
      title,
      lineItem,
      quantity,
    });
  }

  /**
   * Atomic TC-03 flow: Material Indent → approver → title → line → unit → Create.
   */
  async completeMaterialIndentCreateWithApproverJourney({
    title = 'Electricians',
    lineItem = 'Labour 1',
    quantity = '20',
  } = {}) {
    await this.completeIndentCreateJourney({
      indentType: 'Material Indent',
      title,
      lineItem,
      quantity,
      selectApprover: true,
    });
  }

  async completeIndentCreateJourney({
    indentType = 'Material Indent',
    title = 'Electricians',
    lineItem = 'Labour 1',
    quantity = '20',
    selectApprover = false,
  } = {}) {
    await this.navigateToIndentModuleForFirstProject();
    await this.clickCreateIndentListButton();
    await this.selectIndentTypeAndProceed(indentType);
    // Title first so Approver field is interactive; then Approver dropdown → line items.
    await this.fillIndentTitle(title);
    if (selectApprover) {
      await this.selectFirstIndentApprover();
    }
    await this.addIndentLineItemManually({ lineItem, quantity });
    await this.selectFirstIndentLineItemUnit();
    await this.clickCreateIndentOnForm();
    // eslint-disable-next-line no-console
    console.log(
      `[Indent] Complete ${indentType} create journey finished${selectApprover ? ' (with approver)' : ''}.`
    );
  }

  /** After create: ensure indent list is ready for card actions. */
  async waitForIndentListAfterCreate() {
    await this.expectIndentCreatedSuccessfully();
    await this.ensureIndentListReady().catch(() => {});
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers().catch(() => {});
    await this.firstIndentCard().scrollIntoViewIfNeeded().catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Indent] List ready after create for card menu.');
  }

  async openThreeDotMenuOnFirstIndentCard() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    await expect(this.createIndentListButton()).toBeVisible({
      timeout: this.indentUiTimeout,
    });

    const card = this.firstIndentCard();
    await expect(card).toBeVisible({ timeout: this.indentUiTimeout });
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card).catch(() => {});

    const kebab = this.kebabButtonOnPoCard(card);
    await expect(kebab).toBeVisible({ timeout: this.indentUiTimeout });
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click({ timeout: 20000 }).catch(async () => {
      await kebab.click({ force: true, timeout: 10000 });
    });

    await expect(
      this.page
        .getByRole('menuitem')
        .filter({ hasText: /^(preview|edit)$/i })
        .first()
    ).toBeVisible({ timeout: this.indentUiTimeout });
    // eslint-disable-next-line no-console
    console.log('[Indent] Opened three dot menu on indent card.');
  }

  async clickPreviewInIndentCardMenu() {
    const previewItem = this.page.getByRole('menuitem', { name: /^preview$/i }).first();
    await expect(previewItem).toBeVisible({ timeout: this.indentUiTimeout });
    await previewItem.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Indent] Clicked Preview in card menu.');
  }

  async clickEditInIndentCardMenu() {
    const editItem = this.page.getByRole('menuitem', { name: /^edit$/i }).first();
    await expect(editItem).toBeVisible({ timeout: this.indentUiTimeout });
    await editItem.click({ timeout: 15000 });
    await this.waitForIndentEditFormReady();
    // eslint-disable-next-line no-console
    console.log('[Indent] Clicked Edit in card menu.');
  }

  async waitForIndentEditFormReady() {
    await this.page
      .waitForURL(
        (url) => {
          const href = typeof url === 'string' ? url : url.href;
          return /indent\/(edit|update)/i.test(href) || /indent/i.test(href);
        },
        { timeout: this.indentUiTimeout }
      )
      .catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect
      .poll(
        async () =>
          (await this.indentTitleInput().isVisible({ timeout: 500 }).catch(() => false)) ||
          (await this.page.getByText(/edit indent|line items/i).first().isVisible({ timeout: 500 }).catch(() => false)) ||
          (await this.page.getByRole('textbox', { name: 'Item Name' }).first().isVisible({ timeout: 500 }).catch(() => false)),
        { timeout: this.indentUiTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
  }

  async expectIndentEditFormDisplayed() {
    await this.waitForIndentEditFormReady();
    await expect(
      this.page
        .getByText(/edit indent|line items/i)
        .or(this.indentTitleInput())
        .or(this.page.getByRole('textbox', { name: 'Item Name' }))
        .first()
    ).toBeVisible({ timeout: this.indentUiTimeout });
    // eslint-disable-next-line no-console
    console.log('[Indent] Edit indent form is displayed.');
  }

  async expectIndentPreviewVisible() {
    const dialog = this.indentPreviewRoot();
    const previewSignals = async () => {
      if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
      if (/preview/i.test(this.page.url())) {
        return true;
      }
      const heading = this.page.getByRole('heading', { name: /preview|indent/i }).first();
      if (await heading.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
      const bodyText = this.page
        .getByText(/indent preview|preview|indent no/i)
        .filter({ visible: true })
        .first();
      if (await bodyText.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
      const canvasOrFrame = this.page.locator('canvas, iframe').first();
      return canvasOrFrame.isVisible({ timeout: 500 }).catch(() => false);
    };

    await expect
      .poll(previewSignals, {
        timeout: this.indentUiTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);

    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(
        dialog.getByText(/indent|preview|indent no|issued date/i).first()
      ).toBeVisible({ timeout: this.indentUiTimeout });
    }

    // eslint-disable-next-line no-console
    console.log('[Indent] Preview page/dialog is visible.');
  }

  /**
   * Atomic TC-04: Material Indent create → list ⋮ → Preview → assert preview.
   */
  async completeMaterialIndentCreateAndPreviewJourney({
    title = 'Electricians Preview',
    lineItem = 'Labour 1',
    quantity = '20',
  } = {}) {
    await this.completeMaterialIndentCreateJourney({ title, lineItem, quantity });
    await this.waitForIndentListAfterCreate();
    await this.openThreeDotMenuOnFirstIndentCard();
    await this.clickPreviewInIndentCardMenu();
    await this.expectIndentPreviewVisible();
  }

  /**
   * Atomic TC-05: Material Indent create → ⋮ Edit → Add Manually → line → Create.
   */
  async completeMaterialIndentCreateAndEditAddLineJourney({
    title = 'Electricians Edit',
    lineItem = 'Labour 1',
    quantity = '20',
    editLineItem = 'Labour 2',
    editQuantity = '20',
  } = {}) {
    await this.completeMaterialIndentCreateJourney({ title, lineItem, quantity });
    await this.waitForIndentListAfterCreate();
    await this.openThreeDotMenuOnFirstIndentCard();
    await this.clickEditInIndentCardMenu();
    await this.expectIndentEditFormDisplayed();
    await this.clickAddManuallyOnIndentForm();
    await this.addIndentLineItemManually({
      lineItem: editLineItem,
      quantity: editQuantity,
      preferLastRow: true,
    });
    await this.selectFirstIndentLineItemUnit({ preferLast: true });
    await this.clickCreateIndentOnForm();
  }

  /** Open Convert Indent dropdown (MuiMenu), not the procurement PO tab. */
  convertIndentMenuPaper() {
    return this.page
      .locator('.MuiPopover-root.MuiMenu-root, .MuiPopover-root')
      .filter({ visible: true })
      .locator('.MuiPaper-root, [role="menu"]')
      .last();
  }

  locatorPoOptionInConvertIndentMenu() {
    const paper = this.convertIndentMenuPaper();
    return paper
      .getByRole('menuitem', { name: /purchase order|\bpo\b/i })
      .or(paper.getByRole('menuitem').filter({ hasText: /purchase order|\bpo\b/i }))
      .or(paper.locator('[role="menuitem"], li').filter({ hasText: /purchase order|\bpo\b/i }))
      .first();
  }

  /** Outer card control — not the ⋮ menu. */
  async clickConvertIndentOnFirstIndentCard() {
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    const card = this.firstIndentCard();
    await expect(card).toBeVisible({ timeout: this.indentUiTimeout });
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card).catch(() => {});

    const convertOnCard = card
      .getByRole('button', { name: /convert indent/i })
      .or(card.getByText(/convert indent/i))
      .first();
    const convertOnPage = this.page.getByRole('button', { name: /convert indent/i }).first();

    const convertBtn = (await convertOnCard.isVisible({ timeout: 5000 }).catch(() => false))
      ? convertOnCard
      : convertOnPage;

    await expect(convertBtn).toBeVisible({ timeout: this.indentUiTimeout });
    await convertBtn.scrollIntoViewIfNeeded().catch(() => {});
    await convertBtn.click({ timeout: 20000 });

    await expect(this.locatorPoOptionInConvertIndentMenu()).toBeVisible({
      timeout: this.indentUiTimeout,
    });

    // eslint-disable-next-line no-console
    console.log('[Indent] Clicked Convert Indent on card.');
  }

  async selectPoFromConvertIndentOptions() {
    const poOption = this.locatorPoOptionInConvertIndentMenu();
    await expect(poOption).toBeVisible({ timeout: this.indentUiTimeout });

    // Must click inside the open menu — page-level "PO" matches the Procurement tab behind the backdrop.
    await poOption.click({ timeout: 15000, force: true });

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForPurchaseOrderFormAfterIndentConvert();
    // eslint-disable-next-line no-console
    console.log('[Indent] Selected PO from Convert Indent menu.');
  }

  async waitForPurchaseOrderFormAfterIndentConvert() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect
      .poll(
        async () => {
          if (/purchase[-_]?order/i.test(this.page.url())) {
            return true;
          }
          if (
            await this.page
              .getByRole('button', { name: /add vendor details/i })
              .first()
              .isVisible({ timeout: 500 })
              .catch(() => false)
          ) {
            return true;
          }
          // Prefer create/edit PO heading — not the "PO" tab alone.
          if (
            await this.page
              .getByText(/create purchase order|edit purchase order|new purchase order/i)
              .first()
              .isVisible({ timeout: 500 })
              .catch(() => false)
          ) {
            return true;
          }
          return this.page
            .locator('[aria-label="PO line items table"], [aria-label*="line items" i]')
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false);
        },
        { timeout: this.indentUiTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
  }

  /**
   * Same vendor off-canvas as PO/WO create — no strict create-URL assert (convert may differ).
   */
  async addFirstVendorDetailsOnPurchaseOrderFromIndent() {
    const addVendorBtn = this.page.getByRole('button', { name: /add vendor details/i });
    await expect(addVendorBtn).toBeVisible({ timeout: this.indentUiTimeout });
    await addVendorBtn.scrollIntoViewIfNeeded().catch(() => {});
    await expect(addVendorBtn).toBeEnabled({ timeout: 15000 });
    await addVendorBtn.click({ timeout: 20000 });

    const vendorModal = this.page.locator('.MuiModal-root').last();
    const panelHeading = vendorModal.getByText(
      /add vendor|select vendor|change vendor/i
    );
    await expect(panelHeading).toBeVisible({ timeout: this.indentUiTimeout });

    const skeleton = vendorModal.locator('.MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skeleton.waitFor({ state: 'hidden', timeout: 90000 });
    }

    if (await vendorModal.getByText(/no data found/i).isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error(
        'Vendor off-canvas has no organizations. Connect or invite a vendor in User Hub first.'
      );
    }

    const firstRadio = vendorModal.locator('table tbody input[type="radio"]').first();
    const firstCell = vendorModal.getByRole('cell').first();
    if (await firstRadio.isVisible({ timeout: 8000 }).catch(() => false)) {
      await firstRadio.click({ timeout: 15000, force: true });
    } else if (await firstCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCell.click({ timeout: 15000 });
    } else {
      throw new Error('Could not select first vendor in the Add Vendor Details off-canvas.');
    }

    const addBtn = vendorModal
      .getByRole('button', { name: /^Add$/i })
      .or(this.page.getByRole('button', { name: /^Add$/i }))
      .last();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(
      this.page.getByRole('button', { name: /change vendor|add vendor details/i }).first()
    ).toBeVisible({ timeout: this.indentUiTimeout });

    // eslint-disable-next-line no-console
    console.log('[Indent→PO] Selected first vendor and confirmed Add.');
  }

  /**
   * Indent→PO already has line items — fill Rate on the first data row (codegen: Rate column).
   */
  async fillRateOnFirstPurchaseOrderLineItemFromIndent(rate = '10000') {
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    let dataRow = null;
    const poTable = this.page.locator('[aria-label="PO line items table"]').first();
    if (await poTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      dataRow = poTable.locator('tbody tr').first();
    } else {
      const anyTable = this.page
        .locator('table')
        .filter({ has: this.page.locator('tbody tr') })
        .last();
      await expect(anyTable).toBeVisible({ timeout: this.indentUiTimeout });
      dataRow = anyTable.locator('tbody tr').first();
    }

    await expect(dataRow).toBeVisible({ timeout: this.indentUiTimeout });
    await dataRow.scrollIntoViewIfNeeded().catch(() => {});

    const rateCandidates = [
      dataRow.getByRole('textbox', { name: /^rate$/i }).first(),
      dataRow.getByPlaceholder(/rate/i).first(),
      dataRow.getByLabel(/rate/i).first(),
      dataRow.locator('td').nth(3).locator('input').first(),
      dataRow.locator('input[type="number"]').last(),
      dataRow
        .locator(
          'input[type="text"], input[type="number"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
        )
        .filter({ visible: true })
        .last(),
    ];

    let rateInput = null;
    for (const candidate of rateCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        rateInput = candidate;
        break;
      }
    }
    if (!rateInput) {
      throw new Error('PO line item Rate field not found after indent convert.');
    }

    await expect(rateInput).toBeEnabled({ timeout: 15000 });
    await rateInput.click({ timeout: 10000 });
    await rateInput.fill('');
    await rateInput.fill(String(rate));
    await rateInput.blur().catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // eslint-disable-next-line no-console
    console.log(`[Indent→PO] Filled Rate=${rate} on first PO line item.`);
  }

  /**
   * Action → Compose email, or a direct Compose email button. Stops once dialog is open.
   */
  async openComposeEmailOnPurchaseOrderFromIndent() {
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    if (await actionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.openActionMenuAndComposeEmail();
      // eslint-disable-next-line no-console
      console.log('[Indent→PO] Opened Compose email via Action menu.');
      return;
    }

    const composeBtn = this.page
      .getByRole('button', { name: /compose email/i })
      .or(this.page.getByText(/compose email/i))
      .first();
    await expect(composeBtn).toBeVisible({ timeout: this.indentUiTimeout });
    await composeBtn.click({ timeout: 20000 });
    await this.waitForComposeEmailModalReady();
    // eslint-disable-next-line no-console
    console.log('[Indent→PO] Clicked Compose email button.');
  }

  async expectComposeEmailDialogFromIndentConvertedPo() {
    await this.waitForComposeEmailModalReady();
    // eslint-disable-next-line no-console
    console.log('[Indent→PO] Compose email dialog is visible.');
  }

  async sendComposeEmailOnPurchaseOrderFromIndent() {
    await this.sendEmailFromComposeModal();
    // eslint-disable-next-line no-console
    console.log('[Indent→PO] Clicked Send email on compose dialog.');
  }

  async expectPurchaseOrderEmailSentFromIndentConvert() {
    if (this.poCreatedAndSentSuccessObserved) {
      // eslint-disable-next-line no-console
      console.log('[Indent→PO] Email sent success already observed after Send.');
      return;
    }

    const toast = this.locatorEmailSentSuccessToast().or(this.locatorPoCreatedAndSentToast());
    if (await toast.isVisible({ timeout: 20000 }).catch(() => false)) {
      this.poCreatedAndSentSuccessObserved = true;
      // eslint-disable-next-line no-console
      console.log('[Indent→PO] Email sent / PO created & sent toast visible.');
      return;
    }

    // Toast may dismiss quickly — list / PO tab ready is an acceptable success signal.
    await expect(
      this.page
        .getByRole('button', { name: /create purchase order/i })
        .or(this.page.getByText(/po no/i))
        .first()
    ).toBeVisible({ timeout: this.indentUiTimeout });
    this.poCreatedAndSentSuccessObserved = true;
    // eslint-disable-next-line no-console
    console.log('[Indent→PO] Email send confirmed via PO list/success state.');
  }

  /**
   * Atomic TC-06: create → Convert Indent → PO → vendor → Compose → Send.
   */
  async completeMaterialIndentConvertToPoComposeJourney({
    title = 'Electricians Convert PO',
    lineItem = 'Labour 1',
    quantity = '20',
  } = {}) {
    await this.completeMaterialIndentCreateJourney({ title, lineItem, quantity });
    await this.waitForIndentListAfterCreate();
    await this.clickConvertIndentOnFirstIndentCard();
    await this.selectPoFromConvertIndentOptions();
    await this.addFirstVendorDetailsOnPurchaseOrderFromIndent();
    await this.fillRateOnFirstPurchaseOrderLineItemFromIndent('10000');
    await this.openComposeEmailOnPurchaseOrderFromIndent();
    await this.sendComposeEmailOnPurchaseOrderFromIndent();
    await this.expectPurchaseOrderEmailSentFromIndentConvert();
  }
}

module.exports = IndentPage;
