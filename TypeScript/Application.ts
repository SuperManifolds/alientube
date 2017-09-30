/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
module AlienTube {
    /**
        Application class for AlienTube
        @class Application
    */
    "use strict";
    export class Application {
        static localisationManager: LocalisationManager;
        static commentSection: CommentSection;
        currentVideoIdentifier: string;
        
        // Some constants for new YouTube layout
        static CONTENT_ELEMENT_ID = "main";
        static COMMENT_ELEMENT_ID = "comments";
        static CHANNEL_ELEMENT_ID = "owner-name";
        static SIZE_REFERENCE_ELEMENT = "info-contents";
        static CHANNEL_CONTAINER_ID = "upload-info";
        static PAGE_NAV_EVENT = "yt-navigate-finish";

        constructor() {
            // Load preferences from disk.
            Preferences.initialise(function () {
                // Check if a version migration is necessary.
                if (Preferences.getString("lastRunVersion") !== Application.version()) {
                    new Migration(Preferences.getString("lastRunVersion"));
                    
                    /* Update the last run version paramater with the current version so we'll know not to run this migration again. */
                    Preferences.set("lastRunVersion", Application.version());
                }
            });
            
            // Load language files. 
            Application.localisationManager = new LocalisationManager(function () {
                // Load stylesheet
                if (Application.getCurrentBrowser() === Browser.SAFARI) {
                    new HttpRequest(Application.getExtensionRessourcePath("style.css"), RequestType.GET, function (data) {
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
                } else if (Application.currentMediaService() === Service.Vimeo) {
                    // Start observer to detect when a new video is loaded.
                    let observer = new MutationObserver(this.vimeoMutationObserver);
                    let config = { attributes: true, childList: true, characterData: true };
                    observer.observe(document.querySelector(".extras_wrapper"), config);
                }
            }.bind(this));
        }

        /**
            * Mutation Observer for monitoring for whenver the user changes to a new "page" on YouTube
            * @param mutations A collection of mutation records
            * @private
        */
        private youtubePageNav() {
            var reportedVideoId = Application.getCurrentVideoId();
            if (reportedVideoId !== this.currentVideoIdentifier) {
                this.currentVideoIdentifier = reportedVideoId;
                if (AlienTube.Utilities.isVideoPage) {
                    Application.commentSection = new AlienTube.CommentSection(this.currentVideoIdentifier);
                }
            }
        }
        
        /**
            * Mutation Observer for monitoring for whenver the user changes to a new "page" on YouTube
            * @param mutations A collection of mutation records
            * @private
        */
        private vimeoMutationObserver(mutations: Array<MutationRecord>) {
            mutations.forEach(function (mutation) {
                let target = <HTMLElement>mutation.target;
                let reportedVideoId = Application.getCurrentVideoId();
                if (reportedVideoId !== this.currentVideoIdentifier) {
                    this.currentVideoIdentifier = reportedVideoId;
                    if (Utilities.isVideoPage) {
                        Application.commentSection = new CommentSection(this.currentVideoIdentifier);
                    }
                }
            }.bind(this));
        }

        /**
        * Get the current video identifier of the window.
        * @returns video identifier.
        */
        public static getCurrentVideoId(): string {
            if (Application.currentMediaService() === Service.YouTube) {
                if (window.location.search.length > 0) {
                    let s = window.location.search.substring(1);
                    let requestObjects = s.split('&');
                    for (let i = 0, len = requestObjects.length; i < len; i += 1) {
                        let obj = requestObjects[i].split('=');
                        if (obj[0] === "v") {
                            return obj[1];
                        }
                    }
                }
            } else if (Application.currentMediaService() === Service.Vimeo) {
                if (window.location.pathname.length > 1) {
                    return window.location.pathname.substring(1);
                }
            }
            return null;
        }

        /**
        * Get a Reddit-style "x time ago" Timestamp from a unix epoch time.
        * @param epochTime Epoch timestamp to calculate from.
        * @returns A string with a human readable time.
        */
        public static getHumanReadableTimestamp(epochTime: number, localisationString = "timestamp_format"): string {
            let secs = Math.floor(((new Date()).getTime() / 1000) - epochTime);
            secs = Math.abs(secs);

            let timeUnits = {
                Year:   Math.floor(secs / 60 / 60 / 24 / 365.27),
                Month:  Math.floor(secs / 60 / 60 / 24 / 30),
                Day:    Math.floor(secs / 60 / 60 / 24),
                Hour:   Math.floor(secs / 60 / 60),
                Minute: Math.floor(secs / 60),
                Second: secs,
            };

            /* Retrieve the most relevant number by retrieving the first one that is "1" or more.
            Decide if it is plural and retrieve the correct localisation */
            for (let timeUnit in timeUnits) {
                if (timeUnits.hasOwnProperty(timeUnit) && timeUnits[timeUnit] >= 1) {
                   return Application.localisationManager.get(localisationString, [
                       timeUnits[timeUnit],
                       Application.localisationManager.getWithLocalisedPluralisation(`timestamp_format_${ timeUnit.toLowerCase() }`, timeUnits[timeUnit])
                   ]);
                }
            }
            return Application.localisationManager.get(localisationString, [
                "0",
                Application.localisationManager.getWithLocalisedPluralisation('timestamp_format_second', 0)
            ]);
        }

        /**
        * Get the path to a ressource in the AlienTube folder.
        * @param path Filename to the ressource.
        * @returns Ressource path (file://)
        */
        public static getExtensionRessourcePath(path: string): string {
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
        }

        /**
            * Get the HTML templates for the extension
            * @param callback A callback to be called when the extension templates has been loaded.
        */
        public static getExtensionTemplates(callback: any) {
            var templateLink = new XMLHttpRequest();
            templateLink.open("GET", Application.getExtensionRessourcePath("templates.html"), true);
            templateLink.responseType = "document";
            templateLink.onload = function() {
                if (callback) {
                    callback(templateLink.responseXML);
                }
            }.bind(this)
            templateLink.send();
        }
        
        /**
         * Get the current version of the extension.
         * @public
         */
        public static version(): string {
            let version = "";
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
        }
        
        /**
         * Get an element from the template collection.
         * @param templateCollection The template collection to use.
         * @param id The id of the element you want to retreive.
         * @returns DOM node of a template section.
         */
        public static getExtensionTemplateItem(templateCollection: any, id: string) {
            return templateCollection.getElementById(id).content.cloneNode(true);
        }
        
        /**
         * Get the current media website that AlienTube is on
         * @returns A "Service" enum value representing a media service.
         */
        public static currentMediaService() : Service {
            if (window.location.host === "www.youtube.com") {
                return Service.YouTube;
            }
            else if (window.location.host === "vimeo.com") {
                return Service.Vimeo;
            }
            return null;
        }
        
        /**
         * Retrieve the current browser that AlienTube is running on.
         * @returns A "Browser" enum value representing a web browser.
         */
        static getCurrentBrowser() {
            if (typeof (chrome) !== 'undefined') return Browser.CHROME;
            else if (typeof (self.on) !== 'undefined') return Browser.FIREFOX;
            else if (typeof (safari) !== 'undefined') return Browser.SAFARI;
            else {
                throw "Invalid Browser";
            }
        }
    }
}

enum Service {
    YouTube,
    Vimeo
}
