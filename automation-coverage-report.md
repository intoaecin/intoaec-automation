# IntoAEC Playwright Automation Coverage Report

**Assessment date:** 2026-10-25  
**UI source:** `C:/Office Coding Douments/intoaec-UI/src/`  
**Automation source:** `C:/Office Coding Douments/intoaec-automation/`

## 1. Executive Summary

The static comparison identifies **88 user-facing sub-features** across the UI inventory. Of these, **44 are Covered**, **5 are Partial**, **39 are Not Covered**, and **0 are explicitly Skipped/Broken**. Using the requested formula:

| Measure | Calculation | Result |
|---|---:|---:|
| Overall weighted coverage | `(44 + 0.5 × 5) / 88` | **52.8%** |
| Strict coverage | `44 / 88` | **50.0%** |
| Active meaningful automation scenarios | 376 parsed scenarios minus 1 `Placeholder` | **375** |
| Feature files | All `.feature` files | **138** |
| Empty feature files | No `Scenario` or `Scenario Outline` | **58** |

The project is a **Cucumber.js + Playwright** framework using Gherkin feature files, step definitions, and page objects. It does not use native Playwright `test.describe` / `test()` files in the inspected automation tree. The coverage percentage measures feature/sub-feature coverage, not pass rate; the local automation dependencies are not installed, so runtime pass/fail could not be established.

Top risks:

1. **Finance, payments, invoices, subscriptions, bills and expenses:** UI routes/components exist but no meaningful automation was found (`src/features/invoicePayments/`, `src/features/subscription/`, `src/features/billsAndExpenses/`).
2. **Public/customer-facing and authentication edge flows:** forgot password, signup, lead capture, customer portal and client portal are not covered (`src/pages/auth/`, `src/features/leadCapture/`, `src/pages/client/`).
3. **Settings, reports and templates:** 5 settings sub-features, 3 report groups and 3 template groups are represented by empty feature placeholders (`features/admin/settings/`, `features/admin/reports/`, `features/admin/templates/`).

The row-level source-to-test mapping is in [automation-coverage-matrix.csv](./automation-coverage-matrix.csv).

## 2. Coverage by Module

| Module | Total sub-features | Covered | Partial | Not Covered | Skipped | Coverage % |
|---|---:|---:|---:|---:|---:|---:|
| Account & organization | 6 | 6 | 0 | 0 | 0 | 100.0% |
| Authentication | 5 | 3 | 0 | 2 | 0 | 60.0% |
| Client & project | 5 | 2 | 1 | 2 | 0 | 50.0% |
| Communication | 4 | 0 | 1 | 3 | 0 | 12.5% |
| CRM & lead management | 12 | 9 | 3 | 0 | 0 | 87.5% |
| Design & estimating | 9 | 4 | 0 | 5 | 0 | 44.4% |
| Factory | 2 | 0 | 0 | 2 | 0 | 0.0% |
| Finance & payments | 4 | 0 | 0 | 4 | 0 | 0.0% |
| Lead capture | 3 | 0 | 0 | 3 | 0 | 0.0% |
| Procurement | 8 | 6 | 0 | 2 | 0 | 75.0% |
| Project management | 11 | 8 | 0 | 3 | 0 | 72.7% |
| Reports | 3 | 0 | 0 | 3 | 0 | 0.0% |
| Resources | 6 | 4 | 0 | 2 | 0 | 66.7% |
| Settings | 5 | 0 | 0 | 5 | 0 | 0.0% |
| Templates | 3 | 0 | 0 | 3 | 0 | 0.0% |
| Vendor portal | 2 | 2 | 0 | 0 | 0 | 100.0% |
| **Total** | **88** | **44** | **5** | **39** | **0** | **52.8%** |

The strict percentages are Covered ÷ Total: overall **50.0%**. Per-module strict percentages are available by applying the same calculation to the table counts.

## 3. Features Completed for Automation

The following are the completed or partially completed mappings. The detailed CSV contains one row for every inventory sub-feature, including the not-covered items.

| Module | Feature / sub-feature | Test evidence | Status |
|---|---|---|---|
| Authentication | Admin valid and invalid login | `features/admin/auth/login.feature` — `Successful login with valid credentials`; `Login with invalid credentials` | Covered |
| Authentication | Vendor login | `features/vendor/auth/VendorLogin_TestCases.feature` — `TC-01 — Vendor portal login with valid credentials` | Covered |
| Account & organization | Profile, picture, password, organization content and signature | `features/admin/account/My accounts.feature` — `TC-01` through `TC-14` | Covered |
| CRM & lead management | Lead creation and file upload | `features/admin/crm/lead-profile/createLead.feature`; `features/admin/crm/lead-profile/FileUpload.feature` | Covered |
| CRM & lead management | Notes lifecycle and validation | `features/admin/crm/Note/` — create, edit, delete and validation scenarios | Covered |
| CRM & lead management | Call-log lifecycle and validation | `features/admin/crm/CallLog/` — create, edit, delete, UI and validation scenarios | Covered |
| CRM & lead management | Meeting lifecycle | `features/admin/crm/event/` — create, edit, delete, repeat and validation scenarios | Covered |
| CRM & lead management | Proposal lifecycle and comments | `features/admin/crm/proposal/` — send, edit, accepted, declined and comment scenarios | Covered |
| CRM & lead management | Questionnaire lifecycle | `features/admin/crm/questionnaire/` — send, preview, answer, verify and expiry scenarios | Covered |
| Client & project | Project module navigation | `features/admin/projects/ProjectProfile.feature` — `Navigate to a project and interact with modules` | Covered |
| Client & project | Client report | `features/admin/projects/communication/client-report/ClientReport_TestCases.feature` — `TC-01` through `TC-11` | Covered |
| Design & estimating | Estimate create/send/draft/validation | `features/admin/projects/design/estimate/` — 20 active estimate scenarios | Covered |
| Project management | Schedule and milestone lifecycle | `features/admin/projects/managements/Schedule/Schedule_TestCases.feature` — active schedule cases | Covered |
| Project management | Task management | `features/admin/projects/managements/taskmanagement/Task_TestCases.feature` — 52 active cases | Covered |
| Project management | Budgeting | `features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature` — 20 cases | Covered |
| Project management | Daily report | `features/admin/projects/management/DailyReport/Dailyreport.feature` — 9 cases | Covered |
| Project management | Time tracking | `features/admin/projects/managements/timetracking/` — create, edit, delete and expense conversion | Covered |
| Procurement | Indent | `features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature` — 6 cases | Covered |
| Procurement | RFQ and estimate-to-RFQ | `features/admin/projects/procurement/rfq/` — RFQ cases and `start-from-estimate.feature` | Covered |
| Procurement | Purchase order | `features/admin/projects/procurement/purchase-order/PurchaseOrder_TestCases.feature` — 19 cases | Covered |
| Procurement | Work order | `features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature` — 8 cases | Covered |
| Resources | Asset and asset-request flows | `features/admin/resources/Asset/`; `features/admin/resources/AssetRequest/` | Covered |
| Resources | Services and warehouse | `features/admin/resources/ManageServices/Services_TestCases.feature`; `features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature` | Covered |
| Vendor portal | Organization, profile, product and service flows | `features/vendor/auth/VendorLogin_TestCases.feature` — `TC-02` through `TC-10` | Covered |

Partial mappings are deliberately not counted as full coverage: Google integration exercises only the integration path; file viewer automation exercises upload but not the full annotation/share/approval surface; client automation covers lead creation rather than the complete client lifecycle; project communication feature files are placeholders.

## 4. Features Not Completed for Automation

The matrix is the authoritative list. The highest-priority gaps are summarized below; every row has its UI evidence and placeholder/no-test evidence in the CSV.

| Module | Feature / sub-feature | UI evidence | Gap | Priority |
|---|---|---|---|---|
| Authentication | Forgot/reset password | `src/pages/auth/signIn/forgotPassword/index.tsx` | No active feature file mapped | High |
| Authentication | Signup/registration | `src/pages/auth/signUp/index.tsx` | No active feature file mapped | High |
| CRM & lead management | Full drawing annotation/share/approval | `src/features/lead/fileViewer/` | File upload is covered, deeper viewer actions are not | High |
| Client & project | Client portal and financial views | `src/pages/client/profile/` | No active client-portal scenarios | High |
| Design & estimating | BOQ CRUD, design proposal, selections, takeoff, change order | `src/features/boq/`; `src/features/proposals/`; `src/features/Selections/`; `src/features/takeOff/`; `src/features/changeOrder/` | Empty or absent active scenarios | High |
| Project management | Workers, project assets and progress claims | `src/features/worker-management/`; `src/features/asset-management/`; `src/features/projectSchedule/progressClaim/` | Empty feature files or no mapped test | High |
| Procurement | Inventory and goods receipt | `src/features/inventory-management/`; `src/features/GRN/` | Feature files are empty | High |
| Resources | Inventory and worker management | `src/features/inventory-management/`; `src/features/worker-management/` | Feature files are empty | High |
| Settings | Preferences, localization, integrations, User Hub and vendor invite | `src/features/settings/`; `src/features/localization/`; `src/features/integrations/`; `src/features/userHub/`; `src/features/myVendor/` | Corresponding feature files contain no scenarios | High/Medium |
| Reports | All report categories | `src/features/reports/`; `src/features/reportsPage/` | 19 report feature files are empty | Medium |
| Templates | BOQ, estimate, notification, proposal, questionnaire, schedule, tasks, terms | `src/pages/template-center/` | 8 template feature files are empty | Medium |
| Finance & payments | Invoices, receipts, credit notes, bills/expenses, subscriptions | `src/features/invoicePayments/`; `src/features/creditNotes/`; `src/features/billsAndExpenses/`; `src/features/subscription/` | No meaningful active scenarios found | High |
| Communication | Global mail, chat and chatbot | `src/features/globalMail/`; `src/features/chat/`; `src/features/chatbotAI/` | No active scenarios found | Medium/High |
| Lead capture | Public lead forms, V2 and customer portal | `src/features/leadCapture/`; `src/features/leadCaptureV2/`; `src/pages/leadCapture/customer-portal/[leadId].tsx` | No active scenarios found | High |
| Factory | Manufacturing and workshop | `src/features/factoryManagement/`; `src/features/factoryWorkshop/` | No active scenarios found | High/Medium |

## 5. Skipped / Broken Tests

No `test.skip`, `test.fixme`, `test.only`, or native Playwright test markers were found in the inspected automation source. No row was therefore classified as Skipped/Broken.

There are, however, two important non-coverage conditions:

| Condition | Evidence | Treatment |
|---|---|---|
| 58 feature files have no scenario declaration | `features/admin/` subtrees including settings, reports, templates and several module placeholders | Not counted as coverage |
| Explicit placeholder scenario | `features/admin/projects/management/Budgeting.feature` — `Scenario: Placeholder` | Parsed for inventory but excluded from meaningful active-test count and not counted as feature coverage |

The command `npx cucumber-js --dry-run --format summary` could not be completed because `node_modules` is absent and `npx` attempted to install an unrelated placeholder `cucumber-js@1.0.0`. This is an environment/setup limitation, not evidence that the scenarios pass or fail.

## 6. Automation Framework Observations

### Structure

- Page objects are organized under `pages/admin/...` and `pages/vendor/...`; the static inventory contains **156 JavaScript page-object files**.
- Gherkin files live under `features/admin/...` and `features/vendor/...`; step definitions are under the corresponding `step-definitions/...` paths. There are **145 step-definition JavaScript files**.
- Shared lifecycle, screenshots, world state and Google integration helpers are under `support/`; reusable test data and upload fixtures are under `utils/` and `fixtures/`.
- `cucumber.js` defines default and targeted profiles for purchase orders, RFQs, work orders, indents and other modules. `package.json` exposes module- and test-case-specific commands.

### Configuration

- `playwright.config.js` sets `timeout: 60000`, `actionTimeout: 15000`, `navigationTimeout: 30000`, and `retries: 0`.
- Browser projects are not declared in `playwright.config.js`; the inspected config therefore does not establish Chromium/Firefox/WebKit cross-browser coverage.
- Environment and page URL configuration is centralized in `config/env.js` and `config/urls.js`, as reinforced by `AGENTS.md`.
- No CI workflow was found in the automation project during the static scan; CI execution is therefore not evidenced by this report.

### Quality and maintainability signals

- Accessibility-oriented selectors are widely used: static counts found approximately 1,910 `getByRole` and 156 `getByLabel` references across JavaScript automation files.
- There are approximately 339 `waitForTimeout` references. These hard waits are a likely flakiness and runtime-cost risk and should be replaced with condition-based waits where possible.
- Test data and fixture usage are present (`utils/testData.js`, validation data fixtures, PDF and unsupported-file fixtures, Google storage-state helper), but the report does not claim isolation or cleanup because that requires runtime execution and environment inspection.
- Assertions are implemented inside page objects/steps in many active modules, but several broad navigation or placeholder features cannot demonstrate outcome assertions; they are classified Partial or Not Covered accordingly.

## 7. Recommendations

1. **High / S:** Install the pinned dependencies from `intoaec-automation/package-lock.json`, run a Cucumber dry-run using the local `@cucumber/cucumber` binary, and publish the first baseline report.
2. **High / M:** Add authentication recovery, signup, session/logout and client/customer portal coverage using `src/pages/auth/` and `src/pages/client/` as the source of truth.
3. **High / L:** Automate finance and payment journeys: invoices, bills/expenses, credit notes, receipts and subscription checkout under `src/features/invoicePayments/`, `src/features/billsAndExpenses/`, `src/features/creditNotes/` and `src/features/subscription/`.
4. **High / M:** Complete procurement/resource gaps: inventory, goods receipt, worker management and project assets; these create or change operational data.
5. **High / L:** Add BOQ, proposal builder, takeoff, selections, change-order and progress-claim workflows, including validation and destructive-action confirmation.
6. **Medium / M:** Replace empty settings, reports and template feature files with one smoke scenario per page, then add CRUD/filter/export/permission cases where the UI supports them.
7. **Medium / M:** Add explicit role/permission scenarios and verify denied access, because the UI inventory contains account, vendor, client and admin surfaces but the current mapping does not prove authorization boundaries.
8. **Medium / M:** Reduce `waitForTimeout` usage and add deterministic network/UI readiness helpers; retain longer timeouts only for documented slow flows.
9. **Medium / S:** Declare browser projects explicitly in `playwright.config.js` and add CI execution with artifacts for the Cucumber HTML report, screenshots and traces.
10. **Low / S:** Keep the CSV matrix as a living traceability artifact and require every new UI route or user action to add a linked feature scenario.

## 8. Methodology & Assumptions

- UI inventory was derived from route files under `src/pages/`, domain folders under `src/features/`, page-level components, and the visible CRUD/workflow naming in those files. Low-level implementation helpers and UI unit-test/storybook files were not counted as independent user features.
- A “sub-feature” is a meaningful user action or workflow boundary: create, edit, delete, send, approve, reject, validate, filter/search, import/export, or a distinct page/module workflow. Internal API hooks were used as evidence of action boundaries, not counted one-for-one when they represented the same user action.
- A row is **Covered** only when an active scenario and page-object/step implementation represent the action and assert a meaningful result. A row is **Partial** when only one path or a subset of the action surface is automated.
- A feature file with no scenario is not coverage. A placeholder scenario is not meaningful coverage. No tests were marked Skipped/Broken because no skip/fixme/only markers were found statically.
- Matching used feature names, scenario names, route/module names, page-object organization and step-definition paths. Because the UI and automation projects do not share a machine-readable traceability ID, uncertain relationships are marked Partial or Not Covered rather than inferred as Covered.
- The percentages are source-coverage estimates, not execution results. Runtime behavior, pass rate, authentication data validity, API responses and environment-dependent flows require a test run.

## Source inventory summary

| Source | Evidence |
|---|---|
| UI routes | `intoaec-UI/src/pages/` — 259 `.tsx` page files found |
| UI feature domains | `intoaec-UI/src/features/` — 76 top-level directories found |
| Automation feature files | `intoaec-automation/features/` — 138 `.feature` files |
| Automation scenarios | `Scenario` / `Scenario Outline` declarations — 376 parsed |
| Page objects | `intoaec-automation/pages/` — 156 `.js` files |
| Step definitions | `intoaec-automation/step-definitions/` — 145 `.js` files |
| Config/helpers | `playwright.config.js`, `cucumber.js`, `config/`, `support/`, `fixtures/`, `utils/` |
