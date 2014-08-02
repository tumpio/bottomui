function startup(aData, aReason) {
    Components.utils
        .import("chrome://bottomui/content/bottomui.js");
    BottomUI.load();
}

function shutdown(aData, aReason) {
    if (aReason == APP_SHUTDOWN) return;
    BottomUI.unload();
}

function install(aData, aReason) {}

function uninstall(aData, aReason) {
    // Remove extension preferences on addon uninstall
    if (aReason == ADDON_UNINSTALL) {
        let prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
        prefs.deleteBranch("extensions.bottomui.");
    }
}
