# -----------------------------------------------------------------------------
# Estimate — incremental TCs in ONE file.
#
# TS-01 Create Estimate from scratch and send — @TS01 @TC01
#   TC-01 — Create Estimate → Start from Scratch → AEC section + line item
#           (qty / unit / rate) → title → Action → Compose email
#           → Send as Estimate → Send Email
#
# TS-02 Create Estimate with full line item details — @TS02 @TC02
#   TC-02 — (reuses TC-01) Create Estimate → Start from Scratch → title
#           → section name → Enter Item Name → unit + qty + rate
#           → Action → Compose email → Send as Estimate → Send Email
#
# Run one case (always pass this file path):
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/design/estimate/Estimate_TestCases.feature --tags "@TS01 and @TC01"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/design/estimate/Estimate_TestCases.feature --tags "@TS02 and @TC02"
#
# npm:
#   npm run test:admin:projects:design:estimate
#   npm run test:admin:projects:design:estimate:tc01
#   npm run test:admin:projects:design:estimate:tc02
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../design/estimate/estimate.page.js;
#            step-definitions/.../design/estimate/estimate.steps.js
# -----------------------------------------------------------------------------

@estimate @design
Feature: Estimate — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I click the "Estimate" module card
    And I wait for estimate module to load

  # ===========================================================================
  # TS-01 — Create Estimate from scratch and send (@TS01 @TC01)
  # ===========================================================================
  # --- TC-01 (Create → Start from Scratch → AEC section/item → compose send) ---
  @TS01 @TC01 @smoke @regression @positive @estimate-create @estimate-send
  Scenario: TC-01 — Create estimate from scratch with AEC line item and send as estimate
    When I complete the estimate create from scratch and send as estimate journey
    Then I should see estimate success toast "Estimation created successfully|Email sent successfully"

  # ===========================================================================
  # TS-02 — Create Estimate with full line item details (@TS02 @TC02)
  # ===========================================================================
  @TS02 @TC02 @regression @positive @estimate-create @estimate-send
  Scenario: TC-02 — Create estimate from scratch filling section, unit, qty and rate then send
    When I complete the estimate create from scratch with full line item details and send as estimate
    Then I should see estimate success toast "Estimation created successfully|Email sent successfully"

