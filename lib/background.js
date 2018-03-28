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

async function updateContextMenus ({hasSelection = true} = {}) {
    menuIDs.forEach((menuID) => {
        browser.contextMenus.remove(menuID);
    });
    const {separateContextMenus = true} = await browser.storage.local.get(
        'separateContextMenus'
    );
    if (separateContextMenus) {
        addContextMenu('jumpToAnchorSelection', 'selection');
        addContextMenu('jumpToAnchorClick');
    } else {
        addContextMenu('jumpToAnchor');
    }
}

updateContextMenus();

browser.contextMenus.onClicked.addListener((info, tab) => {
    browser.tabs.sendMessage(tab.id, info.menuItemId);
});
