/* eslint-env browser, webextensions -- The environment */

import '../polyfills/browser-polyfill.min.js';
import {jml, body} from './jml.js';

/**
 *
 * @param {string} arg
 * @returns {string}
 */
function _ (arg) {
    return browser.i18n.getMessage(arg);
}

document.title = _('jumpToAnchor'); // If switch to tabs

const port = browser.runtime.connect({name: 'options-port'});

port.onMessage.addListener(async (msg) => {
    const {message, isFirefox} = /** @type {{message: string, isFirefox: boolean}} */ (
        msg
    );
    if (message !== 'isFirefox') {
        return;
    }
    const separateContextMenus = /** @type {boolean} */ ((await browser.storage.local.get(
        'separateContextMenus'
    )).separateContextMenus) ?? isFirefox;
    jml('section', [
        ['label', [
            _('separateContextMenus') + ' ',
            ['input', {
                type: 'checkbox',
                checked: separateContextMenus,
                $on: {
                    async change () {
                        await browser.storage.local.set({
                            separateContextMenus: /** @type {HTMLInputElement} */ (
                                this
                            ).checked
                        });
                        // eslint-disable-next-line max-len -- Long
                        // eslint-disable-next-line unicorn/require-post-message-target-origin -- WebExt
                        port.postMessage({message: 'updateContextMenus'});
                    }
                }
            }]
        ]]
    ], body);
});
