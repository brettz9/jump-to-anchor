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

    const {enableCopyContextMenu} = await browser.storage.local.get(
        'enableCopyContextMenu'
    );

    jml('main', [
        ['section', [
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
        ]],
        ['section', [
            ['label', [
                _('enableCopyContextMenu') + ' ',
                ['input', {
                    type: 'checkbox',
                    checked: enableCopyContextMenu,
                    $on: {
                        async change () {
                            await browser.storage.local.set({
                                enableCopyContextMenu: this.checked
                            });
                            // eslint-disable-next-line max-len -- Long
                            // eslint-disable-next-line unicorn/require-post-message-target-origin -- WebExt
                            port.postMessage({message: 'updateContextMenus'});
                        }
                    }
                }]
            ]]
        ]]
    ], body);
});
