Feature: Login to AEC Portal

  @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
<<<<<<< HEAD
    When I enter email "mydheen020@yopmail.com"
    And I enter password "Courage@10"
=======
    When I enter email "kumar@diy.in"
    And I enter password "Simple@10"
>>>>>>> 1a0684751e064ee5078461eebaa54a0cb16dacd0
    And I click the Login button
    Then I should be logged in successfully


@invalid_credentials
  Scenario: Login with invalid credentials
    Given I am on the login page
    When I enter email "wrong@gmail.com"
    And I enter password "wrongpassword"
    And I click the Login button
    Then I should see an error message