/* eslint-env browser, webextensions */
'use strict';

function findDeepestLastChild (elem) {
    while (elem.lastElementChild) {
        elem = elem.lastElementChild;
    }
    return elem;
}

function foundAnchor (node) {
    if (node.id || (node.name && node.nodeName.toLowerCase() === 'a')) {
        location.hash = '#' + (node.id || node.name);
        return true;
    }
    return false;
}

function jumpToAnchor (type, node) {
    const selection = type === 'jumpToAnchorClick' ? {type: null} : document.getSelection();
    if (selection.type === 'Range') {
        // clicking anywhere in the document causes a 'Caret' selection
        // we don't want to use that, as it might be way off
        node = selection.anchorNode;
    }

    do {
        if (foundAnchor(node)) {
            break;
        }

        if (node.previousElementSibling) {
            node = findDeepestLastChild(node.previousElementSibling);
        } else {
            node = node.parentNode;
        }
    } while (node);
}

browser.runtime.onMessage.addListener(({menuItemId, targetElementId}) => {
    if (menuItemId.startsWith('jumpToAnchor')) {
        jumpToAnchor(menuItemId, browser.contextMenus.getTargetElement(targetElementId));
    }
});
