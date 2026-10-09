import pkg from '../package.json'
// Single source of truth: package.json. package.json uses MAJOR.MINOR.PATCH (e.g. 1.2.0); a trailing ".0" patch is not shown,
// so 1.2.0 is displayed as "1.2" and 1.1.3 stays "1.1.3".
// A new version is only created when an update contains 3 or more meaningful changes.
export const APP_VERSION = pkg.version.replace(/\.0$/, '')
