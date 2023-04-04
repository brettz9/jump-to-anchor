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

// eslint-disable-next-line no-var, vars-on-top -- Globals
var isFirefox, updateContextMenus;

// eslint-disable-next-line unicorn/prefer-top-level-await -- Envt
(async () => {
// Used externally, so we declare outside of closure
isFirefox = browser.runtime.getBrowserInfo &&
    (await browser.runtime.getBrowserInfo()).name === 'Firefox';

updateContextMenus = async function ({
    hasSelection = isFirefox
} = {}) {
    try {
        await Promise.all(menuIDs.map((menuID) => {
            return browser.contextMenus.remove(menuID);
        }));
    } catch (err) {
        // Chrome can have issues here
    }
    const {separateContextMenus = isFirefox} = await browser.storage.local.get(
        'separateContextMenus'
    );
    if (separateContextMenus) {
        addContextMenu('jumpToAnchorSelection', 'selection');
        addContextMenu('jumpToAnchorClick');
    } else {
        addContextMenu('jumpToAnchor');
    }
};
})();

browser.runtime.onInstalled.addListener(updateContextMenus);

browser.contextMenus.onClicked.addListener(async ({menuItemId}, tab) => {
    await browser.tabs.sendMessage(tab.id, {menuItemId});
});
