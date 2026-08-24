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
};
