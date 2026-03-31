Feature: Estimate create and email workflow

  Background:
    Given I am on the login page
    When I enter email "testintoaec@gmail.com"
    And I enter password "Courage@10"
    And I click the Login button
    Then I should be logged in successfully
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Design & Estimates" heading
    And I click the "Estimate" module card
    And I wait for estimate module to load

  @smoke @estimate
  Scenario: Create estimate and send email successfully
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "name"
    And I add another manual estimate item with name "name 2"
    And I add first item from estimate library
    And I add estimate charge "Service Charge" with value "5"
    And I switch estimate charge type to fixed and set value "250"
    And I add estimate discount using first option
    And I add estimate tax using first option
    And I enable estimate round off
    And I add estimate terms from first template
    And I enable estimate digital signature
    And I add custom estimate column "CustomField" with type "Text"
    And I click estimate action compose email and send
    Then I should see estimate success toast "Estimate successfully sent"

  @negative @estimate
  Scenario: Missing estimate title shows validation
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details without title
    Then I should see estimate validation message

  @negative @estimate
  Scenario: Missing item name shows validation
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I try to add manual estimate item without name
    Then I should see estimate validation message

  @negative @estimate
  Scenario: Valid till earlier than created date shows validation
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate details with invalid date order and title "AAA"
    Then I should see estimate validation message

  @negative @estimate
  Scenario: Sending estimate without items shows validation
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I attempt to send estimate email
    Then I should see estimate validation message

  @negative @estimate
  Scenario: Compose email without required data shows validation
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "name"
    And I open compose email and clear recipient field
    And I send estimate email from compose popup
    Then I should see estimate validation message

  @negative @estimate
  Scenario: Library add without selecting item shows validation
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I open estimate library and click add without selection
    Then I should see estimate validation message

  @edge @estimate
  Scenario: Add large number of items in estimate
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add 10 manual estimate items
    Then I should see at least 10 estimate items in table

  @edge @estimate
  Scenario: Switch charge type between percentage and fixed
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "name"
    And I add estimate charge "Switch Charge" with value "5"
    And I switch estimate charge type to fixed and set value "100"
    And I switch estimate charge type to percentage and set value "8"
    Then estimate charge should be visible

  @edge @estimate
  Scenario: Add multiple sections in estimate
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add estimate section "Second Section"
    Then I should see estimate section "Second Section"

  @edge @estimate
  Scenario: Remove item before sending estimate
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "name"
    And I remove last estimate item
    Then I should see no estimate items in table

  @edge @estimate
  Scenario: Handle slow loading estimate elements
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I wait for estimate form with slow load handling
    Then estimate form should be visible

  @edge @estimate
  Scenario: Add duplicate item names in estimate
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "duplicate"
    And I add another manual estimate item with name "duplicate"
    Then I should see duplicate estimate items with name "duplicate"
