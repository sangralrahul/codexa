'use strict';
// minimatch 11.0.3 (patched for GHSA-g3hv-75wg-m249) with the minimatch 3/5/9 calling style kept:
// `require('minimatch')` is the matcher function itself, with every named export attached to it.
const m = require('./dist/commonjs/index.js');
function minimatch(path, pattern, options) {
  return m.minimatch(path, pattern, options);
}
Object.assign(minimatch, m.minimatch, m);
minimatch.minimatch = minimatch;
minimatch.default = minimatch;
module.exports = minimatch;
