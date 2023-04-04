/* eslint-env browser, webextensions -- The environment */

import '../polyfills/browser-polyfill.min.js';
import {jml, body} from './jml.js';

/**
 *
 * @param {...any} args
 * @returns {string}
 */
function _ (...args) {
    return browser.i18n.getMessage(...args);
}

document.title = _('jumpToAnchor'); // If switch to tabs

// eslint-disable-next-line unicorn/prefer-top-level-await -- Envt
(async () => {
const backgroundPage = await browser.extension.getBackgroundPage();
const {isFirefox} = backgroundPage;
const {
    separateContextMenus = await isFirefox()
} = await browser.storage.local.get(
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
