const { expect } = require('@playwright/test');
const RFQComposePage = require('./rfq-compose.page');
const fs = require('fs');
const path = require('path');

function rfqAttachmentLog(tag, detail) {
  const ts = new Date().toISOString();
  const suffix = detail ? ` - ${detail}` : '';
  // eslint-disable-next-line no-console
  console.log(`[RFQ attachment][${ts}] ${tag}${suffix}`);
}

class RfqAttachmentPage extends RFQComposePage {
  shouldAutoSendAfterCompose() {
    const v = process.env.RFQ_ATTACHMENT_AUTO_SEND_AFTER_COMPOSE;
    return v === '1' || /^true$/i.test(String(v || ''));
  }

  defaultAttachmentFixturePath() {
    return path.join(
      __dirname,
      '../../../../../../fixtures/sample-po-import.pdf'
    );
  }

  isAttachmentAutomationMode() {
    return (
      /^1|true$/i.test(String(process.env.RFQ_ATTACHMENT_AUTO || '')) ||
      /^1|true$/i.test(String(process.env.RFQ_ATTACHMENT_USE_FILECHOOSER || ''))
    );
  }

  resolveAttachmentFilePathForAutomation() {
    const envPath = process.env.RFQ_ATTACHMENT_FILE_PATH;
    if (envPath && String(envPath).trim()) {
      const resolved = path.resolve(String(envPath).trim());
      if (!fs.existsSync(resolved)) {
        throw new Error(`RFQ_ATTACHMENT_FILE_PATH does not exist: ${resolved}`);
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
    const raw = process.env.RFQ_ATTACHMENT_EXPLORER_CLICK_TIMEOUT_MS;
    const n = raw === undefined || raw === '' ? 600000 : Number(raw);
    if (Number.isNaN(n)) {
      return 600000;
    }
    return Math.max(60000, Math.min(1200000, n));
  }

  attachmentNameRegex() {
    return /attach|attachment|upload|browse|choose\s*file|add\s*files?|select\s*file|add\s*document|supporting\s+doc/i;
  }

  attachmentSectionMarkerRegex() {
    return /attachments?|terms\s*(and|&)\s*conditions?/i;
  }

  async locateByCustomTriggerText() {
    const custom = process.env.RFQ_ATTACHMENT_TRIGGER_TEXT?.trim();
    if (!custom) {
      return null;
    }

    const escaped = custom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');

    const btn = this.page.getByRole('button', { name: re }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      return { kind: 'locator', target: btn };
    }

    const text = this.page.getByText(re).filter({ visible: true }).first();
    if (await text.isVisible({ timeout: 2000 }).catch(() => false)) {
      const clickable = text
        .locator('xpath=ancestor-or-self::button[1]')
        .or(text.locator('xpath=ancestor-or-self::a[1]'))
        .or(text.locator('xpath=ancestor-or-self::*[@role="button"][1]'))
        .first();
      if (await clickable.isVisible({ timeout: 1000 }).catch(() => false)) {
        return { kind: 'locator', target: clickable };
      }
      return { kind: 'locator', target: text };
    }

    return null;
  }

  sectionMarkerLocator() {
    return this.page.getByText(this.attachmentSectionMarkerRegex()).filter({ visible: true }).first();
  }

  async locateFileInputFollowingSectionMarker() {
    const marker = this.sectionMarkerLocator();
    if ((await marker.count()) === 0) {
      return null;
    }

    const input = marker.locator('xpath=./following::input[@type="file"][1]');
    if ((await input.count()) === 0) {
      return null;
    }

    const id = await input.getAttribute('id').catch(() => null);
    if (id) {
      const label = this.page.locator(`label[for=${JSON.stringify(id)}]`).first();
      if (await label.isVisible({ timeout: 1200 }).catch(() => false)) {
        return { kind: 'locator', target: label };
      }
    }

    const wrapBtn = input
      .locator('xpath=ancestor::button[1]')
      .or(input.locator('xpath=ancestor::*[@role="button"][1]'))
      .first();
    if (await wrapBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      return { kind: 'locator', target: wrapBtn };
    }

    return { kind: 'locator', target: input };
  }

  async locateAttachmentTriggerLegacy() {
    const nameRe = this.attachmentNameRegex();

    const directCandidates = [
      this.page.getByRole('button', { name: nameRe }).first(),
      this.page.getByRole('link', { name: nameRe }).first(),
      this.page.getByLabel(nameRe).first(),
      this.page.locator('label').filter({ hasText: nameRe }).first(),
      this.page.locator('button, a, [role="button"]').filter({ hasText: nameRe }).first(),
      this.page.locator('[aria-label*="attach" i]').first(),
      this.page.locator('[aria-label*="upload" i]').first(),
      this.page.locator('[data-testid*="attach" i]').first(),
      this.page.locator('[data-testid*="upload" i]').first(),
    ];

    for (const candidate of directCandidates) {
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        return { kind: 'locator', target: candidate };
      }
    }

    const fileInputs = this.page.locator('input[type="file"]');
    const n = await fileInputs.count();
    for (let i = 0; i < n; i += 1) {
      const firstFileInput = fileInputs.nth(i);
      const exists = await firstFileInput
        .evaluate((el) => !!el && document.body.contains(el))
        .catch(() => false);
      if (!exists) {
        continue;
      }

      if (await firstFileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        return { kind: 'locator', target: firstFileInput };
      }

      const id = await firstFileInput.getAttribute('id').catch(() => null);
      if (id) {
        const labelForInput = this.page.locator(`label[for=${JSON.stringify(id)}]`).first();
        if (await labelForInput.isVisible({ timeout: 1500 }).catch(() => false)) {
          return { kind: 'locator', target: labelForInput };
        }
      }

      const triggerLikeParent = firstFileInput
        .locator('xpath=ancestor::button[1]')
        .or(firstFileInput.locator('xpath=ancestor::*[@role="button"][1]'))
        .first();
      if (await triggerLikeParent.isVisible({ timeout: 1000 }).catch(() => false)) {
        return { kind: 'locator', target: triggerLikeParent };
      }

      return { kind: 'locator', target: firstFileInput };
    }

    return null;
  }

  async locateAttachmentElementHandleAfterSection() {
    const handle = await this.page.evaluateHandle((sectionMarkerSource, attachmentSource) => {
      const sectionMarkerRe = new RegExp(sectionMarkerSource, 'i');
      const attachmentRe = new RegExp(attachmentSource, 'i');

      let anchor = null;
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = tw.nextNode())) {
        if (sectionMarkerRe.test(node.textContent || '')) {
          anchor = node.parentElement;
          break;
        }
      }
      if (!anchor) {
        return null;
      }

      const scored = [];
      const followsAnchor = (el) => {
        const pos = anchor.compareDocumentPosition(el);
        return !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
      };

      document.querySelectorAll('input[type="file"]').forEach((el) => {
        if (!followsAnchor(el)) {
          return;
        }
        scored.push({ el, score: 200 });
      });

      document
        .querySelectorAll('button, a, [role="button"], label, span, div[role="button"]')
        .forEach((el) => {
          if (!followsAnchor(el)) {
            return;
          }
          const text = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`;
          if (attachmentRe.test(text)) {
            scored.push({ el, score: 120 });
          }
        });

      const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div');
      headings.forEach((h) => {
        const tx = (h.textContent || '').trim();
        if (!/^attachments?$/i.test(tx)) {
          return;
        }
        if (!followsAnchor(h)) {
          return;
        }
        const nested = h.querySelector('button, [role="button"], label, input[type="file"], a');
        if (nested && followsAnchor(nested)) {
          scored.push({ el: nested, score: 150 });
        }
        let sib = h.nextElementSibling;
        for (let i = 0; i < 6 && sib; i += 1) {
          const hit = sib.querySelector('button, [role="button"], label, input[type="file"], a');
          if (hit && followsAnchor(hit)) {
            scored.push({ el: hit, score: 140 });
            break;
          }
          sib = sib.nextElementSibling;
        }
      });

      if (scored.length === 0) {
        return null;
      }
      scored.sort((a, b) => b.score - a.score);
      return scored[0].el;
    }, this.attachmentSectionMarkerRegex().source, this.attachmentNameRegex().source);

    const el = handle.asElement();
    if (!el) {
      await handle.dispose();
      return null;
    }
    return el;
  }

  async resolveAttachmentClickTargetWithScroll() {
    const tryPick = async () => {
      const custom = await this.locateByCustomTriggerText();
      if (custom) {
        return custom;
      }

      const following = await this.locateFileInputFollowingSectionMarker();
      if (following) {
        return following;
      }

      const legacy = await this.locateAttachmentTriggerLegacy();
      if (legacy) {
        return legacy;
      }

      return null;
    };

    for (let i = 0; i < 24; i += 1) {
      const hit = await tryPick();
      if (hit) {
        if (hit.kind === 'locator') {
          await hit.target.scrollIntoViewIfNeeded().catch(() => {});
        }
        return hit;
      }

      await this.page.evaluate(() => {
        const main = document.querySelector('main');
        if (main && main.scrollHeight > main.clientHeight + 16) {
          main.scrollTop += Math.floor(main.clientHeight * 0.55);
          return;
        }
        window.scrollBy(0, Math.floor(window.innerHeight * 0.55));
      });
      await this.page.waitForTimeout(100);
    }

    const domHandle = await this.locateAttachmentElementHandleAfterSection();
    if (domHandle) {
      await domHandle.scrollIntoViewIfNeeded().catch(() => {});
      return { kind: 'handle', target: domHandle };
    }

    throw new Error(
      'Could not find RFQ attachment control. Set RFQ_ATTACHMENT_TRIGGER_TEXT to a visible label substring if the UI text is different.'
    );
  }

  async waitForAttachmentSelectionToSettle() {
    rfqAttachmentLog('waitForAttachmentSelectionToSettle:start');
    if (this.page.isClosed()) {
      rfqAttachmentLog('waitForAttachmentSelectionToSettle:skip', 'page already closed');
      return;
    }
    await this.waitForNetworkSettled();

    const uploadingIndicators = this.page
      .locator('text=/uploading|processing|attaching|please wait/i')
      .filter({ visible: true });
    if (await uploadingIndicators.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      rfqAttachmentLog('waitForAttachmentSelectionToSettle:uploadingVisible');
      await uploadingIndicators.first().waitFor({ state: 'hidden', timeout: 180000 }).catch(() => {});
    }

    await this.page.waitForTimeout(500).catch(() => {});
    await this.waitForNetworkSettled();
    rfqAttachmentLog('waitForAttachmentSelectionToSettle:ok');
  }

  async addRfqAttachmentBeforeCompose() {
    rfqAttachmentLog('addRfqAttachmentBeforeCompose:start');
    await expect(this.page).toHaveURL(/rfq\/(create|edit)/i);
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    let resolved = null;
    try {
      resolved = await this.resolveAttachmentClickTargetWithScroll();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        '\n[RFQ attachment] Could not auto-locate the attachment control. Pausing so you can click Attachment and select the file manually.\n' +
          '                Tip: set RFQ_ATTACHMENT_TRIGGER_TEXT to a unique substring of the attachment control to auto-detect next time.\n',
        error && error.message ? `Reason: ${error.message}\n` : ''
      );
      rfqAttachmentLog('addRfqAttachmentBeforeCompose:fallbackPause');
      await this.page.pause();
      await this.waitForAttachmentSelectionToSettle();
      await this.dismissOpenMenusAndPopovers();
      await this.dismissVisibleToastNotifications();
      await this.openActionMenuAndComposeEmail();
      rfqAttachmentLog('addRfqAttachmentBeforeCompose:ok', 'manual attachment completed after pause + compose opened');
      return;
    }

    rfqAttachmentLog('addRfqAttachmentBeforeCompose:triggerFound');

    const auto = this.isAttachmentAutomationMode();
    const uploadPath = auto ? this.resolveAttachmentFilePathForAutomation() : null;
    const explorerMs = this.explorerClickTimeoutMs();

    try {
      if (auto) {
        if (!uploadPath) {
          throw new Error(
            'RFQ_ATTACHMENT_AUTO=1 requires RFQ_ATTACHMENT_FILE_PATH or fixtures/sample-po-import.pdf.'
          );
        }

        // If the resolved target is actually the hidden <input type="file">, don't click it.
        // setInputFiles works even when the input is not visible and avoids flaky “Element is not visible” clicks.
        const isFileInput =
          resolved.kind === 'locator'
            ? await resolved.target
                .evaluate(
                  (el) =>
                    el &&
                    String(el.tagName || '').toLowerCase() === 'input' &&
                    String(el.getAttribute('type') || '').toLowerCase() === 'file'
                )
                .catch(() => false)
            : await resolved.target
                .evaluate(
                  (el) =>
                    el &&
                    String(el.tagName || '').toLowerCase() === 'input' &&
                    String(el.getAttribute('type') || '').toLowerCase() === 'file'
                )
                .catch(() => false);

        if (isFileInput) {
          if (resolved.kind === 'locator') {
            await resolved.target.setInputFiles(uploadPath);
          } else {
            // Best-effort locator from the page when we only have a handle.
            const fileInput = this.page.locator('input[type="file"]').first();
            await fileInput.waitFor({ state: 'attached', timeout: 15000 });
            await fileInput.setInputFiles(uploadPath);
          }
          rfqAttachmentLog('addRfqAttachmentBeforeCompose:setInputFiles', uploadPath);
        } else {
          const [fileChooser] = await Promise.all([
            this.page.waitForEvent('filechooser', { timeout: 25000 }),
            resolved.kind === 'locator'
              ? resolved.target.click({ timeout: 20000, force: true })
              : resolved.target.click({ timeout: 20000, force: true }),
          ]);
          await fileChooser.setFiles(uploadPath);
          rfqAttachmentLog(
            'addRfqAttachmentBeforeCompose:fileChooserSet',
            uploadPath
          );
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(
          '\n[RFQ attachment] Explorer mode: pick your file in the system dialog. This click waits until the dialog finishes.\n'
        );
        if (resolved.kind === 'locator') {
          await resolved.target.click({ timeout: explorerMs, force: true });
        } else {
          await resolved.target.click({ timeout: explorerMs, force: true });
        }
      }
    } finally {
      if (resolved.kind === 'handle') {
        await resolved.target.dispose().catch(() => {});
      }
    }

    await this.waitForAttachmentSelectionToSettle();
    await this.dismissOpenMenusAndPopovers();
    await this.dismissVisibleToastNotifications();
    await this.openActionMenuAndComposeEmail();
    rfqAttachmentLog(
      'addRfqAttachmentBeforeCompose:composeOpened',
      'attachment staged and compose email opened'
    );

    // If you want the attachment step to fully complete the flow (Action -> Compose -> Send),
    // enable RFQ_ATTACHMENT_AUTO_SEND_AFTER_COMPOSE=1. Default keeps layer separation:
    // the next step "I send email from RFQ compose dialog" will do the send.
    if (this.shouldAutoSendAfterCompose()) {
      await this.sendEmailFromRfqComposeModal();
      rfqAttachmentLog(
        'addRfqAttachmentBeforeCompose:sent',
        'send email clicked from compose dialog'
      );
    }

    rfqAttachmentLog('addRfqAttachmentBeforeCompose:ok');
  }
}

module.exports = RfqAttachmentPage;
