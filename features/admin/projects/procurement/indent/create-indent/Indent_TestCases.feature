# -----------------------------------------------------------------------------
# Indent create — incremental manual TCs in ONE file.
#
# TS-01 Create Indent — @TS01 @TC01 … @TS01 @TC06
#   TC-01 — Material Indent → title → line item → unit → Create → success
#   TC-02 — Work Indent → title → line item → unit → Create → success
#   TC-03 — Material Indent → Approver dropdown → title → line item → Create → success
#   TC-04 — Material Indent create → card ⋮ → Preview → preview page visible
#   TC-05 — Material Indent create → card ⋮ → Edit → Add Manually → Labour 2 → Create
#   TC-06 — Material Indent create → Convert Indent → PO → vendor → Rate 10000 → Compose → Send
#
# Run one case:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature --tags "@TS01 and @TC01"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature --tags "@TS01 and @TC02"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature --tags "@TS01 and @TC03"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature --tags "@TS01 and @TC04"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature --tags "@TS01 and @TC05"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/indent/create-indent/Indent_TestCases.feature --tags "@TS01 and @TC06"
#
# npm:
#   npm run test:admin:projects:procurement:indent:tc01
#   npm run test:admin:projects:procurement:indent:tc02
#   npm run test:admin:projects:procurement:indent:tc03
#   npm run test:admin:projects:procurement:indent:tc04
#   npm run test:admin:projects:procurement:indent:tc05
#   npm run test:admin:projects:procurement:indent:tc06
#   npm run test:admin:projects:procurement:indent
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../indent/create-indent/;
#            step-definitions/.../indent/create-indent/
# -----------------------------------------------------------------------------

@indent @procurement @create-indent
Feature: Indent — create indent incremental test cases

  Background:
    Given I am logged in

  # ===========================================================================
  # TS-01 — Create Indent (@TS01 @TC01 … @TS01 @TC06)
  # ===========================================================================

  # --- TC-01 (Material Indent → line item → Create → success) ----------------
  @TS01 @TC01 @smoke @regression @positive @indent-material
  Scenario: TC-01 — Create material indent with line item and verify success message
    When I complete the material indent create journey with title "Electricians" line item "Labour 1" and quantity "20"
    Then I should see the indent created successfully

  # --- TC-02 (Work Indent → line item → Create → success) --------------------
  @TS01 @TC02 @regression @positive @indent-work
  Scenario: TC-02 — Create work indent with line item and verify success message
    When I complete the work indent create journey with title "Electricians" line item "Labour 1" and quantity "20"
    Then I should see the indent created successfully

  # --- TC-03 (Material Indent → Approver → line item → Create → success) -----
  @TS01 @TC03 @regression @positive @indent-material @indent-approver
  Scenario: TC-03 — Create material indent with approver selection and line item
    When I complete the material indent create journey with approver title "Electricians" line item "Labour 1" and quantity "20"
    Then I should see the indent created successfully

  # --- TC-04 (Material Indent create → list ⋮ → Preview) ---------------------
  @TS01 @TC04 @regression @positive @indent-material @indent-preview
  Scenario: TC-04 — Create material indent then open preview from three dot menu
    When I complete the material indent create journey with title "Electricians Preview" line item "Labour 1" and quantity "20"
    Then I should see the indent created successfully
    When I open the three dot menu on the first indent card
    And I click preview in the indent card menu
    Then I should see the indent preview page

  # --- TC-05 (Material Indent create → list ⋮ → Edit → Add Manually) ---------
  @TS01 @TC05 @regression @positive @indent-material @indent-edit
  Scenario: TC-05 — Create material indent then edit and add another line item manually
    When I complete the material indent create journey with title "Electricians Edit" line item "Labour 1" and quantity "20"
    Then I should see the indent created successfully
    When I open the three dot menu on the first indent card
    And I click edit in the indent card menu
    Then I should see the indent edit form displayed
    When I click add manually on the indent form
    And I add an indent manual line item with name "Labour 2" and quantity "20"
    And I select the first available unit on the indent line item
    And I click create on the indent form
    Then I should see the indent created successfully

  # --- TC-06 (Material Indent → Convert Indent → PO → vendor → Rate → Compose → Send) -
  @TS01 @TC06 @regression @positive @indent-material @indent-convert-po
  Scenario: TC-06 — Create material indent then convert to PO with vendor and compose email
    When I complete the material indent create journey with title "Electricians Convert PO" line item "Labour 1" and quantity "20"
    Then I should see the indent created successfully
    When I click convert indent on the first indent card
    And I select PO from the convert indent options
    And I add vendor details with the first vendor on the purchase order from indent
    And I fill rate "10000" on the first purchase order line item from indent
    And I open compose email on the purchase order from indent
    And I send the purchase order email from the indent convert compose dialog
    Then I should see the purchase order email sent successfully from indent convert
