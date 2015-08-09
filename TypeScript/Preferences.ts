/// <reference path="Utilities.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
        * Manages the Preferences across browsers.
        * @class Preferences
    */
    export class Preferences {
        private static preferenceCache: Object;

        private static defaults = {
            hiddenPostScoreThreshold: -4,
            hiddenCommentScoreThreshold: -4,
            showGooglePlusWhenNoPosts: true,
            showGooglePlusButton: true,
            threadSortType: "confidence",
            redditUserIdentifierHash: "",
            excludedSubredditsSelectedByUser: [],
            displayGooglePlusByDefault: false,
            defaultDisplayAction: "alientube",
            channelDisplayActions: {}
        }
    	
        /**
         * Load the preferences from the browser.
         * @param [callback] Callback for when the preferences has been loaded.
         * @constructor
         */
        public static initialise(callback?) {
            Preferences.preferenceCache = {};
            switch (Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    /* Get the Chrome cloud sync preferences stored for AlienTube. */
                    chrome.storage.sync.get(null, (settings) => {
                        Preferences.preferenceCache = settings;
                        if (callback) {
                            callback();
                        }
                    });
                    break;

                case Browser.FIREFOX:
                    /* Get the Firefox preferences. */
                    Preferences.preferenceCache = self.options.preferences;
                    if (callback) {
                        callback();
                    }
                    break;

                case Browser.SAFARI:
                    if (safari.self.addEventListener) {
                        /* Make a request to the global page to retreive the settings */
                        var listener = safari.self.addEventListener('message', function listenerFunction(event) {
                            if (event.name === "preferences") {
                                Preferences.preferenceCache = event.message;
    
                                if (callback) {
                                    callback();
                                }
                            }
                        }, false);
                        safari.self.tab.dispatchMessage("getPreferences", null);
                        if (callback) {
                            callback();
                        }
                    } else {
                        var preferences = {};
                        var numKeys = localStorage.length;
                        for (var i = 0; i < numKeys; i++) {
                            var keyName = localStorage.key(i);
                            preferences[keyName] = localStorage.getItem(keyName);
                        }
                        Preferences.preferenceCache = preferences;
                        if (callback) {
                            callback();
                        }
                    }
                    break;
            }
        }

    	/**
         * Retrieve a value from preferences, or the default value for that key.
         * @private
         * @warning Should not be used on its own, use getString, getNumber, etc, some browsers *cough* Safari *cough* will not give the value in the correct type.
         * @param key The key of the preference item.
         * @returns An object for the key as stored by the browser.
         * @see getString getNumber getBoolean getArray getObject
         */
        private static get(key: string): any {
            if (Preferences.preferenceCache[key] !== null && typeof (Preferences.preferenceCache[key]) !== 'undefined') {
                return Preferences.preferenceCache[key]
            }
            return this.defaults[key];
        }
    	
        /**
         * Retreive a string from preferences, or the default string value for that key.
         * @param key the Key of the preference item.
         * @returns A string for the key as stored by the browser.
         * @see getNumber getBoolean getArray getObject
         */
        public static getString(key: string): string {
            return Preferences.get(key);
        }

        /**
         * Retreive a number from preferences, or the default numeric value for that key.
         * @param key the Key of the preference item.
         * @returns A number for the key as stored by the browser.
         * @see getString getBoolean getArray getObject
         */
        public static getNumber(key: string): number {
            return parseInt(Preferences.get(key), 10);
        }

        /**
         * Retreive a boolean value from preferences, or the default boolean value for that key.
         * @param key the Key of the preference item.
         * @returns A boolean for the key as stored by the browser.
         * @see getString getNumber getArray getObject
         */
        public static getBoolean(key: string): boolean {
            return Utilities.parseBoolean(Preferences.get(key));
        }

        /**
         * Retreive an array from preferences, or the default array list for that key.
         * @param key the Key of the preference item.
         * @returns An array for the key as stored by the browser.
         * @see getString getNumber getBoolean getObject
         */
        public static getArray(key: string): string[] {
            if (Array.isArray(Preferences.get(key))) {
                return Preferences.get(key);
            }
            return JSON.parse(Preferences.get(key));
        }
        
        /**
         * Retreive an object from preferences, or the value for that key.
         * @param key the Key of the preference item.
         * @returns An object for the key as stored by the browser.
         * @see getString getNumber getBoolean getArray
         * @throws SyntaxError
         */
        public static getObject(key: string): Object {
            if (typeof Preferences.get(key) === 'object') {
                return Preferences.get(key);
            }
            return JSON.parse(Preferences.get(key));
        }

        /**
         * Insert or edit an item into preferences.
         * @param key The key of the preference item you wish to add or edit.
         * @param value The value you wish to insert.
         */
        public static set(key: string, value: any): void {
            Preferences.preferenceCache[key] = value;
            switch (Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.set(Preferences.preferenceCache);
                    break;

                case Browser.FIREFOX:
                    if (typeof value === "object") {
                        value = JSON.stringify(value);
                    }
                    self.port.emit("setSettingsValue", {
                        key: key,
                        value: value
                    });
                    break;

                case Browser.SAFARI:
                    if (typeof value === "object") {
                        value = JSON.stringify(value);
                    }
                
                    if (safari.self.addEventListener) {
                        safari.self.tab.dispatchMessage("setPreference", {
                            'key': key,
                            'value': value
                        });
                    } else {
                        localStorage.setItem(key, value);
                    }
                    break;
            }
        }
        
        /**
         * Reset all the settings for the extension.
         */
        public static reset(): void {
            Preferences.preferenceCache = {};
            switch (Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.remove(Object.keys(Preferences.defaults));
                    break;

                case Browser.FIREFOX:
                    self.port.emit("eraseSettings", null);
                    break;

                case Browser.SAFARI:
                    safari.self.tab.dispatchMessage("erasePreferences", null);
                    break;
            }
        } 

        /**
         * Get a list of subreddits that will not be displayed by AlienTube, either because they are not meant to show up in searches (bot accunulation subreddits) or because they are deemed too unsettling.
         * @returns An array list of subreddit names as strings.
         */
        public static get enforcedExludedSubreddits() {
            return [
                "beatingcripples",
                "rapingwomen",
                "beatingchildren",
                "theredpill",
                "redpillwomen",
                "whiterights",
                "blackcrime",
                "whiterightsuk",
                "northwestfront",
                "gdnews",
                "polistan",
                "retardedcripples",
                "killingboys",
                "coontown",
                "arandabottest"
            ];
        }
    }
}
