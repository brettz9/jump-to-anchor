# 0.7.0

- Enhancement: Add option to allow separate context menu items for
    jumping relative to click point/selection

# 0.6.2

-   Chrome does appear to need `document.caretRangeFromPoint` for now
-   Add short name

# 0.6.1

-   Chrome-required icon fixes and screenshot

# 0.6.0

@jomo:

-   Ported extension to WebExtensions for Firefox 57+ support;
    also Google Chrome-compatible
-   Improve selection detection (also removes highlighted as separate
    feature; will use highlighted if any highlighted)
-   Convert to ES6

@brettz9

-   Adapting @jomo's code: Minor tweaks and refactoring (e.g., ES7);
    request lighter privileges of user

# 0.5.2

-   Distinguish context menu text depending on whether relative
    to click point or highlighted selection

# 0.5.0

-   Add support for file: protocol

# 0.4.0

-   Add support for private window browsing

# 0.3.4

-   Fix issue #1 ; beyond highlighted text and page selection
    clicks outside of nodes, allow clicking on nodes

# 0.3.3

-   jpm packaging

# 0.3.2

-   Fix behavior so that navigating backward or forward is supported

# 0.3.1

-   Fix selection-based detection

# 0.3.0

-   Avoid problem with getting correct anchor on first-click

# 0.2.1

# 0.2.0

-   Provide better detection, but due to apparent SDK
    limitations, only after first click

# 0.1.0

-   Initial version
