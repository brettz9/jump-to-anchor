import '../polyfills/browser-polyfill.min.js';

/* eslint-env webextensions -- The environment */
const menuIDs = [];

/**
 *
 * @param {string} type
 * @param {string} context
 * @returns {void}
 */
function addContextMenu (type, context = 'all') {
    const menuID = browser.contextMenus.create({
        id: type,
        title: browser.i18n.getMessage(type),
        contexts: [context]
    });
    menuIDs.push(menuID);
}

const isFirefox = async () => {
    return browser.runtime.getBrowserInfo &&
    (await browser.runtime.getBrowserInfo()).name === 'Firefox';
};

const updateContextMenus = async function (cfg = {}) {
    /* const {
        hasSelection = await isFirefox()
    } = cfg; */
    try {
        await Promise.all(menuIDs.map((menuID) => {
            return browser.contextMenus.remove(menuID);
        }));
    } catch (err) {
        // Chrome can have issues here
    }
    const {
        separateContextMenus = await isFirefox()
    } = await browser.storage.local.get(
        'separateContextMenus'
    );
    if (separateContextMenus) {
        addContextMenu('jumpToAnchorSelection', 'selection');
        addContextMenu('jumpToAnchorClick');
    } else {
        addContextMenu('jumpToAnchor');
    }
};

browser.runtime.onConnect.addListener(async (portFromOptions) => {
    portFromOptions.postMessage({
        message: 'isFirefox',
        isFirefox: await isFirefox()
    // eslint-disable-next-line max-len -- Long
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- WebExt
    });

    portFromOptions.onMessage.addListener(async (m) => {
        await updateContextMenus();
    });
});

browser.runtime.onInstalled.addListener(updateContextMenus);

browser.contextMenus.onClicked.addListener(async ({menuItemId}, tab) => {
    await browser.tabs.sendMessage(tab.id, {menuItemId});
});
