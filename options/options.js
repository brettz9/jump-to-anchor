/* eslint-env browser, webextensions */
'use strict';
const {body, jml} = window.jml;

function _ (...args) {
    return browser.i18n.getMessage(...args);
}

document.title = _('jumpToAnchor'); // If switch to tabs

(async () => {
const backgroundPage = await browser.extension.getBackgroundPage();
const {isFirefox} = backgroundPage;
const {separateContextMenus = isFirefox} = await browser.storage.local.get(
    'separateContextMenus'
);
jml('section', [
    ['label', [
        _('separateContextMenus') + ' ',
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
], body);
})();
