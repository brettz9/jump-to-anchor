/* eslint-env browser, webextensions */
/* globals jml */
'use strict';
document.title = browser.i18n.getMessage('jumpToAnchor'); // If switch to tabs
(async () => {
const {separateContextMenus = true} = await browser.storage.local.get(
    'separateContextMenus'
);
jml('section', [
    ['label', [
        browser.i18n.getMessage('separateContextMenus') + ' ',
        ['input', {
            type: 'checkbox',
            checked: separateContextMenus,
            $on: {
                async change () {
                    await browser.storage.local.set({
                        separateContextMenus: this.checked
                    });
                    const backgroundPage = browser.extension.getBackgroundPage();
                    backgroundPage.updateContextMenus();
                }
            }
        }]
    ]]
], document.body);
})();
