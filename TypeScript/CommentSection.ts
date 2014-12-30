/// <reference path="index.ts" />
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
        storedTabCollection : Array<any>;
        userIsSignedIn : boolean;

        constructor(currentVideoIdentifier : string) {
            this.threadCollection = new Array();
            this.storedTabCollection = new Array();

            // Make sure video identifier is not null. If it is null we are not on a video page so we will just time out.
            if (currentVideoIdentifier) {
                // Load the html5 template file from disk and wait for it to load.
                var templateLink = document.createElement("link");
                templateLink.id = "alientubeTemplate";
                Main.getExtensionTemplates((templateContainer) => {
                    this.template = templateContainer;

                    // Set Loading Screen
                    var loadingScreen = new LoadingScreen(this, LoadingState.LOADING, Main.localisationManager.get("loading_search_message"));
                    this.set(loadingScreen.HTMLElement);

                    // Open a search request to Reddit for the video identfiier
                    var videoSearchString = encodeURI("(url:3D" + currentVideoIdentifier + " OR url:" + currentVideoIdentifier + ") (site:youtube.com OR site:youtu.be)");
                    new RedditRequest("https://api.reddit.com/search.json?q=" + videoSearchString, RequestType.GET, (results) => {

                        // There are a number of ways the Reddit API can arbitrarily explode, here are some of them.
                        if (results == '{}' || results.kind !== 'Listing' || results.data.children.length === 0) {
                            this.returnNoResults();
                        } else {
                            var searchResults = results.data.children;
                            var finalResultCollection = [];

                            /* Filter out Reddit threads that do not lead to the video. Additionally, remove ones that have passed the 6
                            month threshold for Reddit posts and are in preserved mode, but does not have any comments. */
                            searchResults.forEach(function(result) {
                                if (CommentSection.validateItemFromResultSet(result.data, currentVideoIdentifier)) {
                                    finalResultCollection.push(result.data);
                                }
                            });

                            if (finalResultCollection.length > 0) {
                                var preferredSubreddit = null;
                                var preferredPost = null;

                                /* Scan the YouTube comment sections for references to subreddits or reddit threads.
                                These will be prioritised and loaded first.  */
                                var commentLinks = document.querySelectorAll("#eow-description a");
                                for (var b = 0, coLen = commentLinks.length; b < coLen; b++) {
                                    var linkElement = <HTMLElement>commentLinks[b];
                                    var url = linkElement.getAttribute("href");
                                    if (typeof (url) !== 'undefined') {
                                        var mRegex = /(?:http|https):\/\/(.[^/]+)\/r\/([A-Za-z0-9][A-Za-z0-9_]{2,20})(?:\/comments\/)?([A-Za-z0-9]*)/g;
                                        var match = mRegex.exec(url);
                                        if (match) {
                                            preferredSubreddit = match[2];
                                            if (match[3].length > 0) preferredPost = match[3];
                                            break;
                                        }
                                    }
                                }

                                // Sort threads into array groups by what subreddit they are in.
                                var getExcludedSubreddits = Main.Preferences.enforcedExludedSubreddits.concat(Main.Preferences.get("excludedSubredditsSelectedByUser"));
                                var sortedResultCollection = {};
                                finalResultCollection.forEach(function(thread) {
                                    if (getExcludedSubreddits.indexOf(thread.subreddit.toLowerCase()) !== -1) return;
                                    if (thread.score < Main.Preferences.get("hiddenPostScoreThreshold")) return;

                                    if (!sortedResultCollection.hasOwnProperty(thread.subreddit)) sortedResultCollection[thread.subreddit] = [];
                                    sortedResultCollection[thread.subreddit].push(thread);
                                });

                                // Retrieve the subreddit that has the best score/comment relation in each subreddit, or is in the description.
                                this.threadCollection = [];
                                for (var subreddit in sortedResultCollection) {
                                    if (sortedResultCollection.hasOwnProperty(subreddit)) {
                                        this.threadCollection.push(sortedResultCollection[subreddit].reduce(function(a, b) {
                                            return ((a.score + (a.num_comments * 10)) > (b.score + (b.num_comments * 10)) || b.id === preferredPost) ? a : b;
                                        }));
                                    }
                                }

                                // Sort subreddits so the one with the highest score/comment relation (or is in the description) is first in the list.
                                this.threadCollection.sort(function(a, b) {
                                    return ((b.score + (b.num_comments * 10)) - (a.score + (a.num_comments * 10)));
                                });
                                for (var i = 0, len = this.threadCollection.length; i < len; i++) {
                                    if (this.threadCollection[i].subreddit === preferredSubreddit) {
                                        var threadDataForFirstTab = this.threadCollection[i];
                                        this.threadCollection.splice(i, 1);
                                        this.threadCollection.splice(0, 0, threadDataForFirstTab);
                                        break;
                                    }
                                }

                                // Generate tabs.
                                var tabContainerTemplate = Main.getExtensionTemplateItem(this.template, "tabcontainer");
                                var tabContainer = <HTMLDivElement> tabContainerTemplate.querySelector("#at_tabcontainer");
                                this.insertTabsIntoDocument(tabContainer, 0);
                                window.addEventListener("resize", this.updateTabsToFitToBoundingContainer.bind(this), false);

                                var mainContainer = this.set(tabContainer);
                                mainContainer.appendChild(tabContainerTemplate.querySelector("#at_comments"));

                                // If the selected post is prioritised, marked it as such
                                if (this.threadCollection[0].id === preferredPost || this.threadCollection[0].subreddit === preferredSubreddit) {
                                    this.threadCollection[0].official = true;
                                }

                                // Load the first tab.
                                this.downloadThread(this.threadCollection[0]);
                            } else {
                                this.returnNoResults();
                            }
                        }
                    }, null, loadingScreen);
                });
            }
        }

        /**
            Display a tab in the comment section, if it is locally cached, use that, if not, download it.
            @param threadData Data about the thread to download from a Reddit search page.
        */
        showTab (threadData : any) {
            var getTabById = this.storedTabCollection.filter(function(x) {
                return x[0].data.children[0].data.name === threadData.name;
            });
            if (getTabById.length > 0) {
                new CommentThread(getTabById[0], this)
            } else {
                this.downloadThread(threadData);
            }
        }

        /**
        * Download a thread from Reddit.
        * @param threadData Data about the thread to download from a Reddit search page.
        */
        downloadThread (threadData : any) {
            var loadingScreen = new LoadingScreen(this, LoadingState.LOADING, Main.localisationManager.get("loading_post_message"));
            var alientubeCommentContainer = document.getElementById("at_comments");
            while (alientubeCommentContainer.firstChild) {
                alientubeCommentContainer.removeChild(alientubeCommentContainer.firstChild);
            }
            alientubeCommentContainer.appendChild(loadingScreen.HTMLElement);

            var requestUrl = "https://api.reddit.com/r/" + threadData.subreddit + "/comments/" + threadData.id + ".json";
            new RedditRequest(requestUrl, RequestType.GET, (responseObject) => {
                // Remove previous tab from memory if preference is unchecked; will require a download on tab switch.
                if (!Main.Preferences.get("rememberTabsOnViewChange")) {
                    this.storedTabCollection.length = 0;
                }
                responseObject[0].data.children[0].data.official = threadData.official;

                new CommentThread(responseObject, this)
                this.storedTabCollection.push(responseObject);
            }, null, loadingScreen);
        }

        /**
        * Sets the contents of the comment section.
        * @param contents HTML DOM node or element to use.
        */
        set (contents : Node) {
            var redditContainer = document.createElement("section");
            redditContainer.id = "alientube";

            var commentsContainer = document.getElementById("watch7-content");
            var previousRedditInstance = document.getElementById("alientube");
            if (previousRedditInstance) {
                commentsContainer.removeChild(previousRedditInstance);
            }

            var googlePlusContainer = document.getElementById("watch-discussion");

            /* Check if Dark Mode is activated, and set AlienTube to dark mode */
            var bodyBackgroundColor = window.getComputedStyle(document.body, null).getPropertyValue('background-color');
            var bodyBackgroundColorArray = bodyBackgroundColor.substring(4, bodyBackgroundColor.length - 1).replace(/ /g, '').split(',');
            var bodyBackgroundColorAverage = 0;
            for (var i = 0; i < 3; i++) {
                bodyBackgroundColorAverage = bodyBackgroundColorAverage + parseInt(bodyBackgroundColorArray[i], 10);
            }
            bodyBackgroundColorAverage = bodyBackgroundColorAverage / 3;
            if (bodyBackgroundColorAverage < 100) {
                document.body.classList.add("darkmode");
            }

            /* Add the "switch to Reddit" button in the google+ comment section */
            var redditButton = <HTMLDivElement> document.getElementById("at_switchtoreddit");
            if (!redditButton) {
                var redditButtonTemplate = Main.getExtensionTemplateItem(this.template, "switchtoreddit");
                redditButton = <HTMLDivElement> redditButtonTemplate.querySelector("#at_switchtoreddit");
                var redditText = <HTMLSpanElement> redditButton.querySelector("#at_reddittext");
                redditText.textContent = Main.localisationManager.get("post_button_comments");
                redditButton.addEventListener("click", this.onRedditClick, true);
                googlePlusContainer.parentNode.insertBefore(redditButton, googlePlusContainer);
            }

            if (Main.Preferences.get("displayGooglePlusByDefault")) {
                redditContainer.style.display = "none"
                redditButton.style.display = "block";
            } else {
                googlePlusContainer.style.display = "none";
            }

            /* Add AlienTube contents*/
            redditContainer.appendChild(contents);
            commentsContainer.appendChild(redditContainer);
            return redditContainer;
        }

        /**
            Validate a Reddit search result set and ensure the link urls go to the correct address.
            This is done due to the Reddit search result being extremely unrealiable, and providing mismatches.

            Additionally, remove ones that have passed the 6 month threshold for Reddit posts and are in preserved mode,
            but does not have any comments.

            @param itemFromResultSet An object from the reddit search result array.
            @param currentVideoIdentifier A YouTube video identifier to compare to.
            @returns A boolean indicating whether the item is actually for the current video.
        */
        static validateItemFromResultSet (itemFromResultSet : any, currentVideoIdentifier : string) : Boolean {
            if (itemFromResultSet.isRedditPreservedPost() && itemFromResultSet.num_comments < 1) {
                return false;
            }

            if (itemFromResultSet.domain === "youtube.com") {
                // For urls based on the full youtube.com domain, retrieve the value of the "v" query parameter and compare it.
                var urlSearch = itemFromResultSet.url.substring(itemFromResultSet.url.indexOf("?") + 1);
                var requestItems = urlSearch.split('&');
                for (var i = 0, len = requestItems.length; i < len; i++) {
                    var requestPair = requestItems[i].split("=");
                    if (requestPair[0] === "v" && requestPair[1] === currentVideoIdentifier) {
                        return true;
                    }
                    if (requestPair[0] == "amp;u") {
                        var component = decodeURIComponent(requestPair[1]);
                        component = component.replace("/watch?", "");
                        var shareRequestItems = component.split('&');
                        for (var j = 0, slen = shareRequestItems.length; j < slen; j++) {
                            var shareRequestPair = shareRequestItems[j].split("=");
                            if (shareRequestPair[0] === "v" && shareRequestPair[1] === currentVideoIdentifier) {
                                return true;
                            }
                        }
                    }
                }
            } else if (itemFromResultSet.domain === "youtu.be") {
                // For urls based on the shortened youtu.be domain, retrieve everything the path after the domain and compare it.
                var urlSearch = itemFromResultSet.url.substring(itemFromResultSet.url.lastIndexOf("/") + 1);
                var obj = urlSearch.split('?');
                if (obj[0] === currentVideoIdentifier) {
                    return true;
                }
            }
            return false;
        }

        /**
            Insert tabs to the document calculating the width of tabs and determine how many you can fit without breaking the
            bounds of the comment section.

            @param tabContainer The tab container to operate on.
            @param [selectTabAtIndex] The tab to be in active / selected status.
        */
        insertTabsIntoDocument (tabContainer : HTMLElement, selectTabAtIndex? : number) {
            var overflowContainer = <HTMLDivElement> tabContainer.querySelector("#at_overflow");
            var len = this.threadCollection.length;
            var maxWidth = document.getElementById("watch7-content").offsetWidth - 80;
            var width = (21 + this.threadCollection[0].subreddit.length * 7);

            /* Calculate the width of tabs and determine how many you can fit without breaking the bounds of the comment section. */
            if (len > 0) {
                var i;
                for (i = 0; i < len; i++) {
                    width = width + (21 + (this.threadCollection[i].subreddit.length * 7));
                    if (width >= maxWidth) {
                        break;
                    }
                    var tab = document.createElement("button");
                    tab.className = "at_tab";
                    tab.setAttribute("data-value", this.threadCollection[i].subreddit);
                    var tabLink = document.createElement("a");
                    tabLink.textContent = this.threadCollection[i].subreddit;
                    tabLink.setAttribute("href", "http://reddit.com/r/" + this.threadCollection[i].subreddit);
                    tabLink.setAttribute("target", "_blank");
                    tab.addEventListener("click", this.onSubredditTabClick.bind(this), false);
                    tab.appendChild(tabLink);
                    tabContainer.insertBefore(tab, overflowContainer);
                }

                // We can't fit any more tabs. We will now start populating the overflow menu.
                if (i < len) {
                    overflowContainer.style.display = "block";

                    /* Click handler for the overflow menu button, displays the overflow menu. */
                    overflowContainer.addEventListener("click", () => {
                        var overflowContainerMenu = <HTMLUListElement> overflowContainer.querySelector("ul");
                        overflowContainerMenu.style.display = "block";
                    }, false);

                    /* Document body click handler that closes the overflow menu when the user clicks outside of it.
                    by defining event bubbling in the third argument we are preventing clicks on the menu from triggering this event */
                    document.body.addEventListener("click", () => {
                        var overflowContainerMenu = <HTMLUListElement> overflowContainer.querySelector("ul");
                        overflowContainerMenu.style.display = "none";
                    }, true);

                    /* Continue iterating through the items we couldn't fit into tabs and populate the overflow menu. */
                    for (i = i; i < len; i++) {
                        var menuItem = document.createElement("li");
                        menuItem.setAttribute("data-value", this.threadCollection[i].subreddit);
                        menuItem.addEventListener("click", this.onSubredditOverflowItemClick.bind(this), false);
                        var itemName = document.createTextNode(this.threadCollection[i].subreddit);
                        menuItem.appendChild(itemName);
                        overflowContainer.children[1].appendChild(menuItem);
                    }
                } else {
                    /* If we didn't need the overflow menu there is no reason to show it. */
                    overflowContainer.style.display = "none";
                }
            } else {
                overflowContainer.style.display = "none";
            }

            // Set the active tab if provided
            if (selectTabAtIndex != null) {
                var selectedTab = <HTMLButtonElement>tabContainer.children[selectTabAtIndex];
                selectedTab.classList.add("active");
            }
        }

        /**
        * Set the comment section to the "No Results" page.
        */
        returnNoResults () {
            var template = Main.getExtensionTemplateItem(this.template, "noposts");
            var message = template.querySelector(".single_line");
            message.textContent = Main.localisationManager.get("post_label_noresults");

            /* Set the icon, text, and event listener for the button to switch to the Google+ comments. */
            var googlePlusButton = template.querySelector("#at_switchtogplus");
            var googlePlusText = <HTMLSpanElement> googlePlusButton.querySelector("#at_gplustext");
            googlePlusText.textContent = Main.localisationManager.get("post_button_comments");
            googlePlusButton.addEventListener("click", this.onGooglePlusClick, false);

            this.set(template);

            if (Main.Preferences.get("showGooglePlusWhenNoPosts")) {
                document.getElementById("watch-discussion").style.display = "block";
                document.getElementById("alientube").style.display = "none";

                var redditButton = <HTMLDivElement> document.getElementById("at_switchtoreddit");
                if (redditButton) {
                    redditButton.classList.add("noresults");
                    document.getElementById("at_reddittext").textContent = Main.localisationManager.get("post_label_noresults");
                }
            }
        }

        onRedditClick (eventObject : Event) {
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.display = "none";
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "block";
            var redditButton = <HTMLDivElement> document.getElementById("at_switchtoreddit");
            redditButton.style.display = "none";
        }

        onGooglePlusClick (eventObject : Event) {
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "none";
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.display = "block";
            var redditButton = <HTMLDivElement> document.getElementById("at_switchtoreddit");
            redditButton.style.display = "block";
        }

        /**
            Update the tabs to fit the new size of the document
        */
        private updateTabsToFitToBoundingContainer () {
            /* Only perform the resize operation when we have a new frame to work on by the browser, any animation beyond this will not
            be rendered and is pointless. */
            window.requestAnimationFrame(() => {
                var tabContainer = document.getElementById("at_tabcontainer");

                if (!tabContainer) {
                    return;
                }
                var overflowContainer = <HTMLDivElement> tabContainer.querySelector("#at_overflow");

                /* Iterate over the tabs until we find the one that is currently selected, and store its value. */
                for (var i = 0, len = tabContainer.children.length; i < len; i++) {
                    var tabElement = <HTMLButtonElement> tabContainer.children[i];
                    if (tabElement.classList.contains("active")) {
                        var currentActiveTabIndex = i;

                        /* Remove all tabs and overflow ites, then render them over again using new size dimensions. */
                        this.clearTabsFromTabContainer();
                        this.insertTabsIntoDocument(tabContainer, currentActiveTabIndex);
                        break;
                    }
                }
            });
        }

        /* Remove all tabs and overflow items from the DOM. */
        clearTabsFromTabContainer () {
            var tabContainer = document.getElementById("at_tabcontainer");
            var overflowContainer = <HTMLDivElement> tabContainer.querySelector("#at_overflow");

            /* Iterate over the tab elements and remove them all. Stopping short off the overflow button. */
            while (tabContainer.firstElementChild) {
                var childElement = <HTMLUnknownElement> tabContainer.firstElementChild;
                if (childElement.classList.contains("at_tab")) {
                    tabContainer.removeChild(tabContainer.firstElementChild);
                } else {
                    break;
                }
            }

            /* Iterate over the overflow items, removing them all. */
            var overflowListElement = <HTMLUListElement> overflowContainer.querySelector("ul");
            while (overflowListElement.firstElementChild) {
                overflowListElement.removeChild(overflowListElement.firstElementChild);
            }
        }

        /**
            Select the new tab on click and load comment section.
        */
        private onSubredditTabClick (eventObject : Event) {
            var tabElementClickedByUser = <HTMLButtonElement> eventObject.target;

            /* Only continue if the user did not click a tab that is already selected. */
            if (!tabElementClickedByUser.classList.contains("active") && tabElementClickedByUser.tagName == "BUTTON") {
                var tabContainer = document.getElementById("at_tabcontainer");
                var currentIndexOfNewTab = 0;

                /* Iterate over the tabs to find the currently selected one and remove its selected status */
                for (var i = 0, len = tabContainer.children.length; i < len; i++) {
                    var tabElement = <HTMLButtonElement> tabContainer.children[i];
                    if (tabElement === tabElementClickedByUser) currentIndexOfNewTab = i;
                    tabElement.classList.remove("active");
                }

                /* Mark the new tab as selected and start downloading it. */
                tabElementClickedByUser.classList.add("active");
                this.showTab(this.threadCollection[currentIndexOfNewTab]);
            }
        }

        /**
            Create a new tab and select it when an overflow menu item is clicked, load the comment section for it as well.
        */
        private onSubredditOverflowItemClick (eventObject : Event) {
            var tabContainer = document.getElementById("at_tabcontainer");
            var overflowItemClickedByUser = <HTMLLIElement> eventObject.target;
            var currentIndexOfNewTab = 0;

            /* Iterate over the current overflow items to find the index of the one that was just clicked. */
            var listOfExistingOverflowItems = <HTMLUListElement> overflowItemClickedByUser.parentNode;
            for (var i = 0, len = listOfExistingOverflowItems.children.length; i < len; i++) {
                var overflowElement = <HTMLLIElement> listOfExistingOverflowItems.children[i];
                if (overflowElement === overflowItemClickedByUser) currentIndexOfNewTab = i;
            }

            /* Derive the total index of the item in the subreddit list from the number we just calculated added
             with the total length of the visible non overflow tabs */
            currentIndexOfNewTab = (tabContainer.children.length) + currentIndexOfNewTab - 1;
            var threadDataForNewTab = this.threadCollection[currentIndexOfNewTab];
            console.log(threadDataForNewTab);

            /* Move the new item frontmost in the array so it will be the first tab, and force a re-render of the tab control. */
            this.threadCollection.splice(currentIndexOfNewTab, 1);
            this.threadCollection.splice(0, 0, threadDataForNewTab);
            this.clearTabsFromTabContainer();
            this.insertTabsIntoDocument(tabContainer, 0);

            /* Start downloading the new tab. */
            this.showTab(this.threadCollection[0]);
            eventObject.stopPropagation();
        }
    }
}
