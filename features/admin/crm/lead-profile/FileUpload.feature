@crm @lead-profile @documents
Feature: Lead profile Documents

  Background:
    Given I am logged in
    And I open lead Documents on the Organization tab

  Scenario: Open Documents and see Upload Files
    Then I should see the Documents Upload Files action

  Scenario: Upload a small PDF and see it in the list
    When I upload a small PDF to Documents
    Then I should see the uploaded document in the list

  Scenario: Create a folder with a generated name and see it
    When I create a Documents folder with a generated name
    Then I should see the created folder in the list

  Scenario: Upload an unsupported exe and see it rejected
    When I upload an unsupported exe to Documents
    Then I should see the unsupported document rejected

  Scenario: Upload dialog shows the 1024 MB limit
    When I open the Documents upload dialog
    Then I should see the Documents 1024 MB upload limit
    When I close the Documents upload dialog

  Scenario: Rename the uploaded file and see the new name in the list
    When I rename the uploaded document
    Then I should see the renamed document in the list

  Scenario: Upload New Version, open View, and see the new version
    When I upload a new version of the document
    And I open View for the document
    Then I should see the new version in the Version dropdown
    When I leave the document viewer

  Scenario: Move the file into the created folder and see it inside that folder
    When I move the document into the created folder
    Then I should see the document inside the created folder

  Scenario: Move to Trash, open Trash, Restore the file, and see it back
    When I move the document to Trash
    And I open Documents Trash
    And I restore the document from Trash
    Then I should see the restored document on the Documents list

  Scenario: Delete the file from Trash and confirm it is gone
    When I move the document to Trash
    And I open Documents Trash
    And I delete the document from Trash
    Then I should not see the document in Trash or the Documents list

  Scenario: Add annotation comment on the document
    When I open View for a document ready for annotation
    And I add an annotation pin with a comment and save it
    Then I should see the annotation comment in the comments panel
    When I leave the document viewer

  Scenario: Drop another pin and create a task
    When I open View for a document ready for annotation
    And I drop an annotation pin and create a task with a generated name
    Then I should see the task in the tasks panel
    When I leave the document viewer
