import pkg from '../package.json'
// Single source of truth: package.json (npm needs a 3-part number, so 1.12 is stored as 1.12.0).
// Our naming: 1.0 = initial release, 1.1 = major update, 1.11, 1.12, ... = small follow-ups, 1.2 = a future major update.
// The trailing ".0" is dropped for display, so package 1.12.0 shows as "1.12".
export const APP_VERSION = pkg.version.replace(/\.0$/, '')
