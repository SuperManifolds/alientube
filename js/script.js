/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var BrowserPreferenceManager = (function () {
        function BrowserPreferenceManager() {
            var _this = this;
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
            return this.preferences[key];
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
    var Reddit = (function () {
        function Reddit() {
        }
        return Reddit;
    })();
    AlienTube.Reddit = Reddit;
})(AlienTube || (AlienTube = {}));
/// <reference path="Main.ts" />
/// <reference path="Reddit.ts" />
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
                var templateLink = document.getElementById("alientubeTemplate");
                this.template = templateLink.import;
                console.log(({}).toString.call(templateLink).match(/\s([a-zA-Z]+)/)[1].toLowerCase());
                this.set(this.template.getElementById("loading").content.cloneNode(true));
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
        return CommentSection;
    })();
    AlienTube.CommentSection = CommentSection;
})(AlienTube || (AlienTube = {}));
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="Reddit.ts" />
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
            this.preferences = new AlienTube.BrowserPreferenceManager();
            var template = document.createElement("link");
            template.setAttribute("href", Main.getExtensionRessourcePath("templates.html"));
            template.id = "alientubeTemplate";
            template.setAttribute("rel", "import");
            document.head.appendChild(template);

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
