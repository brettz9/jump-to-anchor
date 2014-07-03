/*globals exports, require, console */
/*jslint vars: true, todo:true */
(function () {'use strict';

var chrome = require('chrome'),
	Cu = chrome.Cu,
	platform = require('sdk/system').platform;

function win_getMouseCoords () {
	Cu['import']('resource://gre/modules/ctypes.jsm');
	var lib = ctypes.open('user32.dll');

	/* Declare the signature of the function we are going to call */
	/* note: if you go to GetCursorPos page on MSDN it says that x and y are
	 * type Long, and in data types Long on MSDN it says it's a 64-byte signed
	 * integer, so before ctypes.int I was trying ctypes.int64_t
	 * but it wouldnt work, no clue why ctypes.int was the solution */
	var struct_Point = new ctypes.StructType('Point',
											   [{'x': ctypes.int}, {'y': ctypes.int}]);
	var GetCursorPos = lib.declare('GetCursorPos',
								   ctypes.winapi_abi,
								   ctypes.bool,
								   struct_Point.ptr);

	var point = new struct_Point;
	var ret = GetCursorPos(point.address());
	lib.close();
	return [point.x, point.y];
}


function l (msg) {
	console.log(msg);
}

var cm1, cm2,
	workers = [],
	_ = require('sdk/l10n').get,
	data = require('sdk/self').data,
	cm = require('sdk/context-menu');

exports.main = function () {

	var pageMod = require('sdk/page-mod').PageMod({
		include: ['*'],
		contentScriptFile: data.url('findAncestor.js'),
		onAttach: function(worker) {
			workers.push(worker);
			worker.on('detach', function () {
				var idx = workers.indexOf(worker);
				if (idx >= 0) {
					workers.splice(idx, 1);
				}
			});
		}
	});
	function contextMenu (data) {
		if (data === 'getMouseCoords') {
			var coords = platform === 'winnt' ? win_getMouseCoords() : null;
			var i, tabs = require('sdk/tabs');
			for (i = 0; i < workers.length; i++) {
				if (workers[i].tab === tabs.activeTab) {
					workers[i].port.emit('getMouseCoords', coords);
				}
			}
		}
	}
	// context not working as array, so have to define twice
	cm1 = cm.Item({
		label: _("Jump to anchor"),
		context: cm.PageContext(),
		contentScriptWhen: 'start',
		contentScriptFile: data.url('context-menu.js'),
		onMessage: contextMenu,
		data: platform
	});

	cm2 = cm.Item({
		label: _("Jump to anchor"),
		context: cm.SelectionContext(),
		contentScriptWhen: 'start',
		contentScriptFile: data.url('context-menu.js'),
		onMessage: contextMenu,
		data: platform
	});


};

exports.onUnload = function () { // reason
	if (cm1) {
		cm1.destroy();
	}
	if (cm2) {
		cm2.destroy();
	}
};


}());
