import pkg from '../package.json'
// Single source of truth: package.json. Format is MAJOR.MINOR.PATCH (e.g. 1.1.3).
// A new version is only created when an update contains 3 or more meaningful changes.
export const APP_VERSION = pkg.version
