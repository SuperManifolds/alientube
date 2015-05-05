/// <reference path="Main.ts" />
/// <reference path="HttpRequest.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="CommentSection.ts" />
/// <reference path="CommentThread.ts" />
/// <reference path="CommentField.ts" />
/// <reference path="Comment.ts" />
/// <reference path="LoadMore.ts" />
/// <reference path="LocalisationManager.ts" />
/// <reference path="LoadingScreen.ts" />
/// <reference path="ErrorScreen.ts" />
/// <reference path="Utilities.ts" />

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
function at_initialise () {
    if (window.top === window) {
        if (window.location.host === "alientube.co") {
            document.body.classList.add("installed");
        } else {
            new AlienTube.Main();
        }
    }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    at_initialise();
} else {
    document.addEventListener("DOMContentLoaded", at_initialise, false);
}
