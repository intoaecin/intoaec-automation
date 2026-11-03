const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

class TaskPage extends BasePage {
  constructor(page) {
    super(page);
    this.main = page.locator('main, [role="main"]').first();
  }

  async logStep(msg) {
    console.log(msg);
  }

  _taskKanbanCard(taskName) {
    const esc = String(taskName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .getByRole('button', { name: new RegExp(esc, 'i') })
      .first();
  }

  async waitForModuleToLoad() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(
      this.page
        .getByText(/^to do$/i)
        .or(this.page.getByRole('heading', { name: /task/i }))
        .or(this.main.getByText(/kanban/i))
        .first()
    )
      .toBeVisible({ timeout: 60000 })
      .catch(() => {});
  }

  async expectTaskVisibleInTodoKanban(taskName) {
    await this.waitForModuleToLoad();
    const task = this.page.getByText(taskName, { exact: false }).first();
    await expect(async () => {
      expect(await task.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 90000, intervals: [1000, 2500, 5000] });
    await this.logStep('task is created');
  }

  async _scrollKanbanToTask(taskName) {
    await this.page.evaluate((name) => {
      const columns = document.querySelectorAll(
        '[class*="kanban"], [class*="Kanban"], [data-testid*="kanban"], [class*="column"], .MuiBox-root'
      );
      for (const col of columns) {
        if (col.scrollHeight > col.clientHeight + 20) {
          const hasTask = col.textContent && col.textContent.includes(name);
          if (hasTask) {
            col.scrollTop = col.scrollHeight;
          }
        }
      }
      const main = document.querySelector('main') || document.body;
      if (main.scrollHeight > main.clientHeight + 20) {
        const cards = document.querySelectorAll('button, [role="button"]');
        for (const c of cards) {
          if (c.textContent && c.textContent.includes(name)) {
            c.scrollIntoView({ block: 'center' });
            break;
          }
        }
      }
    }, taskName);
  }

  async openTaskViewFromKanbanCard(taskName) {
    await this._scrollKanbanToTask(taskName);
    const card = this._taskKanbanCard(taskName);
    await expect(card).toBeVisible({ timeout: 90000 });
    await card.scrollIntoViewIfNeeded().catch(() => {});

    await expect(async () => {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this._scrollKanbanToTask(taskName);
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.hover({ force: true, timeout: 5000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 500));

      const menuBtn = this.page
        .locator('.task-card-action-button')
        .filter({ visible: true })
        .first();

      if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuBtn.click({ force: true, timeout: 10000 });
      } else {
        const idBtn = this.page
          .locator('[id^="demo-customized-button"]')
          .filter({ visible: true })
          .first();
        await expect(idBtn).toBeVisible({ timeout: 5000 });
        await idBtn.click({ force: true, timeout: 10000 });
      }

      const viewItem = this.page.getByRole('menuitem', { name: /^view$/i }).first();
      await expect(viewItem).toBeVisible({ timeout: 5000 });
      await viewItem.click({ force: true, timeout: 10000 });

      const drawer = this.page
        .locator('.MuiDrawer-paper, .offcanvas.show, [role="dialog"]')
        .last();
      const opened = await drawer.isVisible({ timeout: 5000 }).catch(() => false);
      expect(opened).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2500, 5000] });
  }

  async scrollToLinkedSchedules(drawer) {
    await expect(async () => {
      await drawer.evaluate((root) => {
        const scrollable =
          [root, ...root.querySelectorAll('*')].find(
            (el) => el.scrollHeight > el.clientHeight + 20
          ) || root;
        scrollable.scrollTop = scrollable.scrollHeight;
      });
      const headingVisible = await drawer
        .getByText(/linked schedules/i)
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      expect(headingVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectScheduleLinkedOnTaskKanbanCard(taskName, scheduleName) {
    await this.waitForModuleToLoad();
    await this.openTaskViewFromKanbanCard(taskName);

    const drawer = this.page
      .locator('.MuiDrawer-paper, .offcanvas.show, [role="dialog"]')
      .last();
    await expect(drawer).toBeVisible({ timeout: 30000 });
    await this.scrollToLinkedSchedules(drawer);

    const linkedHeading = drawer
      .getByRole('heading', { name: /linked schedules/i })
      .or(drawer.getByText(/linked schedules/i))
      .first();
    await expect(linkedHeading).toBeVisible({ timeout: 15000 });
    await linkedHeading.scrollIntoViewIfNeeded().catch(() => {});
    await linkedHeading.click({ force: true, timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    const scheduleText = drawer.getByText(scheduleName, { exact: false }).first();
    await expect(async () => {
      await this.scrollToLinkedSchedules(drawer);
      expect(
        await scheduleText.isVisible({ timeout: 2000 }).catch(() => false)
      ).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [1000, 2500, 5000] });

    await this.logStep(`Linked schedule found: ${scheduleName}`);
  }
}

module.exports = TaskPage;
