# -----------------------------------------------------------------------------
# Budgeting — incremental manual TCs in ONE file.
#
# TS-01 Add schedule → budgeting table   — @TS01 @TC01
# TS-02 Link manual actual budget        — @TS02 @TC02
# TS-03 Delete manual actual budget      — @TS03 @TC03
# TS-04 Link estimate / proposal         — @TS04 @TC04 … @TS04 @TC07
#   TC-04 Link sent estimate
#   TC-05 Unlink estimate
#   TC-06 Send proposal, accept, link
#   TC-07 Unlink proposal
# TS-05 Allocate contingency             — @TS05 @TC08 … @TS05 @TC09
# TS-06 Add contingency                  — @TS06 @TC10 … @TS06 @TC11
# TS-07 Add actual budget on schedule    — @TS07 @TC12
# TS-08 Split actual budget to children  — @TS08 @TC13
# TS-09 Link / delete manual cost        — @TS09 @TC14 … @TS09 @TC15
# TS-10 Bills & expenses cost link       — @TS10 @TC16 … @TS10 @TC17
# TS-11 Split actual cost to children    — @TS11 @TC18
# TS-12 Budget / cost over-limit errors  — @TS12 @TC19 … @TS12 @TC20
#
# Amounts: all money values used for add/link must be multiples of 100
# so add/subtract totals on Actual Budget card are easy to validate.
# Default random range (unless overridden): 100–1,000 step 100.
# Estimate item amounts: qty + unit + rate (multiple of 100) + profit 0 via cell fill
# (same Qty/Unit/Rate pattern as estimate 05_second_section). Compose: Action →
# Compose email → Send as Estimate → Send Email.
# Contingency fixtures: allocate 10% or fixed 1000; add contingency 100 or 10%.
# TC-12: enter 500 on phase actual budget; assert unallocated decreases by 500.
#
# UI reference: intoaec-UI/src/features/projectSchedule/components/
#   BudgetView, ActualBudgetCard, BudgetLinkPlannedCost, ManualBudgetTabContent,
#   EstimatesTabContent, ProposalsTabContent, BudgetTable, ContingencyPopUp,
#   BudgetContingency, ActualCostCard, BudgetLinkActualCost
#
# Categories (UI tags): Asset (ASSET), Labor (LABOR), Material (MATERIAL), Other.
#
# Run one case (always pass this file path):
#   npx cucumber-js features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature --tags "@TS01 and @TC01"
#
# Run all TS-05:
#   npx cucumber-js features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature --tags "@TS05"
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
    And I click the "Budgeting" module card
    And I wait for the budgeting module to load

  # ===========================================================================
  # TS-01 — Add schedule (1 phase + 2 children) and verify in budgeting table
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Add schedule with 1 phase and 2 children and verify in budgeting bottom table
    When I click back from the project module
    And I select the "Project Management" heading
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
    And I switch schedule to the Budget tab
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
  # TS-04 — Link estimate / proposal (@TS04 @TC04 … @TS04 @TC07)
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

  @TS04 @TC05 @regression @positive
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

  @TS04 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Send budgeting proposal, accept from Yopmail, link to actual budget under Labor
    When I click back from the project module
    And I select the "Design & Estimates" heading
    And I click the "Proposal" module card
    And I wait for the proposal workspace to load
    And I open the choose proposal modal
    And I select "All" in the proposal category dropdown
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

  @TS04 @TC07 @regression @positive
  Scenario: TC-07 — Link proposal then unlink and verify amount is removed
    When I click back from the project module
    And I select the "Design & Estimates" heading
    And I click the "Proposal" module card
    And I wait for the proposal workspace to load
    And I open the choose proposal modal
    And I select "All" in the proposal category dropdown
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

  # ===========================================================================
  # TS-05 — Allocate contingency (@TS05 @TC08 … @TS05 @TC09)
  # ===========================================================================

  @TS05 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Allocate contingency as 10 percent
    When I open the allocate contingency popup
    Then the allocate contingency popup should be open
    When I choose contingency allocation method "Percentage"
    And I enter contingency allocate percentage "10"
    Then the allocate contingency calculated amount should be 10 percent of actual budget total
    When I click allocate contingency
    Then the actual budget card should show contingency percentage "10"
    And the actual budget card contingency amount should match 10 percent of actual budget total
    When I open the add contingency offcanvas
    Then the total contingency pool should match the allocated contingency amount

  @TS05 @TC09 @regression @positive
  Scenario: TC-09 — Allocate contingency as fixed amount 1000
    When I open the allocate contingency popup
    Then the allocate contingency popup should be open
    When I choose contingency allocation method "Fixed Amount"
    And I enter contingency allocate fixed amount "1000"
    Then the allocate contingency calculated percentage should match fixed amount "1000" of actual budget total
    When I click allocate contingency
    Then the actual budget card should show contingency amount "1000"
    And the actual budget card contingency percentage should match fixed amount "1000" of actual budget total
    When I open the add contingency offcanvas
    Then the total contingency pool should equal "1000"

  # ===========================================================================
  # TS-06 — Add contingency (@TS06 @TC10 … @TS06 @TC11)
  # ===========================================================================

  @TS06 @TC10 @smoke @regression @positive
  Scenario: TC-10 — Add contingency fixed amount 100
    When I open the add contingency offcanvas
    Then the add contingency offcanvas should be open
    When I choose add contingency mode "Fixed Amount"
    And I enter add contingency amount "100"
    Then the contingency budget impact should show plus amount "100"
    And the contingency budget impact percent of available should be correct for amount "100"
    When I enter add contingency reason "automation fixed contingency"
    And I click add contingency submit
    And I open the add contingency offcanvas
    And I switch to contingency approval review tab
    Then the contingency approval review should show rate amount "100"
    When I close the add contingency offcanvas
    Then the actual budget card total should have increased by contingency amount "100"
    And the actual budget card should show contingency used amount "100"

  @TS06 @TC11 @regression @positive
  Scenario: TC-11 — Add contingency as 10 percent of available
    When I open the add contingency offcanvas
    Then the add contingency offcanvas should be open
    When I choose add contingency mode "Percentage"
    And I enter add contingency percentage "10"
    Then the contingency budget impact should show plus amount for 10 percent of available
    When I enter add contingency reason "automation percent contingency"
    And I click add contingency submit
    And I open the add contingency offcanvas
    And I switch to contingency approval review tab
    Then the contingency approval review should show the last added contingency amount
    When I close the add contingency offcanvas
    Then the actual budget card total should have increased by the last added contingency amount
    And the actual budget card should show contingency used equal to the last added contingency amount

  # ===========================================================================
  # TS-07 — Add actual budget on schedule table (@TS07 @TC12)
  # ===========================================================================

  @TS07 @TC12 @smoke @regression @positive
  Scenario: TC-12 — Add actual budget 500 on phase and verify unallocated
    When I set actual budget "500" on schedule "phase" in the budgeting table
    Then the actual budget card unallocated should have decreased by "500"

  # ===========================================================================
  # TS-08 — Split actual budget to children (@TS08 @TC13)
  # ===========================================================================

  @TS08 @TC13 @regression @positive
  Scenario: TC-13 — Split phase actual budget equally to child schedules
    When I set actual budget "500" on schedule "phase" in the budgeting table
    And I split schedule "phase" actual budget equally to child schedules
    Then no budgeting error toast should be visible

  # ===========================================================================
  # TS-09 — Link / delete manual actual cost (@TS09 @TC14 … @TS09 @TC15)
  # ===========================================================================

  @TS09 @TC14 @smoke @regression @positive
  Scenario: TC-14 — Add manual actual cost under Asset for phase
    When I open link actual costs for schedule "phase"
    Then the link actual costs offcanvas should be open
    When I switch to the add manual cost tab
    And I fill manual cost name with "manual cost 1"
    And I enter a random amount multiple of 100 on the manual cost form
    And I choose cost category "Asset" on the manual cost form
    And I click add expense on the manual cost form
    Then I should see manual cost "manual cost 1" in the link actual costs offcanvas
    When I close the link actual costs offcanvas
    Then the actual cost card total should include the last linked cost amount
    And the actual cost card category "Asset" should include the last linked cost amount
    And the budgeting table actual cost for schedule "phase" should include the last linked cost amount

  @TS09 @TC15 @regression @positive
  Scenario: TC-15 — Add then delete manual actual cost under Material
    When I open link actual costs for schedule "phase"
    Then the link actual costs offcanvas should be open
    When I switch to the add manual cost tab
    And I fill manual cost name with "manual cost 2"
    And I enter a random amount multiple of 100 on the manual cost form
    And I choose cost category "Material" on the manual cost form
    And I click add expense on the manual cost form
    Then I should see manual cost "manual cost 2" in the link actual costs offcanvas
    When I close the link actual costs offcanvas
    Then the actual cost card total should include the last linked cost amount
    And the actual cost card category "Material" should include the last linked cost amount
    And the budgeting table actual cost for schedule "phase" should include the last linked cost amount
    When I open link actual costs for schedule "phase"
    And I switch to the add manual cost tab
    And I delete manual cost "manual cost 2" from the link actual costs offcanvas
    And I close the link actual costs offcanvas
    Then the actual cost card total should have deducted the last deleted cost amount
    And the actual cost card category "Material" should have deducted the last deleted cost amount
    And the budgeting table actual cost for schedule "phase" should have deducted the last deleted cost amount

  # ===========================================================================
  # TS-10 — Bills & expenses cost link (@TS10 @TC16 … @TS10 @TC17)
  # ===========================================================================

  @TS10 @TC16 @smoke @regression @positive
  Scenario: TC-16 — Create expense and link to actual costs under Labor
    When I click back from the project module
    And I select the "Financial" heading
    And I click the "Bills & Expenses" module card
    And I wait for bills and expenses module to load
    And I create an expense from scratch named "budget expense 1" with amount multiple of 100
    Then expense "budget expense 1" should be visible with the last expense amount
    When I click back from the project module
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    And I open link actual costs for schedule "phase"
    Then the link actual costs offcanvas should be open
    When I switch to the bills and expenses tab
    Then I should see expense "budget expense 1" in the link actual costs offcanvas
    When I check expense "budget expense 1" in the link actual costs offcanvas
    And I choose cost category "Labor" for expense "budget expense 1"
    And I click link to actual costs
    Then expense "budget expense 1" should be checked in the link actual costs offcanvas
    When I close the link actual costs offcanvas
    Then the actual cost card total should include the last linked expense amount
    And the actual cost card category "Labor" should include the last linked expense amount
    And the budgeting table actual cost for schedule "phase" should include the last linked expense amount

  @TS10 @TC17 @regression @positive
  Scenario: TC-17 — Link then unlink expense under Other
    When I click back from the project module
    And I select the "Financial" heading
    And I click the "Bills & Expenses" module card
    And I wait for bills and expenses module to load
    And I create an expense from scratch named "budget expense 2" with amount multiple of 100
    Then expense "budget expense 2" should be visible with the last expense amount
    When I click back from the project module
    And I select the "Project Management" heading
    And I navigate to the budgeting module
    And I wait for the budgeting module to load
    And I open link actual costs for schedule "phase"
    Then the link actual costs offcanvas should be open
    When I switch to the bills and expenses tab
    Then I should see expense "budget expense 2" in the link actual costs offcanvas
    When I check expense "budget expense 2" in the link actual costs offcanvas
    And I choose cost category "Other" for expense "budget expense 2"
    And I click link to actual costs
    Then expense "budget expense 2" should be checked in the link actual costs offcanvas
    When I close the link actual costs offcanvas
    Then the actual cost card total should include the last linked expense amount
    And the actual cost card category "Other" should include the last linked expense amount
    And the budgeting table actual cost for schedule "phase" should include the last linked expense amount
    When I open link actual costs for schedule "phase"
    And I switch to the bills and expenses tab
    And I uncheck expense "budget expense 2" in the link actual costs offcanvas
    And I close the link actual costs offcanvas
    Then the actual cost card total should have deducted the last unlinked expense amount
    And the actual cost card category "Other" should have deducted the last unlinked expense amount
    And the budgeting table actual cost for schedule "phase" should have deducted the last unlinked expense amount

  # ===========================================================================
  # TS-11 — Split actual cost to children (@TS11 @TC18)
  # ===========================================================================

  @TS11 @TC18 @regression @positive
  Scenario: TC-18 — Split phase actual cost equally to child schedules
    When I split schedule "phase" actual cost equally to child schedules
    Then no budgeting error toast should be visible

  # ===========================================================================
  # TS-12 — Over / under limit on child budget and cost (@TS12 @TC19 … @TS12 @TC20)
  # ===========================================================================

  @TS12 @TC19 @regression @positive
  Scenario: TC-19 — Child actual budget over parent then reduce by 5 and save
    When I set actual budget on child schedule "child 1" to 1 more than its current amount
    Then a budgeting error toast should be visible
    When I reduce the open actual budget edit by "5" and save
    Then the budgeting table actual budget for schedule "child 1" should be saved

  @TS12 @TC20 @regression @positive
  Scenario: TC-20 — Child actual cost over parent then reduce by 5 and save
    When I set actual cost on child schedule "child 1" to 1 more than its current amount
    Then a budgeting error toast should be visible
    When I reduce the open actual cost edit by "5" and save
    Then the budgeting table actual cost for schedule "child 1" should be saved
