@proposal @sendProposal @proposal_builder @smoke
Feature: Build Proposal From Client Profile

  # What this feature covers:
  # - Opens the first lead (CRM → Lead Manager) and navigates to the Proposal workspace
  # - Creates/opens a proposal template in the editor
  # - Adds multiple block types (drag & drop) to validate the builder palette
  # - Proceeds through the send stepper and sends via Email
  #
  # Implementation mapping:
  # - Shared lead / template / email send steps: `step-definitions/admin/common/proposal/proposalFlow.steps.js`
  # - Navigation + send stepper: `pages/admin/common/ProposalPage.js`
  # - Drag/drop builder blocks: `pages/admin/common/proposal/ProposalBuilderPage.js`
  # - Builder step glue: `step-definitions/admin/common/proposal/sendProposal.steps.js`

  Scenario: Open a client proposal, build it with all blocks, and send by email
    Given I am logged in
    And I open the first lead for the "send" proposal flow
    When I open the Proposal module for the lead
    And I choose the default proposal template for the lead
    Then I should land on the proposal editor page
    And the proposal editor should be ready

    When I add Cover Page
    And I add Blank Page
    And I add Text element with random sample text
    And I add Image element using embedded jpeg test data
    And I add Table element with sample rows
    And I add Divider element and verify it
    And I add Checkbox element with random label
    And I add Signature element choosing ADMIN
    And I add Shape element and apply random color
    And I add Pricing Table element and fill sample values
    And I add Terms & Conditions element
    And I add Organization Logo element and verify it
    And I add all visible proposal variables and macros

    Then I should have all elements added successfully
    And no UI errors should be shown

    When I send the proposal to the lead via email
    Then the proposal send flow should complete successfully
