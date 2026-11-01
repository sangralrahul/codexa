'use strict';
// The rimraf 2 API (`rimraf(path, [opts], cb)` and `rimraf.sync(path, [opts])`) on top of Node's own
// fs.rm, with no glob dependency. Used only by `temp` (inside electron-builder's Squirrel.Windows
// tooling), which deletes literal paths. Wired in through "overrides" in desktop/package.json.
const fs = require('node:fs');

function options(opts) {
  return { recursive: true, force: true, maxRetries: (opts && opts.maxBusyTries) || 0 };
}

function rimraf(path, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  fs.rm(path, options(opts), (err) => cb(err || null));
}

rimraf.sync = function rimrafSync(path, opts) {
  fs.rmSync(path, options(opts));
};

module.exports = rimraf;
