/*globals self */
self.on('click', function (node, data) {'use strict';
	if (data) {
		self.postMessage('jumpToAnchorWithSelection');
		return;
	}
	self.postMessage('jumpToAnchor');
});
