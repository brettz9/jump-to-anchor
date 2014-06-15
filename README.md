# jump-to-anchor

Context menu item to jump to the closest anchor to the selected text (if any)
or to the right-click point otherwise.

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

# Credits

The icon for the extension indicated at [AMO]() was obtained from
http://commons.wikimedia.org/wiki/File:Hash-trans.png under the
Creative Commons Attribution-Share Alike 3.0 Unported license,
but that icon is not bundled in this repository.
