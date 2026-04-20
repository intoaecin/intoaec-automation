const { When, Then } = require('@cucumber/cucumber');
const RfqSuperAdminCommentPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-super-admin-comment.page');

function getRfqSuperAdminCommentPage(world) {
  if (!world.rfqSuperAdminCommentPage) {
    world.rfqSuperAdminCommentPage = new RfqSuperAdminCommentPage(world.page);
  }
  return world.rfqSuperAdminCommentPage;
}

When(
  'I submit a random super admin line comment from the RFQ preview',
  { timeout: 300000 },
  async function () {
    const rfq = getRfqSuperAdminCommentPage(this);
    const text = rfq.buildRandomSuperAdminCommentText();
    this.superAdminRfqPreviewLineCommentText = text;
    await rfq.submitRandomSuperAdminPreviewLineComment(text);
  }
);

Then(
  'I should see the super admin RFQ preview line comment on the page',
  { timeout: 120000 },
  async function () {
    const text = this.superAdminRfqPreviewLineCommentText;
    if (!text) {
      throw new Error(
        'Missing comment text: run “submit a random super admin line comment from the RFQ preview” first.'
      );
    }
    const rfq = getRfqSuperAdminCommentPage(this);
    await rfq.expectSuperAdminPreviewCommentVisible(text);
  }
);


