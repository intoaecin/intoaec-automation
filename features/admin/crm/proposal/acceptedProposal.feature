@proposal @acceptedProposal @yopmail
Feature: Accept Proposal From Yopmail

  Scenario: Create client, send proposal, accept from Yopmail, and verify accepted status
    Given I am logged in
    And I open the first lead for the "accepted" proposal flow
    When I open the Proposal module for the lead
    And I choose the default proposal template for the lead
    And I send the proposal to the lead via email
    And I open Yopmail for the lead
    And I wait for the proposal email and open the proposal preview
    And I accept the proposal with a digital signature
    Then the proposal status should be updated to accepted in the app
