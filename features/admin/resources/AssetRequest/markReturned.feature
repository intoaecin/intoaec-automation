@resources @assetRequest @return @positive
Feature: Mark asset request as returned

  Scenario: Administrator marks a return-requested asset as returned
    Given I am logged in
    And a return-requested asset request exists from a project
    When I navigate to Resources Manage Assets Asset Requests tab
    And I mark the asset request as returned from the three dots menu
    Then I should see the asset request status as "RETURNED"
