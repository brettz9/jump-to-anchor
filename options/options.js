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

const port = browser.runtime.connect({name: 'options-port'});

port.onMessage.addListener(async ({message, isFirefox}) => {
    if (message !== 'isFirefox') {
        return;
    }
    const {
        separateContextMenus = isFirefox
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
                        // eslint-disable-next-line max-len -- Long
                        // eslint-disable-next-line unicorn/require-post-message-target-origin -- WebExt
                        port.postMessage({message: 'updateContextMenus'});
                    }
                }
            }]
        ]]
    ], body);
});
