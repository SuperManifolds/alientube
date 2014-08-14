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

        private postIsInPreservedMode : Boolean;
        private commentData : Array<any>;
        private children : Array<Comment>;

        constructor(threadData : any, commentSection : CommentSection) {
            this.children = new Array();
            this.commentSection = commentSection;
            this.threadInformation = threadData.data.children[0].data;
            this.commentData = threadData.data.children.splice(0, 1);

            var previousUserIdentifier = Main.Preferences.get("redditUserIdentifierHash");
            Main.Preferences.set("redditUserIdentifierHash", threadData.data.modhash);
            this.postIsInPreservedMode = Main.isPreserved(this.threadInformation.created_utc);

            var threadContainer = this.commentSection.template.getElementById("threadcontainer").content.cloneNode(true);

            /* Set the thread title and link to it */
            var title = threadContainer.querySelector(".title");
            title.appendChild(document.createTextNode(this.threadInformation.title));
            title.setAttribute("href", this.threadInformation.permalink);

            /* Set the username of the author and link to them */
            var username = threadContainer.querySelector(".at_author");
            username.appendChild(document.createTextNode(this.threadInformation.author));
            username.setAttribute("href", "http://www.reddit.com/u/" + this.threadInformation.author);
            if (this.threadInformation.distinguished === "moderator") {
                username.setAttribute("data-reddit-moderator", "true");
            }

            /* Set the the thread posted time */
            var timestamp = threadContainer.querySelector(".at_timestamp");
            timestamp.appendChild(document.createTextNode(Main.getHumanReadableTimestamp(this.threadInformation.created_utc)));
            timestamp.setAttribute("timestamp", new Date(this.threadInformation.created_utc).toISOString);

            /* Set the localised text for "at {timestamp}" and "by {username}" */
            var submittedAtTimeText = threadContainer.querySelector(".templateSubmittedAtTimeText");
            submittedAtTimeText.appendChild(document.createTextNode(Main.localisationManager.get("submittedAtTimeText")));

            var submittedByUsernameText = threadContainer.querySelector(".templateSubmittedByUsernameText");
            submittedByUsernameText.appendChild(document.createTextNode(Main.localisationManager.get("submittedByUsernameText")));

            /* Start iterating the comment section */
            this.commentData.forEach((commentObject) => {
                this.children.push(new Comment(commentObject.data, this));
            });

            this.set(threadContainer);
        }

        /**
        * Sets the contents of the comment thread.
        * @param contents HTML DOM node or element to use.
        */
        set (contents : Node) {
            var threadContainer = document.getElementById("at_comments");
            while (threadContainer.firstChild) {
                threadContainer.removeChild(threadContainer.firstChild);
            }
            threadContainer.appendChild(contents);
        }
    }
}
