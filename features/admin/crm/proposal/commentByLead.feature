@commentByLead @proposal
Feature: Proposal - Comment by Lead

  Scenario: Create client, send proposal, add comments from Yopmail, and verify lead commented status
    Given I am logged in
    And I open the first lead for the "lead comment" proposal flow
    When I open the Proposal module for the lead
    And I choose the default proposal template for the lead
    And I send the proposal to the lead via email
    And I open Yopmail for the lead
    And I wait for the proposal email and open the proposal preview
    And I add suggestions and save comments in the proposal
    Then the proposal should be marked as lead commented in the CRM
