/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

module AlienTube {
	export class BrowserPreferenceManager {
        private preferences :Object;
        private evt;
        constructor() {
            switch (Main.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.get(null, (settings) => {
						this.preferences = settings;
                    });
                    break;

                case Browser.FIREFOX:
                    self.on("message", (msg) => {
                        this.preferences = msg.preferences.prefs;
                    });
                    break;

                case Browser.SAFARI:
                    var uuid = Main.generateUUID();
                    safari.self.addEventListener('message', (event) => {
                        if (event.name == uuid) {
                            var safariPref = JSON.parse(event.message);
                            this.preferences = safariPref;
                        }
                    }, false);
                    safari.self.tab.dispatchMessage(uuid, {
                        type: 'settings'
                    });
                    break;
            }
        }


        get(key :string):any {
            return this.preferences[key];
        }

        set(key :string, value :any):void {
            this.preferences[key] = value;
            switch (Main.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.set({
                        key: value
                    });
                    break;

                case Browser.FIREFOX:
                    self.postMessage({
                        type: 'setSettingsValue',
                        key: key,
                        value: value
                    });
                    break;

                case Browser.SAFARI:
                    safari.self.tab.dispatchMessage(null, {
                        type: 'setSettingsValue',
                        key: key,
                        value: value
                    });
                    break;
            }
        }
    }
}
