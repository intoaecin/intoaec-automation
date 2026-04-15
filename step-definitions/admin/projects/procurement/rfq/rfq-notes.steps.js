const { When } = require('@cucumber/cucumber');
const RfqNotesPage = require('../../../../../pages/admin/projects/procurement/rfq/rfq-notes.page');

function getRfqNotesPage(world) {
  if (!world.rfqNotesPage) {
    world.rfqNotesPage = new RfqNotesPage(world.page);
  }
  return world.rfqNotesPage;
}

When(
  'I enter random medium content in the RFQ notes field',
  { timeout: 120000 },
  async function () {
    const rfq = getRfqNotesPage(this);
    const body = await rfq.enterRandomMediumRfqNotes();
    this.rfqLastRandomNote = body;
  }
);

When(
  'I enter RFQ notes with {string}',
  { timeout: 120000 },
  async function (text) {
    const rfq = getRfqNotesPage(this);
    await rfq.fillRfqNotesFieldWithText(text);
  }
);
