/* eslint-env webextensions */
'use strict';
const menuIDs = [];

function addContextMenu (type, context = 'all') {
    const menuID = browser.contextMenus.create({
        id: type,
        title: browser.i18n.getMessage(type),
        contexts: [context],
        async onclick ({frameId, menuItemId, targetElementId}, tab) {
            await browser.tabs.executeScript(tab.id, {
                frameId,
                file: '/polyfills/browser-polyfill.min.js'
            });
            await browser.tabs.executeScript(tab.id, {
                frameId,
                file: '/lib/content.js'
            });
            await browser.tabs.sendMessage(tab.id, {menuItemId, targetElementId});
        }
    });
    menuIDs.push(menuID);
}
// Used externally, so we declare outside of closure
var isFirefox, updateContextMenus; // eslint-disable-line no-var

(async () => {
isFirefox = browser.runtime.getBrowserInfo &&
    (await browser.runtime.getBrowserInfo()).name === 'Firefox';

updateContextMenus = async function updateContextMenus ({hasSelection = isFirefox} = {}) {
    try {
        await Promise.all(menuIDs.map((menuID) => {
            return browser.contextMenus.remove(menuID);
        }));
    } catch (err) {
        // Chrome can have issues here
    }
    const {separateContextMenus = isFirefox} = await browser.storage.local.get(
        'separateContextMenus'
    );
    if (separateContextMenus) {
        addContextMenu('jumpToAnchorSelection', 'selection');
        addContextMenu('jumpToAnchorClick');
    } else {
        addContextMenu('jumpToAnchor');
    }
};

updateContextMenus();
})();
