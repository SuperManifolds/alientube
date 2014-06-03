/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var BrowserPreferenceManager = (function () {
        function BrowserPreferenceManager() {
            this.evt = document.createEvent("Event");
            this.evt.initEvent("AlienTubePreferencesLoaded", true, true);
            switch (AlienTube.Main.getCurrentBrowser()) {
                case 0 /* CHROME */:
                    chrome.storage.sync.get(null, function (settings) {
                        this.preferences = settings;
                        dispatchEvent(this.evt);
                    });
                    break;

                case 1 /* FIREFOX */:
                    self.on("message", function (msg) {
                        this.preferences = msg.preferences.prefs;
                        dispatchEvent(this.evt);
                    });
                    break;

                case 2 /* SAFARI */:
                    var uuid = AlienTube.Main.generateUUID();
                    safari.self.addEventListener('message', function (event) {
                        if (event.name == uuid) {
                            var safariPref = JSON.parse(event.message);
                            this.preferences = safariPref;
                            dispatchEvent(this.evt);
                        }
                    }, false);
                    safari.self.tab.dispatchMessage(uuid, {
                        type: 'settings'
                    });
                    break;
            }
        }
        BrowserPreferenceManager.prototype.get = function (key) {
            return this.preferences[key];
        };

        BrowserPreferenceManager.prototype.set = function (key, value) {
            this.preferences[key] = value;
            switch (AlienTube.Main.getCurrentBrowser()) {
                case 0 /* CHROME */:
                    chrome.storage.sync.set({
                        key: value
                    });
                    break;

                case 1 /* FIREFOX */:
                    self.postMessage({
                        type: 'setSettingsValue',
                        key: key,
                        value: value
                    });
                    break;

                case 2 /* SAFARI */:
                    safari.self.tab.dispatchMessage(null, {
                        type: 'setSettingsValue',
                        key: key,
                        value: value
                    });
                    break;
            }
        };
        return BrowserPreferenceManager;
    })();
    AlienTube.BrowserPreferenceManager = BrowserPreferenceManager;
})(AlienTube || (AlienTube = {}));
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    document.addEventListener("DOMContentLoaded", function () {
        if (window.top === window) {
            new Main();
        }
    }, false);
    var Main = (function () {
        function Main() {
            this.preferences = new AlienTube.BrowserPreferenceManager();
            if (Main.getCurrentBrowser() == 2 /* SAFARI */) {
                var stylesheet = document.createElement("link");
                stylesheet.setAttribute("href", Main.getExtensionRessourcePath("style.css"));
                stylesheet.setAttribute("type", "text/css");
                stylesheet.setAttribute("rel", "stylesheet");
                document.head.appendChild(stylesheet);
            }
            document.addEventListener("AlienTubePreferencesLoaded", function () {
                alert("hi");
            }, false);
        }
        Main.getCurrentBrowser = function () {
            if (chrome)
                return 0 /* CHROME */;
            else if (self.on)
                return 1 /* FIREFOX */;
            else if (safari)
                return 2 /* SAFARI */;
            else {
                throw "Invalid Browser";
            }
        };

        Main.getExtensionRessourcePath = function (path) {
            switch (Main.getCurrentBrowser()) {
                case 2 /* SAFARI */:
                    return safari.extension.baseURI + 'res/' + path;
                case 0 /* CHROME */:
                    return chrome.extension.getURL('res/' + path);
                case 1 /* FIREFOX */:
                    return self.options[path];
                default:
                    return null;
            }
        };

        Main.generateUUID = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        return Main;
    })();
    AlienTube.Main = Main;
    (function (Browser) {
        Browser[Browser["CHROME"] = 0] = "CHROME";
        Browser[Browser["FIREFOX"] = 1] = "FIREFOX";
        Browser[Browser["SAFARI"] = 2] = "SAFARI";
    })(AlienTube.Browser || (AlienTube.Browser = {}));
    var Browser = AlienTube.Browser;
})(AlienTube || (AlienTube = {}));
