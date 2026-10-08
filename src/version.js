import pkg from '../package.json'
// Single source of truth: package.json. 1.0.0 = first release, 1.1.0 = Part 1 + Part 2 update.
export const APP_VERSION = pkg.version
