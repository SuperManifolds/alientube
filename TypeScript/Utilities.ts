/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

interface Object {
    isRedditPreservedPost: () => boolean;
    getExtensionTemplateItem: (id : string) => HTMLDivElement;
}

interface Window {
    isYouTubeVideoPage: () => boolean;
    getCurrentBrowser: () => Browser;
}

interface HTMLElement {
    getExtensionTemplateItem: (id : string) => HTMLDivElement;
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

function getExtensionTemplateItem(id) {
    if (!this) {
        return false;
    }
    if (window.getCurrentBrowser() === Browser.FIREFOX) {
        return this.querySelector("#" + id).content.cloneNode(true);
    } else {
        return this.getElementById(id).content.cloneNode(true);
    }
}

if (!Object.prototype.getExtensionTemplateItem) {
    Object.prototype.getExtensionTemplateItem = getExtensionTemplateItem;
}
if (!HTMLElement.prototype.getExtensionTemplateItem) {
    HTMLElement.prototype.getExtensionTemplateItem = getExtensionTemplateItem;
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
        if (typeof(chrome) !== 'undefined') return Browser.CHROME;
        else if (typeof(self.on) !== 'undefined') return Browser.FIREFOX;
        else if (typeof(safari) !== 'undefined') return Browser.SAFARI;
        else {
            throw "Invalid Browser";
        }
    }
}

enum Browser {
    CHROME,
    FIREFOX,
    SAFARI
}
