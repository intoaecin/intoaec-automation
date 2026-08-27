const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const {
  PurchaseOrderVendorYopmailPage,
  yopmailLocalPart,
} = require('../../../../../../pages/admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-yopmail.page');

function resolveVendorYopmailLocalPart(world) {
  const testData = require('../../../../../../utils/testData');
  const adminEmail = String(testData.admin?.validUser?.email || '')
    .trim()
    .toLowerCase();
  const prefer =
    world.vendorYopmailEmail ||
    process.env.PO_VENDOR_YOPMAIL_ID ||
    process.env.PO_VENDOR_YOPMAIL_LOGIN ||
    testData.vendor?.rfqUser?.email ||
    '';

  let email = String(prefer || '').trim().toLowerCase();
  if (email && adminEmail && email === adminEmail) {
    email = String(testData.vendor?.rfqUser?.email || '').trim().toLowerCase();
    console.log(
      `[Yopmail] Ignoring admin inbox ${adminEmail}; using vendor ${email || '(none)'}`
    );
  }

  const fromCompose = yopmailLocalPart(email);
  if (fromCompose) return fromCompose;

  const env =
    process.env.PO_VENDOR_YOPMAIL_ID || process.env.PO_VENDOR_YOPMAIL_LOGIN || '';
  const trimmed = String(env).trim();
  if (!trimmed) {
    throw new Error(
      'Vendor Yopmail inbox unknown: select a vendor with *@yopmail.com (not the admin login), or set PO_VENDOR_YOPMAIL_ID.'
    );
  }
  const asLocal = yopmailLocalPart(trimmed);
  return asLocal || trimmed.replace(/@yopmail\.com$/i, '');
}

When(
  'I open Yopmail for the vendor in a new browser tab',
  { timeout: 120000 },
  async function () {
    // Keep Admin tab so we can send compose after baselining the inbox.
    this.adminPage = this.adminPage || this.page;

    const localPart = resolveVendorYopmailLocalPart(this);
    this.yopmailPage = await this.context.newPage();
    const yp = new PurchaseOrderVendorYopmailPage(this.yopmailPage);
    await yp.gotoInboxForLocalPart(localPart);

    // Snapshot BEFORE Send whenever possible — only open mails that arrive after this.
    this.yopmailBaseline = await yp.snapshotInboxState();
    this.yopmailBaselineFingerprints = this.yopmailBaseline.fingerprints || [];
    console.log(
      `[Yopmail] Baseline before/at open: count=${this.yopmailBaseline.count}, ids=${this.yopmailBaseline.ids.length}, fps=${this.yopmailBaseline.fingerprints.length}`
    );
  }
);

When(
  'I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal',
  { timeout: 240000 },
  async function () {
    if (!this.yopmailPage) {
      throw new Error('Yopmail tab missing: run “open Yopmail for the vendor in a new browser tab” first.');
    }
    await this.yopmailPage.bringToFront().catch(() => {});
    this.page = this.yopmailPage;

    const yp = new PurchaseOrderVendorYopmailPage(this.yopmailPage);
    // Refresh baseline if somehow empty (inbox slow to load on open).
    if (
      !this.yopmailBaseline ||
      ((this.yopmailBaseline.ids || []).length === 0 &&
        (this.yopmailBaseline.fingerprints || []).length === 0)
    ) {
      this.yopmailBaseline = await yp.snapshotInboxState();
      console.log(
        `[Yopmail] Re-snapshotted baseline: count=${this.yopmailBaseline.count}`
      );
    }

    this.vendorPortalPage = await yp.waitOpenPoMessageAndClickViewPo({
      requireNewMail: true,
      baseline: this.yopmailBaseline,
      baselineFingerprints: this.yopmailBaselineFingerprints || [],
      expectedPoTitle: this.lastPoTitle || '',
    });
  }
);

Then(
  'I should see the purchase order on the vendor portal page',
  { timeout: 120000 },
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
    ).toBeVisible({ timeout: 90000 });

    // Prefer matching the PO we just created (title on portal when shown).
    const title = String(this.lastPoTitle || '').trim();
    if (title) {
      const titleOnPortal = p.getByText(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
      if (await titleOnPortal.isVisible({ timeout: 8000 }).catch(() => false)) {
        console.log(`[Yopmail] Vendor portal shows expected PO title "${title}"`);
      } else {
        console.log(
          `[Yopmail] Warning: PO title "${title}" not visible on vendor portal yet (continuing)`
        );
      }
    }
  }
);

When(
  'I accept the purchase order on the vendor portal',
  { timeout: 120000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal page missing.');
    }
    await p.bringToFront().catch(() => {});
    this.page = p;
    const accept = p
      .getByRole('button', { name: /^accept$/i })
      .or(p.getByRole('link', { name: /^accept$/i }))
      .or(p.getByText(/^accept$/i));
    await expect(accept.first()).toBeVisible({ timeout: 90000 });
    await accept.first().click({ timeout: 20000 });
    // Brief settle so Admin status can flip to Accepted after return.
    await p.waitForTimeout(1500).catch(() => {});
    console.log('[VendorPortal] Clicked Accept on PO — returning to Admin next');
  }
);
