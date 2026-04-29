@commentByLead @proposal
Feature: Proposal - Comment by Lead

  Scenario: Create client, send proposal, add comments from Yopmail, and verify lead commented status
    Given I am logged in
    And I want to comment on a proposal and access an existing client
    When I access the proposal area for the target client
    And I initiate the default proposal template
    And I transmit the proposal via email
    And I navigate to Yopmail to view the sent proposal
    And I wait for the proposal mail and open the preview
    And I add suggestions and save comments in the proposal
    Then the proposal should be marked as lead commented in the CRM
