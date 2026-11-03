@projects @financial @received-payments @positive @view
Feature: View Received Payment (read-only)

  # UI: AddReceivedPaymentsModal with isEdit opens as viewReceivedPayments —
  # fields disabled, no Save/Update. Row Edit/Delete apply only to expenses.
  Background:
    Given I am logged in
    When I open a project with Received Payments available
    And I wait for the Received Payments module to load
    When I click Add Received Payment
    And I fill the received payment form with unique details
    And I submit the Received Payments create form
    Then the received payment should be created successfully

  Scenario: Opening a received payment shows read-only view
    When I open the created received payment
    Then I should see the received payment in read-only view
