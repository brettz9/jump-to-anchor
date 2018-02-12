/* eslint-env browser */
'use strict';

let x = 0;
let y = 0;

function setXAndY (e) {
    x = e.clientX;
    y = e.clientY;
    console.log('xxx', x, y);
}

function setXAndYMouseMove (e) {
    x = e.clientX;
    y = e.clientY;
    if (x || y) {
        console.log('removing');
        window.removeEventListener('mousemove', setXAndYMouseMove, true);
    }
    console.log('yyy', x, y);
    jumpToAnchor();
}

window.addEventListener('mousemove', setXAndYMouseMove, true);

window.addEventListener('contextmenu', setXAndY, true);

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

function jumpToAnchor () {
    x = Math.max(0, Math.min(window.innerWidth, x));
    y = Math.max(0, Math.min(window.innerHeight, y));

    let node;
    const selection = document.getSelection();
    if (selection.type === 'Range') {
        // clicking anywhere in the document causes a 'Caret' selection
        // we don't want to use that, as it might be way off
        node = selection.anchorNode;
    } else {
        const caretPosition = document.caretPositionFromPoint(x, y);
        node = caretPosition.offsetNode;
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
