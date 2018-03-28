/* eslint-env node */
'use strict';
module.exports = {
    verbose: true,
    ignoreFiles: [
        // Files beginning with dot, zip/xpi, node_modules, and web-ext-artifacts auto-ignored
        'package-lock.json',
        'package.json',
        'screenshots'
    ]
};
