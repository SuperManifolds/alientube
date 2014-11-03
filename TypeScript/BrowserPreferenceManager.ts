/// <reference path="Utilities.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Manages the Preferences across browsers.
        @class BrowserPreferenceManager
    */
    export class BrowserPreferenceManager {
        private preferences : Object;
        private evt;

		private defaults = {
            hiddenPostScoreThreshold: -4,
            hiddenCommentScoreThreshold: -4,
            showGooglePlusWhenNoPosts: true,
            rememberTabsOnViewChange: true,
            displayGooglePlusByDefault: false,
            redditUserIdentifierHash: "",
            excludedSubredditsSelectedByUser: []
        }

        constructor (callback?) {
            this.preferences = {};
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.get(null, (settings) => {
                        this.preferences = settings;
                        if (callback) {
                            callback();
                        }
                    });
                    break;

                case Browser.FIREFOX:
                    this.preferences = self.options.preferences;
                    if (callback) {
                        callback();
                    }
                    break;

                case Browser.SAFARI:
                    var listener = safari.self.addEventListener('message', (event) => {
                        var safariPref = JSON.parse(event.message);
                        this.preferences = safariPref;
                        if (callback) {
                            callback();
                        }
                    }, false);
                    safari.self.tab.dispatchMessage("settings", {
                        'type': 'get'
                    });
                    break;
            }
        }


        get (key: string): any {
            return this.preferences[key] !== null && typeof (this.preferences[key]) !== 'undefined' ? this.preferences[key] : this.defaults[key];
        }

        set (key: string, value: any): void {
            this.preferences[key] = value;
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.set(this.preferences);
                    break;

                case Browser.FIREFOX:
                    self.postMessage({
                        type: 'setSettingsValues',
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


        get enforcedExludedSubreddits () {
            return [
                "mensrights",
                "beatingcripples",
                "beatingwomen",
                "rapingwomen",
                "beatingchildren",
                "watchpeopledie",
                "pussypass",
                "theredpill",
                "redpillwomen",
                "protectandserve",
                "whiterights",
                "blackcrime",
                "whiterightsuk",
                "white_pride",
                "whitenationalism",
                "northwestfront",
                "stopwhitegenocide",
                "race_realism",
                "racism_immigration",
                "hate_crimes",
                "gdnews",
                "hbd",
                "rights4men",
                "muhfeelings",
                "polistan",
                "collapse"
            ];
        }
    }
}
