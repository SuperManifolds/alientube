/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var BrowserPreferenceManager = (function () {
        function BrowserPreferenceManager() {
            var _this = this;
            switch (AlienTube.Main.getCurrentBrowser()) {
                case 0 /* CHROME */:
                    chrome.storage.sync.get(null, function (settings) {
                        _this.preferences = settings;
                    });
                    break;

                case 1 /* FIREFOX */:
                    self.on("message", function (msg) {
                        _this.preferences = msg.preferences.prefs;
                    });
                    break;

                case 2 /* SAFARI */:
                    var uuid = AlienTube.Main.generateUUID();
                    safari.self.addEventListener('message', function (event) {
                        if (event.name == uuid) {
                            var safariPref = JSON.parse(event.message);
                            _this.preferences = safariPref;
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
