# -----------------------------------------------------------------------------
# Work Order create — incremental manual TCs in ONE file.
#
# TS-01 Create Work Order — @TS01 @TC01 … @TS01 @TC06
#   TC-01 — manual line item → compose send
#   TC-02 — manual line item → Action → Create
#   TC-03 — add from library (first checkbox, or title+description if library empty) → compose send
#   TC-04 — manual line item → vendor → terms from template → Action → Create
#   TC-05 — manual line item → ship to address → Action → Create
#   TC-06 — ~20 manual line items (Add manually) → Action → Compose email → Send
#
# Run one case (always pass this file path):
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature --tags "@TS01 and @TC01"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature --tags "@TS01 and @TC03"
#
# Run all TS-01:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/work-order/create-wo/WorkOrder_TestCases.feature --tags "@TS01"
#
# npm:
#   npm run test:admin:projects:procurement:workorder:tc01
#   npm run test:admin:projects:procurement:workorder:tc03
#   npm run test:admin:projects:procurement:workorder:tc04
#   npm run test:admin:projects:procurement:workorder:tc05
#   npm run test:admin:projects:procurement:workorder:tc06
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../work-order/create-wo/;
#            step-definitions/.../work-order/create-wo/
# -----------------------------------------------------------------------------

@wo @procurement @create-wo
Feature: Work Order — create WO incremental test cases

  Background:
    Given I am logged in

  # ===========================================================================

  # TS-01 — Create Work Order (@TS01 @TC01 … @TS01 @TC06)
  # ===========================================================================

  # --- TC-01 (manual line item → Action → Compose email → Send) --------------------------
  @TS01 @TC01 @smoke @regression @positive @wo-compose-send
  Scenario: TC-01 — Create work order with manual line item and compose send email
    When I complete the work order compose send journey with title "electrician"
    Then I should see the work order email sent successfully

  # --- TC-02 (manual line item → Action → Create) ----------------------------------------
  @TS01 @TC02 @smoke @regression @positive @wo-create @wo-action-create
  Scenario: TC-02 — Create work order successfully using action menu Create
    When I complete the work order action create journey with title "electrician"
    Then I should see the work order created from action menu success toast

  # --- TC-03 (add from library → or title+description if empty → compose send) ------------
  @TS01 @TC03 @regression @positive @wo-compose-send @wo-add-from-library
  Scenario: TC-03 — Create work order with add from library line item and compose send email
    When I complete the work order compose send from library journey with title "electrician"
    Then I should see the work order email sent successfully

  # --- TC-04 (manual line item → vendor → terms template → Action → Create) ---------------
  @TS01 @TC04 @regression @positive @wo-create @wo-action-create @wo-terms-template
  Scenario: TC-04 — Create work order with manual line item, terms from template, and action menu Create
    When I complete the work order action create with terms template journey with title "electrician"
    Then I should see the work order created from action menu success toast

  # --- TC-05 (manual line item → ship to address → Action → Create) -----------------------
  @TS01 @TC05 @regression @positive @wo-create @wo-action-create @wo-ship-to
  Scenario: TC-05 — Create work order with manual line item, ship to address, and action menu Create
    When I complete the work order action create with ship to journey with title "electrician"
    Then I should see the work order created from action menu success toast

  # --- TC-06 (Add manually ×20 → random details → Action → Compose → Send) ---------------
  @TS01 @TC06 @regression @positive @wo-compose-send @wo-multi-line-item
  Scenario: TC-06 — Create work order with twenty manual line items and compose send email
    When I complete the work order compose send multi line journey with title "electrician" and 20 manual line items
    Then I should see the work order email sent successfully
