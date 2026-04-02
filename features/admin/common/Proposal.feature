Feature: Proposal

  @proposal
  Scenario: Send Proposal
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I send a proposal for the selected project
    Then the proposal send flow should complete successfully