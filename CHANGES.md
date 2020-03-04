# CHANGES for `jump-to-anchor`

## ?

- Build: Update bundled jamilih and webextension-polyfill copies
- Maintenance: Add `.editorconfig`
- npm: Update devDeps

## 0.10.0

- Fix: Avoid race conditions in Promises (options page, background message
    sending and menu removal)
- Linting (ESLint): Switch to ash-nazg and lint any HTML/Markdown; use
    "js" extension
- Build: Update `webextension-polyfill` and `jamilih` copies
- npm: Update devDeps; add `copy` script
- yarn: Remove `yarn.lock`

## 0.9.0

- Breaking change: For Chrome, default to merging context menu items
    option (since a right-click more easily ends up selecting text in Chrome)
- Fix: Polyfills link in options dialog
- Build: Use automated no-`innerHTML` build of Jamilih for easier
    maintainability along with AMO approval
- yarn: Add `yarn.lock`

## 0.8.0

- Breaking change: Change default for separate context menus to true (since
    now won't show when no highlighted text present)
- Enhancement: Avoid showing selection context menu when no selected text
    present
- Linting: Use `eslint-config-standard` and apply fixes
- npm: Add back `package.json` with ESLint devDeps and webext polyfill dep
- npm: Specify scripts for running specific versions of Firefox
- Build: Move screenshot file and ignore it from build (also avoid
    redundancies in ignores); put webext polyfill in polyfills folder,
    auto-copiable from node_modules

## 0.7.0

- Enhancement: Add option to allow separate context menu items for
    jumping relative to click point/selection

## 0.6.2

-   Chrome does appear to need `document.caretRangeFromPoint` for now
-   Add short name

## 0.6.1

-   Chrome-required icon fixes and screenshot

## 0.6.0

@jomo:

-   Ported extension to WebExtensions for Firefox 57+ support;
    also Google Chrome-compatible
-   Improve selection detection (also removes highlighted as separate
    feature; will use highlighted if any highlighted)
-   Convert to ES6

@brettz9

-   Adapting @jomo's code: Minor tweaks and refactoring (e.g., ES7);
    request lighter privileges of user

## 0.5.2

-   Distinguish context menu text depending on whether relative
    to click point or highlighted selection

## 0.5.0

-   Add support for file: protocol

## 0.4.0

-   Add support for private window browsing

## 0.3.4

-   Fix issue #1 ; beyond highlighted text and page selection
    clicks outside of nodes, allow clicking on nodes

## 0.3.3

-   jpm packaging

## 0.3.2

-   Fix behavior so that navigating backward or forward is supported

## 0.3.1

-   Fix selection-based detection

## 0.3.0

-   Avoid problem with getting correct anchor on first-click

## 0.2.1

## 0.2.0

-   Provide better detection, but due to apparent SDK
    limitations, only after first click

## 0.1.0

-   Initial version
