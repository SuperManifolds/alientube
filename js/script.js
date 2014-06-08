/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var BrowserPreferenceManager = (function () {
        function BrowserPreferenceManager() {
            var _this = this;
            this.defaults = {
                hiddenPostScoreThreshold: -4,
                hiddenCommentScoreThreshold: -4,
                showGooglePlus: false,
                rememberTabsOnSwitch: true
            };
            switch (AlienTube.Main.getCurrentBrowser()) {
                case 0 /* CHROME */:
                    chrome.storage.sync.get(null, function (settings) {
                        _this.preferences = settings;
                    });
                    break;

                case 1 /* FIREFOX */:
                    self.on("message", function (msg) {
                        _this.preferences = msg.preferences.prefs;
                    });
                    break;

                case 2 /* SAFARI */:
                    var uuid = AlienTube.Main.generateUUID();
                    safari.self.addEventListener('message', function (event) {
                        if (event.name == uuid) {
                            var safariPref = JSON.parse(event.message);
                            _this.preferences = safariPref;
                        }
                    }, false);
                    safari.self.tab.dispatchMessage(uuid, {
                        type: 'settings'
                    });
                    break;
            }
        }
        BrowserPreferenceManager.prototype.get = function (key) {
            return this.preferences[key] || this.defaults[key];
        };

        BrowserPreferenceManager.prototype.set = function (key, value) {
            this.preferences[key] = value;
            switch (AlienTube.Main.getCurrentBrowser()) {
                case 0 /* CHROME */:
                    chrome.storage.sync.set({
                        key: value
                    });
                    break;

                case 1 /* FIREFOX */:
                    self.postMessage({
                        type: 'setSettingsValue',
                        key: key,
                        value: value
                    });
                    break;

                case 2 /* SAFARI */:
                    safari.self.tab.dispatchMessage(null, {
                        type: 'setSettingsValue',
                        key: key,
                        value: value
                    });
                    break;
            }
        };
        return BrowserPreferenceManager;
    })();
    AlienTube.BrowserPreferenceManager = BrowserPreferenceManager;
})(AlienTube || (AlienTube = {}));
/// <reference path="Main.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var CommentThread = (function () {
        function CommentThread(redditData) {
        }
        return CommentThread;
    })();
    AlienTube.CommentThread = CommentThread;
})(AlienTube || (AlienTube = {}));
/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var HttpRequest = (function () {
        function HttpRequest(url, type, callback, postData) {
            var _this = this;
            this.acceptableResponseTypes = [200, 201, 202, 301, 302, 303, 0];
            if (AlienTube.Main.getCurrentBrowser() == 2 /* SAFARI */) {
                // TODO
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open(RequestType[type], url, true);
                xhr.withCredentials = true;
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        if (_this.acceptableResponseTypes.indexOf(xhr.status) !== -1) {
                            callback(xhr.responseText);
                        } else {
                            // TODO Error handling
                        }
                    }
                };
                if (type == 1 /* POST */) {
                    var query = [];
                    for (var key in postData) {
                        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(postData[key]));
                    }
                    xhr.send("?" + query.join('&'));
                } else {
                    xhr.send();
                }
            }
        }
        return HttpRequest;
    })();
    AlienTube.HttpRequest = HttpRequest;

    (function (RequestType) {
        RequestType[RequestType["GET"] = 0] = "GET";
        RequestType[RequestType["POST"] = 1] = "POST";
    })(AlienTube.RequestType || (AlienTube.RequestType = {}));
    var RequestType = AlienTube.RequestType;
})(AlienTube || (AlienTube = {}));
/// <reference path="Main.ts" />
/// <reference path="CommentThread.ts" />
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
            var _this = this;
            if (currentVideoIdentifier) {
                var templateLink = document.createElement("link");
                templateLink.id = "alientubeTemplate";
                templateLink.onload = function () {
                    _this.template = templateLink.import;
                    _this.set(_this.template.getElementById("loading").content.cloneNode(true));
                    var videoSearchString = encodeURIComponent("url:'/watch?v=" + currentVideoIdentifier + "' (site:youtube.com OR site:youtu.be)");
                    new AlienTube.HttpRequest("https://pay.reddit.com/search.json?q=" + videoSearchString, 0 /* GET */, function (response) {
                        var results = JSON.parse(response);
                        if (results == '{}' || results.kind !== 'Listing' || results.data.children.length === 0) {
                            _this.returnNoResults();
                        } else {
                            var searchResults = results.data.children;
                            var finalResultCollection = [];
                            for (var i = 0, len = searchResults.length; i < len; i++) {
                                var resultData = searchResults[i].data;
                                if ((resultData.ups - resultData.downs) > AlienTube.Main.Preferences.get("hiddenPostScoreThreshold")) {
                                    if (resultData.domain === "youtube.com") {
                                        var urlSearch = resultData.url.substring(resultData.url.indexOf("?") + 1);
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
                                _this.threadCollection = [];
                                for (var subreddit in sortedResultCollection) {
                                    if (sortedResultCollection.hasOwnProperty(subreddit)) {
                                        _this.threadCollection.push(sortedResultCollection[subreddit].reduce(function (a, b) {
                                            return ((a.score + (a.num_comments * 3)) > (b.score + (b.num_comments * 3)) || b.id === preferredPost) ? a : b;
                                        }));
                                    }
                                }
                                _this.threadCollection.sort(function (a, b) {
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
                                var actualTabContainer = tabContainer.querySelector("#at_tabcontainer");
                                var overflowContainer = tabContainer.querySelector("#at_overflow");
                                var tlen = _this.threadCollection.length;
                                var c;
                                var width = 0;
                                for (c = 0; c < tlen; c++) {
                                    width = width + (21 + (_this.threadCollection[c].subreddit.length * 7));
                                    if (width >= 560) {
                                        break;
                                    }
                                    var tab = document.createElement("button");
                                    tab.className = "at_tab";
                                    tab.setAttribute("data-value", _this.threadCollection[c].subreddit);
                                    var tabName = document.createTextNode(_this.threadCollection[c].subreddit);
                                    tab.appendChild(tabName);
                                    actualTabContainer.insertBefore(tab, overflowContainer);
                                }
                                if (c < tlen) {
                                    for (c = c; c < tlen; c++) {
                                        var menuItem = document.createElement("li");
                                        menuItem.setAttribute("data-value", _this.threadCollection[c].subreddit);
                                        var itemName = document.createTextNode(_this.threadCollection[c].subreddit);
                                        menuItem.appendChild(itemName);
                                        overflowContainer.children[1].appendChild(menuItem);
                                    }
                                } else {
                                    overflowContainer.style.display = "none";
                                }
                                tabContainer.querySelector(".at_gplus img").src = AlienTube.Main.getExtensionRessourcePath("gplus.png");
                                _this.set(tabContainer);
                            } else {
                                _this.returnNoResults();
                            }
                        }
                    });
                };
                templateLink.setAttribute("rel", "import");
                templateLink.setAttribute("href", AlienTube.Main.getExtensionRessourcePath("templates.html"));
                document.head.appendChild(templateLink);
            }
        }
        CommentSection.prototype.downloadThread = function (threadData, callback) {
            var requestUrl = "https://pay.reddit.com/r/" + threadData.subreddit + "/comments/" + threadData.id + ".json";
            new AlienTube.HttpRequest(requestUrl, 0 /* GET */, function (response) {
                var responseObject = JSON.parse(response);
                AlienTube.Main.Preferences.set("modhash", responseObject.data.modhash);
            });
        };

        CommentSection.prototype.set = function (contents) {
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
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="CommentSection.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    document.addEventListener("DOMContentLoaded", function () {
        if (window.top === window) {
            new Main();
        }
    }, false);
    var Main = (function () {
        function Main() {
            Main.Preferences = new AlienTube.BrowserPreferenceManager();
            if (Main.getCurrentBrowser() == 2 /* SAFARI */) {
                var stylesheet = document.createElement("link");
                stylesheet.setAttribute("href", Main.getExtensionRessourcePath("style.css"));
                stylesheet.setAttribute("type", "text/css");
                stylesheet.setAttribute("rel", "stylesheet");
                document.head.appendChild(stylesheet);
            }
            var observer = new MutationObserver(this.mutationObserver);
            var config = { attributes: true, childList: true, characterData: true };
            observer.observe(document.getElementById("content"), config);

            this.currentVideoIdentifier = Main.getCurrentVideoId();
            this.commentSection = new AlienTube.CommentSection(this.currentVideoIdentifier);
        }
        Main.prototype.mutationObserver = function (mutations) {
            mutations.forEach(function (mutation) {
                var target = mutation.target;
                if (target.classList.contains("yt-card")) {
                    var reportedVideoId = Main.getCurrentVideoId();
                    if (reportedVideoId !== this.currentVideoIdentifier) {
                        this.currentVideoIdentifier = reportedVideoId;
                        this.commentSection = new AlienTube.CommentSection(this.currentVideoIdentifier);
                    }
                }
            });
        };

        Main.getCurrentVideoId = function () {
            if (window.location.search.length > 0) {
                var s = window.location.search.substring(1);
                var requestObjects = s.split('&');
                for (var i = 0, len = requestObjects.length; i < len; i++) {
                    var obj = requestObjects[i].split('=');
                    if (obj[0] === "v") {
                        return obj[1];
                    }
                }
            }
            return null;
        };

        Main.getCurrentBrowser = function () {
            if (chrome)
                return 0 /* CHROME */;
            else if (self.on)
                return 1 /* FIREFOX */;
            else if (safari)
                return 2 /* SAFARI */;
            else {
                throw "Invalid Browser";
            }
        };

        Main.getExtensionRessourcePath = function (path) {
            switch (Main.getCurrentBrowser()) {
                case 2 /* SAFARI */:
                    return safari.extension.baseURI + 'res/' + path;
                case 0 /* CHROME */:
                    return chrome.extension.getURL('res/' + path);
                case 1 /* FIREFOX */:
                    return self.options[path];
                default:
                    return null;
            }
        };

        Main.generateUUID = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        return Main;
    })();
    AlienTube.Main = Main;
    (function (Browser) {
        Browser[Browser["CHROME"] = 0] = "CHROME";
        Browser[Browser["FIREFOX"] = 1] = "FIREFOX";
        Browser[Browser["SAFARI"] = 2] = "SAFARI";
    })(AlienTube.Browser || (AlienTube.Browser = {}));
    var Browser = AlienTube.Browser;
})(AlienTube || (AlienTube = {}));
