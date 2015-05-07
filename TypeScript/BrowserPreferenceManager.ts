/// <reference path="Utilities.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
        * Manages the Preferences across browsers.
        * @class BrowserPreferenceManager
        * @param [callback] Callback for when the preferences has been loaded.
    */
    export class BrowserPreferenceManager {
        private preferences : Object;
        private evt;

		private defaults = {
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
        constructor (callback?) {
            this.preferences = {};
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    /* Get the Chrome cloud sync preferences stored for AlienTube. */
                    chrome.storage.sync.get(null, (settings) => {
                        this.preferences = settings;
                        if (callback) {
                            callback(this);
                        }
                    });
                    break;

                case Browser.FIREFOX:
                    /* Get the Firefox preferences. */
                    this.preferences = self.options.preferences;
                    if (callback) {
                        callback(this);
                    }
                    break;

                case Browser.SAFARI:
                    /* Make a request to the global page to retreive the settings */
                    var listener = safari.self.addEventListener('message', function listenerFunction (event) {
                        if (event.name === "preferences") {
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

    	/**
         * Retrieve a value from preferences, or the default value for that key.
         * @private
         * @warning Should not be used on its own, use getString, getNumber, etc, some browsers *cough* Safari *cough* will not give the value in the correct type.
         * @param key The key of the preference item.
         * @returns An object for the key as stored by the browser.
         * @see getString getNumber getBoolean getArray getObject
         */
        private get (key: string) : any {
            if (this.preferences[key] !== null && typeof (this.preferences[key]) !== 'undefined') {
                return this.preferences[key]
            }
            return this.defaults[key];
        }
    	
        /**
         * Retreive a string from preferences, or the default string value for that key.
         * @param key the Key of the preference item.
         * @returns A string for the key as stored by the browser.
         * @see getNumber getBoolean getArray getObject
         */
        public getString (key : string) : string {
            return this.get(key);
        }

        /**
         * Retreive a number from preferences, or the default numeric value for that key.
         * @param key the Key of the preference item.
         * @returns A number for the key as stored by the browser.
         * @see getString getBoolean getArray getObject
         */
        public getNumber (key : string) : number {
            return parseInt(this.get(key), 10);
        }

        /**
         * Retreive a boolean value from preferences, or the default boolean value for that key.
         * @param key the Key of the preference item.
         * @returns A boolean for the key as stored by the browser.
         * @see getString getNumber getArray getObject
         */
        public getBoolean (key : string) : boolean {
            return window.parseBoolean(this.get(key));
        }

        /**
         * Retreive an array from preferences, or the default array list for that key.
         * @param key the Key of the preference item.
         * @returns An array for the key as stored by the browser.
         * @see getString getNumber getBoolean getObject
         */
        public getArray (key : string) : string[] {
            if (Array.isArray(this.get(key))) {
                return this.get(key);
            }
            return JSON.parse(this.get(key));
        }
        
        /**
         * Retreive an object from preferences, or the value for that key.
         * @param key the Key of the preference item.
         * @returns An object for the key as stored by the browser.
         * @see getString getNumber getBoolean getArray
         * @throws SyntaxError
         */
        public getObject (key : string) : Object {
            if (typeof this.get(key) === 'object') {
                return this.get(key);
            }
            return JSON.parse(this.get(key));
        }

        /**
         * Insert or edit an item into preferences.
         * @param key The key of the preference item you wish to add or edit.
         * @param value The value you wish to insert.
         */
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

        /**
         * Get a list of subreddits that will not be displayed by AlienTube, either because they are not meant to show up in searches (bot accunulation subreddits) or because they are deemed too unsettling.
         * @returns An array list of subreddit names as strings.
         */
        public get enforcedExludedSubreddits () {
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
                "killingboys",
                "arandabottest"
            ];
        }
    }
}
