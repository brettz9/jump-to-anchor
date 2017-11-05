/*globals chrome*/
'use strict';

chrome.contextMenus.create({
    title: chrome.i18n.getMessage('jumpToAnchor'),
    contexts: ['all']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, 'jumpToAnchor');
});
