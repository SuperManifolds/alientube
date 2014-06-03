/// <reference path="Main.ts" />
/// <reference path="HttpRequest.ts" />
/// <reference path="typings/handlebars/handlebars.d.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

module AlienTube {
    export class CommentSection {
        template : HTMLDocument;
        constructor(currentVideoIdentifier:string) {
            if (currentVideoIdentifier) {
                var templateLink = <HTMLLinkElement> document.getElementById("alientubeTemplate");
                this.template = templateLink.import;
                this.set(this.template.getElementById("loading").content.cloneNode(true));

                var videoSearchString = encodeURIComponent("url:'/watch?v=" + currentVideoIdentifier + "' (site:youtube.com OR site:youtu.be)");
                new HttpRequest("https://pay.reddit.com/search.json?q=" + videoSearchString, RequestType.GET, (response :string) => {
                    var results = JSON.parse(response);
                    if (results == '{}' || results.kind !== 'Listing' || results.data.children.length === 0) {
                        this.returnNoResults();
                    } else {
                        var searchResults = results.data.children;
                        var finalResultCollection = [];
                        for (var i = 0, len = searchResults.length; i < len; i++) {
                            var resultData = searchResults[i].value.data;
                            if ((resultData.ups - resultData.downs) > Main.Preferences.get("hiddenPostsScoreThreshold")) {
                                if (resultData.domain === "youtube.com") {
                                    var urlSearch = resultData.url.substring(resultData.url.indexOf("?") +1);
                                    var requestObjects = urlSearch.split('&');
                                    for (var a = 0, roLen = requestObjects.length; a < roLen; a++) {
                                        var obj = requestObjects[a].split('=');
                                        if (obj[0] === "v" && obj[a] === currentVideoIdentifier) {
                                            finalResultCollection.push(resultData);
                                        }
                                    }
                                } else if (resultData.domain === "youtu.be") {
                                    var urlSearch = resultData.url.substring(resultData.url.indexOf("/") + 1);
                                    var obj = urlSearch.split('?');
                                    if (obj[0] === currentVideoIdentifier) {
                                        finalResultCollection.push(resultData);
                                    }
                                }
                            }
                        }
                        if (finalResultCollection.length > 0) {
                            var preferredSubreddit = null;
                            var preferredPost = null;
                            var commentLinks = document.querySelectorAll("#eow-description a");
                            for (var b = 0, coLen = commentLinks.length; b < coLen; b++) {
                                var linkElement = <HTMLElement>commentLinks[b];
                                var url = linkElement.getAttribute("href");
                                if (typeof(url) !== 'undefined') {
                                    var mRegex = /(?:http|https):\/\/(.[^/]+)\/r\/([A-Za-z0-9][A-Za-z0-9_]{2,20})(?:\/comments\/)?([A-Za-z0-9]*)/g;
                                    var match = mRegex.exec(url);
                                    if (match) {
                                        preferredSubreddit = match[2];
                                        if (match[3].length > 0) preferredPost = match[3];
                                    }
                                }
                            }
                        } else {
                            this.returnNoResults();
                        }
                    }
                });
            }
        }

        set (contents :Node) {
            var commentsContainer = document.getElementById("watch7-content");
            var previousRedditInstance = document.getElementById("reddit");
            if (previousRedditInstance) {
                commentsContainer.removeChild(document.getElementById("reddit"));
            }
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.display = "none";
            var redditContainer = document.createElement("section");
            redditContainer.id = "reddit";
            redditContainer.appendChild(contents);
            commentsContainer.insertBefore(redditContainer, googlePlusContainer);
        }

        returnNoResults () {
            this.set(this.template.getElementById("noposts").content.cloneNode(true));
            if (Main.Preferences.get("showGooglePlus")) {
                document.getElementById("watch-discussion").style.display = "block";
            }
        }
    }
}
