/// <reference path="Main.ts" />
/// <reference path="HttpRequest.ts" />
/// <reference path="typings/handlebars/handlebars.d.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var CommentSection = (function () {
        function CommentSection(currentVideoIdentifier) {
            if (currentVideoIdentifier) {
                var templateLink = document.createElement("link");
                templateLink.setAttribute("href", AlienTube.Main.getExtensionRessourcePath("templates.html"));
                templateLink.id = "alientubeTemplate";
                templateLink.setAttribute("rel", "import");
                console.log("starting load");
                templateLink.onload = function () {
                    var _this = this;
                    console.log("loaded");
                    this.template = templateLink.import;
                    this.set(this.template.getElementById("loading").content.cloneNode(true));
                    var videoSearchString = encodeURIComponent("url:'/watch?v=" + currentVideoIdentifier + "' (site:youtube.com OR site:youtu.be)");
                    new AlienTube.HttpRequest("https://pay.reddit.com/search.json?q=" + videoSearchString, 0 /* GET */, function (response) {
                        var results = JSON.parse(response);
                        if (results == '{}' || results.kind !== 'Listing' || results.data.children.length === 0) {
                            _this.returnNoResults();
                        } else {
                            var searchResults = results.data.children;
                            var finalResultCollection = [];
                            for (var i = 0, len = searchResults.length; i < len; i++) {
                                var resultData = searchResults[i].value.data;
                                if ((resultData.ups - resultData.downs) > AlienTube.Main.Preferences.get("hiddenPostsScoreThreshold")) {
                                    if (resultData.domain === "youtube.com") {
                                        var urlSearch = resultData.url.substring(resultData.url.indexOf("?") + 1);
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
                                    var linkElement = commentLinks[b];
                                    var url = linkElement.getAttribute("href");
                                    if (typeof (url) !== 'undefined') {
                                        var mRegex = /(?:http|https):\/\/(.[^/]+)\/r\/([A-Za-z0-9][A-Za-z0-9_]{2,20})(?:\/comments\/)?([A-Za-z0-9]*)/g;
                                        var match = mRegex.exec(url);
                                        if (match) {
                                            preferredSubreddit = match[2];
                                            if (match[3].length > 0)
                                                preferredPost = match[3];
                                        }
                                    }
                                }
                                var sortedResultCollection = {};
                                finalResultCollection.forEach(function (thread) {
                                    if (!sortedResultCollection.hasOwnProperty(thread.subreddit))
                                        sortedResultCollection[thread.subreddit] = [];
                                    sortedResultCollection[thread.subreddit].push(thread);
                                });
                                var threadCollection = [];
                                for (var subreddit in sortedResultCollection) {
                                    if (sortedResultCollection.hasOwnProperty(subreddit)) {
                                        threadCollection.push(subreddit.reduce(function (a, b) {
                                            return ((a.score + (a.num_comments * 3)) > (b.score + (b.num_comments * 3)) || b.id === preferredPost) ? a : b;
                                        }));
                                    }
                                }
                                threadCollection.sort(function (a, b) {
                                    if (b.subreddit == preferredSubreddit && b.id == preferredPost) {
                                        return 1;
                                    } else if (b.subreddit == preferredSubreddit) {
                                        return 1;
                                    } else {
                                        return ((b.score + (b.num_comments * 3)) - (a.score + (a.num_comments * 3)));
                                    }
                                });

                                // Generate tabs.
                                var tabContainer = _this.template.getElementById("tabcontainer").content.cloneNode(true);
                                threadCollection.forEach(function (thread) {
                                    var tab = document.createElement("button");
                                    tab.className = "at_tab";
                                    tab.setAttribute("data-value", thread.subreddit);
                                    var tabName = document.createTextNode(thread.subreddit);
                                    tab.appendChild(tabName);
                                    tabContainer.getElementById("at_tabcontainer").appendChild(tabName);
                                });
                                var width = (21 + threadCollection[0].subreddit.length * 7);
                                var tlen = threadCollection.length;
                                if (tlen > 1) {
                                    var c;
                                    var actualTabContainer = tabContainer.getElementById("at_tabcontainer");
                                    for (c = 1; c < tlen; c++) {
                                        width = width + (21 + (threadCollection[c].subreddit.length * 7));
                                        if (width >= 550) {
                                            break;
                                        }
                                        var tab = document.createElement("button");
                                        tab.className = "at_tab";
                                        tab.setAttribute("data-value", threadCollection[c].subreddit);
                                        var tabName = document.createTextNode(threadCollection[c].subreddit);
                                        tab.appendChild(tabName);
                                        actualTabContainer.appendChild(tab);
                                    }
                                    if (c < tlen) {
                                        var overflowContainer = tabContainer.getElementById("at_overflow").children[1];
                                        for (c = c; c < tlen; c++) {
                                            var menuItem = document.createElement("li");
                                            menuItem.setAttribute("data-value", threadCollection[c].subreddit);
                                            var itemName = document.createTextNode(threadCollection[c].subreddit);
                                            menuItem.appendChild(itemName);
                                            overflowContainer.appendChild(menuItem);
                                        }
                                    }
                                }
                                _this.set(tabContainer);
                            } else {
                                _this.returnNoResults();
                            }
                        }
                    });
                };
                document.head.appendChild(templateLink);
            }
        }
        CommentSection.prototype.set = function (contents) {
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
        };

        CommentSection.prototype.returnNoResults = function () {
            this.set(this.template.getElementById("noposts").content.cloneNode(true));
            if (AlienTube.Main.Preferences.get("showGooglePlus")) {
                document.getElementById("watch-discussion").style.display = "block";
            }
        };
        return CommentSection;
    })();
    AlienTube.CommentSection = CommentSection;
})(AlienTube || (AlienTube = {}));
