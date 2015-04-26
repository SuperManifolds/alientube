/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Creates a new instance of a Comment Thread and adds it to DOM.
        @class CommentThread
        @param threadData JavaScript object containing all information about the Reddit thread.
    */
    export class CommentThread {
        commentSection : CommentSection;
        threadInformation : any;
        threadContainer : HTMLDivElement;

        private postIsInPreservedMode : Boolean;
        private commentData : Array<any>;
        private sortingTypes = [
            "confidence",
            "hot",
            "top",
            "new",
            "controversial",
            "old"
        ];
        children : Array<any>;

        constructor (threadData : any, commentSection : CommentSection) {
            this.children = new Array();
            this.commentSection = commentSection;
            this.threadInformation = threadData[0].data.children[0].data;
            this.commentData = threadData[1].data.children;

            Main.Preferences.set("redditUserIdentifierHash", threadData[0].data.modhash);
            this.postIsInPreservedMode = this.threadInformation.isRedditPreservedPost();

            var template = Main.getExtensionTemplateItem(this.commentSection.template, "threadcontainer");
            this.threadContainer = <HTMLDivElement> template.querySelector("#at_comments");

            if (threadData[0].data.modhash.length > 0) {
                this.commentSection.userIsSignedIn = true;
                if (!threadData[0].data.modhash || ! Main.Preferences.getString("username")) {
                    console.log("no username stored");
                    new RedditUsernameRequest();
                }
            } else {
                this.commentSection.userIsSignedIn = false;
                Main.Preferences.set("username", "");
                this.threadContainer.classList.add("signedout");
            }

            /* Set the thread title and link to it, because Reddit for some reason encodes html entities in the title, we must use
            innerHTML. */
            var title = <HTMLParagraphElement> this.threadContainer.querySelector(".title");
            title.innerHTML = this.threadInformation.title;
            title.setAttribute("href", "http://reddit.com" + this.threadInformation.permalink);

            /* Set the username of the author and link to them */
            var username = this.threadContainer.querySelector(".at_author");
            username.textContent = this.threadInformation.author;
            username.setAttribute("href", "http://www.reddit.com/u/" + this.threadInformation.author);
            username.setAttribute("data-username", this.threadInformation.author);
            if (this.threadInformation.distinguished === "moderator") {
                username.setAttribute("data-reddit-moderator", "true");
            }

            /* Add flair to the user */
            var flair = <HTMLSpanElement> this.threadContainer.querySelector(".at_flair");
            if (this.threadInformation.author_flair_text) {
                flair.textContent = this.threadInformation.author_flair_text;
            } else {
                flair.style.display = "none";
            }

            /* Set the NSFW label on the post if applicable */
            if (this.threadInformation.over_18) {
                var optionsElement = this.threadContainer.querySelector(".options");
                var nsfwElement = document.createElement("acronym");
                nsfwElement.classList.add("nsfw");
                nsfwElement.setAttribute("title", Main.localisationManager.get("post_badge_NSFW_message"));
                nsfwElement.textContent = Main.localisationManager.get("post_badge_NSFW");
                optionsElement.insertBefore(nsfwElement, optionsElement.firstChild);
            }

            /* Set the gild (how many times the user has been given gold for this post) if any */
            if (this.threadInformation.gilded) {
                var gildCountElement = this.threadContainer.querySelector(".at_gilded");
                gildCountElement.setAttribute("data-count", this.threadInformation.gilded);
            }

            /* Set the the thread posted time */
            var timestamp = this.threadContainer.querySelector(".at_timestamp");
            timestamp.textContent = Main.getHumanReadableTimestamp(this.threadInformation.created_utc);
            timestamp.setAttribute("timestamp", new Date(this.threadInformation.created_utc).toISOString());

            /* Set the localised text for "by {username}" */
            var submittedByUsernameText = this.threadContainer.querySelector(".templateSubmittedByUsernameText");
            submittedByUsernameText.textContent = Main.localisationManager.get("post_submitted_preposition");

            /* Set the text for the comments button  */
            var openNewCommentBox = this.threadContainer.querySelector(".commentTo");
            openNewCommentBox.textContent = this.threadInformation.num_comments + " " + Main.localisationManager.get("post_button_comments").toLowerCase();
            openNewCommentBox.addEventListener("click", this.onCommentButtonClick.bind(this), false);

            /* Set the button text and the event handler for the "save" button */
            var saveItemToRedditList = this.threadContainer.querySelector(".save");
            if (this.threadInformation.saved) {
                saveItemToRedditList.textContent = Main.localisationManager.get("post_button_unsave");
                saveItemToRedditList.setAttribute("saved", "true");
            } else {
                saveItemToRedditList.textContent = Main.localisationManager.get("post_button_save");
            }
            saveItemToRedditList.addEventListener("click", this.onSaveButtonClick.bind(this), false);


            /* Set the button text and the event handler for the "refresh" button */
            var refreshCommentThread = this.threadContainer.querySelector(".refresh");
            this.commentSection.storedTabCollection.splice(this.commentSection.storedTabCollection.indexOf(threadData), 1);
            refreshCommentThread.addEventListener("click", () => {
                this.commentSection.threadCollection.forEach((item) => {
                    if (item.id === this.threadInformation.id) {
                        this.commentSection.downloadThread(item);
                    }
                });
            }, false);
            refreshCommentThread.textContent = Main.localisationManager.get("post_button_refresh");

            /* Set the button text and the link for the "give gold" button */
            var giveGoldToUser = this.threadContainer.querySelector(".giveGold");
            giveGoldToUser.setAttribute("href", "http://www.reddit.com/gold?goldtype=gift&months=1&thing=" + this.threadInformation.name);
            giveGoldToUser.textContent = Main.localisationManager.get("post_button_gold");

            /* Set the button text and the event handler for the "report post" button */
            var reportToAdministrators = this.threadContainer.querySelector(".report");
            reportToAdministrators.textContent = Main.localisationManager.get("post_button_report");
            reportToAdministrators.addEventListener("click", this.onReportButtonClicked.bind(this), false);

            /* Set the button text and event handler for the sort selector. */
            var sortController = <HTMLSelectElement> this.threadContainer.querySelector(".sort");
            for (var sortIndex = 0, sortLength = this.sortingTypes.length; sortIndex < sortLength; sortIndex++) {
                sortController.children[sortIndex].textContent = Main.localisationManager.get("post_sort_" + this.sortingTypes[sortIndex]);
            }
            sortController.selectedIndex = this.sortingTypes.indexOf(Main.Preferences.getString("threadSortType"));
            sortController.addEventListener("change", () => {
                Main.Preferences.set("threadSortType", sortController.children[sortController.selectedIndex].getAttribute("value"));

                this.commentSection.threadCollection.forEach((item) => {
                    if (item.id === this.threadInformation.id) {
                        this.commentSection.downloadThread(item);
                    }
                });
            }, false);

            /* Set the state of the voting buttons */
            var voteController = <HTMLDivElement> this.threadContainer.querySelector(".vote");
            var voteButtonScoreCountElement = voteController.querySelector(".score");
            voteButtonScoreCountElement.textContent = this.threadInformation.score;

            var upvoteController = voteController.querySelector(".arrow.up");
            var downvoteController = voteController.querySelector(".arrow.down");
            upvoteController.addEventListener("click", this.onUpvoteControllerClick.bind(this), false);
            downvoteController.addEventListener("click", this.onDownvoteControllerClick.bind(this), false);

            if (this.threadInformation.likes === true) {
                voteController.classList.add("liked");
            } else if (this.threadInformation.likes === false) {
                voteController.classList.add("disliked");
            }

            /* Set the icon, text, and event listener for the button to switch to the Google+ comments. */
            var googlePlusButton = <HTMLButtonElement> this.threadContainer.querySelector("#at_switchtogplus");
            var googlePlusText = <HTMLSpanElement> googlePlusButton.querySelector("#at_gplustext");
            googlePlusText.textContent = Main.localisationManager.get("post_button_comments");
            googlePlusButton.addEventListener("click", this.onGooglePlusClick, false);

            if (Main.Preferences.getBoolean("showGooglePlusButton") == false) {
                googlePlusButton.style.display = "none";
            }

            /* Mark the post as preserved if applicable */
            if (this.postIsInPreservedMode) {
                this.threadContainer.classList.add("preserved");
            } else {
                if (this.commentSection.userIsSignedIn) {
                    new CommentField(this);
                }
            }

            /* If this post is prioritised (official) mark it as such in the header */
            if (this.threadInformation.official) {
                var officialLabel = <HTMLSpanElement> this.threadContainer.querySelector(".at_official");
                officialLabel.textContent = Main.localisationManager.get("post_message_official");
                officialLabel.style.display = "inline-block";
            }

            /* Start iterating the top level comments in the comment section */
            this.commentData.forEach((commentObject) => {
                if (commentObject.kind === "more") {
                    var readmore = new LoadMore(commentObject.data, this, this);
                    this.children.push(readmore);
                    this.threadContainer.appendChild(readmore.representedHTMLElement);
                } else {
                    var comment = new Comment(commentObject.data, this);
                    this.children.push(comment);
                    this.threadContainer.appendChild(comment.representedHTMLElement);
                }
            });

            this.set(this.threadContainer);
        }

        /**
        * Sets the contents of the comment thread.
        * @param contents HTML DOM node or element to use.
        */
        set (contents : Node) {
            var oldThread = document.getElementById("at_comments");
            var alientube = document.getElementById("alientube");
            if (alientube && oldThread) {
                alientube.removeChild(oldThread);
            }
            alientube.appendChild(contents);
        }

        onSaveButtonClick (eventObject : Event) {
            var saveButton = <HTMLSpanElement> eventObject.target;
            var savedType = saveButton.getAttribute("saved") ? SaveType.UNSAVE : SaveType.SAVE;
            new RedditSaveRequest(this.threadInformation.name, savedType, () => {
                if (savedType === SaveType.SAVE) {
                    saveButton.setAttribute("saved", "true");
                    saveButton.textContent = Main.localisationManager.get("post_button_unsave");
                } else {
                    saveButton.removeAttribute("saved");
                    saveButton.textContent = Main.localisationManager.get("post_button_save");
                }
            });
        }

        onReportButtonClicked (eventObject : Event) {
            new RedditReport(this.threadInformation.name, this, true);
        }

        onGooglePlusClick (eventObject : Event) {
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "none";
            var googlePlusContainer = document.getElementById("watch-discussion");
            googlePlusContainer.style.display = "block";
            var redditButton = <HTMLDivElement> document.getElementById("at_switchtoreddit");
            redditButton.style.display = "block";

            /* Terrible hack to force Google+ to reload the comments by making it think the user has resized the window.
               Having to do this makes me sad.  */
            document.body.style.width = document.body.offsetWidth + "px";
            window.getComputedStyle(document.body, null);
            document.body.style.width = "auto";
            window.getComputedStyle(document.body, null);
        }

        onUpvoteControllerClick (eventObject : Event) {
            var upvoteController = <HTMLDivElement> eventObject.target;
            var voteController = <HTMLDivElement> upvoteController.parentNode;
            var scoreValue = <HTMLDivElement> voteController.querySelector(".score");

            if (this.threadInformation.likes === true) {
                /* The user already likes this post, so they wish to remove their current like. */
                voteController.classList.remove("liked");
                this.threadInformation.likes = null;
                this.threadInformation.score = this.threadInformation.score - 1;
                scoreValue.textContent = this.threadInformation.score;

                new RedditVoteRequest(this.threadInformation.name, VoteType.NONE);
            } else {
                /* The user wishes to like this post */
                if (this.threadInformation.likes === false) {
                    /* The user has previously disliked this post, we need to remove that status and add 2 to the score instead of 1*/
                    voteController.classList.remove("disliked");
                    this.threadInformation.score = this.threadInformation.score + 2;
                } else {
                    this.threadInformation.score = this.threadInformation.score + 1;
                }
                voteController.classList.add("liked");
                this.threadInformation.likes = true;
                scoreValue.textContent = this.threadInformation.score;

                new RedditVoteRequest(this.threadInformation.name, VoteType.UPVOTE);
            }
        }

        onDownvoteControllerClick (eventObject : Event) {
            var downvoteController = <HTMLDivElement> eventObject.target;
            var voteController = <HTMLDivElement> downvoteController.parentNode;
            var scoreValue = <HTMLDivElement> voteController.querySelector(".score");

            if (this.threadInformation.likes === false) {
                /* The user already dislikes this post, so they wish to remove their current dislike */
                voteController.classList.remove("disliked");
                this.threadInformation.likes = null;
                this.threadInformation.score = this.threadInformation.score + 1;
                scoreValue.textContent = this.threadInformation.score;

                new RedditVoteRequest(this.threadInformation.name, VoteType.NONE);
            } else {
                /* The user wishes to dislike this post */
                if (this.threadInformation.likes === true) {
                    /* The user has previously liked this post, we need to remove that status and subtract 2 from the score instead of 1*/
                    voteController.classList.remove("liked");
                    this.threadInformation.score = this.threadInformation.score - 2;
                } else {
                    this.threadInformation.score = this.threadInformation.score - 1;
                }
                voteController.classList.add("disliked");
                this.threadInformation.likes = false;
                scoreValue.textContent = this.threadInformation.score;

                new RedditVoteRequest(this.threadInformation.name, VoteType.DOWNVOTE);
            }
        }

        onCommentButtonClick () {
            var header = document.querySelector(".at_thread");
            var previousCommentBox = header.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new CommentField(this);
        }
    }
}
