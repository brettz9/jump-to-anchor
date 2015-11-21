/*globals exports, require, console */
/*eslint-disable new-cap*/

var _ = require('sdk/l10n').get,
    data = require('sdk/self').data,
    tabs = require('sdk/tabs'),
    array = require('sdk/util/array'),
    cm = require('sdk/context-menu'),
    pmod = require('sdk/page-mod');

(function () {'use strict';

    // function l (msg) {console.log(msg);}

    var cm1, cm2, pageMod,
        pageWorkers = [];

    exports.main = function () {
        pageMod = pmod.PageMod({
            include: ['*', 'file://*'],
            contentScriptFile: data.url('findAncestor.js'),
            onAttach: function (worker) {
                array.add(pageWorkers, worker);
                // All of these are needed per
                //  http://stackoverflow.com/a/20251401/271577
                worker.on('pageshow', function () {
                    array.add(pageWorkers, this);
                });
                worker.on('pagehide', function () {
                    array.remove(pageWorkers, this);
                });
                worker.on('detach', function () {
                    array.remove(pageWorkers, this);
                });
            }
        });
        function contextMenu (dta) {
            var hasSelection = dta === 'jumpToAnchorWithSelection';
            if (dta === 'jumpToAnchor' || hasSelection) {
                var i;
                for (i = 0; i < pageWorkers.length; i++) {
                    if (pageWorkers[i].tab === tabs.activeTab) {
                        pageWorkers[i].port.emit('jumpToAnchor', hasSelection);
                    }
                }
            }
        }
        // context not working as array, so have to define twice

        cm1 = cm.Item({
            label: _("Jump to anchor"),
            context: cm.SelectorContext('*'),
            contentScriptWhen: 'start',
            contentScriptFile: data.url('context-menu.js'),
            onMessage: contextMenu
        });

        cm2 = cm.Item({
            label: _("Jump to anchor from selection"),
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
