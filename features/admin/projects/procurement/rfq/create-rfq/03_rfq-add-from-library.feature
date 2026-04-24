@regression @rfq @rfq-add-from-library
Feature: RFQ — add from library and compose email

  Same navigation as compose RFQ; line items come from Add from library (two rows).
  Terminal logs use prefix [RFQ add-from-library] for pass/fail analysis.
  Requires My Items or Library Items with at least two rows.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Add line items from library then compose and send email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ library compose flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    When I click add from library on the RFQ form
    Then I should see the RFQ library drawer
    When I select the first two rows in the RFQ library grid
    And I click add in the RFQ library drawer
    And I log the RFQ line item row count for diagnostics
    When I compose and send RFQ email after add from library
    Then I should see RFQ compose email success toast after library compose
