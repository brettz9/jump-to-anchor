/*globals self */
/*jslint vars:true, browser:true*/
(function () {'use strict';

function l (s) {console.log(s);}

var x, y;

window.addEventListener('click', function (e) {l('click');
	if (e.button === 2) { // Avoid grabbing for the actual selection // Doesn't seem to execute on single click anyways but add for good measure
		x = e.clientX;
		y = e.clientY;
	}
}, true);

self.on('click', function (node) { // , data
    setTimeout(function () {
        findAncestor(node);
    }, 10000);
});

function findAncestor (node) {
	if (!x) { // Since this is not showing the first time, we fire on the node, though this means it will be less than perfect for first click!
		node.dispatchEvent(new MouseEvent('click', {
			button: 2
		}));
	}
	x = Math.max(0, Math.min(window.innerWidth, x));
	y = Math.max(0, Math.min(window.innerHeight, y));
	var caretPosition = document.caretPositionFromPoint(x, y);
	var node = caretPosition.offsetNode;

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
			// self.postMessage(node.id);
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

}());
