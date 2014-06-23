/*globals self */
/*jslint vars:true, browser:true*/
(function () {'use strict';

function l (s) {console.log(s);}

var x = 0, y = 0;
window.addEventListener('click', function (e) {
	// if (e.button === 2) { // Avoid grabbing for the actual selection // Doesn't seem to execute on single click anyways
		x = e.pageX;
		y = e.pageY;
	// }
});
self.on('click', function () { // , data
	// For some reason, this does not seem to work very well
	x = x > window.mozInnerScreenX ? window.mozInnerScreenX : (x < 0 ? 0 : x);
	y = y > window.mozInnerScreenY ? window.mozInnerScreenY : (y < 0 ? 0 : y);
	var caretPosition = document.caretPositionFromPoint(x, y);
	var node = caretPosition.offsetNode;

	/*
	// Only declare functions when context menu clicked
	// Adapted from https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Whitespace_in_the_DOM
	var is_all_ws = function (nod) {
		return !(/[^\t\n\r ]/.test(nod.textContent));
	};
	var is_ignorable = function (nod) {
		return (nod.nodeType === 8) || // A comment node
			((nod.nodeType === 3) && is_all_ws(nod)); // a text node, all ws
	};
	function first_significant_child (par) {
		var res = par.firstChild;
		while (res) {
			if (!is_ignorable(res)) {return res;}
			res = res.nextSibling;
		}
		return null;
	}
	*/
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
			/*
			var fsc, fec, deepestSafeNode = node;
			while (deepestSafeNode) { // e.g., the first node returned was <h1><a name="pg1"></a> Text</h1>
				fsc = first_significant_child(deepestSafeNode);
				fec = deepestSafeNode.firstElementChild;
				if (!fec || fsc !== fec) {
					break;
				}
				if (foundAnchor(fec)) {
					throw 'escape';
				}
				deepestSafeNode = fec;
			}
			*/
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
