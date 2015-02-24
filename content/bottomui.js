var EXPORTED_SYMBOLS = ["BottomUI", "PREF_BRANCH"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
const ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
const uri = ios.newURI('chrome://bottomui/content/bottomui.css', null, null);
const appver = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).version;
const NOT_AUSTRALIS = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(
    Ci.nsIVersionComparator).compare(appver, "29.*") == -1;
const PREF_BRANCH = "extensions.bottomui.";

function BUI() {

    Cu.import("chrome://bottomui/content/prefs.js");

    let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);

    let prefmanager = new PrefManager(
        PREF_BRANCH,
        "chrome://bottomui/content/defaultprefs.js",
        function (branch, name) {
            switch (name) {
            case "menubarLocation":
                forAllWindows(fMenubarLocation);
                break;
            case "windowButtonsLocation":
                forAllWindows(fCustomWinButtons);
                break;
            case "tabsOnTop":
                forAllWindows(fTabsOnTop);
                break;
            }
        }
    );

    function forAllWindows(f) {
        let enumerator = wm.getEnumerator("navigator:browser");
        while (enumerator.hasMoreElements()) {
            let win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
            f(win);
        }
    }

    function fMenubarLocation(window, opt) {
        let mwin = window.document.getElementById("main-window");
        if (!mwin) return;

        let option = (typeof opt !== 'undefined') ? opt : prefmanager.getPref(
            "menubarLocation");
        let bpanel = window.document.getElementById("browser-panel");
        let mbar = window.document.getElementById("toolbar-menubar");
        let ntoolbox = window.document.getElementById("navigator-toolbox");

        if (!mbar || !ntoolbox || !bpanel) return;

        mwin.setAttribute("buiMenubar", "false");
        mbar.setAttribute("autohide", "true");
        if (option > 0) {
            bpanel.insertBefore(mbar, bpanel.firstChild);
            if (option < 2) {
                mbar.setAttribute("autohide", "false");
                mwin.setAttribute("buiMenubar", "true");
            } else {
                mbar.setAttribute("autohide", "true");
            }
        } else {
            // restore menu bar position
            ntoolbox.insertBefore(mbar, ntoolbox.firstChild);
        }

    }

    function fCustomWinButtons(window, opt) {
        let option = (typeof opt !== 'undefined') ? opt : prefmanager.getPref(
            "windowButtonsLocation");
        let custom_buttons = window.document.getElementById(
            "window-controls-bui");
        if (option) {
            let target = window.document.getElementById(option);
            if (!target) return;
            if (!custom_buttons) {
                let wincontrols = window.document.getElementById(
                    "window-controls");
                let clone = wincontrols.cloneNode(true);
                clone.id += "-bui";
                clone.setAttribute("hidden", "false");
                let restore_button = clone.querySelector("#restore-button");
                let restore = function () {
                    if (window.windowState === 1) {
                        window.restore();
                    } else {
                        window.maximize();
                    }
                };
                restore_button.setAttribute("oncommand", "restore()");
                custom_buttons = clone;
            }
            target.appendChild(custom_buttons);

        } else if (custom_buttons) {
            custom_buttons.parentNode.removeChild(custom_buttons);
        }
    }

    function fTabsOnTop(window, opt) {
        let option = (typeof opt !== 'undefined') ? opt : prefmanager.getPref(
            "tabsOnTop");
        let tbar = window.document.getElementById("TabsToolbar");
        if (option) {
            tbar.setAttribute("tabsontop", true);
        } else {
            tbar.setAttribute("tabsontop", false);
        }
    }

    function fLegacyMenuButton(window, opt) {
        let app_but = window.document.getElementById(
            "appmenu-button-container");
        if (!app_but) return;

        let tbar = window.document.getElementById("TabsToolbar");
        tbar = tbar.querySelector(".titlebar-placeholder");
        if (!opt) {
            tbar = window.document.getElementById("titlebar-content");
        }
        if (tbar) {
            tbar.insertBefore(app_but, tbar.firstChild);
        }
    }

    function fLegacyCustomizeMode(window) {
        let navtool = window.document.getElementById("navigator-toolbox");
        if (!navtool) return;
        let beforeCus = function () {
            navtool.setAttribute("ordinal", "0");
        };
        let afterCus = function () {
            navtool.removeAttribute("ordinal");
        };
        window.addEventListener("beforecustomization", beforeCus, false);
        window.addEventListener("aftercustomization", afterCus, false);
        window.unloadfLegacyCustomizeMode = function () {
            window.removeEventListener("beforecustomization", beforeCus, false);
            window.removeEventListener("aftercustomization", afterCus, false);
        };
    }

    function loadIntoWindow(window) {
        if (!window) return;
        fMenubarLocation(window);
        fCustomWinButtons(window);
        fTabsOnTop(window);
        if (NOT_AUSTRALIS) {
            fLegacyMenuButton(window, 1);
            fLegacyCustomizeMode(window);
        }
    }

    function unloadFromWindow(window) {
        if (!window) return;
        let mwin = window.document.getElementById("main-window");
        fMenubarLocation(window, 0);
        fCustomWinButtons(window, null);
        fTabsOnTop(window, false);
        if (NOT_AUSTRALIS) {
            fLegacyMenuButton(window, 0);
            if (window.unloadfLegacyCustomizeMode) {
                window.unloadfLegacyCustomizeMode();
                delete window.unloadfLegacyCustomizeMode;
            }
        }
        mwin.removeAttribute("buiMenubar");
    }

    let windowListener = {
        onOpenWindow: function (aWindow) {
            let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            domWindow.addEventListener("load", function () {
                domWindow.removeEventListener("load", arguments.callee,
                    false);
                loadIntoWindow(domWindow);
            }, false);
        },
        onCloseWindow: function (aWindow) {},
        onWindowTitleChange: function (aWindow, aTitle) {}
    };

    this.load = function () {
        forAllWindows(loadIntoWindow);
        wm.addListener(windowListener);
        prefmanager.register();
        sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    };
    this.unload = function () {
        prefmanager.unregister();
        wm.removeListener(windowListener);
        forAllWindows(unloadFromWindow);
        sss.unregisterSheet(uri, sss.USER_SHEET);
    };
}

let BottomUI = new BUI();
