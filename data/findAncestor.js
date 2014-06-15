/*globals self */
/*jslint vars:true, browser:true*/

self.on('click', function (node) {'use strict'; // , data

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
		var deepestSafeNode, fsc, fec;
		do {
			if (foundAnchor(node)) {
				break;
			}
			deepestSafeNode = node;
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
