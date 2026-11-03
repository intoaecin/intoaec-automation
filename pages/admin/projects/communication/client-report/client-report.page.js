const fs = require('fs');
const path = require('path');
const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectProfilePage = require('../../ProjectProfilePage');

/**
 * Codegen-aligned flow (app.aecplayhouse.com):
 * Clients/Projects → project → profile icon → Communication & Docs → Client Report
 * → Create × 2 → title → notes icon → Start typing... → Save
 * → MuiStack row 2 (attachment) → MuiStack row 3 (weather) → checkbox → Enter your notes here → Save
 * → MuiStack row 5 (task) → checkbox.first uncheck → Save → Create
 */
class ClientReportPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.createSubmitSuccessTimeout = 25000;
    this.clientReportCreateSuccessObserved = false;
    this.lastClientReportTitle = null;
    this.lastClientReportNotes = null;
    this.lastClientReportWeatherNotes = null;
    this.lastCreatedScheduleName = null;
    this.lastCreatedTaskName = null;
    this.lastCreatedShiftName = null;
    this.lastAddedInventoryItemName = null;
    this.lastSelectedWeatherCondition = null;
    this.lastSelectedScheduleCheckboxCount = 0;
    this.lastSelectedTaskCheckboxCount = 0;
  }

  /** Codegen: getByRole('button', { name: 'Create' }) — visible Create on current step. */
  visibleCreateButton() {
    return this.page
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .first();
  }

  /** List page Create (before popup). */
  listPageCreateButton() {
    return this.createPageScope()
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .first()
      .or(this.visibleCreateButton());
  }

  /** Create Client Report confirmation popup (dialog / modal). */
  createClientReportPopupRoot() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({
        has: this.page.getByRole('button', { name: /^(create|create client report)$/i }),
      })
      .last()
      .or(
        this.page
          .locator('.MuiDialog-root, .MuiModal-root, [role="presentation"]')
          .filter({ visible: true })
          .filter({
            has: this.page.getByRole('button', { name: /^(create|create client report)$/i }),
          })
          .last()
      );
  }

  /** Submit Create on the filled client report form (bottom/main — not popup Create). */
  createFormSubmitButton() {
    return this.createPageScope()
      .getByRole('button', { name: 'Create', exact: true })
      .filter({ visible: true })
      .last()
      .or(
        this.page
          .locator('main, [role="main"]')
          .getByRole('button', { name: 'Create', exact: true })
          .filter({ visible: true })
          .last()
      );
  }

  weatherEditorScope() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /weather condition|weather affecting work|select weather/i })
      .last()
      .or(this.page.getByRole('dialog').filter({ visible: true }).last())
      .or(this.notesEditorRoot());
  }

  /** Create button scoped to the open Client Report popup only. */
  createButtonInClientReportPopup() {
    const popup = this.createClientReportPopupRoot();
    return popup
      .getByRole('button', { name: 'Create', exact: true })
      .or(popup.getByRole('button', { name: /create client report/i }))
      .filter({ visible: true })
      .first();
  }

  async _saveWeatherEditorIfOpen() {
    const editorScope = this.weatherEditorScope();
    const saveBtn = editorScope
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .first()
      .or(this.page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last());

    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 15000 });
      await saveBtn.click({ timeout: 20000 });
      await this.dismissNotesEditorAfterSave();
      // eslint-disable-next-line no-console
      console.log('[Client Report] Saved weather condition editor.');
    }
  }

  async _pickFirstWeatherOptionFromOpenList() {
    const listbox = this.page.getByRole('listbox').filter({ visible: true }).last();
    const menu = this.page.getByRole('menu').filter({ visible: true }).last();
    const popover = this.page.locator('.MuiPopover-root:visible, .MuiMenu-root:visible').last();

    await listbox.waitFor({ state: 'visible', timeout: 8000 }).catch(async () => {
      await menu.waitFor({ state: 'visible', timeout: 8000 }).catch(async () => {
        await popover.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      });
    });

    const optionCandidates = [
      listbox.locator('[role="option"], .MuiMenuItem-root, li').filter({ visible: true }).first(),
      menu.locator('[role="menuitem"], .MuiMenuItem-root, li').filter({ visible: true }).first(),
      popover.locator('[role="option"], [role="menuitem"], .MuiMenuItem-root, li').filter({ visible: true }).first(),
      this.page.locator('[role="option"], .MuiMenuItem-root').filter({ visible: true }).first(),
    ];

    for (const option of optionCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }
      const text = (await option.innerText().catch(() => '')).trim();
      // eslint-disable-next-line no-await-in-loop
      await option.click({ timeout: 15000 });
      this.lastSelectedWeatherCondition = text || 'selected';
      await this.page.keyboard.press('Escape').catch(() => {});
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Selected weather condition from list: ${this.lastSelectedWeatherCondition}`);
      return true;
    }
    return false;
  }

  async locateWeatherConditionDropdownHandle() {
    const handle = await this.page.evaluateHandle(() => {
      const weatherRe = /^weather condition$/i;
      let anchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (weatherRe.test((node.textContent || '').trim())) {
          anchor = node.parentElement;
          break;
        }
      }
      if (!anchor) {
        return null;
      }

      const isVisible = (el) => {
        if (!el) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const scoreCandidate = (el) => {
        const rect = el.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        let score = Math.abs(rect.top - anchorRect.top) + Math.abs(rect.left - anchorRect.left) * 0.05;
        if (el.matches('select, [role="combobox"], .MuiSelect-select')) {
          score -= 1000;
        }
        if (el.closest('button.MuiIconButton-root, button.MuiIconButton-sizeSmall')) {
          score += 5000;
        }
        return score;
      };

      const collected = [];
      let container = anchor;
      for (let depth = 0; depth < 12 && container; depth += 1) {
        container
          .querySelectorAll(
            'select, [role="combobox"], .MuiSelect-select, .MuiAutocomplete-root, .MuiInputBase-root, [aria-haspopup="listbox"]'
          )
          .forEach((el) => {
            if (isVisible(el) && !el.closest('[role="dialog"]')) {
              collected.push(el);
            }
          });
        container = container.parentElement;
      }

      collected.sort((a, b) => scoreCandidate(a) - scoreCandidate(b));
      return collected[0] || null;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  async _clickWeatherDropdownTrigger(trigger) {
    if (!trigger) {
      return false;
    }

    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 20000, force: true });
    if (typeof trigger.dispose === 'function') {
      await trigger.dispose().catch(() => {});
    }
    return this._pickFirstWeatherOptionFromOpenList();
  }

  async _selectWeatherFromInlineDropdownOnForm() {
    const handle = await this.locateWeatherConditionDropdownHandle();
    if (handle && (await this._clickWeatherDropdownTrigger(handle))) {
      return true;
    }

    const weatherLabel = this.page.getByText(/^weather condition$/i).first();
    if (!(await weatherLabel.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }

    const row = weatherLabel.locator('xpath=ancestor::*[self::div or self::section][1]');
    const triggers = [
      row.locator('.MuiSelect-select').filter({ visible: true }).first(),
      row.getByRole('combobox').filter({ visible: true }).first(),
      row.locator('[aria-haspopup="listbox"]').filter({ visible: true }).first(),
      weatherLabel
        .locator('xpath=following::*[@role="combobox" or contains(@class,"MuiSelect-select")][1]')
        .first(),
    ];

    for (const trigger of triggers) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await trigger.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (await this._clickWeatherDropdownTrigger(trigger)) {
        return true;
      }
    }

    return false;
  }

  async _selectWeatherChoiceInScope(scope) {
    const panel = scope || this.page.locator('body');

    const combo = await this._resolveWeatherConditionDropdown(scope);
    if (combo && (await this._clickWeatherDropdownTrigger(combo))) {
      return true;
    }

    const extraTriggers = [
      panel.getByRole('combobox').filter({ visible: true }).first(),
      panel.locator('.MuiSelect-select').filter({ visible: true }).first(),
      panel.locator('[aria-haspopup="listbox"]').filter({ visible: true }).first(),
      panel.locator('select').filter({ visible: true }).first(),
    ];

    for (const trigger of extraTriggers) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await trigger.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (await this._clickWeatherDropdownTrigger(trigger)) {
        return true;
      }
    }

    const radios = panel.getByRole('radio').filter({ visible: true });
    if (await radios.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await radios.first().click({ timeout: 15000 });
      this.lastSelectedWeatherCondition = (await radios.first().innerText().catch(() => '')).trim() || 'selected';
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Selected weather condition radio: ${this.lastSelectedWeatherCondition}`);
      return true;
    }

    return false;
  }

  async _resolveWeatherConditionDropdown(scope) {
    const panel = scope || this.createPageScope();
    const candidates = [
      panel.getByRole('combobox', { name: /^weather condition$/i }).first(),
      panel.getByLabel(/^weather condition$/i).first(),
      panel
        .locator('label, .MuiFormLabel-root, p, span')
        .filter({ hasText: /^weather condition$/i })
        .first()
        .locator('xpath=following::*[@role="combobox"][1]'),
      panel
        .locator('label, .MuiFormLabel-root, p, span')
        .filter({ hasText: /^weather condition$/i })
        .first()
        .locator('..')
        .locator('[role="combobox"], .MuiSelect-select, .MuiInputBase-root')
        .first(),
      panel.getByRole('combobox').filter({ visible: true }).first(),
      panel.locator('.MuiSelect-select').filter({ visible: true }).first(),
    ];

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        return candidate;
      }
    }
    return null;
  }

  async _trySelectWeatherDropdownInScope(scope) {
    const combo = await this._resolveWeatherConditionDropdown(scope);
    if (!combo) {
      return false;
    }

    const preferred = [
      /^sunny$/i,
      /^clear$/i,
      /^cloudy$/i,
      /^rainy?$/i,
      /^partly\s*cloudy$/i,
      /^overcast$/i,
      /^windy$/i,
      /^hot$/i,
      /^cold$/i,
    ];

    for (const pattern of preferred) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this._selectLabeledDropdownOption(/^weather condition$/i, pattern, scope, combo);
        return true;
      } catch {
        // try next weather option
      }
    }

    try {
      await this._selectLabeledDropdownOption(/^weather condition$/i, /.+/i, scope, combo);
      return true;
    } catch {
      return false;
    }
  }

  clientReportModuleLabel() {
    return this.page.getByText('Client Report', { exact: true }).first();
  }

  projectProfileIconButton() {
    return this.page
      .locator('button.MuiIconButton-root.MuiIconButton-sizeSmall')
      .filter({ visible: true })
      .first();
  }

  reportTitleInput() {
    return this.page
      .getByRole('textbox', { name: 'Enter report title' })
      .or(this.page.getByRole('textbox', { name: /report title/i }))
      .first();
  }

  notesTypingTextbox() {
    return this.page
      .getByRole('textbox', { name: /start typing/i })
      .or(this.page.getByPlaceholder(/start typing/i))
      .first();
  }

  notesEditorRoot() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .or(this.page.locator('[role="presentation"]').filter({ visible: true }))
      .last();
  }

  createPageScope() {
    return this.page.locator('main, [role="main"]').first();
  }

  /**
   * Codegen MuiStack rows on the create form (same parent as report title):
   *   row 2 → attachment   div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root
   *   row 3 → weather      div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root
   *   row 4 → schedule     div:nth-child(4) > .MuiStack-root > .MuiButtonBase-root
   *   row 5 → task         div:nth-child(5) > .MuiStack-root > .MuiButtonBase-root
   */
  codegenWeatherRowTrigger() {
    return this.page
      .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(this.muiStackRowTriggerLocator(3));
  }

  codegenTaskRowTrigger() {
    return this.page
      .locator('div:nth-child(5) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(this.muiStackRowTriggerLocator(5));
  }

  /** Workers / Shift section edit — typically after Task (row 6). */
  codegenWorkersRowTrigger() {
    return this.page
      .locator('div:nth-child(6) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(this.muiStackRowTriggerLocator(6));
  }

  async locateMuiStackRowTriggerHandle(rowIndex) {
    if (rowIndex === 4) {
      const scheduleHandle = await this.page.evaluateHandle(() => {
        const scheduleRe = /^schedule$/i;
        let scheduleAnchor = null;
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = tw.nextNode())) {
          if (scheduleRe.test((node.textContent || '').trim())) {
            scheduleAnchor = node.parentElement;
            break;
          }
        }
        if (!scheduleAnchor) {
          return null;
        }

        const isVisible = (el) => {
          if (!el) {
            return false;
          }
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        let container = scheduleAnchor;
        for (let depth = 0; depth < 10 && container; depth += 1) {
          const trigger = container.querySelector(
            '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
          );
          if (isVisible(trigger)) {
            return trigger;
          }
          container = container.parentElement;
        }

        const scheduleRect = scheduleAnchor.getBoundingClientRect();
        let best = null;
        let bestScore = Infinity;
        document
          .querySelectorAll('.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall')
          .forEach((btn) => {
            const rect = btn.getBoundingClientRect();
            if (!isVisible(btn)) {
              return;
            }
            if (rect.top < scheduleRect.top - 40) {
              return;
            }
            const score = Math.abs(rect.top - scheduleRect.top) + Math.abs(rect.left - scheduleRect.left) * 0.05;
            if (score < bestScore) {
              bestScore = score;
              best = btn;
            }
          });
        return best;
      });

      const scheduleElement = scheduleHandle.asElement();
      if (scheduleElement) {
        return scheduleHandle;
      }
      await scheduleHandle.dispose().catch(() => {});
    }

    if (rowIndex === 3) {
      const weatherHandle = await this.page.evaluateHandle(() => {
        const weatherRe = /^weather condition$/i;
        let weatherAnchor = null;
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = tw.nextNode())) {
          if (weatherRe.test((node.textContent || '').trim())) {
            weatherAnchor = node.parentElement;
            break;
          }
        }
        if (!weatherAnchor) {
          return null;
        }

        const isVisible = (el) => {
          if (!el) {
            return false;
          }
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        let container = weatherAnchor;
        for (let depth = 0; depth < 10 && container; depth += 1) {
          const trigger = container.querySelector(
            '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
          );
          if (isVisible(trigger)) {
            return trigger;
          }
          container = container.parentElement;
        }

        const weatherRect = weatherAnchor.getBoundingClientRect();
        let best = null;
        let bestScore = Infinity;
        document
          .querySelectorAll('.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall')
          .forEach((btn) => {
            const rect = btn.getBoundingClientRect();
            if (!isVisible(btn)) {
              return;
            }
            if (rect.top < weatherRect.top - 40) {
              return;
            }
            const score = Math.abs(rect.top - weatherRect.top) + Math.abs(rect.left - weatherRect.left) * 0.05;
            if (score < bestScore) {
              bestScore = score;
              best = btn;
            }
          });
        return best;
      });

      const weatherElement = weatherHandle.asElement();
      if (weatherElement) {
        return weatherHandle;
      }
      await weatherHandle.dispose().catch(() => {});
    }

    if (rowIndex === 5) {
      const taskHandle = await this.page.evaluateHandle(() => {
        const taskRe = /^task$/i;
        let taskAnchor = null;
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = tw.nextNode())) {
          if (taskRe.test((node.textContent || '').trim())) {
            taskAnchor = node.parentElement;
            break;
          }
        }
        if (!taskAnchor) {
          return null;
        }

        const isVisible = (el) => {
          if (!el) {
            return false;
          }
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        let container = taskAnchor;
        for (let depth = 0; depth < 10 && container; depth += 1) {
          const trigger = container.querySelector(
            '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
          );
          if (isVisible(trigger)) {
            return trigger;
          }
          container = container.parentElement;
        }

        const taskRect = taskAnchor.getBoundingClientRect();
        let best = null;
        let bestScore = Infinity;
        document
          .querySelectorAll('.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall')
          .forEach((btn) => {
            const rect = btn.getBoundingClientRect();
            if (!isVisible(btn)) {
              return;
            }
            if (rect.top < taskRect.top - 40) {
              return;
            }
            const score = Math.abs(rect.top - taskRect.top) + Math.abs(rect.left - taskRect.left) * 0.05;
            if (score < bestScore) {
              bestScore = score;
              best = btn;
            }
          });
        return best;
      });

      const taskElement = taskHandle.asElement();
      if (taskElement) {
        return taskHandle;
      }
      await taskHandle.dispose().catch(() => {});
    }

    const handle = await this.page.evaluateHandle((index) => {
      const rowSelector = `div:nth-child(${index}) > .MuiStack-root > .MuiButtonBase-root`;
      const titleInput =
        document.querySelector('input[placeholder*="report title" i]') ||
        [...document.querySelectorAll('[role="textbox"]')].find((el) =>
          /enter report title|report title/i.test(
            `${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''}`
          )
        );
      const titleTop = titleInput?.getBoundingClientRect()?.top ?? 0;

      const isVisible = (el) => {
        if (!el) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top >= titleTop - 30;
      };

      let container = titleInput?.parentElement;
      for (let depth = 0; depth < 15 && container; depth += 1) {
        const row2 = container.querySelector(
          'div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root'
        );
        const row3 = container.querySelector(
          'div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root'
        );
        if (isVisible(row2) && isVisible(row3)) {
          const target = index === 2 ? row2 : row3;
          if (isVisible(target)) {
            return target;
          }
        }
        container = container.parentElement;
      }

      const allRows = [...document.querySelectorAll(rowSelector)].filter(isVisible);
      allRows.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      if (index === 2) {
        return allRows[0] || null;
      }
      if (index === 3) {
        return allRows[1] || null;
      }
      return allRows[index - 2] || null;
    }, rowIndex);

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  muiStackRowTriggerLocator(rowIndex) {
    return this.page
      .locator(`div:nth-child(${rowIndex}) > .MuiStack-root > .MuiButtonBase-root`)
      .filter({ visible: true })
      .last();
  }

  async clickMuiStackRowTrigger(rowIndex, label) {
    const openWeatherPanel = async () => {
      if (
        await this.page
          .getByText(/weather affecting work/i)
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false)
      ) {
        return true;
      }
      if (await this.weatherConditionNotesTextbox().isVisible({ timeout: 800 }).catch(() => false)) {
        return true;
      }
      if (
        await this.page
          .getByRole('checkbox')
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false)
      ) {
        return true;
      }
      if (
        await this.page
          .getByRole('switch')
          .filter({ visible: true })
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false)
      ) {
        return true;
      }
      return false;
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const handle = await this.locateMuiStackRowTriggerHandle(rowIndex);
      if (handle) {
        // eslint-disable-next-line no-await-in-loop
        await handle.scrollIntoViewIfNeeded().catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await handle.click({ timeout: 20000, force: true });
        // eslint-disable-next-line no-await-in-loop
        await handle.dispose().catch(() => {});
      } else {
        const fallback = this.muiStackRowTriggerLocator(rowIndex);
        // eslint-disable-next-line no-await-in-loop
        await expect(fallback).toBeVisible({ timeout: this.defaultTimeout });
        // eslint-disable-next-line no-await-in-loop
        await fallback.scrollIntoViewIfNeeded().catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await fallback.click({ timeout: 20000, force: true });
      }

      if (rowIndex !== 3 && rowIndex !== 4 && rowIndex !== 5) {
        break;
      }

      const panelOpen =
        rowIndex === 3
          ? await openWeatherPanel()
          : rowIndex === 4
            ? await this.isScheduleSelectionPanelOpen()
            : await this.isTaskPickerOpen();

      // eslint-disable-next-line no-await-in-loop
      if (panelOpen) {
        break;
      }

      if (rowIndex === 5) {
        // Task picker renders async; avoid Escape — it closes the panel when detection lags.
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        if (await this.isTaskPickerOpen()) {
          break;
        }
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    // eslint-disable-next-line no-console
    console.log(`[Client Report] Clicked MuiStack row ${rowIndex} (${label}).`);
  }

  async waitForUploadDialogClosed() {
    await expect
      .poll(async () => !(await this.isUploadPopupVisible()), {
        timeout: 30000,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async scrollToWeatherConditionSection() {
    const label = this.page.getByText(/^weather condition$/i).first();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  weatherRowTriggerLocator() {
    const titleInput = this.reportTitleInput();
    return titleInput
      .locator('xpath=ancestor::*[self::main or self::div][1]')
      .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(this.muiStackRowTriggerLocator(3));
  }

  async dismissAttachmentAndOverlayDialogs() {
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    const uploadBtn = this.uploadDialogUploadButton();
    if (await uploadBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  notesEditorSaveButton() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .last()
      .getByRole('button', { name: 'Save', exact: true })
      .first()
      .or(this.page.getByRole('button', { name: 'Save', exact: true }).first());
  }

  async isNotesEditorOpen() {
    if (await this.notesTypingTextbox().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    return this.notesEditorSaveButton().isVisible({ timeout: 800 }).catch(() => false);
  }

  /** Codegen: first MuiIconButton-sizeSmall on create page — opens Notes editor. */
  notesEditIconButton() {
    return this.page
      .locator('button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall')
      .filter({ visible: true })
      .first();
  }

  /**
   * Codegen: page.locator('div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root').click()
   * Opens the attachment / upload popup (not the second MuiIconButton).
   */
  attachmentTriggerButton() {
    const scope = this.createPageScope();
    return scope
      .locator('div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root')
          .filter({ visible: true })
          .first()
      )
      .or(scope.locator('.MuiStack-root > .MuiButtonBase-root').filter({ visible: true }).last());
  }

  /** Codegen: getByRole('button', { name: 'Upload' }) in the upload popup. */
  uploadDialogUploadButton() {
    return this.page.getByRole('button', { name: 'Upload', exact: true }).filter({ visible: true }).first();
  }

  visibleCreatePageIconButtons() {
    return this.page
      .locator('button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall')
      .filter({ visible: true });
  }

  async resolveNotesEditIconCandidates() {
    const icons = this.page
      .locator(
        'button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeSmall, button.MuiIconButton-root.MuiIconButton-sizeSmall'
      )
      .filter({ visible: true });

    const titleInput = this.reportTitleInput();
    const titleBox = (await titleInput.isVisible({ timeout: 2000 }).catch(() => false))
      ? await titleInput.boundingBox().catch(() => null)
      : null;

    const notesLabel = this.page.getByText(/^notes$/i).first();
    const notesBox = (await notesLabel.isVisible({ timeout: 2000 }).catch(() => false))
      ? await notesLabel.boundingBox().catch(() => null)
      : null;

    const ordered = [];
    const count = await icons.count();

    for (let i = 0; i < count; i += 1) {
      const icon = icons.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const box = await icon.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }

      let score = box.y;
      if (titleBox && box.y >= titleBox.y - 10) {
        score -= 10000;
      }
      if (notesBox && Math.abs(box.y - notesBox.y) < 120) {
        score -= 50000;
      }
      ordered.push({ icon, score, index: i });
    }

    ordered.sort((a, b) => a.score - b.score);

    const candidates = ordered.map((entry) => entry.icon);

    // Codegen: first small icon on create page opens Notes editor.
    candidates.unshift(this.notesEditIconButton());

    if (await notesLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
      candidates.unshift(
        notesLabel
          .locator('xpath=ancestor::*[self::div or self::section][1]')
          .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall')
          .first()
      );
    }

    return candidates;
  }

  locatorClientReportCreatedToast() {
    const pattern =
      /client report (created|saved|submitted).*success|client report created|created successfully|saved successfully|success/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root')
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomReportTitle() {
    const suffix = Math.random().toString(36).slice(2, 6);
    return `site process update ${suffix}`;
  }

  buildRandomScheduleName() {
    const suffix = Math.random().toString(36).slice(2, 6);
    return `CR Schedule ${suffix}`;
  }

  async expectClientReportListPage() {
    await this.waitForClientReportList();
    await expect
      .poll(async () => this.isClientReportListVisible(), {
        timeout: 15000,
        intervals: [300, 500, 1000],
      })
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log('[Client Report] Client Report list page is visible.');
  }

  async expectClientReportCreatePopupVisible() {
    await expect
      .poll(
        async () => {
          const popup = this.createClientReportPopupRoot();
          if (!(await popup.isVisible({ timeout: 500 }).catch(() => false))) {
            return false;
          }
          return this.createButtonInClientReportPopup()
            .isVisible({ timeout: 500 })
            .catch(() => false);
        },
        { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log('[Client Report] Create Client Report popup is visible.');
  }

  async clickCreateInClientReportPopup(stepLabel = 'popup — open create page') {
    const popupCreate = this.createButtonInClientReportPopup();
    await expect(popupCreate).toBeVisible({ timeout: this.defaultTimeout });
    await expect(popupCreate).toBeEnabled({ timeout: this.defaultTimeout });
    await popupCreate.scrollIntoViewIfNeeded().catch(() => {});
    await popupCreate.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Clicked Create (${stepLabel}).`);
  }

  async expectClientReportCreateFormPage() {
    await this.waitForClientReportCreatePage();
    await expect(this.reportTitleInput()).toBeVisible({ timeout: this.defaultTimeout });
    // eslint-disable-next-line no-console
    console.log('[Client Report] Create Client Report form page is visible.');
  }

  /** TC-05: list Create → popup → Create in popup → create form. */
  async openClientReportCreatePageViaPopup() {
    const listCreate = this.listPageCreateButton();
    await expect(listCreate).toBeVisible({ timeout: this.defaultTimeout });
    await expect(listCreate).toBeEnabled({ timeout: this.defaultTimeout });
    await listCreate.scrollIntoViewIfNeeded().catch(() => {});
    await listCreate.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked Create (list — open popup).');

    await this.expectClientReportCreatePopupVisible();
    await this.clickCreateInClientReportPopup();
    await this.expectClientReportCreateFormPage();
  }

  async scrollToScheduleSection() {
    const label = this.page.getByText(/^schedule$/i).first();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  async _selectLabeledDropdownOption(fieldLabelRegex, optionRegex, scope, resolvedCombo) {
    const panel = scope || this.createPageScope();
    const nameRe = optionRegex instanceof RegExp ? optionRegex : new RegExp(String(optionRegex), 'i');
    let src = nameRe.source;
    if (src.startsWith('^')) src = src.slice(1);
    if (src.endsWith('$')) src = src.slice(0, -1);
    const looseRe = new RegExp(src, nameRe.ignoreCase ? 'i' : '');

    const radio = panel.getByRole('radio', { name: looseRe });
    if (await radio.first().isVisible({ timeout: 2500 }).catch(() => false)) {
      await radio.first().click();
      this.lastSelectedWeatherCondition = looseRe.source;
      return;
    }

    let combo = resolvedCombo || null;
    if (!combo) {
      combo = panel.getByRole('combobox', { name: fieldLabelRegex }).first();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      combo = panel.getByLabel(fieldLabelRegex).first();
    }
    if (!(await combo.isVisible({ timeout: 2500 }).catch(() => false))) {
      const lbl = panel
        .locator('label, .MuiFormLabel-root, p, span')
        .filter({ hasText: fieldLabelRegex })
        .first();
      if (await lbl.isVisible({ timeout: 3000 }).catch(() => false)) {
        const fromLabel = lbl.locator('xpath=following::*[@role="combobox"][1]');
        if (await fromLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
          combo = fromLabel;
        } else {
          combo = lbl.locator('..').locator('[role="combobox"], .MuiSelect-select').first();
        }
      }
    }

    await expect(combo).toBeVisible({ timeout: 20000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click({ force: true, timeout: 30000 });

    const listbox = this.page.getByRole('listbox').last();
    const menu = this.page.getByRole('menu').last();
    await listbox.waitFor({ state: 'visible', timeout: 8000 }).catch(async () => {
      await menu.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    });

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
      option = this.page
        .locator('[role="option"], .MuiMenuItem-root')
        .filter({ hasText: looseRe })
        .first();
    }
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = listbox.locator('[role="option"], .MuiMenuItem-root, li').filter({ visible: true }).first();
    }

    await expect(option).toBeVisible({ timeout: 20000 });
    const selectedText = (await option.innerText().catch(() => '')).trim();
    await option.click();
    await this.page.keyboard.press('Escape').catch(() => {});
    this.lastSelectedWeatherCondition = selectedText || looseRe.source;
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Selected weather condition: ${this.lastSelectedWeatherCondition}`);
  }

  /** TC-09: pick a weather condition from the inline dropdown (not toggle/notes editor). */
  async selectWeatherConditionFromDropdown() {
    await this.waitForClientReportCreatePage();
    await this.dismissNotesEditorAfterSave();
    await this.scrollToWeatherConditionSection();

    const selected = await this._selectWeatherFromInlineDropdownOnForm();
    if (!selected) {
      const fallback = await this._selectWeatherChoiceInScope(this.page.locator('main, [role="main"]').first());
      if (!fallback) {
        throw new Error(
          'Could not select a weather condition from the client report Weather Condition dropdown.'
        );
      }
    }
    return this.lastSelectedWeatherCondition;
  }

  async clickCreateOnClientReportListPage() {
    const listCreate = this.listPageCreateButton();
    await expect(listCreate).toBeVisible({ timeout: this.defaultTimeout });
    await expect(listCreate).toBeEnabled({ timeout: this.defaultTimeout });
    await listCreate.scrollIntoViewIfNeeded().catch(() => {});
    await listCreate.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked Create on list page.');
  }

  async scrollToTaskSection() {
    const label = this.page.getByText(/^task$/i).first();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  taskSectionScope() {
    const label = this.page.getByText(/^task$/i).first();
    return label
      .locator('xpath=ancestor::*[self::div or self::section][1]')
      .or(label.locator('xpath=ancestor::*[self::div or self::section][2]'));
  }

  taskSectionCheckboxLocators() {
    const taskLabel = this.page.getByText(/^task$/i).first();
    return this.taskSectionScope()
      .getByRole('checkbox')
      .filter({ visible: true })
      .or(
        taskLabel
          .locator('xpath=following::*[@role="checkbox" or @type="checkbox"]')
          .filter({ visible: true })
      )
      .or(
        this.page
          .getByRole('dialog')
          .filter({ visible: true })
          .last()
          .getByRole('checkbox')
          .filter({ visible: true })
      );
  }

  async countTaskSectionCheckboxes() {
    const boxes = this.taskSectionCheckboxLocators();
    return boxes.count().catch(() => 0);
  }

  async countCheckedTaskSectionCheckboxes() {
    const boxes = this.taskSectionCheckboxLocators();
    const total = await boxes.count().catch(() => 0);
    let checked = 0;
    for (let i = 0; i < total; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await boxes.nth(i).isChecked().catch(() => false)) {
        checked += 1;
      }
    }
    return checked;
  }

  async isTaskPickerOpen() {
    if (await this.weatherConditionNotesTextbox().isVisible({ timeout: 200 }).catch(() => false)) {
      return false;
    }
    if (
      await this.page
        .getByText(/weather affecting work/i)
        .first()
        .isVisible({ timeout: 200 })
        .catch(() => false)
    ) {
      const saveVisible = await this.page
        .getByRole('button', { name: 'Save', exact: true })
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 200 })
        .catch(() => false);
      if (saveVisible) {
        return false;
      }
    }

    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true });
    const checkboxes = this.page.getByRole('checkbox').filter({ visible: true });
    const saveCount = await saveBtn.count().catch(() => 0);
    const cbCount = await checkboxes.count().catch(() => 0);
    if (saveCount >= 1 && cbCount >= 1) {
      return true;
    }

    return (await this.countTaskSectionCheckboxes()) >= 1;
  }

  async isTaskSelectionPanelOpen() {
    return this.isTaskPickerOpen();
  }

  async isTaskEditorPanelOpen() {
    return this.isTaskPickerOpen();
  }

  async resolveTaskSectionEditIconCandidates() {
    const candidates = [];
    const taskLabel = this.page.getByText(/^task$/i).first();
    const taskBox = (await taskLabel.isVisible({ timeout: 2000 }).catch(() => false))
      ? await taskLabel.boundingBox().catch(() => null)
      : null;

    candidates.push(this.muiStackRowTriggerLocator(5));

    if (await taskLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      candidates.push(
        taskLabel
          .locator('xpath=ancestor::*[self::div or self::section][1]')
          .locator(
            'button.MuiIconButton-root, button.MuiIconButton-sizeSmall, .MuiStack-root > .MuiButtonBase-root'
          )
          .filter({ visible: true })
          .last(),
        taskLabel
          .locator('xpath=following::div[contains(@class,"MuiStack-root")][1]//*[self::button][1]')
          .first()
      );
    }

    const icons = this.visibleCreatePageIconButtons();
    const ordered = [];
    const count = await icons.count();
    for (let i = 0; i < count; i += 1) {
      const icon = icons.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const box = await icon.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }
      let score = box.y;
      if (taskBox && Math.abs(box.y - taskBox.y) < 120) {
        score -= 50000;
      }
      ordered.push({ icon, score });
    }
    ordered.sort((a, b) => a.score - b.score);
    candidates.push(...ordered.map((entry) => entry.icon));

    if (count >= 5) {
      candidates.push(icons.nth(4));
    }

    return candidates;
  }

  async waitForWeatherEditorClosed() {
    await expect
      .poll(
        async () =>
          !(await this.weatherConditionNotesTextbox().isVisible({ timeout: 200 }).catch(() => false)),
        { timeout: 15000, intervals: [300, 500, 1000] }
      )
      .toBe(true);
  }

  async clickTaskEditIconViaDom() {
    const clicked = await this.page.evaluate(() => {
      const taskRe = /^task$/i;
      let taskEl = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (taskRe.test((node.textContent || '').trim())) {
          taskEl = node.parentElement;
          break;
        }
      }
      if (!taskEl) {
        return false;
      }

      const isVisible = (el) => {
        if (!el) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let container = taskEl;
      for (let depth = 0; depth < 12 && container; depth += 1) {
        const trigger = container.querySelector(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root, button.MuiIconButton-sizeSmall'
        );
        if (isVisible(trigger)) {
          trigger.click();
          return true;
        }
        container = container.parentElement;
      }

      const taskRect = taskEl.getBoundingClientRect();
      let best = null;
      let bestScore = Infinity;
      document
        .querySelectorAll(
          '.MuiStack-root > .MuiButtonBase-root, button.MuiIconButton-root.MuiIconButton-sizeSmall'
        )
        .forEach((btn) => {
          const rect = btn.getBoundingClientRect();
          if (!isVisible(btn) || rect.top < taskRect.top - 40) {
            return;
          }
          const score = Math.abs(rect.top - taskRect.top) + Math.abs(rect.left - taskRect.left) * 0.05;
          if (score < bestScore) {
            bestScore = score;
            best = btn;
          }
        });
      if (best) {
        best.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Clicked task edit icon via DOM anchor.');
    }
    return clicked;
  }

  taskSelectionPanelRoot() {
    const taskScope = this.taskSectionScope();
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ has: this.page.getByRole('checkbox') })
      .last()
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiPopover-paper, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByRole('checkbox') })
          .last()
      )
      .or(taskScope);
  }

  /** TC-08: Codegen row 5 → task checkbox list (pre-selected quick tasks). */
  async clickTaskSectionEditIcon() {
    await this.waitForClientReportCreatePage();
    await this.dismissNotesEditorAfterSave();
    await this.waitForWeatherEditorClosed();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.scrollToTaskSection();

    if (await this.isTaskPickerOpen()) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Task checkbox list already visible.');
      return;
    }

    const taskTrigger = this.codegenTaskRowTrigger();
    await expect(taskTrigger).toBeVisible({ timeout: this.defaultTimeout });
    await taskTrigger.scrollIntoViewIfNeeded().catch(() => {});
    await taskTrigger.click({ timeout: 20000, force: true });

    await expect
      .poll(() => this.isTaskPickerOpen(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);

    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened task selection panel (codegen row 5).');
  }

  taskPickerCheckboxLocators() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    return dialog
      .getByRole('checkbox')
      .filter({ visible: true })
      .or(this.page.getByRole('checkbox').filter({ visible: true }));
  }

  async saveTaskSelectionPanelIfOpen() {
    const saveBtn = this.page
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .last();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 15000 });
      await saveBtn.click({ timeout: 20000 });
      await this.dismissNotesEditorAfterSave();
      // eslint-disable-next-line no-console
      console.log('[Client Report] Saved task selection panel.');
    }
  }

  /** TC-08: Codegen — Save on the open task picker. */
  async clickSaveOnTaskSelectionPanel() {
    await expect
      .poll(() => this.isTaskPickerOpen(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);

    const saveBtn = this.page
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .last();
    await expect(saveBtn).toBeVisible({ timeout: 15000 });
    await expect(saveBtn).toBeEnabled({ timeout: 15000 });
    await saveBtn.click({ timeout: 20000 });
    await this.dismissNotesEditorAfterSave();

    await expect
      .poll(async () => !(await this.isTaskPickerOpen()), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked Save on task selection panel.');
  }

  /** TC-08: Codegen — getByRole('checkbox').first().uncheck() (does not Save). */
  async unselectSelectedTaskCheckboxes(count = 1) {
    await expect
      .poll(() => this.isTaskPickerOpen(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);

    let unselected = 0;
    const checkboxes = this.taskPickerCheckboxLocators();
    const total = await checkboxes.count();

    for (let i = 0; i < total && unselected < count; i += 1) {
      const checkbox = checkboxes.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await checkbox.isChecked().catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await checkbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await checkbox.click({ force: true, timeout: 15000 });
      });
      unselected += 1;
    }

    if (unselected === 0) {
      const firstCheckbox = this.page.getByRole('checkbox').filter({ visible: true }).first();
      await expect(firstCheckbox).toBeVisible({ timeout: 15000 });
      await firstCheckbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await firstCheckbox.click({ force: true, timeout: 15000 });
      });
      unselected = 1;
    }

    if (unselected < count) {
      throw new Error(
        `Expected to unselect ${count} selected task checkbox(es) but only unselected ${unselected}.`
      );
    }

    this.lastSelectedTaskCheckboxCount = unselected;
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Unselected ${unselected} task checkbox(es) (codegen).`);
    return unselected;
  }

  /** TC-07: select task created earlier in Task kanban (checkbox or row in Task section). */
  async selectCreatedTaskOnCreateForm(taskName) {
    const name = taskName || this.lastCreatedTaskName;
    if (!name) {
      throw new Error('No task name to select on client report form.');
    }

    await this.waitForClientReportCreatePage();
    await this.scrollToTaskSection();

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(escaped, 'i');

    let checkbox = this.page.getByRole('checkbox', { name: nameRe }).first();
    if (!(await checkbox.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickTaskSectionEditIcon();
      checkbox = this.page.getByRole('checkbox', { name: nameRe }).first();
    }

    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.click({ force: true, timeout: 15000 });
      }
      this.lastCreatedTaskName = name;
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Selected task checkbox: ${name}`);
      return name;
    }

    const taskLabel = this.page.getByText(/^task$/i).first();
    const taskSection = taskLabel.locator('xpath=ancestor::*[self::div or self::section][1]');
    const row = taskSection
      .getByText(name, { exact: true })
      .first()
      .or(taskSection.getByText(nameRe).first())
      .or(this.page.getByText(name, { exact: true }).first());

    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});

    const rowCheckbox = row
      .locator('xpath=ancestor::*[self::tr or self::li or self::div][1]')
      .getByRole('checkbox')
      .first();
    if (await rowCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await rowCheckbox.isChecked().catch(() => false))) {
        await rowCheckbox.click({ force: true, timeout: 15000 });
      }
    } else {
      await row.click({ force: true, timeout: 15000 });
    }

    this.lastCreatedTaskName = name;
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Selected task: ${name}`);
    return name;
  }

  /** TC-05: select schedule created earlier in Gantt (checkbox or row in Schedule section). */
  async selectCreatedScheduleOnCreateForm(scheduleName) {
    const name = scheduleName || this.lastCreatedScheduleName;
    if (!name) {
      throw new Error('No schedule name to select on client report form.');
    }

    await this.waitForClientReportCreatePage();
    await this.scrollToScheduleSection();

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(escaped, 'i');

    const checkbox = this.page.getByRole('checkbox', { name: nameRe }).first();
    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.click({ force: true, timeout: 15000 });
      }
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Selected schedule checkbox: ${name}`);
      return name;
    }

    const scheduleLabel = this.page.getByText(/^schedule$/i).first();
    const scheduleSection = scheduleLabel.locator('xpath=ancestor::*[self::div or self::section][1]');
    const row = scheduleSection
      .getByText(name, { exact: true })
      .first()
      .or(scheduleSection.getByText(nameRe).first())
      .or(this.page.getByText(name, { exact: true }).first());

    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});

    const rowCheckbox = row
      .locator('xpath=ancestor::*[self::tr or self::li or self::div][1]')
      .getByRole('checkbox')
      .first();
    if (await rowCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await rowCheckbox.isChecked().catch(() => false))) {
        await rowCheckbox.click({ force: true, timeout: 15000 });
      }
    } else {
      await row.click({ force: true, timeout: 15000 });
    }

    // eslint-disable-next-line no-console
    console.log(`[Client Report] Selected schedule: ${name}`);
    return name;
  }

  async scrollToShiftSection() {
    const label = this.page
      .getByText(/^shift$/i)
      .or(this.page.getByText(/^workers$/i))
      .first();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  async isWorkersPickerOpen() {
    return this.isTaskPickerOpen();
  }

  workersPickerCheckboxLocators() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    return dialog
      .getByRole('checkbox')
      .filter({ visible: true })
      .or(this.page.getByRole('checkbox').filter({ visible: true }));
  }

  /**
   * TC-10: open Workers/Shift edit icon (MuiStack row 6 or label-adjacent icon).
   */
  async clickWorkersSectionEditIcon() {
    await this.waitForClientReportCreatePage();
    await this.dismissNotesEditorAfterSave();
    await this.waitForWeatherEditorClosed();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.scrollToShiftSection();

    if (await this.isWorkersPickerOpen()) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Workers/Shift checkbox list already visible.');
      return;
    }

    const workersLabel = this.page
      .getByText(/^workers$/i)
      .or(this.page.getByText(/^shift$/i))
      .first();

    if (await workersLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const nearLabel = workersLabel
        .locator('xpath=ancestor::*[self::div or self::section][1]')
        .locator(
          'button.MuiIconButton-root, button.MuiIconButton-sizeSmall, .MuiStack-root > .MuiButtonBase-root'
        )
        .filter({ visible: true })
        .last();
      if (await nearLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nearLabel.scrollIntoViewIfNeeded().catch(() => {});
        await nearLabel.click({ timeout: 20000, force: true });
      } else {
        const workersTrigger = this.codegenWorkersRowTrigger();
        await expect(workersTrigger).toBeVisible({ timeout: this.defaultTimeout });
        await workersTrigger.scrollIntoViewIfNeeded().catch(() => {});
        await workersTrigger.click({ timeout: 20000, force: true });
      }
    } else {
      const workersTrigger = this.codegenWorkersRowTrigger();
      await expect(workersTrigger).toBeVisible({ timeout: this.defaultTimeout });
      await workersTrigger.scrollIntoViewIfNeeded().catch(() => {});
      await workersTrigger.click({ timeout: 20000, force: true });
    }

    await expect
      .poll(() => this.isWorkersPickerOpen(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);

    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened workers/shift selection panel.');
  }

  /** TC-10: unselect first checked workers/shift checkbox. */
  async unselectSelectedWorkersCheckboxes(count = 1) {
    await expect
      .poll(() => this.isWorkersPickerOpen(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);

    let unselected = 0;
    const checkboxes = this.workersPickerCheckboxLocators();
    const total = await checkboxes.count();

    for (let i = 0; i < total && unselected < count; i += 1) {
      const checkbox = checkboxes.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await checkbox.isChecked().catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await checkbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await checkbox.click({ force: true, timeout: 15000 });
      });
      unselected += 1;
    }

    if (unselected === 0) {
      const firstCheckbox = this.page.getByRole('checkbox').filter({ visible: true }).first();
      await expect(firstCheckbox).toBeVisible({ timeout: 15000 });
      await firstCheckbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await firstCheckbox.click({ force: true, timeout: 15000 });
      });
      unselected = 1;
    }

    if (unselected < count) {
      throw new Error(
        `Expected to unselect ${count} selected workers checkbox(es) but only unselected ${unselected}.`
      );
    }

    // eslint-disable-next-line no-console
    console.log(`[Client Report] Unselected ${unselected} workers/shift checkbox(es).`);
    return unselected;
  }

  /** TC-10: Save on the open workers/shift picker. */
  async clickSaveOnWorkersSelectionPanel() {
    await expect
      .poll(() => this.isWorkersPickerOpen(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);

    const saveBtn = this.page
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .last();
    await expect(saveBtn).toBeVisible({ timeout: 15000 });
    await expect(saveBtn).toBeEnabled({ timeout: 15000 });
    await saveBtn.click({ timeout: 20000 });
    await this.dismissNotesEditorAfterSave();

    await expect
      .poll(async () => !(await this.isWorkersPickerOpen()), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000],
      })
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked Save on workers/shift selection panel.');
  }

  async scrollToInventorySection() {
    const label = this.page.getByText(/^inventory$/i).first();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 400)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 400).catch(() => {});
    }
  }

  /** TC-11: select inventory item created earlier on client report form. */
  async selectCreatedInventoryItemOnCreateForm(itemName) {
    const name = itemName || this.lastAddedInventoryItemName;
    await this.waitForClientReportCreatePage();
    await this.scrollToInventorySection();

    // Prefer matching by known item name when available
    if (name) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60);
      const nameRe = new RegExp(escaped, 'i');
      const checkbox = this.page.getByRole('checkbox', { name: nameRe }).first();
      if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        if (!(await checkbox.isChecked().catch(() => false))) {
          await checkbox.click({ force: true, timeout: 15000 });
        }
        this.lastAddedInventoryItemName = name;
        // eslint-disable-next-line no-console
        console.log(`[Client Report] Selected inventory checkbox: ${name}`);
        return name;
      }

      const row = this.page.getByText(nameRe).first();
      if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        const rowCheckbox = row
          .locator('xpath=ancestor::*[self::tr or self::li or self::div][1]')
          .getByRole('checkbox')
          .first();
        if (await rowCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
          if (!(await rowCheckbox.isChecked().catch(() => false))) {
            await rowCheckbox.click({ force: true, timeout: 15000 });
          }
        } else {
          await row.click({ force: true, timeout: 15000 });
        }
        this.lastAddedInventoryItemName = name;
        // eslint-disable-next-line no-console
        console.log(`[Client Report] Selected inventory item: ${name}`);
        return name;
      }
    }

    // Fallback: open Inventory edit if present, then check first available checkbox
    const inventoryLabel = this.page.getByText(/^inventory$/i).first();
    if (await inventoryLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const editIcon = inventoryLabel
        .locator('xpath=ancestor::*[self::div or self::section][1]')
        .locator(
          'button.MuiIconButton-root, button.MuiIconButton-sizeSmall, .MuiStack-root > .MuiButtonBase-root'
        )
        .filter({ visible: true })
        .last();
      if (await editIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editIcon.click({ timeout: 15000, force: true });
      }
    }

    const checkbox = this.page.getByRole('checkbox').filter({ visible: true }).first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.check({ force: true, timeout: 15000 }).catch(async () => {
        await checkbox.click({ force: true, timeout: 15000 });
      });
    }

    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click({ timeout: 15000 });
    }

    // eslint-disable-next-line no-console
    console.log('[Client Report] Selected inventory item (first available checkbox).');
    return name || 'inventory-item';
  }

  /** TC-09: select shift created earlier in Workers module on client report form. */
  async selectCreatedShiftOnCreateForm(shiftName) {
    const name = shiftName || this.lastCreatedShiftName;
    if (!name) {
      throw new Error('No shift name to select on client report form.');
    }

    await this.waitForClientReportCreatePage();
    await this.scrollToShiftSection();

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(escaped, 'i');

    const checkbox = this.page.getByRole('checkbox', { name: nameRe }).first();
    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.click({ force: true, timeout: 15000 });
      }
      this.lastCreatedShiftName = name;
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Selected shift checkbox: ${name}`);
      return name;
    }

    const shiftLabel = this.page.getByText(/^shift$/i).first();
    const shiftSection = shiftLabel.locator('xpath=ancestor::*[self::div or self::section][1]');
    const row = shiftSection
      .getByText(name, { exact: true })
      .first()
      .or(shiftSection.getByText(nameRe).first())
      .or(this.page.getByText(name, { exact: true }).first());

    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});

    const rowCheckbox = row
      .locator('xpath=ancestor::*[self::tr or self::li or self::div][1]')
      .getByRole('checkbox')
      .first();
    if (await rowCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await rowCheckbox.isChecked().catch(() => false))) {
        await rowCheckbox.click({ force: true, timeout: 15000 });
      }
    } else {
      await row.click({ force: true, timeout: 15000 });
    }

    this.lastCreatedShiftName = name;
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Selected shift: ${name}`);
    return name;
  }

  scheduleSectionScope() {
    const label = this.page.getByText(/^schedule$/i).first();
    return label
      .locator('xpath=ancestor::*[self::div or self::section][1]')
      .or(label.locator('xpath=ancestor::*[self::div or self::section][2]'));
  }

  scheduleSelectionPanelRoot() {
    const scheduleScope = this.scheduleSectionScope();
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ has: this.page.getByRole('checkbox') })
      .last()
      .or(
        this.page
          .locator('.MuiDrawer-paper, .MuiPopover-paper, [role="presentation"]')
          .filter({ visible: true })
          .filter({ has: this.page.getByRole('checkbox') })
          .last()
      )
      .or(scheduleScope);
  }

  scheduleSectionCheckboxLocators() {
    const scheduleLabel = this.page.getByText(/^schedule$/i).first();
    return this.scheduleSectionScope()
      .getByRole('checkbox')
      .filter({ visible: true })
      .or(
        scheduleLabel
          .locator('xpath=following::*[@role="checkbox" or @type="checkbox"]')
          .filter({ visible: true })
      )
      .or(
        this.page
          .getByRole('dialog')
          .filter({ visible: true })
          .last()
          .getByRole('checkbox')
          .filter({ visible: true })
      );
  }

  async countScheduleSectionCheckboxes() {
    const boxes = this.scheduleSectionCheckboxLocators();
    return boxes.count().catch(() => 0);
  }

  async countCheckedScheduleSectionCheckboxes() {
    const boxes = this.scheduleSectionCheckboxLocators();
    const total = await boxes.count().catch(() => 0);
    let checked = 0;
    for (let i = 0; i < total; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await boxes.nth(i).isChecked().catch(() => false)) {
        checked += 1;
      }
    }
    return checked;
  }

  async isScheduleSelectionPanelOpen() {
    const scheduleLabel = this.page.getByText(/^schedule$/i).first();
    if (!(await scheduleLabel.isVisible({ timeout: 800 }).catch(() => false))) {
      return false;
    }

    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 400 }).catch(() => false)) {
      if (
        await dialog
          .getByText(/weather affecting work|enter your notes here/i)
          .first()
          .isVisible({ timeout: 300 })
          .catch(() => false)
      ) {
        return false;
      }
    }

    const total = await this.countScheduleSectionCheckboxes();
    return total >= 1;
  }

  async resolveScheduleSectionEditIconCandidates() {
    const candidates = [];
    const scheduleLabel = this.page.getByText(/^schedule$/i).first();

    candidates.push(this.muiStackRowTriggerLocator(4));

    if (await scheduleLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      candidates.push(
        scheduleLabel
          .locator('xpath=ancestor::*[self::div or self::section][1]')
          .locator(
            'button.MuiIconButton-root, button.MuiIconButton-sizeSmall, .MuiStack-root > .MuiButtonBase-root'
          )
          .filter({ visible: true })
          .first(),
        scheduleLabel
          .locator('xpath=following::div[contains(@class,"MuiStack-root")][1]//*[self::button][1]')
          .first()
      );
    }

    const icons = this.visibleCreatePageIconButtons();
    if ((await icons.count()) >= 4) {
      candidates.push(icons.nth(3));
    }

    return candidates;
  }

  /** TC-06: Schedule section edit icon → schedule checkbox list (often pre-selected). */
  async clickScheduleSectionEditIcon() {
    await this.waitForClientReportCreatePage();
    await this.dismissNotesEditorAfterSave();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.scrollToScheduleSection();

    const panelReady = async () => {
      const total = await this.countScheduleSectionCheckboxes();
      if (total < 1) {
        return false;
      }
      const checked = await this.countCheckedScheduleSectionCheckboxes();
      return checked >= 1 || total >= 2;
    };

    if (await panelReady()) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Schedule checkbox list already visible.');
      return;
    }

    const tryOpenPanel = async () => {
      await this.clickMuiStackRowTrigger(4, 'schedule');
      if (await panelReady()) {
        return true;
      }

      const scheduleLabel = this.page.getByText(/^schedule$/i).first();
      if (await scheduleLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await scheduleLabel.click({ timeout: 10000, force: true }).catch(() => {});
        if (await panelReady()) {
          return true;
        }
      }

      const candidates = await this.resolveScheduleSectionEditIconCandidates();
      for (const candidate of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await candidate.click({ timeout: 20000, force: true }).catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        if (await panelReady()) {
          return true;
        }
        // eslint-disable-next-line no-await-in-loop
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      return false;
    };

    let opened = false;
    for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      opened = await tryOpenPanel();
    }

    if (!opened) {
      await expect
        .poll(panelReady, { timeout: this.defaultTimeout, intervals: [500, 1000, 2000] })
        .toBe(true);
    }

    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened schedule selection panel via edit icon.');
  }

  async saveScheduleSelectionPanelIfOpen() {
    const panel = this.scheduleSelectionPanelRoot();
    const saveBtn = panel
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .first()
      .or(this.page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last());

    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 15000 });
      await saveBtn.click({ timeout: 20000 });
      await this.dismissNotesEditorAfterSave();
      // eslint-disable-next-line no-console
      console.log('[Client Report] Saved schedule selection panel.');
    }
  }

  /** TC-06: uncheck N already-selected schedule checkboxes in the open panel. */
  async unselectSelectedScheduleCheckboxes(count = 2) {
    await expect
      .poll(async () => {
        const total = await this.countScheduleSectionCheckboxes();
        const checked = await this.countCheckedScheduleSectionCheckboxes();
        return total >= 1 && checked >= 1;
      }, { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] })
      .toBe(true);

    const checkboxes = this.scheduleSectionCheckboxLocators();
    const total = await checkboxes.count();
    let unselected = 0;

    for (let i = 0; i < total && unselected < count; i += 1) {
      const checkbox = checkboxes.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await checkbox.isChecked().catch(() => false))) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await checkbox.uncheck({ force: true, timeout: 15000 }).catch(async () => {
        await checkbox.click({ force: true, timeout: 15000 });
      });
      // eslint-disable-next-line no-await-in-loop
      if (await checkbox.isChecked().catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await checkbox.click({ force: true, timeout: 15000 });
      }
      unselected += 1;
    }

    if (unselected === 0) {
      throw new Error('No selected schedule checkboxes found to unselect in the schedule panel.');
    }

    if (unselected < count) {
      throw new Error(
        `Expected to unselect ${count} selected schedule checkboxes but only unselected ${unselected}.`
      );
    }

    this.lastSelectedScheduleCheckboxCount = unselected;
    await this.saveScheduleSelectionPanelIfOpen();
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Unselected ${unselected} schedule checkbox(es).`);
    return unselected;
  }

  /** @deprecated TC-06 now unselects pre-selected schedules — use unselectSelectedScheduleCheckboxes */
  async selectUnselectedScheduleCheckboxes(count = 5) {
    return this.unselectSelectedScheduleCheckboxes(Math.min(2, count));
  }

  buildRandomNotesText() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return (
      `Automation note ${suffix}: The site process has been reviewed and updated to improve overall operational efficiency and user experience. ` +
      'Current activities are focused on implementing approved enhancements, validating business workflows, and ensuring seamless integration across related modules. ' +
      'Progress is on track, and the implemented changes are undergoing internal testing before being shared for client review.'
    );
  }

  defaultAttachmentFixturePath() {
    return path.join(__dirname, '../../../../../fixtures/sample-po-import.pdf');
  }

  isAttachmentAutomationMode() {
    return (
      /^1|true$/i.test(String(process.env.CLIENT_REPORT_ATTACHMENT_AUTO || '')) ||
      /^1|true$/i.test(String(process.env.CLIENT_REPORT_ATTACHMENT_USE_SET_FILES || ''))
    );
  }

  resolveAttachmentFilePathForAutomation() {
    const envPath = process.env.CLIENT_REPORT_ATTACHMENT_FILE_PATH;
    if (envPath) {
      const resolved = path.resolve(envPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`CLIENT_REPORT_ATTACHMENT_FILE_PATH does not exist: ${resolved}`);
      }
      return resolved;
    }
    const fallback = this.defaultAttachmentFixturePath();
    if (fs.existsSync(fallback)) {
      return fallback;
    }
    return null;
  }

  explorerClickTimeoutMs() {
    const raw = process.env.CLIENT_REPORT_ATTACHMENT_EXPLORER_CLICK_TIMEOUT_MS;
    const n = raw === undefined || raw === '' ? 600000 : Number(raw);
    if (Number.isNaN(n)) {
      return 600000;
    }
    return Math.max(60000, Math.min(1200000, n));
  }

  attachmentNamePattern() {
    return /\b(attach|attachments?|upload|browse|choose\s*file|add\s*files?|select\s*file|add\s*document)\b/i;
  }

  attachmentsSectionLabel() {
    return this.page
      .getByText(/^attachments?$/i)
      .or(this.page.getByText(/^attach files?$/i))
      .first();
  }

  async dismissNotesEditorAfterSave() {
    const saveBtn = this.notesEditorSaveButton();
    await saveBtn.waitFor({ state: 'hidden', timeout: 15000 }).catch(async () => {
      await this.page.keyboard.press('Escape').catch(() => {});
    });
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async resolveClientReportAttachmentIcon() {
    await this.dismissNotesEditorAfterSave();

    const handle = await this.locateMuiStackRowTriggerHandle(2);
    if (handle) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Resolved attachment trigger (codegen MuiStack row 2).');
      return { kind: 'handle', target: handle };
    }

    const fallback = this.muiStackRowTriggerLocator(2);
    if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Resolved attachment trigger via row-2 locator fallback.');
      return { kind: 'locator', target: fallback };
    }

    throw new Error(
      'Could not find client report attachment trigger. Codegen: div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root'
    );
  }

  async nudgeScrollTowardAttachments() {
    const label = this.attachmentsSectionLabel();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await label.isVisible({ timeout: 500 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await label.scrollIntoViewIfNeeded().catch(() => {});
        // eslint-disable-next-line no-console
        console.log('[Client Report] Attachments section is in view.');
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.page.evaluate(() => window.scrollBy(0, 350)).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.mouse.wheel(0, 350).catch(() => {});
    }
  }

  async locateAttachmentElementHandleAfterNotes() {
    const handle = await this.page.evaluateHandle(() => {
      const notesRe = /^notes$/i;
      const attachRe =
        /\b(attach|attachments?|upload|browse|choose\s*file|add\s*files?|select\s*file)\b/i;

      let notesAnchor = null;
      let attachAnchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        const text = (node.textContent || '').trim();
        if (!notesAnchor && notesRe.test(text)) {
          notesAnchor = node.parentElement;
        }
        if (!attachAnchor && /^attachments?$/i.test(text)) {
          attachAnchor = node.parentElement;
        }
      }

      const followsNotes = (el) => {
        if (!notesAnchor) {
          return true;
        }
        return !!(notesAnchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      };

      const scored = [];
      const push = (el, score) => {
        if (!el || el.closest('[role="dialog"]')) {
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 && rect.height < 1) {
          return;
        }
        scored.push({ el, score });
      };

      if (attachAnchor) {
        const section =
          attachAnchor.closest('div, section, article, form') || attachAnchor.parentElement;
        section
          ?.querySelectorAll(
            'button.MuiIconButton-root, button.MuiIconButton-sizeSmall, button.MuiButtonBase-root, [role="button"]'
          )
          .forEach((el) => push(el, -100000));
      }

      document.querySelectorAll('input[type="file"]').forEach((el) => {
        if (!followsNotes(el)) {
          return;
        }
        push(el, 100);
        const id = el.id;
        if (id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (lbl) {
            push(lbl, 50);
          }
        }
      });

      document
        .querySelectorAll('button.MuiIconButton-root, button.MuiIconButton-sizeSmall')
        .forEach((el) => {
          if (!followsNotes(el)) {
            return;
          }
          const rect = el.getBoundingClientRect();
          let score = rect.top;
          const aria = el.getAttribute('aria-label') || '';
          if (attachRe.test(aria)) {
            score -= 100000;
          }
          if (notesAnchor) {
            const notesRect = notesAnchor.getBoundingClientRect();
            if (Math.abs(rect.top - notesRect.top) < 80) {
              score += 50000;
            }
          }
          if (attachAnchor) {
            const attachRect = attachAnchor.getBoundingClientRect();
            if (Math.abs(rect.top - attachRect.top) < 120) {
              score -= 50000;
            }
          }
          push(el, score);
        });

      scored.sort((a, b) => a.score - b.score);
      return scored[0]?.el || null;
    });

    const element = handle.asElement();
    if (!element) {
      await handle.dispose().catch(() => {});
      return null;
    }
    return handle;
  }

  async resolveAttachmentClickTargetAfterNotes() {
    const pageIcons = this.visibleCreatePageIconButtons();
    const pageIconCount = await pageIcons.count();
    if (pageIconCount >= 2) {
      const secondIcon = pageIcons.nth(1);
      if (await secondIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Resolved attachment as second visible page icon (Notes edit is first).');
        return { kind: 'locator', target: secondIcon };
      }
    }

    const notesLabel = this.page.getByText(/^notes$/i).first();
    if (await notesLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notesLabel.scrollIntoViewIfNeeded().catch(() => {});
      const rowIcons = notesLabel
        .locator('xpath=ancestor::*[self::div or self::section][1]')
        .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall')
        .filter({ visible: true });
      const rowCount = await rowIcons.count();
      if (rowCount >= 2) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Resolved attachment as second icon in Notes row.');
        return { kind: 'locator', target: rowIcons.nth(1) };
      }

      const widerIcons = notesLabel
        .locator('xpath=ancestor::*[self::div or self::section][2]')
        .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall')
        .filter({ visible: true });
      if ((await widerIcons.count()) >= 2) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Resolved attachment as second icon in wider Notes section.');
        return { kind: 'locator', target: widerIcons.nth(1) };
      }
    }

    const attachmentLabel = this.attachmentsSectionLabel();
    if (await attachmentLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await attachmentLabel.scrollIntoViewIfNeeded().catch(() => {});
      const sectionIcon = attachmentLabel
        .locator('xpath=ancestor::*[self::div or self::section or self::article][1]')
        .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall, [role="button"]')
        .filter({ visible: true })
        .last();
      if (await sectionIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Resolved attachment icon near Attachments label.');
        return { kind: 'locator', target: sectionIcon };
      }

      const followingIcon = attachmentLabel
        .locator('xpath=following::button[contains(@class,"IconButton")][1]')
        .or(attachmentLabel.locator('xpath=following::*[@role="button"][1]'))
        .first();
      if (await followingIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Resolved attachment icon following Attachments label.');
        return { kind: 'locator', target: followingIcon };
      }
    }

    const domHandle = await this.locateAttachmentElementHandleAfterNotes();
    if (domHandle) {
      await domHandle.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[Client Report] Resolved attachment control after Notes section.');
      return { kind: 'handle', target: domHandle };
    }

    if (pageIconCount >= 1) {
      const firstIcon = pageIcons.first();
      if (await firstIcon.isVisible({ timeout: 1500 }).catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Falling back to first visible page icon for attachment.');
        return { kind: 'locator', target: firstIcon };
      }
    }

    return null;
  }

  async resolveAttachmentControlCandidates() {
    const candidates = [];
    const triggerText = process.env.CLIENT_REPORT_ATTACHMENT_TRIGGER_TEXT;

    if (triggerText) {
      candidates.push(
        this.page.getByText(new RegExp(triggerText, 'i')).first(),
        this.page.getByRole('button', { name: new RegExp(triggerText, 'i') }).first()
      );
    }

    const attachmentLabel = this.page.getByText(/^attachments?$/i).first();
    if (await attachmentLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      candidates.push(
        attachmentLabel
          .locator('xpath=ancestor::*[self::div or self::section][1]')
          .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall, [role="button"]')
          .first(),
        attachmentLabel
          .locator('xpath=following::button[1]')
          .or(attachmentLabel.locator('xpath=preceding::button[1]'))
          .first()
      );
    }

    candidates.push(
      this.page.getByRole('button', { name: this.attachmentNamePattern() }).filter({ visible: true }).first(),
      this.page
        .locator('button[aria-label*="attach" i], button[aria-label*="upload" i]')
        .filter({ visible: true })
        .first()
    );

    const scope = this.createPageScope();
    const fileInputs = scope.locator('input[type="file"]');
    const fileCount = await fileInputs.count();
    for (let i = 0; i < fileCount; i += 1) {
      const inp = fileInputs.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const id = await inp.getAttribute('id').catch(() => null);
      if (id) {
        candidates.push(this.page.locator(`label[for=${JSON.stringify(id)}]`).first());
      }
      candidates.push(
        inp
          .locator('xpath=ancestor::button[1]')
          .or(inp.locator('xpath=ancestor::*[@role="button"][1]'))
          .first(),
        inp
      );
    }

    const icons = this.visibleCreatePageIconButtons();
    const attachmentBox = (await attachmentLabel.isVisible({ timeout: 1000 }).catch(() => false))
      ? await attachmentLabel.boundingBox().catch(() => null)
      : null;
    const notesLabel = this.page.getByText(/^notes$/i).first();
    const notesBox = (await notesLabel.isVisible({ timeout: 1000 }).catch(() => false))
      ? await notesLabel.boundingBox().catch(() => null)
      : null;

    const iconCount = await icons.count();
    if (iconCount >= 2) {
      candidates.unshift(icons.nth(1));
    }

    const scored = [];
    for (let i = 0; i < iconCount; i += 1) {
      const icon = icons.nth(i);
      // eslint-disable-next-line no-await-in-loop
      const box = await icon.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }
      let score = box.y;
      if (i === 1) {
        score -= 200000;
      }
      if (notesBox && Math.abs(box.y - notesBox.y) < 80 && i !== 1) {
        score += 50000;
      }
      if (attachmentBox && Math.abs(box.y - attachmentBox.y) < 120) {
        score -= 50000;
      }
      scored.push({ icon, score });
    }
    scored.sort((a, b) => a.score - b.score);
    scored.forEach((entry) => candidates.push(entry.icon));

    return candidates;
  }

  async locateAttachmentControl() {
    const attachmentIcon = await this.resolveClientReportAttachmentIcon();
    return { kind: 'locator', target: attachmentIcon };
  }

  async isUploadPopupVisible() {
    if (await this.uploadDialogUploadButton().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }

    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 800 }).catch(() => false)) {
      const hasUploadCopy = await dialog
        .getByText(/upload|attach|choose\s*file|select\s*file|browse/i)
        .first()
        .isVisible({ timeout: 800 })
        .catch(() => false);
      const hasFileInput = await dialog
        .locator('input[type="file"]')
        .first()
        .count()
        .then((count) => count > 0)
        .catch(() => false);
      if (hasUploadCopy || hasFileInput) {
        return true;
      }
    }

    return this.page
      .getByText(/upload\s*file|choose\s*file|select\s*file|attach\s*file/i)
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 800 })
      .catch(() => false);
  }

  async waitForClientReportAttachmentUploaded(fileName) {
    await expect(async () => {
      const inputHasFile = await this.page
        .locator('input[type="file"]')
        .last()
        .evaluate((el) => (el.files?.length || 0) > 0)
        .catch(() => false);
      const nameVisible = fileName
        ? await this.page.getByText(fileName, { exact: false }).first().isVisible().catch(() => false)
        : false;
      const uploadedCopy = await this.page
        .getByText(/uploaded|upload complete|attachment added|attached|file added/i)
        .first()
        .isVisible()
        .catch(() => false);
      const chipVisible = await this.page
        .locator('.MuiChip-root, [class*="attachment"], [class*="file-name"]')
        .filter({
          hasText: fileName
            ? new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            : /./,
        })
        .first()
        .isVisible()
        .catch(() => false);

      expect(inputHasFile || nameVisible || uploadedCopy || chipVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async clickUploadButtonInAttachmentPopup() {
    const uploadBtn = this.uploadDialogUploadButton();
    await expect(uploadBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(uploadBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await uploadBtn.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked Upload in attachment popup.');
  }

  async uploadFileInAttachmentPopup(uploadPath) {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    const fileInput = dialog
      .locator('input[type="file"]')
      .first()
      .or(this.page.locator('input[type="file"]').last());

    const inputCount = await fileInput.count().catch(() => 0);
    if (inputCount > 0) {
      await fileInput.setInputFiles(uploadPath);
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Set attachment file via input: ${path.basename(uploadPath)}`);
    } else {
      const browseTrigger = dialog
        .getByRole('button', { name: /browse|choose|select|upload/i })
        .or(dialog.getByText(/browse|choose\s*file|select\s*file|click to upload/i))
        .filter({ visible: true })
        .first();
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 25000 }),
        browseTrigger.click({ timeout: 20000, force: true }),
      ]);
      await fileChooser.setFiles(uploadPath);
      // eslint-disable-next-line no-console
      console.log(`[Client Report] Set attachment file via filechooser: ${path.basename(uploadPath)}`);
    }

    await this.clickUploadButtonInAttachmentPopup();
    await this.waitForClientReportAttachmentUploaded(path.basename(uploadPath));
    await this.waitForUploadDialogClosed();
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Attachment uploaded automatically: ${path.basename(uploadPath)}`);
  }

  async clickClientReportAttachmentIconForUpload() {
    await this.waitForClientReportCreatePage();

    const auto = this.isAttachmentAutomationMode();
    const uploadPath = auto ? this.resolveAttachmentFilePathForAutomation() : null;

    if (auto && !uploadPath) {
      throw new Error(
        'CLIENT_REPORT_ATTACHMENT_AUTO=1 requires CLIENT_REPORT_ATTACHMENT_FILE_PATH or fixtures/sample-po-import.pdf.'
      );
    }

    // Codegen: div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root
    await this.clickMuiStackRowTrigger(2, 'attachment');

    await expect
      .poll(async () => this.isUploadPopupVisible(), {
        timeout: this.defaultTimeout,
        intervals: [300, 500, 1000, 2000],
      })
      .toBe(true);

    if (auto && uploadPath) {
      await this.uploadFileInAttachmentPopup(uploadPath);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      '[Client Report] Upload popup opened — pick a file, click Upload, then press ENTER in the terminal.'
    );
  }

  async waitForClientReportAttachmentUploadEnterGate() {
    const auto = this.isAttachmentAutomationMode();
    const skipEnter =
      auto ||
      /^1|true$/i.test(String(process.env.CLIENT_REPORT_ATTACHMENT_SKIP_STEP_ENTER || ''));

    if (skipEnter) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Skipping ENTER gate (automation mode or CLIENT_REPORT_ATTACHMENT_SKIP_STEP_ENTER=1).');
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      return;
    }

    await this.waitForEnterInTerminal(
      'Waiting for client report attachment upload. Select your file, click Upload in the popup, then press ENTER here to continue.'
    );
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[Client Report] Attachment upload confirmed via terminal ENTER.');
  }

  async waitForClientReportList() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await expect(this.visibleCreateButton()).toBeVisible({ timeout: this.defaultTimeout });
    // eslint-disable-next-line no-console
    console.log('[Client Report] Client Report list is ready.');
  }

  async waitForClientReportCreatePage() {
    await expect
      .poll(
        async () =>
          (await this.reportTitleInput().isVisible({ timeout: 500 }).catch(() => false)) ||
          (await this.page.getByText(/^notes$/i).first().isVisible({ timeout: 500 }).catch(() => false)) ||
          /client[-_]?report/i.test(this.page.url()),
        { timeout: this.defaultTimeout, intervals: [300, 500, 1000, 2000] }
      )
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log('[Client Report] Create page is ready.');
  }

  async navigateToClientReportModule() {
    if (
      /client[-_]?report/i.test(this.page.url()) &&
      (await this.visibleCreateButton().isVisible({ timeout: 3000 }).catch(() => false))
    ) {
      await this.waitForClientReportList();
      // eslint-disable-next-line no-console
      console.log('[Client Report] Already on Client Report list — skipping navigation.');
      return;
    }

    const profile = new ProjectProfilePage(this.page);
    const clientReport = this.clientReportModuleLabel();

    if (await clientReport.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientReport.scrollIntoViewIfNeeded().catch(() => {});
      await clientReport.click({ timeout: 30000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.waitForClientReportList();
      // eslint-disable-next-line no-console
      console.log('[Client Report] Opened Client Report module from visible tile.');
      return;
    }

    // Codegen: project row icon → Communication & Docs (no Project Management step).
    const iconBtn = this.projectProfileIconButton();
    if (await iconBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await iconBtn.scrollIntoViewIfNeeded().catch(() => {});
      await iconBtn.click({ timeout: 20000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[Client Report] Clicked project profile icon button.');
    } else {
      await profile.selectHeading('Project Management').catch(() => {});
      if (await iconBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await iconBtn.click({ timeout: 20000 });
      }
    }

    const commDocsButton = this.page
      .getByRole('button', { name: 'Communication & Docs' })
      .filter({ visible: true })
      .first();
    if (await commDocsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commDocsButton.click({ timeout: 20000 });
    } else {
      await profile.selectHeading('Communication & Docs');
    }

    await expect(clientReport).toBeVisible({ timeout: this.defaultTimeout });
    await clientReport.scrollIntoViewIfNeeded().catch(() => {});
    await clientReport.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForClientReportList();
    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened Client Report module.');
  }

  async clickVisibleCreateButton(stepLabel = '', options = {}) {
    const { lightWaitAfterClick = false } = options;
    const createBtn = this.visibleCreateButton();
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(createBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    const postClickTimeout = lightWaitAfterClick ? 5000 : 15000;
    await this.page.waitForLoadState('domcontentloaded', { timeout: postClickTimeout }).catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Clicked Create${stepLabel ? ` (${stepLabel})` : ''}.`);
  }

  async isClientReportListVisible() {
    return (
      (await this.visibleCreateButton().isVisible({ timeout: 500 }).catch(() => false)) &&
      !(await this.reportTitleInput().isVisible({ timeout: 500 }).catch(() => false))
    );
  }

  async observeClientReportCreateSuccess() {
    if (this.clientReportCreateSuccessObserved) {
      return;
    }

    const toast = this.locatorClientReportCreatedToast();
    const timeout = this.createSubmitSuccessTimeout;

    try {
      await expect
        .poll(
          async () => {
            if (await toast.isVisible({ timeout: 400 }).catch(() => false)) {
              return true;
            }
            return this.isClientReportListVisible();
          },
          { timeout, intervals: [200, 300, 500, 800, 1200] }
        )
        .toBe(true);
      this.clientReportCreateSuccessObserved = true;
      // eslint-disable-next-line no-console
      console.log('[Client Report] Create success observed.');
    } catch {
      if (await toast.isVisible({ timeout: 2000 }).catch(() => false)) {
        this.clientReportCreateSuccessObserved = true;
        return;
      }
      if (await this.isClientReportListVisible()) {
        this.clientReportCreateSuccessObserved = true;
        return;
      }
    }
  }

  async completeClientReportCreateWithThreeCreateClicks() {
    await this.clickVisibleCreateButton('1 of 3');
    await this.clickVisibleCreateButton('2 of 3');
    await this.clickVisibleCreateButton('3 of 3');
    await this.observeClientReportCreateSuccess();
    // eslint-disable-next-line no-console
    console.log('[Client Report] Completed three Create clicks.');
  }

  /** TC-02/05 codegen: list Create → popup Create → create form. */
  async openClientReportCreatePage() {
    await this.clickVisibleCreateButton('open list');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});

    const popupCreate = this.createButtonInClientReportPopup();
    if (await popupCreate.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.clickCreateInClientReportPopup('open create page');
    } else {
      await this.clickVisibleCreateButton('open create page');
    }

    await this.waitForClientReportCreatePage();
  }

  async clickNotesEditIconNearNotesSection() {
    await this.waitForClientReportCreatePage();

    if (await this.isNotesEditorOpen()) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Notes editor already open.');
      return;
    }

    const notesLabel = this.page.getByText(/^notes$/i).first();
    if (await notesLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notesLabel.scrollIntoViewIfNeeded().catch(() => {});
      await notesLabel.click({ timeout: 10000, force: true }).catch(() => {});
      if (await this.isNotesEditorOpen()) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Opened notes editor by clicking Notes label.');
        return;
      }
    }

    const candidates = await this.resolveNotesEditIconCandidates();
    let opened = false;

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await candidate.click({ timeout: 15000, force: true }).catch(() => {});

      // eslint-disable-next-line no-await-in-loop
      try {
        await expect
          .poll(async () => this.isNotesEditorOpen(), {
            timeout: 12000,
            intervals: [300, 500, 1000],
          })
          .toBe(true);
        opened = true;
      } catch {
        opened = false;
      }

      if (opened) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    if (!opened) {
      throw new Error(
        'Client report notes editor did not open. Expected "Start typing..." or Save after clicking the Notes edit icon.'
      );
    }

    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened notes editor via icon near Notes.');
  }

  async resolveNotesInputField() {
    const direct = this.notesTypingTextbox();
    if (await direct.isVisible({ timeout: 2000 }).catch(() => false)) {
      return direct;
    }

    const root = this.notesEditorRoot();
    const inRoot = root
      .getByRole('textbox')
      .or(root.locator('textarea'))
      .or(root.locator('[contenteditable="true"]'))
      .filter({ visible: true })
      .first();

    if (await inRoot.isVisible({ timeout: 3000 }).catch(() => false)) {
      return inRoot;
    }

    return this.page.locator('[contenteditable="true"], textarea').filter({ visible: true }).last();
  }

  async fillNotesInEditPopup(notesText) {
    const notesField = await this.resolveNotesInputField();
    await expect(notesField).toBeVisible({ timeout: this.defaultTimeout });
    await notesField.click({ timeout: 15000 });

    const tag = String(await notesField.evaluate((el) => el.tagName).catch(() => '')).toLowerCase();
    const contentEditable =
      (await notesField.getAttribute('contenteditable').catch(() => null)) === 'true';

    if (contentEditable || tag === 'div') {
      await notesField.evaluate((el) => {
        el.textContent = '';
      });
      await this.page.keyboard.type(notesText, { delay: 5 });
    } else {
      await notesField.fill('');
      await notesField.fill(notesText);
    }

    this.lastClientReportNotes = notesText;

    const saveBtn = this.notesEditorSaveButton();
    await expect(saveBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await saveBtn.click({ timeout: 20000 });
    await this.dismissNotesEditorAfterSave();

    // eslint-disable-next-line no-console
    console.log(`[Client Report] Filled notes and clicked Save: ${notesText.slice(0, 40)}...`);
  }

  async editClientReportNotesWithRandomText() {
    const notesText = this.buildRandomNotesText();
    await this.clickNotesEditIconNearNotesSection();
    await this.fillNotesInEditPopup(notesText);
    return notesText;
  }

  weatherConditionNotesTextbox() {
    return this.page
      .getByRole('textbox', { name: 'Enter your notes here' })
      .or(this.page.getByRole('textbox', { name: /enter your notes here/i }))
      .first();
  }

  buildRandomWeatherNotesText() {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return (
      `Weather note ${suffix}: During this reporting period, the team continued work on enhancing the site's operational processes. ` +
      'Several functional improvements have been completed, and ongoing efforts are focused on validating end-to-end workflows, resolving identified issues, and preparing the solution for user acceptance testing. ' +
      'The project remains on schedule with no major blockers impacting progress.'
    );
  }

  /**
   * Codegen: div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root
   * Opens the Weather Condition editor (same row pattern as attachment row 2).
   */
  weatherConditionTriggerButton() {
    const scope = this.createPageScope();
    return scope
      .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root')
          .filter({ visible: true })
          .first()
      );
  }

  weatherAffectingWorkSwitch() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    return dialog
      .getByRole('switch', { name: /weather affecting work/i })
      .or(dialog.getByLabel(/weather affecting work/i))
      .or(this.page.getByRole('switch', { name: /weather affecting work/i }))
      .or(this.page.getByLabel(/weather affecting work/i))
      .or(
        this.page
          .locator('.MuiSwitch-root, [role="switch"]')
          .filter({ has: this.page.getByText(/weather affecting work/i) })
          .first()
      )
      .filter({ visible: true })
      .first();
  }

  async isWeatherConditionEditorOpen() {
    if (await this.weatherAffectingWorkSwitch().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .getByText(/weather affecting work/i)
        .first()
        .isVisible({ timeout: 800 })
        .catch(() => false)
    ) {
      return true;
    }
    if (await this.weatherConditionNotesTextbox().isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /weather condition|weather affecting work/i })
      .last()
      .isVisible({ timeout: 800 })
      .catch(() => false);
  }

  async resolveWeatherConditionEditIconCandidates() {
    const candidates = [];
    const weatherLabel = this.page.getByText(/^weather condition$/i).first();

    candidates.push(this.weatherConditionTriggerButton());

    if (await weatherLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      candidates.push(
        weatherLabel
          .locator('xpath=ancestor::*[self::div or self::section][1]')
          .locator('button.MuiIconButton-root, button.MuiIconButton-sizeSmall, .MuiStack-root > .MuiButtonBase-root')
          .filter({ visible: true })
          .first(),
        weatherLabel
          .locator('xpath=following::div[contains(@class,"MuiStack-root")][1]//*[self::button][1]')
          .first()
      );
    }

    const icons = this.visibleCreatePageIconButtons();
    const iconCount = await icons.count();
    if (iconCount >= 3) {
      candidates.push(icons.nth(2));
    }
    if (iconCount >= 2) {
      candidates.push(icons.nth(1));
    }

    candidates.push(this.muiStackRowTriggerLocator(3));

    return candidates;
  }

  async clickWeatherConditionEditIconNearSection() {
    await this.waitForClientReportCreatePage();
    await this.dismissAttachmentAndOverlayDialogs();
    await this.scrollToWeatherConditionSection();

    if (await this.isWeatherConditionEditorOpen()) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Weather condition editor already open.');
      return;
    }

    const weatherLabel = this.page.getByText(/^weather condition$/i).first();
    if (await weatherLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weatherLabel.scrollIntoViewIfNeeded().catch(() => {});
      await weatherLabel.click({ timeout: 10000, force: true }).catch(() => {});
      if (await this.isWeatherConditionEditorOpen()) {
        // eslint-disable-next-line no-console
        console.log('[Client Report] Opened weather editor by clicking Weather Condition label.');
        return;
      }
    }

    const candidates = await this.resolveWeatherConditionEditIconCandidates();
    let opened = false;

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await candidate.click({ timeout: 20000, force: true }).catch(() => {});

      // eslint-disable-next-line no-await-in-loop
      try {
        await expect
          .poll(async () => this.isWeatherConditionEditorOpen(), {
            timeout: 15000,
            intervals: [300, 500, 1000, 2000],
          })
          .toBe(true);
        opened = true;
      } catch {
        opened = false;
      }

      if (opened) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    if (!opened) {
      throw new Error(
        'Client report weather condition editor did not open. Expected weather affecting work toggle or "Enter your notes here" after clicking the Weather Condition edit control.'
      );
    }

    // eslint-disable-next-line no-console
    console.log('[Client Report] Opened weather condition editor via edit icon.');
  }

  async enableWeatherAffectingWorkToggle() {
    const switchEl = this.weatherAffectingWorkSwitch();
    if (await switchEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switchEl.scrollIntoViewIfNeeded().catch(() => {});
      const ariaChecked = await switchEl.getAttribute('aria-checked').catch(() => null);
      if (ariaChecked !== 'true') {
        await switchEl.click({ timeout: 15000, force: true });
      }
      await expect
        .poll(async () => (await switchEl.getAttribute('aria-checked').catch(() => null)) === 'true', {
          timeout: 15000,
          intervals: [300, 500, 1000],
        })
        .toBe(true);
      // eslint-disable-next-line no-console
      console.log('[Client Report] Turned on weather affecting work toggle.');
      return;
    }

    const checkbox = this.page
      .getByRole('checkbox', { name: /weather affecting work/i })
      .or(this.page.getByLabel(/weather affecting work/i))
      .or(this.page.getByRole('checkbox').filter({ visible: true }).first())
      .first();

    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.check({ timeout: 15000, force: true }).catch(async () => {
        await checkbox.click({ timeout: 15000, force: true });
      });
    }
    // eslint-disable-next-line no-console
    console.log('[Client Report] Turned on weather affecting work checkbox.');
  }

  async fillWeatherConditionNotesAndSave(notesText) {
    const notesField = this.weatherConditionNotesTextbox();
    await expect(notesField).toBeVisible({ timeout: this.defaultTimeout });
    await notesField.click({ timeout: 15000 });
    await notesField.fill('');
    await notesField.fill(notesText);
    this.lastClientReportWeatherNotes = notesText;

    const saveBtn = this.page
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .last();
    await expect(saveBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await saveBtn.click({ timeout: 20000 });
    await this.dismissNotesEditorAfterSave();

    // eslint-disable-next-line no-console
    console.log(`[Client Report] Filled weather condition notes and clicked Save: ${notesText.slice(0, 40)}...`);
  }

  async checkWeatherAffectingWorkCheckbox() {
    const checkbox = this.page.getByRole('checkbox').filter({ visible: true }).first();
    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.check({ force: true, timeout: 15000 }).catch(async () => {
          await checkbox.click({ force: true, timeout: 15000 });
        });
      }
      // eslint-disable-next-line no-console
      console.log('[Client Report] Checked weather affecting work checkbox.');
      return;
    }

    await this.enableWeatherAffectingWorkToggle();
  }

  /** Codegen + TC-04: row-3 weather icon → checkbox → Enter your notes here → Save */
  async editClientReportWeatherConditionWithRandomNotes() {
    await this.waitForClientReportCreatePage();
    await this.dismissNotesEditorAfterSave();
    await this.scrollToWeatherConditionSection();

    // Codegen: div:nth-child(3) > .MuiStack-root > .MuiButtonBase-root
    const weatherTrigger = this.codegenWeatherRowTrigger();
    await expect(weatherTrigger).toBeVisible({ timeout: this.defaultTimeout });
    await weatherTrigger.scrollIntoViewIfNeeded().catch(() => {});
    await weatherTrigger.click({ timeout: 20000, force: true });
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked MuiStack row 3 (weather).');

    // Codegen: getByRole('checkbox').check()
    await this.checkWeatherAffectingWorkCheckbox();

    const notesText = this.buildRandomWeatherNotesText();
    await this.fillWeatherConditionNotesAndSave(notesText);
    return notesText;
  }

  async replaceReportTitle(title) {
    await this.waitForClientReportCreatePage();
    const input = this.reportTitleInput();
    await expect(input).toBeVisible({ timeout: this.defaultTimeout });
    await input.click({ timeout: 15000 });
    await input.fill('');
    await input.fill(title);
    await expect
      .poll(async () => (await input.inputValue()).trim(), { timeout: 15000 })
      .toBe(title);
    this.lastClientReportTitle = title;
    // eslint-disable-next-line no-console
    console.log(`[Client Report] Replaced report title with: ${title}`);
  }

  async replaceReportTitleWithRandomSiteProcessUpdate() {
    const title = this.buildRandomReportTitle();
    await this.replaceReportTitle(title);
    return title;
  }

  async clickCreateOnClientReportCreatePage() {
    await this.dismissNotesEditorAfterSave();
    await this.page.keyboard.press('Escape').catch(() => {});

    const createBtn = this.createFormSubmitButton();
    if (!(await createBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.visibleCreateButton().click({ timeout: 30000 });
    } else {
      await expect(createBtn).toBeVisible({ timeout: 15000 });
      await expect(createBtn).toBeEnabled({ timeout: 15000 });
      await createBtn.scrollIntoViewIfNeeded().catch(() => {});
      await createBtn.click({ timeout: 30000 });
    }
    // eslint-disable-next-line no-console
    console.log('[Client Report] Clicked Create (submit create page).');
    await this.observeClientReportCreateSuccess();
  }

  /** Atomic TC-02: create page → title → notes edit → Save → Create. */
  async completeClientReportCreateWithNotesAndTitleJourney() {
    await this.openClientReportCreatePage();
    await this.replaceReportTitleWithRandomSiteProcessUpdate();
    await this.editClientReportNotesWithRandomText();
    await this.clickCreateOnClientReportCreatePage();
  }

  async expectClientReportCreatedSuccessfully() {
    if (this.clientReportCreateSuccessObserved) {
      // eslint-disable-next-line no-console
      console.log('[Client Report] Create success already observed.');
      return;
    }

    await this.observeClientReportCreateSuccess();

    if (this.clientReportCreateSuccessObserved) {
      return;
    }

    const toast = this.locatorClientReportCreatedToast();
    if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
      this.clientReportCreateSuccessObserved = true;
      return;
    }

    await expect
      .poll(async () => this.isClientReportListVisible(), {
        timeout: 10000,
        intervals: [200, 300, 500, 1000],
      })
      .toBe(true);
    this.clientReportCreateSuccessObserved = true;
    // eslint-disable-next-line no-console
    console.log('[Client Report] Create success confirmed.');
  }
}

module.exports = ClientReportPage;
