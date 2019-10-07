/* eslint-env webextensions */
'use strict';
const menuIDs = [];

function addContextMenu (type, context = 'all') {
    const menuID = browser.contextMenus.create({
        id: type,
        title: browser.i18n.getMessage(type),
        contexts: [context]
    });
    menuIDs.push(menuID);
}
// Used externally, so we declare outside of closure
var isFirefox, updateContextMenus; // eslint-disable-line no-var

(async () => {
isFirefox = browser.runtime.getBrowserInfo &&
    (await browser.runtime.getBrowserInfo()).name === 'Firefox';

updateContextMenus = async function updateContextMenus ({hasSelection = isFirefox} = {}) {
    await Promise.all(menuIDs.map((menuID) => {
        return browser.contextMenus.remove(menuID);
    }));
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

browser.contextMenus.onClicked.addListener(async ({menuItemId}, tab) => {
    await browser.tabs.sendMessage(tab.id, {menuItemId});
});
