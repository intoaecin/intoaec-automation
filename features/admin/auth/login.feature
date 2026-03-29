Feature: Login to AEC Portal

  @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "testintoaec@gmail.com"
    And I enter password "Simple@10"
    And I click the Login button
    Then I should be logged in successfully

  Scenario: Login with invalid credentials
    Given I am on the login page
    When I enter email "wrong@gmail.com"
    And I enter password "wrongpassword"
    And I click the Login button
    Then I should see an error message