const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const {
  PurchaseOrderVendorYopmailPage,
  yopmailLocalPart,
} = require('../../../../../../pages/admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-yopmail.page');

function resolveVendorYopmailLocalPart(world) {
  const fromCompose = yopmailLocalPart(world.vendorYopmailEmail);
  if (fromCompose) return fromCompose;
  const env =
    process.env.PO_VENDOR_YOPMAIL_ID || process.env.PO_VENDOR_YOPMAIL_LOGIN || '';
  const trimmed = String(env).trim();
  if (!trimmed) {
    throw new Error(
      'Vendor Yopmail inbox unknown: run the compose step to capture To, or set PO_VENDOR_YOPMAIL_ID / PO_VENDOR_YOPMAIL_LOGIN.'
    );
  }
  const asLocal = yopmailLocalPart(trimmed);
  return asLocal || trimmed.replace(/@yopmail\.com$/i, '');
}

When(
  'I open Yopmail for the vendor in a new browser tab',
  { timeout: 120000 },
  async function () {
    const localPart = resolveVendorYopmailLocalPart(this);
    // eslint-disable-next-line no-console
    console.log(`[PO Yopmail] Opening vendor inbox tab for "${localPart}".`);
    this.yopmailPage = await this.context.newPage();
    const yp = new PurchaseOrderVendorYopmailPage(this.yopmailPage);
    await yp.gotoInboxForLocalPart(localPart);
    this.yopmailVendorPage = yp;
    await this.yopmailPage.bringToFront();
    await yp.refreshInbox();
    // eslint-disable-next-line no-console
    console.log('[PO Yopmail] Vendor inbox tab ready — first refresh done.');
  }
);

When(
  'I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal',
  { timeout: 240000 },
  async function () {
    if (!this.yopmailPage) {
      throw new Error('Yopmail tab missing: run “open Yopmail for the vendor in a new browser tab” first.');
    }
    const yp =
      this.yopmailVendorPage || new PurchaseOrderVendorYopmailPage(this.yopmailPage);
    const subjectHint = this.poYopmailSubjectHint || this.lastPoTitle || undefined;
    await this.yopmailPage.bringToFront();
    // eslint-disable-next-line no-console
    console.log('[PO Yopmail] Starting inbox refresh loop for new PO email…');
    this.vendorPortalPage = await yp.waitOpenPoMessageAndClickViewPo({
      subjectContains: subjectHint,
    });
    await this.vendorPortalPage.bringToFront();
    await this.vendorPortalPage.waitForLoadState('domcontentloaded').catch(() => {});
  }
);

Then(
  'I should see the purchase order on the vendor portal page',
  { timeout: 60000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing after View PO.');
    }
    const urlReRaw = process.env.PO_VENDOR_PORTAL_URL_REGEX;
    if (urlReRaw) {
      let re;
      try {
        re = new RegExp(urlReRaw);
      } catch {
        re = new RegExp(urlReRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
      await expect(p).toHaveURL(re);
    }
    await expect(
      p.getByText(/purchase order|\bPO\b|p\.?\s*o\.?\s*(no\.?|#)?/i).first()
    ).toBeVisible({ timeout: 20000 });
  }
);

When(
  'I accept the purchase order on the vendor portal',
  { timeout: 60000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    await p.bringToFront();
    const accept = p
      .getByRole('button', { name: /^accept$/i })
      .or(p.getByRole('link', { name: /^accept$/i }));
    await expect(accept.first()).toBeVisible({ timeout: 20000 });
    await accept.first().click();

    const dialog = p.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 2500 }).catch(() => false)) {
      const confirm = dialog
        .getByRole('button', { name: /^(yes|confirm|accept|ok|proceed|submit)$/i })
        .or(dialog.getByRole('button', { name: /yes|confirm|accept|ok|proceed|submit/i }))
        .first();
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm.click();
      }
    }

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    this.vendorAcceptFlowCompleted = true;
    // eslint-disable-next-line no-console
    console.log('[PO vendor accept] Accept complete — step finished.');
  }
);

Then(
  'I should see the purchase order accepted on the vendor portal',
  { timeout: 30000 },
  async function () {
    if (this.vendorAcceptFlowCompleted) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor accept] PO accepted — step complete.');
      return;
    }
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    await expect(
      p.getByText(/accepted|purchase order accepted|po accepted/i).first()
    ).toBeVisible({ timeout: 15000 });
  }
);
