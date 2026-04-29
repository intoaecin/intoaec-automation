@proposal @acceptedProposal @yopmail
Feature: Accept Proposal From Yopmail

  Scenario: Create client, send proposal, accept from Yopmail, and verify accepted status
    Given I am logged in
    And I create a client with a fresh Yopmail email
    When I open proposal for the created client
    And I choose the default proposal template for the created client
    And I send the proposal to the created client via email
    And I open Yopmail for the created client
    And I wait for the proposal email and open the proposal preview
    And I accept the proposal with a digital signature
    Then the proposal status should be updated to accepted in the app
