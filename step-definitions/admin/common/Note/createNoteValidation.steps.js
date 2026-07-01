const { When, Then } = require('@cucumber/cucumber');
const CreateNoteValidationPage = require('../../../../pages/admin/common/Note/CreateNoteValidationPage');

function getCreateNoteValidationPage(world) {
  if (!world.createNoteValidationPage) {
    world.createNoteValidationPage = new CreateNoteValidationPage(world.page);
  }
  return world.createNoteValidationPage;
}

When('I leave the note title empty and fill the paragraph', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.leaveTitleEmptyAndFillParagraph();
});

When('I fill the note title and leave the paragraph empty', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.fillTitleAndLeaveParagraphEmpty();
});

When('I leave the note title and paragraph empty', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.leaveTitleAndParagraphEmpty();
});

When('I fill the note title exceeding the maximum character limit', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.fillTitleExceedingMaxLength();
});

When('I fill the note paragraph exceeding the maximum character limit', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.fillParagraphExceedingMaxLength();
});

When('I fill special characters in the note title and valid paragraph', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.fillSpecialCharacterTitleAndValidParagraph();
});

When('I fill the note title and special characters in the paragraph', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.fillTitleAndSpecialCharacterParagraph();
});

When('I attempt to submit the note create form', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.attemptSubmitCreateNote();
});

When('I upload an unsupported note attachment file', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.uploadUnsupportedAttachmentFile();
});

When('I upload an oversized note attachment file', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.uploadOversizedAttachmentFile();
});

Then('I should see title mandatory validation for note', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectTitleMandatoryValidation();
});

Then('I should see paragraph mandatory validation for note', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectParagraphMandatoryValidation();
});

Then('I should see title and paragraph mandatory validation for note', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectTitleAndParagraphMandatoryValidation();
});

Then('I should see title maximum character validation for note', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectTitleMaxLengthValidation();
});

Then('I should see paragraph maximum character validation for note', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectParagraphMaxLengthValidation();
});

Then('I should see note special character input handled correctly', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectSpecialCharacterInputHandled();
});

Then('I should see unsupported note attachment validation', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectUnsupportedFileValidation();
});

Then('I should see oversized note attachment validation', { timeout: 120000 }, async function () {
  const page = getCreateNoteValidationPage(this);
  await page.expectOversizedFileValidation();
});
