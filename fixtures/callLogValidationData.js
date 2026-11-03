module.exports = {
  // CallLogModal has no maxlength; keep env overrides for when the UI adds one.
  purposeMaxLength: parseInt(process.env.CALL_LOG_PURPOSE_MAX_LENGTH || '255', 10),
  commentsMaxLength: parseInt(process.env.CALL_LOG_COMMENTS_MAX_LENGTH || '2000', 10),
  specialCharacterPurpose:
    process.env.CALL_LOG_SPECIAL_CHAR_PURPOSE || '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
  callOutcome: 'Good Discussion',
  // From CallLogModal MenuItem values / callLog.callOptions.*
  expectedCallOutcomes: ['Good Discussion', 'Call Later', 'Not Answered', 'Not Interested'],
  // CallLogModal uses t("common.pleaseAddAllMandatoryFields")
  // ("Please fill in all mandatory fields" / "Please add all mandatory fields")
  mandatoryValidationPattern: /please (fill in|add) all mandatory fields/i,
  validPurposeSample(suffix) {
    return `Site visit follow-up ${suffix}`;
  },
  validCommentSample(suffix) {
    return `Discussed project timeline, material delivery, and the next site visit. Ref ${suffix}`;
  },
  purposeExceedingLimit(maxLength) {
    return 'P'.repeat(maxLength + 25);
  },
  commentsExceedingLimit(maxLength) {
    return 'C'.repeat(maxLength + 50);
  },
};
