@commentByAec @proposal
Feature: Proposal - Comment by AEC

  Scenario: Create client, verify lead comment, post AEC reply, and verify in Yopmail
    Given I am logged in
    And I open the first lead for the "AEC reply" proposal flow
    When I open the Proposal module for the lead
    And I choose the default proposal template for the lead
    And I send the proposal to the lead via email
    And I open Yopmail for the lead
    And I wait for the proposal email and open the proposal preview
    And I add suggestions and save comments in the proposal
    Then the proposal should be marked as lead commented in the CRM
    When I trigger the proposal preview viewer in the CRM
    And I author an AEC reply to the lead's comment and save it
    And I fetch the latest Yopmail notification for the reply
    Then the AEC reply text should successfully render in the client view
