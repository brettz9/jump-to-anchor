/*globals self, MouseEvent */
/*jslint vars:true, browser:true*/
self.on('click', function (node, platform) {'use strict';
	self.postMessage('getMouseCoords', 'ready');
	/*
	if (platform === 'winnt') { // Since 'x' is not showing the first time, we fire on the node, though this means it will be less than perfect for first click!
		postMessage('getMouseCoords');
		return;
	}
	// Shouldn't get here
	node.dispatchEvent(new MouseEvent('click', {
		button: 2
	}));
	*/
});
