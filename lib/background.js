/* eslint-env webextensions */
'use strict';

browser.contextMenus.create({
    title: browser.i18n.getMessage('jumpToAnchor'),
    contexts: ['all']
});

browser.contextMenus.onClicked.addListener(async (info) => {
    const results = await browser.tabs.executeScript({
        code: "typeof jumpToAnchor === 'function';"
    });
    if (!results || results[0] !== true) {
        browser.tabs.executeScript({
            allFrames: true,
            file: '/lib/content.js', // Cross-browser to use absolute path
            runAt: 'document_start'
        });
    } else {
        browser.tabs.executeScript({
            allFrames: true,
            code: 'jumpToAnchor();',
            runAt: 'document_start'
        });
    }
});
