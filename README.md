# jump-to-anchor

Context menu item to jump to the closest anchor to the selected text (if any)
or to the right-click point otherwise.

Has option (on by default) on providing separate menu items for jumping to
an anchor relative to selected text vs. the click point. Will otherwise always
default to selected text when present.

Install for [Firefox (AMO)](https://addons.mozilla.org/firefox/addon/jump-to-anchor/)
or [Chrome](https://chrome.google.com/webstore/detail/jump-to-anchor/fhbjjkmbahpmoegppmljagmakkeomlmb).

![Screenshot of usage](https://raw.githubusercontent.com/brettz9/jump-to-anchor/master/screenshots/Screen%20Shot%202018-02-12%20at%2010.39.07%20PM.png)

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

I mostly just wanted an extension which could auto-jump to the
closest anchor above the click point, and from there, copy it if desired.

You might find other features (e.g., revealing all anchors on the page),
you might look at:

- [Anchors reveal](https://addons.mozilla.org/addon/anchors-reveal/)
- [Display #Anchors](https://addons.mozilla.org/addon/display-_anchors/)

# Credits

The icon for this extension was obtained (and SVG optimized) from
<https://commons.wikimedia.org/wiki/File:Hash-transbg.svg> under the
Creative Commons CC0 1.0 Universal Public Domain Dedication.

# To-dos

1. Convert to lighter-performance, and lesser-privileged `activeTab`
    privilege; see <https://bugzilla.mozilla.org/show_bug.cgi?id=1325814>;
    however, my attempt on the `failed-attempt-activeTab` branch did
    not succeed
