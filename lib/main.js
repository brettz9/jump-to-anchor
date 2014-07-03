/*globals exports, require, console */
/*jslint vars: true, todo:true */
(function () {'use strict';

function l (msg) {
	console.log(msg);
}

var cm1, cm2, pageMod,
	workers = [],
	_ = require('sdk/l10n').get,
	data = require('sdk/self').data,
	tabs = require('sdk/tabs'),
	cm = require('sdk/context-menu');

exports.main = function () {

	pageMod = require('sdk/page-mod').PageMod({
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
		var hasSelection = data === 'jumpToAnchorWithSelection';
		if (data === 'jumpToAnchor' || hasSelection) {
			var i;
			for (i = 0; i < workers.length; i++) {
				if (workers[i].tab === tabs.activeTab) {
					workers[i].port.emit('jumpToAnchor', hasSelection);
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
		onMessage: contextMenu
	});

	cm2 = cm.Item({
		label: _("Jump to anchor"),
		context: cm.SelectionContext(),
		contentScriptWhen: 'start',
		contentScriptFile: data.url('context-menu.js'),
		onMessage: contextMenu,
		data: 'hasSelection'
	});


};

exports.onUnload = function () { // reason
	if (cm1) {
		cm1.destroy();
	}
	if (cm2) {
		cm2.destroy();
	}
	if (pageMod) {
		pageMod.destroy();
	}
};


}());
