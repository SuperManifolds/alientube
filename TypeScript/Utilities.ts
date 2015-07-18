/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
/// <reference path="typings/es6-promise.d.ts" />

interface Object {
    isRedditPreservedPost: () => boolean;
}

interface Window {
    isYouTubeVideoPage: () => boolean;
    getCurrentBrowser: () => Browser;
    parseBoolean: (arg: any) => boolean;
}

/**
    * Determine a reddit post is more than 6 months old, and thereby in preserved status.
    * @param this The unix epoch time of the post.
    * @returns Boolean saying whether the post is preserved or not.
*/
if (!Object.prototype.isRedditPreservedPost) {
    Object.prototype.isRedditPreservedPost = function() {
        if (!this) {
            return false;
        }
        var currentEpochTime = ((new Date()).getTime() / 1000);
        return ((currentEpochTime - this.created_utc) >= 15552000);
    }
}

/**
    Determine whether the current url of the tab is a YouTube video page.
*/
if (!window.isYouTubeVideoPage) {
    window.isYouTubeVideoPage = function() {
        return (window.location.pathname === "watch");
    }
}

if (!window.getCurrentBrowser) {
    window.getCurrentBrowser = function() {
        if (typeof (chrome) !== 'undefined') return Browser.CHROME;
        else if (typeof (self.on) !== 'undefined') return Browser.FIREFOX;
        else if (typeof (safari) !== 'undefined') return Browser.SAFARI;
        else {
            throw "Invalid Browser";
        }
    }
}

if (!window.parseBoolean) {
    window.parseBoolean = function(arg) {
        switch (typeof (arg)) {
            case "string":
                return arg.trim().toLowerCase() === "true";
                break;

            case "number":
                return arg > 0;

            default:
                return arg;
        }
    }
}

enum Browser {
    CHROME,
    FIREFOX,
    SAFARI
}
