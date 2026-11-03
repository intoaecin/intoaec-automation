const { When, Then } = require('@cucumber/cucumber');
const RFQComposePage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-compose.page');

function getRfqComposePage(world) {
  if (!world.rfqComposePage) {
    world.rfqComposePage = new RFQComposePage(world.page);
  }
  return world.rfqComposePage;
}

When(
  'I open RFQ compose email from Action menu',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.openActionMenuAndComposeEmail();
  }
);

When(
  'I compose and send the RFQ email',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.openActionMenuAndComposeEmail();
    await rfq.sendEmailFromRfqComposeModal();
  }
);

When(
  'I send email from RFQ compose dialog',
  { timeout: 360000 },
  async function () {
    const testData = require('../../../../../../utils/testData');
    const rfq = getRfqComposePage(this);
    const preferEmail = String(
      this.vendorRfqLoginEmail || rfq.lastAddedVendorEmail || testData.vendor?.rfqUser?.email || ''
    ).trim();
    await rfq.sendEmailFromRfqComposeModal({ preferEmail });
    // Never replace the Add-Vendor email with Admin (aadhi) from compose CC.
    const adminEmail = String(testData.admin?.validUser?.email || '').trim().toLowerCase();
    const locked = String(this.vendorRfqLoginEmail || preferEmail || '').trim().toLowerCase();
    const fromCompose = String(rfq.lastAddedVendorEmail || '').trim().toLowerCase();
    if (locked && locked !== adminEmail) {
      this.vendorRfqLoginEmail = locked;
      rfq.lastAddedVendorEmail = locked;
    } else if (fromCompose && fromCompose !== adminEmail) {
      this.vendorRfqLoginEmail = fromCompose;
    }
    console.log(`[RFQ] Stored vendor portal login email: ${this.vendorRfqLoginEmail}`);
  }
);

Then(
  'I should see RFQ compose email success toast',
  { timeout: 240000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.expectRfqComposeEmailSuccessToast();
  }
);

