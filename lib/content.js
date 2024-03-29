/* eslint-env browser, webextensions -- The environment */
'use strict';

let x = 0;
let y = 0;

window.addEventListener('contextmenu', (e) => {
    x = e.clientX;
    y = e.clientY;
}, true);

/**
 *
 * @param {Element} elem
 * @returns {Element}
 */
function findDeepestLastChild (elem) {
    while (elem.lastElementChild) {
        elem = elem.lastElementChild;
    }
    return elem;
}

/**
 *
 * @param {Node} node
 * @returns {boolean}
 */
function foundAnchor (node) {
    if (node.id || (node.name && node.nodeName.toLowerCase() === 'a')) {
        location.hash = '#' + (node.id || node.name);
        return true;
    }
    return false;
}

/**
 *
 * @param {string} type
 * @returns {void}
 */
function jumpToAnchor (type) {
    x = Math.max(0, Math.min(window.innerWidth, x));
    y = Math.max(0, Math.min(window.innerHeight, y));

    let node;
    const selection = type === 'jumpToAnchorClick'
        ? {type: null}
        : document.getSelection();
    if (selection.type === 'Range') {
        // clicking anywhere in the document causes a 'Caret' selection
        // we don't want to use that, as it might be way off
        node = selection.anchorNode;
    } else if (document.caretPositionFromPoint) {
        const caretPosition = document.caretPositionFromPoint(x, y);
        node = caretPosition.offsetNode;
    } else { // Until https://bugs.chromium.org/p/chromium/issues/detail?id=388976
        const caretPosition = document.caretRangeFromPoint(x, y);
        node = caretPosition.startContainer;
    }

    do {
        if (foundAnchor(node)) {
            break;
        }

        node = node.previousElementSibling
            ? findDeepestLastChild(node.previousElementSibling)
            : node.parentNode;
    } while (node);
}

browser.runtime.onMessage.addListener(({menuItemId}) => {
    if (menuItemId.startsWith('jumpToAnchor')) {
        jumpToAnchor(menuItemId);
    }
});
