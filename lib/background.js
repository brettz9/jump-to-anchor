/* eslint-env webextensions */
'use strict';

const menuIDs = [];

function addContextMenu (type) {
    const menuID = browser.contextMenus.create({
        id: type,
        title: browser.i18n.getMessage(type),
        contexts: ['all']
    });
    menuIDs.push(menuID);
}

async function updateContextMenus () {
    menuIDs.forEach((menuID) => {
        browser.contextMenus.remove(menuID);
    });
    const {separateContextMenus} = await browser.storage.local.get(
        'separateContextMenus'
    );
    if (separateContextMenus) {
        addContextMenu('jumpToAnchorSelection');
        addContextMenu('jumpToAnchorClick');
    } else {
        addContextMenu('jumpToAnchor');
    }
}

updateContextMenus();
browser.contextMenus.onClicked.addListener((info, tab) => {
    browser.tabs.sendMessage(tab.id, info.menuItemId);
});
