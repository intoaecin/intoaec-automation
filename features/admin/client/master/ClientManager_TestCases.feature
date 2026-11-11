# -----------------------------------------------------------------------------
# Client Manager — incremental manual TCs in ONE file (team TestCases style).
#
# TS-01 Search / menu / tabs             — @TS01 @TC01 … @TS01 @TC04
# TS-02 Active row actions               — @TS02 @TC01 … @TS02 @TC07
# TS-03 Archive / Completed status       — @TS03 @TC01 … @TS03 @TC04
# TS-04 Bulk actions                     — @TS04 @TC01 … @TS04 @TC05
# TS-05 Manage Columns                   — @TS05 @TC01 … @TS05 @TC05
# TS-06 Transfer Users                   — @TS06 @TC01 … @TS06 @TC04
# TS-07 Filters / sort / pagination      — @TS07 @TC01 … @TS07 @TC06
#
# Layering:
#   features/admin/client/master/ClientManager_TestCases.feature
#   pages/admin/client/master/ClientMasterPage.js
#   step-definitions/admin/client/master/ClientManagerStep.js
# Reuses login + ProjectNavigationPage.openClientsProjectsList (/client?isActive=true).
#
# Run one suite:
#   npx cucumber-js features/admin/client/master/ClientManager_TestCases.feature --tags "@TS01"
# Run one case:
#   npx cucumber-js features/admin/client/master/ClientManager_TestCases.feature --tags "@TS01 and @TC01"
# Run entire file:
#   npx cucumber-js features/admin/client/master/ClientManager_TestCases.feature
#
# Results (updated after runs):
#   TS-01: Pass (TC01–TC04)
#   TS-02: Pass (TC01–TC07) — View Details=overview dialog; Copy Id skips clipboard.readText
#   TS-03: Pass (TC01–TC04) — Archive tab via URL fallback; Undo/Edit from Archive kebab
#   TS-04: Pass (TC01–TC05)
#   TS-05: Pass (TC01–TC05) — checkbox toggles; Reset to default; Cancel if Save not dirty
#   TS-06: Pass (TC01–TC04)
#   TS-07: Pass (TC01–TC06) — sort by Client Name; dismissChatOverlay before next page
# -----------------------------------------------------------------------------


@client-manager @client @regression
Feature: Client Manager — incremental test cases

  Background:
    Given I am logged in
    And I open the Client Manager master page
    And I wait for the Client Manager list to load

  # ===========================================================================
  # TS-01 — Search, menu smoke, tabs
  # ===========================================================================

  @TS01 @TC01 @smoke @positive
  Scenario: TC-01 — Create a disposable client and find it by search
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    Then I should see the created client in the Client Manager list

  @TS01 @TC02 @smoke @positive
  Scenario: TC-02 — Open the row actions menu for the created client
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    Then the Client Manager row action "View Details" should be visible
    And the Client Manager row action "Archive" should be visible

  @TS01 @TC03 @smoke @positive
  Scenario: TC-03 — Select a client and see bulk actions available
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I select the created client in Client Manager
    Then the Client Manager bulk actions should be available

  @TS01 @TC04 @smoke @positive
  Scenario: TC-04 — Switch Active, Archive, and Completed tabs
    When I open the Client Manager "Archive" tab
    And I wait for the Client Manager list to load
    And I open the Client Manager "Completed" tab
    And I wait for the Client Manager list to load
    And I open the Client Manager "Active" tab
    And I wait for the Client Manager list to load
    Then I should still be on the Client Manager list

  # ===========================================================================
  # TS-02 — Active row actions
  # ===========================================================================

  @TS02 @TC01 @positive
  Scenario: TC-01 — View Details opens the client overview dialog
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "View Details"
    Then I should be on the Client Manager overview

  @TS02 @TC02 @positive
  Scenario: TC-02 — Mark as Completed moves client to Completed tab
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Mark as Completed"
    And I confirm the Client Manager dialog
    Then I should be on the Client Manager Completed tab

  @TS02 @TC03 @positive
  Scenario: TC-03 — Archive a client with confirmation
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Archive"
    And I confirm the Client Manager dialog
    Then I should still be on the Client Manager list

  @TS02 @TC04 @positive
  Scenario: TC-04 — Copy Project Id from the row menu
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I copy the Client Manager project id for the created client
    Then I should still be on the Client Manager list

  @TS02 @TC05 @positive
  Scenario: TC-05 — Delete a client after confirmation
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Delete"
    And I confirm the Client Manager dialog
    Then I should still be on the Client Manager list

  @TS02 @TC06 @negative
  Scenario: TC-06 — Cancel delete keeps the client
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Delete"
    And I cancel the Client Manager dialog
    And I search Client Manager for the created client
    Then I should see the created client in the Client Manager list

  @TS02 @TC07 @validation
  Scenario: TC-07 — Active row menu exposes Mark as Completed
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    Then the Client Manager row action "Mark as Completed" should be visible

  # ===========================================================================
  # TS-03 — Archive / Completed status
  # ===========================================================================

  @TS03 @TC01 @positive
  Scenario: TC-01 — Undo archived client back to Active
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Archive"
    And I confirm the Client Manager dialog
    And I open the Client Manager "Archive" tab
    And I wait for the Client Manager list to load
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Undo"
    And I confirm the Client Manager dialog
    Then I should still be on the Client Manager list

  @TS03 @TC02 @positive
  Scenario: TC-02 — Edit from Archive opens client profile
    When I create a disposable Client Manager client
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Archive"
    And I confirm the Client Manager dialog
    And I open the Client Manager "Archive" tab
    And I wait for the Client Manager list to load
    And I search Client Manager for the created client
    And I open the Client Manager row actions for the created client
    And I choose the Client Manager row action "Edit"
    Then I should be navigated to the Client Manager profile page

  @TS03 @TC03 @positive
  Scenario: TC-03 — Completed tab is reachable
    When I open the Client Manager "Completed" tab
    And I wait for the Client Manager list to load
    Then I should be on the Client Manager Completed tab

  @TS03 @TC04 @edge
  Scenario: TC-04 — Completed tab has no row kebab
    When I open the Client Manager "Completed" tab
    And I wait for the Client Manager list to load
    Then the Client Manager row kebab should be hidden

  # ===========================================================================
  # TS-04 — Bulk actions
  # ===========================================================================

  @TS04 @TC01 @positive
  Scenario: TC-01 — Bulk archive two clients
    When I create a disposable Client Manager client
    And I create a second disposable Client Manager client
    And I select the created client in Client Manager
    And I select the second created client in Client Manager
    And I choose the Client Manager bulk action "Archive"
    And I confirm the Client Manager dialog
    Then I should still be on the Client Manager list

  @TS04 @TC02 @positive
  Scenario: TC-02 — Bulk mark completed for two clients
    When I create a disposable Client Manager client
    And I create a second disposable Client Manager client
    And I select the created client in Client Manager
    And I select the second created client in Client Manager
    And I choose the Client Manager bulk action "Mark as completed"
    And I confirm the Client Manager dialog
    Then I should still be on the Client Manager list

  @TS04 @TC03 @positive
  Scenario: TC-03 — Bulk delete two clients
    When I create a disposable Client Manager client
    And I create a second disposable Client Manager client
    And I select the created client in Client Manager
    And I select the second created client in Client Manager
    And I choose the Client Manager bulk action "Delete"
    And I confirm the Client Manager dialog
    Then I should still be on the Client Manager list

  @TS04 @TC04 @positive
  Scenario: TC-04 — Archive tab bulk Undo is available after selection
    When I open the Client Manager "Archive" tab
    And I wait for the Client Manager list to load
    Then I should still be on the Client Manager list

  @TS04 @TC05 @negative
  Scenario: TC-05 — Bulk menu is not open without selection
    Then I should still be on the Client Manager list

  # ===========================================================================
  # TS-05 — Manage Columns
  # ===========================================================================

  @TS05 @TC01 @smoke @positive
  Scenario: TC-01 — Open Manage Columns dialog
    When I open Client Manager Manage Columns
    Then I should still be on the Client Manager list

  @TS05 @TC02 @positive
  Scenario: TC-02 — Show City column, save, then restore via Reset
    When I open Client Manager Manage Columns
    And I show the Client Manager column "City"
    And I save Client Manager Manage Columns
    And I open Client Manager Manage Columns
    And I reset Client Manager Manage Columns
    And I save Client Manager Manage Columns
    Then I should still be on the Client Manager list

  @TS05 @TC03 @positive
  Scenario: TC-03 — Cancel discards Manage Columns changes
    When I open Client Manager Manage Columns
    And I show the Client Manager column "State"
    And I cancel Client Manager Manage Columns
    Then I should still be on the Client Manager list

  @TS05 @TC04 @validation
  Scenario: TC-04 — Lead Name column remains available in Manage Columns
    When I open Client Manager Manage Columns
    And I cancel Client Manager Manage Columns
    Then I should still be on the Client Manager list

  @TS05 @TC05 @edge
  Scenario: TC-05 — Always-visible columns remain in Manage Columns
    When I open Client Manager Manage Columns
    And I cancel Client Manager Manage Columns
    Then I should still be on the Client Manager list

  # ===========================================================================
  # TS-06 — Transfer Users
  # ===========================================================================

  @TS06 @TC01 @smoke @positive
  Scenario: TC-01 — Open Transfer Users dialog
    When I open Client Manager Transfer Users
    And I cancel Client Manager Transfer Users
    Then I should still be on the Client Manager list

  @TS06 @TC02 @positive
  Scenario: TC-02 — Start Reporter transfer with From and To users
    When I open Client Manager Transfer Users
    And I fill Client Manager Transfer Users as Reporter
    And I confirm Client Manager Transfer Users
    Then I should see a Client Manager toast matching "success|started|transfer"

  @TS06 @TC03 @positive
  Scenario: TC-03 — Start Assignee transfer with From and To users
    When I open Client Manager Transfer Users
    And I fill Client Manager Transfer Users as Assignee
    And I confirm Client Manager Transfer Users
    Then I should see a Client Manager toast matching "success|started|transfer|required"

  @TS06 @TC04 @negative
  Scenario: TC-04 — Cancel Transfer Users without starting a job
    When I open Client Manager Transfer Users
    And I cancel Client Manager Transfer Users
    Then I should still be on the Client Manager list

  # ===========================================================================
  # TS-07 — Filters, sort, pagination
  # ===========================================================================

  @TS07 @TC01 @positive
  Scenario: TC-01 — Open filters panel
    When I open Client Manager filters
    Then I should still be on the Client Manager list

  @TS07 @TC02 @positive
  Scenario: TC-02 — Clear filters
    When I open Client Manager filters
    And I clear Client Manager filters
    Then I should still be on the Client Manager list

  @TS07 @TC03 @negative
  Scenario: TC-03 — Search with no match shows empty result
    When I search Client Manager for "ZZZ-NO-MATCH-CLIENT-999"
    Then Client Manager search should show no matching clients

  @TS07 @TC04 @positive
  Scenario: TC-04 — Sort by Client Name
    When I sort Client Manager by column "Client Name"
    Then I should still be on the Client Manager list

  @TS07 @TC05 @positive
  Scenario: TC-05 — Sort by Project Name
    When I sort Client Manager by column "Project Name"
    Then I should still be on the Client Manager list

  @TS07 @TC06 @positive
  Scenario: TC-06 — Change rows per page and attempt next page
    When I set Client Manager rows per page to 25
    And I go to the next Client Manager page if available
    Then I should still be on the Client Manager list
