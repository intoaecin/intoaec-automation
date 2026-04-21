@resources @asset @delete @positive
Feature: Delete Asset

  Scenario: Create an asset and delete it from the row action menu
    Given I am logged in
    When I create an asset ready for deletion
    And I open delete from the three dots menu for the created asset
    And I fill the delete reason for the asset
    And I confirm asset deletion from the popup
    Then I should see the asset deleted successfully
