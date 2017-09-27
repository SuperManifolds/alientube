/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
module AlienTube {
    "use strict";
    export class Utilities {
        
        /**
            * Determine a reddit post is more than 6 months old, and thereby in preserved status.
            * @param this The unix epoch time of the post.
            * @returns Boolean saying whether the post is preserved or not.
        */
        static isRedditPreservedPost(post) {
            if (!post) {
                return false;
            }
            var currentEpochTime = ((new Date()).getTime() / 1000);
            return ((currentEpochTime - post.created_utc) >= 15552000);
        }
        
        /**
            Determine whether the current url of the tab is a YouTube video page.
        */
        static isVideoPage() {
            return (window.location.pathname === "watch" || document.querySelector("meta[og:type]").getAttribute("content") === "video");
        }
        
        static parseBoolean(arg) {
            switch (typeof (arg)) {
                case "string":
                    return arg.trim().toLowerCase() === "true";
    
                case "number":
                    return arg > 0;
    
                default:
                    return arg;
            }
        }
        
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

enum Browser {
    CHROME,
    FIREFOX,
    SAFARI
}
