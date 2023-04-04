'use strict';

module.exports = {
    extends: ['ash-nazg/sauron-overrides'],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
    },
    env: {
        node: false,
        browser: true
    },
    settings: {
        polyfills: [
            'document.caretRangeFromPoint',
            'Promise.all'
        ]
    },
    overrides: [
        {
            extends: ['ash-nazg/sauron-overrides'],
            parserOptions: {
                ecmaVersion: 2022
            },
            files: [
                '.eslintrc.js',
                'lib/background.js',
                'lib/content.js',
                'web-ext-config.js',
                'options/options.js'
            ],
            rules: {
                indent: ['error', 4, {outerIIFEBody: 0}],
                'import/unambiguous': 0
            }
        }
    ],
    rules: {
        indent: ['error', 4, {outerIIFEBody: 0}]
    }
};
