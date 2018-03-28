/* eslint-env browser, webextensions */
/* globals jml */
'use strict';
document.title = browser.i18n.getMessage('jumpToAnchor'); // If switch to tabs

const backgroundPage = browser.extension.getBackgroundPage();
const isFirefox = backgroundPage.isFirefox;

(async () => {
const {separateContextMenus = isFirefox} = await browser.storage.local.get(
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
                    backgroundPage.updateContextMenus();
                }
            }
        }]
    ]]
], document.body);
})();
