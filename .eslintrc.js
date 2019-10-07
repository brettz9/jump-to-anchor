module.exports = {
  "extends": ["ash-nazg"],
  "parserOptions": {
    "sourceType": "module"
  },
  "env": {
    "node": false,
    "browser": true
  },
  "settings": {
      "polyfills": [
          "document.caretRangeFromPoint",
          "Promise.all"
      ]
  },
  "overrides": [
      {
          extends: ["ash-nazg", "plugin:node/recommended-script"],
          files: [
              "lib/background.js", "lib/content.js", "web-ext-config.js",
              "options/options.js"
          ],
          rules: {
            "indent": ["error", 4, {"outerIIFEBody": 0}]
          }
      }
  ],
  "rules": {
    "indent": ["error", 4, {"outerIIFEBody": 0}]
  }
};
