@resources @assetRequest @return @positive
Feature: Request return of issued asset

  Scenario: Administrator requests return for an issued asset
    Given I am logged in
    And an issued asset request exists from a project
    When I navigate to Resources Manage Assets Asset Requests tab
    And I request return for the asset request from the three dots menu
    Then I should see the asset request status as "RETURN_REQUESTED"
