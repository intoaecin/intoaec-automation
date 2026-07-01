module.exports = {
  default: {
    require: ['support/**/*.js', 'step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
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
};
