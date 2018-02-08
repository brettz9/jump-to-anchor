# jump-to-anchor

Context menu item to jump to the closest anchor to the selected text (if any)
or to the right-click point otherwise.

Install at [AMO](https://addons.mozilla.org/en-US/firefox/addon/jump-to-anchor/).

# Detection algorithm

1.  If the clicked node is text, skip to step #3.

1.  If it is an element, check it for an `id=` or `<a name=>`,
    and if present, redirect to it and abandon steps.

1.  If there is a previous adjacent element sibling of the
    clicked node, check from its deepest last child for an
    anchor, and abandon steps to redirect if an anchor is found.

1.  Go back to #3 as long as there are previous adjacent element siblings.

1.  Check for anchor on the parent node, and abandon steps
      to redirect if an anchor is found. If not, go to step #4.

1.  Do nothing.

# Related add-ons

I mostly just wanted a restartless extension which could auto-jump to the
closest anchor above the click point, and from there, copy it if desired.

If you want something which provides options such as highlighting the anchors
on a page or adds context menu items to copy and bookmark the anchors, see
[Show Anchors 2](https://addons.mozilla.org/en-US/firefox/addon/show-anchors-2/).

# Credits

The icon for this extension was obtained (and SVG optimized) from
<https://commons.wikimedia.org/wiki/File:Hash-transbg.svg> under the
Creative Commons CC0 1.0 Universal Public Domain Dedication.

# To-dos

1. Consider returning to adding back two context menu items, one for jumping
    to an anchor relative to the mouse coordinates and another relative to
    text selection (esp. for cases where one may have forgotten about some text
    selection)
