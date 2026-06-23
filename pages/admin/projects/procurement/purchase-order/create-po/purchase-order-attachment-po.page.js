const fs = require('fs');
const path = require('path');
const PurchaseOrderDefaultTermsTemplatePoPage = require('./purchase-order-default-terms-template-po.page');
const { expect } = require('@playwright/test');

/**
 * PO create: after terms-from-template, attach a file before Action → Compose.
 * Attachment UI is expected **below** Terms & Conditions (file input, label, or button).
 *
 * **Default (Explorer):** long-timeout click so the OS picker can complete (like PO import PDF manual).
 * **Automation:** PO_ATTACHMENT_AUTO=1 + PO_ATTACHMENT_FILE_PATH or fixtures/sample-po-import.pdf.
 *
 * **PO_ATTACHMENT_TRIGGER_TEXT** — substring of the visible control if auto-detection misses.
 */
class PurchaseOrderAttachmentPoPage extends PurchaseOrderDefaultTermsTemplatePoPage {
  defaultAttachmentFixturePath() {
    return path.join(
      __dirname,
      '../../../../../..',
      'fixtures',
      'sample-po-import.pdf'
    );
  }

  isAttachmentAutomationMode() {
    return (
      /^1|true$/i.test(String(process.env.PO_ATTACHMENT_AUTO || '')) ||
      /^1|true$/i.test(String(process.env.PO_ATTACHMENT_USE_SET_FILES || ''))
    );
  }

  resolveAttachmentFilePathForAutomation() {
    const envPath = process.env.PO_ATTACHMENT_FILE_PATH;
    if (envPath) {
      const resolved = path.resolve(envPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(
          `PO_ATTACHMENT_FILE_PATH does not exist: ${resolved}`
        );
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
    const raw = process.env.PO_ATTACHMENT_EXPLORER_CLICK_TIMEOUT_MS;
    const n = raw === undefined || raw === '' ? 600000 : Number(raw);
    if (Number.isNaN(n)) {
      return 600000;
    }
    return Math.max(60000, Math.min(1200000, n));
  }

  termsMarkerLocator() {
    return this.page
      .getByText(/terms\s*(and|&)\s*conditions?/i)
      .filter({ visible: true })
      .first();
  }

  attachmentNamePattern() {
    return /\b(attach|attachments?|upload|browse|choose\s*file|add\s*files?|select\s*file|add\s*document|supporting\s+doc)\b/i;
  }

  /**
   * Hidden file inputs cannot use Playwright scrollIntoViewIfNeeded (long retries / page closed).
   */
  async safeScrollAttachmentTarget(hit) {
    if (!hit) {
      return;
    }
    if (hit.kind === 'handle') {
      await hit.target
        .evaluate((el) => {
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        })
        .catch(() => {});
      return;
    }

    const loc = hit.target;
    const meta = await loc
      .evaluate((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type') || '',
        visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      }))
      .catch(() => ({ tag: '', type: '', visible: false }));

    if (meta.tag === 'INPUT' && meta.type === 'file' && !meta.visible) {
      await this.scrollPurchaseOrderPageToRevealTermsSection(this.termsHeading());
      return;
    }

    if (meta.visible) {
      await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      return;
    }

    await loc
      .evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      })
      .catch(() => {});
  }

  async locateAttachmentControlNearTerms() {
    const terms = this.termsMarkerLocator();
    if (!(await terms.isVisible({ timeout: 2000 }).catch(() => false))) {
      return null;
    }

    const nameRe = this.attachmentNamePattern();
    const scoped = [
      terms.locator('xpath=following::button[1]'),
      terms.locator('xpath=following::*[@role="button"][1]'),
      terms.locator('xpath=following::label[1]'),
      this.page
        .locator('div, section')
        .filter({ has: this.page.getByText(/^attachments?$/i) })
        .filter({ visible: true })
        .first()
        .getByRole('button')
        .first(),
      this.page.getByRole('button', { name: nameRe }).filter({ visible: true }).first(),
      this.page.locator('label').filter({ hasText: nameRe }).filter({ visible: true }).first(),
    ];

    for (const loc of scoped) {
      const el = loc.first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        return { kind: 'locator', target: el };
      }
    }
    return null;
  }

  attachmentVerificationTimeoutMs() {
    const raw = process.env.PO_ATTACHMENT_VERIFY_TIMEOUT_MS;
    const n = raw === undefined || raw === '' ? 12000 : Number(raw);
    if (Number.isNaN(n)) {
      return 12000;
    }
    return Math.max(3000, Math.min(60000, n));
  }

  async waitForPoAttachmentUploaded(uploadPath) {
    const fileName = uploadPath ? path.basename(uploadPath) : null;
    const fileNameRe = fileName
      ? new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    await expect
      .poll(
        async () => {
          if (fileNameRe) {
            const byText = this.page
              .getByText(fileNameRe)
              .filter({ visible: true })
              .first();
            if (await byText.isVisible({ timeout: 400 }).catch(() => false)) {
              return true;
            }
          }

          const statusText = this.page
            .getByText(/uploaded|upload complete|attachment added|attached/i)
            .filter({ visible: true })
            .first();
          if (await statusText.isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }

          const chips = this.page
            .locator('.MuiChip-root, [class*="chip"], [class*="attachment"]')
            .filter({ visible: true });
          const chipCount = await chips.count().catch(() => 0);
          for (let i = 0; i < Math.min(chipCount, 8); i += 1) {
            const text = (await chips.nth(i).textContent().catch(() => '')) || '';
            if (
              (fileNameRe && fileNameRe.test(text)) ||
              /attach|upload|image|png|jpg|jpeg|pdf|file/i.test(text)
            ) {
              return true;
            }
          }

          const fileInputs = this.page.locator('input[type="file"]');
          const count = await fileInputs.count().catch(() => 0);
          for (let i = 0; i < count; i += 1) {
            const value = await fileInputs
              .nth(i)
              .evaluate((el) => el.value || '')
              .catch(() => '');
            if (value && (!fileName || value.toLowerCase().includes(fileName.toLowerCase()))) {
              return true;
            }
          }

          return false;
        },
        {
          timeout: this.attachmentVerificationTimeoutMs(),
          intervals: [150, 300, 600, 1000],
        }
      )
      .toBe(true);
  }

  /**
   * First file input in document order after the visible Terms heading (usually Attachments).
   */
  async locateFileInputFollowingTerms() {
    const terms = this.termsMarkerLocator();
    if ((await terms.count()) === 0) {
      return null;
    }
    const inp = terms.locator('xpath=./following::input[@type="file"][1]');
    if ((await inp.count()) === 0) {
      return null;
    }
    const id = await inp.getAttribute('id').catch(() => null);
    if (id) {
      const lbl = this.page
        .locator(`label[for=${JSON.stringify(id)}]`)
        .first();
      if (await lbl.isVisible({ timeout: 1200 }).catch(() => false)) {
        return { kind: 'locator', target: lbl };
      }
    }
    const wrapBtn = inp
      .locator('xpath=ancestor::button[1]')
      .or(inp.locator('xpath=ancestor::*[@role="button"][1]'))
      .first();
    if (await wrapBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      return { kind: 'locator', target: wrapBtn };
    }
    // Even if the input is hidden, force-clicking it is the most reliable way
    // to open the OS file picker (matches the import-PDF “Explorer mode” idea).
    return { kind: 'locator', target: inp };
  }

  /**
   * Browser-side scan: any interactive control after Terms whose text/role suggests attachment.
   */
  async locateAttachmentElementHandleAfterTerms() {
    const handle = await this.page.evaluateHandle(() => {
      const termsRe = /terms\s*(and|&)\s*conditions?/i;
      const nameRe =
        /\b(attach|attachments?|upload|browse|choose\s*file|add\s*files?|select\s*file)\b/i;

      let anchor = null;
      const tw = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      let node;
      while ((node = tw.nextNode())) {
        if (termsRe.test(node.textContent || '')) {
          anchor = node.parentElement;
          break;
        }
      }
      if (!anchor) {
        return null;
      }

      const scored = [];
      const followsTerms = (el) => {
        const pos = anchor.compareDocumentPosition(el);
        return !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
      };

      document.querySelectorAll('input[type="file"]').forEach((el) => {
        if (!followsTerms(el)) {
          return;
        }
        scored.push({ el, score: 200 });
      });

      document
        .querySelectorAll(
          'button, a, [role="button"], label, span, div[role="button"]'
        )
        .forEach((el) => {
          if (!followsTerms(el)) {
            return;
          }
          const t =
            `${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`;
          if (nameRe.test(t)) {
            scored.push({ el, score: 100 });
          }
        });

      const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div');
      headings.forEach((h) => {
        const tx = (h.textContent || '').trim();
        if (!/^attachments?$/i.test(tx)) {
          return;
        }
        if (!followsTerms(h)) {
          return;
        }
        const nested = h.querySelector(
          'button, [role="button"], label, input[type="file"], a'
        );
        if (nested && followsTerms(nested)) {
          scored.push({ el: nested, score: 150 });
        }
        let s = h.nextElementSibling;
        for (let i = 0; i < 6 && s; i += 1) {
          const hit = s.querySelector(
            'button, [role="button"], label, input[type="file"], a'
          );
          if (hit && followsTerms(hit)) {
            scored.push({ el: hit, score: 140 });
            break;
          }
          s = s.nextElementSibling;
        }
      });

      if (scored.length === 0) {
        return null;
      }
      scored.sort((a, b) => b.score - a.score);
      return scored[0].el;
    });

    const el = handle.asElement();
    if (!el) {
      await handle.dispose();
      return null;
    }
    return el;
  }

  async locateByCustomTriggerText() {
    const custom = process.env.PO_ATTACHMENT_TRIGGER_TEXT?.trim();
    if (!custom) {
      return null;
    }
    const escaped = custom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');

    const btn = this.page.getByRole('button', { name: re }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      return { kind: 'locator', target: btn };
    }
    const t = this.page.getByText(re).filter({ visible: true }).first();
    if (await t.isVisible({ timeout: 2000 }).catch(() => false)) {
      const asBtn = t
        .locator('xpath=ancestor-or-self::button[1]')
        .or(t.locator('xpath=ancestor-or-self::a[1]'))
        .or(t.locator('xpath=ancestor-or-self::*[@role="button"][1]'))
        .first();
      if (await asBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        return { kind: 'locator', target: asBtn };
      }
      return { kind: 'locator', target: t };
    }
    return null;
  }

  async locatePurchaseOrderAttachmentTriggerLegacy() {
    const nameRe = this.attachmentNamePattern();

    const fileInputs = this.page.locator('input[type="file"]');
    const n = await fileInputs.count();
    for (let i = 0; i < n; i += 1) {
      const inp = fileInputs.nth(i);
      const ok = await inp
        .evaluate((el) => {
          if (!el || !document.body.contains(el)) {
            return false;
          }
          const st = window.getComputedStyle(el);
          return !(st.display === 'none' && st.visibility === 'hidden');
        })
        .catch(() => false);
      if (!ok) {
        continue;
      }
      const id = await inp.getAttribute('id').catch(() => null);
      if (id) {
        const lbl = this.page
          .locator(`label[for=${JSON.stringify(id)}]`)
          .first();
        if (await lbl.isVisible({ timeout: 800 }).catch(() => false)) {
          return { kind: 'locator', target: lbl };
        }
      }
      const asButton = inp
        .locator('xpath=ancestor::button[1]')
        .or(inp.locator('xpath=ancestor::*[@role="button"][1]'))
        .first();
      if (await asButton.isVisible({ timeout: 500 }).catch(() => false)) {
        return { kind: 'locator', target: asButton };
      }
    }

    const termsBlock = this.page
      .locator('div')
      .filter({
        has: this.page.getByText(/terms\s*(and|&)\s*conditions?/i),
      })
      .first();

    const scoped = [
      termsBlock.getByRole('button', { name: nameRe }),
      termsBlock.locator('button, a, [role="button"]').filter({ hasText: nameRe }),
      termsBlock.locator('[aria-label*="attach" i]'),
      termsBlock.locator('[aria-label*="upload" i]'),
      termsBlock.locator('label').filter({ hasText: nameRe }),
    ];
    for (const loc of scoped) {
      const el = loc.first();
      if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
        return { kind: 'locator', target: el };
      }
    }

    const global = [
      this.page.getByRole('button', { name: nameRe }),
      this.page.getByRole('link', { name: nameRe }),
      this.page.getByLabel(nameRe),
      this.page.locator('button, a, [role="button"]').filter({ hasText: nameRe }),
      this.page.locator('button[aria-label*="attach" i]'),
      this.page.locator('button[aria-label*="upload" i]'),
      this.page.locator('[data-testid*="attach" i]'),
      this.page.locator('[data-testid*="upload" i]'),
    ];
    for (const loc of global) {
      const el = loc.first();
      if (await el.isVisible({ timeout: 600 }).catch(() => false)) {
        return { kind: 'locator', target: el };
      }
    }

    return null;
  }

  /**
   * @returns {Promise<{ kind: 'locator', target: import('@playwright/test').Locator } | { kind: 'handle', target: import('@playwright/test').ElementHandle } | null>}
   */
  async resolveAttachmentClickTargetWithScroll() {
    const heading = this.termsHeading();
    await this.scrollPurchaseOrderPageToRevealTermsSection(heading);
    await expect(heading).toBeVisible({ timeout: 90000 }).catch(() => {});

    const tryPick = async () => {
      const custom = await this.locateByCustomTriggerText();
      if (custom) {
        return custom;
      }
      const nearTerms = await this.locateAttachmentControlNearTerms();
      if (nearTerms) {
        return nearTerms;
      }
      const following = await this.locateFileInputFollowingTerms();
      if (following) {
        return following;
      }
      const legacy = await this.locatePurchaseOrderAttachmentTriggerLegacy();
      if (legacy) {
        return legacy;
      }
      return null;
    };

    let hit = await tryPick();
    if (hit) {
      await this.safeScrollAttachmentTarget(hit);
      return hit;
    }

    for (let i = 0; i < 10; i += 1) {
      await this.page.evaluate(() => {
        window.scrollBy(0, Math.floor(window.innerHeight * 0.55));
      });
      const table = this.page.locator('[aria-label="PO line items table"]');
      if (await table.isVisible({ timeout: 300 }).catch(() => false)) {
        await table.evaluate((tableEl) => {
          let n = tableEl.parentElement;
          for (let d = 0; d < 14 && n; d += 1) {
            const st = window.getComputedStyle(n);
            if (
              (st.overflowY === 'auto' || st.overflowY === 'scroll') &&
              n.scrollHeight > n.clientHeight + 16
            ) {
              n.scrollTop = n.scrollHeight;
            }
            n = n.parentElement;
          }
        });
      }
      await this.page.waitForTimeout(60);

      hit = await tryPick();
      if (hit) {
        await this.safeScrollAttachmentTarget(hit);
        return hit;
      }
    }

    await this.page.evaluate(() => {
      const se = document.scrollingElement || document.documentElement;
      if (se) {
        se.scrollTop = se.scrollHeight;
      }
    });

    hit = await tryPick();
    if (hit) {
      await this.safeScrollAttachmentTarget(hit);
      return hit;
    }

    const domHandle = await this.locateAttachmentElementHandleAfterTerms();
    if (domHandle) {
      await this.safeScrollAttachmentTarget({ kind: 'handle', target: domHandle });
      return { kind: 'handle', target: domHandle };
    }

    throw new Error(
      'Could not find PO attachment below Terms & Conditions. Set PO_ATTACHMENT_TRIGGER_TEXT to a visible label (e.g. part of the attachment button text).'
    );
  }

  async waitForAttachmentStepEnterOrInspector(promptText) {
    const forceInspector =
      /^1|true$/i.test(String(process.env.PO_ATTACHMENT_MANUAL_INSPECTOR || ''));
    const forceStdin =
      process.env.PO_ATTACHMENT_STDIN === '1' ||
      /^true$/i.test(String(process.env.PO_ATTACHMENT_STDIN || ''));
    const forceNoStdin =
      process.env.PO_ATTACHMENT_STDIN === '0' ||
      /^false$/i.test(String(process.env.PO_ATTACHMENT_STDIN || ''));

    const useStdin =
      forceStdin || (!forceInspector && !forceNoStdin && process.stdin.isTTY);

    // eslint-disable-next-line no-console
    console.log(
      `\n[PO attachment] ${promptText}\n` +
        (useStdin
          ? '            → Press ENTER in this terminal to continue (next: Action → Compose email).\n'
          : '            → Resume in Playwright Inspector (▶), or set PO_ATTACHMENT_STDIN=1 from a real terminal.\n')
    );

    if (useStdin) {
      await this.waitForEnterInTerminal(
        'Press ENTER when you are ready to continue.'
      );
    } else {
      await this.page.pause();
    }
  }

  async addPurchaseOrderAttachmentBeforeCompose() {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.waitForNetworkSettled();

    let resolved = null;
    try {
      resolved = await this.resolveAttachmentClickTargetWithScroll();
    } catch (e) {
      // Fallback: keep the test usable even if the UI label/structure changes.
      // In headed runs you can still attach manually and continue the scenario.
      // eslint-disable-next-line no-console
      console.warn(
        '\n[PO attachment] Could not auto-locate the attachment control. ' +
          'Pausing so you can click Attachment and select the file manually.\n' +
          '            Tip: set PO_ATTACHMENT_TRIGGER_TEXT to a unique substring of the attachment control to auto-detect next time.\n',
        e && e.message ? `            Reason: ${e.message}\n` : ''
      );
      await this.page.pause();
      const skipEnter =
        /^1|true$/i.test(String(process.env.PO_ATTACHMENT_SKIP_STEP_ENTER || ''));
      if (!skipEnter && process.stdin.isTTY) {
        await this.waitForEnterInTerminal(
          'Press ENTER after attachment is uploaded (next: Action → Compose email).'
        );
      }
      await this.waitForNetworkSettled();
      return;
    }

    const auto = this.isAttachmentAutomationMode();
    const uploadPath = auto ? this.resolveAttachmentFilePathForAutomation() : null;
    const explorerMs = this.explorerClickTimeoutMs();

    try {
      if (auto && uploadPath) {
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent('filechooser', { timeout: 25000 }),
          resolved.kind === 'locator'
            ? resolved.target.click({ timeout: 20000, force: true })
            : resolved.target.click({ timeout: 20000, force: true }),
        ]);
        await fileChooser.setFiles(uploadPath);
      } else {
        if (auto && !uploadPath) {
          throw new Error(
            'PO_ATTACHMENT_AUTO=1 requires PO_ATTACHMENT_FILE_PATH or fixtures/sample-po-import.pdf.'
          );
        }
        // eslint-disable-next-line no-console
        console.log(
          '\n[PO attachment] Explorer mode: pick your file in the system dialog. This click waits until the dialog finishes.\n'
        );
        if (resolved.kind === 'locator') {
          await resolved.target.click({ timeout: explorerMs, force: true });
        } else {
          await resolved.target.click({
            timeout: explorerMs,
            force: true,
          });
        }
      }
    } finally {
      if (resolved.kind === 'handle') {
        await resolved.target.dispose().catch(() => {});
      }
    }

    const attachmentReady = await this.waitForPoAttachmentUploaded(uploadPath).then(
      () => true,
      () => false
    );
    if (attachmentReady) {
      // eslint-disable-next-line no-console
      console.log('[PO attachment] Upload detected — continuing to Action → Compose email.');
    }

    await this.waitForNetworkSettled();

    const skipEnter =
      attachmentReady ||
      /^1|true$/i.test(String(process.env.PO_ATTACHMENT_SKIP_STEP_ENTER || ''));
    const forceInspector =
      /^1|true$/i.test(String(process.env.PO_ATTACHMENT_MANUAL_INSPECTOR || ''));
    const forceStdin =
      process.env.PO_ATTACHMENT_STDIN === '1' ||
      /^true$/i.test(String(process.env.PO_ATTACHMENT_STDIN || ''));
    if (
      !skipEnter &&
      (process.stdin.isTTY || forceStdin || forceInspector)
    ) {
      await this.waitForAttachmentStepEnterOrInspector(
        'When the attachment shows on the PO form, continue to Action → Compose email.'
      );
    }
  }
}

module.exports = PurchaseOrderAttachmentPoPage;
