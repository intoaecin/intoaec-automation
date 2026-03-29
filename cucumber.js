module.exports = {
  default: {
    require: [
      'support/**/*.js',
      'step-definitions/**/*.js'
    ],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true
  }
};