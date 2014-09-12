/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        A class representation and container of a single Reddit comment.
        @class Comment
        @param commentData Object containing the comment data from the Reddit API.
        @param commentThread CommentThread object representing the container of the comment.
    */
    export class Comment {
        representedHTMLElement : HTMLDivElement;
        commentObject : any;
        children : Array<any>;
        private commentThread : CommentThread;

        constructor(commentData : any, commentThread : CommentThread) {
            this.children = new Array();
            this.commentObject = commentData;
            this.commentThread = commentThread;

            var template = commentThread.commentSection.template.getElementById("comment").content.cloneNode(true);
            this.representedHTMLElement = template.querySelector(".at_comment");

            /* Set the id for the comment in question so it can be correlated with the Comment Object */
            this.representedHTMLElement.setAttribute("data-reddit-id", commentData.id);

            /* Show / collapse function for the comment */
            var toggleHide = this.representedHTMLElement.querySelector(".at_togglehide");
            toggleHide.addEventListener("click", function () {
                if (this.representedHTMLElement.classList.contains("hidden")) {
                    this.representedHTMLElement.classList.remove("hidden")
                } else {
                    this.representedHTMLElement.classList.add("hidden");
                }
            }.bind(this), false);

            /* Set the link and name of author, as well as whether they are the OP or not. */
            var author = this.representedHTMLElement.querySelector(".at_author");
            author.appendChild(document.createTextNode(this.commentObject.author));
            author.setAttribute("href", "http://reddit.com/u/" + this.commentObject.author);
            author.setAttribute("data-username", this.commentObject.author);
            if (commentData.author === commentThread.threadInformation.author) {
                author.setAttribute("data-reddit-op", "true");
            }

            /* Set the gild (how many times the user has been given gold for this post) if any */
            if (this.commentObject.gilded) {
                var gildCountElement = this.representedHTMLElement.querySelector(".at_gilded");
                gildCountElement.setAttribute("data-count", this.commentObject.gilded);
            }

            /* Add flair to the user */
            var flair = <HTMLSpanElement> this.representedHTMLElement.querySelector(".at_flair");
            if (this.commentObject.author_flair_text) {
                flair.appendChild(document.createTextNode(this.commentObject.author_flair_text));
            } else {
                flair.style.display = "none";
            }

            /* Set the score of the comment next to the user tag */
            var score = <HTMLSpanElement> this.representedHTMLElement.querySelector(".at_score");
            var scorePointsText = this.commentObject.score === 1 ? Main.localisationManager.get("post_current_score") : Main.localisationManager.get("post_current_score_plural");
            score.appendChild(document.createTextNode(this.commentObject.score + scorePointsText));

            /* Set the timestamp of the comment */
            var timestamp = this.representedHTMLElement.querySelector(".at_timestamp");
            timestamp.appendChild(document.createTextNode(Main.getHumanReadableTimestamp(this.commentObject.created_utc)));
            timestamp.setAttribute("timestamp", new Date(this.commentObject.created_utc).toISOString());

            /* Render the markdown and set the actual comement messsage of the comment */
            var contentTextOfComment = this.representedHTMLElement.querySelector(".at_commentcontent");
            var contentTextHolder = document.createElement("span");
            contentTextHolder.innerHTML = SnuOwnd.getParser().render(this.commentObject.body);
            contentTextOfComment.appendChild(contentTextHolder);
            if (this.commentObject.body === "[deleted]") {
                this.representedHTMLElement.classList.add("deleted");
            }

            /* Set the button text and event handler for the reply button. */
            var replyToComment = this.representedHTMLElement.querySelector(".at_reply");
            replyToComment.appendChild(document.createTextNode(Main.localisationManager.get("post_button_reply")));
            replyToComment.addEventListener("click", this.onCommentButtonClick.bind(this), false);

            /* Set the button text and link for the "permalink" button */
            var permalinkElement = this.representedHTMLElement.querySelector(".at_permalink");
            permalinkElement.appendChild(document.createTextNode(Main.localisationManager.get("post_button_permalink")));
            permalinkElement.setAttribute("href", "http://www.reddit.com" + commentThread.threadInformation.permalink + this.commentObject.id);

            /* Set the button text and link for the "parent" link button */
            var parentLinkElement = this.representedHTMLElement.querySelector(".at_parentlink");
            parentLinkElement.appendChild(document.createTextNode(Main.localisationManager.get("post_button_parent")));
            parentLinkElement.setAttribute("href", "http://www.reddit.com" + commentThread.threadInformation.permalink + "#" + this.commentObject.parent_id.substring(3));

            /* Set the button text and the event handler for the "show source" button */
            var displaySourceForComment = this.representedHTMLElement.querySelector(".at_displaysource");
            displaySourceForComment.appendChild(document.createTextNode(Main.localisationManager.get("post_button_source")));
            displaySourceForComment.addEventListener("click", this.onSourceButtonClick.bind(this), false);

            /* Set the button text and the event handler for the "save comment" button */
            var saveItemToRedditList = this.representedHTMLElement.querySelector(".save");
            if (this.commentObject.saved) {
                saveItemToRedditList.appendChild(document.createTextNode(Main.localisationManager.get("post_button_unsave")));
                saveItemToRedditList.setAttribute("saved", "true");
            } else {
                saveItemToRedditList.appendChild(document.createTextNode(Main.localisationManager.get("post_button_save")));
            }
            saveItemToRedditList.addEventListener("click", this.onSaveButtonClick.bind(this), false);

            /* Set the button text and the link for the "give gold" button */
            var giveGoldToUser = this.representedHTMLElement.querySelector(".giveGold");
            giveGoldToUser.setAttribute("href", "http://www.reddit.com/gold?goldtype=gift&months=1&thing=" + this.commentObject.name);
            giveGoldToUser.appendChild(document.createTextNode(Main.localisationManager.get("post_button_gold")));

            /* Set the button text and the event handler for the "report comment" button */
            var reportToAdministrators = this.representedHTMLElement.querySelector(".report");
            reportToAdministrators.appendChild(document.createTextNode(Main.localisationManager.get("post_button_report")));
            reportToAdministrators.addEventListener("click", this.onReportButtonClicked.bind(this), false);

            /* Set the state of the voting buttons */
            var voteController = <HTMLDivElement> this.representedHTMLElement.querySelector(".vote");
            var upvoteController = voteController.querySelector(".arrow.up");
            var downvoteController = voteController.querySelector(".arrow.down");
            upvoteController.addEventListener("click", this.onUpvoteControllerClick.bind(this), false);
            downvoteController.addEventListener("click", this.onDownvoteControllerClick.bind(this), false);
            if (this.commentObject.likes === true) {
                voteController.classList.add("liked");
            } else if (this.commentObject.likes === false) {
                voteController.classList.add("disliked");
            }

            /* Continue traversing down and populate the replies to this comment. */
            if (this.commentObject.replies) {
                var replyContainer = this.representedHTMLElement.querySelector(".at_replies");
                var replies = this.commentObject.replies.data.children;
                replies.forEach((commentObject) => {
                    if (commentObject.kind === "more") {
                        var readmore = new LoadMore(commentObject.data, this, commentThread);
                        this.children.push(readmore);
                        replyContainer.appendChild(readmore.representedHTMLElement);
                    } else {
                        var comment = new Comment(commentObject.data, commentThread);
                        this.children.push(comment);
                        replyContainer.appendChild(comment.representedHTMLElement);
                    }
                });
            }
        }

        onSaveButtonClick(eventObject : Event) {
            var saveButton = <HTMLSpanElement> eventObject.target;
            var savedType = saveButton.getAttribute("saved") ? SaveType.UNSAVE : SaveType.SAVE;
            new RedditSaveRequest(this.commentObject.name, savedType, () => {
                if (savedType === SaveType.SAVE) {
                    saveButton.setAttribute("saved", "true");
                    saveButton.removeChild(saveButton.firstChild);
                    saveButton.appendChild(document.createTextNode(Main.localisationManager.get("post_button_unsave")));
                } else {
                    saveButton.removeAttribute("saved");
                    saveButton.removeChild(saveButton.firstChild);
                    saveButton.appendChild(document.createTextNode(Main.localisationManager.get("post_button_save")));
                }
            });
        }

        onReportButtonClicked(eventObject : Event) {
            new RedditReport(this.commentObject.name, this.commentThread, false);
        }

        onUpvoteControllerClick(eventObject : Event) {
            var upvoteController = <HTMLDivElement> eventObject.target;
            var voteController = <HTMLDivElement> upvoteController.parentNode;
            var parentNode = <HTMLDivElement> voteController.parentNode;
            var scoreValue = <HTMLSpanElement> parentNode.querySelector(".at_score");

            if (this.commentObject.likes === true) {
                /* The user already likes this post, so they wish to remove their current like. */
                voteController.classList.remove("liked");
                this.commentObject.likes = null;
                this.commentObject.score = this.commentObject.score - 1;
                var scorePointsText = this.commentObject.score === 1 ? Main.localisationManager.get("post_current_score") : Main.localisationManager.get("post_current_score_plural");
                scoreValue.innerText = this.commentObject.score + scorePointsText;

                new RedditVoteRequest(this.commentObject.name, VoteType.NONE);
            } else {
                /* The user wishes to like this post */
                if (this.commentObject.likes === false) {
                    /* The user has previously disliked this post, we need to remove that status and add 2 to the score instead of 1*/
                    voteController.classList.remove("disliked");
                    this.commentObject.score = this.commentObject.score + 2;
                } else {
                    this.commentObject.score = this.commentObject.score + 1;
                }
                voteController.classList.add("liked");
                this.commentObject.likes = true;
                var scorePointsText = this.commentObject.score === 1 ? Main.localisationManager.get("post_current_score") : Main.localisationManager.get("post_current_score_plural");
                scoreValue.innerText = this.commentObject.score + scorePointsText;

                new RedditVoteRequest(this.commentObject.name, VoteType.UPVOTE);
            }
        }

        onDownvoteControllerClick(eventObject : Event) {
            var downvoteController = <HTMLDivElement> eventObject.target;
            var voteController = <HTMLDivElement> downvoteController.parentNode;
            var parentNode = <HTMLDivElement> voteController.parentNode;
            var scoreValue = <HTMLSpanElement> parentNode.querySelector(".at_score");

            if (this.commentObject.likes === false) {
                /* The user already dislikes this post, so they wish to remove their current dislike */
                voteController.classList.remove("disliked");
                this.commentObject.likes = null;
                this.commentObject.score = this.commentObject.score + 1;
                var scorePointsText = this.commentObject.score === 1 ? Main.localisationManager.get("post_current_score") : Main.localisationManager.get("post_current_score_plural");
                scoreValue.innerText = this.commentObject.score + scorePointsText;

                new RedditVoteRequest(this.commentObject.name, VoteType.NONE);
            } else {
                /* The user wishes to dislike this post */
                if (this.commentObject.likes === true) {
                    /* The user has previously liked this post, we need to remove that status and subtract 2 from the score instead of 1*/
                    voteController.classList.remove("liked");
                    this.commentObject.score = this.commentObject.score - 2;
                } else {
                    this.commentObject.score = this.commentObject.score - 1;
                }
                voteController.classList.add("disliked");
                this.commentObject.likes = false;
                var scorePointsText = this.commentObject.score === 1 ? Main.localisationManager.get("post_current_score") : Main.localisationManager.get("post_current_score_plural");
                scoreValue.innerText = this.commentObject.score + scorePointsText;

                new RedditVoteRequest(this.commentObject.name, VoteType.DOWNVOTE);
            }
        }

        onCommentButtonClick () {
            var previousCommentBox = this.representedHTMLElement.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new CommentField(this);
        }

        onSourceButtonClick () {
            var previousCommentBox = this.representedHTMLElement.querySelector(".at_commentfield");
            if (previousCommentBox) {
                previousCommentBox.parentNode.removeChild(previousCommentBox);
            }
            new CommentField(this, this.commentObject.body);
        }
    }
}
