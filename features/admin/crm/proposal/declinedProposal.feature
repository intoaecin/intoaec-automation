@proposal @declinedProposal @yopmail
Feature: Decline Proposal From Yopmail

  Scenario: Create client, send proposal, decline from Yopmail, and verify declined status
    Given I am logged in
    And I open the first lead for the "declined" proposal flow
    When I open the Proposal module for the lead
    And I choose the default proposal template for the lead
    And I send the proposal to the lead via email
    And I open Yopmail for the lead
    And I wait for the proposal email and open the proposal preview
    And I decline the proposal choosing a reason
    Then the proposal should be marked as declined in the CRM
