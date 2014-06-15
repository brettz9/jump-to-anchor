# jump-to-anchor

Context menu item to jump to the closest anchor to the selected text (if any)
or to the right-click point otherwise.

Install at [AMO](https://addons.mozilla.org/en-US/firefox/addon/jump-to-anchor/).

# Detection algorithm

1. If the first non-whitespace/non-comment child of the clicked node is an
element (as opposed to text which may have been the text clicked), check
it for an `id=` or `<a name=>`, and if present, redirect to it and abandon steps.
If none found, keep checking for this recursively until there are no more
descendents.
2. If there is a previous adjacent sibling of the clicked node, check from its
deepest last child for an anchor, and abandon steps to redirect if present.
3. If there is a parent node of the clicked node or of a node found previously
in step #2 or #3,
check it for an anchor and abandon steps and redirect if found.

# Related add-ons

I mostly just wanted a restartless extension which could auto-jump to the
closest anchor above the click point, and from there, copy it if desired.

If you want something provides options such as highlighting the anchors on a
page or adds context menu items to copy and bookmark the anchors, see
[Show Anchors 2](https://addons.mozilla.org/en-US/firefox/addon/show-anchors-2/).

# Credits

The icon for this extension as available at
[AMO](https://addons.mozilla.org/en-US/firefox/addon/jump-to-anchor/)
was obtained from http://commons.wikimedia.org/wiki/File:Hash-trans.png under the
Creative Commons Attribution-Share Alike 3.0 Unported license,
but that icon is not bundled in this repository.
