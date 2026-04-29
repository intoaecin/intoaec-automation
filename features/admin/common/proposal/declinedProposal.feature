@proposal @declinedProposal @yopmail
Feature: Decline Proposal From Yopmail

  Scenario: Create client, send proposal, decline from Yopmail, and verify declined status
    Given I am logged in
    And I want to decline a proposal and create a client with Yopmail
    When I open the proposal section for the new client
    And I pick the default proposal template
    And I dispatch the proposal via email
    And I access Yopmail to view the sent proposal
    And I await the proposal email and preview it
    And I decline the proposal choosing a reason
    Then the proposal should be marked as declined in the CRM
