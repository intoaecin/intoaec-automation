@resources @asset @edit @positive
Feature: Edit Asset

  Scenario: Create an asset and edit it from the row action menu
    Given I am logged in
    When I create an asset ready for editing
    And I open edit from the three dots menu for the created asset
    And I edit all asset fields with valid values
    And I attach the edited asset document manually and press Enter to continue
    And I submit the asset update form
    Then I should see the asset updated successfully
    And I should see all edited asset values saved correctly
