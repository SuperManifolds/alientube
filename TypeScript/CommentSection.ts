/// <reference path="Main.ts" />
/// <reference path="CommentThread.ts" />
/// <reference path="HttpRequest.ts" />
/// <reference path="typings/handlebars/handlebars.d.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

module AlienTube {
    export class CommentSection {
        template : HTMLDocument;
        threadCollection : Array<any>;
        storedTabCollection : Array<CommentThread>;

        constructor(currentVideoIdentifier:string) {
            if (currentVideoIdentifier) {
                var templateLink = document.createElement("link");
                templateLink.id = "alientubeTemplate";
                templateLink.onload = () => {
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
                                var resultData = searchResults[i].data;
                                if ((resultData.ups - resultData.downs) > Main.Preferences.get("hiddenPostScoreThreshold")) {
                                    if (resultData.domain === "youtube.com") {
                                        var urlSearch = resultData.url.substring(resultData.url.indexOf("?") +1);
                                        var requestObjects = urlSearch.split('&');
                                        for (var a = 0, roLen = requestObjects.length; a < roLen; a++) {
                                            var obj = requestObjects[a].split('=');
                                            if (obj[0] === "v" && obj[1] === currentVideoIdentifier) {
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
                                var sortedResultCollection = {};
                                finalResultCollection.forEach(function(thread) {
                                    if (!sortedResultCollection.hasOwnProperty(thread.subreddit)) sortedResultCollection[thread.subreddit] = [];
                                    sortedResultCollection[thread.subreddit].push(thread);
                                });
                                this.threadCollection = [];
                                for (var subreddit in sortedResultCollection) {
                                    if (sortedResultCollection.hasOwnProperty(subreddit)) {
                                        this.threadCollection.push(sortedResultCollection[subreddit].reduce(function (a, b) {
                                            return ((a.score + (a.num_comments*3)) > (b.score + (b.num_comments*3)) || b.id === preferredPost) ? a : b;
                                        }));
                                    }
                                }
                                this.threadCollection.sort(function (a, b) {
                                    if (b.subreddit == preferredSubreddit && b.id == preferredPost) {
                                        return 1;
                                    } else if (b.subreddit == preferredSubreddit) {
                                        return 1;
                                    } else {
                                        return ((b.score + (b.num_comments*3)) - (a.score + (a.num_comments*3)));
                                    }
                                });
                                // Generate tabs.
                                var tabContainer = this.template.getElementById("tabcontainer").content.cloneNode(true);
                                var actualTabContainer = tabContainer.querySelector("#at_tabcontainer");
                                var overflowContainer = tabContainer.querySelector("#at_overflow");
                                var tlen = this.threadCollection.length;
                                var c;
                                var width = 0;
                                for (c = 0; c < tlen; c++) {
                                    width = width + (21 + (this.threadCollection[c].subreddit.length * 7));
                                    if (width >= 560) {
                                        break;
                                    }
                                    var tab = document.createElement("button");
                                    tab.className = "at_tab";
                                    tab.setAttribute("data-value", this.threadCollection[c].subreddit);
                                    var tabName = document.createTextNode(this.threadCollection[c].subreddit);
                                    tab.appendChild(tabName);
                                    actualTabContainer.insertBefore(tab, overflowContainer);
                                }
                                if (c < tlen) {
                                    for (c = c; c < tlen; c++) {
                                        var menuItem = document.createElement("li");
                                        menuItem.setAttribute("data-value", this.threadCollection[c].subreddit);
                                        var itemName = document.createTextNode(this.threadCollection[c].subreddit);
                                        menuItem.appendChild(itemName);
                                        overflowContainer.children[1].appendChild(menuItem);
                                    }
                                } else {
                                    overflowContainer.style.display = "none";
                                }
                                tabContainer.querySelector(".at_gplus img").src = Main.getExtensionRessourcePath("gplus.png");
                                this.set(tabContainer);
                            } else {
                                this.returnNoResults();
                            }
                        }
                    });
                }
                templateLink.setAttribute("rel", "import");
                templateLink.setAttribute("href", Main.getExtensionRessourcePath("templates.html"));
                document.head.appendChild(templateLink);
            }
        }

        downloadThread (threadData : any, callback? : any) {
            var requestUrl = "https://pay.reddit.com/r/" + threadData.subreddit + "/comments/" + threadData.id + ".json";
            new HttpRequest(requestUrl, RequestType.GET, (response) => {
                var responseObject = JSON.parse(response);
                // Remove previous tab from memory if preference is unchecked; will require a download on tab switch.
                if (!Main.Preferences.get("rememberTabsOnViewChange")) {
                    this.storedTabCollection.length = 0;
                }
                this.storedTabCollection.push(new CommentThread(responseObject));
            });
        }

        set (contents : Node) {
            var commentsContainer = document.getElementById("watch7-content");
            var previousRedditInstance = document.getElementById("alientube");
            if (previousRedditInstance) {
                commentsContainer.removeChild(document.getElementById("alientube"));
            }
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.display = "none";
            var redditContainer = document.createElement("section");
            redditContainer.id = "alientube";
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
