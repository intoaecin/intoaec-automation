# -----------------------------------------------------------------------------
# Customer Support — incremental TCs in ONE file.
#
# TS-01 Support Desk loads          — @TS01 @TC01
# TS-02 Switch list and kanban      — @TS02 @TC02
# TS-03 Create ticket offcanvas     — @TS03 @TC03
# TS-04 Open filter menu            — @TS04 @TC04
# TS-05 Ticket Statuses customize   — @TS05 @TC05
# TS-06 Internal ticket + contact   — @TS06 @TC06
# TS-07 Search by phone             — @TS07 @TC07 @TC08 @TC09 (TC09 needs CS_LEAD_MOBILE)
# TS-08 Sort + created date range   — @TS08 @TC10 @TC11
# TS-09 Card "Created on" label     — @TS09 @TC12
# TS-10 Help + contact validation   — @TS10 @TC13 @TC14
# TS-11 Edit / delete ticket        — @TS11 @TC15 @TC16
# TS-12 Permissions                 — @TS12 @TC17 @TC18 (need CS_VIEWER_* / CS_CREATOR_*)
#
# Run one case (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS01 and @TC01"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS02 and @TC02"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS03 and @TC03"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS04 and @TC04"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS05 and @TC05"
#
# Run all:
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@customer-support-tc"
#   npm.cmd run test:admin:crm:customersupport
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/admin/crm/CustomerSupport/CustomerSupportPage.js;
#            step-definitions/admin/crm/CustomerSupport/CustomerSupportStep.js
# -----------------------------------------------------------------------------

@customer-support-tc @customer-support
Feature: Customer Support — incremental test cases

  Background:
    Given I am logged in
    When I navigate to Customer Support
    And I wait for the customer support module to load

  # ===========================================================================
  # TS-01 — Support Desk loads (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Support Desk loads and page title is visible
    Then the Support Desk page title should be visible

  # ===========================================================================
  # TS-02 — Switch list and kanban views (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Switch between list and kanban views
    When I switch customer support to kanban view
    And I switch customer support to list view

  # ===========================================================================
  # TS-03 — Create ticket offcanvas (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Open create ticket offcanvas and see title lead and summary fields
    When I open the customer support create ticket offcanvas
    Then the customer support create ticket offcanvas should show title lead and summary fields

  # ===========================================================================
  # TS-04 — Open filter menu (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Open the customer support filter menu
    When I open the customer support filter menu

  # ===========================================================================
  # TS-05 — Ticket Statuses customize tab (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Navigate to Ticket Statuses customize tab via feature sidebar
    When I open the customer support Ticket Statuses tab
    Then the customer support Ticket Statuses page should be visible

  # ===========================================================================
  # TS-06 — Internal ticket with contact (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @regression @positive
  Scenario: TC-06 — Create an Internal ticket with contact name and phone
    When I create an Internal support ticket with a contact name and phone
    Then the new ticket card should show Internal with the contact name and phone

  # ===========================================================================
  # TS-07 — Search by phone (@TS07 @TC07 / @TC08 / @TC09)
  # ===========================================================================

  @TS07 @TC07 @regression @positive
  Scenario Outline: TC-07 — Find a ticket by its contact phone (<variant>)
    When I create an Internal support ticket with a contact name and phone
    And I search support tickets for the "<variant>" of the new ticket phone
    Then the new ticket card should be listed

    Examples:
      | variant          |
      | full number      |
      | last 5 digits    |
      | formatted number |

  @TS07 @TC08 @regression @negative
  Scenario: TC-08 — Searching an unknown phone number shows the empty state
    When I search support tickets for a phone number that does not exist
    Then the customer support empty search state should be shown

  # Needs CS_LEAD_MOBILE in .env (a lead that has at least one linked ticket).
  @TS07 @TC09 @regression @positive
  Scenario: TC-09 — A linked ticket is found by the lead's mobile number
    When I search support tickets by the configured lead mobile
    Then at least one support ticket should be listed

  # ===========================================================================
  # TS-08 — Sort and created date range (@TS08 @TC10 / @TC11)
  # ===========================================================================

  @TS08 @TC10 @regression @positive
  Scenario: TC-10 — Newest first by default; Oldest first reverses the list
    When I create an Internal support ticket with a contact name and phone
    Then the default ticket list request should sort newest first
    When I apply the customer support sort "Oldest first"
    Then the ticket list request should use sort order "ASC"
    And the ticket order should differ from newest first
    When I apply the customer support sort "Newest first"
    Then the ticket list request should use sort order "DESC"

  @TS08 @TC11 @regression @positive @negative
  Scenario: TC-11 — Created date range includes today's ticket and excludes it for a past range
    When I create an Internal support ticket with a contact name and phone
    And I filter support tickets created "today"
    Then the new ticket card should be listed
    When I filter support tickets created "in the past"
    Then the new ticket card should not be listed
    When I clear the customer support filters and search
    Then the new ticket card should be listed

  # ===========================================================================
  # TS-09 — Card date label (@TS09 @TC12)
  # ===========================================================================

  @TS09 @TC12 @regression @positive
  Scenario: TC-12 — Ticket card shows "Created on" and no Updated date
    When I create an Internal support ticket with a contact name and phone
    Then the new ticket card should show only the created date

  # ===========================================================================
  # TS-10 — Offcanvas help + contact fields (@TS10 @TC13 / @TC14)
  # ===========================================================================

  @TS10 @TC13 @regression @positive
  Scenario: TC-13 — Assignee/reporter help and Internal contact fields
    When I open the customer support create ticket offcanvas
    Then the assignee and reporter help should explain both roles
    When I turn the ticket Linked toggle off
    Then the Internal contact name and phone fields should be shown
    When I turn the ticket Linked toggle on
    Then the Internal contact name and phone fields should be hidden

  @TS10 @TC14 @regression @negative
  Scenario Outline: TC-14 — Invalid contact phone "<phone>" is rejected
    When I open the customer support create ticket offcanvas
    And I try to create an Internal ticket with phone "<phone>"
    Then the contact phone validation error should be shown

    Examples:
      | phone    |
      | 98765abc |
      | 12345    |

  # ===========================================================================
  # TS-11 — Edit and delete (@TS11 @TC15 / @TC16)
  # ===========================================================================

  @TS11 @TC15 @regression @positive
  Scenario: TC-15 — Editing a ticket title updates its card
    When I create an Internal support ticket with a contact name and phone
    And I rename the new ticket
    Then the new ticket card should be listed

  @TS11 @TC16 @regression @positive
  Scenario: TC-16 — Deleting a ticket removes its card
    When I create an Internal support ticket with a contact name and phone
    And I delete the new ticket
    Then the new ticket card should not be listed

  # ===========================================================================
  # TS-12 — Customer Support permission (@TS12 @TC17 / @TC18)
  # Needs CS_VIEWER_EMAIL/CS_VIEWER_PASSWORD and CS_CREATOR_EMAIL/CS_CREATOR_PASSWORD
  # (users whose User Hub "Customer Support" permission is Viewer / Creator).
  # ===========================================================================

  @TS12 @TC17 @regression @negative @cs-permission
  Scenario: TC-17 — Viewer cannot create, edit or delete tickets
    When I sign in as the Customer Support "viewer" test user
    Then Customer Support should be view-only for this user

  @TS12 @TC18 @regression @negative @cs-permission
  Scenario: TC-18 — Creator can create but cannot edit or delete tickets
    When I sign in as the Customer Support "creator" test user
    Then Customer Support should allow create but not edit or delete for this user
