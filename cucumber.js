if (process.argv.some((a) => /^po(-tc\d+)?$/i.test(String(a)))) {
  // eslint-disable-next-line no-console
  console.log('[PO] starting (loading PO steps only)…');
}

const SUPPORT_AND_ALL_STEPS = ['support/**/*.js', 'step-definitions/**/*.js'];
const PO_CORE_REQUIRE = [
  'support/hooks.js',
  'support/world.js',
  'support/screenshots.js',
  'step-definitions/admin/common.steps.js',
  'step-definitions/admin/projects/ProjectProfile.steps.js',
];
const PO_REQUIRE = [
  ...PO_CORE_REQUIRE,
  'step-definitions/admin/projects/procurement/purchase-order/**/*.js',
];
const PO_TC04_REQUIRE = [
  ...PO_CORE_REQUIRE,
  'step-definitions/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.steps.js',
  'step-definitions/admin/projects/procurement/purchase-order/create-po/purchase-order-default-terms-template-po.steps.js',
  'step-definitions/admin/projects/procurement/purchase-order/create-po/purchase-order-attachment-po.steps.js',
];
const RFQ_REQUIRE = [
  'support/**/*.js',
  'step-definitions/admin/common.steps.js',
  'step-definitions/admin/projects/ProjectProfile.steps.js',
  'step-definitions/admin/projects/procurement/rfq/**/*.js',
  'step-definitions/admin/projects/procurement/purchase-order/**/*.js',
  'step-definitions/admin/projects/procurement/work-order/**/*.js',
  'step-definitions/admin/projects/design/estimate/estimate.steps.js',
];
const FAST_FORMAT = ['progress'];
const REPORT_FORMAT = ['progress', 'html:reports/cucumber-report.html'];

function poProfile(tags) {
  const requireFiles =
    tags && /@TC04\b/.test(tags) ? PO_TC04_REQUIRE : PO_REQUIRE;
  return {
    require: requireFiles,
    format: FAST_FORMAT,
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/purchase-order/PurchaseOrder_TestCases.feature',
    ],
    ...(tags ? { tags } : {}),
  };
}

function rfqProfile(tags) {
  return {
    require: RFQ_REQUIRE,
    format: FAST_FORMAT,
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/rfq/RFQ_TestCases.feature',
    ],
    ...(tags ? { tags } : {}),
  };
}

module.exports = {
  default: {
    require: SUPPORT_AND_ALL_STEPS,
    format: REPORT_FORMAT,
    publishQuiet: true,
    retry: 0,
  },
  /** Work Order TC-01 — compose send */
  'wo-tc01': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS01 and @TC01',
  },
  /** Work Order TC-02 — action menu Create */
  'wo-tc02': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS01 and @TC02',
  },
  /** Work Order TC-03 — compose send from library */
  'wo-tc03': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS01 and @TC03',
  },
  /** Work Order TC-04 — manual + terms template + Action Create */
  'wo-tc04': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS01 and @TC04',
  },
  /** Work Order TC-05 — manual + ship to address + Action Create */
  'wo-tc05': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS01 and @TC05',
  },
  /** Work Order TC-06 — ~20 manual line items + compose send */
  'wo-tc06': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS01 and @TC06',
  },
  /** Work Order TC-07 — compose send + list ⋮ Preview */
  'wo-tc07': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS02 and @TC07',
  },
  /** Work Order TC-08 — compose send qty 100 + Update progress completed qty 50 */
  'wo-tc08': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
    tags: '@TS02 and @TC08',
  },
  /** Work Order — all create TCs */
  wo: {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature',
    ],
  },
  /** Indent TC-01 — Material Indent create */
  'indent-tc01': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
    tags: '@TS01 and @TC01',
  },
  /** Indent TC-02 — Work Indent create */
  'indent-tc02': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
    tags: '@TS01 and @TC02',
  },
  /** Indent TC-03 — Material Indent + Approver */
  'indent-tc03': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
    tags: '@TS01 and @TC03',
  },
  /** Indent TC-04 — Material Indent create → Preview */
  'indent-tc04': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
    tags: '@TS01 and @TC04',
  },
  /** Indent TC-05 — Material Indent create → Edit → Add Manually */
  'indent-tc05': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
    tags: '@TS01 and @TC05',
  },
  /** Indent TC-06 — Convert Indent → PO → vendor → Compose email */
  'indent-tc06': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
    tags: '@TS01 and @TC06',
  },
  /** Indent — all create TCs */
  indent: {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature',
    ],
  },
  /** Purchase Order — all TCs */
  po: poProfile(),
  /** Purchase Order TC-02 … TC-19 */
  ...Object.fromEntries(
    [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((n) => {
      const id = String(n).padStart(2, '0');
      return [`po-tc${id}`, poProfile(`@TS01 and @TC${id}`)];
    })
  ),
  /** RFQ — all TCs */
  rfq: rfqProfile(),
  /** RFQ TC-01 … TC-19 */
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((n) => {
      const id = String(n).padStart(2, '0');
      return [`rfq-tc${id}`, rfqProfile(`@TS01 and @TC${id}`)];
    })
  ),
  /** Vendor portal — all TCs including TC-11 (unique tag; does not include PO @vendor tests) */
  'vendor-portal': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@vendor-portal',
  },
  /** Estimate — incremental TCs */
  estimate: {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/design/estimate/Estimate_TestCases.feature',
    ],
  },
  /** Estimate TC-01 */
  'estimate-tc01': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/design/estimate/Estimate_TestCases.feature',
    ],
    tags: '@TS01 and @TC01',
  },
  /** Invoice — all create TCs */
  invoice: {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
  },
  /** Invoice TC-01 — Start from Scratch + manual line item */
  'invoice-tc01': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS01 and @TC01',
  },
  /** Credit Note TC-02 — Create Credit Note + line item */
  'invoice-tc02': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS02 and @TC02',
  },
  /** Payment TC-03 — Register Payment against outstanding invoice */
  'invoice-tc03': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS03 and @TC03',
  },
  /** Payment TC-04 — Void invoice from Invoice-tab kebab after register payment */
  'invoice-tc04': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS04 and @TC04',
  },
  /** Invoice TC-05 — Delete invoice from kebab after register payment */
  'invoice-tc05': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS05 and @TC05',
  },
  /** Invoice TC-06 — Preview invoice from kebab after register payment */
  'invoice-tc06': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS06 and @TC06',
  },
  /** Invoice TC-07 — Edit invoice from kebab, increase qty, Update */
  'invoice-tc07': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS07 and @TC07',
  },
  /** Invoice TC-08 — Send invoice email from kebab composer */
  'invoice-tc08': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS08 and @TC08',
  },
  /** Invoice TC-09 — Send invoice email from kebab after create (no payment) */
  'invoice-tc09': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS09 and @TC09',
  },
  /** Invoice TC-10 — Refund credit note from kebab after create */
  'invoice-tc10': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS10 and @TC10',
  },
  /** Invoice TC-11 — Preview created refund from kebab */
  'invoice-tc11': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS11 and @TC11',
  },
  /** Invoice TC-12 — Refund payment from kebab after register payment */
  'invoice-tc12': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS12 and @TC12',
  },
  /** Invoice TC-13 — Create invoice with Pay Now button to client enabled */
  'invoice-tc13': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS13 and @TC13',
  },
  /** Invoice TC-14 — Pay Now from preview with new card after TC-13 create */
  'invoice-tc14': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS14 and @TC14',
  },
  /** Invoice TC-15 — TC-14 plus extra payment terms while creating */
  'invoice-tc15': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    paths: [
      'features/admin/projects/financial/create-invoice/Invoice_TestCases.feature',
    ],
    tags: '@TS15 and @TC15',
  },
  'vendor-all': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@vendor-all',
  },
  'vendor-tc01-tc11': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@vendor-tc01-tc11',
  },
  'customer-portal': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@customer-portal',
  },
  'customer-tc01-tc06': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@customer-tc01-tc06',
  },
  'customer-tc01': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@customer-portal and @TC01',
  },
  'customer-tc01-tc02': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@customer-tc01-tc02',
  },
  'customer-tc01-tc03': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@customer-tc01-tc03',
  },
  'customer-tc03': {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true,
    tags: '@customer-portal and @TC03',
  },
};
