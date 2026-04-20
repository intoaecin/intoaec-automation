const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const RFQComposePage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-compose.page');
const {
  RfqVendorYopmailPage,
  yopmailLocalPart,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-yopmail.page');
const {
  RfqVendorPortalPriceUpdatePage,
} = require('../../../../../../pages/admin/projects/procurement/rfq/rfq-vendor/rfq-vendor-portal-price-update.page');

function resolveVendorYopmailLocalPart(world) {
  const fromCompose = yopmailLocalPart(world.vendorYopmailEmail);
  if (fromCompose) return fromCompose;

  const env =
    process.env.RFQ_VENDOR_YOPMAIL_ID || process.env.RFQ_VENDOR_YOPMAIL_LOGIN || '';
  const trimmed = String(env).trim();
  if (!trimmed) {
    throw new Error(
      'RFQ vendor Yopmail inbox unknown: capture vendor Yopmail from the compose To field, or set RFQ_VENDOR_YOPMAIL_ID / RFQ_VENDOR_YOPMAIL_LOGIN.'
    );
  }

  const asLocal = yopmailLocalPart(trimmed);
  return asLocal || trimmed.replace(/@yopmail\.com$/i, '');
}

When(
  'I compose and send the RFQ email capturing vendor Yopmail from the To field',
  { timeout: 240000 },
  async function () {
    const rfq = new RFQComposePage(this.page);
    await rfq.waitForComposeEmailModalReady();

    if (!this.vendorYopmailEmail) {
      this.vendorYopmailEmail = await rfq.readYopmailAddressFromComposeDialog();
    }

    // Keep subject hint so Yopmail opens the correct (newest) message.
    this.rfqYopmailSubjectHint = this.lastRfqTitle;

    await rfq.sendEmailFromRfqComposeModal();
    await rfq.expectRfqComposeEmailSuccessToast();
  }
);

When(
  'I open Yopmail for the RFQ vendor in a new browser tab',
  { timeout: 120000 },
  async function () {
    const localPart = resolveVendorYopmailLocalPart(this);
    this.yopmailPage = await this.context.newPage();
    const yp = new RfqVendorYopmailPage(this.yopmailPage);
    await yp.gotoInboxForLocalPart(localPart);
  }
);

When(
  'I wait for the RFQ email in Yopmail open the message and click View RFQ for the vendor portal',
  { timeout: 300000 },
  async function () {
    if (!this.yopmailPage) {
      throw new Error(
        'Yopmail tab missing: run “open Yopmail for the RFQ vendor in a new browser tab” first.'
      );
    }
    const yp = new RfqVendorYopmailPage(this.yopmailPage);
    const subjectHint = this.rfqYopmailSubjectHint || this.lastRfqTitle || undefined;
    this.vendorPortalPage = await yp.waitOpenRfqMessageAndClickViewRfq({
      subjectContains: subjectHint,
    });
  }
);

Then('I should see the RFQ on the vendor portal page', { timeout: 180000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) throw new Error('Vendor portal page missing after View RFQ.');
  const vp = new RfqVendorPortalPriceUpdatePage(p);
  await vp.waitForVendorRfqPageToLoad();

  const urlReRaw = process.env.RFQ_VENDOR_PORTAL_URL_REGEX;
  if (urlReRaw) {
    let re;
    try {
      re = new RegExp(urlReRaw);
    } catch {
      re = new RegExp(urlReRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    await expect(p).toHaveURL(re);
  }
});

When(
  'I update the RFQ vendor price and submit the update',
  { timeout: 240000 },
  async function () {
    const p = this.vendorPortalPage;
    if (!p) throw new Error('Vendor portal page missing.');
    const vp = new RfqVendorPortalPriceUpdatePage(p);
    const value = '10000';
    this.lastRfqVendorPortalPriceValue = value;
    await vp.fillFirstVisiblePriceField(value);
    await vp.clickUpdatePriceButton();
  }
);

Then('I should see the RFQ vendor price update success', { timeout: 180000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) throw new Error('Vendor portal page missing.');
  const vp = new RfqVendorPortalPriceUpdatePage(p);
  await vp.expectPriceUpdateSuccess();
});

When('I close the RFQ vendor portal tab', { timeout: 60000 }, async function () {
  const p = this.vendorPortalPage;
  if (!p) return;
  await p.close().catch(() => {});

  // Bring focus back to the admin RFQ page and refresh the list so
  // the newly converted/updated RFQ card becomes visible.
  // Scope behavior: only the Vendor-to-PO scenario needs "click first card".
  // Other RFQ vendor scenarios (comment/price-only) shouldn't be affected.
  const isVendorToPo = /Vendor\s*to\s*PO/i.test(String(this.lastRfqTitle || ''));
  if (isVendorToPo) {
    process.env.RFQ_LIST_SELECT_FIRST_CARD = 'true';
  } else {
    delete process.env.RFQ_LIST_SELECT_FIRST_CARD;
  }
  const main = this.page;
  await main.bringToFront().catch(() => {});
  await main.waitForTimeout(500).catch(() => {});
  await main.reload().catch(() => {});
  await main.waitForLoadState('domcontentloaded').catch(() => {});
  await main.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
});

