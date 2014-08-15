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
        private children : Array<Comment>;

        constructor(commentData : any, commentThread : CommentThread) {
            this.children = new Array();
            this.commentObject = commentData;

            this.representedHTMLElement = commentThread.commentSection.template.getElementById("comment").content.cloneNode(true);

            /* Set the id for the comment in question so it can be correlated with the Comment Object */
            var commentElement = this.representedHTMLElement.querySelector(".at_comment");
            commentElement.setAttribute("data-reddit-id", commentData.id);

            /* Set the link and name of author, as well as whether they are the OP or not. */
            var author = this.representedHTMLElement.querySelector(".at_author");
            author.appendChild(document.createTextNode(this.commentObject.author));
            author.setAttribute("href", "http://reddit.com/u/" + this.commentObject.author);
            if (commentData.author === commentThread.threadInformation.author) {
                author.setAttribute("data-reddit-op", "true");
            }

            var flair = <HTMLSpanElement> this.representedHTMLElement.querySelector(".at_flair");
            if (this.commentObject.author_flair_text) {
                flair.appendChild(document.createTextNode(this.commentObject.author_flair_text));
            } else {
                flair.style.display = "none";
            }

            var timestamp = this.representedHTMLElement.querySelector(".at_timestamp");
            timestamp.appendChild(document.createTextNode(Main.getHumanReadableTimestamp(this.commentObject.created_utc)));
            timestamp.setAttribute("timestamp", new Date(this.commentObject.created_utc).toISOString());

            var contentTextOfComment = this.representedHTMLElement.querySelector(".at_commentcontent");
            contentTextOfComment = this.commentObject.body;

            var replyContainer = this.representedHTMLElement.querySelector(".at_replies");
            /*this.commentObject.replies.forEach((commentObject) => {
                var comment = new Comment(commentObject.data, commentThread);
                this.children.push(comment);
                replyContainer.appendChild(comment.representedHTMLElement);
            });*/
        }
    }
}
