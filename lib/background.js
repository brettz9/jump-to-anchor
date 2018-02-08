/* eslint-env webextensions */
'use strict';

browser.contextMenus.create({
    title: browser.i18n.getMessage('jumpToAnchor'),
    contexts: ['all']
});
browser.contextMenus.onClicked.addListener((info, tab) => {
    browser.tabs.sendMessage(tab.id, 'jumpToAnchor');
});
