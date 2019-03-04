'use strict';
const assert = require('assert');

module.exports = app => {
  const index = app.config.appMiddleware.indexOf('restful');
  assert.equal(
    index,
    -1,
    'Duplication of middleware name found: restful. Rename your middleware other than "restful" please.'
  );
  app.config.coreMiddleware.unshift('restful');
};
