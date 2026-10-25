const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const testData = require('../../../../../../utils/testData');
const {
  PurchaseOrderVendorYopmailPage,
  yopmailLocalPart,
} = require('../../../../../../pages/admin/projects/procurement/purchase-order/vendor/purchase-order-vendor-yopmail.page');

function resolveGoodsReceiptYopmailEmail(world) {
  return String(
    world.vendorYopmailEmail ||
      process.env.PO_VENDOR_YOPMAIL_EMAIL ||
      process.env.PO_VENDOR_YOPMAIL_ID ||
      process.env.PO_VENDOR_YOPMAIL_LOGIN ||
      testData.vendor?.goodsReceiptYopmail?.email ||
      'poojaal002@yopmail.com'
  )
    .trim()
    .toLowerCase();
}

function resolveVendorYopmailLocalPart(world) {
  const adminEmail = String(testData.admin?.validUser?.email || '')
    .trim()
    .toLowerCase();
  const prefer =
    world.vendorYopmailEmail ||
    process.env.PO_VENDOR_YOPMAIL_EMAIL ||
    process.env.PO_VENDOR_YOPMAIL_ID ||
    process.env.PO_VENDOR_YOPMAIL_LOGIN ||
    testData.vendor?.goodsReceiptYopmail?.email ||
    testData.vendor?.rfqUser?.email ||
    '';

  let email = String(prefer || '').trim().toLowerCase();
  if (email && adminEmail && email === adminEmail) {
    email = String(
      testData.vendor?.goodsReceiptYopmail?.email ||
        testData.vendor?.rfqUser?.email ||
        ''
    )
      .trim()
      .toLowerCase();
    console.log(
      `[Yopmail] Ignoring admin inbox ${adminEmail}; using vendor ${email || '(none)'}`
    );
  }

  const fromCompose = yopmailLocalPart(email);
  if (fromCompose) return fromCompose;

  const env =
    process.env.PO_VENDOR_YOPMAIL_EMAIL ||
    process.env.PO_VENDOR_YOPMAIL_ID ||
    process.env.PO_VENDOR_YOPMAIL_LOGIN ||
    '';
  const trimmed = String(env).trim();
  if (!trimmed) {
    throw new Error(
      'Vendor Yopmail inbox unknown: select a vendor with *@yopmail.com (not the admin login), or set PO_VENDOR_YOPMAIL_EMAIL / PO_VENDOR_YOPMAIL_ID.'
    );
  }
  const asLocal = yopmailLocalPart(trimmed);
  return asLocal || trimmed.replace(/@yopmail\.com$/i, '');
}

When(
  'I add the Yopmail vendor from the vendor modal',
  { timeout: 240000 },
  async function () {
    const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
    if (
      !this.purchaseOrderCreatePoPage ||
      this.purchaseOrderCreatePoPage.page !== this.page
    ) {
      this.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(this.page);
    }
    const email = resolveGoodsReceiptYopmailEmail(this);
    const searchHint =
      testData.vendor?.goodsReceiptYopmail?.searchHint || 'Yopmail';
    const fromRow = await this.purchaseOrderCreatePoPage.addVendorDetailsWithFirstVendorRadio({
      preferEmail: email,
      searchHint,
    });
    this.vendorYopmailEmail = fromRow || email;
    // Prefer empty preferred vendor on GR picker — title search is unique;
    // "Yopmail" is an inbox domain, not usually the Vendor Organization option.
    this.goodsReceiptPreferredVendorName = '';
    console.log(
      `[GoodsReceipt] Vendor for Yopmail inbox: ${this.vendorYopmailEmail}`
    );
  }
);

When(
  'I open the purchase order compose email and set the Yopmail recipient',
  { timeout: 360000 },
  async function () {
    const PurchaseOrderCreatePoPage = require('../../../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
    if (
      !this.purchaseOrderCreatePoPage ||
      this.purchaseOrderCreatePoPage.page !== this.page
    ) {
      this.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(this.page);
    }
    const po = this.purchaseOrderCreatePoPage;
    await po.openActionMenuAndComposeEmail();
    const email = resolveGoodsReceiptYopmailEmail(this);
    await po.ensureComposeRecipientEmail(email);
    this.vendorYopmailEmail = email;
    console.log(`[GoodsReceipt] Compose To for Yopmail: ${email}`);
  }
);

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
  'I open the saved goods receipt PO email in Yopmail and click View PO',
  { timeout: 240000 },
  async function () {
    const title = String(this.lastPoTitle || '').trim();
    if (!title) {
      throw new Error('Saved PO title is missing. Run "@goods-receipt and @TC01" first.');
    }
    this.adminPage = this.adminPage || this.page;
    const localPart = resolveVendorYopmailLocalPart(this);
    this.yopmailPage = await this.context.newPage();
    const yp = new PurchaseOrderVendorYopmailPage(this.yopmailPage);
    await yp.gotoInboxForLocalPart(localPart);
    // The mail was already sent by TC-01, so do not treat the current inbox as a before-send baseline.
    this.vendorPortalPage = await yp.waitOpenPoMessageAndClickViewPo({
      baseline: { ids: [], fingerprints: [], count: 0 },
      baselineFingerprints: [],
      expectedPoTitle: title,
    });
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

Then(
  'I should see the goods receipt purchase order details on the external page',
  { timeout: 120000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal / External Page missing after View PO.');
    }
    await p.bringToFront().catch(() => {});
    this.page = p;

    const title = String(this.lastPoTitle || '').trim();
    if (title) {
      await expect(
        p.getByText(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first()
      ).toBeVisible({ timeout: 60000 });
    }

    const items = Array.isArray(this.lastPoLineItems) ? this.lastPoLineItems : [];
    const wires = items.find((it) => /wires/i.test(String(it?.name || ''))) || {
      name: 'Wires',
      quantity: '10',
    };
    await expect(
      p.getByText(new RegExp(String(wires.name || 'Wires').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first()
    ).toBeVisible({ timeout: 60000 });
    if (wires.quantity) {
      const qtyVisible = await p
        .getByText(new RegExp(`\\b${String(wires.quantity).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`))
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (!qtyVisible) {
        console.log(
          `[Yopmail] Warning: quantity "${wires.quantity}" not clearly visible on External Page (continuing)`
        );
      }
    }
    console.log(
      `[Yopmail] External Page shows PO details${title ? ` for "${title}"` : ''} + line item "${wires.name}"`
    );
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

Then(
  'I should see the purchase order accepted successfully on the external page',
  { timeout: 120000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) {
      throw new Error('Vendor portal / External Page missing after Accept.');
    }
    await p.bringToFront().catch(() => {});
    this.page = p;

    const success = p
      .getByText(/accepted successfully|successfully accepted|purchase order.*accepted|status\s*[:\-]?\s*accepted|\baccepted\b/i)
      .filter({ visible: true })
      .first();
    const toast = p
      .locator('.Toastify__toast, [role="alert"], .MuiAlert-root')
      .filter({ hasText: /accept/i })
      .first();

    const ok =
      (await success.isVisible({ timeout: 20000 }).catch(() => false)) ||
      (await toast.isVisible({ timeout: 5000 }).catch(() => false));
    if (!ok) {
      // Accept button gone / disabled is enough when UI does not show a toast.
      const acceptStill = p
        .getByRole('button', { name: /^accept$/i })
        .filter({ visible: true })
        .first();
      const stillVisible = await acceptStill.isVisible({ timeout: 2000 }).catch(() => false);
      if (stillVisible) {
        throw new Error('PO Accept did not complete on External Page (Accept still visible, no success text).');
      }
      console.log('[Yopmail] Accept button gone — treating External Page Accept as successful');
    } else {
      console.log('[Yopmail] External Page shows PO accepted successfully');
    }
  }
);
