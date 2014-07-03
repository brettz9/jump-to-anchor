/*globals self*/
/*jslint vars:true, browser:true*/
(function () {'use strict';

function l (s) {console.log(s);}

var x, y;

window.addEventListener('click', function (e) {
	if (e.button === 2) { // Avoid grabbing for the actual selection // Doesn't seem to execute on single click anyways but add for good measure
		x = e.clientX;
		y = e.clientY;
	}
}, true);

function jumpToAnchor (hasSelection) {
	x = Math.max(0, Math.min(window.innerWidth, x));
	y = Math.max(0, Math.min(window.innerHeight, y));

	var node;
	if (hasSelection) {
		// For some reason, we can't just check ourselves here for getSelection().anchorNode, as it is always present
		node = document.getSelection().anchorNode;
	}
	else {
		var caretPosition = document.caretPositionFromPoint(x, y);
		node = caretPosition.offsetNode;
	}

	var findDeepestLastChild = function (elem) {
		var oldElem;
		do {
			oldElem = elem;
			elem = elem.lastElementChild;
		} while (elem);
		return oldElem;
	};
	var foundAnchor = function (node) {
		if (node.id || (node.name && node.nodeName.toLowerCase() === 'a')) {
			location.hash = '#' + (node.id || node.name);
			// self.port.emit(node.id);
			return true;
		}
	};

    do {
        if (foundAnchor(node)) {
            break;
        }

        if (node.previousElementSibling) {
            node = findDeepestLastChild(node.previousElementSibling);
        }
        else {
            node = node.parentNode;
        }
    } while (node);
}

self.port.on('jumpToAnchor', function (hasSelection) {
	jumpToAnchor(hasSelection);
});

}());
