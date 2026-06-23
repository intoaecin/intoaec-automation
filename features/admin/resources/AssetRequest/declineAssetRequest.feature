@resources @assetRequest @negative @decline
Feature: Decline asset request

  Scenario: Administrator declines a requested asset from Manage Assets Asset Requests tab
    Given I am logged in
    And a requested asset exists from a project
    When I navigate to Resources Manage Assets Asset Requests tab
    And I decline the asset request from the three dots menu with reason "Not required for this project phase"
    Then I should see the asset request status as "Declined"
