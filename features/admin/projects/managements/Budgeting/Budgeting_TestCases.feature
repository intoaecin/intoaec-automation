# -----------------------------------------------------------------------------
# Budgeting — incremental manual TCs in ONE file.
#
# TS-01 Add schedule → budgeting table   — @TS01 @TC01
# TS-02 Link manual actual budget        — @TS02 @TC02
# TS-03 Delete manual actual budget      — @TS03 @TC03
# TS-04 Link sent estimate               — @TS04 @TC04
# TS-05 Unlink estimate                  — @TS05 @TC05
# TS-06 Send proposal, accept, link      — @TS06 @TC06
# TS-07 Unlink proposal                  — @TS07 @TC07
#
# Amounts: all money values used for add/link must be multiples of 100
# so add/subtract totals on Actual Budget card are easy to validate.
# Default random range (unless overridden): 100–1,000 step 100.
# Estimate item amounts: qty 1 + rate multiple of 100 + profit 0.
#
# UI reference: intoaec-UI/src/features/projectSchedule/components/
#   BudgetView, ActualBudgetCard, BudgetLinkPlannedCost, ManualBudgetTabContent,
#   EstimatesTabContent, ProposalsTabContent, BudgetTable
#
# Categories (UI tags): Asset (ASSET), Labor (LABOR), Material (MATERIAL), Other.
#
# Run one case (always pass this file path):
#   npx cucumber-js features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature --tags "@TS01 and @TC01"
#
# Run all TS-02:
#   npx cucumber-js features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature --tags "@TS02"
#
# Run entire file (one browser session; Background skips repeat login when already on Budgeting):
#   npx cucumber-js features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../Budgeting/BudgetingPage.js;
#            step-definitions/.../Budgeting/BudgetingStep.js
# Schedule child setup reuses Schedule page/steps where possible.
# Estimate / proposal / Yopmail flows reuse existing module steps where possible.
# -----------------------------------------------------------------------------

@budgeting
Feature: Budgeting — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load

  # ===========================================================================
  # TS-01 — Add schedule (1 phase + 2 children) and verify in budgeting table
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Add schedule with 1 phase and 2 children and verify in budgeting bottom table
    When I click back from the project module
    And I click the "Schedule" module card
    And I wait for the schedule module to load
    And I switch schedule to gantt view
    And I open quick add schedule from the gantt sidebar
    Then the gantt sidebar quick add name field should be visible
    When I enter schedule name quick add field with "phase"
    And I confirm quick add schedule with tick in gantt sidebar
    Then I should see schedule "phase" in the gantt sidebar list
    When I add a child schedule named "child 1" under parent "phase"
    And I add a child schedule named "child 2" under parent "phase"
    And I click back from the project module
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    Then I should see schedule "phase" in the budgeting bottom table
    And I should see schedule "child 1" in the budgeting bottom table
    And I should see schedule "child 2" in the budgeting bottom table

  # ===========================================================================
  # TS-02 — Link actual budget manually
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Add manual actual budget and verify Actual Budget card
    When I open the link to actual budget offcanvas
    Then the link to actual budget offcanvas should be open
    When I switch to the manual budget tab in the link offcanvas
    And I fill manual budget name with "budget 1"
    And I enter a random amount multiple of 100 on the manual budget form
    And I choose budget category "Asset" on the manual budget form
    And I click add budget on the manual budget form
    Then I should see manual budget "budget 1" in the link offcanvas
    And manual budget "budget 1" should show Approved status
    When I close the link to actual budget offcanvas
    Then the actual budget card total should include the last linked amount
    And the actual budget card category "Asset" should include the last linked amount
    And the actual budget card unallocated should include the last linked amount

  # ===========================================================================
  # TS-03 — Delete manually added budget
  # ===========================================================================

  @TS03 @TC03 @regression @positive
  Scenario: TC-03 — Add manual budget then delete and verify amounts are deducted
    When I open the link to actual budget offcanvas
    Then the link to actual budget offcanvas should be open
    When I switch to the manual budget tab in the link offcanvas
    And I fill manual budget name with "budget 2"
    And I enter a random amount multiple of 100 on the manual budget form
    And I choose budget category "Asset" on the manual budget form
    And I click add budget on the manual budget form
    Then I should see manual budget "budget 2" in the link offcanvas
    And manual budget "budget 2" should show Approved status
    When I close the link to actual budget offcanvas
    Then the actual budget card total should include the last linked amount
    And the actual budget card category "Asset" should include the last linked amount
    And the actual budget card unallocated should include the last linked amount
    When I open the link to actual budget offcanvas
    And I switch to the manual budget tab in the link offcanvas
    And I delete manual budget "budget 2" from the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should have deducted the last deleted amount
    And the actual budget card category "Asset" should have deducted the last deleted amount
    And the actual budget card unallocated should have deducted the last deleted amount

  # ===========================================================================
  # TS-04 — Link sent estimate
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Create and send estimate then link to actual budget under Material
    When I click back from the project module
    And I select the "Design & Estimates" heading
    And I click the "Estimate" module card
    And I wait for estimate module to load
    And I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate title with "budget estimate 1"
    And I add estimate section "section 1"
    And I add manual estimate item with amount multiple of 100
    And I click estimate action compose email and send
    Then I should see estimate success toast "Estimation created successfully|Email sent successfully"
    When I click back from the project module
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    And I open the link to actual budget offcanvas
    Then the link to actual budget offcanvas should be open
    When I switch to the estimate tab in the link offcanvas
    Then I should see estimate "budget estimate 1" in the link offcanvas
    When I check estimate "budget estimate 1" in the link offcanvas
    And I choose budget category "Material" for estimate "budget estimate 1"
    And I click link cost on the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should include the last linked estimate amount
    And the actual budget card category "Material" should include the last linked estimate amount
    And the actual budget card unallocated should include the last linked estimate amount

  # ===========================================================================
  # TS-05 — Unlink estimate
  # ===========================================================================

  @TS05 @TC05 @regression @positive
  Scenario: TC-05 — Link estimate then unlink and verify amount is removed
    When I click back from the project module
    And I select the "Design & Estimates" heading
    And I click the "Estimate" module card
    And I wait for estimate module to load
    And I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate title with "budget estimate 2"
    And I add estimate section "section 2"
    And I add manual estimate item with amount multiple of 100
    And I click estimate action compose email and send
    Then I should see estimate success toast "Estimation created successfully|Email sent successfully"
    When I click back from the project module
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    And I open the link to actual budget offcanvas
    Then the link to actual budget offcanvas should be open
    When I switch to the estimate tab in the link offcanvas
    Then I should see estimate "budget estimate 2" in the link offcanvas
    When I check estimate "budget estimate 2" in the link offcanvas
    And I choose budget category "Material" for estimate "budget estimate 2"
    And I click link cost on the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should include the last linked estimate amount
    And the actual budget card category "Material" should include the last linked estimate amount
    And the actual budget card unallocated should include the last linked estimate amount
    When I open the link to actual budget offcanvas
    And I switch to the estimate tab in the link offcanvas
    And I uncheck estimate "budget estimate 2" in the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should have deducted the last unlinked estimate amount
    And the actual budget card category "Material" should have deducted the last unlinked estimate amount
    And the actual budget card unallocated should have deducted the last unlinked estimate amount

  # ===========================================================================
  # TS-06 — Send proposal, accept via Yopmail, link under Labor
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Send budgeting proposal, accept from Yopmail, link to actual budget under Labor
    When I click back from the project module
    And I select the "Design & Estimates" heading
    And I click the "Proposal" module card
    And I wait for the proposal workspace to load
    And I open the choose proposal modal
    And I choose proposal template "budgeting" and proceed
    Then I should land on the proposal editor page
    When I click Next on the proposal editor
    And I skip and proceed in the template change dialog
    Then the proposal send preview should be visible
    When I open the proposal send menu
    And I select email from the proposal send menu
    And I copy the compose email recipient and send proposal email
    Then the proposal sent items should show "budgeting" with Sent label
    When I open Yopmail for the copied proposal recipient
    And I wait for proposal email subject "Your Project Proposal Is Ready" and open View Proposal
    And I accept the proposal with a digital signature
    And I return to the application project
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    And I open the link to actual budget offcanvas
    Then the link to actual budget offcanvas should be open
    When I switch to the proposal tab in the link offcanvas
    Then I should see proposal "budgeting" in the link offcanvas
    When I check proposal "budgeting" in the link offcanvas
    And I choose budget category "Labor" for proposal "budgeting"
    And I click link cost on the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should include the last linked proposal amount
    And the actual budget card category "Labor" should include the last linked proposal amount
    And the actual budget card unallocated should include the last linked proposal amount

  # ===========================================================================
  # TS-07 — Unlink proposal
  # ===========================================================================

  @TS07 @TC07 @regression @positive
  Scenario: TC-07 — Link proposal then unlink and verify amount is removed
    When I click back from the project module
    And I select the "Design & Estimates" heading
    And I click the "Proposal" module card
    And I wait for the proposal workspace to load
    And I open the choose proposal modal
    And I choose proposal template "budgeting" and proceed
    Then I should land on the proposal editor page
    When I click Next on the proposal editor
    And I skip and proceed in the template change dialog
    Then the proposal send preview should be visible
    When I open the proposal send menu
    And I select email from the proposal send menu
    And I copy the compose email recipient and send proposal email
    Then the proposal sent items should show "budgeting" with Sent label
    When I open Yopmail for the copied proposal recipient
    And I wait for proposal email subject "Your Project Proposal Is Ready" and open View Proposal
    And I accept the proposal with a digital signature
    And I return to the application project
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    And I open the link to actual budget offcanvas
    Then the link to actual budget offcanvas should be open
    When I switch to the proposal tab in the link offcanvas
    Then I should see proposal "budgeting" in the link offcanvas
    When I check proposal "budgeting" in the link offcanvas
    And I choose budget category "Labor" for proposal "budgeting"
    And I click link cost on the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should include the last linked proposal amount
    And the actual budget card category "Labor" should include the last linked proposal amount
    And the actual budget card unallocated should include the last linked proposal amount
    When I open the link to actual budget offcanvas
    And I switch to the proposal tab in the link offcanvas
    And I uncheck proposal "budgeting" in the link offcanvas
    And I close the link to actual budget offcanvas
    Then the actual budget card total should have deducted the last unlinked proposal amount
    And the actual budget card category "Labor" should have deducted the last unlinked proposal amount
    And the actual budget card unallocated should have deducted the last unlinked proposal amount
