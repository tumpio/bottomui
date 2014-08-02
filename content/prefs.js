var EXPORTED_SYMBOLS = ["PrefManager"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");


/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {string} default_prefs_uri
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PrefManager(branch_name, default_prefs_uri, callback) {

    let prefsService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
    this.branch = prefsService.getBranch(branch_name);
    this.callback = callback;
    let branch = prefsService.getDefaultBranch(branch_name);
    let prefLoaderScope = {
        pref: function (key, val) {

            if (key.indexOf(branch_name) === 0) {
                key = key.slice(branch_name.length);
            }

            switch (typeof val) {
            case "boolean":
                branch.setBoolPref(key, val);
                break;
            case "number":
                branch.setIntPref(key, val);
                break;
            case "string":
                branch.setCharPref(key, val);
                break;
            }
        }
    };
    // setup default prefs
    Services.scriptloader.loadSubScript(default_prefs_uri, prefLoaderScope);
}

PrefManager.prototype.observe = function(subject, topic, data) {
  if (topic == 'nsPref:changed')
    this.callback(this.branch, data);
};

PrefManager.prototype.register = function() {
  this.branch.addObserver('', this, false);
};

PrefManager.prototype.unregister = function() {
  if (this.branch) {
    this.branch.removeObserver('', this);
  }
};

PrefManager.prototype.getPref = function (pref_name) {
    switch (this.branch.getPrefType(pref_name)) {
    case this.branch.PREF_STRING:
        return this.branch.getCharPref(pref_name);
    case this.branch.PREF_INT:
        return this.branch.getIntPref(pref_name);
    case this.branch.PREF_BOOL:
        return this.branch.getBoolPref(pref_name);
    default:
        return null;
    }
};
