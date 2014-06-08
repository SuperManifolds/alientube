/// <reference path="Main.ts" />
/// <reference path="CommentThread.ts" />
/// <reference path="HttpRequest.ts" />
/// <reference path="typings/handlebars/handlebars.d.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Starts a new instance of the AlienTube comment section and adds it to DOM.
        @class CommentSection
        @param currentVideoIdentifier YouTube Video query identifier.
    */
    export class CommentSection {
        template : HTMLDocument;
        threadCollection : Array<any>;
        storedTabCollection : Array<CommentThread>;

        constructor(currentVideoIdentifier:string) {
            // Make sure video identifier is not null. If it is null we are not on a video page so we will just time out.
            if (currentVideoIdentifier) {
                // Load the html5 template file from disk and wait for it to load.
                var templateLink = document.createElement("link");
                templateLink.id = "alientubeTemplate";
                templateLink.onload = () => {
                    this.template = templateLink.import;

                    // Set loading spinner.
                    this.set(this.template.getElementById("loading").content.cloneNode(true));

                    // Open a search request to Reddit for the video identfiier
                    var videoSearchString = encodeURIComponent("url:'/watch?v=" + currentVideoIdentifier + "' (site:youtube.com OR site:youtu.be)");
                    new HttpRequest("https://pay.reddit.com/search.json?q=" + videoSearchString, RequestType.GET, (response :string) => {
                        var results = JSON.parse(response);

                        // There are a number of ways the Reddit API can arbitrarily explode, here are some of them.
                        if (results == '{}' || results.kind !== 'Listing' || results.data.children.length === 0) {
                            this.returnNoResults();
                        } else {
                            var searchResults = results.data.children;
                            var finalResultCollection = [];

                            // Filter out Reddit threads that do not lead to the video, or has been downvoted too much.
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

                                /* Scan the YouTube comment sections for references to subreddits or reddit threads.
                                These will be prioritised and loaded first.  */
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

                                // Sort threads into array groups by what subreddit they are in.
                                var sortedResultCollection = {};
                                finalResultCollection.forEach(function(thread) {
                                    if (!sortedResultCollection.hasOwnProperty(thread.subreddit)) sortedResultCollection[thread.subreddit] = [];
                                    sortedResultCollection[thread.subreddit].push(thread);
                                });

                                // Retrieve the subreddit that has the best score/comment relation in each subreddit, or is in the comment section.
                                this.threadCollection = [];
                                for (var subreddit in sortedResultCollection) {
                                    if (sortedResultCollection.hasOwnProperty(subreddit)) {
                                        this.threadCollection.push(sortedResultCollection[subreddit].reduce(function (a, b) {
                                            return ((a.score + (a.num_comments*3)) > (b.score + (b.num_comments*3)) || b.id === preferredPost) ? a : b;
                                        }));
                                    }
                                }

                                // Sort subreddits so the one with the highest score/comment relation (or is in the comment section) is first in the list.
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

                                /* Calculate the width of tabs and determine how many you can fit without breaking the
                                bounds of the comment section. */
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

                                // We can't fit any more tabs. We will now start populating the overflow menu.
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

                                // Load the image for the Google+ icon.
                                tabContainer.querySelector(".at_gplus img").src = Main.getExtensionRessourcePath("gplus.png");
                                this.set(tabContainer);

                                // Load the first tab.
                                this.downloadThread(this.threadCollection[0], () => {
                                    var responseObject = JSON.parse(response);
                                    // Remove previous tab from memory if preference is unchecked; will require a download on tab switch.
                                    if (!Main.Preferences.get("rememberTabsOnViewChange")) {
                                        this.storedTabCollection.length = 0;
                                    }
                                    this.storedTabCollection.push(new CommentThread(responseObject));
                                });
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

        /**
        * Download a thread from Reddit.
        * @param threadData Data about the thread to download from a Reddit search page.
        * @param [callback] Callback handler for the download.
        */
        downloadThread (threadData : any, callback? : any) {
            var requestUrl = "https://pay.reddit.com/r/" + threadData.subreddit + "/comments/" + threadData.id + ".json";
            new HttpRequest(requestUrl, RequestType.GET, (response) => {
                callback(response);
            });
        }

        /**
        * Sets the contents of the comment section.
        * @param contents HTML DOM node or element to use.
        */
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

        /**
        * Set the comment section to the "No Results" page.
        */
        returnNoResults () {
            this.set(this.template.getElementById("noposts").content.cloneNode(true));
            if (Main.Preferences.get("showGooglePlus")) {
                document.getElementById("watch-discussion").style.display = "block";
            }
        }
    }
}
