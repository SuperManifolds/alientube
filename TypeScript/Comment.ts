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
        private commentObject : any;
        private children : Array<any>;
        private commentThread : CommentThread;

        constructor(commentData : any, commentThread : CommentThread) {
            this.children = new Array();
            this.commentObject = commentData;
            this.commentThread = commentThread;

            this.representedHTMLElement = commentThread.commentSection.template.getElementById("comment").content.cloneNode(true);

            /* Set the id for the comment in question so it can be correlated with the Comment Object */
            var commentElement = <HTMLDivElement> this.representedHTMLElement.querySelector(".at_comment");
            commentElement.setAttribute("data-reddit-id", commentData.id);

            /* Show / collapse function for the comment */
            var toggleHide = this.representedHTMLElement.querySelector(".at_togglehide");
            toggleHide.addEventListener("click", function () {
                if (commentElement.classList.contains("hidden")) {
                    commentElement.classList.remove("hidden")
                } else {
                    commentElement.classList.add("hidden");
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
            score.appendChild(document.createTextNode(this.commentObject.score + Main.localisationManager.get("scorePointsText")));

            /* Set the timestamp of the comment */
            var timestamp = this.representedHTMLElement.querySelector(".at_timestamp");
            timestamp.appendChild(document.createTextNode(Main.getHumanReadableTimestamp(this.commentObject.created_utc)));
            timestamp.setAttribute("timestamp", new Date(this.commentObject.created_utc).toISOString());

            /* Render the markdown and set the actual comement messsage of the comment */
            var contentTextOfComment = this.representedHTMLElement.querySelector(".at_commentcontent");
            var contentTextHolder = document.createElement("span");
            contentTextHolder.innerHTML = SnuOwnd.getParser().render(this.commentObject.body);
            contentTextOfComment.appendChild(contentTextHolder);

            /* Set the button text and event handler for the reply button. */
            var replyToComment = this.representedHTMLElement.querySelector(".at_reply");
            replyToComment.appendChild(document.createTextNode(Main.localisationManager.get("replyToCommentText")));

            /* Set the button text and link for the "permalink" button */
            var permalinkElement = this.representedHTMLElement.querySelector(".at_permalink");
            permalinkElement.appendChild(document.createTextNode(Main.localisationManager.get("permalink")));
            permalinkElement.setAttribute("href", "http://www.reddit.com" + commentThread.threadInformation.permalink + this.commentObject.id);

            /* Set the button text and link for the "parent" link button */
            var parentLinkElement = this.representedHTMLElement.querySelector(".at_parentlink");
            parentLinkElement.appendChild(document.createTextNode(Main.localisationManager.get("parent")));
            parentLinkElement.setAttribute("href", "http://www.reddit.com" + commentThread.threadInformation.permalink + "#" + this.commentObject.parent_id.substring(3));

            /* Set the button text and the event handler for the "show source" button */
            var displaySourceForComment = this.representedHTMLElement.querySelector(".at_displaysource");
            displaySourceForComment.appendChild(document.createTextNode(Main.localisationManager.get("displaySourceForCommentText")));

            /* Set the button text and the event handler for the "save comment" button */
            var saveItemToRedditList = this.representedHTMLElement.querySelector(".save");
            if (this.commentObject.saved) {
                saveItemToRedditList.appendChild(document.createTextNode(Main.localisationManager.get("removeItemFromRedditSaveList")));
                saveItemToRedditList.setAttribute("saved", "true");
            } else {
                saveItemToRedditList.appendChild(document.createTextNode(Main.localisationManager.get("saveItemToRedditList")));
            }
            saveItemToRedditList.addEventListener("click", this.onSaveButtonClick.bind(this), false);

            /* Set the button text and the link for the "give gold" button */
            var giveGoldToUser = this.representedHTMLElement.querySelector(".giveGold");
            giveGoldToUser.setAttribute("href", "http://www.reddit.com/gold?goldtype=gift&months=1&thing=" + this.commentObject.name);
            giveGoldToUser.appendChild(document.createTextNode(Main.localisationManager.get("giveGoldToUserText")));

            /* Set the button text and the event handler for the "report comment" button */
            var reportToAdministrators = this.representedHTMLElement.querySelector(".report");
            reportToAdministrators.appendChild(document.createTextNode(Main.localisationManager.get("reportToAdministratorsText")));
            reportToAdministrators.addEventListener("click", this.onReportButtonClicked.bind(this), false);

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
                    saveButton.appendChild(document.createTextNode(Main.localisationManager.get("removeItemFromRedditSaveList")));
                } else {
                    saveButton.removeAttribute("saved");
                    saveButton.removeChild(saveButton.firstChild);
                    saveButton.appendChild(document.createTextNode(Main.localisationManager.get("saveItemToRedditList")));
                }
            });
        }

        onReportButtonClicked(eventObject : Event) {
            new RedditReport(this.commentObject.name, this.commentThread, false);
        }
    }
}
