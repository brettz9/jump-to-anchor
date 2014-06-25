/*globals self */
/*jslint vars:true, browser:true*/
(function (undefined) {'use strict';

function l (s) {console.log(s);}

var x, y;
window.addEventListener('click', function (e) {
	//if (e.button === 2) { // Avoid grabbing for the actual selection // Doesn't seem to execute on single click anyways but add for good measure
		x = e.clientX;
		y = e.clientY;
	//}
});
self.on('click', function () { // , data
    if (x === undefined) {
        document.documentElement.click(); // Ensure click event occurs as it does not always do so on page load for some reason
        l(x); // On first attempt is always 0 for some reason!
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

	try {
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
	catch(e) {
		if (e.toString() !== 'escape') {
			throw e;
		}
	}
});

}());
