const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');

/** Create PO flow with Terms & Conditions filled before Action → Compose email. */
class PurchaseOrderTermsAndConditionsPoPage extends PurchaseOrderCreatePoPage {
  /**
   * Compact PO-specific terms (payment, delivery, line items, acceptance). Unique ref per run.
   * Terms are filled quickly via Playwright fill(). For visible keystrokes: PO_TERMS_SLOW_TYPING=1 (optional).
   */
  randomTermsAndConditionsComment() {
    const ref = `PO-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return [
      `Purchase Order ${ref} — vendor supply terms.`,
      'Payment: net 30 days from invoice.',
      'Delivery to the project site on agreed dates; title and risk pass on delivery with receipt.',
      'Scope matches line items on this PO (qty, unit, rate, description); no substitutions without written approval.',
      'Goods subject to inspection on receipt; non-conforming items may be rejected.',
    ].join(' ');
  }
}

module.exports = PurchaseOrderTermsAndConditionsPoPage;
