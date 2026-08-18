const { When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const MyOrganizationPage = require('../../../pages/admin/account/MyOrganizationPage');

setDefaultTimeout(60000);

function getMyOrganizationPage(world) {
  if (!world.myOrganizationPage || world.myOrganizationPage.page !== world.page) {
    world.myOrganizationPage = new MyOrganizationPage(world.page);
  }
  return world.myOrganizationPage;
}

When('I click on My Organization', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickMyOrganization();
});

Then('the My Organization page should be displayed', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectMyOrganizationPageDisplayed();
});

When('I click the My Organization About Us tab', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAboutUsTab();
});

When('I click the My Organization Edit button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickEdit();
});

When('I fill the My Organization summary with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSummary(value);
});

When('I fill the My Organization license number with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillLicenseNumber(value);
});

When('I fill the My Organization tax id with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillTaxId(value);
});

When('I fill the My Organization tax name with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillTaxName(value);
});

When('I select the My Organization languages spoken {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectLanguagesSpoken(value);
});

When('I click the My Organization Update button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickUpdate();
});

Then('I should see My Organization success toast {string}', async function (message) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectSuccessToast(message);
});

When('I scroll to the My Organization Area of Expertise section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.scrollToAreaOfExpertise();
});

When('I click the My Organization Add Skill button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddSkill();
});

Then('the My Organization available skills list should be displayed', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectSkillsListDisplayed();
});

When('I select the My Organization skill {string}', async function (skill) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectSkillFromList(skill);
});

When('I click the My Organization skill Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickSkillSave();
});

Then('the My Organization skill {string} should be added to Area of Expertise', async function (skill) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectSkillAddedToExpertise(skill);
});

When('I scroll to the My Organization Awards section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.scrollToAwards();
});

When('I click the My Organization Add Award button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddAward();
});

When('I fill the My Organization award title with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAwardTitle(value);
});

When('I fill the My Organization award issuer with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAwardIssuer(value);
});

When('I select the My Organization award issued on date {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectAwardIssuedOn(value);
});

When('I fill the My Organization award description with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAwardDescription(value);
});

When('I click the My Organization award Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAwardSave();
});

Then(
  'the My Organization award should be displayed in the Awards section with title {string} issuer {string} issued on {string} and description {string}',
  async function (title, issuer, issuedOn, description) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectAwardDisplayed(title, issuer, issuedOn, description);
  }
);

When('I scroll to the My Organization Certifications section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.scrollToCertifications();
});

When('I click the My Organization Add Certification button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddCertification();
});

When('I fill the My Organization certification title with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillCertificationTitle(value);
});

When('I fill the My Organization certification issuer with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillCertificationIssuer(value);
});

When('I select the My Organization certification issued on date {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectCertificationIssuedOn(value);
});

When('I select the My Organization certification expires on date {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectCertificationExpiresOn(value);
});

When('I fill the My Organization certification credential id with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillCertificationCredentialId(value);
});

When('I fill the My Organization certification credential url with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillCertificationCredentialUrl(value);
});

When('I click the My Organization certification Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickCertificationSave();
});

Then(
  'the My Organization certification should be displayed in the Certifications section with title {string} issuer {string} issued on {string} expires on {string} credential id {string} and credential url {string}',
  async function (title, issuer, issuedOn, expiresOn, credentialId, credentialUrl) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectCertificationDisplayed(
      title,
      issuer,
      issuedOn,
      expiresOn,
      credentialId,
      credentialUrl
    );
  }
);

When('I scroll to the My Organization Publications section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.scrollToPublications();
});

When('I click the My Organization Add Publication button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddPublication();
});

When('I fill the My Organization publication title with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPublicationTitle(value);
});

When('I fill the My Organization publication publisher with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPublicationPublisher(value);
});

When('I select the My Organization publication date {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectPublicationDate(value);
});

When('I fill the My Organization publication author with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPublicationAuthor(value);
});

When('I fill the My Organization publication url with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPublicationUrl(value);
});

When('I click the My Organization publication Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickPublicationSave();
});

Then(
  'the My Organization publication should be displayed in the Publications section with title {string} publisher {string} date {string} author {string} and url {string}',
  async function (title, publisher, publishedOn, author, url) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectPublicationDisplayed(title, publisher, publishedOn, author, url);
  }
);

When('I scroll to the My Organization Presentations section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.scrollToPresentations();
});

When('I click the My Organization Add Presentation button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddPresentation();
});

When('I fill the My Organization presentation event name with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPresentationEventName(value);
});

When('I fill the My Organization presentation location with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPresentationLocation(value);
});

When('I select the My Organization presentation start date {string} and start time {string}', async function (dateText, timeText) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectPresentationStartDateTime(dateText, timeText);
});

When('I select the My Organization presentation end date {string} and end time {string}', async function (dateText, timeText) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectPresentationEndDateTime(dateText, timeText);
});

When('I fill the My Organization presentation venue details with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPresentationVenue(value);
});

When('I click the My Organization presentation Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickPresentationSave();
});

Then(
  'the My Organization presentation should be displayed in the Presentations section with event name {string} location {string} start date {string} start time {string} end date {string} end time {string} and venue {string}',
  async function (eventName, location, startDate, startTime, endDate, endTime, venue) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectPresentationDisplayed(
      eventName,
      location,
      startDate,
      startTime,
      endDate,
      endTime,
      venue
    );
  }
);

When('I click the My Organization Organization Info tab', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickOrganizationInfoTab();
});

When('I scroll to the My Organization Address section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.scrollToAddressSection();
});

When('I click the My Organization Address Edit button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddressEdit();
});

When('I fill the My Organization address line 1 with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAddressLine1(value);
});

When('I fill the My Organization address line 2 with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAddressLine2(value);
});

When('I fill the My Organization address city with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAddressCity(value);
});

When('I select the My Organization address state {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectAddressState(value);
});

When('I select the My Organization address country {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectAddressCountry(value);
});

When('I fill the My Organization address zip code with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillAddressZip(value);
});

When('I click the My Organization Address Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddressSave();
});

Then(
  'the My Organization address should be displayed in the Address section with line 1 {string} line 2 {string} city {string} state {string} country {string} and zip {string}',
  async function (line1, line2, city, state, country, zip) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectAddressDisplayed(line1, line2, city, state, country, zip);
  }
);

When('I click the My Organization Portfolio tab', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickPortfolioTab();
});

When('I click the My Organization Add Project button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickAddProject();
});

Then('the My Organization Add Portfolio popup should be displayed', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectAddPortfolioPopupDisplayed();
});

When('I fill the My Organization portfolio project name with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPortfolioProjectName(value);
});

When('I select the My Organization portfolio project type {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.selectPortfolioProjectType(value);
});

When('I fill the My Organization portfolio description with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPortfolioDescription(value);
});

When('I fill the My Organization portfolio project duration with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPortfolioDuration(value);
});

When('I fill the My Organization portfolio location with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillPortfolioLocation(value);
});

When('I enable the My Organization portfolio public visibility', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.enablePortfolioPublicVisibility();
});

When('I upload the My Organization portfolio media file {string}', async function (fileName) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.uploadPortfolioMedia(fileName);
});

Then('the My Organization portfolio uploaded video should be displayed in the upload section', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectPortfolioUploadedVideoInDialog();
});

When('I click the My Organization portfolio Add button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickPortfolioAdd();
});

Then(
  'the My Organization portfolio project should be displayed with name {string} type {string} duration {string} location {string} public visibility enabled and video visible',
  async function (name, type, duration, location) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectPortfolioProjectDisplayed(name, type, duration, location);
  }
);

When('I click the My Organization Social Media tab', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickSocialMediaTab();
});

Then('the My Organization Social Media Links section should be displayed', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectSocialMediaLinksSectionDisplayed();
});

When('I click the My Organization Social Media Edit button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickSocialMediaEdit();
});

When('I fill the My Organization Facebook URL with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSocialFacebook(value);
});

When('I fill the My Organization Twitter URL with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSocialTwitter(value);
});

When('I fill the My Organization LinkedIn URL with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSocialLinkedIn(value);
});

When('I fill the My Organization Instagram URL with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSocialInstagram(value);
});

When('I fill the My Organization Public Profile URL with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSocialPublicProfile(value);
});

When('I fill the My Organization Website or Blog URL with {string}', async function (value) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.fillSocialWebsite(value);
});

When('I click the My Organization Social Media Save button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickSocialMediaSave();
});

When('I refresh the page', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.refreshPage();
});

Then(
  'the My Organization social media URLs should be displayed with Facebook {string} Twitter {string} LinkedIn {string} Instagram {string} Public Profile {string} and Website {string}',
  async function (facebook, twitter, linkedin, instagram, publicProfile, website) {
    const myOrganizationPage = getMyOrganizationPage(this);
    await myOrganizationPage.expectSocialMediaUrlsDisplayed({
      facebook,
      twitter,
      linkedin,
      instagram,
      publicProfile,
      website,
    });
  }
);

When('I click the My Organization E-Signature tab', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickESignatureTab();
});

Then('the My Organization Admin Digital Signature section should be displayed', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectAdminDigitalSignatureSectionDisplayed();
});

When('I click the My Organization E-Signature Draw option', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickESignatureDraw();
});

When('I draw a sample signature in the My Organization signature area', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.drawSampleSignature();
});

Then('the My Organization drawn signature should be displayed in the signature area', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectDrawnSignatureVisible();
});

When('I click the My Organization E-Signature Update button', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickESignatureUpdate();
});

Then('the My Organization updated signature should be displayed under Existing Digital Signature', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectExistingDigitalSignatureDisplayed();
});

When('I click the My Organization E-Signature Upload option', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.clickESignatureUpload();
});

When('I upload the My Organization signature file {string}', async function (fileName) {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.uploadSignatureFile(fileName);
});

Then('the My Organization uploaded signature should be displayed in the signature area', async function () {
  const myOrganizationPage = getMyOrganizationPage(this);
  await myOrganizationPage.expectUploadedSignatureVisible();
});
