@editProposal @proposal
Feature: Proposal - Edit Proposal and Verify Revision Update

  Scenario: Create client, send proposal, edit from CRM, send again and verify revision
    Given I am logged in
    And I orchestrate a proposal layout for an existing client for edit operation
    When I maneuver to the proposal table area specifically for editing
    And I initialize the default proposal template for edit scenario
    And I broadcast the proposal via email for edit module
    And I click the edit proposal icon button
    And I iterate through the proposal builder and click skip for now
    And I broadcast the revised proposal via email
    Then the revision number should be updated in the CRM
