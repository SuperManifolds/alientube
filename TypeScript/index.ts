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

/// <reference path="RedditAPI/RedditRequest.ts" />
/// <reference path="RedditAPI/Comment.ts" />
/// <reference path="RedditAPI/EditComment.ts" />
/// <reference path="RedditAPI/Vote.ts" />
/// <reference path="RedditAPI/Report.ts" />
/// <reference path="RedditAPI/Save.ts" />
/// <reference path="RedditAPI/Username.ts" />


/// <reference path="typings/snuownd.d.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />


document.addEventListener("DOMContentLoaded", function () {
    if (window.top === window) {
        if (window.location.host === "alientube.co") {
            document.body.classList.add("installed");
        } else {
            new AlienTube.Main();
        }
    }
}, false);
