/// <reference path="index.ts" />
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

        constructor () {
            this.preferences = {};
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.get(null, (settings) => {
                        this.preferences = settings;
                    });
                    break;

                case Browser.FIREFOX:
                    this.preferences = self.options.preferences;
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
