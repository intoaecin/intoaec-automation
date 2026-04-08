@proposal @sendProposal @proposal_e2e @smoke
Feature: Send Proposal with editor actions

  # Editor requires viewport width > 1000px (see support/world.js).
  # After "Next", the dialog uses "skip & proceed" (modal.skip&Proceed); the step text "Skip for now" maps to that control.
  # MailSendBtn: approver users see Email in the Send menu; creators see Save / Request approval only.
  # Palette: MUI tabpanel with "Editors" (Text, Image, Table, Divider, Check Box, Signature, Shape) + Pricing Table + My Organization tiles; drag uses exact labels so "Table" ≠ "Pricing Table".

  Scenario: Send Proposal with editor configuration
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I open the Proposal tab for the selected project
    When I choose the default proposal template
    Then I should land on the proposal editor page
    And the proposal editor should be ready

    When I add Cover Page
    And I add Blank Page
    When I add Text element with random sample text
    # data: URL from pages/admin/common/proposal/proposalImageDataUrl.txt (or PROPOSAL_IMAGE_DATA_URL)
    And I add Image element using embedded jpeg test data
    And I add Table element with sample rows
    And I add Divider element and verify it
    And I add Checkbox element with random label
    And I add Signature element choosing ADMIN
    And I add Shape element and apply random color
    And I add Pricing Table element and fill sample values
    And I add Terms & Conditions element
    And I add Organization Logo element and verify it

    Then I should have all elements added successfully
    And no UI errors should be shown

    When I click Next on the proposal editor
    When I click Skip for now
    Then the proposal send preview should be visible
    When I click Send
    And I select Email channel
    When I send proposal
    Then the proposal send flow should complete successfully
