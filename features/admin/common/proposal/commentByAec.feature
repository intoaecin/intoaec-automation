@commentByAec @proposal
Feature: Proposal - Comment by AEC

  Scenario: Create client, verify lead comment, post AEC reply, and verify in Yopmail
    Given I am logged in
    And I orchestrate a proposal layout for an existing client
    When I navigate to the proposal table area
    And I execute the default proposal template
    And I post the proposal via email
    And I switch to Yopmail to view the sent proposal
    And I load the proposal mail and open the preview
    And I append suggestions and save comments in the proposal
    Then the proposal should be confirmed as lead commented in the CRM
    When I trigger the proposal preview viewer in the CRM
    And I author an AEC reply to the lead's comment and save it
    And I fetch the latest Yopmail notification for the reply
    Then the AEC reply text should successfully render in the client view
