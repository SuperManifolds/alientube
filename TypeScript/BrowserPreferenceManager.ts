/// <reference path="Utilities.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
"use strict";
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
            showGooglePlusButton: true,
            threadSortType: "confidence",
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
                            callback(this);
                        }
                    });
                    break;

                case Browser.FIREFOX:
                    this.preferences = self.options.preferences;
                    if (callback) {
                        callback(this);
                    }
                    break;

                case Browser.SAFARI:
                    var listener = safari.self.addEventListener('message', function listenerFunction (event) {
                        if (event.name === "preferences") {
                            console.log("received");
                            this.preferences = event.message;

                            if (callback) {
                                callback(this);
                            }
                        }
                    }, false);
                    safari.self.tab.dispatchMessage("getPreferences", null);
                    if (callback) {
                        callback(this);
                    }
                    break;
            }
        }


        private get (key: string) : any {
            return this.preferences[key] !== null && typeof (this.preferences[key]) !== 'undefined' ? this.preferences[key] : this.defaults[key];
        }

        getString (key : string) : string {
            return this.get(key);
        }

        getNumber (key : string) : number {
            return parseInt(this.get(key), 10);
        }

        getBoolean (key : string) : boolean {
            return window.parseBoolean(this.get(key));
        }

        getArray (key : string) : string[] {
            if (Array.isArray(this.get(key))) {
                return this.get(key);
            }
            return JSON.parse(this.get(key));
        }

        set (key: string, value: any): void {
            this.preferences[key] = value;
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.set(this.preferences);
                    break;

                case Browser.FIREFOX:
                    self.port.emit("setSettingsValue", {
                        key: key,
                        value: value
                    });
                    break;

                case Browser.SAFARI:
                    safari.self.tab.dispatchMessage("setPreference", {
                        'key': key,
                        'value': value
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
                "collapse",
                "retardedcripples",
                "killingboys"
            ];
        }
    }
}
