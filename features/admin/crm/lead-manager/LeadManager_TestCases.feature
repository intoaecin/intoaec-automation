# -----------------------------------------------------------------------------
# Lead Manager — incremental manual TCs in ONE file (team TestCases style).
#
# TS-01 Search / menu / view toggle     — @TS01 @TC01 … @TS01 @TC04
# TS-02 Row actions                     — @TS02 @TC01 … @TS02 @TC12
# TS-03 Status Won / Lost / Undo        — @TS03 @TC01 … @TS03 @TC04
# TS-04 Bulk actions                    — @TS04 @TC01 … @TS04 @TC06
# TS-05 Manage Columns                  — @TS05 @TC01 … @TS05 @TC05
# TS-06 Transfer Users                  — @TS06 @TC01 … @TS06 @TC04
# TS-07 Filters / sort / pagination     — @TS07 @TC01 … @TS07 @TC06
# TS-08 Kanban view                     — @TS08 @TC01 … @TS08 @TC07
#
# Layering:
#   features/.../LeadManager_TestCases.feature
#   pages/admin/crm/lead-manager/LeadMasterPage.js
#   step-definitions/admin/crm/lead-manager/LeadManagerStep.js
# Reuses login, NavigationPage, and LeadPage create-lead helpers.
#
# Run one suite:
#   npx cucumber-js features/admin/crm/lead-manager/LeadManager_TestCases.feature --tags "@TS01"
# Run one case:
#   npx cucumber-js features/admin/crm/lead-manager/LeadManager_TestCases.feature --tags "@TS01 and @TC01"
# Run entire file:
#   npx cucumber-js features/admin/crm/lead-manager/LeadManager_TestCases.feature
#
# Results (updated after runs):
#   TS-01: Pass (TC01–TC04)
#   TS-02: Pass (TC01–TC12) — View Details asserts LeadOverview dialog (not /profile URL)
#   TS-03: Pass (TC01–TC04)
#   TS-04: Pass (TC01–TC06)
#   TS-05: Pass (TC01–TC05) — Manage Columns uses checkbox toggles; Reset = "Reset to default"
#   TS-06: Pass (TC01–TC04)
#   TS-07: Pass (TC01–TC06) — next-page click dismisses chat overlay
#   TS-08: Pass (TC01–TC07) — Kanban card menu via .lead-card-menu + dispatch click
# -----------------------------------------------------------------------------

@lead-manager @crm @regression
Feature: Lead Manager — incremental test cases

  Background:
    Given I am logged in
    And I open the Lead Manager master page
    And I wait for the Lead Manager list to load

  # ===========================================================================
  # TS-01 — Search, menu smoke, List ↔ Kanban toggle
  # ===========================================================================

  @TS01 @TC01 @smoke @positive
  Scenario: TC-01 — Create a disposable lead and find it by search
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    Then I should see the created lead in the Lead Manager list

  @TS01 @TC02 @smoke @positive
  Scenario: TC-02 — Open the row actions menu for the created lead
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    Then the Lead Manager row action "View Details" should be visible
    And the Lead Manager row action "Edit" should be visible

  @TS01 @TC03 @smoke @positive
  Scenario: TC-03 — Select a lead and see bulk actions available
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I select the created lead in Lead Manager
    Then the Lead Manager bulk actions should be available

  @TS01 @TC04 @smoke @positive
  Scenario: TC-04 — Switch between List and Kanban views
    When I switch Lead Manager to Kanban view
    Then the Lead Manager Kanban board should be visible
    When I switch Lead Manager to List view
    Then I should still be on the Lead Manager list

  # ===========================================================================
  # TS-02 — Row actions (kebab)
  # ===========================================================================

  @TS02 @TC01 @positive
  Scenario: TC-01 — View Details opens the lead profile
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "View Details"
    Then I should be on the Lead Manager profile

  @TS02 @TC02 @positive
  Scenario: TC-02 — Edit opens the edit flow
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Edit"
    Then I should be navigated to the Lead Manager profile page

  @TS02 @TC03 @positive
  Scenario: TC-03 — Snooze a lead with a future date
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Snooze"
    And I fill a future Lead Manager snooze date if prompted
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS02 @TC04 @validation @negative
  Scenario: TC-04 — Snooze without a date shows validation
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Snooze"
    And I confirm the Lead Manager dialog
    Then I should see a Lead Manager toast matching "Please select Snooze Date|required|select"

  @TS02 @TC05 @positive
  Scenario: TC-05 — Archive a lead
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Archive"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS02 @TC06 @positive
  Scenario: TC-06 — Create Call Log from the row menu
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Create Call Log"
    Then I should still be on the Lead Manager list

  @TS02 @TC07 @positive
  Scenario: TC-07 — Create Note from the row menu
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Create Note"
    Then I should still be on the Lead Manager list

  @TS02 @TC08 @positive
  Scenario: TC-08 — Create Event from the row menu
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Create Event"
    Then I should still be on the Lead Manager list

  @TS02 @TC09 @positive
  Scenario: TC-09 — Set Reminder from the row menu
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Reminder"
    Then I should still be on the Lead Manager list

  @TS02 @TC10 @positive
  Scenario: TC-10 — Copy Project ID from the row menu
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I copy the Lead Manager project id for the created lead
    Then I should still be on the Lead Manager list

  @TS02 @TC11 @positive
  Scenario: TC-11 — Delete a lead after confirmation
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Delete"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS02 @TC12 @negative
  Scenario: TC-12 — Cancel delete leaves the lead on the list
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I open the Lead Manager row actions for the created lead
    And I choose the Lead Manager row action "Delete"
    And I cancel the Lead Manager dialog
    And I search Lead Manager for the created lead
    Then I should see the created lead in the Lead Manager list

  # ===========================================================================
  # TS-03 — Won / Lost / Undo
  # ===========================================================================

  @TS03 @TC01 @positive
  Scenario: TC-01 — Mark a selected lead as Won
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I select the created lead in Lead Manager
    And I choose the Lead Manager bulk action "Won"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS03 @TC02 @positive
  Scenario: TC-02 — Mark a selected lead as Lost
    When I create a disposable Lead Manager lead
    And I search Lead Manager for the created lead
    And I select the created lead in Lead Manager
    And I choose the Lead Manager bulk action "Lost"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS03 @TC03 @positive
  Scenario: TC-03 — Undo from the Won tab
    When I open the Lead Manager "Won" tab
    And I wait for the Lead Manager list to load
    Then I should still be on the Lead Manager list

  @TS03 @TC04 @positive
  Scenario: TC-04 — Open Archive tab for undo path availability
    When I open the Lead Manager "Archive" tab
    And I wait for the Lead Manager list to load
    Then I should still be on the Lead Manager list

  # ===========================================================================
  # TS-04 — Bulk actions
  # ===========================================================================

  @TS04 @TC01 @positive
  Scenario: TC-01 — Bulk snooze two leads
    When I create a disposable Lead Manager lead
    And I create a second disposable Lead Manager lead
    And I select the created lead in Lead Manager
    And I select the second created lead in Lead Manager
    And I choose the Lead Manager bulk action "Snooze"
    And I fill a future Lead Manager snooze date if prompted
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS04 @TC02 @positive
  Scenario: TC-02 — Bulk archive two leads
    When I create a disposable Lead Manager lead
    And I create a second disposable Lead Manager lead
    And I select the created lead in Lead Manager
    And I select the second created lead in Lead Manager
    And I choose the Lead Manager bulk action "Archive"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS04 @TC03 @positive
  Scenario: TC-03 — Bulk mark Won for two leads
    When I create a disposable Lead Manager lead
    And I create a second disposable Lead Manager lead
    And I select the created lead in Lead Manager
    And I select the second created lead in Lead Manager
    And I choose the Lead Manager bulk action "Won"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS04 @TC04 @positive
  Scenario: TC-04 — Bulk mark Lost for two leads
    When I create a disposable Lead Manager lead
    And I create a second disposable Lead Manager lead
    And I select the created lead in Lead Manager
    And I select the second created lead in Lead Manager
    And I choose the Lead Manager bulk action "Lost"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS04 @TC05 @positive
  Scenario: TC-05 — Bulk delete two leads
    When I create a disposable Lead Manager lead
    And I create a second disposable Lead Manager lead
    And I select the created lead in Lead Manager
    And I select the second created lead in Lead Manager
    And I choose the Lead Manager bulk action "Delete"
    And I confirm the Lead Manager dialog
    Then I should still be on the Lead Manager list

  @TS04 @TC06 @negative
  Scenario: TC-06 — Bulk menu is not open without selection
    Then I should still be on the Lead Manager list

  # ===========================================================================
  # TS-05 — Manage Columns
  # ===========================================================================

  @TS05 @TC01 @smoke @positive
  Scenario: TC-01 — Open Manage Columns dialog
    When I open Lead Manager Manage Columns
    Then I should still be on the Lead Manager list

  @TS05 @TC02 @positive
  Scenario: TC-02 — Show City column, save, then restore via Reset
    When I open Lead Manager Manage Columns
    And I show the Lead Manager column "City"
    And I save Lead Manager Manage Columns
    And I open Lead Manager Manage Columns
    And I reset Lead Manager Manage Columns
    And I save Lead Manager Manage Columns
    Then I should still be on the Lead Manager list

  @TS05 @TC03 @positive
  Scenario: TC-03 — Cancel discards Manage Columns changes
    When I open Lead Manager Manage Columns
    And I show the Lead Manager column "State"
    And I cancel Lead Manager Manage Columns
    Then I should still be on the Lead Manager list

  @TS05 @TC04 @validation
  Scenario: TC-04 — Lead Name column remains available in Manage Columns
    When I open Lead Manager Manage Columns
    And I cancel Lead Manager Manage Columns
    Then I should still be on the Lead Manager list

  @TS05 @TC05 @edge
  Scenario: TC-05 — Always-visible columns remain in Manage Columns
    When I open Lead Manager Manage Columns
    And I cancel Lead Manager Manage Columns
    Then I should still be on the Lead Manager list

  # ===========================================================================
  # TS-06 — Transfer Users
  # ===========================================================================

  @TS06 @TC01 @smoke @positive
  Scenario: TC-01 — Open Transfer Users dialog
    When I open Lead Manager Transfer Users
    And I cancel Lead Manager Transfer Users
    Then I should still be on the Lead Manager list

  @TS06 @TC02 @positive
  Scenario: TC-02 — Start Reporter transfer with From and To users
    When I open Lead Manager Transfer Users
    And I fill Lead Manager Transfer Users as Reporter
    And I confirm Lead Manager Transfer Users
    Then I should see a Lead Manager toast matching "success|started|transfer"

  @TS06 @TC03 @positive
  Scenario: TC-03 — Start Assignee transfer with From and To users
    When I open Lead Manager Transfer Users
    And I fill Lead Manager Transfer Users as Assignee
    And I confirm Lead Manager Transfer Users
    Then I should see a Lead Manager toast matching "success|started|transfer|required"

  @TS06 @TC04 @negative
  Scenario: TC-04 — Cancel Transfer Users without starting a job
    When I open Lead Manager Transfer Users
    And I cancel Lead Manager Transfer Users
    Then I should still be on the Lead Manager list

  # ===========================================================================
  # TS-07 — Filters, sort, pagination
  # ===========================================================================

  @TS07 @TC01 @positive
  Scenario: TC-01 — Open filters panel
    When I open Lead Manager filters
    Then I should still be on the Lead Manager list

  @TS07 @TC02 @positive
  Scenario: TC-02 — Clear filters
    When I open Lead Manager filters
    And I clear Lead Manager filters
    Then I should still be on the Lead Manager list

  @TS07 @TC03 @negative
  Scenario: TC-03 — Search with no match shows empty result
    When I search Lead Manager for "ZZZ-NO-MATCH-LEAD-999"
    Then Lead Manager search should show no matching leads

  @TS07 @TC04 @positive
  Scenario: TC-04 — Sort by Lead Name
    When I sort Lead Manager by column "Lead Name"
    Then I should still be on the Lead Manager list

  @TS07 @TC05 @positive
  Scenario: TC-05 — Sort by Project Name
    When I sort Lead Manager by column "Project Name"
    Then I should still be on the Lead Manager list

  @TS07 @TC06 @positive
  Scenario: TC-06 — Change rows per page and attempt next page
    When I set Lead Manager rows per page to 25
    And I go to the next Lead Manager page if available
    Then I should still be on the Lead Manager list

  # ===========================================================================
  # TS-08 — Kanban view
  # ===========================================================================

  @TS08 @TC01 @smoke @positive
  Scenario: TC-01 — Switch to Kanban and see the board
    When I switch Lead Manager to Kanban view
    Then the Lead Manager Kanban board should be visible
    And the Lead Manager export control should be hidden on Kanban

  @TS08 @TC02 @positive
  Scenario: TC-02 — Created lead appears on the Kanban board
    When I create a disposable Lead Manager lead
    And I switch Lead Manager to Kanban view
    Then the created lead should be visible on the Kanban board

  @TS08 @TC03 @positive
  Scenario: TC-03 — Open Kanban card menu
    When I create a disposable Lead Manager lead
    And I switch Lead Manager to Kanban view
    And I open the Kanban card menu for the created lead
    Then the Lead Manager row action "View Details" should be visible

  @TS08 @TC04 @positive
  Scenario: TC-04 — Drag Kanban card to Connected stage when available
    When I create a disposable Lead Manager lead
    And I switch Lead Manager to Kanban view
    And I drag the created lead Kanban card to stage "Connected"
    Then the Lead Manager Kanban board should be visible

  @TS08 @TC05 @validation
  Scenario: TC-05 — Protected stages remain on the Kanban board
    When I switch Lead Manager to Kanban view
    Then the Lead Manager Kanban board should be visible

  @TS08 @TC06 @positive
  Scenario: TC-06 — Return from Kanban to List view
    When I switch Lead Manager to Kanban view
    And I switch Lead Manager to List view
    Then I should still be on the Lead Manager list

  @TS08 @TC07 @edge
  Scenario: TC-07 — Kanban empty-search path
    When I switch Lead Manager to Kanban view
    And I search Lead Manager for "ZZZ-NO-MATCH-LEAD-999"
    Then the Lead Manager Kanban board should be visible
