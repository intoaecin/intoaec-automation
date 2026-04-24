@regression @rfq @estimate-to-rfq @start-from-estimate @positive
Feature: RFQ - start from estimate

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list

  Scenario: Create RFQ from a sent estimate group and send email
    When I create and send an estimate using estimate flow 2 for start from estimate
    And I return to Procurement RFQ module
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I create RFQ from the created estimate through group flow and send email
    Then I should see RFQ compose email success toast

