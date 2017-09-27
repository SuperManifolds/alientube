/// <reference path="../typings/safari/safari.d.ts" />
/// <reference path="../HttpRequest.ts" />
/// <reference path="../Utilities.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
/// <reference path="es6-promise.d.ts" /> 
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    "use strict";
    var Utilities = /** @class */ (function () {
        function Utilities() {
        }
        /**
            * Determine a reddit post is more than 6 months old, and thereby in preserved status.
            * @param this The unix epoch time of the post.
            * @returns Boolean saying whether the post is preserved or not.
        */
        Utilities.isRedditPreservedPost = function (post) {
            if (!post) {
                return false;
            }
            var currentEpochTime = ((new Date()).getTime() / 1000);
            return ((currentEpochTime - post.created_utc) >= 15552000);
        };
        /**
            Determine whether the current url of the tab is a YouTube video page.
        */
        Utilities.isVideoPage = function () {
            return (window.location.pathname === "watch" || document.querySelector("meta[og:type]").getAttribute("content") === "video");
        };
        Utilities.parseBoolean = function (arg) {
            switch (typeof (arg)) {
                case "string":
                    return arg.trim().toLowerCase() === "true";
                case "number":
                    return arg > 0;
                default:
                    return arg;
            }
        };
        Utilities.getCurrentBrowser = function () {
            if (typeof (chrome) !== 'undefined')
                return Browser.CHROME;
            else if (typeof (self.on) !== 'undefined')
                return Browser.FIREFOX;
            else if (typeof (safari) !== 'undefined')
                return Browser.SAFARI;
            else {
                throw "Invalid Browser";
            }
        };
        return Utilities;
    }());
    AlienTube.Utilities = Utilities;
})(AlienTube || (AlienTube = {}));
var Browser;
(function (Browser) {
    Browser[Browser["CHROME"] = 0] = "CHROME";
    Browser[Browser["FIREFOX"] = 1] = "FIREFOX";
    Browser[Browser["SAFARI"] = 2] = "SAFARI";
})(Browser || (Browser = {}));
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * HttpRequest interface across Browsers.
        * @class HttpRequest
        * @param url URL to make the request to.
        * @param type Type of request to make (GET or POST)
        * @param callback Callback handler for the event when loaded.
        * @param [postdata] Key-Value object containing POST data.
    */
    "use strict";
    var HttpRequest = /** @class */ (function () {
        function HttpRequest(url, type, callback, postData, errorHandler) {
            if (AlienTube.Utilities.getCurrentBrowser() === Browser.SAFARI && safari.self.addEventListener) {
                /* Generate a unique identifier to identify our request and response through Safari's message system. */
                var uuid_1 = HttpRequest.generateUUID();
                /* Message the global page to have it perform a web request for us. */
                var listener = safari.self.addEventListener('message', function listenerFunction(event) {
                    if (event.message.uuid !== uuid_1)
                        return;
                    if (event.message.data && callback) {
                        callback(event.message.data);
                    }
                    else if (event.message.error && errorHandler) {
                        errorHandler(event.message.error);
                    }
                    safari.self.removeEventListener('message', listenerFunction, false);
                }, false);
                safari.self.tab.dispatchMessage("XHR", {
                    'url': url,
                    'uuid': uuid_1,
                    'requestType': type,
                    'postData': postData
                });
            }
            else {
                var xhr_1 = new XMLHttpRequest();
                xhr_1.open(RequestType[type], url, true);
                xhr_1.withCredentials = true;
                if (type === RequestType.POST) {
                    xhr_1.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                }
                xhr_1.onerror = function (e) {
                    if (errorHandler)
                        errorHandler(xhr_1.status);
                }.bind(this);
                xhr_1.onload = function () {
                    if (HttpRequest.acceptableResponseTypes.indexOf(xhr_1.status) !== -1) {
                        /* This is an acceptable response, we can now call the callback and end successfuly. */
                        if (callback) {
                            callback(xhr_1.responseText);
                        }
                    }
                    else {
                        /* There was an error */
                        if (errorHandler)
                            errorHandler(xhr_1.status);
                    }
                }.bind(this);
                /* Convert the post data array to a query string. */
                if (type === RequestType.POST) {
                    var query = [];
                    for (var key in postData) {
                        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(postData[key]));
                    }
                    xhr_1.send(query.join('&'));
                }
                else {
                    xhr_1.send();
                }
            }
        }
        /**
        * Generate a UUID 4 sequence.
        * @returns A UUID 4 sequence as string.
        * @private
        */
        HttpRequest.generateUUID = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        HttpRequest.acceptableResponseTypes = [200, 201, 202, 301, 302, 303, 0];
        return HttpRequest;
    }());
    AlienTube.HttpRequest = HttpRequest;
    var RequestType;
    (function (RequestType) {
        RequestType[RequestType["GET"] = 0] = "GET";
        RequestType[RequestType["POST"] = 1] = "POST";
    })(RequestType = AlienTube.RequestType || (AlienTube.RequestType = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="Utilities.ts" />
/// <reference path="HttpRequest.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * Starts a new instance of the Localisation Manager, for handling language.
        * @class LocalisationManager
        * @param [callback] a callback method to be called after the localisation files has been loaded.
    */
    "use strict";
    var LocalisationManager = /** @class */ (function () {
        function LocalisationManager(callback) {
            this.supportedLocalisations = [
                'en',
                'en-US',
                'no',
                'es',
                'fr'
            ];
            switch (AlienTube.Utilities.getCurrentBrowser()) {
                case Browser.SAFARI:
                    var localisation = navigator.language.split('-')[0];
                    if (this.supportedLocalisations.indexOf(localisation) === -1) {
                        localisation = "en";
                    }
                    new AlienTube.HttpRequest(safari.extension.baseURI + "_locales/" + localisation + "/messages.json", AlienTube.RequestType.GET, function (data) {
                        this.localisationData = JSON.parse(data);
                        if (callback) {
                            requestAnimationFrame(callback);
                        }
                    }.bind(this));
                    break;
                case Browser.FIREFOX:
                    this.localisationData = JSON.parse(self.options.localisation);
                    if (callback) {
                        requestAnimationFrame(callback);
                    }
                    break;
                default:
                    if (callback) {
                        requestAnimationFrame(callback);
                    }
                    break;
            }
        }
        /**
            * Retrieve a localised string by key
            * @param key The key in the localisation file representing a language string.
            * @param [placeholders] An array of values for the placeholders in the string.
            * @returns The requested language string.
        */
        LocalisationManager.prototype.get = function (key, placeholders) {
            switch (AlienTube.Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    if (placeholders) {
                        return chrome.i18n.getMessage(key, placeholders);
                    }
                    else {
                        return chrome.i18n.getMessage(key);
                    }
                case Browser.SAFARI:
                case Browser.FIREFOX:
                    if (placeholders) {
                        var localisationItem = this.localisationData[key];
                        if (localisationItem) {
                            var message = localisationItem.message;
                            for (var placeholder in localisationItem.placeholders) {
                                if (localisationItem.placeholders.hasOwnProperty(placeholder)) {
                                    var placeHolderArgumentIndex = parseInt(localisationItem.placeholders[placeholder].content.substring(1), 10);
                                    message = message.replace("$" + placeholder.toUpperCase() + "$", placeholders[placeHolderArgumentIndex - 1]);
                                }
                            }
                            return message;
                        }
                    }
                    else {
                        return this.localisationData[key] ? this.localisationData[key].message : "";
                    }
                    break;
            }
            return "";
        };
        /**
         * Retreive a localised string related to a number of items, localising plurality by language.
         * @param key The key for the non-plural version of the string.
         * @param value The number to localise by.
         * @returns The requested language string.
         */
        LocalisationManager.prototype.getWithLocalisedPluralisation = function (key, value) {
            if (value > 1 || value === 0) {
                return this.get(key + "_plural");
            }
            else {
                return this.get(key);
            }
        };
        return LocalisationManager;
    }());
    AlienTube.LocalisationManager = LocalisationManager;
})(AlienTube || (AlienTube = {}));
/// <reference path="Utilities.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * Manages the Preferences across browsers.
        * @class Preferences
    */
    "use strict";
    var Preferences = /** @class */ (function () {
        function Preferences() {
        }
        /**
         * Load the preferences from the browser.
         * @param [callback] Callback for when the preferences has been loaded.
         * @constructor
         */
        Preferences.initialise = function (callback) {
            Preferences.preferenceCache = {};
            switch (AlienTube.Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    /* Get the Chrome cloud sync preferences stored for AlienTube. */
                    chrome.storage.sync.get(null, function (settings) {
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
                    }
                    else {
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
        };
        /**
         * Retrieve a value from preferences, or the default value for that key.
         * @private
         * @warning Should not be used on its own, use getString, getNumber, etc, some browsers *cough* Safari *cough* will not give the value in the correct type.
         * @param key The key of the preference item.
         * @returns An object for the key as stored by the browser.
         * @see getString getNumber getBoolean getArray getObject
         */
        Preferences.get = function (key) {
            if (Preferences.preferenceCache[key] !== null && typeof (Preferences.preferenceCache[key]) !== 'undefined') {
                return Preferences.preferenceCache[key];
            }
            return this.defaults[key];
        };
        /**
         * Retreive a string from preferences, or the default string value for that key.
         * @param key the Key of the preference item.
         * @returns A string for the key as stored by the browser.
         * @see getNumber getBoolean getArray getObject
         */
        Preferences.getString = function (key) {
            return Preferences.get(key);
        };
        /**
         * Retreive a number from preferences, or the default numeric value for that key.
         * @param key the Key of the preference item.
         * @returns A number for the key as stored by the browser.
         * @see getString getBoolean getArray getObject
         */
        Preferences.getNumber = function (key) {
            return parseInt(Preferences.get(key), 10);
        };
        /**
         * Retreive a boolean value from preferences, or the default boolean value for that key.
         * @param key the Key of the preference item.
         * @returns A boolean for the key as stored by the browser.
         * @see getString getNumber getArray getObject
         */
        Preferences.getBoolean = function (key) {
            return AlienTube.Utilities.parseBoolean(Preferences.get(key));
        };
        /**
         * Retreive an array from preferences, or the default array list for that key.
         * @param key the Key of the preference item.
         * @returns An array for the key as stored by the browser.
         * @see getString getNumber getBoolean getObject
         */
        Preferences.getArray = function (key) {
            if (Array.isArray(Preferences.get(key))) {
                return Preferences.get(key);
            }
            return JSON.parse(Preferences.get(key));
        };
        /**
         * Retreive an object from preferences, or the value for that key.
         * @param key the Key of the preference item.
         * @returns An object for the key as stored by the browser.
         * @see getString getNumber getBoolean getArray
         * @throws SyntaxError
         */
        Preferences.getObject = function (key) {
            if (typeof Preferences.get(key) === 'object') {
                return Preferences.get(key);
            }
            return JSON.parse(Preferences.get(key));
        };
        /**
         * Insert or edit an item into preferences.
         * @param key The key of the preference item you wish to add or edit.
         * @param value The value you wish to insert.
         */
        Preferences.set = function (key, value) {
            Preferences.preferenceCache[key] = value;
            switch (AlienTube.Utilities.getCurrentBrowser()) {
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
                    }
                    else {
                        localStorage.setItem(key, value);
                    }
                    break;
            }
        };
        /**
         * Reset all the settings for the extension.
         */
        Preferences.reset = function () {
            Preferences.preferenceCache = {};
            switch (AlienTube.Utilities.getCurrentBrowser()) {
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
        };
        Object.defineProperty(Preferences, "enforcedExludedSubreddits", {
            /**
             * Get a list of subreddits that will not be displayed by AlienTube, either because they are not meant to show up in searches (bot accunulation subreddits) or because they are deemed too unsettling.
             * @returns An array list of subreddit names as strings.
             */
            get: function () {
                return [
                    "theredpill",
                    "redpillwomen",
                    "whiterights",
                    "whiterightsuk",
                    "northwestfront",
                    "gdnews",
                    "polistan",
                    "retardedcripples",
                    "arandabottest"
                ];
            },
            enumerable: true,
            configurable: true
        });
        Preferences.defaults = {
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
        };
        return Preferences;
    }());
    AlienTube.Preferences = Preferences;
})(AlienTube || (AlienTube = {}));
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        Class for managing API keys to third party APIs. This is seperated to easily exclude them in source control.
        @class APIKeys
    */
    "use strict";
    var APIKeys = /** @class */ (function () {
        function APIKeys() {
        }
        APIKeys.youtubeAPIKey = "";
        return APIKeys;
    }());
    AlienTube.APIKeys = APIKeys;
})(AlienTube || (AlienTube = {}));
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * Version migration of preferences and other necessary conversions.
        * @class Migration
        * @param lastVersion The version of AlienTube the last time the extension was run.
    */
    "use strict";
    var Migration = /** @class */ (function () {
        function Migration(lastVersion) {
            this.migrations = {
                "2.3": function () {
                    /* Migrate the previous "Display Google+ by default" setting into the "Default display action" setting. */
                    var displayGplusPreviousSetting = AlienTube.Preferences.getBoolean("displayGooglePlusByDefault");
                    if (displayGplusPreviousSetting === true) {
                        AlienTube.Preferences.set("defaultDisplayAction", "gplus");
                    }
                },
                "2.5": function () {
                    /* In 2.5 AlienTube now uses the youtube channel ID not the display name for setting AlienTube or Google+ as default per channel.
                    We will attempt to migrate existing entries using the YouTube API  */
                    var previousDisplayActions = AlienTube.Preferences.getObject("channelDisplayActions");
                    if (previousDisplayActions) {
                        var migratedDisplayActions_1 = {};
                        var channelNameMigrationTasks_1 = [];
                        /* Iterate over the collection of previous display actions. We have to perform an asynchronous web request to the YouTube API
                        for each channel, we will make each request a Promise so we can be informed when they have all been completed,
                        and work with the final result. */
                        Object.keys(previousDisplayActions).forEach(function (channelName) {
                            if (previousDisplayActions.hasOwnProperty(channelName)) {
                                var promise = new Promise(function (fulfill, reject) {
                                    var encodedChannelName = encodeURIComponent(channelName);
                                    var reqUrl = "https://www.googleapis.com/youtube/v3/search?part=id&q=" + encodedChannelName + "&type=channel&key=" + AlienTube.APIKeys.youtubeAPIKey;
                                    new AlienTube.HttpRequest(reqUrl, AlienTube.RequestType.GET, function (data) {
                                        var results = JSON.parse(data);
                                        if (results.items.length > 0) {
                                            /* We found a match for the display name. We will migrate the old value to the new channel id. */
                                            migratedDisplayActions_1[results.items[0].id.channelId] = previousDisplayActions[channelName];
                                        }
                                        fulfill();
                                    }, null, function (error) {
                                        /* The request could not be completed, we will fail the migration and try again next time. */
                                        reject(error);
                                    });
                                });
                                channelNameMigrationTasks_1.push(promise);
                            }
                        });
                        Promise.all(channelNameMigrationTasks_1).then(function () {
                            /* All requests were successful, we will save the resul and move on. */
                            AlienTube.Preferences.set("channelDisplayActions", migratedDisplayActions_1);
                        }, function () {
                            /* One of the requests has failed, the transition will be discarded. We will set our last run version to the previous
                            version so AlienTube will attempt the migration again next time. */
                            AlienTube.Preferences.set("lastRunVersion", "2.4");
                        });
                    }
                }
            };
            /* If lastVersion is not set, we will assume the version is 2.2. */
            lastVersion = lastVersion || "2.2";
            /* Get an array of the different version migrations available. */
            var versions = Object.keys(this.migrations);
            /* If our previous version is not in the list, insert it so we will know our place in the version history. */
            versions.push(lastVersion);
            /* Run an alphanumerical string sort on the array, this will serve to organise the versions from old to new. */
            versions.sort();
            /* Get the index of the previous version, and remove it and all migrations before it, leaving migrations for newer versions behind */
            var positionOfPreviousVersion = versions.indexOf(lastVersion) + 1;
            versions.splice(0, positionOfPreviousVersion);
            /* Call the migrations to newer versions in sucession. */
            versions.forEach(function (version) {
                this.migrations[version].call(this, null);
            }.bind(this));
        }
        return Migration;
    }());
    AlienTube.Migration = Migration;
})(AlienTube || (AlienTube = {}));
var AlienTube;
(function (AlienTube) {
    /**
        * Safari Global Page
        * @class Safari
    */
    var Safari = /** @class */ (function () {
        function Safari(event) {
            if (event.name == 'XHR') {
                new AlienTube.HttpRequest(event.message.url, event.message.requestType, function (data) {
                    event.target.page.dispatchMessage("POST", {
                        'uuid': event.message.uuid,
                        'data': data
                    });
                }, event.message.postData, function (error) {
                    event.target.page.dispatchMessage("POST", {
                        'uuid': event.message.uuid,
                        'error': error
                    });
                });
            }
            else if (event.name == "setPreference") {
                localStorage.setItem(event.message.key, event.message.value);
            }
            else if (event.name === "getPreferences") {
                var preferences = {};
                var numKeys = localStorage.length;
                for (var i = 0; i < numKeys; i++) {
                    var keyName = localStorage.key(i);
                    preferences[keyName] = localStorage.getItem(keyName);
                }
                event.target.page.dispatchMessage("preferences", preferences);
            }
        }
        Safari.openPreferences = function () {
            safari.extension.settings.volume = false;
            safari.application.activeBrowserWindow.openTab().url = safari.extension.globalPage.contentWindow.location.href;
        };
        return Safari;
    }());
    AlienTube.Safari = Safari;
})(AlienTube || (AlienTube = {}));
if (AlienTube.Utilities.getCurrentBrowser() === Browser.SAFARI) {
    if (safari.application) {
        safari.application.addEventListener("message", function (e) {
            new AlienTube.Safari(e);
        }, false);
        safari.extension.settings.addEventListener("change", function (event) {
            if (event.key === "openSettings") {
                AlienTube.Safari.openPreferences();
            }
        }, false);
    }
}
var AlienTube;
(function (AlienTube) {
    /**
     * The extension ptions page for all browsers.
     * @class Options
     */
    var Options = /** @class */ (function () {
        function Options() {
            this.localisationManager = new AlienTube.LocalisationManager(function () {
                /* Get the element for inputs we need to specifically modify. */
                this.defaultDisplayActionElement = document.getElementById("defaultDisplayAction");
                /* Get the various buttons for the page. */
                this.resetButtonElement = document.getElementById("reset");
                this.addToExcludeButton = document.getElementById("addSubredditToList");
                /* Set the localised text of the reset button. */
                this.resetButtonElement.textContent = this.localisationManager.get("options_label_reset");
                this.addToExcludeButton.textContent = this.localisationManager.get("options_button_add");
                /* Get the element for the exclude subreddits input field and the list container. */
                this.excludeSubredditsField = document.getElementById("addSubredditsForExclusion");
                this.excludeListContainer = document.getElementById("excludedSubreddits");
                /* Set the page title */
                window.document.title = this.localisationManager.get("options_label_title");
                AlienTube.Preferences.initialise(function (preferences) {
                    // Check if a version migration is necessary.
                    if (AlienTube.Preferences.getString("lastRunVersion") !== Options.getExtensionVersionNumber()) {
                        new AlienTube.Migration(AlienTube.Preferences.getString("lastRunVersion"));
                        /* Update the last run version paramater with the current version so we'll know not to run this migration again. */
                        AlienTube.Preferences.set("lastRunVersion", Options.getExtensionVersionNumber());
                    }
                    /* Go over every setting in the options panel. */
                    for (var i = 0, len = Options.preferenceKeyList.length; i < len; i += 1) {
                        /* Set the localised text for every setting. */
                        var label = document.querySelector("label[for='" + Options.preferenceKeyList[i] + "']");
                        label.textContent = this.localisationManager.get("options_label_" + Options.preferenceKeyList[i]);
                        /* Get the control for the setting. */
                        var inputElement = document.getElementById(Options.preferenceKeyList[i]);
                        if (inputElement.tagName === "SELECT") {
                            /* This control is a select/dropdown element. Retreive the existing setting for this. */
                            var selectInputElement = inputElement;
                            var selectValue = AlienTube.Preferences.getString(Options.preferenceKeyList[i]);
                            /* Go over every dropdown item to find the one we need to set as selected. Unfortunately NodeList does not inherit from
                               Array and does not have forEach. Therefor we will force an iteration over it by calling Array.prototype.forEach.call */
                            var optionElementIndex = 0;
                            Array.prototype.forEach.call(selectInputElement.options, function (optionElement) {
                                if (optionElement.value === selectValue) {
                                    selectInputElement.selectedIndex = optionElementIndex;
                                }
                                optionElementIndex += 1;
                            });
                            /* Call the settings changed event when the user has selected a different dropdown item.*/
                            inputElement.addEventListener("change", this.saveUpdatedSettings, false);
                        }
                        else if (inputElement.getAttribute("type") === "number") {
                            var numberInputElement = inputElement;
                            /* This control is a number input element. Retreive the existing setting for this. */
                            numberInputElement.value = AlienTube.Preferences.getNumber(Options.preferenceKeyList[i]).toString();
                            /* Call the settings changed event when the user has pushed a key, cut to clipboard, or pasted, from clipboard */
                            inputElement.addEventListener("keyup", this.saveUpdatedSettings, false);
                            inputElement.addEventListener("cut", this.saveUpdatedSettings, false);
                            inputElement.addEventListener("paste", this.saveUpdatedSettings, false);
                        }
                        else if (inputElement.getAttribute("type") === "checkbox") {
                            var checkboxInputElement = inputElement;
                            /* This control is a checkbox. Retreive the existing setting for this. */
                            checkboxInputElement.checked = AlienTube.Preferences.getBoolean(Options.preferenceKeyList[i]);
                            /* Call the settings changed event when the user has changed the state of the checkbox. */
                            checkboxInputElement.addEventListener("change", this.saveUpdatedSettings, false);
                        }
                    }
                    document.querySelector("label[for='addSubredditForExclusion']").textContent = this.localisationManager.get("options_label_hide_following");
                    /* Set event handler for the reset button. */
                    this.resetButtonElement.addEventListener("click", this.resetSettings, false);
                    /* Set the localised text for the "default display action" dropdown options. */
                    this.defaultDisplayActionElement.options[0].textContent = this.localisationManager.get("options_label_alientube");
                    this.defaultDisplayActionElement.options[1].textContent = this.localisationManager.get("options_label_gplus");
                    this.excludedSubreddits = AlienTube.Preferences.getArray("excludedSubredditsSelectedByUser");
                    /* Erase the current contents of the subreddit list, in case this is an update call on an existing page. */
                    while (this.excludeListContainer.firstChild !== null) {
                        this.excludeListContainer.removeChild(this.excludeListContainer.firstChild);
                    }
                    /* Populate the excluded subreddit list. */
                    this.excludedSubreddits.forEach(function (subreddit) {
                        this.addSubredditExclusionItem(subreddit);
                    });
                    /* Validate the input to see if it is a valid subreddit on key press, cut, or paste, and aditionally check for an 'Enter' key press and process it as a submission. */
                    this.excludeSubredditsField.addEventListener("keyup", this.onExcludeFieldKeyUp.bind(this), false);
                    this.addToExcludeButton.addEventListener("click", this.addItemToExcludeList.bind(this), false);
                    this.excludeSubredditsField.addEventListener("cut", this.validateExcludeField.bind(this), false);
                    this.excludeSubredditsField.addEventListener("paste", this.validateExcludeField.bind(this), false);
                    /* Set the extension version label. */
                    document.getElementById("versiontext").textContent = this.localisationManager.get("options_label_version");
                    document.getElementById('version').textContent = Options.getExtensionVersionNumber();
                }.bind(this));
            }.bind(this));
        }
        /**
         * Trigger when a setting has been changed by the user, update the control, and save the setting.
         * @param event The event object.
         * @private
         */
        Options.prototype.saveUpdatedSettings = function (event) {
            var inputElement = event.target;
            if (inputElement.getAttribute("type") === "number") {
                if (inputElement.value.match(/[0-9]+/)) {
                    inputElement.removeAttribute("invalidInput");
                }
                else {
                    inputElement.setAttribute("invalidInput", "true");
                    return;
                }
            }
            if (inputElement.getAttribute("type") === "checkbox") {
                AlienTube.Preferences.set(inputElement.id, inputElement.checked);
            }
            else {
                AlienTube.Preferences.set(inputElement.id, inputElement.value);
            }
        };
        /**
         * Reset all the settings to factory defaults.
         * @private
         */
        Options.prototype.resetSettings = function () {
            AlienTube.Preferences.reset();
            new AlienTube.Options();
            AlienTube.Preferences.set("lastRunVersion", Options.getExtensionVersionNumber());
        };
        /**
         * Add a subreddit item to the excluded subreddits list on the options page. This does not automatically add it to preferences.
         * @param subreddit The name of the subreddit to block, case insensitive.
         * @param [animate] Whether to visualise the submission as text animating from the input field into the list.
         * @private
         */
        Options.prototype.addSubredditExclusionItem = function (subreddit, animate) {
            /* Create the list item and set the name of the subreddit. */
            var subredditElement = document.createElement("div");
            subredditElement.setAttribute("subreddit", subreddit);
            /* Create and populate the label that contains the name of the subreddit. */
            var subredditLabel = document.createElement("span");
            subredditLabel.textContent = subreddit;
            subredditElement.appendChild(subredditLabel);
            /* Create the remove item button and set the event handler. */
            var removeButton = document.createElement("button");
            removeButton.textContent = '╳';
            subredditElement.appendChild(removeButton);
            removeButton.addEventListener("click", this.removeSubredditFromExcludeList.bind(this), false);
            /* If requested, place the list item on top of the input field and css transition it to the top of the list. */
            if (animate) {
                subredditElement.classList.add("new");
                setTimeout(function () {
                    subredditElement.classList.remove("new");
                }, 100);
            }
            /* Add the item to the top of the list view. */
            this.excludeListContainer.insertBefore(subredditElement, this.excludeListContainer.firstChild);
        };
        /**
         * Validate keyboard input in the exclude subreddits text field, and if an enter press is detected, process it as a submission.
         * @param event A keyboard event object
         * @private
         */
        Options.prototype.onExcludeFieldKeyUp = function (event) {
            if (!this.validateExcludeField(event))
                return;
            if (event.keyCode === 13) {
                this.addItemToExcludeList(event);
            }
        };
        /**
         * Validate the exclude subreddits text field after any input change event.
         * @param event Any input event with the exclude subreddits text field as a target.
         * @private
         */
        Options.prototype.validateExcludeField = function (event) {
            var textfield = event.target;
            /* Check that the text field contents is a valid subreddit name. */
            if (textfield.value.match(/([A-Za-z0-9_]+|[reddit.com]){3}/) !== null) {
                this.addToExcludeButton.disabled = false;
                return true;
            }
            this.addToExcludeButton.disabled = true;
            return false;
        };
        /**
         * Add the contents of the exclude subreddits field to the exclude subreddits list in the options page and in the preferences.
         * @param event A button press or enter event.
         * @private
         */
        Options.prototype.addItemToExcludeList = function (event) {
            /* Retrieve the subreddit name from the text field, and add it to the list. */
            var subredditName = this.excludeSubredditsField.value;
            this.addSubredditExclusionItem(subredditName, true);
            /* Add the subreddit name to the list in preferences. */
            this.excludedSubreddits.push(subredditName);
            AlienTube.Preferences.set("excludedSubredditsSelectedByUser", this.excludedSubreddits);
            /* Remove the contents of the text field and reset the submit button state. */
            setTimeout(function () {
                this.addToExcludeButton.disabled = true;
                this.excludeSubredditsField.value = "";
            }, 150);
        };
        /**
         * Remove a subreddit from the exclude list on the options page and in the preferences.
         * @param event An event from the click of a remove button on a subreddit list item.
         * @private
         */
        Options.prototype.removeSubredditFromExcludeList = function (event) {
            /* Retrieve the subreddit item that will be removed. */
            var subredditElement = event.target.parentNode;
            /* Remove the item from the preferences file. */
            this.excludedSubreddits.splice(this.excludedSubreddits.indexOf(subredditElement.getAttribute("subreddit")), 1);
            AlienTube.Preferences.set("excludedSubredditsSelectedByUser", this.excludedSubreddits);
            /* Remove the item from the list on the options page and animate its removal. */
            subredditElement.classList.add("removed");
            setTimeout(function () {
                this.excludeListContainer.removeChild(subredditElement);
            }, 500);
        };
        /**
         * Get the current version of the extension running on this machine.
         * @private
         */
        Options.getExtensionVersionNumber = function () {
            var version = "";
            switch (AlienTube.Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    version = chrome.runtime.getManifest().version;
                    break;
                case Browser.FIREFOX:
                    version = self.options.version;
                    break;
                case Browser.SAFARI:
                    version = safari.extension.displayVersion;
                    break;
            }
            return version || "";
        };
        Options.preferenceKeyList = [
            "hiddenPostScoreThreshold",
            "hiddenCommentScoreThreshold",
            "showGooglePlusWhenNoPosts",
            "showGooglePlusButton",
            "defaultDisplayAction"
        ];
        return Options;
    }());
    AlienTube.Options = Options;
})(AlienTube || (AlienTube = {}));
new AlienTube.Options();
