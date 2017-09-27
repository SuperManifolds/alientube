/// <reference path="Application.ts" />
/// <reference path="HttpRequest.ts" />
/// <reference path="Preferences.ts" />
/// <reference path="CommentSection.ts" />
/// <reference path="CommentThread.ts" />
/// <reference path="CommentField.ts" />
/// <reference path="Comment.ts" />
/// <reference path="LoadMore.ts" />
/// <reference path="LocalisationManager.ts" />
/// <reference path="LoadingScreen.ts" />
/// <reference path="ErrorScreen.ts" />
/// <reference path="Utilities.ts" />
/// <reference path="Migration.ts" />
/// <reference path="APIKeys.ts" />
/// <reference path="RedditAPI/RedditRequest.ts" />
/// <reference path="RedditAPI/Comment.ts" />
/// <reference path="RedditAPI/EditComment.ts" />
/// <reference path="RedditAPI/Vote.ts" />
/// <reference path="RedditAPI/Report.ts" />
/// <reference path="RedditAPI/Save.ts" />
/// <reference path="RedditAPI/Username.ts" />
/// <reference path="typings/snuownd.d.ts" />
/// <reference path="typings/he.d.ts" />
/// <reference path="typings/handlebars.d.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
"use strict";
/// <reference path="es6-promise.d.ts" /> 
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        Application class for AlienTube
        @class Application
    */
    "use strict";
    var Application = /** @class */ (function () {
        function Application() {
            // Load preferences from disk.
            AlienTube.Preferences.initialise(function () {
                // Check if a version migration is necessary.
                if (AlienTube.Preferences.getString("lastRunVersion") !== Application.version()) {
                    new AlienTube.Migration(AlienTube.Preferences.getString("lastRunVersion"));
                    /* Update the last run version paramater with the current version so we'll know not to run this migration again. */
                    AlienTube.Preferences.set("lastRunVersion", Application.version());
                }
            });
            // Load language files. 
            Application.localisationManager = new AlienTube.LocalisationManager(function () {
                // Load stylesheet
                if (Application.getCurrentBrowser() === Browser.SAFARI) {
                    new AlienTube.HttpRequest(Application.getExtensionRessourcePath("style.css"), AlienTube.RequestType.GET, function (data) {
                        var stylesheet = document.createElement("style");
                        stylesheet.setAttribute("type", "text/css");
                        stylesheet.textContent = data;
                        document.head.appendChild(stylesheet);
                    });
                }
                if (Application.currentMediaService() === Service.YouTube) {
                    // Detect page navigation
                    document.addEventListener(Application.PAGE_NAV_EVENT, this.youtubePageNav);
                    // Make sure youtubePageNav will create initial comments
                    this.currentVideoIdentifier = null;
                    // If page has loaded, create comments section
                    if (document.getElementById(Application.COMMENT_ELEMENT_ID)) {
                        this.youtubePageNav();
                    }
                }
                else if (Application.currentMediaService() === Service.Vimeo) {
                    // Start observer to detect when a new video is loaded.
                    var observer = new MutationObserver(this.vimeoMutationObserver);
                    var config = { attributes: true, childList: true, characterData: true };
                    observer.observe(document.querySelector(".extras_wrapper"), config);
                }
            }.bind(this));
        }
        /**
            * Mutation Observer for monitoring for whenver the user changes to a new "page" on YouTube
            * @param mutations A collection of mutation records
            * @private
        */
        Application.prototype.youtubePageNav = function () {
            var reportedVideoId = Application.getCurrentVideoId();
            if (reportedVideoId !== this.currentVideoIdentifier) {
                this.currentVideoIdentifier = reportedVideoId;
                if (AlienTube.Utilities.isVideoPage) {
                    Application.commentSection = new AlienTube.CommentSection(this.currentVideoIdentifier);
                }
            }
        };
        /**
            * Mutation Observer for monitoring for whenver the user changes to a new "page" on YouTube
            * @param mutations A collection of mutation records
            * @private
        */
        Application.prototype.vimeoMutationObserver = function (mutations) {
            mutations.forEach(function (mutation) {
                var target = mutation.target;
                var reportedVideoId = Application.getCurrentVideoId();
                if (reportedVideoId !== this.currentVideoIdentifier) {
                    this.currentVideoIdentifier = reportedVideoId;
                    if (AlienTube.Utilities.isVideoPage) {
                        Application.commentSection = new AlienTube.CommentSection(this.currentVideoIdentifier);
                    }
                }
            }.bind(this));
        };
        /**
        * Get the current video identifier of the window.
        * @returns video identifier.
        */
        Application.getCurrentVideoId = function () {
            if (Application.currentMediaService() === Service.YouTube) {
                if (window.location.search.length > 0) {
                    var s = window.location.search.substring(1);
                    var requestObjects = s.split('&');
                    for (var i = 0, len = requestObjects.length; i < len; i += 1) {
                        var obj = requestObjects[i].split('=');
                        if (obj[0] === "v") {
                            return obj[1];
                        }
                    }
                }
            }
            else if (Application.currentMediaService() === Service.Vimeo) {
                if (window.location.pathname.length > 1) {
                    return window.location.pathname.substring(1);
                }
            }
            return null;
        };
        /**
        * Get a Reddit-style "x time ago" Timestamp from a unix epoch time.
        * @param epochTime Epoch timestamp to calculate from.
        * @returns A string with a human readable time.
        */
        Application.getHumanReadableTimestamp = function (epochTime, localisationString) {
            if (localisationString === void 0) { localisationString = "timestamp_format"; }
            var secs = Math.floor(((new Date()).getTime() / 1000) - epochTime);
            secs = Math.abs(secs);
            var timeUnits = {
                Year: Math.floor(secs / 60 / 60 / 24 / 365.27),
                Month: Math.floor(secs / 60 / 60 / 24 / 30),
                Day: Math.floor(secs / 60 / 60 / 24),
                Hour: Math.floor(secs / 60 / 60),
                Minute: Math.floor(secs / 60),
                Second: secs,
            };
            /* Retrieve the most relevant number by retrieving the first one that is "1" or more.
            Decide if it is plural and retrieve the correct localisation */
            for (var timeUnit in timeUnits) {
                if (timeUnits.hasOwnProperty(timeUnit) && timeUnits[timeUnit] >= 1) {
                    return Application.localisationManager.get(localisationString, [
                        timeUnits[timeUnit],
                        Application.localisationManager.getWithLocalisedPluralisation("timestamp_format_" + timeUnit.toLowerCase(), timeUnits[timeUnit])
                    ]);
                }
            }
            return Application.localisationManager.get(localisationString, [
                "0",
                Application.localisationManager.getWithLocalisedPluralisation('timestamp_format_second', 0)
            ]);
        };
        /**
        * Get the path to a ressource in the AlienTube folder.
        * @param path Filename to the ressource.
        * @returns Ressource path (file://)
        */
        Application.getExtensionRessourcePath = function (path) {
            switch (Application.getCurrentBrowser()) {
                case Browser.SAFARI:
                    return safari.extension.baseURI + 'res/' + path;
                case Browser.CHROME:
                    return chrome.extension.getURL('res/' + path);
                case Browser.FIREFOX:
                    return self.options.ressources[path];
                default:
                    return null;
            }
        };
        /**
            * Get the HTML templates for the extension
            * @param callback A callback to be called when the extension templates has been loaded.
        */
        Application.getExtensionTemplates = function (callback) {
            var templateLink = new XMLHttpRequest();
            templateLink.open("GET", Application.getExtensionRessourcePath("templates.html"), true);
            templateLink.responseType = "document";
            templateLink.onload = function () {
                if (callback) {
                    callback(templateLink.responseXML);
                }
            }.bind(this);
            templateLink.send();
        };
        /**
         * Get the current version of the extension.
         * @public
         */
        Application.version = function () {
            var version = "";
            switch (Application.getCurrentBrowser()) {
                case Browser.CHROME:
                    version = chrome.runtime.getManifest()["version"];
                    break;
                case Browser.FIREFOX:
                    version = self.options.version;
                    break;
                case Browser.SAFARI:
                    version = safari.extension.displayVersion;
                    break;
            }
            return version;
        };
        /**
         * Get an element from the template collection.
         * @param templateCollection The template collection to use.
         * @param id The id of the element you want to retreive.
         * @returns DOM node of a template section.
         */
        Application.getExtensionTemplateItem = function (templateCollection, id) {
            return templateCollection.getElementById(id).content.cloneNode(true);
        };
        /**
         * Get the current media website that AlienTube is on
         * @returns A "Service" enum value representing a media service.
         */
        Application.currentMediaService = function () {
            if (window.location.host === "www.youtube.com") {
                return Service.YouTube;
            }
            else if (window.location.host === "vimeo.com") {
                return Service.Vimeo;
            }
            return null;
        };
        /**
         * Retrieve the current browser that AlienTube is running on.
         * @returns A "Browser" enum value representing a web browser.
         */
        Application.getCurrentBrowser = function () {
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
        // Some constants for new YouTube layout
        Application.CONTENT_ELEMENT_ID = "main";
        Application.COMMENT_ELEMENT_ID = "comments";
        Application.CHANNEL_ELEMENT_ID = "owner-name";
        Application.CHANNEL_CONTAINER_ID = "upload-info";
        Application.PAGE_NAV_EVENT = "yt-navigate-finish";
        return Application;
    }());
    AlienTube.Application = Application;
})(AlienTube || (AlienTube = {}));
var Service;
(function (Service) {
    Service[Service["YouTube"] = 0] = "YouTube";
    Service[Service["Vimeo"] = 1] = "Vimeo";
})(Service || (Service = {}));
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
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * Starts a new instance of the AlienTube comment section and adds it to DOM.
        * @class CommentSection
        * @param currentVideoIdentifier YouTube Video query identifier.
    */
    "use strict";
    var CommentSection = /** @class */ (function () {
        function CommentSection(currentVideoIdentifier) {
            this.threadCollection = new Array();
            this.storedTabCollection = new Array();
            // Make sure video identifier is not null. If it is null we are not on a video page so we will just time out.
            if (currentVideoIdentifier) {
                // Load the html5 template file from disk and wait for it to load.
                var templateLink = document.createElement("link");
                templateLink.id = "alientubeTemplate";
                AlienTube.Application.getExtensionTemplates(function (templateContainer) {
                    this.template = templateContainer;
                    // Set Loading Screen
                    var loadingScreen = new AlienTube.LoadingScreen(this, AlienTube.LoadingState.LOADING, AlienTube.Application.localisationManager.get("loading_search_message"));
                    this.set(loadingScreen.HTMLElement);
                    // Open a search request to Reddit for the video identfiier
                    var videoSearchString = this.getVideoSearchString(currentVideoIdentifier);
                    new AlienTube.Reddit.Request("https://api.reddit.com/search.json?q=" + videoSearchString, AlienTube.RequestType.GET, function (results) {
                        // There are a number of ways the Reddit API can arbitrarily explode, here are some of them.
                        if (results === {} || results.kind !== 'Listing' || results.data.children.length === 0) {
                            this.returnNoResults();
                        }
                        else {
                            var searchResults = results.data.children;
                            var finalResultCollection_1 = [];
                            /* Filter out Reddit threads that do not lead to the video. Additionally, remove ones that have passed the 6
                            month threshold for Reddit posts and are in preserved mode, but does not have any comments. */
                            searchResults.forEach(function (result) {
                                if (CommentSection.validateItemFromResultSet(result.data, currentVideoIdentifier)) {
                                    finalResultCollection_1.push(result.data);
                                }
                            });
                            var preferredPost_1, preferredSubreddit = void 0;
                            if (finalResultCollection_1.length > 0) {
                                if (AlienTube.Application.currentMediaService() === Service.YouTube) {
                                    /* Scan the YouTube comment sections for references to subreddits or reddit threads.
                                    These will be prioritised and loaded first.  */
                                    var mRegex = /(?:http|https):\/\/(.[^/]+)\/r\/([A-Za-z0-9][A-Za-z0-9_]{2,20})(?:\/comments\/)?([A-Za-z0-9]*)/g;
                                    var commentLinks = document.querySelectorAll("#eow-description a");
                                    for (var b = 0, coLen = commentLinks.length; b < coLen; b += 1) {
                                        var linkElement = commentLinks[b];
                                        var url = linkElement.getAttribute("href");
                                        if (typeof (url) !== 'undefined') {
                                            var match = mRegex.exec(url);
                                            if (match) {
                                                preferredSubreddit = match[2];
                                                if (match[3].length > 0)
                                                    preferredPost_1 = match[3];
                                                break;
                                            }
                                        }
                                    }
                                }
                                // Sort threads into array groups by what subreddit they are in.
                                var getExcludedSubreddits_1 = AlienTube.Preferences.enforcedExludedSubreddits.concat(AlienTube.Preferences.getArray("excludedSubredditsSelectedByUser"));
                                var sortedResultCollection_1 = {};
                                finalResultCollection_1.forEach(function (thread) {
                                    if (getExcludedSubreddits_1.indexOf(thread.subreddit.toLowerCase()) !== -1)
                                        return;
                                    if (thread.score < AlienTube.Preferences.getNumber("hiddenPostScoreThreshold"))
                                        return;
                                    if (!sortedResultCollection_1.hasOwnProperty(thread.subreddit))
                                        sortedResultCollection_1[thread.subreddit] = [];
                                    sortedResultCollection_1[thread.subreddit].push(thread);
                                });
                                // Sort posts into collections by what subreddit they appear in.
                                this.threadCollection = [];
                                for (var subreddit in sortedResultCollection_1) {
                                    if (sortedResultCollection_1.hasOwnProperty(subreddit)) {
                                        this.threadCollection.push(sortedResultCollection_1[subreddit].reduce(function (a, b) {
                                            return ((this.getConfidenceForRedditThread(b) - this.getConfidenceForRedditThread(a)) || b.id === preferredPost_1) ? a : b;
                                        }.bind(this)));
                                    }
                                }
                                if (this.threadCollection.length > 0) {
                                    // Sort subreddits so there is only one post per subreddit, and that any subreddit or post that is linked to in the description appears first.
                                    this.threadCollection.sort(function (a, b) {
                                        return b.score > a.score;
                                    }.bind(this));
                                    for (var i = 0, len = this.threadCollection.length; i < len; i += 1) {
                                        if (this.threadCollection[i].subreddit === preferredSubreddit) {
                                            var threadDataForFirstTab = this.threadCollection[i];
                                            this.threadCollection.splice(i, 1);
                                            this.threadCollection.splice(0, 0, threadDataForFirstTab);
                                            break;
                                        }
                                    }
                                    // Generate tabs.
                                    var tabContainerTemplate = AlienTube.Application.getExtensionTemplateItem(this.template, "tabcontainer");
                                    var tabContainer = tabContainerTemplate.querySelector("#at_tabcontainer");
                                    this.insertTabsIntoDocument(tabContainer, 0);
                                    window.addEventListener("resize", this.updateTabsToFitToBoundingContainer.bind(this), false);
                                    this.updateTabsToFitToBoundingContainer();
                                    var ApplicationContainer = this.set(tabContainer);
                                    ApplicationContainer.appendChild(tabContainerTemplate.querySelector("#at_comments"));
                                    // If the selected post is prioritised, marked it as such
                                    if (this.threadCollection[0].id === preferredPost_1 || this.threadCollection[0].subreddit === preferredSubreddit) {
                                        this.threadCollection[0].official = true;
                                    }
                                    // Load the first tab.
                                    this.downloadThread(this.threadCollection[0]);
                                    return;
                                }
                            }
                            this.returnNoResults();
                        }
                    }.bind(this), null, loadingScreen);
                }.bind(this));
            }
        }
        /**
            * Display a tab in the comment section, if it is locally cached, use that, if not, download it.
            * @param threadData Data about the thread to download from a Reddit search page.
            * @private
        */
        CommentSection.prototype.showTab = function (threadData) {
            var getTabById = this.storedTabCollection.filter(function (x) {
                return x[0].data.children[0].data.name === threadData.name;
            });
            if (getTabById.length > 0) {
                new AlienTube.CommentThread(getTabById[0], this);
            }
            else {
                this.downloadThread(threadData);
            }
        };
        /**
            * Download a thread from Reddit.
            * @param threadData Data about the thread to download from a Reddit search page.
        */
        CommentSection.prototype.downloadThread = function (threadData) {
            var loadingScreen = new AlienTube.LoadingScreen(this, AlienTube.LoadingState.LOADING, AlienTube.Application.localisationManager.get("loading_post_message"));
            var alientubeCommentContainer = document.getElementById("at_comments");
            while (alientubeCommentContainer.firstChild) {
                alientubeCommentContainer.removeChild(alientubeCommentContainer.firstChild);
            }
            alientubeCommentContainer.appendChild(loadingScreen.HTMLElement);
            var requestUrl = "https://api.reddit.com/r/" + threadData.subreddit + "/comments/" + threadData.id + ".json?sort=" + AlienTube.Preferences.getString("threadSortType");
            new AlienTube.Reddit.Request(requestUrl, AlienTube.RequestType.GET, function (responseObject) {
                // Remove previous tab from memory if preference is unchecked; will require a download on tab switch.
                responseObject[0].data.children[0].data.official = threadData.official;
                new AlienTube.CommentThread(responseObject, this);
                this.storedTabCollection.push(responseObject);
            }.bind(this), null, loadingScreen);
        };
        /**
            * Sets the contents of the comment section.
            * @param contents HTML DOM node or element to use.
        */
        CommentSection.prototype.set = function (contents) {
            var redditContainer = document.createElement("section");
            redditContainer.id = "alientube";
            var commentsContainer;
            var serviceCommentsContainer;
            if (AlienTube.Application.currentMediaService() === Service.YouTube) {
                commentsContainer = document.getElementById(AlienTube.Application.CONTENT_ELEMENT_ID);
                serviceCommentsContainer = document.getElementById(AlienTube.Application.COMMENT_ELEMENT_ID);
            }
            else if (AlienTube.Application.currentMediaService() === Service.Vimeo) {
                commentsContainer = document.querySelector(".comments_container");
                serviceCommentsContainer = document.querySelector(".comments_hide");
            }
            var previousRedditInstance = document.getElementById("alientube");
            if (previousRedditInstance) {
                commentsContainer.removeChild(previousRedditInstance);
            }
            /* Check if Dark Mode is activated, and set AlienTube to dark mode */
            this.checkEnvironmentDarkModestatus(redditContainer);
            /* Since there is no implicit event for a css property has changed, I have set a small transition on the body background colour.
               this transition will trigger the transitionend event and we can use that to check if the background colour has changed, thereby activating dark mode. */
            document.body.addEventListener("transitionend", function (e) {
                if (e.propertyName === "background-color" && e.srcElement.tagName === "BODY") {
                    this.checkEnvironmentDarkModestatus(document.getElementById("alientube"));
                }
            }, false);
            if (serviceCommentsContainer) {
                /* Add the "switch to Reddit" button in the google+ comment section */
                var redditButton = document.getElementById("at_switchtoreddit");
                if (!redditButton) {
                    var redditButtonTemplate = AlienTube.Application.getExtensionTemplateItem(this.template, "switchtoreddit");
                    redditButton = redditButtonTemplate.querySelector("#at_switchtoreddit");
                    redditButton.addEventListener("click", this.onRedditClick, true);
                    serviceCommentsContainer.parentNode.insertBefore(redditButton, serviceCommentsContainer);
                }
                if (this.getDisplayActionForCurrentChannel() === "gplus") {
                    redditContainer.style.display = "none";
                    redditButton.style.display = "block";
                }
                else {
                    serviceCommentsContainer.style.visibility = "collapse";
                    serviceCommentsContainer.style.height = "0";
                }
            }
            /* Set the setting for whether or not AlienTube should show itself on this YouTube channel */
            var allowOnChannelContainer = document.getElementById("allowOnChannelContainer");
            if (!allowOnChannelContainer) {
                var actionsContainer = void 0;
                if (AlienTube.Application.currentMediaService() === Service.YouTube) {
                    actionsContainer = document.getElementById(AlienTube.Application.CHANNEL_CONTAINER_ID);
                }
                else if (AlienTube.Application.currentMediaService() === Service.Vimeo) {
                    actionsContainer = document.querySelector(".video_meta .byline");
                }
                var allowOnChannel = AlienTube.Application.getExtensionTemplateItem(this.template, "allowonchannel");
                allowOnChannel.children[0].appendChild(document.createTextNode(AlienTube.Application.localisationManager.get("options_label_showReddit")));
                var allowOnChannelCheckbox = allowOnChannel.querySelector("#allowonchannel");
                allowOnChannelCheckbox.checked = (this.getDisplayActionForCurrentChannel() === "alientube");
                allowOnChannelCheckbox.addEventListener("change", this.allowOnChannelChange, false);
                actionsContainer.appendChild(allowOnChannel);
            }
            /* Add AlienTube contents */
            redditContainer.setAttribute("service", Service[AlienTube.Application.currentMediaService()]);
            redditContainer.appendChild(contents);
            commentsContainer.appendChild(redditContainer);
            return redditContainer;
        };
        /**
            * Validate a Reddit search result set and ensure the link urls go to the correct address.
            * This is done due to the Reddit search result being extremely unrealiable, and providing mismatches.

            * Additionally, remove ones that have passed the 6 month threshold for Reddit posts and are in preserved mode,
            * but does not have any comments.

            * @param itemFromResultSet An object from the reddit search result array.
            * @param currentVideoIdentifier A YouTube video identifier to compare to.
            * @returns A boolean indicating whether the item is actually for the current video.
            * @private
        */
        CommentSection.validateItemFromResultSet = function (itemFromResultSet, currentVideoIdentifier) {
            if (AlienTube.Utilities.isRedditPreservedPost(itemFromResultSet) && itemFromResultSet.num_comments < 1) {
                return false;
            }
            if (itemFromResultSet.domain === "youtube.com") {
                // For urls based on the full youtube.com domain, retrieve the value of the "v" query parameter and compare it.
                var urlSearch = itemFromResultSet.url.substring(itemFromResultSet.url.indexOf("?") + 1);
                var requestItems = urlSearch.split('&');
                for (var i = 0, len = requestItems.length; i < len; i += 1) {
                    var requestPair = requestItems[i].split("=");
                    if (requestPair[0] === "v" && requestPair[1] === currentVideoIdentifier) {
                        return true;
                    }
                    if (requestPair[0] === "amp;u") {
                        var component = decodeURIComponent(requestPair[1]);
                        component = component.replace("/watch?", "");
                        var shareRequestItems = component.split('&');
                        for (var j = 0, slen = shareRequestItems.length; j < slen; j += 1) {
                            var shareRequestPair = shareRequestItems[j].split("=");
                            if (shareRequestPair[0] === "v" && shareRequestPair[1] === currentVideoIdentifier) {
                                return true;
                            }
                        }
                    }
                }
            }
            else if (itemFromResultSet.domain === "youtu.be" || itemFromResultSet.domain === "vimeo.com") {
                // For urls based on the shortened youtu.be domain, retrieve everything the path after the domain and compare it.
                var urlSearch = itemFromResultSet.url.substring(itemFromResultSet.url.lastIndexOf("/") + 1);
                var obj = urlSearch.split('?');
                if (obj[0] === currentVideoIdentifier) {
                    return true;
                }
            }
            return false;
        };
        /**
            * Insert tabs to the document calculating the width of tabs and determine how many you can fit without breaking the
            * bounds of the comment section.

            * @param tabContainer The tab container to operate on.
            * @param [selectTabAtIndex] The tab to be in active / selected status.
        */
        CommentSection.prototype.insertTabsIntoDocument = function (tabContainer, selectTabAtIndex) {
            var overflowContainer = tabContainer.querySelector("#at_overflow");
            var len = this.threadCollection.length;
            var maxWidth;
            if (AlienTube.Application.currentMediaService() === Service.YouTube) {
                maxWidth = document.getElementById(AlienTube.Application.COMMENT_ELEMENT_ID).offsetWidth - 80;
            }
            else if (AlienTube.Application.currentMediaService() === Service.Vimeo) {
                maxWidth = document.getElementById("comments").offsetWidth - 80;
            }
            var width = (21 + this.threadCollection[0].subreddit.length * 7);
            var i = 0;
            /* Calculate the width of tabs and determine how many you can fit without breaking the bounds of the comment section. */
            if (len > 0) {
                for (i = 0; i < len; i += 1) {
                    width = width + (21 + (this.threadCollection[i].subreddit.length * 7));
                    if (width >= maxWidth) {
                        break;
                    }
                    var tab = document.createElement("button");
                    tab.className = "at_tab";
                    tab.setAttribute("data-value", this.threadCollection[i].subreddit);
                    var tabLink = document.createElement("a");
                    tabLink.textContent = this.threadCollection[i].subreddit;
                    tabLink.setAttribute("href", "http://reddit.com/r/" + this.threadCollection[i].subreddit);
                    tabLink.setAttribute("target", "_blank");
                    tab.addEventListener("click", this.onSubredditTabClick.bind(this), false);
                    tab.appendChild(tabLink);
                    tabContainer.insertBefore(tab, overflowContainer);
                }
                // We can't fit any more tabs. We will now start populating the overflow menu.
                if (i < len) {
                    overflowContainer.style.display = "block";
                    /* Click handler for the overflow menu button, displays the overflow menu. */
                    overflowContainer.addEventListener("click", function () {
                        var overflowContainerMenu = overflowContainer.querySelector("ul");
                        overflowContainer.classList.add("show");
                    }, false);
                    /* Document body click handler that closes the overflow menu when the user clicks outside of it.
                    by defining event bubbling in the third argument we are preventing clicks on the menu from triggering this event */
                    document.body.addEventListener("click", function () {
                        var overflowContainerMenu = overflowContainer.querySelector("ul");
                        overflowContainer.classList.remove("show");
                    }, true);
                    /* Continue iterating through the items we couldn't fit into tabs and populate the overflow menu. */
                    for (i = i; i < len; i += 1) {
                        var menuItem = document.createElement("li");
                        menuItem.setAttribute("data-value", this.threadCollection[i].subreddit);
                        menuItem.addEventListener("click", this.onSubredditOverflowItemClick.bind(this), false);
                        var itemName = document.createTextNode(this.threadCollection[i].subreddit);
                        menuItem.appendChild(itemName);
                        overflowContainer.children[1].appendChild(menuItem);
                    }
                }
                else {
                    /* If we didn't need the overflow menu there is no reason to show it. */
                    overflowContainer.style.display = "none";
                }
            }
            else {
                overflowContainer.style.display = "none";
            }
            // If there is only one thread available the container should be displayed differently.
            if (this.threadCollection[0].subreddit.length === 1) {
                tabContainer.classList.add("single");
            }
            else {
                tabContainer.classList.remove("single");
            }
            // Set the active tab if provided
            if (selectTabAtIndex != null) {
                var selectedTab = tabContainer.children[selectTabAtIndex];
                selectedTab.classList.add("active");
            }
        };
        /**
            * Set the comment section to the "No Results" page.
            * @private
        */
        CommentSection.prototype.returnNoResults = function () {
            var template = AlienTube.Application.getExtensionTemplateItem(this.template, "noposts");
            var message = template.querySelector(".single_line");
            message.textContent = AlienTube.Application.localisationManager.get("post_label_noresults");
            /* Set the icon, text, and event listener for the button to switch to the Google+ comments. */
            var googlePlusButton = template.querySelector("#at_switchtogplus");
            googlePlusButton.addEventListener("click", this.onGooglePlusClick, false);
            var googlePlusContainer = document.getElementById("watch-discussion");
            if (AlienTube.Preferences.getBoolean("showGooglePlusButton") === false || googlePlusContainer === null) {
                googlePlusButton.style.display = "none";
            }
            this.set(template);
            if (AlienTube.Preferences.getBoolean("showGooglePlusWhenNoPosts") && googlePlusContainer) {
                googlePlusContainer.style.visibility = "visible";
                googlePlusContainer.style.height = "auto";
                document.getElementById("alientube").style.display = "none";
                var redditButton = document.getElementById("at_switchtoreddit");
                if (redditButton) {
                    redditButton.classList.add("noresults");
                }
            }
        };
        /**
         * Switch to the Reddit comment section
         * @param eventObject The event object of the click of the Reddit button.
         * @private
         */
        CommentSection.prototype.onRedditClick = function (eventObject) {
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.visibility = "collapse";
            googlePlusContainer.style.height = "0";
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "block";
            var redditButton = document.getElementById("at_switchtoreddit");
            redditButton.style.display = "none";
        };
        /**
            * Switch to the Google+ comment section.
            * @param eventObject The event object of the click of the Google+ button.
            * @private
         */
        CommentSection.prototype.onGooglePlusClick = function (eventObject) {
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "none";
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.visibility = "visible";
            googlePlusContainer.style.height = "auto";
            var redditButton = document.getElementById("at_switchtoreddit");
            redditButton.style.display = "block";
        };
        /**
            * Update the tabs to fit the new size of the document
            * @private
        */
        CommentSection.prototype.updateTabsToFitToBoundingContainer = function () {
            /* Only perform the resize operation when we have a new frame to work on by the browser, any animation beyond this will not
            be rendered and is pointless. */
            window.requestAnimationFrame(function () {
                var w = document.getElementById(AlienTube.Application.COMMENT_ELEMENT_ID).offsetWidth;
                document.getElementById("alientube").style.width = w + "px";
                var tabContainer = document.getElementById("at_tabcontainer");
                if (!tabContainer) {
                    return;
                }
                var overflowContainer = tabContainer.querySelector("#at_overflow");
                /* Iterate over the tabs until we find the one that is currently selected, and store its value. */
                for (var i = 0, len = tabContainer.children.length; i < len; i += 1) {
                    var tabElement = tabContainer.children[i];
                    if (tabElement.classList.contains("active")) {
                        var currentActiveTabIndex = i;
                        /* Remove all tabs and overflow ites, then render them over again using new size dimensions. */
                        this.clearTabsFromTabContainer();
                        this.insertTabsIntoDocument(tabContainer, currentActiveTabIndex);
                        break;
                    }
                }
            }.bind(this));
        };
        /**
            * Remove all tabs and overflow items from the DOM.
         */
        CommentSection.prototype.clearTabsFromTabContainer = function () {
            var tabContainer = document.getElementById("at_tabcontainer");
            var overflowContainer = tabContainer.querySelector("#at_overflow");
            /* Iterate over the tab elements and remove them all. Stopping short off the overflow button. */
            while (tabContainer.firstElementChild) {
                var childElement = tabContainer.firstElementChild;
                if (childElement.classList.contains("at_tab")) {
                    tabContainer.removeChild(tabContainer.firstElementChild);
                }
                else {
                    break;
                }
            }
            /* Iterate over the overflow items, removing them all. */
            var overflowListElement = overflowContainer.querySelector("ul");
            while (overflowListElement.firstElementChild) {
                overflowListElement.removeChild(overflowListElement.firstElementChild);
            }
        };
        /**
            * Select the new tab on click and load comment section.
            * @param eventObject the event object of the subreddit tab click.
            * @private
        */
        CommentSection.prototype.onSubredditTabClick = function (eventObject) {
            var tabElementClickedByUser = eventObject.target;
            /* Only continue if the user did not click a tab that is already selected. */
            if (!tabElementClickedByUser.classList.contains("active") && tabElementClickedByUser.tagName === "BUTTON") {
                var tabContainer = document.getElementById("at_tabcontainer");
                var currentIndexOfNewTab = 0;
                /* Iterate over the tabs to find the currently selected one and remove its selected status */
                for (var i = 0, len = tabContainer.children.length; i < len; i += 1) {
                    var tabElement = tabContainer.children[i];
                    if (tabElement === tabElementClickedByUser)
                        currentIndexOfNewTab = i;
                    tabElement.classList.remove("active");
                }
                /* Mark the new tab as selected and start downloading it. */
                tabElementClickedByUser.classList.add("active");
                this.showTab(this.threadCollection[currentIndexOfNewTab]);
            }
        };
        /**
            * Create a new tab and select it when an overflow menu item is clicked, load the comment section for it as well.
            * @param eventObject the event object of the subreddit menu item click.
            * @private
        */
        CommentSection.prototype.onSubredditOverflowItemClick = function (eventObject) {
            var tabContainer = document.getElementById("at_tabcontainer");
            var overflowItemClickedByUser = eventObject.target;
            var currentIndexOfNewTab = 0;
            /* Iterate over the current overflow items to find the index of the one that was just clicked. */
            var listOfExistingOverflowItems = overflowItemClickedByUser.parentNode;
            for (var i = 0, len = listOfExistingOverflowItems.children.length; i < len; i += 1) {
                var overflowElement = listOfExistingOverflowItems.children[i];
                if (overflowElement === overflowItemClickedByUser)
                    currentIndexOfNewTab = i;
            }
            /* Derive the total index of the item in the subreddit list from the number we just calculated added
             with the total length of the visible non overflow tabs */
            currentIndexOfNewTab = (tabContainer.children.length) + currentIndexOfNewTab - 1;
            var threadDataForNewTab = this.threadCollection[currentIndexOfNewTab];
            /* Move the new item frontmost in the array so it will be the first tab, and force a re-render of the tab control. */
            this.threadCollection.splice(currentIndexOfNewTab, 1);
            this.threadCollection.splice(0, 0, threadDataForNewTab);
            this.clearTabsFromTabContainer();
            this.insertTabsIntoDocument(tabContainer, 0);
            /* Start downloading the new tab. */
            this.showTab(this.threadCollection[0]);
            eventObject.stopPropagation();
        };
        /**
            * Triggered when the user has changed the value of the "Allow on this channel" checkbox.
            * @param eventObject the event object of the checkbox value change.
            * @private
         */
        CommentSection.prototype.allowOnChannelChange = function (eventObject) {
            var allowedOnChannel = eventObject.target.checked;
            var channelId = document.querySelector("meta[itemprop='channelId']").getAttribute("content");
            var channelDisplayActions = AlienTube.Preferences.getObject("channelDisplayActions");
            channelDisplayActions[channelId] = allowedOnChannel ? "alientube" : "gplus";
            AlienTube.Preferences.set("channelDisplayActions", channelDisplayActions);
        };
        /**
         * Get the display action of the current channel.
         * @private
         */
        CommentSection.prototype.getDisplayActionForCurrentChannel = function () {
            var channelId;
            if (AlienTube.Application.currentMediaService() === Service.YouTube) {
                channelId = document.getElementById(AlienTube.Application.CHANNEL_ELEMENT_ID).innerText;
            }
            else if (AlienTube.Application.currentMediaService() === Service.Vimeo) {
                channelId = document.querySelector("a[rel='author']").getAttribute("href").substring(1);
            }
            var displayActionByUser = AlienTube.Preferences.getObject("channelDisplayActions")[channelId];
            if (displayActionByUser) {
                return displayActionByUser;
            }
            return AlienTube.Preferences.getString("defaultDisplayAction");
        };
        /**
         * Get the confidence vote of a thread using Reddit's 'hot' sorting algorithm.
         * @param thread An object from the Reddit API containing thread information.
         * @private
         */
        CommentSection.prototype.getConfidenceForRedditThread = function (thread) {
            var order = Math.log(Math.max(Math.abs(thread.score), 1));
            var sign;
            if (thread.score > 0) {
                sign = 1;
            }
            else if (thread.score < 0) {
                sign = -1;
            }
            else {
                sign = 0;
            }
            var seconds = Math.floor(((new Date()).getTime() / 1000) - thread.created_utc) - 1134028003;
            return Math.round((order + sign * seconds / 4500) * 10000000) / 10000000;
        };
        /**
         * Check whether the website is currently using a "dark mode" plugin, and change AlienTube's style to comply.
         * @param alienTubeContainer DOM node of an AlienTube section element to apply the style to.
         * @private
         */
        CommentSection.prototype.checkEnvironmentDarkModestatus = function (alientubeContainer) {
            var bodyBackgroundColour = window.getComputedStyle(document.body, null).getPropertyValue('background-color');
            var bodyBackgroundColourArray = bodyBackgroundColour.substring(4, bodyBackgroundColour.length - 1).replace(/ /g, '').split(',');
            var bodyBackgroundColourAverage = 0;
            for (var i = 0; i < 3; i += 1) {
                bodyBackgroundColourAverage = bodyBackgroundColourAverage + parseInt(bodyBackgroundColourArray[i], 10);
            }
            bodyBackgroundColourAverage = bodyBackgroundColourAverage / 3;
            if (bodyBackgroundColourAverage < 100) {
                alientubeContainer.classList.add("darkmode");
            }
            else {
                alientubeContainer.classList.remove("darkmode");
            }
        };
        /**
         * Get the Reddit search string to perform.
         * @param videoID The YouTube or Vimeo video id to make a search for.
         * @returns A search string to send to the Reddit search API.
         * @private
         */
        CommentSection.prototype.getVideoSearchString = function (videoID) {
            if (AlienTube.Application.currentMediaService() === Service.YouTube) {
                return encodeURI("(url:3D" + videoID + " OR url:" + videoID + ") (site:youtube.com OR site:youtu.be)");
            }
            else if (AlienTube.Application.currentMediaService() === Service.Vimeo) {
                return encodeURI("url:https://vimeo.com/" + videoID + " OR url:http://vimeo.com/" + videoID);
            }
        };
        return CommentSection;
    }());
    AlienTube.CommentSection = CommentSection;
})(AlienTube || (AlienTube = {}));
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * Creates a new instance of a Comment Thread and adds it to DOM.
        * @class CommentThread
        * @param threadData JavaScript object containing all information about the Reddit thread.
        * @param commentSection The comment section object the thread exists within.
    */
    "use strict";
    var CommentThread = /** @class */ (function () {
        function CommentThread(threadData, commentSection) {
            this.sortingTypes = [
                "confidence",
                "top",
                "new",
                "controversial",
                "old",
                "qa"
            ];
            this.children = new Array();
            this.commentSection = commentSection;
            this.threadInformation = threadData[0].data.children[0].data;
            this.commentData = threadData[1].data.children;
            AlienTube.Preferences.set("redditUserIdentifierHash", threadData[0].data.modhash);
            this.postIsInPreservedMode = AlienTube.Utilities.isRedditPreservedPost(this.threadInformation);
            var template = AlienTube.Application.getExtensionTemplateItem(this.commentSection.template, "threadcontainer");
            this.threadContainer = template.querySelector("#at_comments");
            if (threadData[0].data.modhash.length > 0) {
                this.commentSection.userIsSignedIn = true;
                if (!threadData[0].data.modhash || !AlienTube.Preferences.getString("username")) {
                    new AlienTube.Reddit.RetreiveUsernameRequest();
                }
            }
            else {
                this.commentSection.userIsSignedIn = false;
                AlienTube.Preferences.set("username", "");
                this.threadContainer.classList.add("signedout");
            }
            /* Set the thread title and link to it, because Reddit for some reason encodes html entities in the title, we must use
            innerHTML. */
            var title = this.threadContainer.querySelector(".title");
            title.innerHTML = this.threadInformation.title;
            title.setAttribute("href", "http://reddit.com" + this.threadInformation.permalink);
            /* Set the username of the author and link to them */
            var username = this.threadContainer.querySelector(".at_author");
            username.textContent = this.threadInformation.author;
            username.setAttribute("href", "http://www.reddit.com/u/" + this.threadInformation.author);
            username.setAttribute("data-username", this.threadInformation.author);
            if (this.threadInformation.distinguished === "admin") {
                username.setAttribute("data-reddit-admin", "true");
            }
            else if (this.threadInformation.distinguished === "moderator") {
                username.setAttribute("data-reddit-mod", "true");
            }
            /* Add flair to the user */
            var flair = this.threadContainer.querySelector(".at_flair");
            if (this.threadInformation.author_flair_text) {
                flair.textContent = this.threadInformation.author_flair_text;
            }
            else {
                flair.style.display = "none";
            }
            /* Set the NSFW label on the post if applicable */
            if (this.threadInformation.over_18) {
                var optionsElement = this.threadContainer.querySelector(".options");
                var nsfwElement = document.createElement("acronym");
                nsfwElement.classList.add("nsfw");
                nsfwElement.setAttribute("title", AlienTube.Application.localisationManager.get("post_badge_NSFW_message"));
                nsfwElement.textContent = AlienTube.Application.localisationManager.get("post_badge_NSFW");
                optionsElement.insertBefore(nsfwElement, optionsElement.firstChild);
            }
            /* Set the gild (how many times the user has been given gold for this post) if any */
            if (this.threadInformation.gilded) {
                var gildCountElement = this.threadContainer.querySelector(".at_gilded");
                gildCountElement.setAttribute("data-count", this.threadInformation.gilded);
            }
            /* Set the the thread posted time */
            var timestamp = this.threadContainer.querySelector(".at_timestamp");
            timestamp.textContent = AlienTube.Application.getHumanReadableTimestamp(this.threadInformation.created_utc);
            timestamp.setAttribute("timestamp", new Date(this.threadInformation.created_utc).toISOString());
            /* Set the localised text for "by {username}" */
            var submittedByUsernameText = this.threadContainer.querySelector(".templateSubmittedByUsernameText");
            submittedByUsernameText.textContent = AlienTube.Application.localisationManager.get("post_submitted_preposition");
            /* Set the text for the comments button  */
            var openNewCommentBox = this.threadContainer.querySelector(".commentTo");
            openNewCommentBox.textContent = this.threadInformation.num_comments + " " + AlienTube.Application.localisationManager.get("post_button_comments").toLowerCase();
            openNewCommentBox.addEventListener("click", this.onCommentButtonClick.bind(this), false);
            /* Set the button text and the event handler for the "save" button */
            var saveItemToRedditList = this.threadContainer.querySelector(".save");
            if (this.threadInformation.saved) {
                saveItemToRedditList.textContent = AlienTube.Application.localisationManager.get("post_button_unsave");
                saveItemToRedditList.setAttribute("saved", "true");
            }
            else {
                saveItemToRedditList.textContent = AlienTube.Application.localisationManager.get("post_button_save");
            }
            saveItemToRedditList.addEventListener("click", this.onSaveButtonClick.bind(this), false);
            /* Set the button text and the event handler for the "refresh" button */
            var refreshCommentThread = this.threadContainer.querySelector(".refresh");
            refreshCommentThread.addEventListener("click", function () {
                this.commentSection.threadCollection.forEach(function (item) {
                    if (item.id === this.threadInformation.id) {
                        this.commentSection.downloadThread(item);
                    }
                });
            }, false);
            refreshCommentThread.textContent = AlienTube.Application.localisationManager.get("post_button_refresh");
            /* Set the button text and the link for the "give gold" button */
            var giveGoldToUser = this.threadContainer.querySelector(".giveGold");
            giveGoldToUser.setAttribute("href", "http://www.reddit.com/gold?goldtype=gift&months=1&thing=" + this.threadInformation.name);
            giveGoldToUser.textContent = AlienTube.Application.localisationManager.get("post_button_gold");
            /* Set the button text and the event handler for the "report post" button */
            var reportToAdministrators = this.threadContainer.querySelector(".report");
            reportToAdministrators.textContent = AlienTube.Application.localisationManager.get("post_button_report");
            reportToAdministrators.addEventListener("click", this.onReportButtonClicked.bind(this), false);
            /* Set the button text and event handler for the sort selector. */
            var sortController = this.threadContainer.querySelector(".sort");
            for (var sortIndex = 0, sortLength = this.sortingTypes.length; sortIndex < sortLength; sortIndex += 1) {
                sortController.children[sortIndex].textContent = AlienTube.Application.localisationManager.get("post_sort_" + this.sortingTypes[sortIndex]);
            }
            sortController.selectedIndex = this.sortingTypes.indexOf(AlienTube.Preferences.getString("threadSortType"));
            sortController.addEventListener("change", function () {
                AlienTube.Preferences.set("threadSortType", sortController.children[sortController.selectedIndex].getAttribute("value"));
                this.commentSection.threadCollection.forEach(function (item) {
                    if (item.id === this.threadInformation.id) {
                        this.commentSection.downloadThread(item);
                    }
                });
            }, false);
            /* Set the state of the voting buttons */
            var voteController = this.threadContainer.querySelector(".vote");
            voteController.querySelector(".score").textContent = this.threadInformation.score;
            voteController.querySelector(".arrow.up").addEventListener("click", this.onUpvoteControllerClick.bind(this), false);
            voteController.querySelector(".arrow.down").addEventListener("click", this.onDownvoteControllerClick.bind(this), false);
            if (this.threadInformation.likes === true) {
                voteController.classList.add("liked");
            }
            else if (this.threadInformation.likes === false) {
                voteController.classList.add("disliked");
            }
            /* Set the icon, text, and event listener for the button to switch to the Google+ comments. */
            var googlePlusButton = this.threadContainer.querySelector("#at_switchtogplus");
            googlePlusButton.addEventListener("click", this.onGooglePlusClick, false);
            var googlePlusContainer = document.getElementById("watch-discussion");
            if (AlienTube.Preferences.getBoolean("showGooglePlusButton") === false || googlePlusContainer === null) {
                googlePlusButton.style.display = "none";
            }
            /* Mark the post as preserved if applicable */
            if (this.postIsInPreservedMode) {
                this.threadContainer.classList.add("preserved");
            }
            else {
                if (this.commentSection.userIsSignedIn) {
                    new AlienTube.CommentField(this);
                }
            }
            /* If this post is prioritised (official) mark it as such in the header */
            if (this.threadInformation.official) {
                var officialLabel = this.threadContainer.querySelector(".at_official");
                officialLabel.textContent = AlienTube.Application.localisationManager.get("post_message_official");
                officialLabel.style.display = "inline-block";
            }
            /* Start iterating the top level comments in the comment section */
            this.commentData.forEach(function (commentObject) {
                if (commentObject.kind === "more") {
                    var readmore = new AlienTube.LoadMore(commentObject.data, this, this);
                    this.children.push(readmore);
                    this.threadContainer.appendChild(readmore.representedHTMLElement);
                }
                else {
                    var comment = new AlienTube.Comment(commentObject.data, this);
                    this.children.push(comment);
                    this.threadContainer.appendChild(comment.representedHTMLElement);
                }
            }.bind(this));
            this.set(this.threadContainer);
        }
        /**
        * Sets the contents of the comment thread.
        * @param contents HTML DOM node or element to use.
        */
        CommentThread.prototype.set = function (contents) {
            var oldThread = document.getElementById("at_comments");
            var alientube = document.getElementById("alientube");
            if (alientube && oldThread) {
                alientube.removeChild(oldThread);
            }
            alientube.appendChild(contents);
        };
        /**
         * Either save a post or unsave an already saved post.
         * @param eventObject The event object for the click of the save button.
         * @private
         */
        CommentThread.prototype.onSaveButtonClick = function (eventObject) {
            var saveButton = eventObject.target;
            var savedType = saveButton.getAttribute("saved") ? AlienTube.Reddit.SaveType.UNSAVE : AlienTube.Reddit.SaveType.SAVE;
            new AlienTube.Reddit.SaveRequest(this.threadInformation.name, savedType, function () {
                if (savedType === AlienTube.Reddit.SaveType.SAVE) {
                    saveButton.setAttribute("saved", "true");
                    saveButton.textContent = AlienTube.Application.localisationManager.get("post_button_unsave");
                }
                else {
                    saveButton.removeAttribute("saved");
                    saveButton.textContent = AlienTube.Application.localisationManager.get("post_button_save");
                }
            });
        };
        /**
         * Show the report post form.
         * @param eventObject The event object for the click of the report button.
         * @private
         */
        CommentThread.prototype.onReportButtonClicked = function (eventObject) {
            new AlienTube.Reddit.Report(this.threadInformation.name, this, true);
        };
        /**
         * Handle the click of the Google+ Button to change to the Google+ comments.
         * @private
         */
        CommentThread.prototype.onGooglePlusClick = function (eventObject) {
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "none";
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.visibility = "visible";
            googlePlusContainer.style.height = "auto";
            var redditButton = document.getElementById("at_switchtoreddit");
            redditButton.style.display = "block";
            /* Terrible hack to force Google+ to reload the comments by making it think the user has resized the window.
               Having to do this makes me sad.  */
            document.body.style.width = document.body.offsetWidth + "px";
            window.getComputedStyle(document.body, null);
            document.body.style.width = "auto";
            window.getComputedStyle(document.body, null);
        };
        /**
         * Upvote a post or remove an existing upvote.
         * @param eventObject The event object for the click of the upvote button.
         * @private
         */
        CommentThread.prototype.onUpvoteControllerClick = function (eventObject) {
            var upvoteController = eventObject.target;
            var voteController = upvoteController.parentNode;
            var scoreValue = voteController.querySelector(".score");
            if (this.threadInformation.likes === true) {
                /* The user already likes this post, so they wish to remove their current like. */
                voteController.classList.remove("liked");
                this.threadInformation.likes = null;
                this.threadInformation.score = this.threadInformation.score - 1;
                scoreValue.textContent = this.threadInformation.score;
                new AlienTube.Reddit.VoteRequest(this.threadInformation.name, AlienTube.Reddit.Vote.REMOVE);
            }
            else {
                /* The user wishes to like this post */
                if (this.threadInformation.likes === false) {
                    /* The user has previously disliked this post, we need to remove that status and add 2 to the score instead of 1*/
                    voteController.classList.remove("disliked");
                    this.threadInformation.score = this.threadInformation.score + 2;
                }
                else {
                    this.threadInformation.score = this.threadInformation.score + 1;
                }
                voteController.classList.add("liked");
                this.threadInformation.likes = true;
                scoreValue.textContent = this.threadInformation.score;
                new AlienTube.Reddit.VoteRequest(this.threadInformation.name, AlienTube.Reddit.Vote.UPVOTE);
            }
        };
        /**
         * Downvote a comment or remove an existing downvote
         * @param eventObject The event object for the click of the downvote button.
         * @private
         */
        CommentThread.prototype.onDownvoteControllerClick = function (eventObject) {
            var downvoteController = eventObject.target;
            var voteController = downvoteController.parentNode;
            var scoreValue = voteController.querySelector(".score");
            if (this.threadInformation.likes === false) {
                /* The user already dislikes this post, so they wish to remove their current dislike */
                voteController.classList.remove("disliked");
                this.threadInformation.likes = null;
                this.threadInformation.score = this.threadInformation.score + 1;
                scoreValue.textContent = this.threadInformation.score;
                new AlienTube.Reddit.VoteRequest(this.threadInformation.name, AlienTube.Reddit.Vote.REMOVE);
            }
            else {
                /* The user wishes to dislike this post */
                if (this.threadInformation.likes === true) {
                    /* The user has previously liked this post, we need to remove that status and subtract 2 from the score instead of 1*/
                    voteController.classList.remove("liked");
                    this.threadInformation.score = this.threadInformation.score - 2;
                }
                else {
                    this.threadInformation.score = this.threadInformation.score - 1;
                }
                voteController.classList.add("disliked");
                this.threadInformation.likes = false;
                scoreValue.textContent = this.threadInformation.score;
                new AlienTube.Reddit.VoteRequest(this.threadInformation.name, AlienTube.Reddit.Vote.DOWNVOTE);
            }
        };
        /**
         * Handle the click of the "comment" button, to show or hide the post comment box.
         * @private
         */
        CommentThread.prototype.onCommentButtonClick = function () {
            var header = document.querySelector(".at_thread");
            var previousCommentBox = header.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new AlienTube.CommentField(this);
        };
        return CommentThread;
    }());
    AlienTube.CommentThread = CommentThread;
})(AlienTube || (AlienTube = {}));
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * The representation and management of an AlienTube loading screen.
        * @class CommentField
        * @param commentSection The active CommentSection to retrieve data from.
        * @param insertionPoint The DOM element in which the loading screen should be appended to as a child.
        * @param [initialState] An optional initial state for the loading screen, the default is "Loading"
    */
    "use strict";
    var CommentField = /** @class */ (function () {
        function CommentField(parent, initialText, edit) {
            /* Check if the paramter is a Coment Thread and assign the correct parent HTML element .*/
            if (parent instanceof AlienTube.CommentThread) {
                this.parentClass = parent;
                this.commentThread = this.parentClass;
                this.parentHTMLElement = this.parentClass.threadContainer.querySelector(".options");
                /* Check if the parameter is a Comment and assign the correct parent HTML element.*/
            }
            else if (parent instanceof AlienTube.Comment) {
                this.parentClass = parent;
                this.commentThread = this.parentClass.commentThread;
                this.parentHTMLElement = this.parentClass.representedHTMLElement.querySelector(".options");
            }
            else {
                new TypeError("parent needs to be type CommentThread or Type Comment");
            }
            this.edit = edit;
            var template = AlienTube.Application.getExtensionTemplateItem(this.commentThread.commentSection.template, "commentfield");
            this.representedHTMLElement = template.querySelector(".at_commentfield");
            /* Set the "You are now commenting as" text under the comment field. */
            var authorName = this.representedHTMLElement.querySelector(".at_writingauthor");
            authorName.textContent = AlienTube.Application.localisationManager.get("commentfield_label_author", [AlienTube.Preferences.getString("username")]);
            /* Set the button text and event listener for the submit button */
            var submitButton = this.representedHTMLElement.querySelector(".at_submit");
            submitButton.textContent = AlienTube.Application.localisationManager.get("commentfield_button_submit");
            submitButton.addEventListener("click", this.onSubmitButtonClick.bind(this), false);
            /* Set the button text and event listener for the cancel button */
            var cancelButton = this.representedHTMLElement.querySelector(".at_cancel");
            cancelButton.textContent = AlienTube.Application.localisationManager.get("commentfield_button_cancel");
            cancelButton.addEventListener("click", this.onCancelButtonClick.bind(this), false);
            /* Set the text for the markdown preview header */
            var previewHeader = this.representedHTMLElement.querySelector(".at_preview_header");
            previewHeader.textContent = AlienTube.Application.localisationManager.get("commentfield_label_preview");
            /* Check if we were initialised with some text (most likely from the show source button) and add event listener for input
            change */
            var inputField = this.representedHTMLElement.querySelector(".at_textarea");
            if (initialText) {
                inputField.value = initialText;
            }
            inputField.addEventListener("input", this.onInputFieldChange.bind(this), false);
            this.previewElement = this.representedHTMLElement.querySelector(".at_comment_preview");
            this.parentHTMLElement.appendChild(this.representedHTMLElement);
        }
        Object.defineProperty(CommentField.prototype, "HTMLElement", {
            /**
             * Get the HTML element of the comment field.
             */
            get: function () {
                return this.representedHTMLElement;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Handle the click of the submit button of the comment field.
         * @param eventObject The event object of the click of the submit button.
         * @private
         */
        CommentField.prototype.onSubmitButtonClick = function (eventObject) {
            /* Disable the button on click so the user does not accidentally press it multiple times */
            var submitButton = eventObject.target;
            submitButton.disabled = true;
            var inputField = this.representedHTMLElement.querySelector(".at_textarea");
            var thing_id = (this.parentClass instanceof AlienTube.CommentThread)
                ? this.parentClass.threadInformation.name : this.parentClass.commentObject.name;
            if (this.edit) {
                /* Send the edit comment request to reddit */
                new AlienTube.Reddit.EditCommentRequest(thing_id, inputField.value, function (responseText) {
                    this.parentClass.commentObject.body = inputField.value;
                    var editedCommentBody = this.parentClass.representedHTMLElement.querySelector(".at_commentcontent");
                    editedCommentBody.innerHTML = SnuOwnd.getParser().render(inputField.value);
                    this.parentClass.representedHTMLElement.classList.add("edited");
                    /* The comment box is no longer needed, remove it and clear outselves out of memory */
                    this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
                });
            }
            else {
                /* Send the comment to Reddit */
                new AlienTube.Reddit.CommentRequest(thing_id, inputField.value, function (responseText) {
                    var responseObject = JSON.parse(responseText);
                    var comment = new AlienTube.Comment(responseObject.json.data.things[0].data, this.commentThread);
                    this.parentClass.children.push(comment);
                    /* Find the correct insert location and append the new comment to DOM */
                    if (this.parentClass instanceof AlienTube.CommentThread) {
                        this.parentClass.threadContainer.appendChild(comment.representedHTMLElement);
                        new CommentField(this.parentClass);
                    }
                    else {
                        this.parentClass.representedHTMLElement.querySelector(".at_replies").appendChild(comment.representedHTMLElement);
                    }
                    this.parentClass.children.push(comment);
                    /* Scroll the new comment in to view */
                    comment.representedHTMLElement.scrollIntoView(false);
                    /* The comment box is no longer needed, remove it and clear outselves out of memory */
                    this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
                });
            }
        };
        /**
         * Cancel / Remove the comment field.
         * @private
         */
        CommentField.prototype.onCancelButtonClick = function () {
            this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
        };
        /**
         * Handle the contents of the comment field changing.
         * @param eventObject The event object of the input field change.
         * @private
         */
        CommentField.prototype.onInputFieldChange = function (eventObject) {
            var inputField = eventObject.target;
            /* If there is any contents of the input box, display the markdown preview and populate it. */
            if (inputField.value.length > 0) {
                this.previewElement.style.display = "block";
                var previewContents = this.previewElement.querySelector(".at_preview_contents");
                previewContents.innerHTML = SnuOwnd.getParser().render(inputField.value);
            }
            else {
                this.previewElement.style.display = "none";
            }
        };
        return CommentField;
    }());
    AlienTube.CommentField = CommentField;
})(AlienTube || (AlienTube = {}));
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * A class representation and container of a single Reddit comment.
        * @class Comment
        * @param commentData Object containing the comment data from the Reddit API.
        * @param commentThread CommentThread object representing the container of the comment.
    */
    "use strict";
    var Comment = /** @class */ (function () {
        function Comment(commentData, commentThread) {
            this.children = new Array();
            this.commentObject = commentData;
            this.commentThread = commentThread;
            var template = AlienTube.Application.getExtensionTemplateItem(this.commentThread.commentSection.template, "comment");
            this.representedHTMLElement = template.querySelector(".at_comment");
            /* Set the id for the comment in question so it can be correlated with the Comment Object */
            this.representedHTMLElement.setAttribute("data-reddit-id", commentData.id);
            /* Show / collapse function for the comment */
            var toggleHide = this.representedHTMLElement.querySelector(".at_togglehide");
            toggleHide.addEventListener("click", function () {
                if (this.representedHTMLElement.classList.contains("hidden")) {
                    this.representedHTMLElement.classList.remove("hidden");
                }
                else {
                    this.representedHTMLElement.classList.add("hidden");
                }
            }.bind(this), false);
            /* Hide comments with a score less than the threshold set by the user  */
            if (this.commentObject.score < AlienTube.Preferences.getNumber("hiddenCommentScoreThreshold")) {
                this.representedHTMLElement.classList.add("hidden");
            }
            /* Set the link and name of author, as well as whether they are the OP or not. */
            var author = this.representedHTMLElement.querySelector(".at_author");
            author.textContent = this.commentObject.author;
            author.setAttribute("href", "http://reddit.com/u/" + this.commentObject.author);
            author.setAttribute("data-username", this.commentObject.author);
            if (commentData.distinguished === "admin") {
                author.setAttribute("data-reddit-admin", "true");
            }
            else if (commentData.distinguished === "moderator") {
                author.setAttribute("data-reddit-mod", "true");
            }
            else if (commentData.author === commentThread.threadInformation.author) {
                author.setAttribute("data-reddit-op", "true");
            }
            /* Set the gild (how many times the user has been given gold for this post) if any */
            if (this.commentObject.gilded) {
                this.representedHTMLElement.querySelector(".at_gilded").setAttribute("data-count", this.commentObject.gilded);
            }
            /* Add flair to the user */
            var flair = this.representedHTMLElement.querySelector(".at_flair");
            if (this.commentObject.author_flair_text) {
                flair.textContent = this.commentObject.author_flair_text;
            }
            else {
                flair.style.display = "none";
            }
            /* Set the score of the comment next to the user tag */
            var score = this.representedHTMLElement.querySelector(".at_score");
            var scorePointsText = this.commentObject.score === 1 ? AlienTube.Application.localisationManager.get("post_current_score") : AlienTube.Application.localisationManager.get("post_current_score_plural");
            score.textContent = (this.commentObject.score + scorePointsText);
            /* Set the timestamp of the comment */
            var timestamp = this.representedHTMLElement.querySelector(".at_timestamp");
            timestamp.textContent = AlienTube.Application.getHumanReadableTimestamp(this.commentObject.created_utc);
            timestamp.setAttribute("timestamp", new Date(this.commentObject.created_utc).toISOString());
            /* If the post has been edited, display the edit time next to the timestamp. */
            if (this.commentObject.edited) {
                timestamp.classList.add("edited");
                timestamp.title = "" + AlienTube.Application.getHumanReadableTimestamp(this.commentObject.edited, "edited_timestamp_format");
            }
            /* Render the markdown and set the actual comement messsage of the comment */
            var contentTextOfComment = this.representedHTMLElement.querySelector(".at_commentcontent");
            var contentTextHolder = document.createElement("span");
            /* Terrible workaround: Reddit text is double encoded with html entities for some reason, so we have to insert it into the DOM
            twice to make the browser decode it. */
            var textParsingElement = document.createElement("span");
            textParsingElement.innerHTML = this.commentObject.body;
            /* Set the comment text */
            contentTextHolder.innerHTML = SnuOwnd.getParser().render(textParsingElement.textContent);
            contentTextOfComment.appendChild(contentTextHolder);
            if (this.commentObject.body === "[deleted]") {
                this.representedHTMLElement.classList.add("deleted");
            }
            /* Set the button text and event handler for the reply button. */
            var replyToComment = this.representedHTMLElement.querySelector(".at_reply");
            replyToComment.textContent = AlienTube.Application.localisationManager.get("post_button_reply");
            replyToComment.addEventListener("click", this.onCommentButtonClick.bind(this), false);
            /* Set the button text and link for the "permalink" button */
            var permalinkElement = this.representedHTMLElement.querySelector(".at_permalink");
            permalinkElement.textContent = AlienTube.Application.localisationManager.get("post_button_permalink");
            permalinkElement.setAttribute("href", "http://www.reddit.com" + commentThread.threadInformation.permalink + this.commentObject.id);
            /* Set the button text and link for the "parent" link button */
            var parentLinkElement = this.representedHTMLElement.querySelector(".at_parentlink");
            parentLinkElement.textContent = AlienTube.Application.localisationManager.get("post_button_parent");
            parentLinkElement.setAttribute("href", "http://www.reddit.com" + commentThread.threadInformation.permalink + "#" + this.commentObject.parent_id.substring(3));
            /* Set the button text and the event handler for the "show source" button */
            var displaySourceForComment = this.representedHTMLElement.querySelector(".at_displaysource");
            displaySourceForComment.textContent = AlienTube.Application.localisationManager.get("post_button_source");
            displaySourceForComment.addEventListener("click", this.onSourceButtonClick.bind(this), false);
            /* Set the button text and the event handler for the "save comment" button */
            var saveItemToRedditList = this.representedHTMLElement.querySelector(".save");
            if (this.commentObject.saved) {
                saveItemToRedditList.textContent = AlienTube.Application.localisationManager.get("post_button_unsave");
                saveItemToRedditList.setAttribute("saved", "true");
            }
            else {
                saveItemToRedditList.textContent = AlienTube.Application.localisationManager.get("post_button_save");
            }
            saveItemToRedditList.addEventListener("click", this.onSaveButtonClick.bind(this), false);
            /* Set the button text and the link for the "give gold" button */
            var giveGoldToUser = this.representedHTMLElement.querySelector(".giveGold");
            giveGoldToUser.setAttribute("href", "http://www.reddit.com/gold?goldtype=gift&months=1&thing=" + this.commentObject.name);
            giveGoldToUser.textContent = AlienTube.Application.localisationManager.get("post_button_gold");
            var reportToAdministrators = this.representedHTMLElement.querySelector(".report");
            var editPost = this.representedHTMLElement.querySelector(".at_edit");
            var deletePost = this.representedHTMLElement.querySelector(".at_delete");
            if (this.commentObject.author === AlienTube.Preferences.getString("username")) {
                /* Report button does not make sense on our own post, so let's get rid of it */
                reportToAdministrators.parentNode.removeChild(reportToAdministrators);
                /* Set the button text and the event handler for the "edit post" button */
                editPost.textContent = AlienTube.Application.localisationManager.get("post_button_edit");
                editPost.addEventListener("click", this.onEditPostButtonClick.bind(this), false);
                /* Set the button text and the event handler for the "delete post" button */
                deletePost.textContent = AlienTube.Application.localisationManager.get("post_button_delete");
                deletePost.addEventListener("click", this.onDeletePostButtonClick.bind(this), false);
            }
            else {
                /* Delete and edit buttons does not make sense if the post is not ours, so let's get rid of them. */
                editPost.parentNode.removeChild(editPost);
                deletePost.parentNode.removeChild(deletePost);
                /* Set the button text and the event handler for the "report comment" button */
                reportToAdministrators.textContent = AlienTube.Application.localisationManager.get("post_button_report");
                reportToAdministrators.addEventListener("click", this.onReportButtonClicked.bind(this), false);
            }
            /* Set the state of the voting buttons */
            var voteController = this.representedHTMLElement.querySelector(".vote");
            voteController.querySelector(".arrow.up").addEventListener("click", this.onUpvoteControllerClick.bind(this), false);
            voteController.querySelector(".arrow.down").addEventListener("click", this.onDownvoteControllerClick.bind(this), false);
            if (this.commentObject.likes === true) {
                voteController.classList.add("liked");
            }
            else if (this.commentObject.likes === false) {
                voteController.classList.add("disliked");
            }
            /* Continue traversing down and populate the replies to this comment. */
            if (this.commentObject.replies) {
                var replyContainer_1 = this.representedHTMLElement.querySelector(".at_replies");
                this.commentObject.replies.data.children.forEach(function (commentObject) {
                    if (commentObject.kind === "more") {
                        var readmore = new AlienTube.LoadMore(commentObject.data, this, commentThread);
                        this.children.push(readmore);
                        replyContainer_1.appendChild(readmore.representedHTMLElement);
                    }
                    else {
                        var comment = new Comment(commentObject.data, commentThread);
                        this.children.push(comment);
                        replyContainer_1.appendChild(comment.representedHTMLElement);
                    }
                }.bind(this));
            }
        }
        /**
         * Either save a comment or unsave an already saved comment.
         * @param eventObject The event object for the click of the save button.
         * @private
         */
        Comment.prototype.onSaveButtonClick = function (eventObject) {
            var saveButton = eventObject.target;
            var savedType = saveButton.getAttribute("saved") ? AlienTube.Reddit.SaveType.UNSAVE : AlienTube.Reddit.SaveType.SAVE;
            new AlienTube.Reddit.SaveRequest(this.commentObject.name, savedType, function () {
                if (savedType === AlienTube.Reddit.SaveType.SAVE) {
                    saveButton.setAttribute("saved", "true");
                    saveButton.textContent = AlienTube.Application.localisationManager.get("post_button_unsave");
                }
                else {
                    saveButton.removeAttribute("saved");
                    saveButton.textContent = AlienTube.Application.localisationManager.get("post_button_save");
                }
            });
        };
        /**
         * Show the report comment form.
         * @param eventObject The event object for the click of the report button.
         * @private
         */
        Comment.prototype.onReportButtonClicked = function (eventObject) {
            new AlienTube.Reddit.Report(this.commentObject.name, this.commentThread, false);
        };
        /**
         * Upvote a comment or remove an existing upvote.
         * @param eventObject The event object for the click of the upvote button.
         * @private
         */
        Comment.prototype.onUpvoteControllerClick = function (eventObject) {
            var upvoteController = eventObject.target;
            var voteController = upvoteController.parentNode;
            var parentNode = voteController.parentNode;
            var scoreValue = parentNode.querySelector(".at_score");
            if (this.commentObject.likes === true) {
                /* The user already likes this post, so they wish to remove their current like. */
                voteController.classList.remove("liked");
                this.commentObject.likes = null;
                this.commentObject.score = this.commentObject.score - 1;
                var scorePointsText = this.commentObject.score === 1 ? AlienTube.Application.localisationManager.get("post_current_score") : AlienTube.Application.localisationManager.get("post_current_score_plural");
                scoreValue.textContent = this.commentObject.score + scorePointsText;
                new AlienTube.Reddit.VoteRequest(this.commentObject.name, AlienTube.Reddit.Vote.REMOVE);
            }
            else {
                /* The user wishes to like this post */
                if (this.commentObject.likes === false) {
                    /* The user has previously disliked this post, we need to remove that status and add 2 to the score instead of 1*/
                    voteController.classList.remove("disliked");
                    this.commentObject.score = this.commentObject.score + 2;
                }
                else {
                    this.commentObject.score = this.commentObject.score + 1;
                }
                voteController.classList.add("liked");
                this.commentObject.likes = true;
                var scorePointsText = this.commentObject.score === 1 ? AlienTube.Application.localisationManager.get("post_current_score") : AlienTube.Application.localisationManager.get("post_current_score_plural");
                scoreValue.textContent = this.commentObject.score + scorePointsText;
                new AlienTube.Reddit.VoteRequest(this.commentObject.name, AlienTube.Reddit.Vote.UPVOTE);
            }
        };
        /**
         * Downvote a comment or remove an existing downvote
         * @param eventObject The event object for the click of the downvote button.
         * @private
         */
        Comment.prototype.onDownvoteControllerClick = function (eventObject) {
            var downvoteController = eventObject.target;
            var voteController = downvoteController.parentNode;
            var parentNode = voteController.parentNode;
            var scoreValue = parentNode.querySelector(".at_score");
            if (this.commentObject.likes === false) {
                /* The user already dislikes this post, so they wish to remove their current dislike */
                voteController.classList.remove("disliked");
                this.commentObject.likes = null;
                this.commentObject.score = this.commentObject.score + 1;
                var scorePointsText = this.commentObject.score === 1 ? AlienTube.Application.localisationManager.get("post_current_score") : AlienTube.Application.localisationManager.get("post_current_score_plural");
                scoreValue.textContent = this.commentObject.score + scorePointsText;
                new AlienTube.Reddit.VoteRequest(this.commentObject.name, AlienTube.Reddit.Vote.REMOVE);
            }
            else {
                /* The user wishes to dislike this post */
                if (this.commentObject.likes === true) {
                    /* The user has previously liked this post, we need to remove that status and subtract 2 from the score instead of 1*/
                    voteController.classList.remove("liked");
                    this.commentObject.score = this.commentObject.score - 2;
                }
                else {
                    this.commentObject.score = this.commentObject.score - 1;
                }
                voteController.classList.add("disliked");
                this.commentObject.likes = false;
                var scorePointsText = this.commentObject.score === 1 ? AlienTube.Application.localisationManager.get("post_current_score") : AlienTube.Application.localisationManager.get("post_current_score_plural");
                scoreValue.textContent = this.commentObject.score + scorePointsText;
                new AlienTube.Reddit.VoteRequest(this.commentObject.name, AlienTube.Reddit.Vote.DOWNVOTE);
            }
        };
        /**
         * Show or hide the comment/reply box.
         * @private
         */
        Comment.prototype.onCommentButtonClick = function () {
            var previousCommentBox = this.representedHTMLElement.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new AlienTube.CommentField(this);
        };
        /**
         * Show the source of the comment.
         * @private
         */
        Comment.prototype.onSourceButtonClick = function () {
            var previousCommentBox = this.representedHTMLElement.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new AlienTube.CommentField(this, this.commentObject.body);
        };
        /**
         * Edit a comment.
         * @private
         */
        Comment.prototype.onEditPostButtonClick = function () {
            var previousCommentBox = this.representedHTMLElement.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new AlienTube.CommentField(this, this.commentObject.body, true);
        };
        /**
         * Delete a comment.
         * @private
         */
        Comment.prototype.onDeletePostButtonClick = function () {
            var confirmation = window.confirm(AlienTube.Application.localisationManager.get("post_delete_confirm"));
            if (confirmation) {
                var url = "https://api.reddit.com/api/del";
                new AlienTube.HttpRequest(url, AlienTube.RequestType.POST, function () {
                    this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
                    var getIndexInParentList = this.commentThread.children.indexOf(this);
                    if (getIndexInParentList !== -1) {
                        this.commentThread.children.splice(getIndexInParentList, 1);
                    }
                }, {
                    "uh": AlienTube.Preferences.getString("redditUserIdentifierHash"),
                    "id": this.commentObject.name,
                });
            }
        };
        return Comment;
    }());
    AlienTube.Comment = Comment;
})(AlienTube || (AlienTube = {}));
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * A class representation and container of a single Reddit comment.
        * @class ReadMore
        * @param data Object containing the "load more comments" links.
        * @param commentThread CommentThread object representing the container of the load more link.
    */
    "use strict";
    var LoadMore = /** @class */ (function () {
        function LoadMore(data, referenceParent, commentThread) {
            this.data = data;
            this.commentThread = commentThread;
            this.referenceParent = referenceParent;
            this.representedHTMLElement = AlienTube.Application.getExtensionTemplateItem(commentThread.commentSection.template, "loadmore");
            /* Display the amount of replies available to load */
            var replyCount = this.representedHTMLElement.querySelector(".at_replycount");
            var replyCountText = data.count > 1 ? AlienTube.Application.localisationManager.get("post_label_reply_plural") : AlienTube.Application.localisationManager.get("post_label_reply");
            replyCount.textContent = "(" + data.count + " " + replyCountText + ")";
            /* Set the localisation for the "load more" button, and the event listener. */
            var loadMoreText = this.representedHTMLElement.querySelector(".at_load");
            loadMoreText.textContent = AlienTube.Application.localisationManager.get("post_button_load_more");
            loadMoreText.addEventListener("click", this.onLoadMoreClick.bind(this), false);
        }
        /**
         * Handle a click on the "load more" button.
         * @param eventObject The event object of the load more button click.
         * @private
         */
        LoadMore.prototype.onLoadMoreClick = function (eventObject) {
            /* Display "loading comments" text */
            var loadingText = eventObject.target;
            loadingText.classList.add("loading");
            loadingText.textContent = AlienTube.Application.localisationManager.get("loading_generic_message");
            var generateRequestUrl = "https://api.reddit.com/r/" + this.commentThread.threadInformation.subreddit + "\"/comments/" + this.commentThread.threadInformation.id + "/z/" + this.data.id + ".json";
            new AlienTube.HttpRequest(generateRequestUrl, AlienTube.RequestType.GET, function (responseData) {
                /* Remove "loading comments" text */
                var getParentNode = loadingText.parentNode.parentNode;
                getParentNode.removeChild(loadingText.parentNode);
                /* Traverse the retrieved comments and append them to the comment section */
                var commentItems = JSON.parse(responseData)[1].data.children;
                if (commentItems.length > 0) {
                    commentItems.forEach(function (commentObject) {
                        var readmore, comment;
                        if (commentObject.kind === "more") {
                            readmore = new LoadMore(commentObject.data, this.referenceParent, this.commentThread);
                            this.referenceParent.children.push(readmore);
                            getParentNode.appendChild(readmore.representedHTMLElement);
                        }
                        else {
                            comment = new AlienTube.Comment(commentObject.data, this.commentThread);
                            this.referenceParent.children.push(comment);
                            getParentNode.appendChild(comment.representedHTMLElement);
                        }
                    });
                }
            });
        };
        return LoadMore;
    }());
    AlienTube.LoadMore = LoadMore;
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
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * The representation and management of an AlienTube loading screen.
        * @class LoadingScreen
        * @param commentSection The active CommentSection to retrieve data from.
        * @param insertionPoint The DOM element in which the loading screen should be appended to as a child.
        * @param [initialState] An optional initial state for the loading screen, the default is "Loading"
    */
    "use strict";
    var LoadingScreen = /** @class */ (function () {
        function LoadingScreen(commentSection, initialState, alternativeText) {
            var loadingState = initialState || LoadingState.LOADING;
            this.representedHTMLElement = AlienTube.Application.getExtensionTemplateItem(commentSection.template, "loading");
            this.updateProgress(loadingState, alternativeText);
        }
        Object.defineProperty(LoadingScreen.prototype, "HTMLElement", {
            /**
             * Get the HTML element of the loading screen container.
             */
            get: function () {
                return this.representedHTMLElement;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Update the current progress of the loading screen.
         * @param state The new state of the loading screen.
         * @param [alternativeText] A custom message to put on the loading screen for the user.
         */
        LoadingScreen.prototype.updateProgress = function (state, alternativeText) {
            this.currentProgressState = state;
            var loadingText = this.representedHTMLElement.querySelector("#at_loadingtext");
            var loadingHeader = this.representedHTMLElement.querySelector("#at_loadingheader");
            switch (this.currentProgressState) {
                case LoadingState.LOADING:
                    this.loadingAttempts = 1;
                    loadingHeader.textContent = alternativeText || AlienTube.Application.localisationManager.get("loading_generic_message");
                    loadingText.textContent = AlienTube.Application.localisationManager.get("loading_generic_text") || "";
                    break;
                case LoadingState.RETRY:
                    this.loadingAttempts += 1;
                    loadingText.textContent = AlienTube.Application.localisationManager.get("loading_retry_message", [
                        this.loadingAttempts.toString(),
                        "3"
                    ]);
                    break;
                case LoadingState.ERROR:
                case LoadingState.COMPLETE:
                    var parentNode = this.representedHTMLElement.parentNode;
                    if (parentNode) {
                        this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
                    }
                    //delete this;
                    break;
            }
        };
        return LoadingScreen;
    }());
    AlienTube.LoadingScreen = LoadingScreen;
    var LoadingState;
    (function (LoadingState) {
        LoadingState[LoadingState["LOADING"] = 0] = "LOADING";
        LoadingState[LoadingState["RETRY"] = 1] = "RETRY";
        LoadingState[LoadingState["ERROR"] = 2] = "ERROR";
        LoadingState[LoadingState["COMPLETE"] = 3] = "COMPLETE";
    })(LoadingState = AlienTube.LoadingState || (AlienTube.LoadingState = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
var AlienTube;
(function (AlienTube) {
    /**
        * The representation and management of an AlienTube loading screen.
        * @class ErrorScreen
        * @param commentSection The active CommentSection to retrieve data from.
        * @param errorState The error state of the error screen, defines what visuals and titles will be displayed.
        * @param [message] Optional message to be displayed if the error state is set to regular "ERROR"
    */
    "use strict";
    var ErrorScreen = /** @class */ (function () {
        function ErrorScreen(commentSection, errorState, message) {
            this.representedHTMLElement = AlienTube.Application.getExtensionTemplateItem(commentSection.template, "error");
            var errorImage = this.representedHTMLElement.querySelector("img");
            var errorHeader = this.representedHTMLElement.querySelector("#at_errorheader");
            var errorText = this.representedHTMLElement.querySelector("#at_errortext");
            /* Set the icon, text, and event listener for the button to switch to the Google+ comments. */
            var googlePlusButton = this.representedHTMLElement.querySelector("#at_switchtogplus");
            googlePlusButton.addEventListener("click", this.onGooglePlusClick, false);
            var googlePlusContainer = document.getElementById("watch-discussion");
            if (AlienTube.Preferences.getBoolean("showGooglePlusButton") === false || googlePlusContainer === null) {
                googlePlusButton.style.display = "none";
            }
            switch (errorState) {
                case ErrorState.NOT_FOUND:
                    /* Reddit.com uses 5 different randomly selected visuals for their 404 graphic, their path consists of a letter from
                    "a" to "e" just like Reddit we are randomly choosing one of these letters and retrieving the image. */
                    var getRandom404Id = String.fromCharCode(97 + Math.floor(Math.random() * 5));
                    errorImage.setAttribute("src", "https://www.redditstatic.com/reddit404" + getRandom404Id + ".png");
                    /* Set page not found localisation text */
                    errorHeader.textContent = AlienTube.Application.localisationManager.get("error_header_not_found");
                    errorText.textContent = AlienTube.Application.localisationManager.get("error_message_not_found");
                    break;
                case ErrorState.OVERLOAD:
                    /* Retrieve the Reddit overloaded svg graphic from the ressource directory. */
                    errorImage.setAttribute("src", AlienTube.Application.getExtensionRessourcePath("redditoverload.svg"));
                    /* Set reddit overloaded localisation text */
                    errorHeader.textContent = AlienTube.Application.localisationManager.get("error_header_overloaded");
                    errorText.textContent = AlienTube.Application.localisationManager.get("error_message_overloaded");
                    break;
                case ErrorState.ERROR:
                case ErrorState.REDDITERROR:
                    /* Retrieve the generic "Reddit is broken" svg graphic from the ressource directory */
                    errorImage.setAttribute("src", AlienTube.Application.getExtensionRessourcePath("redditbroken.svg"));
                    /* Set "you broke reddit" localisation text, and a custom message if provided */
                    errorHeader.textContent = AlienTube.Application.localisationManager.get("error_header_generic");
                    if (message) {
                        errorText.textContent = message;
                    }
                    break;
                case ErrorState.CONNECTERROR:
                    /* Retrieve the generic "Reddit is broken" svg graphic from the ressource directory */
                    errorImage.setAttribute("src", AlienTube.Application.getExtensionRessourcePath("redditbroken.svg"));
                    /* Set "connection timed out" localisation text */
                    errorHeader.textContent = AlienTube.Application.localisationManager.get("error_header_timeout");
                    errorText.textContent = AlienTube.Application.localisationManager.get("error_message_timeout");
                    break;
                case ErrorState.BLOCKED:
                    /* Retrieve the reddit blocked svg graphic from the ressource directory */
                    errorImage.setAttribute("src", AlienTube.Application.getExtensionRessourcePath("redditblocked.svg"));
                    /* Set "connection is being interrupted" localisation text */
                    errorHeader.textContent = AlienTube.Application.localisationManager.get("error_header_interrupted");
                    errorText.textContent = AlienTube.Application.localisationManager.get("error_message_interrupted");
                    break;
            }
            /* Provide a retry button which reloads AlienTube completely and tries again. */
            var retryButton = this.representedHTMLElement.querySelector(".at_retry");
            retryButton.textContent = AlienTube.Application.localisationManager.get("error_button_retry");
            retryButton.addEventListener("click", this.reload, false);
            commentSection.set(this.representedHTMLElement);
        }
        /**
         * Reload the comment section.
         * @private
         */
        ErrorScreen.prototype.reload = function () {
            AlienTube.Application.commentSection = new AlienTube.CommentSection(AlienTube.Application.getCurrentVideoId());
        };
        /**
         * Handle the click of the Google+ Button to change to the Google+ comments.
         * @private
         */
        ErrorScreen.prototype.onGooglePlusClick = function (eventObject) {
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "none";
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.visibility = "visible";
            googlePlusContainer.style.height = "auto";
            var redditButton = document.getElementById("at_switchtoreddit");
            redditButton.style.display = "block";
        };
        return ErrorScreen;
    }());
    AlienTube.ErrorScreen = ErrorScreen;
    var ErrorState;
    (function (ErrorState) {
        ErrorState[ErrorState["NOT_FOUND"] = 0] = "NOT_FOUND";
        ErrorState[ErrorState["OVERLOAD"] = 1] = "OVERLOAD";
        ErrorState[ErrorState["REDDITERROR"] = 2] = "REDDITERROR";
        ErrorState[ErrorState["CONNECTERROR"] = 3] = "CONNECTERROR";
        ErrorState[ErrorState["BLOCKED"] = 4] = "BLOCKED";
        ErrorState[ErrorState["ERROR"] = 5] = "ERROR";
    })(ErrorState = AlienTube.ErrorState || (AlienTube.ErrorState = {}));
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
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            Perform a request to Reddit with embedded error handling.
            * @class Request
            * @param url The Reddit URL to make the request to.
            * @param type The type of request (POST or GET).
            * @param callback A callback handler for when the request is completed.
            * @param [postData] Eventual HTTP POST data to send with the request.
            * @param [loadingScreen] A LoadingScreen object to use for updating the progress of the request.
        */
        "use strict";
        var Request = /** @class */ (function () {
            function Request(url, type, callback, postData, loadingScreen) {
                this.loadTimer = 0;
                this.timeoutTimer = 0;
                /* Move the request parameters so they are accessible from anywhere within the class. */
                this.requestUrl = url;
                this.requestType = type;
                this.finalCallback = callback;
                this.postData = postData;
                this.loadingScreen = loadingScreen;
                /* Perform the request. */
                this.performRequest();
            }
            /**
             * Attempt to perform the request to the Reddit API.
             */
            Request.prototype.performRequest = function () {
                this.attempts += 1;
                /* Kick of a 3 second timer that will confirm to the user that the loading process is taking unusually long, unless cancelled
                by a successful load (or an error) */
                this.loadTimer = setTimeout(function () {
                    var loadingText = document.getElementById("at_loadingtext");
                    loadingText.textContent = AlienTube.Application.localisationManager.get("loading_slow_message");
                }, 3000);
                /* Kick of a 30 second timer that will cancel the connection attempt and display an error to the user letting them know
                something is probably blocking the connection. */
                this.timeoutTimer = setTimeout(function () {
                    new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.CONNECTERROR);
                }, 30000);
                /* Perform the reddit api request */
                new AlienTube.HttpRequest(this.requestUrl, this.requestType, this.onSuccess.bind(this), this.postData, this.onRequestError.bind(this));
            };
            /**
             * Called when a successful request has been made.
             * @param responseText the response from the Reddit API.
             */
            Request.prototype.onSuccess = function (responseText) {
                /* Cancel the slow load timer */
                clearTimeout(this.loadTimer);
                /* Cancel the unsuccessful load timer */
                clearTimeout(this.timeoutTimer);
                /* Dismiss the loading screen, perform the callback and clear ourselves out of memory. */
                this.loadingScreen.updateProgress(AlienTube.LoadingState.COMPLETE);
                try {
                    var responseObject = JSON.parse(responseText);
                    this.finalCallback(responseObject);
                }
                catch (e) {
                    if (e.toString().indexOf("SyntaxError: Unexpected end of input") !== -1) {
                        new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.CONNECTERROR);
                    }
                    else {
                        new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.ERROR, e.stack);
                    }
                }
            };
            /**
             * Called when a request was unsuccessful.
             * @param xhr the javascript XHR object of the request.
             * @param [response] An optional error message.
             */
            Request.prototype.onRequestError = function (status, response) {
                /* Cancel the slow load timer */
                clearTimeout(this.loadTimer);
                clearTimeout(this.timeoutTimer);
                if (this.attempts <= 3 && status !== 404) {
                    /* Up to 3 attempts, retry the loading process automatically. */
                    this.loadingScreen.updateProgress(AlienTube.LoadingState.RETRY);
                    this.performRequest();
                }
                else {
                    /* We have tried too many times without success, give up and display an error to the user. */
                    this.loadingScreen.updateProgress(AlienTube.LoadingState.ERROR);
                    switch (status) {
                        case 0:
                            new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.BLOCKED);
                            break;
                        case 404:
                            new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.NOT_FOUND);
                            break;
                        case 503:
                        case 504:
                        case 520:
                        case 521:
                            new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.OVERLOAD);
                            break;
                        default:
                            new AlienTube.ErrorScreen(AlienTube.Application.commentSection, AlienTube.ErrorState.REDDITERROR, response);
                    }
                }
            };
            return Request;
        }());
        Reddit.Request = Request;
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            * Perform a request to Reddit to submit a comment.
            * @class CommentRequest
            * @param thing The Reddit ID of the item the user wants to comment on.
            * @param comment A markdown string containing the user's comment
            * @param callback Callback handler for the event when loaded.
        */
        "use strict";
        var CommentRequest = /** @class */ (function () {
            function CommentRequest(thing, comment, callback) {
                var url = "https://api.reddit.com/api/comment";
                new AlienTube.HttpRequest(url, AlienTube.RequestType.POST, callback, {
                    "uh": AlienTube.Preferences.getString("redditUserIdentifierHash"),
                    "thing_id": thing,
                    "text": comment,
                    "api_type": "json"
                });
            }
            return CommentRequest;
        }());
        Reddit.CommentRequest = CommentRequest;
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            Perform a request to Reddit to edit an existing comment.
            @class EditCommentRequest
            @param thing The Reddit ID of the item the user wants edit.
            @param comment A markdown string containing the user's new comment
            @param callback Callback handler for the event when loaded.
        */
        "use strict";
        var EditCommentRequest = /** @class */ (function () {
            function EditCommentRequest(thing, comment, callback) {
                var url = "https://api.reddit.com/api/editusertext";
                new AlienTube.HttpRequest(url, AlienTube.RequestType.POST, callback, {
                    "uh": AlienTube.Preferences.getString("redditUserIdentifierHash"),
                    "thing_id": thing,
                    "text": comment,
                    "api_type": "json"
                });
            }
            return EditCommentRequest;
        }());
        Reddit.EditCommentRequest = EditCommentRequest;
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            Perform a request to Reddit to either save or unsave an item.
            @class RedditVoteRequest
            @param thing The Reddit ID of the item the user wants to vote on
            @param type Whether the user wants to upvote, downvote, or remove their vote.
            @param callback Callback handler for the event when loaded.
        */
        "use strict";
        var VoteRequest = /** @class */ (function () {
            function VoteRequest(thing, type, callback) {
                var url = "https://api.reddit.com/api/vote";
                new AlienTube.HttpRequest(url, AlienTube.RequestType.POST, callback, {
                    "uh": AlienTube.Preferences.getString("redditUserIdentifierHash"),
                    "id": thing,
                    "dir": type
                });
            }
            return VoteRequest;
        }());
        Reddit.VoteRequest = VoteRequest;
        var Vote;
        (function (Vote) {
            Vote[Vote["UPVOTE"] = 1] = "UPVOTE";
            Vote[Vote["DOWNVOTE"] = -1] = "DOWNVOTE";
            Vote[Vote["REMOVE"] = 0] = "REMOVE";
        })(Vote = Reddit.Vote || (Reddit.Vote = {}));
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            Report a post or comment to moderators.
            @class RedditReport
            @param thing The Reddit ID of the item you wish to report.
            @param commentThread CommentThread object representing the container of the comment.
            @param isThread Whether the thing being reported is an entire thread.
        */
        "use strict";
        var Report = /** @class */ (function () {
            function Report(thing, commentThread, isThread) {
                var reportTemplate = AlienTube.Application.getExtensionTemplateItem(commentThread.commentSection.template, "report");
                this.reportContainer = reportTemplate.querySelector(".at_report");
                /* Set localisation text for the various report reasons */
                var report_options = [
                    "spam",
                    "vote_manipulation",
                    "personal_information",
                    "sexualising_minors",
                    "breaking_reddit",
                    "other"
                ];
                report_options.forEach(function (reportOption) {
                    document.querySelector("label[for='report_" + reportOption + "']").textContent = AlienTube.Application.localisationManager.get("report_dialog_" + reportOption);
                });
                /* Set localisation text for the submit button */
                var submitButton = this.reportContainer.querySelector(".at_report_submit");
                submitButton.appendChild(document.createTextNode(AlienTube.Application.localisationManager.get("report_dialog_button_submit")));
                /* Set localisation text for the cancel button */
                var cancelButton = this.reportContainer.querySelector(".at_report_cancel");
                cancelButton.appendChild(document.createTextNode(AlienTube.Application.localisationManager.get("report_dialog_button_cancel")));
                /* Assign an event listener to all the buttons, checking if the one that is being selected is the "other" button.
                If so, re-enable the "other reason" text field, if not, disable it. */
                var reportOtherButton = this.reportContainer.querySelector("#report_other");
                var reportOtherField = this.reportContainer.querySelector("#report_otherfield");
                var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
                for (var i = 0, len = radioButtonControllers.length; i < len; i += 1) {
                    radioButtonControllers[i].addEventListener("change", function () {
                        if (reportOtherButton.checked) {
                            reportOtherField.disabled = false;
                        }
                        else {
                            reportOtherField.disabled = true;
                        }
                    }, false);
                }
                /* Submit button click event. Check if the currently selected radio button is the "other" button, if so retrieve it's text
                field value. If not, use the value from whatever radio button is selected.  */
                submitButton.addEventListener("click", function () {
                    var activeRadioButton = this.getCurrentSelectedRadioButton();
                    var reportReason = "";
                    var otherReason = "";
                    if (activeRadioButton) {
                        if (activeRadioButton === reportOtherButton) {
                            reportReason = "other";
                            otherReason = reportOtherField.value;
                        }
                        else {
                            reportReason = activeRadioButton.firstChild.innerHTML;
                        }
                    }
                    /* Send the report to Reddit*/
                    new AlienTube.HttpRequest("https://api.reddit.com/api/report", AlienTube.RequestType.POST, function () {
                        var threadCollection, i, len, tabContainer, comment;
                        if (isThread) {
                            /* If the "thing" that was reported was a thread, we will iterate through the thread collection to find it, and
                            delete it, effectively hiding it. We will then force a redraw of the tab container, selecting the first tab in
                            the list.  */
                            threadCollection = commentThread.commentSection.threadCollection;
                            for (i = 0, len = threadCollection.length; i < len; i += 1) {
                                if (threadCollection[i].name === commentThread.threadInformation.name) {
                                    threadCollection.splice(i, 1);
                                    commentThread.commentSection.clearTabsFromTabContainer();
                                    tabContainer = document.getElementById("at_tabcontainer");
                                    commentThread.commentSection.insertTabsIntoDocument(tabContainer, 0);
                                    commentThread.commentSection.downloadThread(threadCollection[0]);
                                    break;
                                }
                            }
                        }
                        else {
                            /* If the "thing" that was reported was a comment, we will locate it on the page and delete it from DOM,
                            effectively hiding it. */
                            comment = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "']");
                            if (comment) {
                                comment.parentNode.removeChild(comment);
                            }
                        }
                    }, {
                        "api_type": "json",
                        "reason": reportReason,
                        "other_reason": otherReason,
                        "thing_id": thing,
                        "uh": AlienTube.Preferences.getString("redditUserIdentifierHash")
                    });
                }, false);
                /* Cancel event listener, will merely just get rid of the report screen. */
                cancelButton.addEventListener("click", function () {
                    this.reportContainer.parentNode.removeChild(this.reportContainer);
                }, false);
                /* Append the report screen to the appropriate location. */
                if (isThread) {
                    var parentContainer = document.querySelector("header .info");
                    parentContainer.appendChild(this.reportContainer);
                }
                else {
                    var commentApplication = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "'] .at_commentApplication");
                    commentApplication.appendChild(this.reportContainer);
                }
            }
            /* Method to iterate through the radio buttons and get the one with a selected (checked) status. */
            Report.prototype.getCurrentSelectedRadioButton = function () {
                var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
                for (var i = 0, len = radioButtonControllers.length; i < len; i += 1) {
                    if (radioButtonControllers[i].checked) {
                        return radioButtonControllers[i];
                    }
                }
                return null;
            };
            return Report;
        }());
        Reddit.Report = Report;
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            Perform a request to Reddit to either save or unsave an item.
            @class RedditSaveRequest
            @param thing The Reddit ID of the item to either save or unsave
            @param type Whether to save or unsave
            @param callback Callback handler for the event when loaded.
        */
        "use strict";
        var SaveRequest = /** @class */ (function () {
            function SaveRequest(thing, type, callback) {
                var url = "https://api.reddit.com/api/" + SaveType[type].toLowerCase();
                new AlienTube.HttpRequest(url, AlienTube.RequestType.POST, callback, {
                    "uh": AlienTube.Preferences.getString("redditUserIdentifierHash"),
                    "id": thing
                });
            }
            return SaveRequest;
        }());
        Reddit.SaveRequest = SaveRequest;
        var SaveType;
        (function (SaveType) {
            SaveType[SaveType["SAVE"] = 0] = "SAVE";
            SaveType[SaveType["UNSAVE"] = 1] = "UNSAVE";
        })(SaveType = Reddit.SaveType || (Reddit.SaveType = {}));
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
var AlienTube;
(function (AlienTube) {
    var Reddit;
    (function (Reddit) {
        /**
            Perform a request to Reddit asking for the user's username so we can save and display it.
            @class RetreiveUsernameRequest
        */
        "use strict";
        var RetreiveUsernameRequest = /** @class */ (function () {
            function RetreiveUsernameRequest() {
                var url = "https://api.reddit.com/api/me.json";
                new AlienTube.HttpRequest(url, AlienTube.RequestType.GET, function (responseText) {
                    var responseData = JSON.parse(responseText);
                    AlienTube.Preferences.set("username", responseData.data.name);
                    /* If possible we should set the username retroactively so the user doesn't need to reload the page */
                    var usernameField = document.querySelector(".at_writingauthor");
                    if (usernameField) {
                        usernameField.textContent = AlienTube.Application.localisationManager.get("commentfield_label_author", [AlienTube.Preferences.getString("username")]);
                    }
                });
            }
            return RetreiveUsernameRequest;
        }());
        Reddit.RetreiveUsernameRequest = RetreiveUsernameRequest;
    })(Reddit = AlienTube.Reddit || (AlienTube.Reddit = {}));
})(AlienTube || (AlienTube = {}));
function at_initialise() {
    if (window.top === window) {
        if (window.location.host === "alientube.co") {
            document.body.classList.add("installed");
        }
        else {
            new AlienTube.Application();
        }
    }
}
if (document.readyState === "complete" || document.readyState === "interactive") {
    at_initialise();
}
else {
    document.addEventListener("DOMContentLoaded", at_initialise, false);
}
