const path = require('path');

const fixturesDir = path.join(__dirname);

module.exports = {
  titleMaxLength: parseInt(process.env.NOTE_TITLE_MAX_LENGTH || '100', 10),
  paragraphMaxLength: parseInt(process.env.NOTE_PARAGRAPH_MAX_LENGTH || '5000', 10),
  maxFileSizeMb: parseInt(process.env.NOTE_MAX_FILE_SIZE_MB || '5', 10),
  specialCharacterTitle:
    process.env.NOTE_SPECIAL_CHAR_TITLE || '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
  specialCharacterParagraph:
    process.env.NOTE_SPECIAL_CHAR_PARAGRAPH ||
    'Paragraph with symbols: é à ñ <tag> & "quotes" 🎉',
  unsupportedAttachmentFile: path.join(fixturesDir, 'unsupported-note-attachment.exe'),
  validTitleSample(suffix) {
    return `Valid Title ${suffix}`;
  },
  validParagraphSample(suffix) {
    return `Valid paragraph content ${suffix}`;
  },
  titleExceedingLimit(maxLength) {
    return 'T'.repeat(maxLength + 25);
  },
  paragraphExceedingLimit(maxLength) {
    return 'P'.repeat(maxLength + 50);
  },
};
