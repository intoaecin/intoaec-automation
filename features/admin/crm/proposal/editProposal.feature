@editProposal @proposal
Feature: Proposal - Edit Proposal and Verify Revision Update

  Scenario: Create client, send proposal, edit from CRM, send again and verify revision
    Given I am logged in
    And I open the first lead for the "revision" proposal flow
    When I open the Proposal module for the lead
    And I choose the default proposal template for the lead
    And I send the proposal to the lead via email
    And I click the edit proposal icon button
    And I iterate through the proposal builder and click skip for now
    And I broadcast the revised proposal via email
    Then the revision number should be updated in the CRM
