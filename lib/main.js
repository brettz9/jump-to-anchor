/*globals exports, require, console */
/*jslint vars: true, todo:true */
(function () {'use strict';


function l (msg) {
	console.log(msg);
}

var cm1, cm2,
	_ = require('sdk/l10n').get,
	data = require('sdk/self').data,
	cm = require('sdk/context-menu');

exports.main = function () {

	// context not working as array, so have to define twice
	cm1 = cm.Item({
		label: _("Jump to anchor"),
		context: cm.PageContext(),
		contentScriptWhen: 'start',
		contentScriptFile: data.url('findAncestor.js')
		// , data: ''
	});

	cm2 = cm.Item({
		label: _("Jump to anchor"),
		context: cm.SelectionContext(),
		contentScriptWhen: 'start',
		contentScriptFile: data.url('findAncestor.js')
		// , data: ''
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
