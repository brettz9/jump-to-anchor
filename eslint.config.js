import ashNazg from 'eslint-config-ash-nazg';

export default [
    {
        ignores: [
            'options/jml.js',
            'polyfills/browser-polyfill.min.js'
        ]
    },
    ...ashNazg(['sauron', 'browser']),
    ...ashNazg(['sauron']).map((cfg) => {
        return {
            ...cfg,
            files: [
                'eslint.config.js',
                'lib/background.js',
                'lib/content.js',
                'web-ext-config.cjs',
                'options/options.js'
            ]
        };
    }),
    {
        files: [
            'eslint.config.js',
            'lib/background.js',
            'lib/content.js',
            'web-ext-config.cjs',
            'options/options.js'
        ],
        rules: {
            indent: ['error', 4, {outerIIFEBody: 0}],
            'import/unambiguous': 0
        }
    },
    {
        settings: {
            polyfills: [
                'document.caretRangeFromPoint',
                'Promise.all'
            ]
        },
        rules: {
            indent: ['error', 4, {outerIIFEBody: 0}]
        }
    }
];
